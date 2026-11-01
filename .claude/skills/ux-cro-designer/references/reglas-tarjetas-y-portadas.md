# Reglas de tarjetas y portadas (con fuentes)

Investigado el 2026-11-01. Lo marcado como **heurística** no es una norma publicada: úsalo como punto de partida y
compruébalo mirando el render a tamaño real.

## Qué debe mostrar una tarjeta de producto

Baymard (estudio de listados de productos, https://baymard.com/research-articles/product-listing-information):
- ~50 % de los sitios no muestra lo suficiente en cada ítem, y la gente descarta productos relevantes o se va.
- Atributos esenciales: **precio** (siempre visible, grande), **título o tipo de producto**, **miniatura** (sin ella
  el ítem parece "incompleto"), **calificación promedio y cantidad** (en tiendas pequeñas pesa menos) y las
  variantes que cambian la decisión.
- Título: máximo **3–4 líneas en celular**; más largo se lee como descripción. Destacar lo principal.
- Agregar **1–3 atributos propios de la categoría** (en Market Tony: con qué funciona —Claude Code, Chrome, Windows—,
  qué incluye —"2 en 1"—, formato de entrega).

## Portadas

- Gumroad pide portadas de **al menos 1280×720 px** (16:9), PNG/JPEG/GIF o video
  (https://gumroad.com/help/article/60-adding-a-cover-image). La miniatura cuadrada de 600×600 es una convención de la
  comunidad, no un requisito documentado.
- **Diseña para el tamaño más chico en que se ve**, no para el lienzo completo: en Market Tony la tarjeta en celular
  mide ~358 px de ancho, o sea la portada de 1600 px se ve al ~22 %.
- **Heurística de tamaño de texto**: el titular debe ocupar **al menos ~12 % del alto** de la imagen para leerse en
  miniatura; el texto típico de 6–8 % se vuelve una mancha (https://creaticalc.com/blog/youtube-thumbnail-mobile-readability).
  Comprobación práctica: en la tarjeta de 390 px, la altura de las mayúsculas del titular debe quedar en **≥ 14 px
  CSS**.
- **Pocas palabras**: titular de 2–5 palabras en la portada (las miniaturas de YouTube recomiendan 2–3). El resto del
  mensaje va en el título y la línea de la tarjeta, que son texto HTML (legible, indexable y accesible).
- **Dolor → solución**: un solo mensaje por portada. Patrones que funcionan: "antes → después" (números reales),
  "de X a Y", el resultado visible (el video, el informe, el anuncio), o el dolor nombrado en palabras del comprador.
- **Un punto focal** y alto contraste; logos de las herramientas con las que funciona como confirmación rápida.
- Las cifras en una portada son afirmaciones de venta: solo reales y con su fuente anotada en la propuesta.

## Celular (lo mínimo)

- Nada de desborde horizontal; el primer producto visible en el primer o segundo pantallazo.
- Objetivos táctiles ≥ 44 px; texto de cuerpo ≥ 16 px; precio y botón de compra siempre a la vista en la ficha.
