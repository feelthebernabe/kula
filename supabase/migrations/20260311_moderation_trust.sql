-- ============================================================
-- MODERATION & TRUST LAYER
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.flag_reason AS ENUM ('spam', 'harassment', 'misinformation', 'inappropriate', 'other');
CREATE TYPE public.flag_status AS ENUM ('pending', 'dismissed', 'actioned');
CREATE TYPE public.mod_action_type AS ENUM (
  'flag_dismissed', 'content_removed', 'user_warned',
  'user_suspended', 'user_unsuspended',
  'thread_pinned', 'thread_unpinned', 'role_changed'
);

ALTER TYPE public.notification_type ADD VALUE 'content_flagged';
ALTER TYPE public.notification_type ADD VALUE 'content_removed';
ALTER TYPE public.notification_type ADD VALUE 'user_warned';
ALTER TYPE public.notification_type ADD VALUE 'user_suspended';

-- ============================================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================================

-- Soft-delete columns for moderation
ALTER TABLE public.posts ADD COLUMN removed_by_mod UUID REFERENCES public.profiles(id);
ALTER TABLE public.posts ADD COLUMN removed_reason TEXT;
ALTER TABLE public.posts ADD COLUMN removed_at TIMESTAMPTZ;

ALTER TABLE public.discussion_threads ADD COLUMN removed_by_mod UUID REFERENCES public.profiles(id);
ALTER TABLE public.discussion_threads ADD COLUMN removed_reason TEXT;
ALTER TABLE public.discussion_threads ADD COLUMN removed_at TIMESTAMPTZ;

ALTER TABLE public.discussion_replies ADD COLUMN removed_by_mod UUID REFERENCES public.profiles(id);
ALTER TABLE public.discussion_replies ADD COLUMN removed_reason TEXT;
ALTER TABLE public.discussion_replies ADD COLUMN removed_at TIMESTAMPTZ;

ALTER TABLE public.potluck_comments ADD COLUMN removed_by_mod UUID REFERENCES public.profiles(id);
ALTER TABLE public.potluck_comments ADD COLUMN removed_reason TEXT;
ALTER TABLE public.potluck_comments ADD COLUMN removed_at TIMESTAMPTZ;

-- Community rules
ALTER TABLE public.communities ADD COLUMN rules TEXT[] DEFAULT '{}';

-- ============================================================
-- CONTENT FLAGS TABLE
-- ============================================================
CREATE TABLE public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'thread', 'reply', 'potluck_comment')),
  content_id UUID NOT NULL,
  content_author_id UUID NOT NULL REFERENCES public.profiles(id),
  reason public.flag_reason NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  status public.flag_status DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flags_community_status ON public.content_flags(community_id, status);
CREATE INDEX idx_flags_content ON public.content_flags(content_type, content_id);

