# Pendientes del dueño (Antonio) — recordar al inicio de cada sesión

> Instrucción para Claude: al empezar una sesión en este repositorio, revisa esta lista y recuérdale al dueño, en
> español y en pocas líneas, lo que siga pendiente. Marca como hecho (con fecha) lo que él confirme y borra lo que ya
> no aplique. Las indicaciones para la extensión de Chrome están en el historial de la sesión del 2026-11-01/03; si
> hace falta, redáctalas de nuevo (siempre de solo lectura salvo el cambio pedido, y nunca pegando claves en el chat).

Actualizado: 2026-11-04 (con el informe de la extensión del 2026-11-03).

## Urgente
1. **Stripe — verificación vencida desde el 2026-10-31** (cuenta «Merkhify», la misma que cobra el market). Hoy los
   cobros con tarjeta y los pagos al banco SÍ funcionan; lo pausado es Affirm, Cartes Bancaires y «financial
   accounts», pero puede escalar. Tres tareas «Past due», ambas fichas («Business details») marcadas Invalid:
   (a) identidad del representante: Stripe exige que tenga dirección en EE. UU. + falta un documento;
   (b) dirección de la empresa (Albuquerque) rechazada por ser de agente registrado;
   (c) dirección del representante (la de Chile) rechazada con el mismo motivo.
   Qué hacer (él mismo): escribir al soporte de Stripe y preguntar qué aceptan para una LLC de EE. UU. con dueño
   que vive fuera; según la respuesta, dar una dirección física real de la empresa (no de agente registrado) o
   nombrar como representante a una persona con domicilio en EE. UU., y subir el documento que pidan.
   De paso, en «Public details»: agregar un correo de soporte (hoy no hay) y decidir si el nombre público sigue
   siendo «Merkhify» (es lo que ve quien paga en el market) o pasa a «Tony Ciencia».
2. **Rotar claves que se pegaron en un chat** (HANDOFF.md), después del punto 1. En vez de volver a usar una clave
   secreta con acceso total, crear una **clave restringida** (rk_live) solo con: Checkout Sessions = Write,
   Coupons = Write, Promotion codes = Write (es todo lo que llama el market), pegarla él en el secreto
   STRIPE_SECRET_KEY del Worker `tonyciencia-market` y luego borrar la clave «MARKETPLACE TONY». La clave
   «merkhify-portal-2026-10» (acceso total, de otro proyecto) conviene restringirla igual. Rotar también la Global
   API Key de Cloudflare y borrar los secretos R2_* del Worker si existen.

## Esta semana
0. **Anti-spam del formulario (bot «RobertGab», 2026-11-09):** el PR deja listas las defensas. La heurística y el tope
   de 40 correos al día funcionan solas al desplegar. Para que Turnstile funcione hace falta crear el widget en
   Cloudflare, publicar la sitekey y después guardar el secreto, en ese orden (`docs/SEGURIDAD-CONTACTO.md`).
3. **Search Console:** hacia el 2026-11-10, revisar cómo va la validación del grupo «No encontrada (404)» (iniciada el
   2026-11-02; quedaban 23 URL, casi todas viejas de WordPress que ahora dan 301 o 410).
4. **Correo de prueba del formulario de contacto:** confirmar que llegó «[Contacto web] Otro — Prueba automatica
   Claude» (enviado el 2026-11-03). Si no llegó, revisar /market/admin/correos.
5. **Google Analytics:** hacia el 2026-11-06, comprobar que solo sus visitas salen como tráfico «internal» y activar
   el filtro «Internal Traffic» (hoy en Prueba). Si su IP de casa cambia, actualizar la regla «Tony» (la IP no se anota aquí: el repo es público).
   Opcional: la zona horaria de la propiedad es Denver (GMT-7, la de la LLC); si prefiere ver los informes en hora
   de Chile, cambiarla a Santiago (solo afecta a los datos nuevos).
6. **En su computador:** correr una vez `python artcraft.py sync` en la carpeta de artcraft-studio-engine.

## Cuando pueda
7. **Merchant Center:** al 2026-11-03 los 6 (3 productos en ES y EN) estaban en revisión inicial (hasta 3 días hábiles);
   revisar que pasen a «Aprobado». Fichas gratuitas activas; los anuncios de Shopping necesitan vincular una cuenta de
   Google Ads (solo si quiere pagar anuncios).
8. **Licencias:** que un abogado revise los LICENSE.md de SpecReel, Stick, Edit Pro (CutPilot) y Creative Factory.
9. **Oferta de Stick Sketch:** desde el 2026-12-01 se puede poner la oferta de USD 36.90 → 12 (regla de 30 días).
10. **ADS ULTIMATE:** no se vende mientras sea una copia de AutoFlow (hace falta permiso o reescritura).
11. **Limpieza de Cloudflare (desde el 2026-11-24, si nada falló):** borrar la base D1 `tonyciencia-emdash`, el bucket
    R2 y el KV `SESSION` que quedaron de EmDash (Claude quita antes los bindings de `wrangler.jsonc`). El Worker viejo
    `tonyciencia-email-capture`: exportar primero su KV `LEADS` (correos del boletín de antes) y luego borrarlo.

## Hecho
- 2026-11-03: confirmó que los enlaces de afiliado de ActiveCampaign y FocuSee son suyos (están en
  `content/affiliates/extra.json`) y que la experiencia en primera persona de los artículos de ActiveCampaign
  (Systeme.io + ActiveCampaign) es real: se dejan así.
- 2026-11-03 (extensión): webhook de Stripe activo con los 7 eventos y 0 fallos; cupón TONYCIENCIA activo; payouts al
  día; 3 sitemaps leídos sin errores; indexación pedida para 9 URL (las otras 5 ya estaban indexadas); sin acciones
  manuales ni problemas de seguridad; Merchant verificado y sin avisos de políticas.
