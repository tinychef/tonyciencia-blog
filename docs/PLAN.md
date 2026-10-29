# Plan — Market Tony (`tonyciencia.com/market`)

Estado: en construcción en la rama `claude/tender-mayer-mqn7z3`. Este documento es el plan;
la entrega final para quien conecte credenciales está en [`HANDOFF.md`](../HANDOFF.md).

## 1. Lo que ya existe (y se respeta)

- Sitio: Astro 7 (`output: "server"`) + EmDash CMS, desplegado como Worker `tonyciencia`
  (D1 `DB`, R2 `MEDIA`, KV `SESSION`). Deploy: `pnpm deploy` (manual) o `deploy.yml` en push a `main`.
- Precedente de Workers hermanos independientes: `workers/email-capture/` (Worker propio, su propio
  `wrangler.jsonc`, sin tocar el Worker del blog).
- Sistema de diseño real: `src/styles/theme.css` ("Minimal Premium": oscuro por defecto,
  monocromático, acento blanco, foco azul `--color-signal`, botones redondeados, sin sombras).
  Nota: `CLAUDE.md` todavía describe un tema "retro pixel ámbar" que ya no es el que está en el código;
  se sigue el código.

## 2. Decisión de arquitectura

**El market es un Worker separado** (`workers/market/`, nombre `tonyciencia-market`) que atiende
`tonyciencia.com/market` y `tonyciencia.com/market/*` mediante rutas de Workers. El blog sigue intacto.

Por qué no dentro del Astro del blog:

1. **Aislamiento de fallos**: la guardia "MODE=mock en producción ⇒ no arrancar" tumba solo el market,
   nunca el blog. Un deploy del blog (n8n → PR → `deploy.yml`) no puede publicar el market por accidente.
2. **Mínimo privilegio**: las claves de Stripe, Google y Resend viven solo en el Worker del market,
   no en el Worker del CMS (que además ejecuta plugins de EmDash).
3. **Bases separadas**: D1 y R2 propios del market; no se mezclan tablas con las de EmDash
   (CLAUDE.md prohíbe consultar la D1 de EmDash directo).
4. **Vistas previas seguras**: entornos `preview` (mock) y `staging` (live con claves de prueba)
   con sus propios recursos, sin tocar producción.

Coste aceptado: el market tiene su propio layout (cabecera/pie) en JSX, pero **reutiliza los tokens
de `src/styles/theme.css`** (se copian con `pnpm sync:theme`) para verse igual que el sitio.

> Ojo con la ruta: **no** usar `tonyciencia.com/market*` porque también capturaría
> `/marketing-digital` (página existente). Se usan dos rutas: `tonyciencia.com/market` y
> `tonyciencia.com/market/*`.

## 3. Stack

