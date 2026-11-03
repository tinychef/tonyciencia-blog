# Pendientes del dueño (Antonio) — recordar al inicio de cada sesión

> Instrucción para Claude: al empezar una sesión en este repositorio, revisa esta lista y recuérdale al dueño, en
> español y en pocas líneas, lo que siga pendiente. Marca como hecho (con fecha) lo que él confirme y borra lo que ya
> no aplique. Las indicaciones para la extensión de Chrome están en el historial de la sesión del 2026-11-01/03; si
> hace falta, redáctalas de nuevo (siempre de solo lectura salvo el cambio pedido, y nunca pegando claves en el chat).

Actualizado: 2026-11-03.

## Urgente
1. **Stripe — aviso rojo «Multiple capabilities paused».** Revisar (solo lectura con la extensión) qué capacidades
   están pausadas (pagos con tarjeta, pagos al banco), qué pide Stripe y la fecha límite; completar lo que pida
   (identidad, datos fiscales, banco) él mismo. Si los cobros con tarjeta están pausados, la tienda no puede vender.
2. **Rotar claves que se pegaron en un chat** (HANDOFF.md): clave secreta live de Stripe (Roll key → pegarla él en el
   secreto STRIPE_SECRET_KEY del Worker `tonyciencia-market`) y la Global API Key de Cloudflare. Hacerlo después de
   resolver el punto 1. Revisar también si existen secretos R2_* en el Worker (ya no se usan: borrarlos).

## Esta semana
3. **Search Console (propiedad tonyciencia.com, no merkhify.com):** solicitar indexación de
   /posts/automatizacion-n8n-ia-operaciones-2026, /posts/n8n-mcp-actualizacion-protocolo-contexto-modelo-2025,
   /posts/activecampaign-active-intelligence-marketing-autonomo, /market/producto/anuncios-infinitos,
   /market/producto/specreel, /market/producto/stick-sketch y /market/en/product/stick-sketch (la cuota diaria es
   limitada: seguir al día siguiente si se agota). La validación del grupo «No encontrada (404)» quedó iniciada el
   2026-11-02.
4. **Correo de prueba del formulario de contacto:** confirmar que llegó «[Contacto web] Otro — Prueba automatica
   Claude» (enviado el 2026-11-03). Si no llegó, revisar /market/admin/correos.
5. **Google Analytics:** hacia el 2026-11-06, comprobar que solo sus visitas salen como tráfico «internal» y activar
   el filtro «Internal Traffic» (hoy en Prueba). Si su IP cambia (hoy 190.21.51.1), actualizar la regla «Tony».
6. **En su computador:** correr una vez `python artcraft.py sync` en la carpeta de artcraft-studio-engine.

## Cuando pueda
7. **Merchant Center:** revisar que los 6 productos pasen de «En revisión» a «Aprobado» (stick-sketch es nuevo).
8. **Licencias:** que un abogado revise los LICENSE.md de SpecReel, Stick, Edit Pro (CutPilot) y Creative Factory.
9. **Oferta de Stick Sketch:** desde el 2026-12-01 se puede poner la oferta de USD 36.90 → 12 (regla de 30 días).
10. **ADS ULTIMATE:** no se vende mientras sea una copia de AutoFlow (hace falta permiso o reescritura).
11. **Limpieza de Cloudflare (desde el 2026-11-24, si nada falló):** borrar la base D1 `tonyciencia-emdash`, el bucket
    R2 y el KV `SESSION` que quedaron de EmDash (Claude quita antes los bindings de `wrangler.jsonc`). El Worker viejo
    `tonyciencia-email-capture`: exportar primero su KV `LEADS` (correos del boletín de antes) y luego borrarlo.
12. **Contenido del blog — confirmar 1 cosa:** los artículos de ActiveCampaign dicen «he probado personalmente» y
    «mi propia configuración» (Systeme.io + ActiveCampaign): ¿es experiencia real suya? Si no, se reformulan.
    (Hecho el 2026-11-03: confirmó que los enlaces de ActiveCampaign y FocuSee son suyos; están en
    `content/affiliates/extra.json`.)
