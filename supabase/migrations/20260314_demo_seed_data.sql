-- ============================================================
-- DEMO SEED DATA: Rich social graph for investor demo
-- Adds communities, exchanges, reviews, discussions, potlucks, messages
-- ============================================================

-- ============================================================
-- 1. ADDITIONAL COMMUNITIES
-- ============================================================

INSERT INTO public.communities (id, name, type, description, location, settings)
VALUES
  ('00000000-0000-0000-0000-000000000002',
   'Park Slope Parents',
   'affinity',
   'A supportive community for parents in Park Slope and surrounding neighborhoods. Share childcare tips, organize playdates, swap kids'' clothes and gear.',
   'Park Slope, Brooklyn',
   '{"allow_posts": true, "require_approval": false}'::jsonb),
  ('00000000-0000-0000-0000-000000000003',
   'Brooklyn Tool Library',
   'geographic',
   'Why buy when you can borrow? Share and lend tools across Brooklyn. Power tools, hand tools, gardening equipment, and more.',
   'Brooklyn, NY',
   '{"allow_posts": true, "require_approval": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. COMMUNITY MEMBERSHIPS (new communities)
-- ============================================================

-- Park Slope Parents: Priya (Park Slope), Jordan (Prospect Heights), Amara, Elena, Lucia
INSERT INTO public.community_members (community_id, user_id, role, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'admin',     NOW() - INTERVAL '20 days'),
  ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'moderator', NOW() - INTERVAL '18 days'),
  ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'member',    NOW() - INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'member',    NOW() - INTERVAL '12 days'),
  ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'member',    NOW() - INTERVAL '10 days')
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Brooklyn Tool Library: Marcus (tools guy), David (bike mechanic), Elena, Sam, Jordan
INSERT INTO public.community_members (community_id, user_id, role, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'admin',     NOW() - INTERVAL '22 days'),
  ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 'moderator', NOW() - INTERVAL '20 days'),
  ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'member',    NOW() - INTERVAL '16 days'),
  ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', 'member',    NOW() - INTERVAL '14 days'),
  ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'member',    NOW() - INTERVAL '11 days')
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Update member counts
UPDATE public.communities SET member_count = (
  SELECT COUNT(*) FROM public.community_members WHERE community_id = communities.id
);

-- ============================================================
-- 3. EXCHANGE AGREEMENTS (14 completed)
-- ============================================================

-- Exchange 1: Elena gives Jordan herb seedlings (gift)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000001' AND title LIKE 'Free herb seedlings%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'gift',
  'Elena will drop off basil, cilantro, and mint seedlings to Jordan on Saturday',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days'
);

-- Exchange 2: Marcus lends Elena power tools (loan)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, loan_return_date, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000002' AND title LIKE 'Full woodworking%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'loan',
  'Borrowing circular saw and orbital sander for raised bed project. Return by next Sunday.',
  NOW() - INTERVAL '18 days',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '25 days', NOW() - INTERVAL '18 days'
);

-- Exchange 3: Priya trades yoga for Jordan's sourdough (barter)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000003',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000003' AND title LIKE 'Gentle yoga%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'barter',
  'Priya gives 4 yoga sessions, Jordan provides a loaf of sourdough each week for a month',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '22 days', NOW() - INTERVAL '8 days'
);

-- Exchange 4: Sam tutors Amara in Japanese (time_dollar, 2 TD)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, time_dollar_amount, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000004',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000006' AND title LIKE 'Japanese language%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000005',
  'time_dollar',
  '2 one-hour conversational Japanese sessions at a cafe in LES',
  2.00,
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days'
);

-- Exchange 5: David repairs Priya's bike, Priya gives massage (barter)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000005',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000008' AND title LIKE 'Bicycle tune-ups%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000003',
  'barter',
  'David does a full bike tune-up, Priya gives a 60-min deep tissue massage',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days'
);

-- Exchange 6: Jordan gives Sam sourdough (gift)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000006',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000004' AND title LIKE 'Fresh sourdough%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000006',
  'gift',
  'Jordan drops off a fresh loaf of sourdough on Friday morning',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'
);

