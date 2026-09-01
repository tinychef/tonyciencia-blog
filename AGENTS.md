This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
npx emdash dev        # Start dev server (runs migrations, seeds, generates types)
npx emdash types      # Regenerate TypeScript types from schema
npx emdash seed seed/seed.json --validate  # Validate seed file
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout with EmDash wiring (menus, search, page contributions)                 |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- Always call `Astro.cache.set(cacheHint)` on pages that query content.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## Estado actual (handoff, 2026-09-01)

El sitio pasó por un rebrand neo-brutalista completo (paleta/tipografía calcada del Worker hermano `adsinfinitos.tonyciencia.com` / "Agente Peitho") + una home nueva enfocada en dos productos propios (Agente Mía, Agente Peitho). Ya está desplegado en producción (commits hasta `dc739d6` en `main`). Detalle completo del trabajo en el historial de commits — acá solo lo que queda abierto:

1. **`CF_API_TOKEN` de GitHub Actions está roto** (`Invalid access token [code: 9109]`) — el workflow `Deploy to Cloudflare` falla en cada push. Se viene desplegando manual con `pnpm deploy` (wrangler ya autenticado localmente en esta máquina, cuenta "Tony cloud webs"). Hay que regenerar el token en Cloudflare y correr `gh secret set CF_API_TOKEN --repo tinychef/tonyciencia-blog` para que el pipeline automático vuelva a andar.
2. **Efecto de scroll pendiente**: el dueño quiere algo inspirado en `codepen.io/GreenSock/pen/rNKzZdj` (GSAP/ScrollTrigger) para el sitio — nunca se llegó a ver el pen. Pedirle que lo describa o revisarlo con un navegador antes de tocar el comportamiento de scroll.
3. **Pulido opcional, con autorización explícita antes de descargar nada**: re-alojar dos imágenes hotlinkeadas de terceros — badge de Anthropic Partner Network (`claudeaimalaysia.com`) y logo de GoHighLevel (`leadconnectorhq.com`) — a `public/assets/partners/`.
4. **`/servicios` y páginas secundarias** heredaron los tokens nuevos automáticamente (rebrand global) pero no se rediseñaron componente por componente al nuevo lenguaje visual (acordeones, ProductCard, etc.) — solo la home recibió ese tratamiento completo.
5. **Captura de email** (`workers/email-capture/`, Worker `tonyciencia-email-capture` + KV `tonyciencia-email-leads`) guarda directo en KV, sin Brevo ni ningún ESP todavía — el dueño pidió arrancar simple y conectar Brevo después.

No hay cambios de arquitectura ni de marca pendientes más allá de esto — el sistema de diseño (`src/styles/theme.css`), la separación home ES (`HomePage.astro`) / EN (`HomePageEn.astro`, intacta, no tocar) y la capa de datos de partners (`src/data/partners.generated.ts`, regenerar con `pnpm run generate:partners <ruta-json>`) ya están resueltos y confirmados con el dueño.
