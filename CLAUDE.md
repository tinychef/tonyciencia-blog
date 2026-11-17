# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Al empezar una sesión
- Lee `docs/PENDIENTES-DUENO.md` y recuérdale al dueño, en pocas líneas y en español, lo que siga pendiente de su parte.

## Comandos esenciales

```bash
# Desarrollo
pnpm dev                  # Servidor local en localhost:4321

# Build y deploy
pnpm build                # Valida los posts (build-seed) + astro build → ./dist
pnpm preview              # Previsualizar build localmente (workerd)
pnpm deploy               # build + wrangler deploy → Cloudflare Workers (lo hace el CI al fusionar a main)

# Calidad
pnpm typecheck            # astro check (TypeScript + .astro)
pnpm check:seo-i18n       # comprobaciones SEO/i18n del contenido
pnpm post:check <archivo> # revisión editorial de un post JSON
```

## Arquitectura

**Stack:** Astro 7 (output: server) + Cloudflare Workers. **Sin CMS**: desde el 2026-11-03 el contenido vive solo en git (antes EmDash 0.23 + D1; se quitó porque D1 y los JSON no se sincronizaban, su admin nunca se configuró y quedó expuesto, y causaba la mayoría de los errores repetidos).
**Node:** 22.x (fijado en `.node-version`, igual que CI). No usar el Node "system" si es una versión mucho más nueva — provocó fallos de compilación nativa de `better-sqlite3` con toolchains de Visual Studio recientes.

### Contenido — git es la única fuente de verdad
- Cada post vive en su propio archivo: `content/posts/es/<slug>.json` y `content/posts/en/<slug>.json` (Portable Text en `data.content`). Publicar = PR con el JSON (n8n y el agente de contenido ya lo hacen así); al fusionar a `main` se despliega.
- `src/utils/static-posts.ts` carga los JSON en el build; `src/lib/content.ts` ofrece `getEmDashCollection`/`getEmDashEntry`/`getTerm`/`getSeoMeta`… con la misma firma que tenía EmDash (las páginas no cambiaron de forma). `src/utils/all-posts.ts` para listas completas (RSS, buscador).
- `scripts/build-seed.mjs` corre en cada build y **valida** los JSON (campos obligatorios, translation_of que exista…); `seed/seed.json` es un artefacto histórico.
- Taxonomías: `taxonomies.category` / `taxonomies.tag` del JSON; nombres visibles por idioma en `TAXONOMY_LABELS` (`static-posts.ts`). Una etiqueta o categoría existe si algún post la usa.
- Render: `src/components/PortableText.astro` (bloques, listas, marcas y enlaces con `PortableTextLink`, que marca los de afiliado como `sponsored`). Bloques HTML crudos no se renderizan.
- `data.seo_title` opcional para un `<title>` distinto del H1. `data.faq_items` se muestra en la página (y va al FAQPage).
- Páginas legales: `src/data/legal.ts`. Pares de traducción sin `translation_of` y duplicados redirigidos: `src/utils/post-redirects.ts`. URL viejas (WordPress) → 301/410 en `src/pages/[...ruta].astro`.
- Siempre llamar `Astro.cache.set(cacheHint)` donde ya se hace (hoy no hay caché de HTML configurada; es inofensivo).

### Routing de páginas
- Todas las páginas son server-rendered (SSR en el Worker); el contenido sale de los JSON del bundle, sin base de datos
- Patrón de página: `src/pages/[slug].astro` importa `src/components/pages/[Nombre]Page.astro` y lo renderiza sin props (el componente hace el fetch internamente)
- `src/pages/en/` espeja `src/pages/` para inglés — las páginas en inglés se crean manualmente
- Rutas dinámicas: `/posts/[slug]`, `/category/[slug]`, `/tag/[slug]`, `/pages/[slug]`, `/legal/[slug]`
- `src/worker.ts` → entry point del Worker (boilerplate)
- `src/middleware.ts` → bloquea /_emdash (el CMS ya no existe), 301 a URL sin barra final y cabeceras de seguridad

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

### Componentes
- `src/components/pages/` → componentes de página completa que hacen el fetch de contenido
- `src/layouts/Base.astro` → layout raíz: SEO completo, OG tags, hreflang, JSON-LD, nav, dark mode, mobile menu
- Imagen destacada: `data.featured_image.$media.url` del JSON (obligatoria; si no hay foto, `https://tonyciencia.com/assets/og-default.webp`)
- Componentes React solo si hay interactividad real (`SearchPage`, `CookieConsent`)
- `<PortableText value={...} />` de `src/components/PortableText.astro` para el contenido de los posts

