/**
 * Deterministic lip-sync.
 *
 * `buildSpeech` turns a line of text into a fixed timeline of viseme cues. It is
 * a pure function of (text, speechRate) — no audio decoding, no randomness, no
 * clock — so parallel Remotion renders always agree on the mouth shape for a
 * given frame.
 *
 * If you have real audio, pass `audioSrc` to `TalkingHead` / `DialogueScene`:
 * the viseme *shapes* still come from the text, while the *openness* is
 * modulated by the audio amplitude via `useAudioData` + `visualizeAudio`.
 */

export type VisemeId =
  | 'rest'
  | 'AA'
  | 'EE'
  | 'IH'
  | 'OH'
  | 'OO'
  | 'MBP'
  | 'FV'
  | 'LTH'
  | 'SZ';

export interface VisemeCue {
  id: VisemeId;
  /** Seconds from the start of the line. */
  start: number;
  end: number;
  /** Target jaw openness, 0–1. Used when blending with audio amplitude. */
  open: number;
}

export interface Speech {
  cues: VisemeCue[];
  /** Total length in seconds, including the trailing pause. */
  duration: number;
  text: string;
}

export const VISEMES: { id: VisemeId; label: string; open: number }[] = [
  { id: 'rest', label: 'Rest', open: 0 },
  { id: 'AA', label: 'Ah', open: 1 },
  { id: 'EE', label: 'Ee', open: 0.55 },
  { id: 'IH', label: 'Ih', open: 0.4 },
  { id: 'OH', label: 'Oh', open: 0.8 },
  { id: 'OO', label: 'Oo', open: 0.45 },
  { id: 'MBP', label: 'M / B / P', open: 0 },
  { id: 'FV', label: 'F / V', open: 0.2 },
  { id: 'LTH', label: 'L / Th', open: 0.35 },
  { id: 'SZ', label: 'S / Sh', open: 0.25 },
];

const OPEN: Record<VisemeId, number> = VISEMES.reduce(
  (acc, v) => ({ ...acc, [v.id]: v.open }),
  {} as Record<VisemeId, number>,
);

/** Base seconds per timing unit at speechRate 1. */
const UNIT = 0.072;

interface Rule {
  match: string;
  id: VisemeId;
  /** Timing units. Vowels are long, stops are short. */
  units: number;
}

/**
 * Ordered longest-first: the tokenizer tries each rule at the current cursor
 * and takes the first hit. Digraphs come before single letters so "th" never
 * becomes "t" + "h".
 */
const RULES: Rule[] = [
  { match: 'tch', id: 'SZ', units: 0.8 },
  { match: 'sch', id: 'SZ', units: 0.9 },
  { match: 'ough', id: 'OH', units: 1.2 },
  { match: 'igh', id: 'EE', units: 1.2 },
  { match: 'th', id: 'LTH', units: 0.6 },
  { match: 'sh', id: 'SZ', units: 0.7 },
  { match: 'ch', id: 'SZ', units: 0.7 },
  { match: 'ph', id: 'FV', units: 0.6 },
  { match: 'wh', id: 'OO', units: 0.6 },
  { match: 'ck', id: 'IH', units: 0.5 },
  { match: 'ng', id: 'LTH', units: 0.6 },
  { match: 'qu', id: 'OO', units: 0.7 },
  { match: 'oo', id: 'OO', units: 1.1 },
  { match: 'ee', id: 'EE', units: 1.1 },
  { match: 'ea', id: 'EE', units: 1.1 },
  { match: 'ie', id: 'EE', units: 1 },
  { match: 'ei', id: 'EE', units: 1 },
  { match: 'ou', id: 'OH', units: 1.1 },
  { match: 'ow', id: 'OH', units: 1.1 },
  { match: 'oa', id: 'OH', units: 1.1 },
  { match: 'oe', id: 'OH', units: 1 },
  { match: 'au', id: 'OH', units: 1.1 },
  { match: 'aw', id: 'OH', units: 1.1 },
  { match: 'ai', id: 'EE', units: 1.1 },
  { match: 'ay', id: 'EE', units: 1.1 },
  { match: 'oi', id: 'OH', units: 1.1 },
  { match: 'oy', id: 'OH', units: 1.1 },
  { match: 'ew', id: 'OO', units: 1 },
  { match: 'ue', id: 'OO', units: 1 },
  { match: 'ui', id: 'OO', units: 1 },
  { match: 'a', id: 'AA', units: 1 },
  { match: 'e', id: 'IH', units: 0.95 },
  { match: 'i', id: 'IH', units: 0.95 },
  { match: 'o', id: 'OH', units: 1 },
  { match: 'u', id: 'OO', units: 1 },
  { match: 'y', id: 'EE', units: 0.8 },
  { match: 'm', id: 'MBP', units: 0.6 },
  { match: 'b', id: 'MBP', units: 0.5 },
  { match: 'p', id: 'MBP', units: 0.5 },
  { match: 'f', id: 'FV', units: 0.6 },
  { match: 'v', id: 'FV', units: 0.6 },
  { match: 'l', id: 'LTH', units: 0.55 },
  { match: 'n', id: 'LTH', units: 0.55 },
  { match: 'd', id: 'LTH', units: 0.5 },
  { match: 't', id: 'LTH', units: 0.5 },
  { match: 'r', id: 'LTH', units: 0.55 },
  { match: 's', id: 'SZ', units: 0.65 },
  { match: 'z', id: 'SZ', units: 0.65 },
  { match: 'j', id: 'SZ', units: 0.6 },
  { match: 'w', id: 'OO', units: 0.55 },
  { match: 'h', id: 'IH', units: 0.4 },
  { match: 'k', id: 'IH', units: 0.5 },
  { match: 'c', id: 'IH', units: 0.5 },
  { match: 'g', id: 'IH', units: 0.5 },
  { match: 'x', id: 'SZ', units: 0.7 },
  { match: 'q', id: 'IH', units: 0.5 },
];

