# HANDOFF — Market Tony (`tonyciencia.com/market`)

Para el agente que va a conectar credenciales. Todo el código está en la rama
`claude/tender-mayer-mqn7z3`. El plan de arquitectura está en [`docs/PLAN.md`](docs/PLAN.md).

**En 30 segundos:** el market es un Worker de Cloudflare **separado del blog** (`workers/market/`, Hono + D1 + R2).
Funciona completo en **modo maqueta** (`MODE=mock`): login falso, pago simulado que pasa por el mismo webhook que
usará Stripe, correos guardados en `/dev/correos` y archivos de prueba. Las implementaciones **live** (Google,
Stripe, R2, Cloudflare Email Sending, Resend) están escritas y probadas contra dobles, **no contra los servicios
reales**. Te falta: crear recursos, guardar secretos, configurar correo y Stripe, subir el ZIP y probar en staging.

> ⚠ **Seguridad — antes de nada.** Durante esta sesión se pegaron en el chat una clave secreta **live** de Stripe
> (`sk_live_…`) y lo que parece la **Global API Key** de Cloudflare. **No se usaron ni se guardaron** en ningún
> archivo. Pídele al dueño que **las rote** (Stripe: Developers → API keys → *Roll key*; Cloudflare: My Profile →
> API Tokens → Global API Key → *Change*) y que te dé credenciales nuevas **sin pegarlas en el chat**: cada secreto
> se escribe en la terminal con `wrangler secret put` (el valor no queda en el historial ni en el repo). Para
> desplegar, mejor un **API Token con permisos limitados** que la Global API Key.

---

## 1. Qué quedó funcionando en modo maqueta (probado)

Todo esto se verificó en esta sesión, en local (`wrangler dev` + `workerd`):

| Qué | Cómo se probó |
|---|---|
| Catálogo `/market` y detalle `/market/producto/:slug` desde D1 (no desde el código) | E2E en navegador + capturas escritorio/celular |
| Login de maqueta (`/market/auth/dev`) por el mismo flujo `start → callback` que usará Google | Vitest + E2E |
| Compra: botón "Comprar" → pedido con precio **de la BD** → checkout simulado → evento con forma y firma de Stripe → **mismo** `/market/webhooks/pagos` | Vitest (`pricing`, `webhook`) + E2E |
| Webhook: firma (incluye cuerpo alterado, secreto equivocado, timestamp viejo), idempotencia (evento repetido, eventos distintos de la misma sesión, **entregas concurrentes**), monto que no coincide → "review", reembolso → revoca acceso, sesión vencida | Vitest `webhook.test.ts` |
| Producto gratis: login → casilla opcional **sin marcar** → descarga en el sitio + correo; doble clic no duplica | Vitest + E2E |
| Descargas: URL firmada de 5 min; solo el dueño; enlace del correo firmado (14 días) que abre una página **sin efectos** (los escáneres de correo no gastan descargas); límite por compra; revocado → 403; en maqueta **nunca** se sirve un archivo real (no toca R2) | Vitest `downloads.test.ts` + E2E |
| Correo: cliente + **copia aparte** a `ADMIN_COPY_EMAIL` (no CCO), exactamente una vez; reintentos con backoff tras fallo; *lease* contra envíos simultáneos; envío interrumpido con Cloudflare no se reenvía solo (no duplica) | Vitest `email.test.ts` |
| `/dev/correos` (solo maqueta; 404 en live) | E2E |
| Admin `/market/admin` (solo `ADMIN_EMAIL`): crear/editar productos, subir archivo e imágenes, activar/desactivar (no deja activar sin archivo), pedidos, reintentar correos, reiniciar descargas | Vitest (live con R2 local) + E2E |
| **MODE=mock en `tonyciencia.com` se niega a arrancar**: el Worker lanza error al cargar (deploy rechazado) y además cada petición con Host de producción responde 503 | `pnpm test:startup-guard` (runtime real) + Vitest `guard.test.ts` |
| Live falla cerrado: falta cualquier secreto → 503; `sk_live_` sin `ALLOW_LIVE_PAYMENTS=true` → no arranca | Vitest `guard.test.ts` |
| Botón flotante "Market Tony" en **todas** las páginas del blog (vía `Base.astro`) y del market | Playwright sobre `astro dev`: teclado (Tab + Enter), no se solapa con el banner de cookies ni con "volver arriba", se esconde al bajar en celular, el menú móvil lo cubre |
| Blog intacto | `pnpm typecheck` (0 errores) y `pnpm build` OK; `seed/seed.json` sin cambios |

