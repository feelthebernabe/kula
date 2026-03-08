-- ============================================================
-- SEED DATA: Dummy users & geolocated posts for map testing
-- ============================================================

-- 1. Insert dummy auth.users (triggers auto-create profiles via handle_new_user)
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'elena@example.com',   '{"display_name": "Elena Rivera"}'::jsonb,   NOW() - INTERVAL '14 days', NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002', 'marcus@example.com',  '{"display_name": "Marcus Chen"}'::jsonb,    NOW() - INTERVAL '12 days', NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003', 'priya@example.com',   '{"display_name": "Priya Desai"}'::jsonb,    NOW() - INTERVAL '10 days', NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000004', 'jordan@example.com',  '{"display_name": "Jordan Brooks"}'::jsonb,  NOW() - INTERVAL '8 days',  NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000005', 'amara@example.com',   '{"display_name": "Amara Okafor"}'::jsonb,   NOW() - INTERVAL '7 days',  NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000006', 'sam@example.com',     '{"display_name": "Sam Nakamura"}'::jsonb,   NOW() - INTERVAL '6 days',  NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000007', 'lucia@example.com',   '{"display_name": "Lucia Torres"}'::jsonb,   NOW() - INTERVAL '5 days',  NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000008', 'david@example.com',   '{"display_name": "David Kim"}'::jsonb,      NOW() - INTERVAL '4 days',  NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 2. Update profiles with bios, locations, skills, trust scores
UPDATE public.profiles SET
  bio = 'Community herbalist and urban gardener. Love trading seedlings and homemade tinctures.',
  primary_location = 'Greenpoint, Brooklyn',
  skills = ARRAY['herbalism', 'gardening', 'fermentation'],
  offers_list = ARRAY['seedlings', 'herbal tinctures', 'garden advice'],
  needs_list = ARRAY['power tools', 'bicycle repair'],
  trust_score = 72, verified = TRUE, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000001';

UPDATE public.profiles SET
  bio = 'Woodworker and fix-it guy. Got a garage full of tools — happy to lend them out.',
  primary_location = 'Williamsburg, Brooklyn',
  skills = ARRAY['woodworking', 'electrical repair', 'plumbing'],
  offers_list = ARRAY['power tools', 'furniture repair', 'carpentry lessons'],
  needs_list = ARRAY['homemade food', 'garden produce'],
  trust_score = 85, verified = TRUE, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000002';

UPDATE public.profiles SET
  bio = 'Yoga teacher and bodyworker. Offering sliding-scale sessions to neighbors.',
  primary_location = 'Park Slope, Brooklyn',
  skills = ARRAY['yoga', 'massage', 'meditation', 'reiki'],
  offers_list = ARRAY['yoga classes', 'massage', 'meditation guidance'],
  needs_list = ARRAY['tutoring', 'pet sitting'],
  trust_score = 68, verified = TRUE, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000003';

UPDATE public.profiles SET
  bio = 'Stay-at-home parent, great at organizing kids activities. Also make killer sourdough.',
  primary_location = 'Prospect Heights, Brooklyn',
  skills = ARRAY['childcare', 'baking', 'event organizing'],
  offers_list = ARRAY['babysitting', 'sourdough bread', 'kids activities'],
  needs_list = ARRAY['power drill', 'sewing machine', 'moving help'],
  trust_score = 55, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000004';

UPDATE public.profiles SET
  bio = 'Freelance graphic designer. Can help with logos, posters, and murals.',
  primary_location = 'Bed-Stuy, Brooklyn',
  skills = ARRAY['graphic design', 'illustration', 'mural painting'],
  offers_list = ARRAY['design work', 'art lessons', 'poster printing'],
  needs_list = ARRAY['bicycle', 'standing desk', 'language tutoring'],
  trust_score = 63, verified = TRUE, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000005';

UPDATE public.profiles SET
  bio = 'Software developer by day, home chef by night. Always cooking too much food.',
  primary_location = 'Lower East Side, Manhattan',
  skills = ARRAY['cooking', 'web development', 'Japanese'],
  offers_list = ARRAY['home-cooked meals', 'coding tutoring', 'Japanese lessons'],
  needs_list = ARRAY['yoga classes', 'garden space', 'bicycle repair'],
  trust_score = 47, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000006';

UPDATE public.profiles SET
  bio = 'Retired teacher. Offering ESL tutoring and love watching pets.',
  primary_location = 'Fort Greene, Brooklyn',
  skills = ARRAY['teaching', 'ESL tutoring', 'pet care'],
  offers_list = ARRAY['ESL tutoring', 'pet sitting', 'homework help'],
  needs_list = ARRAY['tech help', 'rides to appointments'],
  trust_score = 91, verified = TRUE, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000007';

UPDATE public.profiles SET
  bio = 'Bicycle mechanic and courier. Can fix anything with two wheels.',
  primary_location = 'East Village, Manhattan',
  skills = ARRAY['bicycle repair', 'courier services', 'welding'],
  offers_list = ARRAY['bike repair', 'bike delivery', 'welding'],
  needs_list = ARRAY['massage', 'cooking lessons', 'art prints'],
  trust_score = 76, verified = TRUE, onboarding_completed = TRUE
