// 3D exercise character (needs three.js loaded as the global THREE).
//
// The body is built from shaded muscle shapes and driven by the same poses
// and joint limits as the 2D figure (see js/figure.js): the side-view angles
// move the body in its own plane, and "abd" swings the arms out to the side.
//
//   const viewer = createViewer3D(container, "good");   // or "bad"
//   viewer.setExercise(exercise);
//   viewer.dispose();
//
// Drag to turn the character; double-click to reset the view.

const VIEW3D = {
  near: 1,        // the near side of the body faces the camera (+z)
  shoulderHalf: 15.5,
  hipHalf: 8.5,
  yaw: 0.62,      // default camera angle around the figure (radians from a pure side view)
  pitch: 0.12
};

function css(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

// ---------- Body parts ----------
// Each segment is one smooth surface of revolution (a lathe profile, squashed front-to-back),
// with muscle shapes sunk into it so they read as bulges under the skin and can be tinted.
function makeBody3D(THREE, mats) {
  const parts = {};      // segment name -> THREE.Group
  const muscles = [];    // { mesh, id }
  const skinMeshes = {}; // segment name -> meshes that glow when highlighted

  const sphere = new THREE.SphereGeometry(1, 32, 22);
  function track(seg, m) { if (seg) (skinMeshes[seg] = skinMeshes[seg] || []).push(m); }
  function blob(group, seg, x, y, z, rx, ry, rz, mat, muscleId, rot) {
    const m = new THREE.Mesh(sphere, mat || mats.skin);
    m.position.set(x, y, z);
    m.scale.set(rx, ry, rz);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.castShadow = true;
    group.add(m);
    if (muscleId) { m.material = mats.skin.clone(); muscles.push({ mesh: m, id: muscleId }); }
    if (!mat || mat === mats.skin) track(seg, m);
    return m;
  }
  // profile: [[y, radius], ...] from bottom to top; depth squashes front-to-back (local x).
  function lathe(group, seg, profile, depth, mat, shiftX) {
    const curve = new THREE.SplineCurve(profile.map(([y, r]) => new THREE.Vector2(r, y)));
    const pts = curve.getPoints(profile.length * 6);
    pts[0].x = 0.01; pts[pts.length - 1].x = 0.01; // close both ends
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat || mats.skin);
    m.scale.set(depth, 1, 1);
    if (shiftX) m.position.x = shiftX;
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    if (!mat || mat === mats.skin) track(seg, m);
    return m;
  }
  function seg(name) { const g = new THREE.Group(); parts[name] = g; return g; }

  // Segments are built pointing up their local +y; local +x is the front of the torso.
  // Pelvis, belly and lower back (hip -> middle of the spine, 26 units before scaling).
  {
    const g = seg("lowerTorso");
    lathe(g, "spine", [[-7, 3], [-5, 9], [-1, 13.2], [4, 13.8], [10, 12.6], [16, 12], [22, 12.2], [27, 12.6], [30, 10]], 0.68);
    // Six-pack: three rows of two, plus the lower belly.
    [[19.5, 2.6], [14.2, 2.6], [8.8, 2.8]].forEach(([y, ry]) => [-1, 1].forEach((s) =>
      blob(g, "spine", 6.5, y, s * 2.5, 2.2, ry, 2.3, null, "abs")));
    blob(g, "spine", 6.6, 3.6, 0, 2, 3.4, 4.2, null, "abs");
    [-1, 1].forEach((s) => {
      blob(g, "spine", 2.2, 13, s * 9.8, 4.4, 9.5, 3, null, "obliques", [s * 0.12, 0, 0]);
      blob(g, "spine", -6.2, 14, s * 3.4, 2.8, 10, 3.2, null, "lower-back");
    });
    // Shorts and glutes.
    lathe(g, null, [[-7.6, 3.4], [-5.6, 9.8], [-1.4, 14.2], [4, 14.7], [9, 13.5], [11.5, 13.1], [12.5, 0.1]], 0.74, mats.shorts);
    [-1, 1].forEach((s) => {
      blob(g, "spine", -5.6, 0.6, s * 6.4, 5.4, 7.2, 6.4, null, "glutes");
      blob(g, null, -5.7, 0.8, s * 6.4, 6.2, 7.9, 7.1, mats.shorts);
    });
  }
  // Ribcage, chest, lats and upper back (middle of the spine -> shoulders).
  {
    const g = seg("upperTorso");
    lathe(g, "spine", [[-4, 12.2], [2, 12.6], [8, 13.8], [14, 15.2], [19, 16], [23, 15], [26, 11.5], [28.5, 6.5], [30, 0.1]], 0.66);
    [-1, 1].forEach((s) => {
      blob(g, "spine", 8.2, 17.6, s * 6, 3, 5.6, 6.6, null, "chest", [s * -0.2, 0, -0.12]);
      blob(g, "spine", 4.4, 6.5, s * 12, 3.6, 5, 2.2, null, "obliques");                  // serratus
      blob(g, "spine", -3.4, 11, s * 12.6, 5.6, 10.5, 3.4, null, "lats", [s * -0.25, 0, 0]);
      blob(g, "spine", -7.4, 17, s * 5.6, 3, 7, 5.4, null, "upper-back");
      blob(g, "spine", -2.6, 25, s * 6.6, 4.4, 4, 7.6, null, "traps", [s * 0.35, 0, 0]);
    });
    blob(g, "spine", -7, 22, 0, 2.6, 7, 4.6, null, "traps");
  }
  // Neck and head.
  {
    const g = seg("neck");
    lathe(g, "neck", [[-2, 6.2], [2, 5.2], [6, 4.9], [9, 5.1], [11, 4]], 0.95);
    blob(g, "neck", 2.4, 4.6, 2.2, 1.5, 5.6, 1.4, null, null, [0.35, 0, -0.25]);   // neck tendons
    blob(g, "neck", 2.4, 4.6, -2.2, 1.5, 5.6, 1.4, null, null, [-0.35, 0, -0.25]);
    const head = new THREE.Group(); head.position.y = 15.5; g.add(head); parts.head = head;
    blob(head, "neck", -0.4, 0.6, 0, 8.4, 9.6, 7.8);                       // cranium
    blob(head, "neck", 3.6, -3.6, 0, 5, 5.8, 6.4);                          // face and cheeks
    blob(head, "neck", 4.6, -7.2, 0, 3.6, 2.8, 4.6);                        // jaw and chin
    blob(head, "neck", 6.8, 2.6, 0, 1.6, 1.2, 5.2);                         // brow
    blob(head, "neck", 8.6, -1, 0, 1.4, 2.6, 1.15, null, null, [0, 0, -0.25]); // nose
    blob(head, "neck", 7.6, -4.8, 0, 0.9, 0.7, 2.6, mats.lips);            // mouth
    [-1, 1].forEach((s) => {
      blob(head, "neck", -0.8, -0.4, s * 7.8, 1.3, 2.6, 1);                 // ears
      blob(head, null, 6.7, 1.0, s * 2.8, 0.95, 0.85, 1.2, mats.eye);
      blob(head, null, 7.5, 1.0, s * 2.8, 0.35, 0.45, 0.45, mats.dark);
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.hair);
    hair.scale.set(8.8, 10, 8.2); hair.position.set(-1.2, 1.4, 0); hair.rotation.z = 0.38; hair.castShadow = true;
    head.add(hair);
  }
  // Arms and legs, one set per side (side = +1 near the camera, -1 far).
  [1, -1].forEach((side) => {
    const s = side > 0 ? "R" : "L", a = -1; // limbs hang down, so local +x is the back of the body
    const ua = seg("upperArm" + s);
    lathe(ua, "upperArm", [[-3, 4], [0, 6], [6, 5.6], [14, 4.8], [22, 4.3], [28, 3.8], [32, 3.2]], 0.95);
    blob(ua, "upperArm", 0.4, 4.4, 0, 6.6, 9, 7, null, "shoulders");
    blob(ua, "upperArm", -a * 3.2, 4.4, 0, 3.8, 7.4, 5.6, null, "rear-delts");
    blob(ua, "upperArm", a * 2.2, 17, 0, 3.4, 8.6, 3.8, null, "biceps");
    blob(ua, "upperArm", -a * 2.3, 14.5, 0, 3.4, 10.5, 4, null, "triceps");
    blob(ua, "upperArm", 0, 30, 0, 3.6, 3.6, 3.6);
    const fa = seg("forearm" + s);
    lathe(fa, "forearm", [[-1.5, 3.6], [3, 4.4], [8, 4.2], [16, 3.3], [23, 2.6], [27, 2.4]], 0.82);
    blob(fa, "forearm", -a * 0.4, 7.5, 0, 3.8, 8.6, 4.2, null, "forearms");
    blob(fa, "forearm", 0, 29.4, 0, 1.7, 3.6, 3.2);                        // palm
    blob(fa, "forearm", a * 0.9, 33.2, 0, 1.6, 2.4, 3.1, null, null, [0, 0, a * 0.5]); // curled fingers
    blob(fa, "forearm", a * 1.4, 28.4, 2.4, 1.1, 2.6, 1.1, null, null, [0.4, 0, 0]); // thumb
    const th = seg("thigh" + s);
    lathe(th, "thigh", [[-4, 8.4], [0, 9.2], [8, 8.6], [18, 7.6], [30, 6.2], [38, 5.2], [43, 4.6]], 0.94);
    blob(th, "thigh", a * 3.4, 19, 0, 5.2, 16, 6.4, null, "quads");
    blob(th, "thigh", a * 2.2, 34, -side * 2.6, 3.4, 6, 3.6, null, "quads"); // teardrop above the knee
    blob(th, "thigh", -a * 3.8, 18, 0, 4.8, 15, 5.8, null, "hamstrings");
    blob(th, "thigh", a * 2.6, 41.5, 0, 2.2, 2.8, 3.2);                         // kneecap
    lathe(th, null, [[-5, 9.4], [0, 10], [8, 9.5], [13, 9], [13.6, 0.1]], 1.0, mats.shorts);
    const sh = seg("shin" + s);
    lathe(sh, "shin", [[-1, 4.6], [4, 4.4], [12, 4], [22, 3.3], [34, 2.5], [42, 2.6], [44, 1.6]], 0.92);
    blob(sh, "shin", -a * 3.2, 11, 1.6, 3.4, 9.5, 3.4, null, "calves");
    blob(sh, "shin", -a * 3, 12.5, -1.8, 3.4, 9, 3.4, null, "calves");
    blob(sh, "shin", 0, 42, 0, 2.8, 2.6, 3.2);
    const ft = seg("foot" + s);
    blob(ft, "foot", -1.2, 6.6, 0, 2.5, 7.6, 3.6);
    blob(ft, "foot", -0.6, 0.6, 0, 3, 3.6, 3);
    blob(ft, "foot", -0.8, 12.4, 0, 1.8, 2.6, 3.4);
  });
  return { parts, muscles, skinMeshes };
}

// ---------- Viewer ----------
function createViewer3D(container, mode) {
  const THREE = window.THREE;
  if (!THREE) return null;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "figure3d";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
  // Soft studio reflections: a gradient dome baked into an environment map.
  {
    const envScene = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    const pos = dome.geometry.attributes.position, colors = [];
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) / 10 + 1) / 2;
      const c = new THREE.Color(0x3a332e).lerp(new THREE.Color(0xfff4e8), Math.pow(t, 1.6));
      colors.push(c.r, c.g, c.b);
    }
    dome.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    envScene.add(dome);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0x5a4a40, 0.55));
  const key = new THREE.DirectionalLight(0xfff1e2, 2.4);
  key.position.set(120, 260, 200);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  Object.assign(key.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 800 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 1.3);
  rim.position.set(-200, 120, -160);
  scene.add(rim);

  const col = (name, fb) => new THREE.Color(css(name, fb));
  const mats = {
    skin: new THREE.MeshPhysicalMaterial({ color: col("--skin", "#d9a07a"), roughness: 0.5, metalness: 0, sheen: 0.4,
      sheenColor: new THREE.Color(0xffc9a8), sheenRoughness: 0.6, envMapIntensity: 0.6 }),
    lips: new THREE.MeshStandardMaterial({ color: col("--skin-shade", "#c48a65").lerp(new THREE.Color(0x9a4a3c), 0.4), roughness: 0.5 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xf2eee8, roughness: 0.2 }),
    shorts: new THREE.MeshStandardMaterial({ color: col("--shorts", "#222"), roughness: 0.85 }),
    hair: new THREE.MeshStandardMaterial({ color: col("--hair", "#2b1d14"), roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.4 }),
    equip: new THREE.MeshStandardMaterial({ color: col("--equip", "#8a8a85"), roughness: 0.5, metalness: 0.5 }),
    pad: new THREE.MeshStandardMaterial({ color: col("--pad", "#2b2b2b"), roughness: 0.8 }),
    plate: new THREE.MeshStandardMaterial({ color: col("--plate", "#2a2a2a"), roughness: 0.6, metalness: 0.2 }),
    floor: new THREE.MeshStandardMaterial({ color: col("--floor3d", "#d9dcda"), roughness: 1 })
  };

  // Floor that fades out at the edge, so there is no hard horizon.
  {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, "#fff"); grad.addColorStop(0.55, "#bbb"); grad.addColorStop(1, "#000");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    mats.floor.alphaMap = new THREE.CanvasTexture(c);
    mats.floor.transparent = true;
    mats.floor.depthWrite = false;
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(260, 64), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const body = makeBody3D(THREE, mats);
  Object.values(body.parts).forEach((g) => { if (g !== body.parts.head) scene.add(g); });
  const equipment = new THREE.Group();
  scene.add(equipment);

  const highlightColor = col(mode === "bad" ? "--bad" : "--good", mode === "bad" ? "#d9473b" : "#1e9a5f");
  const rings = [];
  let ex = null, poseA = null, poseB = null, load = {}, glowSegs = [], glowJoints = [];
  let yaw = VIEW3D.yaw, pitch = VIEW3D.pitch, target = new THREE.Vector3(0, 90, 0), dist = 400;
  let raf = 0, disposed = false;

  // ----- Interaction -----
  let drag = null;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    yaw = drag.yaw - (e.clientX - drag.x) * 0.01;
    pitch = Math.max(-0.2, Math.min(0.9, drag.pitch + (e.clientY - drag.y) * 0.006));
  });
  el.addEventListener("pointerup", () => { drag = null; });
  el.addEventListener("pointercancel", () => { drag = null; });
  el.addEventListener("dblclick", () => { yaw = VIEW3D.yaw; pitch = VIEW3D.pitch; });

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);

  // ----- Equipment -----
  function clearEquipment() {
    while (equipment.children.length) equipment.remove(equipment.children[0]);
    load = {};
  }
  function cyl(r, len, mat, axis) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), mat);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = Math.PI / 2;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const to3 = (p) => new THREE.Vector3(p[0] - 100, 189 - p[1], 0);

  function buildEquipment(fig) {
    clearEquipment();
    (fig.props || []).forEach((pr) => {
      if (pr.rect) {
        const [x, y, w, h] = pr.rect;
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, pr.depth || 30), mats.pad);
        box.position.set(x + w / 2 - 100, 189 - (y + h / 2), 0);
        box.castShadow = true; box.receiveShadow = true;
        equipment.add(box);
      }
      if (pr.line) {
        const [x1, y1, x2, y2] = pr.line;
        const p1 = to3([x1, y1]), p2 = to3([x2, y2]);
        // Uprights that stand on the floor reach it even when the floor is lowered.
        [p1, p2].forEach((q) => { if (q.y <= 4) q.y = Math.min(q.y, floor.position.y); });
        const len = p1.distanceTo(p2), mid = p1.clone().add(p2).multiplyScalar(0.5);
        if (pr.axis === "z") {
          // A bar across the body (pull-up bar): runs left-right.
          const bar = cyl(1.6, 110, mats.equip, "z"); bar.position.copy(mid); equipment.add(bar);
          return;
        }
        const zs = pr.pair ? [-23, 23] : (len > 80 && Math.abs(x1 - x2) < 1 ? [-34] : [-13, 13]);
        zs.forEach((z) => {
          const c = cyl((pr.w || 6) / 2, len, mats.equip);
          c.position.set(mid.x, mid.y, z);
          c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
          equipment.add(c);
        });
      }
    });
    const L = fig.load || {};
    if (L.type === "barbell") {
      const g = new THREE.Group();
      const r = L.r || 13;
      g.add(cyl(1.3, 150, mats.equip, "z"));
      [-1, 1].forEach((s) => {
        const p = cyl(r, 5, mats.plate, "z"); p.position.z = s * 52; g.add(p);
        const p2 = cyl(r * 0.8, 4, mats.plate, "z"); p2.position.z = s * 57; g.add(p2);
        const c = cyl(2.6, 3, mats.equip, "z"); c.position.z = s * 47; g.add(c);
      });
      equipment.add(g); load.bar = g;
    }
    if (L.type === "dumbbell") {
      load.dbs = [1, -1].map(() => {
        const g = new THREE.Group();
        g.add(cyl(1.1, 14, mats.equip, "z"));
        [-1, 1].forEach((s) => { const p = cyl(5, 3.4, mats.plate, "z"); p.position.z = s * 5.6; g.add(p); });
        equipment.add(g); return g;
      });
    }
    if (L.type === "cable") {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      load.cable = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: css("--equip", "#888") }));
      load.from = to3(L.from); load.from.z = (fig.props || []).some((p) => p.line && Math.abs(p.line[0] - p.line[2]) < 1 && Math.abs(p.line[1] - p.line[3]) > 80) ? -34 : 0;
      equipment.add(load.cable);
      load.handle = cyl(1.2, 16, mats.equip, "z"); equipment.add(load.handle);
      const pulley = cyl(3.2, 2.4, mats.plate, "z"); pulley.position.copy(load.from); equipment.add(pulley);
    }
    if (L.type === "roller") { load.roller = cyl(4.5, 26, mats.pad, "z"); equipment.add(load.roller); }
    if (L.type === "footplate") {
      load.plate = new THREE.Mesh(new THREE.BoxGeometry(3, 30, 46), mats.equip);
      load.plate.castShadow = true; equipment.add(load.plate);
    }
  }

  // ----- Posing -----
  const Y = new THREE.Vector3(0, 1, 0);
  function dir2(angleDeg) { const r = (angleDeg * Math.PI) / 180; return new THREE.Vector3(Math.sin(r), Math.cos(r), 0); }
  // Bones move in the side-view plane: rotate local +y (up) to the bone's direction, then apply any arm-out swing.
  function placeAngle(group, start, angleDeg, extra) {
    group.position.copy(start);
    group.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (-angleDeg * Math.PI) / 180);
    if (extra) group.quaternion.premultiply(extra);
  }
  const endOf = (group, len) => new THREE.Vector3(0, len, 0).applyQuaternion(group.quaternion).add(group.position);

  function pose(p) {
    const j = solveSide(p);
    const hip = to3(j.hip), shoulderC = to3(j.shoulder), mid = to3(j.spineMid);
    const lowerA = Math.atan2(mid.x - hip.x, mid.y - hip.y) * 180 / Math.PI;
    const upperA = Math.atan2(shoulderC.x - mid.x, shoulderC.y - mid.y) * 180 / Math.PI;
    placeAngle(body.parts.lowerTorso, hip, lowerA);
    const lowLen = hip.distanceTo(mid);
    body.parts.lowerTorso.scale.set(1, lowLen / 26, 1);
    placeAngle(body.parts.upperTorso, mid, upperA);
    body.parts.upperTorso.scale.set(1, shoulderC.distanceTo(mid) / 26, 1);
    const neckBase = shoulderC.clone().add(dir2(upperA).multiplyScalar(-1));
    placeAngle(body.parts.neck, neckBase, p.neck ?? p.torso);

    const torsoQ = body.parts.upperTorso.quaternion;
    const lateral = new THREE.Vector3(0, 0, 1);
    const abd = ((p.abd || 0) * Math.PI) / 180;
    [1, -1].forEach((side) => {
      const s = side > 0 ? "R" : "L";
      // Shoulder joint: out to the side and slightly down from the top of the torso.
      const sh = shoulderC.clone().add(new THREE.Vector3(0, -3, 0).applyQuaternion(torsoQ)).add(lateral.clone().multiplyScalar(side * VIEW3D.shoulderHalf));
      let extra = null;
      if (abd) {
        const axis = p.abdAxis === "spine" ? new THREE.Vector3(0, 1, 0).applyQuaternion(torsoQ) : new THREE.Vector3(1, 0, 0).applyQuaternion(torsoQ);
        extra = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), side * (p.abdAxis === "spine" ? -abd : abd));
      }
      const uaLen = 30 * (p.armsOut && !abd ? 0.8 : 1);
      placeAngle(body.parts["upperArm" + s], sh, p.ua, extra);
      body.parts["upperArm" + s].scale.set(1, uaLen / 30, 1);
      const elbow = endOf(body.parts["upperArm" + s], uaLen);
      placeAngle(body.parts["forearm" + s], elbow, p.fa, extra);
      const hip3 = hip.clone().add(lateral.clone().multiplyScalar(side * VIEW3D.hipHalf));
      const far = side < 0 && p.t2 != null;
      const thighDir = far ? p.t2 : p.thigh + 180;
      const shinDir = far ? p.s2 : p.shin + 180;
      const footDir = far ? (p.f2 ?? 90) : (p.foot ?? 90);
      placeAngle(body.parts["thigh" + s], hip3, thighDir);
      const knee = endOf(body.parts["thigh" + s], 42);
      placeAngle(body.parts["shin" + s], knee, shinDir);
      const ankle = endOf(body.parts["shin" + s], 42);
      placeAngle(body.parts["foot" + s], ankle, footDir);
    });

    // Equipment that moves with the body.
    const handR = endOf(body.parts.forearmR, 30), handL = endOf(body.parts.forearmL, 30);
    const L = ex.figure.load || {};
    if (load.bar) {
      if (L.at === "shoulder") {
        const at = to3(j.shoulder); const off = L.offset || [0, 0];
        load.bar.position.set(at.x + off[0], at.y - off[1], 0);
      } else load.bar.position.set((handR.x + handL.x) / 2, (handR.y + handL.y) / 2, 0);
    }
    if (load.dbs) {
      [handR, handL].forEach((h, i) => {
        load.dbs[i].position.copy(h);
        load.dbs[i].quaternion.copy(body.parts[i ? "forearmL" : "forearmR"].quaternion);
      });
    }
    if (load.cable) {
      const pos = load.cable.geometry.attributes.position;
      pos.setXYZ(0, load.from.x, load.from.y, load.from.z); pos.setXYZ(1, handR.x, handR.y, (handR.z + handL.z) / 2); pos.needsUpdate = true;
      load.handle.position.set(handR.x, handR.y, (handR.z + handL.z) / 2);
    }
    if (load.roller) { const a = endOf(body.parts.shinR, 42); load.roller.position.set(a.x, a.y + 5, 0); }
    if (load.plate) {
      const ft = body.parts.footR, toe = endOf(ft, 9);
      load.plate.position.copy(toe).add(new THREE.Vector3(-3, 0, 0).applyQuaternion(ft.quaternion)).setZ(0);
      load.plate.quaternion.copy(ft.quaternion);
    }

    // Joint rings for the posture highlight.
    const jointPos = {
      knee: endOf(body.parts.thighR, 42), hip: hip.clone().setZ(VIEW3D.hipHalf), elbow: endOf(body.parts.upperArmR, uaLenOf(p)),
      shoulder: body.parts.upperArmR.position, ankle: endOf(body.parts.shinR, 42), hand: handR,
      spineMid: mid.clone().setZ(0), head: endOf(body.parts.neck, 15.5)
    };
    rings.forEach((r) => { const q = jointPos[r.userData.joint]; if (q) r.position.copy(q).setZ(q.z + 4); });
  }
  const uaLenOf = (p) => 30 * (p.armsOut && !p.abd ? 0.8 : 1);

  function setHighlights() {
    // Reset.
    Object.values(body.skinMeshes).flat().forEach((m) => { m.material = m.userData.base || m.material; });
    rings.splice(0).forEach((r) => scene.remove(r));
    glowSegs = []; glowJoints = [];
    const hl = (mode === "bad" ? ex.bad.highlight : ex.good.highlight) || [];
    const segMap = { spine: ["spine"], neck: ["neck"], upperArm: ["upperArm"], forearm: ["forearm"], arm: ["upperArm", "forearm"],
      thigh: ["thigh"], shin: ["shin"], foot: ["foot"], leg: ["thigh", "shin"] };
    const glowMat = mats.skin.clone();
    glowMat.emissive = highlightColor.clone(); glowMat.emissiveIntensity = 0.32;
    glowMat.color = mats.skin.color.clone().lerp(highlightColor, 0.3);
    hl.forEach((h) => (segMap[h] || []).forEach((sname) => glowSegs.push(sname)));
    glowSegs.forEach((sname) => (body.skinMeshes[sname] || []).forEach((m) => {
      if (body.muscles.some((mu) => mu.mesh === m && (ex.primary.includes(mu.id) || ex.secondary.includes(mu.id)))) return;
      m.userData.base = m.userData.base || m.material; m.material = glowMat;
    }));
    hl.filter((h) => ["knee", "hip", "elbow", "shoulder", "ankle", "hand", "back", "head"].includes(h)).forEach((h) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 1.3, 12, 40),
        new THREE.MeshBasicMaterial({ color: highlightColor, transparent: true, opacity: 0.9, depthTest: false }));
      ring.renderOrder = 10; ring.userData.joint = h === "back" ? "spineMid" : h;
      scene.add(ring); rings.push(ring);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 14),
        new THREE.MeshBasicMaterial({ color: highlightColor, transparent: true, opacity: 0.22, depthWrite: false }));
      ring.add(halo);
      glowJoints.push(ring);
    });
    // Worked muscles.
    const prim = col("--m-primary", "#e0702a"), sec = col("--m-secondary", "#f6c59b");
    body.muscles.forEach(({ mesh, id }) => {
      const base = mesh.userData.base || mesh.material;
      const isP = ex.primary.includes(id), isS = ex.secondary.includes(id);
      base.color.copy(mats.skin.color);
      if (isP) base.color.lerp(prim, 0.75);
      else if (isS) base.color.lerp(sec, 0.6);
      base.emissive = new THREE.Color(0x000000);
      mesh.material = base;
    });
  }

  function frameCamera() {
    // Fit the whole rep: sample the motion and take its bounds.
    const pts = [];
    [0, 0.5, 1].forEach((t) => {
      const j = solveSide(lerpPose(poseA, poseB, t));
      Object.values(j).forEach((v) => { if (Array.isArray(v)) pts.push(v); });
    });
    const xs = pts.map((p) => p[0] - 100), ys = pts.map((p) => 189 - p[1]);
    const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 20, minY = Math.max(0, Math.min(...ys) - 12), maxY = Math.max(...ys) + 16;
    // Hanging exercises: drop the floor well below the feet.
    floor.position.y = ex.figure.noFloor ? Math.min(0, Math.min(...ys) - 40) : 0;
    target.set((minX + maxX) / 2, (minY + maxY) / 2, 0);
    const size = Math.max(maxX - minX, maxY - minY, 120);
    dist = size / 2 / Math.tan((camera.fov * Math.PI) / 360) * 1.25;
  }

  function easeT(now) {
    const period = 3200, raw = (now % period) / period;
    return Math.min(1, Math.max(0, (0.5 - 0.5 * Math.cos(raw * 2 * Math.PI)) * 1.3 - 0.15));
  }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!ex || !container.isConnected) return;
    const t = reduce ? 1 : easeT(now);
    pose(lerpPose(poseA, poseB, t));
    const pulse = 0.4 + 0.25 * Math.sin(now / 260);
    glowJoints.forEach((r) => { r.material.opacity = 0.6 + 0.4 * pulse; r.lookAt(camera.position); });
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(target);
    renderer.render(scene, camera);
  }

  function setExercise(next) {
    ex = next;
    const fig = { ...ex.figure, ...(ex.figure3d || {}) };
    const fault = mode === "bad" ? { ...ex.bad, ...(ex.bad3d || {}) } : null;
    const extra = { armsOut: fig.armsOut, abd: fig.abd, abdAxis: fig.abdAxis };
    poseA = { ...extra, ...fig.a, ...(fault && fault.a) };
    poseB = { ...extra, ...fig.b, ...(fault && fault.b) };
    poseA.view = poseB.view = undefined;
    frameCamera();
    buildEquipment(fig);
    setHighlights();
    resize();
  }

  raf = requestAnimationFrame(tick);
  return {
    setExercise,
    resetView() { yaw = VIEW3D.yaw; pitch = VIEW3D.pitch; },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      el.remove();
    }
  };
}
