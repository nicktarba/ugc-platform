-- =========================================================
-- СВОИ UGC — защищённая админ-CRM
-- Идемпотентная миграция. Выполняется service_role/postgres.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_action_len CHECK (char_length(action) <= 120),
  CONSTRAINT admin_audit_entity_type_len CHECK (char_length(entity_type) <= 60),
  CONSTRAINT admin_audit_reason_len CHECK (reason IS NULL OR char_length(reason) <= 1000)
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_entity_idx
  ON public.admin_audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_admin_idx
  ON public.admin_audit_log (admin_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.admin_audit_log TO service_role;


CREATE TABLE IF NOT EXISTS public.admin_security (
  admin_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_required boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_security ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_security FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_security TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('user', 'author', 'request', 'complaint')),
  target_id uuid NOT NULL,
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notes_target_idx
  ON public.admin_notes (target_type, target_id, created_at DESC);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_notes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_notes TO service_role;

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_request_id_fkey'
      AND conrelid = 'public.complaints'::regclass
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_assigned_admin_id_fkey'
      AND conrelid = 'public.complaints'::regclass
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_assigned_admin_id_fkey
      FOREIGN KEY (assigned_admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS complaints_request_idx
  ON public.complaints (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_assigned_idx
  ON public.complaints (assigned_admin_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_complaint_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_updated_at ON public.complaints;
CREATE TRIGGER trg_complaint_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.touch_complaint_updated_at();

-- Жалобу по переписке можно привязать только к своей сделке.
DROP POLICY IF EXISTS "Auth users can insert" ON public.complaints;
CREATE POLICY "Auth users can insert"
  ON public.complaints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND (
      request_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.requests r
        LEFT JOIN public.authors a ON a.id = r.author_id
        WHERE r.id = request_id
          AND (r.business_id = auth.uid() OR a.user_id = auth.uid())
      )
    )
  );

-- Изменение жалоб разрешено только серверному API через service_role.
-- Даже JWT пользователя с role=admin не может обновлять таблицу напрямую.
DROP POLICY IF EXISTS "Admin can update complaints" ON public.complaints;

-- Service role меняет статус автора через защищённый серверный API.
-- Любой браузерный JWT, включая role=admin, не может менять status напрямую.
CREATE OR REPLACE FUNCTION public.prevent_author_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_status_change ON public.authors;
CREATE TRIGGER trg_prevent_status_change
  BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_author_status_change();

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Быстрая проверка после миграции
SELECT
  to_regclass('public.admin_audit_log') AS audit_table,
  to_regclass('public.admin_notes') AS notes_table,
  to_regclass('public.admin_security') AS security_table,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'complaints'
      AND column_name = 'request_id'
  ) AS complaint_request_link_ready;
