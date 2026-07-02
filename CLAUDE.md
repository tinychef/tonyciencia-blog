# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
