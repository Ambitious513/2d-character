/**
 * Scene explorer — `#/docs/scenes`.
 *
 * A live `SceneOnly` plate: the environment with no character in it. Every
 * control here is a real prop, and the lighting swatches are read straight from
 * `paletteFor(timeOfDay)` — the same palette the renderer uses, not a copy of it.
 *
 * "Send to playground" patches only the scene fields, so a visitor keeps the
 * character and performance they were already working on.
 */

import { useMemo, useState } from 'react';
import { ArrowUpRight, Layers, Sun } from 'lucide-react';
import { SCENES, SceneOnly, TIMES_OF_DAY, paletteFor } from '../index';
import type { SceneId, SceneSettings, TimeOfDay } from '../index';
import { DocsPlayer } from './DocsPlayer';
import { CodeBlock } from './CodeBlock';
import { Chip, SectionHead } from './parts';
import { Segmented, Slider } from './controls';
import { sceneSnippet } from './snippets';

/** The palette entries worth showing: sky, depth layers, foliage and ink. */
const SHOWN: { key: 'skyTop' | 'skyBottom' | 'far' | 'mid' | 'leaf' | 'ink'; label: string }[] = [
  { key: 'skyTop', label: 'skyTop' },
  { key: 'skyBottom', label: 'skyBottom' },
  { key: 'far', label: 'far' },
  { key: 'mid', label: 'mid' },
  { key: 'leaf', label: 'leaf' },
  { key: 'ink', label: 'ink' },
];

export function SceneExplorer({
  index,
  onApply,
  onCopied,
}: {
  index: string;
  /** Patch the playground's scene fields and scroll the visitor there. */
  onApply: (patch: Partial<SceneSettings>, label: string) => void;
  onCopied: (ok: boolean) => void;
}) {
  const [scene, setScene] = useState<SceneId>('street');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('golden');
  const [parallax, setParallax] = useState(0.7);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const inputProps = useMemo(
    () => ({ scene, timeOfDay, parallax, speed, direction, motion: 'walk' as const }),
    [scene, timeOfDay, parallax, speed, direction],
  );

  const palette = paletteFor(timeOfDay);
  const sceneDef = SCENES.find((s) => s.id === scene)!;
  const snippet = sceneSnippet(scene, timeOfDay, parallax, { speed, direction });

  return (
    <section className="docs-section" id="docs-scenes" data-docs-scenes>
      <SectionHead
        index={index}
        eyebrow="Scenes"
        title={<>Four worlds, <span>three lighting passes</span>.</>}
        lede="Scenes are a registry, not a switch statement: registerScene() adds one and it appears everywhere. Lighting is shared across all of them, so night re-lights the whole world instead of tinting a screenshot."
      />

      <div className="docs-grid side reveal">
        <DocsPlayer
          label="SceneOnly"
          component={SceneOnly}
          inputProps={inputProps}
          durationInFrames={300}
          compositionWidth={1280}
          compositionHeight={720}
          caption={`SceneOnly — ${sceneDef.label.toLowerCase()} at ${timeOfDay}, scrolling at ${speed}× with parallax ${parallax}. No character is drawn; this is a background plate you can composite over. Press play: only the hero and the playground autoplay.`}
        />

        <div className="docs-card">
          <div className="docs-card-head">
            <div>
              <h3 className="docs-h3">
                <Layers size={15} />
                Scene &amp; lighting
              </h3>
              <p className="docs-sub">{sceneDef.note}</p>
            </div>
            <Chip tone="mono">SceneOnly</Chip>
          </div>

          <div className="pg-fields">
            <Segmented
              label="Scene"
              value={scene}
              options={SCENES.map((s) => ({ id: s.id, label: s.label }))}
              onChange={(id) => setScene(id as SceneId)}
            />
            <Segmented
              label="Time of day"
              value={timeOfDay}
              options={TIMES_OF_DAY.map((t) => ({ id: t.id, label: t.label }))}
              onChange={(id) => setTimeOfDay(id as TimeOfDay)}
            />
            <Slider
              id="scene-parallax"
              label="Parallax"
              value={parallax}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={setParallax}
            />
            <Slider
              id="scene-speed"
              label="Scroll speed"
              value={speed}
              min={0.25}
              max={2}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={setSpeed}
            />
            <Segmented
              label="Direction"
              value={direction === 1 ? 'right' : 'left'}
              options={[
                { id: 'left', label: '← Left' },
                { id: 'right', label: 'Right →' },
              ]}
              onChange={(id) => setDirection(id === 'right' ? 1 : -1)}
            />
            <p className="pg-hint">
              <b>parallax</b> scales how far the distant layers travel relative to the foreground.{' '}
              <code>0</code> flattens the world into a single plane; <code>1</code> is full depth.
            </p>
          </div>

          <div className="pg-group" style={{ marginTop: 14 }}>
            <div className="pg-group-title">
              <Sun size={13} />
              Resolved palette
              <span>paletteFor('{timeOfDay}')</span>
            </div>
            <div className="scene-palette" data-docs-palette={timeOfDay}>
              {SHOWN.map((s) => (
                <span className="scene-swatch" key={s.key}>
                  <i style={{ background: palette[s.key] }} aria-hidden="true" />
                  <span>{s.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <CodeBlock
              code={snippet}
              title="SceneOnly.tsx"
              label="Copy the SceneOnly snippet"
              onCopied={onCopied}
              className="small"
            />
          </div>

          <button
            type="button"
            className="docs-btn ghost small"
            style={{ marginTop: 12, justifySelf: 'start' }}
            onClick={() =>
              onApply(
                { scene, timeOfDay, parallax, speed, direction },
                `${sceneDef.label} · ${timeOfDay}`,
              )
            }
          >
            Send to playground
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}
