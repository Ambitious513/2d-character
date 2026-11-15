/**
 * Snippet generators for the docs site.
 *
 * Pure functions, no React: every code block on the page is generated from the
 * same settings object the live `<Player>` is rendering, so what a visitor
 * copies is exactly what they are looking at.
 *
 * Snippets import from the public barrel (`./src`) on purpose — they double as
 * documentation of the consumer surface.
 */

import { castSceneSettings, PRESET_SCHEMA_VERSION } from '../index';
import type { CharacterColors, SceneSettings } from '../index';

/* ------------------------------------------------------------------ */
/* Literal formatting                                                  */
/* ------------------------------------------------------------------ */

/** A readable TS literal: unquoted keys, single-quoted strings. */
function literal(value: unknown, indent = '  '): string {
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map((v) => literal(v, indent)).join(', ')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const inner = entries.map(([k, v]) => `${indent}  ${k}: ${literal(v, `${indent}  `)},`).join('\n');
    return `{\n${inner}\n${indent}}`;
  }
  return 'undefined';
}

const COLOR_KEYS: (keyof CharacterColors)[] = ['skin', 'hair', 'jacket', 'pants', 'shoes', 'accent'];

/** Keys worth showing in a snippet — everything a visitor can steer in the docs. */
const SHOWN_KEYS: (keyof SceneSettings)[] = [
  'motion', 'emotion', 'speed', 'stride', 'bounce', 'armSwing', 'scale', 'direction',
  'hair', 'outfit', 'build', 'backpack', 'glasses', 'cap', 'scarf', 'headphones', 'beard', 'freckles',
  'dialogue', 'speechRate', 'seed',
  'scene', 'timeOfDay', 'parallax', 'guides', 'followCamera', 'showSubtitles',
];

/**
 * Only what changed relative to the cast member's own defaults, so a snippet
 * stays short and shows intent rather than 30 lines of boilerplate.
 */
export function overridesOf(settings: SceneSettings): Record<string, unknown> {
  const base = castSceneSettings(settings.character);
  const out: Record<string, unknown> = {};
  for (const key of SHOWN_KEYS) {
    const value = settings[key];
    if (value === undefined) continue;
    if (key === 'dialogue' && value === '') continue;
    if (JSON.stringify(value) !== JSON.stringify(base[key])) out[key] = value;
  }
  const colors: Partial<CharacterColors> = {};
  for (const key of COLOR_KEYS) {
    if (settings.colors[key] !== base.colors[key]) colors[key] = settings.colors[key];
  }
  if (Object.keys(colors).length) out.colors = colors;
  return out;
}

/** `castSceneSettings('ada', { … })` — the canonical way to build props. */
export function propsExpression(settings: SceneSettings): string {
  const overrides = overridesOf(settings);
  if (Object.keys(overrides).length === 0) return `castSceneSettings('${settings.character}')`;
  return `castSceneSettings('${settings.character}', ${literal(overrides)})`;
}

/* ------------------------------------------------------------------ */
/* Playground                                                          */
/* ------------------------------------------------------------------ */

export function playgroundSnippet(settings: SceneSettings, view: 'scene' | 'character'): string {
  const comp = view === 'character' ? 'CharacterOnly' : 'WalkScene';
  const size = view === 'character' ? [720, 720] : [1280, 720];
  return `import { Player } from '@remotion/player';
import { ${comp}, castSceneSettings } from './src';

const props = ${propsExpression(settings)};

<Player
  component={${comp}}
  inputProps={props}
  durationInFrames={300}
  fps={30}
  compositionWidth={${size[0]}}
  compositionHeight={${size[1]}}
  controls
  loop
/>;`;
}

/* ------------------------------------------------------------------ */
/* Quickstart                                                          */
/* ------------------------------------------------------------------ */

