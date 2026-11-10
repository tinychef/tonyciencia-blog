# Anti-spam de los formularios (contacto y boletín)

**Incidente (2026-11):** un bot llenaba el formulario de `/contacto` (POST `/market/contacto`, Worker del market) y cada envío llegaba como correo a `ADMIN_COPY_EMAIL`. Gmail no fue vulnerado: el bot solo usaba el formulario público. Sus firmas eran nombres como «RobertGab» o «RichardTer», o cadenas sin sentido con dígitos (`NAERTERHTE1588468NERTHRRTH`), en el nombre y en el mensaje.

## Capas (en el orden en que corren, `workers/market/src/routes/contact.ts`)

0. **Antes del Worker (Cloudflare, zona tonyciencia.com)**:
   - Regla de rate limiting «Formularios: limite por IP (contacto y boletin)»: más de 4 solicitudes en 10 s desde la misma IP a `/market/contacto` o `/market/boletin` → *Block* por 10 s. El plan Free solo permite 1 regla, con ventana y bloqueo de 10 s, contando por IP. Por eso no son los «5 cada 10 minutos» de la versión anterior: esos los cubren el límite por IP del Worker y el tope diario.
   - TLS mínimo 1.2 (desde el 2026-11-09). Bot Fight Mode activo. AI Labyrinth no está activado (fue opcional y no se aprobó).
   - Campo trampa `website` (de antes): si viene lleno, se responde «enviado» y no se hace nada.
1. **Datos válidos** (como antes) → `?datos=1`.
2. **Cloudflare Turnstile**: el formulario manda `cf-turnstile-response`, y el Worker lo verifica con siteverify. Exige `success`, la acción esperada (`contact` o `newsletter`) y un host de `TURNSTILE_HOSTNAMES`. Si siteverify falla o no responde, se rechaza (falla cerrado).
   - Contacto sin token válido → `?verificacion=1` (la página pide completar la verificación).
   - Boletín sin token válido → 403 `{ ok: false, error: "turnstile" }`.
   - Código: `src/adapters/turnstile/` (mock: cualquier token con forma válida pasa, salvo `maqueta-falla`).
3. **Trampas de comportamiento** (`trapReason` en `src/lib/spam.ts`, desde el 2026-11-09). Corren después de Turnstile y descartan en silencio (el bot ve «enviado»; se registra con `console.warn` y el motivo):
   - `ai-trap`: campo `agent_code` fuera de pantalla y con `aria-hidden`. Su etiqueta le pide a un asistente o agente de IA que escriba «AGENTE-IA». Una persona no lo ve. Un LLM que lee el HTML y llena el formulario suele obedecer.
   - `too-fast`: el navegador manda `elapsed`, los ms desde que se abrió la página (`performance.now()`, no depende del reloj del usuario). Contacto: menos de 3 s. Boletín: menos de 1,5 s.
   - `no-elapsed`: falta `elapsed` o no es un número. Pasa cuando el envío no salió de la página, por ejemplo un script que hace POST directo con un token de Turnstile comprado.
   - Los campos los ponen `src/components/pages/ContactPage.astro` y `src/components/EmailCapture.astro`. El nombre `agent_code` y los tiempos mínimos están en `AI_TRAP_FIELD` y `MIN_FILL_MS`.
4. **Heurística de contenido** (`src/lib/spam.ts`): reconoce las firmas del bot y los mensajes sin sentido. El envío se descarta en silencio: el bot ve `?enviado=1` y no aprende nada. Es conservadora a propósito. Nombres con apóstrofo, guion o acento, nombres en otros alfabetos, números de pedido y URL pasan; las pruebas lo cubren.
5. **Límite por IP** (como antes).
6. **Tope global diario** (`contactGlobal` en `src/lib/ratelimit.ts`): 40 mensajes cada 24 h en todo el sitio. Si un bot pasa todo lo anterior, el buzón recibe como mucho 40 correos al día. Al llegar al tope → `?error=1`, y la página ofrece escribir a business@tonyciencia.com.

## Configuración

| Dónde | Qué |
|---|---|
| `src/data/turnstile.ts` (blog) | `TURNSTILE_SITEKEY`, pública. Si está vacía, el widget no se dibuja. |
| `src/components/Turnstile.astro` | Widget en modo «interaction-only» (casi nunca se ve). Carga `api.js` una sola vez. |
| `src/middleware.ts` | La CSP permite `https://challenges.cloudflare.com` en `script-src` y `frame-src`. |
| Secreto `TURNSTILE_SECRET` del Worker `tonyciencia-market` | Nunca va en el repo. Si falta, el market no exige Turnstile (avisa al arrancar) y siguen las capas 3 a 6. |
| `TURNSTILE_HOSTNAMES` (vars de producción, `wrangler.jsonc`) | `tonyciencia.com`. Por defecto es el host de `SITE_URL`. En live, localhost y 127.0.0.1 se descartan siempre. |

### Orden de activación

Hay que seguirlo para no bloquear a gente real:

1. Crear el widget en Cloudflare (Turnstile → Add widget, modo *Managed*, dominios `tonyciencia.com`, `localhost` y `127.0.0.1`).
2. Poner la sitekey en `src/data/turnstile.ts`, fusionar el PR y esperar el deploy del blog. Desde ese momento los formularios ya mandan el token.
3. Recién después guardar el secreto:

   ```bash
   cd workers/market && pnpm wrangler secret put TURNSTILE_SECRET --env production
   ```

Si el secreto se guarda antes que la sitekey, el market exige un token que el blog todavía no manda, y todos los mensajes de contacto se rechazan.

### Prueba de humo tras activar

- Enviar el formulario de contacto real desde el navegador → debe llegar el correo.
- `curl -X POST https://tonyciencia.com/market/contacto -d 'name=x&email=x@example.com&message=hola'` sin token → `location: /contacto?verificacion=1#formulario`.
- Más de 4 POST seguidos en 10 s desde la misma IP → HTTP 429 de Cloudflare (la regla de rate limiting).

## Ideas que no se aplicaron (y por qué)

- **AI Labyrinth** (Security → Bots): manda a los crawlers de IA que no respetan robots.txt a páginas señuelo. Es gratis, pero afecta a todo el sitio, no solo a los formularios. Queda a decisión del dueño.
- **Firmar `elapsed` en el servidor** (token con hora y HMAC): más difícil de falsear, pero exige una petición extra o HTML sin caché. Hoy Turnstile ya cubre a quien falsea campos.
