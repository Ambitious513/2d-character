# Stride — Milo Character Lab

A reusable, frame-driven 2D character and street environment for [Remotion](https://www.remotion.dev/), plus a live visual studio for posing, tuning, previewing and exporting.

> **About your reference folder:** this build could not read `C:\Users\USER\Desktop\REMOTION 2D CHARACTER` because that is a local Windows path and no files were attached to the conversation. The shipped character is an original, editable SVG rig. Use **Match a reference** in the studio to upload your sheets locally, compare proportions/colors, and edit `src/rig/Character.tsx` for an exact match. Nothing is uploaded to a server.

## Quick start

```bash
npm install
npm run dev        # visual studio → http://localhost:5173
npm run studio     # Remotion Studio with the same compositions
npm run build      # type-check + production build
npm test           # deterministic gait / IK / foot-lock tests
```

Open the studio, press play, and tune the permanently visible inspector. Every control updates the Remotion Player live.

## What is included

| Piece | File | Use |
| --- | --- | --- |
| `CharacterRig` | `src/rig/Character.tsx` | Articulated SVG `<g>`; origin is the ground between the feet. Drop into any `<svg>`. |
| `Character` | `src/rig/Character.tsx` | Standalone transparent SVG component (`viewBox="0 0 400 480"`). |
| `CharacterHead` / `Face` | `src/rig/Character.tsx` | Five expressions + deterministic blink for reaction shots and sheets. |
| `StreetLayer` / `Street` | `src/rig/Street.tsx` | Layered parallax street: skyline, trees, shops, sidewalk, road, lamps, leaves. |
| `WalkScene` | `src/remotion/Compositions.tsx` | Full character + street composition. |
| `CharacterOnly` | `src/remotion/Compositions.tsx` | Transparent character for alpha compositing. |
| `StreetOnly` | `src/remotion/Compositions.tsx` | Environment-only plate. |
| `EmotionSheet` | `src/remotion/Compositions.tsx` | Five-expression overview. |
| Gait solver | `src/rig/gait.ts` | Pure pose sampler, two-bone IK, stance/swing timing, foot-lock math. |
| Types & presets | `src/rig/types.ts` | All props, defaults, emotion/motion metadata, seeded presets. |

Registered compositions live in `src/remotion/Root.tsx` and are registered by `src/remotion/index.ts`.

## Reuse in your own Remotion project

Copy `src/rig` and `src/remotion` into your project, install `remotion`, `react`, `react-dom`, then register the root:

```tsx
import { registerRoot } from 'remotion';
import { RemotionRoot } from './remotion/Root';

registerRoot(RemotionRoot);
```

Or register a single composition with your exported preset:

```tsx
import { Composition } from 'remotion';
import { WalkScene } from './remotion/Compositions';
import preset from './milo-preset.json';

export const MyVideo = () => (
  <Composition
    id="MiloWalk"
    component={WalkScene}
    durationInFrames={300}
    fps={30}
    width={1280}
    height={720}
    defaultProps={preset}
  />
);
```

Use the rig directly inside another SVG scene:

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';
import { CharacterRig } from './rig/Character';
import preset from './milo-preset.json';

export const MyScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1280 720">
        <g transform="translate(640 590) scale(1.18)">
          <CharacterRig settings={preset} frame={frame} fps={fps} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
```

## Render

```bash
npm run render     # renders/walk.mp4 (WalkScene)
npm run still      # renders/character.png at frame 60

# Transparent PNG sequence for compositing:
npx remotion render src/remotion/index.ts CharacterOnly renders/frames \
  --image-format=png --sequence

# Higher resolution:
npx remotion render src/remotion/index.ts WalkScene renders/walk-1080.mp4 --scale=1.5
```

The default composition is 1280×720 at 30 fps, 300 frames (10 seconds). Change `FPS`, `DURATION`, `WIDTH`, `HEIGHT` in `src/rig/gait.ts` and the matching values in `Root.tsx` if you need a different format.

## Props

`SceneSettings` (all optional on compositions; defaults are merged):

```ts
{
  motion: 'walk' | 'run' | 'idle' | 'wave',
  emotion: 'neutral' | 'happy' | 'focused' | 'surprised' | 'sad',
  speed: number,          // 0.25–2 multiplier
  stride: number,         // 0.5–1.6 multiplier
  bounce: number,         // 0–1.5
  armSwing: number,       // 0–1.5
  scale: number,          // character scale
  direction: 1 | -1,      // 1 = right, -1 = left
  colors: { skin, hair, jacket, pants, shoes },
  backpack: boolean,
  glasses: boolean,
  environment: 'day' | 'golden' | 'night',
  parallax: number,       // 0–1
  guides: boolean,
  followCamera: boolean,  // true = character centered, street scrolls
}
```

## How the walk stays grounded

The gait is a pure function of `frame / fps`:

1. `cycleDuration = (2 * stepLength) / speed` — two steps per cycle.
2. Each leg is offset by half a cycle. During **stance** (62% walk, 40% run) the foot moves backward relative to the body at exactly the ground speed. During **swing** it returns forward with a raised, smooth trajectory.
3. A two-bone IK solver places the knee between hip and ankle while preserving segment lengths.
4. Heel strike, flat foot and toe roll keep the sole in contact with the ground during stance.
5. In follow-camera mode the street scrolls at the same rate; in fixed-camera mode the character root translates instead. Either way, planted feet stay locked to the sidewalk.

`tests/rig.test.ts` verifies determinism, IK lengths, zero foot slip across motions/directions/camera modes, finite values at slider extremes, and trajectory continuity at stance/swing and cycle boundaries.

## Studio features

- Remotion Player with custom transport: play/pause, frame step, scrub, loop, playback rate.
- Street scene / transparent character preview.
- Five live expressions: neutral, happy, focused, surprised, sad.
- Motion: walk, run, idle breathing, friendly wave.
- Live sliders: speed, stride, bounce, arm swing, scale, parallax, reference opacity.
- Direction, five color pickers, backpack/glasses toggles, day/golden/night environments, follow camera, rig guides.
- Local reference-image overlay (up to 8 images, never uploaded).
- Presets: three seeded looks, save/load/delete custom presets in localStorage, undo after destructive actions.
- Export: props JSON, current-frame SVG, React usage snippet, complete project ZIP.
- Components and Remotion guide views.
- Responsive desktop/mobile layouts, custom scrollbars, keyboard shortcuts (`Space`, `←`/`→`, `Shift`+arrows).

No sound is included: this is a silent visual animation tool, and the rendered character/street assets carry no audio.

## Editing the character for an exact reference match

- Shapes, hair, face and clothing: `src/rig/Character.tsx`.
- Default colors and presets: `src/rig/types.ts`.
- Proportions/segment lengths: `THIGH`, `SHIN` and the hip/shoulder/head offsets in `src/rig/gait.ts`.
- Street palette and storefronts: `src/rig/Street.tsx`.

All visuals are inline SVG. There are no external image assets, no `Math.random()` at render time, no timers driving animation, and no network calls inside compositions, so parallel Remotion renders are deterministic.

## License note

Remotion is source-available with its own license. It is free for individuals and small teams; larger companies require a company license. Review the official terms before shipping: <https://www.remotion.dev/license>. The character/street code in this kit is provided for your project; replace or adapt it freely.
