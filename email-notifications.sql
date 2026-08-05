\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS email_attempts integer,
  ADD COLUMN IF NOT EXISTS email_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_provider_id text,
  ADD COLUMN IF NOT EXISTS email_last_error text;

UPDATE public.notifications
SET title = CASE type
  WHEN 'new_request' THEN 'Новое предложение'
  WHEN 'request_viewed' THEN 'Предложение просмотрено'
  WHEN 'request_accepted' THEN 'Предложение принято'
  WHEN 'request_declined' THEN 'Предложение отклонено'
  WHEN 'request_cancelled' THEN 'Сделка отменена'
  WHEN 'request_completed' THEN 'Сделка завершена'
  WHEN 'new_message' THEN 'Новое сообщение'
  WHEN 'work_done' THEN 'Работа выполнена'
  WHEN 'new_review' THEN 'Новый отзыв'
  WHEN 'author_approved' THEN 'Анкета одобрена'
  WHEN 'author_rejected' THEN 'Анкета требует изменений'
  ELSE 'Новое уведомление'
END
WHERE title IS NULL OR btrim(title) = '';

UPDATE public.notifications
SET email_status = 'legacy_skipped',
    email_attempts = 0,
    email_processed_at = COALESCE(email_processed_at, now())
WHERE email_status IS NULL;

UPDATE public.notifications
SET email_attempts = 0
WHERE email_attempts IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN title SET DEFAULT 'Новое уведомление',
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN email_status SET DEFAULT 'pending',
  ALTER COLUMN email_status SET NOT NULL,
  ALTER COLUMN email_attempts SET DEFAULT 0,
  ALTER COLUMN email_attempts SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_email_status_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_email_status_check
      CHECK (email_status IN (
        'pending',
        'sending',
        'sent',
        'failed',
        'skipped',
        'suppressed',
        'legacy_skipped'
      ));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS notifications_email_queue_idx
  ON public.notifications (email_status, created_at)
  WHERE email_status IN ('pending', 'failed', 'sending');

CREATE INDEX IF NOT EXISTS notifications_email_provider_idx
  ON public.notifications (email_provider_id)
  WHERE email_provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  messages boolean NOT NULL DEFAULT true,
  requests boolean NOT NULL DEFAULT true,
  deals boolean NOT NULL DEFAULT true,
  reviews boolean NOT NULL DEFAULT true,
  moderation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_notification_preferences FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_suppressions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_ids uuid[] NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  notification_type text NOT NULL,
  subject text NOT NULL,
  provider text NOT NULL DEFAULT 'mailru_smtp',
  provider_message_id text,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_delivery_log
  ALTER COLUMN provider SET DEFAULT 'mailru_smtp';

CREATE INDEX IF NOT EXISTS email_delivery_log_user_created_idx
  ON public.email_delivery_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS email_delivery_log_provider_idx
  ON public.email_delivery_log (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_delivery_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_email_notifications(p_limit integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  type text,
  title text,
  body text,
  data jsonb,
  read boolean,
  created_at timestamptz,
  email_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_limit integer;
BEGIN
  safe_limit := LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);

  UPDATE public.notifications n
  SET email_status = 'skipped',
      email_processed_at = now(),
      email_claimed_at = NULL,
      email_last_error = 'READ_BEFORE_EMAIL'
  WHERE n.read = true
    AND n.email_status IN ('pending', 'failed', 'sending');

  RETURN QUERY
  WITH candidates AS (
    SELECT n.id
    FROM public.notifications n
    WHERE (
      n.email_status IN ('pending', 'failed')
      OR (
        n.email_status = 'sending'
        AND n.email_claimed_at < now() - interval '15 minutes'
      )
    )
      AND n.email_attempts < 5
      AND n.read = false
      AND (
        (n.type = 'new_message' AND n.created_at <= now() - interval '5 minutes')
        OR
        (n.type <> 'new_message' AND n.created_at <= now() - interval '20 seconds')
      )
    ORDER BY n.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT safe_limit
  ), claimed AS (
    UPDATE public.notifications n
    SET email_status = 'sending',
        email_attempts = n.email_attempts + 1,
        email_claimed_at = now(),
        email_last_error = NULL
    FROM candidates c
    WHERE n.id = c.id
    RETURNING
      n.id,
      n.user_id,
      n.type,
      n.title,
      n.body,
      n.data,
      n.read,
      n.created_at,
      n.email_attempts
  )
  SELECT
    c.id,
    c.user_id,
    c.type,
    c.title,
    c.body,
    c.data,
    c.read,
    c.created_at,
    c.email_attempts
  FROM claimed c
  ORDER BY c.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_notifications(integer) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
