ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;

CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Income categories
  INSERT INTO public.categories (user_id, name, type, icon) VALUES
    (NEW.id, 'Zabala Fijo', 'income', '💰'),
    (NEW.id, 'Eventos', 'income', '🎉'),
    (NEW.id, 'Clases', 'income', '📚'),
    (NEW.id, 'Transferencias', 'income', '🔄'),
    (NEW.id, 'Otros', 'income', '📝');
  
  -- Expense categories
  INSERT INTO public.categories (user_id, name, type, icon) VALUES
    (NEW.id, 'Auto', 'expense', '🚗'),
    (NEW.id, 'Educación', 'expense', '📖'),
    (NEW.id, 'Gustitos', 'expense', '☕'),
    (NEW.id, 'Hogar', 'expense', '🏠'),
    (NEW.id, 'Mandados', 'expense', '🛒'),
    (NEW.id, 'Membresías', 'expense', '🎫'),
    (NEW.id, 'Regalos', 'expense', '🎁'),
    (NEW.id, 'Ropa', 'expense', '👕'),
    (NEW.id, 'Salidas', 'expense', '🍽️'),
    (NEW.id, 'Salud', 'expense', '💊'),
    (NEW.id, 'Transporte', 'expense', '🚌'),
    (NEW.id, 'Viajes', 'expense', '✈️'),
    (NEW.id, 'Otros', 'expense', '📌');
  
  -- Savings categories
  INSERT INTO public.categories (user_id, name, type, icon) VALUES
    (NEW.id, 'Dólares', 'savings', '💵'),
    (NEW.id, 'Inversión', 'savings', '📈'),
    (NEW.id, 'Efectivo', 'savings', '💸');
  
  -- Create profile
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;