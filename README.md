# Rep Sheet

A gym website that shows what to lift and how to lift it.

- **Posture figures:** every exercise has an animated figure doing the rep with correct form (highlighted green) next to the most common mistake (highlighted red), each with a one-line cue.
- **Body map:** front and back views show the main muscles and the helping muscles for each exercise. Tap a muscle to see every exercise that trains it.
- **Workout plan:** pick Full body, Push / Pull / Legs, or Upper / Lower. Each day shows the muscles it covers, sets × reps, rest and a rough session length. Tap any exercise for its form and muscles.
- **Three styles:** Iron Plate, Chalkboard and Clean Studio, switchable from the top bar.

## Run it

Open `index.html` in a browser. No build step.

## Edit it

| File | What it controls |
| --- | --- |
| `data/exercises.js` | Exercises: sets, reps, rest, muscles, form cues, and the two poses for each figure |
| `data/plans.js` | The weekly plans and the list of styles |
| `js/figure.js` | Draws and animates the posture figures (pose angles are explained at the top) |
| `js/bodymap.js` | The front and back body map shapes |
| `js/app.js` | Page logic |
| `styles/themes.css` | Colors and fonts for each style, including the green/red highlight colors |
| `styles/base.css` | Layout shared by all styles |

### Changing a pose

Each figure is drawn from bone angles in degrees: `0` points up, `90` points right (the way the figure faces), `180` points down. For example, `torso: 40` leans the upper body 40° forward. Each exercise has an `a` pose (start of the rep) and a `b` pose (end), and the figure moves between them. The `bad` entry overrides some of those angles to show the mistake, and `highlight` picks which body parts glow.
