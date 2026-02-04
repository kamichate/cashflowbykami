-- Add is_withdrawal column to movements table for savings withdrawals
ALTER TABLE public.movements 
ADD COLUMN is_withdrawal boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.movements.is_withdrawal IS 'When true for savings type, indicates money withdrawn from savings back to available balance';