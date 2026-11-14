# Stride roadmap

The kit is built in phases. Each phase ends with a green `npm run verify`, a
refreshed contact sheet and updated docs, so it can be tagged and pushed on its
own.

| Phase | Theme | Status |
| --- | --- | --- |
| 1 | Foundation & character quality | ✅ done |
| 2 | Cast & wardrobe depth | ✅ done |
| 3 | Environment library | ✅ done (weather deferred) |
| 4 | Remotion packaging & presets | ✅ done (npm publish open) |
| 5 | Studio polish, docs site & CI | 🔜 next |

> This file was deleted in commit `e301ed1` and restored from `629708d` during the
> recovery pass. Statuses above reflect the code as it actually stands, not the
> original plan.

---

## Phase 1 — Foundation & character quality ✅

Goal: the repo compiles, the rig is anatomically correct, and every cast member
actually looks like themselves.

**Build repair**

- Restored the missing `PRESETS` export (cast-driven, `rig/presets.ts`).
- Reinstated `Environment` as a deprecated alias of `TimeOfDay`.
- Removed the duplicate `colors` key in `characterSettings`.
- Moved the studio and compositions onto `timeOfDay`, with `environment` still
  accepted from v1 presets.
- Registered the compositions the npm scripts already reference.
- Fit all seven expressions inside the `EmotionSheet` frame.

**Rig correctness**

- Content-hashed SVG gradient ids, so independently rendered rigs never bleed
  palettes into each other (this is what made all six characters orange).
- Leg IK solved from the real hip joints instead of the hip centre, so thigh and
  shin lengths are preserved in the drawing.
- A dedicated standing hip height, so idle/wave/talk/point/think stand upright
  instead of freezing mid-stride.
- Reworked wave, talk and think performances; shoulders moved out to the torso
  edge so arms and hands read clearly.

> ⚠️ The gradient-id fix was **regressed** in `e301ed1` (reverted to `useId()`) and
> re-restored during recovery. It is now guarded by `tests/svg-ids.test.tsx`.
> See `docs/ARCHITECTURE.md` → "Why `stableId()` and not `useId()`".

## Phase 2 — Cast & wardrobe depth ✅

Six cast members (Milo, Ada, Kwame, Juno, Ravi, Pip), each with proportion
overrides and a default look; `registerCharacter()` for custom members.
8 hair styles, 6 outfits, 5 builds, 7 accessory flags, 7 emotions.
Component browser in the studio (`ui/Views.tsx`).

## Phase 3 — Environment library ✅

All four advertised scenes implemented — `street`, `park`, `room`, `backdrop` —
behind a `SceneLayer` registry with `registerScene()`. Shared lighting via
`palette.ts` across `day` / `golden` / `night`, plus parallax depth and a follow
camera.

**Deferred:** weather (rain / snow / fog). No `weather` field exists in
`SceneSettings` yet. Fold into Phase 5 or a Phase 3.1 if wanted.

## Phase 4 — Remotion packaging & presets ✅

- **Single import surface** — `src/index.ts` barrel; studio UI deliberately
  excluded, enforced by test.
- **Typed composition factories** — `SceneComposition`, `CharacterComposition`,
  `DialogueComposition`, `CastCompositions`, each with a plain-data `resolve*`
  twin so timing maths is testable without React.
- **Versioned preset schema** — `PRESET_SCHEMA_VERSION = 2`, `parsePreset` /
  `serializePreset`, accepting v2 envelopes, v1 envelopes, the studio
  `{name, note, settings}` shape and bare v1 settings; `environment` → `timeOfDay`
  migration; cast-aware fill of missing fields.
- **Shared Zod schema** — moved out of `Root.tsx` into `rig/schema.ts` so the
  Studio props editor and the preset loader cannot disagree.
- **Alpha / ProRes export recipes** — `docs/EXPORT.md` plus
  `render:alpha`, `render:alpha:prores`, `render:alpha:webm` npm scripts, guarded
  by `tests/export-recipes.test.ts`.

**Open decision:** publishing to npm as `@stride/rig`. The package is still
`private: true` with no library build / `exports` map. Copy-in consumption works
today. See `PROGRESS.md` → "Open decisions".

## Phase 5 — Studio polish, docs site & CI 🔜

- Keyboard-first studio UX (shortcuts for motion/emotion cycling, frame stepping).
- Docs site with live `<Player>` examples.
- **Visual regression snapshots** — none exist yet. The rig is byte-deterministic,
  so `renderToStaticMarkup` snapshots are cheap and would catch drawing
  regressions that unit tests miss.
- CI matrix that renders a short clip on every PR (needs a runner with enough
  RAM for headless Chrome — see the memory note in `PROGRESS.md`).
- Weather controls, if still wanted.
- Refresh `public/stride-remotion-kit.zip` — the studio's "Download project ZIP"
  button still serves a stale pre-restructure snapshot.
