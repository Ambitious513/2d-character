# PROGRESS — agent handoff

**Read this first if you are picking this project up.** It records what state the
repo is in, what was just done, and exactly where to continue.

- **Last updated:** 2026-11-15
- **Version:** 2.2.0 (`package.json` and `Kit.VERSION` — kept in sync by a test)
- **Branch:** `main`
- **Repo:** `Ambitious513/2d-character`
- **State:** ✅ green — docs site **Stage 3 is complete, mounted and now actually
  verified in a browser** (102 checks, zero console/page errors). Typecheck
  clean, **81/81 tests**, build succeeds, studio smoke passes. Phase 5's four
  deliverables remain done and CI-verified (`render-smoke` included).
- **Commits pushed to `origin/main`:** `6d32d3f` arrangement → `a49d9c7`
  handoff update → `73cce7b` CI fix → `d2e8376` Phase 5 → `582a57d` render-smoke
  record → `9ecaaaf` docs truth-up → `43d5e9a` docs plan → `73a58db` Stage 1 →
  `86f266f` Stage 2 → `fb64cd8` Stage 3 recovery → `d11bdab` owner hand-upload of
  the rest of Stage 3 → **Stage 3 verification + repo cleanup (this commit)**.
- **Next work:** docs site **Stage 4** (docs smoke script + CI + handoff docs +
  kit ZIP). See `docs/DOCS_SITE_PLAN.md` §0.

> ## 🔐 Credential hygiene (2026-11-15)
>
> The owner's hand-upload `d11bdab` committed **`.gh.py` with a hard-coded
> classic PAT** to this public repo. That token was already **dead on arrival**
> (`401 Bad credentials` on every call) — GitHub secret scanning revokes classic
> PATs the moment they reach a public repo.
>
> `.gh.py` is **deleted in this commit**, and the tree was scanned: no `ghp_…` /
> `github_pat_…` string remains in any tracked file.
>
> **Rules:** never write a token into a tracked file — pass it via the
> environment or an untracked file outside the repo. Rotate any token pasted
> into chat once the work lands. The token used for this session should be
> rotated by the owner now that the push is done.

> ## ✅ Push access resolved (2026-11-15)
>
> The arrangement commit `6d32d3f` is **on GitHub**. `origin/main` was verified
> after the push: root contains `PROGRESS.md`, `README.md`, `src/`, `tests/`,
> `docs/` — and **no tarballs, no `uploads/`**. `package.json` reads `2.2.0`.
>
> **Why this took three sessions:** the first two tokens were fine-grained PATs
> that authenticated as `Ambitious513` with **admin** role but granted only
> `contents:read`. Every write failed identically:
>
> ```
> POST /repos/Ambitious513/2d-character/git/refs -> 403
>      x-accepted-github-permissions: contents=write
> git push -> remote: Permission to Ambitious513/2d-character.git denied
> ```
>
> With no write access, each agent could only hand back an archive for manual
> upload — which is exactly how `latest.gz` (`ef43ddf`) and `latest main.tar.gz`
> (`d3ae613`) got committed instead of source. A **classic PAT with `repo` scope**
> resolved it immediately.
>
> **For future sessions:** if `git push` returns 403 while `GET /repos/...`
> returns 200, it is a *token scope* problem, not a repo/permission problem —
> check `contents:write` (fine-grained) or use a classic `repo`-scoped token.
> Do **not** fall back to committing a tarball; ask for a writable token instead.
> Rotate any token that has been pasted into chat once the work is landed.

---

## TL;DR for the next agent

The repo is **no longer in the tarball-recovery state**. Real source is on
GitHub, Phase 4 is complete, and Phase 5's four named deliverables are complete
and CI-verified: visual-regression snapshots, the `render-smoke` CI job, the
fresh kit ZIP, and keyboard-first studio UX. The current suite is **81 tests**,
including **48 visual golden hashes**.

Do **not** redo those Phase 5 items. The remaining roadmap work is:

1. **Docs site** with live `<Player>` examples — **Stages 0–3 done, mounted and
   verified**. See `docs/DOCS_SITE_PLAN.md` §0 for the live stage table. Only
   **Stage 4** is left: promote `scripts/docs-stage3-check.mts` into
   `scripts/docs-smoke.mjs`, add `npm run smoke:docs`, wire it into the CI
   browser job, add the docs-leak packaging guard, and update
   README / ROADMAP / ARCHITECTURE. (Kit ZIP was already refreshed this session.)
2. **Weather** (`rain` / `snow` / `fog`) — the deferred Phase 3 item.

