/**
 * Composition explorer — `#/docs/compositions`.
 *
 * One tab per composition in the public barrel, each with a real `<Player>`,
 * the props it accepts and a copyable snippet. Only the active tab's Player is
 * mounted, so the page never runs five animations at once.
 *
 * The dialogue tab takes its duration from `resolveDialogueComposition`, which
 * derives it from the script — the same call a host makes when registering the
 * composition, not a number typed in by hand.
 */

import { useMemo, useState } from 'react';
import { Clapperboard, Layers, MessageSquare, Square, User } from 'lucide-react';
import {
  CharacterOnly,
  DEFAULT_SCRIPT,
  DialogueScene,
  SceneOnly,
  TalkingHead,
  WalkScene,
  castSceneSettings,
  resolveDialogueComposition,
} from '../index';
import { DocsPlayer } from './DocsPlayer';
import { CodeBlock } from './CodeBlock';
import { Chip, Note, SectionHead } from './parts';
import { compositionSnippet } from './snippets';

type TabId = 'walk' | 'character' | 'scene' | 'dialogue' | 'head';

const TABS: { id: TabId; name: string; icon: React.ReactNode; blurb: string }[] = [
  {
    id: 'walk',
    name: 'WalkScene',
    icon: <Clapperboard size={13} />,
    blurb:
      'The headline composition: a character plus a scrolling world. The camera holds the character centre-frame while the environment moves at exactly the speed the feet are planted at — that is what stops the skate.',
  },
  {
    id: 'character',
    name: 'CharacterOnly',
    icon: <Square size={13} />,
    blurb:
      'A transparent 720×720 plate with nothing but the rig on it. This is the composition you render for alpha: PNG sequences, ProRes 4444 or VP9 WebM. The checkerboard behind it is docs chrome, not part of the render.',
  },
  {
    id: 'scene',
    name: 'SceneOnly',
    icon: <Layers size={13} />,
    blurb:
      'The environment on its own — no character. Useful as a background plate you composite over, or as an establishing shot. It still scrolls, so it can be cut against a WalkScene at the same speed.',
  },
  {
    id: 'dialogue',
    name: 'DialogueScene',
    icon: <MessageSquare size={13} />,
    blurb:
      'Two cast members alternating lines, with deterministic lip-sync, burned subtitles and a speaker highlight. The duration below is computed from the script by resolveDialogueComposition, so a line is never cut off mid-word.',
  },
  {
    id: 'head',
    name: 'TalkingHead',
    icon: <User size={13} />,
    blurb:
      'A close-up head with text-driven lip-sync, for reaction shots and interview cutaways. Set background="transparent" to composite it over your own footage.',
  },
];

const PROP_CHIPS: Record<TabId, string[]> = {
  walk: ['character', 'motion', 'scene', 'timeOfDay', 'speed', 'followCamera', 'parallax'],
  character: ['character', 'motion', 'emotion', 'scale', 'guides', 'colors'],
  scene: ['scene', 'timeOfDay', 'parallax', 'direction'],
  dialogue: ['speakers', 'script', 'gapFrames', 'speechRate', 'showSubtitles'],
  head: ['character', 'dialogue', 'emotion', 'background', 'showSubtitles'],
};

export function CompositionExplorer({ index, onCopied }: { index: string; onCopied: (ok: boolean) => void }) {
  const [tab, setTab] = useState<TabId>('walk');

  /** Derived exactly the way a host would derive it when registering. */
  const dialogue = useMemo(
    () =>
      resolveDialogueComposition({
        id: 'DocsChat',
        speakers: ['milo', 'ada'],
        script: DEFAULT_SCRIPT,
      }),
    [],
  );

  const active = TABS.find((t) => t.id === tab)!;

  const player = (() => {
    switch (tab) {
      case 'walk':
        return {
          component: WalkScene,
          inputProps: castSceneSettings('ada', {
            motion: 'run',
            scene: 'street',
            timeOfDay: 'golden',
            speed: 1.2,
            followCamera: true,
          }),
          durationInFrames: 300,
          width: 1280,
          height: 720,
          checkerboard: false,
        };
      case 'character':
        return {
          component: CharacterOnly,
          inputProps: castSceneSettings('milo', { motion: 'wave', emotion: 'happy', guides: false }),
          durationInFrames: 300,
          width: 720,
          height: 720,
          checkerboard: true,
        };
      case 'scene':
        return {
          component: SceneOnly,
          inputProps: { scene: 'park', timeOfDay: 'golden', parallax: 0.8 },
          durationInFrames: 300,
          width: 1280,
          height: 720,
          checkerboard: false,
        };
      case 'dialogue':
        return {
          component: DialogueScene,
          inputProps: dialogue.defaultProps,
          durationInFrames: dialogue.durationInFrames,
          width: dialogue.width,
          height: dialogue.height,
          checkerboard: false,
        };
      case 'head':
        return {
          component: TalkingHead,
          inputProps: {
            ...castSceneSettings('ravi', {
              motion: 'talk',
              emotion: 'focused',
              dialogue: 'Here is the thing about good animation: it is all in the timing.',
              showSubtitles: true,
            }),
            background: 'transparent',
          },
          durationInFrames: 180,
          width: 720,
          height: 720,
          checkerboard: true,
        };
    }
  })();

  return (
    <section className="docs-section" id="docs-compositions" data-docs-compositions>
      <SectionHead
        index={index}
        eyebrow="Compositions"
        title={<>Five compositions, <span>one rig</span>.</>}
        lede="Everything below is exported from src/index.ts and runs in a real Player. Pick a tab, press play, copy the snippet — the props shown are the props it accepts."
      />

      <div className="docs-tabs" role="tablist" aria-label="Compositions">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`comp-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`comp-panel-${t.id}`}
            className={`docs-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <code>{t.name}</code>
          </button>
        ))}
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`comp-panel-${tab}`}
        aria-labelledby={`comp-tab-${tab}`}
        data-docs-comp-panel={tab}
      >
        <div className="docs-grid side">
          <DocsPlayer
            key={tab}
            label={`${active.name} demo`}
            component={player.component}
            inputProps={player.inputProps}
            durationInFrames={player.durationInFrames}
            compositionWidth={player.width}
            compositionHeight={player.height}
            checkerboard={player.checkerboard}
            caption={`${active.name} — ${player.width}×${player.height}, ${player.durationInFrames} frames at 30 fps. Press play; secondary examples never autoplay.`}
          />
          <div className="docs-card">
            <div className="docs-card-head">
              <div>
                <h3 className="docs-h3">
                  <code>{active.name}</code>
                </h3>
                <p className="docs-sub">{active.blurb}</p>
              </div>
            </div>
            <div className="docs-chips" style={{ marginBottom: 12 }}>
              {PROP_CHIPS[tab].map((p) => (
                <Chip key={p} tone="mono">
                  {p}
                </Chip>
              ))}
            </div>
            {tab === 'dialogue' ? (
              <Note>
                <b>Derived duration:</b> {DEFAULT_SCRIPT.length} turns →{' '}
                <code>durationInFrames: {dialogue.durationInFrames}</code> at {dialogue.fps} fps, including
                the gaps between turns. Change the script and the number follows.
              </Note>
            ) : null}
            <div style={{ marginTop: 12 }}>
              <CodeBlock
                code={compositionSnippet(tab)}
                title={`${active.name}.tsx`}
                label={`Copy the ${active.name} snippet`}
                onCopied={onCopied}
                className="small"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
