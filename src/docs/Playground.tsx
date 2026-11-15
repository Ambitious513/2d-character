/**
 * The live playground — `#/docs/playground`.
 *
 * A real `<Player>` on the left, a permanently visible control region on the
 * right. Nothing is hidden behind a modal or an "advanced" disclosure: every
 * control below writes straight into the `inputProps` of the composition that
 * is rendering, and the snippet underneath is generated from that same object.
 *
 * State lives in `DocsSite` so the preset panel can load a look into this
 * playground and scroll to it. This component is controlled on purpose.
 *
 * Randomize uses `Math.random()` — that is allowed here because it only picks
 * *settings*. The render path stays pure: same settings + same frame = same SVG.
 */

import { useMemo } from 'react';
import {
  Camera,
  Copy,
  Download,
  Film,
  Footprints,
  MessageCircle,
  Palette,
  RotateCcw,
  Shirt,
  Shuffle,
  SlidersHorizontal,
  Square,
  Sun,
  Users,
} from 'lucide-react';
import {
  BUILDS,
  CharacterOnly,
  EMOTIONS,
  HAIR_STYLES,
  MOTIONS,
  OUTFITS,
  SCENES,
  TIMES_OF_DAY,
  WalkScene,
  castSceneSettings,
  getCharacter,
  isLocomotion,
  listCharacters,
  serializePresetJSON,
  speechFrames,
} from '../index';
import type { Build, CharacterColors, Emotion, HairStyle, Motion, Outfit, SceneId, SceneSettings, TimeOfDay } from '../index';
import { copyText, downloadText } from '../ui/utils';
import { DocsPlayer } from './DocsPlayer';
import { CodeBlock } from './CodeBlock';
import { Chip, FrameRuler, SectionHead } from './parts';
import { Group, Segmented, Select, Slider, Switch } from './controls';
import { playgroundSnippet, propsExpression } from './snippets';

export type PlaygroundView = 'scene' | 'character';

/** What "Reset" returns to: the studio's own opening look. */
export const PLAYGROUND_DEFAULT: SceneSettings = castSceneSettings('milo', {
  motion: 'walk',
  emotion: 'happy',
  scene: 'street',
  timeOfDay: 'day',
  followCamera: true,
});

export const PLAYGROUND_DURATION = 300;

const COLOR_FIELDS: { key: keyof CharacterColors; label: string }[] = [
  { key: 'jacket', label: 'Jacket' },
  { key: 'pants', label: 'Pants' },
  { key: 'skin', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'accent', label: 'Accent' },
];

const ACCESSORIES: { key: keyof SceneSettings; label: string }[] = [
  { key: 'backpack', label: 'Backpack' },
  { key: 'glasses', label: 'Glasses' },
  { key: 'cap', label: 'Cap' },
  { key: 'scarf', label: 'Scarf' },
  { key: 'headphones', label: 'Headphones' },
  { key: 'beard', label: 'Beard' },
  { key: 'freckles', label: 'Freckles' },
];

export interface PlaygroundProps {
  /** Section number, derived from the docs nav order by `DocsSite`. */
  index: string;
  settings: SceneSettings;
  view: PlaygroundView;
  /** Name of the last loaded preset, or `Custom` once a control is touched. */
  presetName: string;
  onViewChange: (view: PlaygroundView) => void;
  /** Shallow patch; `colors` is merged rather than replaced. */
  update: (patch: Partial<SceneSettings>) => void;
  /** Wholesale replacement — reset, randomize and preset loads. */
  replace: (settings: SceneSettings, presetName: string) => void;
  notify: (message: string) => void;
}

