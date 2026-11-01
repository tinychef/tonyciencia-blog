# Revisión SEO v6 de Market Tony y del home del blog (producción, 2026-11-01, después de #21 y #22)

Fecha: 2026-11-01 (17:10–17:40 UTC) · Autor: E-commerce Manager (agente) · Estado: **informe, sin aplicar**. No se tocó
código, D1, migraciones ni git.

## 0. Método y límites

- **Producción leída con `curl`**: `/market/`, `/market/en/`, las 6 fichas en los dos idiomas (12 URL),
  `/market/sitemap.xml`, `/market/feed.xml`, `/market/estado.json`, `/robots.txt`, `/`, `/en/`, `/sitemap-index.xml`,
  `/sitemap-0.xml`, `/sitemap.xml`, `/sitemap-posts.xml` y 35 variantes de URL (barras, idioma cruzado, retirados, http).
- **306 URL internas** sacadas de los `href`, `src`, `srcset`, `data-anim` y `content` de esas 16 páginas, todas pedidas
  una por una (resultado en §4.4).
- **Lighthouse 12.8.2 móvil** (Moto G Power emulado, throttling simulado, 2 corridas por URL) en el catálogo ES, el
  catálogo EN, SpecReel ES y CutPilot EN. Corre desde un servidor en la nube a través de un proxy: las cifras son de
  laboratorio. **No hay datos de campo (CrUX)**: la API de PageSpeed devolvió "cuota diaria agotada". Los Core Web
  Vitals reales hay que leerlos en Search Console → Métricas web principales.
- Texto por idioma medido contando palabras vacías de cada idioma en el texto visible (§4.3).
- `node scripts/audit-catalog.mjs` (producción): **0 errores, 0 advertencias**. Ese script solo revisa las fichas en
  español; no mira hreflang, la versión en inglés ni el home del blog (ver H16).

## 1. Hallazgos ordenados por impacto

| # | Impacto | Hallazgo | Dónde se arregla |
|---|---|---|---|
| H1 | **Alto** | El catálogo en español tiene **canonical `/market`** pero **hreflang `es`/`x-default` → `/market/`** (otra URL, 200, que a su vez canonicaliza a `/market`). El catálogo EN también apunta a `/market/`. El sitemap del market usa `/market` y el del blog usa `/market/`. El clúster de hreflang del catálogo apunta a una URL no canónica | `src/routes/shop.tsx`, `src/services/seo.ts`, `src/views/layout.tsx` |
| H2 | **Alto** | Home del blog: `<title>` = **"Tony Ciencia"** (12 caracteres, igual en ES y EN) y meta descripción de **33** (ES) y **24** (EN) caracteres, sin ninguna palabra clave | `src/components/pages/HomePage.astro` (blog) |
| H3 | **Alto** | Home del blog: hreflang no recíproco. `/` declara `en` → `/en`; `/en/` declara `es` → `/`, pero `/` nunca apunta a `/en/`. `/en` y `/en/` responden 200 y **cada una se declara canónica**; el sitemap del blog dice `/` ↔ `/en/` | `src/i18n/locales.ts`, `src/layouts/Base.astro` (blog) |
| H4 | Medio-alto | Las páginas en inglés enlazan al **catálogo en español**: logo del pie (`/market`), botón "Ver productos" del popup (`/market#catalogo`) y, en **todo el blog en inglés**, el pie y el botón del boletín (`/market`, `/market#catalogo`) | `src/views/layout.tsx`; blog `src/components/Footer.astro` |
| H5 | Medio | Español en las páginas en inglés: el **popup del cupón** (con un `<h2>` en español en las 7 páginas EN), la línea "Vendido por…" del pie, la etiqueta "Versión 2.0/1.0", y en el **JSON-LD** `Product.category` ("Video con IA") y la descripción del precio "paga lo que quieras" | `src/views/layout.tsx`, `src/lib/catalog.ts`, `src/services/seo.ts`, `src/lib/i18n.ts` |
| H6 | Medio | **30 enlaces rastreables a `/market/auth/start`** (botones de compra y montos rápidos en las 12 fichas). Cada visita escribe en D1, redirige 302 a Google OAuth y tiene límite de 20/min por IP: Googlebot puede recibir **429**, que Google interpreta como "baja el ritmo de rastreo" del host | blog `public/robots.txt`, `src/views/shop.tsx` |
| H7 | Medio | `lastmod` del sitemap **en el futuro** (`2026-11-02` en las 12 fichas; hoy es 2026-11-01): las migraciones 0010–0013 fijan `updated_at` a mano con marcas del 2 de noviembre. Además el sitemap no declara `x-default` (el HTML sí) | `src/services/seo.ts` (+ regla para próximas migraciones) |
| H8 | Medio | **Portadas animadas pesadas**: 160–350 KB cada una (1,69 MB las 6), a 1600×1000 px para huecos de ≤ 360 px CSS. En el móvil se bajan 633 KB apenas termina la carga (las 2 primeras tarjetas). **No afectan el LCP** (medido) | `design/` + `pnpm render:covers`, `src/views/shop.tsx`, `public/market/static/market.js` |
| H9 | Medio-bajo | Estáticos del market con `Cache-Control: public, max-age=0, must-revalidate` (portadas, CSS, JS): cada visita revalida todo | nuevo `public/_headers` |
| H10 | Medio-bajo | Ficha: la imagen principal (LCP) se sirve en 1600 px sin `srcset` aunque existe `cover-800.webp`; galerías subidas en PNG 1280×720 declaradas como 1600×1000 | `src/views/shop.tsx` + reexportar imágenes |
| H11 | Bajo-medio | Catálogo: salto de encabezados H1 → H3 (Lighthouse `heading-order` falla); H1 "Mi stack de herramientas" / "My tool stack" sin palabra clave; `og:title` = "Market Tony" | `src/views/shop.tsx`, `src/routes/shop.tsx`, `src/views/layout.tsx` |
| H12 | Bajo | Enlaces entre fichas desparejos: Creative Factory recibe **0** enlaces desde otras fichas, PageSpeed **1**, Edit Pro **2**; Anuncios, Motion 3D y Stick **5** cada uno (pendiente de la revisión anterior) | `src/routes/shop.tsx` |
| H13 | Bajo | `Product.name` del JSON-LD y `<title>` del feed = meta título, distinto del H1; `Product` sin `url` (pendiente) | `src/services/seo.ts` |
| H14 | Bajo | Variantes duplicadas que responden 200 en vez de 301: `/market/en`, `/market/producto/<slug>/`, `/market/en/product/<slug>/` (el canonical lo resuelve) y en el blog cada ruta con y sin barra se autodeclara canónica (`/about` y `/about/`) | `src/app.tsx`; blog `Base.astro` |
| H15 | Bajo | Script en línea de Cloudflare (`__CF$cv$params`, detección de bots) bloqueado por la CSP: error en consola en todas las páginas (Best Practices 93) | Cloudflare o `src/app.tsx` |
| H16 | Bajo | La auditoría no cubre inglés ni hreflang: estos errores pasaron con "0 errores" | `scripts/audit-catalog.mjs` |
| H17 | Bajo | Otros: `og:image` del home del blog con doble barra (`https://tonyciencia.com//assets/og-default.webp` → 307); `www.tonyciencia.com` no existe en DNS (NXDOMAIN); faltan `og:locale:alternate` y `og:image:alt` en el market; las portadas en inglés usan la imagen en español sin avisarlo en el ALT; mensajes de error y 404 en español en `/market/en/…`; sitemap del blog (pendiente) | varios |

