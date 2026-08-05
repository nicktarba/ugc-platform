\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

UPDATE public.notifications
SET read = false
WHERE read IS NULL;

UPDATE public.notifications
SET data = '{}'::jsonb
WHERE data IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN read SET DEFAULT false,
  ALTER COLUMN read SET NOT NULL,
  ALTER COLUMN data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN data SET NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_user_unread_created_idx
  ON public.notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_request_idx
  ON public.notifications ((data ->> 'request_id'))
  WHERE data ? 'request_id';

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.notifications',
      policy_record.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read) ON TABLE public.notifications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_user_id uuid;
  author_name text;
  business_name text;
  actor_id uuid;
BEGIN
  SELECT a.user_id, COALESCE(NULLIF(a.name, ''), 'Автор')
  INTO author_user_id, author_name
  FROM public.authors a
  WHERE a.id = NEW.author_id;

  SELECT COALESCE(NULLIF(bp.company_name, ''), NULLIF(NEW.business_email, ''), 'Бизнес')
  INTO business_name
  FROM public.business_profiles bp
  WHERE bp.id = NEW.business_id;

  business_name := COALESCE(business_name, NULLIF(NEW.business_email, ''), 'Бизнес');
  actor_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF author_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data, read)
      SELECT
        author_user_id,
        'new_request',
        'Новое предложение',
        business_name || ' отправил вам предложение о сотрудничестве.',
        jsonb_build_object('request_id', NEW.id),
        false
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = author_user_id
          AND n.type = 'new_request'
          AND n.data ->> 'request_id' = NEW.id::text
      );
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'viewed' THEN
      IF NEW.business_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, data, read)
        SELECT
          NEW.business_id,
          'request_viewed',
          'Предложение просмотрено',
          author_name || ' посмотрел ваше предложение.',
          jsonb_build_object('request_id', NEW.id),
          false
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.notifications n
          WHERE n.user_id = NEW.business_id
            AND n.type = 'request_viewed'
            AND n.data ->> 'request_id' = NEW.id::text
        );
      END IF;

    WHEN 'accepted' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data, read)
      SELECT
        NEW.business_id,
        'request_accepted',
        'Предложение принято',
        author_name || ' принял ваше предложение. Можно переходить к работе.',
        jsonb_build_object('request_id', NEW.id),
        false
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = NEW.business_id
          AND n.type = 'request_accepted'
          AND n.data ->> 'request_id' = NEW.id::text
      );

    WHEN 'declined' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data, read)
      SELECT
        NEW.business_id,
        'request_declined',
        'Предложение отклонено',
        author_name || ' отклонил ваше предложение.',
        jsonb_build_object('request_id', NEW.id),
        false
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = NEW.business_id
          AND n.type = 'request_declined'
          AND n.data ->> 'request_id' = NEW.id::text
      );

    WHEN 'cancelled' THEN
      IF actor_id = NEW.business_id THEN
        IF author_user_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, data, read)
          VALUES (
            author_user_id,
            'request_cancelled',
            'Сделка отменена',
            business_name || ' отменил сделку.',
            jsonb_build_object('request_id', NEW.id),
            false
          );
        END IF;
      ELSIF actor_id = author_user_id THEN
        INSERT INTO public.notifications (user_id, type, title, body, data, read)
        VALUES (
          NEW.business_id,
          'request_cancelled',
          'Сделка отменена',
          author_name || ' отменил сделку.',
          jsonb_build_object('request_id', NEW.id),
          false
        );
      ELSE
        IF author_user_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, data, read)
          VALUES (
            author_user_id,
            'request_cancelled',
            'Сделка отменена',
            'Статус сделки изменён на «Отменено».',
            jsonb_build_object('request_id', NEW.id),
            false
          );
        END IF;

        INSERT INTO public.notifications (user_id, type, title, body, data, read)
        VALUES (
          NEW.business_id,
          'request_cancelled',
          'Сделка отменена',
          'Статус сделки изменён на «Отменено».',
          jsonb_build_object('request_id', NEW.id),
          false
        );
      END IF;

    WHEN 'completed' THEN
      IF actor_id = NEW.business_id THEN
        IF author_user_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, data, read)
          VALUES (
            author_user_id,
            'request_completed',
            'Сделка завершена',
            business_name || ' подтвердил завершение сделки.',
            jsonb_build_object('request_id', NEW.id),
            false
          );
        END IF;
      ELSIF actor_id = author_user_id THEN
        INSERT INTO public.notifications (user_id, type, title, body, data, read)
        VALUES (
          NEW.business_id,
          'request_completed',
          'Сделка завершена',
          author_name || ' завершил сделку.',
          jsonb_build_object('request_id', NEW.id),
          false
        );
      ELSE
        IF author_user_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, data, read)
          VALUES (
            author_user_id,
            'request_completed',
            'Сделка завершена',
            'Сделка отмечена как завершённая.',
            jsonb_build_object('request_id', NEW.id),
            false
          );
        END IF;

        INSERT INTO public.notifications (user_id, type, title, body, data, read)
        VALUES (
          NEW.business_id,
          'request_completed',
          'Сделка завершена',
          'Сделка отмечена как завершённая.',
          jsonb_build_object('request_id', NEW.id),
          false
        );
      END IF;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_request_notification() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_request_notification ON public.requests;
