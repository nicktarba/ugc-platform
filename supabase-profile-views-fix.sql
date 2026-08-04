BEGIN;

ALTER TABLE public.profile_views
ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON TABLE public.profile_views
TO anon, authenticated;

GRANT SELECT ON TABLE public.profile_views
TO authenticated;

CREATE INDEX IF NOT EXISTS
profile_views_author_created_at_idx
ON public.profile_views (author_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_read_profile_views(
  target_author_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authors
    WHERE authors.id = target_author_id
      AND authors.user_id = auth.uid()
  );
$$;

REVOKE ALL
ON FUNCTION public.can_read_profile_views(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_read_profile_views(uuid)
TO authenticated;

DROP POLICY IF EXISTS
"profile_views_insert_visitors"
ON public.profile_views;

CREATE POLICY "profile_views_insert_visitors"
ON public.profile_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  viewer_id IS NULL
  OR viewer_id = auth.uid()
);

DROP POLICY IF EXISTS
"profile_views_select_owner"
ON public.profile_views;

CREATE POLICY "profile_views_select_owner"
ON public.profile_views
FOR SELECT
TO authenticated
USING (
  public.can_read_profile_views(author_id)
);

COMMIT;
