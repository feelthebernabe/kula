-- ============================================================
-- TRUST ARCHITECTURE UPGRADE v2
-- Phase 1: Blind reviews, exchange-type tagging, Bayesian engine
-- Phase 2: 5-dimension ratings, stake-weighted vouching, reviewer credibility
-- ============================================================

-- ============================================================
-- 1. BLIND REVIEW PROTOCOL
-- Neither party sees the other's review until both submit or 7 days pass.
-- ============================================================

-- Blind review columns on reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ;

-- Review window on exchange_agreements
ALTER TABLE public.exchange_agreements
  ADD COLUMN IF NOT EXISTS review_window_closes_at TIMESTAMPTZ;

-- Exchange-type tagging on reviews (denormalized from exchange_agreements)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS exchange_type public.exchange_mode;

-- Backfill existing reviews as already revealed
UPDATE public.reviews SET revealed = TRUE, revealed_at = created_at WHERE revealed IS NULL;

-- Backfill exchange_type from linked exchange
UPDATE public.reviews r
SET exchange_type = ea.exchange_mode
FROM public.exchange_agreements ea
WHERE r.exchange_id = ea.id AND r.exchange_type IS NULL;

-- ============================================================
-- 2. FIVE-DIMENSION RATINGS
-- ============================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS dim_reliability INTEGER CHECK (dim_reliability >= 1 AND dim_reliability <= 5),
  ADD COLUMN IF NOT EXISTS dim_communication INTEGER CHECK (dim_communication >= 1 AND dim_communication <= 5),
  ADD COLUMN IF NOT EXISTS dim_accuracy INTEGER CHECK (dim_accuracy >= 1 AND dim_accuracy <= 5),
  ADD COLUMN IF NOT EXISTS dim_generosity INTEGER CHECK (dim_generosity >= 1 AND dim_generosity <= 5),
  ADD COLUMN IF NOT EXISTS dim_community INTEGER CHECK (dim_community >= 1 AND dim_community <= 5);

-- ============================================================
-- 3. STAKE-WEIGHTED VOUCHING
-- ============================================================

ALTER TABLE public.community_vouches
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_vouch_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewer_credibility NUMERIC(3,2) DEFAULT 0.5
    CHECK (reviewer_credibility >= 0.1 AND reviewer_credibility <= 1.0);

-- ============================================================
-- 4. TRIGGERS: BLIND REVIEW REVEAL
-- ============================================================

-- Auto-populate exchange_type on review insert
CREATE OR REPLACE FUNCTION public.populate_review_exchange_type()
RETURNS TRIGGER AS $$
BEGIN
  SELECT exchange_mode INTO NEW.exchange_type
  FROM public.exchange_agreements WHERE id = NEW.exchange_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_populate_exchange_type
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.populate_review_exchange_type();

-- Check if both parties have reviewed; if so, reveal both
CREATE OR REPLACE FUNCTION public.check_review_reveal()
RETURNS TRIGGER AS $$
DECLARE
  other_review_id UUID;
  exchange_provider UUID;
  exchange_receiver UUID;
BEGIN
  -- Get provider and receiver for this exchange
  SELECT provider_id, receiver_id INTO exchange_provider, exchange_receiver
  FROM public.exchange_agreements WHERE id = NEW.exchange_id;

  -- Determine who the other party is
  -- If the author is the provider, look for a review by the receiver
  -- If the author is the receiver, look for a review by the provider
  SELECT id INTO other_review_id
  FROM public.reviews
  WHERE exchange_id = NEW.exchange_id
    AND author_id != NEW.author_id
    AND id != NEW.id;

  IF other_review_id IS NOT NULL THEN
    -- Both parties have reviewed — reveal both
    UPDATE public.reviews
    SET revealed = TRUE, revealed_at = NOW()
    WHERE exchange_id = NEW.exchange_id
      AND revealed = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_check_reveal
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_review_reveal();

