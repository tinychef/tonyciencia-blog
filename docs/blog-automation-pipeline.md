# Blog Automation Pipeline — Tony Ciencia

## Arquitectura general

```
n8n (admin.tonyscience.com)
    └── Trigger (webhook / schedule)
        └── Genera contenido (OpenAI / plantilla)
            └── Actualiza seed/seed.json en GitHub
                └── GitHub Actions (seed-validate.yml → deploy.yml)
                    └── pnpm build → wrangler deploy → Cloudflare Workers
```

## Componentes

### 1. n8n — Orquestador de automatización
- **URL**: https://admin.tonyscience.com
- **Trigger**: Webhook externo o cron diario
- **Acción**: Llama a la GitHub API para actualizar `seed/seed.json` con nuevos posts/páginas
- **Payload de referencia**: `docs/n8n-payload-example.json`

### 2. GitHub Actions

#### `seed-validate.yml` (PR trigger)
- Se dispara en PRs que tocan `seed/seed.json`
- Ejecuta `npx emdash seed seed/seed.json --validate` (dry-run)
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
3. n8n hace `PATCH /repos/user/repo/contents/seed/seed.json` vía GitHub API:
   - Obtiene el SHA actual del archivo
   - Añade la nueva entrada al array `posts` del seed
   - Commitea directamente a una rama feature o a main
4. Si va a rama feature → GitHub Actions ejecuta `seed-validate.yml` en el PR
5. Al hacer merge a main → `deploy.yml` ejecuta build + deploy automático
6. En ~2 minutos el post está live en tonyciencia.com

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
- El seed.json es la fuente de verdad para la estructura; D1 es el runtime store
- Nunca editar D1 directamente — siempre a través del seed o del Admin UI de EmDash
