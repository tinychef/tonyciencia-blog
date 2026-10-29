// Botón flotante "Market Tony": en pantallas chicas se esconde al bajar (para no tapar lo que se
// está leyendo) y reaparece al subir, al llegar al final o al recibir foco con el teclado.
// Misma lógica que src/components/MarketFab.astro del sitio.
(() => {
	const fab = document.querySelector(".market-fab");
	if (!fab) return;
	const small = window.matchMedia("(max-width: 640px)");
	let lastY = window.scrollY;
	let queued = false;
	const update = () => {
		queued = false;
		const y = window.scrollY;
		const delta = y - lastY;
		const atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 120;
		if (!small.matches || y < 120 || atEnd || delta < -6) fab.classList.remove("is-tucked");
		else if (delta > 6) fab.classList.add("is-tucked");
		lastY = y;
	};
	window.addEventListener("scroll", () => {
		if (!queued) {
			queued = true;
			requestAnimationFrame(update);
		}
	}, { passive: true });
	fab.addEventListener("focus", () => fab.classList.remove("is-tucked"));
})();