| Pieza | Elección |
|---|---|
| Runtime | Cloudflare Workers (módulo ES), `nodejs_compat` no requerido |
| Router + vistas | [Hono](https://hono.dev) + `hono/jsx` (SSR, escapado automático, cero JS en el navegador) |
| Datos | D1 `MARKET_DB` (productos, usuarios, sesiones, pedidos, accesos, descargas, eventos, correos) |
| Archivos | R2 `MARKET_FILES`, bucket **privado** (sin dominio público ni r2.dev) |
| Correo | `send_email` binding `EMAIL` (Cloudflare Email Sending, beta) o Resend (API HTTP) |
| Pagos | Stripe Checkout vía API REST (`fetch`, sin SDK), detrás de un adaptador |
| Login | Google OAuth 2.0 / OpenID Connect (code + PKCE + state + nonce) |
| Tareas | Cron Trigger cada 5 min: reintentos de correo y limpieza |
| Pruebas | Vitest + `@cloudflare/vitest-pool-workers` (D1/R2 reales de Miniflare) y Playwright E2E |

## 4. Modo maqueta (`MODE = mock | live`)

Toda dependencia externa está detrás de una interfaz (`src/adapters/types.ts`) con dos implementaciones:

| Interfaz | `mock` | `live` |
|---|---|---|
| `AuthProvider` | Pantalla `/market/auth/dev` para entrar con un usuario falso | Google OAuth real |
| `PaymentProvider` | Página de pago falsa `/market/maqueta/pago/:id` que firma un evento con el **mismo esquema de Stripe** y lo pasa por el **mismo manejador** `/market/webhooks/pagos` | Stripe Checkout + verificación de firma `Stripe-Signature` |
| `FileStorage` | Almacén local de desarrollo (tabla `mock_files` en D1 + archivos de prueba incluidos en el código). Nunca toca R2 | R2 privado + URL firmada de vida corta |
| `EmailSender` | Se guarda en D1 y se ve en `/dev/correos` | Cloudflare Email Sending o Resend (`EMAIL_PROVIDER`) |

Guardias de seguridad (`src/config.ts`):

- `MODE=mock` + `SITE_URL` de producción (`tonyciencia.com`) ⇒ el Worker **lanza un error al arrancar**
  (el deploy falla) y además cada petición con `Host` de producción responde 503.
- `MODE=live` sin todas las claves obligatorias ⇒ no arranca (falla cerrado).
- Clave `sk_live_` sin `ALLOW_LIVE_PAYMENTS=true` ⇒ no arranca (evita cobros reales por accidente).
- En `live`, todo lo de maqueta (`/dev/*`, `/market/auth/dev`, `/market/maqueta/*`) responde 404.

## 5. Tablas D1 (`migrations/0001_init.sql`)

| Tabla | Para qué |
|---|---|
| `products` | slug, título, resumen, descripción, `price_cents`, `currency`, `kind` (`paid`/`free`), imágenes (JSON), `file_key`, `file_name`, límite de descargas, `active`, orden |
| `users` | **solo** correo y nombre (+ fechas y consentimiento de marketing opcional) |
| `sessions` | hash SHA-256 del token de sesión, usuario, vencimiento |
| `orders` | pedido: usuario, producto, monto/moneda **tomados de la BD**, estado, proveedor, id de sesión de pago |
| `entitlements` | acceso a un producto (gratis o comprado): límite y contador de descargas, revocación |
| `downloads` | registro de cada descarga (vía sitio o correo) |
| `payment_events` | id de evento del proveedor ⇒ idempotencia del webhook |
| `email_outbox` | cola de correos con `dedupe_key` única, estado, intentos, error, reintento |
| `dev_emails` | bandeja de la maqueta (`/dev/correos`) |
| `mock_files` | archivos del almacén de desarrollo |
| `mock_checkout_sessions` | sesiones de pago simuladas |
| `rate_limits` | contadores de ventana fija para limitar frecuencia |

## 6. Rutas

Públicas: `GET /market` (catálogo) · `GET /market/producto/:slug` (detalle) ·
`GET /market/legal/{terminos,privacidad,reembolsos}`.

Sesión: `GET /market/entrar` · `GET /market/auth/google` → `GET /market/auth/google/callback` (live) ·
`GET|POST /market/auth/dev` (mock) · `POST /market/salir`.

Compra y gratis: `POST /market/producto/:slug/comprar` (crea sesión de Checkout; precio desde BD) ·
`POST /market/producto/:slug/obtener` (gratis + casilla opcional de marketing) ·
`GET /market/pago/exito` · `GET /market/pago/cancelado` ·
`GET|POST /market/maqueta/pago/:id` (mock).

Webhook: `POST /market/webhooks/pagos` (firma + idempotencia).

Descargas: `GET /market/mis-compras` · `GET /market/descargas/:id?t=…` (aterrizaje del enlace del correo,
sin efectos) · `POST /market/descargas/:id` (autoriza, cuenta y redirige) ·
`GET /market/archivo/:token` (entrega firmada de vida corta) · `GET /market/media/images/*` (imágenes de producto).

Admin (solo `ADMIN_EMAIL`): `/market/admin` · `/market/admin/productos/nuevo` · `/market/admin/productos/:id` ·
`/market/admin/pedidos` · `/market/admin/pedidos/:id` · `/market/admin/correos`.

Desarrollo (solo mock): `GET /dev/correos` · `GET /dev/correos/:id`.

## 7. Correo

- Entrega por **enlace firmado** (nunca adjunto). El enlace del correo lleva un token HMAC ligado al acceso
  (vence en `EMAIL_LINK_TTL_DAYS`); abre una página sin efectos con un botón "Descargar" (POST), para que los
  escáneres de enlaces de los clientes de correo no gasten descargas.
- Cada correo de compra o de descarga gratis genera **dos mensajes**: uno al cliente y otro, aparte, a
  `ADMIN_COPY_EMAIL` (no CCO). Cada uno tiene su `dedupe_key` única ⇒ nunca se duplican.
- `EMAIL_PROVIDER = cloudflare | resend | mock`. Errores ⇒ se registran y se reintentan con backoff desde el cron,
  con *lease* para que dos ejecuciones no envíen el mismo correo.

## 8. Pagos e impuestos

- Adaptador intercambiable (`PAYMENT_PROVIDER`, hoy `stripe`); Polar/Dodo/Managed Payments se agregarían
  como otra implementación de `PaymentProvider` sin tocar rutas ni BD.
- `STRIPE_TAX_ENABLED=false` por defecto. No se asume nada más sobre impuestos.

## 9. Botón flotante

`src/components/MarketFab.astro`, incluido una sola vez en `src/layouts/Base.astro` (todas las páginas del blog)
y replicado en el layout del market. Accesible por teclado, respeta `prefers-reduced-motion`, se aparta del botón
"volver arriba" de los posts y del banner de cookies, y deja un espaciador al final para no tapar el pie en celular.

## 10. Orden de trabajo

1. Plan (este archivo) → 2. Worker + migraciones + seed → 3. Adaptadores mock/live + guardias →
4. Rutas/vistas/admin/legales → 5. Botón flotante → 6. Pruebas automáticas + E2E en navegador →
7. `HANDOFF.md` y `.env.example`.
