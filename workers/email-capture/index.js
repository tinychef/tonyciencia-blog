const ALLOWED_ORIGINS = new Set([
	"https://tonyciencia.com",
	"https://tonyciencia.antonioduquejuliao.workers.dev",
	"http://localhost:4321",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin) {
	const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://tonyciencia.com";
	return {
		"Access-Control-Allow-Origin": allow,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

export default {
	async fetch(request, env) {
		const origin = request.headers.get("Origin") || "";
		const headers = corsHeaders(origin);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers });
		}

		if (request.method !== "POST") {
			return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
				status: 405,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		let body;
		try {
			body = await request.json();
		} catch {
			return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
				status: 400,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

		if (!EMAIL_RE.test(email)) {
			return new Response(JSON.stringify({ ok: false, error: "invalid_email" }), {
				status: 400,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		await env.LEADS.put(
			`lead:${email}`,
			JSON.stringify({ email, capturedAt: new Date().toISOString(), source: body.source ?? "home" }),
		);

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { ...headers, "Content-Type": "application/json" },
		});
	},
};
