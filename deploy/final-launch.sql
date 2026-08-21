\set ON_ERROR_STOP on

BEGIN;

-- =========================================================
-- СВОИ UGC — final launch: notifications + support/storage
-- Идемпотентная миграция поверх текущей production-базы.
-- Старые события задним числом не создаются.
-- =========================================================

-- ---------- Email preferences / queue ----------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_unique_idx
  ON public.notifications (event_key)
  WHERE event_key IS NOT NULL;

ALTER TABLE public.email_notification_preferences
  ADD COLUMN IF NOT EXISTS account boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS complaints boolean NOT NULL DEFAULT true;

-- Всё, что пользователь уже прочитал ДО этой миграции, не отправляем задним числом.
UPDATE public.notifications n
SET email_status = 'skipped',
    email_processed_at = COALESCE(n.email_processed_at, now()),
    email_claimed_at = NULL,
    email_last_error = 'READ_BEFORE_FINAL_LAUNCH'
WHERE n.read = true
  AND n.email_status IN ('pending', 'failed', 'sending');

-- Администраторы для системных уведомлений. UUID из ADMIN_USER_IDS
-- установщик добавляет отдельно после этой транзакции.
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'environment',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_admins TO service_role;

DO $$
BEGIN
  IF to_regclass('public.admin_security') IS NOT NULL THEN
    INSERT INTO public.platform_admins (user_id, source)
    SELECT admin_id, 'admin_security'
    FROM public.admin_security
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_launch_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_event_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    read,
    event_key
  ) VALUES (
    p_user_id,
    left(COALESCE(NULLIF(btrim(p_type), ''), 'system'), 100),
    left(COALESCE(NULLIF(btrim(p_title), ''), 'Новое уведомление'), 300),
    CASE WHEN p_body IS NULL THEN NULL ELSE left(btrim(p_body), 2000) END,
    COALESCE(p_data, '{}'::jsonb),
    false,
    NULLIF(left(btrim(COALESCE(p_event_key, '')), 500), '')
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_launch_notification(uuid, text, text, text, jsonb, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_launch_notification(uuid, text, text, text, jsonb, text)
TO service_role;

CREATE OR REPLACE FUNCTION public.notify_platform_admins_launch(
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_event_key_prefix text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record record;
BEGIN
  FOR admin_record IN
    SELECT DISTINCT user_id
    FROM public.platform_admins
  LOOP
    PERFORM public.enqueue_launch_notification(
      admin_record.user_id,
      p_type,
      p_title,
      p_body,
      p_data,
      CASE
        WHEN p_event_key_prefix IS NULL THEN NULL
        ELSE p_event_key_prefix || ':' || admin_record.user_id::text
      END
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_platform_admins_launch(text, text, text, jsonb, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_platform_admins_launch(text, text, text, jsonb, text)
TO service_role;

-- ---------- Account created ----------
CREATE OR REPLACE FUNCTION public.notify_profile_created_launch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_label text;
  user_url text;
  admin_url text;
  user_body text;
BEGIN
  role_label := CASE NEW.role
    WHEN 'author' THEN 'автора'
    WHEN 'business' THEN 'бизнеса'
    ELSE 'пользователя'
  END;

  user_url := CASE NEW.role
    WHEN 'author' THEN '/dashboard/author/profile'
    WHEN 'business' THEN '/dashboard/business/profile'
    ELSE '/dashboard/notifications'
  END;

  admin_url := CASE NEW.role
    WHEN 'author' THEN '/dashboard/admin?section=authors'
    WHEN 'business' THEN '/dashboard/admin?section=businesses'
    ELSE '/dashboard/admin'
  END;

  user_body := CASE NEW.role
    WHEN 'author' THEN 'Аккаунт создан. Заполните анкету автора и отправьте её на модерацию.'
    WHEN 'business' THEN 'Аккаунт создан. Заполните профиль компании и переходите к поиску авторов.'
    ELSE 'Аккаунт успешно создан.'
  END;

  PERFORM public.enqueue_launch_notification(
    NEW.id,
    'account_created',
    'Добро пожаловать в СВОИ UGC',
    user_body,
    jsonb_build_object('role', NEW.role, 'url', user_url),
    'account-created:' || NEW.id::text
  );

  PERFORM public.notify_platform_admins_launch(
    'admin_new_account',
    'Новый аккаунт ' || role_label,
    COALESCE(NULLIF(NEW.email, ''), 'Пользователь без email') || ' зарегистрировался на платформе.',
    jsonb_build_object('user_id', NEW.id, 'role', NEW.role, 'url', admin_url),
    'admin-new-account:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_created_notification_launch ON public.profiles;
CREATE TRIGGER trg_profile_created_notification_launch
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_profile_created_launch();

-- ---------- Business profile completed ----------
CREATE OR REPLACE FUNCTION public.notify_business_profile_completed_launch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_complete boolean;
  is_complete boolean;
BEGIN
  is_complete := COALESCE(NULLIF(btrim(NEW.company_name), ''), '') <> ''
    AND COALESCE(NULLIF(btrim(NEW.inn), ''), '') <> '';

  was_complete := CASE
    WHEN TG_OP = 'INSERT' THEN false
    ELSE COALESCE(NULLIF(btrim(OLD.company_name), ''), '') <> ''
      AND COALESCE(NULLIF(btrim(OLD.inn), ''), '') <> ''
  END;

  IF is_complete AND NOT was_complete THEN
    PERFORM public.enqueue_launch_notification(
      NEW.id,
      'business_profile_completed',
      'Профиль компании заполнен',
      'Профиль сохранён. Теперь можно переходить к поиску авторов и отправлять предложения.',
      jsonb_build_object('url', '/dashboard/business/profile'),
      'business-profile-completed:' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_profile_completed_notification_launch ON public.business_profiles;
CREATE TRIGGER trg_business_profile_completed_notification_launch
AFTER INSERT OR UPDATE OF company_name, inn ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_business_profile_completed_launch();

-- ---------- Author submitted ----------
CREATE OR REPLACE FUNCTION public.notify_author_submission_launch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_submission boolean;
  submission_label text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_submission := NEW.status = 'pending';
  ELSE
    is_submission := NEW.status = 'pending'
      AND OLD.status IS DISTINCT FROM NEW.status;
  END IF;

  IF NOT is_submission THEN
    RETURN NEW;
  END IF;

  submission_label := CASE
    WHEN TG_OP = 'UPDATE' THEN 'Анкета повторно отправлена на модерацию'
    ELSE 'Анкета отправлена на модерацию'
  END;

  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.enqueue_launch_notification(
      NEW.user_id,
      'author_submitted',
      submission_label,
      'Мы получили анкету. После проверки сообщим результат во внутренних уведомлениях и по email.',
      jsonb_build_object('author_id', NEW.id, 'url', '/dashboard/author/profile'),
      NULL
    );
  END IF;

  PERFORM public.notify_platform_admins_launch(
    'admin_author_pending',
    CASE
      WHEN TG_OP = 'UPDATE' THEN 'Анкета повторно отправлена'
      ELSE 'Новая анкета на модерации'
    END,
    COALESCE(NULLIF(NEW.name, ''), 'Автор') || ' ожидает проверки.',
    jsonb_build_object('author_id', NEW.id, 'url', '/dashboard/admin?section=authors'),
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_submission_notification_launch ON public.authors;
CREATE TRIGGER trg_author_submission_notification_launch
AFTER INSERT OR UPDATE OF status ON public.authors
FOR EACH ROW
EXECUTE FUNCTION public.notify_author_submission_launch();

-- ---------- Author moderation result (replace old trigger) ----------
CREATE OR REPLACE FUNCTION public.notify_author_moderation_launch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_body text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
     OR NEW.user_id IS NULL
     OR NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  notification_body := CASE
    WHEN NEW.status = 'approved'
      THEN 'Ваш профиль прошёл модерацию и опубликован в каталоге авторов.'
    ELSE concat_ws(
      ' ',
      'Анкета требует изменений.',
      CASE
        WHEN NULLIF(btrim(COALESCE(NEW.rejection_reason, '')), '') IS NOT NULL
          THEN 'Причина: ' || left(btrim(NEW.rejection_reason), 700)
        ELSE 'Откройте профиль, проверьте данные и отправьте анкету повторно.'
      END
    )
  END;

  PERFORM public.enqueue_launch_notification(
    NEW.user_id,
    CASE WHEN NEW.status = 'approved' THEN 'author_approved' ELSE 'author_rejected' END,
    CASE WHEN NEW.status = 'approved' THEN 'Анкета одобрена' ELSE 'Анкета требует изменений' END,
    notification_body,
    jsonb_build_object(
      'author_id', NEW.id,
      'status', NEW.status,
      'rejection_reason', NEW.rejection_reason,
      'url', '/dashboard/author/profile'
    ),
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_moderation_notification ON public.authors;
DROP TRIGGER IF EXISTS trg_author_moderation_notification_v3 ON public.authors;
DROP TRIGGER IF EXISTS trg_author_moderation_notification_launch ON public.authors;
CREATE TRIGGER trg_author_moderation_notification_launch
AFTER UPDATE OF status ON public.authors
FOR EACH ROW
EXECUTE FUNCTION public.notify_author_moderation_launch();

-- ---------- Complaints ----------
CREATE OR REPLACE FUNCTION public.notify_complaint_events_launch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label text;
  status_body text;
  request_url text;
BEGIN
  request_url := CASE
    WHEN NEW.request_id IS NULL THEN '/dashboard/notifications'
    ELSE '/dashboard/chat/' || NEW.request_id::text
  END;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_launch_notification(
      NEW.reporter_id,
      'complaint_created',
      'Жалоба принята',
      'Обращение зарегистрировано. Мы сообщим, когда его статус изменится.',
      jsonb_build_object(
        'complaint_id', NEW.id,
        'request_id', NEW.request_id,
        'status', NEW.status,
        'url', request_url
      ),
      'complaint-created:' || NEW.id::text || ':reporter'
    );

    PERFORM public.notify_platform_admins_launch(
      'admin_complaint_created',
      'Новая жалоба',
      'На платформе зарегистрировано новое обращение. Причина: ' || left(COALESCE(NEW.reason, 'не указана'), 180),
      jsonb_build_object(
        'complaint_id', NEW.id,
        'request_id', NEW.request_id,
        'status', NEW.status,
        'url', '/dashboard/admin?section=complaints'
      ),
      'complaint-created:' || NEW.id::text || ':admin'
    );

    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  status_label := CASE NEW.status
    WHEN 'new' THEN 'Новая'
    WHEN 'in_progress' THEN 'В работе'
    WHEN 'waiting_user' THEN 'Ожидает вашего ответа'
    WHEN 'resolved' THEN 'Решена'
    WHEN 'closed' THEN 'Закрыта'
    ELSE NEW.status
  END;

  status_body := 'Новый статус обращения: «' || status_label || '».';

  IF NULLIF(btrim(COALESCE(NEW.admin_note, '')), '') IS NOT NULL THEN
    status_body := status_body || ' Комментарий поддержки: ' || left(btrim(NEW.admin_note), 700);
  END IF;

  PERFORM public.enqueue_launch_notification(
    NEW.reporter_id,
    'complaint_updated',
    'Статус жалобы изменён',
    status_body,
    jsonb_build_object(
      'complaint_id', NEW.id,
      'request_id', NEW.request_id,
      'status', NEW.status,
      'url', request_url
    ),
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_notification_v3 ON public.complaints;
DROP TRIGGER IF EXISTS trg_complaint_notification_launch ON public.complaints;
CREATE TRIGGER trg_complaint_notification_launch
AFTER INSERT OR UPDATE OF status ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_complaint_events_launch();

-- ---------- Email claim behavior ----------
-- Сообщения: письмо только если пользователь не открыл чат за 5 минут.
-- Остальные важные события: email отправляется независимо от того,
-- успел ли пользователь прочитать внутреннее уведомление за эти 20 секунд.
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
      email_last_error = 'MESSAGE_READ_BEFORE_EMAIL'
  WHERE n.type = 'new_message'
    AND n.read = true
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
      AND (n.type <> 'new_message' OR n.read = false)
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

-- ---------- Avatar storage hardening ----------
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;

CREATE POLICY "Avatar upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.filename(name)) ~ '^(avatar|logo)\.(jpg|png|webp)$'
  );

CREATE POLICY "Avatar update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(storage.filename(name)) ~ '^(avatar|logo)\.(jpg|png|webp)$'
  );

CREATE POLICY "Avatar delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT
  to_regclass('public.platform_admins') AS platform_admins,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_notification_preferences'
      AND column_name = 'account'
  ) AS account_preferences_ready,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_notification_preferences'
      AND column_name = 'complaints'
  ) AS complaint_preferences_ready,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'avatars') AS avatar_size_limit,
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'avatars') AS avatar_mime_types;
