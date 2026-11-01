# Market v3, agentes y nuevos productos (01-11-2026)

Pedido de Tony: ofertas con precio tachado (Anuncios Infinitos USD 76.90 → 33.33, SpecReel → 12), dos agentes
autónomos (Content & Affiliate Manager y E-commerce Manager), rediseño del e-commerce a nivel marketplace, publicar
`pagespeed-forensics`, `artcraft-studio-engine`, `estudio-video` y la herramienta de muñequitos de palo (USD 12),
precios flexibles tipo Gumroad (de USD 0 a 1.000.000), popup con cupón real del 10 % en la primera compra, y
optimización completa para SEO, Google Merchant Center y Google Shopping. Todo a producción.

## 1. Qué quedó hecho

| Pedido | Resultado | Dónde |
|---|---|---|
| Ofertas | Anuncios Infinitos **USD 33.33** (antes 76.90, −57 %) y SpecReel **USD 12** (antes 36.90, −67 %). Precio anterior tachado, etiqueta **OFERTA −x %** y «Ahorras $…» en tarjetas, ficha, barra móvil, página de pago de Stripe (descripción de la línea), feed de Merchant (`g:sale_price`) y JSON-LD (`StrikethroughPrice`). | `migrations/0004`, `src/lib/pricing.ts`, `src/views/shop.tsx`, `src/services/seo.ts` |
| Precios flexibles | Modo **«paga lo que quieras»** por producto: mínimo (0 = descarga gratis), precio sugerido y máximo. El comprador escribe el monto o toca un atajo (Gratis, sugerido, ×2, ×5). Con **0** se entrega sin pasar por Stripe; de **0.50 a 999,999.99** se cobra con Stripe. Validado en el servidor (el webhook exige que lo cobrado coincida). Configurable en `/market/admin`. | `src/lib/pricing.ts`, `src/routes/shop.tsx`, `src/services/orders.ts`, admin |
| Cupón real + popup | El cron del Worker **crea en Stripe** el cupón «10 % una vez» (`market-bienvenida-10`) y el código **TONYCIENCIA**, ambos con `market=true`. El servidor lo acepta **solo en la primera compra pagada** de cada cuenta y solo en precio fijo. Popup **flotante y no modal** («¡Obtén un 10 % de descuento en tu primera compra!»): esquina en escritorio, tarjeta inferior en celular, una vez cada 14 días, luego queda una pestaña «🎁 10% OFF». | `src/services/welcome.ts`, `adapters/payments/stripe.ts`, `views/layout.tsx`, `market.js` |
| Rediseño | Héroe con buscador, oferta destacada y confianza; categorías en fichas; sección **Ofertas**; catálogo con búsqueda, categoría, **filtros rápidos** (Ofertas, Desde $0, Disponibles) y **orden** (precio, nuevos, valorados) que funcionan sin JS; tarjetas con jerarquía de precio (actual grande, tachado, % y ahorro, precio con cupón); ficha con cinta OFERTA, caja de compra con «paga lo que quieras», «Completa tu kit». Sin scroll horizontal en 390 px. | `src/views/shop.tsx`, `market.css` (sección v3), `market.js` |
| Productos nuevos | **PageSpeed Forensics** (paga lo que quieras, desde $0, sugerido $9) y **SpecReel Stick** (USD 12) a la venta. **Motor creativo para Claude Code** (el `artcraft-studio-engine`) y **CutPilot** (la ficha ahora describe el `estudio-video` real) quedan **Próximamente** con lista de espera — ver §2. | `seed/catalog-v3.json`, `migrations/0005`, `design/*.html` |
| SEO / Merchant | Meta descripciones ≤ 160, JSON-LD con oferta y precio tachado, feed con `sale_price`, categoría oficial 313, sin productos de precio 0 (Merchant no los acepta), sitemap e imágenes; **auditoría automática** después de cada deploy y cada lunes. | `src/services/seo.ts`, `scripts/audit-catalog.mjs`, `.github/workflows/market-audit.yml` |
| Agente E-commerce Manager | Subagente + skill con el procedimiento completo (publicar un repo, precios, ofertas, fichas, imágenes, SEO, feed, ZIP, despliegue, revisión semanal). Su primera tarea fue este rediseño. | `.claude/agents/ecommerce-manager.md`, `.claude/skills/ecommerce-manager/` |
| Agente Content & Affiliate Manager | Subagente + skill + scripts (Markdown → post JSON, validador SEO/afiliados, buscador de la base de 139 partners). Enlaces de afiliado solo de la base, con `rel="sponsored nofollow"` y aviso de afiliados. Primer artículo escrito por el agente. | `.claude/agents/content-affiliate-manager.md`, `.claude/skills/articulo-afiliados/`, `scripts/content/`, `docs/AGENTE-CONTENIDO.md` |