Open owner decisions remain: npm publishing as `@stride/rig`, and whether to
drop the v1 compatibility shims. See "Open decisions" below.

---

## Stage 3 verification + repo cleanup (2026-11-15, this commit)

**Scope, chosen by the owner: verify and document Stage 3, then stop.** No
Stage 4 wiring, no weather, no npm publish, no v1 shim removal, no render-path
changes.

### The handoff was stale — the tree was ahead of it

`PROGRESS.md` and the plan said Stage 3 was half-landed (two explorers written,
unmounted). That was true at `fb64cd8`, but the owner then hand-uploaded
`d11bdab` ("Update with agent's latest work"), which contained **the rest of
Stage 3**: `SceneExplorer.tsx`, `PresetPanel.tsx`, the shared `controls.tsx`
extraction, and the `DocsSite.tsx` wiring that mounts all four explorers.

So Stage 3 was **code-complete but never verified, never recorded, and not
CI-covered**. Lesson for the next agent: **diff the tree against these notes
before trusting them** — an owner hand-upload can move `main` past the handoff.

### What was verified (actually run, not inspected)

```
npx tsc -b                      # clean
npm test                        # 81/81 pass, 0 fail
npm run build                   # ✓ built — docs chunk 160.70 kB (was 134 kB at Stage 2)
npm run smoke                   # studio: PASS (desktop + mobile)
npx tsx scripts/docs-stage3-check.mts   # 102 checks PASS, 0 console/page errors
```

The docs harness covers: nine-section nav and sequential numbering; all five
composition tabs (one Player each, correct slate geometry, tab-specific prop
chips, matching snippet, no player error); derived dialogue duration (323
frames) quoted identically in the note; secondary examples paused until played;
six cast cards with real head SVGs; all three sheet tabs and the character
picker; cast-card → playground routing; the scene explorer across all four
scenes and three lighting passes with palette swatches that follow
`paletteFor()`; "send to playground" preserving the character; all 8 preset
cards; and the preset importer's five failure/success paths including v1 → v2
migration and the download round-trip. Mobile 390×844: zero horizontal overflow
before **and** after interaction, cast cards stack to one column.

### Three harness assertions were wrong — the app was right

The recovered `scratch/check-s3.mts` failed 3 of 102 checks. All three were bad
assertions, corrected (and two made stronger) rather than "fixed" in the app:

- **`SceneOnly` prop chips** — the harness demanded ≥5 chips on every tab;
  `SceneOnly` legitimately documents four (`scene`, `timeOfDay`, `parallax`,
  `direction`). Now asserts ≥4 **plus** a tab-specific prop, which is a sharper
  check than the original blanket count.
- **Downloaded preset (2 checks)** — the harness validated a `pip`/`jump` JSON
  but never loaded it, then expected the download to contain it. "Download
  current preset" exports the **playground's** look by design (plan §5). Now the
  harness loads the validated look first and asserts the download round-trips
  character, motion **and** filename `stride-pip-jump.json`.

The corrected harness is committed as **`scripts/docs-stage3-check.mts`** (real
source, typechecked by `tsc -b`, three strict-null issues fixed on the way in).
It is deliberately **not** wired into `package.json` or CI — Stage 4 does that.
Keeping it as source is the whole point: this repo has lost finished work three
times because it lived only in a scratch dir or an archive.

### Repo cleanup (owner-approved)

`d11bdab` also committed the previous agent's entire scratch workspace. Removed:

| Removed | Why |
| --- | --- |
| `.gh.py` | hard-coded classic PAT in a public repo (already revoked) |
| `scratch/prev/**` (174 files) | two nested duplicate copies of the whole project, including stale `PROGRESS.md`, `package-lock.json` and kit ZIPs |
| `uploads/*.txt` (2 files) | scraped GitHub UI text and a chat-context note; zero references |

**Tracked files: 262 → 85.** `.gitignore` now blocks `scratch/`. Everything
removed stays retrievable from git history at `d11bdab`. No application source,
test, or CI workflow was deleted.

### Environment notes worth keeping

- **This sandbox is capped at 1 GB RAM** (cgroup `memory.max` = 1073741824), the
  same ceiling recorded below. The docs page mounts **five Remotion Players at
  once**, so `vite dev` + Chromium OOM-crashes the tab (`Target crashed`).
  **Workaround that works:** `npm run build`, serve `dist/` statically
  (e.g. `python3 -m http.server 4173 --bind 0.0.0.0`), and run the harness with
  `BASE_URL=http://localhost:4173`. That frees ~300 MB and all 102 checks pass.
  Chromium also benefits from `--renderer-process-limit=1` and
  `--js-flags=--max-old-space-size=320`. This is an environment limit, not a
  docs defect — CI's larger runners are unaffected.
