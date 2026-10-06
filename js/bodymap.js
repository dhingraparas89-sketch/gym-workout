// Body map: front and back views with each muscle as its own shape.
// Shapes are drawn for the left half of the body and mirrored for the right.

const BODY_BASE = {
  head: '<ellipse cx="60" cy="18" rx="10" ry="12"/>',
  neck: '<rect x="54" y="26" width="12" height="12" rx="3"/>',
  torso: '<path d="M36 39 Q60 33 84 39 Q91 44 89 58 Q84 84 80 110 Q83 120 82 132 Q60 140 38 132 Q37 120 40 110 Q36 84 31 58 Q29 44 36 39 Z"/>',
  half: `
    <path d="M33 44 L27 82" stroke-width="13"/>
    <path d="M27 82 L23 118" stroke-width="10"/>
    <circle cx="22" cy="124" r="5"/>
    <path d="M48 134 L45 178" stroke-width="21"/>
    <path d="M45 180 L45 228" stroke-width="13"/>
    <ellipse cx="44" cy="236" rx="7" ry="4"/>`
};

// Each entry: [muscle id, svg shape]. Shapes are for the left half.
const BODY_FRONT = [
  ["traps", '<path d="M55 33 L44 40 L55 42 Z"/>'],
  ["shoulders", '<ellipse cx="37" cy="47" rx="7.5" ry="8.5"/>'],
  ["chest", '<path d="M59 43 C51 40 42 43 40 51 C40 61 48 66 59 64 Z"/>'],
  ["biceps", '<ellipse cx="30.5" cy="67" rx="5" ry="11" transform="rotate(9 30.5 67)"/>'],
  ["forearms", '<ellipse cx="25.5" cy="100" rx="4.5" ry="14" transform="rotate(6 25.5 100)"/>'],
  ["abs", '<rect x="51.5" y="68" width="7.5" height="12" rx="2"/><rect x="51.5" y="82" width="7.5" height="12" rx="2"/><rect x="51.5" y="96" width="7.5" height="14" rx="2"/>'],
  ["obliques", '<path d="M48 70 C43 82 42 96 44 110 L49 109 C48 96 48 83 50 70 Z"/>'],
  ["quads", '<path d="M40 136 C38 152 40 166 44 177 L52 177 C55 164 56 150 56 137 Z"/>'],
  ["calves", '<ellipse cx="44.5" cy="202" rx="5" ry="15"/>']
];
const BODY_BACK = [
  ["traps", '<path d="M60 31 L45 41 L53 50 L60 64 Z"/>'],
  ["rear-delts", '<ellipse cx="37" cy="47" rx="7.5" ry="8.5"/>'],
  ["upper-back", '<path d="M58 66 L52 52 L46 50 L43 58 L50 72 L58 76 Z"/>'],
  ["lats", '<path d="M41 60 C38 74 41 90 49 104 L55 100 C52 90 50 80 49 74 Z"/>'],
  ["lower-back", '<path d="M52 98 L58.5 96 L58.5 118 L52 118 Z"/>'],
  ["triceps", '<ellipse cx="30.5" cy="67" rx="5" ry="11" transform="rotate(9 30.5 67)"/>'],
  ["forearms", '<ellipse cx="25.5" cy="100" rx="4.5" ry="14" transform="rotate(6 25.5 100)"/>'],
  ["glutes", '<ellipse cx="50" cy="127" rx="10.5" ry="10"/>'],
  ["hamstrings", '<path d="M40 141 C39 155 41 168 45 177 L52 177 C55 165 56 153 55 141 Z"/>'],
  ["calves", '<ellipse cx="45" cy="198" rx="6.5" ry="15"/>']
];

function bodyView(label, shapes, opts) {
  const primary = opts.primary || [], secondary = opts.secondary || [];
  const muscles = shapes.map(([id, shape]) => {
    const cls = ["m"];
    if (primary.includes(id)) cls.push("is-primary");
    else if (secondary.includes(id)) cls.push("is-secondary");
    if (opts.selected === id) cls.push("is-selected");
    const name = MUSCLES[id] || id;
    const attrs = opts.interactive ? ` data-muscle="${id}" tabindex="0" role="button" aria-label="${name}"` : "";
    return `<g class="${cls.join(" ")}"${attrs}><title>${name}</title>${shape}<g transform="translate(120 0) scale(-1 1)">${shape}</g></g>`;
  }).join("");
  return `<figure class="body-view">
    <svg viewBox="0 0 120 244" class="body-svg" aria-label="${label} view">
      <g class="body-base">${BODY_BASE.head}${BODY_BASE.neck}${BODY_BASE.torso}
        <g class="limbs">${BODY_BASE.half}<g transform="translate(120 0) scale(-1 1)">${BODY_BASE.half}</g></g>
      </g>
      ${muscles}
    </svg>
    <figcaption>${label}</figcaption>
  </figure>`;
}

// opts: { primary: [], secondary: [], selected: id, interactive: bool }
function bodyMap(opts = {}) {
  return `<div class="body-map${opts.interactive ? " is-interactive" : ""}">${bodyView("Front", BODY_FRONT, opts)}${bodyView("Back", BODY_BACK, opts)}</div>`;
}
