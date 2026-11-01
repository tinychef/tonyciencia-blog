# Auditoría SEO de Market Tony: 6 fichas y catálogo (propuesta, sin aplicar)

Fecha: 2026-11-01 · Autor: E-commerce Manager (agente) · Estado: **propuesta para aprobación del dueño**. No se tocó
código, D1, migraciones ni git.

## 0. Método y límites

- **Producción** leída el 2026-11-01 con `curl`: `/market/`, las 6 fichas, `/market/estado.json`, `/market/sitemap.xml`,
  `/market/feed.xml`, `/robots.txt` y los sitemaps del blog. Todo "actual" de este documento sale de ese HTML, no del seed
  (el dueño editó varias fichas en el admin).
- **Lighthouse 12.8.2 móvil** (throttling simulado, Chrome headless, 1 corrida por URL, desde un servidor en la nube a
  través de un proxy). Las cifras son orientativas, no sustituyen los datos de campo (CrUX) de Search Console.
- **Palabras clave**: autocompletado de Google en español (`hl=es`, `gl=mx`, más `co` y `es` para comparar) y revisión de
  qué páginas aparecen (WebSearch). **No tengo volúmenes de búsqueda**: no hay acceso a Search Console, Keyword Planner
  ni a una herramienta de volúmenes. Que una frase aparezca en el autocompletado indica que la gente la escribe, no cuánto.
- **Verificación de afirmaciones**: los textos propuestos solo usan datos que ya están en la ficha actual o en el
  repositorio del producto (`/home/user/specreel`, `specreel-stick`, `pagespeed-forensics`, `estudio-video` = CutPilot,
  `artcraft-studio-engine` = Motor creativo). Anuncios Infinitos no tiene repositorio clonado: sus textos salen solo de
  la ficha actual.
- `node scripts/audit-catalog.mjs` ya pasa sin errores: este informe cubre lo que ese script no revisa.

## 1. Lo más importante, ordenado por impacto

| # | Hallazgo | Dónde | Impacto | Esfuerzo | Se arregla en |
|---|---|---|---|---|---|
| 1 | **CutPilot dice "Lista de espera."** en meta descripción, `og:description`, `twitter:description` y JSON-LD, aunque está **Disponible** | CutPilot | Alto (dato falso en el snippet, baja el CTR) | 1 campo | Admin o migración con guarda |
| 2 | **SpecReel tiene 1457 palabras en inglés** antes de la versión en español (857). Página `lang="es"`, contenido duplicado en dos idiomas y la política de reembolso en inglés contradice la del market | SpecReel | Alto | Editar descripción | Admin |
| 3 | **Anuncios Infinitos se contradice**: arriba dice "2 en 1: Agente + Extensión de Chrome" (columna `compat`, migración 0007) y la descripción responde "¿Incluye una extensión de Chrome? No". Además repite "Preguntas frecuentes" dos veces | Anuncios | Alto (confianza y regla "nada inventado") | 2 campos | Admin (tras confirmar con el dueño) |
| 4 | **Motor creativo no recibe ningún enlace desde otras fichas**; PageSpeed recibe 1 y CutPilot 2 (el bloque "Completa tu kit" siempre elige los mismos) | Todas | Alto (rastreo y autoridad interna) | Pequeño | Código (`routes/shop.tsx`) |
| 5 | **Los "paga lo que quieras" publican `price: 0.00`**: Google exige precio > 0 para fichas de comerciante, así que PageSpeed Forensics y Motor creativo no pueden salir con precio en Shopping/fichas de comerciante | PageSpeed, Motor | Medio-alto | Decisión de negocio | Admin (mínimo) o nada |
| 6 | **El `<title>` real mide 61–73 caracteres** (meta título + " \| Market Tony"); el audit solo mide el meta título | Todas + catálogo | Medio | Pequeño | Código (`layout`/`routes`) + textos |
| 7 | **Palabra clave principal ausente o débil** en títulos y H1 (catálogo sin "Claude Code"; Anuncios sin "anuncios publicitarios"; Stick sin "palitos"; Motor con "docs") | Varias | Medio | Textos | Admin / migración |
| 8 | **Nombre del producto en JSON-LD y feed = meta título** (sin marca: "Videos de muñequitos de palo…", "Agentes de Claude Code para…") | Todas | Medio | Pequeño | Código (`services/seo.ts`) |
| 9 | **Blog ↔ market casi sin enlaces**: 1 de 17 posts enlaza a fichas (SpecReel y Anuncios); ninguna ficha enlaza a una guía del blog | Blog + fichas | Medio | Contenido | Agente de contenido + código |
| 10 | **Sitemap del blog**: `robots.txt` declara `sitemap-index.xml`, que **no lista ningún post**; los posts están en `sitemap-posts.xml` (solo enlazado desde `/sitemap.xml`) | Blog | Medio (todas las publicaciones) | Pequeño | Código del blog |
| 11 | La descripción convierte `## ` en `<h2>` dentro de la sección `<h2>Descripción</h2>`: jerarquía plana (hasta 25 H2 en SpecReel) | Todas | Bajo-medio | Pequeño | Código (`views/render.tsx`) |
| 12 | Categorías como `/market/?categoria=…` (canonical a `/market`): no hay páginas de categoría indexables y el BreadcrumbList apunta a URLs no canónicas | Catálogo | Medio (largo plazo) | Medio | Código (nuevo) |
| 13 | Imágenes: portadas de 1600 px servidas en huecos de 800 px; galerías subidas por el admin en PNG 1280×720 declaradas como 1600×1000; estáticos con `max-age=0` | Todas | Bajo-medio | Medio | Código + reexportar imágenes |
| 14 | FAQPage: Google dejó de mostrar ese resultado enriquecido el 7 de mayo de 2026; `Store` debería ser `OnlineStore` | Todas | Bajo | Pequeño | Código |

## 2. Hallazgos transversales (código; afectan a todas las fichas)

### T1. `<title>` más largo de lo que mide la auditoría

`routes/shop.tsx` arma `fullTitle = "${seoTitle} | Market Tony"`. Con meta títulos de 48–59 caracteres el `<title>`
queda en 61–73. Google no fija un máximo en caracteres (corta por ancho), pero en la práctica corta cerca de 60 y lo
que se pierde es la cola, que en varias fichas es la palabra clave ("…para PageSpeed | Market Tony").

