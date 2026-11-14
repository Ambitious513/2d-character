# PROGRESS — agent handoff

**Read this first if you are picking this project up.** It records what state the
repo is in, what was just done, and exactly where to continue.

- **Last updated:** 2026-11-15
- **Version:** 2.2.0 (`package.json` and `Kit.VERSION` — kept in sync by a test)
- **Branch:** `main`
- **Repo:** `Ambitious513/2d-character`
- **State:** ✅ green — re-verified 2026-11-15 from a clean clone: typecheck clean,
  **78/78 tests pass**, production build succeeds, `check:ids` 6/6 unique
- **Commit:** `6d32d3f` — **pushed to `origin/main` on 2026-11-15.** GitHub now
  serves real source; the tarballs are gone from the working tree.

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

The previous agents' work was **never committed as source** — it was dumped into
tarballs at the repo root (`latest.gz`, then `latest main.tar.gz`). That work has
now been **recovered, unpacked into real source files, verified, structured and
documented**. Phase 4 is complete. The repo root no longer contains any tarball.

It is **pushed** — `origin/main` is `6d32d3f`. Nothing is half-finished and there
is no broken code to repair.

**Start Phase 5.** Best first task: visual-regression snapshots (see below).

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

## What this session did (2026-11-15) — arrangement

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
npm test                         # 78/78 pass, 0 fail
npm run build                    # ✓ built
npm run check:ids                # 6 of 6 unique gradient ids — no collision
npm run check:env-ids            # street 3/3, park 6/6, room 6/6, backdrop 6/6
npm ci --dry-run                 # clean — lockfile in sync
```

Rendering is still unverified here for the same 1 GB RAM reason documented below.

### Pushed

`git push origin main` → `d3ae613..6d32d3f`. Remote tree re-read through the
GitHub API to confirm the arrangement landed (no tarballs, no `uploads/`,
`PROGRESS.md` and `src/rig/id.ts` present, version `2.2.0`).

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
npm run verify      # typecheck + 78 tests + build — ALL GREEN
```

| Suite | Tests | Guards |
| --- | --- | --- |
| `tests/rig.test.ts` | 6 | IK maths |
| `tests/library.test.tsx` | 24 | determinism, foot-lock, lip-sync, cast, environments |
| `tests/svg-ids.test.tsx` | 14 | gradient-id collisions across React roots |
| `tests/packaging.test.tsx` | 28 | barrel, preset envelope + v1 migration, factories |
| `tests/export-recipes.test.ts` | 6 | alpha recipes stay valid |
| **total** | **78** | |

### ⚠️ What could NOT be verified here

**Actual video rendering.** The sandbox is capped at **1 GB RAM**; Remotion's
webpack bundle plus headless Chrome gets OOM-killed at ~100% bundling. Tried
`--concurrency=1` and `NODE_OPTIONS=--max-old-space-size=512/640` — still killed.
This is an **environment limit, not a code defect**.

So the export recipes are verified at the flag/validation level (against
Remotion's own validator functions) but **no `.mov`/`.webm` was actually produced**.
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

## Where to continue — Phase 5

In recommended order:

1. **Visual-regression snapshots (highest value).** The rig is byte-deterministic,
   so `renderToStaticMarkup(CharacterRig)` snapshots are cheap, need no browser,
   and would catch *drawing* regressions that the current unit tests miss. Suggest
   `tests/visual.test.tsx` covering each cast member × motion × emotion at a few
   fixed frames, plus each scene × lighting pass. Store hashes or golden SVG under
   `tests/__golden__/`. **This is the natural next step and unblocks safe refactor.**
2. **CI render job.** `.github/workflows/ci.yml` currently runs typecheck/test/build
   plus a Playwright studio smoke test. Add a short alpha render on PR (GitHub
   runners have ~7 GB, so the memory problem above does not apply). Assert the
   output exists and has alpha.
3. **Refresh `public/stride-remotion-kit.zip`.** The studio's "Download project ZIP"
   button (`src/ui/Dialogs.tsx:47`) serves a **stale 86 KB pre-restructure
   snapshot**. Either regenerate it from current source via a script, or replace
   the button with a generated-on-demand download. Left alone this session because
   the file is user-facing and referenced.
4. **Keyboard-first studio UX** — shortcuts for cycling motion/emotion, frame stepping.
5. **Docs site** with live `<Player>` examples.
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

## Key facts you will need

- Frame constants (`src/rig/gait.ts`): `FPS=30`, `DURATION=300`, `WIDTH=1280`,
  `HEIGHT=720`, `GROUND_Y=590`, `CHARACTER_X=650`.
- `CharacterOnly` is the alpha plate: **720×720, transparent**, guides off.
- Cast: `milo`, `ada`, `kwame`, `juno`, `ravi`, `pip`.
- Scenes: `street`, `park`, `room`, `backdrop` × `day`, `golden`, `night`.
- `PRESET_SCHEMA_VERSION = 2`; bump it only when an existing field's *meaning* changes.
- Studio: `npm run dev` → :5173. Remotion Studio: `npm run studio`.
- ~7,100 lines of TS/TSX across `src`, `tests`, `scripts`.
