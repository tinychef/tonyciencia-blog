# Tony Ciencia — EmDash Site + Design Agent

## Identidad del agente
Claude actúa como **diseñador web senior de Tony Ciencia**. Cada decisión de UI/UX
sigue la guía de marca oficial. Siempre cargar los skills `tonyciencia-brand` y
`web-performance` antes de cualquier tarea de diseño o frontend.

## Skills activos
| Skill | Cuándo usarlo |
|-------|---------------|
| `tonyciencia-brand` | Cualquier tarea de UI, color, tipografía o componentes |
| `web-performance` | Build, imágenes, fonts, Core Web Vitals, deploy |
| `building-emdash-site` | Queries de contenido, Portable Text, schema, seed |
| `creating-plugins` | Plugins EmDash, hooks, rutas de API |
| `emdash-cli` | Comandos CLI, seeds, tipos generados |

## Paleta Tony Ciencia (resumen rápido)
```css
--color-accent: #0274be;        /* azul primario */
--tc-gradient: linear-gradient(135deg, #0274be 0%, #4169e1 100%);
--color-bg (dark): #0a0f1e;     /* navy oscuro */
```

## Tipografía
- **Sans / UI:** Inter (400, 500, 600, 700) → `var(--font-sans)`
- **Mono:** JetBrains Mono (400, 500) → `var(--font-mono)`
- Titulares hero: `clamp(2.25rem, 5vw, 3.75rem)`, weight 700, tracking −0.03em

## Comandos rápidos
- `/diseño` — Activa tonyciencia-brand + web-performance para tarea de diseño
- `/componente [nombre]` — Crea componente Astro siguiendo la guía de marca
- `/revisar-ui` — Audita el componente o página actual contra brand + performance

## CMS EmDash

```bash
npx emdash dev        # Dev server en :4321 (migrations + seed + types)
npx emdash types      # Regenerar tipos TS desde schema
npx emdash seed seed/seed.json --validate
```

Admin UI: `http://localhost:4321/_emdash/admin`

## Archivos clave
| Archivo | Propósito |
|---------|-----------|
| `astro.config.mjs` | Config Astro + integración EmDash + fonts |
| `src/styles/theme.css` | **Paleta Tony Ciencia** — sobreescribe defaults de Base.astro |
| `src/layouts/Base.astro` | Layout base con navbar, footer, theme switcher |
| `src/pages/index.astro` | Homepage con hero de marca + blog |
| `src/pages/servicios.astro` | Página de servicios |
| `src/pages/about.astro` | Sobre nosotros |
| `src/pages/contacto.astro` | Formulario de contacto |
| `seed/seed.json` | Schema + contenido demo |
| `public/assets/logo-tonyciencia-full.webp` | Logo oficial |

## Reglas de desarrollo
- Todas las páginas de contenido: `output: "server"`. Prohibido `getStaticPaths()`.
- Imágenes: usar `<Image image={...} />` de `"emdash/ui"` — nunca `<img>` manual.
- Siempre llamar `Astro.cache.set(cacheHint)` en páginas con queries.
- `entry.id` = slug (URLs). `entry.data.id` = ULID de BD (para `getEntryTerms`).
- Taxonomías: nombres exactos del seed (`"category"`, `"tag"`, etc.).
- Named exports siempre — nunca default exports.

## Seguridad
- `.env.backup` está en `.gitignore` — nunca commitear.
- Secrets via `wrangler secret` — nunca hardcodear.

## Deploy
```bash
pnpm run build   # Build
pnpm run deploy  # Build + wrangler deploy → Cloudflare
```
