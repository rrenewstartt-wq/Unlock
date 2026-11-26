// Look test set (cinematographer, docs/reference-look.md): a generic corner of a Japanese residential street — not
// from any case and not the reference's house. Two-storey stucco house behind a concrete-block fence, wooden front door
// with a brass knob, a small tree in the yard, an AC unit, a few potted shrubs, neighbours as plain clay masses.
// CC0 only: Poly Haven textures/HDRIs/models (oak_veneer_01, grey_roof_tiles, brushed_concrete, tree_small_02) and the Quaternius figure.
// Coordinates (m): street along x at z ∈ [3.2, 8.2]; our fence at z = 2.9; house front wall at z = -1 (faces +z).
//
// opts: { cut: "aerial" | "approach" | "macro" | "follow" | "window", look?, camera?, grade? }
import { film, THREE, CLAY, rng } from "../kit3d/film.js";
import { mergeGeometries } from "../kit3d/addons/utils/BufferGeometryUtils.js";
import { actor } from "../kit3d/actors.js";   // character-animator's walking, clothed figures
import { GLTFLoader } from "../kit3d/addons/loaders/GLTFLoader.js";
import { CACHE } from "../kit3d/thumbkit.js";
import { RoundedBoxGeometry } from "../kit3d/addons/geometries/RoundedBoxGeometry.js";

const DOOR = { x: 1.5, w: 0.86, h: 2.02, z: -1 };
export const KNOB = [DOOR.x + DOOR.w / 2 - 0.075, 0.95, DOOR.z + 0.0675 + 0.055];   // between neck and ball
export const WINDOW2 = [-1.2, 4.25, -1];

export const CUTS = {
  aerial: { look: "unlock-day", camera: { preset: "aerialDescend", target: [0.6, 0.8, -0.5], t0: 0, t1: 5, azimuth: 24, orbit: -9,
    height: [17, 10.5], dist: [12.5, 8.6], fov: [42, 38], lookLift: [0, 1.2] } },
  approach: { look: "unlock-day", camera: { preset: "approach", target: [DOOR.x, 1.15, DOOR.z], t0: 0, t1: 4, azimuth: 22,
    from: 3.9, to: 2.0, height: 1.5, drift: 0.45, fov: [40, 37], lookHeight: 1.05 } },
  // from the latch side (+x), slightly below: the neck shows between rosette and ball and the knob's shadow falls
  // on the door beside it (the sun comes from -x, so a camera on the -x side would hide the shadow behind the knob)
  macro: { look: "unlock-day", dof: true, camera: { preset: "macroPush", target: KNOB, t0: 0, t1: 4, azimuth: 54, elevation: 2,
    from: 0.44, to: 0.31, fov: [30, 27], aperture: 4.5, arc: 9 } },
  // the walker is already walking at t = 0 (at: -1.6), so speed is constant over the cut (she decelerates only after t = 5)
  // and followBack's from/to come from her. She steps through the gate at t ≈ 1.5 and walks up the yard to the door.
  // blind-1 fix 2: lower exposure, the walker and the door in leaf shade (half silhouette), blouse a step greyer
  follow: { look: "unlock-day", exposure: 0.95, walker: { kind: "schoolgirl", path: [[DOOR.x - 0.04, 4.7], [DOOR.x - 0.02, 2.4], [DOOR.x, 0.2]], at: -1.6, speed: 0.8,
    colors: { top: "#9498a0" } },
    camera: { preset: "followBack", t0: 0, t1: 5, back: 2.4, side: 0.22, height: 1.42, lookAhead: 3.2, lookHeight: 0.48, fov: 44, catchUp: 0.3 } },
  window: { look: "unlock-night", grade: { vignette: 0.2 }, camera: { preset: "lateralDrift", target: WINDOW2, t0: 0, t1: 5, azimuth: 22, dist: 5.2,
    travel: 1.3, height: 2.7, lead: 0.3, fov: 36 } },
};

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// A soft, out-of-focus leaf-spray shadow drawn once (fixed seed) as a multiply decal: white = no change, the spray
// keeps `keep` of the light under it. Used where a real gobo edge would be too crisp (macro foreground).
function blurredSpray({ w = 1024, h = 1024, seed = 3, keep = "#7d8594", blur = 26 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
  x.filter = `blur(${blur}px)`;
  x.fillStyle = keep; x.strokeStyle = keep;
  const R = rng(seed);
  // one stem from the lower-left corner arcing up to the right, leaves alternating along it
  const P = (u) => [w * (-0.05 + 0.95 * u), h * (1.02 - 0.75 * u - 0.18 * Math.sin(u * 3.1))];
  x.lineWidth = w * 0.022; x.beginPath();
  for (let u = 0; u <= 1.0001; u += 0.02) { const [px, py] = P(u); u ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.stroke();
  for (let i = 0, side = 1; i < 11; i++, side = -side) {
    const u = 0.08 + i * 0.085, [px, py] = P(u), [qx, qy] = P(u + 0.01);
    const a = Math.atan2(qy - py, qx - px) + side * (0.7 + R() * 0.4), L = w * (0.17 + R() * 0.08) * (1 - u * 0.35);
    x.save(); x.translate(px, py); x.rotate(a);
    x.beginPath(); x.moveTo(0, 0);
    x.quadraticCurveTo(L * 0.5, -L * 0.24, L, 0); x.quadraticCurveTo(L * 0.5, L * 0.24, 0, 0);
    x.fill(); x.restore();
  }
  x.filter = "none";
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    polygonOffset: true, polygonOffsetFactor: -2, fog: false, toneMapped: false });
}

