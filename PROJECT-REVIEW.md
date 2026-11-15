# Stride — `Ambitious513/2d-character`
## Project review & independently verified status

**Reviewed:** 2026-11-15 · **Commit reviewed:** `1788c4f` (HEAD of `main`)
**Commit message:** *"agent completed task unsure, next agent needs to check everything and update the documents"*
**Method:** fresh `git clone`, read every doc + the library source, then **actually ran** every gate that fits in this sandbox. **No source file was modified** (`git status --porcelain` is empty).

---

## 1. What this project actually is

**Stride** is a **frame-deterministic 2D character + environment library for [Remotion](https://remotion.dev)**, shipped together with two apps built on top of it. It is *not* a game, *not* a sprite sheet, and *not* a video file — the character is a **procedurally-drawn SVG rig** whose pose is a pure function of `(settings, frame, fps)`.

| Fact | Value |
| --- | --- |
| Package | `stride-character-kit` **2.2.0**, `private: true` |
| Language | TypeScript 5.7 + React 19 + Remotion 4.0.543 + Vite 6 |
| Size | ~11,450 lines of TS/TSX across `src` / `tests` / `scripts` (87 tracked files) |
| Cast | 6 — `milo`, `ada`, `kwame`, `juno`, `ravi`, `pip` (extensible via `registerCharacter()`) |
| Motions | 10 — walk, run, idle, wave, talk, jump, sit, point, think, dance |
| Emotions | 7 — neutral, happy, focused, surprised, sad, angry, excited |
| Wardrobe | 8 hair · 6 outfits · 5 builds · 7 accessories |
| Scenes | 4 (`street`, `park`, `room`, `backdrop`) × 3 lighting passes (`day`, `golden`, `night`) |
| Frame constants | `FPS=30`, `DURATION=300`, `1280×720`, `GROUND_Y=590`, `CHARACTER_X=650` |
| Alpha plate | `CharacterOnly` — 720×720, transparent, guides off |
| Preset schema | v2 envelope, with v1 migration (`environment` → `timeOfDay`) |

**The two apps:**
- **`/` — the visual studio.** Pose, dress, light and export a shot without writing code. Timeline, cast picker, reference overlay, presets, export modal, keyboard shortcuts.
- **`#/docs` — a live documentation site.** Nine sections, and every example is a **real running `<Player>`**, not a screenshot. Includes a fully steerable playground (26 controls), four live "explorers" (compositions / cast & motion / scenes / presets) and a working `parsePreset` importer. Lazily loaded as its own chunk.

### Why the determinism matters
Remotion renders frames **in parallel and out of order**. Any `Math.random()`, wall-clock read or `useId()` in the render path produces flicker that only appears in the finished video. So the rig uses:
- **`stableId(prefix, ...definingInputs)`** — content-hashed SVG gradient IDs, collision-safe across separate React roots (this bug shipped and was fixed **twice**; `tests/svg-ids.test.tsx` now guards it).
- **Stance-locked gait** — during stance the foot travels backwards at exactly ground speed, so the sole never ice-skates. A **two-bone IK solver** places the knee from the real hip joints.
- **Deterministic lip-sync** — visemes derived from the dialogue string, not audio analysis.

---

## 2. Architecture — the layer rule is the key idea

```
┌──────────────────────────────────────────────────────────┐
│ src/ui + src/App.tsx        visual studio (an APP)        │  NOT exported
│ src/docs + #/docs           live docs site (an APP)       │  NOT exported
├──────────────────────────────────────────────────────────┤
│ src/remotion                compositions + factories      │  exported
├──────────────────────────────────────────────────────────┤
│ src/rig                     the library proper            │  exported
│   gait · lipsync · cast · definition · preset · schema    │
│   environments/ (street/park/room/backdrop + lighting)    │
│   parts/ (face · hair · outfit · accessories)             │
└──────────────────────────────────────────────────────────┘
                    src/index.ts = the ONLY public surface
```

Both apps are **consumers** of the library, exactly like a host project would be. If a feature only works via the studio, it lives in the wrong layer. Consumption today is **copy-in** (`src/rig` + `src/remotion`, import from the barrel) — there is no npm build, no `exports` map.

**Data flow:** plain-JSON `SceneSettings` → `mergeSettings()` fills cast defaults → `samplePose(settings, frame, fps)` → `CharacterRig` draws SVG → `SceneLayer` draws the environment behind it.

---

## 3. What the last commit did

`1788c4f` landed **docs-site Stage 4** — the final stage of the docs plan:

| Change | Detail |
| --- | --- |
| `scripts/docs-smoke.mts` (**new**, 793 lines) | The Stage 3 harness promoted and widened **102 → 222 checks**. Deliberately `.mts` not `.mjs` so it stays inside `tsc -b`. Expectations derived from the library, not hard-coded. |
| `scripts/docs-stage3-check.mts` | deleted (superseded) |
| `package.json` | `+ "smoke:docs": "tsx scripts/docs-smoke.mts"` |
| `.github/workflows/ci.yml` | `browser-smoke` now runs studio smoke on dev, **then builds and runs the docs smoke against the production bundle** on :4173. Artifact renamed `browser-screenshots`. |
| `tests/packaging.test.tsx` | **+2 tests**: a docs-symbol leak check, and a **transitive relative-import walk** from `src/index.ts` proving nothing reachable touches `src/docs`, `src/ui`, `App.tsx`, `main.tsx`. Suite 81 → **83**. |
| README / ROADMAP / ARCHITECTURE / DOCS_SITE_PLAN | updated to "Stage 4 done, 83 tests, 222 checks" |
| `public/stride-remotion-kit.zip` | regenerated |
| `uploads/f8220c91-….txt` | **added — this is a regression, see Finding 2** |

**`PROGRESS.md` was not touched.** That is the core of the "update the documents" instruction.

---

## 4. Verification — what I ran myself, today

The handoff said "unsure". I did not take its word for anything.

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npx tsc -b` | ✅ **clean** |
| Unit + visual tests | `npm test` | ✅ **83 / 83 pass, 0 fail** (~4.9 s) |
| Production build | `npm run build` | ✅ built in 9.55 s — docs chunk **160.80 kB** (gzip 46.11) |
| **Docs browser gate** | `BASE_URL=…4173 npm run smoke:docs` | ✅ **222 checks passed, 0 failed**, zero console/page errors, 21 screenshots |
| Studio browser gate | `BASE_URL=…4173 npm run smoke` | ✅ **PASS** — desktop + mobile, playback, controls, overlay, presets, export |
| Render smoke | `remotion render … --frames=0-9` | ⚠️ **OOM-killed at 92 % bundling** — this sandbox is capped at 1 GB. Environment limit, matches the handoff note. CI covers it. |
| Determinism audit | `grep` for `Math.random` / `Date.now` / `new Date` / `useId` / `performance.now` in `src/rig` + `src/remotion` | ✅ **zero hits.** Randomness exists only in `App.tsx` and `docs/Playground.tsx` (UI picks settings; render path stays pure) |
| Secret scan | `git grep -E "ghp_…\|github_pat_…"` | ✅ **clean** — the leaked PAT is gone |
| Per-suite counts | ran each test file individually | ✅ rig 6 · library 24 · svg-ids 14 · packaging 30 · export-recipes 6 · visual 2 · kit-zip 1 = **83**, exactly as documented |

**Verdict: the previous agent's work is real and it is green.** Its uncertainty was about *bookkeeping*, not about broken code. Every headline claim (83 tests, 222 checks, docs chunk ~160 kB, packaging guards) reproduced exactly.

---

## 5. Findings — ranked, with evidence

### 🔴 P1 — `PROGRESS.md` contradicts the repository
The file that says **"Read this first if you are picking this project up"** is a full stage behind. `git show --stat 1788c4f` confirms it was never updated.

| `PROGRESS.md` says | Reality at HEAD |
| --- | --- |
| "State: Stage 3 complete… **81/81 tests**" (L11–12) | **83/83** |
| "**Next work: Stage 4**" (L19, L78, L622) | Stage 4 **shipped** in this very commit |
| "promote `scripts/docs-stage3-check.mts` → `docs-smoke.mjs`" (L79, L150, L624) | that file is **deleted**; it shipped as `docs-smoke.mts` |
| "harness is deliberately **not** wired into CI" (L152) | it **is** wired into CI |
| "`README.md` still says 81 tests and does not mention `#/docs`" (L193) | README says **83** and documents `#/docs` |
| "no tarballs, **no `uploads/`**" (L120) | `uploads/` is **back** |
| test table total **81** (L544) | **83** |
| "~7,100 lines of TS/TSX" (L681) | **~11,450** |

This breaks the repo's own **rule 5** ("Update this file whenever you make progress"). It is the single highest-value fix: the next agent reads this file first and would otherwise **redo Stage 4**.

### 🔴 P1 — junk file re-committed: `uploads/f8220c91-….txt`
237 bytes of scraped GitHub session boilerplate (*"You signed in with another tab or window…"*). Zero references anywhere. Commit `6d344e9` had **deliberately deleted** `uploads/*.txt` as junk with owner approval; `1788c4f` re-added one. Tracked files went 85 → 87. *(This is the same file attached to this conversation.)*

### 🟠 P2 — the kit ZIP is out of sync, and its guard cannot see it
`public/stride-remotion-kit.zip` holds **84 entries** vs **87 tracked files**. The delta:

```
public/stride-remotion-kit.zip   ← intentionally excluded
screenshots/.gitkeep             ← intentionally excluded
uploads/f8220c91-….txt           ← NOT excluded — genuine drift
```

`tests/kit-zip.test.ts` passes anyway, because it only checks a **required-files list + version + forbidden prefixes** — it never compares the full tree. So the claim in ROADMAP/ARCHITECTURE that the ZIP "matches the current source tree" is **stronger than what is enforced**. Deleting the junk file resolves the drift; making the guard a real tree comparison would stop it recurring. Note `generate-kit-zip.ts` has no `uploads/` exclusion, so a future `npm run kit:zip` would **ship that junk to users**.

### 🟡 P3 — smaller doc inaccuracies
- **"`git mv`, history preserved"** (DOCS_SITE_PLAN): `git log --follow scripts/docs-smoke.mts` returns only `1788c4f`. The 310 → 793-line rewrite was too large for rename detection. Cosmetic.
- **Studio-smoke cold-start flake** is still latent: `scripts/smoke.mjs` can fail clicking "SVG frame" while the export modal animates ("element is not stable"). Documented, unfixed — a real CI intermittency risk.
- **No lint/format gate.** No ESLint / Prettier / Biome config; `verify` is tsc + tests + build only.
- **Main bundle 862 kB** (266 kB gzip) trips Vite's 500 kB warning. Expected with the Remotion Player; docs are correctly split out. Not a defect, but unaddressed.
- **Import-graph guard regex** only matches side-effect imports at line start, so an unusual mid-line `import'./docs/x'` could slip past. Low risk; the `seen.size >= 20` self-check is a nice touch.

### ✅ Things I checked that are genuinely solid
- Determinism is real, not aspirational — audit came back clean.
- The speech memo cache is **bounded** (clears past 64 entries) and keyed by `text|rate|seed`, so it is both pure and memory-safe.
- The two new packaging guards are well-built; the handoff reports they were **mutation-tested** (adding a docs re-export to the barrel makes both fail).
- No credentials in any tracked file.
- `VERSION` in the barrel is pinned to `package.json` by a test.

---

## 6. What is genuinely left to build

The docs site is **finished** (Stages 0–4). Remaining, in the order the handoff recommends:

1. **Documentation reconciliation** — the "update the documents" half of the commit message. Fix `PROGRESS.md`, remove the junk file, refresh the ZIP. *Small, safe, high value.*
2. **Weather** (`rain` / `snow` / `fog`) — the one deferred Phase 3 item and the only thing between Phase 5 and closed. **No `weather` field exists yet** (confirmed by grep). Would thread `types.ts` → `schema.ts` → `palette.ts` → scene renderers → studio inspector → docs playground → goldens.
3. **Never verified anywhere: actual ProRes / WebM output.** CI renders a 10-frame **PNG sequence** only. Export recipes are validated at the flag level against Remotion's own validators, but no `.mov` / `.webm` has ever been produced. Needs ≥4 GB RAM. Also note `remotion.config.ts` defaults to **JPEG**, so every alpha render *must* pass `--image-format=png`.

### Open decisions — need the owner, do not guess
- **Publish to npm as `@stride/rig`?** Still `private: true`, named `stride-character-kit`, no library build, no `exports` map, no `peerDependencies`. Needs a scope owner and a build target.
- **Drop the v1 shims?** (`src/rig/Street.tsx`, the `Environment` type alias, `environment` → `timeOfDay`.) That is a **major** version bump.

---

## 7. Environment notes for this sandbox

- **1 GB RAM cap** (`memory.max = 1073741824`). Consequences I reproduced:
  - `vite dev` + Chromium → **`Target crashed`**. Workaround: `npm run build`, serve `dist/` statically, point the harness at it with `BASE_URL`. Both browser gates then pass.
  - Remotion render → **OOM-killed at 92 % bundling**, even with `--concurrency=1` and `--max-old-space-size=512`.
- Headless Chromium needs system libs (`npx playwright install --with-deps chromium`) — installed here.
- CI's larger runners are unaffected by either limit.

---

## 8. Recommended next step

**Proposed scope: a documentation truth-up + hygiene pass, no feature work.** Specifically:

1. Rewrite `PROGRESS.md`'s current-state sections to match HEAD — Stage 4 done, 83 tests, 222 checks, the corrected harness filename, the new CI shape, and this independent verification log.
2. Delete `uploads/f8220c91-….txt`; add `uploads/` to the kit-ZIP exclusions.
3. Regenerate the kit ZIP and **strengthen `tests/kit-zip.test.ts` into a real tree comparison** so this drift can never pass silently again.
4. Correct the two small doc inaccuracies (rename claim, LOC count).
5. Re-run `npm run verify` + both browser smokes, then hand back a real commit message.

That closes the commit's instruction exactly, and leaves **weather** and the **npm / v1-shim decisions** as clean, separately-scoped choices.

**Awaiting your go-ahead before writing any code.**