-- ============================================================
-- MAP / LOCATION SUPPORT
-- ============================================================

-- 1. Add location columns to posts
ALTER TABLE public.posts
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN location_name TEXT;

-- 2. B-tree indexes for bounding-box range queries
CREATE INDEX idx_posts_latitude ON public.posts (latitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_posts_longitude ON public.posts (longitude) WHERE longitude IS NOT NULL;

-- 3. RPC function: fetch posts within a bounding box (for map viewport queries)
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

-- 4. RPC function: fetch posts near a point, sorted by distance
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
  -- Approximate bounding box (1 degree lat ≈ 69 miles, 1 degree lng ≈ 55 miles at ~40°N)
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
    -- Haversine distance in miles
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
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude BETWEEN (center_lat - lat_delta) AND (center_lat + lat_delta)
    AND p.longitude BETWEEN (center_lng - lng_delta) AND (center_lng + lng_delta)
    AND (filter_type IS NULL OR p.type::TEXT = filter_type)
  ORDER BY distance_miles ASC
  LIMIT result_limit;
END;
$$;
