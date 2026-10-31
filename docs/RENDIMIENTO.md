# Rendimiento de tonyciencia.com (auditoría del 31-10-2026)

## Diagnóstico

- **La lentitud principal no es el diseño, es el arranque en frío del Worker del blog.** ~30 % de las visitas cae en
  un isolate nuevo y espera 0,7–1,4 s antes de recibir el primer byte (en caliente: 0,2–0,4 s). El bundle del blog
  pesa 9,1 MB (EmDash + admin) y **hoy no se cachea ningún HTML** (`Astro.cache.set` no hace nada: no hay
  `cache.provider` configurado).
- Lighthouse da 97–100 porque mide una sola carga en caliente; no ve esos picos.
- Front-end: logos de 813 px mostrados a 36 px, la cursiva de Inter precargada sin usarse, ~100 peticiones a
  `google.com/s2/favicons` (con redirección) en la home y hasta ~270 en /herramientas.
- No es problema: el chunk de >500 kB es el admin de EmDash (solo carga en `/_emdash/admin`); CLS ≤ 0,024; brotli,
  HTTP/3 y caché de `/_astro/*` correctos; el Worker del market responde en ~0,2 s estable.

## Aplicado (PR de UX + rendimiento)

| Cambio | Efecto |
|---|---|
| Logos 72×72 (`logo-tc-*-72.webp`, nombre nuevo por la caché `immutable`) | −80 KB en cada página |
| `favicon.ico` solo 16/32/48 px | de 285 KB a 2 KB |
| Precarga solo de Inter normal | −51 KB que competían con el LCP en móvil |
| Logos de partners en `public/assets/partners/icons/` (`pnpm cache:partner-icons`) | home: de 66 peticiones a terceros y 33 redirecciones a 1 y 0 |
| Etiquetas y categorías desde `data.terms` (ya hidratadas en lote) en vez de `getEntryTerms` por post | `/posts`, categorías, tags, pilares y RSS: de ~25 consultas a D1 a 1 |
| Home: posts, ajustes y video en paralelo; YouTube con caché en memoria (1 h), tope de 600 ms y caché del borde solo para respuestas OK | la home ya no espera a YouTube en serie |
| Página de post: ajustes del sitio y traducción en paralelo con los relacionados | ~50–80 ms menos por artículo |
| `dns-prefetch` útil (`i.ytimg.com`) en vez de LinkedIn/Instagram | — |
| Detección del market v2: una consulta por sesión, no por página | — |

Medido con el build de producción (`astro preview`), home: **83 → 44 peticiones, 33 → 0 redirecciones,
66 → 1 petición a terceros**.

## Pendiente (requiere al dueño o una prueba en Cloudflare)

1. **Caché del HTML en el borde (el cambio de mayor impacto).** `cache: { provider: cacheCloudflare() }` en
   `astro.config.mjs` (activa `cache.enabled` del Worker) + un `src/middleware.ts` que haga
   `ctx.cache.set({ maxAge: 300, swr: 86400 })` solo en GET anónimos (sin cookie de sesión de EmDash ni modo edición,
   sin `_preview`, fuera de `/_emdash`). EmDash ya purga por tag al publicar. **No se aplicó a ciegas**: esa caché va
   delante del Worker y hay que confirmar en un entorno de prueba que el admin y la edición visual no reciben HTML
   cacheado. Con eso, la mayoría de las visitas tendría un TTFB de ~0,15 s y desaparecen los picos de 1 s.
2. **Cloudflare → Security → Bots → "JavaScript Detections"**: es la tarea larga más grande de cada página
   (95–466 ms en móvil). Desactivarlo si ninguna regla depende de él.
3. Quitar el respaldo `data-market-v2` de `Base.astro` cuando el market v2 esté en producción.
