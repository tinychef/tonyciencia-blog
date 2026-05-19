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

**Stack:** Astro 6 (output: server) + EmDash 0.10.0 CMS + Cloudflare Workers

### Capa de contenido (EmDash)
- Acceso SOLO via `emdash:content` API — nunca query directo a D1
- Colecciones activas: `posts`, `pages`, `legal` (ver `seed/seed.json` para schema completo)
- `entry.id` = slug (para URLs). `entry.data.id` = ULID de la DB (para `getEntryTerms` y otras llamadas API)
- Siempre llamar `Astro.cache.set(cacheHint)` en páginas que consultan contenido
- Taxonomías en queries deben coincidir exactamente con el campo `"name"` del seed (`"category"`, `"tag"`)
- `emdash-env.d.ts` → tipos auto-generados; se regeneran al iniciar el dev server

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

### Estilos
- **CSS vanilla con variables** — sistema de diseño en `src/layouts/Base.astro` (`:root` con tokens) y `src/styles/theme.css`
- Colores en CSS custom properties (`--color-bg`, `--color-text`, `--color-accent`, etc.)
- Dark mode: clase `.dark` en `<html>` persistida en cookie `theme`; fallback a `prefers-color-scheme`
- Color accent por defecto: azul (`#0066cc`). El amber de Tony Ciencia (`#c8922a`) se usa para gradients (`--tc-gradient`)
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
