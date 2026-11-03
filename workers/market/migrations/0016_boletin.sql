-- Market Tony — suscriptores del boletín del blog (formulario «Obtén recursos gratuitos»), 2026-11-03.
-- Antes iban a un Worker aparte (tonyciencia-email-capture, KV LEADS) que no se desplegaba con el repo, aceptaba
-- peticiones de cualquier origen sin límite y sobrescribía los registros. Ahora los recibe POST /market/boletin.
-- Solo correo, origen del formulario e idioma. Un correo se guarda una vez (no se pisa la fecha de alta).
CREATE TABLE IF NOT EXISTS newsletter (
	email TEXT PRIMARY KEY,
	source TEXT NOT NULL DEFAULT 'home',
	lang TEXT NOT NULL DEFAULT 'es',
	created_at INTEGER NOT NULL
);
