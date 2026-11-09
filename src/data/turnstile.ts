/**
 * Cloudflare Turnstile (anti-bots) de los formularios del blog que envían al Worker del market:
 * contacto (acción "contact", POST /market/contacto) y boletín (acción "newsletter", POST /market/boletin).
 * La sitekey es pública. El secreto vive SOLO como secreto `TURNSTILE_SECRET` del Worker `tonyciencia-market`
 * (workers/market/src/adapters/turnstile/). Ver docs/SEGURIDAD-CONTACTO.md.
 *
 * Vacía = el widget no se dibuja (y el market, sin secreto, no lo exige).
 */
export const TURNSTILE_SITEKEY = "";
