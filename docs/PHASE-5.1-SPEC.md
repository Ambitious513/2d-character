# Phase 5.1 — CI hardening + Weather

**Spec & resumable implementation plan.** Written 2026-11-15 against `main` @ `567e7e4`
(kit `2.2.0`, CI run 25 green). This file is the contract: an agent picking the work up
mid-flight should be able to resume from §7 without re-deriving anything.

> **Status: SPEC ONLY — no implementation has landed.** No `weather` field exists in
> `src/rig/types.ts` at the time of writing. Every code block below is *proposed*, not
 * shipped. Do not cite this file as evidence that weather works.

**Scope:** two tasks, in order.

| Task | What | Why first | Est. |
| --- | --- | --- | --- |
| **T0 — CI hardening** | De-flake the studio smoke, bump deprecated actions, add job timeouts + run cancellation | Weather touches the studio inspector and docs playground, i.e. exactly what `browser-smoke` clicks. A flaky gate makes a weather regression indistinguishable from noise. | ~1 h |
| **T1 — Weather** | `rain` / `snow` / `fog` as one deterministic overlay layer, then studio + docs | The last deferred Phase 3 item and the only open roadmap feature. Additive, non-breaking, needs no owner decision. | ~0.5–1 d |

> **EXECUTION RULE — commit AND push, every stage.** A stage (Step 0, T0, T1a, T1b,
> closeout) is finished **only** when it is committed *and* pushed to `origin/main`
> **and** its CI run is confirmed green on GitHub (§7.4). A local-only commit is an
> **incomplete** stage. Never stop at `git commit`, never leave a finished stage
> unpushed, and never open the next stage before the previous one is pushed + green.

**Non-goals (do not drift into these):** npm publish as `@stride/rig`, dropping the v1
shims, ProRes/WebM render verification, any change to gait/IK/lip-sync, any fourth
lighting pass, any new dependency. Both open owner decisions stay open — see §8.

---

## 1. Why weather is cheaper than the roadmap implies

`PROGRESS.md` describes a seven-hop chain (`types → schema → palettes → scene renderers
→ studio → docs → goldens`), which reads like four scene rewrites. It is not. The
environment layer already has a single funnel:

- `SceneLayer` (`src/rig/environments/index.tsx`) is the one entry point every
  composition uses, and it already owns a registry (`registerScene`).
- `resolveEnvironment()` (`src/rig/environments/types.ts`) is where every environment
  default is resolved.
- All four scenes read `paletteFor(timeOfDay)` and tile through `shared.tsx`'s
  `TILE = 1600` / `offset(distance, direction, factor)` / `<Repeating>`.

So weather is **one overlay component plus one resolved field**, and `street`, `park`,
`room`, `backdrop` *and any host-registered scene* get it for free. No scene file needs
to change. Estimated ~300 lines of rig + ~250 lines of tests, then ~150 for studio/docs.

---

## 2. T0 — CI hardening

### T0.1 — Kill the latent studio-smoke flake (the real one)

**Defect.** `scripts/smoke.mjs` clicks `SVG frame` immediately after
`.export-modal` appears:

```js
await page.getByRole('button', { name: /Export kit/ }).click();
await page.waitForSelector('.export-modal');
await page.getByRole('button', { name: 'SVG frame' }).click();   // ← races the entrance animation
```

`.modal` runs `animation: pop .18s ease` (`src/styles.css:215`) and `.modal-backdrop`
runs `fade .15s` (:214). Playwright's actionability check requires a *stable* bounding
box, so a slow runner produces `element is not stable`. `PROJECT-REVIEW.md` §"Still
latent" already flags this as a real CI intermittency risk. It has not fired yet in
runs 19–25; it is a timing lottery, not a fixed bug.

**Fix (both halves, ~10 lines):**

1. `src/styles.css` already has a global reduced-motion block at :317
   (`animation-duration: .01ms !important`). The app therefore *already* de-animates
   under `prefers-reduced-motion: reduce` — no CSS change is needed. Verify it still
   covers `.modal` / `.modal-backdrop` / `.toast` (it uses `*`, so it does).
2. `scripts/smoke.mjs`: create both contexts with `reducedMotion: 'reduce'`, and wait
   for animations to settle before the first in-modal click:

```js
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
// …
await page.waitForSelector('.export-modal');
await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
await page.getByRole('button', { name: 'SVG frame' }).click();
```