| Actual | Propuesto | Por qué |
|---|---|---|
| Siempre `meta_title + " \| Market Tony"` | Agregar el sufijo solo si el total cabe en 60; si no, usar el meta título solo | El nombre del sitio ya lo muestra Google aparte (nombre de sitio del dominio); el espacio es mejor para la búsqueda |
| `audit-catalog.mjs` quita el sufijo antes de medir | Medir el `<title>` completo (avisar si > 60) | Que el audit refleje lo que ve Google |
| `og:title`/`twitter:title` del catálogo = "Market Tony" (11) | Igual al `<title>` propuesto sin sufijo | Al compartir en redes se ve solo "Market Tony", sin decir qué vende |

### T2. Nombre del producto en datos estructurados y feed

| Actual | Propuesto | Por qué |
|---|---|---|
| `Product.name` y `<title>` del feed = `seoTitle(p)` (meta título) | `Product.name` y título del feed = `p.title` (el H1, ≤ 70, con la marca del producto) | Coherencia H1 ↔ datos estructurados ↔ Merchant Center. Hoy el feed lista "Videos de muñequitos de palo con Claude Code y Codex" sin "SpecReel Stick", y el JSON-LD de Anuncios no dice "Anuncios Infinitos" |

### T3. "Paga lo que quieras" con mínimo $0 y fichas de comerciante

La documentación de Google para fichas de comerciante dice: *"merchant listing experiences require a price greater
than zero"* y, si hay `offers.price` y `offers.priceSpecification`, *"Google will use the price provided through the
`offers.price` property and ignore the `offers.priceSpecification` property"*. PageSpeed Forensics y Motor creativo
publican `price: "0.00"` (el mínimo real), así que **no son elegibles** para fichas de comerciante; el feed ya los excluye.

| Actual | Opciones | Recomendación |
|---|---|---|
| `price: 0.00` + `priceSpecification` (mín 0, sugerido, máx) | (a) Dejarlo: es honesto, no publicar un precio que no se cobra. (b) Que el dueño suba el mínimo a ≥ $0.50 y entonces sí entran al feed y a fichas de comerciante | **(a) por defecto**: el atractivo de "desde $0" vale más que la ficha de comerciante. Es decisión del dueño (pregunta 1). **No** poner el sugerido como `price`: sería un precio que no se cobra |

### T4. Enlazado interno entre fichas ("Completa tu kit")

Hoy: misma categoría primero y luego el resto en orden fijo. Resultado medido en producción (enlaces entrantes desde
las otras 5 fichas):

| Ficha | Entrantes hoy | Con la propuesta |
|---|---|---|
| Anuncios Infinitos | 5 | 2 |
| SpecReel | 5 | 4 |
| SpecReel Stick | 5 | 4 |
| PageSpeed Forensics | 1 | 3 |
| CutPilot | 2 | 3 |
| **Motor creativo** | **0** (solo desde el catálogo) | 2 |

Propuesta: hasta 2 de la misma categoría y el resto **siguiendo el orden del catálogo de forma circular** desde la
ficha actual (sin repetir). Con el catálogo de hoy quedaría:

| Ficha | Relacionados propuestos |
|---|---|
| Anuncios Infinitos | SpecReel, SpecReel Stick, PageSpeed Forensics |
| SpecReel | SpecReel Stick, CutPilot, PageSpeed Forensics |
| SpecReel Stick | SpecReel, CutPilot, PageSpeed Forensics |
| PageSpeed Forensics | CutPilot, Motor creativo, Anuncios Infinitos |
| CutPilot | SpecReel, SpecReel Stick, Motor creativo |
| Motor creativo | Anuncios Infinitos, SpecReel, SpecReel Stick |

Alternativa más flexible: columna `related` editable en el admin.

### T5. Jerarquía de encabezados de la descripción

`views/render.tsx` convierte `## Título` en `<h2>` y la ficha ya envuelve todo en `<h2>Descripción</h2>`. Propuesta:
renderizar `## ` como `<h3>` (y aceptar `### ` como `<h4>`), y cambiar el rótulo "Descripción" por
"Qué es {nombre corto}" (por ejemplo "Qué es CutPilot"). Así el H2 lleva el nombre del producto y las secciones
quedan anidadas. No cambia el texto que escribe el dueño.

### T6. Datos estructurados frente a la documentación de Google

| Actual | Propuesto | Por qué |
|---|---|---|
| `FAQPage` en catálogo y fichas | Quitar el JSON-LD `FAQPage` (mantener la FAQ visible) | Google dejó de mostrar el resultado enriquecido de FAQ el 7 de mayo de 2026 y retiró su documentación en junio. No penaliza, pero ya no aporta en Google; es peso muerto. Bajo impacto: si se prefiere conservarlo para otros buscadores, no hace daño |
| `@type: "Store"` en el catálogo | `@type: "OnlineStore"` con `logo`, `sameAs` (YouTube, Instagram, X que ya están en el pie) | `Store` es un subtipo de negocio local (tienda física). Google recomienda `OnlineStore` para comercio electrónico |
| `hasMerchantReturnPolicy` y `shippingDetails` repetidos en cada oferta, solo para `US` | Política global en el `OnlineStore` (Google lo recomienda bajo `Organization`) con los países donde realmente vendes; dejar en la oferta solo lo que cambie | Menos repetición; hoy el JSON-LD dice que solo se vende/devuelve en EE. UU., y el público es hispanohablante de varios países (pregunta 5) |
| `ItemList` en el catálogo | Mantener | Válido, pero Google no muestra carrusel de `ItemList` para productos (solo cursos, películas, recetas y restaurantes): no esperar resultado enriquecido |
| `priceValidUntil` = 31-dic del año siguiente cuando hay oferta | Usar la fecha real de fin de la oferta si existe; si no existe, se puede quitar (es opcional) | Evitar una fecha que nadie decidió (pregunta 3) |
| `BreadcrumbList` nivel 2 = `/market/?categoria=video` (canonical `/market`) | Apuntar a páginas de categoría reales (T7) | Las migas deberían llevar a URLs canónicas |
| `og:locale = es_ES` | `es_LA` si el público principal es Latinoamérica (Facebook lo admite) | Menor; Google no lo usa |
| hreflang | No aplica: el market solo existe en español (`/en/market` da 404). No agregar hasta que haya versión en inglés | La mezcla de idiomas de SpecReel se arregla quitando el bloque en inglés (ficha SpecReel) |

