import { useEffect, useState } from "react";

const STORAGE_KEY = "tc-lang";
const SUPPORTED = ["en", "es"] as const;
type Lang = (typeof SUPPORTED)[number];

function detectLang(): Lang {
	if (typeof localStorage === "undefined") return "en";
	const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
	if (stored && SUPPORTED.includes(stored)) return stored;
	const browser = navigator.language.slice(0, 2).toLowerCase();
	return browser === "es" ? "es" : "en";
}

export function LanguageSwitcher() {
	const [lang, setLang] = useState<Lang>("en");

	useEffect(() => {
		setLang(detectLang());
	}, []);

	function handleSelect(next: Lang) {
		localStorage.setItem(STORAGE_KEY, next);
		setLang(next);
		// Dispatch event so other components can react
		window.dispatchEvent(new CustomEvent("tc-lang-change", { detail: next }));
	}

	return (
		<div className="lang-switcher" role="group" aria-label="Language selector">
			{SUPPORTED.map((code) => (
				<button
					key={code}
					className={`lang-btn${lang === code ? " lang-btn--active" : ""}`}
					onClick={() => handleSelect(code)}
					aria-pressed={lang === code}
					title={code === "en" ? "English" : "Español"}
				>
					{code.toUpperCase()}
				</button>
			))}
			<style>{`
				.lang-switcher {
					display: inline-flex;
					align-items: center;
					gap: 2px;
					font-family: var(--font-mono, monospace);
					font-size: 11px;
					font-weight: 500;
					letter-spacing: 0.08em;
				}
				.lang-btn {
					background: none;
					border: none;
					cursor: pointer;
					padding: 4px 6px;
					border-radius: 4px;
					color: var(--color-muted, #6e6e73);
					transition: color 120ms ease;
					line-height: 1;
				}
				.lang-btn:hover {
					color: var(--color-text-secondary, #86868b);
				}
				.lang-btn--active {
					color: var(--color-accent, #39ff14);
					text-shadow: 0 0 8px rgba(57, 255, 20, 0.6);
				}
			`}</style>
		</div>
	);
}
