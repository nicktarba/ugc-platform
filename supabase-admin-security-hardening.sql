-- =========================================================
-- СВОИ UGC — финальная защита админ-панели
-- Идемпотентная миграция для self-hosted Supabase.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
  rate_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_admin_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  retry_after_seconds integer,
  remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_row public.admin_rate_limits%ROWTYPE;
  v_window interval;
BEGIN
  IF p_rate_key IS NULL OR char_length(p_rate_key) < 32 OR char_length(p_rate_key) > 128 THEN
    RAISE EXCEPTION 'invalid rate key';
  END IF;
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'invalid rate limit';
  END IF;
  IF p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate window';
  END IF;

  v_window := make_interval(secs => p_window_seconds);

  INSERT INTO public.admin_rate_limits AS limits (
    rate_key,
    window_started_at,
    hits,
    updated_at
  )
  VALUES (
    p_rate_key,
    v_now,
    1,
    v_now
  )
  ON CONFLICT (rate_key)
  DO UPDATE SET
    window_started_at = CASE
      WHEN limits.window_started_at + v_window <= v_now THEN v_now
      ELSE limits.window_started_at
    END,
    hits = CASE
      WHEN limits.window_started_at + v_window <= v_now THEN 1
      ELSE limits.hits + 1
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  DELETE FROM public.admin_rate_limits
  WHERE updated_at < v_now - interval '2 days';

  allowed := v_row.hits <= p_limit;
  remaining := GREATEST(0, p_limit - v_row.hits);
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_row.window_started_at + v_window) - v_now)))::integer
    )
  END;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_admin_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_admin_rate_limit(text, integer, integer) TO service_role;


CREATE TABLE IF NOT EXISTS public.admin_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 100),
  subject_hash text NOT NULL CHECK (char_length(subject_hash) BETWEEN 32 AND 128),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_bucket timestamptz NOT NULL,
  occurrences integer NOT NULL DEFAULT 1 CHECK (occurrences >= 1),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, subject_hash, event_bucket)
);

CREATE INDEX IF NOT EXISTS admin_security_events_last_seen_idx
  ON public.admin_security_events (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS admin_security_events_admin_idx
  ON public.admin_security_events (admin_id, last_seen_at DESC);

ALTER TABLE public.admin_security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_security_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_security_events TO service_role;

CREATE OR REPLACE FUNCTION public.record_admin_security_event(
  p_event_type text,
  p_subject_hash text,
  p_admin_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('hour', now());
BEGIN
  IF p_event_type IS NULL OR char_length(p_event_type) < 1 OR char_length(p_event_type) > 100 THEN
    RAISE EXCEPTION 'invalid event type';
  END IF;
  IF p_subject_hash IS NULL OR char_length(p_subject_hash) < 32 OR char_length(p_subject_hash) > 128 THEN
    RAISE EXCEPTION 'invalid subject hash';
  END IF;

  INSERT INTO public.admin_security_events (
    event_type,
    subject_hash,
    admin_id,
    event_bucket,
    occurrences,
    metadata,
    first_seen_at,
    last_seen_at
  )
  VALUES (
    p_event_type,
    p_subject_hash,
    p_admin_id,
    v_bucket,
    1,
    COALESCE(p_metadata, '{}'::jsonb),
    now(),
    now()
  )
  ON CONFLICT (event_type, subject_hash, event_bucket)
  DO UPDATE SET
    occurrences = public.admin_security_events.occurrences + 1,
    metadata = EXCLUDED.metadata,
    last_seen_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_admin_security_event(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_security_event(text, text, uuid, jsonb) TO service_role;


CREATE TABLE IF NOT EXISTS public.admin_backup_status (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_backup_at timestamptz,
  last_backup_path text,
  last_backup_size_bytes bigint,
  last_backup_sha256 text,
  database_verified boolean NOT NULL DEFAULT false,
  storage_included boolean NOT NULL DEFAULT false,
  backup_ok boolean NOT NULL DEFAULT false,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_backup_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_backup_status FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_backup_status TO service_role;

INSERT INTO public.admin_backup_status (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;


-- Журнал администраторов доступен серверу только на чтение и добавление.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.admin_audit_log FROM service_role;
GRANT SELECT, INSERT ON TABLE public.admin_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'admin audit log is append-only';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_audit_mutation ON public.admin_audit_log;
CREATE TRIGGER trg_prevent_admin_audit_mutation
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_mutation();

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT
  to_regclass('public.admin_rate_limits') AS rate_limits,
  to_regclass('public.admin_security_events') AS security_events,
  to_regclass('public.admin_backup_status') AS backup_status,
  has_function_privilege('service_role', 'public.consume_admin_rate_limit(text,integer,integer)', 'EXECUTE') AS rate_limit_rpc_ready;
