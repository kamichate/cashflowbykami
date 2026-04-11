
-- People list for reuse
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people" ON public.people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own people" ON public.people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own people" ON public.people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own people" ON public.people FOR DELETE USING (auth.uid() = user_id);

-- Shared expenses
CREATE TABLE public.shared_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movement_id UUID REFERENCES public.movements(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shared expenses" ON public.shared_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own shared expenses" ON public.shared_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shared expenses" ON public.shared_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shared expenses" ON public.shared_expenses FOR DELETE USING (auth.uid() = user_id);

-- Participants in shared expenses
CREATE TABLE public.shared_expense_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_expense_id UUID NOT NULL REFERENCES public.shared_expenses(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  amount_owed NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_expense_participants ENABLE ROW LEVEL SECURITY;

-- Participants access through shared_expenses ownership
CREATE POLICY "Users can view participants of their shared expenses"
  ON public.shared_expense_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shared_expenses se WHERE se.id = shared_expense_id AND se.user_id = auth.uid()));

CREATE POLICY "Users can create participants for their shared expenses"
  ON public.shared_expense_participants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shared_expenses se WHERE se.id = shared_expense_id AND se.user_id = auth.uid()));

CREATE POLICY "Users can update participants of their shared expenses"
  ON public.shared_expense_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.shared_expenses se WHERE se.id = shared_expense_id AND se.user_id = auth.uid()));

CREATE POLICY "Users can delete participants of their shared expenses"
  ON public.shared_expense_participants FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.shared_expenses se WHERE se.id = shared_expense_id AND se.user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_shared_expenses_updated_at
  BEFORE UPDATE ON public.shared_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shared_expense_participants_updated_at
  BEFORE UPDATE ON public.shared_expense_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
