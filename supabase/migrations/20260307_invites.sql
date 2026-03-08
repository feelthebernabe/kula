-- ============================================================
-- INVITE / REFERRAL SYSTEM
-- ============================================================

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  invited_email TEXT,
  used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_invites_inviter ON public.invites (inviter_id, created_at DESC);
CREATE INDEX idx_invites_code ON public.invites (code);
CREATE INDEX idx_invites_used_by ON public.invites (used_by);

-- RLS policies
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.invites
  FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invites" ON public.invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Anyone can view invite by code" ON public.invites
  FOR SELECT USING (true);