-- Exchange 7: Lucia pet-sits for Priya (gift)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000007',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000007' AND title LIKE 'Pet sitting%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000003',
  'gift',
  'Lucia watches Priya''s cat for 5 days while Priya is on retreat',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 days'
);

-- Exchange 8: Marcus fixes Amara's furniture (time_dollar, 3 TD)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, time_dollar_amount, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000008',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000002' AND title LIKE 'Furniture repair%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000005',
  'time_dollar',
  'Marcus refinishes Amara''s vintage desk — 3 hours of work',
  3.00,
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'
);

-- Exchange 9: David lends Amara a bicycle (loan)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, loan_return_date, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000009',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000008' AND title LIKE 'Spare bicycle%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000005',
  'loan',
  'Amara borrows David''s single-speed for 3 weeks while saving for a new bike',
  NOW() - INTERVAL '2 days',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '21 days', NOW() - INTERVAL '2 days'
);

-- Exchange 10: Elena teaches Sam composting (time_dollar, 1 TD)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, time_dollar_amount, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000010',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000001' AND title LIKE 'Urban composting%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000006',
  'time_dollar',
  'Sam attends Elena''s composting workshop — 1 hour session',
  1.00,
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
);

-- Exchange 11: Amara designs logo for David (barter)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000011',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000005' AND title LIKE 'Logo and poster%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000008',
  'barter',
  'Amara designs a logo for David''s bike repair shop, David tunes up Amara''s new bike',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days'
);

-- Exchange 12: Lucia tutors Sam's friend in ESL (flexible)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000012',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000007' AND title LIKE 'ESL conversation%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000006',
  'flexible',
  'Lucia and Sam meet weekly for English-Japanese language exchange at Fort Greene Park',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days'
);

-- Exchange 13: Sam cooks for Marcus (gift)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000013',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000006' AND title LIKE 'Extra home-cooked%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000002',
  'gift',
  'Sam drops off tonkatsu curry and rice for Marcus on Monday evening',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
);

-- Exchange 14: Marcus lends Jordan a drill (loan)
INSERT INTO public.exchange_agreements (id, post_id, provider_id, receiver_id, exchange_mode, terms, loan_return_date, status, provider_confirmed, receiver_confirmed, created_at, completed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000014',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000002' AND title LIKE 'Full woodworking%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004',
  'loan',
  'Jordan borrows Marcus''s cordless drill for a weekend shelf project',
  NOW() - INTERVAL '1 day',
  'completed', TRUE, TRUE,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
);

-- ============================================================
-- 4. REVIEWS (two per exchange, 28 total)
-- ============================================================

