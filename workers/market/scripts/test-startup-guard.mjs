#!/usr/bin/env node
// Prueba REAL de la guardia de arranque en el runtime de Workers (workerd):
// levanta el Worker con MODE=mock y SITE_URL=https://tonyciencia.com y exige que NO arranque.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { root, wranglerBin } from "./wrangler.mjs";

const child = spawn(
	process.execPath,
	[wranglerBin, "dev", "-c", resolve(root, "wrangler.jsonc"), "--port", "8799", "--ip", "127.0.0.1", "--var", "MODE:mock", "--var", "SITE_URL:https://tonyciencia.com"],
	{ cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);
let out = "";
const done = (ok, msg) => {
	child.kill("SIGTERM");
	console[ok ? "log" : "error"](msg);
	process.exit(ok ? 0 : 1);
};
const onData = (d) => {
	out += d.toString();
	if (out.includes("ARRANQUE DENEGADO")) done(true, "✔ El Worker se negó a arrancar con MODE=mock y SITE_URL de producción.");
	if (/Ready on/.test(out)) done(false, "✘ El Worker ARRANCÓ en mock con dominio de producción. ¡Revisar src/index.ts!");
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);
setTimeout(() => done(false, `✘ Sin resultado en 90 s.\n${out.slice(-2000)}`), 90_000);
