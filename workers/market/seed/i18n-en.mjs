// Fichas en inglés de Market Tony (columna `i18n` → {"en": {...}}). Fuente de scripts/gen-i18n-migration.mjs
// (→ migrations/0011_ingles.sql). Traducción fiel de las fichas en español tal como quedaron tras la migración 0010,
// con el inglés de los README de cada repo donde existe (specreel, specreel-stick, pagespeed-forensics). Nada nuevo,
// salvo decir claro en qué idioma trabaja cada producto (Anuncios y CutPilot: solo español).
//
// Reglas: `specs` en el mismo orden que en español; `image_alts`, uno por imagen y en el mismo orden que `images`;
// meta_title ≤ 60; meta_description 120–160; title ≤ 70.
//
// Palabras clave (etiquetas): autocompletado de Google en inglés (hl=en, gl=us), consultado el 2026-11-01:
//   "ad prompts" → ad copy prompts, ai advertising prompts · "ai ad prompts" → ai ads prompt library ·
//   "prompts for facebook ads" · "claude code video" → claude code video generation / video skills / video editing ·
//   "explainer video ai" → explainer video ai maker, animated video ai from text · "3d explainer video" ·
//   "stick figure animation" → … ai, … for youtube · "stick figure ai video generator" ·
//   "pagespeed insights mobile" → … mobile score low · "core web vitals" · "lighthouse mobile performance score" ·
//   "claude code skills" · "claude code agents" · "claude code subagents" · "claude code mcp servers" ·
//   "claude code for designers" · "remove filler words from video" · "remove silence from video" ·
//   "youtube video editor ai" · "claude code remotion". Sin volúmenes: no hay acceso a una herramienta de volúmenes.

