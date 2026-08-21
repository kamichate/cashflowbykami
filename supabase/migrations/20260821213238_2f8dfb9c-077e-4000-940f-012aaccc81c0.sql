CREATE OR REPLACE FUNCTION public.create_default_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;