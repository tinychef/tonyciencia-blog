// Lector mínimo de JSONC (comentarios // y /* */ y comas finales) para los scripts.
import { readFileSync } from "node:fs";

export function readJsonc(path) {
	const src = readFileSync(path, "utf8");
	let out = "";
	let inStr = false;
	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		const next = src[i + 1];
		if (inStr) {
			out += ch;
			if (ch === "\\") out += src[++i];
			else if (ch === '"') inStr = false;
		} else if (ch === '"') {
			inStr = true;
			out += ch;
		} else if (ch === "/" && next === "/") {
			while (i < src.length && src[i] !== "\n") i++;
			out += "\n";
		} else if (ch === "/" && next === "*") {
			i += 2;
			while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
			i++;
		} else out += ch;
	}
	return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}
