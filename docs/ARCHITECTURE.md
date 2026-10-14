# Architecture and audit (2026-10-09)

## What existed before this pass
- Plain HTML/CSS/JS, no build step. three.js r160 from jsdelivr is the only dependency.
- Body: procedural signed-distance-field skin (js/figure3d.js SKIN_DEFS → surface nets in a Web Worker → one SkinnedMesh). The female was the male's shape rescaled, which is why she did not read as female.
- Animation: procedural two-pose (a → b) reps driven by joint angles shared with the 2D figures (js/figure.js), plus IK for hands on bars/handles. No keyframed animation assets.
- Equipment: procedural kits (js/gym3d.js, js/kits/*.js) fitted to sampled skin contact each rep.
- Duplicates removed: a stale root app.js (old data.js site), unused root PNGs, three visual themes reduced to one design system.

## Current structure
- Data: data/exercises.js, data/form.js, data/library/*.js (incl. v3-*), data/library/meta.js (catalog, defaults), data/anatomy.js (muscle anatomy). Schema: data/SCHEMA.md.
- 3D: js/gym3d.js (renderer, lights, equipment parts), js/kits/*.js (equipment kits), js/figure3d.js (body, hair, clothing, poses, viewer API: playback, camera, display modes, athlete).
- UI: js/ui/store.js (local storage; ready for plans/history/logs), core.js, player.js, feedback.js, detail.js, muscles.js, pages.js; js/app.js router; styles/base.css, themes.css, app.css.

## Honesty rules
Activation is estimated involvement, not measured EMG. Fibers are an illustrative fiber-direction overlay. The mistake view is an instructional example; there is no camera or pose tracking. Animations are procedural and not biomechanically validated.