-- ============================================================
-- MOD ACTIONS TABLE (audit log)
-- ============================================================
CREATE TABLE public.mod_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type public.mod_action_type NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  target_content_type TEXT,
  target_content_id UUID,
  flag_id UUID REFERENCES public.content_flags(id),
  reason TEXT CHECK (char_length(reason) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mod_actions_community ON public.mod_actions(community_id);

-- ============================================================
-- COMMUNITY BANS TABLE
-- ============================================================
CREATE TABLE public.community_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT CHECK (char_length(reason) <= 500),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX idx_bans_community ON public.community_bans(community_id);
CREATE INDEX idx_bans_user ON public.community_bans(user_id);

-- ============================================================
-- USER WARNINGS TABLE
-- ============================================================
CREATE TABLE public.user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  moderator_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  flag_id UUID REFERENCES public.content_flags(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warnings_community_user ON public.user_warnings(community_id, user_id);

-- ============================================================
-- SKILL ENDORSEMENTS TABLE
-- ============================================================
CREATE TABLE public.skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endorsed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL CHECK (char_length(skill) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endorser_id, endorsed_id, skill)
);

CREATE INDEX idx_endorsements_endorsed ON public.skill_endorsements(endorsed_id);

-- Prevent self-endorsement
ALTER TABLE public.skill_endorsements ADD CONSTRAINT no_self_endorsement CHECK (endorser_id != endorsed_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update trust score when endorsements change
CREATE OR REPLACE FUNCTION public.recalculate_trust_with_endorsements()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  avg_rating NUMERIC;
  exchange_count INTEGER;
  given_count INTEGER;
  endorser_count INTEGER;
  new_score NUMERIC;
BEGIN
  target_user_id := COALESCE(NEW.endorsed_id, OLD.endorsed_id);

  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews WHERE subject_id = target_user_id;

  SELECT total_exchanges, total_given INTO exchange_count, given_count
  FROM public.profiles WHERE id = target_user_id;

  SELECT COUNT(DISTINCT endorser_id) INTO endorser_count
  FROM public.skill_endorsements WHERE endorsed_id = target_user_id;

  new_score := LEAST(100, GREATEST(0,
    (COALESCE(avg_rating, 3) * 10) +
    LEAST(COALESCE(exchange_count, 0) * 2, 15) +
    LEAST(COALESCE(given_count, 0) * 0.5, 5) +
    LEAST(COALESCE(endorser_count, 0) * 0.3, 5)
  ));

  UPDATE public.profiles
  SET trust_score = new_score
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_endorsement_change
  AFTER INSERT OR DELETE ON public.skill_endorsements
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_trust_with_endorsements();

-- Also update the existing trust score function to include endorsements
CREATE OR REPLACE FUNCTION public.recalculate_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  exchange_count INTEGER;
  given_count INTEGER;
  endorser_count INTEGER;
  new_score NUMERIC;
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews WHERE subject_id = NEW.subject_id;

  SELECT total_exchanges, total_given INTO exchange_count, given_count
  FROM public.profiles WHERE id = NEW.subject_id;

  SELECT COUNT(DISTINCT endorser_id) INTO endorser_count
  FROM public.skill_endorsements WHERE endorsed_id = NEW.subject_id;

  new_score := LEAST(100, GREATEST(0,
    (COALESCE(avg_rating, 3) * 10) +
    LEAST(COALESCE(exchange_count, 0) * 2, 15) +
    LEAST(COALESCE(given_count, 0) * 0.5, 5) +
    LEAST(COALESCE(endorser_count, 0) * 0.3, 5)
  ));

  UPDATE public.profiles
  SET trust_score = new_score
  WHERE id = NEW.subject_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Check if user is banned from community
CREATE OR REPLACE FUNCTION public.is_user_banned(
  p_community_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_bans
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending flags for a community
CREATE OR REPLACE FUNCTION public.get_flag_queue(
  p_community_id UUID
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  content_author_id UUID,
  reason public.flag_reason,
  description TEXT,
  status public.flag_status,
  created_at TIMESTAMPTZ,
  reporter_display_name TEXT,
  reporter_avatar_url TEXT,
  author_display_name TEXT,
  author_avatar_url TEXT,
  content_preview TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.content_type,
    cf.content_id,
    cf.content_author_id,
    cf.reason,
    cf.description,
    cf.status,
    cf.created_at,
    rp.display_name AS reporter_display_name,
    rp.avatar_url AS reporter_avatar_url,
    ap.display_name AS author_display_name,
    ap.avatar_url AS author_avatar_url,
    CASE cf.content_type
      WHEN 'post' THEN (SELECT title FROM public.posts WHERE id = cf.content_id)
      WHEN 'thread' THEN (SELECT title FROM public.discussion_threads WHERE id = cf.content_id)
      WHEN 'reply' THEN (SELECT LEFT(body, 200) FROM public.discussion_replies WHERE id = cf.content_id)
      WHEN 'potluck_comment' THEN (SELECT LEFT(body, 200) FROM public.potluck_comments WHERE id = cf.content_id)
      ELSE NULL
    END AS content_preview
  FROM public.content_flags cf
  JOIN public.profiles rp ON rp.id = cf.reporter_id
  JOIN public.profiles ap ON ap.id = cf.content_author_id
  WHERE cf.community_id = p_community_id
    AND cf.status = 'pending'
  ORDER BY cf.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mod_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

-- Content flags: any community member can create, mods/admins can view/update
CREATE POLICY flags_insert ON public.content_flags
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = content_flags.community_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY flags_select ON public.content_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = content_flags.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY flags_update ON public.content_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = content_flags.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

-- Mod actions: mods/admins can insert and view
CREATE POLICY mod_actions_insert ON public.mod_actions
  FOR INSERT WITH CHECK (
    moderator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = mod_actions.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY mod_actions_select ON public.mod_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = mod_actions.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

-- Community bans: mods/admins can manage
CREATE POLICY bans_select ON public.community_bans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_bans.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY bans_insert ON public.community_bans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_bans.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY bans_delete ON public.community_bans
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_bans.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

-- User warnings: mods/admins can manage
CREATE POLICY warnings_insert ON public.user_warnings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = user_warnings.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY warnings_select ON public.user_warnings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = user_warnings.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('moderator', 'admin')
    )
  );

-- Skill endorsements: any authenticated user can endorse others, all can view
CREATE POLICY endorsements_select ON public.skill_endorsements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY endorsements_insert ON public.skill_endorsements
  FOR INSERT WITH CHECK (
    endorser_id = auth.uid()
    AND endorsed_id != auth.uid()
  );

CREATE POLICY endorsements_delete ON public.skill_endorsements
  FOR DELETE USING (endorser_id = auth.uid());
