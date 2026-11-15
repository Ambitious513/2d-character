# Architecture

A map of the codebase for anyone extending it — human or agent. Read
[PROGRESS.md](../PROGRESS.md) first for current state; this doc explains *why the
pieces are shaped the way they are*.

---

## The one rule

**The rig is a pure function of `(settings, frame, fps)`.**

```
SceneSettings + frame + fps  →  samplePose()  →  RigPose  →  SVG
```

No `Math.random()`, no `Date.now()`, no `useId()`, no module-level mutable
counters in the render path. The same inputs must always produce byte-identical
markup. Everything else in this document follows from that rule.

Why it matters: Remotion renders frames in parallel, out of order, across
multiple browser tabs, and re-renders individual frames on scrub. Anything
non-deterministic produces flicker that only shows up in the final video.

---

## Layers

```
┌──────────────────────────────────────────────────────────┐
│ src/ui + src/App.tsx        visual studio (an APP)        │  not exported
│ src/docs + #/docs           live docs site (an APP)       │  not exported
├──────────────────────────────────────────────────────────┤
│ src/remotion                compositions + factories      │  exported
├──────────────────────────────────────────────────────────┤
│ src/rig                     the LIBRARY                   │  exported
└──────────────────────────────────────────────────────────┘
                    src/index.ts = the only public door
```

The studio is a consumer of the library, exactly like a host app would be. If a
feature only works via the studio, it belongs in the wrong layer. The docs site
is the second such consumer — and the proof that the barrel is enough to build
on, since every example on it imports from `src/index.ts`.

---

## `src/rig` — the library

| Module | Responsibility |
| --- | --- |
| `types.ts` | The whole public vocabulary: `Motion`, `Emotion`, `SceneId`, `CharacterSettings`, `SceneSettings`, `Proportions`, plus `DEFAULT_SETTINGS` and the UI label lists. All plain JSON. |
| `definition.ts` | Body model. `BASE_PROPORTIONS`, `BUILD_PRESETS`, `resolveProportions`, `skeletonOf` — turns proportions into joint positions. |
| `cast.ts` | Cast registry. `CAST` (6 members), `registerCharacter`, `characterSettings`, `castSceneSettings`. Each member supplies proportion overrides + a default look. |
| `gait.ts` | Motion engine. `samplePose` is the heart; two-bone IK (`solveKnee`, `solveJoint`), gait parameters, foot-lock. Also frame constants (`FPS=30`, `DURATION=300`, `WIDTH=1280`, `HEIGHT=720`). |
| `lipsync.ts` | Deterministic speech: text → syllables → viseme cues (`buildSpeech`, `visemeAt`, `mouthOpenness`). |
| `dialogue.ts` | Multi-turn timing: `dialogueSchedule`, `dialogueDuration`, `turnAt`, `wrapLines`. |
| `Character.tsx` | `CharacterRig` (full body), `Character`, `CharacterHead`. Assembles parts against a `RigPose`. |
| `parts/` | `Face`, `Hair` (back/front layers), `Outfit`, `Accessories`. Pure drawing, no motion logic. |
| `environments/` | Scene registry + `street`, `park`, `room`, `backdrop`; `palette.ts` (lighting), `shared.tsx` (repeating scenery helpers). |
| `color.ts` | `shade()` — lighten/darken a hex colour. |
| `id.ts` | `stableId()` — content-hashed SVG ids. **See below.** |
| `schema.ts` | Zod schemas: `sceneSchema` (Studio editor) and `presetSettingsSchema` (partial, for files). |
| `preset.ts` | Versioned preset envelope: `parsePreset`, `serializePreset`, v1 migration. |
| `presets.ts` | 8 built-in `PRESETS` used by the studio. |
| `Street.tsx` | Back-compat shim → `environments/Street`. Keep until a major version. |

### Why `stableId()` and not `useId()`

This is the bug that made **every cast member wear Milo's jacket**, and it is the
single most important thing not to regress.

A contact sheet renders each character through its **own** `renderToStaticMarkup`
call, then concatenates the SVG fragments. `useId()` restarts its counter per
React root, so all six characters emitted `<linearGradient id="garment-R0">`.
In a single document the first definition wins, so all six garments resolved to
the first palette.

`stableId(prefix, ...parts)` hashes the values that fully define the gradient
(FNV-1a). That gives three properties at once:

1. **Deterministic** — same props, same id, byte-stable markup.
2. **Collision-safe across roots** — different palettes get different ids.
3. **Self-deduplicating** — identical gradients collapse to one definition.

> **Rule:** every value that affects the rendered gradient MUST be passed to
> `stableId`. Omit one and two visually different gradients will share an id.

Guarded by `tests/svg-ids.test.tsx` (14 tests), including the exact
concatenated-fragments contact-sheet case. Diagnostics: `npm run check:ids`,
`npm run check:env-ids`.

### Settings resolution order

```
cast member defaults  →  build proportions  →  explicit overrides  →  proportions?
```

`castSceneSettings(id, overrides)` is the canonical entry point. A minimal preset
like `{"character": "kwame"}` must still look like Kwame — never fall back to a
flat `DEFAULT_SETTINGS` when a cast id is present.

### Backwards compatibility

v1 called the lighting pass `environment`; v2 calls it `timeOfDay`. Both
`mergeSettings()` (compositions) and `parsePreset()` (files) map the old key, and
**explicit `timeOfDay` always wins**. The deprecated `Environment` type alias
still lives in `types.ts`.

---

## `src/remotion` — compositions

