# Plan Market v2 + mejoras del sitio (31-10-2026)

Pedido de Tony: rehacer el market para que se vea como una tienda de verdad (Amazon, Lemon Squeezy, Gumroad), sumar
productos, portadas nuevas, precios/estrellas/ventas, SEO y Google Merchant, servicio de agentes a medida con reserva
pagada, popup de 10 % con el cupón TONYCIENCIA, más efectos en la web, video de YouTube, arreglar las traducciones,
el menú hamburguesa, la barra superior y el footer, y evaluar sacar el market a un subdominio. Todo con control de
cambios y directo a producción.

## 1. Lo que quedó hecho

### Market (`workers/market/`)

| Qué | Dónde |
|---|---|
| Catálogo nuevo: hero con portadas que se mueven con el cursor, marquesina, filtros por categoría y búsqueda (funcionan sin JS), tarjetas con etiquetas, precio, estrellas y ventas, banner del servicio a medida, "por qué comprar aquí", preguntas frecuentes | `src/views/shop.tsx` → `Catalog` |
| Ficha tipo Amazon/Gumroad: galería con miniaturas (flechas, teclado, deslizar), caja de compra fija, "qué incluye", detalles del producto, preguntas, reseñas con desglose de estrellas, relacionados y barra de compra fija en celular | `ProductPage` |
| Portadas y pantallas nuevas (3 por producto) respetando la paleta de cada uno: Anuncios Infinitos (crema/amarillo/tinta), SpecReel (negro/blanco técnico, botella 3D renderizada con Three.js) | `design/*.html` → `pnpm render:covers` → `public/market/static/products/` |
| 3 productos nuevos **"Próximamente"** con lista de espera: CutPilot (editar videos con Claude Code), Kit n8n de Agentes IA y Carruseles Infinitos | `seed/catalog.mjs`, migración `0003` |
| Servicio **Agentes de IA para empresas** con reserva pagada | `/market/agentes-para-empresas` (`ServicePage`) |
| Popup + banda "10 % en tu primera compra" con **TONYCIENCIA**, botón copiar y el código precargado en el checkout | `layout.tsx`, `market.js`, `services/welcome.ts` |
| SEO: meta título y descripción por producto, Open Graph con la portada, JSON-LD (Product, Offer, BreadcrumbList, FAQPage, Store, Service), sitemap y feed de Google Merchant | `services/seo.ts`, `/market/sitemap.xml`, `/market/feed.xml` |
| Reseñas reales (solo compradores, desde Mis compras), ventas reales (pedidos pagados) y etiquetas automáticas ("Nuevo", "Más vendido" con ≥ 3 ventas, "Próximamente") | `repo.ts`, `lib/catalog.ts` |
| Admin: campos de vitrina/SEO, disponibilidad, precio tachado, ventas fuera del market, moderación de reseñas y lista de espera | `/market/admin`, `/market/admin/resenas`, `/market/admin/lista-espera` |
| Menú móvil que **sí se cierra** (✕, Escape, tocar fuera) y footer nuevo | `layout.tsx` |
| Deploy automático del market al hacer merge a `main` (pruebas → migraciones → deploy) | `.github/workflows/market-deploy.yml` |

Las migraciones solo **agregan** columnas y tablas; la de catálogo rellena lo vacío, antepone las portadas nuevas y
**conserva las imágenes que ya subiste** (quedan detrás en la galería). No cambia precios, títulos, descripciones ni
archivos. Probado con una copia simulada de producción (`pnpm test:migration`).

Pruebas: 81 de Vitest (14 nuevas), E2E completo en navegador y prueba de migración.

### Blog

- **Menú hamburguesa**: la X ahora queda por encima del panel (antes el panel la tapaba y no había cómo salir). Botón
  "Cerrar", Escape, tocar el fondo, foco atrapado, cierre al volver atrás. Incluye Market, agentes para empresas,
  idioma y redes.
- **Barra superior**: enlace activo, Market destacado, sombra al bajar, barra de progreso de lectura, hamburguesa hasta 900 px.
- **Footer**: columna Market, "Agentes a medida", botón "Ir al Market", cambio de idioma y "Volver arriba".
- **Home**: último video de YouTube (se lee del canal automáticamente; carga liviana, sin cookies hasta el clic),
  vitrina del Market y animación/aurora en el titular.
