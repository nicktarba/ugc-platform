\set ON_ERROR_STOP on

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.svoi_auth_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.svoi_auth_config FROM PUBLIC, anon, authenticated;

INSERT INTO private.svoi_auth_config(key, value, updated_at)
VALUES ('signup_guard', :'signup_guard', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();


-- public.profiles is an authorization source. Client code may read its own row,
-- but must never create/change role or email directly.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.svoi_guard_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  expected_guard text;
BEGIN
  SELECT value INTO expected_guard
  FROM private.svoi_auth_config
  WHERE key = 'signup_guard';

  IF expected_guard IS NULL
     OR COALESCE(NEW.raw_user_meta_data ->> 'svoi_signup_guard', '') <> expected_guard THEN
    RAISE EXCEPTION 'signup is only allowed through the SVOI UGC application';
  END IF;

  NEW.raw_user_meta_data := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) - 'svoi_signup_guard';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.svoi_guard_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS svoi_guard_auth_user_created ON auth.users;
CREATE TRIGGER svoi_guard_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.svoi_guard_new_auth_user();

CREATE OR REPLACE FUNCTION public.svoi_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_role text;
BEGIN
  safe_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' IN ('author', 'business')
      THEN NEW.raw_user_meta_data ->> 'role'
    ELSE 'business'
  END;

  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), safe_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.svoi_handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS svoi_on_auth_user_created ON auth.users;
CREATE TRIGGER svoi_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.svoi_handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.svoi_sync_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = COALESCE(NEW.email, '')
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.svoi_sync_auth_user_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS svoi_on_auth_user_email_changed ON auth.users;
CREATE TRIGGER svoi_on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.svoi_sync_auth_user_email();

INSERT INTO public.profiles (id, email, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  CASE
    WHEN u.raw_user_meta_data ->> 'role' IN ('author', 'business')
      THEN u.raw_user_meta_data ->> 'role'
    ELSE 'business'
  END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;