### T7. Páginas de categoría indexables (propuesta para un PR aparte)

Hoy las categorías son filtros `?categoria=` que canonicalizan a `/market`: Google no puede posicionar "Video con IA"
como página. Propuesta: `/market/categoria/video-con-ia`, `/market/categoria/publicidad-con-ia`,
`/market/categoria/seo-y-velocidad-web`, `/market/categoria/agentes-de-ia`, cada una con H1, 1 párrafo propio, sus
productos, `ItemList`, canonical propio y en el sitemap. La de video sería el destino natural de la búsqueda genérica
"crear videos con Claude Code" y quita presión de canibalización a las 3 fichas de video. Las etiquetas de las fichas
(hoy enlaces a `?q=`) podrían enlazar a estas páginas.

### T8. Imágenes y caché

| Actual | Propuesto | Por qué |
|---|---|---|
| Portadas `cover.webp` de 1600×1000 en tarjetas de 800×500 (Lighthouse: 40–60 KiB de más por portada) | `srcset` con una variante de 800 px generada por `pnpm render:covers` | Menos bytes en móvil, sobre todo en el catálogo |
| Galerías subidas por el admin (Anuncios: 5 PNG; SpecReel: 2 PNG) **de 1280×720 (16:9) declaradas `width=1600 height=1000` (16:10)** y recortadas con `object-fit: cover` | Reexportar a 1600×1000 WebP, o que el admin convierta a WebP y guarde las medidas reales | Formato (Lighthouse estima 112–145 KiB menos por ficha), proporción correcta y sin recorte de bordes |
| `/market/media/images/*` con `max-age=86400` | 30 días o más (y `immutable` si la ruta cambia cuando cambia la imagen) | Visitas repetidas |
| Estáticos (`market.css?v=5`, `market.js?v=5`, portadas) con `cache-control: public, max-age=0, must-revalidate` | Archivo `_headers` de assets: CSS/JS versionados `max-age=31536000, immutable`; portadas 7 días | Cada visita repetida revalida todo |

### T9. Consola y Cloudflare

En todas las páginas hay un error de consola: el script en línea que inyecta Cloudflare (`window.__CF$cv$params`, de
"JavaScript detections"/Bot Fight Mode) lo bloquea la CSP del Worker. No afecta el ranking, pero baja "Prácticas
recomendadas" a 93 y ese script no hace nada útil si la CSP lo bloquea. Propuesta: desactivar esa función para
`/market/*` en el panel de Cloudflare (no es cambio de código; pregunta 8).

## 3. Ficha por ficha (ordenadas por impacto)

### 3.1 CutPilot (`/market/producto/cutpilot`)

**Intención y palabras clave.** El autocompletado muestra "editar videos con claude code", "editor de videos con claude
code", "crear videos con claude code", "quitar muletillas de un video", "eliminar silencios de un video". En los
resultados para "editar videos con Claude Code" salen tutoriales y artículos (blog.laozhang.ai en español, tododeia,
opus.pro, chatcut): intención mixta informativa/comercial, donde una ficha de producto sí puede competir. Las búsquedas
de "cortar silencios"/"subtítulos automáticos" están dominadas por CapCut, Premiere y DaVinci (tutoriales): mejor como
secundarias.
- Principal: **editar videos con Claude Code**.
- Secundarias: quitar muletillas de un video · eliminar silencios de un video · subtítulos automáticos en español ·
  video vertical 9:16.

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| Meta descripción (157) | "Edita videos hablados en español con Claude Code: quita muletillas y silencios, agrega subtítulos y gráficos y exporta en 16:9, 9:16 y 1:1. **Lista de espera.**" | "Edita en tu PC videos hablados en español con Claude Code: quita muletillas, silencios y retomas, agrega subtítulos y gráficos y exporta en 16:9, 9:16 y 1:1." (157) | **Dato falso**: el producto está Disponible desde la migración 0006. Se repite en og, twitter y JSON-LD. "Retomas" y "en tu PC" salen de la ficha y del README |
| Meta título (48) → `<title>` 62 | "Edita videos con Claude Code en local — CutPilot" | "CutPilot: edita videos con Claude Code y quita muletillas" (57) | Agrega la secundaria más buscada y la marca al inicio |
| H1 | "CutPilot: edita tus videos hablados con Claude Code, en tu PC" | Sin cambio | Ya tiene marca + principal + diferencial (local) |
| Etiquetas | incluye "editar videos con Whisper", "editar videos con Remotion" | "editar videos con Claude Code", "quitar muletillas de un video", "eliminar silencios de un video", "subtítulos automáticos en español", "editor de video local con IA", "video vertical 9:16 automático" | Whisper/Remotion son nombres técnicos con poca intención de compra |
| H2 "Descripción" | genérico | "Qué es CutPilot" (T5) | |
| Enlaces entrantes | 2 fichas | 3 (T4) + post del blog "FocuSee: edita videos de pantalla con IA" (§5) | |
| Lighthouse móvil | Rendimiento 100 · LCP 1,5 s · CLS 0 | Sin acción propia (T8) | |

### 3.2 SpecReel (`/market/producto/specreel`)

