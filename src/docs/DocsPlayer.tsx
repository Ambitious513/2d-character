/**
 * Docs-side wrapper around the real Remotion `<Player>`.
 *
 * Every preview on the docs site is a live composition — the same component a
 * host would register with `<Composition>` — not a screenshot or a mock. This
 * wrapper only adds the Stride transport (restart / play / scrub / frame
 * readout), an error fallback and reduced-motion handling.
 *
 * It deliberately renders no audio tags (`numberOfSharedAudioTags={0}`): the
 * kit is silent, and a docs page should never create an AudioContext.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Pause, Play, RotateCcw } from 'lucide-react';

/** True when the visitor asked the OS to reduce motion. Autoplay is disabled then. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export interface DocsPlayerProps {
  /** Slate label, also used as the accessible name of the transport controls. */
  label: string;
  /**
   * A Stride composition. Typed loosely on purpose: the wrapper is generic over
   * every composition in the kit, each with its own props shape.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  inputProps: object;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  fps?: number;
  /** Honoured only when the visitor has not asked for reduced motion. */
  autoPlay?: boolean;
  loop?: boolean;
  /** Alpha checkerboard behind transparent plates. */
  checkerboard?: boolean;
  /** Small note under the stage, e.g. the frame size. */
  caption?: string;
  /** Extra class on the outer figure, for section-specific tweaks. */
  className?: string;
}

export function DocsPlayer({
  label,
  component,
  inputProps,
  durationInFrames,
  compositionWidth,
  compositionHeight,
  fps = 30,
  autoPlay = false,
  loop = true,
  checkerboard = false,
  caption,
  className = '',
}: DocsPlayerProps) {
  const ref = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const shouldAutoPlay = autoPlay && !reduced;

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('seeked', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    // Autoplay starts before this effect runs, so the `play` event is already
    // gone by the time we subscribe — read the current state instead.
    setPlaying(p.isPlaying());
    setFrame(p.getCurrentFrame());
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('seeked', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
    };
  }, []);

  const seek = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(durationInFrames - 1, Math.round(next)));
      ref.current?.seekTo(clamped);
      setFrame(clamped);
    },
    [durationInFrames],
  );

  const last = Math.max(0, durationInFrames - 1);

  return (
    <figure className={`docs-player ${className}`} data-docs-player={label}>
      <div
        className={`docs-player-stage ${checkerboard ? 'checkerboard' : ''}`}
        style={{ aspectRatio: `${compositionWidth} / ${compositionHeight}` }}
      >
        <Player
          ref={ref}
          component={component}
          inputProps={inputProps as Record<string, unknown>}
          durationInFrames={durationInFrames}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          fps={fps}
          controls={false}
          loop={loop}
          autoPlay={shouldAutoPlay}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          acknowledgeRemotionLicense
          numberOfSharedAudioTags={0}
          style={{ width: '100%', height: '100%' }}
          errorFallback={({ error }) => (
            <div className="docs-player-error">Preview error: {error.message}</div>
          )}
        />
        <span className="docs-slate" aria-hidden="true">
          {label}
          <em>{compositionWidth}×{compositionHeight}</em>
        </span>
      </div>

      <div className="docs-transport">
        <button
          type="button"
          className="docs-icon-btn"
          aria-label={`${label} restart`}
          onClick={() => seek(0)}
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          className="docs-play-btn"
          aria-label={playing ? `${label} pause` : `${label} play`}
          onClick={() => ref.current?.toggle()}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={frame}
          aria-label={`${label} timeline`}
          onChange={(e) => seek(Number(e.target.value))}
          style={{ background: `linear-gradient(to right, var(--accent) ${(frame / Math.max(1, last)) * 100}%, var(--line) ${(frame / Math.max(1, last)) * 100}%)` }}
        />
        <span className="docs-frame" data-docs-frame={label}>
          {String(frame).padStart(3, '0')} / {durationInFrames}
        </span>
      </div>

      {caption ? <figcaption className="docs-player-caption">{caption}</figcaption> : null}
    </figure>
  );
}
