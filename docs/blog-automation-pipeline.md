# Blog Automation Pipeline — Tony Ciencia

## Arquitectura general

```
n8n (admin.tonyscience.com)
    └── Trigger (webhook / schedule)
        └── Genera contenido (OpenAI / plantilla)
            └── Escribe posts fuente en content/posts/**
                └── Abre PR en GitHub
                    └── GitHub Actions reconstruye seed/seed.json
                        └── GitHub Actions valida seed + despliega
                            └── pnpm build → wrangler deploy → Cloudflare Workers
```

## Componentes

### 1. n8n — Orquestador de automatización
- **URL**: https://admin.tonyscience.com
- **Trigger**: Webhook externo o cron diario
- **Acción**: Llama a la GitHub API para crear/actualizar archivos en `content/posts/es/` y `content/posts/en/`
- **Payload de referencia**: `docs/n8n-payload-example.json`
- **Convención de rama**: `content/n8n/<fecha>-<slug-es>`

### 2. GitHub Actions

#### `seed-validate.yml` (PR trigger)
- Se dispara en PRs que tocan `seed/base/`, `content/` o el ensamblador del seed
- Ejecuta `pnpm build:seed`, `pnpm check:seo-i18n`, `pnpm typecheck`, `pnpm build` y luego `npx emdash seed seed/seed.json --validate`
- Bloquea merge si el seed tiene errores de schema

#### `deploy.yml` (push a main)
- Se dispara al hacer merge o push directo a `main`
- Pasos: `actions/checkout` → `pnpm/action-setup` → `actions/setup-node` (con cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm build` → `wrangler deploy`
- Secret requerido: `CF_API_TOKEN` en GitHub repo secrets

### 3. Cloudflare Workers + D1
- **Worker**: `tonyciencia-emdash`
- **Account ID**: `d43e2ca141f4ec0067cc36a12f72e962`
- **D1 Database**: Contiene todas las colecciones (posts, pages, legal_pages, menus)
- **R2 Bucket**: Almacena imágenes y media
- El seed solo actualiza D1 — los assets de R2 se suben por separado vía EmDash Admin UI

## Flujo de un post nuevo (automatizado)

1. n8n detecta un trigger (nuevo episodio, artículo externo, noticia relevante)
2. n8n llama a OpenAI para generar borrador o formatea el contenido
3. n8n escribe un archivo JSON por post:
   - `content/posts/es/<slug>.json`
   - `content/posts/en/<slug>.json`
   - Commitea a una rama `content/n8n/<fecha>-<slug-es>` y abre PR
4. Si va a rama feature → GitHub Actions ejecuta `seed-validate.yml` en el PR
5. `pnpm build:seed` reconstruye `seed/seed.json` a partir de `seed/base/` + `content/posts/**`
6. Al hacer merge a main → `deploy.yml` ejecuta build + deploy automático
7. En ~2 minutos el post está live en tonyciencia.com

## Flujo de un post nuevo (manual desde CMS)
1. Acceder a `http://localhost:4321/_emdash/admin` (dev) o al admin URL en prod
2. Crear entrada desde la UI de EmDash Admin
3. El CMS actualiza D1 directamente — no requiere rebuild
4. Los cambios son visibles inmediatamente (SSR en el edge)

## Variables de entorno requeridas

| Variable | Donde | Descripción |
|----------|-------|-------------|
| `CF_API_TOKEN` | GitHub Secrets | Cloudflare API token con permisos de Workers |
| `CLOUDFLARE_ACCOUNT_ID` | wrangler.jsonc | ID de cuenta Cloudflare |
| `N8N_API_KEY` | n8n env | API key para llamadas desde workflows externos |

## Notas de diseño
- `output: "server"` en Astro — todo SSR en el edge, no hay archivos estáticos de contenido
- `Astro.cache.set(cacheHint)` en cada página de contenido — cache inteligente a nivel de Workers
- `seed/base/` + `content/posts/**` son la fuente de verdad versionada
- `seed/seed.json` es un artefacto generado compatible con EmDash
- Nunca editar D1 directamente — siempre a través del seed generado o del Admin UI de EmDash

## Contrato mínimo del archivo de post

Cada archivo en `content/posts/es/*.json` o `content/posts/en/*.json` debe incluir:

- `id`
- `slug`
- `status`
- `locale`
- `published_at`
- `data.title`
- `data.excerpt`
- `data.content`
- `data.featured_image`
- `data.external_id`
- `data.source`
- `data.translation_of` para posts EN
- `taxonomies` con slugs válidos

El ensamblador del seed falla si:

- falta un campo obligatorio
- `translation_of` no apunta a un slug ES existente
- una categoría o tag no existe
- se repite un `slug`
- se repite un `external_id`

## Revisión humana del PR

Antes de mergear:

- confirmar que el ES quedó mejor que el borrador IA
- validar claims, cifras y comparativas
- revisar interlinking hacia landings activas
- confirmar que el EN corresponde al ES correcto
