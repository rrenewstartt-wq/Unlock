// Look test set (cinematographer, docs/reference-look.md): a generic corner of a Japanese residential street — not
// from any case and not the reference's house. Two-storey stucco house behind a concrete-block fence, wooden front door
// with a brass knob, a small tree in the yard, an AC unit, a few potted shrubs, neighbours as plain clay masses.
// CC0 only: Poly Haven textures/HDRIs/models (tree_small_02, shrub_02) and the Quaternius figure.
// Coordinates (m): street along x at z ∈ [3.2, 8.2]; our fence at z = 2.9; house front wall at z = -1 (faces +z).
//
// opts: { cut: "aerial" | "approach" | "macro" | "follow" | "window", look?, camera?, grade? }
import { film, THREE, CLAY, poseArmsDown, turn } from "../kit3d/film.js";
import { GLTFLoader } from "../kit3d/addons/loaders/GLTFLoader.js";
import { CACHE } from "../kit3d/thumbkit.js";

const DOOR = { x: 1.5, w: 0.86, h: 2.02, z: -1 };
export const KNOB = [DOOR.x + DOOR.w / 2 - 0.075, 0.95, DOOR.z + 0.04 + 0.075];
export const WINDOW2 = [-1.2, 4.25, -1];

export const CUTS = {
  aerial: { look: "unlock-day", camera: { preset: "aerialDescend", target: [0.6, 0.8, -0.5], t0: 0, t1: 5, azimuth: 24, orbit: -9,
    height: [17, 10.5], dist: [12.5, 8.6], fov: [42, 38], lookLift: [0, 1.2] } },
  approach: { look: "unlock-day", camera: { preset: "approach", target: [DOOR.x, 1.15, DOOR.z], t0: 0, t1: 4, azimuth: 22,
    from: 4.6, to: 2.2, height: 1.35, drift: 0.5, fov: [40, 37], lookHeight: 1.05 } },
  macro: { look: "unlock-day", dof: true, camera: { preset: "macroPush", target: KNOB, t0: 0, t1: 4, azimuth: 38, elevation: 6,
    from: 0.5, to: 0.3, fov: [30, 27], aperture: 4.5, arc: 7 } },
  follow: { look: "unlock-day", walker: { from: [DOOR.x - 0.05, 0, 7.4], to: [DOOR.x - 0.05, 0, 1.0] }, camera: { preset: "followBack",
    from: [DOOR.x - 0.05, 0, 7.4], to: [DOOR.x - 0.05, 0, 1.0], t0: 0, t1: 5, back: 1.9, side: 0.38, height: 1.62, lookAhead: 4,
    lookHeight: 1.35, fov: 40 } },
  window: { look: "unlock-night", camera: { preset: "lateralDrift", target: WINDOW2, t0: 0, t1: 5, azimuth: 12, dist: 5.2,
    travel: 1.3, height: 2.7, lead: 0.3, fov: 36 } },
};