**Lo que quedó bien** (verificado, §3): las 12 fichas responden 200 con `<html lang>`, `og:locale`, canonical y hreflang
recíproco es/en/x-default correctos; los títulos miden 49–60 y las descripciones 144–158; el JSON-LD es válido y usa
las URL del idioma; los precios del JSON-LD, la ficha y el feed coinciden; el feed excluye los tres "paga lo que
quieras" desde $0; los 301 de productos retirados y de `/market?…` funcionan; el texto en inglés ya no trae párrafos en
español (ni las fichas en español párrafos en inglés); Lighthouse móvil da LCP 1,8–2,9 s, CLS 0 y SEO 100.

---

## 2. Detalle, evidencia y arreglo

### H1 (Alto). Catálogo: canonical `/market` y hreflang `/market/`

**Evidencia**

```
GET /market/            → <link rel="canonical" href="https://tonyciencia.com/market"/>
                          <link rel="alternate" hreflang="es" href="https://tonyciencia.com/market/"/>
                          <link rel="alternate" hreflang="en" href="https://tonyciencia.com/market/en/"/>
                          <link rel="alternate" hreflang="x-default" href="https://tonyciencia.com/market/"/>
                          og:url = https://tonyciencia.com/market
                          JSON-LD OnlineStore.url = https://tonyciencia.com/market/
GET /market             → 200, mismo HTML (canonical /market)
GET /market/en/         → canonical /market/en/ ; hreflang es → https://tonyciencia.com/market/
/market/sitemap.xml     → <loc>https://tonyciencia.com/market</loc> + xhtml:link es → /market
/sitemap-0.xml (blog)   → <loc>https://tonyciencia.com/market/</loc>
```

Google pide que cada URL del hreflang sea la canónica de su versión y que cada página se incluya a sí misma. Hoy la
página española no se nombra a sí misma (su canonical es `/market` y su hreflang `es` es `/market/`), y la inglesa
apunta a una URL que canonicaliza a otra. Además el HTML (`/market/`) y el sitemap (`/market`) se contradicen. Con
señales en conflicto Google suele ignorar el hreflang del catálogo: la página EN puede salir a usuarios en español y al
revés. Es la página con más enlaces del market.

**Arreglo** (elegir `/market/` como canónica: ya la usan `storeRoot()`, el hreflang, `OnlineStore.url`, las migas de
pan de las 12 fichas, el patrón `/market/en/` y el sitemap del blog; solo 3 lugares usan `/market`):

1. `src/routes/shop.tsx`, en `catalogPage`:
   ```ts
   path: lang === "en" ? "/market/en/" : "/market/",
   ```
2. `src/services/seo.ts`, en `sitemapXml`:
   ```ts
   const catAlt = { es: "/market/", en: "/market/en/" };
   const urls: U[] = [
   	{ loc: "/market/", alt: catAlt },
   ```
   y en `merchantFeed`: ``<link>${xml(abs(origin, "/market/"))}</link>``.
3. `src/views/layout.tsx`: el `aria-current` del enlace "Catálogo" (`is("/market") ?? is("/market/en")`) pasa a
   `is(root)` (hoy en inglés nunca se marca porque la ruta es `/market/en/`), y el logo del pie `href="/market"` pasa a
   `href={root}` (ver H4).
4. Prueba nueva en `test/v3.test.ts`: en `/market` y `/market/en/`, el canonical es igual al hreflang de su idioma y
   ambos están en el sitemap con los mismos valores. Las pruebas que piden `"/market"` siguen funcionando (no hay 301).
