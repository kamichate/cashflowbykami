
CREATE TABLE public.pending_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending payments"
ON public.pending_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending payments"
ON public.pending_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending payments"
ON public.pending_payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending payments"
ON public.pending_payments FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_pending_payments_updated_at
BEFORE UPDATE ON public.pending_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
