-- Add columns for initial savings and multi-currency support
ALTER TABLE public.movements 
ADD COLUMN is_initial_savings boolean NOT NULL DEFAULT false,
ADD COLUMN currency text NOT NULL DEFAULT 'ARS',
ADD COLUMN exchange_rate numeric DEFAULT NULL,
ADD COLUMN original_amount numeric DEFAULT NULL;

-- Add constraint to validate currency values
ALTER TABLE public.movements 
ADD CONSTRAINT movements_currency_check CHECK (currency IN ('ARS', 'USD'));

-- Comment for clarity
COMMENT ON COLUMN public.movements.is_initial_savings IS 'True if this is pre-existing savings that should not affect current income';
COMMENT ON COLUMN public.movements.currency IS 'Currency of the movement (ARS or USD)';
COMMENT ON COLUMN public.movements.exchange_rate IS 'Exchange rate used for USD to ARS conversion';
COMMENT ON COLUMN public.movements.original_amount IS 'Original amount in foreign currency before conversion';