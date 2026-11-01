// Scene s01 — STICK-FIGURE SKIT (recipe): two characters, one comparison, a counter and a payoff number.
// See references/12-stick-figures.md: cel-shaded figures with hats on a reflective floor,
// speech/thought bubbles, emotes and tags drawn on top. Works silent (tools/beats.py) or with a voice.
// Re-use: edit SKIT (texts, colours, numbers) and the beats in create(); every time is anchored to a sentence or word.
import { createStage, props } from '../engine/stick.js';
import { mix, rgba } from '../engine/palette.js';
import { FONT } from '../engine/hud.js';
import { clamp, seg, sstep, E, lerp } from '../engine/timeline.js';

// EDIT ME — «Uno ahorra, otro gasta» (5 dólares al día × 365 = 1825)
const SKIT = {
  sentences: ['s1', 's2', 's3', 's4'],
  heroHat: { type: 'cap' },
  heroTag: '+$5 / DÍA',
  otherTag: 'ANTOJOS',
  otherSays: '¡Solo *uno* más!',
  boxes: 6,
  counter: { label: 'AHORRADO', from: 0, to: 1825, prefix: '$' },
  payoff: { word: '1825', big: '$1825', formula: '5 × 365 días' },
};

export async function create(ctx) {
  const { P, W, H, w, N } = ctx;
  const [s1, s2, s3, s4] = SKIT.sentences.map((id) => N.s(id));
  const K = Math.min(W, H) / 960;
  const st = createStage(ctx, { view: { cx: -0.3, cy: 1.3, w: 5.6, elev: 6 }, reflect: 0.26, far: -4.5 });

  // set: a stack of savings boxes (left) that grows one box per chunk; a shop counter (right)
  const B = 0.5, stackX = -1.55;
  const boxes = Array.from({ length: SKIT.boxes }, (_, i) => {
    const m = props.box(P, B, B * 0.9, B, i % 2 ? mix(P.accent, P.bg0, 0.25) : P.accent);
    m.position.set(stackX + (i % 2) * 0.06 - 0.03, (B * 0.9 + 0.01) * i, 0.1); st.add(m); return m;
  });
  const counterTop = props.box(P, 1.1, 0.95, 0.6, mix(P.ink, P.bg0, 0.62)); counterTop.position.set(2.55, 0, -0.5); st.add(counterTop);

  const hero = st.figure({ x: -4.2, z: 0.35, hat: SKIT.heroHat, face: 'right', seed: 5 });
  const other = st.figure({ x: 1.35, z: 0.1, hat: false, color: mix(P.ink, P.bg0, 0.42), face: 'right', seed: 13 });
  other.hold('A', props.phone(P));

  // s1 — hero walks in next to the stack spot; the other one is already at the counter
  hero.walk(s1.start - 0.2, s1.start + 1.7, -2.35).face(s1.start + 1.8, 'front', 0.4).pose(s1.start + 1.8, 'idle', 0.3);
  other.pose(s1.start, 'sitPhone', 0.01).pose(s1.start + 0.05, { shA: 34, elA: 112, shB: 30, elB: 110, head: 24, neck: 16, lean: 10 }, 0.3);

  // s2 — one box lands on the stack per chunk; the hero reaches to drop it
  const d0 = s2.start + 0.3, gap = (s2.end - 0.4 - d0) / (SKIT.boxes - 1);
  const drops = boxes.map((_, i) => d0 + i * gap);
  hero.face(d0 - 0.4, 'right', 0.3);
  drops.forEach((t) => hero.gesture(t - 0.25, t + 0.25, 'reach', { fade: 0.15 }));
  hero.tag(s2.start + 0.2, s3.end, SKIT.heroTag, { color: P.ink });

  // s3 — the other one buys one treat after another
  other.face(s3.start - 0.2, 'right', 0.3).gesture(s3.start, s3.end, 'point', { fade: 0.2 });
  other.say(s3.start + 0.1, s3.end + 0.15, SKIT.otherSays).tag(s3.start, s4.start + 0.6, SKIT.otherTag);
  [0.0, 0.7, 1.4].forEach((dt) => other.emote(s3.start + 0.2 + dt, 'heart', 0.8));

  // s4 — payoff: the hero celebrates by the full stack, the other one checks an empty wallet
  const pay = w(SKIT.payoff.word).s;
  hero.face(pay - 0.4, 'front', 0.3).pose(pay - 0.1, 'celebrate', 0.3).emote(pay, 'spark', 1.6);
  other.face(s4.start + 0.2, 'front', 0.4).pose(s4.start + 0.3, 'shrug', 0.4).emote(s4.start + 0.55, 'sweat', 1.4);

  st.view(s2.start + 0.1, { cx: -1.0, cy: 1.75, w: 5.2, elev: 5 }, s2.end - s2.start, 'inOut');
  st.view(s3.start - 0.1, { cx: 1.4, cy: 1.35, w: 4.6 }, 0.9, 'inOut');
  st.view(s4.start - 0.2, { cx: -0.7, cy: 1.75, w: 5.6 }, 1.6, 'inOut');

  const lastDrop = drops[drops.length - 1];
  const counterAt = (t) => Math.round(lerp(SKIT.counter.from, SKIT.counter.to, clamp((t - d0 + 0.2) / (lastDrop - d0 + 0.2))));

  return {
    scene: st.scene, camera: st.camera,
    update(t) {
      boxes.forEach((m, i) => { const k = E.outBack(seg(t, drops[i] - 0.18, drops[i] + 0.12)); m.scale.set(1, Math.max(0.001, k), 1); m.visible = k > 0.01; });
      st.update(t);
      return {};
    },
    hud(g, t, h) {
      const a = h.alpha ?? 1;
      st.hud(g, t, h);
      const kC = sstep(s2.start - 0.1, s2.start + 0.3, t);
      if (kC > 0) {
        const n = counterAt(t), x = 0.075 * W, y = 0.1 * H;
        g.save(); g.globalAlpha = a * kC; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.font = FONT.mono(22 * K, 600); g.letterSpacing = `${5 * K}px`; g.fillStyle = rgba(P.ink2 || P.ink, 0.8);
        g.fillText(SKIT.counter.label, x, y);
        g.letterSpacing = '0px'; g.font = FONT.cap(88 * K, 800); g.fillStyle = rgba(P.accent, 1);
        g.fillText(SKIT.counter.prefix + String(n), x - 4 * K, y + 92 * K);
        g.restore();
      }
      const kP = seg(t, pay - 0.08, pay + 0.42);
      if (kP > 0) {
        const pop = E.outBack(kP), cx = 0.5 * W, cy = 0.36 * H;
        g.save(); g.globalAlpha = a * clamp(kP * 3); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.translate(cx, cy); g.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
        g.font = FONT.cap(150 * K, 800); g.fillStyle = rgba(P.ink, 1); g.fillText(SKIT.payoff.big, 0, 0);
        g.restore();
        const kF = E.out(seg(t, pay + 0.35, pay + 0.9));
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
