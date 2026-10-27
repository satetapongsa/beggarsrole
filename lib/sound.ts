// Tiny Web Audio beeps. Off by default; no audio files.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.04, delay = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = "click" | "coin" | "good" | "bad" | "event" | "milestone" | "end";

export function playSfx(kind: Sfx) {
  switch (kind) {
    case "click":
      tone(520, 0.05);
      break;
    case "coin":
      tone(988, 0.06);
      tone(1319, 0.12, "square", 0.04, 0.06);
      break;
    case "good":
      tone(523, 0.08, "triangle", 0.06);
      tone(659, 0.08, "triangle", 0.06, 0.08);
      tone(784, 0.14, "triangle", 0.06, 0.16);
      break;
    case "bad":
      tone(220, 0.15, "sawtooth", 0.03);
      tone(165, 0.25, "sawtooth", 0.03, 0.12);
      break;
    case "event":
      tone(440, 0.07, "triangle", 0.05);
      tone(660, 0.1, "triangle", 0.05, 0.07);
      break;
    case "milestone":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.035, i * 0.09));
      break;
    case "end":
      [392, 330, 262].forEach((f, i) => tone(f, 0.35, "triangle", 0.05, i * 0.3));
      break;
  }
}

export function typeTick() {
  tone(1800 + Math.random() * 200, 0.012, "square", 0.012);
}
