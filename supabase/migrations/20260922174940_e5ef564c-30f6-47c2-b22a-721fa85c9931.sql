ALTER TABLE public.savings_goals
  ADD COLUMN currency text NOT NULL DEFAULT 'ARS';

ALTER TABLE public.savings_goals
  ADD CONSTRAINT savings_goals_currency_check CHECK (currency IN ('ARS', 'USD'));