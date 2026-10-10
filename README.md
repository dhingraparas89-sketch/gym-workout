# Rep Sheet

Train smarter: explore human anatomy, discover exercises and see how muscles work on an interactive 3D model.

- **Exercise Library:** search, filter (muscle group, muscle, equipment, difficulty, pattern, compound / isolation) and sort.
- **Exercise page:** a 3D model with playback (play, pause, speed, step, scrub, rep counter, movement phase), camera presets, male / female model and Surface / Muscle Map / Fiber Detail display; muscles with estimated involvement, instructions, cues, mistakes and alternatives.
- **Exercise Analysis:** correct technique next to an instructional example of a common mistake, played in step, with the recommended and common-mistake paths and the corrective cue.
- **Muscle Explorer:** pick a muscle on the body map or the 3D model; location, function, joint actions, fiber direction, exercises.
- **Favorites, Recently Viewed, Compare**, and a guide level (Beginner / Standard / Advanced anatomy) saved on the device.

Percentages are estimated involvement, fibers are an illustrative overlay, and the mistake view is an instructional example, not an analysis of anyone's lifting.

## Run it

Open `index.html` in a browser. No build step.

## Files

| File | What it controls |
| --- | --- |
| `data/exercises.js`, `data/library/*.js`, `data/form.js` | Exercises, muscles and form guidance (see `data/SCHEMA.md`) |
| `js/figure.js` | 2D figures (card thumbnails, fallback when 3D is unavailable) |
| `js/figure3d.js`, `js/gym3d.js`, `js/kits/*.js` | The 3D viewer, body, equipment, playback and camera |
| `js/app.js` | Router and page shell |
| `js/ui/*.js` | Saved state (`store.js`), helpers and cards (`core.js`), playback bar (`player.js`), form guidance (`feedback.js`), pages |
| `styles/themes.css` | Design tokens (colors, fonts) |
| `styles/base.css`, `styles/app.css` | Layout and components |
