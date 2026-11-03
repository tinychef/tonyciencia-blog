# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Al empezar una sesión
- Lee `docs/PENDIENTES-DUENO.md` y recuérdale al dueño, en pocas líneas y en español, lo que siga pendiente de su parte.

## Comandos esenciales

```bash
# Desarrollo
pnpm dev                  # Servidor local en localhost:4321 (admin en /_emdash/admin)
pnpm bootstrap            # Primera vez: init DB + seed (requiere bindings CF configurados)
pnpm seed                 # Re-aplicar seed sin reinicializar

# Build y deploy
pnpm build                # Compilar → ./dist
pnpm preview              # Previsualizar build localmente
pnpm deploy               # build + wrangler deploy → Cloudflare Workers

# Calidad
pnpm typecheck            # astro check (TypeScript + .astro)

# EmDash CLI (via npx)
npx emdash types          # Regenerar tipos TypeScript desde el schema
npx emdash seed seed/seed.json --validate  # Validar seed sin aplicar
```

## Arquitectura

**Stack:** Astro 7 (output: server) + EmDash 0.23.0 CMS + Cloudflare Workers
**Node:** 22.x (fijado en `.node-version`, igual que CI). No usar el Node "system" si es una versión mucho más nueva — provocó fallos de compilación nativa de `better-sqlite3` con toolchains de Visual Studio recientes.

### Capa de contenido (EmDash) — NO depende de un JSON único
- Cada post vive en su propio archivo: `content/posts/es/<slug>.json` y `content/posts/en/<slug>.json`
- `scripts/build-seed.mjs` ensambla `seed/base/*.json` + `content/posts/**/*.json` → `seed/seed.json` (artefacto de *bootstrap*, versionado, pero NO la fuente de verdad en runtime)
- La fuente de verdad en runtime es **D1**, accedida solo vía `emdash:content` API — nunca query directo a D1
- `emdash seed` aplica el JSON a D1 de forma idempotente (`onConflict: "skip"`) — no pisa contenido ya editado directamente en el Admin UI
- Pipeline real de publicación: n8n escribe un JSON por post vía PR a GitHub → `seed-validate.yml`/`deploy.yml` reconstruyen `seed/seed.json` → deploy. El Admin UI de EmDash también puede escribir directo a D1, sin pasar por el JSON
- Colecciones activas: `posts`, `pages`, `legal` (ver `seed/seed.json` para schema completo)
- `entry.id` = slug (para URLs). `entry.data.id` = ULID de la DB (para `getEntryTerms` y otras llamadas API)
- Siempre llamar `Astro.cache.set(cacheHint)` en páginas que consultan contenido
- Taxonomías en queries deben coincidir exactamente con el campo `"name"` del seed (`"category"`, `"tag"`)
- `emdash-env.d.ts` → tipos auto-generados; se regeneran al iniciar el dev server
- **Nota de escalabilidad:** si el catálogo crece a cientos/miles de posts, revisar el costo de reconstruir `seed/seed.json` completo en cada PR y el bulk insert vía `emdash seed` — no es un problema hoy (28 posts, ~490KB) pero puede serlo a mayor escala

### Routing de páginas
- Todas las páginas son server-rendered — nunca usar `getStaticPaths()` para contenido CMS
- Patrón de página: `src/pages/[slug].astro` importa `src/components/pages/[Nombre]Page.astro` y lo renderiza sin props (el componente hace el fetch internamente)
- `src/pages/en/` espeja `src/pages/` para inglés — las páginas en inglés se crean manualmente
- Rutas dinámicas: `/posts/[slug]`, `/category/[slug]`, `/tag/[slug]`, `/pages/[slug]`, `/legal/[slug]`
- `src/worker.ts` → entry point del Worker (boilerplate — no modificar)
- `src/live.config.ts` → registro de loaders EmDash (boilerplate — no modificar)

### Internacionalización
- Default: español (`es`) sin prefijo de ruta
- Inglés: rutas prefijadas `/en/`
- Helpers en `src/i18n/locales.ts`: `getLangFromUrl()`, `useTranslations()`, `getLocalePath()`
- Claves de traducción definidas en `src/i18n/es.ts` (fuente de verdad) + `src/i18n/en.ts`
- El campo `translation_of` en Posts vincula traducciones por slug

