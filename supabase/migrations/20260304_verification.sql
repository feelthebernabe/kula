-- ============================================================
-- VERIFICATION & TRUST SYSTEM
-- Adds social links, verification tracking, and updates trust score formula
-- ============================================================

-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verification_methods TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ============================================================
-- Update trust score formula to include verification bonus
-- Review component: avg_rating * 10 (max 50 points)
-- Activity component: min(exchange_count * 2, 15) points
-- Generosity bonus: min(given_count * 0.5, 5) points
-- Verification bonus: min(verification_count * 5, 15) points
-- Total possible: ~85
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  exchange_count INTEGER;
  given_count INTEGER;
  verification_count INTEGER;
  new_score NUMERIC;
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews WHERE subject_id = NEW.subject_id;

  SELECT total_exchanges, total_given,
         COALESCE(array_length(verification_methods, 1), 0)
  INTO exchange_count, given_count, verification_count
  FROM public.profiles WHERE id = NEW.subject_id;

  new_score := LEAST(100, GREATEST(0,
    (COALESCE(avg_rating, 3) * 10) +
    LEAST(COALESCE(exchange_count, 0) * 2, 15) +
    LEAST(COALESCE(given_count, 0) * 0.5, 5) +
    LEAST(COALESCE(verification_count, 0) * 5, 15)
  ));

  UPDATE public.profiles
  SET trust_score = new_score
  WHERE id = NEW.subject_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Recalculate trust score when verification methods change
-- Also auto-set verified flag when 2+ methods are verified
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_trust_on_verification()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  new_score NUMERIC;
  v_count INTEGER;
BEGIN
  IF OLD.verification_methods IS DISTINCT FROM NEW.verification_methods THEN
    v_count := COALESCE(array_length(NEW.verification_methods, 1), 0);

    SELECT AVG(rating) INTO avg_rating
    FROM public.reviews WHERE subject_id = NEW.id;

    new_score := LEAST(100, GREATEST(0,
      (COALESCE(avg_rating, 3) * 10) +
      LEAST(COALESCE(NEW.total_exchanges, 0) * 2, 15) +
      LEAST(COALESCE(NEW.total_given, 0) * 0.5, 5) +
      LEAST(v_count * 5, 15)
    ));

    NEW.trust_score := new_score;
    NEW.verified := v_count >= 2;
    NEW.verified_at := CASE
      WHEN v_count >= 2 AND (OLD.verified IS NOT TRUE) THEN NOW()
      WHEN v_count < 2 THEN NULL
      ELSE OLD.verified_at
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_verification_change
  BEFORE UPDATE OF verification_methods ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_trust_on_verification();