- **One studio-smoke flake observed:** the very first run after a cold dev-server
  start failed clicking `SVG frame` in the export modal with *"element is not
  stable"* (the modal's entrance animation). Three subsequent runs passed,
  including against the production build. `d11bdab` touched only `src/docs/**`,
  so this is a pre-existing animation-timing flake in `scripts/smoke.mjs`, not a
  Stage 3 regression. If it recurs in CI, wait for the modal animation to settle
  before clicking — do not weaken the assertion.

### Not done here (deliberately, per the owner's scope)

Stage 4 in full: `scripts/docs-smoke.mjs` + `smoke:docs` + CI step + screenshot
artifact, the docs-leak assertion in `tests/packaging.test.tsx`, and the
README / ROADMAP / ARCHITECTURE updates. `README.md` still says "81 tests" and
does not mention the `#/docs` route yet.

---

## Docs site build (2026-11-15) — staged, pushed per stage

Scope is **only** the docs site with live `<Player>` examples. No weather, no
npm publish, no v1 shim removal, no render-path changes. The full plan and the
live stage table live in **`docs/DOCS_SITE_PLAN.md` §0** — read that before
continuing so a stage is never redone.

**Stage 1 — routing + docs shell (this commit).**

> Recovered and landed: the previous session finished Stage 1 but was cut off
> before it could push, and handed back `DOC_SITE_IN_PROGRESS.tar.gz`. That
> archive was unpacked, diffed against `main`, and **only the finished Stage 1
> work** was committed here as real source. The archive itself is deleted in
> this commit — rule 6 below still holds: never commit a tarball.

- `#/docs` and `#/docs/<section>` now render a lazily loaded docs site; `/` and
  `#/studio` still render the untouched studio. Hash routing means no server
  rewrites are needed in dev, preview or static hosting.
- New `src/docs/`: `DocsSite.tsx` (shell, numbered nav + scrollspy, hero,
  quickstart, export, architecture, footer, toasts), `DocsPlayer.tsx` (real
  Remotion `<Player>` with a Stride transport), `CodeBlock.tsx`, `snippets.ts`,
  `parts.tsx`, `docs.css`.
- The hero is a **live `WalkScene`**, not a video: Ada, run cycle, street at
  golden hour, autoplaying with reduced-motion opt-out.
- Docs UI is an app consumer like `src/ui` and is **not** exported from
  `src/index.ts`.
- Studio change is one nav link (`src/App.tsx`) plus its styling.

Verification: typecheck clean, **81/81 tests**, production build succeeds
(docs split into its own ~118 kB chunk), existing `npm run smoke` still passes,
and a Playwright pass on the docs route confirmed autoplay/pause, scrollspy,
deep links, copy toast, back-to-studio and zero mobile horizontal overflow at
390×844 with no console or page errors.

**Stage 2 — the live playground (`73a58db` → this commit).**

- `src/docs/Playground.tsx`: sticky live Player + a permanently visible control
  region with **26 live controls** across six groups (cast & performance, motion
  tuning, scene & camera, speech, look, palette), plus Reset / Randomize /
  Copy props / Download preset. Every control writes into the Player's
  `inputProps` immediately.
- Scene ↔ alpha plate switch (`WalkScene` 1280×720 ↔ `CharacterOnly` 720×720 on a
  checkerboard), a live generated snippet, and a real v2 preset download via
  `serializePresetJSON`.
- The dialogue field reports derived lip-sync frames from `speechFrames`, so the
  docs demonstrate the speech API rather than just describing it.
- Playground state is owned by `DocsSite` so Stage 3's preset panel can load into
  it. Section numbers are derived from nav order.
- Randomize is UI-side only; no non-determinism entered the render path.

Verification: typecheck clean, **81/81 tests**, build succeeds, existing studio
smoke passes, and a 35-assertion Playwright pass on the playground — every
control, keyboard slider use, the alpha switch, all four actions including
parsing the downloaded JSON, reset fidelity, and mobile 390×844 with zero
horizontal overflow and no console/page errors. Stage 1's CI run
(43653395037) is green across `verify`, `browser-smoke` and `render-smoke`.

Still open in this stage plan: explorers + presets (Stage 3), docs smoke + CI +
handoff docs + kit ZIP (Stage 4).

**Stage 3 recovery (2026-11-15, this commit).**

> The Stage 2 session was cut off by a usage limit **after writing two of Stage
> 3's four explorers**. It never wired them into `DocsSite` and never pushed; the
> only record was `studio in progress.tar.gz`, uploaded to the repo root by hand
> (commit `269e429`).

