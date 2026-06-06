CREATE TABLE public.pending_income (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  due_date date NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_collected boolean NOT NULL DEFAULT false,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_income TO authenticated;
GRANT ALL ON public.pending_income TO service_role;

ALTER TABLE public.pending_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending income"
  ON public.pending_income FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending income"
  ON public.pending_income FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending income"
  ON public.pending_income FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending income"
  ON public.pending_income FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_pending_income_updated_at
  BEFORE UPDATE ON public.pending_income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();