-- Exchange 1 reviews: Elena ↔ Jordan (seedlings gift)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 5, 'Elena brought over the most beautiful herb seedlings — basil, cilantro, and mint all thriving. She even gave me tips on transplanting them. So generous!', NOW() - INTERVAL '27 days'),
  ('r0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 5, 'Jordan was so excited about the seedlings and already has a plan for a kitchen herb garden. Love sharing with someone who appreciates it!', NOW() - INTERVAL '27 days');

-- Exchange 2 reviews: Marcus ↔ Elena (tool loan)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 5, 'Marcus lent me his circular saw and sander for my raised bed project. Everything was clean, sharp, and he even showed me how to change blades safely. Best neighbor!', NOW() - INTERVAL '18 days'),
  ('r0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 5, 'Elena returned everything on time and in perfect condition. She even sharpened the saw blade! Would lend to her anytime, genuinely trustworthy.', NOW() - INTERVAL '18 days');

-- Exchange 3 reviews: Priya ↔ Jordan (yoga ↔ sourdough)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 5, 'Priya is an amazing yoga teacher. Patient, encouraging, and she modified poses for my bad knee. My whole body feels better after a month of sessions.', NOW() - INTERVAL '8 days'),
  ('r0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 5, 'Jordan''s sourdough is incredible — that crispy crust and tangy flavor. Having a fresh loaf every week was the best barter deal ever. Highly recommend!', NOW() - INTERVAL '8 days');

-- Exchange 4 reviews: Sam ↔ Amara (Japanese tutoring)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 5, 'Sam is a fantastic tutor — patient, fun, and really focused on practical conversation. I can already order food in Japanese! Will definitely book more sessions.', NOW() - INTERVAL '14 days'),
  ('r0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 5, 'Amara is a dedicated student who always comes prepared with questions. The sessions are genuinely fun and she picks things up incredibly fast.', NOW() - INTERVAL '14 days');

-- Exchange 5 reviews: David ↔ Priya (bike repair ↔ massage)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 5, 'David is a true bike wizard. My ancient commuter bike rides like new — new brake pads, adjusted gears, trued the wheels. Professional quality work.', NOW() - INTERVAL '15 days'),
  ('r0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 5, 'Priya gave the best deep tissue massage I have ever had. My back feels like it did ten years ago. She really knows what she''s doing. Life-changing!', NOW() - INTERVAL '15 days');

-- Exchange 6 reviews: Jordan ↔ Sam (sourdough gift)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 5, 'Jordan''s sourdough is legendary. Perfectly crusty exterior, soft tangy interior. Made the best avocado toast of my life with it. This is what community is about!', NOW() - INTERVAL '16 days'),
  ('r0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 4, 'Sam was really appreciative and texted me a photo of the toast. Always nice when someone genuinely enjoys what you share. Easy and pleasant exchange!', NOW() - INTERVAL '16 days');

-- Exchange 7 reviews: Lucia ↔ Priya (pet sitting)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 5, 'Lucia took amazing care of my cat for 5 days! She sent daily photos and even brushed her. Came home to a happy, well-fed kitty. Absolute lifesaver for my retreat.', NOW() - INTERVAL '9 days'),
  ('r0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 5, 'Priya''s cat Luna is the sweetest and easiest pet to watch. She cuddled up in my lap every evening. I would happily watch her again anytime Priya needs.', NOW() - INTERVAL '9 days');

-- Exchange 8 reviews: Marcus ↔ Amara (furniture repair)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 5, 'Marcus completely transformed my vintage desk. It looked like it belonged in a design magazine after he was done. Sanded, stained, and sealed — craftsman quality work.', NOW() - INTERVAL '10 days'),
  ('r0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 4, 'Amara was great to work with. She had a clear vision for the desk finish and provided high-quality stain. The time dollar system worked smoothly for this exchange.', NOW() - INTERVAL '10 days');

-- Exchange 9 reviews: David ↔ Amara (bicycle loan)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 5, 'David lent me his spare bike for three whole weeks while I saved for a new one. It was in great condition and got me through a tough time. So grateful for his generosity.', NOW() - INTERVAL '2 days'),
  ('r0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000005', 5, 'Amara returned the bike in perfect shape — she even cleaned it and pumped the tires. Responsible borrower who clearly takes care of things that aren''t hers. Trust earned.', NOW() - INTERVAL '2 days');