### Formulario de contacto
- `/contacto` y `/en/contact` envían a `POST /market/contacto` (Worker del market, `workers/market/src/routes/contact.ts`), que manda el correo con su outbox a `ADMIN_COPY_EMAIL`. Desde el Worker del blog, Cloudflare Email Sending responde `E_SENDER_DOMAIN_NOT_AVAILABLE`.
- **Anti-spam (2026-11-09, tras el bot «RobertGab»)**: contacto y boletín usan Cloudflare Turnstile (sitekey en `src/data/turnstile.ts`, componente `src/components/Turnstile.astro`, secreto `TURNSTILE_SECRET` solo en el Worker del market). Además hay una heurística de firmas de bot (`workers/market/src/lib/spam.ts`, descarte silencioso), el límite por IP y un tope global de 40 mensajes al día. Para activarlo, primero se publica la sitekey y después se guarda el secreto; ver `docs/SEGURIDAD-CONTACTO.md`.

### Favicon
- Set completo en `public/` (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`), generado desde `src/assets/brand/logo-tonyciencia-negro-source.png`
- `Base.astro` usa `siteFavicon` del CMS como override si está seteado; si no, cae al `/favicon.ico` estático — el sitio nunca queda sin favicon

## Market Tony (`workers/market/`)

Worker de Cloudflare separado del blog (Hono + D1 + R2), con su propio `package.json` y `wrangler.jsonc`; no se despliega con `pnpm deploy` del blog. Reglas duras (precios, descargas, migraciones, deploy): **`workers/market/CLAUDE.md`** — léelo antes de tocar el Market. Precio de lanzamiento: más de USD 77 salvo excepciones explícitas del dueño (Stick Sketch USD 36.90; Reel 4K Studio USD 47, migración `0017`).

## Cuidar el contexto (la sesión se bloquea si se llena)

- **PDF**: nunca leer uno entero. Leerlo con el parámetro `pages` de a 3–5 páginas, solo las necesarias. Un PDF de 1 MB ocupa ~40k tokens.
- **Capturas e imágenes**: solo cuando haga falta verificar algo visual; máx. ~5 por sesión. Para revisar texto, usar `get_page_text` / `read_page`, no capturas.
- **Salidas largas** (build, tests, logs, `wrangler`): filtrar con `| tail -40` o `| grep -i error`. No volcar `pnpm-lock.yaml`, `dist/`, `seed/seed.json` ni `HANDOFF.md` completos.
- **Tareas grandes o de otro tema** (Market vs blog vs contenido): sesión nueva. Barridos amplios del repo → subagente `Explore`.

## Agentes de Tony Ciencia (`.claude/agents/`)

- **`ecommerce-manager`** + skill `.claude/skills/ecommerce-manager/` — administra Market Tony: productos, precios, ofertas, fichas, imágenes, SEO, feed de Merchant, publicación de repos como productos y auditoría periódica.
- **`content-affiliate-manager`** + skill `.claude/skills/articulo-afiliados/` — investiga y escribe artículos SEO con enlaces de afiliado SOLO de la base `src/data/partners.generated.ts` (+ `content/affiliates/extra.json`). Ver `docs/AGENTE-CONTENIDO.md`.
- Ambos trabajan por PR (nunca push directo a `main`). Regla común: nada inventado (funciones, cifras, reseñas, precios anteriores, enlaces).

## Configuración de Cloudflare

`wrangler.jsonc` del blog: Worker `tonyciencia` con assets estáticos. Los bindings `DB` (D1 `tonyciencia-emdash`), `MEDIA` (R2) y `SESSION` (KV) quedaron de la época de EmDash y ya no se usan; se conservan unas semanas por si hiciera falta volver atrás (rollback con `wrangler rollback`).

## CI/CD

- `.github/workflows/deploy.yml` → auto-deploy a Cloudflare Workers en push a `main`; requiere secret `CF_API_TOKEN`
- `.github/workflows/seed-validate.yml` («Validar contenido») → en PRs que tocan `content/`: build-seed, check:seo-i18n, typecheck y build

## Automatización de contenido

Pipeline de publicación vía n8n (instancia: `https://admin.tonyscience.com`): n8n escribe un JSON por post y abre un PR (el webhook del antiguo CMS ya no existe).
- El campo `external_id` en Posts es el ID externo de n8n
- Documentación: `docs/blog-automation-pipeline.md` | Payload de ejemplo: `docs/n8n-payload-example.json`
