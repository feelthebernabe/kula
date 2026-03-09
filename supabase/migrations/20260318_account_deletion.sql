-- ============================================================
-- ACCOUNT DELETION
-- Allows users to delete their account while keeping their
-- content (posts, reviews, discussions) attributed to "Deleted User"
-- ============================================================

-- A. Drop FK from profiles → auth.users so we can delete the auth user
--    without cascading to the profile row (which must survive anonymized)
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;

-- B. Add deleted_at column to mark anonymized profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- C. RPC function: anonymize profile + clean up private data
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- ================================================================
  -- PRE-FLIGHT: user exists and is not already deleted
  -- ================================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User not found or already deleted';
  END IF;

  -- ================================================================
  -- CANCEL ACTIVE EXCHANGES
  -- ================================================================
  UPDATE public.exchange_agreements
  SET status = 'cancelled'
  WHERE (provider_id = target_user_id OR receiver_id = target_user_id)
    AND status IN ('proposed', 'accepted', 'in_progress');

  -- ================================================================
  -- CANCEL UPCOMING POTLUCKS WHERE USER IS HOST
  -- ================================================================
  UPDATE public.potlucks
  SET status = 'cancelled'
  WHERE host_id = target_user_id
    AND status = 'upcoming';

  -- ================================================================
  -- REMOVE USER FROM COMMUNITY MODERATOR ARRAYS
  -- ================================================================
  UPDATE public.communities
  SET moderators = array_remove(moderators, target_user_id)
  WHERE target_user_id = ANY(moderators);

  -- ================================================================
  -- DELETE PRIVATE DATA
  -- ================================================================

  -- Messages (private DMs)
  DELETE FROM public.messages WHERE sender_id = target_user_id;

  -- Conversations
  DELETE FROM public.conversations
  WHERE participant_a = target_user_id OR participant_b = target_user_id;

  -- Notifications
  DELETE FROM public.notifications WHERE recipient_id = target_user_id;

  -- Community memberships
  DELETE FROM public.community_members WHERE user_id = target_user_id;

  -- Skill endorsements (given and received)
  DELETE FROM public.skill_endorsements
  WHERE endorser_id = target_user_id OR endorsed_id = target_user_id;

  -- Community vouches (given and received)
  DELETE FROM public.community_vouches
  WHERE voucher_id = target_user_id OR subject_id = target_user_id;

  -- Invites sent by user
  DELETE FROM public.invites WHERE inviter_id = target_user_id;

  -- Content flags filed by user
  DELETE FROM public.content_flags WHERE reporter_id = target_user_id;

  -- Bans on user
  DELETE FROM public.community_bans WHERE user_id = target_user_id;

  -- Warnings
  DELETE FROM public.user_warnings WHERE user_id = target_user_id;

  -- Potluck RSVPs
  DELETE FROM public.potluck_rsvps WHERE user_id = target_user_id;

  -- Time dollar ledger
  DELETE FROM public.time_dollar_ledger WHERE user_id = target_user_id;

  -- ================================================================
  -- NULLIFY REFERENCES
  -- ================================================================

  -- Release claimed potluck dish slots
  UPDATE public.potluck_dish_slots
  SET claimed_by = NULL, dish_name = NULL, dietary_notes = '{}', claimed_at = NULL
  WHERE claimed_by = target_user_id;

  -- ================================================================
  -- ANONYMIZE PROFILE
  -- Disable triggers that would interfere with the update
  -- ================================================================
  ALTER TABLE public.profiles DISABLE TRIGGER on_verification_change;
  ALTER TABLE public.profiles DISABLE TRIGGER on_trust_change_adjust_voucher_stakes;
  ALTER TABLE public.profiles DISABLE TRIGGER on_trust_milestone;
  ALTER TABLE public.profiles DISABLE TRIGGER on_onboarding_starter_bonus;

  UPDATE public.profiles SET
    display_name = 'Deleted User',
    email = 'deleted-' || target_user_id::text || '@deleted.local',
    avatar_url = NULL,
    bio = NULL,
    phone = NULL,
    primary_location = NULL,
    skills = '{}',
    offers_list = '{}',
    needs_list = '{}',
    social_links = '{}',
    verified = FALSE,
    verification_methods = '{}',
    verification_tier = 'basic',
    verified_at = NULL,
    trust_score = 0,
    total_exchanges = 0,
    total_given = 0,
    total_received = 0,
    onboarding_completed = FALSE,
    response_rate = NULL,
    messages_received = 0,
    messages_responded = 0,
    pending_reviews = 0,
    trust_score_at_day_start = NULL,
    trust_score_day_reset = NULL,
    active_vouch_count = 0,
    reviewer_credibility = 0.5,
    last_active = NULL,
    deleted_at = NOW()
  WHERE id = target_user_id;

  ALTER TABLE public.profiles ENABLE TRIGGER on_verification_change;
  ALTER TABLE public.profiles ENABLE TRIGGER on_trust_change_adjust_voucher_stakes;
  ALTER TABLE public.profiles ENABLE TRIGGER on_trust_milestone;
  ALTER TABLE public.profiles ENABLE TRIGGER on_onboarding_starter_bonus;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