That archive was unpacked outside the repo and diffed file-by-file against
`main`. The **entire** delta was:

| Recovered | State |
| --- | --- |
| `src/docs/CompositionExplorer.tsx` (241 lines) | complete, self-contained, typechecks — five composition tabs, derived dialogue duration, prop chips, snippets |
| `src/docs/CastMotionExplorer.tsx` (247 lines) | complete, self-contained, typechecks — six cast cards with live `CharacterHead`, three reference-sheet tabs, character selector |
| `screenshots/*.png` (19 files) | generated verification artefacts, **gitignored on purpose** — not committed |
| `tsconfig.tsbuildinfo` | generated, gitignored |

Everything else in the archive was byte-identical to `main`, so nothing else was
lost. Both recovered files are committed here **as real source, unmounted**:
`DocsSite.tsx` is unchanged, so the docs page renders exactly as it did at Stage
2 and no half-finished UI ships. Mounting them, plus `SceneExplorer` and
`PresetPanel`, is the rest of Stage 3.

> **Superseded (2026-11-15):** the rest of Stage 3 arrived in the owner's
> hand-upload `d11bdab` and all four explorers are now mounted and verified.
> This section is kept as history only — see "Stage 3 verification + repo
> cleanup" above for the current state.

`studio in progress.tar.gz` is **deleted in this commit** — rule 6 below still
holds: never commit a tarball. It remains retrievable from git history at
`269e429` if anyone ever needs the original snapshot.

---

## What this session did (2026-11-15) — docs truth-up

Documentation-only reconciliation so the handoff matches the repo and CI:

- `PROGRESS.md`: removed stale "Phase 5 is underway" / old `origin/main`
  language from the current-state sections; updated the current test count to
  81; clarified that CI verifies a **PNG sequence** render, while actual
  ProRes/WebM file production remains unverified.
- `docs/ROADMAP.md`: Phase 5 is no longer marked as simply "next"; studio
  polish, visual snapshots, CI render smoke and the kit ZIP are marked done,
  with docs site and weather still open.
- `docs/ARCHITECTURE.md`: test table now includes the visual and kit-ZIP suites
  and totals **81**, not 78.
- Refreshed `public/stride-remotion-kit.zip` so the downloadable kit carries the
  corrected docs. No application code, tests, or CI workflow were changed.

---

## Phase 5 deliverables (2026-11-14)

All four Phase 5 tasks, verified with `npm run verify` (typecheck + **81/81**
tests + build), `npm run check:ids` (6/6 unique) and `npm run check:env-ids`
(all unique).

### 1. Visual-regression snapshots (highest priority)

- `tests/visual-goldens.tsx` — the shared matrix: 6 cast × {idle, walk, run} ×
  {neutral, happy} at frame 60, plus 4 scenes × {day, golden, night}, rendered
  with `renderToStaticMarkup` and SHA-256 hashed.
- `tests/visual.test.tsx` — asserts every hash against
  `tests/__golden__/visual-hashes.json` (48 entries), plus a well-formedness
  guard (right `data-character`, own jacket colour, no `NaN`/`undefined`).
- `scripts/update-visual-goldens.ts` (`npm run update:visual-goldens`) —
  regenerates the goldens after an *intentional* visual change.
- Goldens are byte-idempotent: running the generator twice produces the same
  file hash. No browser, no RAM ceiling.

### 2. Fresh `public/stride-remotion-kit.zip`

- `scripts/generate-kit-zip.ts` (`npm run kit:zip`) zips the **current working
  tree** (git-tracked + untracked-but-not-ignored, so new files are included)
  into a deterministic archive (sorted paths, fixed mtime).
- The old ZIP was a v1.0.0 pre-restructure snapshot; it now contains
  `src/index.ts`, `src/rig/id.ts`, the environments, tests and docs at 2.2.0.
- `tests/kit-zip.test.ts` opens the archive and asserts `package.json` matches
  the one on disk, required files exist, no path traversal, and no
  `node_modules`/`.git`/`renders`/self-reference.
- `package.json` gained a `_releaseChecklist` reminder to rerun `kit:zip`
  before a release.

### 3. CI render job

- `.github/workflows/ci.yml` gained `render-smoke` (`needs: verify`): installs
  Playwright's Chromium (same mechanism as the studio smoke job), renders
  `CharacterOnly` frames 0–9 as a PNG sequence to `renders/ci-test`, and fails
  unless exactly 10 `.png` files are written.
