---
name: ux-cro-designer
description: Procedimiento del diseñador UX/UI y CRO de Market Tony — diagnóstico con capturas y mediciones reales, reglas de tarjetas y portadas de productos digitales (dolor → solución, texto legible en celular, círculos antes → después), maquetas HTML renderizadas con Playwright y propuesta para que el dueño apruebe antes de implementar. Úsala al rediseñar el catálogo, las tarjetas, las portadas o la ficha del market.
---

# Diseño UX/UI y conversión — Market Tony

Referencias (léelas antes de diseñar):
- `references/reglas-tarjetas-y-portadas.md` — qué debe mostrar una tarjeta, reglas de portada y de tamaño de texto,
  con sus fuentes.
- `references/patrones-tiendas-digitales.md` — patrones de Gumroad, Lemon Squeezy y compañía que conviene copiar y
  los que no.

## 1. Diagnóstico (siempre primero)

1. Capturas de producción con Playwright (Chromium ya instalado: `require('playwright')`):
   - celular 390×844 a `deviceScaleFactor: 2` con user agent de iPhone; escritorio 1440×900;
   - catálogo `/market/`, una ficha con oferta, una de «paga lo que quieras» y una de precio fijo;
   - captura del primer pliegue y de la página completa. Quita el popup del cupón antes de capturar.
2. Mide y anota, por página:
   - **desborde horizontal**: `document.documentElement.scrollWidth > innerWidth` (en celular es un error grave);
   - a cuántos píxeles del borde superior aparece el **primer producto** en celular;
   - alto total de la página en celular y cuántas pantallas hay que bajar para ver todo el catálogo;
   - tamaño de letra efectivo del título de la portada **dentro de la tarjeta** en 390 px (alto de la letra en px CSS);
   - peso y dimensiones de cada portada; imágenes que cargan vacías (lazy-load mal puesto);
   - Lighthouse móvil (`npx lighthouse <url> --form-factor=mobile --quiet --output=json`) si hay red.
3. Ordena los problemas por impacto en ventas: lo que impide comprar > lo que impide entender > estética.

## 2. Propuesta

- Dos o tres **direcciones** distintas (no variaciones de color de la misma idea). Cada una con nombre, una frase que
  la resuma y en qué tienda de referencia se inspira.
- Para cada producto, la portada nueva con la estructura **dolor → solución** usando textos reales de su ficha o de su
  repositorio. Lista de dónde salió cada texto y cada cifra.
- Maquetas HTML autocontenidas en `docs/ux/propuesta-AAAA-MM-DD/maquetas/` y su PNG en `.../png/`. Renderiza con
  Playwright al tamaño real. Para portadas: 1600×1000 (o el formato que propongas, justificado) **y** la portada
  dentro de la tarjeta a 390 px de ancho, que es como la ve el comprador.
- Revisa cada PNG tú mismo (ábrelo con Read) antes de entregarlo: texto cortado, contraste, alineación, marcas.

## 3. Entrega

`diagnostico.md` + `propuesta.md` (qué cambia, por qué, fuente, riesgo y costo en rendimiento, y «Preguntas para el
dueño»). Nada se implementa en `workers/market/src/` hasta que el dueño apruebe una dirección.
