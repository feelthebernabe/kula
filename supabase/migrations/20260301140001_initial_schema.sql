-- ============================================================
-- KULA MVP DATABASE SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search / fuzzy matching

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE post_type AS ENUM ('offer', 'request');
CREATE TYPE exchange_mode AS ENUM ('gift', 'loan', 'time_dollar', 'barter', 'flexible');
CREATE TYPE post_status AS ENUM ('active', 'fulfilled', 'expired', 'closed');
CREATE TYPE exchange_status AS ENUM ('proposed', 'accepted', 'in_progress', 'completed', 'disputed', 'cancelled');
CREATE TYPE community_type AS ENUM ('geographic', 'affinity');
CREATE TYPE notification_type AS ENUM (
  'new_message', 'exchange_proposed', 'exchange_accepted',
  'exchange_completed', 'review_received', 'post_response',
  'discussion_reply', 'community_announcement'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 50),
  bio TEXT CHECK (char_length(bio) <= 500),
  avatar_url TEXT,
  phone TEXT,
  primary_location TEXT,
  skills TEXT[] DEFAULT '{}',
  offers_list TEXT[] DEFAULT '{}',
  needs_list TEXT[] DEFAULT '{}',
  verified BOOLEAN DEFAULT FALSE,
  trust_score NUMERIC(5,2) DEFAULT 30.00 CHECK (trust_score >= 0 AND trust_score <= 100),
  total_exchanges INTEGER DEFAULT 0,
  total_given INTEGER DEFAULT 0,
  total_received INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_display_name ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX idx_profiles_trust_score ON public.profiles (trust_score DESC);
CREATE INDEX idx_profiles_last_active ON public.profiles (last_active DESC);

-- ============================================================
-- COMMUNITIES
-- ============================================================
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  type community_type NOT NULL DEFAULT 'geographic',
  description TEXT CHECK (char_length(description) <= 2000),
  location TEXT,
  member_count INTEGER DEFAULT 0,
  moderators UUID[] DEFAULT '{}',
  settings JSONB DEFAULT '{"allow_posts": true, "require_approval": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNITY MEMBERSHIPS
-- ============================================================
CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX idx_community_members_user ON public.community_members (user_id);
CREATE INDEX idx_community_members_community ON public.community_members (community_id);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type post_type NOT NULL,
  exchange_modes exchange_mode[] NOT NULL CHECK (array_length(exchange_modes, 1) >= 1),
  category TEXT NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 120),
  body TEXT CHECK (char_length(body) <= 5000),
  images TEXT[] DEFAULT '{}',
  loan_duration TEXT, -- e.g., "1 week", "3 days"
  time_dollar_amount NUMERIC(10,2),
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  status post_status DEFAULT 'active',
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_posts_author ON public.posts (author_id);
CREATE INDEX idx_posts_community ON public.posts (community_id);
CREATE INDEX idx_posts_status ON public.posts (status);
CREATE INDEX idx_posts_type ON public.posts (type);
CREATE INDEX idx_posts_category ON public.posts (category);
CREATE INDEX idx_posts_created ON public.posts (created_at DESC);
CREATE INDEX idx_posts_feed ON public.posts (community_id, status, created_at DESC)
  WHERE status = 'active';
CREATE INDEX idx_posts_title_search ON public.posts USING gin (title gin_trgm_ops);

-- ============================================================
-- EXCHANGE AGREEMENTS
-- ============================================================
CREATE TABLE public.exchange_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  exchange_mode exchange_mode NOT NULL,
  terms TEXT CHECK (char_length(terms) <= 2000),
  time_dollar_amount NUMERIC(10,2),
  loan_return_date TIMESTAMPTZ,
  status exchange_status DEFAULT 'proposed',
  provider_confirmed BOOLEAN DEFAULT FALSE,
  receiver_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT different_parties CHECK (provider_id != receiver_id)
);

CREATE INDEX idx_exchanges_post ON public.exchange_agreements (post_id);
CREATE INDEX idx_exchanges_provider ON public.exchange_agreements (provider_id);
CREATE INDEX idx_exchanges_receiver ON public.exchange_agreements (receiver_id);
CREATE INDEX idx_exchanges_status ON public.exchange_agreements (status);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES public.exchange_agreements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  subject_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL CHECK (char_length(body) >= 20 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_review_per_exchange_per_author UNIQUE(exchange_id, author_id),
  CONSTRAINT no_self_review CHECK (author_id != subject_id)
);

CREATE INDEX idx_reviews_subject ON public.reviews (subject_id);
CREATE INDEX idx_reviews_exchange ON public.reviews (exchange_id);
CREATE INDEX idx_reviews_author ON public.reviews (author_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  exchange_agreement_id UUID REFERENCES public.exchange_agreements(id) ON DELETE SET NULL,
  participant_a UUID NOT NULL REFERENCES public.profiles(id),
  participant_b UUID NOT NULL REFERENCES public.profiles(id),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_participants CHECK (participant_a != participant_b)
);

CREATE INDEX idx_conversations_participant_a ON public.conversations (participant_a, last_message_at DESC);
CREATE INDEX idx_conversations_participant_b ON public.conversations (participant_b, last_message_at DESC);
CREATE INDEX idx_conversations_post ON public.conversations (post_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 5000),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at ASC);
CREATE INDEX idx_messages_unread ON public.messages (conversation_id, read) WHERE read = FALSE;

-- ============================================================
-- DISCUSSION THREADS
-- ============================================================
CREATE TABLE public.discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  body TEXT NOT NULL CHECK (char_length(body) >= 10 AND char_length(body) <= 10000),
  pinned BOOLEAN DEFAULT FALSE,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_community ON public.discussion_threads (community_id, pinned DESC, last_reply_at DESC);
CREATE INDEX idx_threads_author ON public.discussion_threads (author_id);

-- ============================================================
-- DISCUSSION REPLIES
-- ============================================================
CREATE TABLE public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_thread ON public.discussion_replies (thread_id, created_at ASC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON public.notifications (recipient_id, read, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (recipient_id, created_at DESC) WHERE read = FALSE;
