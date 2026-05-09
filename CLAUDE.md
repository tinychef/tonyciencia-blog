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
```

## Arquitectura

**Stack:** Astro 6 (output: server) + EmDash 0.10.0 CMS + Cloudflare Workers

### Capa de contenido (EmDash)
- Acceso SOLO via `emdash:content` API — nunca query directo a D1
- Colecciones: `Post`, `Page`, `LegalPage` (tipos generados en `emdash-env.d.ts`)
- Schema y datos demo en `seed/seed.json` (fuente de verdad del modelo de datos)
- Bindings Cloudflare: `DB` (D1), `MEDIA` (R2), `SESSION` (KV), `IMAGES`, `LOADER`

### Internacionalización
- Default: español (`es`) sin prefijo de ruta
- Inglés: rutas prefijadas `/en/`
- Traducciones en `src/i18n/es.ts` y `src/i18n/en.ts`; helper `t()` en `src/i18n/locales.ts`
- Las páginas en `src/pages/` se replican manualmente en `src/pages/en/`
- El campo `translation_of` en Posts vincula traducciones

### Routing
- Páginas de contenido dinámico: `[slug].astro` llaman a EmDash API
- `src/pages/rss.xml.ts` + `src/pages/en/rss.xml.ts` → feeds RSS separados por locale
- `src/worker.ts` → entry point del Worker de Cloudflare
- `src/live.config.ts` → registro de loaders EmDash

### Estilos
- **CSS vanilla con variables**, no Tailwind — el sistema de diseño vive en `src/styles/theme.css`
- Colores en Oklch; color accent: amber (`#c8922a` / `oklch(65% 0.15 70)`)
- Dark mode: clase `.dark` en `<html>` + `prefers-color-scheme`
- Nunca usar `<style is:global>` sin justificación — extender `theme.css`

### Componentes
- `src/components/pages/` → componentes de página completa (pasados como props a layouts)
- `src/layouts/Base.astro` → layout raíz con EmDash wiring, SEO, fonts
- Componentes React solo para interactividad real (SearchPage, CookieConsent)

## Configuración de Cloudflare

`wrangler.jsonc` requiere IDs reales antes de deploy:
- `database_id` en el binding D1 (`DB`)
- `id` en el binding KV (`SESSION`)

Los placeholders están documentados con comentarios `// TODO` en el archivo.

## CI/CD

- `.github/workflows/deploy.yml` → auto-deploy a Cloudflare Workers en push a `main`
  - Requiere secret: `CF_API_TOKEN`
- `.github/workflows/seed-validate.yml` → valida `seed/seed.json` en PRs

## Automatización de contenido

Pipeline de publicación vía n8n (instancia: `https://admin.tonyscience.com`):
- Webhook del plugin `plugin-webhook-notifier` notifica al publicar posts
- Documentación del pipeline en `docs/blog-automation-pipeline.md`
- Payload de ejemplo en `docs/n8n-payload-example.json`
