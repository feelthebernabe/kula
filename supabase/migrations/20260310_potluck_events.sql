-- ============================================================
-- POTLUCK EVENTS FEATURE
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.potluck_status AS ENUM ('upcoming', 'in_progress', 'completed', 'cancelled');

ALTER TYPE public.notification_type ADD VALUE 'potluck_created';
ALTER TYPE public.notification_type ADD VALUE 'potluck_rsvp';
ALTER TYPE public.notification_type ADD VALUE 'potluck_reminder';
ALTER TYPE public.notification_type ADD VALUE 'potluck_cancelled';
ALTER TYPE public.notification_type ADD VALUE 'potluck_updated';

-- ============================================================
-- POTLUCKS TABLE
-- ============================================================
CREATE TABLE public.potlucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description TEXT CHECK (char_length(description) <= 5000),
  images TEXT[] DEFAULT '{}',
  event_date TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  location_details TEXT CHECK (char_length(location_details) <= 500),
  capacity INTEGER CHECK (capacity IS NULL OR (capacity >= 2 AND capacity <= 500)),
  rsvp_count INTEGER DEFAULT 0,
  host_providing TEXT CHECK (char_length(host_providing) <= 1000),
  status public.potluck_status DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_potlucks_community ON public.potlucks(community_id);
CREATE INDEX idx_potlucks_host ON public.potlucks(host_id);
CREATE INDEX idx_potlucks_event_date ON public.potlucks(event_date);
CREATE INDEX idx_potlucks_location ON public.potlucks(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================
-- POTLUCK DISH SLOTS TABLE
-- ============================================================
CREATE TABLE public.potluck_dish_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  potluck_id UUID NOT NULL REFERENCES public.potlucks(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('main', 'side', 'dessert', 'drink', 'appetizer', 'other')),
  label TEXT CHECK (char_length(label) <= 200),
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dish_name TEXT CHECK (char_length(dish_name) <= 200),
  servings INTEGER CHECK (servings IS NULL OR (servings >= 1 AND servings <= 100)),
  dietary_notes TEXT[] DEFAULT '{}',
  claimed_at TIMESTAMPTZ
);

CREATE INDEX idx_dish_slots_potluck ON public.potluck_dish_slots(potluck_id);

-- ============================================================
-- POTLUCK RSVPS TABLE
-- ============================================================
CREATE TABLE public.potluck_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  potluck_id UUID NOT NULL REFERENCES public.potlucks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  note TEXT CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(potluck_id, user_id)
);

CREATE INDEX idx_rsvps_potluck ON public.potluck_rsvps(potluck_id);
CREATE INDEX idx_rsvps_user ON public.potluck_rsvps(user_id);

-- ============================================================
-- POTLUCK COMMENTS TABLE
-- ============================================================
CREATE TABLE public.potluck_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  potluck_id UUID NOT NULL REFERENCES public.potlucks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_potluck_comments_potluck ON public.potluck_comments(potluck_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update RSVP count on insert/update/delete
CREATE OR REPLACE FUNCTION public.update_potluck_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE public.potlucks SET rsvp_count = rsvp_count + 1 WHERE id = NEW.potluck_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE public.potlucks SET rsvp_count = rsvp_count - 1 WHERE id = OLD.potluck_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelled' AND NEW.status = 'confirmed' THEN
      UPDATE public.potlucks SET rsvp_count = rsvp_count + 1 WHERE id = NEW.potluck_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      UPDATE public.potlucks SET rsvp_count = rsvp_count - 1 WHERE id = NEW.potluck_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_potluck_rsvp_change
  AFTER INSERT OR UPDATE OR DELETE ON public.potluck_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_potluck_rsvp_count();

-- Update potluck timestamp on update
CREATE OR REPLACE FUNCTION public.update_potluck_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_potluck_update
  BEFORE UPDATE ON public.potlucks
  FOR EACH ROW EXECUTE FUNCTION public.update_potluck_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.potlucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potluck_dish_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potluck_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potluck_comments ENABLE ROW LEVEL SECURITY;

-- Potlucks: community members can SELECT
CREATE POLICY potlucks_select ON public.potlucks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = potlucks.community_id
        AND cm.user_id = auth.uid()
    )
  );

-- Potlucks: community members can INSERT
CREATE POLICY potlucks_insert ON public.potlucks
  FOR INSERT WITH CHECK (
    host_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = potlucks.community_id
        AND cm.user_id = auth.uid()
    )
  );

-- Potlucks: host can UPDATE
CREATE POLICY potlucks_update ON public.potlucks
  FOR UPDATE USING (host_id = auth.uid());

-- Potlucks: host can DELETE
CREATE POLICY potlucks_delete ON public.potlucks
  FOR DELETE USING (host_id = auth.uid());

-- Dish slots: same community scope as potluck
CREATE POLICY dish_slots_select ON public.potluck_dish_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.potlucks p
      JOIN public.community_members cm ON cm.community_id = p.community_id
      WHERE p.id = potluck_dish_slots.potluck_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY dish_slots_insert ON public.potluck_dish_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.potlucks p
      WHERE p.id = potluck_dish_slots.potluck_id
        AND p.host_id = auth.uid()
    )
  );

CREATE POLICY dish_slots_update ON public.potluck_dish_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.potlucks p
      JOIN public.community_members cm ON cm.community_id = p.community_id
      WHERE p.id = potluck_dish_slots.potluck_id
        AND cm.user_id = auth.uid()
    )
  );

-- RSVPs: community members
CREATE POLICY rsvps_select ON public.potluck_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.potlucks p
      JOIN public.community_members cm ON cm.community_id = p.community_id
      WHERE p.id = potluck_rsvps.potluck_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY rsvps_insert ON public.potluck_rsvps
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.potlucks p
      JOIN public.community_members cm ON cm.community_id = p.community_id
      WHERE p.id = potluck_rsvps.potluck_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY rsvps_update ON public.potluck_rsvps
  FOR UPDATE USING (user_id = auth.uid());

-- Comments: community members
CREATE POLICY comments_select ON public.potluck_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.potlucks p
      JOIN public.community_members cm ON cm.community_id = p.community_id
      WHERE p.id = potluck_comments.potluck_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY comments_insert ON public.potluck_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.potlucks p
      JOIN public.community_members cm ON cm.community_id = p.community_id
      WHERE p.id = potluck_comments.potluck_id
        AND cm.user_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: GET POTLUCKS IN MAP BOUNDS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_potlucks_in_bounds(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  result_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_date TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  capacity INTEGER,
  rsvp_count INTEGER,
  status public.potluck_status,
  host_display_name TEXT,
  host_avatar_url TEXT,
  community_name TEXT,
  community_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.event_date,
    p.end_time,
    p.latitude,
    p.longitude,
    p.location_name,
    p.capacity,
    p.rsvp_count,
    p.status,
    pr.display_name AS host_display_name,
    pr.avatar_url AS host_avatar_url,
    c.name AS community_name,
    p.community_id
  FROM public.potlucks p
  JOIN public.profiles pr ON pr.id = p.host_id
  JOIN public.communities c ON c.id = p.community_id
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude BETWEEN min_lat AND max_lat
    AND p.longitude BETWEEN min_lng AND max_lng
    AND p.status = 'upcoming'
  ORDER BY p.event_date ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
