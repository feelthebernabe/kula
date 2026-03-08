-- ============================================================
-- BUGFIX MIGRATION: Addresses issues found during testing
-- ============================================================

-- ============================================================
-- 1. UNIQUE CONVERSATION INDEX
-- Prevent duplicate conversations for the same post between
-- the same two users (regardless of participant order)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS unique_conversation_per_post
  ON public.conversations (
    post_id,
    LEAST(participant_a, participant_b),
    GREATEST(participant_a, participant_b)
  );

-- ============================================================
-- 2. SET completed_at IN THE BEFORE TRIGGER
-- More reliable than setting it in a nested UPDATE from the
-- AFTER trigger. Sets completed_at when both parties confirm.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_exchange_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provider_confirmed = TRUE AND NEW.receiver_confirmed = TRUE
     AND NEW.status = 'in_progress' THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the redundant completed_at UPDATE from the AFTER trigger
CREATE OR REPLACE FUNCTION public.handle_exchange_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update provider stats (the giver)
    UPDATE public.profiles SET
      total_exchanges = total_exchanges + 1,
      total_given = total_given + 1
    WHERE id = NEW.provider_id;

    -- Update receiver stats
    UPDATE public.profiles SET
      total_exchanges = total_exchanges + 1,
      total_received = total_received + 1
    WHERE id = NEW.receiver_id;

    -- Update post status to fulfilled
    UPDATE public.posts SET status = 'fulfilled'
    WHERE id = NEW.post_id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FIX REPLY COUNT TRIGGER (handle INSERT and DELETE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_thread_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussion_threads SET
      reply_count = reply_count + 1,
      last_reply_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussion_threads SET
      reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reply_created ON public.discussion_replies;
CREATE TRIGGER on_reply_change
  AFTER INSERT OR DELETE ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_reply_stats();

-- ============================================================
-- 4. NOTIFY THREAD AUTHOR ON NEW REPLY
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_thread_author_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  thread_author UUID;
  thread_title TEXT;
  replier_name TEXT;
BEGIN
  SELECT author_id, title INTO thread_author, thread_title
  FROM public.discussion_threads WHERE id = NEW.thread_id;

  -- Don't notify if author is replying to their own thread
  IF thread_author IS NOT NULL AND thread_author != NEW.author_id THEN
    SELECT display_name INTO replier_name
    FROM public.profiles WHERE id = NEW.author_id;

    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      thread_author,
      'discussion_reply',
      'New reply on your discussion',
      COALESCE(replier_name, 'Someone') || ' replied to "' || COALESCE(thread_title, 'your thread') || '"',
      jsonb_build_object('thread_id', NEW.thread_id, 'reply_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reply_notify_author
  AFTER INSERT ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_thread_author_on_reply();

-- ============================================================
-- 5. NOTIFY ON NEW MESSAGE
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  other_user UUID;
  sender_name TEXT;
  post_title TEXT;
BEGIN
  -- Find the other participant
  SELECT CASE
    WHEN c.participant_a = NEW.sender_id THEN c.participant_b
    ELSE c.participant_a
  END INTO other_user
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF other_user IS NOT NULL THEN
    SELECT display_name INTO sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

    SELECT p.title INTO post_title
    FROM public.conversations c
    LEFT JOIN public.posts p ON p.id = c.post_id
    WHERE c.id = NEW.conversation_id;

    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      other_user,
      'new_message',
      'New message from ' || COALESCE(sender_name, 'someone'),
      LEFT(NEW.body, 100),
      jsonb_build_object('conversation_id', NEW.conversation_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- ============================================================
-- 6. NOTIFY ON EXCHANGE STATUS CHANGES
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_exchange_update()
RETURNS TRIGGER AS $$
DECLARE
  other_user UUID;
  post_title TEXT;
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  IF NEW.status != OLD.status THEN
    -- Determine who to notify (the other party)
    -- When status changes, notify both parties
    SELECT title INTO post_title FROM public.posts WHERE id = NEW.post_id;

    IF NEW.status = 'accepted' THEN
      notif_title := 'Exchange accepted';
      notif_body := 'Your exchange proposal for "' || COALESCE(post_title, 'a post') || '" has been accepted';
    ELSIF NEW.status = 'in_progress' THEN
      notif_title := 'Exchange in progress';
      notif_body := 'The exchange for "' || COALESCE(post_title, 'a post') || '" is now in progress';
    ELSIF NEW.status = 'completed' THEN
      notif_title := 'Exchange completed';
      notif_body := 'The exchange for "' || COALESCE(post_title, 'a post') || '" is complete. Don''t forget to leave a review!';
    ELSIF NEW.status = 'cancelled' THEN
      notif_title := 'Exchange cancelled';
      notif_body := 'The exchange for "' || COALESCE(post_title, 'a post') || '" has been cancelled';
    ELSE
      RETURN NEW;
    END IF;

    -- Notify provider
    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      NEW.provider_id,
      'exchange_update',
      notif_title,
      notif_body,
      jsonb_build_object('exchange_id', NEW.id, 'status', NEW.status)
    );

    -- Notify receiver
    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (
      NEW.receiver_id,
      'exchange_update',
      notif_title,
      notif_body,
      jsonb_build_object('exchange_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exchange_notify
  AFTER UPDATE OF status ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_exchange_update();

-- ============================================================
-- 7. ADD UPDATE/DELETE RLS POLICIES FOR DISCUSSION THREADS & REPLIES
-- ============================================================
CREATE POLICY "Authors can update own threads"
  ON public.discussion_threads FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors can delete own threads"
  ON public.discussion_threads FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors can update own replies"
  ON public.discussion_replies FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors can delete own replies"
  ON public.discussion_replies FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

-- ============================================================
-- 8. ADD UPDATE POLICY FOR CONVERSATIONS (for exchange_agreement_id linking)
-- ============================================================
CREATE POLICY "Participants can update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = participant_a OR (SELECT auth.uid()) = participant_b
  );
