# Export recipes

How to get Stride characters out of Remotion and into an editor, a game engine
or a web page — with the alpha channel intact.

Every flag on this page was verified against the version of Remotion this repo
pins (`@remotion/cli` / `remotion` **^4.0.543**). If you upgrade Remotion,
re-check with `npx remotion render --help`.

---

## The one gotcha that breaks every alpha render

`remotion.config.ts` sets a **global default of JPEG** for video frames:

```ts
Config.setVideoImageFormat('jpeg');   // fast + small, but JPEG has no alpha
```

JPEG cannot store transparency. If you ask for an alpha pixel format while the
image format is still JPEG, Remotion throws:

> `Pixel format was set to 'yuva444p10le' but the image format is not PNG.
> To render transparent videos, you need to set PNG as the image format.`

**Always pass `--image-format=png` on alpha renders.** Every alpha recipe below
includes it. (The CLI flag overrides the config file, so you do not need to edit
`remotion.config.ts`.)

---

## Which composition to render

| Composition | Size | Background | Use for |
| --- | --- | --- | --- |
| `CharacterOnly` | 720×720 | **transparent** | alpha plates, sprites, compositing |
| `WalkScene` | 1280×720 | environment | finished shot with a world |
| `SceneOnly` | 1280×720 | environment | background plate, no character |
| `TalkingHead` | 720×720 | backdrop | lip-synced avatar |
| `DialogueScene` | 1280×720 | backdrop | two-hander conversation |

`CharacterOnly` is the alpha workhorse: transparent `AbsoluteFill`, character
centred, guides forced off.

---

## 1. PNG sequence — maximum compatibility

The safest option. Every editor, engine and image tool reads it, and alpha is
lossless. Use this when you are unsure.

```bash
npm run render:alpha
# remotion render src/remotion/index.ts CharacterOnly renders/frames \
#   --image-format=png --sequence
```

Produces `renders/frames/element-0.png`, `element-1.png`, … one file per frame.

Import into Premiere/Resolve as an *image sequence* at **30 fps** (`FPS` in
`src/rig/gait.ts`). In Godot/Unity, load them as sprite frames.

---

## 2. ProRes 4444 — for video editors

A single `.mov` with a real alpha channel. This is what Premiere Pro, Final Cut
and DaVinci Resolve want. Large files, visually lossless.

```bash
npm run render:alpha:prores
# remotion render src/remotion/index.ts CharacterOnly renders/character.mov \
#   --codec=prores --prores-profile=4444 \
#   --pixel-format=yuva444p10le --image-format=png
```

- `--prores-profile=4444` — the only standard profile carrying alpha.
  Valid profiles in this version: `4444-xq`, `4444`, `hq`, `standard`, `light`,
  `proxy`. **`hq` and below have no alpha channel** — the render succeeds and
  silently gives you a black background, so double-check the profile.
- `--pixel-format=yuva444p10le` — the `a` is the alpha channel; 10-bit 4:4:4
  keeps edges clean.
- Use `4444-xq` if you are grading heavily afterwards.

---

## 3. WebM / VP9 — for the web

Small files with alpha, playable in every modern browser.

```bash
npm run render:alpha:webm
# remotion render src/remotion/index.ts CharacterOnly renders/character.webm \
#   --codec=vp9 --pixel-format=yuva420p --image-format=png
```

```html
<video src="/character.webm" autoplay loop muted playsinline></video>
```

`vp8` also works with `yuva420p` and encodes faster, at a larger file size.
Note `yuva420p` is 4:2:0 — chroma is subsampled, so very saturated edges can
fringe slightly. Prefer ProRes or PNG when the character has hard, saturated
outlines against transparency.

---

## 4. Opaque MP4 — social / review copies

No alpha needed, smallest useful file.

```bash
npx remotion render src/remotion/index.ts WalkScene renders/walk.mp4 --codec=h264
```

`npm run render` does exactly this. Add `--crf=18` for higher quality
(lower = better; default is codec-dependent).

---

## 5. Stills and contact sheets

```bash
npm run still          # one PNG at frame 60
npm run render:sheet   # every cast member in one image
npm run render:motions # every motion in one image
```

Or any frame of any composition:

```bash
npx remotion still src/remotion/index.ts WalkScene renders/golden.png \
  --frame=90 --props='{"character":"ada","timeOfDay":"golden","scene":"park"}'
```

`--props` takes the same JSON as a preset's `settings` object, so you can pipe
a preset straight in.

---

## 6. Scaling and other useful flags

```bash
--scale=2            # 2× resolution (1440×1440 for CharacterOnly)
--frames=0-89        # render a subrange
--concurrency=4      # parallel render workers
--image-format=png   # required for alpha; also finer stills
```

---

## Determinism

The rig is a pure function of `(settings, frame, fps)` — no `Math.random()`, no
wall-clock, no `useId()`. Two renders of the same frame are byte-identical, which
is what makes frame-accurate compositing and visual regression testing possible.

SVG gradient ids are content-hashed (`src/rig/id.ts`) rather than allocated per
React root. This matters when you render several characters into **separate**
SVG roots and concatenate them: with `useId()` every root restarted its counter,
all six cast members emitted `garment-R0`, and the first definition won — every
character wore Milo's jacket. `tests/svg-ids.test.tsx` guards this.

Verify it yourself:

```bash
npm run check:ids      # one gradient id per cast member, no collisions
npm run check:env-ids  # one gradient per scene × lighting pass
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Pixel format was set to … but the image format is not PNG` | config defaults to JPEG | add `--image-format=png` |
| Black box instead of transparency | ProRes profile without alpha | `--prores-profile=4444` |
| Alpha lost in the editor | editor ignored the alpha track | set the clip to *straight/unmatted* alpha |
| Every character wears the same colour | gradient id collision | run `npm run check:ids`; see `src/rig/id.ts` |
| Character clipped at the frame edge | `scale` too high for the plate | lower `scale`, or `--scale=2` for more room |
| Dialogue cuts off mid-word | hand-set `durationInFrames` | use `DialogueComposition`, which derives length from the script |
