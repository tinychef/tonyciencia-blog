import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { app } from "../src/app";
import type { Env } from "../src/env";

export const BASE = "http://localhost:8787";

/** Llama a la app como lo haría el runtime y espera las tareas en segundo plano (waitUntil). */
export async function call(path: string, init: RequestInit = {}, e: Env = env, base = BASE): Promise<Response> {
	const ctx = createExecutionContext();
	const res = await app.fetch(new Request(new URL(path, base), { redirect: "manual", ...init }), e, ctx);
	await waitOnExecutionContext(ctx);
	return res;
}

const rand = () => Math.floor(Math.random() * 250) + 1;

export function uid(): string {
	return crypto.randomUUID().slice(0, 8);
}

export interface TestProduct {
	id: string;
	slug: string;
}

export async function createProduct(opts: { kind?: "paid" | "free"; priceCents?: number; fileKey?: string | null; limit?: number; db?: D1Database } = {}): Promise<TestProduct> {
	const kind = opts.kind ?? "paid";
	const id = crypto.randomUUID();
	const slug = `prueba-${id.slice(0, 8)}`;
	const now = Date.now();
	const fileKey = opts.fileKey === undefined ? (kind === "paid" ? "mock/anuncios-infinitos-PRUEBA.zip" : "mock/guia-gratis-PRUEBA.pdf") : opts.fileKey;
	await (opts.db ?? env.MARKET_DB)
		.prepare(
			`INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at)
			 VALUES (?1, ?2, ?3, '', '', ?4, 'usd', ?5, '[]', ?6, ?7, ?8, 1, 0, ?9, ?9)`,
		)
		.bind(id, slug, `Producto ${slug}`, kind === "paid" ? (opts.priceCents ?? 7700) : 0, kind, fileKey, fileKey ? "archivo-de-prueba.bin" : null, opts.limit ?? 5, now)
		.run();
	return { id, slug };
}

export interface Session {
	cookie: string;
	csrf: string;
	email: string;
}

function cookieFrom(res: Response, name: string): string | null {
	for (const raw of res.headers.getSetCookie()) {
		const [pair] = raw.split(";");
		if (pair?.startsWith(`${name}=`)) return pair;
	}
	return null;
}

/**
 * Inicia sesión por el flujo REAL de la maqueta: /market/auth/start → pantalla dev → callback.
 * Devuelve la cookie de sesión y el token CSRF que la página entrega.
 */
export async function loginMock(email: string, e: Env = env, base = BASE): Promise<Session> {
	// IP distinta por login: si no, el límite de frecuencia del login (correcto) frena las pruebas.
	const ip = { "cf-connecting-ip": `10.${rand()}.${rand()}.${rand()}` };
	const start = await call("/market/auth/start?next=/market/mis-compras", { headers: ip }, e, base);
	const loginCookie = cookieFrom(start, "tcm_login")!;
	const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
	const dev = await call(
		"/market/auth/dev",
		{ method: "POST", headers: { origin: base, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ email, name: "Persona de prueba", state }) },
		e,
		base,
	);
	const cb = await call(dev.headers.get("location")!, { headers: { cookie: loginCookie, ...ip } }, e, base);
	const session = cookieFrom(cb, "tcm_session");
	if (!session) throw new Error(`login falló: ${cb.status} ${cb.headers.get("location")}`);
	return withCsrf(session, email, e, base);
}

export async function withCsrf(cookie: string, email: string, e: Env = env, base = BASE): Promise<Session> {
	const page = await call("/market/mis-compras", { headers: { cookie } }, e, base);
	const csrf = (await page.text()).match(/name="csrf" value="([^"]+)"/)?.[1];
	if (!csrf) throw new Error("no se encontró el token CSRF");
	return { cookie, csrf, email };
}

export function postForm(path: string, s: Session | null, data: Record<string, string> = {}, e: Env = env, base = BASE): Promise<Response> {
	return call(
		path,
		{
			method: "POST",
			headers: { origin: base, "content-type": "application/x-www-form-urlencoded", ...(s ? { cookie: s.cookie } : {}) },
			body: new URLSearchParams({ ...(s ? { csrf: s.csrf } : {}), ...data }),
		},
		e,
		base,
	);
}

export async function one<T>(sql: string, ...binds: unknown[]): Promise<T | null> {
	return env.MARKET_DB.prepare(sql).bind(...binds).first<T>();
}

export async function count(sql: string, ...binds: unknown[]): Promise<number> {
	const r = await env.MARKET_DB.prepare(sql).bind(...binds).first<{ n: number }>();
	return r?.n ?? 0;
}