- **Servicios**: "Agentes a medida" y la **mascota de Merkhify** que aparece y flota al pasar por el servicio
  (en celular aparece sola al entrar en pantalla).
- **Efectos**: aparición al hacer scroll y luz que sigue al cursor en tarjetas; respetan "reducir movimiento".
- **Traducciones**: `/en/posts/…` mostraba artículos en español; ya no. El botón de idioma encuentra la traducción
  (CMS y `content/`) y, si no hay, lleva al índice del otro idioma. Se quitaron los widgets de la barra lateral
  (estaban en inglés y con enlaces rotos). Textos sueltos traducidos y 404 en inglés.

## 2. Decisiones que tomé (y por qué)

1. **No puse ventas ni estrellas inventadas.** Pediste "4 o 7 ventas y unas estrellas" para dar confianza. Mostrar
   cifras falsas en una tienda que cobra de verdad va contra la norma de la FTC sobre reseñas falsas (16 CFR 465) y
   contra las políticas de Google: con datos estructurados de reseñas falsas o un Merchant Center con información
   engañosa, Google puede suspender la cuenta justo cuando quieres aparecer en Shopping. En su lugar:
   - las ventas se cuentan solas desde ya (pedidos pagados);
   - si vendiste estos productos en otra plataforma, carga esas ventas reales en el admin ("Ventas fuera del market");
   - las estrellas salen de reseñas de compradores verificados (cada comprador puede dejarla desde Mis compras).
2. **Los 3 productos ficticios están como "Próximamente", no a la venta.** Con pagos en vivo, alguien podría pagar
   por algo que no existe. Así llenan la vitrina, captan correos en la lista de espera y prueban la demanda. Cuando
   tengas el ZIP: en el admin cambias "Disponibilidad" a "Disponible" y subes el archivo.
3. **Descuentos**: el "precio tachado" existe en el admin, pero no lo puse en ningún producto porque solo vale si
   ese precio existió de verdad. El descuento visible es el **real**: el precio con TONYCIENCIA aparece en cada
   tarjeta y ficha en cuanto el cupón exista en Stripe.
4. **El popup solo aparece si el cupón existe en Stripe.** Así nunca se anuncia un código que falle al pagar.
5. Retiré el botón flotante "Market Tony" **dentro** del market (era redundante con la cabecera); en el blog sigue.

## 3. Lo que te toca a ti (en orden)

1. **Cupón TONYCIENCIA en Stripe** (Products → Coupons): 10 % de descuento, duración *once*. En el cupón o en el
   código promocional agrega la metadata `market` = `true` (sin eso el market lo rechaza, para no aceptar cupones
   de tus otros negocios). Código promocional: `TONYCIENCIA`. Opcional: "Limit to first-time order". En ≤ 10 minutos
   aparecen el popup, la banda y el precio con cupón.
2. **Reservas con pago (Google Calendar)**: Google Calendar → Crear → Agenda de citas → "Diagnóstico de agentes de
   IA" (45–60 min) → en "Formulario de reserva" activa **Pagos** y conecta Stripe → pon el precio → Guardar →
   "Compartir" → copia el enlace. Pégalo en `workers/market/wrangler.jsonc` → `env.production.vars.BOOKING_URL` (o
   pídemelo y lo hago). Si es un enlace `calendar.google.com/calendar/appointments/…`, el calendario se ve incrustado
   en la página. Requiere un plan de Google Workspace (o Google One) que incluya agendas de citas con pago. Mientras no
   esté, el botón pide horarios por correo a business@.
3. **Google Merchant Center**: Productos → Fuentes de datos → Agregar → "Archivo en un sitio web" →
   `https://tonyciencia.com/market/feed.xml` (actualización diaria). Ojo: Google restringe muchos productos digitales
   en los **anuncios** de Shopping (por ejemplo, prohíbe ebooks/PDF en anuncios); las **fichas gratuitas** sí los
   aceptan. Los servicios no se pueden listar en Merchant Center, por eso el servicio no está en el feed.
