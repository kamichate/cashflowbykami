UPDATE public.categories
SET icon = CASE name
  WHEN 'Zabala Fijo' THEN '💰'
  WHEN 'Eventos' THEN '🎉'
  WHEN 'Clases' THEN '📚'
  WHEN 'Transferencias' THEN '🔄'
  WHEN 'Auto' THEN '🚗'
  WHEN 'Educación' THEN '📖'
  WHEN 'Gustitos' THEN '☕'
  WHEN 'Hogar' THEN '🏠'
  WHEN 'Mandados' THEN '🛒'
  WHEN 'Membresías' THEN '🎫'
  WHEN 'Regalos' THEN '🎁'
  WHEN 'Ropa' THEN '👕'
  WHEN 'Salidas' THEN '🍽️'
  WHEN 'Salud' THEN '💊'
  WHEN 'Transporte' THEN '🚌'
  WHEN 'Viajes' THEN '✈️'
  WHEN 'Dólares' THEN '💵'
  WHEN 'Inversión' THEN '📈'
  WHEN 'Efectivo' THEN '💸'
  ELSE '📝'
END
WHERE icon IS NULL;