Apply the same `reducedMotion: 'reduce'` to the `mobile` context. `scripts/docs-smoke.mts`
already does this for its calm context (:757) — this makes the two harnesses consistent.

**Also harden while in the file (cheap, same class of bug):** the `.toast` is
`position: fixed; bottom: 24px; left: 50%` and can sit under the next click target.
After each `waitForSelector('.toast')`, wait for it to detach
(`waitForSelector('.toast', { state: 'detached' })`) before the next click.

**Do not** add `waitForTimeout` padding or a retry loop — that hides the race instead
of removing it, and rule 2's spirit (determinism) applies to harnesses too.

**Acceptance:** `npm run smoke` passes 5× in a row against the production build with no
`element is not stable` and no added sleeps.

### T0.2 — Bump the deprecated actions

CI run 24/25 emit: *"Node.js 20 is deprecated… `actions/checkout@v4`,
`actions/setup-node@v4`, `actions/upload-artifact@v4` are being forced to run on
Node.js 24."* Green today, borrowed time. Latest majors verified via the GitHub API on
2026-11-15:

| Action | Current in `ci.yml` | Target |
| --- | --- | --- |
| `actions/checkout` | `v4` | `v7` (latest release `v7.0.1`) |
| `actions/setup-node` | `v4` | `v7` (latest release `v7.1.0`) |
| `actions/upload-artifact` | `v4` | `v7` (latest release `v7.0.2`) |

Keep the project's `node-version: 20` **unchanged in this commit** — the warning is about
the *action's* runtime, not the project's. Bumping the project to 22 LTS is a separate,
optional commit so a failure can be attributed cleanly.

### T0.3 — Bound the jobs, cancel superseded runs

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

and `timeout-minutes: 12` on `verify`, `20` on `browser-smoke`, `15` on `render-smoke`.
Rationale: the doc+ZIP commit pattern (rule 11) pushes twice in quick succession; today
both runs complete fully. Observed durations: verify 36 s, browser-smoke 124 s,
render-smoke 48 s — the timeouts are ~10× headroom, not tight.

### T0.4 — Verification for T0

```bash
npm ci
npm run verify                       # typecheck + 85 tests + build
npm run build && npm run preview &   # serve :4173
BASE_URL=http://localhost:4173 npm run smoke        # ×5, all pass
BASE_URL=http://localhost:4173 npm run smoke:docs   # 222 checks, 0 failed
npm run kit:zip                      # rule 11 — ci.yml/scripts/styles are tracked
```

Then push and confirm **all three jobs** green via the Actions API (§7.4). If
`browser-smoke` fails on an action bump, revert T0.2 only and re-run — T0.1 is
independent.

**Sandbox note:** this environment is capped at ~1 GB RAM. `vite dev` + Chromium
crashes here; always smoke against `npm run build` + `npm run preview`. That is not a
defect, and CI's `browser-smoke` runs the studio half on `dev` with a bigger runner.

---

## 3. T1 — Weather: API contract

### 3.1 Types (`src/rig/types.ts`)

```ts
/** Atmospheric overlay drawn over any scene. 'clear' renders nothing at all. */
export type Weather = 'clear' | 'rain' | 'snow' | 'fog';

export const WEATHERS: { id: Weather; label: string; note: string }[] = [
  { id: 'clear', label: 'Clear', note: 'No overlay — byte-identical to v2.2.0' },
  { id: 'rain',  label: 'Rain',  note: 'Slanted streaks, splashes, wet sheen' },
  { id: 'snow',  label: 'Snow',  note: 'Swaying flakes, ground accumulation' },
  { id: 'fog',   label: 'Fog',   note: 'Drifting banded haze, veils the character' },
];
```

`SceneSettings` gains **one** field, next to `parallax`:

```ts
  /** Atmospheric overlay. Defaults to 'clear', which draws nothing. */
  weather: Weather;
```

`DEFAULT_SETTINGS.weather = 'clear'`.

### 3.2 Schema (`src/rig/schema.ts`)

```ts
export const weatherSchema = z.enum(['clear', 'rain', 'snow', 'fog']);
// sceneSchema:
  weather: weatherSchema,
```

`presetSettingsSchema` is `sceneSchema.extend({...}).partial()`, so it becomes optional
automatically — **old presets keep parsing**, and `parsePreset` fills `weather: 'clear'`
from the cast defaults.

