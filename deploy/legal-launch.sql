\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('terms', 'personal_data', 'author_publication')),
  document_version text NOT NULL,
  action text NOT NULL CHECK (action IN ('granted', 'revoked')),
  subject_name text,
  subject_contact text,
  source text NOT NULL DEFAULT 'web',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_consent_events_user_type_created_idx
  ON public.legal_consent_events (user_id, consent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS legal_consent_events_type_version_idx
  ON public.legal_consent_events (consent_type, document_version);

ALTER TABLE public.legal_consent_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.legal_consent_events FROM PUBLIC;
REVOKE ALL ON TABLE public.legal_consent_events FROM anon;
REVOKE ALL ON TABLE public.legal_consent_events FROM authenticated;
REVOKE UPDATE, DELETE ON TABLE public.legal_consent_events FROM service_role;
GRANT SELECT, INSERT ON TABLE public.legal_consent_events TO service_role;

COMMENT ON TABLE public.legal_consent_events IS
  'Append-only application audit trail of legal document acceptances and consent actions. Application writes through server-side service role only.';

COMMIT;
