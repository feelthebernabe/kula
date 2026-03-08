-- ============================================================
-- TRUST & REPUTATION SYSTEM UPGRADE
-- Implements: 7-signal trust formula, anti-gaming measures,
-- time-dollar safeguards, verification tiers, loan lifecycle,
-- dispute resolution, trust-gated features
-- ============================================================

-- ============================================================
-- 1. NEW COLUMNS ON PROFILES
-- ============================================================

-- Response rate tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS response_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS messages_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_responded INTEGER DEFAULT 0;

-- Anti-gaming: pending review tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_reviews INTEGER DEFAULT 0;

-- Anti-gaming: daily trust score change cap
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_score_at_day_start NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trust_score_day_reset TIMESTAMPTZ DEFAULT NULL;

-- Verification tiers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_tier TEXT DEFAULT 'basic'
    CHECK (verification_tier IN ('basic', 'verified', 'community_vouched'));

-- ============================================================
-- 2. NEW COLUMNS ON EXCHANGE_AGREEMENTS
-- ============================================================

-- Dispute details
ALTER TABLE public.exchange_agreements
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT CHECK (char_length(dispute_reason) <= 1000),
  ADD COLUMN IF NOT EXISTS dispute_filed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_filed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution TEXT CHECK (char_length(dispute_resolution) <= 1000);

-- Loan condition tracking
ALTER TABLE public.exchange_agreements
  ADD COLUMN IF NOT EXISTS condition_photos_before TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condition_photos_after TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS late_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS late_notified_at TIMESTAMPTZ;

