-- Harden create_default_categories with explicit user id check
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'Invalid user ID';
  END IF;

  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Zabala Fijo', 'income'),
    (NEW.id, 'Eventos', 'income'),
    (NEW.id, 'Clases', 'income'),
    (NEW.id, 'Transferencias', 'income'),
    (NEW.id, 'Otros', 'income');

  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Auto', 'expense'),
    (NEW.id, 'Educación', 'expense'),
    (NEW.id, 'Gustitos', 'expense'),
    (NEW.id, 'Hogar', 'expense'),
    (NEW.id, 'Mandados', 'expense'),
    (NEW.id, 'Membresías', 'expense'),
    (NEW.id, 'Regalos', 'expense'),
    (NEW.id, 'Ropa', 'expense'),
    (NEW.id, 'Salidas', 'expense'),
    (NEW.id, 'Salud', 'expense'),
    (NEW.id, 'Transporte', 'expense'),
    (NEW.id, 'Viajes', 'expense'),
    (NEW.id, 'Otros', 'expense');

  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Dólares', 'savings'),
    (NEW.id, 'Inversión', 'savings'),
    (NEW.id, 'Efectivo', 'savings');

  INSERT INTO public.profiles (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

-- Add CHECK constraints for financial amounts and text length
ALTER TABLE public.movements
  ADD CONSTRAINT movements_amount_non_negative CHECK (amount >= 0),
  ADD CONSTRAINT movements_detail_length CHECK (detail IS NULL OR char_length(detail) <= 500);

ALTER TABLE public.pending_payments
  ADD CONSTRAINT pending_payments_amount_non_negative CHECK (amount >= 0),
  ADD CONSTRAINT pending_payments_description_length CHECK (char_length(description) >= 1 AND char_length(description) <= 500);

ALTER TABLE public.shared_expenses
  ADD CONSTRAINT shared_expenses_total_amount_non_negative CHECK (total_amount >= 0),
  ADD CONSTRAINT shared_expenses_description_length CHECK (description IS NULL OR char_length(description) <= 500);

ALTER TABLE public.shared_expense_participants
  ADD CONSTRAINT sep_amount_owed_non_negative CHECK (amount_owed >= 0),
  ADD CONSTRAINT sep_amount_paid_non_negative CHECK (amount_paid >= 0),
  ADD CONSTRAINT sep_person_name_length CHECK (char_length(person_name) >= 1 AND char_length(person_name) <= 200);