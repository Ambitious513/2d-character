/**
 * Small shared building blocks for the docs sections.
 *
 * Kept separate from `DocsSite.tsx` so each explorer can import the same
 * section furniture instead of re-inventing headers, chips and callouts.
 */

import type { ReactNode } from 'react';

export function SectionHead({
  index,
  eyebrow,
  title,
  lede,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div className="docs-section-head reveal">
      <span className="docs-eyebrow">
        <span className="docs-index">{index}</span>
        {eyebrow}
      </span>
      <h2 className="docs-h2">{title}</h2>
      {lede ? <p className="docs-lede">{lede}</p> : null}
    </div>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'mono' | 'accent' | 'blue' }) {
  return <span className={`chip ${tone ?? ''}`}>{children}</span>;
}

export function Note({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'warn';
}) {
  return (
    <div className={`docs-note ${tone ?? ''}`}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

/** Decorative frame ruler — the field-guide detail under a stage. */
export function FrameRuler({ ticks = 40, from = '000', to = '300' }: { ticks?: number; from?: string; to?: string }) {
  return (
    <>
      <div className="frame-ruler" aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => <i key={i} />)}
      </div>
      <div className="frame-ruler-label" aria-hidden="true">
        <span>FRAME {from}</span>
        <span>30 FPS</span>
        <span>{to}</span>
      </div>
    </>
  );
}
