// Market Tony — comportamiento de la tienda. Todo es mejora progresiva: sin JS la tienda funciona igual
// (el menú es <details>, la galería usa anclas, el filtro es un formulario GET).
// La CSP solo permite este archivo (nada de JS en línea).
(() => {
	const doc = document.documentElement;
	doc.classList.add("js");
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
	const store = {
		get(k) {
			try { return localStorage.getItem(k); } catch { return null; }
		},
		set(k, v) {
			try { localStorage.setItem(k, v); } catch { /* modo privado */ }
		},
	};

	// ── Aviso breve ──
	const toastEl = $("[data-toast]");
	let toastTimer;
	const toast = (msg) => {
		if (!toastEl) return;
		toastEl.textContent = msg;
		toastEl.classList.add("is-on");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
	};

	// ── Copiar código de cupón (y dejarlo listo en el campo del checkout) ──
	const couponInput = $("[data-coupon-input]");
	const savedCoupon = store.get("mk_coupon");
	if (couponInput && savedCoupon && !couponInput.value) couponInput.value = savedCoupon;
	$$("[data-copy]").forEach((btn) => {
		btn.addEventListener("click", async () => {
			const code = btn.getAttribute("data-copy");
			store.set("mk_coupon", code);
			if (couponInput && !couponInput.value) couponInput.value = code;
			try {
				await navigator.clipboard.writeText(code);
				toast(`Código ${code} copiado`);
			} catch {
				toast(`Tu código: ${code}`);
			}
			const label = $("[data-copy-label]", btn);
			if (label) label.textContent = "¡Copiado!";
		});
	});

	// ── Cabecera con sombra al bajar ──
	const header = $("[data-header]");
	if (header) {
		const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
	}

	// ── Menú móvil: se cierra con ✕, Escape, tocando fuera o al elegir un enlace ──
	const menu = $("[data-menu]");
	if (menu) {
		const close = () => menu.removeAttribute("open");
		$("[data-menu-close]", menu)?.addEventListener("click", close);
		$$(".mk-menu-panel a", menu).forEach((a) => a.addEventListener("click", close));
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && menu.open) {
				close();
				$("summary", menu)?.focus();
			}
		});
		document.addEventListener("click", (e) => {
			if (menu.open && !menu.contains(e.target)) close();
		});
		menu.addEventListener("toggle", () => {
			$("summary", menu)?.setAttribute("aria-label", menu.open ? "Cerrar menú" : "Abrir menú");
		});
	}

	// ── Aparición al hacer scroll ──
	const revealEls = $$("[data-reveal]");
	if ("IntersectionObserver" in window && !reduced) {
		const io = new IntersectionObserver(
			(entries) => {
				for (const en of entries) {
					if (en.isIntersecting) {
						en.target.classList.add("is-in");
						io.unobserve(en.target);
					}
				}
			},
			{ rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
		);
		revealEls.forEach((el, i) => {
			el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
			io.observe(el);
		});
	} else {
		revealEls.forEach((el) => el.classList.add("is-in"));
	}

	// ── Inclinación 3D de las tarjetas ──
	if (finePointer && !reduced) {
		$$("[data-tilt]").forEach((card) => {
			card.addEventListener("pointermove", (e) => {
				const r = card.getBoundingClientRect();
				const x = (e.clientX - r.left) / r.width - 0.5;
				const y = (e.clientY - r.top) / r.height - 0.5;
				card.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
				card.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
			});
			card.addEventListener("pointerleave", () => {
				card.style.removeProperty("--rx");
				card.style.removeProperty("--ry");
			});
		});
		const stack = $("[data-parallax]");
		if (stack) {
			const cards = $$(".mk-stack-card", stack);
			window.addEventListener(
				"pointermove",
				(e) => {
					const x = e.clientX / window.innerWidth - 0.5;
					const y = e.clientY / window.innerHeight - 0.5;
					cards.forEach((c, i) => {
						const depth = (i + 1) * 10;
						c.style.setProperty("--px", `${(x * depth).toFixed(1)}px`);
						c.style.setProperty("--py", `${(y * depth).toFixed(1)}px`);
					});
				},
				{ passive: true },
			);
		}
	}

	// ── Filtro del catálogo (búsqueda + categorías, al instante) ──
	const grid = $("[data-filter-grid]");
	if (grid) {
		const items = $$(".mk-pcard-wrap", grid);
		const input = $("[data-filter-input]");
		const empty = $("[data-filter-empty]");
		const catLinks = $$("[data-cat-filter]");
		let cat = new URLSearchParams(location.search).get("categoria") || "";
		const apply = () => {
			const q = (input?.value || "").trim().toLowerCase();
			let shown = 0;
			for (const li of items) {
				const ok = (!cat || li.dataset.cat === cat) && (!q || (li.dataset.search || "").includes(q));
				li.hidden = !ok;
				if (ok) {
					shown++;
					li.classList.add("is-in");
				}
			}
			if (empty) empty.hidden = shown > 0;
			catLinks.forEach((a) => a.setAttribute("aria-current", String((a.dataset.catFilter || "") === cat)));
			const url = new URL(location.href);
			cat ? url.searchParams.set("categoria", cat) : url.searchParams.delete("categoria");
			q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
			history.replaceState(null, "", url.pathname + url.search + url.hash);
		};
		input?.addEventListener("input", apply);
		input?.form?.addEventListener("submit", (e) => {
			e.preventDefault();
			apply();
		});
		catLinks.forEach((a) =>
			a.addEventListener("click", (e) => {
				e.preventDefault();
				cat = a.dataset.catFilter || "";
				apply();
			}),
		);
	}

	// ── Galería del producto ──
	const gallery = $("[data-gallery]");
	if (gallery) {
		const slides = $$("[data-slide]", gallery);
		const thumbs = $$("[data-thumb]", gallery);
		let idx = 0;
		const show = (i) => {
			if (!slides.length) return;
			idx = (i + slides.length) % slides.length;
			slides.forEach((s, j) => s.classList.toggle("is-active", j === idx));
			thumbs.forEach((t, j) => {
				t.classList.toggle("is-active", j === idx);
				t.setAttribute("aria-selected", String(j === idx));
			});
			thumbs[idx]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
		};
		thumbs.forEach((t, j) =>
			t.addEventListener("click", (e) => {
				e.preventDefault();
				show(j);
			}),
		);
		$("[data-gal-prev]", gallery)?.addEventListener("click", () => show(idx - 1));
		$("[data-gal-next]", gallery)?.addEventListener("click", () => show(idx + 1));
		gallery.addEventListener("keydown", (e) => {
			if (e.key === "ArrowLeft") show(idx - 1);
			if (e.key === "ArrowRight") show(idx + 1);
		});
		let startX = null;
		const main = $(".mk-gallery2-main", gallery);
		main?.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
		main?.addEventListener("touchend", (e) => {
			if (startX === null) return;
			const dx = e.changedTouches[0].clientX - startX;
			if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
			startX = null;
		});
	}

	// ── Barra de compra fija (celular) cuando la caja de compra sale de pantalla ──
	const buybar = $("[data-buybar]");
	const buybox = $("#comprar");
	if (buybar && buybox && "IntersectionObserver" in window) {
		new IntersectionObserver(([en]) => buybar.classList.toggle("is-visible", !en.isIntersecting && en.boundingClientRect.top < 0)).observe(buybox);
	}

	// ── Pestañas de la ficha: marca la sección visible ──
	const tabLinks = $$(".mk-tabs a");
	if (tabLinks.length && "IntersectionObserver" in window) {
		const map = new Map(tabLinks.map((a) => [a.getAttribute("href").slice(1), a]));
		const tio = new IntersectionObserver(
			(entries) => {
				for (const en of entries) {
					if (en.isIntersecting) {
						tabLinks.forEach((a) => a.classList.remove("is-active"));
						map.get(en.target.id)?.classList.add("is-active");
					}
				}
			},
			{ rootMargin: "-40% 0px -55% 0px" },
		);
		map.forEach((_, id) => {
			const el = document.getElementById(id);
			if (el) tio.observe(el);
		});
	}

	// ── Video de YouTube: carga el reproductor solo al hacer clic (sin cookies) ──
	$$("[data-yt]").forEach((box) => {
		const link = $("a", box);
		link?.addEventListener("click", (e) => {
			e.preventDefault();
			const id = box.getAttribute("data-yt");
			if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
			const f = document.createElement("iframe");
			f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
			f.title = "Video de YouTube";
			f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
			f.allowFullscreen = true;
			box.replaceChildren(f);
		});
	});

	// ── Popup de bienvenida (una vez cada 14 días; nunca si ya copió el código) ──
	const pop = $("[data-welcome]");
	if (pop) {
		const KEY = "mk_welcome_at";
		const last = Number(store.get(KEY) || 0);
		const due = Date.now() - last > 14 * 86400_000 && !store.get("mk_coupon");
		let lastFocus = null;
		const open = () => {
			if (!pop.hidden) return;
			store.set(KEY, String(Date.now()));
			lastFocus = document.activeElement;
			pop.hidden = false;
			$(".mk-pop-code", pop)?.focus();
		};
		const close = () => {
			pop.hidden = true;
			lastFocus?.focus?.();
		};
		$$("[data-pop-close]", pop).forEach((el) => el.addEventListener("click", close));
		document.addEventListener("keydown", (e) => {
			if (pop.hidden) return;
			if (e.key === "Escape") close();
			if (e.key === "Tab") {
				const f = $$("button, a[href], input", pop).filter((x) => x.offsetParent !== null);
				if (!f.length) return;
				const first = f[0];
				const lastEl = f[f.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					lastEl.focus();
				} else if (!e.shiftKey && document.activeElement === lastEl) {
					e.preventDefault();
					first.focus();
				}
			}
		});
		if (due) {
			let armed = true;
			const trigger = () => {
				if (!armed) return;
				armed = false;
				open();
			};
			setTimeout(trigger, 9000);
			window.addEventListener(
				"scroll",
				() => {
					const h = document.documentElement;
					if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.45) trigger();
				},
				{ passive: true },
			);
			if (finePointer) document.addEventListener("mouseleave", (e) => e.clientY <= 0 && trigger());
		}
	}
})();
