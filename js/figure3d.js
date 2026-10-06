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
// Each body segment is ONE smooth mesh. It starts as a base shape (a lathe profile for the
// trunk and limbs, an ellipsoid for the head, hands and feet) and each muscle is an ellipsoid
// that pushes the skin outward with a smooth blend, so muscles swell out of the body instead
// of sitting on top of it. Every vertex remembers how much each muscle shaped it; that weight
// is used to color the worked muscles.

// Smooth maximum: like Math.max, but rounds the crease where two shapes meet.
function smax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}
const smooth01 = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function makeBody3D(THREE, mats) {
  const parts = {};      // segment name -> THREE.Group
  const skinMeshes = {}; // highlight key -> skin meshes in that body part
  const skinList = [];   // every skin mesh (vertex-colored)

  // Feature: [muscleId|null, x, y, z, rx, ry, rz, rot?, k?]
  function prepFeatures(list) {
    return list.map(([id, x, y, z, rx, ry, rz, rot, k]) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(rx, ry, rz));
      const inv = m.clone().invert().elements;
      return { id, inv, k: k || 1.6 };
    });
  }
  // Distance along the ray O + t*d at which it leaves the ellipsoid (or -1).
  function exitT(f, ox, oy, oz, dx, dy, dz) {
    const e = f.inv;
    const px = e[0] * ox + e[4] * oy + e[8] * oz + e[12], py = e[1] * ox + e[5] * oy + e[9] * oz + e[13], pz = e[2] * ox + e[6] * oy + e[10] * oz + e[14];
    const ux = e[0] * dx + e[4] * dy + e[8] * dz, uy = e[1] * dx + e[5] * dy + e[9] * dz, uz = e[2] * dx + e[6] * dy + e[10] * dz;
    const a = ux * ux + uy * uy + uz * uz, b = 2 * (px * ux + py * uy + pz * uz), c = px * px + py * py + pz * pz - 1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    return (-b + Math.sqrt(disc)) / (2 * a);
  }
  // Push every vertex out along a ray from its origin until it clears all features.
  function sculpt(geo, origin, features, offset) {
    const pos = geo.attributes.position, n = pos.count, O = new THREE.Vector3(), V = new THREE.Vector3();
    const weights = {};
    features.forEach((f) => { if (f.id && !weights[f.id]) weights[f.id] = new Float32Array(n); });
    for (let i = 0; i < n; i++) {
      V.fromBufferAttribute(pos, i);
      origin(V, O);
      const d = V.clone().sub(O); const base = d.length(); if (base < 1e-6) continue; d.divideScalar(base);
      let r = base;
      features.forEach((f) => {
        const t = exitT(f, O.x, O.y, O.z, d.x, d.y, d.z);
        if (t <= 0) return;
        r = smax(r, t, f.k);
        if (f.id) weights[f.id][i] = Math.max(weights[f.id][i], smooth01(base - 3.2, base + 1.4, t));
      });
      r += offset || 0;
      pos.setXYZ(i, O.x + d.x * r, O.y + d.y * r, O.z + d.z * r);
    }
    geo.computeVertexNormals();
    weldNormals(geo);
    return weights;
  }
  // Average normals of vertices that share a position (lathe and sphere seams, poles).
  function weldNormals(geo) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, map = new Map();
    for (let i = 0; i < pos.count; i++) {
      const key = `${Math.round(pos.getX(i) * 200)},${Math.round(pos.getY(i) * 200)},${Math.round(pos.getZ(i) * 200)}`;
      (map.get(key) || map.set(key, []).get(key)).push(i);
    }
    const s = new THREE.Vector3(), t = new THREE.Vector3();
    map.forEach((ids) => {
      if (ids.length < 2) return;
      s.set(0, 0, 0); ids.forEach((i) => s.add(t.fromBufferAttribute(nor, i))); s.normalize();
      ids.forEach((i) => nor.setXYZ(i, s.x, s.y, s.z));
    });
  }
  function latheGeo(profile, depth, phiStart) {
    const curve = new THREE.SplineCurve(profile.map(([y, r]) => new THREE.Vector2(r, y)));
    const pts = curve.getPoints(Math.max(36, profile.length * 9));
    pts[0].x = 0.001; pts[pts.length - 1].x = 0.001;
    const geo = new THREE.LatheGeometry(pts, 56, phiStart || 0);
    geo.scale(depth, 1, 1);
    const y0 = profile[0][0], y1 = profile[profile.length - 1][0];
    const r0 = profile[1][1] * 0.6, r1 = profile[profile.length - 2][1] * 0.6;
    // Rays leave from the axis; near the ends they fan out from a point inside so caps round off.
    const origin = (v, O) => O.set(0, Math.min(Math.max(v.y, y0 + r0), y1 - r1), 0);
    return { geo, origin };
  }
  function ellipsoidGeo(cx, cy, cz, rx, ry, rz) {
    const geo = new THREE.SphereGeometry(1, 48, 34);
    geo.scale(rx, ry, rz); geo.translate(cx, cy, cz);
    return { geo, origin: (v, O) => O.set(cx, cy, cz) };
  }
  function finish(group, key, shape, featureList, opts = {}) {
    const weights = sculpt(shape.geo, shape.origin, prepFeatures(featureList), opts.offset);
    const mat = opts.mat || mats.skin;
    const m = new THREE.Mesh(shape.geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    if (mat === mats.skin) {
      shape.geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(shape.geo.attributes.position.count * 3).fill(1), 3));
      m.userData.weights = weights; m.userData.tone = opts.tone || 1;
      skinList.push(m); (skinMeshes[key] = skinMeshes[key] || []).push(m);
    }
    return m;
  }
  // A vein: a thin tube laid just over the skin of a finished segment.
  function vein(group, key, mesh, path, radius) {
    const ray = new THREE.Raycaster(); const out = [];
    mesh.updateMatrixWorld(true);
    path.forEach(([y, ang]) => {
      const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      ray.set(new THREE.Vector3(0, y, 0).add(dir.clone().multiplyScalar(30)), dir.clone().negate());
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) out.push(hit.point.clone().add(dir.multiplyScalar(radius * 0.35)));
    });
    if (out.length < 3) return;
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(out), out.length * 6, radius, 8, false);
    const m = new THREE.Mesh(geo, mats.skin);
    geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    m.userData.weights = {}; m.userData.tone = 0.93;
    group.add(m); skinList.push(m); (skinMeshes[key] = skinMeshes[key] || []).push(m);
  }
  function seg(name) { const g = new THREE.Group(); parts[name] = g; return g; }

  // Segments are built pointing up their local +y; on the trunk local +x is the front.
  // Pelvis, belly and lower back (hip -> middle of the spine, 26 units before scaling).
  {
    const g = seg("lowerTorso");
    const glutes = [[ "glutes", -5.2, 0.8, 6.2, 5.6, 7.4, 6.6, null, 2.2 ], [ "glutes", -5.2, 0.8, -6.2, 5.6, 7.4, 6.6, null, 2.2 ]];
    const abs = [];
    [[19.6, 2.5], [14.4, 2.5], [9.2, 2.6]].forEach(([y, ry]) => [-1, 1].forEach((s) =>
      abs.push(["abs", 5.6, y, s * 2.45, 2.6, ry, 2.25, null, 0.7])));
    abs.push(["abs", 5.8, 3.8, 0, 2.6, 3.6, 4.2, null, 1.4]);
    finish(g, "spine", latheGeo([[-7, 3], [-5, 9], [-1, 13], [4, 13.4], [10, 12.2], [16, 11.6], [22, 11.8], [27, 12.2], [30, 9]], 0.66), [
      ...abs,
      ["obliques", 1.6, 12.5, 9.6, 4.4, 9.5, 3.2, [0.12, 0, 0], 2.4], ["obliques", 1.6, 12.5, -9.6, 4.4, 9.5, 3.2, [-0.12, 0, 0], 2.4],
      ["lower-back", -5.4, 14, 3.2, 2.6, 10, 3, null, 1.2], ["lower-back", -5.4, 14, -3.2, 2.6, 10, 3, null, 1.2],
      ...glutes
    ]);
    finish(g, null, latheGeo([[-7.4, 3.2], [-5.4, 9.4], [-1.2, 13.4], [4, 13.8], [9, 12.8], [11.4, 12.4], [12.2, 0.1]], 0.7),
      glutes, { mat: mats.shorts, offset: 0.7 });
  }
  // Ribcage, chest, lats and upper back (middle of the spine -> shoulders).
  {
    const g = seg("upperTorso");
    finish(g, "spine", latheGeo([[-4, 11.8], [2, 12.2], [8, 13.4], [14, 14.6], [19, 15.4], [23, 14.6], [26, 11.4], [28.5, 6.5], [30, 0.1]], 0.64), [
      ["chest", 7.2, 17.4, 6.2, 3.4, 5.6, 7.6, [0.25, 0, -0.15], 1.8], ["chest", 7.2, 17.4, -6.2, 3.4, 5.6, 7.6, [-0.25, 0, -0.15], 1.8],
      ["obliques", 3.8, 7, 11.6, 3.6, 5, 2.2, null, 1.0], ["obliques", 3.8, 7, -11.6, 3.6, 5, 2.2, null, 1.0],
      ["lats", -3, 11, 12.4, 5.6, 11, 3.4, [-0.25, 0, 0], 2.2], ["lats", -3, 11, -12.4, 5.6, 11, 3.4, [0.25, 0, 0], 2.2],
      ["upper-back", -6.8, 17, 5.4, 3, 7, 5.4, null, 1.4], ["upper-back", -6.8, 17, -5.4, 3, 7, 5.4, null, 1.4],
      ["traps", -2.2, 25, 6.6, 4.4, 4.2, 7.4, [0.35, 0, 0], 2.2], ["traps", -2.2, 25, -6.6, 4.4, 4.2, 7.4, [-0.35, 0, 0], 2.2],
      ["traps", -6.4, 21.5, 0, 2.6, 7.4, 4.6, null, 1.6]
    ]);
  }
  // Neck and head.
  {
    const g = seg("neck");
    finish(g, "neck", latheGeo([[-3, 6], [2, 5], [6, 4.7], [9, 4.9], [11, 4]], 0.95), [
      [null, 2.2, 4.4, 2.2, 1.5, 5.8, 1.4, [0.35, 0, -0.25], 1.0], [null, 2.2, 4.4, -2.2, 1.5, 5.8, 1.4, [-0.35, 0, -0.25], 1.0],
      ["traps", -3, 1, 0, 3, 5, 5.6, null, 2]
    ]);
    const head = new THREE.Group(); head.position.y = 15.5; g.add(head); parts.head = head;
    finish(head, "head", ellipsoidGeo(-0.4, 0.8, 0, 8.2, 9.6, 7.6), [
      [null, 3.4, -3.4, 0, 5, 5.8, 6.2, null, 2.2],                    // face
      [null, 4.4, -7, 0, 3.8, 2.8, 4.8, null, 1.6],                     // jaw
      [null, 7.2, -8.4, 0, 1.7, 1.6, 2.3, null, 1.0],                   // chin
      [null, 6.6, 2.7, 0, 1.6, 1.2, 5, null, 1.0],                      // brow
      [null, 5.6, -1.4, 4.1, 2, 1.6, 2.2, null, 1.2], [null, 5.6, -1.4, -4.1, 2, 1.6, 2.2, null, 1.2], // cheekbones
      [null, 8.4, -1.2, 0, 1.3, 2.6, 1.05, [0, 0, -0.28], 0.8],         // nose
      [null, 8.6, -3.2, 0, 1, 0.8, 1.6, null, 0.6],                     // nose tip and nostrils
      [null, 7.7, -5, 0, 1, 0.75, 2.4, null, 0.6],                      // lips
      [null, -0.8, -0.4, 7.4, 1.3, 2.7, 1.1, null, 0.6], [null, -0.8, -0.4, -7.4, 1.3, 2.7, 1.1, null, 0.6] // ears
    ]);
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mats.eye);
      eye.position.set(6.55, 1.0, s * 2.75); eye.scale.set(0.9, 0.85, 1.15); head.add(eye);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mats.dark);
      iris.position.set(7.35, 1.0, s * 2.7); iris.scale.set(0.3, 0.5, 0.5); head.add(iris);
    });
    const lips = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mats.lips);
    lips.position.set(8.05, -5.05, 0); lips.scale.set(0.5, 0.35, 2.1); head.add(lips);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.hair);
    hair.scale.set(8.6, 10, 8.0); hair.position.set(-1.2, 1.7, 0); hair.rotation.z = 0.38; hair.castShadow = true;
    head.add(hair);
  }
  // Arms and legs, one set per side (side = +1 near the camera, -1 far).
  [1, -1].forEach((side) => {
    const s = side > 0 ? "R" : "L", a = -1; // limbs hang down, so local -x is the front of the body
    const ua = seg("upperArm" + s);
    finish(ua, "upperArm", latheGeo([[-3, 4], [0, 5.6], [6, 5.2], [14, 4.4], [22, 4], [28, 3.6], [32, 3]], 0.95), [
      ["shoulders", 0.2, 4, 0, 6.4, 8.8, 6.8, null, 2.2],
      ["rear-delts", -a * 2.8, 4.6, 0, 3.8, 7.4, 5.4, null, 1.6],
      ["biceps", a * 2.2, 17, 0, 3.3, 8.4, 3.8, null, 1.2],
      ["triceps", -a * 2.2, 13, side * 1.2, 3.2, 9.5, 3.4, null, 1.0], ["triceps", -a * 2.4, 16, -side * 1.4, 3.2, 8.5, 3.2, null, 1.0],
      [null, 0, 30, 0, 3.4, 3.4, 3.4, null, 1.6]
    ]);
    const fa = seg("forearm" + s);
    const faMesh = finish(fa, "forearm", latheGeo([[-1.5, 3.4], [3, 4.1], [8, 4], [16, 3.1], [23, 2.4], [27, 2.2]], 0.82), [
      ["forearms", -a * 0.8, 7, side * 1.3, 3.4, 8.4, 3.4, null, 1.4], ["forearms", a * 0.6, 8, -side * 1.2, 3.2, 8, 3.2, null, 1.4]
    ]);
    finish(fa, "forearm", ellipsoidGeo(0, 29.6, 0, 1.6, 3.4, 3), [
      [null, a * 0.9, 33.2, 0, 1.5, 2.4, 2.9, [0, 0, a * 0.5], 0.9],   // curled fingers
      [null, 0, 31.6, 0, 1.9, 1.4, 3.2, null, 0.8],                     // knuckles
      [null, a * 1.4, 28.6, side * 2.3, 1.05, 2.6, 1.05, [side * 0.4, 0, 0], 0.7] // thumb
    ]);
    vein(fa, "forearm", faMesh, [[3, 2.6], [8, 2.9], [13, 2.5], [18, 2.8], [23, 2.6]].map(([y, ang]) => [y, side > 0 ? ang : -ang + Math.PI * 0]), 0.3);
    const th = seg("thigh" + s);
    finish(th, "thigh", latheGeo([[-4, 8.2], [0, 8.8], [8, 8.2], [18, 7.2], [30, 5.8], [38, 4.8], [43, 4.4]], 0.94), [
      ["quads", a * 3.2, 19, 0, 5, 16, 6, null, 1.6],
      ["quads", a * 2, 33.5, -side * 2.8, 3.4, 6, 3.6, null, 1.2],      // teardrop above the knee
      ["quads", a * 2, 23, side * 4, 3.6, 13, 3.4, null, 1.2],          // outer sweep
      ["hamstrings", -a * 3.6, 18, 0, 4.6, 15, 5.6, null, 1.6],
      [null, a * 2.6, 41.5, 0, 2.2, 2.8, 3.2, null, 1.0]                // kneecap
    ]);
    finish(th, null, latheGeo([[-5, 9], [0, 9.4], [8, 8.9], [13, 8.4], [13.6, 0.1]], 1.0), [
      [null, a * 3.2, 9, 0, 5, 10, 6, null, 1.6], [null, -a * 3.6, 9, 0, 4.6, 10, 5.6, null, 1.6]
    ], { mat: mats.shorts, offset: 0.6 });
    const sh = seg("shin" + s);
    finish(sh, "shin", latheGeo([[-3, 3.6], [-1, 4.4], [4, 4.2], [12, 3.8], [22, 3.1], [34, 2.4], [42, 2.5], [44, 1.6]], 0.92), [
      ["calves", -a * 3, 11, 1.6, 3.2, 9.5, 3.2, null, 1.2], ["calves", -a * 2.8, 12.5, -1.8, 3.2, 9, 3.2, null, 1.2],
      [null, a * 2.6, 14, 0, 1.8, 14, 2.2, null, 1.4],                  // shin bone ridge
      [null, 0, 42, side * 2.4, 1.4, 1.6, 1.2, null, 0.8], [null, 0, 42, -side * 2.4, 1.4, 1.6, 1.2, null, 0.8] // ankle bones
    ]);
    const ft = seg("foot" + s);
    finish(ft, "foot", ellipsoidGeo(-1.2, 6.6, 0, 2.3, 7.4, 3.4), [
      [null, -0.6, 0.8, 0, 2.9, 3.4, 2.9, null, 1.2],                   // heel
      [null, -0.9, 12.2, 0, 1.6, 2.6, 3.4, null, 1.0]                   // toes
    ]);
  });
  return { parts, skinMeshes, skinList };
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
  function skinNoise() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
    return t;
  }
  const mats = {
    // Skin color comes from vertex colors (set in setHighlights); a fine noise bump gives it pores.
    skin: new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.52, metalness: 0,
      sheen: 0.35, sheenColor: new THREE.Color(0xffc9a8), sheenRoughness: 0.6, clearcoat: 0.14, clearcoatRoughness: 0.45,
      envMapIntensity: 0.6, bumpMap: skinNoise(), bumpScale: 0.6 }),
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
    body.skinList.forEach((m) => { m.material = mats.skin; });
    rings.splice(0).forEach((r) => scene.remove(r));
    glowSegs = []; glowJoints = [];
    const hl = (mode === "bad" ? ex.bad.highlight : ex.good.highlight) || [];
    const segMap = { spine: ["spine"], neck: ["neck"], upperArm: ["upperArm"], forearm: ["forearm"], arm: ["upperArm", "forearm"],
      thigh: ["thigh"], shin: ["shin"], foot: ["foot"], leg: ["thigh", "shin"] };
    const glowMat = mats.skin.clone();
    glowMat.emissive = highlightColor.clone(); glowMat.emissiveIntensity = 0.28;
    glowMat.color = new THREE.Color(1, 1, 1).lerp(highlightColor, 0.28);
    hl.forEach((h) => (segMap[h] || []).forEach((sname) => glowSegs.push(sname)));
    glowSegs.forEach((sname) => (body.skinMeshes[sname] || []).forEach((m) => { m.material = glowMat; }));
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
    // Skin color per vertex, tinted where the worked muscles shape the body.
    const skin = col("--skin", "#d9a07a"), prim = col("--m-primary", "#e0702a"), sec = col("--m-secondary", "#f6c59b");
    const c = new THREE.Color();
    body.skinList.forEach((m) => {
      const colors = m.geometry.attributes.color, w = m.userData.weights, tone = m.userData.tone;
      const pIds = Object.keys(w).filter((id) => ex.primary.includes(id)), sIds = Object.keys(w).filter((id) => ex.secondary.includes(id));
      for (let i = 0; i < colors.count; i++) {
        let p = 0, s = 0;
        pIds.forEach((id) => { p = Math.max(p, w[id][i]); });
        sIds.forEach((id) => { s = Math.max(s, w[id][i]); });
        c.copy(skin).multiplyScalar(tone).lerp(prim, p * 0.72).lerp(sec, s * 0.6 * (1 - p));
        colors.setXYZ(i, c.r, c.g, c.b);
      }
      colors.needsUpdate = true;
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
