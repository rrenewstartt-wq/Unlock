// Victim's room (film kit: CC0 Poly Haven tatami / plaster / wood / linen textures, sky HDRI through the one window,
// pull-chain socket + bulb models). Modes (SPEC "3D 세트" room.js):
//   morning → room_morning  winter morning window light (key = window), amber only on the one mikan's worth of peel
//   still   → empty_room    the same room, light gone cool and soft (afternoon), no amber in the set (the label is the amber)
//   night   → rewind_party  1985-01-05 night under the ceiling bulb, kotatsu top EMPTY (no net, no peel, no cups);
//                           cue.dissolve: the first seconds dissolve from the morning state (light + objects fade)
//   dusk    → room_dusk     evening light, net desaturated, amber on one mikan
// Facts kept (data/facts.md F11 F12): a kotatsu; at its south-east corner a red net with 19 mikan; on the kotatsu top the
// leftovers of one mikan. Everything else (room size, tatami, window, lamp, door) is a plain generic Japanese room —
// no distinctive furniture or layout is invented. Net and mikan are desaturated and cool so they never read as amber.
// Coordinates (metres): floor y = 0, room x ∈ [-2.25, 2.25] (east = +x, window wall), z ∈ [-1.8, 1.8] (south = +z),
// ceiling y = 2.4, kotatsu centred at the origin, top surface y = TOP.
import { film, THREE, ease, clamp01 } from "../kit3d/film.js";

const AMBER = "#F0A23B";
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const W = 4.5, D = 3.6, H = 2.4;           // room
const X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
const TOP = 0.42;                           // kotatsu top surface
const WIN = { z0: -0.65, z1: 1.05, y0: 0.78, y1: 1.86 }; // window opening in the east wall
const DOOR = { z0: -1.45, z1: -0.55, y1: 1.82 };          // doorway in the west wall
const NET = [0.2, 0.22];                   // south-east corner of the top (x, z)
const PEEL = [-0.12, 0.15];                 // in the net's shadow, so the amber pool reads

const MODES = {
  morning: { hdri: "winter_orchard", env: 0.16, bg: 0.5, exposure: 0.95, sun: 5.2, sunColor: "#eef1f3",
    fill: 0.9, fillColor: "#cfd8e2", amb: 0.05, bounce: 1, lamp: 0, amberPeel: 1, top: true },
  still: { hdri: "winter_orchard", env: 0.13, bg: 0.32, exposure: 0.95, sun: 0, sunColor: "#dfe6ee",
    fill: 1.5, fillColor: "#b9c6d4", amb: 0.06, bounce: 0.5, lamp: 0, amberPeel: 0, top: true },
  night: { hdri: "winter_orchard", env: 0.012, bg: 0.006, exposure: 1.0, sun: 0, sunColor: "#eef1f3",
    fill: 0, fillColor: "#8ea0b8", amb: 0.015, lamp: 1, amberPeel: 0, top: false },
  dusk: { hdri: "qwantani_dusk_2_puresky", env: 0.1, bg: 0.55, exposure: 0.95, sun: 1.6, sunColor: "#c9b2c4",
    fill: 0.8, fillColor: "#9aa6c4", amb: 0.04, bounce: 0.5, lamp: 0, amberPeel: 0, amberMikan: 1, top: true },
};

// Small deterministic canvas textures: mikan dimples (bump) and the net's diamond mesh (alpha).
function dimpleTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const px = hash(i * 3.1) * 256, py = hash(i * 7.7 + 1) * 256, r = 1 + hash(i * 1.3 + 2) * 2.2;
    x.fillStyle = `rgba(40,40,40,${0.25 + 0.35 * hash(i + 9)})`;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}
function netTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 128, 128);
  x.strokeStyle = "#ffffff"; x.lineWidth = 9;
  x.beginPath();
  x.moveTo(0, 0); x.lineTo(128, 128); x.moveTo(128, 0); x.lineTo(0, 128);
  x.moveTo(-64, 64); x.lineTo(64, 192); x.moveTo(64, -64); x.lineTo(192, 64);
  x.moveTo(64, -64); x.lineTo(-64, 64); x.moveTo(192, 64); x.lineTo(64, 192);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 10);
  return t;
}

export function createRoom(stage, opts) {
  const mode = opts.mode || "morning";
  const M = MODES[mode];
  const cue = opts.cues || {};
  return film(stage, `room-${mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, envBackground: true, background: "#0b0d10",
  }, async (f) => {
    const S = f.scene;
    S.backgroundIntensity = M.bg;

    const [tatami, plaster, wood, cedar, linen] = await Promise.all([
      f.material("tatami_mat", { normalScale: 0.8 }),
      f.material("beige_wall_001", { normalScale: 0.6 }),
      f.material("dark_wood", { normalScale: 0.7 }),
      f.material("japanese_cedar_planks", { normalScale: 0.6 }),
      f.material("rough_linen", { normalScale: 1.1 }),
    ]);
    const mesh = (geo, mat, pos, rot = [0, 0, 0], shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      m.rotation.set(...rot);
      m.castShadow = shadow; m.receiveShadow = true;
      S.add(m);
      return m;
    };
    const slab = (sx, sy, sz, mat, pos) => mesh(new THREE.BoxGeometry(sx, sy, sz), mat, pos);

    // ---------------------------------------------------------------- shell
    // Tatami: the texture is 1.8 m square holding two 0.9 m mats.
    mesh(new THREE.PlaneGeometry(W, D), f.tiled(tatami, W / 1.8, D / 1.8), [0, 0, 0], [-Math.PI / 2, 0, 0], false);
    const ceilMat = f.tiled(cedar, W / 1.13, D / 1.13);
    ceilMat.color = new THREE.Color("#7d7a78");
    mesh(new THREE.BoxGeometry(W + 0.2, 0.06, D + 0.2), ceilMat, [0, H + 0.03, 0]);

    // Plaster walls (beige_wall_001 is a 3 m tile), 10 cm thick; openings for the window (east) and the door (west).
    const wallMat = (w, h) => { const m = f.tiled(plaster, w / 3, h / 3); m.color = new THREE.Color("#d9d2c8"); return m; };
    const wall = (sx, sy, sz, pos) => slab(sx, sy, sz, wallMat(Math.max(sx, sz), sy), pos);
    const T = 0.1;
    wall(W + 2 * T, H, T, [0, H / 2, Z0 - T / 2]);                 // north
    wall(W + 2 * T, H, T, [0, H / 2, Z1 + T / 2]);                 // south
    // east wall around the window
    wall(T, WIN.y0, D, [X1 + T / 2, WIN.y0 / 2, 0]);
    wall(T, H - WIN.y1, D, [X1 + T / 2, (H + WIN.y1) / 2, 0]);
    wall(T, WIN.y1 - WIN.y0, WIN.z0 - Z0, [X1 + T / 2, (WIN.y0 + WIN.y1) / 2, (Z0 + WIN.z0) / 2]);
    wall(T, WIN.y1 - WIN.y0, Z1 - WIN.z1, [X1 + T / 2, (WIN.y0 + WIN.y1) / 2, (Z1 + WIN.z1) / 2]);
    // west wall around the door
    wall(T, H - DOOR.y1, D, [X0 - T / 2, (H + DOOR.y1) / 2, 0]);
    wall(T, DOOR.y1, DOOR.z0 - Z0, [X0 - T / 2, DOOR.y1 / 2, (Z0 + DOOR.z0) / 2]);
    wall(T, DOOR.y1, Z1 - DOOR.z1, [X0 - T / 2, DOOR.y1 / 2, (Z1 + DOOR.z1) / 2]);
    // dark corridor behind the door (plain, unlit)
    const hall = new THREE.MeshStandardMaterial({ color: "#2a2826", roughness: 0.95 });
    slab(1.2, 0.02, 1.4, hall, [X0 - 0.7, 0.0, (DOOR.z0 + DOOR.z1) / 2]);
    slab(0.05, H, 1.6, hall, [X0 - 1.3, H / 2, (DOOR.z0 + DOOR.z1) / 2]);
    slab(1.3, H, 0.05, hall, [X0 - 0.65, H / 2, DOOR.z0 - 0.2]);
    slab(1.3, H, 0.05, hall, [X0 - 0.65, H / 2, DOOR.z1 + 0.2]);
    slab(1.3, 0.05, 1.6, hall, [X0 - 0.65, H, (DOOR.z0 + DOOR.z1) / 2]);

    // Wooden posts at the corners and a plain lintel rail (generic room structure, no alcove or furniture).
    const post = f.tiled(wood, 0.06, 1.2);
    post.color = new THREE.Color("#a08f80");
    for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) slab(0.12, H, 0.12, post, [x + Math.sign(-x) * 0.04, H / 2, z + Math.sign(-z) * 0.04]);
    const rail = f.tiled(wood, 2, 0.05);
    rail.color = new THREE.Color("#a08f80");
    slab(W, 0.07, 0.04, rail, [0, 1.9, Z0 + 0.02]);
    slab(W, 0.07, 0.04, rail, [0, 1.9, Z1 - 0.02]);
    slab(0.04, 0.07, D, rail, [X0 + 0.02, 1.9, 0]);
    // door frame
    slab(0.12, DOOR.y1, 0.06, post, [X0, DOOR.y1 / 2, DOOR.z0 - 0.03]);
    slab(0.12, DOOR.y1, 0.06, post, [X0, DOOR.y1 / 2, DOOR.z1 + 0.03]);
    slab(0.12, 0.06, DOOR.z1 - DOOR.z0 + 0.12, post, [X0, DOOR.y1 + 0.03, (DOOR.z0 + DOOR.z1) / 2]);

    // ---------------------------------------------------------------- window (east): wooden frame, two sashes, glass
    const frame = f.tiled(wood, 0.1, 1);
    frame.color = new THREE.Color("#8a7a6c");
    const wz = (WIN.z0 + WIN.z1) / 2, wy = (WIN.y0 + WIN.y1) / 2, ww = WIN.z1 - WIN.z0, wh = WIN.y1 - WIN.y0;
    slab(0.14, 0.05, ww + 0.1, frame, [X1, WIN.y0 - 0.02, wz]);               // sill
    slab(0.12, 0.05, ww + 0.1, frame, [X1, WIN.y1 + 0.02, wz]);               // head
    slab(0.12, wh, 0.05, frame, [X1, wy, WIN.z0 - 0.02]);
    slab(0.12, wh, 0.05, frame, [X1, wy, WIN.z1 + 0.02]);
    for (const [k, dx] of [[0, -0.02], [1, 0.02]]) {                         // two sliding sashes, slightly offset
      const z0 = WIN.z0 + k * ww / 2 - (k ? 0.02 : 0), z1 = z0 + ww / 2 + 0.02;
      const zc = (z0 + z1) / 2;
      slab(0.035, wh, 0.04, frame, [X1 + dx, wy, z0 + 0.02]);
      slab(0.035, wh, 0.04, frame, [X1 + dx, wy, z1 - 0.02]);
      slab(0.035, 0.03, z1 - z0, frame, [X1 + dx, wy + 0.12, zc]);          // one transom bar per sash
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, wh), new THREE.MeshStandardMaterial({
        color: "#dfe6ea", roughness: 0.06, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }));
      glass.position.set(X1 + dx, wy, zc);
      glass.rotation.y = -Math.PI / 2;
      S.add(glass);
    }

    // ---------------------------------------------------------------- kotatsu: futon draped from under the top + wooden top
    const futGeo = new THREE.PlaneGeometry(2.0, 2.0, 140, 140);
    futGeo.rotateX(-Math.PI / 2);
    const fp = futGeo.attributes.position;
    const IN = 0.4, DROP = 0.4;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), z = fp.getZ(i);
      const d = Math.max(Math.abs(x), Math.abs(z)) + 1e-6;
      const ang = Math.atan2(z, x);
      let h, y;
      if (d <= IN) { h = d; y = TOP - 0.03; }
      else {
        const s = d - IN;
        if (s < DROP) {
          const a = s / DROP;
          h = IN + 0.07 * Math.sin(a * Math.PI / 2) + 0.05 * a * a;
          y = (TOP - 0.03) * (1 - a) + 0.03 * a - 0.03 * Math.sin(a * Math.PI);
        } else {
          h = IN + 0.12 + (s - DROP) * 0.9;
          y = 0.03 * Math.exp(-(s - DROP) * 12) + 0.012;
        }
        // soft folds around the edge, stronger at the corners
        const corner = Math.pow(Math.abs(Math.sin(2 * ang)), 2);
        const fold = 0.018 * Math.sin(ang * 22 + 1.3) + 0.012 * Math.sin(ang * 37) + 0.03 * corner * Math.sin(ang * 9);
        h += fold * clamp01(s / 0.15);
        if (s >= DROP) y += Math.max(0, fold) * 0.6 * Math.exp(-(s - DROP) * 6);
      }
      fp.setXYZ(i, x * h / d, y, z * h / d);
    }
    futGeo.computeVertexNormals();
    const futMat = f.tiled(linen, 7, 7);
    futMat.color = new THREE.Color("#3a3532");
    futMat.side = THREE.DoubleSide;
    mesh(futGeo, futMat, [0, 0, 0]);
    // top: dark wood board with a rounded edge
    const topMat = f.tiled(wood, 0.45, 0.45);
    topMat.color = new THREE.Color("#d4b8a4");
    topMat.roughness = 0.95;
    topMat.envMapIntensity = 0.6;
    f.box({ size: [0.86, 0.032, 0.86], radius: 0.008, material: topMat, pos: [0, TOP - 0.016, 0] });

    // ---------------------------------------------------------------- mikan (desaturated, cool), the red net, the peel
    const dimple = dimpleTexture();
    const mikanMat = new THREE.MeshStandardMaterial({ color: "#b5622a", roughness: 0.48, bumpMap: dimple, bumpScale: 0.6 });
    const mikanGeo = new THREE.SphereGeometry(0.032, 28, 20);
    const onTop = [];   // everything that sits on the kotatsu top (hidden in night mode, faded during the dissolve)
    // The bag lies on its side and the 19 fruit slump inside it. Settled once at build time by a deterministic
    // relaxation (seeded start, gravity, no overlap, kept inside the bag's ellipsoid, resting on the table).
    const inner = new THREE.Group();
    const RX = 0.032, RY = 0.032 * 0.84, BAG = [0.165, 0.12, 0.115];   // fruit radii; bag half-length (x), half-height, half-width (z)
    const P = [];
    for (let i = 0; i < 19; i++) P.push(new THREE.Vector3((hash(i + 1) - 0.5) * 0.26, RY + hash(i + 21) * 0.18, (hash(i + 41) - 0.5) * 0.16));
    for (let it = 0; it < 400; it++) {
      for (const p of P) p.y -= 0.0015;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const dx = P[j].x - P[i].x, dy = (P[j].y - P[i].y) / 0.84, dz = P[j].z - P[i].z;
        const d = Math.hypot(dx, dy, dz) || 1e-6, min = 2 * RX * 0.96;
        if (d < min) {
          const k = (min - d) / d / 2;
          P[i].x -= dx * k; P[i].y -= dy * 0.84 * k; P[i].z -= dz * k;
          P[j].x += dx * k; P[j].y += dy * 0.84 * k; P[j].z += dz * k;
        }
      }
      for (const p of P) {
        const ex = p.x / (BAG[0] - RX), ey = (p.y - BAG[1]) / (BAG[1] - RY), ez = p.z / (BAG[2] - RX);
        const e = Math.hypot(ex, ey, ez);
        if (e > 1) { p.x /= e; p.y = BAG[1] + (p.y - BAG[1]) / e; p.z /= e; }
        if (p.y < RY) p.y = RY;
      }
    }
    const mikans = P.map((p, i) => {
      const m = new THREE.Mesh(mikanGeo, mikanMat);
      const s = 0.95 + 0.08 * hash(i + 40);
      m.scale.set(s, s * 0.84, s);
      m.position.copy(p);
      m.rotation.set((hash(i) - 0.5) * 0.5, hash(i + 5) * 6, (hash(i + 11) - 0.5) * 0.5);
      m.castShadow = m.receiveShadow = true;
      inner.add(m);
      return m;
    });
    // calyx: a small dark stem scar on each fruit
    const calyxGeo = new THREE.CylinderGeometry(0.0045, 0.006, 0.003, 12);
    const calyxMat = new THREE.MeshStandardMaterial({ color: "#3f4030", roughness: 0.8 });
    for (const m of mikans) { const c = new THREE.Mesh(calyxGeo, calyxMat); c.position.y = 0.032; m.add(c); }
    // The net: two families of helical strands (a diamond mesh) around the bag axis (x). Each strand point is found by
    // marching in from outside toward the axis until it touches a mikan (or the table); the radius is then smoothed along
    // the strand, never sinking more than 4 mm into the fruit, so the mesh clings over the fruit and bridges the gaps.
    // Past the last fruit there is nothing to stop the march, so both ends gather onto the axis; one end is tied off.
    const xs = P.map((p) => p.x), yMid = P.reduce((a, p) => a + p.y, 0) / P.length;
    const xA = Math.min(...xs) - RX - 0.012, xB = Math.max(...xs) + RX + 0.012, L = xB - xA;
    const Rn = 0.0342;
    const inFruit = (x, y, z) => P.some((c) => (c.x - x) ** 2 + ((c.y - y) / 0.84) ** 2 + (c.z - z) ** 2 < Rn * Rn);
    const surf = (x, th) => {                  // radius at which a ray from the axis at angle th first meets the heap
      const cy = Math.cos(th), cz = Math.sin(th);
      let r = 0.18;
      while (r > 0.003) {
        const rr = r - 0.0012;
        if (inFruit(x, yMid + cy * rr, cz * rr)) break;
        r = rr;
      }
      return r;
    };
    const netMat = new THREE.MeshStandardMaterial({ color: "#7e211d", roughness: 0.9 });
    const N = 30, NP = 120, TURNS = 0.62;
    const ends = [];
    for (const fam of [1, -1]) for (let k = 0; k < N; k++) {
      const xsP = [], thP = [], rP = [];
      for (let j = 0; j <= NP; j++) {
        const u = j / NP, x = xA + u * L, th = (k / N) * 2 * Math.PI + fam * u * TURNS * 2 * Math.PI;
        xsP.push(x); thP.push(th); rP.push(surf(x, th));
      }
      let sm = rP.slice();
      for (let pass = 0; pass < 2; pass++) sm = sm.map((r, j) => (j === 0 || j === NP) ? r : (sm[j - 1] + 2 * r + sm[j + 1]) / 4);
      const pts = rP.map((r, j) => {
        const rr = Math.max(r, sm[j] - 0.007) + 0.0006;
        const y = Math.max(0.0012, yMid + Math.cos(thP[j]) * rr);
        return new THREE.Vector3(xsP[j], y, Math.sin(thP[j]) * rr);
      });
      ends.push(pts[NP]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), NP * 2, 0.00035, 3, false), netMat);
      tube.castShadow = true;
      inner.add(tube);
    }
    const endMat = netMat;
    const knot = ends.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ends.length);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.006, 0.03, 10), new THREE.MeshStandardMaterial({ color: "#6a3034", roughness: 0.6 }));
    tie.rotation.z = -Math.PI / 2 + 0.3;
    tie.position.set(knot.x + 0.012, Math.max(0.006, knot.y - 0.004), knot.z);
    tie.castShadow = true;
    inner.add(tie);
    const pile = new THREE.Group();
    pile.add(inner);
    pile.position.set(NET[0], TOP, NET[1]);
    pile.rotation.y = 0.64;
    S.add(pile);
    onTop.push(pile);

    // One mikan's worth of peel: three torn pieces of a thick shell (2.5 mm). Orange skin outside; the white pith only on
    // the inner face and the torn rim. Each piece is a jagged patch of the sphere (outer + inner surface + rim walls).
    const peel = new THREE.Group();
    const peelOut = new THREE.MeshStandardMaterial({ color: "#c8692a", roughness: 0.5, bumpMap: dimple, bumpScale: 0.5 });
    const peelIn = new THREE.MeshStandardMaterial({ color: "#ead9b8", roughness: 0.95, side: THREE.DoubleSide });
    const PR = 0.033, PT = 0.0025;
    const shellPiece = (seed, phiW, th0, th1) => {
      const NUu = 22, NVv = 16, pos = [], idxO = [], idxI = [];
      const edge = (x, k) => 0.5 * hash(Math.floor(x * 9) + k) + 0.5 * hash(Math.floor(x * 9) + k + 1) * (x * 9 % 1);
      const P3 = (u, v, r) => {
        const phi = (u - 0.5) * phiW * (1 - 0.28 * edge(v, seed + (u < 0.5 ? 3 : 7)) * Math.abs(2 * u - 1));
        const a = th0 + 0.18 * edge(u, seed + 11), b = th1 - 0.18 * edge(u, seed + 17);
        const th = a + v * (b - a);
        return [-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th)];
      };
      for (const r of [PR, PR - PT]) for (let j = 0; j <= NVv; j++) for (let i = 0; i <= NUu; i++) pos.push(...P3(i / NUu, j / NVv, r));
      const id = (layer, i, j) => layer * (NUu + 1) * (NVv + 1) + j * (NUu + 1) + i;
      for (let j = 0; j < NVv; j++) for (let i = 0; i < NUu; i++) {
        const [a0, b0, c0, d0] = [id(0, i, j), id(0, i + 1, j), id(0, i + 1, j + 1), id(0, i, j + 1)];
        idxO.push(a0, c0, b0, a0, d0, c0);
        const [a1, b1, c1, d1] = [id(1, i, j), id(1, i + 1, j), id(1, i + 1, j + 1), id(1, i, j + 1)];
        idxI.push(a1, b1, c1, a1, c1, d1);
      }
      // rim: walk the boundary and join the two layers
      const ring = [];
      for (let i = 0; i < NUu; i++) ring.push([i, 0]);
      for (let j = 0; j < NVv; j++) ring.push([NUu, j]);
      for (let i = NUu; i > 0; i--) ring.push([i, NVv]);
      for (let j = NVv; j > 0; j--) ring.push([0, j]);
      for (let k = 0; k < ring.length; k++) {
        const [i0, j0] = ring[k], [i1, j1] = ring[(k + 1) % ring.length];
        const o0 = id(0, i0, j0), o1 = id(0, i1, j1), n0 = id(1, i0, j0), n1 = id(1, i1, j1);
        idxI.push(o0, o1, n1, o0, n1, n0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const uv = [];
      for (let l = 0; l < 2; l++) for (let j = 0; j <= NVv; j++) for (let i = 0; i <= NUu; i++) uv.push(i / NUu, j / NVv);
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex([...idxO, ...idxI]);
      g.addGroup(0, idxO.length, 0);
      g.addGroup(idxO.length, idxI.length, 1);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, [peelOut, peelIn]);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    // [seed, phi width, theta range, rotation (Euler XYZ: z rolls the convex side down/up, y yaws), flatten, position (x, z)]
    const PIECES = [
      [1, 2.4, 0.35, 2.55, [0, 0.2, Math.PI * 0.5], 0.62, [0.0, 0.0]],       // the big half, pith up
      [2, 1.5, 0.5, 2.3, [0, 1.9, -Math.PI * 0.5], 0.7, [0.055, -0.035]],    // skin up, a curled dome
      [3, 0.9, 0.9, 2.1, [0.3, 3.6, 0.25], 0.75, [-0.05, 0.045]],            // a small torn strip on its side
    ];
    for (const [seed, w, a, b, rot, flat, [px, pz]] of PIECES) {
      const piece = shellPiece(seed, w, a, b);
      const holder = new THREE.Group();
      piece.rotation.set(...rot);
      holder.add(piece);
      holder.scale.set(1, flat, 1);
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(holder);
      holder.position.set(px, -box.min.y + 0.0004, pz);
      peel.add(holder);
    }
    peel.position.set(PEEL[0], TOP, PEEL[1]);
    peel.rotation.y = 0.3;
    S.add(peel);
    onTop.push(peel);

    // ---------------------------------------------------------------- ceiling lamp: cord, pull-chain socket, bulb, plain shade
    // socket at native size: chain bottom at y = 1.845, socket mouth at 1.96, top at 2.01; the cord runs on to the ceiling
    const cord = mesh(new THREE.CylinderGeometry(0.004, 0.004, H - 2.0, 8), new THREE.MeshStandardMaterial({ color: "#1c1b1a", roughness: 0.6 }), [0, 2.0 + (H - 2.0) / 2, 0]);
    cord.castShadow = false;
    await f.model("pull_chain_light_socket", { pos: [0, 1.845, 0] });
    const bulb = await f.model("lightbulb_01", { pos: [0, 1.962, 0], rot: [Math.PI, 0, 0] });   // hangs down from the socket mouth
    const bulbMats = [];
    bulb.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (o.material.emissive) bulbMats.push(o.material); } });
    const glowMat = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.031, 20, 14), glowMat);
    glow.position.set(0, 1.9, 0);
    S.add(glow);
    const shadeProf = [[0.058, 0.11], [0.075, 0.1], [0.13, 0.07], [0.19, 0.03], [0.225, 0.0], [0.228, -0.006]].map(([r, y]) => new THREE.Vector2(r, y));
    const shadeMat = new THREE.MeshStandardMaterial({ color: "#d8d3c8", roughness: 0.45, side: THREE.DoubleSide, emissive: "#000000" });
    mesh(new THREE.LatheGeometry(shadeProf, 64), shadeMat, [0, 1.85, 0]);

    // ---------------------------------------------------------------- light
    // Key: low winter sun through the east window (hard, shadows of the sashes on the tatami and the kotatsu).
    const sun = new THREE.DirectionalLight(M.sunColor, M.sun);
    sun.position.set(X1 + 6.2, 3.7, 1.6);
    sun.target.position.set(-0.2, 0.2, -0.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.01;
    sun.shadow.radius = 3;
    S.add(sun, sun.target);
    // Window sky fill: a broad soft spot from just outside the window (the rim/separation on the far side of things).
    const fill = new THREE.SpotLight(M.fillColor, 0, 0, 1.1, 1, 1.2);
    fill.position.set(X1 + 0.9, 1.5, wz);
    fill.target.position.set(-1.0, 0.3, wz - 0.2);
    fill.castShadow = true;
    fill.shadow.mapSize.set(1024, 1024);
    fill.shadow.bias = -0.0006;
    fill.shadow.radius = 8;
    S.add(fill, fill.target);
    // Bounce: the sunlit tatami throws a little soft light back onto the kotatsu top from the room side.
    const bounce = new THREE.SpotLight("#dfe2e4", 0, 0, 0.75, 1, 1.5);
    bounce.position.set(-1.3, 0.3, 0.7);   // below the top surface: lights the fruit, never glints on the varnish
    bounce.target.position.set(0.15, 0.55, 0.15);
    S.add(bounce, bounce.target);
    const amb = new THREE.HemisphereLight("#9fb0c4", "#3b342c", M.amb);
    S.add(amb);
    // Amber: one tight warm pool on the peel only.
    const amber = new THREE.SpotLight(AMBER, 0, 3, 0.085, 0.75, 1.6);
    amber.position.set(PEEL[0] - 0.55, TOP + 1.25, PEEL[1] + 0.35);
    amber.target.position.set(PEEL[0], TOP, PEEL[1]);
    S.add(amber, amber.target);
    // Dusk: the same tight amber pool on the top mikan of the net.
    const amberMikan = new THREE.SpotLight(AMBER, 0, 3, 0.05, 0.7, 1.6);
    const topMikan = new THREE.Vector3(NET[0], TOP + 0.18, NET[1]);
    amberMikan.position.set(topMikan.x - 0.5, topMikan.y + 1.2, topMikan.z + 0.3);
    amberMikan.target.position.copy(topMikan);
    S.add(amberMikan, amberMikan.target);
    // Night: the bulb. A downward spot (the shade stops the light going up) + a dim point for the ceiling and walls.
    const lampDown = new THREE.SpotLight("#ffe0bd", 0, 0, 1.15, 0.55, 2);
    lampDown.position.set(0, 1.89, 0);
    lampDown.target.position.set(0, 0, 0);
    lampDown.castShadow = true;
    lampDown.shadow.mapSize.set(2048, 2048);
    lampDown.shadow.bias = -0.0004;
    lampDown.shadow.radius = 4;
    S.add(lampDown, lampDown.target);
    const lampSpill = new THREE.PointLight("#ffdcb4", 0, 0, 2);
    lampSpill.position.set(0, 1.9, 0);
    S.add(lampSpill);

    // Objects on the top: night mode removes them; during the dissolve they fade out.
    const fadeMats = [mikanMat, netMat, endMat, peelOut, peelIn];
    const dissolve = mode === "night" ? (cue.dissolve ?? 0) : 0;
    if (mode === "night") for (const m of fadeMats) m.transparent = true;   // the net keeps its alphaTest cut-out
    const AM = MODES.morning;

    return (t) => {
      // k = 0 → morning look, 1 → this mode's look (only the night dissolve uses k < 1)
      const k = dissolve > 0 ? ease.inOut(clamp01(t / dissolve)) : 1;
      const lerp = (a, b) => a + (b - a) * k;
      const from = dissolve > 0 ? AM : M;
      S.environmentIntensity = lerp(from.env, M.env);
      S.backgroundIntensity = lerp(from.bg, M.bg);
      sun.intensity = lerp(from.sun, M.sun);
      fill.intensity = 40 * lerp(from.fill, M.fill);
      fill.color.set(M.fillColor);
      amb.intensity = lerp(from.amb, M.amb);
      bounce.intensity = 7 * lerp(from.bounce ?? 0, M.bounce ?? 0);
      amber.intensity = 22 * lerp(from.amberPeel, M.amberPeel);
      amberMikan.intensity = 9 * (M.amberMikan || 0);
      const lamp = lerp(from.lamp, M.lamp);
      lampDown.intensity = 26 * lamp;
      lampSpill.intensity = 1.6 * lamp;
      glowMat.opacity = 0.95 * lamp;
      shadeMat.emissive.set("#3a2a18").multiplyScalar(lamp);
      for (const m of bulbMats) m.emissiveIntensity = lamp;
      const show = M.top ? 1 : 1 - k;
      for (const o of onTop) o.visible = show > 0.001;
      if (mode === "night") {
        for (const m of fadeMats) m.opacity = show;
      }
      f.shot(opts.camera, t);
    };
  });
}