WHERE id = 'a0000000-0000-0000-0000-000000000008';

-- 3. Add all users to the pilot community
INSERT INTO public.community_members (community_id, user_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008')
ON CONFLICT (community_id, user_id) DO NOTHING;

-- 4. Insert geolocated posts across Brooklyn & Lower Manhattan
-- Scattered across real neighborhoods so the map looks alive

-- Elena: Greenpoint area (40.7274, -73.9514)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001', 'offer', ARRAY['gift', 'barter']::exchange_mode[],
  'food-garden', 'Free herb seedlings — basil, cilantro, mint',
  'Spring is here! I have way too many herb seedlings started indoors. Take some off my hands — come pick up or I can drop off nearby. Happy to trade for interesting seeds you might have.',
  40.7274, -73.9514, 'Greenpoint, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001', 'offer', ARRAY['time_dollar']::exchange_mode[],
  'education-skills', 'Urban composting workshop at my community garden',
  'Running a hands-on composting workshop this Saturday 10am at the McCarren Park garden plots. Learn hot composting, vermicomposting, and bokashi basics. Bring gloves!',
  40.7238, -73.9510, 'McCarren Park, Greenpoint',
  '00000000-0000-0000-0000-000000000001'
), (
  'a0000000-0000-0000-0000-000000000001', 'request', ARRAY['loan']::exchange_mode[],
  'tools-equipment', 'Need a power drill for weekend project',
  'Building raised beds for the community garden. Need a cordless drill for Saturday and Sunday. Will return cleaned and with a jar of homemade kimchi as thanks!',
  40.7280, -73.9530, 'Greenpoint, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

-- Marcus: Williamsburg area (40.7081, -73.9571)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000002', 'offer', ARRAY['loan']::exchange_mode[],
  'tools-equipment', 'Full woodworking tool kit available to borrow',
  'Circular saw, jigsaw, router, orbital sander, clamps, and hand tools. Happy to lend for a weekend at a time. Pick up from my garage on Metropolitan Ave.',
  40.7141, -73.9565, 'Williamsburg, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000002', 'offer', ARRAY['time_dollar', 'barter']::exchange_mode[],
  'household', 'Furniture repair and refinishing',
  'Got a wobbly table or chair with a broken leg? I can fix most wooden furniture. Also do refinishing and staining. Trade for home-cooked meals or garden produce preferred.',
  40.7125, -73.9580, 'Williamsburg, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

-- Priya: Park Slope area (40.6681, -73.9822)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000003', 'offer', ARRAY['time_dollar', 'flexible']::exchange_mode[],
  'wellness-bodywork', 'Gentle yoga class in Prospect Park — all levels welcome',
  'I teach a free community yoga class every Sunday morning at 9am on the Long Meadow. Bring your own mat. Beginners and seniors especially welcome! Donations to the park appreciated.',
  40.6620, -73.9700, 'Prospect Park, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000003', 'offer', ARRAY['barter', 'time_dollar']::exchange_mode[],
  'wellness-bodywork', 'Sliding-scale massage sessions at my home studio',
  '60-minute Swedish or deep tissue massage. I have a professional table and 8 years experience. Evenings and weekends. Trade for tutoring, pet sitting, or time dollars.',
  40.6710, -73.9790, 'Park Slope, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000003', 'request', ARRAY['barter']::exchange_mode[],
  'kids-family', 'Looking for a reliable pet sitter for my cat',
  'Going on a meditation retreat for 5 days next month. Need someone to feed and check on my very chill elderly cat. She is easy and just needs company. Can trade massage sessions!',
  40.6695, -73.9810, 'Park Slope, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

-- Jordan: Prospect Heights area (40.6775, -73.9692)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000004', 'offer', ARRAY['gift']::exchange_mode[],
  'food-garden', 'Fresh sourdough bread every Friday',
  'I bake 6 loaves of sourdough every Friday morning. My family only needs 2. First come, first served — text me by Thursday night to reserve a loaf. Pickup on Vanderbilt Ave.',
  40.6780, -73.9685, 'Prospect Heights, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000004', 'offer', ARRAY['flexible']::exchange_mode[],
  'kids-family', 'Weekday playdate group for toddlers (ages 2-4)',
  'I organize a small playgroup that meets at the Brooklyn Museum playground Tu/Th mornings. Looking for 2-3 more families to join. Parents take turns supervising so others get a break.',
  40.6712, -73.9637, 'Brooklyn Museum area',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000004', 'request', ARRAY['loan', 'barter']::exchange_mode[],
  'tools-equipment', 'Borrowing a sewing machine for a week',
  'Want to hem some curtains and fix a few kids clothes. Would love to borrow a sewing machine for the week. Happy to return with a loaf of sourdough or babysitting hours!',
  40.6768, -73.9700, 'Prospect Heights, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

-- Amara: Bed-Stuy area (40.6872, -73.9418)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000005', 'offer', ARRAY['time_dollar', 'barter']::exchange_mode[],
  'creative-services', 'Logo and poster design for local businesses and orgs',
  'Freelance designer offering discounted or trade-based design work for neighborhood businesses, mutual aid groups, and community events. Portfolio available on request.',
  40.6872, -73.9418, 'Bed-Stuy, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000005', 'offer', ARRAY['gift', 'time_dollar']::exchange_mode[],
  'education-skills', 'Free intro to digital art workshop for teens',
  'Teaching a beginner digital illustration workshop at the Bed-Stuy library next Saturday 2-4pm. Tablets provided. Ages 13-18. Sign up in the comments!',
  40.6853, -73.9440, 'Bed-Stuy Library',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000005', 'request', ARRAY['loan', 'barter']::exchange_mode[],
  'transport', 'Need to borrow a bicycle for a month',
  'My bike got stolen last week. Need a loaner while I save up for a new one. Can trade design work, art prints, or time dollars. Any size works, I am 5''8".',
  40.6890, -73.9400, 'Bed-Stuy, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

-- Sam: Lower East Side, Manhattan (40.7185, -73.9861)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000006', 'offer', ARRAY['gift']::exchange_mode[],
  'food-garden', 'Extra home-cooked Japanese meals, weeknight evenings',
  'I always cook too much. This week: tonkatsu curry (Mon), ramen (Wed), onigiri and miso (Fri). Pickup from my apartment on Rivington St between 6-8pm. Containers provided.',
  40.7193, -73.9870, 'Lower East Side, Manhattan',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000006', 'offer', ARRAY['time_dollar']::exchange_mode[],
  'education-skills', 'Japanese language tutoring — conversational focus',
  'Native-level Japanese speaker offering 1-on-1 conversational practice sessions. Great for travel prep or anime fans who want to ditch the subtitles. Cafes in LES preferred.',
  40.7200, -73.9880, 'Lower East Side, Manhattan',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000006', 'request', ARRAY['barter', 'time_dollar']::exchange_mode[],
  'wellness-bodywork', 'Looking for a yoga buddy or class to join',
  'Want to get into a regular yoga practice but struggle with motivation on my own. Would love to find a partner or small group. Can trade cooking or tech help.',
  40.7178, -73.9855, 'Lower East Side, Manhattan',
  '00000000-0000-0000-0000-000000000001'
);

