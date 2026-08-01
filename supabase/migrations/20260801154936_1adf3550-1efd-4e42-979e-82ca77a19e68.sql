-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  monthly_budget NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_user ON public.categories(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.categories FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- BANK ACCOUNTS
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'bank',
  source_app TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_accounts_user ON public.bank_accounts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_bank_accounts BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CARD ACCOUNTS
CREATE TABLE public.card_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT '',
  last4 TEXT,
  billing_date INT NOT NULL DEFAULT 1,
  due_date INT NOT NULL DEFAULT 15,
  credit_limit NUMERIC(14,2),
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_accounts_user ON public.card_accounts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_accounts TO authenticated;
GRANT ALL ON public.card_accounts TO service_role;
ALTER TABLE public.card_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards" ON public.card_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_card_accounts BEFORE UPDATE ON public.card_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  linked_type TEXT NOT NULL DEFAULT 'account',
  linked_id UUID,
  amount NUMERIC(14,2) NOT NULL,
  direction TEXT NOT NULL DEFAULT 'debit',
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  merchant TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_txn_user_date ON public.transactions(user_id, txn_date DESC);
CREATE INDEX idx_txn_linked ON public.transactions(linked_type, linked_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_transactions BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- EMIS
CREATE TABLE public.emis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  linked_type TEXT NOT NULL DEFAULT 'card',
  linked_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  monthly_amount NUMERIC(14,2) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  total_installments INT NOT NULL DEFAULT 1,
  installments_paid INT NOT NULL DEFAULT 0,
  is_regular_payment BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_emis_user ON public.emis(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emis TO authenticated;
GRANT ALL ON public.emis TO service_role;
ALTER TABLE public.emis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emis" ON public.emis FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_emis BEFORE UPDATE ON public.emis FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RECURRING
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  linked_type TEXT NOT NULL DEFAULT 'account',
  linked_id UUID,
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  direction TEXT NOT NULL DEFAULT 'debit',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  next_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recurring_user ON public.recurring_transactions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;
GRANT ALL ON public.recurring_transactions TO service_role;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recurring" ON public.recurring_transactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_recurring BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- QUICK ENTRY TEMPLATES
CREATE TABLE public.quick_entry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  linked_type TEXT NOT NULL DEFAULT 'account',
  linked_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  direction TEXT NOT NULL DEFAULT 'debit',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_templates_user ON public.quick_entry_templates(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_entry_templates TO authenticated;
GRANT ALL ON public.quick_entry_templates TO service_role;
ALTER TABLE public.quick_entry_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own templates" ON public.quick_entry_templates FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER t_templates BEFORE UPDATE ON public.quick_entry_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- BALANCE ANCHORS
CREATE TABLE public.balance_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  balance_amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_anchors_account ON public.balance_anchors(account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.balance_anchors TO authenticated;
GRANT ALL ON public.balance_anchors TO service_role;
ALTER TABLE public.balance_anchors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own anchors" ON public.balance_anchors FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- BILLING CYCLES
CREATE TABLE public.billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.card_accounts(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cycles_card ON public.billing_cycles(card_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_cycles TO authenticated;
GRANT ALL ON public.billing_cycles TO service_role;
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycles" ON public.billing_cycles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- signup bootstrap: profile + default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.categories (user_id, name, icon)
  SELECT NEW.id, c.name, c.icon FROM (VALUES
    ('Food & Dining','utensils'),
    ('Groceries','shopping-basket'),
    ('Transport','car'),
    ('Shopping','shopping-bag'),
    ('Bills & Utilities','receipt'),
    ('Rent','home'),
    ('Health','heart-pulse'),
    ('Entertainment','clapperboard'),
    ('Education','graduation-cap'),
    ('Salary','wallet'),
    ('Investments','trending-up'),
    ('Transfer','arrow-left-right'),
    ('Other','circle-ellipsis')
  ) AS c(name, icon);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- realtime
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.card_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.emis REPLICA IDENTITY FULL;
ALTER TABLE public.recurring_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.quick_entry_templates REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions, public.bank_accounts, public.card_accounts, public.categories, public.emis, public.recurring_transactions, public.quick_entry_templates, public.profiles;