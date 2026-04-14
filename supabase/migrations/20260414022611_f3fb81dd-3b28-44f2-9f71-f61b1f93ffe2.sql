-- Add new values to movement_type enum
ALTER TYPE public.movement_type ADD VALUE IF NOT EXISTS 'transfer';
ALTER TYPE public.movement_type ADD VALUE IF NOT EXISTS 'yield';

-- Add personal_amount column to movements (user's share for shared expenses)
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS personal_amount numeric DEFAULT NULL;