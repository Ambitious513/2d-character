/**
 * Cast & motion explorer — `#/docs/cast`.
 *
 * The cast is data: every card below is a `CharacterDefinition` read from
 * `listCharacters()`, and its head is the real `CharacterHead` component, not a
 * picture. Clicking a card loads that cast member into the playground.
 *
 * The sheets are the library's reference grids — cast, all ten motions, all
 * seven expressions — each running in a real Player.
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Grid2x2, Footprints, Smile, Users } from 'lucide-react';
import {
  CastSheet,
  CharacterHead,
  EmotionSheet,
  MotionSheet,
  MOTIONS,
  castSceneSettings,
  listCharacters,
} from '../index';
import type { SceneSettings } from '../index';
import { DocsPlayer } from './DocsPlayer';
import { CodeBlock } from './CodeBlock';
import { Chip, SectionHead } from './parts';
import { sheetSnippet } from './snippets';

type SheetId = 'cast' | 'motion' | 'emotion';

const SHEETS: {
  id: SheetId;
  name: string;
  icon: React.ReactNode;
  blurb: string;
  durationInFrames: number;
  usesCharacter: boolean;
}[] = [
  {
    id: 'cast',
    name: 'CastSheet',
    icon: <Users size={13} />,
    blurb:
      'Every registered cast member, labelled with build, hair and outfit. Append an entry to CAST (or call registerCharacter) and it appears here — no new artwork.',
    durationInFrames: 120,
    usesCharacter: false,
  },
  {
    id: 'motion',
    name: 'MotionSheet',
    icon: <Footprints size={13} />,
    blurb:
      'All ten motions in one grid, played by the selected character. This is the animation vocabulary of the rig: two locomotion cycles plus eight performance poses.',
    durationInFrames: 300,
    usesCharacter: true,
  },
  {
    id: 'emotion',
    name: 'EmotionSheet',
    icon: <Smile size={13} />,
    blurb:
      'All seven expressions with the deterministic blink. The highlighted face is the one currently set on the character, so this doubles as an emotion picker reference.',
    durationInFrames: 180,
    usesCharacter: true,
  },
];

export function CastMotionExplorer({
  index,
  onLoadCharacter,
  onCopied,
}: {
  index: string;
  onLoadCharacter: (settings: SceneSettings, name: string) => void;
  onCopied: (ok: boolean) => void;
}) {
  const cast = listCharacters();
  const [sheet, setSheet] = useState<SheetId>('cast');
  const [character, setCharacter] = useState('milo');

  const active = SHEETS.find((s) => s.id === sheet)!;
  const component = sheet === 'cast' ? CastSheet : sheet === 'motion' ? MotionSheet : EmotionSheet;
  const inputProps = useMemo(
    () => castSceneSettings(character, { motion: 'idle' }),
    [character],
  );

  return (
    <section className="docs-section" id="docs-cast" data-docs-cast>
      <SectionHead
        index={index}
        eyebrow="Cast & motion"
        title={<>Six characters, <span>ten motions</span>, seven faces.</>}
        lede="A cast member is a plain data object — build, hair, outfit, palette, accessories. The rig draws it. Click any card to load that character into the playground."
      />

      <div className="cast-cards reveal">
        {cast.map((c) => {
          const s = castSceneSettings(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`cast-card ${character === c.id ? 'active' : ''}`}
              onClick={() => {
                setCharacter(c.id);
                onLoadCharacter(castSceneSettings(c.id), c.name);
              }}
              aria-label={`Load ${c.name} into the playground`}
            >
              <span className="cast-head">
                <CharacterHead
                  emotion="happy"
                  colors={s.colors}
                  glasses={s.glasses}
                  hair={s.hair}
                  cap={s.cap}
                  headphones={s.headphones}
                  beard={s.beard}
                  freckles={s.freckles}
                />
              </span>
              <span className="cast-copy">
                <b>{c.name}</b>
                <small>{c.tagline}</small>
                <span className="cast-meta">
                  <i>{c.build}</i>
                  <i>{c.hair}</i>
                  <i>{c.outfit}</i>
                </span>
                <span className="swatches" aria-hidden="true">
                  {(['skin', 'hair', 'jacket', 'pants', 'accent'] as const).map((k) => (
                    <i key={k} style={{ background: s.colors[k] }} />
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="docs-card reveal" style={{ marginTop: 18 }}>
        <div className="docs-card-head">
          <div>
            <h3 className="docs-h3">
              <Grid2x2 size={15} />
              Reference sheets
            </h3>
            <p className="docs-sub">
              Sheet compositions are stills you can render at any frame — handy as a library index or a
              style guide page.
            </p>
          </div>
          {active.usesCharacter ? (
            <label className="pg-field" htmlFor="sheet-character" style={{ minWidth: 190 }}>
              <span>Character</span>
              <span className="pg-select">
                <select
                  id="sheet-character"
                  aria-label="Sheet character"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                >
                  {cast.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          ) : (
            <Chip tone="mono">all {cast.length} members</Chip>
          )}
        </div>

        <div className="docs-tabs" role="tablist" aria-label="Reference sheets">
          {SHEETS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`sheet-tab-${s.id}`}
              aria-selected={sheet === s.id}
              aria-controls={`sheet-panel-${s.id}`}
              className={`docs-tab ${sheet === s.id ? 'active' : ''}`}
              onClick={() => setSheet(s.id)}
            >
              {s.icon}
              <code>{s.name}</code>
            </button>
          ))}
        </div>

        <div
          className="tab-panel"
          role="tabpanel"
          id={`sheet-panel-${sheet}`}
          aria-labelledby={`sheet-tab-${sheet}`}
          data-docs-sheet-panel={sheet}
        >
          <p className="docs-sub">{active.blurb}</p>
          <div className="docs-grid side">
            <DocsPlayer
              key={`${sheet}-${character}`}
              label={`${active.name} demo`}
              component={component}
              inputProps={inputProps}
              durationInFrames={active.durationInFrames}
              compositionWidth={1280}
              compositionHeight={720}
              caption={`${active.name} — ${active.durationInFrames} frames at 30 fps.`}
            />
            <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
              <div className="docs-chips">
                {sheet === 'motion' ? (
                  MOTIONS.map((m) => (
                    <Chip key={m.id} tone="mono">
                      {m.id}
                    </Chip>
                  ))
                ) : (
                  <>
                    <Chip tone="mono">1280×720</Chip>
                    <Chip tone="accent">{active.name}</Chip>
                    <Chip tone="blue">still-renderable</Chip>
                  </>
                )}
              </div>
              <CodeBlock
                code={sheetSnippet(sheet, character)}
                title={`${active.name}.tsx`}
                label={`Copy the ${active.name} snippet`}
                onCopied={onCopied}
                className="small"
              />
              <a className="docs-btn ghost small" href="#/docs/playground" style={{ justifySelf: 'start' }}>
                Open the playground
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
