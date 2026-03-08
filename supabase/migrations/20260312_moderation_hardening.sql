-- ============================================================
-- MODERATION HARDENING
-- Fixes: ban enforcement, removed content filtering, duplicate
-- flag prevention, role hierarchy, self-view warnings, RLS
-- ============================================================

-- #7: Unique constraint to prevent duplicate flags from same reporter
ALTER TABLE public.content_flags
  ADD CONSTRAINT unique_flag_per_reporter
  UNIQUE (reporter_id, content_type, content_id);

-- #6: Add 'profile' as allowed content_type for profile reporting
ALTER TABLE public.content_flags
  DROP CONSTRAINT content_flags_content_type_check;
ALTER TABLE public.content_flags
  ADD CONSTRAINT content_flags_content_type_check
  CHECK (content_type IN ('post', 'thread', 'reply', 'potluck_comment', 'profile'));

-- #14: Allow users to see their own warnings
CREATE POLICY warnings_self_select ON public.user_warnings
  FOR SELECT USING (user_id = auth.uid());

-- #19: Rate limiting function for flag submissions (max 10 per user per community per hour)
CREATE OR REPLACE FUNCTION public.check_flag_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.content_flags
  WHERE reporter_id = NEW.reporter_id
    AND community_id = NEW.community_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 reports per hour per community';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_flag_rate_limit
  BEFORE INSERT ON public.content_flags
  FOR EACH ROW EXECUTE FUNCTION public.check_flag_rate_limit();

-- #9: Prevent moderators from banning admins or other moderators
CREATE OR REPLACE FUNCTION public.check_ban_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  banner_role TEXT;
  target_role TEXT;
BEGIN
  SELECT role INTO banner_role
  FROM public.community_members
  WHERE community_id = NEW.community_id AND user_id = NEW.banned_by;

  SELECT role INTO target_role
  FROM public.community_members
  WHERE community_id = NEW.community_id AND user_id = NEW.user_id;

  -- Only admins can ban moderators/admins
  IF target_role IN ('moderator', 'admin') AND banner_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can suspend moderators or other admins';
  END IF;

  -- Admins can't ban themselves
  IF NEW.banned_by = NEW.user_id THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_ban_hierarchy
  BEFORE INSERT ON public.community_bans
  FOR EACH ROW EXECUTE FUNCTION public.check_ban_hierarchy();

-- #22: Restrict community rules updates to admins only
-- (Add a trigger since RLS UPDATE on communities may be too broad)
CREATE OR REPLACE FUNCTION public.check_community_rules_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when rules column is actually changed
  IF OLD.rules IS DISTINCT FROM NEW.rules THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = NEW.id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only community admins can update rules';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_rules_admin_only
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.check_community_rules_update();