4. **Google Search Console**: envía `https://tonyciencia.com/market/sitemap.xml` (también quedó en `robots.txt`).
5. **⚠ Desplegar el market (pendiente; lo más importante).** El blog ya está en producción, pero el primer deploy
   automático del market (31-10, 03:36 UTC) se detuvo antes de tocar nada porque el token `CF_API_TOKEN` de GitHub no
   tiene permiso de D1 (`not authorized to access this service [code: 7403]`). La base y el Worker del market siguen
   como estaban. Dos caminos:
   - **Ampliar el token** (Cloudflare → My Profile → API Tokens → el token de GitHub → Edit): agrega *Account → D1:
     Edit* y *Zone → Workers Routes: Edit* (zona tonyciencia.com); ya tiene *Workers Scripts: Edit*. Luego en GitHub →
     Actions → "Market — deploy a producción" → *Re-run jobs*.
   - **O a mano** desde tu PC (con `wrangler login` hecho):
     `cd workers/market && git pull && pnpm install && pnpm wrangler d1 migrations apply MARKET_DB --remote --env production && pnpm deploy:production`
   Mientras tanto, los enlaces del blog a páginas nuevas del market ("Agentes a medida" y la tarjeta de CutPilot) se
   desvían solos a Contacto o se ocultan (el blog detecta si `/market/sitemap.xml` existe). Cuando el market v2 quede
   en producción, vuelven solos a su destino, sin tocar el blog.
6. **EmDash**: 9 artículos en inglés tienen el slug con `en/` adelante (dan 404). Quítale el `en/` al slug y llena
   `translation_of`. Mientras tanto el índice en inglés los oculta.

## 4. ¿Subdominio (market.tonyciencia.com) o /market?

| | `/market` (hoy) | `market.tonyciencia.com` |
|---|---|---|
| SEO | Suma a la autoridad del dominio principal: los posts del blog empujan a los productos y viceversa | Google puede tratarlo como un sitio aparte; hay que construir su autoridad y su propiedad en Search Console |
| Técnica | Ya funciona: Worker aparte con rutas `/market` y `/market/*` | Custom Domain del Worker; cambian la URL de OAuth de Google, el webhook de Stripe y el `SITE_URL` |
| Aislamiento | Comparte dominio (cookies con `path=/market`) | Total: cookies, CSP y analítica propias |
| Marca | "Tony Ciencia" como un todo | Se siente como una tienda independiente |

**Recomendación: quedarse en `/market`.** Los productos apuntan a la misma audiencia que el blog (quien busca "cómo
editar videos con Claude" puede llegar a un post y de ahí al producto), y el subdominio no da hoy una ventaja que
compense el trabajo de migrar OAuth, webhook y SEO. Si quieres una URL fácil de decir, se puede apuntar
`market.tonyciencia.com` con una redirección 301 a `https://tonyciencia.com/market` (regla de redirección en
Cloudflare; toca DNS, por eso no la hice). Volver a evaluarlo si el market se vuelve multi-vendedor o necesita otra
plataforma.

## 5. Control de cambios y cómo volver atrás

- Todo está en la rama `claude/kind-johnson-rmmg3j`, en commits separados (market, blog, deploy/documentación),
  y entra a producción por un pull request.
- Estado anterior: commit `cbce9d3` de `main`. Para volver: revertir el merge del PR en GitHub (botón *Revert*), que
  vuelve a desplegar el blog y el market anteriores.
- Market, más rápido: `cd workers/market && pnpm wrangler rollback --env production` (vuelve a la versión anterior
  del Worker en Cloudflare). Las columnas nuevas de la base no molestan al código anterior.
- Las portadas se regeneran con `pnpm render:covers` (editar `design/<producto>.html`).

## 6. Siguientes pasos sugeridos

1. Un post en el blog "Cómo editar videos con Claude Code (guía 2026)" que enlace a SpecReel y a la lista de espera de
   CutPilot: es la forma más directa de ganar ese tráfico orgánico.
2. Cuando un producto próximo esté listo: correo a su lista de espera (`/market/admin/lista-espera`).
3. Correo automático pidiendo reseña 7 días después de la compra.
4. Videos de demostración por producto (campo "Video de YouTube" en el admin).
