import { bytesToHex, hmacSha256, sha256Hex } from "../../lib/crypto";

/**
 * URL prefirmada AWS Signature V4 (query string), compatible con la API S3 de R2.
 * Verificada contra el vector oficial de AWS ("GET object, query auth") en test/presign.test.ts.
 */
export interface PresignOptions {
	method?: "GET";
	host: string;
	/** Ruta ya con bucket si es path-style, p. ej. "/mi-bucket/carpeta/archivo.zip" (sin codificar). */
	path: string;
	region: string;
	service?: string;
	accessKeyId: string;
	secretAccessKey: string;
	expiresSeconds: number;
	date?: Date;
	/** Parámetros extra firmados, p. ej. response-content-disposition. */
	query?: Record<string, string>;
}

/** Codificación URI de AWS: todo excepto A-Z a-z 0-9 - _ . ~ (y "/" en rutas). */
export function awsUriEncode(s: string, keepSlash: boolean): string {
	let out = "";
	for (const byte of new TextEncoder().encode(s)) {
		const ch = String.fromCharCode(byte);
		if (/[A-Za-z0-9\-_.~]/.test(ch) || (keepSlash && ch === "/")) out += ch;
		else out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
	}
	return out;
}

export async function presignUrl(o: PresignOptions): Promise<string> {
	const service = o.service ?? "s3";
	const date = o.date ?? new Date();
	const amzDate = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
	const day = amzDate.slice(0, 8);
	const scope = `${day}/${o.region}/${service}/aws4_request`;
	const params: Record<string, string> = {
		"X-Amz-Algorithm": "AWS4-HMAC-SHA256",
		"X-Amz-Credential": `${o.accessKeyId}/${scope}`,
		"X-Amz-Date": amzDate,
		"X-Amz-Expires": String(o.expiresSeconds),
		"X-Amz-SignedHeaders": "host",
		...o.query,
	};
	const canonicalQuery = Object.keys(params)
		.sort()
		.map((k) => `${awsUriEncode(k, false)}=${awsUriEncode(params[k]!, false)}`)
		.join("&");
	const canonicalPath = awsUriEncode(o.path, true);
	const canonicalRequest = [o.method ?? "GET", canonicalPath, canonicalQuery, `host:${o.host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
	const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
	const kDate = await hmacSha256(`AWS4${o.secretAccessKey}`, day);
	const kRegion = await hmacSha256(kDate, o.region);
	const kService = await hmacSha256(kRegion, service);
	const kSigning = await hmacSha256(kService, "aws4_request");
	const signature = bytesToHex(await hmacSha256(kSigning, stringToSign));
	return `https://${o.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