## 2. Decisiones que tomé (y por qué)

1. **La herramienta de «muñequitos de palo» no convierte fotos en muñecos.** El repo `specreel-stick` crea *sketches*
   de video con muñequitos de palo a partir de una idea (dos personajes, una comparación, subtítulos, música). La ficha
   describe eso y una pregunta frecuente lo aclara, para no prometer algo que no hace. Precio: USD 12, como pediste.
2. **`estudio-video` y `artcraft-studio-engine` no se venden todavía** (quedan «Próximamente» con lista de espera):
   - Los dos **inyectan metadatos falsos de Adobe y borran marcas de IA (C2PA/SynthID)** de forma automática en cada
     entrega. Vender eso expone a la marca (Adobe, reglas de divulgación de IA de las plataformas) y a los compradores.
     Hay que quitarlo del código antes de empaquetar.
   - Incluyen **material de clientes** (Merkhify, Optimus, un teléfono de cliente) y rutas fijas de Windows
     (`C:/Users/antho/...`); un comprador no podría instalarlos tal cual.
   - «ARTCRAFT» es una **marca de terceros** cuya licencia prohíbe usarla en otro producto: la ficha se llama
     «Motor creativo para Claude Code» (slug `motor-creativo-claude-code`).
   - `estudio-video` es justo el motor que prometía **CutPilot**: reescribí esa ficha con lo que el estudio hace de
     verdad (y quité la imagen que prometía «5 reels», que no existe).
3. **Precios de los repos sin precio indicado**: PageSpeed Forensics y el motor creativo usan «paga lo que quieras»
   desde $0 (sugerido $9 y $19), que encaja con «comercializar y compartir». Se cambian en el admin.
4. **Licencias**: PageSpeed Forensics se vende con su licencia **MIT** tal cual (el comprador podría redistribuirlo).
   En SpecReel Stick completé la plantilla de licencia con los términos que ya promete la tienda para SpecReel
   (Tony Ciencia LLC, 1 creador, uso comercial y para clientes, ley de Nuevo México). Conviene que un abogado la revise.
5. **Tope de USD 1.000.000**: Stripe cobra como máximo **USD 999,999.99** por pago (8 dígitos) y como mínimo
   **USD 0.50**. Por eso: 0 = gratis sin Stripe; 0.01–0.49 se rechaza con un aviso; 0.50–999,999.99 se cobra. Los
   bancos pueden rechazar montos muy altos aunque Stripe los acepte.
6. **Archivos de producto sin claves**: los ZIP salen de repos privados y este repo es público. El Worker acepta el
   ZIP solo si su SHA-256 coincide con el publicado en `provision/manifest.json` (ver `workers/market/provision/README.md`).
7. **Títulos y metadatos**: SpecReel pasa a título en español (la tienda es en español) solo si seguía el título en
   inglés; las meta descripciones de 4 fichas se recortan a ≤ 160. No toqué descripciones escritas por ti.

## 3. Lo que te toca a ti

1. **Google Merchant Center** → Productos → Fuentes de datos → «Archivo en un sitio web» →
   `https://tonyciencia.com/market/feed.xml` (diaria). País: Estados Unidos, moneda USD.
2. **Search Console**: enviar `https://tonyciencia.com/market/sitemap.xml` (ya está en `robots.txt`).
3. **Estudio de video / Motor creativo**: decidir si se quita la inyección de metadatos de Adobe y la limpieza de
   marcas de IA para la versión de venta; con eso, el agente E-commerce Manager arma el paquete limpio.
4. **SpecReel**: la tienda dice «actualizaciones 2.x gratis» pero el `LICENSE.md` del repo dice 1.x. Elige una.
5. **Base de afiliados**: cuando la tengas, agrégala en `content/affiliates/extra.json` (formato en el README de esa carpeta).

## 4. Vuelta atrás

- Revertir el merge del PR en GitHub (vuelve a desplegar blog y market anteriores) o
  `cd workers/market && pnpm wrangler rollback --env production`.
- Precios: en `/market/admin` (o una migración con guarda). Las columnas nuevas no molestan al código anterior.
- Cupón: desactivarlo en Stripe (Products → Coupons) y poner `WELCOME_COUPON_AUTOCREATE: "false"` en `wrangler.jsonc`.