Totales: **61 pruebas Vitest** (`pnpm test`), **1 prueba E2E** de punta a punta en Chromium (`pnpm test:e2e`),
**1 prueba de arranque** en el runtime real (`pnpm test:startup-guard`).

## 2. Escrito pero SIN probar contra los servicios reales

Marcado en el código con `⚠ LIVE SIN PROBAR`.

| Pieza | Archivo | Qué sí está probado | Qué falta probar de verdad |
|---|---|---|---|
| Google OAuth (code + PKCE + state + nonce) | `src/adapters/auth/google.ts` | Flujo completo con el token endpoint interceptado; validación de `iss/aud/exp/nonce/email_verified` | Login real con un Client ID real y la pantalla de consentimiento |
| Stripe Checkout (REST, sin SDK) | `src/adapters/payments/stripe.ts` | Cuerpo exacto enviado (precio de la BD, `Idempotency-Key`, impuestos), firma de webhook con el esquema de Stripe | Sesión real en modo prueba, webhook real, tarjetas de prueba, reembolso real |
| R2 (bucket privado) | `src/adapters/storage/r2.ts` | put/get/head contra el R2 local de Miniflare; URL firmada por el Worker | Bucket real; URL **prefirmada S3** solo probada contra el vector oficial de AWS |
| Cloudflare Email Sending | `src/adapters/email/cloudflare.ts` | Binding falso con la API documentada (`send()` → `{messageId}`, errores con `code`) | Envío real (requiere plan Workers de pago y dominio "onboarded") |
| Resend | `src/adapters/email/resend.ts` | Respuestas HTTP simuladas, `Idempotency-Key` | Envío real |
| Cron (`*/5 * * * *`) | `src/index.ts` | Handler `scheduled` en Vitest | Disparo real en Cloudflare |
| Rutas de producción | `wrangler.jsonc` → `env.production.routes` | — | Que `tonyciencia.com/market/*` gane sobre el dominio del blog (según la doc de Cloudflare, las rutas corren antes que el Custom Domain) y que `/marketing-digital` siga en el blog |

## 3. Lista ordenada de lo que falta conectar

Todos los comandos se corren desde `workers/market/`. `pnpm wrangler …` es wrangler con `-c wrangler.jsonc`
explícito (necesario: el build del blog deja `../../.wrangler/deploy/config.json`, que confunde a wrangler).

### Paso 0 — Preparación

```bash
cd workers/market
```

```bash
pnpm install
```

```bash
pnpm wrangler login
```

(O exporta `CLOUDFLARE_API_TOKEN` con un token limitado: *Workers Scripts: Edit*, *D1: Edit*, *Workers R2 Storage: Edit*,
*Account Settings: Read*, *Zone → Workers Routes: Edit* para tonyciencia.com; y `CLOUDFLARE_ACCOUNT_ID`.)

Comprobaciones locales antes de tocar nada remoto:

```bash
pnpm typecheck && pnpm test && pnpm test:startup-guard
```

### Paso 1 — Credenciales de Google OAuth y URL de redirección

1. Google Cloud Console → crea (o elige) un proyecto → **APIs & Services → OAuth consent screen**:
   tipo *External*; nombre "Market Tony"; correo de soporte; dominio autorizado `tonyciencia.com`;
   política de privacidad `https://tonyciencia.com/market/legal/privacidad`; términos `https://tonyciencia.com/market/legal/terminos`.
   Alcances: solo `openid`, `email`, `profile` (no requieren verificación de Google). Publica la app (*In production*);
   en modo *Testing* solo entran los usuarios de prueba que agregues.
