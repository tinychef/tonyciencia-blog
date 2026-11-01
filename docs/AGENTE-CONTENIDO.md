# Agente de contenido y afiliados (`content-affiliate-manager`)

Un "trabajador" de IA para el blog: elige temas con demanda de búsqueda, investiga con fuentes oficiales, escribe
artículos en español (y en inglés si se lo pides) optimizados para SEO, integra enlaces de afiliado **solo** de la base
real y enlaces internos al blog y a Market Tony, valida todo y abre un PR. Un humano revisa y mergea.

## Piezas

| Archivo | Qué es |
|---|---|
| `.claude/agents/content-affiliate-manager.md` | Definición del subagente de Claude Code (rol, reglas duras, voz, entrega) |
| `.claude/skills/articulo-afiliados/SKILL.md` | Procedimiento paso a paso (tema → investigación → esquema → redacción → conversión → validación → checks → PR), rúbrica de calidad y checklist SEO |
| `.claude/skills/articulo-afiliados/references/` | Plantilla del borrador y política de afiliados/fuentes (FTC, Google) |
| `scripts/content/new-post.mjs` (`pnpm post:new`) | Markdown con frontmatter → JSON exacto de `content/posts/<locale>/<slug>.json` |
| `scripts/content/validate-post.mjs` (`pnpm post:check`) | Validador: campos, slug, longitudes, H2, palabras, afiliados contra la base, aviso FTC, densidad, enlaces internos, taxonomías, FAQ |
| `scripts/content/affiliates.mjs` (`pnpm aff:find`) | Buscador de la base de afiliados |
| `content/affiliates/extra.json` + `README.md` | Afiliados extra / reemplazos de la base (empieza vacío) |
| `src/components/PortableTextLink.astro` | Render de enlaces de los posts: los de afiliado salen con `rel="sponsored nofollow noopener"` y en pestaña nueva |

> **Importante — `.claude/` está en `.gitignore`.** El agente y la skill existen en tu copia local, pero un `git add`
> normal no los incluye. Para versionarlos (necesario si lo vas a correr en la nube o en CI) usa
> `git add -f .claude/agents/content-affiliate-manager.md .claude/skills/articulo-afiliados`, o cambia la línea
> `.claude/` de `.gitignore` por:
> ```
> .claude/*
> !.claude/agents/
> !.claude/skills/
> ```

## Cómo usarlo

En Claude Code, dentro del repo:

```
usa el agente content-affiliate-manager para escribir un artículo sobre las mejores herramientas de IA para atender clientes por WhatsApp
```

Otros pedidos útiles:

- `usa el agente content-affiliate-manager para proponer 5 temas con demanda de búsqueda y buen encaje de afiliados (sin escribir todavía)`
- `usa el agente content-affiliate-manager para escribir la versión en inglés de herramientas-ia-videos-marketing-2026`
- `usa el agente content-affiliate-manager para actualizar los precios del post activecampaign-vs-brevo-vs-kit-comparativa-2026`
- `usa el agente content-affiliate-manager para escribir una comparativa ActiveCampaign vs Brevo; prioriza Brevo (notas: …)` — si le das notas de tu experiencia real, puede usarlas en primera persona; sin notas, nunca finge haber probado nada.

El agente necesita permiso para `WebSearch`, `WebFetch`, `pnpm`, `git` y `gh`. Si lo corres sin supervisión, añade a
`.claude/settings.json` reglas como:

```json
{
  "permissions": {
    "allow": [
      "WebSearch", "WebFetch",
      "Bash(pnpm aff:find:*)", "Bash(pnpm post:new:*)", "Bash(pnpm post:check:*)",
      "Bash(pnpm build:seed)", "Bash(pnpm check:seo-i18n)",
      "Bash(git switch:*)", "Bash(git add:*)", "Bash(git commit:*)", "Bash(git push:*)",
      "Bash(gh pr create:*)"
    ]
  }
}
```

### Comandos que usa (también sirven a mano)

```bash
pnpm aff:find descript                 # buscar un partner
pnpm aff:find --category video         # una categoría (sin tildes, coincidencia parcial)
pnpm aff:find --list-categories        # 29 categorías, 139 partners hoy
pnpm aff:find --check <url>            # ¿es un enlace de afiliado válido de la base?
pnpm post:new .claude/drafts/<slug>.md --pillar        # Markdown → content/posts/<locale>/<slug>.json + validación
pnpm post:check content/posts/es/<slug>.json --pillar --online
pnpm build:seed && pnpm check:seo-i18n
```