- **First real run green (2026-11-14, CI run 43636701309):** `render-smoke`
  completed successfully on `ubuntu-latest` — bundle, Chromium launch and the
  10-frame PNG render all worked with the Playwright-browser trick. Local
  Remotion renders are still unnecessary; the CI job is the render check.

### 4. Keyboard-first studio UX

- `src/ui/Controls.tsx` exports `useStudioHotkeys`, a single global listener:
  ←/→ step (±10 with Shift), Space play/pause, 1–6 select cast, W/I/R set
  walk/idle/run. Ignored while a form control or modal has focus.
- `src/App.tsx` now uses it and its old inline Arrow/Space handler is gone, so
  no key is handled twice.

---

## History — how the work kept getting lost

Reconstructed from git history:

| Commit | What it did |
| --- | --- |
| `54f7985`, `808a3a9` | Initial uploads (`workspace1.tar.gz`, then the unpacked project). |
| `9526a96` | Restructure: `workspace1/` → repo root, added CI, split `rig/`. |
| `629708d` | Phase 1 work + `docs/ROADMAP.md`. **Introduced `rig/id.ts`.** |
| `e301ed1` | Phases 2–3 (cast, environments, compositions). **Deleted `docs/ROADMAP.md` and `rig/id.ts`** — silently regressing the gradient-id fix back to `useId()`. |
| `ef43ddf` | Added `latest.gz` only — a tarball of the working tree, **not** the source changes. |
| `d3ae613` | "task completed but wasn't pushed" — added `latest main.tar.gz`, the *whole previous workspace* (finished `repo/` + `handoff/` artifacts). Again **not** source. |

The previous agent then, in its own session: restored `id.ts`, patched the five
affected components, wrote regression tests, and built Phase 4 (schema, presets,
factories, barrel). It ran out of usage **mid-way through checking Remotion CLI
flags for the export docs**, so none of it was committed. `latest.gz` was the only
record.

## Arrangement session (2026-11-15) — historical

The 2026-11-14 session finished the work but could not push, so it was uploaded to
GitHub as **`latest main.tar.gz`** (commit `d3ae613`, 3.9 MB at the repo root).
That archive contained the agent's *entire workspace*: the finished `repo/` tree,
its own `recovered/` scratch copy of `latest.gz`, `.agent/` helper scripts and
`handoff/` artifacts. **None of it was source in the repo.** This session unpacked
it and arranged it properly.

### Files placed into the repo (23)

| Kind | Files |
| --- | --- |
| **New source** | `src/index.ts` (public barrel), `src/rig/id.ts` (`stableId`), `src/rig/schema.ts`, `src/rig/preset.ts`, `src/remotion/factories.tsx` |
| **Regression fix** | `src/rig/Character.tsx`, `src/rig/environments/{Street,Park,Room,Backdrop}.tsx` — `useId()` → `stableId()` |
| **Modified** | `src/remotion/Root.tsx`, `package.json` (2.1.0 → **2.2.0** + 4 scripts), `package-lock.json` (version synced for `npm ci`) |
| **New tests** | `tests/svg-ids.test.tsx` (14), `tests/packaging.test.tsx` (28), `tests/export-recipes.test.ts` (6) |
| **Diagnostics** | `scripts/check-ids.tsx`, `scripts/check-env-ids.tsx` (promoted out of the hidden `.probe/` scratch dir) |
| **Docs** | `README.md`, `PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/EXPORT.md`, `docs/ROADMAP.md` |

### Junk removed from the tree

- **`latest main.tar.gz`** and **`latest.gz`** — recovery archives, now redundant;
  their contents are real files. Both remain retrievable from git history
  (`d3ae613` / `ef43ddf`) if ever needed.
- **`uploads/3830314c-….txt`** — scraped GitHub UI text, zero references.
- **`tsconfig.tsbuildinfo`** — generated, already gitignored.
- Nothing from the archive's `.agent/`, `handoff/`, `recovered/` or `.probe/`
  scratch dirs was committed. `.gitignore` now blocks `handoff/`, `recovered/`,
  `*.tar.gz` and `*.bundle` so this cannot recur.

### Re-verified from a clean clone (not trusting the archive)

```
npm install && npx tsc -b        # clean
npm test                         # 78/78 pass, 0 fail (historical count)
npm run build                    # ✓ built
npm run check:ids                # 6 of 6 unique gradient ids — no collision
npm run check:env-ids            # street 3/3, park 6/6, room 6/6, backdrop 6/6
npm ci --dry-run                 # clean — lockfile in sync
```

This was the arrangement-time verification: **78 tests** then, before the
visual-golden and kit-ZIP suites brought the current total to **81**. Rendering
was unverified locally at that point; CI `render-smoke` later verified the PNG
sequence render (see "Verified state" below).

