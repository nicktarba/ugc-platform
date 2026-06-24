-- ===========================================
-- SECURITY FIXES BATCH 2 — ugcmarket
-- Пункты 4, 5, 6, 7, 10, 11
-- Выполнить в Supabase SQL Editor целиком
-- ===========================================


-- ═══ 4. UNIQUE на authors.user_id ═══
-- Один юзер = один профиль автора
ALTER TABLE authors ADD CONSTRAINT authors_user_id_unique UNIQUE (user_id);


-- ═══ 5. Валидация переходов статуса ═══
-- Разрешённые переходы:
--   new → viewed (автор)
--   new/viewed → accepted (автор)
--   new/viewed → declined (автор)
--   new/viewed/accepted → cancelled (бизнес или автор)
--   accepted → completed (бизнес)
CREATE OR REPLACE FUNCTION validate_request_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_is_business boolean;
  caller_is_author boolean;
  allowed boolean := false;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  caller_is_business := (auth.uid() = OLD.business_id);
  caller_is_author := (auth.uid() = (SELECT user_id FROM authors WHERE id = OLD.author_id));

  -- new → viewed (автор)
  IF OLD.status = 'new' AND NEW.status = 'viewed' AND caller_is_author THEN
    allowed := true;
  END IF;

  -- new/viewed → accepted (автор)
  IF OLD.status IN ('new', 'viewed') AND NEW.status = 'accepted' AND caller_is_author THEN
    allowed := true;
  END IF;

  -- new/viewed → declined (автор)
  IF OLD.status IN ('new', 'viewed') AND NEW.status = 'declined' AND caller_is_author THEN
    allowed := true;
  END IF;

  -- new/viewed/accepted → cancelled (бизнес или автор)
  IF OLD.status IN ('new', 'viewed', 'accepted') AND NEW.status = 'cancelled' AND (caller_is_business OR caller_is_author) THEN
    allowed := true;
  END IF;

  -- accepted → completed (бизнес)
  IF OLD.status = 'accepted' AND NEW.status = 'completed' AND caller_is_business THEN
    allowed := true;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid status transition from % to % for this user', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_status_transition ON requests;
CREATE TRIGGER trg_validate_status_transition
  BEFORE UPDATE ON requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_request_status_transition();


-- ═══ 6. Защита от self-dealing ═══
-- Бизнес не может отправить заявку автору, который привязан к тому же auth.uid()
CREATE OR REPLACE FUNCTION prevent_self_dealing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  author_user_id uuid;
BEGIN
  SELECT user_id INTO author_user_id FROM authors WHERE id = NEW.author_id;
  
  IF author_user_id = NEW.business_id THEN
    RAISE EXCEPTION 'Cannot create a request to your own author profile';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_dealing ON requests;
CREATE TRIGGER trg_prevent_self_dealing
  BEFORE INSERT ON requests
  FOR EACH ROW EXECUTE FUNCTION prevent_self_dealing();


-- ═══ 7. Один open deal на пару ═══
-- Partial unique index: только один active request на пару business+author
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_deal_per_pair
  ON requests (business_id, author_id)
  WHERE status IN ('new', 'viewed', 'accepted');


-- ═══ 10. Storage — проверка расширения аватаров ═══
-- Только jpg, jpeg, png, webp
DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
CREATE POLICY "Avatar upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );


-- ═══ 11. Лимиты длины текстовых полей ═══
-- Authors
ALTER TABLE authors ADD CONSTRAINT chk_author_name_len CHECK (char_length(name) <= 100);
ALTER TABLE authors ADD CONSTRAINT chk_author_city_len CHECK (char_length(city) <= 100);
ALTER TABLE authors ADD CONSTRAINT chk_author_bio_len CHECK (char_length(bio) <= 2000);
ALTER TABLE authors ADD CONSTRAINT chk_author_hobbies_len CHECK (char_length(hobbies) <= 500);
ALTER TABLE authors ADD CONSTRAINT chk_author_occupation_len CHECK (char_length(occupation) <= 200);
ALTER TABLE authors ADD CONSTRAINT chk_author_instagram_len CHECK (char_length(instagram_url) <= 500);
ALTER TABLE authors ADD CONSTRAINT chk_author_telegram_len CHECK (char_length(telegram_url) <= 500);

-- Messages
ALTER TABLE messages ADD CONSTRAINT chk_message_text_len CHECK (char_length(text) <= 5000);

-- Requests
ALTER TABLE requests ADD CONSTRAINT chk_request_message_len CHECK (char_length(message) <= 3000);
ALTER TABLE requests ADD CONSTRAINT chk_request_budget_len CHECK (char_length(budget) <= 200);

-- Reviews
ALTER TABLE reviews ADD CONSTRAINT chk_review_comment_len CHECK (char_length(comment) <= 2000);

-- Business profiles
ALTER TABLE business_profiles ADD CONSTRAINT chk_bp_name_len CHECK (char_length(company_name) <= 200);
ALTER TABLE business_profiles ADD CONSTRAINT chk_bp_desc_len CHECK (char_length(description) <= 2000);
ALTER TABLE business_profiles ADD CONSTRAINT chk_bp_niche_len CHECK (char_length(niche) <= 200);
ALTER TABLE business_profiles ADD CONSTRAINT chk_bp_url_len CHECK (char_length(website_url) <= 500);

-- Lifestyle array max 15 items
ALTER TABLE authors ADD CONSTRAINT chk_author_lifestyle_len CHECK (array_length(lifestyle, 1) IS NULL OR array_length(lifestyle, 1) <= 15);


-- ===========================================
-- ПРОВЕРКА (раскомментируй после применения)
-- ===========================================
-- SELECT conname FROM pg_constraint WHERE conrelid = 'authors'::regclass AND conname LIKE 'chk_%' OR conname = 'authors_user_id_unique';
-- SELECT conname FROM pg_constraint WHERE conrelid = 'messages'::regclass AND conname LIKE 'chk_%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'requests' AND indexname = 'idx_one_open_deal_per_pair';
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'requests'::regclass AND tgname LIKE 'trg_%';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'Avatar%';