-- Lucia: Fort Greene area (40.6892, -73.9762)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000007', 'offer', ARRAY['gift', 'flexible']::exchange_mode[],
  'education-skills', 'ESL conversation practice for adults',
  'Retired teacher offering free English conversation practice sessions. We meet at Fort Greene Park on Tuesday and Thursday afternoons 3-4:30pm. All levels welcome. Bring a friend!',
  40.6892, -73.9762, 'Fort Greene Park, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000007', 'offer', ARRAY['gift']::exchange_mode[],
  'kids-family', 'Pet sitting — dogs and cats, your place or mine',
  'Love animals and have a fenced yard. Can watch your dog or cat while you travel. Also happy to do daily walks. 15 years of pet parent experience. References available.',
  40.6905, -73.9745, 'Fort Greene, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000007', 'request', ARRAY['barter', 'time_dollar']::exchange_mode[],
  'professional-services', 'Need help setting up a tablet for video calls',
  'Got a new iPad from my daughter but cannot figure out FaceTime and Zoom. Would love someone patient to walk me through it. Can trade tutoring sessions or pet sitting.',
  40.6878, -73.9770, 'Fort Greene, Brooklyn',
  '00000000-0000-0000-0000-000000000001'
);

-- David: East Village, Manhattan (40.7264, -73.9818)
INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000008', 'offer', ARRAY['time_dollar', 'barter']::exchange_mode[],
  'transport', 'Bicycle tune-ups and flat tire repair',
  'Pro bike mechanic. Can do full tune-ups, brake adjustments, gear indexing, flat repairs, and wheel truing. Bring your bike to my shop on E 6th St or I can come to you within 10 blocks.',
  40.7264, -73.9818, 'East Village, Manhattan',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000008', 'offer', ARRAY['loan']::exchange_mode[],
  'transport', 'Spare bicycle available to borrow',
  'I have an extra single-speed I am not using right now. Medium frame, good condition. Happy to lend for up to a month. Just take care of it and return it tuned up.',
  40.7250, -73.9830, 'East Village, Manhattan',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.posts (author_id, type, exchange_modes, category, title, body, latitude, longitude, location_name, community_id)
VALUES (
  'a0000000-0000-0000-0000-000000000008', 'request', ARRAY['barter']::exchange_mode[],
  'wellness-bodywork', 'Trade bike repair for massage or bodywork',
  'My back is wrecked from hunching over bikes all day. Looking for a massage therapist or bodyworker to trade services with. I will fix your whole fleet!',
  40.7270, -73.9805, 'East Village, Manhattan',
  '00000000-0000-0000-0000-000000000001'
);