### Qué bloquea el validador (errores) y qué solo avisa

| Error (bloquea) | Aviso |
|---|---|
| Faltan campos del contrato (`id`, `slug`, `status`, `locale`, `published_at`, `data.title/excerpt/content/featured_image/external_id/source`) | `status: draft` (no se verá tras el merge) |
| Slug inválido, distinto del nombre de archivo o duplicado; `id`/`external_id`/título duplicados | Título > 60 caracteres |
| Título fuera de 20–70 caracteres; excerpt fuera de 120–200 | Excerpt fuera de 140–160 |
| < 3 H2; < 300 palabras (o < 1200 con `--pillar`) | < 5 H2; < 1200 palabras sin `--pillar`; párrafos > 120 palabras |
| Enlace "con pinta de afiliado" que no está en la base | < 2 fuentes externas no afiliadas |
| Enlaces de afiliado sin aviso, o aviso fuera de los 3 primeros bloques o después del primer enlace | Keyword principal ausente del título/excerpt/introducción |
| Más de 1 enlace de afiliado cada 250 palabras o más de 2 por partner; afiliado en un encabezado | FAQ con < 3 preguntas o no visible en el contenido |
| < 2 enlaces internos; enlace interno a un post/ruta que no existe | `keywords`/`key_entities` vacíos, `schema_type` raro |
| Taxonomía o término inexistente en `seed/base/site.json` | Con `--online`: enlaces que no responden |
| `featured_image` sin alt o apuntando a un archivo inexistente en `public/` | |
| FAQ mal formado (h3 pregunta + normal respuesta); restos de Markdown | |
| Partner con `disallowedTopics` que coincide con el tema | |

## Cómo publica: PR → merge → deploy

1. El agente crea la rama `content/agent/<YYYY-MM-DD>-<slug>`, commitea `content/posts/es/<slug>.json` (y el `en` si lo
   hay) junto con `seed/seed.json` regenerado, y abre un PR contra `main`. **No mergea ni empuja a `main`.**
2. En el PR corre `.github/workflows/seed-validate.yml`: `pnpm build:seed`, `pnpm check:seo-i18n`, `pnpm typecheck`,
   `pnpm build` y `npx emdash seed seed/seed.json --validate`.
3. Revisión humana (checklist de `docs/blog-automation-pipeline.md`: claims y cifras, interlinking, EN ↔ ES) y merge.
4. Al llegar a `main`, `.github/workflows/deploy.yml` corre `pnpm build:seed`, `pnpm build` y `wrangler deploy`.
   Verifica que ese workflow esté en verde: según `AGENTS.md` (handoff 2026-09-01) el secret `CF_API_TOKEN` estaba roto
   y se desplegaba a mano con `pnpm deploy`.

## Cómo llega un post a producción (y qué NO pasa)

Revisado en el código el 2026-11-01:

- **El deploy no escribe en D1.** `deploy.yml` no ejecuta `emdash seed` contra la base de producción, y el CLI
  `emdash seed` solo apunta a un SQLite local (`--database ./data.db`).
- `seed/seed.json` se empaqueta dentro del Worker (`package.json#emdash.seed`), pero EmDash solo lo aplica
  automáticamente cuando D1 está **vacía** (0 colecciones y setup sin completar), es decir, en el primer arranque.
  La D1 de producción ya está inicializada, así que un post nuevo en el seed **no** se inserta en D1.
- **Lo que hace visible el post es el respaldo estático** `src/utils/static-posts.ts`: en cada build empaqueta
  `content/posts/{es,en}/*.json` con `import.meta.glob`. Solo cuenta `status: "published"`.
  - `/posts/<slug>` usa la entrada de D1 si existe; si no, el JSON. `/posts`, la home y los "relacionados" mezclan los
    posts de D1 con los JSON cuyo slug no esté en D1. → El post aparece unos minutos después del deploy.
  - Los posts que solo existen como JSON **no** salen en: RSS (`/rss.xml`), páginas de categoría y etiqueta, el buscador
    (`/search`), ni el Admin de EmDash; y no tienen comentarios (la página los oculta para posts estáticos).
  - Si alguien crea en el Admin un post con el mismo slug, D1 gana y el JSON deja de mandar.
  - `published_at` no programa nada: un post `published` con fecha futura se muestra igual.