5. Opcional, más adelante: 301 de `/market` → `/market/` en el Worker (la ruta de Cloudflare `tonyciencia.com/market`
   y `tonyciencia.com/market/*` llegan los dos al Worker). Requiere actualizar ~15 pruebas que piden `/market`.
6. En el blog, los enlaces a `/market` pueden pasar a `/market/` (no es obligatorio: un enlace a una URL que
   canonicaliza bien no es un error, pero suma una señal coherente).

### H2 (Alto). Home del blog: título y descripción vacíos de palabras clave

**Evidencia**

```
GET /    → <title>Tony Ciencia</title> (12)   description: "IA · Automatización · Crecimiento" (33)
GET /en/ → <title>Tony Ciencia</title> (12)   description: "AI · Automation · Growth" (24)
```

La portada es la página con más autoridad del dominio y ahora es la puerta del market. Con 12 caracteres de título y
una descripción de 3 palabras, Google arma el snippet con lo que encuentre; además ES y EN tienen **el mismo título**.

**Arreglo** (`src/components/pages/HomePage.astro`, línea 139; `Base` deja el título tal cual si ya contiene el nombre
del sitio). Propuesta hecha solo con textos que ya están en la portada (H1 y la puerta del market); **la decide el
dueño**:

```astro
<Base
	title={locale === "en" ? "Applied AI you can use today | Tony Ciencia" : "IA aplicada que puedes usar hoy | Tony Ciencia"}
	description={locale === "en"
		? "AI and automation guides, plus ready-to-use tools: AI agents, skills and templates for ads, video and automation."
		: "Guías de IA y automatización en español, y herramientas listas para usar: agentes, skills y plantillas para anuncios, video y automatización."}>
```

(46 y 43 caracteres de título; 141 y ~115 de descripción.) La descripción ES actual sale de `siteTagline` (ajustes del
CMS); si el dueño prefiere editarla en el admin de EmDash, basta con cambiar ahí el tagline y dejar solo el título en
código.

### H3 (Alto). Home del blog: hreflang no recíproco por la barra final

**Evidencia**

```
GET /     → canonical https://tonyciencia.com/      hreflang en → https://tonyciencia.com/en
GET /en   → 200, canonical https://tonyciencia.com/en   hreflang en → /en, es → /
GET /en/  → 200, canonical https://tonyciencia.com/en/  hreflang en → /en/, es → /
sitemap-0.xml → <loc>https://tonyciencia.com/</loc> con xhtml:link en → https://tonyciencia.com/en/
```

Hay dos portadas inglesas que se declaran canónicas. La del sitemap (`/en/`) no recibe el hreflang de `/`, y la que
recibe el hreflang (`/en`) no está en el sitemap. Google exige que el par se confirme en los dos sentidos.

**Arreglo**

- `src/i18n/locales.ts`: `["/", "/en/"]` en `EXACT_ROUTE_MAP` (así `/` declara `en` → `/en/`; el mapa inverso ya
  normaliza la barra).
- `src/layouts/Base.astro`, línea 72: normalizar el canonical de la portada inglesa:
  ```ts
  const canonicalPath = Astro.url.pathname === "/en" ? "/en/" : Astro.url.pathname;
  const canonicalUrl = canonical || new URL(canonicalPath, Astro.site || Astro.url.origin).href;
  ```
- De fondo (H14): todo el blog acepta las dos formas (`/about` y `/about/`, cada una canónica de sí misma). Conviene
  fijar una política (el sitemap de `@astrojs/sitemap` usa barra final) y canonicalizar a ella en `Base.astro`.

### H4 (Medio-alto). Enlaces desde páginas en inglés al catálogo en español

**Evidencia** (enlaces de las páginas EN que no van a `/market/en/…`, sin contar el selector de idioma ni legales):

```
/market/en/ y las 6 fichas EN:  <a href="/market" class="mk-brand" aria-label="Market Tony">      (logo del pie)
                                <a href="/market#catalogo" class="mk3-pop-link">Ver productos       (popup del cupón)
/en/ (blog) y todo el blog EN:  Footer: "Market Tony" → /market, "AI agents & skills" → /market#catalogo
                                <a href="/market" class="newsletter-cta-btn …" hreflang="es">Visit the Market
```

El logo de la cabecera y el botón del header del blog sí van a `/market/en/`. El resto manda al visitante en inglés al
catálogo en español y le dice a Google que las páginas EN enlazan a la versión ES como "inicio de la tienda".

**Arreglo**

- `src/views/layout.tsx` línea 224: `<a href={root} class="mk-brand" …>`; línea ~292: `href={`${root}#catalogo`}`.
- Blog `src/components/Footer.astro` líneas 66–70 y 129: en inglés usar `/market/en/` y `/market/en/#catalogo`, y
  quitar `hreflang="es"` del botón del boletín. El comentario de la línea 65 ("tienda en español") quedó viejo.

### H5 (Medio). Español en las páginas en inglés (texto visible y JSON-LD)

**Evidencia**