**Intención y palabras clave.** Autocompletado: "crear videos con claude code", "videos explicativos con ia", "crear
video explicativo con ia", "video de producto con ia", "videos 3d con ia". En "crear videos con Claude Code" salen
tutoriales de Remotion + Claude Code (OpenReplay en español, Tella, repos de GitHub). SpecReel usa su propio motor 3D
(Three.js), no Remotion: no conviene prometer "Remotion".
- Principal: **crear videos explicativos 3D con Claude Code**.
- Secundarias: video de producto con IA · video explicativo con IA · videos con Codex · subtítulos karaoke.

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| Descripción | 1457 palabras **en inglés** ("Ask for a video. Get a finished MP4.", "What's inside", FAQ y reembolso en inglés) y después "Descripción en español" (857) | Dejar solo la versión en español (empieza en "SpecReel es una skill para Claude Code y Codex…") y quitar su propia sección "Política de reembolso" (la ficha ya enlaza la política del market) | Página `lang="es"` con dos idiomas y el mismo contenido duplicado; el primer párrafo que ven Google y el comprador está en inglés. DOM de 3068 a ≈1600 palabras: es la ficha más lenta (Lighthouse 88, LCP 2,9 s, TBT 300 ms). Además el bloque en inglés ofrece una garantía distinta ("funciona o te devolvemos") y otro correo (`contact@`) que la política del market (`business@`, reembolso si no se descargó) — pregunta 4 |
| Meta título (48) → `<title>` 62 | "SpecReel: crea videos 3D con Claude Code y Codex" | "SpecReel: videos explicativos 3D con Claude Code y Codex" (56) | "Explicativos" es la intención que aparece en el autocompletado; coincide con el H1 |
| Meta descripción (152) | "Skill para Claude Code y Codex que convierte cualquier tema en un video 3D narrado, con subtítulos, música y cámara de cine. Corre en tu PC. Pago único." | "Skill para Claude Code y Codex que convierte cualquier tema en un video explicativo o de producto 3D narrado, con subtítulos, música y cámara de cine. En tu PC." (160) | Agrega las dos secundarias; "Pago único" ya lo dicen precio y oferta |
| H1 | "SpecReel: videos 3D explicativos y de producto con Claude Code y Codex" | Sin cambio | Correcto (69) |
| Etiquetas | "videos con Claude Code" (también en Stick) … | "crear videos con Claude Code", "videos explicativos con IA", "video de producto con IA", "videos 3D con IA", "videos con Codex", "subtítulos karaoke" | SpecReel se queda con la frase genérica de video; Stick la suelta (canibalización, §4) |
| Galería (2 PNG del admin) | PNG 1280×720 declarados 1600×1000 | WebP 1600×1000 (T8) | 145 KiB menos estimados |
| Precio tachado | $36.90 → $12 | Sin cambio si se confirma (pregunta 3) | Regla: solo tachar un precio cobrado de verdad |

### 3.3 Anuncios Infinitos (`/market/producto/anuncios-infinitos`)

**Intención y palabras clave.** Autocompletado: "prompts para anuncios publicitarios" (primera sugerencia en MX y ES),
"prompts para crear anuncios", "prompts para generar anuncios publicitarios", "biblioteca de prompts para anuncios",
"prompts para meta ads", "prompts para facebook ads". Lo que aparece: listas informativas ("18 prompts para Meta Ads",
felipevergara.co; "20 mejores prompts…", cyberclick.es; curso de Platzi) y packs de pago (Gumroad). "Generador de
anuncios con IA" también existe, pero el producto **no genera imágenes** (lo dice su FAQ): no usar esa frase.
- Principal: **prompts para anuncios publicitarios**.
- Secundarias: prompts para Meta Ads / Facebook Ads · biblioteca de prompts para anuncios · anuncios con IA en español.

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| Columna `compat` → "2 en 1: Agente de anuncios + **Extensión de Chrome**" | Contradice la FAQ de la descripción ("¿Incluye una extensión de Chrome? No.") y "Qué trae el ZIP" (agente, app local, 3 guías) | Quitar `chrome-ext` de `includes` si el ZIP no la trae (o corregir la FAQ si sí la trae) | Regla "nada inventado"; es lo primero que ve el comprador bajo el precio (pregunta 2) |
| Descripción | Termina con su propia "Preguntas frecuentes" (7) + "In English: …"; la ficha además tiene la FAQ estructurada (5) → **dos H2 "Preguntas frecuentes"** | Pasar las 2 preguntas que solo están en la descripción ("¿Incluye una extensión de Chrome?" y "¿Qué herramientas de IA necesito?") a la FAQ de la ficha y borrar el bloque de la descripción y la línea en inglés | Contenido duplicado y encabezado repetido |
| Meta título (59) → `<title>` 73 | "Prompts de anuncios con IA: 250+ para Meta, Google y TikTok" | "Prompts para anuncios publicitarios con IA: 250+ en español" (59) | Usa la frase exacta del autocompletado; "en español" es el diferencial frente a las listas en inglés/portugués |
| Meta descripción (153) | "Agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts de anuncios para Meta, Google, TikTok y LinkedIn. Pago único." | "Agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts para anuncios publicitarios en Meta Ads, Google, TikTok y LinkedIn." (159) | Principal + "Meta Ads" |
| H1 (61) | "Anuncios Infinitos: agente de IA con 250+ prompts de anuncios" | "Anuncios Infinitos: 250+ prompts para anuncios publicitarios con IA" (67) | Principal en el H1, que también es el nombre en tarjetas y migas |
| ALT galería (admin) | "El problema: hacer anuncios de uno en uno" · "Lo que hace diferente a Anuncios Infinitos" · "Qué recibes con Anuncios Infinitos" · "Cómo funciona Anuncios Infinitos" | "«Son las 11 p. m. y sigues en Canva»: hacer anuncios de uno en uno no es una estrategia" · "«No es una IA que hace imágenes bonitas»: decide qué anunciar, a quién y por qué, y después escribe los prompts" · "Primera sesión: 250+ prompts de anuncios, 2 a 4 perfiles de cliente ideal, 26 categorías de anuncio y 37 formatos visuales" · "Cómo funciona en 4 pasos: abres la carpeta de Tony, escribes /ads, conversas de 20 a 40 minutos y recibes perfiles, prompts, textos y estrategia" | Describen lo que dice cada imagen (las revisé una por una) en vez de un rótulo genérico |
| Etiquetas | "prompts de anuncios", "anuncios con IA", "Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "agente de IA en español" | "prompts para anuncios publicitarios", "prompts para Meta Ads", "prompts para Facebook Ads", "prompts para Google Ads", "biblioteca de prompts para anuncios", "anuncios con IA", "agente de IA en español" | Frases que aparecen en el autocompletado |
| Imagen "Qué recibes" | Dice "…y plan de 6 meses" como incluido | La descripción dice "Si lo pides: tu plan de ataque de 6 meses" | Detalle a alinear cuando se rehaga la imagen (bajo) |
| Galería | 5 PNG 1280×720 declarados 1600×1000, caché de 1 día | WebP 1600×1000 (T8) | 205 KiB menos estimados; la ficha pesa 494 KiB (la más pesada) |
| Precio tachado | $76.90 → $33.33 | Sin cambio si se confirma (pregunta 3) | |