### Estilos — Retro Pixel Design System
- **CSS vanilla con variables** — `src/layouts/Base.astro` define un reset/tokens base dentro de `@layer base` (baja prioridad a propósito); `src/styles/theme.css` NO está en ninguna capa (`@layer`), por lo que sus tokens **siempre ganan** sobre los de Base.astro sin importar el orden de origen — así es como el ámbar de marca (`theme.css`) sustituye limpiamente al azul genérico del reset (`Base.astro`). No romper este orden de capas al editar CSS.
- **`theme.css` es la fuente de verdad del color de marca**: `--color-accent: #c8922a` (ámbar). No usar la skill global `tonyciencia-brand` como referencia de color — está desactualizada (documenta azul `#0274be`).
- Identidad visual: bordes duros (`--radius: 3px`, sin pills de 100px+), sombras "pixel" con offset sólido y sin blur (`--shadow-*: Npx Npx 0 color`), sin `backdrop-filter`/glassmorphism, textura de puntos retro (`--tc-dots`) en vez de gradientes de ruido. Tipografía pixel (`--font-pixel`, Silkscreen) reservada a eyebrows/badges — nunca en cuerpo de texto o encabezados de artículo (legibilidad).
- **`--color-on-accent`**: texto blanco sobre el ámbar de marca falla WCAG AA (~2.6:1). Usar siempre `var(--color-on-accent)` (definido en `theme.css` como texto oscuro, ~6.3:1) en vez de hardcodear `color: white` sobre fondos de acento.
- Dark mode: clase `.dark` en `<html>` persistida en cookie `theme`; fallback a `prefers-color-scheme`
- Nunca usar `<style is:global>` sin justificación — extender los tokens existentes
- Plugins EmDash usan prefijos `.emdash-` y `.ec-` — no colisionan con estilos del tema

### Componentes
- `src/components/pages/` → componentes de página completa que hacen el fetch de contenido
- `src/layouts/Base.astro` → layout raíz: SEO completo, OG tags, hreflang, JSON-LD, nav, dark mode, mobile menu
- `<Image image={...} />` de `"emdash/ui"` — los campos imagen son objetos `{ src, alt }`, no strings
- Componentes React solo si hay interactividad real (`SearchPage`, `CookieConsent`)
- `<PortableText value={...} />` de `"emdash/ui"` para renderizar contenido enriquecido

### Plugins instalados
- `@emdash-cms/plugin-forms` — formularios de contacto
- `@emdash-cms/plugin-webhook-notifier` — notifica a n8n al publicar posts