| Texto en español en `/market/en/…` | Dónde está |
|---|---|
| `<h2 id="mk-pop-title">¡Obtén un 10 % de descuento en tu primera compra!</h2>` (un H2 en las 7 páginas EN), "Copia el código y escríbelo al comprar…", "Ver productos", "Válido una vez por cuenta…", "1.ª compra", "Copiar", `aria-label="Cerrar"`, `aria-label="Ver el cupón de 10 % de descuento en tu primera compra"`, "Cupón" | `src/views/layout.tsx` 276–303 (sin `tr()`) |
| "Vendido por Tony Ciencia LLC · 8206 Louisiana Blvd NE… EE. UU. Precios en dólares estadounidenses (USD)." | `src/views/layout.tsx` 268–271 (sin `tr()`) |
| Etiqueta "Versión 2.0" (Motion 3D) y "Versión 1.0" (SpecReel Stick) junto al H1 | columna `badge` → `src/lib/catalog.ts` línea 34; `ProductLocale` no tiene `badge` |
| JSON-LD `Product.category`: "Publicidad con IA", "Video con IA", "Agentes de IA" | `src/services/seo.ts` línea 95 (`categoryLabel` sin idioma) |
| JSON-LD `offers.priceSpecification.description`: "Paga lo que quieras: el comprador elige el monto; el precio es el sugerido." (PageSpeed, Edit Pro, Creative Factory) | `src/services/seo.ts` línea 55 |

Medición de idioma (§4.3): las fichas EN tienen ~18 palabras vacías en español cada una y todas salen de estos
bloques; el cuerpo de la ficha ya está limpio.

**Arreglo**

