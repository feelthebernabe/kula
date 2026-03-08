-- ============================================================
-- TIME-DOLLAR LEDGER (Double-entry accounting)
-- ============================================================

CREATE TABLE public.time_dollar_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exchange_id UUID REFERENCES public.exchange_agreements(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL CHECK (char_length(description) >= 1 AND char_length(description) <= 500),
  type TEXT NOT NULL DEFAULT 'exchange' CHECK (type IN ('exchange', 'starter_bonus', 'adjustment')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_user ON public.time_dollar_ledger (user_id, created_at DESC);
CREATE INDEX idx_ledger_exchange ON public.time_dollar_ledger (exchange_id);

-- RLS policies
ALTER TABLE public.time_dollar_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger" ON public.time_dollar_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view other users ledger" ON public.time_dollar_ledger
  FOR SELECT USING (true);

-- ============================================================
-- AUTO-CREATE LEDGER ENTRIES WHEN TIME-DOLLAR EXCHANGE COMPLETES
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_time_dollar_completion()
RETURNS TRIGGER AS $$
DECLARE
  provider_balance NUMERIC;
  receiver_balance NUMERIC;
  td_amount NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed'
     AND NEW.exchange_mode = 'time_dollar'
     AND NEW.time_dollar_amount IS NOT NULL
     AND NEW.time_dollar_amount > 0 THEN

    td_amount := NEW.time_dollar_amount;

    SELECT COALESCE(
      (SELECT balance_after FROM public.time_dollar_ledger
       WHERE user_id = NEW.provider_id ORDER BY created_at DESC LIMIT 1),
      0
    ) INTO provider_balance;

    SELECT COALESCE(
      (SELECT balance_after FROM public.time_dollar_ledger
       WHERE user_id = NEW.receiver_id ORDER BY created_at DESC LIMIT 1),
      0
    ) INTO receiver_balance;

    -- Credit to provider (earned time dollars)
    INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type)
    VALUES (
      NEW.provider_id, NEW.id, td_amount,
      provider_balance + td_amount,
      'Earned ' || td_amount || ' TD for service provided',
      'exchange'
    );

    -- Debit from receiver (spent time dollars)
    INSERT INTO public.time_dollar_ledger (user_id, exchange_id, amount, balance_after, description, type)
    VALUES (
      NEW.receiver_id, NEW.id, -td_amount,
      receiver_balance - td_amount,
      'Spent ' || td_amount || ' TD for service received',
      'exchange'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_time_dollar_exchange_completed
  AFTER UPDATE OF status ON public.exchange_agreements
  FOR EACH ROW EXECUTE FUNCTION public.handle_time_dollar_completion();
