// Checks every pose in data/exercises.js against natural joint ranges.
// Run: node tools/check-poses.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ctx = { console, performance: { now: () => 0 } };
vm.createContext(ctx);
for (const f of ["data/exercises.js", "js/figure.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8") + "\nthis.EXERCISES = typeof EXERCISES !== 'undefined' ? EXERCISES : this.EXERCISES; this.checkPose = typeof checkPose !== 'undefined' ? checkPose : this.checkPose;", ctx);
}
let problems = 0;
for (const ex of ctx.EXERCISES) {
  const f = ex.figure;
  const poses = {
    "a": { ...f.a, view: f.view }, "b": { ...f.b, view: f.view },
    "mistake a": { ...f.a, view: f.view, ...(ex.bad.a || {}) }, "mistake b": { ...f.b, view: f.view, ...(ex.bad.b || {}) }
  };
  // The 3D character may use its own poses (figure3d / bad3d).
  const f3 = ex.figure3d;
  if (f3 && (f3.a || f3.b)) {
    const b3 = ex.bad3d || {};
    Object.assign(poses, {
      "3D a": { ...(f3.a || f.a) }, "3D b": { ...(f3.b || f.b) },
      "3D mistake a": { ...(f3.a || f.a), ...(b3.a || ex.bad.a || {}) }, "3D mistake b": { ...(f3.b || f.b), ...(b3.b || ex.bad.b || {}) }
    });
  }
  for (const [name, p] of Object.entries(poses)) {
    const issues = ctx.checkPose(p, name.startsWith("3D") ? (f3.armsOut ?? f.armsOut) : f.armsOut);
    if (issues.length) { problems++; console.log(`${ex.name} (${name}): ${issues.join(", ")}`); }
  }
}
console.log(problems ? `${problems} pose(s) outside natural ranges` : "All poses within natural joint ranges");
process.exit(problems ? 1 : 0);