-- Exchange 10 reviews: Elena ↔ Sam (composting workshop)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 5, 'Elena''s composting workshop was incredible — learned about hot composting, worm bins, and bokashi in just one hour. She really knows her stuff and makes it fun.', NOW() - INTERVAL '10 days'),
  ('r0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 5, 'Sam was an engaged participant who asked great questions. He''s already started a worm bin at home! Love teaching people who are excited about sustainability.', NOW() - INTERVAL '10 days');

-- Exchange 11 reviews: Amara ↔ David (logo ↔ bike tune-up)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000005', 5, 'Amara designed an amazing logo for my bike shop — clean, modern, and it really captures the vibe. She even did multiple revisions without being asked. Top-tier designer.', NOW() - INTERVAL '5 days'),
  ('r0000000-0000-0000-0000-000000000022', 'e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 5, 'David gave my new bike a thorough tune-up as part of our trade. New chain, adjusted brakes, indexed gears. It rides like a dream now. Fair and fun barter!', NOW() - INTERVAL '5 days');

-- Exchange 12 reviews: Lucia ↔ Sam (ESL ↔ language exchange)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000023', 'e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007', 5, 'Lucia is the most patient and encouraging English teacher. She tailors every session to what I need and always brings interesting conversation topics. A real treasure.', NOW() - INTERVAL '3 days'),
  ('r0000000-0000-0000-0000-000000000024', 'e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000006', 4, 'Sam is a wonderful language exchange partner. His Japanese pronunciation tips are so helpful, and he''s very forgiving of my mistakes. Lovely person to spend time with.', NOW() - INTERVAL '3 days');

-- Exchange 13 reviews: Sam ↔ Marcus (home-cooked meals)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000025', 'e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 5, 'Sam''s tonkatsu curry was restaurant-quality — crispy, perfectly seasoned, with fresh rice. He even packed it beautifully in reusable containers. Can''t wait for the next batch!', NOW() - INTERVAL '4 days'),
  ('r0000000-0000-0000-0000-000000000026', 'e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 4, 'Marcus was so grateful and appreciative. He even left a note saying it was the best curry he''d ever had. Always makes sharing feel worthwhile and meaningful.', NOW() - INTERVAL '4 days');

-- Exchange 14 reviews: Marcus ↔ Jordan (drill loan)
INSERT INTO public.reviews (id, exchange_id, author_id, subject_id, rating, body, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000027', 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 5, 'Marcus is incredibly generous with his tools. The cordless drill was fully charged and came with multiple bits. My shelf project turned out great thanks to his help!', NOW() - INTERVAL '1 day'),
  ('r0000000-0000-0000-0000-000000000028', 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 5, 'Jordan returned the drill cleaned, charged, and even put the bits back in order. Also brought a loaf of sourdough as thanks! The kind of borrower you dream about.', NOW() - INTERVAL '1 day');

-- ============================================================
-- 5. UPDATE PROFILE STATS & TRUST SCORES
-- ============================================================

-- Elena: 3 exchanges (2 as provider, 1 as receiver)
UPDATE public.profiles SET
  total_exchanges = 3, total_given = 2, total_received = 1,
  trust_score = 82
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Marcus: 4 exchanges (3 as provider, 1 as receiver)
UPDATE public.profiles SET
  total_exchanges = 4, total_given = 3, total_received = 1,
  trust_score = 91
WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- Priya: 3 exchanges (1 as provider, 2 as receiver)
UPDATE public.profiles SET
  total_exchanges = 3, total_given = 1, total_received = 2,
  trust_score = 78
WHERE id = 'a0000000-0000-0000-0000-000000000003';

-- Jordan: 4 exchanges (2 as provider, 2 as receiver)
UPDATE public.profiles SET
  total_exchanges = 4, total_given = 2, total_received = 2,
  trust_score = 85
WHERE id = 'a0000000-0000-0000-0000-000000000004';

-- Amara: 4 exchanges (1 as provider, 3 as receiver)
UPDATE public.profiles SET
  total_exchanges = 4, total_given = 1, total_received = 3,
  trust_score = 76
WHERE id = 'a0000000-0000-0000-0000-000000000005';

-- Sam: 4 exchanges (2 as provider, 2 as receiver)
UPDATE public.profiles SET
  total_exchanges = 4, total_given = 2, total_received = 2,
  trust_score = 80
WHERE id = 'a0000000-0000-0000-0000-000000000006';

-- Lucia: 2 exchanges (2 as provider, 0 as receiver)
UPDATE public.profiles SET
  total_exchanges = 2, total_given = 2, total_received = 0,
  trust_score = 74
WHERE id = 'a0000000-0000-0000-0000-000000000007';

-- David: 4 exchanges (3 as provider, 1 as receiver)
UPDATE public.profiles SET
  total_exchanges = 4, total_given = 3, total_received = 1,
  trust_score = 88
WHERE id = 'a0000000-0000-0000-0000-000000000008';

-- ============================================================
-- 6. DISCUSSION THREADS + REPLIES
-- ============================================================

-- Pilot Community threads
INSERT INTO public.discussion_threads (id, community_id, author_id, title, body, pinned, reply_count, last_reply_at, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Welcome to Kula! Introduce yourself here',
   'Hey everyone! This is our community space to connect, share, and build trust with neighbors. Drop a quick intro below — who you are, what you offer, what you need. Let''s get to know each other!',
   TRUE, 4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '25 days'),

  ('d0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000006',
   'Best local coffee shops for meeting up?',
   'I keep scheduling exchanges at the same Starbucks. What are your favorite local cafes or meeting spots for doing exchanges? Bonus points if they have outdoor seating and are bike-friendly.',
   FALSE, 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 days');

-- Park Slope Parents threads
INSERT INTO public.discussion_threads (id, community_id, author_id, title, body, pinned, reply_count, last_reply_at, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000004',
   'Weekend playdate at Prospect Park — Saturday 10am',
   'Organizing a group playdate this Saturday at the Prospect Park playground near the zoo entrance. Ages 2-6 welcome! Parents take turns watching the kids so everyone gets a breather. Bring snacks to share.',
   FALSE, 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '9 days'),

  ('d0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000003',
   'Recommendations for after-school activities?',
   'My daughter is 7 and I''m looking for affordable after-school programs in the Park Slope area. Music, art, sports — open to anything. What have your kids loved?',
   FALSE, 2, NOW() - INTERVAL '4 days', NOW() - INTERVAL '8 days');

-- Brooklyn Tool Library threads
INSERT INTO public.discussion_threads (id, community_id, author_id, title, body, pinned, reply_count, last_reply_at, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000002',
   'Tool inventory update — what we have available',
   'Here''s a quick list of what''s currently available to borrow from the community: circular saw, jigsaw, router, orbital sander, cordless drills (2x), impact driver, tile cutter, various hand tools. Request through your posts!',
   TRUE, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 days'),

  ('d0000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000008',
   'Workshop: Intro to bicycle maintenance — sign up!',
   'I''m running a free hands-on bicycle maintenance workshop next Sunday at my shop in the East Village. Learn how to fix a flat, adjust brakes, and do basic tune-ups. Bring your bike! Space for 8 people.',
   FALSE, 2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days');

-- Replies for Welcome thread (d...01)
INSERT INTO public.discussion_replies (thread_id, author_id, body, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Hey! I''m Marcus, woodworker and fix-it guy in Williamsburg. Got a garage full of tools I''m happy to lend out. Always looking for good home-cooked meals in return!', NOW() - INTERVAL '24 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Hi everyone! Priya here, yoga teacher and bodyworker in Park Slope. Offering community yoga in Prospect Park every Sunday. Also looking for a pet sitter for my cat Luna!', NOW() - INTERVAL '20 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'Sam here! I cook too much and love sharing Japanese food with neighbors. Also happy to tutor Japanese or help with tech stuff. LES based but happy to travel for good people.', NOW() - INTERVAL '15 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'I''m Amara, a graphic designer in Bed-Stuy. I can design logos, posters, and social media graphics for community projects. In exchange, I''d love help with gardening or bike stuff!', NOW() - INTERVAL '2 days');

-- Replies for Coffee shop thread (d...02)
INSERT INTO public.discussion_replies (thread_id, author_id, body, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cafe Grumpy in Greenpoint is amazing! Great outdoor seating and they are super chill about people hanging out. Perfect for garden seedling exchanges too.', NOW() - INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'Abraço in the East Village if you''re in Manhattan. Tiny but incredible. For Brooklyn, I like Devoción — they have that big airy back room with tons of natural light.', NOW() - INTERVAL '8 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'I love meeting at Fort Greene Park when the weather is nice. No need to buy anything and there are benches everywhere. Parks are underrated for community exchanges!', NOW() - INTERVAL '5 days');

-- Replies for Playdate thread (d...03)
INSERT INTO public.discussion_replies (thread_id, author_id, body, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'We will be there! My 4-year-old has been asking for park time all week. I can bring some fruit and crackers for the kids.', NOW() - INTERVAL '7 days'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Count us in! I will bring some lemonade from our garden lemons. Is it okay if my friend''s kid joins too? She is 3 and very sweet.', NOW() - INTERVAL '5 days'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'This is wonderful! I do not have kids but I am an experienced pet sitter and babysitter. Happy to be an extra set of hands if you need help supervising!', NOW() - INTERVAL '3 days');

-- Replies for After-school thread (d...04)
INSERT INTO public.discussion_replies (thread_id, author_id, body, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'The Brooklyn Conservatory of Music on 7th Ave does great group lessons. My kid loves the percussion class. Pretty affordable too compared to private lessons.', NOW() - INTERVAL '6 days'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'Bed-Stuy YMCA has a great art program that goes until 6pm. Also check out Prospect Park Alliance — they run nature programs and outdoor skills classes for that age.', NOW() - INTERVAL '4 days');

-- Replies for Tool inventory thread (d...05)
INSERT INTO public.discussion_replies (thread_id, author_id, body, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'This is amazing! I might need the tile cutter next month for a bathroom project. What is the borrowing process — do I just post a request on Kula?', NOW() - INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'I have a pressure washer I can add to the library! Barely used it. Let me know if anyone wants it — happy to lend for a weekend at a time.', NOW() - INTERVAL '5 days'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'Would love to borrow the jigsaw this weekend for a bookshelf project. Marcus, is it available? I can pick up from your garage if that works.', NOW() - INTERVAL '1 day');

-- Replies for Bike workshop thread (d...06)
INSERT INTO public.discussion_replies (thread_id, author_id, body, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'I am signing up! My bike has been making a weird clicking noise for weeks. Would love to learn to fix it myself instead of paying $80 at the shop.', NOW() - INTERVAL '4 days'),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Can I join too? I ride my bike every day but have no idea how to maintain it. Also, would it be possible to do another workshop on gardening tools? Cross-pollination!', NOW() - INTERVAL '2 days');

-- ============================================================
-- 7. POTLUCK EVENTS
-- ============================================================

INSERT INTO public.potlucks (id, community_id, host_id, title, description, event_date, end_time, latitude, longitude, location_name, location_details, capacity, rsvp_count, host_providing, status, created_at)
VALUES
  ('p0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000005',
   'Summer Block Party & Potluck',
   'Let''s kick off summer together! Bring a dish to share, meet your neighbors, and celebrate our growing Kula community. Music, food, and good vibes. Kids welcome!',
   NOW() + INTERVAL '14 days',
   NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
   40.6872, -73.9418,
   'Herbert Von King Park, Bed-Stuy',
   'Meet at the picnic area near the amphitheater. Look for the Kula banner!',
   25, 6,
   'Lemonade, cups, plates, napkins, and a bluetooth speaker',
   'upcoming',
   NOW() - INTERVAL '5 days'),

  ('p0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000004',
   'Park Slope Parents Picnic',
   'Casual family picnic in Prospect Park! Parents bring a dish, kids run free. Great chance to meet other Kula families and set up playdates and skill swaps.',
   NOW() + INTERVAL '7 days',
   NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
   40.6620, -73.9700,
   'Prospect Park Long Meadow',
   'Southern end of the Long Meadow, near the Picnic House. Look for the blankets!',
   15, 4,
   'Sandwiches, juice boxes for kids, and a big picnic blanket',
   'upcoming',
   NOW() - INTERVAL '3 days');

-- RSVPs
INSERT INTO public.potluck_rsvps (potluck_id, user_id, status, note, created_at) VALUES
  -- Block Party RSVPs
  ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'confirmed', 'Bringing a big batch of garden herb salad!', NOW() - INTERVAL '4 days'),
  ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'confirmed', 'I will grill some burgers. Can also bring my cornhole set!', NOW() - INTERVAL '4 days'),
  ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'confirmed', 'Making onigiri and miso soup for everyone!', NOW() - INTERVAL '3 days'),
  ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'confirmed', 'Bringing my bike tools in case anyone needs a quick fix! Plus brownies.', NOW() - INTERVAL '3 days'),
  ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'confirmed', 'I will lead a short group stretch session to start the party!', NOW() - INTERVAL '2 days'),
  ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'confirmed', 'Bringing my famous tres leches cake. Cannot wait to meet everyone!', NOW() - INTERVAL '1 day'),
  -- Parents Picnic RSVPs
  ('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'confirmed', 'Bringing fruit salad and yoga mats for the kids!', NOW() - INTERVAL '2 days'),
  ('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'confirmed', 'Making a big salad with garden greens. My little one is excited!', NOW() - INTERVAL '2 days'),
  ('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'confirmed', 'Bringing empanadas! Also happy to help watch the little ones.', NOW() - INTERVAL '1 day'),
  ('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'confirmed', 'Bringing sidewalk chalk and bubbles for the kids!', NOW() - INTERVAL '1 day');

-- ============================================================
-- 8. CONVERSATIONS + MESSAGES
-- ============================================================

-- Conversation 1: Elena and Marcus (about tool lending)
INSERT INTO public.conversations (id, post_id, participant_a, participant_b, last_message_at, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000002' AND title LIKE 'Full woodworking%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '25 days'
);

INSERT INTO public.messages (conversation_id, sender_id, body, read, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Hi Marcus! I saw your post about the woodworking tools. I am building raised beds for the community garden and could really use a circular saw and sander this weekend. Would that work?', TRUE, NOW() - INTERVAL '25 days'),
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Hey Elena! Absolutely, those are both available. You can pick them up Saturday morning. My garage is on Metropolitan Ave. I will DM you the address.', TRUE, NOW() - INTERVAL '25 days' + INTERVAL '2 hours'),
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Perfect! I will come by around 10am. Is there anything you need in return? I have tons of seedlings and homemade kimchi.', TRUE, NOW() - INTERVAL '24 days'),
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Oh I would love some kimchi! My wife has been craving it. See you Saturday!', TRUE, NOW() - INTERVAL '24 days' + INTERVAL '1 hour'),
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Tools returned! Everything worked perfectly. Left a big jar of kimchi and some basil on your porch. Thanks so much Marcus!', TRUE, NOW() - INTERVAL '18 days');

-- Conversation 2: Priya and Jordan (about yoga/sourdough barter)
INSERT INTO public.conversations (id, post_id, participant_a, participant_b, last_message_at, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000003' AND title LIKE 'Gentle yoga%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000003',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '22 days'
);

INSERT INTO public.messages (conversation_id, sender_id, body, read, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Hi Priya! I have been wanting to try yoga but I am a total beginner. Would you be open to trading — I bake sourdough every week and would love to swap loaves for sessions?', TRUE, NOW() - INTERVAL '22 days'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Jordan, that sounds like a dream trade! I love good bread. How about one session per week and one loaf per week? We can meet at Prospect Park on Sunday mornings.', TRUE, NOW() - INTERVAL '22 days' + INTERVAL '3 hours'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Deal! This Sunday work? I will bring the first loaf warm from the oven. Fair warning — I cannot touch my toes yet haha.', TRUE, NOW() - INTERVAL '21 days'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Haha that is totally fine, everyone starts somewhere! See you Sunday at 9am by the Long Meadow entrance. Bring a mat if you have one, otherwise I have a spare.', TRUE, NOW() - INTERVAL '21 days' + INTERVAL '1 hour'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Just finished our last session — thank you so much Priya! My back pain is gone and I can almost touch my toes now. Want to keep going next month?', TRUE, NOW() - INTERVAL '8 days');

-- Conversation 3: David and Amara (about bike loan)
INSERT INTO public.conversations (id, post_id, participant_a, participant_b, last_message_at, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000003',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000008' AND title LIKE 'Spare bicycle%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000008',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '21 days'
);

INSERT INTO public.messages (conversation_id, sender_id, body, read, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Hi David! My bike got stolen last week and I saw your post about the spare bicycle. Could I borrow it for a few weeks while I save up for a new one?', TRUE, NOW() - INTERVAL '21 days'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 'Oh no, that is terrible! Yes, absolutely. It is a medium-frame single-speed, would that work for you? You can keep it for up to a month.', TRUE, NOW() - INTERVAL '21 days' + INTERVAL '1 hour'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'That would be perfect! I am 5''8 so medium is ideal. I can also do some design work for you as a thank you — I saw you have a bike repair business?', TRUE, NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 'Actually yes! I have been wanting a proper logo. Let us do that trade! Come by my shop on E 6th St tomorrow and we can sort it all out.', TRUE, NOW() - INTERVAL '20 days' + INTERVAL '2 hours'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Returning the bike today — cleaned it up and pumped the tires. And here is your new logo! Check your email. Thanks so much David, this saved me!', TRUE, NOW() - INTERVAL '2 days');

-- Conversation 4: Sam and Marcus (about the curry)
INSERT INTO public.conversations (id, post_id, participant_a, participant_b, last_message_at, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000004',
  (SELECT id FROM public.posts WHERE author_id = 'a0000000-0000-0000-0000-000000000006' AND title LIKE 'Extra home-cooked%' LIMIT 1),
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000006',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '5 days'
);

INSERT INTO public.messages (conversation_id, sender_id, body, read, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Hey Sam! Tonkatsu curry on Monday sounds incredible. Can I reserve a portion? I am in Williamsburg but happy to swing by Rivington.', TRUE, NOW() - INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'Marcus! Of course, I always make way too much. Come by between 6-7pm Monday. I will have it packed up in a reusable container for you.', TRUE, NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Just got home and tried it — honestly one of the best curries I have ever had. The pork cutlet was SO crispy. Thank you! Let me know if you ever need any tools.', TRUE, NOW() - INTERVAL '4 days');

-- ============================================================
-- 9. TIME-DOLLAR LEDGER ENTRIES
-- ============================================================

-- Starter bonuses (5 TD each) for all 8 users
INSERT INTO public.time_dollar_ledger (user_id, amount, balance_after, description, type, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '28 days'),
  ('a0000000-0000-0000-0000-000000000002',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '26 days'),
  ('a0000000-0000-0000-0000-000000000003',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '24 days'),
  ('a0000000-0000-0000-0000-000000000004',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '22 days'),
  ('a0000000-0000-0000-0000-000000000005',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '20 days'),
  ('a0000000-0000-0000-0000-000000000006',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '18 days'),
  ('a0000000-0000-0000-0000-000000000007',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '16 days'),
  ('a0000000-0000-0000-0000-000000000008',  5.00,  5.00, 'Welcome bonus for joining Kula', 'starter_bonus', NOW() - INTERVAL '14 days');

-- Exchange 4: Sam earns 2 TD for tutoring Amara
INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004',  2.00,  7.00, 'Earned: Japanese tutoring for Amara', 'exchange', NOW() - INTERVAL '14 days'),
  ('a0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', -2.00,  3.00, 'Spent: Japanese tutoring from Sam', 'exchange', NOW() - INTERVAL '14 days');

-- Exchange 8: Marcus earns 3 TD for furniture repair for Amara
INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008',  3.00,  8.00, 'Earned: Furniture refinishing for Amara', 'exchange', NOW() - INTERVAL '10 days'),
  ('a0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000008', -3.00,  0.00, 'Spent: Furniture refinishing by Marcus', 'exchange', NOW() - INTERVAL '10 days');

-- Exchange 10: Elena earns 1 TD for composting workshop for Sam
INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000010',  1.00,  6.00, 'Earned: Composting workshop for Sam', 'exchange', NOW() - INTERVAL '10 days'),
  ('a0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000010', -1.00,  6.00, 'Spent: Composting workshop from Elena', 'exchange', NOW() - INTERVAL '10 days');
