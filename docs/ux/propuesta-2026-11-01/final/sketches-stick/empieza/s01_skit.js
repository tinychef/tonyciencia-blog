// Scene s01 — STICK-FIGURE SKIT (recipe): two characters, one comparison, a counter and a payoff number.
// See references/12-stick-figures.md: cel-shaded figures with hats on a reflective floor,
// speech/thought bubbles, emotes and tags drawn on top. Works silent (tools/beats.py) or with a voice.
// Re-use: edit SKIT (texts, colours, numbers) and the beats in create(); every time is anchored to a sentence or word.
import { createStage, props } from '../engine/stick.js';
import { mix, rgba } from '../engine/palette.js';
import { FONT } from '../engine/hud.js';
import { clamp, seg, sstep, E, lerp } from '../engine/timeline.js';

// EDIT ME — «El que empieza vs. el que espera» (1 intento por semana × 52 semanas)
const SKIT = {
  sentences: ['s1', 's2', 's3', 's4'],
  heroHat: { type: 'beanie' },
  heroTag: '1 INTENTO / SEMANA',
  otherTag: 'CUANDO ESTÉ LISTO',
  hurdles: [-0.9, 0.9, 2.7],
  counter: { label: 'SEMANA', from: 1, to: 52 },
  payoff: { word: '52', big: '52', formula: 'intentos · el otro: 0' },
};

export async function create(ctx) {
  const { P, W, H, w, N } = ctx;
  const [s1, s2, s3, s4] = SKIT.sentences.map((id) => N.s(id));
  const K = Math.min(W, H) / 960;
  const st = createStage(ctx, { view: { cx: -2.4, cy: 1.2, w: 4.6, elev: 6 }, reflect: 0.2, far: -4.5 });

  // set: a start line (thin slab) and three hurdles along the track
  const hurdles = SKIT.hurdles.map((x) => { const m = props.box(P, 0.16, 0.42, 0.9); m.position.set(x, 0, 0.2); st.add(m); return m; });
  const flag = props.box(P, 0.05, 1.5, 0.05, P.ink); flag.position.set(4.3, 0, 0.2); st.add(flag);
  const cloth = props.box(P, 0.5, 0.32, 0.03); cloth.position.set(4.55, 1.18, 0.2); st.add(cloth);

  const hero = st.figure({ x: -2.9, z: 0.35, hat: SKIT.heroHat, face: 'front', seed: 7 });
  const other = st.figure({ x: -3.55, z: -0.45, hat: false, color: mix(P.ink, P.bg0, 0.45), face: 'front', seed: 17, pose: 'think' });

  // s1 — both at the start line, both with the same idea
  hero.pose(s1.start, 'idle', 0.3).emote(s1.start + 0.5, '!', 1.0);
  other.think(s1.start + 0.4, s1.end, '?');

  // s2 — the hero starts: run, hurdle, run, hurdle… (jump takes off 0.35 before each hurdle)
  const t0 = s2.start + 0.2, seg2 = (s2.end - 0.2 - t0);
  const legs = SKIT.hurdles.length;
  const per = seg2 / (legs + 0.6);
  let x = -2.9, t = t0;
  hero.face(t0 - 0.3, 'right', 0.25);
  SKIT.hurdles.forEach((hx) => {
    hero.run(t, t + per - 0.5, hx - 0.55);
    hero.jump(t + per - 0.48, { to: hx + 0.55, h: 0.55, dur: 0.46 });
    t += per;
  });
  hero.run(t, t + per * 0.6, 3.9);
  hero.tag(s2.start + 0.2, s3.end, SKIT.heroTag, { color: P.ink });
  const arrive = t + per * 0.6;

  // s3 — the other one is still at the start line, waiting
  other.pose(s3.start, 'think', 0.3).think(s3.start + 0.1, s3.end + 0.2, 'bars').tag(s3.start, s4.start + 0.6, SKIT.otherTag);
  other.emote(s3.end + 0.1, 'dots', 0.9);

  // s4 — payoff
  const pay = w(SKIT.payoff.word).s;
  hero.face(pay - 0.4, 'front', 0.3).pose(pay - 0.1, 'celebrate', 0.3).emote(pay, 'spark', 1.6);
  other.face(s4.start + 0.3, 'right', 0.4).pose(s4.start + 0.3, 'shrug', 0.4).emote(s4.start + 0.55, '?', 1.4);

  // camera: follow the run, cut back to the waiting one, then wide on the whole track
  st.view(t0, { cx: 1.2, cy: 1.15, w: 5.4 }, arrive - t0, 'inOut');
  st.view(s3.start - 0.1, { cx: -3.0, cy: 1.2, w: 3.8 }, 0.8, 'inOut');
  st.view(s4.start - 0.2, { cx: 2.3, cy: 1.65, w: 5.4 }, 1.6, 'inOut');

  const counterAt = (tt) => Math.round(lerp(SKIT.counter.from, SKIT.counter.to, clamp((tt - t0) / (arrive - t0))));

  return {
    scene: st.scene, camera: st.camera,
    update(tt) { st.update(tt); return {}; },
    hud(g, tt, h) {
      const a = h.alpha ?? 1;
      st.hud(g, tt, h);
      const kC = sstep(s2.start - 0.1, s2.start + 0.3, tt);
      if (kC > 0) {
        const n = counterAt(tt), x0 = 0.075 * W, y = 0.1 * H;
        g.save(); g.globalAlpha = a * kC; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.font = FONT.mono(22 * K, 600); g.letterSpacing = `${5 * K}px`; g.fillStyle = rgba(P.ink2 || P.ink, 0.8);
        g.fillText(SKIT.counter.label, x0, y);
        g.letterSpacing = '0px'; g.font = FONT.cap(88 * K, 800); g.fillStyle = rgba(P.accent, 1);
        g.fillText(String(n), x0 - 4 * K, y + 92 * K);
        g.restore();
      }
      const kP = seg(tt, pay - 0.08, pay + 0.42);
      if (kP > 0) {
        const pop = E.outBack(kP), cx = 0.5 * W, cy = 0.36 * H;
        g.save(); g.globalAlpha = a * clamp(kP * 3); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.translate(cx, cy); g.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
        g.font = FONT.cap(150 * K, 800); g.fillStyle = rgba(P.ink, 1); g.fillText(SKIT.payoff.big, 0, 0);
        g.restore();
        const kF = E.out(seg(tt, pay + 0.35, pay + 0.9));
        if (kF > 0) {
          g.save(); g.globalAlpha = a * kF; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
          g.font = FONT.mono(34 * K, 500); g.fillStyle = rgba(P.ink2 || P.ink, 0.9);
          g.fillText(SKIT.payoff.formula, cx, cy + 62 * K + (1 - kF) * 10 * K);
          g.restore();
        }
      }
    },
  };
}
