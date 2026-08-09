ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS spend_limit numeric;
ALTER TABLE public.card_accounts ADD COLUMN IF NOT EXISTS spend_limit numeric;

ALTER TABLE public.balance_anchors DROP CONSTRAINT IF EXISTS balance_anchors_account_id_fkey;
ALTER TABLE public.balance_anchors ADD COLUMN IF NOT EXISTS linked_type text NOT NULL DEFAULT 'account';

CREATE TABLE IF NOT EXISTS public.ledger_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_type text NOT NULL DEFAULT 'account',
  linked_id uuid NOT NULL,
  label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL DEFAULT CURRENT_DATE,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  total_debit numeric NOT NULL DEFAULT 0,
  spend_limit numeric,
  entry_count integer NOT NULL DEFAULT 0,
  csv_data text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_periods TO authenticated;
GRANT ALL ON public.ledger_periods TO service_role;

ALTER TABLE public.ledger_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own periods" ON public.ledger_periods FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin all periods" ON public.ledger_periods FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER t_ledger_periods BEFORE UPDATE ON public.ledger_periods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS ledger_periods_owner_idx ON public.ledger_periods (user_id, linked_id, period_end DESC);