// Smooth wood veneer (long vertical grain, like a modern flush/panel door), drawn from a fixed seed.
function veneer() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 1024;
  const x = c.getContext("2d");
  x.fillStyle = "#7d6450"; x.fillRect(0, 0, 512, 1024);
  let s = 41;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const x0 = r() * 512, wv = 0.6 + r() * 2.4, a = 0.04 + r() * 0.12, dark = r() < 0.6;
    x.strokeStyle = dark ? `rgba(48,34,24,${a})` : `rgba(168,140,112,${a * 0.8})`;
    x.lineWidth = wv;
    x.beginPath();
    const amp = 2 + r() * 6, ph = r() * 6.28, fr = 0.002 + r() * 0.004;
    for (let y = -10; y <= 1034; y += 16) x.lineTo(x0 + amp * Math.sin(y * fr + ph), y);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
}

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createLookStreet(stage, opts = {}) {
  const cut = CUTS[opts.cut || "aerial"];
  const look = opts.look || cut.look;
  const night = look === "unlock-night";
  const camera = opts.camera || cut.camera;
  return film(stage, `look-street-${opts.cut}-${stage.id}`, { look, dof: !!(opts.dof ?? cut.dof), grade: opts.grade, shadowSize: 2048 }, async (f) => {
    const S = f.scene;
    const [wallM, blockM, asphaltM, yardM, doorM] = await Promise.all([
      f.clay("wall", { tex: "clay_plaster", normalScale: 0.5 }),
      f.clay("block", { tex: "concrete_block_wall", normalScale: 0.8 }),
      f.clay("ground", { tex: "asphalt_04", normalScale: 0.6 }),
      f.clay("concrete", { tex: "brushed_concrete", normalScale: 0.4 }),
      Promise.resolve(veneer()),
    ]);
    const roofM = new THREE.MeshStandardMaterial({ color: CLAY.roof, roughness: 0.75 });
    const trimM = new THREE.MeshStandardMaterial({ color: CLAY.trim, roughness: 0.85 });
    const frameM = new THREE.MeshStandardMaterial({ color: CLAY.frame, roughness: 0.5, metalness: 0.3 });
    const glassM = new THREE.MeshStandardMaterial({ color: CLAY.glass, roughness: 0.08, metalness: 0.0 });
    const glassT = new THREE.MeshStandardMaterial({ color: "#1a1e24", roughness: 0.05, transparent: true, opacity: 0.5 });
    const vgrain = (m) => m;
    const plainWall = new THREE.MeshStandardMaterial({ color: CLAY.wallDark, roughness: 0.95 });

    const add = (geo, mat, pos, rot = [0, 0, 0], cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos); m.rotation.set(...rot);
      m.castShadow = cast; m.receiveShadow = true;
      S.add(m);
      return m;
    };
    // box with its texture tiled per metre (tile = metres per texture repeat)
    const box = (w, h, d, mat, pos, tile = 2, rot) => add(new THREE.BoxGeometry(w, h, d), mat.map || mat.normalMap ? f.tiled(mat, Math.max(w, d) / tile, h / tile) : mat, pos, rot);

    // ---------------------------------------------------------------- ground
    const g = (w, d, mat, pos, tile) => add(new THREE.PlaneGeometry(w, d), f.tiled(mat, w / tile, d / tile), pos, [-Math.PI / 2, 0, 0], false);
    g(80, 5, asphaltM, [0, 0, 5.7], 4);
    g(80, 30, yardM, [0, -0.005, -12], 3);
    g(80, 20, yardM, [0, -0.005, 18.2], 3);
    // white edge line along the street (generic Japanese residential road marking)
    add(new THREE.PlaneGeometry(80, 0.12), new THREE.MeshStandardMaterial({ color: "#d9d7d2", roughness: 0.9 }), [0, 0.004, 3.55], [-Math.PI / 2, 0, 0], false);
    // gutter covers
    for (const z of [3.3, 8.1]) box(80, 0.05, 0.3, trimM, [0, 0.025, z], 2);

    // ---------------------------------------------------------------- block fence with an opening, gate posts
    for (const [x0, x1] of [[-7.5, 0.95], [2.15, 7.5]]) {
      box(x1 - x0, 1.3, 0.15, blockM, [(x0 + x1) / 2, 0.65, 2.9], 1.6);
      box(x1 - x0, 0.06, 0.2, trimM, [(x0 + x1) / 2, 1.33, 2.9]);
    }
    for (const x of [0.83, 2.27]) box(0.26, 1.55, 0.26, plainWall, [x, 0.775, 2.9]);
    for (const x of [-7.5, 7.5]) box(0.15, 1.3, 10, blockM, [x, 0.65, -2.1], 1.6);   // side fences

    // ---------------------------------------------------------------- the house
    const HX0 = -4.6, HX1 = 4.6, HZ0 = -8.5, HZ1 = DOOR.z, H1 = 2.9, H2 = 5.8;
    const hw = HX1 - HX0, hd = HZ1 - HZ0;
    box(hw, H2, hd - 0.02, wallM, [(HX0 + HX1) / 2, H2 / 2, (HZ0 + HZ1) / 2 - 0.01], 2.2);
    box(hw + 0.04, 0.12, hd + 0.06, trimM, [0, H1, (HZ0 + HZ1) / 2]);                // floor band
    box(hw + 0.04, 0.3, hd + 0.04, plainWall, [0, 0.15, (HZ0 + HZ1) / 2]);            // base
    // gable roof, ridge along x
    const pitch = 0.42, eave = 0.55, run = hd / 2 + eave, rl = run / Math.cos(pitch);
    for (const s of [-1, 1]) {
      const r = box(hw + 2 * eave, 0.14, rl, roofM, [0, H2 + Math.tan(pitch) * run / 2 - 0.02, (HZ0 + HZ1) / 2 + s * run / 2]);
      r.rotation.x = s * pitch;
    }
    // gable end walls (triangles)
    const tri = new THREE.Shape([new THREE.Vector2(-hd / 2, 0), new THREE.Vector2(hd / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * hd / 2)]);
    for (const x of [HX0 + 0.01, HX1 - 0.01]) {
      const m = add(new THREE.ShapeGeometry(tri), f.tiled(wallM, hd / 2.2, 1), [x, H2, (HZ0 + HZ1) / 2], [0, x < 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
      m.material.side = THREE.DoubleSide;
    }
    // gutter + downpipe
    box(hw + 1.1, 0.12, 0.14, trimM, [0, H2 - 0.02, HZ1 + eave - 0.02]);
    add(new THREE.CylinderGeometry(0.045, 0.045, H2, 10), trimM, [HX1 - 0.25, H2 / 2, HZ1 + 0.08]);

    // windows: frame, dark glass, mullion, optional curtains inside
    const curtainM = new THREE.MeshStandardMaterial({ color: CLAY.fabric, roughness: 0.95, emissive: night ? "#9fb0c6" : "#000000", emissiveIntensity: night ? 0.16 : 0 });
    const curtain = (w, h, pos) => {
      const geo = new THREE.PlaneGeometry(w, h, 64, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, 0.008 * Math.sin(p.getX(i) / w * 2 * Math.PI * 7.5));
      geo.computeVertexNormals();
      add(geo, curtainM, pos, [0, 0, 0], false);
    };
    const windowAt = (cx, y0, w, h, { awning = false, curtains = false } = {}) => {
      const z = HZ1;
      box(w + 0.1, 0.06, 0.06, frameM, [cx, y0 + h + 0.03, z + 0.03]);
      box(w + 0.1, 0.06, 0.06, frameM, [cx, y0 - 0.03, z + 0.03]);
      for (const s of [-1, 1]) box(0.06, h + 0.12, 0.06, frameM, [cx + s * (w / 2 + 0.02), y0 + h / 2, z + 0.03]);
      box(0.045, h, 0.05, frameM, [cx, y0 + h / 2, z + 0.02]);
      box(w + 0.24, 0.05, 0.14, trimM, [cx, y0 - 0.08, z + 0.07]);                 // sill
      // recessed glass with a little room behind it
      add(new THREE.PlaneGeometry(w, h), curtains ? glassT : glassM, [cx, y0 + h / 2, z + 0.01], [0, 0, 0], false);
      if (curtains) curtain(w * 0.98, h * 0.96, [cx, y0 + h / 2, z - 0.006]);
      if (awning) {   // thin sloped canopy with two brackets
        const a = box(w + 0.7, 0.035, 0.62, new THREE.MeshStandardMaterial({ color: "#7d7f83", roughness: 0.5, metalness: 0.4 }), [cx, y0 + h + 0.32, z + 0.31]);
        a.rotation.x = 0.22;
        for (const s of [-1, 1]) {
          const b = box(0.02, 0.02, 0.62, frameM, [cx + s * (w / 2 + 0.18), y0 + h + 0.12, z + 0.25]);
          b.rotation.x = -0.6;
        }
      }
    };
    // a hole in the wall would cost geometry; the glass sits just in front of the wall face instead
    windowAt(-2.5, 0.95, 1.7, 1.15, { curtains: true });
    windowAt(WINDOW2[0], 3.65, 1.7, 1.15, { awning: true, curtains: true });
    windowAt(2.9, 3.85, 0.9, 0.9, {});

    // ---------------------------------------------------------------- the entrance: door (hero), knob (hero), canopy, step
    const dz = DOOR.z;
    box(DOOR.w + 0.16, DOOR.h + 0.08, 0.08, frameM, [DOOR.x, (DOOR.h + 0.08) / 2 + 0.15, dz + 0.02]);       // frame
    const door = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, DOOR.h, 0.045), vgrain(f.tiled(doorM, 1, 1)));
    door.add(slab);
    for (const [y, h] of [[0.42, 0.62], [-0.42, 0.62]]) {   // two raised panels
      const p = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w - 0.22, h, 0.012), vgrain(f.tiled(doorM, 0.75, 0.31)));
      p.position.set(0, y, 0.027);
      door.add(p);
    }
    door.position.set(DOOR.x, DOOR.h / 2 + 0.15, dz + 0.045);
    door.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    S.add(door);
    // brass knob: rosette, neck, ball, keyhole (lathe)
    const prof = [[0, 0], [0.033, 0], [0.034, 0.003], [0.031, 0.007], [0.02, 0.012], [0.01, 0.016], [0.009, 0.036], [0.017, 0.044], [0.027, 0.058],
      [0.029, 0.074], [0.024, 0.09], [0.012, 0.099], [0, 0.101]].map(([r, y]) => new THREE.Vector2(r, y));
    const brass = new THREE.MeshStandardMaterial({ color: "#b58a46", metalness: 1, roughness: 0.24, envMap: S.environment, envMapIntensity: 0.7 });
    const knob = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), brass);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(KNOB[0], KNOB[1], dz + 0.045 + 0.0225);
    knob.castShadow = true; knob.receiveShadow = true;
    S.add(knob);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.011, 0.004), new THREE.MeshStandardMaterial({ color: "#0b0906", roughness: 0.6 }));
    hole.position.set(KNOB[0], KNOB[1] - 0.002, dz + 0.045 + 0.0225 + 0.101);
    S.add(hole);
    f.hero(door, knob);
    // entrance canopy and step
    box(1.7, 0.08, 0.9, plainWall, [DOOR.x, 2.55, dz + 0.45]);
    box(1.8, 0.16, 0.95, yardM, [DOOR.x, 0.08, dz + 0.475], 1.5);
    // stepping stones to the gate
    for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.27, 0.29, 0.04, 20), f.tiled(yardM, 0.3, 0.3), [DOOR.x - 0.05 + (i % 2 ? 0.07 : -0.05), 0.02, 0.35 + i * 0.62], [0, i, 0]);
    // interphone + meter box, AC unit with a dark fan, nameplate (blank)
    box(0.1, 0.14, 0.04, frameM, [DOOR.x - 0.62, 1.45, dz + 0.02]);
    box(0.3, 0.42, 0.14, new THREE.MeshStandardMaterial({ color: "#9a9b98", roughness: 0.7 }), [-0.6, 1.5, dz + 0.07]);
    const acM = new THREE.MeshStandardMaterial({ color: "#d3d2ce", roughness: 0.6 });
    box(0.82, 0.58, 0.3, acM, [3.3, 0.44, dz + 0.17]);
    add(new THREE.CircleGeometry(0.19, 32), new THREE.MeshStandardMaterial({ color: "#1a1b1d", roughness: 0.6 }), [3.42, 0.45, dz + 0.322]);
    box(0.82, 0.15, 0.3, trimM, [3.3, 0.075, dz + 0.17]);

    // ---------------------------------------------------------------- plants (CC0): small tree in the yard, shrubs in pots
    const loader = new GLTFLoader();
    const tree = (await loader.loadAsync(`${CACHE}/models/tree_small_02/tree_small_02.gltf`)).scene;
    const tb = new THREE.Box3().setFromObject(tree);
    const tk = 4.6 / (tb.max.y - tb.min.y);
    tree.scale.setScalar(tk);
    tree.position.set(-3.7, -tb.min.y * tk, 1.5);
    tree.rotation.y = 0.7;
    tree.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = true;   // its shadow on the wall is the gobo (cheaper, controllable)
      const m = o.material;
      if (m.map) { m.color = new THREE.Color("#6f7a66"); }
      if (m.transparent) { m.transparent = false; m.alphaTest = 0.5; }
    });
    S.add(tree);
    const shrubSrc = (await loader.loadAsync(`${CACHE}/models/shrub_02/shrub_02.gltf`)).scene;
    const potM = new THREE.MeshStandardMaterial({ color: "#7b6e62", roughness: 0.8 });
    const pots = [[2.25, -0.55], [2.6, -0.62], [2.95, -0.55]];
    pots.forEach(([x, z], i) => {
      add(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 20), potM, [x, 0.12, z]);
      const node = shrubSrc.children[i % shrubSrc.children.length].clone();
      node.position.set(0, 0, 0);
      const b = new THREE.Box3().setFromObject(node);
      const k = 0.32 / (b.max.y - b.min.y);
      node.scale.multiplyScalar(k);
      node.position.set(x - (b.min.x + b.max.x) / 2 * k, 0.22 - b.min.y * k, z - (b.min.z + b.max.z) / 2 * k);
      node.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material.color = new THREE.Color("#7f8a74"); } });
      S.add(node);
    });

    // ---------------------------------------------------------------- utility pole and wires (plain)
    const poleM = new THREE.MeshStandardMaterial({ color: "#8d8b86", roughness: 0.8 });
    add(new THREE.CylinderGeometry(0.13, 0.17, 10, 16), poleM, [6.2, 5, 3.45]);
    box(1.4, 0.1, 0.1, poleM, [6.2, 8.6, 3.45]);
    const wire = new THREE.MeshStandardMaterial({ color: "#1d1e20", roughness: 0.6 });
    for (const [y, dz2] of [[8.65, -0.6], [8.65, 0.6], [7.9, 0]]) add(new THREE.CylinderGeometry(0.008, 0.008, 80, 4), wire, [0, y, 3.45 + dz2 * 0.5], [0, 0, Math.PI / 2], false);

    // ---------------------------------------------------------------- neighbours: plain clay masses with gable roofs
    const nb = (cx, cz, w, d, h, i) => {
      box(w, h, d, f.tiled(wallM, 1, 1), [cx, h / 2, cz], 2.5);
      for (const s of [-1, 1]) {
        const rr = d / 2 + 0.45;
        const r = box(w + 0.8, 0.12, rr / Math.cos(0.4), roofM, [cx, h + Math.tan(0.4) * rr / 2, cz + s * rr / 2]);
        r.rotation.x = s * 0.4;
      }
      // a dark window or two so they read as houses
      for (let k = 0; k < 2; k++) {
        const x = cx + (k ? 1 : -1) * w * 0.22;
        const face = cz > 3 ? cz - d / 2 - 0.01 : cz + d / 2 + 0.01;
        add(new THREE.PlaneGeometry(1.2, 1.0), glassM, [x, h * (0.3 + 0.4 * hash(i + k)), face], [0, cz > 3 ? Math.PI : 0, 0], false);
      }
    };
    nb(-12.5, -4.5, 8, 8, 5.6, 1);
    nb(12.8, -5.0, 8.5, 8, 5.9, 2);
    nb(-6.5, 13.6, 8, 7.5, 5.7, 3);
    nb(4.2, 13.8, 9, 8, 6.0, 4);
    nb(15.5, 13.6, 7, 7, 5.4, 5);
    // fence across the street
    box(60, 1.3, 0.15, blockM, [0, 0.65, 8.7], 1.6);

    // ---------------------------------------------------------------- light: one low sun (moon at night) through leaves
    if (night) {
      f.sun({ azimuth: -38, elevation: 30, target: [-0.5, 3.4, -1], size: 13, leaves: { density: 0.5, leaf: 0.3, sway: 0.03, seed: 11, soft: 0.012 } });
      // the window's own faint light spilling on the sill
      const p = new THREE.PointLight("#b8c4d6", 0.6, 3, 2);
      p.position.set(WINDOW2[0], WINDOW2[1], -0.7);
      S.add(p);
    } else {
      // wide pattern for the aerial; close cuts use a tighter one around the entrance (finer leaf edges)
      const wide = opts.cut === "aerial";
      f.sun({ azimuth: -52, elevation: 24, target: wide ? [0.5, 1.6, -0.5] : [1.2, 1.4, -0.8], size: wide ? 17 : 10,
        leaves: { density: 0.55, leaf: 0.34, sway: 0.03, seed: 5, soft: 0.012, lit: [[...KNOB, 0.16]] } });
    }

    // ---------------------------------------------------------------- walker (follow cut): a figure with a minimal stride
    let walker = null;
    if (cut.walker) {
      walker = await f.figure("filmWoman");
      poseArmsDown(walker, 0.12);
      walker.root.rotation.y = Math.PI;   // walk toward -z (away from the camera)
      f.hold(walker);
    }
    const W = cut.walker, T0 = camera.t0 ?? 0, T1 = camera.t1 ?? 5;

    return (t) => {
      if (walker) {
        f.rest(walker);
        const u = Math.min(1, Math.max(0, (t - T0) / (T1 - T0)));
        const ph = t * 2 * Math.PI * 0.9;            // ~1.8 steps/s
        walker.root.position.set(W.from[0] + (W.to[0] - W.from[0]) * u, Math.abs(Math.sin(ph)) * 0.025, W.from[2] + (W.to[2] - W.from[2]) * u);
        turn(walker, "thigh_l", [1, 0, 0], 0.32 * Math.sin(ph));
        turn(walker, "thigh_r", [1, 0, 0], -0.32 * Math.sin(ph));
        turn(walker, "calf_l", [1, 0, 0], 0.35 * Math.max(0, -Math.sin(ph + 0.6)));
        turn(walker, "calf_r", [1, 0, 0], 0.35 * Math.max(0, Math.sin(ph + 0.6)));
        turn(walker, "upperarm_l", [1, 0, 0], -0.18 * Math.sin(ph));
        turn(walker, "upperarm_r", [1, 0, 0], 0.18 * Math.sin(ph));
      }
      f.shot(camera, t);
    };
  });
}
