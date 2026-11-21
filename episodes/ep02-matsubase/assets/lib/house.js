// Set A — 1985 Matsubase wooden house kit (film kit). One kit dressed as two houses:
//   A1 victim's house: "victim_room" (morning, 03), "victim_night" (kotatsu heater glow, 06), "victim_exterior_dawn" (08)
//   A2 Miyata-san's house: "miyata_exterior" (overcast day, 12), "miyata_exterior_night" (porch lamp, 16),
//      "miyata_living" (TV, 15), "living_care" (empty room, late light, 49), "workshop" (2F work bench, 18),
//      "bath_furnace" (bath fire-mouth behind the house, 21), "shed_corner" (shed/house corner, 1985-02-14, 36)
// Facts kept (data/facts.md): kotatsu in the living room; 19 mikan in a red net beside it and one eaten mikan's peel on
// the table; the man's house 2-storey with a workshop upstairs; the bath fire-mouth; the corner where the shed (north)
// meets the house. Layouts are a generic 1980s rural Japanese house ("재현"): nothing in the record says how the rooms looked.
// Never here: knives, blood, a body or its place, Miyata-san at the victim's house or at the shed corner (he was in custody).
// opts: { mode, camera: cam_shots keys, people?: 0|4 (victim_night, the drinking party seen from behind),
//         officers?: 0|3 (miyata_living) | 0|2 (shed_corner), tvOn?: bool, cues?: {} }
import { film, THREE, poseSeated, poseArmsDown, settle, turn, setFabric, ease, clamp01 } from "../kit3d/film.js";
import { AMBER, hash, builder, flat, skyDome, clothTexture, crumple, peelBump, netTexture, glowTexture } from "./matsu_kit.js";

const MODES = {
  victim_room: { hdri: "church_meeting_room", env: 0.16, exposure: 0.95 },
  victim_night: { hdri: "blinds", env: 0.035, exposure: 1.0 },
  victim_exterior_dawn: { hdri: "kloofendal_misty_morning_puresky", env: 0.04, exposure: 1.0, fog: ["#0d1420", 0.035] },
  miyata_exterior: { hdri: "kloofendal_misty_morning_puresky", env: 0.75, exposure: 0.8, bg: true, fog: ["#a8adb2", 0.018] },
  miyata_exterior_night: { hdri: "kloofendal_misty_morning_puresky", env: 0.03, exposure: 1.0, fog: ["#0b0f17", 0.03] },
  miyata_living: { hdri: "rural_winter_roadside", env: 0.3, exposure: 0.9 },
  living_care: { hdri: "rural_winter_roadside", env: 0.2, exposure: 0.95 },
  workshop: { hdri: "small_workshop", env: 0.07, exposure: 1.0 },
  bath_furnace: { hdri: "rural_winter_roadside", env: 0.22, exposure: 0.95, fog: ["#3b3a40", 0.02] },
  shed_corner: { hdri: "rural_winter_roadside", env: 0.3, exposure: 0.9, fog: ["#6d7178", 0.02] },
};

const DEFAULT_CAM = {
  victim_room: [{ t: 0, pos: [0.45, 0.62, 2.6], look: [0.2, 0.3, -0.2], fov: 38 }],
  victim_night: [{ t: 0, pos: [0.4, 0.95, 2.7], look: [0, 0.45, -0.2], fov: 36 }],
  victim_exterior_dawn: [{ t: 0, pos: [3.5, 1.5, 9.5], look: [0, 1.6, 0], fov: 38 }],
  miyata_exterior: [{ t: 0, pos: [-5, 1.55, 9], look: [0.5, 2.6, 0], fov: 40 }],
  miyata_exterior_night: [{ t: 0, pos: [-5, 1.55, 9], look: [0.5, 2.6, 0], fov: 40 }],
  miyata_living: [{ t: 0, pos: [-1.6, 1.15, 1.9], look: [0.8, 0.6, -1.0], fov: 42 }],
  living_care: [{ t: 0, pos: [-1.6, 1.15, 1.9], look: [0.8, 0.6, -1.0], fov: 42 }],
  workshop: [{ t: 0, pos: [-1.2, 1.5, 1.4], look: [0.3, 0.9, -1.4], fov: 42 }],
  bath_furnace: [{ t: 0, pos: [2.6, 1.0, 3.2], look: [0, 0.5, 0], fov: 40 }],
  shed_corner: [{ t: 0, pos: [3.2, 1.4, 4.0], look: [0, 0.3, 0], fov: 40 }],
};

