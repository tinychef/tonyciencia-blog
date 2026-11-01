# Archivos entregables con hash fijado (`provision/`)

Los productos salen de repositorios **privados** y este repositorio es **público**: el ZIP de un producto nunca puede
viajar por git ni por el CI. Tampoco hace falta una clave: el Worker acepta el archivo solo si coincide **byte a byte**
con lo publicado aquí.

| Archivo | Qué es |
|---|---|
| `packages.json` | Cómo se arma cada ZIP: repositorio, rama/commit, carpeta raíz dentro del ZIP y exclusiones. |
| `manifest.json` | Lo que el Worker acepta: `slug`, `sha256`, `size`, nombre y si el producto se activa al recibirlo. **Generado.** |

## Publicar o actualizar el archivo de un producto

1. Arma el ZIP (reproducible: mismo commit → mismos bytes) y actualiza el manifiesto:
   ```bash
   node scripts/build-product-zip.mjs <slug>
   ```
2. Commit + PR + merge a `main` (el deploy automático publica el Worker con el manifiesto nuevo).
3. Sube el archivo (sin claves; el Worker verifica tamaño y SHA-256, y R2 vuelve a verificar el SHA-256 al guardar):
   ```bash
   curl -X PUT --data-binary @.wrangler/products/<archivo>.zip -H 'content-type: application/zip' https://tonyciencia.com/market/provision/<slug>
   ```
   Respuestas: `stored` (guardado y, si `activate`, producto disponible), `already` (ya estaba), 400 (no coincide), 404.
4. Comprueba `https://tonyciencia.com/market/estado.json` → el producto aparece con `hasFile: true` y `availability: "available"`.

## Seguridad

- Quien llame al endpoint no puede subir nada distinto del archivo publicado en el manifiesto (el hash está en un
  commit revisado). Si el producto ya tiene ese archivo, la respuesta llega sin leer el cuerpo.
- Límite: 12 intentos por hora y por IP; cuerpo máximo 95 MB (los Workers aceptan hasta 100 MB).
- Los archivos quedan en el bucket privado `MARKET_FILES`; las descargas siguen saliendo por URLs firmadas de 5 minutos.
- Para cambiar un archivo ya publicado: nuevo commit en el repo del producto → paso 1 → el `file_key` incluye el hash,
  así que la versión nueva convive con la anterior hasta que el PUT la reemplaza en la ficha.