export const EN = {
	"anuncios-infinitos": {
		title: "Automatic Ads: Spanish-language AI agent with 250+ ad prompts",
		tagline: "Your AI advertising strategist, in Spanish: it researches your business and gives you 250+ ad prompts, each with its reasoning.",
		summary:
			"Spanish-language AI agent that researches your business and your competitors and delivers 250+ ad prompts for Meta, Google, TikTok and LinkedIn. One-time payment.",
		meta_title: "Automatic Ads: 250+ AI ad prompts (Spanish-language agent)",
		meta_description:
			"Automatic Ads: Spanish-language AI agent that researches your business and competitors and delivers 250+ ad prompts for Meta, Google, TikTok and LinkedIn.",
		description: `Spanish-language AI agent that researches your business and your competitors and delivers 250+ ad prompts for Meta, Google, TikTok and LinkedIn. One-time payment.

Language: the agent, the local app and the 3 guides are in Spanish. Tony, the agent, works and replies in Spanish, and the product is designed for Spanish-speaking businesses.

If you are putting your ads together in Canva at 11 p.m., this is for you.

Automatic Ads is a system that works as your advertising strategist. You open the folder in your AI tool, type /ads and talk with Tony, the agent. In a 20 to 40 minute session it delivers what usually takes weeks: research on your business and your competitors, your ideal customers, the strategy and hundreds of ad prompts, each with its reasoning.

It is not an AI that makes pretty pictures. It is the one that decides what to advertise, to whom and from what angle; then it writes the prompts to produce it.

## What you get in your first session

- An analysis of your brand and your competitors, researched with real tools (not made up).
- 2 to 4 ideal customer profiles.
- At least 5 ad categories × 50 prompts = 250+ prompts, in separate files by category.
- The copy for each ad: hook, body and call to action, reviewed so it does not sound like AI.
- The campaign strategy: how to structure your campaigns, how much to invest and what to measure.
- A Readiness Score (0 to 100) with the 3 things worth fixing before you spend.
- 3 to 5 own-content tasks (for example a testimonial or the founder on camera), with a mini script.
- An interactive report to open in your browser.
- On request: 9:16 video scripts for Reels and TikTok, and a meme library.
- On request: your 6-month attack plan.

## What's in the ZIP

- The Tony agent: its knowledge and rules (22 skill files).
- The local app: a panel in your browser to paste your keys with buttons and chat without a terminal.
- 3 PDF guides: how everything connects, how to use the agent and how to use the app.

## The method inside

26 psychological ad categories, 37 visual formats, 8 copywriting voices, guides for Meta, Google, TikTok and LinkedIn, and well-known strategy frameworks (awareness stages, levels of sophistication, Cialdini, AIDA, jobs to be done).

## Come back every month

You bring your real numbers. Tony diagnoses why they moved, plans the next month and generates a new batch based on the angle that already worked for you. It saves what it learned in your folder, including what not to repeat.

## One-time payment

No subscription. Use it with all your businesses or clients, every month.

## What you need

- A compatible AI tool: Claude Code, Cursor, Codex, Antigravity or Gemini (it may have its own cost).
- Node.js (free) to open the local app.
- To turn the prompts into images and video: a generator such as Nano Banana or Google Flow, with your own account. The ZIP does not include a generator.
- Three free keys (Firecrawl, Apify and Serper) for deep research; they take about 5 minutes to set up with buttons.

## Who it is for

Business owners, media buyers, freelancers and small agencies who run their own advertising in Spanish and want to stop producing ads one at a time.

## Who it is not for

If you are looking for a sales guarantee, this does not give one: it delivers strategy, prompts and copy; the result depends on your offer, your budget and your execution. It is also not for anyone who does not want to invest anything in ad spend or in an AI tool.

Everything is in Spanish. Some sign-up links inside the ZIP are affiliate links; they do not change your price.`,
		highlights: [
			"Real research on your brand and your competitors, with real tools (not made up)",
			"250+ prompts: at least 5 categories × 50 prompts, in separate files",
			"Complete copy for each ad: hook, body and call to action",
			"Campaign strategy, budget and metrics, plus a Readiness Score from 0 to 100",
			"Local app to use it without a terminal, and 3 PDF guides (in Spanish)",
			"One-time payment: use it with all your businesses or clients, every month",
		],
		specs: [
			{ label: "Format", value: "ZIP: agent (22 skill files), local app and 3 PDF guides" },
			{ label: "Language", value: "Spanish only: the agent works and replies in Spanish" },
			{ label: "Works with", value: "Claude Code, Cursor, Codex, Antigravity or Gemini" },
			{ label: "Ad platforms", value: "Meta, Google, TikTok and LinkedIn" },
			{ label: "Requirements", value: "Node.js (free) and a compatible AI tool" },
			{ label: "License", value: "One-time payment, no subscription" },
		],
		faq: [
			{ q: "Is it in English?", a: "No. The agent, the local app and the guides are in Spanish, and Tony works and replies in Spanish. It is designed for Spanish-speaking businesses." },
			{ q: "Do I need to know how to code?", a: "No. You open the app or your AI tool and talk with Tony, the agent." },
			{ q: "Does it generate the images and videos?", a: "No. It writes the prompts and the copy. You turn them into images or video with the generator you already use (for example Nano Banana or Google Flow), with your own account." },
			{ q: "Does it work without the Firecrawl, Apify and Serper keys?", a: "Yes, but it researches less. All three are free and take about 5 minutes to set up with buttons." },
			{ q: "Does it guarantee sales?", a: "No. It delivers strategy, prompts and copy. The result depends on your offer, your budget and your execution." },
			{ q: "Does it work for any business?", a: "It is designed for Spanish-speaking businesses that advertise on Meta, Google, TikTok or LinkedIn. Tony asks what it needs to know before proposing anything." },
			{ q: "Does it include a Chrome extension?", a: "No. The package includes the agent, the local app and the guides." },
			{ q: "Which AI tools do I need?", a: "A compatible one: Claude Code, Cursor, Codex, Antigravity or Gemini. The local app uses your signed-in Claude session." },
		],
		tags: ["AI ad prompts", "prompts for Facebook ads", "ad copy prompts", "AI ads prompt library", "Meta Ads", "Google Ads", "Spanish-language AI ad agent"],
		image_alts: [
			"Automatic Ads: 250+ ad prompts for Meta, Google, TikTok and LinkedIn",
			"Session with Tony, the agent: research on your business and readiness score",
			"Automatic Ads deliverables: prompt folders by category, strategy and plan",
			"Automatic Ads cover: AI agent with 250+ ad prompts (image in Spanish)",
			"The problem: making ads one at a time (image in Spanish)",
			"What makes Automatic Ads different (image in Spanish)",
			"What you get with Automatic Ads (image in Spanish)",
			"How Automatic Ads works (image in Spanish)",
		],
	},

	specreel: {
		title: "Motion 3D Video: 3D explainer and product videos with Claude Code",
		tagline: "Ask your agent for a video and get a narrated 3D MP4 with captions, music and a cinematic camera.",
		summary:
			"Claude Code and Codex skill that turns any topic into a narrated, captioned 3D video: product launches, processes, data stories and explainers.",
		meta_title: "Motion 3D Video: 3D explainer videos with Claude Code",
		meta_description:
			"Motion 3D Video: a Claude Code and Codex skill that turns any topic into a narrated 3D explainer or product video with captions and music. Runs on your PC.",
		description: `Motion 3D Video is an agent skill for Claude Code and Codex that turns any topic into a narrated, captioned 3D video: product launches, processes, data stories and explainers.

Inside the ZIP the skill is called SpecReel: that is the name you will see in the README, in the skills/specreel folder and when you ask your agent for a video ("Use the specreel skill…").

## Ask for a video. Get a finished MP4.

Write one prompt: topic, audience, length, language. Your agent plans the piece, writes the script, voices it with your local text-to-speech or a studio voice from Fish Audio, builds 3D scenes and camera moves timed to every spoken word, adds music and sound effects, and renders an MP4 with karaoke captions and an .srt file.

No timeline editing. No per-minute video credits. It all runs on your computer.

## New in 2.0

- Cinematic camera: 16 moves (push-in, orbit, crane, dolly-zoom, whip-pan, rack focus and more) and 8 transitions, each anchored to a spoken word.
- Brand kits: start from your logo or HEX colors, or pick one of three brand-inspired palettes the agent suggests. 13 built-in palettes in bold, dark, pastel and light moods, with WCAG contrast checks.
- Windows, macOS and Linux: the Doctor detects your OS, GPU and hardware encoder, and one command installs the rest. Fast on NVIDIA or Apple Silicon, works on CPU.
- Studio voice in two minutes: a setup assistant connects Fish Audio (a separate paid service) and keeps your API key out of the chat. Free local voices are still included.
- Cleaner sound: automatic whooshes and risers, a closing chime and a true-peak limiter that lands every mix at −14 LUFS.

## One workflow, any topic

- Product & promo: turntable hero shots, parts that lift away, feature callouts and an end card with your call to action.
- Process / how it works: numbered steps that appear as they are spoken, with connections and moving packets.
- Data stories: bars and lines that grow on the words that name them, count-ups and result chips.
- Explainers: science, health, tech, finance and education, with hero objects, macro zooms, cross-sections and data cards.
- Tutorials & brand stories: mix the recipes in your brand colors, with your logo and your end card.

## Why it is different

- It plans before rendering: brief, spec, script and storyboard, with two approvals from you.
- Everything in sync: every animation, label and sound is anchored to a spoken word.
- It checks its own work: it renders stills, looks at them, scores them against a rubric and fixes them.
- It never loses track: state lives in specs/STATE.md and the loop resumes where it stopped.
- Clear licenses: the Doctor detects your local voices and flags non-commercial models. You can switch to ElevenLabs or Fish Audio by changing one line.

## What's inside (v2.0)

- The SpecReel skill (open SKILL.md format) and 11 reference guides (new: cinematography).
- A 3D engine (Three.js) with a scene director, a cinematic camera (16 moves and 8 transitions), depth of field, labels and scale bars, plus brand kits with 13 palettes or your own colors.
- 7 scene recipes: product, process, data, end card, hero object, micro and data card.
- Audio with 13 voice adapters (Kokoro, Chatterbox, Piper, XTTS, Fish Speech, local OpenAI-compatible servers, any CLI, Windows and macOS voices, eSpeak, ElevenLabs and Fish Audio), an ASR check, word alignment, music and effects, and a mix at −14 LUFS.
- Resumable multi-lane rendering, hardware-accelerated encoding, a one-command installer for Windows, macOS and Linux, and loops for Claude Code and Codex (/ralph-loop, or loop.ps1 and loop.sh for unattended runs).
- 4 example productions with their specs: Showreel (English, 21 s), brand-kit bottle demo v2 (vertical, 17 s), Cell demo (Spanish, 15 s) and Microneedling (Spanish, 47 s).
- Spec templates: constitution, brief, spec, script, storyboard, plan, tasks and state.
- Docs in English and Spanish: setup for Windows, macOS and Linux, a spec-driven development (SDD) master plan and a guide to move the voice to ElevenLabs or Fish Audio.

## What you get out

- MP4 (H.264, 30 fps) in 9:16 (1080×1920), 1:1, 4:5 or 16:9.
- Burned-in karaoke captions plus an .srt file.
- For every video, a cover frame, CREDITS.md (voice, fonts and licenses) and a QA report (REPORT.md).
- Narration in any language your voice engine supports.

## Requirements

- Claude Code or Codex (billed separately).
- Node 20+, Python 3.10+, ffmpeg and Playwright Chromium (the included installer sets them up).
- Windows, macOS or Linux (auto-detected). An NVIDIA GPU or Apple Silicon is recommended; CPU-only works, just slower.
- A voice: free local Kokoro (set up by the Doctor), or Fish Audio or ElevenLabs with your own key.
- Basic comfort with a terminal: you run a few commands during setup; the agent does the rest.

## Price and license

- One-time payment (current price shown above). No subscription, no membership.
- License: 1 person, unlimited videos for your brand, your channels and your clients (commercial use included).
- Delivery: instant download of one ZIP with everything, plus free 2.x updates.
- The license covers the videos you make; it does not allow reselling or sharing the skill files.
- Motion 3D Video is an independent product, not affiliated with Anthropic or OpenAI. Claude Code and Codex are trademarks of their owners and are named only to describe compatibility. The Fish Audio link in the voice assistant is an affiliate link; Fish Audio is a separate service with its own pricing.

## After you download

- Unzip the file and open README.md (Spanish: README.es.md).
- Install the skill. In Claude Code, copy skills/specreel to ~/.claude/skills/ (on Windows, %USERPROFILE%\\.claude\\skills\\). In Codex, copy it to ~/.agents/skills/.
- Set up your machine and try the demo: from the skill folder run python scripts/setup.py (it detects Windows, macOS or Linux and installs what is missing) and follow "First video in 5 minutes" in the README.

Then open your agent in an empty folder and paste the kickoff prompt from docs/en/SDD-PLAN.md.

Optional studio voice: inside your video project run python tools/tts/fish_setup.py. It opens Fish Audio, asks for your key with hidden input and stores it in .env.

## Refunds and support

Market Tony's refund policy applies: you get your money back if you ask within 14 days of purchase and have not downloaded the product yet, or if the file is damaged or not as described.

Support: business@tonyciencia.com. If something fails, write to us with your order reference, your project's .svs/env.json file (it contains no keys) and the output of the failing command.`,
		highlights: [
			"Write one prompt; get a finished MP4 with karaoke captions and an .srt file",
			"Cinematic camera: 16 moves and 8 transitions anchored to each word",
			"Brand kit from your logo or HEX colors, with contrast checks",
			"Free local voices or studio voices (Fish Audio, ElevenLabs) with your own key",
			"9:16, 1:1, 4:5 and 16:9 — Windows, macOS and Linux",
			"One-time payment with free 2.x updates",
		],
		specs: [
			{ label: "Version", value: "2.0" },
			{ label: "Format", value: "ZIP with the skill, the 3D engine, scene recipes, examples and docs" },
			{ label: "Works with", value: "Claude Code and Codex" },
			{ label: "Systems", value: "Windows 10/11, macOS and Linux" },
			{ label: "Output", value: "H.264 MP4 at 30 fps in 9:16, 1:1, 4:5 or 16:9, with .srt" },
			{ label: "Documentation", value: "English and Spanish" },
			{ label: "License", value: "1 creator, commercial and client use included" },
		],
		faq: [
			{ q: "Do I need to know how to code?", a: "Not to get started. You describe the video in plain language; the agent writes and fixes the scene code. You will run a few terminal commands during setup." },
			{ q: "Is there a cost per video?", a: "Not from Motion 3D Video. With a local voice you only pay for your agent usage; cloud voices bill you directly." },
			{ q: "Does it work on a Mac?", a: "Yes. Windows, macOS and Linux are detected automatically, and one command installs the dependencies. Apple Silicon renders fast." },
			{ q: "Can I use the videos commercially?", a: "Yes, for your own brand and for clients. Check the license of the voice you choose; the Doctor flags non-commercial models." },
			{ q: "What if it doesn't work for me?", a: "Check the requirements before buying. If something fails during setup, write to business@tonyciencia.com with your order reference. Market Tony's refund policy applies: you get your money back if you ask within 14 days of purchase and have not downloaded the product yet, or if the file is damaged or not as described." },
			{ q: "What kinds of videos does it make?", a: "Explainers, product and promo videos, how-it-works processes, data stories and tutorials, built from illustrated 3D scenes with labels and captions. It does not make photoreal people, avatars or lip-sync, and it does not edit camera footage." },
			{ q: "Which languages can it narrate in?", a: "Any language your voice engine supports; for example, Chatterbox Multilingual covers 23 languages. The docs come in English and Spanish." },
			{ q: "How long does a video take to render?", a: "It depends on your hardware and the length. The 21-second showreel took about 8 minutes to render on a 2-core cloud machine without a GPU. With an NVIDIA GPU or Apple Silicon (recommended) it is faster." },
			{ q: "Why does the ZIP say SpecReel?", a: "Motion 3D Video is the store name; the skill is called SpecReel. You will see that name in the README, in the skills/specreel folder and when you ask your agent for a video. It is the same product." },
		],
		tags: ["Claude Code video skill", "Claude Code video generation", "explainer video AI", "3D explainer video", "animated video AI from text", "karaoke captions"],
		image_alts: [
			"Motion 3D Video: ask your agent for a video and get a narrated 3D MP4, compatible with Claude Code and Codex",
			"Motion 3D Video: 16 camera moves and 8 transitions anchored to each word",
			"Motion 3D Video: brand kit and output in 9:16, 1:1, 4:5 and 16:9",
			"Motion 3D Video: ask your agent for a video and get the finished video, compatible with Claude Code and Codex",
			"Motion 3D Video: any topic, style and format, with 16 camera moves and 8 transitions",
		],
	},

	"specreel-stick": {
		title: "SpecReel Stick: stick figure animation videos with Claude Code",
		tagline: "Tell your agent the idea and get back a stick-figure skit as an MP4, with captions, music and effects.",
		summary:
			"Claude Code and Codex skill that turns an idea into a short stick-figure skit: two characters, a contrast and a payoff number. It delivers an MP4 with captions and music.",
		meta_title: "SpecReel Stick: AI stick figure animation with Claude Code",
		meta_description:
			"Claude Code and Codex skill that creates stick-figure skits as vertical MP4s with captions, music and effects. Runs on your computer, with or without a GPU.",
		description: `SpecReel Stick is a skill for Claude Code and Codex that makes short stick-figure skits. You give it an idea like "one saves, the other spends" or "1% better every day" and your agent writes the lines, animates two characters (the hero wears a hat) on a clean stage, adds the counter and the payoff number, mixes music and effects, and delivers an MP4 with captions. It all runs on your computer.

## The problem it solves

A 15-second animated skit has many parts: script, animation, caption timing, music and effects. SpecReel Stick gives your agent a method and an engine to put them together: first it writes the brief, the spec, the script and the storyboard, asks for your approval and only then animates. While it builds, it renders test stills, looks at them and fixes them before the final render.

## How it works, in 3 steps

- Open Claude Code or Codex in an empty folder and tell it the idea: who does what, who doesn't and what the punchline is.
- Review the script and the storyboard (checkpoint A) and then the stills sheet (checkpoint B).
- Get the MP4, the .srt file, the cover, the credits and a technical render report.

## What you get

- The SpecReel Stick skill, with its instructions, references and spec templates.
- A 3D animation engine (three.js) with hat-wearing stick figures (bowler, top hat, cap or beanie), 23 poses, layered gestures, walks, runs and jumps.
- A stage with reflection and shadows, props (growing steps, bench, box and phone), speech bubbles, thought clouds, emotes and tags.
- Reel/Story layout with a headline on top and karaoke captions below, noir style by default or your brand kit (from your logo, your HEX colors or 25 palettes inspired by well-known brands, with contrast checks).
- Music and effects generated by code, mixed at −14 LUFS.
- An example skit ready to edit ("1% better every day", in Spanish), with its sample video.
- Installer and diagnostics (Doctor) for Windows, macOS and Linux, and guides in English and Spanish.

## Who it is for

Creators and brands that post Reels, TikToks or Shorts about habits, productivity, money or mindset and want short pieces with a clear contrast between two characters, without filming themselves.

## Requirements

- Claude Code or Codex, with your own account (not included).
- Node 20+, Python 3.10+, ffmpeg and Playwright Chromium. The included installer checks what is missing and installs it (with winget, brew, apt, dnf or pacman); the automatic install also downloads a local voice of about 350 MB.
- Windows 10/11, macOS 12+ or Linux. Works with or without a GPU; without a GPU rendering is slower.

## Important

- It does not turn photos or people into stick figures. The characters are generic figures created by code; you can change their hat, colors and moves, but not copy someone's look.
- It is designed for 12- to 30-second skits with two characters and a contrast. New stories are coded by your agent on top of the example skit, so the result depends on your agent and your instructions.
- The characters have no mouths: they talk with speech bubbles and captions.
- The music is synthesized by code, not a song library.
- Cloud voices (ElevenLabs, Fish Audio) are paid separately, and some local voice models do not allow commercial use.
- The skill writes the lines and captions in the language you ask for; the included example skit is in Spanish.
- This is version 1.0 and it includes one example skit.`,
		highlights: [
			"12- to 30-second skits: two characters, a contrast, a counter and a payoff number",
			"3D stick figures with hats (bowler, top hat, cap or beanie), 23 poses, walks, runs and jumps",
			"Speech bubbles, thought clouds, 6 emotes and props: growing steps, bench, box and phone",
			"Silent by default: karaoke captions, an .srt file, and music and effects generated by code",
			"Noir style (black with one red accent) or your brand kit from your logo or HEX colors",
			"9:16, 1:1, 4:5 and 16:9 — Windows, macOS and Linux, with or without a GPU",
		],
		specs: [
			{ label: "Version", value: "1.0" },
			{ label: "Format", value: "ZIP with the skill, the animation engine, an example skit and guides" },
			{ label: "Works with", value: "Claude Code and Codex (not included)" },
			{ label: "Requirements", value: "Node 20+, Python 3.10+, ffmpeg and Playwright Chromium" },
			{ label: "Systems", value: "Windows 10/11, macOS 12+ and Linux" },
			{ label: "Output", value: "H.264 MP4 (30 fps by default) in 9:16, 1:1, 4:5 or 16:9, with .srt and a cover" },
			{ label: "License", value: "1 creator: commercial use of your videos, your own or for clients; free 1.x updates" },
		],
		faq: [
			{ q: "Can it turn a photo of me into a stick figure?", a: "No. The characters are generic stick figures drawn by code: you choose their hat, colors and moves, but they don't look like a real person. The only image you can give it is your logo, to take the color palette from it." },
			{ q: "Do I need to know how to code?", a: "Not to get started. You describe the idea to your agent and it writes and tweaks the skit's code. To install it you do run a few commands in the terminal." },
			{ q: "Do I need to record my voice?", a: "No. By default the skit is silent: the captions tell the story and the music sets the rhythm. If you want a narrator, you can use a local voice, or ElevenLabs or Fish Audio with your own account." },
			{ q: "Which languages does it work in?", a: "The skill writes the lines and captions in the language you ask for; its guides are in English and Spanish. The included example skit is in Spanish." },
			{ q: "Do I need Motion 3D Video?", a: "No. SpecReel Stick has its own engine and works on its own. Motion 3D Video (the SpecReel skill) is a different product, for 3D explainer videos about products, processes or data." },
			{ q: "Can I use the videos commercially?", a: "The videos you make are yours and you can publish them on your brand and your channels, even monetized. If you add a voice, check its license: some local models do not allow commercial use, and the Doctor warns you." },
		],
		tags: ["stick figure animation", "stick figure animation AI", "stick figure AI video generator", "stick figure animation for YouTube", "animated habit reels", "silent videos with captions", "animated skits for TikTok"],
		image_alts: [
			"SpecReel Stick: three real frames of a stick-figure skit in vertical 9:16 format",
			"How SpecReel Stick works: you approve the script and stills, and get the MP4 of a 4-line skit",
			"Annotated real frame: counter, payoff number, hero with a hat, steps, emotes and captions",
		],
	},

	"pagespeed-forensics": {
		title: "PageSpeed Forensics: Claude Code skill to improve mobile PageSpeed",
		tagline: "Find out, with evidence, why your site scores 85 on mobile PageSpeed and 100 on your PC, and test fixes without rebuilding.",
		summary:
			"Claude Code skill with 11 Node.js scripts that find, with evidence, why your site is stuck around 85–90 on mobile PageSpeed and test fixes without rebuilding.",
		meta_title: "Improve PageSpeed Insights mobile score with Claude Code",
		meta_description:
			"Claude Code skill that shows with evidence why your site is stuck at 85–90 on mobile PageSpeed and tests fixes without rebuilding. Pay what you want.",
		description: `## What it is

PageSpeed Forensics is a skill for Claude Code (and any agent that reads SKILL.md) for the last mile of the mobile score in PageSpeed Insights and Lighthouse. It ships a step-by-step method, 6 technical guides and 11 Node.js scripts with no dependencies, except sharp (optional) for the visual comparison.

## The problem it solves

The usual advice (compress images, defer JavaScript, preload the LCP image) tends to leave a page around 85. The missing mobile points hide where those checklists never look: how the HTML crosses the network, when Chrome produces the first frame and how Lighthouse's simulator turns a run into a score.

If Lighthouse says 100 on your PC and PageSpeed says 85, if first paint comes 1–2 s late with nothing blocking it, or if almost all of your TBT comes from the tag manager, this skill finds the cause and proves it with evidence.

## How it works in 3 steps

- Read the real report: psi-report saves from pagespeed.web.dev the scores, metrics, audits with their tables, the test environment, the final screenshot and the filmstrip, with no API key.
- Reproduce PageSpeed on your computer: a local proxy adds latency and server time, and delivers the HTML in TCP slow-start flights. You run Lighthouse 3–5 times per variant and compare medians of simulated and observed metrics.
- Test and verify: the proxy applies fixes without rebuilding (inline CSS, no font or image preloads, content-visibility or your own CSS). Before moving anything into your code, you compare grayscale, blurred screenshots and check anchors, fixed elements and page height.

## What you get

- SKILL.md: the 6-step method, a symptom → cause table and a report template (finding, evidence, cause, fix, risk, how to revert and whether it needs the owner's decision)
- 6 guides: first-frame freeze, first TCP flight (initcwnd), render-path fixes and their traps, Lighthouse and PageSpeed quirks, third-party tags and verification
- 11 scripts: flight-proxy, burst-timing, lh-runs, lh-summary, trace-milestones, main-thread-per-second, trace-first-frame, psi-report, screens, visual-diff and section-heights
- README in Spanish and English, and a license file

## Who it is for

- Developers and agencies whose sites are stuck around 85–90 on mobile after applying the usual advice
- Teams with Next.js or React landing pages (the guides include Next.js-specific notes)
- Anyone who needs to explain with data why PageSpeed and their own computer don't give the same score

## Requirements

- Node.js 22 or later
- Google Chrome or Chromium (or the CHROME_PATH variable)
- Internet access for Lighthouse (it runs with npx, no install) and to read PageSpeed
- sharp, only for the visual comparison (npm i -D sharp)
- A production build of your site served over HTTP on your computer, for the lab
- Claude Code or another agent that reads SKILL.md (or run the scripts by hand)

## Important notes

- It does not guarantee a score: it finds causes and measures each change with medians. The result depends on your site and on what you decide to change.
- Some fixes are business decisions (deferring analytics, changing the server or adding a CDN): the skill shows you the cost and the decision is yours.
- CrUX field data takes 28 days to reflect a change.
- The skill, the guides and the script output are in English; the README is in Spanish and English.
- psi-report reads the PageSpeed web page: if Google changes its design, that script may stop working.
- Raising the server's initial TCP window requires admin access to a Linux server, or a CDN.
- Independent product, not affiliated with Google. PageSpeed Insights, Lighthouse and Chrome are trademarks of Google.`,
		highlights: [
			"A lab network that mimics PageSpeed: latency, server time and HTML in TCP slow-start flights",
			"Detects the first-frame freeze: frameless gaps before first paint, marked FROZEN in the trace",
			"Measures your server's first TCP flight (initcwnd) on cold and warm connections, and tells you whether your <head> fits",
			"Tests fixes without rebuilding: inline CSS, no font or image preloads, content-visibility or your own CSS",
			"Medians of 3–5 Lighthouse runs with simulated and observed metrics, the LCP element and its parts",
			"Visual check in grayscale with blur, plus checks for anchors, fixed elements and page height",
		],
		specs: [
			{ label: "Format", value: "ZIP with the skill (SKILL.md), 11 Node.js scripts, 6 technical guides, README and license" },
			{ label: "Works with", value: "Claude Code or another agent that reads SKILL.md; the scripts also run on their own in the terminal" },
			{ label: "Requirements", value: "Node.js 22+, Google Chrome or Chromium and internet; sharp only for the visual comparison" },
			{ label: "Systems", value: "Windows, macOS and Linux (Chrome paths covered for all three)" },
			{ label: "Output", value: "Lighthouse and PageSpeed JSON, traces, PNG screenshots and terminal summaries" },
			{ label: "Language", value: "README in Spanish and English; skill, guides and script output in English" },
			{ label: "License", value: "MIT (LICENSE file included)" },
		],
		faq: [
			{ q: "Do I need a Google PageSpeed API key?", a: "No. The psi-report script opens pagespeed.web.dev in headless Chrome and saves the scores, metrics, audits, test environment and filmstrip. Because it reads the web page, that script may stop working if Google changes its design." },
			{ q: "Does it guarantee a 100 on PageSpeed?", a: "No. It finds the causes and measures each change with the median of several runs. The result depends on your site and on what you decide to change; some fixes (deferring analytics, touching the server or adding a CDN) are your decisions, and CrUX field data takes 28 days to move." },
			{ q: "Is it only for Next.js?", a: "No. The scripts work with any site that serves HTML: the lab needs a production build served over HTTP on your computer, and the network measurement needs a site on HTTPS. The guides include notes specific to Next.js only; for other stacks the advice is general." },
			{ q: "Do I need Claude Code?", a: "It is built as a skill for Claude Code and for any agent that reads SKILL.md. The 11 scripts can also be run by hand with Node.js from the terminal, following the README." },
			{ q: "Is it in English?", a: "Yes. The skill, the 6 guides and the script output are in English, and the README is in English and Spanish." },
			{ q: "How much does it cost?", a: "You choose: it is pay what you want. Enter 0 to download it for free, or support the project with any amount; card payments start at $0.50 USD." },
		],
		tags: ["PageSpeed Insights mobile score low", "improve PageSpeed Insights", "Core Web Vitals", "Lighthouse mobile performance score", "Claude Code skills", "slow LCP on mobile", "PageSpeed Insights without API key"],
		image_alts: [
			"PageSpeed Forensics: trace showing 2067 ms with no frames before first paint, marked FROZEN",
			"PageSpeed Forensics 6-step method with its scripts and the report template",
			"burst-timing: the <head> does not fit in the first TCP flight, and the proxy's 6 modes to test fixes",
		],
	},

	cutpilot: {
		title: "Edit Pro for YouTube: edit Spanish talking videos with Claude Code",
		tagline: "Drop your recording in a folder and get the video back clean, captioned, with graphics and checked by automatic QA. For videos in Spanish.",
		summary:
			"Local studio for talking videos in Spanish: it removes filler words and silences from the transcript, adds captions and graphics planned by Claude, and exports 16:9, 9:16 and 1:1.",
		meta_title: "Edit Pro for YouTube: Claude Code video editing (Spanish)",
		meta_description:
			"Edit Pro for YouTube: edit Spanish-language talking videos on your PC with Claude Code. Removes filler words and silences, adds captions and exports 9:16.",
		description: `Edit Pro for YouTube is an automatic editor for talking videos that runs on your computer. You give it a talking video in Spanish and it gives you back the clean video, with captions, animated graphics and leveled sound, in landscape, vertical or square.

Language: it only works with videos spoken in Spanish. Transcription is fixed to Spanish and filler-word detection is designed for Spanish. The documentation and the Chrome panel are in Spanish too.

It works for YouTube (16:9, with chapters) and, with the same video in 9:16, for Shorts, Reels and TikTok. Inside it is called CutPilot: that is the name you will see in the ZIP, the README and the install guide.

## The problem it solves

Editing a to-camera video eats up time on repetitive tasks: finding the "um"s and the silences, cutting the sentences you repeated, adding captions, leveling the audio and making a vertical version. This studio does that work from the word-by-word transcript, so you only review.

## How it works, in 3 steps

- Copy your recording into the entrada/ folder or drag it onto the Chrome panel.
- The studio cleans the audio, transcribes, removes filler words, silences and retakes, and Claude proposes the graphics, saying which word each one goes on.
- Review the contact sheet if you want to approve before rendering, and get the final video with its quality report.

## What you get

- The editar.py orchestrator and the pipeline modules: noise reduction, transcription, cleanup, visual plan, face detection, rendering, mixing and QA.
- The Remotion project with word-by-word captions, data cards, lists, chapter titles, zooms, intro and outro.
- A skill and a reviewer subagent for Claude Code, plus a hook that protects your original videos.
- The Chrome extension with its local server: job queue, brand kit, settings and diagnostics.
- 55 CC0 sound effects (Kenney), 28 OFL-licensed fonts and tools to render offline and to import music you already downloaded (for example, from the YouTube Audio Library).
- An installer that downloads the models and DeepFilterNet from their official sources, with SHA-256 verification.
- Automated tests and a config.yaml file with every parameter commented.

## Who it is for

Creators, teachers, coaches and marketing teams who record talking videos in Spanish and use Claude Code, and who prefer processing on their own computer instead of paying per-minute credits.

## Requirements

- uv (it installs Python 3.12), Node.js LTS and ffmpeg 7 or newer.
- DeepFilterNet for noise reduction (optional: the installer downloads it; without it, ffmpeg's filter is used, with lower quality).
- Claude Code for the AI decisions (optional).
- An NVIDIA GPU is recommended; without one, Whisper runs on the CPU.
- About 20 GB free: the Whisper model downloads the first time (about 1.6 GB).

## Honest limitations

- Tested only on Windows 10/11. macOS and Linux are not verified, and the Chrome extension registers itself automatically only on Windows.
- It edits the video you give it and delivers it in three formats: it does not cut several reels from one long recording, and it does not write titles or descriptions.
- Videos in Spanish only.
- Installation uses the terminal, and the extension loads in Chrome's developer mode.
- Rendering takes time: the measured estimate is 35 to 45 minutes per format for 10 minutes of raw footage.
- Whisper can mishear words in very short clips and an intentional repetition may get cut: check the .srt and the cut list in the report.
- Remotion has its own license; companies with more than 3 employees need the company license. Other dependencies installed separately have their own licenses (details in THIRD_PARTY_NOTICES.md).
- For music and brand logos, use only licensed material: the studio records the source and license of each asset, but you are responsible for how you use them.`,
		highlights: [
			"Removes filler words, silences, repetitions and retakes by reading the transcript word by word (Whisper + VAD)",
			"Claude plans the graphics: brand logos, figures, step lists, chapter titles and zooms",
			"Renders 16:9, 9:16 and 1:1 with Remotion, with face detection so graphics don't cover the face and the vertical stays centered",
			"Automatic QA: -14 LUFS, audio drift and overlaps, with a contact sheet and a report for each video",
			"Exports .srt, .vtt, CMX3600 EDL for Premiere or Resolve, and YouTube chapters",
			"Chrome side panel with job queue, brand kit and settings, all on your computer",
		],
		specs: [
			{ label: "Version", value: "2.3 (Python + Remotion)" },
			{ label: "Format", value: "ZIP with the code (Python + Remotion), a Claude Code skill and subagent, Chrome extension, 55 CC0 effects, OFL fonts and tests" },
			{ label: "Works with", value: "Claude Code (optional: without it, it uses a non-AI plan)" },
			{ label: "Tested on", value: "Windows 10/11 with a 4 GB NVIDIA GPU; macOS and Linux not verified" },
			{ label: "Requirements", value: "uv (Python 3.12), Node.js LTS, ffmpeg 7+ and ~20 GB free. NVIDIA GPU, DeepFilterNet and Claude Code optional" },
			{ label: "Video language", value: "Spanish only" },
			{ label: "Output", value: "MP4 in 16:9, 9:16 or 1:1, .srt, .vtt, .edl, chapters and report" },
			{ label: "License", value: "1 creator: commercial use of your videos, your own or for clients; no reselling the software" },
		],
		faq: [
			{ q: "Does it work for videos in English?", a: "No. Transcription is fixed to Spanish and filler-word detection is designed for Spanish." },
			{ q: "Do I need a Remotion license?", a: "That depends on you. Remotion has its own license: it is free for individuals, companies with up to 3 employees and non-profits; if your company is larger, you need Remotion's company license. Remotion is not inside the ZIP: it installs with npm from its official source." },
			{ q: "Do I need a graphics card?", a: "It is not required: without an NVIDIA GPU, Whisper transcribes on the CPU, more slowly. The studio was measured on a 4 GB GTX 1650: a 49.5 s raw clip took about 40 s to transcribe and about 110 s to render in 16:9. For 10 minutes of raw footage the estimate is 35 to 45 minutes per format." },
			{ q: "Is there a cost per video?", a: "The studio does not charge per minute. The AI decisions use Claude Code on your computer and use your plan; each report notes the estimated cost, and answers are cached so you don't pay twice. Without Claude Code, the studio uses an automatic plan without AI." },
			{ q: "Does it work on Mac or Linux?", a: "It was developed and tested on Windows. It includes an installer for macOS and Linux, but those platforms are not verified, and automatic registration of the Chrome extension exists only for Windows." },
			{ q: "Does it make several reels from a long video?", a: "No. It edits the video you give it (removes filler words, silences and retakes, adds captions and graphics) and delivers it in 16:9, 9:16 and 1:1. It does not write titles or descriptions either; it does generate the YouTube chapters." },
			{ q: "Does it work for Shorts, Reels and TikTok?", a: "Yes, in format: it delivers the same video in 16:9, 9:16 and 1:1, and centers the face in the vertical version. It does not cut several clips from a long recording or publish for you: you upload the MP4 to each platform." },
			{ q: "Why does the ZIP say CutPilot?", a: "Edit Pro for YouTube is the store name; inside, the studio is called CutPilot. You will see that name in the ZIP, the README and the install guide. It is the same product." },
		],
		tags: ["Claude Code video editing", "remove filler words from video", "remove silence from video", "YouTube video editor AI", "Spanish video editing", "automatic Spanish subtitles", "Claude Code Remotion"],
		image_alts: [
			"Edit Pro for YouTube: transcript with filler words and retakes struck through, a timeline with cuts and the video in 16:9, 1:1 and 9:16",
			"How Edit Pro for YouTube works: copy the video, it gets cleaned and transcribed, Claude proposes graphics, and it renders with -14 LUFS QA",
			"Edit Pro for YouTube delivers the same video in 16:9, 1:1 and 9:16, plus .srt, .vtt, EDL, chapters, contact sheet and QA report",
		],
	},

	"motor-creativo-claude-code": {
		title: "Creative Factory: 13 Claude Code agents for design, video and PDF",
		tagline: "Ask in Spanish for the piece you need and a Claude Code agent produces it with open-source apps on your PC.",
		summary:
			"Kit of 13 Claude Code subagents, in Spanish, that produce design, video, audio, PDF and office files with open-source desktop apps via MCP. Windows only.",
		meta_title: "Creative Factory: Claude Code agents for graphic design",
		meta_description:
			"Creative Factory: 13 Claude Code subagents that run open-source design, video, audio, PDF and office apps via MCP. Agents and docs in Spanish. Windows only.",
		description: `Creative Factory is a kit for Claude Code that works like a creative studio in Spanish. You ask for a piece in plain language and a specialized agent produces it with an open-source desktop app, through that app's official MCP server.

Inside it is called "Motor creativo para Claude Code": that is the name you will see in the ZIP, the README and the documentation.

Language: the agents, skills, panel and documentation are in Spanish. The intent router understands requests in Spanish and English.

It is not a design program of its own: it orchestrates 13 open-source apps by storytold published on GitHub (PhotoCraft, LightCraft, VectorCraft, FilmCraft, EffectCraft, DesignCraft, PdfCraft, FigCraft, SoundCraft, DeckCraft, WordCraft, GridCraft and CADCraft) for image, photo, vector, video, animation, layout, PDF, interface, audio, presentations, documents, spreadsheets and CAD.

## The problem it solves

Connecting Claude Code to a dozen creative apps usually ends with every MCP server loaded at once, hundreds of tools taking up context and agents that don't know which app to use. Here each app has its own subagent, and its MCP connects only while that agent is working. The main session only decides whom to delegate to.

## How it works in 3 steps

- You ask: you write the request in the Claude Code terminal or in the local panel and attach your file.
- The router decides: it classifies the request (for example, VECTOR or SLIDES), picks the agent and its skill, and if the task combines apps it chains them in series.
- The agent produces and reviews: it works on a copy, exports to output/<project>/ and looks at the result before delivering it. At the end, the reviewer agent and the revisar and empaquetar commands put the delivery together.

## What you get

- 13 app subagents and 1 read-only reviewer agent (qa-agent).
- 14 per-app workflow skills, including mixed to chain apps, plus the kit-de-marca and entrega skills.
- The artcraft.py CLI with doctor, route, marcas, revisar, empaquetar, sync, probe, smoke, actualizaciones, actualizar and volver.
- An intent router in Spanish and English, with its suite of test cases.
- Claude Code hooks: context at session start, a daily notice of new versions and protection of originals and binaries.
- A local web panel to use the 13 apps without typing commands.
- A brand registry (marcas.json) with a template to add each client: logos, palette, fonts and rules the agents follow.
- Per-app MCP profiles to open a Claude Code session dedicated to a single app.
- Architecture docs, a master index and a tool registry with each app's formats and limits.

## Who it is for

- Designers, community managers and small agencies who already use Claude Code, work in Spanish and produce pieces for several clients.
- Anyone who wants to try open-source desktop apps for image, video and office work, operated by agents.
- Teams that need the AI not to make up data: the agents leave visible placeholders such as [precio] when information is missing.

## Requirements

- Windows x64 (developed on Windows 11).
- Claude Code installed and signed in; each request uses your plan.
- Python 3.10 or later and Git.
- The 13 storytold apps, downloaded free from their official GitHub releases (not included in the package).
- ffmpeg and Google Chrome for some features. python artcraft.py doctor tells you what is missing.

## Honest limitations

- Windows only: the apps install as portable binaries for Windows x64.
- The apps are third-party and at 0.x versions. FilmCraft does not transcribe or cut silences automatically, CADCraft opens about 30% of AutoCAD formats, FigCraft imports .fig on a best-effort basis and SoundCraft exports only WAV, AIFF or FLAC.
- It does not replace your judgment: review each piece before delivering it to a client.
- App versions, formats and limits may change with each release from their authors.
- The agents, skills and documentation are written in Spanish.
- This kit is not affiliated with storytold or Anthropic. The app names and Claude are trademarks of their owners; they are named only to indicate compatibility.`,
		highlights: [
			"13 Claude Code subagents (image, photo, vector, video, animation, layout, PDF, interface, audio, presentations, documents, spreadsheets and CAD), each with its skill and its app's official MCP, which connects only while it works.",
			"Intent router in Spanish and English: `python artcraft.py route \"<request>\"` returns category, agents and skills, and chains several apps in mixed tasks (e.g. vector → animation).",
			"Local web panel (127.0.0.1) to ask in plain language, attach a file and download the result, with up to 4 parallel requests and history per app.",
			"Installer/updater for the apps from their official GitHub releases with double SHA256 verification, an MCP test before registering and rollback with `volver`.",
			"Read-only reviewer agent and `revisar` and `empaquetar` commands: measurements, unfilled placeholders and a delivery ZIP with an index.",
			"Claude Code hooks that prevent overwriting your clients' original files and the binaries, and tell you once a day if there are new app versions.",
		],
		specs: [
			{ label: "Format", value: "Project folder (ZIP) with a Python CLI, Claude Code agents, skills and hooks, and a local web panel" },
			{ label: "Works with", value: "Claude Code + 13 open-source apps by storytold (MIT or Apache-2.0), downloaded free from their official releases with SHA256 verification" },
			{ label: "Requirements", value: "Windows 10/11 x64, Python 3.10+ and Git; Claude Code signed in (uses your plan). ffmpeg and Chrome/Edge optional" },
			{ label: "Systems", value: "Windows 10/11 x64 only (the installer uses the portable Windows versions)" },
			{ label: "Output", value: "Files in output/<project>/: PSD, PNG, SVG, PDF, MP4, PPTX, DOCX, XLSX, CSV, DXF/DWG, WAV/FLAC, depending on the app" },
			{ label: "Language", value: "Spanish (agents, skills, panel and documentation); the intent router understands Spanish and English" },
			{ label: "Includes", value: "CLI and router, 13 agents + QA reviewer, skills, hooks, the «Studio Motor» local panel, install guide, license and third-party notices. The apps (~1 GB) download separately" },
			{ label: "License", value: "1 creator: personal and commercial use of what you produce; no reselling Creative Factory" },
		],
		faq: [
			{ q: "Is it in English?", a: "No. The agents, skills, panel and documentation are written in Spanish. The intent router understands requests in English, but everything in the kit is in Spanish." },
			{ q: "Does it include the 13 apps?", a: "No. They are third-party open-source apps (storytold, on GitHub) and download separately from their official releases. Creative Factory registers them, checks the SHA256 of each download, tests its MCP server and tells you when new versions are out." },
			{ q: "Does it work on Mac or Linux?", a: "Not in this version. The installer and the app registry use the portable Windows x64 binaries. The router and the CLI are Python, but the apps are set up for Windows only." },
			{ q: "Do I need an API key?", a: "No. It uses your own Claude Code session; the panel launches Claude Code without a window. Each request uses your Claude plan: in the author's tests, a simple query took about 30 seconds and long ones between 1 and 4 minutes." },
			{ q: "Are my files processed on my PC?", a: "The apps and the panel run on your machine (the panel only listens on 127.0.0.1) and your originals are copied before they are touched. But Claude Code sends Anthropic what the agent reads in order to reason, like any use of Claude Code." },
			{ q: "How mature are the apps?", a: "They are 0.x versions. Their own docs say so: FilmCraft is young and does not transcribe or cut silences automatically, CADCraft opens about 30% of AutoCAD formats and FigCraft imports .fig on a best-effort basis. Each agent warns you about what its app can't do." },
			{ q: "Does Creative Factory connect to the internet?", a: "To install or update the apps it downloads them from their official GitHub releases, and once a day it checks the GitHub API to tell you about new versions. What you ask in Claude Code is processed by Claude with your account, like any Claude Code session." },
			{ q: "Does it work with Antigravity or other agents?", a: "Yes, with limits. The package includes ANTIGRAVITY.md, a guide for Google Antigravity, and AGENTS.md for Codex, OpenCode and Cursor. Without Claude Code there are no hooks or subagents: the apps are operated with the included MCP client (python artcraft-workspace/router/mcp_client.py). The local panel uses Claude Code." },
			{ q: "Why does the ZIP say «Motor creativo para Claude Code»?", a: "Creative Factory is the store name; inside, the kit is called «Motor creativo para Claude Code». You will see that name in the ZIP, the README and the documentation. It is the same product." },
		],
		tags: ["Claude Code agents", "Claude Code subagents", "Claude Code MCP servers", "Claude Code for designers", "Claude Code skills", "AI graphic design automation", "open-source design apps with AI"],
		image_alts: [
			"Creative Factory: 13 Claude Code agents in Spanish and the router choosing animation and presentations",
			"Real router output: a request in Spanish is assigned to its category, agent and skill",
			"Illustration of the local panel for requesting pieces, with the reviewer agent's verdict before delivery",
		],
	},
};