### 3.4 SpecReel Stick (`/market/producto/specreel-stick`)

**Intención y palabras clave.** "Muñequitos de palo" en el autocompletado (MX y CO) es sobre dibujos y memes. Para
video aparecen "videos de palitos animados", "videos de muñecos de palitos", "monitos de palitos" (México); en inglés,
"stick figure animation ai" tiene muchas variantes. Lo que aparece en resultados: generadores en la nube (Kling AI,
HitPaw) y tutoriales de YouTube (ChatGPT + Hailuo + CapCut). El diferencial honesto de Stick: corre en tu PC, con tu
agente, y entrega el MP4 con subtítulos y música.
- Principal: **videos de palitos animados** (y la variante "muñequitos de palo animados").
- Secundarias: monitos de palitos · stick figure · sketches animados para Reels y TikTok · videos sin voz con subtítulos.

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| Meta título (52) → `<title>` 66 | "Videos de muñequitos de palo con Claude Code y Codex" | "SpecReel Stick: videos de palitos animados con Claude Code" (58) | Marca al inicio (se distingue de SpecReel) y la variante con más sugerencias de video |
| Meta descripción (152) | "SpecReel Stick: skill para Claude Code y Codex que crea sketches de muñequitos de palo en MP4, con subtítulos, música y efectos. Corre en tu computador." | "Skill para Claude Code y Codex que crea sketches de muñequitos de palo (monitos de palitos) en MP4 vertical, con subtítulos, música y efectos. Corre en tu PC." (158) | Suma la variante mexicana; "vertical" sale del README (9:16 por defecto; también 1:1, 4:5 y 16:9 según la SKILL.md) |
| H1 (68) | "SpecReel Stick: videos de muñequitos de palo con Claude Code y Codex" | "SpecReel Stick: videos animados de muñequitos de palo con Claude Code" (69) | "Animados" separa la intención de video de la de dibujo; quitar "y Codex" para caber (Codex sigue en meta, ficha técnica y logos) |
| ALT portada | "…tres fotogramas reales de un sketch de muñequitos de palo en formato vertical 9:16" | "SpecReel Stick: tres fotogramas reales de un sketch animado de muñequitos de palo (palitos) en formato vertical 9:16" | Variante "palitos" en el ALT |
| Etiquetas | incluye "videos con Claude Code", "videos con Codex", "animación de stick figures" | "videos de palitos animados", "muñequitos de palo animados", "monitos de palitos", "animación stick figure", "sketches animados para Reels y TikTok", "videos sin voz con subtítulos", "reels animados de hábitos" | Quitar "videos con Claude Code/Codex" (los toma SpecReel, §4) |
| Lighthouse móvil | Rendimiento 100 · LCP 1,3 s | Sin acción propia | |

### 3.5 PageSpeed Forensics (`/market/producto/pagespeed-forensics`)

**Intención y palabras clave.** El autocompletado de "pagespeed" es casi todo navegacional hacia la herramienta de
Google ("pagespeed insights", "pagespeed test") — no se compite ahí. Sí aparecen "pagespeed insights 100", "pagespeed
100" y "pagespeed api key"/"pagespeed api" (la skill lee PageSpeed Insights **sin llave de API**, según su README y su
FAQ). Para "por qué PageSpeed móvil es más bajo que escritorio" salen foros y ayudas (Shopify, Vercel, WP Rocket,
Indie Hackers): intención informativa → buen tema para una guía del blog que enlace a la ficha (§5).
- Principal: **mejorar PageSpeed móvil con Claude Code**.
- Secundarias: PageSpeed Insights 100 · PageSpeed sin API key · Core Web Vitals / LCP móvil · skill para Claude Code.

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| Meta título (56) → `<title>` 70 | "PageSpeed Forensics: skill de Claude Code para PageSpeed" | "Mejorar PageSpeed móvil con Claude Code: PageSpeed Forensics" (60; con T1 no se agrega sufijo) | La palabra "móvil" y el verbo de la intención quedan dentro del corte. **No** usar "a 100": la FAQ dice que no garantiza 100 |
| Meta descripción (158) | "Skill para Claude Code que encuentra con evidencia por qué tu web no pasa de 85–90 en PageSpeed móvil: red de laboratorio, trazas, Lighthouse y prueba visual." | "Skill de Claude Code que muestra con evidencia por qué tu web no pasa de 85–90 en PageSpeed móvil y prueba arreglos sin recompilar. Tú pones el precio." (151) | "Tú pones el precio" es cierto (paga lo que quieras desde $0) y es el mayor gancho de CTR; "prueba arreglos sin recompilar" sale del tagline y del README. Si el dueño cambia el mínimo, revisar esta frase |
| H1 (62) | "PageSpeed Forensics: skill de Claude Code para PageSpeed móvil" | "PageSpeed Forensics: skill de Claude Code para mejorar PageSpeed móvil" (70) | Verbo de la intención en el H1 |
| ALT portada | "…traza que muestra 2067 ms sin cuadros antes de la primera pintura, marcada FROZEN" | "PageSpeed Forensics para PageSpeed móvil: traza con 2067 ms sin cuadros antes de la primera pintura (FROZEN)" | Añade el contexto de búsqueda sin cambiar lo que muestra |
| Etiquetas | 7, incluye "optimizar Next.js para PageSpeed" | "mejorar PageSpeed móvil", "PageSpeed Insights 100", "PageSpeed Insights sin API key", "optimizar Core Web Vitals", "LCP lento en móvil", "skill para Claude Code", "subir puntaje de Lighthouse" | Next.js es una nota menor de la ficha ("para otros stacks, el consejo es general") |
| JSON-LD | `price: 0.00` | Ver T3 (pregunta 1) | |
| Enlaces entrantes | 1 ficha | 3 (T4) + guía del blog (§5) | |
| Idioma | La FAQ ya avisa que la skill y los scripts están en inglés | Sin cambio | Correcto y honesto |