2. **Credentials → Create credentials → OAuth client ID → Web application.** URIs de redirección **exactas**:
   - `https://tonyciencia.com/market/auth/callback`
   - `https://tonyciencia-market-staging.<SUBDOMINIO>.workers.dev/market/auth/callback`
     (`<SUBDOMINIO>` = tu subdominio de workers.dev; el Worker hermano usa `antonioduquejuliao`, confírmalo en el dashboard).
   No hace falta "Authorized JavaScript origins" (el flujo es 100 % del servidor).
   Si Google rechaza el dominio `workers.dev`, usa un subdominio propio para staging (p. ej. `market-staging.tonyciencia.com`
   como Custom Domain del Worker de staging — **requiere tocar DNS: pedir permiso al dueño**) y cambia `SITE_URL` de staging.
3. Guarda los secretos (te pedirá el valor; no lo pegues en el chat):

```bash
pnpm wrangler secret put GOOGLE_CLIENT_ID --env staging
```

```bash
pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env staging
```

(Repite con `--env production` cuando llegues al paso 7.)

### Paso 2 — Base D1, bucket R2 privado y bindings reales

```bash
pnpm wrangler d1 create tonyciencia-market-preview
```

```bash
pnpm wrangler d1 create tonyciencia-market-staging
```

```bash
pnpm wrangler d1 create tonyciencia-market
```

Copia cada `database_id` en `wrangler.jsonc` (`REEMPLAZAR_ID_D1_PREVIEW`, `…_STAGING`, `…_PRODUCTION`) y reemplaza
`REEMPLAZAR_SUBDOMINIO` por tu subdominio de workers.dev.

```bash
pnpm wrangler r2 bucket create tonyciencia-market-files-staging
```

```bash
pnpm wrangler r2 bucket create tonyciencia-market-files
```

**El bucket debe quedar privado**: no habilites la URL pública `r2.dev` ni un dominio personalizado. Verifícalo:

```bash
pnpm wrangler r2 bucket dev-url get tonyciencia-market-files
```

(debe decir que está deshabilitada). Las descargas salen solo por URLs firmadas de 5 minutos.

Aplica las migraciones y carga los productos de ejemplo (idempotente, no pisa lo editado):

```bash
pnpm wrangler d1 migrations apply MARKET_DB --remote --env preview
```

```bash
pnpm wrangler d1 migrations apply MARKET_DB --remote --env staging
```

```bash
node scripts/seed.mjs --env preview
```

```bash
node scripts/seed.mjs --env staging
```

(En staging/production el seed sube el PDF de ejemplo del producto gratis a R2 y deja **Anuncios Infinitos inactivo
y sin archivo** hasta el paso 5.)

Vista previa en **maqueta** (no necesita ninguna clave):

```bash
pnpm deploy:preview
```

`check-deploy` bloquea el deploy si quedan `REEMPLAZAR_…`, si preview no es `mock`, si staging/production no son `live`,
o si una ruta captura `/marketing-digital`. Opcional en preview: `openssl rand -base64 48 | pnpm wrangler secret put SESSION_SECRET --env preview`.

### Paso 3 — Envío de correo y verificación del dominio

**Opción principal: Cloudflare Email Sending (beta).** Requiere el **plan Workers de pago** para enviar a cualquier
destinatario y que el DNS del dominio esté en Cloudflare (lo está).

1. Dashboard → **Compute → Email Service → Email Sending → Onboard Domain** → `tonyciencia.com`.
   Cloudflare crea, en el subdominio `cf-bounce.tonyciencia.com`, registros **MX** (rebotes), **TXT SPF** y **TXT DKIM**,
   y un **TXT DMARC** en `_dmarc.tonyciencia.com`. **Esto toca el DNS: confírmalo con el dueño.** Si ya existe un
   `_dmarc`, no lo dupliques: conserva uno solo. El SPF del dominio raíz (p. ej. el de Google Workspace para
   `business@`) no se toca: el SPF de Cloudflare va en `cf-bounce`.
