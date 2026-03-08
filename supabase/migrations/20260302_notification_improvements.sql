-- ============================================================
-- Notification System Improvements
-- 1. Fix exchange update trigger (was using invalid enum value)
-- 2. Add exchange_proposed notification trigger
-- 3. Add review_received notification trigger
-- ============================================================

-- ============================================================
-- 1. FIX: notify_exchange_update — use correct enum values
--    The old trigger used 'exchange_update' which doesn't exist
--    in the notification_type enum, causing silent failures.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_exchange_update()
RETURNS TRIGGER AS $$
DECLARE
  post_title TEXT;
  notif_title TEXT;
  notif_body TEXT;
  notif_type notification_type;
BEGIN
  IF NEW.status != OLD.status THEN
    SELECT title INTO post_title FROM public.posts WHERE id = NEW.post_id;

    IF NEW.status = 'accepted' THEN
      notif_type := 'exchange_accepted';
      notif_title := 'Exchange accepted';
      notif_body := 'Your exchange proposal for "' || COALESCE(post_title, 'a post') || '" has been accepted';
    ELSIF NEW.status = 'completed' THEN
      notif_type := 'exchange_completed';
      notif_title := 'Exchange completed';
      notif_body := 'The exchange for "' || COALESCE(post_title, 'a post') || '" is complete. Don''t forget to leave a review!';
    ELSIF NEW.status = 'in_progress' THEN
      notif_type := 'exchange_accepted';
      notif_title := 'Exchange in progress';
      notif_body := 'The exchange for "' || COALESCE(post_title, 'a post') || '" is now in progress';
    ELSIF NEW.status = 'cancelled' THEN
      notif_type := 'exchange_accepted';
      notif_title := 'Exchange cancelled';
      notif_body := 'The exchange for "' || COALESCE(post_title, 'a post') || '" has been cancelled';
    ELSE
      RETURN NEW;
    END IF;

    -- Notify provider
    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      NEW.provider_id,
      notif_type,
      notif_title,
      notif_body,
      jsonb_build_object('exchange_id', NEW.id, 'status', NEW.status)
    );

    -- Notify receiver
    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      NEW.receiver_id,
      notif_type,
      notif_title,
      notif_body,
      jsonb_build_object('exchange_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from previous migration; replacing the function is sufficient.

-- ============================================================
-- 2. NEW: notify on exchange proposed (AFTER INSERT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_exchange_proposed()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
  post_title TEXT;
  proposer_name TEXT;
  notify_user UUID;
BEGIN
  SELECT author_id, title INTO post_author, post_title
  FROM public.posts WHERE id = NEW.post_id;

  IF post_author IS NOT NULL THEN
    -- Figure out who proposed: the party that is NOT the post author
    IF post_author = NEW.provider_id THEN
      SELECT display_name INTO proposer_name FROM public.profiles WHERE id = NEW.receiver_id;
      notify_user := NEW.provider_id;
    ELSE
      SELECT display_name INTO proposer_name FROM public.profiles WHERE id = NEW.provider_id;
      notify_user := NEW.receiver_id;
    END IF;

    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      notify_user,
      'exchange_proposed',
      'New exchange proposal',
      COALESCE(proposer_name, 'Someone') || ' proposed an exchange for "' || COALESCE(post_title, 'your post') || '"',
      jsonb_build_object('exchange_id', NEW.id, 'post_id', NEW.post_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exchange_proposed_notify
  AFTER INSERT ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_exchange_proposed();

-- ============================================================
-- 3. NEW: notify on review received (AFTER INSERT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_review_received()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_name TEXT;
BEGIN
  IF NEW.subject_id != NEW.author_id THEN
    SELECT display_name INTO reviewer_name
    FROM public.profiles WHERE id = NEW.author_id;

    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      NEW.subject_id,
      'review_received',
      'You received a review',
      COALESCE(reviewer_name, 'Someone') || ' left you a ' || NEW.rating || '-star review',
      jsonb_build_object('review_id', NEW.id, 'exchange_id', NEW.exchange_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_received_notify
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_review_received();
