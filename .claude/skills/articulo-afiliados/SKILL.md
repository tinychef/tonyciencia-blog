---
name: articulo-afiliados
description: Procedimiento para investigar, escribir y publicar (vía PR) un artículo SEO en español para el blog Tony Ciencia con enlaces de afiliado de la base real y enlaces internos al blog y a Market Tony. Úsala al pedir "escribe un artículo sobre X", "post con afiliados", "guía/comparativa de herramientas", "versión en inglés de un post", o al tocar content/posts/ con scripts/content/.
---

# Artículo SEO con afiliados — Tony Ciencia

Resultado: `content/posts/<locale>/<slug>.json` válido, en una rama `content/agent/<YYYY-MM-DD>-<slug>`, con un PR abierto
para revisión humana. **Nunca** se mergea ni se empuja a `main`.

Herramientas del repo (Node 22, sin dependencias):

| Comando | Para qué |
|---|---|
| `pnpm aff:find <texto>` · `--category <cat>` · `--list-categories` · `--json` | Ver qué afiliados existen (base real: `src/data/partners.generated.ts` + `content/affiliates/extra.json`) |
| `pnpm aff:find --check <url>` | ¿Esta URL es un enlace de afiliado válido de la base? |
| `pnpm post:new <borrador.md> [--force] [--pillar]` | Markdown con frontmatter → JSON exacto del post (y lo valida) |
| `pnpm post:check <post.json> [--pillar] [--online]` | Validador (sale ≠ 0 con errores) |
| `pnpm build:seed` · `pnpm check:seo-i18n` | Lo mismo que corre CI en el PR |

## Paso a paso

### a) Tema: intención de búsqueda × encaje de afiliados
1. Lista lo que ya existe para no canibalizar: `ls content/posts/es/` y lee títulos (`grep -h '"title"' content/posts/es/*.json`).
2. Revisa la base: `pnpm aff:find --list-categories` y `pnpm aff:find --category "<categoría>" --json`.
3. Elige un tema que cumpla las tres:
   - **Demanda real**: consulta comprobable (busca la keyword con WebSearch; mira qué rankea y qué preguntas aparecen).
     Prefiere intención comercial-investigativa ("mejores X para Y", "X vs Y", "cómo hacer Y con IA", "precio de X").
   - **Encaje**: 2+ partners de la base que de verdad resuelven el problema. Si ninguno encaja, el artículo va **sin**
     afiliados (está bien) o eliges otro tema. Nunca fuerces un partner.
   - **Puente propio** cuando sea genuino: Market Tony (`/market`, `/market/producto/specreel`,
     `/market/producto/anuncios-infinitos`; lee la ficha en vivo con WebFetch antes de citarla) y posts del blog.
4. Define: keyword principal, 4–8 secundarias, intención, lector (rol + problema), ángulo diferencial.

### b) Investigación con fuentes (obligatoria)
- Cada dato sobre una herramienta de terceros (precio, plan gratuito, límites, funciones, idiomas, fecha de lanzamiento)
  se verifica en el **sitio oficial** con WebFetch (página de precios, docs, changelog, nota de prensa). Anota URL + fecha.
- Estadísticas: fuente primaria (estudio, informe oficial). Si solo hay fuentes secundarias, dilo ("según X, citado por Y")
  o no lo uses. Si dos páginas oficiales se contradicen, no elijas una: dilo o quita el dato.
- Nada de "lo probé durante meses", capturas, benchmarks o citas de usuarios que no estén en una fuente o en notas del
  dueño. La voz es "revisamos", "según su página de precios (consultada el <fecha>)".
- Guarda las notas de investigación en el borrador como comentarios `<!-- fuente: URL · fecha · dato -->` (el conversor los descarta).

### c) Esquema
- H1 = `title` (no se escribe en el cuerpo). Cuerpo: 5–9 `##` y `###` donde haga falta.
- Primer H2 temprano con la **respuesta corta** (lista "si necesitas A → herramienta B") para lectores con prisa y para
  AI Overviews. Luego metodología breve, desarrollo, comparativa, flujo práctico, errores comunes, conclusión con CTA.
- Keyword principal en: title, excerpt, primer párrafo, un H2, slug. Secundarias repartidas en H2/H3 de forma natural.

### d) Redacción (Markdown con frontmatter)
Copia la plantilla `references/plantilla-articulo.md` a `.claude/drafts/<slug>.md` (carpeta ignorada por git; el JSON es lo que se versiona).
- Español neutro de LATAM, tuteo, frases cortas, párrafos ≤ 4 líneas, ejemplos concretos. Sin relleno ni frases de IA
  ("en el vertiginoso mundo de…", "sin lugar a dudas", "desbloquea", "potencia tu").
- **Aviso de afiliados** en los 3 primeros bloques, antes del primer enlace de afiliado (ver `references/politica-afiliados-y-fuentes.md`).
  Si recomiendas un producto propio (Market Tony), dilo también: "es un producto de Tony Ciencia".
- Enlaces de afiliado: copia la URL **exacta** de `pnpm aff:find`. Máximo 1 cada ~250 palabras, máximo 2 por partner,
  ancla descriptiva ("prueba Descript"), nunca en encabezados ni en el FAQ.
