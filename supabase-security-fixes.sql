-- ===========================================
-- SECURITY FIXES — ugcmarket
-- Выполнить в Supabase SQL Editor целиком
-- ===========================================

-- 1. PROFILES: запретить регистрацию с role='admin'
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND role IN ('author', 'business')
  );

-- 2. AUTHORS: запретить автору менять себе status
CREATE OR REPLACE FUNCTION prevent_author_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_status_change ON authors;
CREATE TRIGGER trg_prevent_status_change
  BEFORE UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION prevent_author_status_change();

-- 3. REQUESTS: запретить подмену ключевых полей при update
-- RLS не поддерживает OLD, поэтому используем триггер
CREATE OR REPLACE FUNCTION protect_request_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Никто (кроме postgres) не может менять эти поля после создания
  NEW.business_id := OLD.business_id;
  NEW.author_id := OLD.author_id;
  NEW.business_email := OLD.business_email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_request_fields ON requests;
CREATE TRIGGER trg_protect_request_fields
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION protect_request_fields();

-- ===========================================
-- ПРОВЕРКА (раскомментируй и запусти после)
-- ===========================================
-- SELECT policyname, with_check FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'authors'::regclass AND tgname LIKE 'trg_%';
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'requests'::regclass AND tgname LIKE 'trg_%';
