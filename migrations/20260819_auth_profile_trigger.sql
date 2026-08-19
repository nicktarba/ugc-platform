BEGIN;

-- SVOI UGC: атомарное создание public.profiles для новых auth.users.
-- Разрешены только author/business. Admin никогда не создаётся из metadata.

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

DROP TRIGGER IF EXISTS svoi_on_auth_user_created ON auth.users;
CREATE TRIGGER svoi_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.svoi_handle_new_auth_user();

-- Безопасный backfill только отсутствующих profiles. Существующие роли не меняем.
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
