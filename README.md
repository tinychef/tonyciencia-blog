# Tony Ciencia — Implementa IA, Avanza

Blog bilingüe (ES/EN) sobre inteligencia artificial, automatización y negocios digitales. Construido con [EmDash CMS](https://github.com/emdash-cms/emdash) + Astro, desplegado en Cloudflare Workers (D1 + R2).

**🌐 [tonyciencia.com](https://tonyciencia.com)**

## Tecnología

| Componente | Tecnología |
|---|---|
| CMS | EmDash |
| Framework | Astro 6 |
| Runtime | Cloudflare Workers |
| Base de datos | Cloudflare D1 |
| Almacenamiento | Cloudflare R2 |
| Tipografía | Inter, JetBrains Mono |
| i18n | ES (default) + EN |

## Funcionalidades

- 📝 Blog bilingüe con soporte ES/EN
- 🔍 Búsqueda full-text
- 📡 RSS feed
- 🏷️ Categorías y tags
- 🎨 Modo oscuro/claro
- 📊 SEO metadata + JSON-LD (Schema.org)
- 📬 Plugin de formularios (contact forms)
- 🔔 Webhook notifier (n8n integration ready)
- 🗺️ Sitemap automático con soporte i18n
- ⚖️ Páginas legales completas (ES + EN)

## Estructura de Rutas

| Página | Ruta ES | Ruta EN |
|---|---|---|
| Home | `/` | `/en` |
| Blog | `/posts` | `/en/posts` |
| Post | `/posts/:slug` | `/en/posts/:slug` |
| Categoría | `/category/:slug` | `/en/category/:slug` |
| Tag | `/tag/:slug` | `/en/tag/:slug` |
| Búsqueda | `/search` | `/en/search` |
| Servicios | `/servicios` | `/en/services` |
| Recursos IA | `/recursos-ia` | `/en/resources` |
| Sobre mí | `/about` | `/en/about` |
| Contacto | `/contacto` | `/en/contact` |
| Legal | `/legal/:slug` | `/en/legal/:slug` |

## Desarrollo Local

```bash
pnpm install
pnpm extract:seed      # Solo una vez si necesitas re-extraer fuentes desde seed/seed.json
pnpm build:seed        # Ensambla seed/seed.json desde seed/base + content/posts
pnpm check:seo-i18n    # Verifica mappings críticos ES/EN y llms.txt
pnpm bootstrap        # Inicializa DB + aplica seed
pnpm dev              # Servidor de desarrollo
```

Admin UI: `http://localhost:4321/_emdash/admin`

## Despliegue

### Requisitos previos (primera vez)

```bash
# Crear la base de datos D1
wrangler d1 create tonyciencia-db
# → Copiar el database_id al wrangler.jsonc

# Crear el bucket R2
wrangler r2 bucket create tonyciencia-media
```

### Deploy automático (CI/CD)

El repositorio incluye GitHub Actions para deploy automático:

1. **Push a `main`** → despliega automáticamente a Cloudflare
2. **PR con cambios en `seed/base/`, `content/` o `scripts/build-seed.mjs`** → reconstruye y valida el seed automáticamente

#### Secrets necesarios en GitHub

| Secret | Descripción |
|---|---|
| `CF_API_TOKEN` | Token de Cloudflare con permisos Workers + D1 + R2 |

### Deploy manual

```bash
pnpm deploy           # Build + wrangler deploy
```

## Automatización de Contenido

El blog está preparado para automatización via n8n:

1. n8n genera el contenido con IA
2. Escribe posts bilingües en `content/posts/es/` y `content/posts/en/`
3. Abre una rama `content/n8n/<fecha>-<slug-es>` y luego un PR para revisión editorial
4. GitHub Actions reconstruye `seed/seed.json` y lo valida antes del merge
5. Al mergear a `main`, Cloudflare despliega el sitio y EmDash actualiza el contenido

Ver [`docs/blog-automation-pipeline.md`](docs/blog-automation-pipeline.md) para detalles.

## Licencia

Contenido © Tony Ciencia LLC. Todos los derechos reservados.

Tony Ciencia LLC — Registered in the U.S.
8206 Louisiana Blvd NE, Ste A #6812
Albuquerque, NM 87113 · New Mexico, USA