2. Remitente: `EMAIL_FROM = "Tony Ciencia <market@tonyciencia.com>"` (ya en `wrangler.jsonc`; debe ser del dominio
   onboarded). Respuestas a `EMAIL_REPLY_TO = business@tonyciencia.com`.
3. `EMAIL_PROVIDER=cloudflare` ya está en staging y production; el binding `send_email` `EMAIL` también.
4. Guarda los correos de administración:

```bash
pnpm wrangler secret put ADMIN_EMAIL --env staging
```

```bash
pnpm wrangler secret put ADMIN_COPY_EMAIL --env staging
```

**Respaldo: Resend.** En resend.com → Domains → Add domain (recomendado un subdominio de envío). Resend muestra los
valores exactos: **MX** y **TXT SPF** (`v=spf1 include:amazonses.com ~all`) en el subdominio `send`, **TXT DKIM**
en `resend._domainkey`, y recomienda **DMARC**. Luego:

```bash
pnpm wrangler secret put RESEND_API_KEY --env staging
```

y en `wrangler.jsonc` pon `EMAIL_PROVIDER=resend` (Resend como principal) o `EMAIL_FALLBACK_PROVIDER=resend`
(Cloudflare principal; Resend si Cloudflare falla de forma permanente o 3 veces seguidas).

Diagnóstico: `/market/admin/correos` muestra estado, intentos y último error de cada correo. Los "dead" necesitan
revisión manual (botón *Reintentar*).

### Paso 4 — Stripe (primero en modo de PRUEBA)

1. Stripe Dashboard en **Test mode** → Developers → API keys → *Secret key* (`sk_test_…`). Mejor aún, una
   **restricted key** (`rk_test_…`) con permiso *Checkout Sessions: Write*.

```bash
pnpm wrangler secret put STRIPE_SECRET_KEY --env staging
```

2. Developers → Webhooks → *Add endpoint*:
   - URL: `https://tonyciencia-market-staging.<SUBDOMINIO>.workers.dev/market/webhooks/pagos`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   - Copia el *Signing secret* (`whsec_…`):

```bash
pnpm wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
```

3. Secreto de sesión (≥ 32 caracteres aleatorios):

```bash
openssl rand -base64 48 | pnpm wrangler secret put SESSION_SECRET --env staging
```

Staging tiene `ALLOW_LIVE_PAYMENTS=false`: si alguien pone una clave `sk_live_` ahí, **el Worker no arranca**.

### Paso 5 — Subir el ZIP del producto y el texto final

Con la CLI (usa tus credenciales de wrangler; sirve para archivos grandes):

```bash
pnpm admin upload anuncios-infinitos ./ruta/anuncios-infinitos.zip --env staging
```

```bash
pnpm admin text anuncios-infinitos ./ruta/descripcion.md --env staging --title "Anuncios Infinitos: agente de IA con 250+ prompts de anuncios" --summary "Resumen final"
```

```bash
pnpm admin activate anuncios-infinitos --env staging
```

Formato de `descripcion.md`: párrafos separados por línea en blanco, `## ` = subtítulo, líneas con `- ` = lista.
También se puede hacer todo desde `/market/admin` (archivos de hasta 90 MB por formulario; imágenes PNG/JPG/WebP/GIF
para reemplazar la portada SVG provisional). Precio: `pnpm admin price anuncios-infinitos 77 --env staging`.

### Paso 6 — Prueba de punta a punta en vista previa con MODE=live y tarjetas de prueba

```bash
pnpm deploy:staging
```

Luego, en `https://tonyciencia-market-staging.<SUBDOMINIO>.workers.dev/market`:

1. Entrar con Google (cuenta real) → vuelve al producto.
2. **Comprar** Anuncios Infinitos → Stripe Checkout de prueba → tarjeta `4242 4242 4242 4242`, fecha futura,
   cualquier CVC y código postal → página "¡Gracias por tu compra!".
3. **Mis compras** → Descargar → baja el ZIP real desde R2.
4. Bandeja del comprador: correo con enlace de descarga (no adjunto) → abre → "Descargar ahora".
   Bandeja de `ADMIN_COPY_EMAIL`: **un** mensaje aparte "[Copia admin] …".