- Pros **y** contras reales de cada herramienta (límites del plan gratis, créditos, curva de aprendizaje, licencia).
- ≥ 2 enlaces internos (posts publicados en `content/posts/es`, landings, `/market/...`) y ≥ 2 fuentes externas oficiales.
- Precios: con moneda, periodo y fecha de consulta; aclara si es precio anual mensualizado o promo.
- FAQ en el frontmatter (`faq:` con `q`/`a`, 4–6 preguntas reales de búsqueda, respuestas de 2–4 frases sin enlaces).
  El conversor lo pone en `faq_items` (JSON-LD) **y** como sección visible "Preguntas frecuentes" donde pongas una línea
  `<!-- faq -->` (si no la pones, al final).
- Cierra con "Fuentes consultadas (<fecha>)": lista de enlaces oficiales (no de afiliado).

Markdown admitido: `##`, `###`, párrafos, listas `-` y `1.`, `>` cita, `**negrita**`, `*cursiva*`, `[texto](url)`.
No admitido: `# H1`, imágenes, tablas (usa listas con negritas), HTML, bloques de código.

### e) Convertir
```bash
pnpm post:new .claude/drafts/<slug>.md --pillar        # escribe content/posts/<locale>/<slug>.json y valida
```
`status: published` si el artículo está listo (el merge del PR es la aprobación; con `draft` no se ve en el sitio).
`featured_image`: solo URLs que existan (archivo en `public/` o URL comprobada). Si no hay imagen propia, omítelo y el
conversor usa `https://tonyciencia.com/assets/og-default.webp`. Deja `image_prompt` para que el dueño genere la portada.

### f) Validar y corregir hasta 0 errores
```bash
pnpm post:check content/posts/es/<slug>.json --pillar --online
```
Corrige el borrador y vuelve a convertir con `--force`. Los avisos (`!`) se revisan uno por uno: corrige o justifica en el PR.

### g) Checks del repo
```bash
pnpm build:seed        # reconstruye seed/seed.json (incluye tu post) — debe terminar sin error
pnpm check:seo-i18n
```
`pnpm typecheck` solo si tocaste `src/`.

### h) Rama, commit y PR (nunca merge)
```bash
git switch -c content/agent/$(date +%F)-<slug>
git add content/posts/es/<slug>.json seed/seed.json      # + el .json en inglés si lo hay
git commit -m "content: <título>"
git push -u origin HEAD
gh pr create --base main --title "content: <título>" --body-file <resumen.md>
```
Cuerpo del PR: keyword e intención, palabras, partners enlazados (con URL), enlaces internos, fuentes con fecha,
avisos del validador que quedan y por qué, datos a confirmar por el dueño, `image_prompt`. Si `gh` no está autenticado,
deja la rama empujada (o el commit local) y explica cómo abrir el PR. No uses `--admin`, no mergees, no empujes a `main`.

## Versión en inglés (solo si se pide)
Archivo aparte en `content/posts/en/<slug-en>.json`: `locale: en`, `translation_of: <slug-es>`, slug propio en inglés,
`external_id` distinto. Adapta (no traduzcas literal): keyword en inglés, ejemplos y precios en USD, aviso de afiliados en
inglés (enlace `/en/legal/affiliate`), enlaces internos a `/en/...` (las fichas de `/market` están en español: dilo o evítalas).

## Rúbrica de calidad (nivel Medium) — todo "sí" antes del PR
- [ ] **Gancho**: el primer párrafo nombra el problema del lector y promete algo concreto en ≤ 3 frases.
- [ ] **Respuesta rápida** arriba (lista escaneable) y desarrollo después.
- [ ] **Estructura escaneable**: H2 que se entienden solos, listas, negritas en la idea clave de cada sección.
- [ ] **Insight original**: un marco, criterio o error común que no está en los primeros 5 resultados de Google.
- [ ] **Ejemplos concretos**: un flujo o caso paso a paso con herramientas reales.
- [ ] **Honestidad**: contras reales, para quién NO es cada herramienta, alternativas gratis cuando existan.
- [ ] **Datos verificados** con fuente oficial y fecha; cero cifras, citas o pruebas inventadas.
- [ ] **FAQ** con 4–6 preguntas reales; **conclusión** con un siguiente paso claro (CTA) sin presión.
- [ ] Se lee bien en voz alta; sin muletillas de IA; tono de Tony Ciencia ("Implementa IA, Avanza": práctico, directo).

## Checklist SEO
- [ ] `title` ≤ 60 caracteres, con la keyword principal al inicio (máx. 70 o el validador falla).
- [ ] `excerpt` 140–160 caracteres (es la meta description): keyword + beneficio + gancho.
- [ ] `slug` corto, minúsculas, sin stopwords innecesarias, con la keyword (≤ 60 caracteres ideal).
- [ ] 5+ H2 descriptivos; H3 solo dentro de un H2; keyword o variante en al menos un H2.
- [ ] `featured_image.alt` descriptivo (qué muestra, no "imagen de…"); imagen existente.
- [ ] ≥ 2 enlaces internos con ancla descriptiva; ≥ 2 fuentes externas oficiales.
- [ ] `faq` 4–6 preguntas; `schema_type` (`BlogPosting`, `HowTo` para tutoriales paso a paso, `Article`).
- [ ] `key_entities`: herramientas, empresas y conceptos principales separados por comas.
- [ ] `keywords`: la principal primero, luego secundarias.
- [ ] `category`/`tag` existentes en `seed/base/site.json` (category: ia, automatizacion, negocios, herramientas; tag: n8n, chatgpt, tutorial, opinion, caso-de-uso).
- [ ] ≥ 1500 palabras en guías pilar (mínimo duro 1200 con `--pillar`).