### 3.3 Preset version — stays 2

`PRESET_SCHEMA_VERSION = 2` is **not** bumped. The rule in `src/rig/preset.ts` is "bump
when the meaning of an *existing* field changes"; this is an additive field with a
neutral default. Older kit versions reading a new preset strip the unknown `weather`
key (zod's default behaviour) and render clear, which is the correct degradation.
`serializePreset` will start emitting `weather` — assert that in a test.

### 3.4 Environment props (`src/rig/environments/types.ts`)

```ts
export interface EnvironmentLayerProps {
  // …
  /** Atmospheric overlay. 'clear' (default) draws nothing. */
  weather?: Weather;
}
```

`resolveEnvironment` returns `weather: props.weather ?? 'clear'`. Because
`ResolvedEnvironment` is `Required<Omit<EnvironmentLayerProps, 'environment'>>`, adding
the optional prop extends the resolved type automatically — no other signature changes.

### 3.5 The byte-identical invariant (the acceptance criterion that matters)

**`weather: 'clear'` must produce byte-identical markup to v2.2.0.** That keeps all
**48 existing golden hashes untouched** (36 rig = 6 cast × 3 motions × 2 emotions, plus
12 scene = 4 scenes × 3 lighting passes), so the change is provably non-regressive.

The trap: wrapping the renderer unconditionally would add a `<g>` and break every scene
golden. `SceneLayer` must early-return:

```tsx
export function SceneLayer({ scene = 'street', ...rest }: SceneLayerProps) {
  const Renderer = getScene(scene);
  const { weather } = resolveEnvironment(rest);
  if (weather === 'clear') return <Renderer {...rest} />;        // ← unchanged output
  return (
    <g data-weather={weather}>
      <Renderer {...rest} />
      <WeatherLayer {...resolveEnvironment(rest)} pass="back" indoor={isIndoor(scene)} />
    </g>
  );
}
```

`data-weather` is emitted **only** when weather is active, for the same reason. The
studio stage and docs players get a `data-weather` attribute on their wrapper (always
present, defaults to `clear`) so smoke tests can assert state without depending on SVG
internals.

### 3.6 Two passes, because weather must cross the character

Rain in front of the character and fog veiling the character are what make the effect
read as depth rather than a decal. `SceneLayer` draws the **back** pass (it sits behind
`CharacterRig` in every composition). A second, exported **front** pass is drawn by the
compositions after the character:

```tsx
// src/rig/environments/Weather.tsx
export function WeatherLayer(props: ResolvedEnvironment & { pass: 'back' | 'front'; indoor?: boolean })
// thin convenience wrapper for compositions:
export function WeatherFront({ settings, frame, fps }: …)   // null when weather === 'clear'
```

Call sites to update in `src/remotion/Compositions.tsx` (5 `SceneLayer` uses today, at
:104, :150, :225, :262, :424): add `<WeatherFront …/>` after the character in
`WalkScene`, `DialogueScene`, `CastScene` and the scene-sheet composition.
**`CharacterOnly` (:124) must never get weather** — it is the 720×720 transparent alpha
plate and draws no `SceneLayer` at all. Leave it alone and assert it in a test.

Both passes are exported from `src/rig/environments/index.tsx` and re-exported through
`src/index.ts` (the only public surface). Studio/docs must still never leak into the
barrel — `tests/packaging.test.tsx` walks the import graph and will catch a mistake.

---

## 4. T1 — Determinism contract

This is the project's #1 historical bug class (gradient ids shipped broken twice), and
particles are exactly what an agent reaches for `Math.random()` on. **Every particle is
a pure function of `(index, time, distance, direction, weather, palette)`.**

### 4.1 The hash (no clocks, no randomness, no counters)

Add to `src/rig/environments/weather-math.ts` (pure, typechecked, unit-testable):

```ts
/** Deterministic [0,1) from an integer pair. Integer avalanche, engine-stable. */
export function hash01(i: number, salt: number): number {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000;
}

/** Wrap into [-TILE, 0) exactly like shared.tsx offset(), so tiling is seam-free. */
export function wrap(value: number, span: number): number {
  return ((value % span) + span) % span;
}
```

`Math.imul` is deterministic across engines; do **not** use `Math.sin` of a wall clock,
`Date.now()`, `performance.now()`, module-level counters or `useId()`. SVG gradient ids
come from `stableId('wx', weather, pass, p.skyTop, p.skyBottom, …everyDefiningInput)`
(`src/rig/id.ts`), never `useId()`.

### 4.2 Particle motion

```
span   = 720 + 2 * BLEED           // BLEED = 80, so streaks enter/exit off-canvas
y      = wrap(y0 + speed * time, span) - BLEED
x      = wrap(x0 + wind * time - direction * distance * factor, TILE)
sway   = sin(time * swayHz + i) * swayAmp          // snow only
```

`x0 = hash01(i, 1) * TILE`, `y0 = hash01(i, 2) * span`, and every per-particle constant
(speed, length, opacity, radius) is `lerp(min, max, hash01(i, k))` for a distinct salt
`k`. Draw the particle field inside `<Repeating x={…}>` so the `TILE` wrap is invisible,
exactly as the scenes already do for skyline/shops/ground.

`time` is `frame / fps`, passed in by the composition — never read from a clock.
`distance` is `pose.distance * settings.scale`, so precipitation parallaxes with the
world at the same ground speed the feet are planted at.

### 4.3 Tests that enforce it (`tests/weather.test.tsx`, new)

1. **Clear identity** — `SceneLayer` with `weather="clear"` is byte-identical to
   `SceneLayer` with no `weather` prop, for all 4 scenes × 3 lighting passes.
2. **Frame-order independence** — render frames `[90, 0, 37, 7]` in that order, then
   `[0, 7, 37, 90]`; markup per frame must match byte-for-byte.
3. **Repeat-render stability** — same inputs twice ⇒ identical markup (both passes).
4. **Tile continuity** — the particle set at `distance = d` and `d + TILE / factor`
   is identical; no particle lands outside `[-TILE, 1280 + TILE]`.
5. **Node budget** — rain ≤ 130 elements, snow ≤ 100, fog ≤ 10 per pass (see §5.4).
6. **Indoor rule** — `room` + `rain`/`snow` emits **zero** precipitation particles.
7. **Palette orthogonality** — `paletteFor(tod)` output is unchanged by weather;
   weather never mutates `PALETTES`.
8. **Alpha plate purity** — `CharacterOnly` markup contains no `data-weather` and no
   weather particle markers, at any weather setting.
9. **Ids** — extend `tests/svg-ids.test.tsx`: weather gradients dedupe across roots,
   differ per weather/palette, and every `url(#…)` resolves.
10. **Schema/preset** — `parsePreset({ character: 'kwame' })` ⇒ `weather: 'clear'`;
    `parsePreset` of a v1 envelope ⇒ `clear`; `serializePreset` round-trips `snow`;
    `PRESET_SCHEMA_VERSION === 2`; an invalid `weather: 'hail'` returns readable errors.
11. **Determinism audit** — the existing `Math.random` / `Date.now` / `useId` grep over
    `src/rig` + `src/remotion` must still return zero hits with the new files included.

---

## 5. T1 — Visual spec

Authored on the existing **1280 × 720** canvas, ground line **`GROUND_Y = 590`**,
sidewalk band `548–640`, road `654–720`. Colours derive from `paletteFor(timeOfDay)` so
weather re-lights with the world; no new palette entries and no fourth lighting pass.

### 5.1 Rain

| Element | Pass | Count | Geometry | Motion | Colour / opacity |
| --- | --- | --- | --- | --- | --- |
| Far streaks | back | 90 | length 18–34 px, width 1.6–2.4 px, slant 12° | 900–1300 px/s down, wind +90 px/s | `mix(p.skyBottom, #FFFFFF, .35)`, α .18–.38 |
| Near streaks | front | 16 | length 44–70 px, width 3–4 px, slant 12° | 1500 px/s | same hue, α .22 |
| Ground splashes | back | 14 | 6–10 px arcs at y 588–602 | 0.35 s cycle, phase `hash01(i,7)` | `#FFFFFF` α .30 |
| Overcast veil | back | 1 | full-frame rect | static | `p.ink` α .10 |
| Wet sheen | back | 5 | ellipses rx 30–70, ry 3–6 on sidewalk | static | `p.skyBottom` α .12 |

### 5.2 Snow

| Element | Pass | Count | Geometry | Motion | Colour / opacity |
| --- | --- | --- | --- | --- | --- |
| Far flakes | back | 70 | r 1.6–3.2 | 60–110 px/s down, sway `sin(t*0.6 + i) * 18` | `#F7FBFF` α .50–.85 |
| Near flakes | front | 12 | r 4–6.5 | 130 px/s, sway ×1.6 | `#F7FBFF` α .75 |
| Ground cap | back | 1 | 4 px band at y 586–590, rounded | static | `#F7FBFF` α .55 |
| Sky lift | back | 1 | full-frame rect | static | `#FFFFFF` α .06 |

### 5.3 Fog

| Element | Pass | Count | Geometry | Motion | Colour / opacity |
| --- | --- | --- | --- | --- | --- |
| Band A (far) | back | 1 | y 300–420, linear gradient | drift `sin(t*0.05) * 30` | `p.skyBottom` → transparent, α .18 |
| Band B (mid) | back | 1 | y 420–540 | drift ×1.4, opposite sign | α .26 |
| Band C (near) | back | 1 | y 540–650 | drift ×1.9 | α .34 |
| Character veil | front | 1 | full-frame + bottom-weighted gradient | static | `p.skyBottom` α .12 / .22 |

Fog **must** include the front veil, otherwise the character reads as pasted on top of
the haze. No SVG `filter`/`feGaussianBlur` anywhere: filters are slow at 1280×720, render
inconsistently across Chromium versions, and would put the visual goldens at the mercy
of the rasteriser. Banded gradients give the same read for free.

### 5.4 Budgets and the indoor rule

- **Node budget per pass:** rain ≤ 130, snow ≤ 100, fog ≤ 10. Asserted in tests, not
  timed (timing is machine-dependent and would make CI flaky).
- **`room` is indoors.** `isIndoor(scene)` ⇒ `room`. Rain/snow emit **no particles**
  indoors; only the veil at **×0.35** opacity. Fog indoors is allowed at **×0.45**.
  `backdrop` is a studio cyclorama and takes the full effect (it is a look, not a place).
  Host scenes registered via `registerScene` are treated as outdoors unless the id is
  in the indoor set.
- **No intensity knob in v1.** Fixed per-type density. Fewer knobs ⇒ smaller golden
  matrix; add `weatherIntensity` later only if the owner asks.

### 5.5 Visual goldens

`tests/visual-goldens.tsx` currently hashes 48 entries. Extend `renderSceneLayer` with a
`weather` argument and add the **full cross** `4 scenes × 3 lighting × 3 active weathers
= 36` new entries ⇒ **84 total**. The 48 existing keys and hashes must not change
(§3.5 is what guarantees that). Keys: `scene:street:golden:rain`.

`VISUAL_GOLDEN_VERSION` stays **1** — the snapshot *format* is unchanged; only the matrix
grew. Regenerate with `npm run update:visual-goldens`, then **diff the JSON and confirm
the 48 pre-existing hashes are byte-identical** before committing. That diff is the
proof of non-regression; paste it into `PROGRESS.md`.

---

## 6. T1 — Studio, docs and sheets (commit T1b)

### 6.1 Studio (`src/ui/Controls.tsx`)

Inside the existing `Section title="Scene & camera"` (:180), after the `timeOfDay`
segmented control, add:

```tsx
<Segmented label="Weather" options={WEATHERS.map(({id,label}) => ({id,label}))}
           value={settings.weather} onChange={(weather) => update({ weather })} />
```

`Segmented` already renders `role="group"` + `aria-label`, so
`getByRole('button', { name: 'Rain' })` works in the smoke harness. Add
`data-weather={settings.weather}` to the stage wrapper in `src/App.tsx`.

Hotkeys: `useStudioHotkeys` (:248) already claims Space, arrows, Digit1–6 and the
`MOTION_KEYS` letters. **Do not bind `w`** without checking `MOTION_KEYS` first; if it is
taken, skip the hotkey entirely rather than reassigning an existing one.

### 6.2 Docs (`src/docs/`)

- `Playground.tsx`: one `Segmented` in the Scene group ( beside `timeOfDay` at :331),
  wired through `update({ weather })`; include `weather` in the randomiser pool and in
  the generated snippet. Control count 26 → **27**.
- `SceneExplorer.tsx`: weather segmented beside the lighting control; pass it into
  `SceneOnly` and into `sceneSnippet`.
- `snippets.ts`: `sceneSnippet(scene, timeOfDay, parallax, extra)` gains
  `extra.weather?: string`, emitting `weather="rain"` **only when not `'clear'`** so
  every existing snippet stays byte-identical.
- `DocsSite.tsx` Scenes section: a short "Weather" paragraph — what it is, that `clear`
  is free, and that `CharacterOnly` never weathers.

### 6.3 Smoke coverage

- `scripts/smoke.mjs`: click `Rain` → assert `[data-weather="rain"]`; click `Clear` →
  assert `clear`. Two checks.
- `scripts/docs-smoke.mts`: weather control present in playground and scene explorer;
  switching updates the player wrapper; snippet contains `weather="snow"`; preset
  export/import round-trips weather; mobile has no horizontal overflow with the extra
  control; reduced-motion context still renders weather statically. **~8 new checks ⇒
  222 → ~230.** Update the count in `README.md`, `docs/DOCS_SITE_PLAN.md` and
  `PROGRESS.md` in the same commit.

### 6.4 Sheets

`npm run contact-sheet` and `npm run scene-sheet` should gain a weather row so the
README imagery can show the feature. `scene-sheet.tsx` is typechecked — extend its
matrix, do not fork a scratch script (rule 10).

---

## 7. Resume protocol

### 7.1 Re-establish the workspace (this sandbox forgets)

The workspace snapshot persists **files** but not `.git`, `node_modules` or `/tmp`. A new
session therefore starts with a source tree that has no git metadata. Verified
2026-11-15: `.git` and `node_modules` were both gone after a reset while every tracked
file survived.

```bash
cd <workspace>
git clone https://github.com/Ambitious513/2d-character.git repo-fresh
diff -rq --exclude=.git --exclude=node_modules --exclude=tsconfig.tsbuildinfo 2d-character repo-fresh
# if identical: rm -rf 2d-character && mv repo-fresh 2d-character
cd 2d-character && npm ci
git log --oneline -5 && ls src/rig/environments   # rule 9: diff the tree, don't trust notes
```

### 7.2 Credentials

Never write a token into a tracked file (rule 8). Keep it outside the repo and reference
it from a credential helper:

```bash
umask 077; printf '%s' "$GITHUB_TOKEN" > /tmp/.stride-token
git config credential.helper '!f() { echo "username=x-access-token"; echo "password=$(cat /tmp/.stride-token)"; }; f'
```

`/tmp` does not survive a reset — recreate it each session from the owner's token.
`GET /repos/...` returning 200 while `git push` returns 403 is a **scope** problem
(needs classic `repo`, or fine-grained `contents:write`), not a repo problem. Never fall
back to committing a tarball. Ask the owner to rotate any token pasted into chat.

### 7.3 The commit ritual (rule 11 — this is what turned CI red before)

`tests/kit-zip.test.ts` compares `public/stride-remotion-kit.zip` against the **whole
working tree**: missing file, extra file, or one changed byte all fail. So:

```bash
# 1. edit source/docs FIRST
# 2. then, always:
npm run kit:zip
npm run verify            # typecheck + test + build — the exact CI gate
git add -A && git commit  # source + docs + ZIP in ONE commit
git push origin main      # MANDATORY, same stage — a commit without a push is NOT done
```

A "docs only" commit **will** fail CI. Run 23 was exactly that.

**Push is part of the ritual, not optional.** `commit` and `push` form one atomic
stage boundary: commit → push → confirm CI (§7.4). Do not defer the push, do not
accumulate several stages locally, and do not report a stage complete while it
exists only on this machine.

### 7.4 Confirm CI, don't assume it — after **every** push

Run this after **each** stage's push, not once at the end:

```
GET /repos/Ambitious513/2d-character/actions/runs?per_page=5
GET /repos/Ambitious513/2d-character/actions/runs/<id>/jobs
GET /repos/Ambitious513/2d-character/actions/jobs/<job_id>/logs   # strip auth on redirect
```

Green means **all three jobs**: `verify` (85 tests today, ~121 after T1a),
`browser-smoke` (222 checks today, ~230 after T1b), `render-smoke` (10 PNGs). Read the
test totals out of the log; do not infer them from the job colour.

### 7.5 Commit plan

**One row = one commit *and one push*.** After each `git commit`, immediately
`git push origin main`, then confirm all three CI jobs green (§7.4) before opening
the next row. A row is never closed by a local commit alone.

| # | Commit **and push** | Contents | Gate |
| --- | --- | --- | --- |
| 0 | `ci: de-flake studio smoke, bump actions to v7, bound jobs` | T0.1–T0.3 + ZIP + PROGRESS | verify + 5× smoke + all 3 CI jobs |
| 1a | `feat(weather): deterministic rain/snow/fog overlay in the rig` | types, schema, env props, `Weather.tsx`, `weather-math.ts`, `SceneLayer`, `WeatherFront` in compositions, barrel exports, `tests/weather.test.tsx`, goldens 48→84, ZIP + PROGRESS | verify; **48 old hashes unchanged**; CI green |
| 1b | `feat(weather): studio inspector + docs playground + smoke coverage` | Controls, App, Playground, SceneExplorer, snippets, DocsSite, both smokes, sheets, README/docs counts, ZIP + PROGRESS | verify + both smokes + CI green |
| 2 | `docs: close Phase 5.1 in ROADMAP + PROGRESS` | roadmap status, handoff truth-up, ZIP | verify + CI green |

Each commit is independently revertable. **Do not start 1b before 1a is green on GitHub.**

### 7.6 Progress ledger (update as work lands)

Tick a "pushed, CI green" line only after the push **and** the green run are both
real; a committed-but-unpushed stage stays unticked.

- [x] Spec written, reviewed against the tree (`docs/PHASE-5.1-SPEC.md`) — landed `38bee81`, CI run 26 green
- [x] T0.1 smoke de-flake · [x] T0.2 action bumps · [x] T0.3 timeouts/concurrency
- [x] T0 pushed, CI green (run #27, `7dbae86`)
- [x] T1a types + schema + env props · [x] `weather-math.ts` + `Weather.tsx`
- [x] `SceneLayer` early-return · [x] `WeatherFront` in compositions · [x] barrel exports
- [x] `tests/weather.test.tsx` (11 groups) · [x] goldens 48 → 84, old 48 unchanged
- [x] T1a pushed, CI green (run #29, `0bf5c03` + `457c407` LF-ZIP fix)
- [x] T1b studio (Controls + stage attribute) · [x] docs playground + explorer + snippets · [x] smokes 222 → 235
- [x] sheets (scene-sheet 4×3×4) + README/docs counts
- [x] T1b pushed, CI green (run #30, `50a3f1b`)
- [x] ROADMAP + PROGRESS closed out, ZIP regenerated (closeout `f519e9e`, CI run 31 green)

---

## 8. Risks, and the decisions still owed by the owner

| Risk | Mitigation |
| --- | --- |
| Particle field uses a clock or `Math.random` | §4.3 tests 2/3/11; the determinism grep is the backstop |
| Wrapper `<g>` breaks all 48 goldens | §3.5 early-return; test 1 asserts it directly |
| Node count balloons and render slows | §5.4 budgets asserted in tests; no SVG filters |
| Front pass forgotten ⇒ fog behind the character | §3.6 lists all 5 call sites; add a composition-level assertion |
| Weather leaks into the alpha plate | §4.3 test 8; `CharacterOnly` draws no `SceneLayer` |
| Docs/studio leak into `src/index.ts` | `tests/packaging.test.tsx` import-graph walk already guards it |
| ZIP drift turns CI red again | §7.3 ritual, rule 11 |
| Action bump breaks a job | T0.2 is its own revertable change; T0.1 independent |

**Open owner decisions (unchanged, do not guess):**

1. **Publish to npm as `@stride/rig`?** Needs a build target, `peerDependencies`,
   `files` allowlist and an `exports` map. Copy-in consumption is what README documents
   today. If yes, weather should land *before* the first publish so 1.0 of the package
   includes it.
2. **Drop the v1 shims** (`src/rig/Street.tsx`, `Environment` alias, `environment →
   timeOfDay`)? That is a major bump; weather does not need it.

**Defaults this spec assumes** (flagged for sign-off, chosen so work is not blocked):
`room` is indoors and gets veil-only; weather stays orthogonal to `timeOfDay` with no
fourth lighting pass; no intensity knob in v1; `PRESET_SCHEMA_VERSION` stays 2.