export function createHouse(stage, opts) {
  const mode = opts.mode;
  const M = MODES[mode];
  if (!M) throw new Error(`house: unknown mode ${mode}`);
  const cam = opts.camera || DEFAULT_CAM[mode];
  return film(stage, `house-${mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, envBackground: !!M.bg,
    fog: M.fog ? { color: M.fog[0], density: M.fog[1] } : null, shadowSize: 2048,
  }, async (f) => {
    const S = f.scene;
    const B = builder(S);
    const tex = async (id, o = {}) => f.material(id, o);
    const T = {};
    const need = {
      victim_room: ["tatami", "cedar", "plaster", "beige", "panels", "wool", "darkwood"],
      victim_night: ["tatami", "cedar", "plaster", "beige", "panels", "wool", "darkwood"],
    }[mode] || [];
    const ids = { tatami: "tatami_mat", cedar: "japanese_cedar_planks", plaster: "clay_plaster", beige: "beige_wall_001", panels: "wooden_panels", wool: "poly_wool_herringbone", darkwood: "dark_wood", planks: "dark_wooden_planks", roof: "grey_roof_tiles", mud: "brown_mud_rocks_01", concrete: "concrete_wall_008", block: "concrete_block_wall" };
    const topt = { plaster: { normalScale: 0.3 }, beige: { normalScale: 0.4 }, tatami: { normalScale: 0.8 }, mud: { normalScale: 1.2 } };
    await Promise.all(need.map(async (k) => { T[k] = await tex(ids[k], topt[k] || {}); }));
    if (T.wool) setFabric(T.wool.normalMap);

    let update = () => {};
    if (mode === "victim_room" || mode === "victim_night") update = await victimRoom(f, B, T, mode === "victim_night", opts);

    return (t) => {
      update(t);
      f.shot(cam, t);
    };
  });
}

// ---------------------------------------------------------------- shared interior pieces

// Shoji: frame, kumiko lattice and paper. Lies in the plane x = const (alongZ) or z = const.
function shoji(B, { c, w = 0.9, h = 1.78, y0 = 0.03, alongZ = true, paper, wood }) {
  const g = new THREE.Group();
  const bar = (cx, cy, sx, sy, d = 0.03) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? d : sx, sy, alongZ ? sx : d), wood);
    m.position.set(alongZ ? 0 : cx, cy, alongZ ? cx : 0);
    m.castShadow = true;
    g.add(m);
  };
  bar(-w / 2 + 0.02, y0 + h / 2, 0.04, h, 0.035); bar(w / 2 - 0.02, y0 + h / 2, 0.04, h, 0.035);
  bar(0, y0 + 0.02, w, 0.04, 0.035); bar(0, y0 + h - 0.02, w, 0.04, 0.035);
  bar(0, y0 + 0.2, w, 0.025); // kick rail
  for (let i = 1; i < 3; i++) bar(-w / 2 + (w * i) / 3, y0 + h / 2 + 0.1, 0.014, h - 0.2, 0.02);
  for (let j = 1; j < 7; j++) bar(0, y0 + 0.2 + ((h - 0.2) * j) / 7, w, 0.014, 0.02);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.2), paper);
  p.position.set(0, y0 + 0.2 + (h - 0.2) / 2 - 0.02, 0);
  if (alongZ) p.rotation.y = Math.PI / 2;
  p.castShadow = false;
  p.receiveShadow = false;
  g.add(p);
  // lower wooden panel
  const kick = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.012 : w - 0.04, 0.18, alongZ ? w - 0.04 : 0.012), wood);
  kick.position.set(0, y0 + 0.11, 0);
  g.add(kick);
  g.position.set(...c);
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return g;
}

// Fusuma: papered sliding door (beige), dark lacquered edge, round pull. Plane z = const.
function fusuma(S, { x, z, w = 0.9, h = 1.8, face, edge }) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h - 0.04, 0.02), face);
  p.position.y = h / 2;
  g.add(p);
  for (const [sx, sy, px, py] of [[0.025, h, -w / 2 + 0.012, h / 2], [0.025, h, w / 2 - 0.012, h / 2], [w, 0.025, 0, 0.012], [w, 0.025, 0, h - 0.012]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.03), edge);
    e.position.set(px, py, 0);
    g.add(e);
  }
  const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20), flat("#2b2622", 0.4, 0.5));
  pull.rotation.x = Math.PI / 2;
  pull.position.set(w / 2 - 0.1, 0.85, 0.012);
  g.add(pull);
  g.position.set(x, 0, z);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  S.add(g);
  return g;
}

// Kotatsu: square table under a draped futon, top board on it. Returns the top surface height.
function kotatsu(S, B, T, { x = 0, z = 0, futonColor = "#34405e", top = 0.41 } = {}) {
  // Futon: a lathe turned into a rounded square (superellipse), draped from the board edge to the floor.
  const prof = [[0.0, 0.385], [0.42, 0.385], [0.5, 0.375], [0.62, 0.33], [0.74, 0.2], [0.82, 0.07], [0.86, 0.02], [0.9, 0.004], [0.95, 0.0]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(prof, 64);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    const r = Math.hypot(X, Z);
    if (r < 1e-6) continue;
    const a = Math.atan2(Z, X);
    const n = 7;
    const k = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), n) + Math.pow(Math.abs(Math.sin(a)), n), 1 / n);
    // folds in the hanging part
    const fold = Y < 0.33 ? (0.012 + 0.02 * (0.33 - Y)) * Math.sin(a * 22 + hash(Math.round(a * 10)) * 2) : 0;
    const R = r * k + fold;
    p.setXYZ(i, Math.cos(a) * R, Y, Math.sin(a) * R);
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 2);
  const futonMat = T.wool.clone();
  futonMat.color = new THREE.Color(futonColor);
  futonMat.normalScale = new THREE.Vector2(1.5, 1.5);
  const fut = B.put(g, futonMat, [x, 0, z]);
  fut.material.side = THREE.DoubleSide;
  // top board (dark wood, lacquered)
  const boardMat = T.darkwood.clone();
  boardMat.roughness = 0.35;
  boardMat.roughnessMap = null;
  B.slab([x, top - 0.015, z], [0.82, 0.03, 0.82], boardMat, 0.9);
  return { top, futon: fut };
}

// Mikan: 19 in a red net lying on its side, shrink-wrapped net. Returns the group (amber focus).
function mikanNet(S, { pos, rotY = 0, count = 19, bump }) {
  const g = new THREE.Group();
  const r = 0.032;
  const skin = new THREE.MeshStandardMaterial({ color: "#f07d12", roughness: 0.5, bumpMap: bump, bumpScale: 0.6 });
  const balls = [];
  // two layers, deterministic jitter
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) balls.push([(i - 1.5) * 0.064 + (hash(i * 7 + j) - 0.5) * 0.008, r * 0.85, (j - 1) * 0.062 + (hash(i + j * 13) - 0.5) * 0.008]);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) balls.push([(i - 1) * 0.064 + 0.004, r * 0.85 + 0.048, (j - 0.5) * 0.062]);
  balls.push([0.03, r * 0.85 + 0.09, 0.0]);
  const geo = new THREE.SphereGeometry(r, 20, 14);
  geo.scale(1, 0.82, 1);
  for (const [i, b] of balls.slice(0, count).entries()) {
    const m = new THREE.Mesh(geo, skin);
    m.position.set(...b);
    m.rotation.set(hash(i) * 3, hash(i + 3) * 3, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    // stem dot
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 4), flat("#5a5a24", 0.8));
    st.position.set(b[0], b[1] + r * 0.8, b[2]);
    g.add(st);
  }
  // Net: ellipsoid shrink-wrapped onto the union of balls.
  const ng = new THREE.SphereGeometry(1, 48, 32);
  const c = new THREE.Vector3(0.0, 0.05, 0);
  const pp = ng.attributes.position;
  const d = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) {
    d.set(pp.getX(i), pp.getY(i), pp.getZ(i)).normalize();
    let best = -1;
    for (const b of balls.slice(0, count)) {
      // ray c + t d against sphere (b, r*1.0) -> far root
      const oc = new THREE.Vector3(c.x - b[0], c.y - b[1], c.z - b[2]);
      const bb = oc.dot(d), cc = oc.lengthSq() - (r * 1.02) * (r * 1.02);
      const disc = bb * bb - cc;
      if (disc >= 0) best = Math.max(best, -bb + Math.sqrt(disc));
    }
    if (best < 0) best = 0.11; // gaps: stretch across
    best = Math.max(best, 0.035);
    pp.setXYZ(i, c.x + d.x * (best + 0.003), Math.max(0.003, c.y + d.y * (best + 0.003)), c.z + d.z * (best + 0.003));
  }
  ng.computeVertexNormals();
  const nuv = ng.attributes.uv;
  for (let i = 0; i < nuv.count; i++) nuv.setXY(i, nuv.getX(i) * 44, nuv.getY(i) * 22);
  const net = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ map: netTexture("#cc1a1d"), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.6 }));
  net.castShadow = true;
  g.add(net);
  // gathered tail with a clip
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12, 1, true), new THREE.MeshStandardMaterial({ map: netTexture("#cc1a1d"), alphaTest: 0.3, side: THREE.DoubleSide }));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(0.19, 0.045, 0);
  g.add(tail);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.026), flat("#d8c24a", 0.5));
  clip.position.set(0.225, 0.045, 0);
  g.add(clip);
  g.position.set(...pos);
  g.rotation.y = rotY;
  S.add(g);
  return g;
}

// One eaten mikan: the peel opened into five petals, a little pith.
function mikanPeel(S, { pos, rotY = 0 }) {
  const g = new THREE.Group();
  const outer = flat("#ec7a14", 0.55);
  const inner = flat("#f3dfb4", 0.9);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + hash(k) * 0.3;
    const pg = new THREE.SphereGeometry(0.03, 10, 8, 0, 1.0, 0, 1.35);
    const pe = new THREE.Mesh(pg, outer);
    const pi = new THREE.Mesh(pg, inner);
    pi.scale.setScalar(0.94);
    pe.material.side = THREE.FrontSide;
    pi.material.side = THREE.BackSide;
    const h = new THREE.Group();
    h.add(pe, pi);
    // petal opened outward and laid nearly flat
    h.rotation.set(0, 0, 0);
    const holder = new THREE.Group();
    h.rotation.x = 1.15 + hash(k + 5) * 0.25;
    holder.add(h);
    holder.rotation.y = a;
    holder.position.y = 0.004;
    g.add(holder);
  }
  const pith = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), inner);
  pith.position.set(0.005, 0.006, 0.004);
  g.add(pith);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(...pos);
  g.rotation.y = rotY;
  S.add(g);
  return g;
}

function pendantLamp(S, { pos, on = 0 }) {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 6), flat("#1a1a1a"));
  cord.position.y = 0.25;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.24, 0.13, 32, 1, true), flat("#e8dfcc", 0.7, 0, { side: THREE.DoubleSide, emissive: new THREE.Color("#ffcf8a"), emissiveIntensity: 0.25 * on }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: on ? "#fff1d6" : "#cfc8bc" }));
  bulb.position.y = -0.06;
  g.add(cord, shade, bulb);
  g.position.set(...pos);
  S.add(g);
  return g;
}

// ---------------------------------------------------------------- A1: the victim's room
async function victimRoom(f, B, T, night, opts) {
  const S = f.scene;
  const x0 = -1.8, x1 = 1.8, z0 = -1.35, z1 = 1.35, H = 2.4;
  const tatami = T.tatami;
  B.plane([0, 0, 0], 3.6, 2.7, tatami, [-Math.PI / 2, 0, 0], 1.8, { cast: false });
  const plaster = T.plaster;
  const cedar = T.cedar.clone();
  cedar.color = new THREE.Color("#b98f66");
  const cedarDark = T.cedar.clone();
  cedarDark.color = new THREE.Color("#7a5a3e");
  // back wall + left wall plaster
  B.slab([0, H / 2, z0 - 0.04], [3.7, H, 0.08], plaster, 1.4);
  B.slab([x0 - 0.04, H / 2, 0], [0.08, H, 2.8], plaster, 1.4);
  // ceiling
  B.plane([0, H, 0.6], 3.7, 4.2, cedar, [Math.PI / 2, 0, 0], 0.9, { cast: false });
  // posts
  for (const [px, pz] of [[x0, z0], [0, z0], [x1, z0], [x0, z1], [x1, z1], [x0, 0]]) B.slab([px, H / 2, pz], [0.105, H, 0.105], cedar, 1.2);
  // nageshi beam around at 1.8
  B.slab([0, 1.86, z0 + 0.01], [3.6, 0.1, 0.06], cedar, 1.2);
  B.slab([x0 + 0.01, 1.86, 0], [0.06, 0.1, 2.7], cedar, 1.2);
  // baseboards
  B.slab([0, 0.03, z0 + 0.01], [3.6, 0.06, 0.02], cedarDark, 1.0);
  B.slab([x0 + 0.01, 0.03, 0], [0.02, 0.06, 2.7], cedarDark, 1.0);

  // Right wall: three shoji onto the veranda, plaster transom above, rails.
  const outside = night ? new THREE.Color("#2a3a5a") : new THREE.Color("#fff3df");
  const paper = new THREE.MeshStandardMaterial({ color: "#efe9dc", roughness: 0.95, side: THREE.DoubleSide, emissive: outside, emissiveIntensity: night ? 0.12 : 0.85 });
  const shojiWood = flat("#c9a57a", 0.7);
  for (let i = 0; i < 3; i++) S.add(shoji(B, { c: [x1, 0, z0 + 0.45 + i * 0.9 + (i === 1 ? 0 : 0)], alongZ: true, paper, wood: shojiWood }));
  B.slab([x1, 0.015, 0], [0.1, 0.03, 2.7], cedar, 1.0); // sill
  B.slab([x1, 1.84, 0], [0.1, 0.1, 2.7], cedar, 1.0); // kamoi
  B.slab([x1 + 0.04, (1.89 + H) / 2, 0], [0.06, H - 1.89, 2.8], plaster, 1.4);

  // Front wall: fusuma, one slid open (we look in through the gap).
  const face = T.beige.clone();
  face.color = new THREE.Color("#e2d6bd");
  const edge = flat("#2a1f18", 0.35);
  fusuma(S, { x: -1.35, z: z1, face, edge });
  fusuma(S, { x: -0.45, z: z1 + 0.035, face, edge });
  fusuma(S, { x: 1.35, z: z1, face, edge });
  fusuma(S, { x: 1.2, z: z1 + 0.035, face, edge });
  B.slab([0, 1.84, z1], [3.6, 0.1, 0.12], cedar, 1.0);
  B.slab([0, (1.89 + H) / 2, z1], [3.7, H - 1.89, 0.06], plaster, 1.4);
  B.slab([0, 0.015, z1], [3.6, 0.03, 0.12], cedar, 1.0);
  // corridor outside the door (where the camera stands)
  const corr = T.cedar.clone();
  corr.color = new THREE.Color("#8a6a4c");
  corr.roughness = 0.5;
  B.plane([0, 0.0, z1 + 1.06], 3.7, 2.0, corr, [-Math.PI / 2, 0, 0], 1.0, { cast: false, swap: true });

  // Tansu against the left wall, a small tray on it.
  B.slab([x0 + 0.24, 0.55, -0.55], [0.44, 1.1, 0.9], T.panels, 1.0);
  B.slab([x0 + 0.24, 1.11, -0.55], [0.46, 0.025, 0.92], cedarDark, 0.8);

  const k = kotatsu(S, B, T, { x: 0, z: -0.1 });
  const bump = peelBump();
  // Beside the kotatsu: the red net with 19 mikan (fact). On the table: one eaten mikan's peel (fact).
  const net = mikanNet(S, { pos: [0.98, 0, 0.42], rotY: 0.5, bump });
  f.focus(net);
  if (!night) mikanPeel(S, { pos: [0.16, k.top + 0.001, 0.05], rotY: 0.4 });

  // The figures (victim_night, people: 4): the drinking party around the kotatsu, seen from behind/far away only.
  const figs = [];
  if (night && opts.people) {
    const seats = [[0, -0.86, 0], [0.86, -0.1, -Math.PI / 2], [-0.86, -0.1, Math.PI / 2], [0.05, 0.68, Math.PI]];
    for (const [i, [sx, sz, ry]] of seats.slice(0, opts.people).entries()) {
      const fig = await f.figure(i === 1 ? "filmWoman" : "film");
      poseSeated(fig, { style: "seiza", forearms: 0.75, lean: 0.12 });
      fig.root.rotation.y = ry;
      fig.root.position.set(sx, 0, sz);
      settle(fig, 0);
      f.hold(fig);
      figs.push(fig);
    }
  }

  // Lights
  if (night) {
    pendantLamp(S, { pos: [0, 1.9, -0.1], on: 1 });
    const key = f.key({ pos: [0, 1.86, -0.1], target: [0, 0, -0.1], intensity: 9, angle: 1.0, penumbra: 0.9, color: "#ffc985", decay: 2 });
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.2;
    // kotatsu heater: red-orange glow leaking at the futon hem (four sides), no shadows
    for (const [lx, lz] of [[0.95, -0.1], [-0.95, -0.1], [0, 0.85], [0, -1.05]]) {
      const l = new THREE.PointLight("#ff4a14", 0.9, 2.2, 2);
      l.position.set(lx, 0.06, lz);
      S.add(l);
    }
    const heat = new THREE.PointLight("#ff5a1e", 1.4, 3.0, 2);
    heat.position.set(0, 0.25, 0.9);
    S.add(heat);
    // cold moon through the shoji
    const moon = new THREE.DirectionalLight("#6f8ab8", 0.25);
    moon.position.set(6, 3, -1);
    S.add(moon);
    f.amb(0.02, "#405070");
  } else {
    pendantLamp(S, { pos: [0, 1.9, -0.1], on: 0 });
    // morning sun behind the shoji (east): soft lattice shadows across the tatami, catching the mikan net.
    const sun = f.key({ pos: [5.5, 2.6, 1.2], target: [0.2, 0, 0.1], intensity: 160, angle: 0.55, penumbra: 1, color: "#ffe6c4", decay: 2 });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.camera.near = 2;
    const fill = new THREE.DirectionalLight("#cfd8e6", 0.35);
    fill.position.set(2, 3, 4);
    S.add(fill);
    f.amb(0.04, "#b8c0cc");
  }
  return (t) => {
    for (const fig of figs) f.rest(fig);
  };
}
