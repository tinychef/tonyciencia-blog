---
name: ecommerce-manager
description: Procedimientos del E-commerce Manager de Market Tony (workers/market) — publicar un repositorio como producto, editar fichas y precios (fijo, oferta, paga lo que quieras, gratis), portadas, SEO/JSON-LD, feed de Google Merchant, cupones, auditoría del catálogo y despliegue. Úsala para cualquier cambio del catálogo o de la vitrina del market.
---

# E-commerce Manager — Market Tony

Todo desde `workers/market/` (usa `pnpm wrangler …`, nunca `wrangler` a secas). Estándar de fichas:
[references/estandar-fichas.md](references/estandar-fichas.md). Mapa del código: `HANDOFF.md`, `docs/PLAN-MARKET-V2.md`.

## 0. Diagnóstico (siempre primero)

```bash
cd workers/market && pnpm install --frozen-lockfile
node scripts/audit-catalog.mjs                 # producción: fichas, JSON-LD, feed, sitemap, imágenes
node ../../scripts/audit-site.mjs              # sitio entero: 404 y recursos rotos (blog + market)
curl -s https://tonyciencia.com/market/estado.json   # productos, precios, archivo y cupón activo
```

## 1. Dónde vive cada dato

| Dato | Dónde se cambia |
|---|---|
| Producto puntual (texto, precio, imágenes, archivo, activo) | `/market/admin` (lo hace el dueño o tú si te da acceso) |
| Cambios versionados del catálogo | `seed/catalog-v3.json` (o un `catalog-vN.json` nuevo) → script generador → `migrations/000N_*.sql` |
| Precio fijo / oferta | `price_cents` + `compare_at_cents` (precio anterior REAL, mayor al actual) |
| Paga lo que quieras | `price_mode='pwyw'`, `price_cents` = sugerido, `min_price_cents` (0 = gratis posible), `max_price_cents` (NULL = 999,999.99) |
| Portadas | `design/<slug>.html` (frames 1600×1000) → `pnpm render:covers <slug>` → `public/market/static/products/<slug>/` |
| Archivo entregable | `provision/packages.json` → `node scripts/build-product-zip.mjs <slug>` → PUT con hash fijado |
| Categorías | `src/lib/catalog.ts` → `CATEGORIES` |
| Logos «Funciona con» / «Incluye» (N en 1) | columna `compat` (admin o migración); claves en `src/lib/brands.ts` (Simple Icons CC0; marcas sin logo permitido van como texto) |
| Enlaces al catálogo con filtros | siempre `/market/?…` (con barra): `/market?…` no llega al Worker en producción |
| Cupón de bienvenida | `wrangler.jsonc` → `WELCOME_COUPON`, `WELCOME_COUPON_PERCENT`, `WELCOME_COUPON_AUTOCREATE` (el cron lo crea en Stripe) |

