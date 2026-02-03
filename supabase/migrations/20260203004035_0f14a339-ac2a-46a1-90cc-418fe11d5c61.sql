-- Create enum for movement types
CREATE TYPE public.movement_type AS ENUM ('income', 'expense', 'savings');

-- Create categories table (editable by user)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type movement_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Create movements table
CREATE TABLE public.movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type movement_type NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  detail TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user settings
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.categories FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for movements
CREATE POLICY "Users can view their own movements"
ON public.movements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own movements"
ON public.movements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movements"
ON public.movements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movements"
ON public.movements FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_movements_updated_at
BEFORE UPDATE ON public.movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Income categories
  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Zabala Fijo', 'income'),
    (NEW.id, 'Eventos', 'income'),
    (NEW.id, 'Clases', 'income'),
    (NEW.id, 'Transferencias', 'income'),
    (NEW.id, 'Otros', 'income');
  
  -- Expense categories
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
  
  -- Savings categories
  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Dólares', 'savings'),
    (NEW.id, 'Inversión', 'savings'),
    (NEW.id, 'Efectivo', 'savings');
  
  -- Create profile
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default categories when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories();