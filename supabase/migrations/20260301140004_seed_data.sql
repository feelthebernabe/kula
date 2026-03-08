-- ============================================================
-- SEED DATA: Pilot Community
-- ============================================================

INSERT INTO public.communities (id, name, type, description, location, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kula Pilot Community',
  'geographic',
  'Welcome to Kula! This is our founding sharing network. Share what you have, ask for what you need, and build trust with your neighbors. Together, we can live better with less.',
  'Your Neighborhood',
  '{"allow_posts": true, "require_approval": false}'::jsonb
);
