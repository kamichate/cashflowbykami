ALTER TABLE public.shared_expenses
  ADD COLUMN IF NOT EXISTS paid_by_third_party boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS third_party_name text;