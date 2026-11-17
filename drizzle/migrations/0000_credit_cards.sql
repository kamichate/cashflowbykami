-- Tabla de tarjetas de crédito
CREATE TABLE public.credit_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  bank text,
  closing_day integer NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color text DEFAULT 'hsl(220, 70%, 60%)',
  icon text DEFAULT '💳',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GRANTs (Data API access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_cards TO authenticated;
GRANT ALL ON public.credit_cards TO service_role;

-- RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own credit cards"
  ON public.credit_cards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Columna en pending_payments para asociar a tarjeta
ALTER TABLE public.pending_payments
  ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- Columna en movements para asociar a tarjeta  
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- Trigger updated_at
CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();