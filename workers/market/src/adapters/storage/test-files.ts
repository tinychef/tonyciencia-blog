/**
 * Archivos de PRUEBA incluidos en el código para la maqueta. Nunca son productos reales:
 * en MODE=mock jamás se sirve un archivo de pago real (el almacén mock no toca R2).
 */

const enc = new TextEncoder();

/** PDF mínimo válido de una página con texto ASCII. */
export function buildTestPdf(lines: string[]): Uint8Array {
	const esc = (s: string) => s.replace(/[\\()]/g, (m) => `\\${m}`).replace(/[^\x20-\x7e]/g, "?");
	const stream = [
		"BT",
		"/F1 20 Tf",
		"72 740 Td",
		"24 TL",
		...lines.map((l, i) => (i === 0 ? `(${esc(l)}) Tj` : `T* (${esc(l)}) Tj`)),
		"ET",
	].join("\n");
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
		`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	];
	let out = "%PDF-1.4\n";
	const offsets: number[] = [];
	objects.forEach((body, i) => {
		offsets.push(enc.encode(out).length);
		out += `${i + 1} 0 obj\n${body}\nendobj\n`;
	});
	const xrefAt = enc.encode(out).length;
	out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
	out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
	return enc.encode(out);
}

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

/** ZIP sin compresión (método "stored"). Suficiente para archivos de prueba. */
export function buildTestZip(files: Array<{ name: string; content: string }>): Uint8Array {
	const chunks: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	for (const f of files) {
		const name = enc.encode(f.name);
		const data = enc.encode(f.content);
		const crc = crc32(data);
		const local = new Uint8Array(30 + name.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(4, 20, true);
		lv.setUint16(6, 0x0800, true); // UTF-8
		lv.setUint16(8, 0, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, data.length, true);
		lv.setUint32(22, data.length, true);
		lv.setUint16(26, name.length, true);
		local.set(name, 30);
		const cen = new Uint8Array(46 + name.length);
		const cv = new DataView(cen.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(4, 20, true);
		cv.setUint16(6, 20, true);
		cv.setUint16(8, 0x0800, true);
		cv.setUint32(16, crc, true);
		cv.setUint32(20, data.length, true);
		cv.setUint32(24, data.length, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(42, offset, true);
		cen.set(name, 46);
		chunks.push(local, data);
		central.push(cen);
		offset += local.length + data.length;
	}
	const cenSize = central.reduce((s, c) => s + c.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, files.length, true);
	ev.setUint16(10, files.length, true);
	ev.setUint32(12, cenSize, true);
	ev.setUint32(16, offset, true);
	const all = [...chunks, ...central, end];
	const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
	let p = 0;
	for (const c of all) {
		out.set(c, p);
		p += c.length;
	}
	return out;
}

export const MOCK_PAID_FILE_KEY = "mock/anuncios-infinitos-PRUEBA.zip";
export const MOCK_FREE_FILE_KEY = "mock/guia-gratis-PRUEBA.pdf";

let cache: Map<string, { data: Uint8Array; contentType: string }> | null = null;

export function builtInTestFiles(): Map<string, { data: Uint8Array; contentType: string }> {
	if (cache) return cache;
	cache = new Map([
		[
			MOCK_PAID_FILE_KEY,
			{
				contentType: "application/zip",
				data: buildTestZip([
					{
						name: "LEEME-PRUEBA.txt",
						content:
							"ARCHIVO DE PRUEBA - Market Tony (modo maqueta)\n\n" +
							"Este ZIP NO es el producto real \"Anuncios Infinitos\".\n" +
							"En modo maqueta nunca se entregan archivos de pago reales.\n",
					},
					{ name: "prompts/ejemplo-01.txt", content: "Prompt de ejemplo (contenido ficticio de prueba).\n" },
				]),
			},
		],
		[
			MOCK_FREE_FILE_KEY,
			{
				contentType: "application/pdf",
				data: buildTestPdf([
					"ARCHIVO DE PRUEBA",
					"Market Tony - modo maqueta",
					"Este PDF es un producto gratis de ejemplo.",
				]),
			},
		],
	]);
	return cache;
}