- **Para que el post viva también en D1** (RSS, categorías, búsqueda, comentarios, edición en el Admin):
  créalo desde el Admin de EmDash, o con el CLI contra el sitio en producción
  (`npx emdash login` y luego `npx emdash content create posts --file <data.json> --slug <slug> --locale es --url https://tonyciencia.com`).
  Esa vía por CLI no se ha probado en este repo: hazlo primero con un post de prueba en `--draft`. Una vez en D1, las
  ediciones se hacen en el Admin (el JSON ya no manda).
- Hallazgo aparte: `@astrojs/sitemap` con `output: "server"` solo lista rutas estáticas; `sitemap-index.xml` no incluye
  ninguna URL de post (ni de D1 ni de JSON). Conviene un sitemap de posts propio para el SEO de este agente.

## Cómo programarlo

Cadencia sugerida: 1–2 artículos por semana, siempre con revisión humana del PR. Antes de programarlo, versiona el agente
y la skill (ver la nota de `.gitignore` arriba): las ejecuciones en la nube o en CI clonan el repo y no verán archivos
que no estén commiteados.

1. **Tareas programadas de Claude Code (claude.ai/code).** Crea una tarea recurrente sobre este repo con un prompt
   como: *"Usa el agente content-affiliate-manager: revisa qué temas faltan en content/posts/es, elige uno con demanda de
   búsqueda y buen encaje de afiliados, escríbelo siguiendo la skill articulo-afiliados y abre el PR. No mergees."*
   Cada ejecución abre un PR que revisas cuando puedas.
2. **GitHub Actions** con la acción oficial `anthropics/claude-code-action` y un `schedule:` (cron). Boceto (confirma los
   nombres de los inputs en la documentación de la acción antes de usarlo; necesita el secret `ANTHROPIC_API_KEY` y
   permisos `contents: write` y `pull-requests: write`):
   ```yaml
   name: Artículo semanal
   on:
     schedule: [{ cron: "17 13 * * 2" }]   # martes 13:17 UTC
     workflow_dispatch:
   jobs:
     write:
       runs-on: ubuntu-latest
       permissions: { contents: write, pull-requests: write }
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with: { version: 11.0.8 }
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: pnpm }
         - run: pnpm install --frozen-lockfile
         - uses: anthropics/claude-code-action@v1
           with:
             anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
             prompt: "Usa el agente content-affiliate-manager para escribir y proponer por PR un artículo nuevo (sigue la skill articulo-afiliados). No mergees."
   ```
3. **Cron local** (Mac/Linux) o Programador de tareas (Windows) con Claude Code en modo no interactivo:
   `claude -p "usa el agente content-affiliate-manager para …"` desde la carpeta del repo, con los permisos de arriba.
4. **n8n** (`admin.tonyscience.com`) puede disparar la opción 2 vía `workflow_dispatch` de la API de GitHub, si prefieres
   orquestar el calendario editorial desde ahí.

## Primer artículo (prueba de funcionamiento)

`content/posts/es/herramientas-ia-videos-marketing-2026.json` — *"Herramientas de IA para videos de marketing: guía
2026"*. Siete partners de la base (Descript, CapCut, Pippit, InVideo, Kling AI, ElevenLabs, Riverside), enlaces internos
a SpecReel, Anuncios Infinitos, el post de FocuSee, la guía de Demand Gen y `/contacto`; precios y funciones verificados
en las páginas oficiales el 2026-11-01. No incluye el precio de SpecReel a propósito: el cambio de precios de Market Tony
v3 (migración `0004`) estaba en curso. Portada: la genérica `/assets/og-default.webp`, con `image_prompt` para generar
una propia.

## Límites conocidos

- El agente no tiene una herramienta de volumen de búsqueda (Ahrefs, Semrush, Search Console): estima la demanda
  mirando resultados y preguntas en buscadores. Si conectas una, dile que la use.
- No genera imágenes; deja `image_prompt`. Las imágenes en el cuerpo no están soportadas por el conversor.
- La detección de "enlace con pinta de afiliado" es heurística (redes conocidas, subdominios `try.`/`get.` con token,
  parámetros `fpr`/`via`/`aff`…). Si un enlace legítimo de tu base no se reconoce, agrégalo a `content/affiliates/extra.json`.
- Varios posts antiguos usan enlaces de afiliado que no están en la base actual (FocuSee/iMobie, ActiveCampaign) y no
  pasarían `pnpm post:check`; si siguen vigentes, agrégalos a `extra.json`.
