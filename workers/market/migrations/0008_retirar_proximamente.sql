-- El dueño pidió el 2026-11-01 retirar de la tienda los productos «Próximamente» que no tienen archivo.
-- No se borran (se conservan su ficha y su lista de espera): solo se desactivan. Sus URLs redirigen al catálogo.
-- La guarda (coming_soon y sin archivo) evita tocar un producto que ya se haya lanzado.
UPDATE products SET active = 0, updated_at = 1793577600000
WHERE slug IN ('kit-n8n-agentes-ia', 'carruseles-infinitos') AND availability = 'coming_soon' AND file_key IS NULL;