- `layout.tsx`: pasar esos textos por `tr()` y agregar las claves a `EN` en `src/lib/i18n.ts` (p. ej. "Get {offer} off
  your first purchase!", "Copy the code and enter it at checkout. It's applied at Stripe's secure checkout.", "See
  products", "Valid once per account, on fixed-price products.", "1st purchase", "Copy", "Close", "Sold by Tony Ciencia
  LLC · … USA. Prices in US dollars (USD)."). `offerText` también se arma en español ("10 % de descuento").
- `badge`: agregar `badge?: string` a `ProductLocale`/`parseI18n`/`localize` (y al JSON `i18n.en` por admin), o como
  mínimo en `badgesFor` traducir el prefijo "Versión " → "Version " cuando `lang === "en"`.
- `seo.ts`: `productJsonLd(origin, p, reviews, path, lang)` con `category: categoryLabelIn(lang, p.category, …)` y la
  descripción del precio por idioma (o quitarla: Google usa `offers.price` y no lee esa descripción).

### H6 (Medio). Enlaces rastreables a `/market/auth/start`

**Evidencia**

```
30 enlaces únicos en las 12 fichas, p. ej.
  <a class="tc-btn tc-btn--primary mk-btn-block" href="/market/auth/start?next=%2Fmarket%2Fproducto%2Fspecreel%23comprar">
  <a href="/market/auth/start?next=%2Fmarket%2Fen%2Fproduct%2Fcutpilot%3Fmonto%3D24%23comprar" aria-label="Name your price: $24 USD">
GET /market/auth/start?next=%2Fmarket%2F → 302 → https://accounts.google.com/o/oauth2/v2/auth?client_id=…
src/routes/auth.tsx:26  hit(MARKET_DB, RATE_RULES.login …)   src/lib/ratelimit.ts:13  login: 20 por minuto por IP → 429
robots.txt: no bloquea /market/auth/
```

Googlebot sigue esos enlaces: gasta rastreo en redirecciones a otro dominio, genera escrituras en D1 y, si pasa de 20
por minuto desde una IP, recibe **429**. Google trata los 429 como señal de sobrecarga y baja el ritmo de rastreo de todo
`tonyciencia.com`.

**Arreglo**

- Blog `public/robots.txt`, en el bloque `User-agent: *`: `Disallow: /market/auth/` (no bloquear `/market/entrar`: ya
  tiene `noindex` y Google necesita verlo).
- `src/views/shop.tsx`: `rel="nofollow"` en los enlaces de compra que van a `/market/auth/start` (botón principal y
  montos rápidos).

### H7 (Medio). `lastmod` en el futuro y sitemap sin `x-default`

**Evidencia**

```
date -u                      → Sun Nov  1 17:14 UTC 2026
/market/sitemap.xml          → <lastmod>2026-11-02</lastmod> en las 12 fichas
migrations/0010_nombres_v6.sql      updated_at = 1793606400000  (2026-11-02 08:00 UTC)
migrations/0011_ingles.sql          updated_at = 1793620800000  (2026-11-02 12:00 UTC)
migrations/0012_edit_pro_desde_cero updated_at = 1793580000000  (2026-11-02 00:40 UTC)
migrations/0013_titulos_keywords    updated_at = 1793640000000  (2026-11-02 17:20 UTC)
```

Google usa `lastmod` solo si es "consistente y verificable"; fechas futuras le enseñan que el dato no es fiable y puede
dejar de usarlo para este sitemap. El HTML declara `x-default`, el sitemap no.

**Arreglo**

- `src/services/seo.ts`, en `sitemapXml`:
  ```ts
  u.lastmod ? `<lastmod>${new Date(Math.min(u.lastmod, Date.now())).toISOString().slice(0, 10)}</lastmod>` : "",
  ```
  y agregar `<xhtml:link rel="alternate" hreflang="x-default" href="…es…"/>` cuando haya `alt`.
- Regla para las próximas migraciones (en `scripts/gen-catalog-migration.mjs` y en la skill): `updated_at =
  CAST(unixepoch('subsec') * 1000 AS INTEGER)` o la hora real del commit, nunca una marca futura. No hace falta migrar
  nada: el tope de `Date.now()` lo corrige solo y el 2 de noviembre las fechas dejan de ser futuras.

### H8 (Medio). Peso de las portadas animadas

**Evidencia**

| Producto | `cover.webp` | `cover-800.webp` | `cover-animada.webp` | Cuadros |
|---|---|---|---|---|
| Anuncios Automáticos | 77 KB | 34 KB | **309 KB** (1600×1000) | 40 |
| Motion 3D Video | 63 KB | 26 KB | **337 KB** | 28 |
| SpecReel Stick | 59 KB | 28 KB | **350 KB** | 35 |
| PageSpeed Forensics | 64 KB | 27 KB | **160 KB** | 24 |
| Edit Pro para YouTube | 60 KB | 26 KB | **208 KB** | 36 |
| Creative Factory | 104 KB | 41 KB | **329 KB** | 32 |
| **Total** | | 182 KB | **1,69 MB** | |

- Catálogo ES, Lighthouse móvil: 905 KB en total, de los cuales **633 KB** son las 2 animadas que entran en pantalla.
  `uses-responsive-images` las marca (ahorro estimado 230 KB solo en esas dos).
- **LCP**: no lo afectan. En la traza, el LCP observado ocurre a 814 ms con `cover-800.webp` y la primera animada se
  pide a 827 ms (después del `load`, como manda `market.js`). Lighthouse muestra el `<img>` con `src=cover-animada.webp`
  como "elemento LCP" solo porque captura el DOM al final; el tiempo corresponde a la imagen fija. Chrome no emitió un
  candidato nuevo al cambiar el `src` (mismo tamaño). En las fichas, la imagen principal es fija y las animadas solo
  están en "Completa tu kit" (debajo del pliegue).
- `market.js` borra `srcset` y `sizes` al cambiar a la animada, así que siempre baja la de 1600 px.

**Arreglo**

- Renderizar también `cover-animada-800.webp` (800×500: una cuarta parte de los píxeles; medir el peso real al
  generarla) con
  `pnpm render:covers` y que `data-anim` apunte a esa versión en `src/views/shop.tsx` línea 284 (o usar
  `data-anim-srcset` y que `market.js` mantenga `srcset`). Con huecos de 360 px CSS, 800 px cubre DPR 2.
- Opcional: animar solo la tarjeta visible más cercana al centro y pausar las demás (menos decodificación en móviles
  modestos).

### H9 (Medio-bajo). Estáticos sin caché de navegador

**Evidencia**

```
/market/static/products/specreel/cover.webp           cache-control: public, max-age=0, must-revalidate
/market/static/products/anuncios-infinitos/cover-animada.webp   (igual)
/market/static/market.css?v=9                         (igual)
/market/media/images/…/cover-1-hero-v2.png            cache-control: public, max-age=86400
```

Cada visita repetida revalida CSS, JS y todas las portadas (incluidas las animadas de 300 KB). No hay `public/_headers`.

**Arreglo** — crear `workers/market/public/_headers` (Workers Static Assets lo respeta):

```
/market/static/market.css
  Cache-Control: public, max-age=31536000, immutable
/market/static/market.js
  Cache-Control: public, max-age=31536000, immutable
/market/static/products/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/market/static/site/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

(`immutable` solo en los que llevan `?v=`; recordar subir `STATIC_VERSION` en `layout.tsx` al cambiarlos. Las portadas
quedan en 1 día porque se regeneran con el mismo nombre.)

### H10 (Medio-bajo). Imagen principal de la ficha y galerías

**Evidencia**

- Lighthouse `uses-responsive-images` en las fichas: `cover.webp` 1600 px en un hueco de ~412 px CSS (ahorro estimado
  48–51 KB por ficha), `screen-1/2.webp` 31–63 KB cada una.
- Galerías del admin (Anuncios 5 imágenes, Motion 3D 2): **PNG 1280×720** servidas con `width="1600" height="1000"`
  (16:9 declarado como 16:10). En Motion 3D suman 214 KB y Lighthouse estima 145 KB de ahorro pasándolas a WebP.

**Arreglo**

- `src/views/shop.tsx` línea ~924 (galería principal): para `cover.webp`, `screen-1.webp` y `screen-2.webp` agregar
  `srcset="…-800.webp 800w, ….webp 1600w" sizes="(min-width: 900px) 55vw, 100vw"` (generar `screen-*-800.webp` en
  `render:covers`; `cover-800.webp` ya existe para los 6).
- Reexportar las galerías del admin a WebP 1600×1000 (o leer el tamaño real al subir y escribir `width`/`height`
  reales).

### H11 (Bajo-medio). Encabezados y títulos del catálogo

**Evidencia**

```
/market/    H1 "Mi stack de herramientas" → H3 ×6 (tarjetas) → H2 …      Lighthouse a11y: heading-order ✘ <h3 class="mk5-title">
/market/en/ H1 "My tool stack"            → H3 ×6 → H2 …
og:title / twitter:title = "Market Tony" en los dos idiomas
<title> ES: "Mi stack de herramientas de IA en español | Market Tony" (55)
<title> EN: "AI agents and skills for Claude Code and Codex | Market Tony" (60)
```

**Arreglo**

- `src/views/shop.tsx`, antes de `<ul class="mk5-grid">`: `<h2 class="mk-visually-hidden">{tr("Catálogo")}</h2>`
  (o un H2 visible "Herramientas" / "Tools").
- H1 con palabra clave y el lema actual como subtítulo, p. ej. ES "Agentes y skills de IA para Claude Code" (39) y EN
  "AI agents and skills for Claude Code and Codex" (46). Título ES: "Agentes y skills de IA para Claude Code y Codex"
  (sin sufijo, 47) para alinearlo con el EN. **Decisión del dueño**: "Mi stack" es tono de marca.
- `src/views/layout.tsx`: `og:title`/`twitter:title` = `fullTitle` sin el sufijo cuando `meta.title === "Market Tony"`.

### H12 (Bajo). Enlaces entre fichas ("Completa tu kit")

**Evidencia** (enlaces desde cada ficha ES a otras fichas):

```
anuncios-infinitos         → pagespeed-forensics specreel specreel-stick
specreel                   → anuncios-infinitos cutpilot specreel-stick
specreel-stick             → anuncios-infinitos cutpilot specreel
pagespeed-forensics        → anuncios-infinitos specreel specreel-stick
cutpilot                   → anuncios-infinitos specreel specreel-stick
motor-creativo-claude-code → anuncios-infinitos specreel specreel-stick
Recibidos: Anuncios 5 · Motion 3D 5 · Stick 5 · Edit Pro 2 · PageSpeed 1 · Creative Factory 0
```

**Arreglo** — `src/routes/shop.tsx` (cálculo de `related`): después de la misma categoría, rotar el resto según el
índice del producto (p. ej. `others[(i + k) % others.length]`) para que cada ficha reciba al menos 2 enlaces.

### H13 (Bajo). Nombre del producto en JSON-LD y feed

`Product.name` = meta título ("Edit Pro for YouTube: AI video editor (Spanish videos)") mientras el H1 y el `ItemList`
usan el título comercial ("Edit Pro for YouTube: AI video editor for Spanish talking videos"); el feed también usa el
meta título. `Product` no tiene `url`. **Arreglo**: `src/services/seo.ts` → `name: p.title`, `url: abs(origin, path)`;
en `merchantFeed`, `<title>` = `p.title.slice(0, 150)`.

### H14 (Bajo). Variantes de URL que responden 200

```
/market/en                       200  canonical /market/en/
/market/producto/specreel/       200  canonical /market/producto/specreel
/market/en/product/specreel/     200  canonical /market/en/product/specreel
/about y /about/ (blog)          200  cada una con canonical a sí misma
```

El canonical del market las resuelve. **Arreglo** (opcional): en `src/app.tsx`, middleware que responda 301 a la forma
canónica cuando la ruta de una ficha termina en `/` o es `/market/en`. En el blog, ver H3.

### H15 (Bajo). Script de Cloudflare bloqueado por la CSP

Lighthouse Best Practices 93 en las 4 URL: "Executing inline script violates … script-src 'self'
https://static.cloudflareinsights.com". Es el script de detección de bots que Cloudflare inyecta
(`window.__CF$cv$params`). No afecta el SEO; deja un error en consola y la detección de bots no corre. **Arreglo**:
desactivar "JavaScript Detections" para `/market/*` en Cloudflare (Security → Bots) o permitirlo en la CSP de
`src/app.tsx` (Cloudflare no da un hash fijo: requiere `'unsafe-inline'`, no recomendado).

### H16 (Bajo). La auditoría no ve el inglés

`scripts/audit-catalog.mjs` no contiene ni `hreflang` ni `/en/`. **Arreglo**: agregar comprobaciones de (a) canonical
= hreflang propio en catálogo y fichas, (b) reciprocidad es↔en, (c) `lastmod` ≤ hoy, (d) palabras vacías en español en
las páginas EN por encima de un umbral, (e) enlaces a `/market/auth/` sin `nofollow`.

### H17 (Bajo). Otros

- `og:image` del home del blog: `https://tonyciencia.com//assets/og-default.webp` (307). `Base.astro` líneas 133 y 142
  concatenan `Astro.site` (que ya termina en `/`). Usar `new URL("/assets/og-default.webp", Astro.site ?? Astro.url.origin).href`.
- `www.tonyciencia.com`: NXDOMAIN (consulta DNS a `dns.google`). Quien escriba "www." no llega. Crear el registro en
  Cloudflare con redirección 301 a `https://tonyciencia.com`.
- Market sin `og:locale:alternate` (el blog sí lo tiene) ni `og:image:alt`: agregarlos en `src/views/layout.tsx`.
- Las portadas son en español también en `/market/en/` (`EN_COVERS` vacío). Los ALT de la galería del admin dicen
  "(image in Spanish)", los de `cover`/`screen` no; agregar esa aclaración en `i18n.en.image_alts` hasta que existan
  las portadas en inglés.
- `/market/en/…`: los mensajes de `?aviso=` y la página 404 salen en español (`src/routes/shop.tsx` 120–145).
- Blog (pendiente de la revisión anterior, punto 10): `robots.txt` declara `sitemap-index.xml` → `sitemap-0.xml`, que
  tiene 28 URL y **ningún post**; los 22 posts están en `sitemap-posts.xml`, solo enlazado desde `/sitemap.xml`.
  `sitemap-0.xml` además lista `/search/` y `/en/search/` (con `noindex` y bloqueadas en robots). Arreglo: declarar
  `Sitemap: https://tonyciencia.com/sitemap.xml` en `public/robots.txt` (o sumar `sitemap-posts.xml` al índice) y
  filtrar `/search` en la integración `sitemap()` de `astro.config.mjs`.

---

## 3. Lo verificado que está bien

### 3.1 Títulos, metas, H1, idioma y hreflang de las 12 fichas

| URL | `<title>` (car.) | meta desc. | H1 | lang / og:locale | canonical y hreflang |
|---|---|---|---|---|---|
| /market/producto/anuncios-infinitos | Anuncios Automáticos: anuncios con inteligencia artificial (58) | 154 | Anuncios Automáticos: agente de anuncios con inteligencia artificial | es / es_ES | ✔ propio, es/en/x-default |
| /market/en/product/anuncios-infinitos | Automatic Ads: AI advertising agent (Spanish-language) (54) | 149 | Automatic Ads: AI advertising agent that writes your ads in Spanish | en / en_US | ✔ |
| /market/producto/specreel | Motion 3D Video: videos explicativos con IA y de producto (57) | 158 | Motion 3D Video: crea videos explicativos 3D con IA y Claude Code | es / es_ES | ✔ |
| /market/en/product/specreel | Motion 3D Video: AI explainer videos in 3D with Claude Code (59) | 151 | Motion 3D Video: AI explainer and 3D product videos with Claude Code | en / en_US | ✔ |
| /market/producto/specreel-stick | SpecReel Stick: videos de palitos animados con IA (49) | 157 | SpecReel Stick: videos de palitos animados con IA para Reels y TikTok | es / es_ES | ✔ |
| /market/en/product/specreel-stick | SpecReel Stick: AI stick figure animation with Claude Code (58) | 147 | SpecReel Stick: AI stick figure animation videos with Claude Code | en / en_US | ✔ |
| /market/producto/pagespeed-forensics | PageSpeed Forensics: mejora tu PageSpeed móvil y tu LCP (55) | 149 | PageSpeed Forensics: mejora tu PageSpeed móvil con Claude Code | es / es_ES | ✔ |
| /market/en/product/pagespeed-forensics | Low PageSpeed Insights mobile score? A Claude Code skill (56) | 151 | PageSpeed Forensics: find why your mobile PageSpeed score is low | en / en_US | ✔ |
| /market/producto/cutpilot | Edit Pro para YouTube: editar videos con IA en español (54) | 151 | Edit Pro para YouTube: edita con IA tus videos hablados en español | es / es_ES | ✔ |
| /market/en/product/cutpilot | Edit Pro for YouTube: AI video editor (Spanish videos) (54) | 156 | Edit Pro for YouTube: AI video editor for Spanish talking videos | en / en_US | ✔ |
| /market/producto/motor-creativo-claude-code | Creative Factory: agentes de IA para diseño gráfico y video (59) | 154 | Creative Factory: 13 agentes de IA para diseño gráfico, video y PDF | es / es_ES | ✔ |
| /market/en/product/motor-creativo-claude-code | Creative Factory: AI agents for graphic design (Claude Code) (60) | 153 | Creative Factory: 13 AI agents for graphic design, video and PDF | en / en_US | ✔ |
| /market/ | Mi stack de herramientas de IA en español \| Market Tony (55) | 144 | Mi stack de herramientas | es / es_ES | ✘ H1 |
| /market/en/ | AI agents and skills for Claude Code and Codex \| Market Tony (60) | 146 | My tool stack | en / en_US | ✘ H1 |

Las 12 fichas: canonical = hreflang de su idioma, cada una se nombra a sí misma, apunta a la otra y `x-default` va a la
española. El sitemap repite exactamente esos pares (`xhtml:link` es/en) en las 12 entradas. Los pendientes de la
revisión anterior que **ya están resueltos**: CutPilot ya no dice "Lista de espera", SpecReel ya no trae el bloque en
inglés, Anuncios ya no se contradice ("2 en 1: Agente de anuncios + App local" y la FAQ coinciden) y el sufijo
"| Market Tony" solo se agrega si el título cabe en 60.

### 3.2 JSON-LD y precios

- Las 16 páginas: todos los bloques `application/ld+json` parsean. Fichas: `Product` + `Offer` + `BreadcrumbList` +
  `FAQPage`; catálogo: `OnlineStore` + `ItemList` + `FAQPage`. En las páginas EN, `Offer.url`, `BreadcrumbList` e
  `ItemList` usan `/market/en/…` (las ES, `/market/…`).
- Precios coherentes entre ficha visible, `product:price:amount`, JSON-LD y feed:

| Producto | Ficha (ES y EN) | JSON-LD `offers.price` | Tachado (JSON-LD / feed) | Feed |
|---|---|---|---|---|
| Anuncios Automáticos | $33.33 (antes $76.90, −57 %) | 33.33 | 76.90 / 76.90 | `price 76.90`, `sale_price 33.33` |
| Motion 3D Video | $12 (antes $36.90, −67 %) | 12.00 | 36.90 / 36.90 | `price 36.90`, `sale_price 12.00` |
| SpecReel Stick | $12 | 12.00 | — | `price 12.00` |
| PageSpeed Forensics | desde $0, sugerido $9 | 0.00 (+ sugerido 9.00) | — | fuera (pwyw desde $0) ✔ |
| Edit Pro para YouTube | desde $0, sugerido $12 | 0.00 (+ sugerido 12.00) | — | fuera ✔ |
| Creative Factory | desde $0, sugerido $19 | 0.00 (+ sugerido 19.00) | — | fuera ✔ |

  Google usa `offers.price` aunque haya `priceSpecification` ("Google will use the price provided through the
  `offers.price` property"), y las fichas de comerciante exigen precio > 0 ("Unlike product snippets, merchant listing
  experiences require a price greater than zero"): los tres pwyw quedan para fragmentos de producto, no para fichas de
  comerciante. Es lo esperado según la skill.

### 3.3 Estados HTTP

| URL | Resultado |
|---|---|
| 12 fichas, 2 catálogos, sitemap, feed, estado.json, robots.txt, `/`, `/en/` | 200 |
| `/market?categoria=video` | 301 → `/market/?categoria=video` ✔ |
| `/market/producto/kit-n8n-agentes-ia`, `/market/producto/carruseles-infinitos` | 301 → `/market/` ✔ |
| `/market/en/product/kit-n8n-agentes-ia`, `/market/en/product/carruseles-infinitos` | 301 → `/market/en/` ✔ |
| `http://tonyciencia.com/market/…` | 301 → https ✔ |
| `/market/producto/no-existe`, `/market/en/producto/specreel`, `/market/product/specreel`, `/market/en/legal/terminos` | 404 ✔ |
| `/market/auth/start?…` (30) | 302 → Google OAuth (ver H6) |
| `/market/mis-compras` | 303 → `/market/entrar?next=…` (`noindex, nofollow`) ✔ |
| `/market/static/products/<slug>/en/cover.webp` | 404, pero no se usa (`EN_COVERS` vacío) ✔ |

### 3.4 Enlaces e imágenes

- 306 URL internas comprobadas: **0 rotas**. Las únicas no-200 son las 30 de `/market/auth/start` (302), `/market/mis-compras`
  (303) y el `og:image` con doble barra del home del blog (307).
- Todas las `<img>` con contenido tienen `alt` en el idioma de la página (las miniaturas de la galería usan `alt=""` y
  el botón lleva `aria-label` con el texto: correcto). Todas declaran `width`/`height` (CLS 0 en las 8 corridas).
- La imagen LCP del catálogo es `cover-800.webp` (34 KB) con `loading="eager"` y `fetchpriority="high"`; la de la ficha,
  `cover.webp` (59–104 KB) igual.

### 3.5 Contenido por idioma

Palabras vacías del idioma contrario en el texto visible: fichas ES 1–2 (nombres como "Claude Code" no cuentan);
fichas EN 18–22, todas del popup, el pie y la etiqueta "Versión" (H5); catálogo EN 18. El cuerpo de las fichas EN está
traducido completo. Las FAQ EN agregan "Is it in English?" donde corresponde. No hay contenido duplicado entre idiomas
más allá de las imágenes (en español) y los nombres de archivo del producto (Creative Factory explica por qué el ZIP se
llama "Motor creativo para Claude Code").

## 4. Anexos

### 4.1 Lighthouse 12.8.2 móvil (2 corridas, throttling simulado)

| URL | Rendimiento | LCP | FCP | TBT | CLS | SEO | Accesib. | Buenas prácticas | Peso |
|---|---|---|---|---|---|---|---|---|---|
| /market/ | 98 / 96 | 1,9 s / 2,3 s | 1,9 s | 0 ms | 0 | 100 | 99 (heading-order) | 93 (CSP) | 905 KB |
| /market/en/ | 96 / 91 | 2,4 s / 1,8 s | 2,0 s / 1,8 s | 20 / 330 ms | 0 | 100 | 99 (heading-order) | 93 | 905 KB |
| /market/producto/specreel | 98 / 93 | 2,0 s / 2,9 s | 1,9 s / 1,8 s | 0 / 100 ms | 0 | 100 | 100 | 93 | 427 KB |
| /market/en/product/cutpilot | 97 / 98 | 2,2 s / 2,1 s | 1,9 s / 1,8 s | 0 ms | 0 | 100 | 100 | 93 | 270 KB |

Lectura: los cuatro pasan los umbrales "bueno" en laboratorio (LCP ≤ 2,5 s salvo una corrida de SpecReel con 2,9 s por
retraso de render simulado; el LCP observado fue 1,47 s). El TTFB simulado ronda 600–730 ms (render en el Worker con
D1). Los Core Web Vitals reales (CrUX) no se pudieron leer: revisar Search Console.

Reportes JSON en `/tmp/claude-0/-home-user/99209a02-7544-56af-b21b-8a3a1f80a4be/scratchpad/lh/` (`cat-es-1.json`,
`cat-en-1.json`, `specreel-es-1.json`, `cutpilot-en-1.json` y sus `-2`). Son temporales.

### 4.2 Feed de Merchant (`/market/feed.xml`)

3 ítems (anuncios-infinitos, specreel, specreel-stick); los 3 pwyw desde $0 no están ✔. `g:price`/`g:sale_price`
coinciden con la ficha ✔. Observaciones menores: `<title>` = meta título (H13); `g:product_type` y `g:service` en
español (válido para el feed en español); `custom_label_0–4` llevan palabras clave: no influyen en el posicionamiento
(sirven para segmentar campañas), se pueden dejar; solo hay feed en español (un feed EN con `link` a `/market/en/…` es
opcional y conviene solo si el dueño va a hacer campañas en inglés).

### 4.3 Orden sugerido de arreglos (un PR del market + uno del blog)

1. **PR market** (H1, H4 parte market, H5, H6 `nofollow`, H7, H11 H2 oculto, H16): solo código y pruebas, sin
   migraciones ni decisiones de negocio. Después del deploy: reenviar `https://tonyciencia.com/market/sitemap.xml` en
   Search Console e inspeccionar `/market/` y `/market/en/`.
2. **PR blog** (H2 con el texto que apruebe el dueño, H3, H4 parte blog, H6 `robots.txt`, H17 og:image y sitemap).
3. **Imágenes** (H8, H10): `cover-animada-800.webp`, `screen-*-800.webp`, galerías a WebP; `public/_headers` (H9).
4. **Decisiones del dueño**: título y descripción del home (H2), H1 del catálogo (H11), registro `www` (H17).