-- #1: Ban enforcement - update is_user_banned to also be usable in RLS
-- Add a helper function that checks ban status for current auth user
CREATE OR REPLACE FUNCTION public.is_current_user_banned(p_community_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_bans
    WHERE community_id = p_community_id
      AND user_id = auth.uid()
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- #2: Update search_posts to exclude removed posts
CREATE OR REPLACE FUNCTION public.search_posts(
  search_query TEXT,
  filter_category TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  result_limit INT DEFAULT 10,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  type public.post_type,
  exchange_modes public.exchange_mode[],
  category TEXT,
  title TEXT,
  body TEXT,
  images TEXT[],
  status TEXT,
  response_count INT,
  loan_duration TEXT,
  time_dollar_amount NUMERIC,
  community_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_trust_score NUMERIC,
  community_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.author_id, p.type, p.exchange_modes, p.category,
    p.title, p.body, p.images, p.status::TEXT, p.response_count,
    p.loan_duration, p.time_dollar_amount, p.community_id,
    p.created_at, p.updated_at,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    pr.trust_score AS author_trust_score,
    c.name AS community_name
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  LEFT JOIN public.communities c ON c.id = p.community_id
  WHERE p.status = 'active'
    AND p.removed_by_mod IS NULL
    AND (p.title ILIKE '%' || search_query || '%' OR p.body ILIKE '%' || search_query || '%')
    AND (filter_category IS NULL OR p.category = filter_category)
    AND (filter_type IS NULL OR p.type::TEXT = filter_type)
    AND (cursor_created_at IS NULL OR p.created_at < cursor_created_at)
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- #2: Update get_matching_posts to exclude removed posts
CREATE OR REPLACE FUNCTION public.get_matching_posts(
  p_user_id UUID,
  result_limit INT DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  type public.post_type,
  exchange_modes public.exchange_mode[],
  category TEXT,
  title TEXT,
  body TEXT,
  images TEXT[],
  status TEXT,
  response_count INT,
  loan_duration TEXT,
  time_dollar_amount NUMERIC,
  community_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_trust_score NUMERIC,
  community_name TEXT,
  match_reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_needs TEXT[];
  user_offers TEXT[];
BEGIN
  SELECT COALESCE(pr.needs_list, '{}'), COALESCE(pr.offers_list, '{}')
  INTO user_needs, user_offers
  FROM public.profiles pr WHERE pr.id = p_user_id;

  RETURN QUERY
  WITH matches AS (
    SELECT DISTINCT ON (p.id)
      p.id, p.author_id, p.type, p.exchange_modes, p.category,
      p.title, p.body, p.images, p.status::TEXT, p.response_count,
      p.loan_duration, p.time_dollar_amount, p.community_id,
      p.created_at, p.updated_at,
      pr.display_name AS author_display_name,
      pr.avatar_url AS author_avatar_url,
      pr.trust_score AS author_trust_score,
      c.name AS community_name,
      'You need ' || need AS match_reason,
      COALESCE(pr.trust_score, 0) AS sort_score
    FROM unnest(user_needs) AS need
    JOIN public.posts p ON p.status = 'active'
      AND p.removed_by_mod IS NULL
      AND p.type = 'offer'
      AND p.author_id != p_user_id
      AND (p.title ILIKE '%' || need || '%' OR p.body ILIKE '%' || need || '%')
    JOIN public.profiles pr ON pr.id = p.author_id
    LEFT JOIN public.communities c ON c.id = p.community_id

    UNION

    SELECT DISTINCT ON (p.id)
      p.id, p.author_id, p.type, p.exchange_modes, p.category,
      p.title, p.body, p.images, p.status::TEXT, p.response_count,
      p.loan_duration, p.time_dollar_amount, p.community_id,
      p.created_at, p.updated_at,
      pr.display_name AS author_display_name,
      pr.avatar_url AS author_avatar_url,
      pr.trust_score AS author_trust_score,
      c.name AS community_name,
      'You offer ' || offer AS match_reason,
      COALESCE(pr.trust_score, 0) AS sort_score
    FROM unnest(user_offers) AS offer
    JOIN public.posts p ON p.status = 'active'
      AND p.removed_by_mod IS NULL
      AND p.type = 'request'
      AND p.author_id != p_user_id
      AND (p.title ILIKE '%' || offer || '%' OR p.body ILIKE '%' || offer || '%')
    JOIN public.profiles pr ON pr.id = p.author_id
    LEFT JOIN public.communities c ON c.id = p.community_id
  )
  SELECT DISTINCT ON (m.id)
    m.id, m.author_id, m.type, m.exchange_modes, m.category,
    m.title, m.body, m.images, m.status, m.response_count,
    m.loan_duration, m.time_dollar_amount, m.community_id,
    m.created_at, m.updated_at,
    m.author_display_name, m.author_avatar_url, m.author_trust_score,
    m.community_name, m.match_reason
  FROM matches m
  ORDER BY m.id, m.sort_score DESC
  LIMIT result_limit;
END;
$$;

-- #2: Update get_posts_in_bounds to exclude removed posts
CREATE OR REPLACE FUNCTION public.get_posts_in_bounds(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  filter_category TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_limit INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  type public.post_type,
  exchange_modes public.exchange_mode[],
  category TEXT,
  title TEXT,
  body TEXT,
  images TEXT[],
  status TEXT,
  response_count INT,
  loan_duration TEXT,
  time_dollar_amount NUMERIC,
  community_id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_trust_score NUMERIC,
  community_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.author_id, p.type, p.exchange_modes, p.category,
    p.title, p.body, p.images, p.status::TEXT, p.response_count,
    p.loan_duration, p.time_dollar_amount, p.community_id,
    p.latitude, p.longitude, p.location_name,
    p.created_at, p.updated_at,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    pr.trust_score AS author_trust_score,
    c.name AS community_name
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  LEFT JOIN public.communities c ON c.id = p.community_id
  WHERE p.status = 'active'
    AND p.removed_by_mod IS NULL
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude BETWEEN min_lat AND max_lat
    AND p.longitude BETWEEN min_lng AND max_lng
    AND (filter_category IS NULL OR p.category = filter_category)
    AND (filter_type IS NULL OR p.type::TEXT = filter_type)
    AND (search_query IS NULL OR p.title ILIKE '%' || search_query || '%'
         OR p.body ILIKE '%' || search_query || '%')
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- #2: Update get_posts_nearby to exclude removed posts
CREATE OR REPLACE FUNCTION public.get_posts_nearby(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 2.0,
  filter_type TEXT DEFAULT NULL,
  result_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  type public.post_type,
  exchange_modes public.exchange_mode[],
  category TEXT,
  title TEXT,
  body TEXT,
  images TEXT[],
  status TEXT,
  response_count INT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  created_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_trust_score NUMERIC,
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  lat_delta DOUBLE PRECISION := radius_miles / 69.0;
  lng_delta DOUBLE PRECISION := radius_miles / 55.0;
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.author_id, p.type, p.exchange_modes, p.category,
    p.title, p.body, p.images, p.status::TEXT, p.response_count,
    p.latitude, p.longitude, p.location_name,
    p.created_at,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    pr.trust_score AS author_trust_score,
    3959.0 * ACOS(
      LEAST(1.0,
        COS(RADIANS(center_lat)) * COS(RADIANS(p.latitude))
        * COS(RADIANS(p.longitude) - RADIANS(center_lng))
        + SIN(RADIANS(center_lat)) * SIN(RADIANS(p.latitude))
      )
    ) AS distance_miles
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.status = 'active'
    AND p.removed_by_mod IS NULL
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude BETWEEN (center_lat - lat_delta) AND (center_lat + lat_delta)
    AND p.longitude BETWEEN (center_lng - lng_delta) AND (center_lng + lng_delta)
    AND (filter_type IS NULL OR p.type::TEXT = filter_type)
  ORDER BY distance_miles ASC
  LIMIT result_limit;
END;
$$;

-- Update get_flag_queue to also handle 'profile' content type
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
      WHEN 'profile' THEN (SELECT display_name FROM public.profiles WHERE id = cf.content_id)
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
