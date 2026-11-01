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
	// Textos de la interfaz en el idioma de la página (/market/en/… → <html lang="en">).
	const EN = doc.lang === "en";
	const L = (es, en) => (EN ? en : es);
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
				toast(L(`Código ${code} copiado`, `Code ${code} copied`));
			} catch {
				toast(L(`Tu código: ${code}`, `Your code: ${code}`));
			}
			const label = $("[data-copy-label]", btn);
			if (label) label.textContent = L("¡Copiado!", "Copied!");
		});
	});

	// ── Tema claro / oscuro: misma cookie "scheme" que el blog; transición circular desde el botón ──
	const themeBtn = $("[data-theme-toggle]");
	if (themeBtn) {
		const apply = (theme) => {
			doc.classList.remove("light", "dark");
			doc.classList.add(theme);
			themeBtn.setAttribute("aria-pressed", String(theme === "dark"));
			$('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#ffffff" : "#0a0a0b");
			$('meta[name="color-scheme"]')?.setAttribute("content", theme);
			const secure = location.protocol === "https:" ? "; Secure" : "";
			document.cookie = `scheme=${theme}; path=/; max-age=31536000; SameSite=Lax${secure}`;
		};
		themeBtn.addEventListener("click", (e) => {
			const next = doc.classList.contains("light") ? "dark" : "light";
			if (!document.startViewTransition || reduced) return apply(next);
			const r = themeBtn.getBoundingClientRect();
			const x = e.clientX || r.left + r.width / 2;
			const y = e.clientY || r.top + r.height / 2;
			doc.style.setProperty("--vt-x", `${x}px`);
			doc.style.setProperty("--vt-y", `${y}px`);
			doc.style.setProperty("--vt-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
			document.startViewTransition(() => apply(next));
		});
	}

	// ── Cabecera con sombra al bajar ──
	const header = $("[data-header]");
	if (header) {
		const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
	}

	// ── Menú móvil: se cierra con el botón, Escape, tocando fuera o al elegir un enlace ──
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

	// ── Portadas animadas: primero la fija (rápida), la animada cuando la tarjeta entra en pantalla ──
	const animImgs = $$("img[data-anim]");
	const saveData = navigator.connection && navigator.connection.saveData;
	if (animImgs.length && !reduced && !saveData && "IntersectionObserver" in window) {
		const swap = (img) => {
			const src = img.dataset.anim;
			if (!src) return;
			delete img.dataset.anim;
			const pre = new Image();
			pre.onload = () => {
				img.removeAttribute("srcset");
				img.removeAttribute("sizes");
				img.src = src;
			};
			pre.src = src;
		};
		const start = () => {
			const io = new IntersectionObserver(
				(entries) => entries.forEach((e) => e.isIntersecting && (io.unobserve(e.target), swap(e.target))),
				{ rootMargin: "200px 0px" },
			);
			animImgs.forEach((img) => io.observe(img));
		};
		if (document.readyState === "complete") start();
		else window.addEventListener("load", start, { once: true });
	}

	// ── Luz que recorre el borde de una tarjeta al azar, una a la vez, despacio (solo sin «reducir movimiento») ──
	const glowCards = $$(".mk5-grid > li");
	if (glowCards.length > 1 && !reduced && "IntersectionObserver" in window) {
		const onScreen = new Set();
		const vis = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target))), { threshold: 0.6 });
		glowCards.forEach((li) => vis.observe(li));
		let last = null;
		const tick = () => {
			if (document.hidden) return;
			const pool = [...onScreen].filter((li) => li !== last && !li.hidden);
			if (!pool.length) return;
			const li = pool[Math.floor(Math.random() * pool.length)];
			last = li;
			li.classList.remove("is-glow");
			void li.offsetWidth;
			li.classList.add("is-glow");
			setTimeout(() => li.classList.remove("is-glow"), 6200);
		};
		setTimeout(tick, 1500);
		setInterval(tick, 7000);
	}

	// ── Catálogo: búsqueda, categoría, filtros rápidos y orden, al instante (sin JS funciona igual por GET) ──
	const grid = $("[data-filter-grid]");
	if (grid) {
		const items = $$(".mk3-item", grid);
		items.forEach((li, i) => (li.dataset.idx = String(i)));
		const inputs = $$("[data-filter-input]");
		const catSel = $("[data-filter-cat]");
		const sortSel = $("[data-filter-sort]");
		const empty = $("[data-filter-empty]");
		const count = $("[data-filter-count]");
		const catLinks = $$("[data-cat-filter]");
		const quick = $$("[data-quick]");
		const params = new URLSearchParams(location.search);
		const state = {
			q: params.get("q") || "",
			cat: params.get("categoria") || "",
			sort: params.get("orden") || "destacados",
			filter: params.get("filtro") || "",
		};
		const num = (li, k) => Number(li.dataset[k] || 0);
		const sorters = {
			destacados: (a, b) => num(a, "idx") - num(b, "idx"),
			"precio-asc": (a, b) => num(a, "price") - num(b, "price"),
			"precio-desc": (a, b) => num(b, "price") - num(a, "price"),
			nuevos: (a, b) => num(b, "created") - num(a, "created"),
			valorados: (a, b) => num(a, "idx") - num(b, "idx"),
		};
		const apply = (pushUrl = true) => {
			const q = state.q.trim().toLowerCase();
			let shown = 0;
			for (const li of items) {
				const okFilter =
					!state.filter ||
					(state.filter === "ofertas" && li.dataset.sale === "1") ||
					(state.filter === "gratis" && li.dataset.free === "1") ||
					(state.filter === "disponibles" && li.dataset.soon !== "1");
				const ok = (!state.cat || li.dataset.cat === state.cat) && (!q || (li.dataset.search || "").includes(q)) && okFilter;
				li.hidden = !ok;
				if (ok) shown++;
			}
			const sorter = sorters[state.sort] || sorters.destacados;
			const ordered = [...items].sort((a, b) => num(a, "soon") - num(b, "soon") || sorter(a, b));
			ordered.forEach((li) => grid.appendChild(li));
			if (empty) empty.hidden = shown > 0;
			if (count) count.textContent = `${shown} ${shown === 1 ? L("producto", "product") : L("productos", "products")}`;
			catLinks.forEach((a) => a.setAttribute("aria-current", String((a.dataset.catFilter || "") === state.cat)));
			// Las píldoras son excluyentes: «Todo» solo se marca sin filtro ni categoría.
			quick.forEach((a) => {
				const v = a.dataset.quick || "";
				a.setAttribute("aria-current", String(v === state.filter && (v !== "" || !state.cat)));
			});
			inputs.forEach((i) => i !== document.activeElement && (i.value = state.q));
			if (catSel) catSel.value = state.cat;
			if (sortSel) sortSel.value = state.sort;
			if (!pushUrl) return;
			const url = new URL(location.href);
			const set = (k, v, def = "") => (v && v !== def ? url.searchParams.set(k, v) : url.searchParams.delete(k));
			set("q", q);
			set("categoria", state.cat);
			set("orden", state.sort, "destacados");
			set("filtro", state.filter);
			// "/market?…" no llega al Worker del market en producción (la ruta exacta no admite parámetros).
			const path = url.pathname === "/market" && url.search ? "/market/" : url.pathname;
			history.replaceState(null, "", path + url.search + url.hash);
		};
		items.forEach((li) => (li.dataset.soon = li.dataset.soon === "1" ? "1" : "0"));
		inputs.forEach((input) => {
			input.addEventListener("input", () => {
				state.q = input.value;
				apply();
			});
			input.form?.addEventListener("submit", (e) => {
				e.preventDefault();
				state.q = input.value;
				apply();
				$("#catalogo")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
			});
		});
		catSel?.addEventListener("change", () => {
			state.cat = catSel.value;
			apply();
		});
		sortSel?.addEventListener("change", () => {
			state.sort = sortSel.value;
			apply();
		});
		catLinks.forEach((a) =>
			a.addEventListener("click", (e) => {
				e.preventDefault();
				const v = a.dataset.catFilter || "";
				state.cat = state.cat === v ? "" : v;
				state.filter = "";
				apply();
				$("#catalogo")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
			}),
		);
		quick.forEach((a) =>
			a.addEventListener("click", (e) => {
				e.preventDefault();
				state.filter = a.dataset.quick || "";
				state.cat = "";
				apply();
			}),
		);
	}

	// ── "Paga lo que quieras": montos rápidos y botón que dice lo que vas a pagar ──
	const pwyw = $("[data-pwyw]");
	if (pwyw) {
		const input = $("[data-pwyw-input]", pwyw);
		const submit = $("[data-pwyw-submit]", pwyw);
		const min = Number(pwyw.dataset.min || 0);
		const max = Number(pwyw.dataset.max || 99999999);
		const presets = $$("[data-amount]", pwyw);
		const parse = (v) => {
			let s = String(v || "").trim().replace(/^(us)?\$\s*/i, "").replace(/\s*(usd|us\$|\$)$/i, "").replace(/\s+/g, "");
			if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, "");
			else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
			else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
			if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
			return Math.round(Number(s) * 100);
		};
		const fmt = (c) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })} USD`;
		const update = () => {
			const c = parse(input.value);
			let msg = "";
			let ok = true;
			if (c === null) (ok = false), (msg = L("Escribe un monto válido", "Enter a valid amount"));
			else if (c < min) (ok = false), (msg = `${L("Mínimo", "Minimum")} ${fmt(min)}`);
			else if (c > max) (ok = false), (msg = `${L("Máximo", "Maximum")} ${fmt(max)}`);
			else if (c > 0 && c < 50) (ok = false), (msg = L("Con tarjeta, desde $0.50 (o 0 = gratis)", "By card, from $0.50 (or 0 = free)"));
			submit.textContent = !ok ? msg : c === 0 ? L("Descargar gratis", "Download for free") : `${L("Continuar con", "Continue with")} ${fmt(c)}`;
			submit.disabled = !ok;
			input.setAttribute("aria-invalid", String(!ok));
			presets.forEach((b) => b.classList.toggle("is-active", parse(b.dataset.amount) === c));
		};
		presets.forEach((b) =>
			b.addEventListener("click", () => {
				input.value = b.dataset.amount;
				update();
				input.focus();
			}),
		);
		input?.addEventListener("input", update);
		update();
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
		new IntersectionObserver(([en]) => {
			const on = !en.isIntersecting && en.boundingClientRect.top < 0;
			buybar.classList.toggle("is-visible", on);
			doc.classList.toggle("mk-has-buybar", on);
		}).observe(buybox);
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

	// ── Popup de bienvenida: flotante y no modal; una vez cada 14 días y nunca si ya copió el código.
	//    Al cerrarlo queda una pestaña discreta («10% OFF») para volver a verlo. ──
	const pop = $("[data-welcome]");
	const tab = $("[data-pop-open]");
	if (pop) {
		const KEY = "mk_welcome_at";
		const last = Number(store.get(KEY) || 0);
		const used = () => !!store.get("mk_coupon");
		const due = Date.now() - last > 14 * 86400_000 && !used();
		const showTab = (on) => tab && (tab.hidden = !on || used());
		const open = () => {
			store.set(KEY, String(Date.now()));
			pop.hidden = false;
			requestAnimationFrame(() => pop.classList.add("is-open"));
			showTab(false);
		};
		const close = () => {
			pop.classList.remove("is-open");
			pop.hidden = true;
			showTab(true);
		};
		$$("[data-pop-close]", pop).forEach((el) => el.addEventListener("click", close));
		$("[data-pop-used]", pop)?.addEventListener("click", () => setTimeout(close, 1400));
		tab?.addEventListener("click", open);
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && !pop.hidden) close();
		});
		if (due) {
			let armed = true;
			const trigger = () => {
				if (!armed) return;
				armed = false;
				open();
			};
			setTimeout(trigger, 6000);
			window.addEventListener(
				"scroll",
				() => {
					const h = document.documentElement;
					if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.35) trigger();
				},
				{ passive: true },
			);
		} else {
			showTab(!!last);
		}
	}
})();