### 3.6 Motor creativo para Claude Code (`/market/producto/motor-creativo-claude-code`)

**Intención y palabras clave.** El nombre "motor creativo" en el autocompletado se asocia a **Minecraft** ("motor
creativo create mod", "crafteo") y a un libro: el nombre comercial no trae búsquedas útiles, así que el título debe ir
por la función. Aparecen "agentes claude code", "agentes para claude code", "claude code para diseño grafico", "skills
claude code diseño", "claude code mcp" (con variantes figma, blender…), "subagentes claude code". En resultados salen
guías de Claude Code + MCP para diseño (open-design.ai, DataCamp en español, mejba.me) centradas en Figma: el ángulo
"13 apps open source de escritorio, en español" no aparece cubierto.
- Principal: **agentes de Claude Code para diseño gráfico**.
- Secundarias: subagentes de Claude Code · Claude Code MCP · skills de Claude Code para diseño · editar PDF con Claude Code.

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| Enlaces entrantes | **0 fichas** | 2 (T4) + post "n8n y MCP…" del blog (§5) | Hoy solo se llega desde el catálogo |
| Meta título (47) → `<title>` 61 | "Agentes de Claude Code para diseño, video y PDF" | "Agentes de Claude Code para diseño gráfico, video y PDF" (55) | "Diseño gráfico" es la frase del autocompletado |
| Meta descripción (152) | "13 agentes de Claude Code en español que operan apps open source de diseño, video, audio, PDF y oficina vía MCP. Router, panel local y QA. Para Windows." | "13 subagentes de Claude Code en español que operan apps open source de diseño gráfico, video, audio, PDF y oficina vía MCP. Para Windows. Paga lo que quieras." (158) | "Subagentes" (término de Claude Code) + CTA de precio cierta (mínimo $0). "Para Windows" se mantiene: es la limitación principal |
| H1 (68) | "Motor creativo para Claude Code: 13 agentes para diseño, video y docs" | "Motor creativo: 13 agentes de Claude Code para diseño, video y PDF" (66) | "Docs" es anglicismo ambiguo; "PDF" es lo que la gente busca y sale de la ficha |
| Etiquetas | "agentes de Claude Code para diseño", … | "agentes para Claude Code", "Claude Code para diseño gráfico", "subagentes de Claude Code", "servidores MCP para diseño y video", "skills de Claude Code para diseño", "editar PDF con Claude Code", "apps open source de diseño con IA" | Variantes del autocompletado |
| JSON-LD | `price: 0.00` | Ver T3 | |

## 4. Canibalización: SpecReel, SpecReel Stick y CutPilot

Los tres títulos repiten "con Claude Code (y Codex)" y SpecReel y Stick comparten la etiqueta "videos con Claude Code".
Las búsquedas sí son distintas (3D explicativo / palitos / editar video hablado), así que el riesgo es moderado y está
en la frase genérica "crear videos con Claude Code".

| Frase | Página dueña | Las otras |
|---|---|---|
| crear videos con Claude Code (genérica) | Página de categoría "Video con IA" (T7) o, mientras no exista, SpecReel; mejor aún una guía del blog que enlace a las 3 | No usarla en título ni etiquetas |
| videos explicativos / de producto 3D con IA | SpecReel | — |
| videos de palitos animados / muñequitos de palo | SpecReel Stick | SpecReel ya aclara en su FAQ que Stick es otro producto (bien) |
| editar videos con Claude Code / quitar muletillas | CutPilot | — |

Además, cada ficha debería tener una frase que diga para qué **no** es y enlace a la hermana (Stick ya lo hace con
SpecReel en su FAQ; falta en SpecReel → Stick/CutPilot y en CutPilot → SpecReel: "CutPilot edita video grabado; para
crear un video animado desde cero, mira SpecReel").

## 5. Enlazado blog ↔ market

Hoy: el menú y la cabecera del blog enlazan a `/market`; de 17 posts en español solo
"Herramientas de IA para videos de marketing: guía 2026" enlaza a fichas (SpecReel y Anuncios Infinitos). Las páginas
`/herramientas/` y `/recursos-ia/` no enlazan a ningún producto. Ninguna ficha enlaza a una guía del blog.

Propuesta (la ejecuta el agente de contenido por PR, solo donde el texto del post lo justifique):

| Post o página del blog | Enlazar a | Ancla sugerida |
|---|---|---|
| herramientas-ia-videos-marketing-2026 (ya enlaza SpecReel y Anuncios) | SpecReel Stick, CutPilot | "videos de palitos animados", "editar videos con Claude Code" |
| focusee-grabador-pantalla-ia | CutPilot | "quitar muletillas y silencios en tu PC" |
| first-party-data-meta-ads…, click-to-whatsapp-ads…, demand-gen…, google-ai-max-ads… | Anuncios Infinitos | "prompts para anuncios publicitarios" |
| seo-2026-ai-overviews-contenido-citable | PageSpeed Forensics | "mejorar PageSpeed móvil" |
| n8n-mcp-actualizacion-protocolo-contexto-modelo-2025 | Motor creativo | "agentes de Claude Code con MCP" |
| `/herramientas/`, `/recursos-ia/` | Las 6 fichas o las páginas de categoría | Nombre del producto |

Contenido nuevo sugerido (2 guías, para que las fichas tengan un "hub" informativo): "Cómo crear y editar videos con
Claude Code" (enlaza SpecReel, Stick y CutPilot) y "Por qué PageSpeed móvil da menos que escritorio" (enlaza PageSpeed
Forensics). En las fichas, un bloque "Guías relacionadas" con 1–2 posts (código: columna o mapa por categoría).

## 6. Catálogo `/market/`

| Campo | Actual | Propuesto | Por qué |
|---|---|---|---|
| `<title>` (73) | "Market Tony: agentes de IA, skills y plantillas en español — Tony Ciencia" | "Skills y agentes para Claude Code en español \| Market Tony" (58) | Las 6 fichas funcionan con Claude Code ("skills claude code" y "agentes claude code" están en el autocompletado); ya no hay plantillas a la venta (se retiraron Kit n8n y Carruseles) |
| Meta descripción (142) | "Herramientas de IA en español para crear anuncios, videos 3D y automatizaciones con Claude Code, Codex y **n8n**. Pago único y descarga inmediata." | "Skills y agentes de IA en español para Claude Code y Codex: prompts de anuncios, videos 3D, edición de video, PageSpeed y diseño. Pago único." (141) | **Ningún producto activo usa n8n** (el kit se retiró en la migración 0008). La nueva nombra lo que hay |
| H1 | "Herramientas de IA que trabajan por ti" | "Skills y agentes de IA para Claude Code, <span>que trabajan por ti</span>" | El H1 no tenía ninguna palabra que alguien busque; se conserva el remate de marca |
| Bajada (`mk-lead`) | "Agentes, skills y plantillas en español para anuncios, video, SEO y automatización…" | "Agentes y skills en español para Claude Code y Codex: anuncios, video, PageSpeed y diseño. Pago único o paga lo que quieras, con descarga inmediata." | Quitar "plantillas" y "automatización" (no hay productos de eso hoy) |
| `og:title` / `twitter:title` | "Market Tony" | Igual al título propuesto sin sufijo | T1 |
| JSON-LD `Store.description` | "…agentes de IA, skills y plantillas para anuncios, video y automatización." | `OnlineStore` (T6) con "Skills y agentes de IA en español para Claude Code y Codex: anuncios, video, PageSpeed y diseño." | Coherencia y tipo correcto |
| `ItemList` | 6 productos, nombre = H1 | Sin cambio | Correcto |
| Texto | ≈1000 palabras; sin párrafo que explique qué es una skill/agente de Claude Code | 1 párrafo de 2–3 frases bajo "Todos los productos" que explique qué es una skill y qué necesitas (Claude Code o Codex, se paga aparte) | Intención informativa de quien llega por "skills claude code" |
| Sitemap del market | `/market` (sin barra, igual que el canonical) | Sin cambio | Correcto. Pero el sitemap del blog (`sitemap-0.xml`) lista `/market/` **con** barra: unificar a `/market` o quitarla de ahí |
| Lighthouse móvil | Rendimiento 99 · LCP 1,5 s · CLS 0 · SEO 100 | T8 (srcset de portadas: ≈100 KiB) | |

## 7. Indexación

| Revisión | Resultado | Acción |
|---|---|---|
| `robots.txt` | Permite `/market`; declara `sitemap-index.xml` y `/market/sitemap.xml` | **Agregar `Sitemap: https://tonyciencia.com/sitemap-posts.xml`** (o `/sitemap.xml`): el índice declarado (`sitemap-index.xml` → `sitemap-0.xml`) tiene 28 URLs y **ningún post**; los 22 posts (es + en) solo están en `sitemap-posts.xml`. Afecta a todas las publicaciones del blog. Si ya están enviados a mano en Search Console, es menos grave (no tengo acceso para verlo) |
| `sitemap-0.xml` del blog | Incluye `/search/` y `/en/search/`, que `robots.txt` bloquea | Quitarlas del sitemap |
| Sitemap del market | `/market`, servicio, 6 fichas con imágenes y `lastmod`, legales | Correcto |
| Canonical | Fichas: `/market/producto/<slug>` (también desde `/slug/` con barra y con `?aviso=`). Catálogo: `/market` para todos los filtros | Correcto |
| `noindex` | `/market/entrar`, `/market/mis-compras` (y admin redirige a entrar) | Correcto |
| Googlebot | 200 con agente de usuario de Googlebot | Correcto |
| HTML | `cache-control: no-store`, TTFB 160–580 ms en Lighthouse | Aceptable; no urgente |
| Páginas legales | Sin meta descripción; título "Política de reembolsos de Market Tony — Market Tony" (marca doble) | Bajo: agregar descripción y quitar la marca repetida |

## 8. Lighthouse móvil (2026-11-01, 1 corrida, orientativo)

| Página | Rendimiento | Accesibilidad | Prácticas | SEO | FCP | LCP | TBT | CLS | Peso |
|---|---|---|---|---|---|---|---|---|---|
| Catálogo | 99 | 100 | 93 | 100 | 1,3 s | 1,5 s | 140 ms | 0 | 186 KiB |
| Anuncios Infinitos | 98 | 100 | 93 | 100 | 1,2 s | 1,5 s | 150 ms | 0 | 494 KiB |
| **SpecReel** | **88** | 100 | 93 | 100 | 1,8 s | **2,9 s** | **300 ms** | 0 | 412 KiB |
| SpecReel Stick | 100 | 100 | 93 | 100 | 1,1 s | 1,3 s | 60 ms | 0 | 240 KiB |
| PageSpeed Forensics | 99 | 100 | 93 | 100 | 1,3 s | 1,7 s | 50 ms | 0 | 305 KiB |
| CutPilot | 100 | 100 | 93 | 100 | 1,1 s | 1,5 s | 10 ms | 0 | 290 KiB |
| Motor creativo | 100 | 100 | 93 | 100 | 1,3 s | 1,6 s | 50 ms | 0 | 300 KiB |

"Prácticas recomendadas 93" en todas = error de CSP del script de Cloudflare (T9). Lo demás que marca Lighthouse:
imágenes más grandes que su hueco y PNG (T8), CSS que bloquea el render (`market.css` 18 KiB + `theme.css` 4 KiB) y el
`beacon.min.js` de Cloudflare Web Analytics (JS antiguo, caché 1 día; es de Cloudflare, no se puede tocar).

## 9. Cómo se aplicaría (cuando el dueño apruebe)

- **Textos de fichas** (meta título, meta descripción, H1, ALT, etiquetas, limpieza de descripciones, `compat`): lo más
  seguro es el admin, porque SpecReel y Anuncios tienen descripciones editadas a mano. Si se prefiere migración
  (`0009`), cada `UPDATE` con guarda sobre el valor actual exacto (`WHERE slug = … AND meta_description = '<actual>'`),
  para no pisar lo que el dueño cambie antes.
- **Código** (un PR): T1 sufijo y audit del `<title>` completo, T2 nombre en JSON-LD/feed, T4 relacionados, T5 H3 en la
  descripción, T6 `OnlineStore`/política global/quitar `FAQPage`, catálogo (título, meta, H1, bajada), T8 `srcset` y
  `_headers`. Con `pnpm typecheck && pnpm test && pnpm test:migration` y la auditoría en verde.
- **Mejoras al `audit-catalog.mjs`**: medir el `<title>` completo; avisar si una ficha "Disponible" dice "lista de
  espera"/"próximamente"; avisar si la descripción tiene párrafos en inglés; contar enlaces entrantes entre fichas
  (avisar si alguna tiene 0); comprobar que el `width/height` declarado coincide con la imagen real.
- **Aparte**: páginas de categoría (T7) en otro PR; enlaces y guías del blog con el agente de contenido; sitemap del
  blog (`robots.txt`) en el PR del blog; Cloudflare (T9) en el panel.

## 10. Preguntas para el dueño

1. **"Paga lo que quieras" desde $0** (PageSpeed Forensics y Motor creativo): Google exige precio > 0 para fichas de
   comerciante. ¿Mantienes el mínimo en $0 (recomendado: "gratis" atrae más) o prefieres un mínimo de $0.50+ para que
   entren al feed de Merchant Center?
2. **Anuncios Infinitos**: ¿el ZIP incluye una extensión de Chrome? La ficha dice "2 en 1: … + Extensión de Chrome" y
   la FAQ dice que no.
3. **Precios tachados**: ¿se cobraron de verdad $76.90 (Anuncios Infinitos) y $36.90 (SpecReel)? ¿Las ofertas tienen
   fecha de fin? Hoy los datos estructurados dicen "válido hasta el 31-12-2027", fecha que nadie decidió.
4. **SpecReel**: ¿apruebas quitar la mitad en inglés? ¿Qué reembolso vale para SpecReel: la garantía "si no logras
   renderizar el demo" de su texto o la política general del market (reembolso si no se descargó)? ¿Y qué correo de
   soporte: `contact@` o `business@`?
5. **Países**: los datos estructurados y el feed dicen que solo vendes y devuelves en EE. UU. ¿A qué países vendes?
   (Para declararlo una sola vez en la política global de la tienda.)
6. **Páginas de categoría** (`/market/categoria/video-con-ia`, etc.): ¿apruebas desarrollarlas en un PR aparte?
7. **Blog**: ¿autorizas al agente de contenido a agregar los enlaces de la sección 5 y a escribir las 2 guías?
8. **Cloudflare**: ¿desactivamos "JavaScript detections"/Bot Fight Mode en `/market/*`? Su script lo bloquea la CSP y
   solo genera un error.
9. **Nombre "Motor creativo"**: en Google esa frase se asocia a Minecraft. Propongo mantener el nombre y liderar los
   títulos con "Agentes de Claude Code para diseño gráfico"; ¿te parece o prefieres revisar el nombre comercial?
10. **Search Console**: ¿me das acceso de lectura (o un export de consultas y páginas)? Con impresiones y clics reales
    se priorizan las palabras clave con datos, no solo con el autocompletado.

## Fuentes

- Google Search Central, fichas de comerciante (precio > 0, `offers.price` frente a `priceSpecification`,
  `StrikethroughPrice`, políticas globales bajo `Organization`):
  https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Google Search Central, FAQ (retirado de la Búsqueda el 7 de mayo de 2026; documentación retirada en junio de 2026):
  https://developers.google.com/search/docs/appearance/structured-data/faqpage ·
  anuncio original de 2023: https://developers.google.com/search/blog/2023/08/howto-faq-changes ·
  https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/
- Google Search Central, Organization (`OnlineStore`, `hasMerchantReturnPolicy`, ubicación del marcado):
  https://developers.google.com/search/docs/appearance/structured-data/organization
- Google Search Central, carruseles (`ItemList` solo para cursos, películas, recetas y restaurantes):
  https://developers.google.com/search/docs/appearance/structured-data/carousel
- Autocompletado de Google (`suggestqueries.google.com`, `hl=es`, `gl=mx|co|es`), consultado el 2026-11-01.
- Resultados revisados para "prompts para anuncios": https://felipevergara.co/blogs/ia/prompts-para-meta-ads/ ·
  https://www.cyberclick.es/numerical-blog/los-mejores-prompts-para-redactar-los-anuncios-de-sem-y-social-ads ·
  https://platzi.com/cursos/meta-ads-2025/como-crear-y-evaluar-anuncios-con-chatgp/ ·
  https://promptmastershop.gumroad.com/l/TheUltimateMetaAdsMadeAffordablePromptsGuide
- "Crear videos con Claude Code": https://blog.openreplay.com/es/crear-videos-claude-code-remotion/ ·
  https://www.tella.com/blog/how-to-use-remotion-agent-skills-with-claude-code ·
  https://github.com/JJenglert1/remotion-claude-video
- "Editar videos con Claude Code": https://blog.laozhang.ai/es/posts/claude-code-video-editing ·
  https://www.tododeia.com/community/editar-videos-con-claude · https://www.opus.pro/blog/claude-video-editing-tutorial ·
  https://chatcut.io/es/claude-code-plugin
- "Videos de palitos con IA": https://kling.ai/es/explore/ai_2d_animation_generator ·
  https://www.hitpaw.com.br/creative-video-tips/ai-stickman-animation-video.html ·
  https://lilys.ai/es/notes/creating-ai-animation-20251110/new-method-viral-stick-figure-ai-animations
- "PageSpeed móvil más bajo": https://docs.20i.com/cdn/google-pagespeed-lower-mobile ·
  https://community.vercel.com/t/poor-core-web-vitals-lcp-for-mobile/11680 ·
  https://docs.wp-rocket.me/article/1402-how-to-improve-your-mobile-pagespeed-score ·
  https://www.indiehackers.com/post/why-your-mobile-pagespeed-score-refuses-to-budge-even-after-desktop-hits-95-b70859dace
- "Claude Code para diseño": https://open-design.ai/es/agents/claude-code-design/ ·
  https://www.datacamp.com/es/tutorial/claude-mcp · https://www.mejba.me/es/blog/claude-code-designers-guide