### Favicon
- Set completo en `public/` (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`), generado desde `src/assets/brand/logo-tonyciencia-negro-source.png`
- `Base.astro` usa `siteFavicon` del CMS como override si está seteado; si no, cae al `/favicon.ico` estático — el sitio nunca queda sin favicon

## Market Tony (`workers/market/`)

Tienda en `tonyciencia.com/market`: **Worker de Cloudflare separado del blog** (Hono + D1 `MARKET_DB` + R2 privado `MARKET_FILES`), con su propio `package.json`, lockfile y `wrangler.jsonc` (entornos `preview` mock, `staging` live de prueba, `production`). No se despliega con `pnpm deploy` del blog.
- `MODE = mock | live`; toda dependencia externa está detrás de `workers/market/src/adapters/` (mock y live). `MODE=mock` con dominio de producción hace que el Worker no arranque.
- Comandos (desde `workers/market/`): `pnpm setup:local && pnpm dev`, `pnpm test`, `pnpm test:e2e`, `pnpm test:startup-guard`, `pnpm deploy:<entorno>` (con chequeo previo). Usar `pnpm wrangler …` (agrega `-c wrangler.jsonc`; sin eso wrangler se confunde con `.wrangler/deploy/config.json` que deja el build del blog).
- En el sitio: el botón "Market" fijo de la cabecera (`Base.astro`), el menú y la "puerta" del Market en el hero del home (`public/assets/market/`). El botón flotante se retiró: duplicaba al de la cabecera.
- **Vitrina v2**: columnas de vitrina/SEO en `products` (migración `0002`), reseñas (`reviews`) y lista de espera (`waitlist`). Los datos del catálogo viven en `seed/catalog.mjs`; `migrations/0003_catalogo_v2.sql` se genera con `scripts/gen-catalog-migration.mjs` (no editar a mano). Portadas: `design/<slug>.html` → `pnpm render:covers`.
- **Nunca mostrar cifras inventadas** (ventas, estrellas, precios "antes"): ventas = pedidos pagados + `sales_offset` (ventas reales fuera del market); estrellas = reseñas de compradores verificados. Productos sin archivo → `availability = 'coming_soon'` (no se pueden comprar). Retirar un producto = `active = 0` por migración (no borrar: conserva pedidos y lista de espera); su URL redirige con 301 al catálogo (`migrations/0008`: se retiraron Kit n8n y Carruseles Infinitos), salvo los renombrados con slug nuevo, que redirigen a su ficha nueva (`RENAMED_PRODUCTS` en `src/lib/catalog.ts`; `migrations/0015`: SpecReel Stick → Stick Sketch, `stick-sketch`, USD 36.90; dentro del ZIP sigue llamándose SpecReel Stick).
- **Deploy automático**: `.github/workflows/market-deploy.yml` al hacer merge a `main` (pruebas → `scripts/ci-migrate.mjs` → deploy). `pnpm test:migration` prueba las migraciones sobre datos tipo producción.
- **v3 (2026-11-01)**: precios flexibles tipo Gumroad (`price_mode = fixed | pwyw`, `min_price_cents`, `max_price_cents`; USD 0 se entrega sin Stripe; Stripe cobra de 0.50 a 999,999.99), ofertas con precio anterior REAL tachado (`compare_at_cents`) en tarjeta, ficha, checkout, feed (`sale_price`) y JSON-LD (`StrikethroughPrice`), cupón de bienvenida que el cron crea en Stripe (`WELCOME_COUPON_AUTOCREATE`) y que el servidor limita a la primera compra, y catálogo v3 (`seed/catalog-v3.json` → `migrations/0005`). Lógica de precios: `src/lib/pricing.ts`.
- **Precio de lanzamiento (regla dura del dueño, 2026-11-01)**: todo producto NUEVO se publica a precio fijo POR ENCIMA de USD 77 y sin tachado; la oferta llega después, cuando ese precio estuvo vigente de verdad al menos 30 días seguidos sin bajar (el «antes» debe ser el precio más bajo de los 30 días previos, como exige la UE, y Google solo acepta tachar un precio que se cobró). Excepción decidida por el dueño: el rebranding de SpecReel Stick sale a USD 36.90.
- **Descargas = solo la cuenta que compró** (2026-11-01): el correo de entrega lleva `/market/descargas/<id>` SIN llave (pide iniciar sesión con la cuenta de Google de la compra; reenviar el correo no da acceso) y la URL del archivo `/market/archivo/<token>` dura `DOWNLOAD_URL_TTL_SECONDS` (120 s) y solo entrega con la sesión de esa misma cuenta (campo `u` del token). No volver a poner tokens de descarga en correos ni URLs prefirmadas de R2 (no se pueden atar a la sesión). Auditoría del 2026-11-01 (`migrations/0014`): cada cuenta queda atada a su `sub` de Google (`users.auth_subject`), el cupón de bienvenida no se aplica en dos checkouts abiertos a la vez (`orders.coupon_code`), los contracargos (`charge.dispute.*`, hay que activarlos en el webhook de Stripe) suspenden el acceso y lo devuelven si se gana, las reseñas de accesos revocados no se muestran, `/market/provision` no pisa archivos subidos desde el admin ni reactiva productos retirados, GTM no carga en páginas privadas y staging solo deja entrar a `ADMIN_EMAIL` (`LOGIN_ONLY_ADMIN`). El JSON-LD del blog se escapa con `src/utils/json-ld.ts` (mismo origen que el admin del market).
- **Archivos de producto**: los ZIP salen de repos privados con `node scripts/build-product-zip.mjs <slug>` y se suben con `PUT /market/provision/<slug>`, que solo acepta el SHA-256 fijado en `provision/manifest.json` (ver `provision/README.md`). Estado público: `/market/estado.json`. Auditoría: `node scripts/audit-catalog.mjs [origen]` (también en CI: `market-audit.yml`).
- **Enlaces al catálogo con parámetros SIEMPRE como `/market/?…`** (con barra): la ruta de Cloudflare `tonyciencia.com/market` no admite query string y `/market?…` cae en el blog (que lo redirige con 301, `src/pages/market.astro`). Logos de compatibilidad por producto: columna `compat` (`src/lib/brands.ts`, editable en el admin). Íconos de interfaz: `src/views/icons.tsx` (SVG, nada de emojis).
- **v5 (2026-11-01)**: catálogo «Mi stack de herramientas» (dirección A aprobada + etiqueta de precio con forma de flecha), portadas dolor → solución con logos arriba (`design/<slug>.html`, fuentes en `docs/ux/propuesta-2026-11-01/portadas-finales.md`), «Anuncios Automáticos» (slug `anuncios-infinitos`) y SEO de fichas (`migrations/0009`). Agente de diseño: `.claude/agents/ux-cro-designer.md` (propone maquetas, no implementa). **D1 rechaza patrones LIKE de más de 50 bytes**: en migraciones usar `instr()`/`substr()` (lo vigila `pnpm test:migration`).
- **Google Merchant y GTM**: feeds `/market/feed.xml` (ES) y `/market/en/feed.xml` (EN) con categoría 313 e imagen `merchant.jpg` (lista explícita `MERCHANT_IMAGES` en `src/lib/catalog.ts`; las portadas tienen texto promocional). GTM apagado mientras `GTM_ID` (market, `wrangler.jsonc`) y `PUBLIC_GTM_ID` (blog, variable de repositorio de GitHub) estén vacíos; Consent Mode v2 con la cookie `cookie_consent` del banner del blog. Eventos de GA4 (`view_item_list`, `view_item`, `begin_checkout`, `purchase`) en el dataLayer del market: `src/lib/analytics.ts` + `market.js`.
- **Auditoría del sitio entero** (404 y recursos rotos, blog + market): `node scripts/audit-site.mjs` desde la raíz del repo.
- Plan v3: `docs/PLAN-MARKET-V3.md`. Plan v2: `docs/PLAN-MARKET-V2.md`. Plan original: `docs/PLAN.md`. Credenciales: `HANDOFF.md`.

## Agentes de Tony Ciencia (`.claude/agents/`)

- **`ecommerce-manager`** + skill `.claude/skills/ecommerce-manager/` — administra Market Tony: productos, precios, ofertas, fichas, imágenes, SEO, feed de Merchant, publicación de repos como productos y auditoría periódica.
- **`content-affiliate-manager`** + skill `.claude/skills/articulo-afiliados/` — investiga y escribe artículos SEO con enlaces de afiliado SOLO de la base `src/data/partners.generated.ts` (+ `content/affiliates/extra.json`). Ver `docs/AGENTE-CONTENIDO.md`.
- Ambos trabajan por PR (nunca push directo a `main`). Regla común: nada inventado (funciones, cifras, reseñas, precios anteriores, enlaces).

## Configuración de Cloudflare

`wrangler.jsonc` requiere IDs reales antes de deploy:
- `database_id` en el binding D1 (`DB`)
- `id` en el binding KV (`SESSION`)

Bindings disponibles en runtime: `DB` (D1), `MEDIA` (R2), `SESSION` (KV), `IMAGES`, `LOADER`

## CI/CD

- `.github/workflows/deploy.yml` → auto-deploy a Cloudflare Workers en push a `main`; requiere secret `CF_API_TOKEN`
- `.github/workflows/seed-validate.yml` → valida `seed/seed.json` en PRs

## Automatización de contenido

Pipeline de publicación vía n8n (instancia: `https://admin.tonyscience.com`):
- Webhook del plugin `plugin-webhook-notifier` notifica al publicar posts
- El campo `external_id` en Posts es el ID externo de n8n
- Documentación: `docs/blog-automation-pipeline.md` | Payload de ejemplo: `docs/n8n-payload-example.json`

## Skills EmDash (en `.agents/skills/`)

Cargar antes de trabajar en tareas específicas:
- **building-emdash-site** — queries, Portable Text, schema, seed, menus, widgets, SEO, comentarios
- **creating-plugins** — hooks, storage, admin UI, rutas API, block types
- **emdash-cli** — comandos CLI, seeding, generación de tipos, flujo de edición visual