### Fixed the red CI (pre-existing, not caused by the arrangement)

`CI` had been **failing on every commit since `e301ed1`** — including the two
tarball commits. The `Typecheck, test, build` job always passed; the
`Studio browser smoke test` job was the failure. Three selectors in
`scripts/smoke.mjs` had gone stale in the environments/UI refactor and were never
updated:

| Stale | Reality | Fix |
| --- | --- | --- |
| `[data-street="night"]` | nothing emits `data-street`; scenes emit `data-scene` + `data-time-of-day` | `[data-scene="street"][data-time-of-day="night"]` |
| button `'Street scene'` | the Scene segmented control renders `Street` / `Park` / `Room` / `Backdrop` | `'Street', exact: true` |
| mobile button `'Happy', exact: true` | accessible name is `HappyA little extra joy` (label + description) | `/Happy/` |

The first one masked the other two — CI always died at line 36, so the later
steps had never run. **Verified by actually running it**, not by inspection:
installed Chromium, ran the studio, `npm run smoke` →
`Smoke test passed: desktop + mobile, playback, controls, reference overlay,
presets, export, secondary views.` with zero console/page errors.

Only test selectors changed — no application code was touched, and no assertion
was weakened or skipped.

**Confirmed on GitHub:** run
[`43622127107`](https://github.com/Ambitious513/2d-character/actions/runs/43622127107)
on `73cce7b` — `Typecheck, test, build` ✅ and `Studio browser smoke test` ✅.
This is the first fully green CI run since `e301ed1`.

### Pushed

`git push origin main` → `d3ae613..6d32d3f`, then the PROGRESS update and the CI
fix. Remote tree re-read through the GitHub API to confirm the arrangement landed
(no tarballs, no `uploads/`, `PROGRESS.md` and `src/rig/id.ts` present, version
`2.2.0`). A **fresh clone from GitHub** was then installed and verified
independently: 78/78 tests, build, `check:ids` 6/6.

---

## What the 2026-11-14 recovery session did

### 1. Recovered the lost work
Extracted `latest.gz` and diffed it against `HEAD`. Recovered **13 files**:

- **new:** `src/index.ts`, `src/rig/id.ts`, `src/rig/schema.ts`, `src/rig/preset.ts`,
  `src/remotion/factories.tsx`, `tests/svg-ids.test.tsx`, `tests/packaging.test.tsx`
- **modified:** `src/remotion/Root.tsx`, `src/rig/Character.tsx`, and
  `environments/{Street,Park,Room,Backdrop}.tsx` (all `useId` → `stableId`)

Verified independently: `npm run check:ids` reports **6 unique gradient ids for 6
cast members**, each keeping its own jacket colour. Before the fix all six
collided on `garment-R0` and every character wore Milo's jacket.

### 2. Structured the codebase
- **Removed `latest.gz`** — recovery artifact, now redundant (contents committed
  as real files; still retrievable from git history at `ef43ddf`).
- **Removed `uploads/`** — a stray `.txt` of scraped GitHub UI text ("You signed in
  with another tab…"), zero references anywhere.
- **Removed `tsconfig.tsbuildinfo`** — generated, already gitignored.
- **Promoted `.probe/*.tsx` → `scripts/check-ids.tsx` + `scripts/check-env-ids.tsx`**,
  wired up as `npm run check:ids` / `check:env-ids`. Useful diagnostics were living
  in a hidden scratch dir.
- **Fixed version drift** — barrel said `2.2.0`, `package.json` said `2.1.0`. Both
  now `2.2.0`, with a test asserting they stay in sync.

### 3. Finished Phase 4's last mile — export recipes
This is what the previous agent was mid-way through.

- Wrote **`docs/EXPORT.md`**: PNG sequence, ProRes 4444, VP9 WebM, opaque MP4,
  stills, scaling, determinism notes, troubleshooting table.
- Added **`render:alpha:prores`** and **`render:alpha:webm`** npm scripts.
- **Verified every flag against Remotion's own source**, not from memory. Two
  corrections worth knowing:
  - ProRes profiles in `^4.0.543` are `4444-xq`, `4444`, `hq`, `standard`, `light`,
    `proxy` — **not** the `422-*` names you may expect. `hq` and below have **no
    alpha channel** and fail silently (black background).
  - Alpha pixel formats are only `yuva420p` (VP8/VP9) and `yuva444p10le` (ProRes).
- **Documented the repo's biggest export trap:** `remotion.config.ts` sets
  `Config.setVideoImageFormat('jpeg')` globally. JPEG has no alpha, so **every
  alpha render must pass `--image-format=png`** or Remotion throws.
- Added **`tests/export-recipes.test.ts`** (6 tests) which validates the recipes
  against Remotion's own validators, with a negative control proving alpha+JPEG is
  rejected. Mutation-tested: switching the profile to `hq` fails the suite.

### 4. Wrote the missing documentation
The repo had **no root README** and no architecture doc.

- **`README.md`** — quick start, feature overview, consumption, presets, export, layout.
- **`docs/ARCHITECTURE.md`** — layer map, module table, the determinism rule, why
  `stableId` exists, settings resolution order, how to extend, per-change checklist.
- **`docs/ROADMAP.md`** — restored from `629708d`, statuses corrected to match reality.
- **`PROGRESS.md`** — this file.

---

## Verified state

```bash
npm install
npm run verify      # typecheck + 81 tests + build — ALL GREEN
```

CI run [#9 / 43636701309](https://github.com/Ambitious513/2d-character/actions/runs/43636701309)
on `d2e8376` completed successfully: `verify`, `browser-smoke`, and
`render-smoke`. The render job produced exactly 10 PNG frames of
`CharacterOnly` on `ubuntu-latest`.

| Suite | Tests | Guards |
| --- | --- | --- |
| `tests/rig.test.ts` | 6 | IK maths |
| `tests/library.test.tsx` | 24 | determinism, foot-lock, lip-sync, cast, environments |
| `tests/svg-ids.test.tsx` | 14 | gradient-id collisions across React roots |
| `tests/packaging.test.tsx` | 28 | barrel, preset envelope + v1 migration, factories |
| `tests/export-recipes.test.ts` | 6 | alpha recipes stay valid |
| `tests/visual.test.tsx` | 2 | 48 golden hashes (cast × motion × emotion, scene × lighting) |
| `tests/kit-zip.test.ts` | 1 | the downloadable ZIP is the current source tree |
| **total** | **81** | |

### ⚠️ What remains unverified

**Actual ProRes/WebM video rendering.** CI `render-smoke` verifies a 10-frame
**PNG sequence**, not a finished `.mov` or `.webm`. The export recipes are
verified at the flag/validation level (against Remotion's own validator
functions), but **no `.mov`/`.webm` has actually been produced**.

The original local sandbox was capped at **1 GB RAM**; Remotion's webpack
bundle plus headless Chrome was OOM-killed at ~100% bundling. Tried
`--concurrency=1` and `NODE_OPTIONS=--max-old-space-size=512/640` — still killed.
That was an **environment limit, not a code defect**.

If you have ≥4 GB RAM, please run:

```bash
npm run render:alpha:prores   # then confirm the .mov has a real alpha channel
npm run render:alpha:webm
```

Headless Chrome also needs system libs on Debian 12:

```bash
apt-get update && apt-get install -y --no-install-recommends \
  libnspr4 libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libxkbcommon0 libasound2 libpango-1.0-0 libcairo2
```

---

### Known benign noise (do not chase this as a bug)

`npm test` prints ~80 React warnings:

```
<linearGradient /> is using incorrect casing. Use PascalCase for React components…
```

**This is a test-harness artifact, not a library defect.** `CharacterRig` returns a
`<g>` fragment, meant to be placed inside an `<svg>`. A few tests render it *bare*
(no `<svg>` wrapper), so React treats `linearGradient` as an unknown HTML element
and warns. In production every call site wraps it — `Character`, `WalkScene`,
`CharacterOnly`, and `scripts/contact-sheet.tsx` (which comments explicitly:
"Render the whole `<svg>` through React so SVG attribute casing is preserved").

One of those bare renders is **intentional**: `library.test.tsx` asserts
`svg.startsWith('<g')` to pin the fragment contract. Don't "fix" it by wrapping.
The collision-critical tests in `svg-ids.test.tsx` already wrap in `<svg>` correctly.

If you want clean output, wrap only the *auxiliary* bare renders (dedup / recolour /
byte-stable) in `<svg>` — leave the fragment-contract assertion alone.

---

## Where to continue

Current status after Phase 5 and the 2026-11-15 docs truth-up:

1. ~~**Visual-regression snapshots.**~~ **Done** — `tests/visual.test.tsx` +
   `tests/visual-goldens.tsx` + `tests/__golden__/visual-hashes.json`
   (48 entries, byte-idempotent generator).
2. ~~**CI render job.**~~ **Done & verified** — `render-smoke` job in
   `.github/workflows/ci.yml` (`needs: verify`, renders 10 PNG frames and
   asserts the count). **First run green:** CI run 43636701309 (commit `d2e8376`)
   completed all three jobs, render included.
3. ~~**Refresh `public/stride-remotion-kit.zip`.**~~ **Done** — regenerated from
   the current tree by `npm run kit:zip`, with `tests/kit-zip.test.ts` guarding
   it.
4. ~~**Keyboard-first studio UX.**~~ **Done** — `useStudioHotkeys` in
   `src/ui/Controls.tsx`, wired in `src/App.tsx`.

Documentation truth-up (2026-11-15): **done** — `PROGRESS.md`,
`docs/ROADMAP.md` and `docs/ARCHITECTURE.md` reconciled with the current repo.

Still open, in recommended order:

5. **Docs site — Stage 4 only.** Stages 0–3 are done, mounted and verified
   (102-check browser harness, `scripts/docs-stage3-check.mts`). What remains:
   promote that harness to `scripts/docs-smoke.mjs`, add `npm run smoke:docs`,
   wire it into the CI browser job with the screenshot artifact, add a
   `tests/packaging.test.tsx` assertion that `src/docs` never leaks into the
   barrel, and update README / ROADMAP / ARCHITECTURE. Then refresh the kit ZIP.
6. **Weather** (`rain`/`snow`/`fog`) — the one deferred Phase 3 item. No `weather`
   field exists yet; would need `types.ts` → `schema.ts` → palettes → inspector.

### Open decisions (need the owner's input — do not guess)

- **Publish to npm as `@stride/rig`?** The roadmap names that scope, but
  `package.json` is still `private: true`, named `stride-character-kit`, with no
  library build or `exports` map. Copy-in consumption works today and is what the
  README documents. Publishing needs a scope owner, a build target (tsup/rollup),
  `peerDependencies` for react/remotion, and a `files` allowlist. **Ask before doing.**
- **Drop the v1 shims?** `src/rig/Street.tsx`, the `Environment` type alias and the
  `environment` → `timeOfDay` mapping are all back-compat. Removing them is a major
  version bump.

---

## Rules for whoever continues

1. **Never reintroduce `useId()` into the render path.** Use `stableId(prefix,
   ...definingInputs)` from `src/rig/id.ts` for every SVG gradient/filter. This bug
   has already been shipped and fixed **twice**. `tests/svg-ids.test.tsx` catches it.
2. **Keep the rig pure** — no `Math.random()`, no `Date.now()`, no module-level
   mutable counters. Remotion renders frames in parallel and out of order.
3. **`src/index.ts` is the only public surface.** The studio (`src/ui`, `App.tsx`)
   must never leak into it; a test asserts this.
4. **Run `npm run verify` before every commit.** It is the same gate CI uses.
5. **Update this file** whenever you make progress — including what you could not
   verify and why.
6. **Commit real source, never a tarball.** `latest.gz` cost one agent a full
   recovery pass; `latest main.tar.gz` cost another. If you must snapshot, put it
   outside the repo — `.gitignore` now blocks `handoff/`, `recovered/`, `*.tar.gz`
   and `*.bundle`.
7. **Write real commit messages.** History contains `[briefly describe what the
   agent did]` placeholders, which made reconstruction much harder.
8. **Never write a token into a tracked file.** `.gh.py` shipped a classic PAT to
   this public repo and GitHub auto-revoked it. Use the environment or an
   untracked file outside the repo, and rotate anything pasted into chat.
9. **Diff the tree against these notes before trusting them.** `d11bdab` was an
   owner hand-upload that moved `main` a whole stage past the written handoff.
   `git log` + `ls src/docs` takes ten seconds and prevents redoing finished work.
10. **Keep verification harnesses as real source.** A 280-line browser check sat
    in `scratch/` and was nearly deleted with the junk. `scripts/` is typechecked
    by `tsc -b`; scratch dirs are not, and are now gitignored.

## Key facts you will need

- Frame constants (`src/rig/gait.ts`): `FPS=30`, `DURATION=300`, `WIDTH=1280`,
  `HEIGHT=720`, `GROUND_Y=590`, `CHARACTER_X=650`.
- `CharacterOnly` is the alpha plate: **720×720, transparent**, guides off.
- Cast: `milo`, `ada`, `kwame`, `juno`, `ravi`, `pip`.
- Scenes: `street`, `park`, `room`, `backdrop` × `day`, `golden`, `night`.
- `PRESET_SCHEMA_VERSION = 2`; bump it only when an existing field's *meaning* changes.
- Studio: `npm run dev` → :5173. Remotion Studio: `npm run studio`.
- ~7,100 lines of TS/TSX across `src`, `tests`, `scripts`.