CREATE TRIGGER trg_request_notification
AFTER INSERT OR UPDATE OF status
ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.create_request_notification();

CREATE OR REPLACE FUNCTION public.notify_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user_id uuid;
  author_user_id uuid;
  recipient_id uuid;
  sender_name text;
  message_preview text;
BEGIN
  IF NEW.sender_role = 'author'
     AND NEW.text LIKE '✅ Работа выполнена.%' THEN
    RETURN NEW;
  END IF;

  SELECT
    r.business_id,
    a.user_id,
    CASE
      WHEN NEW.sender_id = r.business_id
        THEN COALESCE(NULLIF(bp.company_name, ''), NULLIF(r.business_email, ''), 'Бизнес')
      ELSE COALESCE(NULLIF(a.name, ''), 'Автор')
    END
  INTO business_user_id, author_user_id, sender_name
  FROM public.requests r
  JOIN public.authors a ON a.id = r.author_id
  LEFT JOIN public.business_profiles bp ON bp.id = r.business_id
  WHERE r.id = NEW.request_id;

  IF NEW.sender_id = business_user_id THEN
    recipient_id := author_user_id;
  ELSIF NEW.sender_id = author_user_id THEN
    recipient_id := business_user_id;
  ELSE
    RETURN NEW;
  END IF;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  message_preview := left(regexp_replace(NEW.text, '[[:space:]]+', ' ', 'g'), 160);

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  VALUES (
    recipient_id,
    'new_message',
    'Новое сообщение от ' || sender_name,
    message_preview,
    jsonb_build_object(
      'request_id', NEW.request_id,
      'message_id', NEW.id
    ),
    false
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_message_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_message_notification ON public.messages;
CREATE TRIGGER trg_message_notification
AFTER INSERT
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_insert();

CREATE OR REPLACE FUNCTION public.notify_review_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_user_id uuid;
  business_name text;
BEGIN
  SELECT a.user_id
  INTO author_user_id
  FROM public.authors a
  WHERE a.id = NEW.author_id;

  IF author_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(bp.company_name, ''), 'Бизнес')
  INTO business_name
  FROM public.business_profiles bp
  WHERE bp.id = NEW.business_id;

  business_name := COALESCE(business_name, 'Бизнес');

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  SELECT
    author_user_id,
    'new_review',
    'Новый отзыв',
    business_name || ' оставил отзыв: ' || NEW.rating::text || ' из 5.',
    jsonb_build_object(
      'request_id', NEW.request_id,
      'review_id', NEW.id,
      'rating', NEW.rating
    ),
    false
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = author_user_id
      AND n.type = 'new_review'
      AND n.data ->> 'review_id' = NEW.id::text
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_review_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_review_notification ON public.reviews;
CREATE TRIGGER trg_review_notification
AFTER INSERT
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.notify_review_insert();

CREATE OR REPLACE FUNCTION public.notify_author_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
     OR NEW.user_id IS NULL
     OR NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.status = 'approved' THEN 'author_approved' ELSE 'author_rejected' END,
    CASE WHEN NEW.status = 'approved' THEN 'Анкета одобрена' ELSE 'Анкета требует изменений' END,
    CASE
      WHEN NEW.status = 'approved'
        THEN 'Ваш профиль прошёл модерацию и доступен в каталоге.'
      ELSE 'Проверьте профиль и внесите необходимые изменения.'
    END,
    jsonb_build_object('author_id', NEW.id),
    false
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_author_moderation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_author_moderation_notification ON public.authors;
CREATE TRIGGER trg_author_moderation_notification
AFTER UPDATE OF status
ON public.authors
FOR EACH ROW
EXECUTE FUNCTION public.notify_author_moderation();

CREATE OR REPLACE FUNCTION public.mark_work_done(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  request_status text;
  business_user_id uuid;
  author_user_id uuid;
  author_name text;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT
    r.status,
    r.business_id,
    a.user_id,
    COALESCE(NULLIF(a.name, ''), 'Автор')
  INTO request_status, business_user_id, author_user_id, author_name
  FROM public.requests r
  JOIN public.authors a ON a.id = r.author_id
  WHERE r.id = p_request_id;

  IF author_user_id IS NULL OR author_user_id <> current_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF request_status <> 'accepted' THEN
    RAISE EXCEPTION 'DEAL_NOT_ACTIVE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = business_user_id
      AND n.type = 'work_done'
      AND n.data ->> 'request_id' = p_request_id::text
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.messages (
    request_id,
    sender_id,
    sender_role,
    text,
    read
  ) VALUES (
    p_request_id,
    current_user_id,
    'author',
    '✅ Работа выполнена. Жду подтверждения и завершения сделки.',
    false
  );

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  VALUES (
    business_user_id,
    'work_done',
    'Автор отметил работу как выполненную',
    author_name || ' завершил работу. Проверьте результат и завершите сделку.',
    jsonb_build_object('request_id', p_request_id),
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_work_done(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_work_done(uuid) TO authenticated;

COMMIT;