-- ============================================================
-- 3. COMMUNITY VOUCHES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_vouch CHECK (voucher_id != subject_id),
  CONSTRAINT one_vouch_per_pair UNIQUE(voucher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_vouches_subject ON public.community_vouches(subject_id);

ALTER TABLE public.community_vouches ENABLE ROW LEVEL SECURITY;

CREATE POLICY vouches_select ON public.community_vouches
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY vouches_insert ON public.community_vouches
  FOR INSERT WITH CHECK (voucher_id = auth.uid());

CREATE POLICY vouches_delete ON public.community_vouches
  FOR DELETE USING (voucher_id = auth.uid());

-- ============================================================
-- 4. NEW NOTIFICATION & MOD ACTION TYPES
-- ============================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'loan_return_reminder';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'loan_overdue';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'dispute_filed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'dispute_resolved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trust_milestone';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'review_reminder';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'posting_suspended';

ALTER TYPE public.mod_action_type ADD VALUE IF NOT EXISTS 'dispute_resolved';

-- ============================================================
-- 5. UNIFIED TRUST SCORE CALCULATION FUNCTION
-- 7 signals mapped to 0-100 scale per product spec:
--   Review average:    25 pts (25%)
--   Exchange volume:   15 pts (15%) - logarithmic
--   Generosity ratio:  20 pts (20%)
--   Consistency:       15 pts (15%) - low stddev
--   Verification:      10 pts (10%)
--   Response rate:     10 pts (10%)
--   Activity recency:   5 pts (5%)
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_trust_score_for_user(target_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  -- Review average (25 pts max)
  avg_rating NUMERIC;
  review_count INTEGER;
  review_score NUMERIC;

  -- Exchange volume (15 pts max, logarithmic)
  exchange_count INTEGER;
  volume_score NUMERIC;

  -- Generosity ratio (20 pts max)
  given_count INTEGER;
  received_count INTEGER;
  generosity_ratio NUMERIC;
  generosity_score NUMERIC;

  -- Consistency (15 pts max, low stddev = higher)
  rating_stddev NUMERIC;
  consistency_score NUMERIC;

  -- Verification (10 pts max)
  v_count INTEGER;
  v_tier TEXT;
  verification_score NUMERIC;

  -- Response rate (10 pts max)
  resp_rate NUMERIC;
  response_score NUMERIC;

  -- Activity recency (5 pts max)
  days_inactive NUMERIC;
  recency_score NUMERIC;

  -- Anti-gaming: daily cap
  day_start_score NUMERIC;
  day_reset TIMESTAMPTZ;
  current_score NUMERIC;

  raw_score NUMERIC;
  final_score NUMERIC;
BEGIN
  -- ============================================================
  -- 1. REVIEW AVERAGE (max 25 pts)
  -- Min 3 reviews before this signal activates.
  -- Reciprocal-only reviewers down-weighted 0.5x.
  -- ============================================================
  WITH review_weights AS (
    SELECT r.rating,
      CASE
        -- If this reviewer has reviewed ONLY the target and the target
        -- has also reviewed ONLY this reviewer, down-weight to 0.5
        WHEN (
          SELECT COUNT(*) FROM public.reviews r2
          WHERE r2.author_id = r.author_id AND r2.subject_id != target_id
        ) = 0
        AND EXISTS (
          SELECT 1 FROM public.reviews r3
          WHERE r3.author_id = target_id AND r3.subject_id = r.author_id
        )
        THEN 0.5
        ELSE 1.0
      END AS weight
    FROM public.reviews r WHERE r.subject_id = target_id
  )
  SELECT
    CASE WHEN SUM(weight) > 0
      THEN SUM(rating * weight) / SUM(weight)
      ELSE NULL
    END,
    COUNT(*),
    COALESCE(STDDEV(rating), 0)
  INTO avg_rating, review_count, rating_stddev
  FROM review_weights;

  IF review_count >= 3 THEN
    -- avg_rating is 1-5, scale to 0-25: (avg/5)*25
    review_score := LEAST(25, (COALESCE(avg_rating, 3) / 5.0) * 25);
  ELSE
    -- Before 3 reviews: neutral baseline (3/5 scaled = 15)
    review_score := 15;
  END IF;

  -- ============================================================
  -- 2. EXCHANGE VOLUME (max 15 pts, logarithmic)
  -- ln(1)=0, ln(50)~=3.91. Scale: 15 * ln(count+1)/ln(51)
  -- Diminishing returns after ~50 exchanges.
  -- ============================================================
  SELECT COALESCE(total_exchanges, 0), COALESCE(total_given, 0), COALESCE(total_received, 0)
  INTO exchange_count, given_count, received_count
  FROM public.profiles WHERE id = target_id;

  IF exchange_count > 0 THEN
    volume_score := LEAST(15, 15 * LN(exchange_count + 1) / LN(51));
  ELSE
    volume_score := 0;
  END IF;

  -- ============================================================
  -- 3. GENEROSITY RATIO (max 20 pts)
  -- Ratio of given:received. 2:1 ratio = full 20 pts.
  -- ============================================================
  IF received_count > 0 THEN
    generosity_ratio := given_count::NUMERIC / received_count;
  ELSIF given_count > 0 THEN
    generosity_ratio := 2.0; -- All giving, no receiving = full marks
  ELSE
    generosity_ratio := 1.0; -- No data = neutral
  END IF;
  -- Clamp ratio to 0-2 range, then scale to 0-20
  generosity_score := LEAST(20, (LEAST(generosity_ratio, 2.0) / 2.0) * 20);

  -- ============================================================
  -- 4. CONSISTENCY (max 15 pts)
  -- Low standard deviation of ratings = higher score.
  -- stddev 0 = 15pts, stddev 2 = 0pts.
  -- ============================================================
  IF review_count >= 3 THEN
    consistency_score := LEAST(15, GREATEST(0, 15 * (1 - COALESCE(rating_stddev, 0) / 2.0)));
  ELSE
    consistency_score := 7.5; -- Neutral before enough data
  END IF;

  -- ============================================================
  -- 5. VERIFICATION (max 10 pts)
  -- Basic methods: 2pts each (max 4pts for 2+ methods)
  -- Verified/Community Vouched tier: +6pts bonus
  -- ============================================================
  SELECT COALESCE(array_length(verification_methods, 1), 0),
         COALESCE(verification_tier, 'basic')
  INTO v_count, v_tier
  FROM public.profiles WHERE id = target_id;

  verification_score := LEAST(4, v_count * 2);
  IF v_tier IN ('verified', 'community_vouched') THEN
    verification_score := verification_score + 6;
  END IF;
  verification_score := LEAST(10, verification_score);

  -- ============================================================
  -- 6. RESPONSE RATE (max 10 pts)
  -- % of messages replied within 24hr, scaled to 0-10.
  -- Default 50% for users with no message history.
  -- ============================================================
  SELECT COALESCE(p.response_rate, 50) INTO resp_rate
  FROM public.profiles p WHERE p.id = target_id;
  response_score := LEAST(10, resp_rate / 10.0);

  -- ============================================================
  -- 7. ACTIVITY RECENCY (max 5 pts)
  -- Full 5pts if active within 30 days.
  -- Linear decay from 5 to 0 between day 30 and 60.
  -- 0pts after 60 days inactive.
  -- ============================================================
  SELECT EXTRACT(EPOCH FROM (NOW() - COALESCE(p.last_active, p.created_at))) / 86400.0
  INTO days_inactive
  FROM public.profiles p WHERE p.id = target_id;

  IF days_inactive <= 30 THEN
    recency_score := 5;
  ELSIF days_inactive <= 60 THEN
    recency_score := 5 * (1 - (days_inactive - 30) / 30.0);
  ELSE
    recency_score := 0;
  END IF;

  -- ============================================================
  -- COMPUTE RAW SCORE
  -- ============================================================
  raw_score := LEAST(100, GREATEST(0,
    review_score + volume_score + generosity_score +
    consistency_score + verification_score + response_score + recency_score
  ));

  -- ============================================================
  -- ANTI-GAMING: Daily cap of +/- 5 points
  -- ============================================================
  SELECT p.trust_score, p.trust_score_at_day_start, p.trust_score_day_reset
  INTO current_score, day_start_score, day_reset
  FROM public.profiles p WHERE p.id = target_id;

  IF day_reset IS NULL OR day_reset < CURRENT_DATE::TIMESTAMPTZ THEN
    -- New day: set the daily baseline to current score
    day_start_score := current_score;
    UPDATE public.profiles SET
      trust_score_at_day_start = current_score,
      trust_score_day_reset = NOW()
    WHERE id = target_id;
  END IF;

  IF day_start_score IS NOT NULL THEN
    final_score := GREATEST(
      day_start_score - 5,
      LEAST(day_start_score + 5, raw_score)
    );
  ELSE
    final_score := raw_score;
  END IF;

  final_score := LEAST(100, GREATEST(0, final_score));

  RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. REPLACE EXISTING TRIGGER FUNCTIONS
-- All now delegate to the unified calculate_trust_score_for_user()
-- ============================================================

-- On review created (AFTER INSERT on reviews)
CREATE OR REPLACE FUNCTION public.recalculate_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET trust_score = public.calculate_trust_score_for_user(NEW.subject_id)
  WHERE id = NEW.subject_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- On reference change (AFTER INSERT OR DELETE on references)
CREATE OR REPLACE FUNCTION public.recalculate_trust_on_reference()
RETURNS TRIGGER AS $$
DECLARE target_uid UUID;
BEGIN
  target_uid := COALESCE(NEW.subject_id, OLD.subject_id);
  UPDATE public.profiles
  SET trust_score = public.calculate_trust_score_for_user(target_uid)
  WHERE id = target_uid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- On endorsement change (AFTER INSERT OR DELETE on skill_endorsements)
CREATE OR REPLACE FUNCTION public.recalculate_trust_with_endorsements()
RETURNS TRIGGER AS $$
DECLARE target_uid UUID;
BEGIN
  target_uid := COALESCE(NEW.endorsed_id, OLD.endorsed_id);
  UPDATE public.profiles
  SET trust_score = public.calculate_trust_score_for_user(target_uid)
  WHERE id = target_uid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- On verification change (BEFORE UPDATE on profiles)
CREATE OR REPLACE FUNCTION public.recalculate_trust_on_verification()
RETURNS TRIGGER AS $$
DECLARE v_count INTEGER;
BEGIN
  IF OLD.verification_methods IS DISTINCT FROM NEW.verification_methods THEN
    v_count := COALESCE(array_length(NEW.verification_methods, 1), 0);
    NEW.verified := v_count >= 2;
    NEW.verified_at := CASE
      WHEN v_count >= 2 AND (OLD.verified IS NOT TRUE) THEN NOW()
      WHEN v_count < 2 THEN NULL
      ELSE OLD.verified_at
    END;
    -- Note: trust_score will be recalculated via the AFTER UPDATE trigger
    -- We set it here since this is a BEFORE trigger and we can modify NEW
    NEW.trust_score := public.calculate_trust_score_for_user(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. RESPONSE RATE TRACKING (AFTER INSERT on messages)
-- Tracks how quickly users respond to messages.
-- Updates response_rate, messages_received, messages_responded.
-- Also touches last_active.
-- ============================================================

CREATE OR REPLACE FUNCTION public.track_response_rate()
RETURNS TRIGGER AS $$
DECLARE
  other_party UUID;
  last_msg_from_other TIMESTAMPTZ;
  response_within_24hr BOOLEAN;
  conv_a UUID;
  conv_b UUID;
BEGIN
  -- Get conversation participants
  SELECT participant_a, participant_b INTO conv_a, conv_b
  FROM public.conversations WHERE id = NEW.conversation_id;

  -- Determine who the other party is
  IF NEW.sender_id = conv_a THEN
    other_party := conv_b;
  ELSE
    other_party := conv_a;
  END IF;

  -- Find the most recent message from the other party before this one
  SELECT MAX(created_at) INTO last_msg_from_other
  FROM public.messages
  WHERE conversation_id = NEW.conversation_id
    AND sender_id = other_party
    AND created_at < NEW.created_at;

  -- If there was a prior message from the other person, this counts as a response
  IF last_msg_from_other IS NOT NULL THEN
    response_within_24hr := (NEW.created_at - last_msg_from_other) <= INTERVAL '24 hours';

    UPDATE public.profiles SET
      messages_received = messages_received + 1,
      messages_responded = CASE
        WHEN response_within_24hr THEN messages_responded + 1
        ELSE messages_responded
      END,
      response_rate = CASE
        WHEN (messages_received + 1) > 0 THEN
          ((messages_responded + CASE WHEN response_within_24hr THEN 1 ELSE 0 END)::NUMERIC
           / (messages_received + 1)::NUMERIC) * 100
        ELSE 50
      END,
      last_active = NOW()
    WHERE id = NEW.sender_id;
  ELSE
    -- First message in conversation or initiating — just touch last_active
    UPDATE public.profiles SET last_active = NOW()
    WHERE id = NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_track_response
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.track_response_rate();

-- ============================================================
-- 8. ACTIVITY RECENCY — touch last_active on key actions
-- ============================================================

-- On post creation
CREATE OR REPLACE FUNCTION public.touch_last_active_on_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET last_active = NOW() WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_touch_active
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_last_active_on_post();

-- On exchange status changes
CREATE OR REPLACE FUNCTION public.touch_last_active_on_exchange()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET last_active = NOW() WHERE id = NEW.provider_id;
  UPDATE public.profiles SET last_active = NOW() WHERE id = NEW.receiver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exchange_touch_active
  AFTER UPDATE OF status ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.touch_last_active_on_exchange();

-- ============================================================
-- 9. TIME-DOLLAR SAFEGUARDS
-- Starter bonus on onboarding + balance floor/cap enforcement
-- ============================================================

-- Grant 5 TD starter bonus when onboarding completes (once only)
CREATE OR REPLACE FUNCTION public.grant_starter_bonus()
RETURNS TRIGGER AS $$
DECLARE existing_bonus INTEGER;
BEGIN
  IF NEW.onboarding_completed = TRUE
     AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = FALSE) THEN
    -- Check if bonus already granted
    SELECT COUNT(*) INTO existing_bonus
    FROM public.time_dollar_ledger
    WHERE user_id = NEW.id AND type = 'starter_bonus';

    IF existing_bonus = 0 THEN
      INSERT INTO public.time_dollar_ledger (user_id, amount, balance_after, description, type)
      VALUES (NEW.id, 5.0, 5.0, 'Welcome bonus: 5 Time Dollars to get started', 'starter_bonus');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_onboarding_starter_bonus
  AFTER UPDATE OF onboarding_completed ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_starter_bonus();

-- Update handle_time_dollar_completion to enforce safeguards
CREATE OR REPLACE FUNCTION public.handle_time_dollar_completion()
RETURNS TRIGGER AS $$
DECLARE
  provider_balance NUMERIC;
  receiver_balance NUMERIC;
  td_amount NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed'
     AND NEW.exchange_mode = 'time_dollar'
     AND NEW.time_dollar_amount IS NOT NULL
     AND NEW.time_dollar_amount > 0 THEN

    td_amount := NEW.time_dollar_amount;

    -- Enforce 0.25 minimum increment
    IF td_amount < 0.25 THEN
      RAISE EXCEPTION 'Time-dollar amount must be at least 0.25 TD';
    END IF;

    SELECT COALESCE(
      (SELECT balance_after FROM public.time_dollar_ledger
       WHERE user_id = NEW.provider_id ORDER BY created_at DESC LIMIT 1),
      0
    ) INTO provider_balance;

    SELECT COALESCE(
      (SELECT balance_after FROM public.time_dollar_ledger
       WHERE user_id = NEW.receiver_id ORDER BY created_at DESC LIMIT 1),
      0
    ) INTO receiver_balance;

    -- Enforce negative floor: receiver can't go below -3 TD
    IF (receiver_balance - td_amount) < -3 THEN
      RAISE EXCEPTION 'Insufficient time-dollar balance. Cannot go below -3 TD. Current balance: % TD', receiver_balance;
    END IF;

    -- Enforce maximum cap: provider can't exceed 100 TD
    IF (provider_balance + td_amount) > 100 THEN
      RAISE EXCEPTION 'Cannot exceed 100 TD maximum balance. Current balance: % TD', provider_balance;
    END IF;

    -- Credit provider
    INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type)
    VALUES (
      NEW.provider_id, NEW.id, td_amount,
      provider_balance + td_amount,
      'Earned ' || td_amount || ' TD for service provided',
      'exchange'
    );

    -- Debit receiver
    INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type)
    VALUES (
      NEW.receiver_id, NEW.id, -td_amount,
      receiver_balance - td_amount,
      'Spent ' || td_amount || ' TD for service received',
      'exchange'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. ANTI-GAMING: Pending reviews tracking
-- Increment pending_reviews when exchange completes,
-- decrement when review is submitted.
-- ============================================================

-- Update handle_exchange_completed to track pending reviews
CREATE OR REPLACE FUNCTION public.handle_exchange_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update provider stats
    UPDATE public.profiles SET
      total_exchanges = total_exchanges + 1,
      total_given = total_given + 1,
      pending_reviews = pending_reviews + 1,
      last_active = NOW()
    WHERE id = NEW.provider_id;

    -- Update receiver stats
    UPDATE public.profiles SET
      total_exchanges = total_exchanges + 1,
      total_received = total_received + 1,
      pending_reviews = pending_reviews + 1,
      last_active = NOW()
    WHERE id = NEW.receiver_id;

    -- Update post status
    UPDATE public.posts SET status = 'fulfilled'
    WHERE id = NEW.post_id AND status = 'active';

    -- Set completed timestamp
    UPDATE public.exchange_agreements SET completed_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement pending_reviews when a review is submitted
CREATE OR REPLACE FUNCTION public.decrement_pending_reviews()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET pending_reviews = GREATEST(0, pending_reviews - 1)
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_decrement_pending
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.decrement_pending_reviews();

-- ============================================================
-- 11. ANTI-GAMING: New account review cap
-- Accounts with < 5 exchanges can't give above 4 stars
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_review_cap()
RETURNS TRIGGER AS $$
DECLARE author_exchange_count INTEGER;
BEGIN
  SELECT COALESCE(total_exchanges, 0) INTO author_exchange_count
  FROM public.profiles WHERE id = NEW.author_id;

  -- New accounts (< 5 exchanges) capped at 4 stars
  IF author_exchange_count < 5 AND NEW.rating > 4 THEN
    NEW.rating := 4;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_new_account_review_cap
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_cap();

-- ============================================================
-- 12. COMMUNITY VOUCHING — auto-upgrade verification tier
-- When a user receives 3+ vouches from users with 80+ trust
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_vouch_threshold()
RETURNS TRIGGER AS $$
DECLARE
  qualified_vouches INTEGER;
BEGIN
  SELECT COUNT(*) INTO qualified_vouches
  FROM public.community_vouches cv
  JOIN public.profiles p ON p.id = cv.voucher_id
  WHERE cv.subject_id = NEW.subject_id
    AND p.trust_score >= 80;

  IF qualified_vouches >= 3 THEN
    UPDATE public.profiles
    SET verification_tier = 'community_vouched'
    WHERE id = NEW.subject_id
      AND verification_tier = 'basic';

    -- Recalculate trust score with new tier
    UPDATE public.profiles
    SET trust_score = public.calculate_trust_score_for_user(NEW.subject_id)
    WHERE id = NEW.subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vouch_check_threshold
  AFTER INSERT ON public.community_vouches
  FOR EACH ROW EXECUTE FUNCTION public.check_vouch_threshold();

-- ============================================================
-- 13. TRUST MILESTONE NOTIFICATIONS
-- Sends notification when user crosses 60 or 85 thresholds
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_trust_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Crossed into Established (60+)
  IF NEW.trust_score >= 60 AND (OLD.trust_score IS NULL OR OLD.trust_score < 60) THEN
    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (NEW.id, 'trust_milestone', 'Trust Milestone Reached!',
            'You are now an Established member with a trust score of ' || ROUND(NEW.trust_score) || '. You can now create communities!',
            jsonb_build_object('milestone', 'established', 'score', ROUND(NEW.trust_score)));
  END IF;

  -- Crossed into Highly Trusted (85+)
  IF NEW.trust_score >= 85 AND (OLD.trust_score IS NULL OR OLD.trust_score < 85) THEN
    INSERT INTO public.notifications (recipient_id, type, title, body, data)
    VALUES (NEW.id, 'trust_milestone', 'Highly Trusted!',
            'You have reached Highly Trusted status with a score of ' || ROUND(NEW.trust_score) || '!',
            jsonb_build_object('milestone', 'highly_trusted', 'score', ROUND(NEW.trust_score)));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trust_milestone
  AFTER UPDATE OF trust_score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_trust_milestones();
