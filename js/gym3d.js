// Gym equipment, floor and lighting for the 3D exercise scenes (needs three.js as the global THREE).
//
// Everything is built to commercial-gym sizes in centimetres, from real parts: powder-coated
// steel tube frames with end caps, bolts and gussets, upholstered pads on boards, chrome guide
// rods, selectorized weight stacks with a selector pin, grooved pulleys on bearings, braided
// cables, knurled bars with sleeves and collars, and rubber grips. figure3d.js fits every piece
// to the body (pads to the back and seat, bars and handles into the hands) and moves the
// moving parts with the rep, so body, cable, pulley and weight behave as one connected system.

const GYM3D = (() => {
  const T = () => window.THREE;
  let MAT = null;
  const geoCache = new Map();
  const cached = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };

  // ---------- Textures (drawn once, shared by every viewer) ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function canvas(size, draw) { const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size); return c; }
  function tex(c, repeat, color) {
    const THREE = T(), t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat, repeat);
    if (color && "colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // Soft value noise: random cells scaled up smoothly, a few octaves.
  function noiseCanvas(size, seed, octaves, lo, hi) {
    const r = rng(seed);
    return canvas(size, (g) => {
      g.fillStyle = "rgb(128,128,128)"; g.fillRect(0, 0, size, size);
      octaves.forEach(([cells, alpha]) => {
        const small = canvas(cells, (h) => {
          const img = h.createImageData(cells, cells);
          for (let i = 0; i < img.data.length; i += 4) { const v = lo + r() * (hi - lo); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
          h.putImageData(img, 0, 0);
        });
        g.globalAlpha = alpha; g.imageSmoothingEnabled = cells < size / 2;
        // Draw 3x3 so the scaled-up noise tiles without a seam.
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) g.drawImage(small, dx * size, dy * size, size, size);
      });
      g.globalAlpha = 1;
    });
  }
  // Knurling: a fine diamond cross-hatch.
  function knurlCanvas(size, n) {
    return canvas(size, (g) => {
      g.fillStyle = "#909090"; g.fillRect(0, 0, size, size);
      g.strokeStyle = "#202020"; g.lineWidth = size / n * 0.32;
      for (let i = -n; i <= 2 * n; i++) {
        const o = (i * size) / n;
        g.beginPath(); g.moveTo(o, 0); g.lineTo(o + size, size); g.stroke();
        g.beginPath(); g.moveTo(o, size); g.lineTo(o + size, 0); g.stroke();
      }
    });
  }
  // Braided cable / rope: diagonal strands.
  function braidCanvas(size, n) {
    return canvas(size, (g) => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const a = Math.sin(((x + y) / size) * n * Math.PI * 2), b = Math.sin(((x - y) / size) * n * Math.PI * 2);
          const v = 128 + 70 * Math.max(a, b);
          g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1);
        }
      }
    });
  }
  // Leatherette grain: small irregular pebbles.
  function grainCanvas(size, seed) {
    const r = rng(seed);
    return canvas(size, (g) => {
      g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, size, size);
      for (let i = 0; i < size * size / 9; i++) {
        const x = r() * size, y = r() * size, s = 0.8 + r() * 1.8, v = 100 + r() * 70 | 0;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.beginPath(); g.ellipse(x, y, s, s * (0.6 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
      }
    });
  }
  // Commercial rubber flooring: 1 m tiles of black rubber with grey flecks, slightly varied per
  // tile, with fine seams. 1024 px covers 2 x 2 tiles.
  function floorCanvases() {
    const size = 1024, tile = size / 2, r = rng(7);
    const color = canvas(size, (g) => {
      for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
        const base = 30 + r() * 5;
        g.fillStyle = `rgb(${base},${base + 1},${base + 3})`; g.fillRect(tx * tile, ty * tile, tile, tile);
      }
      const n = noiseCanvas(size, 3, [[64, 0.5], [256, 0.35]], 90, 166);
      g.globalCompositeOperation = "overlay"; g.globalAlpha = 0.35; g.drawImage(n, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      for (let i = 0; i < 26000; i++) {
        const x = r() * size, y = r() * size, v = 58 + r() * 50 | 0, s = 0.6 + r() * 1.3;
        g.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.5 + r() * 0.5})`; g.fillRect(x, y, s, s);
      }
      g.fillStyle = "rgba(0,0,0,0.85)";
      [0, tile].forEach((o) => { g.fillRect(o, 0, 2, size); g.fillRect(0, o, size, 2); });
      g.fillStyle = "rgba(255,255,255,0.05)";
      [0, tile].forEach((o) => { g.fillRect(o + 2, 0, 1, size); g.fillRect(0, o + 2, size, 1); });
    });
    const rough = canvas(size, (g) => {
      g.drawImage(noiseCanvas(size, 11, [[32, 0.6], [128, 0.4]], 200, 240), 0, 0);
      g.fillStyle = "rgb(255,255,255)";
      [0, tile].forEach((o) => { g.fillRect(o, 0, 3, size); g.fillRect(0, o, size, 3); });
    });
    const bump = canvas(size, (g) => {
      g.drawImage(noiseCanvas(size, 5, [[256, 0.5], [512, 0.5]], 100, 156), 0, 0);
      g.fillStyle = "rgb(20,20,20)";
      [0, tile].forEach((o) => { g.fillRect(o, 0, 2, size); g.fillRect(0, o, size, 2); });
    });
    return { color, rough, bump };
  }
  // Soft contact shadow: a dark blob that fades to nothing at its edge.
  function blobCanvas() {
    return canvas(128, (g) => {
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(0,0,0,1)"); grad.addColorStop(0.45, "rgba(0,0,0,0.55)"); grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    });
  }
  function woodCanvas() {
    const r = rng(17);
    return canvas(512, (g) => {
      g.fillStyle = "#6e573d"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        const y = r() * 512, v = r() * 40 - 20;
        g.strokeStyle = `rgba(${60 + v},${44 + v},${28 + v},0.35)`; g.lineWidth = 0.6 + r() * 2;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 3 + (r() - 0.5) * 1.5);
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,0.5)"; [0, 256].forEach((x) => g.fillRect(x, 0, 2, 512)); // plywood seams
    });
  }

  // ---------- Materials ----------
  function materials() {
    if (MAT) return MAT;
    const THREE = T();
    const peel = tex(noiseCanvas(256, 1, [[64, 0.6], [256, 0.4]], 70, 186), 1);
    const fine = tex(noiseCanvas(256, 2, [[128, 0.5], [256, 0.5]], 60, 196), 1);
    const knurl = tex(knurlCanvas(128, 8), 1);
    const braid = tex(braidCanvas(64, 2), 1);
    const grain = tex(grainCanvas(256, 4), 1);
    const fl = floorCanvases();
    const Std = (o) => new THREE.MeshStandardMaterial(o), Phys = (o) => new THREE.MeshPhysicalMaterial(o);
    MAT = {
      // Black powder-coated steel: a fine orange-peel texture under a satin clear coat.
      steel: Phys({ color: 0x1d1f22, metalness: 0.55, roughness: 0.46, bumpMap: peel, bumpScale: 0.12, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
      // Graphite accent parts (carriages, brackets).
      graphite: Phys({ color: 0x3a3e44, metalness: 0.6, roughness: 0.42, bumpMap: peel, bumpScale: 0.1, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
      chrome: Std({ color: 0xd6d9dd, metalness: 1, roughness: 0.13 }),
      zinc: Std({ color: 0x9fa3a8, metalness: 1, roughness: 0.34 }),
      shaft: Std({ color: 0xc0c3c7, metalness: 1, roughness: 0.26 }),
      knurl: Std({ color: 0xa8abb0, metalness: 1, roughness: 0.48, bumpMap: knurl, bumpScale: 0.9 }),
      iron: Phys({ color: 0x1e1f22, metalness: 0.4, roughness: 0.56, bumpMap: peel, bumpScale: 0.35, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
      bumper: Std({ color: 0x141415, roughness: 0.88, bumpMap: fine, bumpScale: 0.25 }),
      rubber: Std({ color: 0x111112, roughness: 0.93, bumpMap: fine, bumpScale: 0.2 }),
      grip: Std({ color: 0x161617, roughness: 0.8, bumpMap: knurl, bumpScale: 0.5 }),
      foamGrip: Std({ color: 0x1a1a1c, roughness: 0.97, bumpMap: fine, bumpScale: 0.6 }),
      plastic: Std({ color: 0x0f0f10, roughness: 0.5 }),
      nylon: Std({ color: 0x1b1c1e, roughness: 0.36 }),
      upholstery: Phys({ color: 0x18191b, roughness: 0.56, bumpMap: grain, bumpScale: 0.45, sheen: 0.45, sheenColor: new THREE.Color(0x5d636c), sheenRoughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.6 }),
      board: Std({ color: 0x101011, roughness: 0.8 }),
      stack: Phys({ color: 0x232428, metalness: 0.5, roughness: 0.44, bumpMap: peel, bumpScale: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
      cable: Std({ color: 0x1b1c1e, metalness: 0.35, roughness: 0.42, bumpMap: braid, bumpScale: 0.5 }),
      rope: Std({ color: 0x1e1f21, roughness: 0.95, bumpMap: braid, bumpScale: 0.9 }),
      wood: Phys({ specularIntensity: 0.3, envMapIntensity: 0.25, map: tex(woodCanvas(), 1, true), color: 0x8c8378, roughness: 0.72 }),
      mat: Std({ color: 0x1d1e21, roughness: 0.92, bumpMap: fine, bumpScale: 0.3 }),
      floor: Phys({ specularIntensity: 0.22, map: tex(fl.color, 4.5, true), roughnessMap: tex(fl.rough, 4.5), bumpMap: tex(fl.bump, 4.5), bumpScale: 0.6, roughness: 1, metalness: 0, envMapIntensity: 0.12 }),
      shadow: new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex(blobCanvas()), transparent: true, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    };
    MAT.shadow.alphaMap.wrapS = MAT.shadow.alphaMap.wrapT = THREE.ClampToEdgeWrapping;
    return MAT;
  }

  // ---------- Geometry helpers ----------
  // Scale a geometry's UVs so a texture tile covers `tile` cm, whatever the part's size.
  function worldUV(geo, uLen, vLen, tile) {
    const uv = geo.attributes.uv; if (!uv) return geo;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uLen / tile, uv.getY(i) * vLen / tile);
    return geo;
  }
  function roundRect(w, h, r) {
    const THREE = T(), s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  // Rectangular steel tube along +y from 0 to len, w across x and d across z, rounded long edges.
  function tubeGeo(w, d, len) {
    const key = `tube${w.toFixed(1)}/${d.toFixed(1)}/${len.toFixed(1)}`;
    return cached(key, () => {
      const THREE = T(), r = Math.min(w, d) * 0.16;
      const geo = new THREE.ExtrudeGeometry(roundRect(w, d, r), { depth: len, bevelEnabled: false, curveSegments: 3 });
      geo.rotateX(-Math.PI / 2); // extrusion (z) -> +y; the profile's y becomes -z
      return worldUV(geo, 1, 1, 30);
    });
  }
  // A pad: a padded block on a board, length along x, thickness along y, width along z, with
  // softly rounded top edges (the foam rolls over the board's edge).
  function padGeo(len, thick, width) {
    const key = `pad${len.toFixed(1)}/${thick.toFixed(1)}/${width.toFixed(1)}`;
    return cached(key, () => {
      const THREE = T(), b = Math.min(2.6, thick * 0.38), r = Math.min(4, width / 4, len / 4);
      const shape = roundRect(len - 2 * b, width - 2 * b, Math.max(0.5, r - b));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.3, thick - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 6, curveSegments: 10 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0); // bottom at y = 0
      geo.computeVertexNormals();
      return worldUV(geo, 1, 1, 22);
    });
  }
  const unitCyl = () => cached("ucyl", () => { const g = new (T().CylinderGeometry)(1, 1, 1, 14, 1, false); g.translate(0, 0.5, 0); return g; });
  const unitCylOpen = () => cached("ucylo", () => { const g = new (T().CylinderGeometry)(1, 1, 1, 10, 1, true); g.translate(0, 0.5, 0); return g; });

  // Orient an object's local +y along a->b (and local +z toward `up` when given); place it at a.
  function between(obj, a, b, up) {
    const THREE = T(), y = b.clone().sub(a), len = y.length();
    y.divideScalar(len || 1);
    let z = up ? up.clone() : (Math.abs(y.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0));
    z.sub(y.clone().multiplyScalar(z.dot(y)));
    if (z.lengthSq() < 1e-8) z = Math.abs(y.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), z.sub(y.clone().multiplyScalar(z.dot(y)));
    z.normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    obj.position.copy(a);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    return len;
  }
  function mesh(geo, mat, shadows = true) {
    const m = new (T().Mesh)(geo, mat);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  }

  // ---------- Parts ----------
  // Every part builder adds to `root` (a Group) and returns what it made.
  function Parts(root, floorY) {
    const THREE = T(), M = materials();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const shadows = []; // floor contact points, for soft contact shadows
    const P = {
      V, M, root, floorY, shadows,
      add(o, parent) { (parent || root).add(o); return o; },
      // Steel tube from a to b, w x d in section (d across `up`), with plastic end caps.
      beam(a, b, w, d, up, opts = {}) {
        const len = a.distanceTo(b), m = mesh(tubeGeo(w, d, len), opts.mat || M.steel);
        between(m, a, b, up); P.add(m, opts.parent);
        if (opts.caps !== false) {
          [[a, b], [b, a]].forEach(([p, q], i) => {
            if (opts.caps && opts.caps[i] === false) return;
            const cap = mesh(cached(`cap${w}/${d}`, () => { const g = new THREE.ExtrudeGeometry(roundRect(w + 0.25, d + 0.25, Math.min(w, d) * 0.2), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return g; }), M.plastic);
            const dir = q.clone().sub(p).normalize();
            between(cap, p.clone().sub(dir.clone().multiplyScalar(0.7)), p.clone().add(dir), up); P.add(cap, opts.parent);
          });
        }
        return m;
      },
      // Round bar or rod from a to b.
      rod(a, b, r, mat, parent, open) {
        const m = mesh(open ? unitCylOpen() : unitCyl(), mat);
        const len = between(m, a, b); m.scale.set(r, len, r); P.add(m, parent); return m;
      },
      box(w, h, d, mat, at, parent, q) {
        const m = mesh(cached(`box${w}/${h}/${d}`, () => worldUV(new THREE.BoxGeometry(w, h, d), 1, 1, 1)), mat);
        m.position.copy(at); if (q) m.quaternion.copy(q); P.add(m, parent); return m;
      },
      // Hex bolt head with a washer on a surface at p facing n.
      bolt(p, n, r = 0.75, parent) {
        const g = new THREE.Group();
        const washer = mesh(cached("washer", () => new THREE.CylinderGeometry(1.45, 1.45, 0.18, 18)), M.zinc, false); washer.position.y = 0.09; g.add(washer);
        const head = mesh(cached("bolthead", () => new THREE.CylinderGeometry(1, 1, 0.62, 6)), M.zinc, false); head.position.y = 0.48; g.add(head);
        g.scale.setScalar(r / 0.75);
        g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().normalize());
        P.add(g, parent); return g;
      },
      // Row of adjustment holes down the face of an upright (dark discs).
      holes(from, dir, n, step, faceN, r = 0.9, parent) {
        const geo = cached("hole", () => new THREE.CircleGeometry(1, 16));
        const inst = new THREE.InstancedMesh(geo, cached("holeMat", () => new THREE.MeshBasicMaterial({ color: 0x050505 })), n);
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), faceN.clone().normalize()), m = new THREE.Matrix4();
        for (let i = 0; i < n; i++) inst.setMatrixAt(i, m.compose(from.clone().add(dir.clone().multiplyScalar(i * step)).add(faceN.clone().multiplyScalar(0.03)), q, V(r, r, r)));
        P.add(inst, parent); return inst;
      },
      // Rubber foot under a frame end; registers a contact shadow.
      foot(x, z, w, d, parent) {
        const m = mesh(cached(`foot${w}/${d}`, () => { const g = new THREE.ExtrudeGeometry(roundRect(w, d, 0.8), { depth: 1.2, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return g; }), M.rubber);
        m.position.set(x, floorY + 0.3, z); P.add(m, parent);
        shadows.push({ x, z, w: w * 2.4, d: d * 2.4, o: 0.5 });
        return m;
      },
      // Floor stabilizer: a tube on rubber feet, along `along` (unit, horizontal), centered at c.
      stabilizer(c, along, len, w = 5, h = 7.5) {
        const a = c.clone().addScaledVector(along, -len / 2), b = c.clone().addScaledVector(along, len / 2);
        a.y = b.y = floorY + 1.5 + h / 2;
        // Laid on its side: section h tall (y) and w wide.
        const t = P.beam(a, b, h, w, V(0, 1, 0).cross(along).normalize());
        [a, b].forEach((p) => P.foot(p.x - along.x * 3, p.z - along.z * 3, Math.abs(along.x) > 0.5 ? 6 : w + 1, Math.abs(along.x) > 0.5 ? w + 1 : 6));
        shadows.push({ x: c.x, z: c.z, w: Math.abs(along.x) * len + 10, d: Math.abs(along.z) * len + 10, o: 0.35 });
        return t;
      },
      // Upholstered pad: top surface centered at `top`, length along `dir` (unit), width along z.
      // `normal` is the pad's outward face (default up). The board and pad sit below `top`.
      pad(top, dir, len, width, thick, normal) {
        const g = new THREE.Group();
        const n = (normal || V(0, 1, 0)).clone().normalize();
        const foam = mesh(padGeo(len, thick - 1.2, width), M.upholstery); foam.position.y = 1.2; g.add(foam);
        const board = mesh(cached(`board${len.toFixed(1)}/${width.toFixed(1)}`, () => new THREE.ExtrudeGeometry(roundRect(len - 1.2, width - 1.2, 2.5), { depth: 1.2, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2)), M.board);
        g.add(board);
        // Pad frame: local x = dir, y = normal; the top face at local y = thick.
        const z = new THREE.Vector3().crossVectors(dir, n).normalize(), x = new THREE.Vector3().crossVectors(n, z);
        g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, n, z));
        g.position.copy(top).addScaledVector(n, -thick);
        P.add(g); g.userData = { n, x, z, thick };
        return g;
      },
      // Grooved pulley wheel on a bearing in a steel housing. Local z is the axle.
      // Returns { g, wheel, r }: rotate `wheel.rotation.z` to turn it.
      pulley(r, parent) {
        const g = new THREE.Group(), wheel = new THREE.Group(); g.add(wheel);
        const profile = cached(`pulley${r}`, () => {
          const pts = [[r * 0.32, -1.1], [r * 0.82, -1.1], [r, -0.95], [r, -0.55], [r - 0.55, -0.25], [r - 0.62, 0], [r - 0.55, 0.25], [r, 0.55], [r, 0.95], [r * 0.82, 1.1], [r * 0.32, 1.1]];
          const geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 36); geo.rotateX(Math.PI / 2); return geo;
        });
        wheel.add(mesh(profile, M.nylon));
        const hub = mesh(cached(`hub${r}`, () => new THREE.CylinderGeometry(r * 0.34, r * 0.34, 2.3, 20).rotateX(Math.PI / 2)), M.chrome); wheel.add(hub);
        // Spokes cut into the web, so the wheel visibly turns.
        for (let i = 0; i < 4; i++) {
          const s = mesh(cached(`spoke${r}`, () => new THREE.BoxGeometry(r * 0.22, r * 0.36, 2.25)), M.graphite, false);
          const a = (i * Math.PI) / 2; s.position.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0); s.rotation.z = a + Math.PI / 2; wheel.add(s);
        }
        const axle = mesh(cached(`axle${r}`, () => new THREE.CylinderGeometry(0.55, 0.55, 5.2, 12).rotateX(Math.PI / 2)), M.zinc, false); g.add(axle);
        // Side plates of the housing, reaching back to the mount (local -y).
        [-1, 1].forEach((s) => {
          const plate = mesh(cached(`hplate${r}`, () => { const sh = roundRect(2 * r + 1.6, 2 * r + 4, r * 0.6); const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false, curveSegments: 6 }); geo.translate(0, -(r + 2) + r + 0.8, -0.225); return geo; }), M.steel);
          plate.position.z = s * 1.75; plate.position.y = -1.6; g.add(plate);
          P.bolt(V(0, 0, s * 2.0), V(0, 0, s), 0.6, g);
        });
        P.add(g, parent);
        return { g, wheel, r };
      },
      // Selectorized weight stack between two chrome guide rods.
      // Built in a local frame: base at local y = 0, plates stacked up, front face toward +x.
      // Returns { g, moving, top() (local attach point), travel }.
      stack(n = 15, opts = {}, parent) {
        const g = new THREE.Group(), w = opts.w || 26, d = opts.d || 12, h = 2.55, gap = 0.12;
        const pin = opts.pin ?? Math.round(n * 0.62);
        // Base bumpers and guide rods.
        [-1, 1].forEach((s) => {
          const bump = mesh(cached("bumper", () => new THREE.CylinderGeometry(1.6, 1.8, 2.4, 16)), M.rubber); bump.position.set(0, 1.2, s * (w / 2 - 4.2)); g.add(bump);
          P.rod(V(0, 0, s * (w / 2 - 4.2)), V(0, opts.rodH || 150, s * (w / 2 - 4.2)), 0.85, M.chrome, g);
        });
        const plateGeo = cached(`splate${w}/${d}`, () => { const geo = new THREE.ExtrudeGeometry(roundRect(d, w, 1.0), { depth: h - 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2 }); geo.rotateX(-Math.PI / 2); geo.translate(0, 0.25, 0); return geo; });
        const moving = new THREE.Group(); g.add(moving);
        for (let i = 0; i < n; i++) {
          const p = mesh(plateGeo, M.stack); p.position.y = 2.4 + i * (h + gap);
          (i >= n - pin ? moving : g).add(p);
          // A white weight number on the front edge of each plate.
          const num = mesh(cached("plateLabel", () => new THREE.PlaneGeometry(1.6, 0.9)), cached("labelMat", () => new THREE.MeshBasicMaterial({ color: 0x8b8f96 })), false);
          num.position.set(d / 2 + 0.27, p.position.y + h / 2, w / 2 - 3.2); num.rotation.y = Math.PI / 2; (i >= n - pin ? moving : g).add(num);
        }
        const topY = 2.4 + n * (h + gap);
        // Top plate with the selector stem running down through the stack and the cable eye.
        const topPlate = mesh(cached(`stop${w}/${d}`, () => { const geo = new THREE.ExtrudeGeometry(roundRect(d + 1, w + 1, 1.2), { depth: 3, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2 }); geo.rotateX(-Math.PI / 2); return geo; }), M.graphite);
        topPlate.position.y = topY; moving.add(topPlate);
        P.rod(V(0, 2.4 + (n - pin) * (h + gap), 0), V(0, topY + 3.6, 0), 0.75, M.chrome, moving);
        const eye = mesh(cached("eye", () => new THREE.TorusGeometry(1.1, 0.32, 8, 18)), M.zinc, false); eye.position.y = topY + 4.6; moving.add(eye);
        P.bolt(V(0, topY + 3.6, 0), V(0, 1, 0), 0.8, moving);
        // Selector pin with its black knob, pushed in under the chosen plate.
        const pinY = 2.4 + (n - pin) * (h + gap) - 0.06 + h / 2;
        P.rod(V(-d / 2 + 2, pinY, 0), V(d / 2 + 4.5, pinY, 0), 0.42, M.chrome, moving);
        const knob = mesh(cached("knob", () => new THREE.CylinderGeometry(1.5, 1.7, 2.6, 18).rotateZ(Math.PI / 2)), M.plastic); knob.position.set(d / 2 + 5.6, pinY, 0); moving.add(knob);
        P.add(g, parent);
        return { g, moving, attach: V(0, topY + 5.6, 0), travel: (opts.rodH || 150) - topY - 10, w, d };
      },
      // Olympic iron plate (r = outer radius): raised hub, thinner web and a rolled lip.
      ironPlate(R, t) {
        return cached(`iron${R}/${t}`, () => {
          const h = t / 2, pts = [[2.6, -h * 0.9], [5.6, -h], [6.6, -h * 0.55], [R - 3.4, -h * 0.55], [R - 2.4, -h], [R - 0.5, -h], [R, -h + 0.5], [R, h - 0.5], [R - 0.5, h], [R - 2.4, h], [R - 3.4, h * 0.55], [6.6, h * 0.55], [5.6, h], [2.6, h * 0.9], [2.6, -h * 0.9]];
          const geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 64);
          return geo;
        });
      },
      bumperPlate(R, t) {
        return cached(`bump${R}/${t}`, () => {
          const h = t / 2, pts = [[2.6, -h * 0.7], [7, -h * 0.7], [7.4, -h], [R - 0.8, -h], [R, -h + 0.8], [R, h - 0.8], [R - 0.8, h], [7.4, h], [7, h * 0.7], [2.6, h * 0.7], [2.6, -h * 0.7]];
          return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 64);
        });
      }
    };
    return P;
  }

  // ---------- Bars, dumbbells and handles (built along local z, centered on the origin) ----------
  // Olympic bar: 220 cm, 28 mm shaft with two knurled grip zones and a centre knurl, collars,
  // 50 mm rotating sleeves with end caps. Plates (outer radius R) sit on the sleeves, held by
  // lock-jaw collars. `style`: "iron" or "bumper".
  function olympicBar(P, plates, style = "iron", opts = {}) {
    const THREE = T(), M = P.M, V = P.V, g = new THREE.Group();
    const half = opts.half || 65.5; // inside of the collars
    const zone = (a, b, mat) => [1, -1].forEach((s) => P.rod(V(0, 0, s * a), V(0, 0, s * b), 1.4, mat, g));
    P.rod(V(0, 0, -8), V(0, 0, 8), 1.4, M.knurl, g);           // centre knurl
    zone(8, 21, M.shaft); zone(21, half - 7, M.knurl); zone(half - 7, half, M.shaft);
    g.children.forEach((m) => { if (m.material === M.knurl) worldUV(m.geometry = m.geometry.clone(), 2 * Math.PI * 1.4, m.scale.y, 0.9); });
    [1, -1].forEach((s) => {
      P.rod(V(0, 0, s * half), V(0, 0, s * (half + 3)), 2.9, M.chrome, g);          // collar
      P.rod(V(0, 0, s * (half + 3)), V(0, 0, s * (half + 44.5)), 2.5, M.chrome, g); // sleeve
      P.rod(V(0, 0, s * (half + 44.5)), V(0, 0, s * (half + 45.3)), 2.2, M.zinc, g); // end cap
      let z = half + 3.2;
      plates.forEach(([R, t]) => {
        const geo = style === "bumper" ? P.bumperPlate(R, t) : P.ironPlate(R, t);
        const p = mesh(geo, style === "bumper" ? M.bumper : M.iron); p.rotation.x = Math.PI / 2; p.position.z = s * (z + t / 2); g.add(p);
        if (style === "bumper") { const hub = mesh(cached("bhub", () => new THREE.CylinderGeometry(7, 7, 0.4, 32).rotateX(Math.PI / 2)), M.chrome, false); hub.position.z = s * (z + t + 0.05); g.add(hub); }
        z += t + 0.15;
      });
      // Lock-jaw collar.
      const c = mesh(cached("lockjaw", () => new THREE.CylinderGeometry(3.9, 3.9, 3.6, 24).rotateX(Math.PI / 2)), M.plastic); c.position.z = s * (z + 1.8); g.add(c);
      const lever = mesh(cached("ljlever", () => new THREE.BoxGeometry(1.2, 3.4, 2.4)), M.plastic); lever.position.set(0, 4.2, s * (z + 1.8)); g.add(lever);
    });
    return g;
  }
  // EZ curl bar: the grip section waves so the wrists can turn in; `gz` is the grip half-width,
  // where the bar crosses its own axis (the hands hold there). Offsets lie along local y.
  function ezBar(P, plates, gz) {
    const THREE = T(), M = P.M, V = P.V, g = new THREE.Group();
    const pts = [];
    for (let z = -60; z <= 60; z += 2) {
      const a = Math.abs(z), off = a < 10 ? 0 : a < gz + 9 ? -3.2 * Math.sin(Math.PI * (a - gz) / 13) * Math.min(1, (a - 10) / 4) : 0;
      pts.push(V(0, off, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const shaft = mesh(worldUV(new THREE.TubeGeometry(curve, 120, 1.4, 12, false), 8, 120, 0.9), M.knurl); g.add(shaft);
    [1, -1].forEach((s) => {
      P.rod(V(0, 0, s * 60), V(0, 0, s * 63), 2.8, M.chrome, g);
      P.rod(V(0, 0, s * 63), V(0, 0, s * 88), 1.6, M.chrome, g);
      let z = 63.2;
      plates.forEach(([R, t]) => { const p = mesh(P.ironPlate(R, t), M.iron); p.rotation.x = Math.PI / 2; p.position.z = s * (z + t / 2); g.add(p); z += t + 0.15; });
      const c = mesh(cached("spring", () => new THREE.TorusGeometry(2.1, 0.45, 8, 20)), M.chrome); c.position.z = s * (z + 0.6); g.add(c);
    });
    return g;
  }
  // Hex dumbbell: knurled chrome handle between rubber hex heads with steel end plates.
  function dumbbell(P, r = 7.2, w = 6.2) {
    const THREE = T(), M = P.M, V = P.V, g = new THREE.Group();
    const h = P.rod(V(0, 0, -6.8), V(0, 0, 6.8), 1.6, M.knurl, g); worldUV(h.geometry = h.geometry.clone(), 10, 13.6, 0.9);
    [1, -1].forEach((s) => {
      P.rod(V(0, 0, s * 6.8), V(0, 0, s * 7.6), 2.3, M.chrome, g);
      const head = mesh(cached(`hex${r}/${w}`, () => new THREE.CylinderGeometry(r, r, w, 6, 1).rotateX(Math.PI / 2)), M.bumper);
      head.position.z = s * (7.6 + w / 2); head.rotation.z = Math.PI / 6; g.add(head);
      const cap = mesh(cached(`hexcap${r}`, () => new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.5, 6).rotateX(Math.PI / 2)), M.chrome, false);
      cap.position.z = s * (7.6 + w + 0.2); cap.rotation.z = Math.PI / 6; g.add(cap);
    });
    return g;
  }
  // D-handle: rubber grip on a steel tube in a flat steel loop that ends in an eye.
  // Grip along local z, the loop reaches toward local +y to the eye at (0, 11, 0).
  function dHandle(P, gripLen = 9.2) {
    const THREE = T(), M = P.M, V = P.V, g = new THREE.Group(), h = gripLen / 2;
    P.rod(V(0, 0, -h - 1.2), V(0, 0, h + 1.2), 0.75, M.chrome, g);
    const grip = P.rod(V(0, 0, -h), V(0, 0, h), 1.55, M.grip, g); worldUV(grip.geometry = grip.geometry.clone(), 10, gripLen, 1.4);
    const pts = [V(0, 0, -h - 1.6), V(0, 2.5, -h - 2), V(0, 7.5, -h * 0.9), V(0, 10.3, -0.9), V(0, 10.3, 0.9), V(0, 7.5, h * 0.9), V(0, 2.5, h + 2), V(0, 0, h + 1.6)];
    const loop = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.55, 8, false), M.chrome); g.add(loop);
    const eye = mesh(cached("eye", () => new THREE.TorusGeometry(1.1, 0.32, 8, 18)), M.zinc, false); eye.position.y = 11.2; eye.rotation.y = Math.PI / 2; g.add(eye);
    return g;
  }
  // Carabiner (snap hook) joining the cable to a handle; local +y runs from the handle eye up to the cable.
  function carabiner(P) {
    const THREE = T(), g = new THREE.Group();
    const m = mesh(cached("carab", () => { const s = new THREE.Shape(); s.absellipse(0, 0, 1.5, 3.2, 0, Math.PI * 2); const path = new THREE.Path(); path.absellipse(0, 0, 1.0, 2.7, 0, Math.PI * 2, true); s.holes.push(path); const geo = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 }); geo.translate(0, 3.2, -0.27); return geo; }), P.M.zinc, false);
    g.add(m);
    return g;
  }

  // ---------- Cables ----------
  // A cable run from the weight stack over a chain of pulleys to a handle. Pulleys are
  // { C (centre), n (axle), r, pulley? (to turn) }. Each frame the cable is wrapped
  // around every pulley (tangent in, arc, tangent out) and the pulleys turn by the cable that
  // runs over them, so stack, pulleys, cable and handle move together.
  function CableRun(P, mat, radius = 0.36) {
    const THREE = T(), V = P.V;
    const pool = [], seg = () => { const m = mesh(unitCyl(), mat); m.castShadow = true; P.add(m); return m; };
    let used = 0;
    function draw(a, b) {
      const m = pool[used] || (pool[used] = seg()); used++;
      m.visible = true; const len = between(m, a, b); m.scale.set(radius, Math.max(len, 0.01), radius);
    }
    // Tangent points on a circle (centre C, axle n, radius r) for a line from P0.
    function tangents(C, n, r, P0) {
      const d = P0.clone().sub(C); d.sub(n.clone().multiplyScalar(d.dot(n)));
      const L = Math.max(d.length(), r + 1e-3), u = d.clone().divideScalar(L), w = new THREE.Vector3().crossVectors(n, u);
      const a = Math.acos(Math.min(1, r / L)), c = Math.cos(a) * r, s = Math.sin(a) * r;
      return [C.clone().addScaledVector(u, c).addScaledVector(w, s), C.clone().addScaledVector(u, c).addScaledVector(w, -s)];
    }
    // Wrap the cable around each pulley: pick the tangent points on the side the cable bends around.
    function solve(start, pulleys, end) {
      const ins = pulleys.map((p) => p.C.clone()), outs = pulleys.map((p) => p.C.clone());
      for (let it = 0; it < 3; it++) {
        pulleys.forEach((p, i) => {
          const prev = i ? outs[i - 1] : start, next = i < pulleys.length - 1 ? ins[i + 1] : end;
          const ui = prev.clone().sub(p.C).normalize(), uo = next.clone().sub(p.C).normalize();
          const side = ui.clone().add(uo); side.sub(p.n.clone().multiplyScalar(side.dot(p.n)));
          if (side.lengthSq() < 1e-6) side.copy(p.hint || V(0, 1, 0)).negate();
          side.normalize().negate(); // the cable presses on the wheel opposite the bend's opening
          const pick = (pts) => (pts[0].clone().sub(p.C).dot(side) > pts[1].clone().sub(p.C).dot(side) ? pts[0] : pts[1]);
          ins[i] = pick(tangents(p.C, p.n, p.r, prev)); outs[i] = pick(tangents(p.C, p.n, p.r, next));
        });
      }
      return { ins, outs };
    }
    return {
      // Returns the cable length beyond the first pulley and per-pulley lengths beyond each one.
      update(start, pulleys, end) {
        used = 0;
        const { ins, outs } = solve(start, pulleys, end);
        let prev = start;
        const pathFrom = [];
        pulleys.forEach((p, i) => {
          draw(prev, ins[i]);
          // Arc around the groove.
          const a = ins[i].clone().sub(p.C), b = outs[i].clone().sub(p.C);
          const ang = Math.atan2(new THREE.Vector3().crossVectors(a, b).dot(p.n), a.dot(b));
          const steps = Math.max(1, Math.ceil(Math.abs(ang) / 0.3));
          let q = ins[i];
          for (let k = 1; k <= steps; k++) {
            const r = a.clone().applyAxisAngle(p.n, (ang * k) / steps).add(p.C);
            draw(q, r); q = r;
          }
          p.arc = Math.abs(ang) * p.r; p.dirSign = Math.sign(ang) || 1;
          prev = outs[i];
        });
        draw(prev, end);
        for (let i = used; i < pool.length; i++) pool[i].visible = false;
        // Length of cable from each pulley's in-point to the end.
        let L = prev.distanceTo(end);
        for (let i = pulleys.length - 1; i >= 0; i--) {
          pathFrom[i] = L + pulleys[i].arc;
          if (i > 0) L = pathFrom[i] + outs[i - 1].distanceTo(ins[i]);
        }
        // Turn every wheel by the cable that has run over it.
        pulleys.forEach((p, i) => { if (p.pulley) p.pulley.wheel.rotation.z = -p.dirSign * pathFrom[i] / p.r; });
        return { length: pathFrom[0], ins, outs };
      }
    };
  }

  // ---------- Environment and floor ----------
  // Soft reflections for metal: a dark gym hall with rows of long overhead light panels and
  // a large softbox, baked into an environment map.
  function environment(renderer) {
    const THREE = T(), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(40, 14, 40), new THREE.MeshBasicMaterial({ color: 0x17181b, side: THREE.BackSide })));
    const panel = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -2; i <= 2; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 1.4), panel); p.position.set(0, 6.9, i * 6); env.add(p);
    }
    const soft = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ color: 0xbfc4cc })); soft.position.set(12, 2, 14); soft.lookAt(0, 0, 0); env.add(soft);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x0c0c0d })); fl.rotation.x = -Math.PI / 2; fl.position.y = -6.9; env.add(fl);
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(env, 0.02);
    pm.dispose();
    return rt.texture;
  }
  // Gym lighting: a large soft key from above the front (casts the shadows), a cool fill, a
  // rim from behind, and the overhead panels' sky light.
  function lights(scene) {
    const THREE = T();
    // Studio balance for a dark matte body: one warm-neutral key (soft shadows), a weaker cool
    // fill from the other front side, a low sky/ground ambient, and two neutral rims from behind
    // that trace the silhouette without turning the back blue.
    const hemi = new THREE.HemisphereLight(0xdfe4ea, 0x1a1a1c, 0.3); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff2e6, 2.5);
    key.position.set(110, 240, 190); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.6; key.shadow.radius = 6; key.shadow.blurSamples = 16;
    Object.assign(key.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 50, far: 800 });
    scene.add(key); scene.add(key.target);
    const fill = new THREE.DirectionalLight(0xd4dceb, 0.7); fill.position.set(-200, 110, 150); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xdfe6f5, 1.25); rim.position.set(-170, 170, -210); scene.add(rim);
    // A second, softer rim from the other side, so both edges of the body read.
    const rim2 = new THREE.DirectionalLight(0xd6dded, 0.8); rim2.position.set(180, 120, -190); scene.add(rim2);
    const top = new THREE.DirectionalLight(0xffffff, 0.1); top.position.set(0, 400, 0); scene.add(top);
    return { hemi, key, fill, rim, rim2, top };
  }
  // Rubber floor that fades into the dark of the stage at its far edge.
  function floor() {
    const THREE = T(), M = materials();
    const geo = new THREE.PlaneGeometry(900, 900, 1, 1); geo.rotateX(-Math.PI / 2);
    const fade = cached("floorFade", () => {
      const c = canvas(256, (g) => { const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128); grad.addColorStop(0, "#fff"); grad.addColorStop(0.5, "#ddd"); grad.addColorStop(1, "#000"); g.fillStyle = grad; g.fillRect(0, 0, 256, 256); });
      const t = new THREE.CanvasTexture(c); return t;
    });
    // The fade has its own UV transform (no repeat), so it covers the floor once while the tiles repeat.
    const mat = M.floor.clone(); mat.alphaMap = fade; mat.transparent = true;
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.renderOrder = -1;
    return m;
  }

  return { materials, Parts, olympicBar, ezBar, dumbbell, dHandle, carabiner, CableRun, environment, lights, floor, between, worldUV, mesh, tubeGeo, padGeo, roundRect };
})();


// ---------- Kits: the real equipment for each exercise ----------
// A kit is built around the body (ctx: the body's skin sampled over the rep, see figure3d.js)
// and returns { update(f) }, called every frame with the hands' grip points, grip axes and
// joints, so bars, handles, cables, pulleys, levers and weight stacks follow the body.
GYM3D.kits = (() => {
  const T = () => window.THREE;
  const V = (x, y, z) => new (T().Vector3)(x, y, z);
  const mid = (a, b) => a.clone().add(b).multiplyScalar(0.5);
  const K = {};
  const G = GYM3D;

  // ----- Shared pieces -----
  // Flat bench from x0 to x1 (pad length along x), its pad resting just under the body.
  function flatBench(ctx, x0, x1, opts = {}) {
    const P = ctx.P, fy = P.floorY, w = opts.width || 29, thick = 9.5;
    // The pad carries the trunk (and whatever opts.only names): limbs hanging off its sides or
    // end don't decide its height, so the back and glutes really rest on it.
    const only = opts.only || ((b) => /Torso|neck|head|pelvis/.test(b));
    let top = ctx.lowest({ x0: x0 + 2, x1: x1 - 2, z0: -w / 2 + 3, z1: w / 2 - 3, y0: fy + 20 }, only);
    if (!isFinite(top)) top = fy + 44;
    top += 0.4; // the foam gives a little under the body
    P.pad(V((x0 + x1) / 2, top, 0), V(1, 0, 0), x1 - x0, w, thick);
    const by = top - thick - 4.4;
    P.beam(V(x0 + 9, by, 0), V(x1 - 9, by, 0), 7.5, 5, V(0, 0, 1));
    // Mounting brackets under the board.
    [x0 + 14, (x0 + x1) / 2, x1 - 14].forEach((x) => {
      P.box(14, 0.6, 18, P.M.graphite, V(x, top - thick - 0.3, 0));
      [-1, 1].forEach((s) => P.bolt(V(x + s * 4.5, top - thick - 0.6, s * 6), V(0, -1, 0), 0.55));
    });
    const legs = [x1 - 15, x0 + 15];
    legs.forEach((x, i) => {
      const sy = fy + 1.5 + 7.5;
      P.beam(V(x, sy, 0), V(x, by - 3.75, 0), 7.5, 7.5, V(0, 0, 1), { caps: false });
      P.stabilizer(V(x, fy, 0), V(0, 0, 1), i ? 56 : 52);
      // Angled gusset from the leg into the main tube, bolted both sides.
      const dir = i ? 1 : -1;
      P.beam(V(x, by - 18, 0), V(x + dir * 13, by - 3.75, 0), 4, 4, V(0, 0, 1), { caps: false });
      [-1, 1].forEach((s) => { P.bolt(V(x, by, s * 2.55), V(0, 0, s), 0.7); P.bolt(V(x, sy + 4, s * 3.8), V(0, 0, s), 0.7); });
    });
    return { top, by };
  }

  // Half rack for the bench press: two uprights with J-hooks just under the bar at lockout,
  // safety arms below the bottom of the rep, plate storage, on a bolted floor frame.
  function benchRack(ctx, barTop, barLow) {
    const P = ctx.P, M = P.M, fy = P.floorY, ux = barTop.x - 7.5, H = Math.max(150, barTop.y - fy + 38);
    const hookY = barTop.y - 1.4 - 4, safeY = barLow.y - 1.4 - 7;
    [1, -1].forEach((s) => {
      const z = s * 60, ft = fy + 1.5 + 7.5;
      P.beam(V(ux - 50, fy + 1.5 + 3.75, z), V(ux + 28, fy + 1.5 + 3.75, z), 7.5, 7.5, V(0, 1, 0));
      P.foot(ux - 47, z, 7, 8); P.foot(ux + 25, z, 7, 8);
      P.beam(V(ux, ft, z), V(ux, fy + H, z), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      P.holes(V(ux + 3.77, fy + 26, z), V(0, 1, 0), Math.floor((H - 34) / 5), 5, V(1, 0, 0), 0.95);
      // Base plate gussets where the upright meets its foot.
      [-1, 1].forEach((d) => P.box(0.8, 9, 12, M.steel, V(ux + d * 5, ft + 4.5, z), null, new (T().Quaternion)().setFromAxisAngle(V(0, 0, 1), d * 0.6)));
      [1, -1].forEach((d) => P.bolt(V(ux, ft + 2.5, z + d * 3.8), V(0, 0, d), 0.75));
      // J-hook: a sleeve round the upright, a saddle with a plastic liner and an upturned lip.
      const hook = new (T().Group)(); hook.position.set(ux, hookY, z); P.add(hook);
      P.box(10.2, 13, 10.2, M.graphite, V(0, -3, 0), hook);
      P.box(8, 1.4, 6.5, M.graphite, V(8.6, -0.7, 0), hook);
      P.box(1.4, 5.5, 6.5, M.graphite, V(12.6, 1.3, 0), hook);
      P.box(7.5, 0.55, 6.2, M.plastic, V(8.6, 0.27, 0), hook);
      P.rod(V(0, -6, s * 5.1), V(0, -6, s * 8.6), 0.7, M.chrome, hook);
      const knob = G.mesh(new (T().CylinderGeometry)(1.3, 1.3, 2.2, 14), M.plastic); knob.position.set(0, -6, s * 9.6); knob.rotation.x = Math.PI / 2; hook.add(knob);
      // Safety arm, lined on top, pinned through the upright.
      const sa = P.beam(V(ux + 3.75, safeY - 2.5, z), V(ux + 62, safeY - 2.5, z), 5, 5, V(0, 0, 1), { caps: [false, true] });
      P.box(56, 0.6, 4.6, M.plastic, V(ux + 33, safeY + 0.3, z));
      P.box(10, 9, 10, M.graphite, V(ux, safeY - 2.5, z));
      P.rod(V(ux, safeY - 2.5, z - 6.8), V(ux, safeY - 2.5, z + 6.8), 0.65, M.chrome);
      // Plate storage horn with two plates.
      P.rod(V(ux - 3.75, fy + 33, z), V(ux - 30, fy + 33, z), 2.5, M.chrome);
      P.rod(V(ux - 30, fy + 33, z), V(ux - 31, fy + 33, z), 3.2, M.zinc);
      [0, 1].forEach((i) => { const p = G.mesh(P.ironPlate(22.5, 4.6), M.iron); p.position.set(ux - 9.5 - i * 4.8, fy + 33, z); p.rotation.z = Math.PI / 2; P.add(p); });
      void sa;
    });
    // Rear floor tie between the two feet.
    P.beam(V(ux - 44, fy + 1.5 + 3.75, -56), V(ux - 44, fy + 1.5 + 3.75, 56), 7.5, 7.5, V(0, 1, 0), { caps: false });
    return { hookY };
  }

  // Lifting platform: plywood where the lifter stands, rubber either side where the plates land.
  // Lifting platform: a wood centre between rubber side panels in a steel rim, standing on the
  // floor (the lifter's feet stand on its top, PLATFORM_T above the floor).
  const PLATFORM_T = 3.2;
  function platform(ctx, cx) {
    const P = ctx.P, M = P.M, fy = P.floorY, t = PLATFORM_T;
    const wood = G.mesh(new (T().BoxGeometry)(120, t, 120), M.wood); wood.position.set(cx, fy + t / 2, 0); P.add(wood);
    [1, -1].forEach((s) => { const r = G.mesh(new (T().BoxGeometry)(120, t, 60), M.rubber); r.position.set(cx, fy + t / 2, s * 90); P.add(r); });
    const rim = G.mesh(new (T().BoxGeometry)(124, t - 0.4, 244), M.steel); rim.position.set(cx, fy + (t - 0.4) / 2, 0); P.add(rim);
    [1, -1].forEach((s) => { const e = G.mesh(new (T().BoxGeometry)(2, t + 0.2, 244), M.steel); e.position.set(cx + s * 61, fy + (t + 0.2) / 2, 0); P.add(e); });
  }

  // Barbell that runs through both fists, level, with plates; or an EZ bar.
  function barbell(ctx, plates, style, ez) {
    const P = ctx.P, g = ez ? G.ezBar(P, plates, Math.abs(ctx.S[0].grip.R.z)) : G.olympicBar(P, plates, style);
    P.add(g);
    return (f) => {
      g.position.copy(mid(f.grip.R, f.grip.L));
      g.quaternion.setFromUnitVectors(V(0, 0, 1), f.grip.R.clone().sub(f.grip.L).normalize());
      if (ez) {
        // The EZ bar's waves turn with the hands: keep its offsets along the forearms.
        const fa = f.J.hand.clone().sub(f.J.elbow).normalize();
        const z = f.grip.R.clone().sub(f.grip.L).normalize(), y = fa.sub(z.clone().multiplyScalar(fa.dot(z))).normalize();
        g.quaternion.setFromRotationMatrix(new (T().Matrix4)().makeBasis(new (T().Vector3)().crossVectors(y, z), y, z));
      }
    };
  }
  function dumbbells(ctx, r, w) {
    const P = ctx.P, dbs = ["R", "L"].map(() => P.add(G.dumbbell(P, r, w)));
    return (f) => ["R", "L"].forEach((s, i) => { dbs[i].position.copy(f.grip[s]); dbs[i].quaternion.copy(f.handQ[s]); });
  }

  // Cable column: a selectorized stack behind an upright with an adjustable carriage. The cable
  // runs from the stack over two top pulleys, down the column's front, and out through a swivel
  // pulley on the carriage, which turns to face the handle. o: { at (the cable line, x/z),
  // face (toward the lifter), carriageY, height, ratio, boom (length of a top boom instead of a
  // carriage), stack }.
  function cableTower(ctx, o) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY;
    const H = o.height || 212, g = new THREE.Group(); P.add(g);
    const u = o.face.clone().setY(0).normalize(), up = V(0, 1, 0), w = new THREE.Vector3().crossVectors(u, up);
    g.position.set(o.at.x, fy, o.at.z);
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, up, w));
    const sx = -36, r = 4.6;
    // Floor frame and feet.
    [-1, 1].forEach((s) => P.beam(V(-62, 1.5 + 3.75, s * 17), V(6, 1.5 + 3.75, s * 17), 7.5, 6, V(0, 1, 0), { parent: g }));
    [-62, 2].forEach((x) => P.beam(V(x, 1.5 + 3.75, -13.5), V(x, 1.5 + 3.75, 13.5), 7.5, 6, V(0, 1, 0), { parent: g, caps: false }));
    [[-62, -17], [-62, 17], [6, -17], [6, 17]].forEach(([x, z]) => {
      const q = new THREE.Vector3(x, 0, z).applyQuaternion(g.quaternion).add(g.position);
      P.foot(q.x, q.z, 7, 7);
    });
    const ft = 1.5 + 7.5;
    // Rear uprights and the front column (with its adjustment holes), tied at the top.
    [-1, 1].forEach((s) => P.beam(V(-56, ft, s * 17), V(-56, H, s * 17), 6, 6, V(0, 0, 1), { parent: g, caps: [false, true] }));
    P.beam(V(-7, ft, 0), V(-7, H, 0), 8, 8, V(0, 0, 1), { parent: g, caps: [false, true] });
    if (!o.boom) P.holes(V(-2.98, 22, 0), V(0, 1, 0), Math.floor((H - 50) / 6), 6, V(1, 0, 0), 1.1, g);
    [-1, 1].forEach((s) => P.beam(V(-59, H + 3, s * 17), V(-3, H + 3, s * 17), 6, 6, V(0, 0, 1), { parent: g }));
    P.box(56, 1.2, 40, M.graphite, V(-31, H + 6.6, 0), g);
    [-1, 1].forEach((s) => [-56, -7].forEach((x) => P.bolt(V(x, H + 3, s * 20.05), V(0, 0, s), 0.7, g)));
    // Weight stack on its guide rods.
    const st = P.stack(o.stack || 16, { rodH: H - 14 }, g); st.g.position.set(sx, ft, 0);
    // Top pulleys hang under the top plate.
    const hang = (x, y) => { const p = P.pulley(r, g); p.g.position.set(x, y, 0); p.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, -1, 0), V(0, 0, 1))); return p; };
    const p1 = hang(sx + r, H - 6), pulleys = [p1];
    let p2;
    if (o.boom) {
      // A boom reaching out over the lifter, with the pulley at its tip.
      const bx = o.boom;
      P.beam(V(-7, H - 2, 0), V(bx + 8, H - 2, 0), 9, 7, V(0, 0, 1), { parent: g });
      P.beam(V(-7, H - 40, 0), V(bx * 0.45, H - 6.5, 0), 6, 6, V(0, 0, 1), { parent: g, caps: false });
      p2 = hang(bx - r, H - 12);
    } else p2 = hang(-r, H - 6);
    pulleys.push(p2);
    g.updateMatrixWorld(true);
    const world = (p) => ({ C: p.g.getWorldPosition(new THREE.Vector3()), n: w.clone(), r, pulley: p });
    const fixed = pulleys.map(world);
    // Carriage with its swivel pulley.
    let sw = null, A = null;
    if (!o.boom) {
      const cy = o.carriageY - fy;
      P.box(12, 18, 12, M.graphite, V(-7, cy + 2, 0), g);
      P.rod(V(-7, cy + 6, 6), V(-7, cy + 6, 10), 0.6, M.chrome, g);
      const knob = G.mesh(new THREE.SphereGeometry(1.9, 16, 12), M.plastic); knob.position.set(-7, cy + 6, 11.4); g.add(knob);
      P.box(4, 5, 7, M.graphite, V(-0.8, cy + 7.2, 0), g);
      A = g.localToWorld(V(0, cy + 5, 0));
      sw = P.pulley(r); // lives in world space, swivels each frame
      const yoke = G.mesh(new THREE.CylinderGeometry(1.2, 1.2, 4, 12), M.zinc); P.add(yoke); sw.yoke = yoke;
    }
    const stackAttach = () => st.g.localToWorld(st.attach.clone().add(st.moving.position));
    const run = G.CableRun(P, M.cable, 0.36);
    let rest = Infinity, wh = u.clone();
    const ratio = o.ratio || 1;
    const tower = {
      g, u, w, A, fixed, sw,
      // Draw the cable to the handle's attach point; lift the stack by the cable pulled out.
      update(end) {
        const list = fixed.slice();
        if (sw) {
          const d = end.clone().sub(A); d.y = 0;
          if (d.lengthSq() > 1) wh = d.normalize();
          const n = new THREE.Vector3().crossVectors(up, wh).normalize();
          const C = A.clone().addScaledVector(wh, r).add(V(0, -r * 0.2, 0));
          sw.g.position.copy(C);
          sw.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(wh, n), wh, n));
          sw.yoke.position.copy(A).add(V(0, 2.4, 0));
          list.push({ C, n, r, pulley: sw });
        }
        const L = run.update(stackAttach(), list, end).length;
        if (L < rest) rest = L;
        st.moving.position.y = Math.max(0, Math.min(st.travel, (L - rest) * ratio));
        return L;
      },
      // Settle the stack's rest length from the handle's positions over the rep.
      calibrate(ends) { ends.forEach((e) => tower.update(e)); },
      cableTop: () => fixed[fixed.length - 1].C
    };
    return tower;
  }

  // Handles. Each returns an object with update(f, toward) that places it in the hands and
  // gives back the point where the cable clips on.
  function dHandleRig(ctx, s, gripLen) {
    const P = ctx.P, h = P.add(G.dHandle(P, gripLen)), c = P.add(G.carabiner(P));
    return (f, toward, at, axis) => {
      const G0 = at || f.grip[s], z = (axis || f.axis[s]).clone().normalize();
      const y = toward.clone().sub(G0); y.sub(z.clone().multiplyScalar(y.dot(z))).normalize();
      h.position.copy(G0); h.quaternion.setFromRotationMatrix(new (T().Matrix4)().makeBasis(new (T().Vector3)().crossVectors(y, z), y, z));
      const eye = G0.clone().addScaledVector(y, 11.2), dir = toward.clone().sub(eye).normalize();
      G.between(c, eye.clone().addScaledVector(dir, -0.6), eye.clone().add(dir));
      return eye.clone().addScaledVector(dir, 6.6);
    };
  }
  function ropeRig(ctx) {
    const P = ctx.P, M = P.M, THREE = T(), segs = [], g = new THREE.Group(); P.add(g);
    const seg = () => { const m = G.mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, false).translate(0, 0.5, 0), M.rope); P.add(m); segs.push(m); return m; };
    const parts = { a: [seg(), seg()], b: [seg(), seg()], c: [seg(), seg()] };
    const balls = [0, 1].map(() => { const b = G.mesh(new THREE.SphereGeometry(2.5, 18, 12), M.rubber); b.scale.set(1, 0.9, 1); P.add(b); return b; });
    const ferrule = G.mesh(new THREE.CylinderGeometry(1.7, 1.7, 5, 16), M.chrome); P.add(ferrule);
    const c = P.add(G.carabiner(P));
    const set = (m, a, b, r) => { const len = G.between(m, a, b); m.scale.set(r, Math.max(0.01, len), r); };
    return (f, toward) => {
      const m0 = mid(f.grip.R, f.grip.L), dir = toward.clone().sub(m0).normalize();
      const A = m0.clone().addScaledVector(dir, 14);
      ["R", "L"].forEach((s, i) => {
        const ax = f.axis[s].clone().normalize(), Gp = f.grip[s];
        // Into the fist on the index-finger side, out at the little finger, to the end stop.
        const ein = Gp.clone().addScaledVector(ax, 4.4), eout = Gp.clone().addScaledVector(ax, -4.4), end = Gp.clone().addScaledVector(ax, -7.2);
        set(parts.a[i], A, ein, 1.15); set(parts.b[i], ein, eout, 1.1); set(parts.c[i], eout, end, 1.15);
        balls[i].position.copy(end).addScaledVector(ax, -1.6);
      });
      G.between(ferrule, A.clone().addScaledVector(dir, -2), A.clone().addScaledVector(dir, 3)); ferrule.scale.set(1, 1, 1);
      ferrule.position.copy(A).addScaledVector(dir, 0.5);
      G.between(c, A.clone().addScaledVector(dir, 2.5), A.clone().addScaledVector(dir, 4));
      return A.clone().addScaledVector(dir, 9.5);
    };
  }
  function vBarRig(ctx) {
    const P = ctx.P, M = P.M, THREE = T();
    const mk = (mat, r) => { const m = G.mesh(new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0), mat); m.userData.r = r; P.add(m); return m; };
    const steel = [mk(M.chrome, 0.9), mk(M.chrome, 0.9), mk(M.chrome, 0.8)], grips = [mk(M.grip, 1.55), mk(M.grip, 1.55)];
    const c = P.add(G.carabiner(P));
    const set = (m, a, b) => { const len = G.between(m, a, b); m.scale.set(m.userData.r, Math.max(0.01, len), m.userData.r); };
    return (f, toward) => {
      const m0 = mid(f.grip.R, f.grip.L), dir = toward.clone().sub(m0).normalize(), A = m0.clone().addScaledVector(dir, 15);
      ["R", "L"].forEach((s, i) => {
        const ax = f.axis[s].clone().normalize(), Gp = f.grip[s];
        set(grips[i], Gp.clone().addScaledVector(ax, -5), Gp.clone().addScaledVector(ax, 5));
        set(steel[i], Gp.clone().addScaledVector(ax, 5), A);
      });
      set(steel[2], mid(f.grip.R, f.grip.L).addScaledVector(f.axis.R, -5).lerp(mid(f.grip.R, f.grip.L).addScaledVector(f.axis.L, -5), 0.5), A);
      G.between(c, A, A.clone().addScaledVector(dir, 2));
      return A.clone().addScaledVector(dir, 6.5);
    };
  }
  // Lat bar: a straight knurled centre through both fists, ends bent down, rubber grips.
  function latBarRig(ctx) {
    const P = ctx.P, M = P.M, THREE = T(), g = new THREE.Group(); P.add(g);
    const half = Math.abs(ctx.S[0].grip.R.z) + 9;
    P.rod(V(0, 0, -half), V(0, 0, half), 1.5, M.chrome, g);
    [1, -1].forEach((s) => {
      P.rod(V(0, 0, s * half), V(0, -7, s * (half + 11)), 1.5, M.chrome, g);
      const gr = P.rod(V(0, 0, s * (half - 16)), V(0, 0, s * (half - 1)), 1.9, M.foamGrip, g); void gr;
      P.rod(V(0, -7, s * (half + 11)), V(0, -7.6, s * (half + 11.8)), 1.9, M.plastic, g);
    });
    P.rod(V(0, 0, 0), V(0, 5, 0), 0.8, M.chrome, g);
    const eye = G.mesh(new THREE.TorusGeometry(1.1, 0.32, 8, 18), M.zinc); eye.position.y = 6; g.add(eye);
    const c = P.add(G.carabiner(P));
    return (f, toward) => {
      const m0 = mid(f.grip.R, f.grip.L), z = f.grip.R.clone().sub(f.grip.L).normalize();
      const y = toward.clone().sub(m0); y.sub(z.clone().multiplyScalar(y.dot(z))).normalize();
      g.position.copy(m0); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z));
      const eyeAt = m0.clone().addScaledVector(y, 6.5), dir = toward.clone().sub(eyeAt).normalize();
      G.between(c, eyeAt, eyeAt.clone().add(dir));
      return eyeAt.clone().addScaledVector(dir, 6.6);
    };
  }

  // A cable exercise: tower(s), handle and cable joined into one chain.
  function cableKit(ctx, towers, handle, attachOf) {
    const ends = ctx.S.map((s) => ({ grip: s.grip, axis: s.axis, J: s.J, handQ: s.handQ }));
    const step = (f) => towers.forEach((t, i) => t.update(handle[i](f, t.sw ? t.A : t.cableTop(), attachOf && attachOf(f, i))));
    ends.forEach(step);
    return { update: step };
  }

  // ----- Kits -----
  K.benchPress = { build(ctx) {
    const S = ctx.S, top = mid(S[0].grip.R, S[0].grip.L);
    let low = top; S.forEach((s) => { const m = mid(s.grip.R, s.grip.L); if (m.y < low.y) low = m; });
    const head = S[0].J.head, hip = S[0].J.pelvis;
    flatBench(ctx, Math.min(head.x - 34, hip.x - 116), hip.x + 16);
    benchRack(ctx, top, low);
    return { update: barbell(ctx, [[22.5, 4.6], [22.5, 4.6]], "iron") };
  } };
  K.skullCrusher = { build(ctx) {
    const head = ctx.S[0].J.head, hip = ctx.S[0].J.pelvis;
    flatBench(ctx, Math.min(head.x - 34, hip.x - 116), hip.x + 16);
    return { update: barbell(ctx, [[12.6, 2.6]], "iron", true) };
  } };

  // Adjustable bench: seat and back pad on a floor rail; the back pad leans on a strut
  // set in the ladder, and hinges at the seat.
  function adjBench(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, J = ctx.S[0].J;
    const hip = J.pelvis, sh = J.spine.clone().lerp(J.neck, 1.2);
    const d = sh.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0); // n: out of the back pad toward the chest
    // Seat: under the glutes and the top of the thighs.
    const sx0 = hip.x - 12, sx1 = hip.x + 26, sw = 32;
    let seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 4, z0: -12, z1: 12 }) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, sw, 8.5);
    // Back pad: along the back, from just above the seat to behind the head.
    const len = 78, start = hip.clone().addScaledVector(d, 6), cen = start.clone().addScaledVector(d, len / 2);
    const probe = cen.clone().addScaledVector(n, -40), gap = ctx.gap(probe, n, d, len - 10, 22);
    const face = probe.clone().addScaledVector(n, (isFinite(gap) ? gap : 30) - 0.4);
    const pad = P.pad(face, d, len, 28, 8.5, n);
    // Floor rail from behind the back pad to in front of the seat.
    const back0 = face.clone().addScaledVector(n, -9).addScaledVector(d, -len / 2); // lower end of the pad's underside
    const rx0 = Math.min(back0.x, face.x + d.x * len / 2 - n.x * 9) - 12, rx1 = sx1 + 14, ry = fy + 1.5 + 3.75;
    P.beam(V(rx0, ry, 0), V(rx1, ry, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(rx1 - 4, fy + 7.5, 0), V(0, 0, 1), 54, 6, 6);
    P.stabilizer(V(rx0 + 4, fy + 7.5, 0), V(0, 0, 1), 50, 6, 6);
    // Transport wheels and handle at the back end.
    [-1, 1].forEach((s) => { const wh = G.mesh(new THREE.CylinderGeometry(4.2, 4.2, 3, 22).rotateX(Math.PI / 2), M.rubber); wh.position.set(rx0 - 1, fy + 4.6, s * 28); P.add(wh); });
    P.rod(V(rx0, ry + 4, 0), V(rx0 - 16, ry + 13, 0), 1.6, M.steel); P.rod(V(rx0 - 16, ry + 13, -10), V(rx0 - 16, ry + 13, 10), 1.6, M.grip);
    // Seat post and hinge.
    const seatUnder = seatTop - 8.5;
    P.beam(V(hip.x + 6, ry + 3.75, 0), V(hip.x + 6, seatUnder - 1, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    P.box(sx1 - sx0 - 8, 4, 6, M.steel, V((sx0 + sx1) / 2, seatUnder - 2, 0));
    const hinge = back0.clone(); hinge.z = 0;
    P.rod(V(hinge.x, hinge.y, -9), V(hinge.x, hinge.y, 9), 2.2, M.graphite);
    P.beam(V(hinge.x, hinge.y, 0), V(sx0 + 6, seatUnder - 2, 0), 5, 5, V(0, 0, 1), { caps: false });
    // Back support under the pad and the adjustable strut down to the ladder.
    const under = (s) => face.clone().addScaledVector(n, -9.5).addScaledVector(d, s);
    P.beam(under(-len / 2 + 4), under(len / 2 - 6), 5, 5, V(0, 0, 1));
    const sTop = under(len * 0.12), foot = V(sTop.x - Math.max(10, (sTop.y - ry) * 0.25), ry + 3.75, 0);
    P.beam(foot, sTop, 4.5, 4.5, V(0, 0, 1), { caps: false });
    P.rod(V(sTop.x, sTop.y, -4), V(sTop.x, sTop.y, 4), 1, M.chrome);
    for (let i = 0; i < 7; i++) P.box(1.4, 2.2, 6.6, M.graphite, V(foot.x - 18 + i * 6, ry + 4.8, 0));
    void pad;
    return { seatTop };
  }
  K.inclineDB = { build(ctx) { adjBench(ctx); return { update: dumbbells(ctx, 8.4, 7) }; } };
  K.seatedDB = { build(ctx) { adjBench(ctx); return { update: dumbbells(ctx, 7.6, 6.4) }; } };

  // Free weights on the floor.
  K.dumbbells = { build(ctx) { const r = ctx.fig.db || [7, 6]; return { update: dumbbells(ctx, r[0], r[1]) }; } };
  K.barbell = {
    // On a platform the feet stand on its top, so the floor is that much lower.
    ground(ctx) { const feet = ctx.lowest({}, (b) => b.startsWith("foot") || b.startsWith("shin")); return (ctx.fig.bar || {}).platform ? feet - PLATFORM_T : feet; },
    build(ctx) {
    const o = ctx.fig.bar || {}, P = ctx.P;
    let low = Infinity; ctx.S.forEach((s) => { low = Math.min(low, mid(s.grip.R, s.grip.L).y); });
    if (o.platform) platform(ctx, ctx.S[0].J.ankle.x);
    // Plates sized so a bar pulled from the floor rests its plates on the floor.
    const R = o.fromFloor ? Math.min(22.5, low - P.floorY - (o.platform ? PLATFORM_T : 0)) : (o.r || 22.5);
    const plates = o.plates || (R >= 22 ? [[R, o.bumper ? 6.6 : 4.6], [R, o.bumper ? 6.6 : 4.6]] : [[R, 4.4], [R, 4.4]]);
    if (o.rack) powerRack(ctx, o);
    return { update: barbell(ctx, plates, o.bumper ? "bumper" : "iron", o.ez) };
  } };
  // Power rack around a standing lifter: four uprights, J-hooks at the bar's start height and
  // safety pins below its lowest point.
  function powerRack(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S;
    const bar0 = mid(S[0].grip.R, S[0].grip.L);
    let low = Infinity; S.forEach((s) => { low = Math.min(low, mid(s.grip.R, s.grip.L).y); });
    const ax = ctx.S[0].J.ankle.x, H = 218, xs = [ax - 58, ax + 52];
    [1, -1].forEach((s) => {
      const z = s * 60;
      P.beam(V(xs[0] - 4, fy + 1.5 + 3.75, z), V(xs[1] + 4, fy + 1.5 + 3.75, z), 7.5, 7.5, V(0, 1, 0));
      P.foot(xs[0] - 1, z, 8, 8); P.foot(xs[1] + 1, z, 8, 8);
      xs.forEach((x) => {
        P.beam(V(x, fy + 9, z), V(x, fy + H, z), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
        P.holes(V(x + (x === xs[0] ? 3.77 : -3.77), fy + 26, z), V(0, 1, 0), 36, 5, V(x === xs[0] ? 1 : -1, 0, 0), 0.95);
      });
      P.beam(V(xs[0], fy + H - 3.75, z), V(xs[1], fy + H - 3.75, z), 7.5, 7.5, V(0, 0, 1), { caps: false });
      // Safety pin through both uprights below the bar's lowest point.
      const sy = low - 1.4 - 10;
      P.rod(V(xs[0], sy, z), V(xs[1], sy, z), 1.6, M.chrome);
      // J-hook on the front uprights at the bar's start height.
      const hook = new (T().Group)(); hook.position.set(xs[1], bar0.y - 1.4 - 4, z); P.add(hook);
      P.box(10.2, 13, 10.2, M.graphite, V(0, -3, 0), hook);
      P.box(8, 1.4, 6.5, M.graphite, V(-8.6, -0.7, 0), hook);
      P.box(1.4, 5.5, 6.5, M.graphite, V(-12.6, 1.3, 0), hook);
      P.box(7.5, 0.55, 6.2, M.plastic, V(-8.6, 0.27, 0), hook);
    });
    xs.forEach((x) => P.beam(V(x, fy + H - 3.75, -56), V(x, fy + H - 3.75, 56), 7.5, 7.5, V(0, 0, 1), { caps: false }));
    P.beam(V(xs[0], fy + 1.5 + 3.75, -56), V(xs[0], fy + 1.5 + 3.75, 56), 7.5, 7.5, V(0, 1, 0), { caps: false });
    // Pull-up bar across the top front.
    P.rod(V(xs[1] + 3.75, fy + H + 3, -64), V(xs[1] + 3.75, fy + H + 3, 64), 1.6, M.knurl);
  }

  // Exercise mat on the floor (plank, dead bug, kneeling cable work).
  function mat(ctx, cx, len, wid) {
    const P = ctx.P, m = G.mesh(G.padGeo(len, 1.5, wid), P.M.mat); m.position.set(cx, P.floorY, 0); P.add(m);
  }
  K.mat = { ground: "body", build(ctx) { const b = ctx.bounds(); mat(ctx, (b.min.x + b.max.x) / 2, Math.min(190, b.max.x - b.min.x + 30), 62); return { update() {} }; } };
  K.floor = { ground: "body", build() { return { update() {} }; } };

  // Pull-up station: two uprights on braced feet with a knurled bar where the hands hang.
  K.pullupBar = { ground: "hang", build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY, bar = mid(ctx.S[0].grip.R, ctx.S[0].grip.L), H = bar.y - fy + 16;
    [1, -1].forEach((s) => {
      const z = s * 76;
      P.beam(V(bar.x, fy + 9, z), V(bar.x, fy + H, z), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(bar.x - 70, fy + 5.25, z), V(bar.x + 60, fy + 5.25, z), 7.5, 7.5, V(0, 1, 0));
      P.foot(bar.x - 67, z, 8, 8); P.foot(bar.x + 57, z, 8, 8);
      P.beam(V(bar.x - 55, fy + 9, z), V(bar.x, fy + H * 0.55, z), 5, 5, V(0, 0, 1), { caps: false });
      P.box(10, 10, 10, M.graphite, V(bar.x, bar.y, z));
      [1, -1].forEach((d) => P.bolt(V(bar.x, bar.y + d * 2.5, z + s * 5.05), V(0, 0, s), 0.75));
    });
    P.beam(V(bar.x, fy + H - 3.75, -72), V(bar.x, fy + H - 3.75, 72), 7.5, 7.5, V(1, 0, 0), { caps: false });
    P.beam(V(bar.x - 70, fy + 5.25, -72), V(bar.x - 70, fy + 5.25, 72), 7.5, 7.5, V(0, 1, 0), { caps: false });
    const b = P.rod(V(bar.x, bar.y, -71), V(bar.x, bar.y, 71), 1.6, M.knurl); G.worldUV(b.geometry = b.geometry.clone(), 10, 142, 0.9);
    return { update() {} };
  } };
  // Dip station: parallel bars at the hands, open at the front, with rubber-grip ends.
  K.dipStation = { ground: "hang", hang: 124, build(ctx) {
    const P = ctx.P, M = P.M, fy = P.floorY, g = ctx.S[0].grip;
    [g.R, g.L].forEach((h) => {
      const z = h.z, x0 = h.x - 34, x1 = h.x + 22;
      const b = P.rod(V(x0, h.y, z), V(x1, h.y, z), 2.4, M.steel); void b;
      P.rod(V(h.x - 9, h.y, z), V(h.x + 13, h.y, z), 2.6, M.grip);
      P.beam(V(x0 + 4, fy + 9, z), V(x0 + 4, h.y - 2, z), 6, 6, V(0, 0, 1), { caps: false });
      P.beam(V(x0 - 26, fy + 5.25, z), V(x1 + 6, fy + 5.25, z), 7.5, 6, V(0, 1, 0));
      P.foot(x0 - 23, z, 7, 7); P.foot(x1 + 3, z, 7, 7);
      P.beam(V(x0 + 4, h.y - 30, z), V(x1 - 2, h.y - 2.4, z), 4, 4, V(0, 0, 1), { caps: false });
      P.box(8, 8, 8, M.graphite, V(x0 + 4, h.y - 2, z));
    });
    const x0 = g.R.x - 30;
    P.beam(V(x0 - 26, fy + 5.25, g.L.z), V(x0 - 26, fy + 5.25, g.R.z), 7.5, 6, V(0, 1, 0), { caps: false });
    return { update() {} };
  } };

  // Cable crossover: two towers either side, a D-handle in each hand, a cable to each.
  K.crossover = { build(ctx) {
    const S = ctx.S, J = S[0].J, x = J.pelvis.x - 34, cy = ctx.fig.pulleyY ?? 166;
    const towers = [1, -1].map((s) => cableTower(ctx, { at: V(x, 0, s * 98), face: V(0, 0, -s), carriageY: ctx.P.floorY + cy, ratio: 0.5 }));
    // Header tying the towers together.
    const P = ctx.P, H = 212 + P.floorY;
    P.beam(V(x - 31, H + 9, 98 - 4), V(x - 31, H + 9, -98 + 4), 8, 8, V(1, 0, 0), { caps: false });
    return cableKit(ctx, towers, [dHandleRig(ctx, "R"), dHandleRig(ctx, "L")]);
  } };
  // Single column facing the lifter (face pull, pushdown, crunch) or to their side (Pallof).
  K.tower = { build(ctx) {
    const o = ctx.fig.tower || {}, S = ctx.S, P = ctx.P;
    const g0 = mid(S[0].grip.R, S[0].grip.L);
    const at = o.at ? V(o.at[0], 0, o.at[1]) : V(g0.x + (o.dx ?? 40), 0, 0);
    const face = o.face ? V(...o.face) : V(-1, 0, 0);
    const t = cableTower(ctx, { at, face, carriageY: P.floorY + (o.y ?? 190), ratio: o.ratio || 0.5 });
    if (o.mat) { const b = ctx.bounds(); mat(ctx, (b.min.x + b.max.x) / 2, 110, 62); }
    const h = o.handle === "rope" ? ropeRig(ctx) : o.handle === "V" ? vBarRig(ctx) : (() => {
      const d = dHandleRig(ctx, "R", 17);
      return (f, toward) => d(f, toward, mid(f.grip.R, f.grip.L), f.axis.R);
    })();
    return cableKit(ctx, [t], [h]);
  } };
  K.tower.ground = "feet";

  // Seated chest press: seat and back pad, two levers hanging from a pivot shaft above and
  // behind the head (the hands travel on the levers' arc), a cam on the shaft winding the cable
  // that lifts the stack behind the seat.
  K.chestPress = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
    const hip = J.pelvis, sh = J.neck;
    const sx0 = hip.x - 14, sx1 = hip.x + 24;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 4, z0: -12, z1: 12 }) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, 36, 9);
    const d = sh.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0), len = 64;
    const cen = hip.clone().addScaledVector(d, 10 + len / 2), probe = cen.clone().addScaledVector(n, -40);
    const face = probe.clone().addScaledVector(n, ctx.gap(probe, n, d, len - 8, 22) - 0.4);
    P.pad(face, d, len, 34, 9, n);
    // Lever circle: centre of the hand's arc (the pivot), from three moments of the rep.
    const arc = (k) => mid(S[k].grip.R, S[k].grip.L);
    const a = arc(0), b = arc(4), c = arc(8), ab = b.clone().sub(a), ac = c.clone().sub(a), nn = new THREE.Vector3().crossVectors(ab, ac);
    const C = a.clone().add(new THREE.Vector3().crossVectors(nn, ab).multiplyScalar(ac.lengthSq()).add(new THREE.Vector3().crossVectors(ac, nn).multiplyScalar(ab.lengthSq())).divideScalar(2 * nn.lengthSq()));
    C.z = 0;
    const base = Math.atan2(a.y - C.y, a.x - C.x), zl = 41;
    const lever = new THREE.Group(); lever.position.copy(C); P.add(lever);
    P.rod(V(0, 0, -zl - 4), V(0, 0, zl + 4), 2.4, M.chrome, lever);
    [1, -1].forEach((s) => {
      const g0 = S[0].grip[s > 0 ? "R" : "L"].clone().sub(C), top = g0.clone().add(V(0, 7, 0)), elbow = V(top.x, top.y, s * zl);
      P.beam(V(0, 0, s * zl), elbow, 6, 4.5, V(0, 0, 1), { parent: lever });
      P.beam(elbow, V(top.x, top.y, g0.z + s * 2), 4.5, 4.5, V(1, 0, 0), { parent: lever });
      P.rod(V(top.x, top.y, g0.z), V(top.x, g0.y - 6, g0.z), 1.1, M.chrome, lever);
      P.rod(V(top.x, g0.y - 5.5, g0.z), V(top.x, g0.y + 5.5, g0.z), 1.6, M.grip, lever);
      P.box(7, 7, 7, M.graphite, V(0, 0, s * zl), lever);
    });
    const cam = P.pulley(9, lever); cam.g.rotation.set(0, 0, 0);
    // Frame: stack tower behind the back pad, a beam forward to the pivot bearings.
    const tx = Math.min(face.x - 40, C.x - 34), H = C.y - fy + 16;
    const st = P.stack(16, { rodH: H - 22 }); st.g.position.set(tx, fy + 9, 0);
    [-1, 1].forEach((s) => {
      P.beam(V(tx - 20, fy + 9, s * 17), V(tx - 20, fy + H, s * 17), 6, 6, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(tx + 14, fy + 9, s * 17), V(tx + 14, fy + H, s * 17), 6, 6, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(tx - 26, fy + 5.25, s * 17), V(sx1 + 10, fy + 5.25, s * 17), 7.5, 6, V(0, 1, 0));
      P.foot(tx - 23, s * 17, 7, 7); P.foot(sx1 + 7, s * 17, 7, 7);
      P.beam(V(tx - 20, fy + H + 3, s * 17), V(C.x + 6, fy + H + 3, s * 17), 6, 6, V(0, 0, 1));
      P.beam(V(C.x, fy + H, s * (zl + 6)), V(C.x, C.y, s * (zl + 6)), 6, 6, V(0, 0, 1), { caps: false });
      P.box(9, 9, 6, M.graphite, V(C.x, C.y, s * (zl + 6)));
      P.bolt(V(C.x, C.y, s * (zl + 9.05)), V(0, 0, s), 1);
    });
    P.beam(V(C.x, fy + H + 3, -(zl + 6)), V(C.x, fy + H + 3, zl + 6), 6, 6, V(1, 0, 0), { caps: false });
    P.beam(V(hip.x + 4, fy + 9, 0), V(hip.x + 4, seatTop - 9, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    P.beam(V(hip.x - 24, fy + 5.25, 0), V(hip.x + 10, fy + 5.25, 0), 7.5, 6, V(0, 1, 0), { caps: false });
    const bsup = face.clone().addScaledVector(n, -10);
    P.beam(V(bsup.x, fy + 9, 0), bsup.clone().addScaledVector(d, -len / 2 + 6), 6, 6, V(0, 0, 1), { caps: false });
    const p1 = P.pulley(4.6); p1.g.position.set(tx + 4.6, fy + H - 6, 0); p1.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, -1, 0), V(0, 0, 1)));
    const run = G.CableRun(P, M.cable, 0.36), anchor0 = V(0, -9, 0);
    let rest = Infinity;
    const update = (f) => {
      const g = mid(f.grip.R, f.grip.L), th = Math.atan2(g.y - C.y, g.x - C.x) - base;
      lever.rotation.z = th;
      const anchor = anchor0.clone().applyAxisAngle(V(0, 0, 1), th).add(C);
      const L = run.update(st.g.localToWorld(st.attach.clone().add(st.moving.position)), [{ C: p1.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p1 }, { C: C.clone(), n: V(0, 0, 1), r: 9 }], anchor).length;
      rest = Math.min(rest, L);
      st.moving.position.y = Math.max(0, Math.min(st.travel, (L - rest) * 1.6));
    };
    S.forEach((s) => update(s));
    return { update };
  } };

  // Lat pulldown: seat, thigh rollers locking the legs, a tower in front with a boom over the
  // lifter, and the lat bar on the cable.
  K.pulldown = { build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis, knee = J.knee;
    const sx0 = hip.x - 16, sx1 = hip.x + 22;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 4, z0: -12, z1: 12 }) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, 34, 9);
    // Thigh rollers just behind the knees, resting on the thighs.
    const rx = knee.x - 9, ry = ctx.highest({ x0: rx - 5, x1: rx + 5, z0: -18, z1: 18, y0: hip.y - 10 }) + 6.2;
    [1, -1].forEach((s) => {
      const roll = G.mesh(new THREE.CylinderGeometry(6, 6, 16, 28).rotateX(Math.PI / 2), M.upholstery); roll.position.set(rx, ry, s * 11); P.add(roll);
      const cap = G.mesh(new THREE.CylinderGeometry(3, 3, 0.6, 20).rotateX(Math.PI / 2), M.plastic); cap.position.set(rx, ry, s * 19.2); P.add(cap);
    });
    P.rod(V(rx, ry, -20), V(rx, ry, 20), 1.3, M.chrome);
    P.beam(V(rx + 2, fy + 9, 0), V(rx + 2, ry - 3, 0), 4.5, 4.5, V(0, 0, 1), { caps: false });
    P.box(5, 5, 5, M.graphite, V(rx + 2, ry - 3, 0));
    let top = -Infinity, bx = 0; S.forEach((s) => { const m = mid(s.grip.R, s.grip.L); if (m.y > top) { top = m.y; bx = m.x; } });
    // The lifter faces the machine: the tower stands just past the feet, its boom reaching back
    // over the bar.
    const at = V(Math.max(J.toe.x, knee.x) + 16, 0, 0), H = Math.max(212, top - fy + 48);
    const t = cableTower(ctx, { at, face: V(-1, 0, 0), height: H, boom: at.x - bx, ratio: 0.5 });
    P.beam(V(hip.x - 16, fy + 5.25, 0), V(at.x - 4, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
    P.stabilizer(V(hip.x - 10, fy, 0), V(0, 0, 1), 52);
    P.foot(rx + 5, 0, 8, 10);
    P.beam(V(hip.x + 2, fy + 9, 0), V(hip.x + 2, seatTop - 9, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    P.box(sx1 - sx0 - 6, 3, 8, M.steel, V((sx0 + sx1) / 2, seatTop - 10.5, 0));
    return cableKit(ctx, [t], [latBarRig(ctx)]);
  } };

  // Seated cable row: a long bench, an angled foot platform, the low pulley between the feet.
  K.row = {
    ground(ctx) { const J = ctx.S[0].J; return ctx.lowest({ x0: J.pelvis.x - 12, x1: J.pelvis.x + 12, z0: -10, z1: 10 }) - 44; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis;
      flatBench(ctx, hip.x - 60, hip.x + 26, { width: 30 });
      // Foot platform under the soles, tilted like the feet.
      const fd = J.toe.clone().sub(J.ankle).setZ(0).normalize(), n = V(-fd.y, fd.x, 0);
      const fc = mid(J.ankle, J.toe); fc.z = 0;
      const probe = fc.clone().addScaledVector(n, -25), gap = ctx.gap(probe, n, fd, 30, 44, (b) => b.startsWith("foot"));
      const face = probe.clone().addScaledVector(n, gap - 0.3);
      [1, -1].forEach((s) => {
        const pl = P.pad(face.clone().add(V(0, 0, s * 12)), fd, 30, 18, 2.2, n);
        pl.children.forEach((m) => { m.material = M.rubber; });
      });
      const back = face.clone().addScaledVector(n, -3);
      P.box(6, 6, 46, M.steel, back.clone().addScaledVector(fd, -10));
      [1, -1].forEach((s) => P.beam(V(back.x + 6, fy + 9, s * 18), back.clone().add(V(0, 0, s * 18)), 5, 5, V(0, 0, 1), { caps: false }));
      P.beam(V(hip.x - 50, fy + 5.25, 0), V(back.x + 40, fy + 5.25, 0), 7.5, 7.5, V(0, 1, 0));
      const t = cableTower(ctx, { at: V(back.x + 34, 0, 0), face: V(-1, 0, 0), carriageY: Math.max(fy + 18, face.y - 14), ratio: 0.5 });
      return cableKit(ctx, [t], [vBarRig(ctx)]);
    }
  };

  // Leg press: seat and reclined back pad; the sled slides on two rails and its foot plate
  // stays against the soles; plates on the sled's horns.
  K.legPress = { ground: "fixed", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, hip = J.pelvis, sh = J.neck;
    const sx0 = hip.x - 10, sx1 = hip.x + 26;
    const seatTop = ctx.lowest({ x0: sx0 + 2, x1: sx1 - 4, z0: -12, z1: 12 }) + 0.4;
    P.pad(V((sx0 + sx1) / 2, seatTop, 0), V(1, 0, 0), sx1 - sx0, 40, 9);
    const d = sh.clone().sub(hip).setZ(0).normalize(), n = V(d.y, -d.x, 0), len = 74;
    const cen = hip.clone().addScaledVector(d, 8 + len / 2), probe = cen.clone().addScaledVector(n, -40);
    const face = probe.clone().addScaledVector(n, ctx.gap(probe, n, d, len - 8, 22) - 0.4);
    P.pad(face, d, len, 40, 9, n);
    // The feet: soles' normal and the line the feet travel along.
    const sole = ctx.track((x, y, z, b) => b.startsWith("foot"));
    const fdir = J.toe.clone().sub(J.ankle).setZ(0).normalize(), np = V(-fdir.y, fdir.x, 0);
    const a0 = mid(S[0].J.ankle, S[0].J.toe), a1 = mid(S[8].J.ankle, S[8].J.toe); a0.z = a1.z = 0;
    const rd = a0.clone().sub(a1).normalize(); // sled travel: away from the seat
    const contact = (pts) => { let c = Infinity; for (let i = 0; i < pts.length; i += 3) c = Math.min(c, pts[i] * np.x + pts[i + 1] * np.y); return c; };
    const sled = new THREE.Group(); P.add(sled);
    const plateC = a0.clone().addScaledVector(np, -2);
    sled.position.copy(plateC);
    sled.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(np, fdir, new THREE.Vector3().crossVectors(np, fdir)));
    // In the sled frame: x = out of the plate toward the feet, y = along the plate (toes), z across.
    P.box(2.4, 52, 66, M.steel, V(-1.2, 0, 0), sled);
    P.box(0.6, 48, 62, M.rubber, V(0.3, 0, 0), sled);
    [1, -1].forEach((s) => {
      P.box(14, 10, 8, M.graphite, V(-9, -12, s * 36), sled);
      P.rod(V(-8, -12, s * 40), V(-8, -12, s * 58), 2.5, M.chrome, sled);
      [0, 1].forEach((i) => { const pl = G.mesh(P.ironPlate(22.5, 4.6), M.iron); pl.position.set(-8, -12, s * (44 + i * 4.8)); pl.rotation.x = Math.PI / 2; sled.add(pl); });
      P.beam(V(-3, -24, s * 30), V(-3, 24, s * 30), 5, 5, V(1, 0, 0), { parent: sled });
    });
    // Sled offset along its rails that puts the plate's rubber face on the soles.
    const sl = (c) => (c - 0.7 - plateC.dot(np)) / rd.dot(np);
    const rail0 = plateC.clone().addScaledVector(rd, -30), rail1 = plateC.clone().addScaledVector(rd, 70);
    [1, -1].forEach((s) => {
      const off = V(0, 0, s * 36).addScaledVector(np, -9).add(V(0, -12, 0).applyQuaternion(sled.quaternion));
      P.rod(rail0.clone().add(off), rail1.clone().add(off), 1.8, M.chrome);
      P.beam(V(rail0.x + off.x, fy + 9, s * 36), rail0.clone().add(off), 6, 6, V(0, 0, 1), { caps: false });
      P.beam(V(rail1.x + off.x, fy + 9, s * 36), rail1.clone().add(off), 6, 6, V(0, 0, 1), { caps: false });
      P.beam(V(Math.min(hip.x - 40, rail0.x) - 6, fy + 5.25, s * 36), V(Math.max(rail1.x, rail0.x) + 10, fy + 5.25, s * 36), 7.5, 6, V(0, 1, 0));
      P.foot(Math.min(hip.x - 40, rail0.x) - 3, s * 36, 7, 7); P.foot(Math.max(rail1.x, rail0.x) + 7, s * 36, 7, 7);
      // Grab handles by the seat, where the hands are.
      const h = S[0].grip[s > 0 ? "R" : "L"];
      P.rod(V(h.x - 9, h.y, h.z), V(h.x + 9, h.y, h.z), 1.6, M.grip);
      P.beam(V(h.x + 9, fy + 9, h.z), V(h.x + 9, h.y, h.z), 4, 4, V(0, 0, 1), { caps: [false, true] });
    });
    P.beam(V(hip.x + 4, fy + 9, 0), V(hip.x + 4, seatTop - 9, 0), 7.5, 6, V(0, 0, 1), { caps: false });
    const bsup = face.clone().addScaledVector(n, -10);
    P.beam(V(bsup.x, fy + 9, 0), bsup.clone().addScaledVector(d, -len / 2 + 6), 6, 6, V(0, 0, 1), { caps: false });
    const update = () => {
      const c = contact(sole.now());
      sled.position.copy(plateC).addScaledVector(rd, sl(c));
    };
    return { update };
  } };

  // Lying leg curl: long pad under the body, handles at the hands, a lever pivoting at the knee
  // with the roller pad on the back of the lower legs and plates on its horn.
  K.legCurl = {
    ground(ctx) { const J = ctx.S[0].J; return ctx.lowest({ x0: J.knee.x + 6, x1: J.neck.x, z0: -12, z1: 12 }) - 72; },
    build(ctx) {
      const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J, knee = J.knee;
      const x0 = knee.x + 4, x1 = J.neck.x + 8;
      const b = flatBench(ctx, x0, x1, { width: 32, only: (n) => /Torso|neck|head|pelvis|thigh/.test(n) });
      // Lever: pivot on the knee's axis; the roller sits on the back of the lower legs.
      const shinPts = (s) => { let best = -Infinity; const sd = s.J.ankle.clone().sub(s.J.knee).setZ(0).normalize(), post = V(sd.y, -sd.x, 0);
        for (let i = 0; i < s.pts.length; i += 3) { const v = V(s.pts[i] - s.J.knee.x, s.pts[i + 1] - s.J.knee.y, 0), a = v.dot(sd); if (a > 31 && a < 37 && Math.abs(s.pts[i + 2]) < 16) best = Math.max(best, v.dot(post)); }
        return best; };
      let off = -Infinity; S.forEach((s) => { off = Math.max(off, shinPts(s)); });
      // Roller axle in the lever frame: x runs down the shin, local y is 90° CCW of it, which is
      // the front of the leg, so the back of the leg (where the roller sits) is -y.
      const rr = 5.5, ra = V(34, -(off + rr), 0);
      const lever = new THREE.Group(); lever.position.set(knee.x, knee.y, 0); P.add(lever);
      [1, -1].forEach((s) => {
        P.beam(V(0, 0, s * 25), V(ra.x, ra.y, s * 25), 5, 4, V(0, 0, 1), { parent: lever });
        P.box(8, 8, 6, M.graphite, V(0, 0, s * 25), lever);
        const roll = G.mesh(new THREE.CylinderGeometry(rr, rr, 15, 28).rotateX(Math.PI / 2), M.upholstery); roll.position.set(ra.x, ra.y, s * 9.5); lever.add(roll);
      });
      P.rod(V(ra.x, ra.y, -25), V(ra.x, ra.y, 25), 1.2, M.chrome, lever);
      P.rod(V(0, 0, -29), V(0, 0, 29), 1.8, M.chrome, lever);
      // Weight horn on the far side of the lever with two plates.
      P.rod(V(14, -2, 27), V(14, -2, 44), 2.5, M.chrome, lever);
      [0, 1].forEach((i) => { const pl = G.mesh(P.ironPlate(16, 3.6), M.iron); pl.position.set(14, -2, 31 + i * 3.8); pl.rotation.x = Math.PI / 2; lever.add(pl); });
      [1, -1].forEach((s) => {
        P.beam(V(knee.x + 6, fy + 9, s * 30), V(knee.x, knee.y - 4, s * 30), 6, 6, V(0, 0, 1), { caps: [false, true] });
        P.box(6, 6, 6, M.graphite, V(knee.x, knee.y, s * 29));
        P.beam(V(knee.x - 6, fy + 5.25, s * 30), V(x1 + 18, fy + 5.25, s * 30), 7.5, 6, V(0, 1, 0));
        P.foot(knee.x - 3, s * 30, 7, 7); P.foot(x1 + 15, s * 30, 7, 7);
        // Handles where the hands hold, on posts from the frame.
        const h = S[0].grip[s > 0 ? "R" : "L"], ax = S[0].axis[s > 0 ? "R" : "L"].clone().normalize();
        P.rod(h.clone().addScaledVector(ax, -5.5), h.clone().addScaledVector(ax, 5.5), 1.6, M.grip);
        const lo = h.clone().addScaledVector(ax, ax.y > 0 ? -5.5 : 5.5);
        P.beam(V(lo.x, b.by, h.z), lo, 4, 4, V(0, 0, 1), { caps: [false, true] });
      });
      P.beam(V(S[0].grip.R.x, b.by, -20), V(S[0].grip.R.x, b.by, 20), 4, 4, V(1, 0, 0), { caps: false });
      const update = (f) => { const sd = f.J.ankle.clone().sub(f.J.knee); lever.rotation.z = Math.atan2(sd.y, sd.x); };
      S.forEach((s) => update(s));
      return { update };
    }
  };

  // Standing calf raise: forefoot on a step; shoulder pads on a carriage that rides up two
  // guide rods with the lifter, linked by cable to the stack.
  K.calfRaise = { ground: "fixed", build(ctx) {
    const THREE = T(), P = ctx.P, M = P.M, fy = P.floorY, S = ctx.S, J = S[0].J;
    const toe = J.toe, ball = toe.x - 6;
    const stepTop = ctx.lowest({ x0: ball, x1: ball + 30, z0: -20, z1: 20 }, (b) => b.startsWith("foot"));
    const step = G.mesh(G.padGeo(36, stepTop - fy, 70), M.rubber); step.position.set(ball + 15, fy, 0); P.add(step);
    P.box(36, 1.2, 70, M.steel, V(ball + 15, fy + 0.6, 0));
    // Shoulder pads ride on the tops of the shoulders.
    const shTop = ctx.track((x, y, z, b) => (b === "upperTorso" || b === "neck" || b.startsWith("upperArm")) && Math.abs(z) > 5 && Math.abs(z) < 22 && Math.abs(x - J.shoulder.x) < 8);
    const topOf = () => { const p = shTop.now(); let m = -Infinity; for (let i = 1; i < p.length; i += 3) m = Math.max(m, p[i]); return m; };
    const car = new THREE.Group(); P.add(car);
    const cx = J.shoulder.x, rx = cx - 30;
    [1, -1].forEach((s) => {
      const pad = G.mesh(G.padGeo(18, 7, 12), M.upholstery); pad.position.set(cx, 0, s * 13); car.add(pad);
      P.box(20, 1.2, 13, M.graphite, V(cx, 0.6, s * 13), car);
      P.beam(V(rx, 3, s * 13), V(cx + 8, 3, s * 13), 6, 5, V(0, 0, 1), { parent: car });
    });
    P.box(10, 14, 36, M.graphite, V(rx, 3, 0), car);
    // Handles in front at the hands, on the carriage arms.
    const g0 = S[0].grip;
    // The carriage moves with the shoulders; the handles sit where the hands are relative to it.
    let y0 = null;
    const H = J.head.y - fy + 46;
    [1, -1].forEach((s) => {
      P.rod(V(rx - 8, fy + 9, s * 10), V(rx - 8, fy + H, s * 10), 1.6, M.chrome);
      P.beam(V(rx - 18, fy + 9, s * 24), V(rx - 18, fy + H, s * 24), 7.5, 7.5, V(0, 0, 1), { caps: [false, true] });
      P.beam(V(rx - 30, fy + 5.25, s * 24), V(ball + 40, fy + 5.25, s * 24), 7.5, 6, V(0, 1, 0));
      P.foot(rx - 27, s * 24, 7, 7); P.foot(ball + 37, s * 24, 7, 7);
    });
    P.beam(V(rx - 18, fy + H - 3.75, -24), V(rx - 18, fy + H - 3.75, 24), 7.5, 7.5, V(1, 0, 0), { caps: false });
    const st = P.stack(14, { rodH: H - 20 }); st.g.position.set(rx - 40, fy + 9, 0);
    [1, -1].forEach((s) => P.beam(V(rx - 58, fy + 9, s * 17), V(rx - 58, fy + H, s * 17), 6, 6, V(0, 0, 1), { caps: [false, true] }));
    P.beam(V(rx - 58, fy + H + 3, 0), V(rx - 18, fy + H + 3, 0), 6, 6, V(0, 0, 1));
    const hand = new THREE.Group(); car.add(hand);
    const p1 = P.pulley(4.6); p1.g.position.set(rx - 40 + 4.6, fy + H - 6, 0); p1.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, -1, 0), V(0, 0, 1)));
    const p2 = P.pulley(4.6); p2.g.position.set(rx - 4.6, fy + 16, 0);
    const run = G.CableRun(P, M.cable, 0.36);
    let rest = Infinity;
    const update = (f) => {
      const top = topOf();
      if (y0 == null) {
        y0 = top;
        // Handle bar across the front at the hands (in the carriage's frame).
        const m0 = mid(g0.R, g0.L);
        P.rod(V(m0.x, m0.y - y0, -22), V(m0.x, m0.y - y0, 22), 1.6, M.grip, hand);
        [1, -1].forEach((s) => P.beam(V(cx + 8, 3, s * 22), V(m0.x, m0.y - y0, s * 22), 3.5, 3.5, V(0, 0, 1), { parent: hand, caps: false }));
      }
      car.position.y = top - 0.4;
      const L = run.update(st.g.localToWorld(st.attach.clone().add(st.moving.position)), [{ C: p1.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p1 }, { C: p2.g.position.clone(), n: V(0, 0, 1), r: 4.6, pulley: p2 }], V(rx, car.position.y - 4, 0)).length;
      rest = Math.min(rest, L);
      st.moving.position.y = Math.max(0, Math.min(st.travel, L - rest));
    };
    S.forEach((s) => update(s));
    return { update };
  } };

  return {
    K,
    // Shared building blocks, so kits in other files (js/kits/*.js) can reuse benches, racks,
    // bars, dumbbells, cable towers and handles instead of redrawing them.
    lib: { V, mid, flatBench, benchRack, platform, PLATFORM_T, barbell, dumbbells, cableTower, dHandleRig, ropeRig, vBarRig, latBarRig, cableKit, adjBench, powerRack, mat },
    // Where the floor goes: under the "feet", under the whole "body" (floor exercises), far
    // below a "hang"ing body, or where the kit decides.
    groundOf(name, fig) { return fig.ground || (K[name] && K[name].ground) || "feet"; },
    hangOf(name) { return (K[name] && K[name].hang) || 228; },
    build(name, ctx) { return K[name] ? K[name].build(ctx) : null; }
  };
})();