5. Stripe → Webhooks → el evento respondió 200. Pulsa **Resend** sobre ese evento: en `/market/admin/pedidos` y
   `/market/admin/correos` no debe aparecer nada duplicado.
6. Producto gratis: "Descargar gratis" con la casilla sin marcar → descarga + correo + copia admin.
7. Casos extra: tarjeta con 3D Secure `4000 0025 0000 3155`; tarjeta rechazada `4000 0000 0000 0002`
   (no crea acceso); reembolso total desde Stripe → el acceso queda revocado en "Mis compras".
8. Con otra cuenta de Google, intenta descargar el pedido anterior → debe dar error 403.
9. `/dev/correos` y `/market/auth/dev` deben responder 404 en staging.

Si algo falla: `pnpm wrangler tail --env staging` muestra los logs (`[webhook]`, `[correo]`, `[login]`, `[market]`).

### Paso 7 — Lo que debe revisar el dueño antes de producción

1. **Impuestos (decisión pendiente).** `STRIPE_TAX_ENABLED=false`. Opciones:
   - *Stripe directo + Stripe Tax*: activar Stripe Tax en el dashboard, registrar jurisdicciones, definir el
     comportamiento de impuestos por defecto y, si hace falta, `STRIPE_TAX_CODE`; luego `STRIPE_TAX_ENABLED=true`
     (el código solo agrega `automatic_tax[enabled]=true`).
   - *Stripe Managed Payments* o un *Merchant of Record* (Polar, Dodo): se implementa una clase nueva que cumpla
     `PaymentProvider` (`src/adapters/payments/<proveedor>.ts`, ver `types.ts`) y se elige en `adapters/index.ts` con
     `PAYMENT_PROVIDER`. Rutas, BD, descargas y correos no cambian. **No se asumió nada más sobre impuestos.**
2. **Textos legales** (borrador, `src/views/legal.tsx`): términos, privacidad y reembolsos de Market Tony, vendedor
   Tony Ciencia LLC, sin garantía de resultados de ventas, ley de Nuevo México, reembolso dentro de 14 días si no se
   descargó. Idealmente revisarlos con un abogado.
3. **Ir a producción** (solo con el visto bueno del dueño):
   - Secretos de production (los mismos del paso 1–4 con `--env production`; Stripe **live** + webhook live a
     `https://tonyciencia.com/market/webhooks/pagos`).
   - `ALLOW_LIVE_PAYMENTS: "true"` en `env.production.vars` (sin esto el Worker no arranca con `sk_live_`).
   - `pnpm wrangler d1 migrations apply MARKET_DB --remote --env production`, `node scripts/seed.mjs --env production`,
     subir el ZIP (paso 5 con `--env production`), `pnpm deploy:production`.
   - Verificar: `/market` lo sirve el market y `/marketing-digital`, `/` y `/posts` siguen siendo el blog.
   - **Orden de merge**: el botón flotante del blog apunta a `/market`. Desplegar el market en producción **antes** de
     mergear esta rama a `main` (el push a `main` despliega el blog), o el botón llevará a un 404.

## 4. Variables y secretos

Referencia completa en [`workers/market/.env.example`](workers/market/.env.example). Resumen:

| Nombre | Tipo | Dónde |
|---|---|---|
| `MODE` (`mock`/`live`), `SITE_URL`, `PAYMENT_PROVIDER`, `EMAIL_PROVIDER`, `EMAIL_FALLBACK_PROVIDER`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `STRIPE_TAX_ENABLED`, `STRIPE_TAX_CODE`, `ALLOW_LIVE_PAYMENTS`, `DOWNLOAD_URL_TTL_SECONDS`, `EMAIL_LINK_TTL_DAYS` | variable | `wrangler.jsonc` → `env.<entorno>.vars` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_COPY_EMAIL`, `RESEND_API_KEY` (si se usa), `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_ACCOUNT_ID` (opcionales) | secreto | `pnpm wrangler secret put NOMBRE --env <entorno>` |
| `MARKET_DB` (D1), `MARKET_FILES` (R2 privado), `EMAIL` (send_email), `ASSETS` | binding | `wrangler.jsonc` |

Blog: `PUBLIC_MARKET_URL` (opcional, por defecto `/market`) cambia el destino del botón flotante.

## 5. Desarrollo local

```bash
cd workers/market && pnpm install && pnpm setup:local && pnpm dev
```

- Tienda: http://localhost:8787/market — correos: http://localhost:8787/dev/correos
- Admin en maqueta: "Entrar" → "Entrar como admin (admin@maqueta.test)".
- Pruebas: `pnpm test` (Vitest en workerd), `pnpm test:e2e` (con `pnpm dev` corriendo), `pnpm test:startup-guard`.
- Usa `localhost` (no `127.0.0.1`): la protección CSRF compara el origen con `SITE_URL`.

## 6. Mapa del código (`workers/market/`)

| Ruta | Qué hay |
|---|---|
| `src/index.ts` | Entrada del Worker: **guardia de arranque** y cron |
| `src/app.tsx` | App Hono: guardia por petición, cabeceras de seguridad (CSP sin JS en línea), rutas |
| `src/config.ts` | Validación de entorno, `mock`/`live`, dominios de producción |
| `src/adapters/` | Interfaces (`types.ts`) + implementaciones mock/live; `index.ts` es el único lugar que elige según `MODE` |
| `src/services/` | Pedidos y webhook (`orders.ts`), descargas, cola de correos (`outbox.ts`), plantillas |
| `src/routes/`, `src/views/` | Rutas y vistas JSX (tienda, login, pagos, descargas, admin, legales, dev) |
| `migrations/0001_init.sql` | Esquema D1 |
| `scripts/` | `seed.mjs`, `admin-cli.mjs`, `check-deploy.mjs`, `test-startup-guard.mjs`, `sync-theme.mjs`, `wrangler.mjs` |
| `test/`, `e2e/` | Vitest (61) y E2E Playwright |
| `../../src/components/MarketFab.astro` | Botón flotante del blog (único cambio al sitio, incluido en `Base.astro`) |

## 7. Decisiones y riesgos conocidos

- **Worker separado del blog**: aislamiento de fallos (la guardia tumba solo el market), mínimo privilegio (las claves
  de pago no viven en el Worker del CMS) y deploys independientes. El CI del blog no cambia; hay un CI nuevo solo de
  pruebas (`.github/workflows/market-ci.yml`), que no despliega.
- **Usuarios por correo**: se guarda solo correo y nombre (requisito). Si alguien cambia el correo de su cuenta de
  Google, el market lo verá como otra persona.
- **Enlace del correo**: está firmado y ligado al acceso de esa compra (vence en 14 días y respeta el límite de
  descargas). Si el cliente reenvía el correo, quien lo reciba puede descargar dentro de ese límite; para exigir
  siempre login, bastaría con quitar la rama `viaEmail` en `src/routes/downloads.tsx`.
- **Cloudflare Email Sending no documenta idempotencia**: si el Worker muere justo después de que Cloudflare aceptó un
  correo, ese correo queda "dead" para revisión en vez de reenviarse (se prefiere no duplicar). Con Resend se reintenta
  solo, porque deduplica por `Idempotency-Key`.
- **Límite de frecuencia** en D1 (login 20/min por IP, checkout, descargas, gratis, admin). Para tráfico alto, sumar
  una regla de Rate Limiting del WAF de Cloudflare sobre `/market/auth/*`, `/market/descargas/*` y `/market/archivo/*`
  (no sobre `/market/webhooks/*`: Stripe reintenta y ya está protegido por la firma).
- **Imágenes**: las portadas son SVG provisionales; las subidas desde el admin se guardan en el bucket privado bajo
  `images/` y se sirven por `/market/media/images/*`.
- **Docs del blog desactualizadas**: `CLAUDE.md` describe un tema "retro pixel ámbar", pero `src/styles/theme.css` es
  el tema oscuro monocromático; el market sigue el código.
- Esta sesión **no** desplegó nada, **no** tocó DNS, **no** hizo cobros y **no** borró datos.
