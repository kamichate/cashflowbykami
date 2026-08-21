ALTER TABLE public.movements ADD COLUMN notes text;
ALTER TABLE public.movements ADD CONSTRAINT movements_notes_length CHECK (notes IS NULL OR char_length(notes) <= 500);