// Radial contact shadow (fake ambient occlusion) under a small object on a wall: a multiply decal.
function contactShadow(r, keep = 0.45) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const k = Math.round(255 * keep);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgb(${k},${k},${k})`); g.addColorStop(0.45, `rgb(${k},${k},${k})`);
  g.addColorStop(0.62, `rgb(${Math.round(k + (255 - k) * 0.55)},${Math.round(k + (255 - k) * 0.55)},${Math.round(k + (255 - k) * 0.55)})`);
  g.addColorStop(1, "#ffffff");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    polygonOffset: true, polygonOffsetFactor: -2, fog: false, toneMapped: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), m);
}

// Several leaf-gobo layers, each confined to soft regions of the sunlit circle, composited into one light map
// (blind-1 fixes 1 and 3: shade only near the tree, and leaves of mixed size / angle / blur instead of one stamp).
// layers: [{ leaves: {leafShadows options} , regions: [[x, y, z, r, strength?], …] | null }]. Every layer gets its own
// copy of the sun (same position and target, not in the scene) so all maps line up; a region is a world point
// projected along the sun ray (it marks the column of air where that canopy hangs), r in metres at the target.
function leafLayers(f, sun, size, layers, res = 2048) {
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  sun.shadow.updateMatrices(sun);
  const P = (x, y, z) => { const v = new THREE.Vector4(x, y, z, 1).applyMatrix4(sun.shadow.matrix); return [v.x / v.w * res, (1 - v.y / v.w) * res]; };
  const canvas = (w = res) => { const c = document.createElement("canvas"); c.width = c.height = w; return [c, c.getContext("2d")]; };
  const srcs = layers.map((L) => {
    const d = new THREE.SpotLight();
    d.position.copy(sun.position); d.target.position.copy(sun.target.position);
    f.leafShadows({ sun: d, target: sun.target.position.toArray(), size, ...L.leaves });
    let mask = null;
    if (L.regions) {
      const [mc, mx] = canvas();
      mx.fillStyle = "#000"; mx.fillRect(0, 0, res, res);
      mx.globalCompositeOperation = "lighter";
      for (const [x, y, z, r, k = 1] of L.regions) {
        const [cx, cy] = P(x, y, z), rp = r * res / size, g = mx.createRadialGradient(cx, cy, 0, cx, cy, rp);
        const c = Math.round(255 * k);
        g.addColorStop(0, `rgb(${c},${c},${c})`); g.addColorStop(0.68, `rgb(${c},${c},${c})`); g.addColorStop(1, "rgb(0,0,0)");   // full-strength core: no smoky half-leaves
        mx.fillStyle = g; mx.fillRect(cx - rp, cy - rp, 2 * rp, 2 * rp);
      }
      mask = mc;
    } else if (L.strength !== undefined) {
      const [mc, mx] = canvas(4);
      const c = Math.round(255 * L.strength); mx.fillStyle = `rgb(${c},${c},${c})`; mx.fillRect(0, 0, 4, 4);
      mask = mc;
    }
    // blind-2 fix 2 (radial streaks): leafShadows skips the *leaves* inside a `lit` hole but still draws the twigs,
    // and the twigs of one spray fan out from a single point — so every sun hole showed a fan of thin dark lines
    // (the "rays" around the door). Clear each hole to white again (its radius stops short of the nearest leaf).
    const holes = (L.leaves.lit || []).map(([x, y, z, r = 0.3]) => [...P(x, y, z), r * res / size]);
    return { img: d.map.image, mask, holes };
  });
  const [acc, ax] = canvas(), [, tx] = canvas(), tmp = tx.canvas;
  const tex = new THREE.CanvasTexture(acc);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const still = layers.every((L) => L.leaves.sway === 0);
  let last = null;
  const draw = (t) => {
    if (last === t || (still && last !== null)) return;
    last = t;
    ax.globalCompositeOperation = "source-over"; ax.fillStyle = "#fff"; ax.fillRect(0, 0, res, res);
    for (const { img, mask, holes } of srcs) {
      tx.globalCompositeOperation = "source-over"; tx.drawImage(img, 0, 0, res, res);           // lit = white
      for (const [cx, cy, rp] of holes) {
        const g = tx.createRadialGradient(cx, cy, 0, cx, cy, rp);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.8, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
        tx.fillStyle = g; tx.fillRect(cx - rp, cy - rp, 2 * rp, 2 * rp);
      }
      tx.globalCompositeOperation = "difference"; tx.fillStyle = "#fff"; tx.fillRect(0, 0, res, res);   // shade amount
      if (mask) { tx.globalCompositeOperation = "multiply"; tx.drawImage(mask, 0, 0, res, res); }
      tx.globalCompositeOperation = "difference"; tx.fillRect(0, 0, res, res);                 // back to light
      ax.globalCompositeOperation = "multiply"; ax.drawImage(tmp, 0, 0);
    }
    tex.needsUpdate = true;
  };
  draw(0);
  sun.map = tex;
  f.onFrame(draw);
  return sun;
}

export function createLookStreet(stage, opts = {}) {
  const cut = CUTS[opts.cut || "aerial"];
  const look = opts.look === "none" ? undefined : (opts.look || cut.look);   // "none": plain film kit (cost baseline)
  const night = look === "unlock-night";
  let camera = opts.camera || cut.camera;
  const exposure = opts.exposure ?? cut.exposure;
  return film(stage, `look-street-${opts.cut}-${stage.id}`, { look, dof: !!look && !!(opts.dof ?? cut.dof), grade: opts.grade ?? cut.grade, shadowSize: 2048,
    ...(exposure ? { exposure } : {}) }, async (f) => {
    const S = f.scene;
    const [wallM, blockM, asphaltM, yardM, doorM] = await Promise.all([
      f.clay("wall", { tex: "clay_plaster", normalScale: 0.5 }),
      f.clay("block", { tex: "concrete_block_wall", normalScale: 0.8 }),
      f.clay("ground", { tex: "asphalt_04", normalScale: 0.6 }),
      f.clay("concrete", { tex: "brushed_concrete", normalScale: 0.4 }),
      f.material("oak_veneer_01", { normalScale: 0.6 }),
    ]);
    if (night) wallM.color.multiplyScalar(0.86);   // night: the stucco sits a step darker so the window reads
    // blind-1 fix 1: separate values — dark tiled roofs (relief of grey_roof_tiles, colour dropped), real concrete
    // for the yard (its own colour map, so it is mottled, not flat clay), a lighter-than-asphalt road
    const [roofT, yardTex] = await Promise.all([
      f.clay("#34373c", { tex: "grey_roof_tiles", normalScale: 1.1, roughness: 0.82 }),
      f.material("brushed_concrete", { normalScale: 0.6 }),
    ]);
    const roofM = roofT;
    const roofBox = (w, h, d, pos, rx, tile = 2.2, mat = roofM) => {   // roof slab with the tiles running along the ridge (x)
      const m = add(new THREE.BoxGeometry(w, h, d), f.tiled(mat, w / tile, d / tile), pos);
      m.rotation.x = rx;
      return m;
    };
    const trimM = new THREE.MeshStandardMaterial({ color: CLAY.trim, roughness: 0.85 });
    const frameM = new THREE.MeshStandardMaterial({ color: CLAY.frame, roughness: 0.5, metalness: 0.3 });
    const glassM = new THREE.MeshStandardMaterial({ color: CLAY.glass, roughness: 0.08, metalness: 0.0 });
    const glassT = new THREE.MeshStandardMaterial({ color: "#1a1e24", roughness: 0.05, transparent: true, opacity: 0.5 });
    // the door's real wood (hero): oak veneer, darkened toward the reference's grey-brown, grain running vertically
    doorM.color = new THREE.Color("#c4c1bc");
    doorM.roughness = 1.0;
    const wood = (w, h, ox = 0, oy = 0) => {           // veneer tile ≈ 0.9 m; each leaf gets its own offset
      const m = f.tiled(doorM, w / 0.9, h / 0.9);
      for (const k of ["map", "normalMap", "roughnessMap", "aoMap"]) if (m[k]) m[k].offset.set(ox, oy);
      return m;
    };
    const plainWall = new THREE.MeshStandardMaterial({ color: CLAY.wallDark, roughness: 0.95 });
    // blind-2 fixes (round 3) only change the cuts that lost: aerial, follow (and approach, which sits between them).
    // macro and window won both blind tests and must render byte-for-byte as before (checked: same md5 at t 0.93 / 1.36).
    const R3 = !["macro", "window"].includes(opts.cut);
    // blind-2 fix 1: every surface its own value and roughness (still almost colourless, like the reference):
    // light warm stucco > pale gravel yard > mid fence block > mid-dark neighbour cladding > dark road > darkest roofs
    const M3 = {};
    if (R3) {
      const [gravel, form, beige, asph] = await Promise.all([
        f.material("gravel_floor_02", { normalScale: 0.9 }), f.material("concrete_wall_008", { normalScale: 0.6 }),
        f.material("beige_wall_002", { normalScale: 0.5 }), f.material("asphalt_04", { normalScale: 0.6 })]);
      gravel.color = new THREE.Color("#d2cdc2"); gravel.roughness = 1;
      asph.color = new THREE.Color("#727375"); asph.roughness = 0.92;
      M3.gravel = gravel; M3.asphalt = asph;
      M3.form = form; form.color = new THREE.Color("#a3a09a"); form.roughness = 0.9;            // exposed concrete (neighbour, gate posts)
      M3.beige = beige; beige.color = new THREE.Color("#b9b2a6"); beige.roughness = 0.95;      // warm stucco neighbour
      M3.post = form.clone(); M3.post.color = new THREE.Color("#94918b");                     // gate posts: darker concrete
      M3.cap = new THREE.MeshStandardMaterial({ color: "#5d5c5a", roughness: 0.55 });          // polished stone caps
      M3.siding = await f.clay("#5a5d61", { tex: "concrete_wall_008", normalScale: 0.9, roughness: 0.62 });   // dark panel cladding
      M3.metalRoof = await f.clay("#8a8d90", { tex: "grey_roof_tiles", normalScale: 0.5, roughness: 0.42 });  // pale sheet roof
      M3.metalRoof.metalness = 0.35;
      M3.brownRoof = await f.clay("#3b3632", { tex: "grey_roof_tiles", normalScale: 1.1, roughness: 0.7 });
      M3.cappingDark = new THREE.MeshStandardMaterial({ color: "#6c6b68", roughness: 0.8 });   // fence copings
      wallM.color = new THREE.Color("#d3cec5");                                               // our stucco, the lightest mass
      roofM.roughness = 0.6;                                                                  // tiles catch a little sky
      blockM.color = new THREE.Color("#a09b92");
    }

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
    g(80, 5, R3 ? M3.asphalt : asphaltM, [0, 0, 5.7], 4);
    if (R3) g(15, 3.9, M3.gravel, [0, 0.001, 0.95], 1.6);      // our yard: pale gravel, a step lighter than the lots around it
    // yard ground a step darker than the step/stones so stones, pebbles and leaves read against it
    // the concrete photo is dark (mean ≈ 0.39 sRGB): read it as linear so its mottling sits around the old clay value
    const yardGround = yardTex; yardGround.color = new THREE.Color("#c9c5bd"); yardGround.roughness = 0.95;
    if (yardGround.map) { yardGround.map.colorSpace = THREE.NoColorSpace; yardGround.map.needsUpdate = true; }
    g(80, 30, yardGround, [0, -0.005, -12], 2.2);
    g(80, 20, yardGround, [0, -0.005, 18.2], 2.2);
    // white edge line along the street (generic Japanese residential road marking)
    add(new THREE.PlaneGeometry(80, 0.12), new THREE.MeshStandardMaterial({ color: "#d9d7d2", roughness: 0.9 }), [0, 0.004, 3.55], [-Math.PI / 2, 0, 0], false);
    // gutter covers
    for (const z of [3.3, 8.1]) box(80, 0.05, 0.3, trimM, [0, 0.025, z], 2);

    // fallen leaves and gravel scattered over the yard (and a little along the street edges), seed fixed
    {
      const R = rng(29);
      const leafShape = new THREE.Shape();
      leafShape.moveTo(-0.5, 0);
      leafShape.quadraticCurveTo(-0.05, 0.36, 0.5, 0);
      leafShape.quadraticCurveTo(-0.05, -0.36, -0.5, 0);
      const leafG = new THREE.ShapeGeometry(leafShape, 4);
      const lp = leafG.attributes.position;
      for (let i = 0; i < lp.count; i++) lp.setZ(i, 0.09 * lp.getY(i) ** 2 * 4 + 0.05 * lp.getX(i) ** 2);   // curled edges
      leafG.rotateX(-Math.PI / 2);
      leafG.computeVertexNormals();
      const pebG = new THREE.IcosahedronGeometry(1, 1);
      const spots = [];   // [x0, x1, z0, z1, leaves, pebbles]
      spots.push([-7.3, 7.3, -0.95, 2.78, 320, 650]);        // yard
      spots.push([-20, 20, 3.0, 3.5, 60, 110]);              // street edge, our side
      spots.push([-20, 20, 7.9, 8.55, 50, 90]);              // street edge, far side
      const nL = spots.reduce((a, s) => a + s[4], 0), nP = spots.reduce((a, s) => a + s[5], 0);
      const leafM = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, side: THREE.DoubleSide });
      const pebM = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
      const leaves = new THREE.InstancedMesh(leafG, leafM, nL), pebbles = new THREE.InstancedMesh(pebG, pebM, nP);
      const LC = ["#7d6438", "#6a512e", "#8a7446", "#5a4a32", "#76664a"].map((c) => new THREE.Color(c));
      const PC = ["#9d9a94", "#8a8781", "#aaa7a0", "#7c7975"].map((c) => new THREE.Color(c));
      const e = new THREE.Euler(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), M4 = new THREE.Matrix4();
      let il = 0, ip = 0;
      for (const [x0, x1, z0, z1, nl, np] of spots) {
        for (let k = 0; k < nl; k++) {
          // leaves drift into clumps along walls and fences: bias toward the edges of the strip
          const u = R(), zz = R() < 0.4 ? z0 + (z1 - z0) * Math.pow(R(), 2.5) : z0 + (z1 - z0) * R();
          const sz = 0.06 + R() * 0.06;
          e.set((R() - 0.5) * 0.35, R() * 6.283, (R() - 0.5) * 0.35);
          M4.compose(v.set(x0 + (x1 - x0) * u, 0.004 + R() * 0.006, zz), q.setFromEuler(e), sc.set(sz, sz, sz * (0.8 + R() * 0.4)));
          leaves.setMatrixAt(il, M4); leaves.setColorAt(il++, LC[Math.floor(R() * LC.length)]);
        }
        for (let k = 0; k < np; k++) {
          const r = 0.008 + R() * R() * 0.03;
          e.set(R() * 3, R() * 6.283, R() * 3);
          M4.compose(v.set(x0 + (x1 - x0) * R(), r * 0.2, z0 + (z1 - z0) * R()), q.setFromEuler(e), sc.set(r * (1 + R() * 0.4), r * 0.55, r));
          pebbles.setMatrixAt(ip, M4); pebbles.setColorAt(ip++, PC[Math.floor(R() * PC.length)]);
        }
      }
      for (const m of [leaves, pebbles]) { m.castShadow = false; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; S.add(m); }
    }

    // ---------------------------------------------------------------- block fence with an opening, gate posts
    for (const [x0, x1] of [[-7.5, 0.3], [2.7, 7.5]]) {   // a 2.1 m opening (gate posts at 0.3 and 2.7)
      box(x1 - x0, 1.3, 0.15, blockM, [(x0 + x1) / 2, 0.65, 2.9], 1.6);
      box(x1 - x0, 0.06, 0.2, R3 ? M3.cappingDark : trimM, [(x0 + x1) / 2, 1.33, 2.9]);
    }
    // gate posts: dark granite-like blocks with a cap (they frame the follow cut's left edge in shade)
    const postM = new THREE.MeshStandardMaterial({ color: "#56575a", roughness: 0.75 });
    if (!R3) {
      for (const x of [0.3, 2.7]) {
        box(0.26, 1.55, 0.26, postM, [x, 0.775, 2.9]);
        box(0.32, 0.06, 0.32, trimM, [x, 1.58, 2.9]);
      }
    } else {
      // blind-2 fix 2: the posts fill both edges of the follow cut, so they get real surfaces: board-formed concrete
      // (tie holes, pour lines), a stone plinth, a two-tier cap with chamfered edges and a drip line, a recessed
      // joint every 40 cm, a blank stone nameplate on the right post and a small square post lantern on the left one
      const jointM = new THREE.MeshStandardMaterial({ color: "#2b2c2e", roughness: 0.9 });
      const plateM = new THREE.MeshStandardMaterial({ color: "#6f6b64", roughness: 0.35 });
      for (const x of [0.3, 2.7]) {
        add(new THREE.BoxGeometry(0.26, 1.43, 0.26), f.tiled(M3.post, 0.26 / 1.2, 1.43 / 1.2), [x, 0.12 + 0.715, 2.9]);
        add(new RoundedBoxGeometry(0.3, 0.12, 0.3, 2, 0.012), M3.cap, [x, 0.06, 2.9]);                       // plinth
        for (const y of [0.52, 0.92, 1.32]) {                                                                    // joints
          add(new THREE.BoxGeometry(0.262, 0.012, 0.262), jointM, [x, y, 2.9], [0, 0, 0], false);
        }
        add(new RoundedBoxGeometry(0.34, 0.05, 0.34, 2, 0.01), M3.cap, [x, 1.575, 2.9]);                      // cap tier 1
        add(new RoundedBoxGeometry(0.3, 0.045, 0.3, 2, 0.012), M3.cap, [x, 1.62, 2.9]);                       // cap tier 2
        add(new THREE.BoxGeometry(0.344, 0.006, 0.344), jointM, [x, 1.548, 2.9], [0, 0, 0], false);            // drip shadow line
      }
      // nameplate (blank: no name on screen) on the right post's street face, with a thin dark bevel
      add(new RoundedBoxGeometry(0.09, 0.22, 0.016, 2, 0.004), plateM, [2.7, 1.12, 2.9 + 0.13 + 0.01]);
      add(new THREE.BoxGeometry(0.11, 0.24, 0.006), new THREE.MeshStandardMaterial({ color: "#b9b4aa", roughness: 0.5 }), [2.7, 1.12, 2.9 + 0.132], [0, 0, 0], false);   // pale stone surround
      // post lantern on the left cap: dark frame, frosted glass, small roof
      const lanFrame = new THREE.MeshStandardMaterial({ color: "#1f2022", roughness: 0.45, metalness: 0.5 });
      const lanGlass = new THREE.MeshStandardMaterial({ color: "#d9d6cf", roughness: 0.35, transparent: true, opacity: 0.9 });
      const ly = 1.6425;
      add(new THREE.BoxGeometry(0.15, 0.02, 0.15), lanFrame, [0.3, ly + 0.01, 2.9]);
      add(new THREE.BoxGeometry(0.12, 0.17, 0.12), lanGlass, [0.3, ly + 0.105, 2.9]);
      for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) add(new THREE.BoxGeometry(0.014, 0.17, 0.014), lanFrame, [0.3 + sx * 0.06, ly + 0.105, 2.9 + sz * 0.06]);
      const lr = add(new THREE.ConeGeometry(0.12, 0.06, 4), lanFrame, [0.3, ly + 0.22, 2.9], [0, Math.PI / 4, 0]);
      lr.scale.set(1, 1, 1);
    }
    for (const x of [-7.5, 7.5]) box(0.15, 1.3, 10, blockM, [x, 0.65, -2.1], 1.6);   // side fences

    // ---------------------------------------------------------------- the house
    const HX0 = -4.6, HX1 = 4.6, HZ0 = -8.5, HZ1 = DOOR.z, H1 = 2.9, H2 = 5.8;
    const hw = HX1 - HX0, hd = HZ1 - HZ0;
    box(hw, H2, hd - 0.02, wallM, [(HX0 + HX1) / 2, H2 / 2, (HZ0 + HZ1) / 2 - 0.01], 2.2);
    box(hw + 0.04, 0.12, hd + 0.06, trimM, [0, H1, (HZ0 + HZ1) / 2]);                // floor band
    box(hw + 0.04, 0.3, hd + 0.04, plainWall, [0, 0.15, (HZ0 + HZ1) / 2]);            // base
    // gable roof, ridge along x
    const pitch = 0.42, eave = 0.55, run = hd / 2 + eave, rl = run / Math.cos(pitch);
    for (const s of [-1, 1]) roofBox(hw + 2 * eave, 0.14, rl, [0, H2 + Math.tan(pitch) * run / 2 - 0.02, (HZ0 + HZ1) / 2 + s * run / 2], s * pitch);
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
    // Curtains (blind-1 fix 3): two drawn panels whose pleats each have their own width (0.6–1.5 × 12 cm) and depth
    // (0.45–1.35 × 2.2 cm), lean a little toward the hem and get fuller there. At night the room light behind shows
    // through the cloth: the emissive map is drawn from the same surface (crests bright, valleys dark, some pleats
    // catching more than others), so glow and folds line up.
    const PLEAT = 0.12, FOLD = 0.022;
    const pleats = (pw, seed) => {
      const R = rng(seed), ws = [];
      let tot = 0;
      while (tot < pw) { const w = PLEAT * (0.6 + R() * 0.9); ws.push(w); tot += w; }
      const k = pw / tot, edges = [0];
      ws.forEach((w) => edges.push(edges[edges.length - 1] + w * k));
      const amps = ws.map(() => FOLD * (0.45 + R() * 0.9)), glow = ws.map(() => 0.62 + R() * 0.38);
      const lean = (R() - 0.5) * 0.09, wav = R() * 6.28;
      return (x, fy) => {                       // x: 0…pw across the panel, fy: 0 top → 1 hem
        const xs = Math.min(pw - 1e-6, Math.max(0, x + lean * fy * fy + 0.012 * Math.sin(fy * 2.6 + wav) * fy));
        let i = 0;
        while (i < ws.length - 1 && xs > edges[i + 1]) i++;
        const u = (xs - edges[i]) / (edges[i + 1] - edges[i]);
        const sn = Math.sin(2 * Math.PI * u + 0.35 * Math.sin(2 * Math.PI * u));   // slightly lopsided pleat
        return { z: amps[i] * (1 + 0.35 * fy) * sn, s: (sn + 1) / 2, g: glow[i] };
      };
    };
    let curtainSeed = 1;
    const curtain = (w, h, pos) => {
      for (const side of [-1, 1]) {
        const pw = w / 2 - 0.01, fold = pleats(pw, 300 + curtainSeed++ * 17);
        const geo = new THREE.PlaneGeometry(pw, h, 150, 10);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const fx = (p.getX(i) + pw / 2) / pw, fy = 0.5 - p.getY(i) / h;          // fy: 0 top → 1 hem
          p.setZ(i, fold(fx * pw, fy).z);
          p.setX(i, p.getX(i) + side * 0.012 * fy * (fx - 0.5));                   // hem flares a little
        }
        geo.computeVertexNormals();
        let em = null;
        if (night) {
          const c = document.createElement("canvas");
          c.width = 512; c.height = 64;
          const x = c.getContext("2d"), img = x.createImageData(512, 64);
          for (let j = 0; j < 64; j++) for (let i = 0; i < 512; i++) {
            const r = fold((i + 0.5) / 512 * pw, (j + 0.5) / 64);
            const v = Math.round(255 * Math.min(1, (0.06 + 0.94 * Math.pow(r.s, 2.0)) * r.g * (0.9 + 0.1 * (1 - (j / 64)))));
            const o = (j * 512 + i) * 4;
            img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
          }
          x.putImageData(img, 0, 0);
          em = new THREE.CanvasTexture(c);
          em.colorSpace = THREE.SRGBColorSpace;
        }
        const mat = new THREE.MeshStandardMaterial({ color: night ? CLAY.fabric : "#7d7c79", roughness: 0.95, side: THREE.DoubleSide,
          emissive: night ? "#a9b8cc" : "#000000", emissiveIntensity: night ? 0.21 : 0, emissiveMap: em });
        add(geo, mat, [pos[0] + side * (pw / 2 + 0.005), pos[1], pos[2]], [0, 0, 0], false);
      }
    };
    // glass that reflects: the HDRI sky as env map plus one faint diagonal sheen (two sashes, two strengths)
    const sheen = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, "rgba(255,255,255,0.0)"); g.addColorStop(0.3, "rgba(255,255,255,0.5)"); g.addColorStop(0.42, "rgba(255,255,255,0.12)");
      g.addColorStop(0.55, "rgba(255,255,255,0.32)"); g.addColorStop(0.62, "rgba(255,255,255,0.0)"); g.addColorStop(1, "rgba(255,255,255,0.0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    glassT.envMap = f.envTex; glassT.envMapIntensity = night ? 0.9 : 1.2; glassT.opacity = night ? 0.6 : 0.55;
    const windowAt = (cx, y0, w, h, { awning = false, curtains = false } = {}) => {
      const z = HZ1;
      if (!curtains) {
        box(w + 0.1, 0.06, 0.06, frameM, [cx, y0 + h + 0.03, z + 0.03]);
        box(w + 0.1, 0.06, 0.06, frameM, [cx, y0 - 0.03, z + 0.03]);
        for (const s of [-1, 1]) box(0.06, h + 0.12, 0.06, frameM, [cx + s * (w / 2 + 0.02), y0 + h / 2, z + 0.03]);
        box(0.045, h, 0.05, frameM, [cx, y0 + h / 2, z + 0.02]);   // sash meeting rail
        box(w + 0.24, 0.05, 0.14, trimM, [cx, y0 - 0.08, z + 0.07]);                 // sill
        add(new THREE.PlaneGeometry(w, h), glassM, [cx, y0 + h / 2, z + 0.01], [0, 0, 0], false);
      } else {
        // blind-1 fix 3: a deep aluminium frame (10 cm, out from the wall) holding two sliding sashes at two depths,
        // each with its own frame and glass; curtains behind, clear of the wall face (z - 0.02)
        const F = 0.065, D = 0.13, zc = z - 0.02 + D / 2;
        box(w + 2 * F, F, D, frameM, [cx, y0 + h + F / 2, zc]);
        box(w + 2 * F, F, D, frameM, [cx, y0 - F / 2, zc]);
        for (const s of [-1, 1]) box(F, h, D, frameM, [cx + s * (w / 2 + F / 2), y0 + h / 2, zc]);
        const SF = 0.034, sw = w / 2 + 0.025;
        [[-1, z + 0.07], [1, z + 0.094]].forEach(([s, sz], k) => {
          const ux = cx + s * (w / 2 - sw / 2);
          box(sw, SF, 0.026, frameM, [ux, y0 + h - SF / 2, sz]);
          box(sw, SF * 1.3, 0.026, frameM, [ux, y0 + SF * 0.65, sz]);
          for (const e of [-1, 1]) box(SF, h, 0.026, frameM, [ux + e * (sw / 2 - SF / 2), y0 + h / 2, sz]);
          add(new THREE.PlaneGeometry(sw - 2 * SF, h - 2.3 * SF), glassT, [ux, y0 + h / 2 + SF * 0.15, sz - 0.002], [0, 0, 0], false);
          const sh = add(new THREE.PlaneGeometry(sw - 2 * SF, h - 2.3 * SF), new THREE.MeshBasicMaterial({ map: sheen, transparent: true,
            opacity: k ? 0.12 : 0.06, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), [ux, y0 + h / 2 + SF * 0.15, sz - 0.001], [0, 0, 0], false);
          sh.castShadow = false;
        });
        box(w + 0.3, 0.05, 0.2, trimM, [cx, y0 - F - 0.025, z + 0.08]);                 // sill
        curtain(w * 0.98, h * 0.96, [cx, y0 + h / 2, z + 0.022]);
      }
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
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, DOOR.h, 0.045), wood(DOOR.w, DOOR.h));
    door.add(slab);
    for (const [y, h] of [[0.42, 0.62], [-0.42, 0.62]]) {   // two raised panels, rounded edges so the rims catch light
      const p = new THREE.Mesh(new RoundedBoxGeometry(DOOR.w - 0.26, h, 0.008, 3, 0.0036), wood(DOOR.w - 0.26, h, 0.31 + y, 0.17 - y * 0.6));
      p.position.set(0, y, 0.0215);
      door.add(p);
    }
    door.position.set(DOOR.x, DOOR.h / 2 + 0.15, dz + 0.045);
    door.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    S.add(door);
    // brass knob (≈ a 1980s–2000s Japanese "tamaza" cylinder knob), lathe-turned along the door normal:
    // flat round rosette (Ø62 mm, 7 mm thick, rounded rim) → short cone → thin neck (Ø15 mm) → ball (Ø57 mm) → keyhole boss
    const prof = [[0, 0], [0.031, 0], [0.0316, 0.0012], [0.0318, 0.0035], [0.0312, 0.0058], [0.0295, 0.0069], [0.024, 0.0074],
      [0.016, 0.0082], [0.0112, 0.0105], [0.0086, 0.0145], [0.0076, 0.02], [0.0075, 0.027], [0.0082, 0.0315], [0.011, 0.0352],
      [0.016, 0.0383], [0.0215, 0.0425], [0.0258, 0.049], [0.0283, 0.0565], [0.0288, 0.0635], [0.0275, 0.0715], [0.0242, 0.079],
      [0.0192, 0.0848], [0.0128, 0.0888], [0.0066, 0.0908], [0, 0.0913]].map(([r, y]) => new THREE.Vector2(r, y));
    const brass = new THREE.MeshStandardMaterial({ color: "#c9a05a", metalness: 1, roughness: 0.29, envMapIntensity: 0.85 });
    const knob = new THREE.Group();
    const kz = dz + 0.0675;                               // door face
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), brass);
    body.rotation.x = Math.PI / 2;
    knob.add(body);
    // keyhole: a slightly raised cylinder boss on the ball's nose with a dark slot (and the round top of the slot)
    const bossM = new THREE.MeshStandardMaterial({ color: "#b8924f", metalness: 1, roughness: 0.42, envMapIntensity: 0.85 });
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0066, 0.0022, 40), bossM);
    boss.rotation.x = Math.PI / 2; boss.position.z = 0.0911;
    knob.add(boss);
    const slotM = new THREE.MeshStandardMaterial({ color: "#080604", roughness: 0.7 });
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.0017, 0.0062, 0.0006), slotM);
    slot.position.set(0, -0.0008, 0.0923);
    knob.add(slot);
    const slotTop = new THREE.Mesh(new THREE.CircleGeometry(0.00135, 20), slotM);
    slotTop.position.set(0, 0.0024, 0.09262);
    knob.add(slotTop);
    knob.position.set(KNOB[0], KNOB[1], kz);
    knob.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    S.add(knob);
    // contact darkening where the rosette meets the door, so it sits on the wood and doesn't float
    const ao = contactShadow(0.05, 0.5);
    ao.position.set(KNOB[0], KNOB[1], kz + 0.0004);
    S.add(ao);
    // macro foreground: one soft, out-of-focus leaf-spray shadow across the door to the left of the knob
    if (opts.cut === "macro") {
      const spray = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), blurredSpray({ seed: 11, keep: "#6c7381", blur: 30 }));
      spray.position.set(KNOB[0] - 0.31, KNOB[1] - 0.12, dz + 0.045 + 0.0225 + 0.0095);
      S.add(spray);
    }
    f.hero(door, knob);
    // entrance canopy and step
    box(1.7, 0.08, 0.9, plainWall, [DOOR.x, 2.55, dz + 0.45]);
    if (R3) {
      // blind-2 fix 1: one warm light — the porch lamp is on (late afternoon). A bracket lamp on the wall beside the door
      // (frosted glass box, dark frame: seen from above and from behind the walker) plus a small warm spot on the step.
      const wz = HZ1 - 0.02, lx = DOOR.x + 0.97, lyy = 1.98;
      const frame = new THREE.MeshStandardMaterial({ color: "#232426", roughness: 0.5, metalness: 0.4 });
      const glow = new THREE.MeshStandardMaterial({ color: "#5a4a36", emissive: "#ff9c45", emissiveIntensity: 1.6, roughness: 0.6 });
      add(new THREE.BoxGeometry(0.14, 0.22, 0.03), frame, [lx, lyy, wz + 0.015]);                 // back plate
      const shade = add(new THREE.BoxGeometry(0.12, 0.17, 0.11), glow, [lx, lyy - 0.01, wz + 0.085], [0, 0, 0], false);
      add(new THREE.BoxGeometry(0.15, 0.025, 0.14), frame, [lx, lyy + 0.085, wz + 0.085]);       // cap
      add(new THREE.BoxGeometry(0.13, 0.015, 0.12), frame, [lx, lyy - 0.1, wz + 0.085]);         // base
      f.hero(shade);                                                                         // keeps its amber through the grade
      const pl = new THREE.PointLight("#ffa458", 0.4, 1.5, 2);
      pl.position.set(lx, lyy - 0.02, wz + 0.2);
      S.add(pl);
    }
    box(1.8, 0.16, 0.95, yardM, [DOOR.x, 0.08, dz + 0.475], 1.5);
    // stepping stones to the gate
    for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.27, 0.29, 0.04, 20), f.tiled(yardM, 0.3, 0.3), [DOOR.x - 0.05 + (i % 2 ? 0.07 : -0.05), 0.02, 0.35 + i * 0.62], [0, i, 0]);
    // interphone + meter box, AC unit with a dark fan, nameplate (blank)
    if (!R3) {
      box(0.1, 0.14, 0.04, frameM, [DOOR.x - 0.62, 1.45, dz + 0.02]);
      box(0.3, 0.42, 0.14, new THREE.MeshStandardMaterial({ color: "#9a9b98", roughness: 0.7 }), [-0.6, 1.5, dz + 0.07]);
    } else {
      // blind-2 fix 2: the unreadable white box and black dot become a door-phone and a letter box
      // door-phone beside the door: pale housing, dark camera lens at the top, speaker slots, round call button
      const wz = HZ1 - 0.02;   // the house wall face (its box stops 2 cm short of HZ1)
      const ip = [DOOR.x - 0.6, 1.42, wz];
      const ipM = new THREE.MeshStandardMaterial({ color: "#d2d0ca", roughness: 0.45 });
      const ipDark = new THREE.MeshStandardMaterial({ color: "#121315", roughness: 0.25, metalness: 0.2 });
      add(new RoundedBoxGeometry(0.115, 0.2, 0.034, 3, 0.012), ipM, [ip[0], ip[1], wz + 0.017]);
      add(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 24), ipDark, [ip[0], ip[1] + 0.06, wz + 0.035], [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.05, 0.004, 0.004), ipDark, [ip[0], ip[1] + 0.012 - k * 0.011, wz + 0.0345], [0, 0, 0], false);
      add(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 28), new THREE.MeshStandardMaterial({ color: "#8e8c87", roughness: 0.35 }), [ip[0], ip[1] - 0.058, wz + 0.036], [Math.PI / 2, 0, 0]);
      add(new THREE.CylinderGeometry(0.013, 0.013, 0.006, 28), ipM, [ip[0], ip[1] - 0.058, wz + 0.041], [Math.PI / 2, 0, 0]);
      const ipAo = contactShadow(0.13, 0.62); ipAo.position.set(ip[0], ip[1] - 0.008, wz + 0.0015); S.add(ipAo);
      // wall letter box: dark bronze steel, a hinged lid with its slot, a door seam and a small knob
      const mb = [0.15, 1.02, wz];
      const mbM = new THREE.MeshStandardMaterial({ color: "#5d5a54", roughness: 0.4, metalness: 0.3 });
      const mbSlot = new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.9 });
      add(new RoundedBoxGeometry(0.34, 0.36, 0.11, 3, 0.01), mbM, [mb[0], mb[1], wz + 0.055]);
      const lid = add(new RoundedBoxGeometry(0.36, 0.05, 0.13, 2, 0.008), mbM, [mb[0], mb[1] + 0.2, wz + 0.062]);
      lid.rotation.x = 0.12;
      add(new THREE.BoxGeometry(0.24, 0.012, 0.004), mbSlot, [mb[0], mb[1] + 0.165, wz + 0.1125], [0, 0, 0], false);
      add(new THREE.BoxGeometry(0.3, 0.003, 0.003), mbSlot, [mb[0], mb[1] + 0.1, wz + 0.1115], [0, 0, 0], false);       // door seam
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 12), new THREE.MeshStandardMaterial({ color: "#b8b2a6", metalness: 1, roughness: 0.3 }), [mb[0] + 0.12, mb[1] + 0.03, wz + 0.116], [Math.PI / 2, 0, 0]);
      const mbAo = contactShadow(0.3, 0.55); mbAo.position.set(mb[0], mb[1] - 0.02, wz + 0.0015); S.add(mbAo);
    }
    const acM = new THREE.MeshStandardMaterial({ color: "#c9c8c3", roughness: 0.6 });
    add(new RoundedBoxGeometry(0.82, 0.58, 0.3, 3, 0.02), acM, [3.3, 0.44, dz + 0.17]);
    {   // blind-1 fix 2: a modelled fan behind a wire grille, not a drawn symbol. Fan centre (3.42, 0.45), front z = dz + 0.32
      const fx = 3.42, fy = 0.45, fz = dz + 0.32;
      const darkM = new THREE.MeshStandardMaterial({ color: "#0f1012", roughness: 0.9 });
      const bladeM = new THREE.MeshStandardMaterial({ color: "#6a6c70", roughness: 0.55, side: THREE.DoubleSide });
      const wireM = new THREE.MeshStandardMaterial({ color: "#4c4d4c", roughness: 0.45, metalness: 0.6 });
      // the round opening: a dark shroud tube going into the body, and a dark back
      const shroud = add(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 48, 1, true), new THREE.MeshStandardMaterial({ color: "#1b1c1e", roughness: 0.8, side: THREE.BackSide }), [fx, fy, fz - 0.06], [Math.PI / 2, 0, 0], false);
      add(new THREE.CircleGeometry(0.19, 48), darkM, [fx, fy, fz - 0.115], [0, 0, 0], false);
      // a bezel ring on the face (the grille sits proud of the body)
      add(new THREE.TorusGeometry(0.192, 0.008, 8, 64), acM, [fx, fy, fz + 0.002]);
      // three twisted blades around a hub, set back in the shroud
      const blade = new THREE.Shape();
      blade.moveTo(0.03, -0.02); blade.quadraticCurveTo(0.12, -0.075, 0.175, -0.03);
      blade.quadraticCurveTo(0.18, 0.04, 0.12, 0.065); blade.quadraticCurveTo(0.07, 0.04, 0.03, 0.02);
      const bg = new THREE.ShapeGeometry(blade, 8);
      const bp = bg.attributes.position;
      for (let i = 0; i < bp.count; i++) bp.setZ(i, -0.035 * bp.getY(i) / 0.07 * Math.min(1, bp.getX(i) / 0.1));   // pitch twist
      bg.computeVertexNormals();
      for (let k = 0; k < 3; k++) {
        const m = add(bg.clone(), bladeM, [fx, fy, fz - 0.05], [0, 0, k * 2.094 + 0.3]);
        m.castShadow = false;
      }
      add(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 24), bladeM, [fx, fy, fz - 0.045], [Math.PI / 2, 0, 0]);
      // wire grille: concentric rings + 4 spokes, merged (one draw)
      const wires = [];
      for (let r = 0.028; r < 0.188; r += 0.0175) wires.push(new THREE.TorusGeometry(r, 0.0016, 4, Math.round(24 + r * 220)));
      for (let k = 0; k < 4; k++) {
        const g = new THREE.CylinderGeometry(0.003, 0.003, 0.37, 4);
        g.rotateZ(k * Math.PI / 4 + 0.4);
        wires.push(g);
      }
      wires.push(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20).rotateX(Math.PI / 2));
      const grille = add(mergeGeometries(wires.map((g) => g.index ? g.toNonIndexed() : g)), wireM, [fx, fy, fz + 0.006]);
      grille.castShadow = true;
      shroud.receiveShadow = true;
      // panel seam and side vent slats
      box(0.012, 0.42, 0.01, acM, [3.07, 0.44, dz + 0.322]);
      for (let k = 0; k < 7; k++) box(0.006, 0.012, 0.22, darkM, [3.3 + 0.413, 0.24 + k * 0.055, dz + 0.17]);
    }
    box(0.82, 0.15, 0.3, trimM, [3.3, 0.075, dz + 0.17]);

    // ---------------------------------------------------------------- plants (CC0): small tree in the yard, shrubs in pots
    const loader = new GLTFLoader();
    // the tree (2 M triangles) only where it is on screen: aerial, approach, window. Not in macro/follow (render cost).
    const withTree = opts.tree ?? !["macro", "follow"].includes(opts.cut);
    const tree = withTree ? (await loader.loadAsync(`${CACHE}/models/tree_small_02/tree_small_02.gltf`)).scene : new THREE.Group();
    const tb = new THREE.Box3().setFromObject(tree);
    const tk = withTree ? 4.6 / (tb.max.y - tb.min.y) : 1;
    tree.scale.setScalar(tk);
    tree.position.set(-3.7, withTree ? -tb.min.y * tk : 0, 1.5);
    tree.rotation.y = 0.7;
    tree.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = true;   // its shadow on the wall is the gobo (cheaper, controllable)
      const m = o.material;
      if (m.map) { m.color = new THREE.Color("#6f7a66"); }
      if (m.transparent) { m.transparent = false; m.alphaTest = 0.5; }
    });
    S.add(tree);
    const potM = new THREE.MeshStandardMaterial({ color: "#7c5a46", roughness: 0.85 });
    const bushM = new THREE.MeshStandardMaterial({ color: "#3a4237", roughness: 0.92, flatShading: true });
    const pots = [[2.25, -0.55], [2.6, -0.62], [2.95, -0.55]];
    pots.forEach(([x, z], i) => {
      add(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 20), potM, [x, 0.12, z]);
      add(new THREE.TorusGeometry(0.138, 0.012, 6, 24), potM, [x, 0.235, z], [Math.PI / 2, 0, 0]);   // rim
      const R = rng(41 + i), lumps = [];
      for (let k = 0; k < 4; k++) {
        const r = 0.09 + R() * 0.05;
        const g = new THREE.IcosahedronGeometry(r, 2);
        const p = g.attributes.position;
        for (let j = 0; j < p.count; j++) {   // lumpy: a seeded noise of the direction
          const vx = p.getX(j), vy = p.getY(j), vz = p.getZ(j);
          const n = 1 + 0.16 * Math.sin(vx * 41 + i) * Math.sin(vy * 37 + k) * Math.sin(vz * 43);
          p.setXYZ(j, vx * n, vy * n * 0.9, vz * n);
        }
        const a = k * 1.7 + R(), d = k ? 0.06 + R() * 0.03 : 0;
        g.translate(Math.cos(a) * d, 0.08 + (k ? R() * 0.06 : 0.1), Math.sin(a) * d);
        lumps.push(g.toNonIndexed());
      }
      const bush = add(mergeGeometries(lumps), bushM, [x, 0.2, z]);
      bush.geometry.computeVertexNormals();
    });
    // ---------------------------------------------------------------- utility pole and wires (plain)
    const poleM = new THREE.MeshStandardMaterial({ color: "#8d8b86", roughness: 0.8 });
    const wire = new THREE.MeshStandardMaterial({ color: "#1d1e20", roughness: 0.6 });
    if (!R3) {
      add(new THREE.CylinderGeometry(0.13, 0.17, 10, 16), poleM, [6.2, 5, 3.45]);
      box(1.4, 0.1, 0.1, poleM, [6.2, 8.6, 3.45]);
      for (const [y, dz2] of [[8.65, -0.6], [8.65, 0.6], [7.9, 0]]) add(new THREE.CylinderGeometry(0.008, 0.008, 80, 4), wire, [0, y, 3.45 + dz2 * 0.5], [0, 0, Math.PI / 2], false);
    } else {
      // blind-2 fix 1: a real concrete pole. Hardware from Poly Haven "modular_electricity_poles" (CC0, preset 1:
      // cross-arms, insulators, two pole transformers, fuse cut-outs, step bolts, clamp bands) at 1.5×, on our own
      // tapered spun-concrete shaft (the model's shaft is timber); a number plate and a yellow guard sleeve at the foot.
      const PX = 6.2, PZ = 3.45, K = 1.5;
      const gl = await loader.loadAsync(`${CACHE}/models/modular_electricity_poles/modular_electricity_poles.gltf`);
      const hw = new THREE.Group();
      for (const n of [...gl.scene.children]) {
        if (!n.name.startsWith("preset_01_") || n.name === "preset_01_pole") continue;
        n.position.x += 2.5;
        hw.add(n);
      }
      hw.scale.setScalar(K);
      hw.rotation.y = Math.PI / 2;                     // cross-arms across the street, wires along it
      hw.position.set(PX, 0, PZ);
      hw.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      S.add(hw);
      const pc = await f.material("brushed_concrete", { normalScale: 0.7 });
      pc.color = new THREE.Color("#cfccc5"); pc.roughness = 0.85;
      const H = 6 * K + 0.25;
      add(new THREE.CylinderGeometry(0.1, 0.13, H, 20), f.tiled(pc, 0.4, H / 1.6), [PX, H / 2, PZ]);
      add(new THREE.CylinderGeometry(0.135, 0.135, 1.6, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#c9b26a", roughness: 0.6 }), [PX, 0.8, PZ]);   // guard sleeve
      add(new THREE.BoxGeometry(0.16, 0.3, 0.012), new THREE.MeshStandardMaterial({ color: "#c8c9c6", roughness: 0.5 }), [PX, 2.4, PZ - 0.125], [0, Math.PI, 0]);  // number plate (blank)
      // wires: gentle catenaries along the street (three on the arm tips, two lower service lines, one thick telecom
      // bundle), and one service drop from the pole to our house's eave
      const sag = (a, b, s, n = 24) => new THREE.CatmullRomCurve3(Array.from({ length: n + 1 }, (_, i) => {
        const u = i / n; return new THREE.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - s * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u);
      }));
      const run = (y, z, r, s) => {   // no cast shadow: thin straight wire shadows read as scratches on the walls
        for (const [x0, x1] of [[-36, PX], [PX, 46]]) add(new THREE.TubeGeometry(sag([x0, y, z], [x1, y, z], s), 32, r, 5), wire, [0, 0, 0], [0, 0, 0], false);
      };
      for (const dzw of [-0.82, 0.82]) run(8.72, PZ + dzw, 0.009, 0.9);
      run(6.95, PZ + 0.35, 0.008, 0.7);
      run(5.25, PZ - 0.16, 0.022, 0.45);                       // telecom bundle
      add(new THREE.TubeGeometry(sag([PX, 6.9, PZ - 0.1], [HX1 - 0.35, 5.45, HZ1 + 0.4], 0.35), 24, 0.007, 5), wire, [0, 0, 0], [0, 0, 0], false);
    }

    // ---------------------------------------------------------------- neighbours: clay houses with windows, eaves, pipes
    // Detail parts are merged per material (one draw call each for all five houses).
    const parts = { trim: [], frame: [], glass: [], dark: [], unit: [] };
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
    // a box on a house face: face = { c: centre (x,z), n: outward normal (x,z), w: face width }, u along the face, y up,
    // o out from the face; size [along, up, out]
    const onFace = (list, fc, u, y, o, size, tilt = 0) => {
      const yaw = Math.atan2(fc.n[0], fc.n[1]);
      const g = new THREE.BoxGeometry(...size);
      if (tilt) g.rotateX(tilt);
      Q.setFromAxisAngle(UP, yaw);
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);   // local +x on the face
      M4.compose(new THREE.Vector3(fc.c[0] + tx * u + fc.n[0] * o, y, fc.c[1] + tz * u + fc.n[1] * o), Q, new THREE.Vector3(1, 1, 1));
      list.push(g.applyMatrix4(M4));
    };
    const nbWindow = (fc, u, y0, w, h, awning, k) => {
      onFace(parts.glass, fc, u, y0 + h / 2, 0.012, [w, h, 0.01]);
      for (const sy of [y0 - 0.025, y0 + h + 0.025]) onFace(parts.frame, fc, u, sy, 0.03, [w + 0.1, 0.05, 0.06]);
      for (const sx of [-1, 1]) onFace(parts.frame, fc, u + sx * (w / 2 + 0.025), y0 + h / 2, 0.03, [0.05, h + 0.1, 0.06]);
      onFace(parts.frame, fc, u + (hash(k) - 0.5) * 0.1, y0 + h / 2, 0.025, [0.04, h, 0.05]);           // sash meeting rail
      onFace(parts.trim, fc, u, y0 - 0.08, 0.07, [w + 0.22, 0.05, 0.14]);                                 // sill
      if (awning) {
        onFace(parts.unit, fc, u, y0 + h + 0.3, 0.3, [w + 0.6, 0.03, 0.6], 0.22);
        for (const sx of [-1, 1]) onFace(parts.frame, fc, u + sx * (w / 2 + 0.2), y0 + h + 0.14, 0.2, [0.02, 0.02, 0.5], -0.6);
      }
    };
    const NBW = ["#a9a59d", "#8f9194", "#b6b0a4", "#7f8184", "#a19c92"];
    const nb = (cx, cz, w, d, h, i) => {
      let nwM = f.tiled(wallM, 1, 1); nwM.color = new THREE.Color(NBW[(i - 1) % NBW.length]);
      if (night) nwM.color.multiplyScalar(0.86);
      // blind-2 fix 1: each neighbour its own cladding and roof (exposed concrete / dark panels / warm stucco …)
      const NB3 = [[M3.form, M3.brownRoof], [M3.siding, M3.metalRoof], [M3.beige, roofM], [null, M3.metalRoof], [M3.siding, M3.brownRoof]];
      const [cl, rf] = R3 ? NB3[(i - 1) % NB3.length] : [null, roofM];
      if (cl) nwM = f.tiled(cl, 1, 1);
      if (R3 && !cl) nwM.color = new THREE.Color("#bdb9b0");
      if (R3 && i === 5) nwM.color = new THREE.Color("#7b7e82");
      box(w, h, d, nwM, [cx, h / 2, cz], 2.5);
      const rr = d / 2 + 0.45;
      for (const s of [-1, 1]) roofBox(w + 0.8, 0.12, rr / Math.cos(0.4), [cx, h + Math.tan(0.4) * rr / 2, cz + s * rr / 2], s * 0.4, 2.2, rf);
      // gable triangles closing the roof ends
      const gt = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, Math.tan(0.4) * d / 2)]);
      for (const sx of [-1, 1]) {
        const m = add(new THREE.ShapeGeometry(gt), f.tiled(nwM, d / 2.5, 1), [cx + sx * (w / 2 + 0.002), h, cz], [0, sx * Math.PI / 2, 0]);
        m.material.side = THREE.DoubleSide;
      }
      const faces = [
        { c: [cx, cz + d / 2], n: [0, 1], w }, { c: [cx, cz - d / 2], n: [0, -1], w },
        { c: [cx + w / 2, cz], n: [1, 0], w: d }, { c: [cx - w / 2, cz], n: [-1, 0], w: d },
      ];
      const fl = h * 0.5;                       // first floor line
      faces.forEach((fc, j) => {
        const k = i * 10 + j;
        onFace(parts.trim, fc, 0, fl, 0.03, [fc.w + 0.06, 0.1, 0.06]);                              // floor band
        const n = fc.w > 7.5 ? 3 : 2;
        for (let q = 0; q < n; q++) {
          const u = (q - (n - 1) / 2) * fc.w / n + (hash(k + q) - 0.5) * 0.5;
          if (hash(k * 3 + q) > 0.25) nbWindow(fc, u, 0.9, q % 2 ? 0.9 : 1.6, q % 2 ? 1.0 : 1.15, false, k + q);
          if (hash(k * 7 + q) > 0.2) nbWindow(fc, u + 0.2, fl + 0.75, 1.5, 1.05, hash(k * 5 + q) > 0.5, k + q + 50);
        }
        // eave gutter on the two eave sides, downpipe at one corner, an AC unit on the ground on some faces
        if (j < 2) onFace(parts.trim, fc, 0, h - 0.02, 0.48, [w + 0.8, 0.1, 0.12]);
        const pipe = new THREE.CylinderGeometry(0.04, 0.04, h, 8);
        const pc = fc.n[1] ? [cx + (fc.w / 2 - 0.25) * (j % 2 ? -1 : 1), fc.c[1] + fc.n[1] * 0.08] : [fc.c[0] + fc.n[0] * 0.08, cz + (fc.w / 2 - 0.25)];
        parts.trim.push(pipe.translate(pc[0], h / 2, pc[1]));
        if (hash(k + 0.5) > 0.45) {
          const u = (hash(k + 0.7) - 0.5) * fc.w * 0.6;
          onFace(parts.unit, fc, u, 0.33, 0.17, [0.8, 0.56, 0.3]);
          onFace(parts.dark, fc, u + 0.12, 0.34, 0.325, [0.36, 0.36, 0.01]);
          onFace(parts.trim, fc, u, 0.025, 0.17, [0.8, 0.05, 0.3]);
        }
        if (hash(k + 0.9) > 0.5) onFace(parts.dark, fc, (hash(k + 0.3) - 0.5) * fc.w * 0.7, 1.4, 0.05, [0.3, 0.4, 0.1]);   // meter box
      });
    };
    nb(-12.5, -4.5, 8, 8, 5.6, 1);
    nb(12.8, -5.0, 8.5, 8, 5.9, 2);
    nb(-6.5, 13.6, 8, 7.5, 5.7, 3);
    nb(4.2, 13.8, 9, 8, 6.0, 4);
    nb(15.5, 13.6, 7, 7, 5.4, 5);
    {
      const unitM = new THREE.MeshStandardMaterial({ color: "#bdbcb8", roughness: 0.6 });
      const darkM = new THREE.MeshStandardMaterial({ color: "#3a3b3d", roughness: 0.7 });
      for (const [k, mat] of [["trim", trimM], ["frame", frameM], ["glass", glassM], ["dark", darkM], ["unit", unitM]]) {
        const m = new THREE.Mesh(mergeGeometries(parts[k].map((g) => g.index ? g.toNonIndexed() : g)), mat);
        m.castShadow = k !== "glass"; m.receiveShadow = true;
        S.add(m);
      }
    }
    // fence across the street
    box(60, 1.3, 0.15, blockM, [0, 0.65, 8.7], 1.6);

    // ---------------------------------------------------------------- light: one low sun (moon at night) through leaves
    let sun;
    const plainSun = (o) => { const l = f.sun({ ...o, leaves: false }); l.shadow.radius = 3; return l; };
    if (night) {
      // blind-1 fix 3: the moon comes in steeply from the left, so the awning throws a long diagonal shadow down the
      // wall; leaves in three layers (big out-of-focus blobs, mid sprays, small sharp ones) placed around the window,
      // not stamped evenly over the wall.
      const size = 18.5, target = [-0.5, 3.4, -1];
      sun = plainSun({ azimuth: -42, elevation: 35, target, size });
      leafLayers(f, sun, size, [
        { leaves: { density: 0.9, leaf: 0.62, soft: 0.045, sway: 0.03, seed: 7, res: 1024 },
          regions: [[-3.3, 5.1, -1, 1.35], [1.7, 2.3, -1, 1.25, 0.9]] },
        { leaves: { density: 0.9, leaf: 0.4, soft: 0.02, sway: 0.045, seed: 19, res: 1536 },
          regions: [[-2.6, 2.7, -1, 1.5]] },
        { leaves: { density: 0.8, leaf: 0.22, soft: 0.008, sway: 0.05, seed: 23, res: 2048 },
          regions: [[0.35, 3.05, -1, 0.95, 0.9], [-3.4, 3.7, -1, 0.75]] },
      ]);
      // the window's own faint light spilling on the sill
      const p = new THREE.PointLight("#b8c4d6", 0.6, 3, 2);
      p.position.set(WINDOW2[0], WINDOW2[1], -0.7);
      S.add(p);
    } else if (opts.cut === "aerial") {
      // blind-1 fix 1: one sun over the whole block (no leaf pattern on the far roofs and houses); the leaf shade only
      // where the yard tree's crown actually hangs between the sun and the ground/wall, densest at the crown.
      const so = opts.sun || {};
      const size = so.size ?? 26, target = so.target ?? [0.5, 1.6, -0.5];
      sun = plainSun({ azimuth: -52, elevation: 24, target, size });
      leafLayers(f, sun, size, [
        { leaves: { density: 2.0, leaf: 0.5, sway: opts.sway ?? 0.043, seed: 5, soft: 0.03, res: opts.leafRes ?? 2048, lit: [[DOOR.x + 0.15, 1.2, DOOR.z, 0.55]] },
          regions: [[-3.7, 2.9, 1.5, 3.0], [-3.0, 3.6, 1.0, 2.4], [-1.9, 3.9, 0.7, 2.2, 0.95], [-4.4, 2.2, 1.9, 2.0]] },
      ]);
    } else if (opts.cut === "follow") {
      // blind-1 fix 2: an even canopy of big soft leaves over the wall, plus a second, denser layer where the door,
      // the walker's path and the AC unit are — so she walks as a half silhouette and the door stays in shade, with
      // sun flecks on the wall beside it (like the reference)
      const size = 14, target = [1.2, 1.4, -0.8];
      sun = plainSun({ azimuth: -52, elevation: 24, target, size });
      leafLayers(f, sun, size, [
        // blind-2 fix 2: two sun holes at shoulder height on her path (z ≈ 2.45 at t ≈ 2.2 and 1.6 at t ≈ 3.5), so walking through them
        // her shoulder, back and arm catch the sun for a moment, like the reference — not a full silhouette
        { leaves: { density: 1.35, leaf: 0.48, soft: 0.03, sway: opts.sway ?? 0.043, seed: 5, res: 2048,
          lit: [[0.45, 1.5, DOOR.z, 0.5], [2.6, 1.95, DOOR.z, 0.45], ...(R3 ? [[DOOR.x - 0.16, 1.32, 2.45, 0.17], [DOOR.x - 0.15, 1.2, 1.6, 0.2]] : [])] } },
        { leaves: { density: 1.6, leaf: 0.36, soft: 0.022, sway: opts.sway ?? 0.043, seed: 13, res: 1536 },
          regions: R3 ? [[DOOR.x, 1.1, DOOR.z, 1.0], [DOOR.x, 1.1, 0.55, 0.55, 0.45], [3.3, 0.5, -0.75, 0.6, 1.2]]
            : [[DOOR.x, 1.1, DOOR.z, 1.0], [DOOR.x, 1.1, 0.9, 0.8, 0.6], [DOOR.x, 1.1, 2.2, 0.7, 0.5], [3.3, 0.5, -0.75, 0.6, 1.2]] },
      ]);
    } else {
      // close cuts: a tighter pattern around the entrance (finer leaf edges). The macro uses a 5 m circle so the shadow
      // map is ≈2.4 mm a texel and the knob throws a clear shadow on the door.
      const macro = opts.cut === "macro", follow = opts.cut === "follow";
      // follow (blind-1 fix 2): no sun hole on the door or the walker's path — both stay in leaf shade (half
      // silhouette); bigger, softer leaves on the wall like the reference, sun flecks only beside the door
      const lit = macro ? [[KNOB[0] - 0.03, KNOB[1] + 0.02, KNOB[2] - 0.05, 0.2]]
        : follow ? [[0.45, 1.5, DOOR.z, 0.5], [2.7, 1.9, DOOR.z, 0.42], [DOOR.x - 0.25, 1.3, 1.2, 0.22]]
        : [[DOOR.x + 0.1, 1.15, DOOR.z, 0.46]];
      // macro: a steeper, more frontal sun so the knob's shadow lands on the door just below-right of it (not past the edge)
      sun = f.sun({ azimuth: macro ? -36 : -52, elevation: macro ? 31 : 24, target: macro ? [KNOB[0], KNOB[1] + 0.2, DOOR.z] : [1.2, 1.4, -0.8], size: macro ? 5 : 14,
        leaves: { density: follow ? 1.55 : 1.7, leaf: follow ? 0.46 : 0.34, sway: opts.sway ?? 0.043, seed: 5, soft: macro ? 0.012 : follow ? 0.03 : 0.017, res: opts.leafRes ?? 2048, lit } });
    }
    // Tighten the sun's shadow depth range around the set. leafShadows leaves near = 0.5 m for a light 45 m away, so the
    // shadow depth steps are centimetres and the bias swallows anything small (the knob threw no shadow at all).
    {
      const d = sun.position.distanceTo(sun.target.position), r = opts.cut === "macro" ? 6 : 30;
      sun.shadow.camera.near = d - r; sun.shadow.camera.far = d + r;
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = opts.cut === "macro" ? -0.00008 : -0.0002;
      sun.shadow.normalBias = opts.cut === "macro" ? 0.0008 : 0.003;
    }

    // ---------------------------------------------------------------- walker (follow cut): actors.js schoolgirl
    let walker = null;
    if (cut.walker) {
      const { kind, ...wo } = cut.walker;
      walker = await actor(f, kind, wo);
      if (camera.preset === "followBack" && !camera.from) {
        const a = walker.at(camera.t0 ?? 0).pos, b = walker.at(camera.t1 ?? 5).pos;
        camera = { ...camera, from: [a.x, 0, a.z], to: [b.x, 0, b.z] };
      }
    }

    // ---------------------------------------------------------------- reflections: the knob sees the real door and wall
    // One cube capture from the ball's centre at build time (knob hidden), instead of the sky HDRI.
    if (!night && ["macro", "approach"].includes(opts.cut)) {
      const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
      const cc = new THREE.CubeCamera(0.03, 60, rt);
      cc.position.set(KNOB[0], KNOB[1], kz + 0.064);
      knob.visible = false; ao.visible = false;
      f.frameHooks.forEach((h) => h(0));
      cc.update(f.renderer, S);
      knob.visible = true; ao.visible = true;
      knob.traverse((o) => { if (o.isMesh && o.material.metalness === 1) { o.material.envMap = rt.texture; o.material.needsUpdate = true; } });
    } else {
      knob.traverse((o) => { if (o.isMesh && o.material.metalness === 1) { o.material.envMap = f.envTex; o.material.envMapIntensity = 0.3; } });
    }

    // ---------------------------------------------------------------- aerial: out-of-focus leaves across the top-left
    // blind-2 fix 1: the reference's drone shot looks past a branch close to the lens. Two pre-blurred leaf sprays held
    // in camera space (depth 1 m) that slide slowly up-left as the camera descends — cheap, deterministic depth.
    let fore = null;
    if (R3 && (opts.foreLeaves ?? (opts.cut === "aerial" && !opts.marks))) {
      fore = new THREE.Group();
      const spray = (seed, blur, n, lightShare) => {
        const c = document.createElement("canvas");
        c.width = c.height = 1024;
        const x = c.getContext("2d");
        const R = rng(seed);
        x.filter = `blur(${blur}px)`;
        for (let i = 0; i < n; i++) {
          const a = R() * 6.283, d = Math.pow(R(), 0.7) * 430, px = 512 + Math.cos(a) * d, py = 512 + Math.sin(a) * d;
          const L = 110 + R() * 90, rot = R() * 6.283, lit = R() < lightShare;
          x.fillStyle = lit ? `rgba(${120 + R() * 40 | 0},${130 + R() * 40 | 0},${138 + R() * 40 | 0},1)` : `rgba(${30 + R() * 14 | 0},${35 + R() * 14 | 0},${44 + R() * 16 | 0},1)`;
          x.save(); x.translate(px, py); x.rotate(rot);
          x.beginPath(); x.moveTo(-L / 2, 0); x.quadraticCurveTo(0, -L * 0.36, L / 2, 0); x.quadraticCurveTo(0, L * 0.36, -L / 2, 0);
          x.fill(); x.restore();
        }
        x.filter = "none";
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, fog: false });
      };
      for (const [pos, sz, mat] of [[[-0.5, 0.3, -1], 0.95, spray(61, 14, 150, 0.42)], [[-0.16, 0.42, -1], 0.6, spray(67, 16, 60, 0.3)], [[-0.66, 0.0, -1], 0.5, spray(71, 20, 45, 0.35)]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat);
        m.position.set(...pos); m.renderOrder = 999; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false;
        fore.add(m);
      }
      S.add(fore);
    }

    return (t) => {
      if (walker) walker.pose(t);
      f.shot(camera, t);
      if (fore) {
        fore.position.copy(f.cam.position); fore.quaternion.copy(f.cam.quaternion);
        fore.translateX(-0.035 * t); fore.translateY(0.02 * t);
        fore.updateMatrixWorld(true);
      }
    };
  });
}
