/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		/** Nonce de la Content-Security-Policy de esta respuesta (src/middleware.ts). */
		cspNonce?: string;
	}
}