-- ============================================================
-- 5. UPDATE handle_exchange_completed to set review window
-- ============================================================

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

    -- Set completed timestamp + review window (7 days)
    UPDATE public.exchange_agreements SET
      completed_at = NOW(),
      review_window_closes_at = NOW() + INTERVAL '7 days'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. BAYESIAN TRUST FORMULA WITH RECENCY DECAY
-- Replaces the existing calculate_trust_score_for_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_trust_score_for_user(target_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  -- Review average (25 pts max) — Bayesian with recency decay
  platform_avg NUMERIC;
  bayesian_avg NUMERIC;
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

  -- Bayesian prior weight (phantom ratings)
  prior_weight CONSTANT NUMERIC := 6;

  raw_score NUMERIC;
  final_score NUMERIC;
BEGIN
  -- ============================================================
  -- 1. REVIEW AVERAGE (max 25 pts) — BAYESIAN + RECENCY DECAY
  -- Platform-wide average as prior with ~6 phantom ratings.
  -- Each review weighted by:
  --   * reciprocal down-weight (0.5 if reviewer only reviewed target)
  --   * recency halflife (90-day exponential decay)
  --   * unilateral dampening (0.8 if other party didn't review back)
  --   * reviewer credibility coefficient (0.1-1.0)
  -- ============================================================

  -- Get platform-wide average rating (the Bayesian prior)
  SELECT COALESCE(AVG(rating), 3.0) INTO platform_avg
  FROM public.reviews;

  WITH review_weights AS (
    SELECT
      r.rating,
      r.created_at,
      r.author_id,
      r.exchange_id,
      -- Reciprocal down-weight: 0.5 if reviewer only reviewed target and vice versa
      CASE
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
      END AS reciprocal_weight,
      -- Recency decay: 90-day halflife
      EXP(-0.693 * EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (90.0 * 86400.0)) AS recency_weight,
      -- Unilateral dampening: 0.8 if the other party didn't review on same exchange
      CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM public.reviews r4
          WHERE r4.exchange_id = r.exchange_id AND r4.author_id = target_id
        )
        THEN 0.8
        ELSE 1.0
      END AS unilateral_weight,
      -- Reviewer credibility coefficient
      COALESCE(p.reviewer_credibility, 0.5) AS credibility
    FROM public.reviews r
    LEFT JOIN public.profiles p ON p.id = r.author_id
    WHERE r.subject_id = target_id
  ),
  weighted AS (
    SELECT
      rating,
      reciprocal_weight * recency_weight * unilateral_weight * credibility AS combined_weight
    FROM review_weights
  )
  SELECT
    COUNT(*),
    CASE
      WHEN SUM(combined_weight) > 0 THEN
        -- Bayesian: (sum_weighted_ratings + prior * prior_weight) / (sum_weights + prior_weight)
        (SUM(rating * combined_weight) + platform_avg * prior_weight) / (SUM(combined_weight) + prior_weight)
      ELSE
        platform_avg
    END,
    COALESCE(STDDEV(rating), 0)
  INTO review_count, bayesian_avg, rating_stddev
  FROM weighted;

  -- Scale Bayesian average (1-5) to 0-25 points
  review_score := LEAST(25, GREATEST(0, (bayesian_avg / 5.0) * 25));

  -- ============================================================
  -- 2. EXCHANGE VOLUME (max 15 pts, logarithmic)
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
  -- ============================================================
  IF received_count > 0 THEN
    generosity_ratio := given_count::NUMERIC / received_count;
  ELSIF given_count > 0 THEN
    generosity_ratio := 2.0;
  ELSE
    generosity_ratio := 1.0;
  END IF;
  generosity_score := LEAST(20, (LEAST(generosity_ratio, 2.0) / 2.0) * 20);

  -- ============================================================
  -- 4. CONSISTENCY (max 15 pts)
  -- ============================================================
  IF review_count >= 3 THEN
    consistency_score := LEAST(15, GREATEST(0, 15 * (1 - COALESCE(rating_stddev, 0) / 2.0)));
  ELSE
    consistency_score := 7.5;
  END IF;

  -- ============================================================
  -- 5. VERIFICATION (max 10 pts)
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
  -- ============================================================
  SELECT COALESCE(p.response_rate, 50) INTO resp_rate
  FROM public.profiles p WHERE p.id = target_id;
  response_score := LEAST(10, resp_rate / 10.0);

  -- ============================================================
  -- 7. ACTIVITY RECENCY (max 5 pts)
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
-- 7. STAKE-WEIGHTED VOUCHING TRIGGERS
-- ============================================================

-- Enforce max 5 active vouches per user
CREATE OR REPLACE FUNCTION public.enforce_vouch_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.community_vouches
  WHERE voucher_id = NEW.voucher_id AND active = TRUE;

  IF current_count >= 5 THEN
    RAISE EXCEPTION 'You can only have 5 active vouches at a time';
  END IF;

  -- Increment vouch count
  UPDATE public.profiles
  SET active_vouch_count = current_count + 1
  WHERE id = NEW.voucher_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vouch_enforce_limit
  BEFORE INSERT ON public.community_vouches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vouch_limit();

-- Decrement vouch count on delete
CREATE OR REPLACE FUNCTION public.on_vouch_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET active_vouch_count = GREATEST(0, active_vouch_count - 1)
  WHERE id = OLD.voucher_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vouch_delete_count
  AFTER DELETE ON public.community_vouches
  FOR EACH ROW EXECUTE FUNCTION public.on_vouch_delete();

-- Adjust voucher scores when vouchee trust score changes
CREATE OR REPLACE FUNCTION public.adjust_voucher_stakes()
RETURNS TRIGGER AS $$
DECLARE
  vouch_rec RECORD;
  boost NUMERIC;
BEGIN
  -- Only process meaningful trust score changes
  IF OLD.trust_score IS NOT DISTINCT FROM NEW.trust_score THEN
    RETURN NEW;
  END IF;

  -- Find all active vouchers for this user
  FOR vouch_rec IN
    SELECT cv.voucher_id FROM public.community_vouches cv
    WHERE cv.subject_id = NEW.id AND cv.active = TRUE
  LOOP
    -- Vouchee is doing well (trust >= 60): voucher gets small boost (+0.5, max +2 total from all vouches)
    IF NEW.trust_score >= 60 AND (OLD.trust_score < 60 OR OLD.trust_score IS NULL) THEN
      UPDATE public.profiles
      SET trust_score = LEAST(100, trust_score + 0.5)
      WHERE id = vouch_rec.voucher_id;
    END IF;

    -- Vouchee dropped below 40: voucher takes penalty (-1)
    IF NEW.trust_score < 40 AND (OLD.trust_score >= 40 OR OLD.trust_score IS NULL) THEN
      UPDATE public.profiles
      SET trust_score = GREATEST(0, trust_score - 1)
      WHERE id = vouch_rec.voucher_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trust_change_adjust_voucher_stakes
  AFTER UPDATE OF trust_score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.adjust_voucher_stakes();

-- ============================================================
-- 8. REVIEWER CREDIBILITY CALCULATION
-- Internal function called by weekly cron job
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_reviewer_credibility(reviewer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  -- Components
  tenure_bonus NUMERIC;
  consistency_bonus NUMERIC;
  reputation_bonus NUMERIC;
  completion_bonus NUMERIC;
  diversity_bonus NUMERIC;

  account_age_days NUMERIC;
  reviewer_trust NUMERIC;
  total_reviews INTEGER;
  unique_subjects INTEGER;
  total_proposals INTEGER;
  total_completed INTEGER;
  avg_deviation NUMERIC;

  credibility NUMERIC;
BEGIN
  -- Base: 0.1 (everyone starts with minimum)
  credibility := 0.1;

  -- 1. TENURE (0-0.2 bonus): Full 0.2 at 180+ days
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0
  INTO account_age_days
  FROM public.profiles WHERE id = reviewer_id;

  tenure_bonus := LEAST(0.2, (COALESCE(account_age_days, 0) / 180.0) * 0.2);

  -- 2. RATING CONSISTENCY VS CONSENSUS (0-0.3 bonus)
  -- How closely this reviewer's ratings match the consensus for each subject
  SELECT COALESCE(AVG(ABS(
    r.rating - (
      SELECT AVG(r2.rating) FROM public.reviews r2
      WHERE r2.subject_id = r.subject_id AND r2.id != r.id
    )
  )), 2.0)
  INTO avg_deviation
  FROM public.reviews r
  WHERE r.author_id = reviewer_id
    AND (SELECT COUNT(*) FROM public.reviews r3 WHERE r3.subject_id = r.subject_id AND r3.id != r.id) > 0;

  -- Lower deviation = better consistency. 0 deviation = 0.3, 2+ deviation = 0
  consistency_bonus := LEAST(0.3, GREATEST(0, 0.3 * (1 - avg_deviation / 2.0)));

  -- 3. OWN REPUTATION (0-0.2 bonus): Based on reviewer's trust score
  SELECT COALESCE(trust_score, 30) INTO reviewer_trust
  FROM public.profiles WHERE id = reviewer_id;

  reputation_bonus := (reviewer_trust / 100.0) * 0.2;

  -- 4. COMPLETION RATE (0-0.15 bonus): Completed / total proposals
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*)
  INTO total_completed, total_proposals
  FROM public.exchange_agreements
  WHERE provider_id = reviewer_id OR receiver_id = reviewer_id;

  IF total_proposals > 0 THEN
    completion_bonus := (total_completed::NUMERIC / total_proposals) * 0.15;
  ELSE
    completion_bonus := 0.075; -- Neutral if no proposals
  END IF;

  -- 5. NETWORK DIVERSITY (0-0.15 bonus): Unique subjects / total reviews
  SELECT COUNT(*), COUNT(DISTINCT subject_id)
  INTO total_reviews, unique_subjects
  FROM public.reviews WHERE author_id = reviewer_id;

  IF total_reviews > 0 THEN
    diversity_bonus := (unique_subjects::NUMERIC / total_reviews) * 0.15;
  ELSE
    diversity_bonus := 0.075; -- Neutral if no reviews
  END IF;

  -- Sum components, clamp to 0.1-1.0
  credibility := LEAST(1.0, GREATEST(0.1,
    credibility + tenure_bonus + consistency_bonus + reputation_bonus +
    completion_bonus + diversity_bonus
  ));

  RETURN credibility;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch recalculation function for all users with reviews
CREATE OR REPLACE FUNCTION public.recalculate_all_reviewer_credibility()
RETURNS void AS $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN
    SELECT DISTINCT author_id FROM public.reviews
  LOOP
    UPDATE public.profiles
    SET reviewer_credibility = public.calculate_reviewer_credibility(user_rec.author_id)
    WHERE id = user_rec.author_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. RPC: Reveal expired blind reviews
-- Called by daily cron job
-- ============================================================

CREATE OR REPLACE FUNCTION public.reveal_expired_reviews()
RETURNS INTEGER AS $$
DECLARE
  revealed_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.reviews r
    SET revealed = TRUE, revealed_at = NOW()
    FROM public.exchange_agreements ea
    WHERE r.exchange_id = ea.id
      AND r.revealed = FALSE
      AND ea.review_window_closes_at IS NOT NULL
      AND ea.review_window_closes_at <= NOW()
    RETURNING r.id
  )
  SELECT COUNT(*) INTO revealed_count FROM expired;

  RETURN revealed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