export const QUICKSTART = {
  install: `# Stride is source, not a black box. Copy the library in:
cp -R src/rig src/remotion src/index.ts ../my-video/src/stride

# Then import from the barrel only:
#   import { WalkScene, castSceneSettings } from './stride';`,
  composition: `import { Composition } from 'remotion';
import { WalkScene, sceneSchema, castSceneSettings } from './src';

export const MyVideo = () => (
  <Composition
    id="Hero"
    component={WalkScene}
    schema={sceneSchema}
    durationInFrames={300}
    fps={30}
    width={1280}
    height={720}
    defaultProps={castSceneSettings('ada', { motion: 'run', timeOfDay: 'golden' })}
  />
);`,
  factories: `import {
  SceneComposition,
  CharacterComposition,
  DialogueComposition,
  CastCompositions,
} from './src';

export const MyRoot = () => (
  <>
    <SceneComposition id="Hero" character="ada" overrides={{ motion: 'run' }} />
    <CharacterComposition id="HeroAlpha" character="ada" />
    <DialogueComposition
      id="Chat"
      speakers={['milo', 'ada']}
      script={['Hey! Good to see you.', 'You too. How is the rig coming along?']}
    />
    {CastCompositions()}
  </>
);`,
  player: `import { Player } from '@remotion/player';
import { WalkScene, castSceneSettings } from './src';

export const Preview = () => (
  <Player
    component={WalkScene}
    inputProps={castSceneSettings('milo', { motion: 'walk' })}
    durationInFrames={300}
    fps={30}
    compositionWidth={1280}
    compositionHeight={720}
    controls
    loop
    acknowledgeRemotionLicense
  />
);`,
  render: `npm run studio             # Remotion Studio, every composition
npm run render             # opaque MP4
npm run render:alpha       # PNG sequence, lossless alpha
npm run render:alpha:prores  # ProRes 4444 .mov
npm run render:alpha:webm    # VP9 WebM with alpha`,
} as const;

/* ------------------------------------------------------------------ */
/* Compositions                                                        */
/* ------------------------------------------------------------------ */

export function compositionSnippet(id: string): string {
  switch (id) {
    case 'walk':
      return `import { WalkScene, castSceneSettings } from './src';

<WalkScene
  {...castSceneSettings('ada', {
    motion: 'run',
    scene: 'street',
    timeOfDay: 'golden',
    speed: 1.2,
    followCamera: true,
  })}
/>;`;
    case 'character':
      return `import { CharacterOnly, castSceneSettings } from './src';

// 720×720 transparent plate — the alpha-export workhorse.
<CharacterOnly
  {...castSceneSettings('milo', {
    motion: 'wave',
    emotion: 'happy',
    guides: false,
  })}
/>;`;
    case 'scene':
      return `import { SceneOnly } from './src';

// Environment plate with no character in it.
<SceneOnly scene="park" timeOfDay="golden" parallax={0.8} />;`;
    case 'dialogue':
      return `import { DialogueComposition, resolveDialogueComposition } from './src';

// Duration is derived from the script, so no line is ever cut off.
<DialogueComposition
  id="Chat"
  speakers={['milo', 'ada']}
  script={[
    'Hey! Good to see you.',
    'You too. How is the new rig coming along?',
  ]}
/>;

// …or take the timing as plain data:
const { durationInFrames, defaultProps } = resolveDialogueComposition({
  id: 'Chat',
  speakers: ['milo', 'ada'],
  script: ['Hey!', 'Oh, hi.'],
});`;
    case 'head':
      return `import { TalkingHead, castSceneSettings } from './src';

<TalkingHead
  {...castSceneSettings('ravi', {
    motion: 'talk',
    emotion: 'focused',
    dialogue: 'Here is the thing about good animation: it is all in the timing.',
    showSubtitles: true,
  })}
  background="transparent"
/>;`;
    default:
      return '';
  }
}

