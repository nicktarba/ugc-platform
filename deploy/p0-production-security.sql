-- SVOI UGC — P0 production security migration
-- 2026-08-19
-- Идемпотентно. Исправляет публичный доступ к authors/search_logs,
-- защищает жалобы и отзывы, устраняет дублирующий rating trigger.

BEGIN;

-- =========================================================
-- 1) AUTHORS: публично видны только approved; создание только своим author-аккаунтом.
-- =========================================================
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Anyone can read authors" ON public.authors;
DROP POLICY IF EXISTS "Anyone can insert authors" ON public.authors;
DROP POLICY IF EXISTS "Admin can update authors" ON public.authors;
DROP POLICY IF EXISTS "Author can update own profile" ON public.authors;
DROP POLICY IF EXISTS "Public can read approved authors" ON public.authors;
DROP POLICY IF EXISTS "Author can read own profile" ON public.authors;
DROP POLICY IF EXISTS "Authors can insert own profile" ON public.authors;

CREATE POLICY "Public can read approved authors"
  ON public.authors
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Author can read own profile"
  ON public.authors
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authors can insert own profile"
  ON public.authors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'author'
    )
  );

CREATE POLICY "Author can update own profile"
  ON public.authors
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON TABLE public.authors FROM anon, authenticated;
GRANT SELECT ON TABLE public.authors TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.authors TO authenticated;
GRANT ALL ON TABLE public.authors TO service_role;

-- Защищаем системные поля автора от ручной подмены из браузера.
-- Повторная отправка rejected -> pending разрешена владельцу анкеты.
CREATE OR REPLACE FUNCTION public.protect_author_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.avg_rating := OLD.avg_rating;
  NEW.reviews_count := OLD.reviews_count;
  NEW.completed_deals_count := OLD.completed_deals_count;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.user_id
       AND OLD.status = 'rejected'
       AND NEW.status = 'pending'
    THEN
      NULL; -- разрешаем повторную отправку на модерацию
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_status_change ON public.authors;
DROP TRIGGER IF EXISTS trg_prevent_author_status_change ON public.authors;
DROP TRIGGER IF EXISTS trg_protect_author_system_fields ON public.authors;
CREATE TRIGGER trg_protect_author_system_fields
  BEFORE UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_author_system_fields();

-- Системный счётчик завершённых сделок должен обновляться с правами владельца функции.
CREATE OR REPLACE FUNCTION public.increment_author_completed_deals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.authors
    SET completed_deals_count = completed_deals_count + 1
    WHERE id = NEW.author_id;
  END IF;

  IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.authors
    SET completed_deals_count = greatest(0, completed_deals_count - 1)
    WHERE id = NEW.author_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_completed_deals ON public.requests;
CREATE TRIGGER trg_author_completed_deals
  AFTER UPDATE OF status ON public.requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.increment_author_completed_deals();

-- =========================================================
-- 2) SEARCH LOGS: браузер больше не пишет напрямую в БД.
-- =========================================================
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert search log" ON public.search_logs;
DROP POLICY IF EXISTS "Admin can view search logs" ON public.search_logs;

REVOKE ALL ON TABLE public.search_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.search_logs TO service_role;

-- =========================================================
-- 3) REVIEWS: только завершённая собственная сделка и правильный author_id.
-- =========================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business can insert review" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_business" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;

CREATE POLICY "Reviews are public"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Business can insert review"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND r.business_id = auth.uid()
        AND r.author_id = author_id
        AND r.status = 'completed'
    )
  );

REVOKE ALL ON TABLE public.reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.reviews TO anon, authenticated;
GRANT INSERT ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;

CREATE OR REPLACE FUNCTION public.recalculate_author_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_author uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_author := OLD.author_id;
  ELSE
    target_author := NEW.author_id;
  END IF;

  UPDATE public.authors
  SET
    avg_rating = (
      SELECT round(avg(r.rating)::numeric, 2)
      FROM public.reviews r
      WHERE r.author_id = target_author
    ),
    reviews_count = (
      SELECT count(*)
      FROM public.reviews r
      WHERE r.author_id = target_author
    )
  WHERE id = target_author;

  IF TG_OP = 'UPDATE' AND OLD.author_id IS DISTINCT FROM NEW.author_id THEN
    UPDATE public.authors
    SET
      avg_rating = (
        SELECT round(avg(r.rating)::numeric, 2)
        FROM public.reviews r
        WHERE r.author_id = OLD.author_id
      ),
      reviews_count = (
        SELECT count(*)
        FROM public.reviews r
        WHERE r.author_id = OLD.author_id
      )
    WHERE id = OLD.author_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_rating ON public.reviews;
DROP TRIGGER IF EXISTS trg_recalc_author_rating ON public.reviews;
CREATE TRIGGER trg_author_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_author_rating();

-- =========================================================
-- 4) COMPLAINTS: только service_role пишет; поддерживаем жалобу по сделке и на профиль.
-- =========================================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.complaints FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.complaints TO service_role;

DROP POLICY IF EXISTS "Auth users can insert" ON public.complaints;
DROP POLICY IF EXISTS "Admin can view" ON public.complaints;
DROP POLICY IF EXISTS "Admin can update complaints" ON public.complaints;

CREATE UNIQUE INDEX IF NOT EXISTS complaints_one_open_profile_author_idx
  ON public.complaints (reporter_id, target_author_id)
  WHERE request_id IS NULL
    AND target_author_id IS NOT NULL
    AND status IN ('new', 'in_progress', 'waiting_user');

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
  profile_author_user_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.reporter_id := OLD.reporter_id;
    NEW.request_id := OLD.request_id;
    NEW.target_author_id := OLD.target_author_id;
    NEW.target_business_id := OLD.target_business_id;
  END IF;

  -- Жалоба на публичный профиль автора без привязки к сделке.
  IF NEW.request_id IS NULL THEN
    IF NEW.target_author_id IS NULL OR NEW.target_business_id IS NOT NULL THEN
      RAISE EXCEPTION 'Profile complaint must target an author';
    END IF;

    SELECT a.user_id
    INTO profile_author_user_id
    FROM public.authors a
    WHERE a.id = NEW.target_author_id
      AND a.status = 'approved';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target author does not exist';
    END IF;

    IF profile_author_user_id = NEW.reporter_id THEN
      RAISE EXCEPTION 'Cannot report own author profile';
    END IF;

    NEW.reason := btrim(NEW.reason);
    NEW.comment := NULLIF(btrim(COALESCE(NEW.comment, '')), '');
    RETURN NEW;
  END IF;

  -- Жалоба по сделке.
  SELECT
    r.business_id,
    r.author_id,
    a.user_id
  INTO
    deal_business_id,
    deal_author_id,
    deal_author_user_id
  FROM public.requests r
  JOIN public.authors a ON a.id = r.author_id
  WHERE r.id = NEW.request_id;

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

COMMIT;

NOTIFY pgrst, 'reload schema';
