ALTER TABLE public.pending_payments
  ADD COLUMN IF NOT EXISTS installment_group_id uuid,
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS total_installments integer;

ALTER TABLE public.pending_income
  ADD COLUMN IF NOT EXISTS installment_group_id uuid,
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS total_installments integer;

CREATE INDEX IF NOT EXISTS pending_payments_installment_group_id_idx ON public.pending_payments (installment_group_id);
CREATE INDEX IF NOT EXISTS pending_income_installment_group_id_idx ON public.pending_income (installment_group_id);