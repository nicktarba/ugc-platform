-- =========================================================
-- СВОИ UGC — безопасные жалобы и доступ к переписке
-- Идемпотентная миграция для текущей production-базы.
-- =========================================================

BEGIN;

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Переходим со старых статусов reviewed/dismissed на рабочий процесс поддержки.
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_status_check;

UPDATE public.complaints
SET status = CASE
  WHEN status = 'reviewed' THEN 'resolved'
  WHEN status = 'dismissed' THEN 'closed'
  ELSE status
END
WHERE status IN ('reviewed', 'dismissed');

UPDATE public.complaints
SET status = 'closed'
WHERE status IS NULL
   OR status NOT IN ('new', 'in_progress', 'waiting_user', 'resolved', 'closed');

UPDATE public.complaints
SET
  reason = left(btrim(reason), 120),
  comment = CASE WHEN comment IS NULL THEN NULL ELSE left(comment, 1000) END,
  admin_note = CASE WHEN admin_note IS NULL THEN NULL ELSE left(admin_note, 2000) END;

ALTER TABLE public.complaints
  ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_status_check
  CHECK (status IN ('new', 'in_progress', 'waiting_user', 'resolved', 'closed'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_reason_len_check'
      AND conrelid = 'public.complaints'::regclass
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_reason_len_check
      CHECK (char_length(reason) BETWEEN 1 AND 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_comment_len_check'
      AND conrelid = 'public.complaints'::regclass
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_comment_len_check
      CHECK (comment IS NULL OR char_length(comment) <= 1000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_admin_note_len_check'
      AND conrelid = 'public.complaints'::regclass
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_admin_note_len_check
      CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000);
  END IF;
END;
$$;

-- Старые дубли не должны помешать созданию уникального индекса.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY reporter_id, request_id
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM public.complaints
  WHERE request_id IS NOT NULL
    AND status IN ('new', 'in_progress', 'waiting_user')
)
UPDATE public.complaints AS complaint
SET
  status = 'closed',
  closed_at = COALESCE(complaint.closed_at, now()),
  admin_note = concat_ws(
    E'\n',
    NULLIF(complaint.admin_note, ''),
    'Автоматически закрыта при обновлении: по этой сделке уже была более новая открытая жалоба.'
  )
FROM ranked
WHERE complaint.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS complaints_one_open_per_deal_idx
  ON public.complaints (reporter_id, request_id)
  WHERE request_id IS NOT NULL
    AND status IN ('new', 'in_progress', 'waiting_user');

CREATE INDEX IF NOT EXISTS complaints_work_queue_idx
  ON public.complaints (status, updated_at DESC, created_at DESC);

-- Для старых связанных жалоб нормализуем объект жалобы по реальным участникам сделки.
UPDATE public.complaints AS complaint
SET
  target_author_id = CASE
    WHEN complaint.reporter_id = request.business_id THEN request.author_id
    ELSE NULL
  END,
  target_business_id = CASE
    WHEN author.user_id = complaint.reporter_id THEN request.business_id
    ELSE NULL
  END
FROM public.requests AS request
JOIN public.authors AS author ON author.id = request.author_id
WHERE complaint.request_id = request.id
  AND (
    complaint.reporter_id = request.business_id
    OR complaint.reporter_id = author.user_id
  );

CREATE OR REPLACE FUNCTION public.validate_complaint_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deal_business_id uuid;
  deal_author_id uuid;
  deal_author_user_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.reporter_id := OLD.reporter_id;
    NEW.request_id := OLD.request_id;
    NEW.target_author_id := OLD.target_author_id;
    NEW.target_business_id := OLD.target_business_id;
  END IF;

  -- Старые жалобы без сделки можно закрывать/комментировать,
  -- но новые обращения должны быть привязаны к конкретной сделке.
  IF NEW.request_id IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Complaint must be linked to a request';
    END IF;
    RETURN NEW;
  END IF;

  SELECT
    request.business_id,
    request.author_id,
    author.user_id
  INTO
    deal_business_id,
    deal_author_id,
    deal_author_user_id
  FROM public.requests AS request
  JOIN public.authors AS author ON author.id = request.author_id
  WHERE request.id = NEW.request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked request does not exist';
  END IF;

  IF NEW.reporter_id = deal_business_id THEN
    NEW.target_author_id := deal_author_id;
    NEW.target_business_id := NULL;
  ELSIF NEW.reporter_id = deal_author_user_id THEN
    NEW.target_author_id := NULL;
    NEW.target_business_id := deal_business_id;
  ELSE
    RAISE EXCEPTION 'Reporter is not a participant of the linked request';
  END IF;

  NEW.reason := btrim(NEW.reason);
  NEW.comment := NULLIF(btrim(COALESCE(NEW.comment, '')), '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_complaint_identity ON public.complaints;
CREATE TRIGGER trg_validate_complaint_identity
  BEFORE INSERT OR UPDATE OF reporter_id, request_id, target_author_id, target_business_id, reason, comment
  ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_complaint_identity();

CREATE OR REPLACE FUNCTION public.set_complaint_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'resolved' THEN
      NEW.resolved_at := now();
      NEW.closed_at := NULL;
    ELSIF NEW.status = 'closed' THEN
      NEW.closed_at := now();
    ELSIF NEW.status IN ('new', 'in_progress', 'waiting_user') THEN
      NEW.resolved_at := NULL;
      NEW.closed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_status_timestamps ON public.complaints;
CREATE TRIGGER trg_complaint_status_timestamps
  BEFORE UPDATE OF status ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_complaint_status_timestamps();

-- Жалобы создаются только через наш серверный API.
-- Браузер не может подменить reporter_id, request_id или объект жалобы прямым запросом в Supabase.
DROP POLICY IF EXISTS "Auth users can insert" ON public.complaints;
DROP POLICY IF EXISTS "Admin can view" ON public.complaints;
DROP POLICY IF EXISTS "Admin can update complaints" ON public.complaints;

REVOKE ALL ON TABLE public.complaints FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.complaints TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT
  to_regclass('public.complaints') AS complaints_table,
  to_regclass('public.complaints_one_open_per_deal_idx') AS duplicate_guard,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'complaints'
      AND column_name = 'resolved_at'
  ) AS workflow_ready;
