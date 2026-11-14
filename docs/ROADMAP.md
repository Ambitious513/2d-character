# Stride roadmap

The kit is built in phases. Each phase ends with a green `npm run verify`, a
refreshed contact sheet and an updated README, so it can be tagged and pushed on
its own.

| Phase | Theme | Status |
| --- | --- | --- |
| 1 | Foundation & character quality | ✅ done |
| 2 | Cast & wardrobe depth | planned |
| 3 | Environment library | planned |
| 4 | Remotion packaging & presets | planned |
| 5 | Studio polish, docs site & CI | planned |

---

## Phase 1 — Foundation & character quality

Goal: the repo compiles, the rig is anatomically correct, and every cast member
actually looks like themselves.

**Build repair**

- Restore the missing `PRESETS` export (now cast-driven, in `rig/presets.ts`).
- Reinstate `Environment` as a deprecated alias of `TimeOfDay`.
- Remove the duplicate `colors` key in `characterSettings`.
- Move the studio and compositions onto `timeOfDay`, with `environment` still
  accepted from v1 presets.
- Register the compositions the npm scripts already reference.
- Fit all seven expressions inside the `EmotionSheet` frame.

**Rig correctness**

- Content-hashed SVG gradient ids, so independently rendered rigs never bleed
  palettes into each other (this is what made all six characters orange).
- Leg IK is solved from the real hip joints instead of the hip centre, so thigh
  and shin lengths are preserved in the drawing.
- A dedicated standing hip height, so idle/wave/talk/point/think stand upright
  instead of freezing mid-stride.
- Reworked wave, talk and think performances; shoulders moved out to the torso
  edge so arms and hands read clearly.

## Phase 2 — Cast & wardrobe depth

More cast members, more hair/outfit/accessory combinations, richer expression
set, and a wardrobe browser in the studio.

## Phase 3 — Environment library

`SceneId` already advertises `park`, `room` and `backdrop`; only `street` is
implemented. Phase 3 builds the missing environments plus shared lighting,
weather and parallax controls.

## Phase 4 — Remotion packaging & presets

A single import surface (`@stride/rig`), typed composition factories, scene
presets, alpha/ProRes export recipes and a versioned preset schema.

## Phase 5 — Studio polish, docs site & CI

Keyboard-first studio UX, a docs site with live examples, visual regression
snapshots and a CI matrix that renders a short clip on every PR.