Migraciones: solo agregan o actualizan con guardas (`WHERE … = valor_anterior`, `ON CONFLICT DO NOTHING`, "solo si sigue
Próximamente"). Nunca `DELETE` de productos con pedidos: para retirar uno, `active = 0`.

## 2. Publicar un repositorio como producto

1. **Leer el repo completo** (README, SKILL.md, scripts, licencia, CHANGELOG). Escribir un brief: qué hace de verdad,
   requisitos, salidas, limitaciones, licencia, riesgos.
2. **Bloqueos de venta** (si hay uno, el producto entra como "Próximamente" y se le reporta al dueño):
   secretos o datos personales en archivos versionados · material de clientes · instalación imposible para un
   comprador (rutas fijas, repo privado sin alternativa) · licencia inexistente o de plantilla · marcas ajenas en el
   nombre · funciones que falsifican procedencia o quitan marcas de IA.
3. **Ficha** según el estándar (título, tagline, descripción, 4–6 beneficios, ficha técnica, FAQ, SEO, ALT).
4. **Portadas**: `design/<slug>.html` con portada + 2 pantallas; usa salidas reales del producto si existen. Mira cada
   imagen renderizada antes de seguir.
5. **Datos**: agrega el producto al JSON de catálogo con `availability_before_file: "coming_soon"` y genera la migración.
6. **ZIP**: en el repo del producto, corrige instalación/licencia en la rama de trabajo y empuja; luego agrega la
   entrada en `provision/packages.json` y corre `node scripts/build-product-zip.mjs <slug>`. Revisa el ZIP
   (`unzip -l`, busca correos/claves). El ZIP queda en `.wrangler/products/` (fuera de git).
7. **Pruebas + PR + merge** (sección 5). Después del deploy, sube el archivo:
   `curl -X PUT --data-binary @.wrangler/products/<archivo>.zip -H 'content-type: application/zip' https://tonyciencia.com/market/provision/<slug>`
   → el producto pasa solo a "Disponible".
8. **Verificar** en producción (sección 6).

## 3. Precios y ofertas

- **Lanzamiento (regla dura, 2026-11-01)**: producto nuevo = precio fijo > USD 77 (`price_cents` ≥ 7701, por ejemplo
  7790), `compare_at_cents = NULL`. Anota la fecha de lanzamiento en el resumen del PR. Pasados 30 días seguidos a ese
  precio (sin bajarlo, ni con cupón general), la oferta usa ese precio como `compare_at_cents`. Antes de 30 días, o si
  el precio bajó en ese tiempo, no hay tachado. Fuente: el «precio anterior» de la UE es el más bajo de los 30 días
  previos (Directiva 98/6/CE, art. 6 bis) y Google exige que el precio original se haya cobrado.

- Oferta: `compare_at_cents` = precio anterior real; la tienda calcula el % y el ahorro, muestra OFERTA, el tachado
  en tarjeta, ficha, barra móvil y checkout de Stripe, y publica `sale_price` en el feed y `StrikethroughPrice` en el
  JSON-LD. Sin precio anterior real, no hay oferta.
- Paga lo que quieras: el feed de Merchant excluye los que empiezan en $0 (Google no acepta precio 0); si el mínimo es
  ≥ $0.50, el feed usa el mínimo. Los cupones no se combinan con este modo.
- Cambiar un precio en producción: admin, o migración con guarda `WHERE slug = … AND price_cents = <precio actual>`.

## 4. SEO y Google Merchant

- Meta título ≤ 60, meta descripción 120–160, H1 = título comercial, canonical `/market/producto/<slug>`.
- JSON-LD: Product + Offer (+ BreadcrumbList + FAQPage) los genera `src/services/seo.ts`.
- Feeds: `https://tonyciencia.com/market/feed.xml` (español) y `https://tonyciencia.com/market/en/feed.xml` (inglés,
  solo fichas con versión EN, enlaces `/market/en/product/…`). Merchant Center → Productos → Fuentes → archivo en sitio
  web, actualización diaria, uno por idioma. Categoría 313 (Software > Computer Software), envío 0, precios en USD.
  Sitemap: `https://tonyciencia.com/market/sitemap.xml` (Search Console y `robots.txt`).
- Imagen del feed: `products/<slug>/merchant.jpg` (1500×1500, sin texto promocional; las portadas no sirven). Al
  crear una (o `merchant-2.jpg`), agrégala a `MERCHANT_IMAGES` en `src/lib/catalog.ts`; `test/merchant.test.ts`
  comprueba que exista. Sin ella, el feed usa la portada y la auditoría avisa.
- JSON-LD de cada Offer comprable: `shippingDetails` (0 USD, US, 0 días) y `hasMerchantReturnPolicy` (14 días, sin
  costo), según `/market/legal/reembolsos`. Si cambia la política, cambia `RETURN_POLICY_JSONLD` en `src/services/seo.ts`.
- Google limita algunos productos digitales en anuncios de Shopping; las fichas gratuitas sí los aceptan.

## 5. Probar y desplegar

```bash
pnpm typecheck && pnpm test && pnpm test:migration && node scripts/check-deploy.mjs production
pnpm setup:local && pnpm dev     # y mira /market en 1440 px y 390 px (sin scroll horizontal)
node scripts/audit-catalog.mjs http://localhost:8787
```

Rama de trabajo → PR a `main` con resumen y capturas → merge → `.github/workflows/market-deploy.yml` corre pruebas,
migraciones y deploy. Vuelta atrás: revertir el merge o `pnpm wrangler rollback --env production`.

## 6. Verificar en producción

```bash
curl -s https://tonyciencia.com/market/estado.json
node scripts/audit-catalog.mjs          # 0 errores
```

Revisa además la ficha en celular, el precio y el tachado, el botón de compra y que el feed liste el producto.

## 7. Revisión periódica (semanal)

Corre la auditoría, compara con la semana anterior, corrige lo que falle (imágenes rotas, metadatos largos, fichas
cortas, productos "Próximamente" que ya tienen archivo) y abre un PR con el informe. Sugiere al dueño mejoras de
negocio (precios, bundles, nuevos productos) sin aplicarlas solo.
