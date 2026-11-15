# Stride — 2D character & environment kit for Remotion

[![CI](https://github.com/Ambitious513/2d-character/actions/workflows/ci.yml/badge.svg)](https://github.com/Ambitious513/2d-character/actions/workflows/ci.yml)

A reusable, **frame-deterministic** 2D character rig and environment library you
can drop into any [Remotion](https://remotion.dev) project — plus a live visual
studio for designing shots without writing code.

Six cast members · 10 motions · 7 emotions · 4 environments × 3 lighting passes ·
deterministic lip-sync · alpha-ready export.

```tsx
import { Composition } from 'remotion';
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
);
```

Or let the factory do the boilerplate:

```tsx
import { SceneComposition, CharacterComposition, DialogueComposition } from './src';

export const MyRoot = () => (
  <>
    <SceneComposition id="Hero" character="ada" overrides={{ motion: 'run' }} />
    <CharacterComposition id="HeroAlpha" character="ada" />
    <DialogueComposition id="Chat" speakers={['milo', 'ada']} script={['Hey!', 'Oh, hi.']} />
  </>
);
```

---

## Quick start

```bash
npm install
npm run dev        # visual studio  → http://localhost:5173
                   # docs site      → http://localhost:5173/#/docs
npm run studio     # Remotion Studio (props editor, timeline, render button)
npm run verify     # typecheck + tests + production build
```

### Live docs site

`#/docs` is a full documentation site with **real running `<Player>` examples** —
not screenshots. Nine sections: Overview, Quickstart, **Playground** (every prop
steerable live, with reset / randomize / copy props / preset download),
Compositions, Cast & motion, Scenes, Presets (with a real `parsePreset` importer),
Export and Architecture. The studio stays at `/`; the docs are a lazily loaded
chunk and are **not** part of the library's public surface.

```bash
npm run dev          # then open http://localhost:5173/#/docs
npm run smoke:docs   # 222-check browser gate for the docs route
```

## What's in the box

### Characters
`CharacterRig` draws a full body from a plain-JSON settings object. Proportions
come from a `build` preset, legs are solved with two-bone IK from the real hip
joints, and feet stay planted on the ground (no ice-skating).

| | |
| --- | --- |
| **Cast** | Milo, Ada, Kwame, Juno, Ravi, Pip — extend with `registerCharacter()` |
| **Motions** | walk, run, idle, wave, talk, jump, sit, point, think, dance |
| **Emotions** | neutral, happy, focused, surprised, sad, angry, excited |
| **Wardrobe** | 8 hair styles, 6 outfits, 5 builds, 7 accessories |
| **Lip-sync** | deterministic visemes derived from the dialogue string |

### Environments
`SceneLayer` renders `street`, `park`, `room` or `backdrop`, each with `day`,
`golden` and `night` lighting, parallax depth and a follow camera. Extend with
`registerScene()`.

### Determinism
The rig is a pure function of `(settings, frame, fps)`. No `Math.random()`, no
wall-clock, no `useId()`. The same frame always renders byte-identically — which
is what makes frame-accurate compositing and visual regression testing possible.

---

## Using it in your own project

**Copy-in (today):** copy `src/rig` and `src/remotion` into your project and
import from the barrel (`src/index.ts`). It is the only supported import surface;
reaching into individual files is not. The studio (`src/ui`, `src/App.tsx`) is an
app built *on* the library and is deliberately not exported.

```tsx
import { CharacterRig, SceneLayer, parsePreset, PRESETS } from './src';
```

**Published package (planned):** see `PROGRESS.md` — the `@stride/rig` npm
publish is an open decision, not yet done.

### Presets
Settings round-trip through a versioned envelope, so presets survive upgrades:

```jsonc
{ "version": 2, "name": "Golden hour run", "settings": { "character": "ada", "timeOfDay": "golden" } }
```

```ts
import { parsePreset, serializePresetJSON } from './src';

const result = parsePreset(json);          // never throws
if (result.ok) console.log(result.preset.settings, result.migratedFrom);
else console.error(result.errors);
```

`parsePreset` accepts v2 envelopes, v1 envelopes (`environment` → `timeOfDay`),
the studio's `{name, note, settings}` shape, and bare v1 settings objects. Missing
fields are filled from the **cast registry**, so `{"character": "kwame"}` still
looks like Kwame.

---

## Export

```bash
npm run render              # opaque MP4
npm run render:alpha        # PNG sequence (lossless alpha, most compatible)
npm run render:alpha:prores # ProRes 4444 .mov for video editors
npm run render:alpha:webm   # VP9 WebM with alpha for the web
npm run render:sheet        # cast contact sheet
```

**Alpha renders must pass `--image-format=png`** — the repo config defaults to
JPEG, which has no alpha channel. Full recipes, codec tables and troubleshooting
are in **[docs/EXPORT.md](docs/EXPORT.md)**.

---

## Project layout

```
src/
  index.ts        ← public API barrel (the only supported import surface)
  rig/            ← the library: rig, gait, lip-sync, cast, presets, schema
    environments/ ← street / park / room / backdrop + shared lighting
    parts/        ← face, hair, outfit, accessories
  remotion/       ← compositions, typed factories, Studio root
  ui/             ← visual studio (NOT part of the library)
  docs/           ← live docs site at #/docs (NOT part of the library)
tests/            ← determinism, IK, foot-lock, lip-sync, SVG ids, packaging, visual goldens, kit ZIP
scripts/          ← contact sheets, smoke test, id diagnostics, golden + ZIP generators
docs/             ← architecture, roadmap, export recipes
```

Deeper map: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Documentation

| Doc | What it covers |
| --- | --- |
| [PROGRESS.md](PROGRESS.md) | **Start here if you're picking this up** — current state, what's next |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | module map, data flow, invariants, how to extend |
| [docs/EXPORT.md](docs/EXPORT.md) | alpha/ProRes/WebM recipes, codecs, troubleshooting |
| [docs/ROADMAP.md](docs/ROADMAP.md) | the five phases and their status |
| [docs/DOCS_SITE_PLAN.md](docs/DOCS_SITE_PLAN.md) | the docs site plan and its five completed stages |
| **[/#/docs](http://localhost:5173/#/docs)** | the live docs site itself — start here to see the kit run |

## Checks

```bash
npm run typecheck            # tsc -b
npm test                     # 83 unit + visual-regression tests
npm run build                # production build
npm run verify               # all three
npm run smoke                # studio browser smoke (desktop + mobile)
npm run smoke:docs           # docs browser smoke: 222 checks, desktop + mobile
npm run check:ids            # gradient-id collision diagnostic
npm run check:env-ids        # per-scene lighting gradient diagnostic
npm run update:visual-goldens # regenerate tests/__golden__ after an intended visual change
npm run kit:zip              # regenerate public/stride-remotion-kit.zip from source
```

### Keyboard shortcuts

When the studio has focus (and no input or modal is active):

| Keys | Action |
| --- | --- |
| `←` / `→` | step one frame (`Shift` = ten frames) |
| `Space` | play / pause |
| `1`–`6` | select that cast member |
| `W` / `I` / `R` | walk / idle / run |

## License

See [LICENSE](LICENSE).
