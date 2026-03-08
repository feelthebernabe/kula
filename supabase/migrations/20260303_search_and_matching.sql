-- ============================================================
-- Search + Smart Matching Functions
-- ============================================================

-- Add GIN index on post body for search (title already has one)
CREATE INDEX IF NOT EXISTS idx_posts_body_search
  ON public.posts USING gin (body gin_trgm_ops);

-- ============================================================
-- 1. search_posts — Full-text search on title + body
-- ============================================================
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
    AND (p.title ILIKE '%' || search_query || '%' OR p.body ILIKE '%' || search_query || '%')
    AND (filter_category IS NULL OR p.category = filter_category)
    AND (filter_type IS NULL OR p.type::TEXT = filter_type)
    AND (cursor_created_at IS NULL OR p.created_at < cursor_created_at)
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- ============================================================
-- 2. get_matching_posts — Find posts that match user's needs/offers
-- ============================================================
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
  -- Get the user's needs and offers lists
  SELECT COALESCE(pr.needs_list, '{}'), COALESCE(pr.offers_list, '{}')
  INTO user_needs, user_offers
  FROM public.profiles pr WHERE pr.id = p_user_id;

  RETURN QUERY
  WITH matches AS (
    -- Match user's needs against offer posts
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
      AND p.type = 'offer'
      AND p.author_id != p_user_id
      AND (p.title ILIKE '%' || need || '%' OR p.body ILIKE '%' || need || '%')
    JOIN public.profiles pr ON pr.id = p.author_id
    LEFT JOIN public.communities c ON c.id = p.community_id

    UNION

    -- Match user's offers against request posts
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
