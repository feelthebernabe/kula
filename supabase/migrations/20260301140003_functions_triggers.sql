-- ============================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RECALCULATE TRUST SCORE AFTER REVIEW
-- Simplified MVP formula:
--   Review component: avg_rating * 10 (max 50 points)
--   Activity component: min(exchange_count * 2, 15) points
--   Generosity bonus: min(given_count * 0.5, 5) points
--   Capped at 0-100
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  exchange_count INTEGER;
  given_count INTEGER;
  new_score NUMERIC;
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews WHERE subject_id = NEW.subject_id;

  SELECT total_exchanges, total_given INTO exchange_count, given_count
  FROM public.profiles WHERE id = NEW.subject_id;

  new_score := LEAST(100, GREATEST(0,
    (COALESCE(avg_rating, 3) * 10) +
    LEAST(COALESCE(exchange_count, 0) * 2, 15) +
    LEAST(COALESCE(given_count, 0) * 0.5, 5)
  ));

  UPDATE public.profiles
  SET trust_score = new_score
  WHERE id = NEW.subject_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_trust_score();

-- ============================================================
-- UPDATE EXCHANGE COUNTS WHEN EXCHANGE COMPLETES
-- ============================================================
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

    -- Set completed timestamp
    UPDATE public.exchange_agreements SET completed_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exchange_status_change
  AFTER UPDATE OF status ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.handle_exchange_completed();

-- ============================================================
-- AUTO-COMPLETE EXCHANGE WHEN BOTH PARTIES CONFIRM
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_exchange_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provider_confirmed = TRUE AND NEW.receiver_confirmed = TRUE
     AND NEW.status = 'in_progress' THEN
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exchange_confirmation
  BEFORE UPDATE OF provider_confirmed, receiver_confirmed ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.handle_exchange_confirmation();

-- ============================================================
-- VALIDATE EXCHANGE STATUS TRANSITIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_exchange_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'proposed' AND NEW.status NOT IN ('accepted', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from proposed to %', NEW.status;
  ELSIF OLD.status = 'accepted' AND NEW.status NOT IN ('in_progress', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from accepted to %', NEW.status;
  ELSIF OLD.status = 'in_progress' AND NEW.status NOT IN ('completed', 'disputed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from in_progress to %', NEW.status;
  ELSIF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from terminal state %', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_exchange_status
  BEFORE UPDATE OF status ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.validate_exchange_transition();

-- ============================================================
-- UPDATE COMMUNITY MEMBER COUNT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = member_count - 1
    WHERE id = OLD.community_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_community_member_change
  AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- ============================================================
-- UPDATE THREAD REPLY COUNT AND LAST REPLY TIME
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_thread_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discussion_threads SET
    reply_count = reply_count + 1,
    last_reply_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_reply_stats();

-- ============================================================
-- UPDATE CONVERSATION LAST_MESSAGE_AT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_sent
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- ============================================================
-- INCREMENT POST RESPONSE COUNT
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_post_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET response_count = response_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exchange_proposed
  AFTER INSERT ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.increment_post_response_count();
