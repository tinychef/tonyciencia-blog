import type { Context } from "hono";
import type { Adapters } from "./adapters";
import type { Config } from "./config";
import type { Env } from "./env";
import type { Deps } from "./services/orders";
import type { User } from "./services/repo";

export interface AppEnv {
	Bindings: Env;
	Variables: {
		config: Config;
		adapters: Adapters;
		user: User | null;
		/** SHA-256 del token de sesión (id en la tabla sessions). */
		sessionId: string | null;
		csrf: string | null;
		isAdmin: boolean;
	};
}

export type Ctx = Context<AppEnv>;

export function deps(c: Ctx): Deps {
	return { db: c.env.MARKET_DB, config: c.get("config"), adapters: c.get("adapters") };
}

export function clientIp(c: Ctx): string {
	return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