export function sheetSnippet(id: 'cast' | 'motion' | 'emotion', character: string): string {
  const comp = id === 'cast' ? 'CastSheet' : id === 'motion' ? 'MotionSheet' : 'EmotionSheet';
  const note =
    id === 'cast'
      ? '// Every registered cast member, labelled. Add one to cast.ts and it appears.'
      : id === 'motion'
        ? '// All ten motions in one grid — the animation vocabulary of the rig.'
        : '// All seven expressions, with a deterministic blink.';
  return `import { ${comp}, castSceneSettings } from './src';

${note}
<${comp} {...castSceneSettings('${character}', { motion: 'idle' })} />;`;
}

/**
 * Scene plate snippet. `speed` and `direction` are printed only when they differ
 * from the defaults, so the common case stays a one-liner.
 */
export function sceneSnippet(
  scene: string,
  timeOfDay: string,
  parallax: number,
  extra: { speed?: number; direction?: number } = {},
): string {
  const lines = [
    `  scene="${scene}"`,
    `  timeOfDay="${timeOfDay}"`,
    `  parallax={${parallax}}`,
  ];
  if (extra.speed !== undefined && extra.speed !== 1) lines.push(`  speed={${extra.speed}}`);
  if (extra.direction !== undefined && extra.direction !== 1) lines.push(`  direction={${extra.direction}}`);
  return `import { SceneOnly } from './src';

<SceneOnly
${lines.join('\n')}
/>;`;
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export const PRESET_SNIPPET = `import { parsePreset, serializePresetJSON } from './src';

// Reading: never throws, always returns a result object.
const result = parsePreset(json);
if (result.ok) {
  console.log(result.preset.settings, result.migratedFrom);
} else {
  console.error(result.errors);
}

// Writing: wrapped in the current v${PRESET_SCHEMA_VERSION} envelope.
const file = serializePresetJSON(settings, { name: 'My look' });`;

export const PRESET_IMPORT_EXAMPLE = `{
  "version": 1,
  "name": "Legacy look",
  "settings": {
    "character": "kwame",
    "motion": "walk",
    "environment": "night"
  }
}`;

/* ------------------------------------------------------------------ */
/* Export recipes                                                      */
/* ------------------------------------------------------------------ */

export interface ExportRecipe {
  id: string;
  name: string;
  format: string;
  note: string;
  command: string;
  flags: string;
}

export const EXPORT_RECIPES: ExportRecipe[] = [
  {
    id: 'png',
    name: 'PNG sequence',
    format: 'frames/*.png',
    note: 'The safest alpha path. Every editor, engine and compositor reads it, and nothing is re-encoded.',
    command: 'npm run render:alpha',
    flags: 'remotion render src/remotion/index.ts CharacterOnly renders/frames \\\n  --image-format=png --sequence',
  },
  {
    id: 'prores',
    name: 'ProRes 4444',
    format: 'character.mov',
    note: 'For Premiere, Resolve and Final Cut. The 4444 profile is the one that carries an alpha channel.',
    command: 'npm run render:alpha:prores',
    flags: 'remotion render src/remotion/index.ts CharacterOnly renders/character.mov \\\n  --codec=prores --prores-profile=4444 \\\n  --pixel-format=yuva444p10le --image-format=png',
  },
  {
    id: 'webm',
    name: 'WebM / VP9',
    format: 'character.webm',
    note: 'Small alpha video for the web. Yuva420p keeps the alpha plane; yuv420p would drop it.',
    command: 'npm run render:alpha:webm',
    flags: 'remotion render src/remotion/index.ts CharacterOnly renders/character.webm \\\n  --codec=vp9 --pixel-format=yuva420p --image-format=png',
  },
  {
    id: 'mp4',
    name: 'Opaque MP4',
    format: 'walk.mp4',
    note: 'Review copies and social cuts. H.264 has no alpha, so the scene background is baked in.',
    command: 'npm run render',
    flags: 'remotion render src/remotion/index.ts WalkScene renders/walk.mp4',
  },
];

export const ARCHITECTURE_SNIPPET = `// Deterministic: the id comes from the settings, not from React.
const gradId = stableId('jacket', settings.character, settings.colors.jacket);

// NOT this — useId() differs between renders and breaks parallel rendering:
// const gradId = useId();`;
