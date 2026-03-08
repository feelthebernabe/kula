-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

-- ============================================================
-- COMMUNITIES
-- ============================================================
CREATE POLICY "Communities are viewable by authenticated users"
  ON public.communities FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- COMMUNITY MEMBERS
-- ============================================================
CREATE POLICY "Community memberships are viewable by authenticated users"
  ON public.community_members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- POSTS
-- ============================================================
CREATE POLICY "Active posts are viewable by community members"
  ON public.posts FOR SELECT TO authenticated
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Community members can create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = author_id
    AND community_id IN (
      SELECT community_id FROM public.community_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors can delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

-- ============================================================
-- EXCHANGE AGREEMENTS
-- ============================================================
CREATE POLICY "Exchange participants can view their agreements"
  ON public.exchange_agreements FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = provider_id OR (SELECT auth.uid()) = receiver_id
  );

CREATE POLICY "Authenticated users can propose exchanges"
  ON public.exchange_agreements FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = provider_id OR (SELECT auth.uid()) = receiver_id
  );

CREATE POLICY "Exchange participants can update agreements"
  ON public.exchange_agreements FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = provider_id OR (SELECT auth.uid()) = receiver_id
  );

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE POLICY "Reviews are viewable by authenticated users"
  ON public.reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Exchange participants can write reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = author_id
    AND exchange_id IN (
      SELECT id FROM public.exchange_agreements
      WHERE status = 'completed'
        AND (provider_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()))
    )
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = participant_a OR (SELECT auth.uid()) = participant_b
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = participant_a OR (SELECT auth.uid()) = participant_b
  );

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_a = (SELECT auth.uid()) OR participant_b = (SELECT auth.uid())
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_a = (SELECT auth.uid()) OR participant_b = (SELECT auth.uid())
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    sender_id != (SELECT auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_a = (SELECT auth.uid()) OR participant_b = (SELECT auth.uid())
    )
  );

-- ============================================================
-- DISCUSSION THREADS
-- ============================================================
CREATE POLICY "Threads viewable by community members"
  ON public.discussion_threads FOR SELECT TO authenticated
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Community members can create threads"
  ON public.discussion_threads FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = author_id
    AND community_id IN (
      SELECT community_id FROM public.community_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- DISCUSSION REPLIES
-- ============================================================
CREATE POLICY "Replies viewable by community members"
  ON public.discussion_replies FOR SELECT TO authenticated
  USING (
    thread_id IN (
      SELECT dt.id FROM public.discussion_threads dt
      JOIN public.community_members cm ON cm.community_id = dt.community_id
      WHERE cm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Community members can reply"
  ON public.discussion_replies FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = author_id
    AND thread_id IN (
      SELECT dt.id FROM public.discussion_threads dt
      JOIN public.community_members cm ON cm.community_id = dt.community_id
      WHERE cm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = recipient_id);

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = recipient_id);