export function Playground({
  index,
  settings,
  view,
  presetName,
  onViewChange,
  update,
  replace,
  notify,
}: PlaygroundProps) {
  const cast = listCharacters();
  const definition = getCharacter(settings.character);
  const locomotion = isLocomotion(settings.motion);
  const talking = settings.motion === 'talk';

  const snippet = useMemo(() => playgroundSnippet(settings, view), [settings, view]);
  const spokenFrames = useMemo(
    () => (settings.dialogue ? speechFrames(settings.dialogue, 30, settings.speechRate, settings.seed) : 0),
    [settings.dialogue, settings.speechRate, settings.seed],
  );

  const reset = () => {
    replace({ ...PLAYGROUND_DEFAULT, colors: { ...PLAYGROUND_DEFAULT.colors } }, 'Morning stroll');
    notify('Playground reset to the opening look');
  };

  const randomize = () => {
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
    const round = (n: number) => Math.round(n * 100) / 100;
    // UI-side roll only. Every value written here is a plain settings field.
    replace(
      {
        ...settings,
        motion: pick(['walk', 'walk', 'run', 'wave', 'dance', 'talk', 'jump'] as const),
        emotion: pick(EMOTIONS).id,
        hair: pick(HAIR_STYLES).id,
        outfit: pick(OUTFITS).id,
        build: pick(BUILDS).id,
        scene: pick(SCENES).id,
        timeOfDay: pick(TIMES_OF_DAY).id,
        speed: round(0.7 + Math.random() * 0.7),
        stride: round(0.8 + Math.random() * 0.5),
        bounce: round(0.4 + Math.random() * 0.7),
        armSwing: round(0.5 + Math.random() * 0.7),
        parallax: round(0.2 + Math.random() * 0.8),
        seed: Math.floor(Math.random() * 1000),
        backpack: Math.random() > 0.5,
        glasses: Math.random() > 0.65,
        cap: Math.random() > 0.8,
        scarf: Math.random() > 0.85,
        headphones: Math.random() > 0.85,
        beard: Math.random() > 0.8,
        freckles: Math.random() > 0.7,
        colors: {
          jacket: pick(['#F26B38', '#365DE6', '#E9B44C', '#7FB6D9', '#D9552F', '#6F9B6A']),
          pants: pick(['#2D5B52', '#233C59', '#6B5147', '#3E4C55']),
          skin: pick(['#B87952', '#8D5A3C', '#E0AC8B', '#6B4226', '#D9A066']),
          hair: pick(['#26352E', '#3B2A20', '#1E1E24', '#5A3A22']),
          shoes: pick(['#F5F0E4', '#FFFDF6', '#E8ECE6']),
          accent: pick(['#F6C65B', '#FFFDF6', '#7FB6D9', '#E9B44C']),
        },
      },
      'Custom',
    );
    notify('New look rolled');
  };

  const copyProps = async () => {
    const ok = await copyText(propsExpression(settings));
    notify(ok ? 'inputProps copied' : 'Copy failed — select the snippet manually');
  };

  const downloadPreset = () => {
    const name = presetName === 'Custom' ? `${definition?.name ?? settings.character} look` : presetName;
    downloadText(
      `stride-${settings.character}-${settings.motion}.json`,
      serializePresetJSON(settings, { name, note: 'Exported from the Stride docs playground' }),
    );
    notify('Preset JSON downloaded');
  };

  return (
    <section className="docs-section" id="docs-playground" data-docs-playground>
      <SectionHead
        index={index}
        eyebrow="Playground"
        title={<>Steer the rig <span>live</span>. Every control is a prop.</>}
        lede="This is the same composition a host registers with Remotion, driven by the settings object below. Change anything and the Player, the frame readout and the generated snippet all follow — no reload, no render step."
      />

      <div className="playground">
        <div className="pg-stage">
          <div className="pg-stage-bar">
            <div className="pg-seg" role="group" aria-label="Playground preview">
              <button
                type="button"
                className={view === 'scene' ? 'active' : ''}
                aria-pressed={view === 'scene'}
                onClick={() => onViewChange('scene')}
              >
                <Film size={12} /> Scene
              </button>
              <button
                type="button"
                className={view === 'character' ? 'active' : ''}
                aria-pressed={view === 'character'}
                onClick={() => onViewChange('character')}
              >
                <Square size={12} /> Alpha plate
              </button>
            </div>
            <div className="docs-chips">
              <Chip tone="mono">{view === 'scene' ? 'WalkScene · 1280×720' : 'CharacterOnly · 720×720'}</Chip>
              <Chip tone={presetName === 'Custom' ? 'accent' : undefined}>{presetName}</Chip>
            </div>
          </div>

          <DocsPlayer
            key={view}
            label="Playground"
            component={view === 'scene' ? WalkScene : CharacterOnly}
            inputProps={settings}
            durationInFrames={PLAYGROUND_DURATION}
            compositionWidth={view === 'scene' ? 1280 : 720}
            compositionHeight={720}
            checkerboard={view === 'character'}
            autoPlay
            caption={
              view === 'scene'
                ? 'WalkScene — character plus scrolling world. The camera, parallax and lighting below all come from these props.'
                : 'CharacterOnly — a transparent plate on a checkerboard. This is what you render to PNG sequences, ProRes 4444 or VP9 for alpha.'
            }
          />
          <FrameRuler to={String(PLAYGROUND_DURATION)} />
        </div>

        <div className="pg-controls" data-docs-controls>
          <div className="pg-controls-head">
            <h3 className="docs-h3">
              <SlidersHorizontal size={15} />
              Controls
            </h3>
            <span className="pg-live">
              <i />
              LIVE
            </span>
          </div>

          <div className="pg-groups">
            <Group icon={<Users size={13} />} title="Cast & performance" note={definition?.name}>
              <Select
                id="pg-character"
                label="Character"
                value={settings.character}
                options={cast.map((c) => ({ id: c.id, label: `${c.name} — ${c.build}` }))}
                onChange={(id) => {
                  // Keep the visitor's scene, camera and framing when switching cast.
                  replace(
                    castSceneSettings(id, {
                      scene: settings.scene,
                      timeOfDay: settings.timeOfDay,
                      parallax: settings.parallax,
                      followCamera: settings.followCamera,
                      guides: settings.guides,
                      showSubtitles: settings.showSubtitles,
                      direction: settings.direction,
                      scale: settings.scale,
                    }),
                    'Custom',
                  );
                }}
              />
              <div className="pg-fields two">
                <Select
                  id="pg-motion"
                  label="Motion"
                  value={settings.motion}
                  options={MOTIONS.map((m) => ({ id: m.id, label: m.label }))}
                  onChange={(id) => update({ motion: id as Motion })}
                />
                <Select
                  id="pg-emotion"
                  label="Emotion"
                  value={settings.emotion}
                  options={EMOTIONS.map((e) => ({ id: e.id, label: e.label }))}
                  onChange={(id) => update({ emotion: id as Emotion })}
                />
              </div>
              <Segmented
                label="Direction"
                value={settings.direction === 1 ? 'right' : 'left'}
                options={[
                  { id: 'left', label: '← Left' },
                  { id: 'right', label: 'Right →' },
                ]}
                onChange={(id) => update({ direction: id === 'right' ? 1 : -1 })}
              />
            </Group>

            <Group
              icon={<Footprints size={13} />}
              title="Motion tuning"
              note={locomotion ? 'walk / run' : 'speed & stride need walk or run'}
            >
              <div className="pg-fields two">
                <Slider id="pg-speed" label="Speed" value={settings.speed} min={0.25} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update({ speed: v })} />
                <Slider id="pg-stride" label="Stride" value={settings.stride} min={0.5} max={1.6} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update({ stride: v })} />
                <Slider id="pg-bounce" label="Bounce" value={settings.bounce} min={0} max={1.5} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => update({ bounce: v })} />
                <Slider id="pg-armswing" label="Arm swing" value={settings.armSwing} min={0} max={1.5} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => update({ armSwing: v })} />
                <Slider id="pg-scale" label="Scale" value={settings.scale} min={0.6} max={1.8} step={0.02} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update({ scale: v })} />
                <Slider id="pg-seed" label="Seed" value={settings.seed} min={0} max={999} step={1} format={(v) => String(v)} onChange={(v) => update({ seed: v })} />
              </div>
              <p className="pg-hint">
                <b>Seed</b> shifts gait phase and idle drift deterministically — it is the only sanctioned
                source of per-instance variation.
              </p>
            </Group>

            <Group icon={<Sun size={13} />} title="Scene & camera">
              <Select
                id="pg-scene"
                label="Scene"
                value={settings.scene}
                options={SCENES.map((s) => ({ id: s.id, label: `${s.label} — ${s.note}` }))}
                onChange={(id) => update({ scene: id as SceneId })}
              />
              <Segmented
                label="Time of day"
                value={settings.timeOfDay}
                options={TIMES_OF_DAY.map((t) => ({ id: t.id, label: t.label }))}
                onChange={(id) => update({ timeOfDay: id as TimeOfDay })}
              />
              <Slider id="pg-parallax" label="Parallax" value={settings.parallax} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => update({ parallax: v })} />
              <Switch
                label="Follow camera"
                note="Hold the character centre-frame and scroll the world instead."
                checked={settings.followCamera}
                onChange={(v) => update({ followCamera: v })}
              />
              <Switch
                label="Rig guides"
                note="Draw the IK skeleton, joint dots and ground line."
                checked={settings.guides}
                onChange={(v) => update({ guides: v })}
              />
            </Group>

            <Group
              icon={<MessageCircle size={13} />}
              title="Speech"
              note={talking ? (spokenFrames ? `${spokenFrames} frames of lip-sync` : 'add a line') : 'pick the Talk motion'}
            >
              <label className="pg-field" htmlFor="pg-dialogue">
                <span>Dialogue</span>
                <textarea
                  id="pg-dialogue"
                  className="pg-text"
                  aria-label="Dialogue"
                  value={settings.dialogue}
                  placeholder="Type a line — the mouth is driven by deterministic visemes, not audio."
                  onChange={(e) => update({ dialogue: e.target.value })}
                />
              </label>
              <p className="pg-hint">
                {talking
                  ? <>Lip-sync is live. This line fills <b>{spokenFrames}</b> of {PLAYGROUND_DURATION} frames at 30 fps.</>
                  : <>Set <b>Motion → Talk</b> to lip-sync this line. The text is kept either way.</>}
              </p>
              <Slider id="pg-speechrate" label="Speech rate" value={settings.speechRate} min={0.5} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update({ speechRate: v })} />
              <Switch
                label="Subtitles"
                note="Burn the line into the frame under the character."
                checked={settings.showSubtitles}
                onChange={(v) => update({ showSubtitles: v })}
              />
            </Group>

            <Group icon={<Shirt size={13} />} title="Look">
              <div className="pg-fields two">
                <Select id="pg-hair" label="Hair" value={settings.hair} options={HAIR_STYLES.map((h) => ({ id: h.id, label: h.label }))} onChange={(id) => update({ hair: id as HairStyle })} />
                <Select id="pg-outfit" label="Outfit" value={settings.outfit} options={OUTFITS.map((o) => ({ id: o.id, label: o.label }))} onChange={(id) => update({ outfit: id as Outfit })} />
              </div>
              <Select id="pg-build" label="Build" value={settings.build} options={BUILDS.map((b) => ({ id: b.id, label: b.label }))} onChange={(id) => update({ build: id as Build })} />
              <div className="pg-field">
                <span>Accessories</span>
                <div className="pg-toggles" role="group" aria-label="Accessories">
                  {ACCESSORIES.map((a) => {
                    const on = Boolean(settings[a.key]);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        className="pg-toggle"
                        aria-pressed={on}
                        aria-label={a.label}
                        onClick={() => update({ [a.key]: !on } as Partial<SceneSettings>)}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Group>

            <Group icon={<Palette size={13} />} title="Palette" note="overrides the cast defaults">
              <div className="pg-colors">
                {COLOR_FIELDS.map((c) => (
                  <label className="pg-color" key={c.key} htmlFor={`pg-color-${c.key}`}>
                    <input
                      id={`pg-color-${c.key}`}
                      type="color"
                      aria-label={`${c.label} colour`}
                      value={settings.colors[c.key]}
                      onChange={(e) => update({ colors: { ...settings.colors, [c.key]: e.target.value } })}
                    />
                    {c.label}
                    <code>{settings.colors[c.key].toUpperCase()}</code>
                  </label>
                ))}
              </div>
            </Group>

            <Group icon={<Camera size={13} />} title="Take it with you">
              <p className="pg-hint">
                Props are generated from the live settings, and the preset file is a versioned v2
                envelope that <code>parsePreset</code> validates and migrates.
              </p>
            </Group>
          </div>

          <div className="pg-actions">
            <button type="button" className="docs-btn ghost small" onClick={reset}>
              <RotateCcw size={13} />
              Reset
            </button>
            <button type="button" className="docs-btn ghost small" onClick={randomize}>
              <Shuffle size={13} />
              Randomize
            </button>
            <button type="button" className="docs-btn ghost small" onClick={copyProps}>
              <Copy size={13} />
              Copy props
            </button>
            <button type="button" className="docs-btn accent small" onClick={downloadPreset}>
              <Download size={13} />
              Download preset
            </button>
          </div>
        </div>
      </div>

      <div className="docs-card reveal" style={{ marginTop: 18 }}>
        <div className="docs-card-head">
          <div>
            <h3 className="docs-h3">Live snippet</h3>
            <p className="docs-sub">
              Regenerated on every change. Only fields that differ from{' '}
              <code>castSceneSettings('{settings.character}')</code> are listed, so it reads like intent
              instead of boilerplate.
            </p>
          </div>
          <Chip tone="blue">{view === 'scene' ? 'WalkScene' : 'CharacterOnly'}</Chip>
        </div>
        <CodeBlock code={snippet} title="src/Preview.tsx" label="Copy the live playground snippet" />
      </div>
    </section>
  );
}
