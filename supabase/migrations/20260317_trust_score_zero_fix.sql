-- Fix trust score calculation: zero out components when there is no real data.
-- Previously, new users received phantom points from Bayesian priors and defaults.

CREATE OR REPLACE FUNCTION public.calculate_trust_score_for_user(target_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  platform_avg NUMERIC;
  bayesian_avg NUMERIC;
  review_count INTEGER;
  review_score NUMERIC;

  exchange_count INTEGER;
  volume_score NUMERIC;

  given_count INTEGER;
  received_count INTEGER;
  generosity_ratio NUMERIC;
  generosity_score NUMERIC;

  rating_stddev NUMERIC;
  consistency_score NUMERIC;

  v_count INTEGER;
  v_tier TEXT;
  verification_score NUMERIC;

  messages_received_count INTEGER;
  resp_rate NUMERIC;
  response_score NUMERIC;

  days_inactive NUMERIC;
  recency_score NUMERIC;

  day_start_score NUMERIC;
  day_reset TIMESTAMPTZ;
  current_score NUMERIC;

  prior_weight CONSTANT NUMERIC := 6;

  raw_score NUMERIC;
  final_score NUMERIC;
BEGIN
  -- ============================================================
  -- 1. REVIEW AVERAGE (max 25 pts)
  -- Zero if no reviews. Bayesian prior only applies once reviews exist.
  -- ============================================================
  SELECT COALESCE(AVG(rating), 3.0) INTO platform_avg FROM public.reviews;

  WITH review_weights AS (
    SELECT
      r.rating,
      CASE
        WHEN (SELECT COUNT(*) FROM public.reviews r2 WHERE r2.author_id = r.author_id AND r2.subject_id != target_id) = 0
          AND EXISTS (SELECT 1 FROM public.reviews r3 WHERE r3.author_id = target_id AND r3.subject_id = r.author_id)
        THEN 0.5 ELSE 1.0
      END AS reciprocal_weight,
      EXP(-0.693 * EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (90.0 * 86400.0)) AS recency_weight,
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM public.reviews r4 WHERE r4.exchange_id = r.exchange_id AND r4.author_id = target_id)
        THEN 0.8 ELSE 1.0
      END AS unilateral_weight,
      COALESCE(p.reviewer_credibility, 0.5) AS credibility
    FROM public.reviews r
    LEFT JOIN public.profiles p ON p.id = r.author_id
    WHERE r.subject_id = target_id
  ),
  weighted AS (
    SELECT rating, reciprocal_weight * recency_weight * unilateral_weight * credibility AS combined_weight
    FROM review_weights
  )
  SELECT COUNT(*),
    CASE WHEN SUM(combined_weight) > 0 THEN
      (SUM(rating * combined_weight) + platform_avg * prior_weight) / (SUM(combined_weight) + prior_weight)
    ELSE platform_avg END,
    COALESCE(STDDEV(rating), 0)
  INTO review_count, bayesian_avg, rating_stddev
  FROM weighted;

  -- Zero out if no real reviews
  IF review_count = 0 THEN
    review_score := 0;
  ELSE
    review_score := LEAST(25, GREATEST(0, (bayesian_avg / 5.0) * 25));
  END IF;

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
  -- Zero if no exchanges at all.
  -- ============================================================
  IF given_count = 0 AND received_count = 0 THEN
    generosity_score := 0;
  ELSIF received_count > 0 THEN
    generosity_ratio := given_count::NUMERIC / received_count;
    generosity_score := LEAST(20, (LEAST(generosity_ratio, 2.0) / 2.0) * 20);
  ELSE
    -- given_count > 0, received_count = 0 → pure giver, max generosity
    generosity_score := 20;
  END IF;

  -- ============================================================
  -- 4. CONSISTENCY (max 15 pts)
  -- Zero if no reviews, partial credit with 1-2 reviews.
  -- ============================================================
  IF review_count = 0 THEN
    consistency_score := 0;
  ELSIF review_count >= 3 THEN
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
  -- Zero if user has never received a message.
  -- ============================================================
  SELECT COALESCE(p.response_rate, NULL), COALESCE(p.messages_received, 0)
  INTO resp_rate, messages_received_count
  FROM public.profiles p WHERE p.id = target_id;

  IF messages_received_count = 0 THEN
    response_score := 0;
  ELSE
    response_score := LEAST(10, COALESCE(resp_rate, 0) / 10.0);
  END IF;

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
    final_score := GREATEST(day_start_score - 5, LEAST(day_start_score + 5, raw_score));
  ELSE
    final_score := raw_score;
  END IF;

  RETURN LEAST(100, GREATEST(0, final_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
