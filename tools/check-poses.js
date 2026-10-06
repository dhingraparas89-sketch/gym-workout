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
  for (const [name, p] of Object.entries(poses)) {
    const issues = ctx.checkPose(p, f.armsOut);
    if (issues.length) { problems++; console.log(`${ex.name} (${name}): ${issues.join(", ")}`); }
  }
}
console.log(problems ? `${problems} pose(s) outside natural ranges` : "All poses within natural joint ranges");
process.exit(problems ? 1 : 0);
