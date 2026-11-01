# Estándar de fichas de Market Tony

Cada ficha debe parecer la de una tienda digital profesional, no un README. Todo verificable en el repositorio.

| Campo | Regla |
|---|---|
| Título (H1) | Nombre + resultado concreto + plataforma. ≤ 70 caracteres. Ej.: «Stick Sketch: videos de muñequitos de palo con IA para Reels y TikTok» |
| Tagline | 1 frase del resultado que obtiene el comprador (≤ 140). |
| Resumen | 1–2 frases para tarjetas y el feed (≤ 220). |
| Descripción | Secciones `##`: Qué es · Qué problema resuelve · Cómo funciona en 3 pasos · Qué recibes · Para quién es · Requisitos · Notas importantes (limitaciones honestas). Párrafos cortos, listas con `- `. |
| Beneficios | 4–6 viñetas concretas (función → beneficio). Sin superlativos vacíos. |
| Ficha técnica | Formato, Funciona con, Requisitos, Sistemas, Salida, Idioma, Licencia (+ Versión). |
| FAQ | ≥ 3: necesito programar / costo por uso / compatibilidad / qué NO hace / licencia. |
| Imágenes | Portada (se entiende en 1 segundo a 400×250) + 2 pantallas (cómo funciona, qué produce). 1600×1000 WebP. ALT descriptivo en español. Sin precios dentro de la imagen. Sin logos de terceros como si fueran socios. |
| SEO | Meta título ≤ 60 con la búsqueda principal; meta descripción 120–160 con beneficio + CTA; 5–7 etiquetas de intención de búsqueda. |
| Precio | Fijo, oferta (precio anterior real), paga lo que quieras (mínimo/sugerido) o gratis. Nunca cifras de ventas/reseñas inventadas. |
| Etiquetas | Automáticas: OFERTA (precio anterior real), NUEVO (< 45 días), MÁS VENDIDO (≥ 3 ventas reales y el máximo), Próximamente. Manual: «Versión x.y». |

Lista de verificación antes del PR:
- [ ] La ficha no promete nada que el código no haga (busca cada afirmación en el repo).
- [ ] Limitaciones y requisitos visibles (SO, GPU, claves, servicios de pago aparte).
- [ ] Licencia del producto y de terceros clara (Remotion, GPL, voces, fuentes).
- [ ] `node scripts/audit-catalog.mjs` sin errores en local.
- [ ] Capturas de la ficha en escritorio y celular revisadas.