| File | Contents |
| --- | --- |
| `Compositions.tsx` | `WalkScene`, `CharacterOnly`, `SceneOnly`, `StreetOnly`, `CastScene`, `CastSheet`, `MotionSheet`, `EmotionSheet`, `TalkingHead`, `DialogueScene`, `Subtitles`, `mergeSettings`, `DEFAULT_SCRIPT`. |
| `factories.tsx` | `SceneComposition`, `CharacterComposition`, `DialogueComposition`, `CastCompositions` + a `resolve*` twin for each. |
| `Root.tsx` | Ready-made Studio root, foldered: Scenes / Character / Sheets / Cast. Re-exports `sceneSchema` for v2.0–2.1 hosts. |
| `index.ts` | `registerRoot(RemotionRoot)` — the CLI entry point. |

**Factories are split in two on purpose.** `resolveSceneComposition()` returns
plain data (props + geometry, no React), and `SceneComposition()` is a thin
wrapper that feeds it to `<Composition>`. That keeps the timing maths unit-
testable without rendering, and lets hosts build their own `<Composition>`.

`resolveDialogueComposition` derives `durationInFrames` from the script itself
(honouring `speechRate`), so a conversation can never be cut off mid-word.

`CharacterOnly` is the alpha plate: 720×720, transparent `AbsoluteFill`, guides
forced off.

---

## `src/ui` — the studio

`App.tsx` + `Controls.tsx` (inspector), `Timeline.tsx`, `Dialogs.tsx` (save/export),
`Views.tsx` (component browser, guide), `utils.ts`. Uses `@remotion/player` for
live playback. **Never imported by the library** — `tests/packaging.test.tsx`
asserts the barrel does not leak it.

---

## `src/docs` — the live docs site (`#/docs`)

Lazily loaded by `src/main.tsx` on the `#/docs*` hash routes; `/` and `#/studio`
still render the studio. Hash routing needs no server rewrites, so one build works
in dev, in `vite preview` and on any static host.

| File | Responsibility |
| --- | --- |
| `DocsSite.tsx` | shell, numbered nav + scrollspy, hero, quickstart, export, architecture, toasts. Owns the playground state so other sections can load a look into it. |
| `DocsPlayer.tsx` | the real `<Player>` + Stride transport, error fallback, reduced-motion autoplay opt-out, `numberOfSharedAudioTags={0}`. |
| `Playground.tsx` | controlled component: every prop steerable, live snippet, reset / randomize / copy / download. |
| `CompositionExplorer.tsx`, `CastMotionExplorer.tsx`, `SceneExplorer.tsx`, `PresetPanel.tsx` | the four live explorers. |
| `controls.tsx` | shared `Segmented` / `Slider` / `Select` / `Switch` so the explorers cannot drift from the playground. |
| `snippets.ts` | pure snippet generators — the code shown is generated from the settings being rendered. |

Randomize uses `Math.random()` **in the UI only**: it picks settings. The render
path stays pure.

---

## Tests

| Suite | n | Guards |
| --- | --- | --- |
| `rig.test.ts` | 6 | IK maths, joint solving |
| `library.test.tsx` | 24 | determinism, foot-lock, lip-sync, cast, environments |
| `svg-ids.test.tsx` | 14 | gradient-id collisions across React roots |
| `packaging.test.tsx` | 30 | public barrel, **docs/studio leak guards**, preset envelope + v1 migration, factories |
| `export-recipes.test.ts` | 6 | alpha recipes stay valid (PNG frames, 4444 profile) |
| `visual.test.tsx` | 2 | 48 golden hashes (cast × motion × emotion, scene × lighting) |
| `kit-zip.test.ts` | 1 | downloadable ZIP matches the current source tree |
| **total** | **83** | |

Two of those tests are structural: one asserts no docs symbol is exported, the
other **walks the relative-import graph from `src/index.ts`** and fails if any
reachable module touches `src/docs`, `src/ui`, `App.tsx` or `main.tsx`. A renamed
re-export cannot sneak past it.

Run `npm run verify` (typecheck + tests + build) before every commit. CI also runs:

- `npm run smoke` — the studio at `/`, desktop + mobile.
- `npm run smoke:docs` — **222 checks** over `#/docs` (`scripts/docs-smoke.mts`),
  run against the **production build** served by `vite preview`: shell, hero
  transport, every playground control and action, all four explorers, preset
  validation/migration, the served kit ZIP, mobile 390×844 and reduced motion.
- `render-smoke` — 10 real PNG frames of `CharacterOnly`.

---

## How to extend

**Add a cast member** — `registerCharacter({ id, name, tagline, colors, proportions, … })`
before your root renders. It appears in `CastCompositions()` and the studio
automatically.

**Add an environment** — write a component taking `EnvironmentLayerProps`, then
`registerScene('cafe', CafeLayer)`. Add the id to `SceneId` and `sceneSchema`'s
`scene` enum, and give it a palette entry per lighting pass. Use `stableId` for
every gradient.

**Add a motion** — extend the `Motion` union, `MOTIONS`, `sceneSchema`'s `motion`
enum, and handle it in `samplePose`. Add it to `MotionSheet`. If it translates
the character, add it to `LOCOMOTION`.

**Add a settings field** — `types.ts` → `DEFAULT_SETTINGS` → `schema.ts` →
inspector. If the meaning of an existing field changes, bump
`PRESET_SCHEMA_VERSION` and add a migration in `parsePreset`.

### Checklist for any change

- [ ] No new non-determinism in the render path
- [ ] Every new gradient uses `stableId` with all defining inputs
- [ ] `npm run verify` green
- [ ] `npm run smoke` and `npm run smoke:docs` green if you touched UI
- [ ] `npm run kit:zip` rerun if you changed packaged source or docs
- [ ] `PROGRESS.md` updated
