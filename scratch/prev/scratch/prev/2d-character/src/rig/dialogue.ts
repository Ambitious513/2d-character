/**
 * Deterministic dialogue scheduling.
 *
 * A script is a list of turns; turns alternate between two speakers. Timing
 * comes from the same text-driven lip-sync used by the rig, so the mouth, the
 * subtitle and the schedule can never disagree — and every frame is a pure
 * function of (script, fps, speechRate).
 */

import { speechFrames, splitTurns } from './lipsync';

export interface DialogueTurn {
  index: number;
  /** 0 = first speaker, 1 = second. */
  speaker: 0 | 1;
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface ScheduleOptions {
  fps?: number;
  speechRate?: number;
  /** Silence between turns, in frames. */
  gapFrames?: number;
  /** Per-speaker lip-sync seeds. */
  seeds?: [number, number];
  /** Frames of silence before the first line. */
  leadInFrames?: number;
}

export function dialogueSchedule(
  script: string | string[],
  {
    fps = 30,
    speechRate = 1,
    gapFrames = 14,
    seeds = [0, 1],
    leadInFrames = 8,
  }: ScheduleOptions = {},
): DialogueTurn[] {
  const turns = splitTurns(script);
  let cursor = leadInFrames;
  return turns.map((text, index) => {
    const speaker = (index % 2) as 0 | 1;
    const length = speechFrames(text, fps, speechRate, seeds[speaker]);
    const turn: DialogueTurn = {
      index,
      speaker,
      text,
      startFrame: cursor,
      endFrame: cursor + length,
    };
    cursor = turn.endFrame + gapFrames;
    return turn;
  });
}

/** Total frames needed to play a script, including the trailing pause. */
export function dialogueDuration(
  script: string | string[],
  options: ScheduleOptions = {},
): number {
  const turns = dialogueSchedule(script, options);
  if (!turns.length) return options.fps ?? 30;
  return turns[turns.length - 1].endFrame + (options.gapFrames ?? 14);
}

/** The turn playing at `frame`, or null during a gap. */
export function turnAt(turns: DialogueTurn[], frame: number): DialogueTurn | null {
  for (const t of turns) if (frame >= t.startFrame && frame < t.endFrame) return t;
  return null;
}

/** Greedy word wrap for burned-in subtitles. Pure, no measuring. */
export function wrapLines(text: string, maxChars = 44, maxLines = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line.length) line = w;
    else if (line.length + 1 + w.length <= maxChars) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line.length) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`;
  }
  return lines;
}