const PAUSE: Record<string, number> = {
  ' ': 0.45,
  ',': 2.2,
  ';': 2.4,
  ':': 2.4,
  '.': 3.2,
  '!': 3.4,
  '?': 3.4,
  '…': 4,
  '—': 2.6,
  '-': 1.2,
  '\n': 3,
};

const clampRate = (r: number) => Math.min(2, Math.max(0.5, r || 1));

/**
 * A closed-mouth "mumble" so `motion: 'talk'` still reads as speech when no
 * dialogue has been typed yet. Seeded, looping, and completely deterministic.
 */
function mumble(seed: number): { id: VisemeId; units: number }[] {
  const pattern: VisemeId[] = ['AA', 'IH', 'MBP', 'OH', 'EE', 'SZ', 'OO', 'LTH'];
  const out: { id: VisemeId; units: number }[] = [];
  let s = Math.abs(Math.floor(seed)) % 97;
  for (let i = 0; i < 24; i += 1) {
    s = (s * 31 + 17) % 9973;
    const id = pattern[s % pattern.length];
    out.push({ id, units: 0.55 + ((s >> 3) % 5) * 0.14 });
    if (i % 6 === 5) out.push({ id: 'rest', units: 1.4 });
  }
  return out;
}

/** Build the full viseme timeline for a line of dialogue. */
export function buildSpeech(text: string, speechRate = 1, seed = 0): Speech {
  const rate = clampRate(speechRate);
  const unit = UNIT / rate;
  const cues: VisemeCue[] = [];
  let t = 0;

  const push = (id: VisemeId, units: number) => {
    const dur = units * unit;
    // Merge consecutive identical shapes so the mouth holds instead of jittering.
    const last = cues[cues.length - 1];
    if (last && last.id === id) {
      last.end = t + dur;
    } else {
      cues.push({ id, start: t, end: t + dur, open: OPEN[id] });
    }
    t += dur;
  };

  const clean = (text ?? '').trim();
  if (!clean) {
    for (const step of mumble(seed)) push(step.id, step.units);
    return { cues, duration: t, text: '' };
  }

  const lower = clean.toLowerCase();
  let i = 0;
  while (i < lower.length) {
    const ch = lower[i];
    const pause = PAUSE[ch];
    if (pause !== undefined) {
      push('rest', pause);
      i += 1;
      continue;
    }
    const rule = RULES.find((r) => lower.startsWith(r.match, i));
    if (rule) {
      push(rule.id, rule.units);
      i += rule.match.length;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      push('IH', 0.7);
      push('AA', 0.7);
      i += 1;
      continue;
    }
    // Apostrophes and any other punctuation are silent but not a full pause.
    if (ch === "'" || ch === '’') {
      i += 1;
      continue;
    }
    push('rest', 0.4);
    i += 1;
  }

  // Always land back on a closed mouth.
  push('rest', 1.6);
  return { cues, duration: t, text: clean };
}

/** The viseme active at time `t` (seconds). Clamps to the ends of the line. */
export function visemeAt(speech: Speech, t: number): VisemeCue {
  const { cues } = speech;
  if (!cues.length) return { id: 'rest', start: 0, end: 0, open: 0 };
  if (t <= 0) return cues[0];
  if (t >= speech.duration) return cues[cues.length - 1];
  // Binary search: cues are sorted and non-overlapping.
  let lo = 0;
  let hi = cues.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].end <= t) lo = mid + 1;
    else hi = mid;
  }
  return cues[lo];
}

/**
 * Smoothed openness across a cue boundary, so the jaw eases rather than snaps.
 * `audioLevel` (0–1) optionally scales the result for real-audio drives.
 */
export function mouthOpenness(
  speech: Speech,
  t: number,
  audioLevel?: number,
): number {
  const cue = visemeAt(speech, t);
  const span = Math.max(1e-6, cue.end - cue.start);
  const u = Math.min(1, Math.max(0, (t - cue.start) / span));
  // Rise fast, fall slower — reads as natural jaw motion.
  const envelope = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
  const prev = cuesBefore(speech, cue);
  const base = prev.open + (cue.open - prev.open) * Math.min(1, u * 2.4);
  const shaped = cue.open * 0.55 + base * 0.45;
  const value = shaped * (0.45 + 0.55 * envelope);
  const scaled =
    audioLevel === undefined
      ? value
      : value * (0.35 + 0.65 * Math.min(1, Math.max(0, audioLevel)));
  return Math.min(1, Math.max(0, scaled));
}

function cuesBefore(speech: Speech, cue: VisemeCue): VisemeCue {
  const idx = speech.cues.indexOf(cue);
  return idx > 0 ? speech.cues[idx - 1] : { id: 'rest', start: 0, end: 0, open: 0 };
}

/** Seconds of speech for a line — handy for sizing compositions. */
export function speechDuration(text: string, speechRate = 1, seed = 0): number {
  return buildSpeech(text, speechRate, seed).duration;
}

/** Frames of speech, rounded up, with a minimum so short lines still read. */
export function speechFrames(
  text: string,
  fps: number,
  speechRate = 1,
  seed = 0,
): number {
  return Math.max(1, Math.ceil(speechDuration(text, speechRate, seed) * fps));
}

/**
 * Split a script into alternating turns for `DialogueScene`.
 * Accepts an array of lines, or a single string with one line per speaker turn.
 */
export function splitTurns(script: string | string[]): string[] {
  const lines = Array.isArray(script) ? script : script.split('\n');
  return lines.map((l) => l.trim()).filter(Boolean);
}
