// Set B — 1985 police interrogation room, and set B' — the evidence-viewing desk (1997 / 2012).
// film kit (CC0): Poly Haven HDRI small_workshop / blinds, textures old_linoleum_flooring_01, concrete_block_wall,
// concrete_wall_008, wooden_panels, dark_wood, poly_wool_herringbone; models metal_office_desk, desk_lamp_arm_01,
// cardboard_box_01, clipboard; Quaternius figures. Polygraph, wall clock, chairs, blinds, cabinet and the check
// shirt pieces are built here from kit primitives (no words or logos anywhere: we never invent a document's text).
//
// mode (opts.mode):
//   room_1985          B night: fluorescent tube + amber desk lamp, blinds lit by a street light, subject + two officers
//   silence            B night, subject alone at the desk (Jan 18: about 20 minutes of silence — drive opts.clock)
//   polygraph          B day (Jan 18, 9:10–11:37): home-made polygraph on the desk, cables to the seated subject
//   shirt_pieces       B day, nobody: the four check pieces laid out as a shirt with the left sleeve missing (Feb 6)
//   empty_room         B day, nobody: empty chair (scene 52)
//   evidence_desk_1997 B' one amber lamp, dusty boxes, five check pieces on the desk, three lawyers in shadow
//   five_pieces        B' same, one seated reader only (frame the hands, never the face)
//   evidence_desk_2012 B' fifteen years on: same desk and lamp, binders, a plain petition envelope, one reader
//   last_sleeve        B' nobody, the left-sleeve piece alone under the lamp; opts.fade = [t0, t1] dims the lamp
// opts: camera (cam_shots keys), people (false = nobody), clock { from: "19:30", to: "23:56", start, end } (scene s),
//       mikan (true: one mandarin on a plate on the desk — the Jan 9 detail; off by default, the polygraph day has no
//       record of one on the desk), fade.
// Facts kept (data/facts.md §4–5, §8, §10): no officer gesture toward the subject (no threat), faces never close;
// shirt pieces red/brown/white check, assembled on Feb 6 with the left sleeve missing from the shoulder; five pieces
// make an almost complete shirt. The viewing room itself is not on record → the evidence modes are a generic set.
import { film, THREE, poseSeated, poseArmsDown, settle, turn, setFabric, ease, clamp01 } from "../kit3d/film.js";

const AMBER = "#F0A23B";
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vnoise = (x, s = 0) => { const i = Math.floor(x), u = x - i, k = u * u * (3 - 2 * u); return hash(i + s * 57) * (1 - k) + hash(i + 1 + s * 57) * k; };
const hhmm = (s) => { const [h, m] = String(s).split(":").map(Number); return h + (m || 0) / 60; };

const MODES = {
  room_1985: { room: "B", night: true, people: ["subject", "detective", "clerk"], lamp: true },
  silence: { room: "B", night: true, people: ["subject"], lamp: true },
  polygraph: { room: "B", night: false, people: ["subject", "examiner"], polygraph: true },
  shirt_pieces: { room: "B", night: false, people: [], shirt: "assembled" },
  empty_room: { room: "B", night: false, people: [] },
  evidence_desk_1997: { room: "E", year: 1997, people: ["reader", "standL", "standR"], shirt: "spread" },
  five_pieces: { room: "E", year: 1997, people: ["reader"], shirt: "spread" },
  evidence_desk_2012: { room: "E", year: 2012, people: ["reader"], petition: true },
  last_sleeve: { room: "E", year: 2012, people: [], shirt: "sleeve" },
};

// ---------- shared builders ----------

const steel = (color = "#6d736e", rough = 0.45) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.55 });

// Steel office chair with a vinyl seat; seat top at y = 0.45 (poseSeated + settle puts the pelvis bone at ~0.52).
function chair(f, S, vinyl, { pos = [0, 0, 0], rotY = 0 } = {}) {
  const g = new THREE.Group();
  const frame = steel("#4b4f4c", 0.4);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.42), vinyl);
  seat.position.set(0, 0.425, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.04), vinyl);
  back.position.set(0, 0.78, -0.2);
  back.rotation.x = -0.08;
  g.add(seat, back);
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.41, 8), frame);
    leg.position.set(x, 0.2, z);
    g.add(leg);
  }
  for (const x of [-0.19, 0.19]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.42, 8), frame);
    post.position.set(x, 0.62, -0.205);
    post.rotation.x = -0.08;
    g.add(post);
  }
  return f.add(g, { pos, rot: [0, rotY, 0] });
}

// Round wall clock, tick marks only (no numerals). Returns setTime(hoursDecimal).
function wallClock(S, { pos, rotY = 0, r = 0.16 }) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#e9e5da"; x.fillRect(0, 0, 512, 512);
  const grd = x.createRadialGradient(256, 256, 60, 256, 256, 256);
  grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(90,80,60,0.25)");
  x.fillStyle = grd; x.fillRect(0, 0, 512, 512);
  x.translate(256, 256);
  for (let i = 0; i < 60; i++) {
    x.save(); x.rotate((i / 60) * Math.PI * 2);
    x.fillStyle = "#1d1c1a";
    if (i % 5 === 0) x.fillRect(-7, -236, 14, 46); else x.fillRect(-2.5, -236, 5, 18);
    x.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  face.position.z = 0.03;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.018, r + 0.018, 0.05, 48, 1, true), steel("#2b2a28", 0.35));
  rim.rotation.x = Math.PI / 2; rim.position.z = 0.025;
  const back = new THREE.Mesh(new THREE.CircleGeometry(r + 0.018, 48), steel("#2b2a28", 0.5));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.08 }));
  glass.position.z = 0.046;
  const ink = new THREE.MeshStandardMaterial({ color: "#151413", roughness: 0.5 });
  const hand = (len, w, z) => {
    const p = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.004), ink);
    m.position.y = len / 2 - 0.02;
    p.add(m); p.position.z = z;
    g.add(p);
    return p;
  };
  g.add(back, rim, face, glass);
  const hh = hand(r * 0.55, 0.014, 0.036), mm = hand(r * 0.82, 0.009, 0.04);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 16), ink);
  cap.rotation.x = Math.PI / 2; cap.position.z = 0.044;
  g.add(cap);
  g.position.set(...pos); g.rotation.y = rotY;
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  S.add(g);
  return (h) => {
    mm.rotation.z = -((h % 1) * Math.PI * 2);
    hh.rotation.z = -(((h % 12) / 12) * Math.PI * 2);
  };
}

// The red/brown/white check shirt, cut into five torn pieces (1: right half + right sleeve, 2: left chest, 3/4: lower
// body, 5: left sleeve). Shirt space: x right (viewer), y up = away from the camera when laid on a desk. Each piece is a
// plane over the whole shirt box, alpha-cut to its own region, so pieces can be moved and turned independently.
const SHIRT = { w: 1.34, h: 0.78, cx: 0, cy: -0.04 };
const SIL = [[-0.085, 0.33], [0, 0.275], [0.085, 0.33], [0.25, 0.29], [0.64, 0.0], [0.575, -0.115], [0.255, 0.075], [0.265, -0.42],
  [-0.265, -0.42], [-0.255, 0.075], [-0.575, -0.115], [-0.64, 0.0], [-0.25, 0.29]];
function shirtPieces(f, fabricNormal) {
  const PX = 1100, PY = Math.round(PX * SHIRT.h / SHIRT.w);
  const mask = document.createElement("canvas");
  mask.width = PX; mask.height = PY;
  const mx = mask.getContext("2d");
  const toPx = ([x, y]) => [((x - SHIRT.cx) / SHIRT.w + 0.5) * PX, (0.5 - (y - SHIRT.cy) / SHIRT.h) * PY];
  mx.fillStyle = "#fff";
  mx.beginPath();
  SIL.forEach((p, i) => { const [a, b] = toPx(p); if (i) mx.lineTo(a, b); else mx.moveTo(a, b); });
  mx.closePath(); mx.fill();
  const inside = mx.getImageData(0, 0, PX, PY).data;
  const id = new Int8Array(PX * PY);
  const col = new Uint8ClampedArray(PX * PY * 3);
  const plaid = (u, v) => {
    const fr = (a) => a - Math.floor(a);
    const P = 0.064;
    const red = Math.abs(fr(u / P) - 0.5) < 0.2 ? 1 : 0;
    const brn = Math.abs(fr(v / P) - 0.5) < 0.2 ? 1 : 0;
    const thinR = Math.abs(fr(u / P + 0.5) - 0.5) < 0.035 ? 1 : 0;
    const thinB = Math.abs(fr(v / P + 0.5) - 0.5) < 0.035 ? 1 : 0;
    let r = 226, g = 218, b = 204;   // cream
    const mix = (c, k) => { r += (c[0] - r) * k; g += (c[1] - g) * k; b += (c[2] - b) * k; };
    if (red) mix([150, 40, 34], 0.82);
    if (brn) mix([92, 58, 36], red ? 0.6 : 0.78);
    if (thinR && !brn) mix([170, 70, 56], 0.6);
    if (thinB && !red) mix([120, 84, 58], 0.45);
    return [r, g, b];
  };
  for (let j = 0; j < PY; j++) {
    for (let i = 0; i < PX; i++) {
      const k = j * PX + i;
      if (inside[k * 4 + 3] < 128) { id[k] = 0; continue; }
      const x = (i / PX - 0.5) * SHIRT.w + SHIRT.cx, y = (0.5 - j / PY) * SHIRT.h + SHIRT.cy;
      const nA = 0.012 * (vnoise(y * 38, 1) - 0.5) + 0.006 * (vnoise(y * 140, 2) - 0.5);
      const nB = 0.012 * (vnoise(x * 38, 3) - 0.5) + 0.006 * (vnoise(x * 140, 4) - 0.5);
      const sleeveR = x > 0.255 + 0.6 * nA + (y - 0.18) * 0.02;
      const sleeveL = x < -0.255 - 0.6 * nA;
      let p;
      if (sleeveR) p = 5;
      else if (sleeveL) p = 1;
      else if (y > -0.06 + nB) p = x < 0.012 + nA ? 1 : 2;
      else p = x < 0.06 + nA ? 3 : 4;
      id[k] = p;
      let u = x, v = y;
      if (sleeveR || sleeveL) { const a = sleeveR ? 0.64 : -0.64; u = x * Math.cos(a) - y * Math.sin(a); v = x * Math.sin(a) + y * Math.cos(a); }
      const c = plaid(u, v);
      const grain = 0.9 + 0.1 * hash(k * 0.37) + 0.06 * (vnoise(x * 9 + y * 3, 7) - 0.5);
      col[k * 3] = c[0] * grain; col[k * 3 + 1] = c[1] * grain; col[k * 3 + 2] = c[2] * grain;
    }
  }
  // Collar band and button placket, drawn into the colours of whichever piece holds them.
  const W = 1 / SHIRT.w * PX;
  const darken = (cx, cy, rad, k) => {
    for (let j = Math.max(0, cy - rad); j < Math.min(PY, cy + rad); j++) for (let i = Math.max(0, cx - rad); i < Math.min(PX, cx + rad); i++) {
      if ((i - cx) ** 2 + (j - cy) ** 2 > rad * rad) continue;
      const q = (j * PX + i) * 3; col[q] *= k; col[q + 1] *= k; col[q + 2] *= k;
    }
  };
  for (let s = 0; s < 6; s++) {
    const [bx, by] = toPx([-0.012, 0.22 - s * 0.105]);
    darken(Math.round(bx), Math.round(by), Math.round(0.007 * W), 1.12);
    darken(Math.round(bx), Math.round(by), Math.round(0.0035 * W), 0.8);
  }
  for (let j = 0; j < PY; j++) for (let i = 0; i < PX; i++) {   // collar: a darker band around the neck
    const x = (i / PX - 0.5) * SHIRT.w + SHIRT.cx, y = (0.5 - j / PY) * SHIRT.h + SHIRT.cy;
    const d = Math.hypot(x / 1.4, y - 0.36);
    if (d > 0.07 && d < 0.1 && y > 0.22) { const q = (j * PX + i) * 3; col[q] *= 0.82; col[q + 1] *= 0.82; col[q + 2] *= 0.82; }
  }
  const pieces = [];
  const geo = new THREE.PlaneGeometry(SHIRT.w, SHIRT.h, 90, 52);
  const gp = geo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), y = gp.getY(i);
    gp.setZ(i, 0.0015 + 0.0045 * vnoise(x * 7 + 3, 11) * vnoise(y * 6 + 1, 12) + 0.0015 * vnoise(x * 23, 13));
  }
  geo.computeVertexNormals();
  for (let p = 1; p <= 5; p++) {
    const c = document.createElement("canvas");
    c.width = PX; c.height = PY;
    const x = c.getContext("2d");
    const img = x.createImageData(PX, PY);
    let sx = 0, sy = 0, n = 0;
    for (let j = 1; j < PY - 1; j++) for (let i = 1; i < PX - 1; i++) {
      const k = j * PX + i;
      if (id[k] !== p) continue;
      // torn gap: a pixel next to another piece (or the outside, frayed) stays empty
      if (id[k - 2] !== p && id[k - 2] !== 0) continue;
      if (id[k + 2] !== p && id[k + 2] !== 0) continue;
      if (id[k - 2 * PX] !== p && id[k - 2 * PX] !== 0) continue;
      if (id[k + 2 * PX] !== p && id[k + 2 * PX] !== 0) continue;
      const q = k * 4;
      img.data[q] = col[k * 3]; img.data[q + 1] = col[k * 3 + 1]; img.data[q + 2] = col[k * 3 + 2]; img.data[q + 3] = 255;
      sx += i; sy += j; n++;
    }
    x.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97, alphaTest: 0.5, side: THREE.DoubleSide });
    if (fabricNormal) { m.normalMap = fabricNormal; m.normalScale.set(0.6, 0.6); }
    const mesh = new THREE.Mesh(geo, m);
    const cx = (sx / n / PX - 0.5) * SHIRT.w, cy = (0.5 - sy / n / PY) * SHIRT.h;   // centroid in plane space
    mesh.position.set(-cx, -cy, 0);
    mesh.receiveShadow = true; mesh.castShadow = false;
    const pivot = new THREE.Group();      // lies flat: plane y → world -z
    pivot.add(mesh);
    const holder = new THREE.Group();
    holder.add(pivot);
    pivot.rotation.x = -Math.PI / 2;
    pieces.push({ id: p, holder, pivot, c: [cx, cy] });
  }
  return pieces;
}

// Lay pieces on a surface. layout: "assembled" (Feb 6: pieces 1–4 together, no left sleeve), "spread" (all five, a few
// cm apart and slightly turned), "sleeve" (the left sleeve alone).
function layShirt(S, pieces, layout, { at = [0, 0.75, 0], scale = 1, yaw = 0 } = {}) {
  const root = new THREE.Group();
  root.position.set(...at); root.rotation.y = yaw; root.scale.setScalar(scale);
  S.add(root);
  for (const P of pieces) {
    let dx = 0, dz = 0, rot = 0, show = true;
    const [cx, cy] = P.c;
    if (layout === "assembled") { show = P.id !== 5; dx = cx * 1.02; dz = -cy * 1.02; rot = (hash(P.id) - 0.5) * 0.02; }
    if (layout === "spread") { dx = cx * 1.18 + (P.id === 5 ? 0.06 : 0); dz = -cy * 1.25; rot = (hash(P.id * 3) - 0.5) * 0.16; }
    if (layout === "sleeve") { show = P.id === 5; dx = 0; dz = 0; rot = -0.55; }
    P.holder.visible = show;
    P.holder.position.set(dx, 0.0006 * P.id, dz);
    P.holder.rotation.y = rot;
    root.add(P.holder);
  }
  return root;
}

// Dust film for the top of a box: grey speckle with alpha.
function dustTexture(seed = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  for (let i = 0; i < 2600; i++) {
    const a = hash(i * 1.7 + seed), b = hash(i * 2.3 + seed * 5), s = hash(i * 0.9 + seed * 3);
    x.fillStyle = `rgba(196,188,172,${0.08 + 0.25 * s})`;
    x.fillRect(a * 256, b * 256, 1 + 2 * s, 1 + 2 * s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Paper with illegible grey lines only (no words).
function paper(f, { w = 0.21, h = 0.297, lines = 18, pos, rot = [-Math.PI / 2, 0, 0], age = 0.3 }) {
  const s = f.sheet({ w, h, lines, pos, rot, torn: 0, age, paper: "#e8e2d4" });
  s.castShadow = false;
  return s;
}

// ---------- the set ----------

export function createInterrogation(stage, opts) {
  const M = MODES[opts.mode] || MODES.room_1985;
  const people = opts.people === false ? [] : (Array.isArray(opts.people) ? opts.people : M.people);
  const B = M.room === "B";
  const night = !!M.night;
  return film(stage, `interrogation-${opts.mode}-${stage.id}`, B
    ? { hdri: "small_workshop", envIntensity: night ? 0.12 : 0.28, exposure: night ? 0.95 : 1.0, background: "#0b0d0d", shadowSize: 2048 }
    : { hdri: "blinds", envIntensity: 0.05, exposure: 1.05, background: "#060505", shadowSize: 2048 }, async (f) => {
    const S = f.scene;
    const [lino, block, plaster, wood, panels, fabric] = await Promise.all([
      f.material("old_linoleum_flooring_01", { normalScale: 0.8 }),
      f.material("concrete_block_wall", { normalScale: 0.9 }),
      f.material("concrete_wall_008", { normalScale: 0.6 }),
      f.material("dark_wood"),
      f.material("wooden_panels"),
      f.material("poly_wool_herringbone"),
    ]);
    setFabric(fabric.normalMap);
    const weave = fabric.normalMap.clone();
    weave.repeat.set(26, 15);
    weave.needsUpdate = true;
    const vinyl = new THREE.MeshStandardMaterial({ color: B ? "#33403b" : "#3b302a", roughness: 0.55 });
    const plane = (w, h, mat, pos, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(...pos); m.rotation.set(...rot);
      m.receiveShadow = true;
      S.add(m);
      return m;
    };

    // The desk (same steel desk in B and B'): 1.6 m wide, top at 0.74 m.
    const desk = await f.model("metal_office_desk", { pos: [0, 0, 0], width: 2.0 });
    desk.scale.set(0.8, 0.94, 0.95);
    const TOP = 0.788 * 0.94;
    let deskTop = TOP;

    const figs = {};
    const lights = {};
    let clockSet = null;
    let polyUpdate = null;
    let motes = null;
    let lampFade = null;

    if (B) {
      // ---------- B: the interrogation room, 4.4 × 4.0 × 2.6 m ----------
      const RX = 2.2, RZ = 2.0, H = 2.6;
      plane(2 * RX, 2 * RZ, f.tiled(lino, 2.4, 2.2), [0, 0, 0], [-Math.PI / 2, 0, 0]);
      const upper = f.tiled(block, 2.2, 1.0); upper.color = new THREE.Color("#c3cdc2");
      const lower = f.tiled(block, 2.2, 0.62); lower.color = new THREE.Color("#7a8b80");
      const upperS = f.tiled(block, 2.0, 1.0); upperS.color = upper.color;
      const lowerS = f.tiled(block, 2.0, 0.62); lowerS.color = lower.color;
      const DADO = 1.05;
      // back wall (z = -RZ) and front wall (z = +RZ)
      for (const [z, ry] of [[-RZ, 0], [RZ, Math.PI]]) {
        plane(2 * RX, H - DADO, upper, [0, DADO + (H - DADO) / 2, z], [0, ry, 0]);
        plane(2 * RX, DADO, lower, [0, DADO / 2, z], [0, ry, 0]);
      }
      // left wall (x = -RX), with the door
      plane(2 * RZ, H - DADO, upperS, [-RX, DADO + (H - DADO) / 2, 0], [0, Math.PI / 2, 0]);
      plane(2 * RZ, DADO, lowerS, [-RX, DADO / 2, 0], [0, Math.PI / 2, 0]);
      // right wall (x = +RX) with a window z ∈ [-1.35, 0.35], y ∈ [0.95, 2.15]
      const WZ0 = -1.35, WZ1 = 0.35, WY0 = 0.95, WY1 = 2.15;
      const rw = (z0, z1, y0, y1, mat) => plane(z1 - z0, y1 - y0, f.tiled(mat === "u" ? block : block, (z1 - z0) * 0.55, (y1 - y0) * (mat === "u" ? 0.65 : 0.6)), [RX, (y0 + y1) / 2, (z0 + z1) / 2], [0, -Math.PI / 2, 0]);
      for (const m of [
        rw(-RZ, WZ0, DADO, H, "u"), rw(WZ1, RZ, DADO, H, "u"), rw(WZ0, WZ1, WY1, H, "u"),
        rw(-RZ, WZ0, 0, DADO, "l"), rw(WZ1, RZ, 0, DADO, "l"), rw(WZ0, WZ1, 0, WY0, "l")]) {
        m.material.color = new THREE.Color(m.position.y > DADO - 0.01 && m.position.y - 0 > DADO ? "#c3cdc2" : (m.position.y > DADO ? "#c3cdc2" : "#7a8b80"));
      }
      // dado rail and skirting
      const trim = new THREE.MeshStandardMaterial({ color: "#3e4842", roughness: 0.5, metalness: 0.2 });
      for (const [sx, sz, px, pz] of [[2 * RX, 0.03, 0, -RZ + 0.015], [2 * RX, 0.03, 0, RZ - 0.015], [0.03, 2 * RZ, -RX + 0.015, 0], [0.03, 2 * RZ, RX - 0.015, 0]]) {
        f.box({ size: [sx, 0.035, sz], radius: 0.005, material: trim, pos: [px, DADO, pz] });
        f.box({ size: [sx, 0.09, sz], radius: 0.005, material: trim, pos: [px, 0.045, pz] });
      }
      const ceil = f.tiled(plaster, 2.2, 2.0); ceil.color = new THREE.Color("#d8dcd4");
      plane(2 * RX, 2 * RZ, ceil, [0, H, 0], [Math.PI / 2, 0, 0]);

      // window frame, sill, blinds, the outside
      const frameM = steel("#c7c9c2", 0.5);
      f.box({ size: [0.08, 0.05, WZ1 - WZ0 + 0.12], material: frameM, pos: [RX - 0.03, WY0 - 0.02, (WZ0 + WZ1) / 2] });
      f.box({ size: [0.06, 0.05, WZ1 - WZ0 + 0.1], material: frameM, pos: [RX - 0.01, WY1 + 0.02, (WZ0 + WZ1) / 2] });
      for (const z of [WZ0 - 0.03, (WZ0 + WZ1) / 2, WZ1 + 0.03]) f.box({ size: [0.05, WY1 - WY0, 0.04], material: frameM, pos: [RX + 0.02, (WY0 + WY1) / 2, z] });
      const slatM = new THREE.MeshStandardMaterial({ color: "#d3d5cd", roughness: 0.45, metalness: 0.25, side: THREE.DoubleSide });
      const slatG = new THREE.BoxGeometry(0.05, 0.003, WZ1 - WZ0 - 0.02);
      for (let i = 0, y = WY1 - 0.06; y > WY0 + 0.02; i++, y -= 0.055) {
        const s = new THREE.Mesh(slatG, slatM);
        s.position.set(RX - 0.06, y, (WZ0 + WZ1) / 2);
        s.rotation.z = 0.62;
        s.castShadow = true; s.receiveShadow = true;
        S.add(s);
      }
      f.box({ size: [0.07, 0.06, WZ1 - WZ0], material: slatM, pos: [RX - 0.06, WY1 - 0.01, (WZ0 + WZ1) / 2] });
      const outside = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ color: night ? "#1b2633" : "#dfe8ea" }));
      outside.position.set(RX + 0.5, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2); outside.rotation.y = -Math.PI / 2;
      S.add(outside);

      // door on the left wall
      const doorM = steel("#56605a", 0.55);
      f.box({ size: [0.05, 2.05, 0.92], radius: 0.01, material: doorM, pos: [-RX + 0.02, 1.025, 1.1] });
      f.box({ size: [0.06, 2.12, 0.05], material: trim, pos: [-RX + 0.03, 1.06, 0.62] });
      f.box({ size: [0.06, 2.12, 0.05], material: trim, pos: [-RX + 0.03, 1.06, 1.58] });
      f.box({ size: [0.06, 0.05, 1.0], material: trim, pos: [-RX + 0.03, 2.1, 1.1] });
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), steel("#b9b6ad", 0.3));
      knob.position.set(-RX + 0.08, 1.0, 0.72); S.add(knob);

      // filing cabinet, back-right corner
      const cab = steel("#7c847d", 0.5);
      f.box({ size: [0.47, 1.32, 0.62], radius: 0.01, material: cab, pos: [1.6, 0.66, -RZ + 0.33] });
      for (let i = 0; i < 4; i++) {
        f.box({ size: [0.43, 0.29, 0.01], radius: 0.004, material: steel("#858d86", 0.45), pos: [1.6, 0.17 + i * 0.32, -RZ + 0.645] });
        f.box({ size: [0.12, 0.018, 0.025], radius: 0.005, material: steel("#bdbab2", 0.3), pos: [1.6, 0.24 + i * 0.32, -RZ + 0.66] });
      }

      // clerk's side desk on the left, against the wall
      const topM = f.tiled(wood, 1.0, 0.6);
      f.box({ size: [0.95, 0.035, 0.6], radius: 0.006, material: topM, pos: [-1.82, 0.72, -1.05], rot: [0, Math.PI / 2, 0] });
      for (const [dx, dz] of [[-0.25, -0.42], [0.25, -0.42], [-0.25, 0.42], [0.25, 0.42]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.7, 0.035), steel("#4b4f4c"));
        leg.position.set(-1.82 + dx, 0.35, -1.05 + dz); leg.castShadow = true; S.add(leg);
      }
      paper(f, { pos: [-1.8, 0.74, -1.0], rot: [-Math.PI / 2, 0, 0.1], lines: 16 });

      // fluorescent fixture over the desk
      const housing = steel("#dcdcd6", 0.5);
      f.box({ size: [1.3, 0.07, 0.28], radius: 0.01, material: housing, pos: [0, H - 0.04, -0.05] });
      const tubeM = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#d9f2e6", emissiveIntensity: 2.2 });
      for (const dz of [-0.06, 0.06]) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.2, 12), tubeM);
        tube.rotation.z = Math.PI / 2; tube.position.set(0, H - 0.095, -0.05 + dz); tube.castShadow = false; S.add(tube);
      }
      const flu = new THREE.SpotLight("#cfeadb", night ? 16 : 11, 0, 1.35, 1.0, 2);
      flu.position.set(0, H - 0.12, -0.05); flu.target.position.set(0, 0, -0.05);
      S.add(flu, flu.target);
      lights.flu = flu;
      S.add(new THREE.HemisphereLight("#b5d0c6", "#3a3f3a", night ? 0.18 : 0.35));

      // light through the blinds: the one shadow light. Day: pale overcast sun. Night: a cold street light.
      const sun = f.key({ pos: [RX + 4.6, 3.3, -0.75], target: [-0.2, 0.55, -0.35], intensity: night ? 70 : 260, angle: 0.3, penumbra: 0.35,
        color: night ? "#8fa9cf" : "#eef3f2" });
      sun.shadow.bias = -0.0003; sun.shadow.radius = 2; sun.shadow.camera.near = 2; sun.shadow.camera.far = 12;
      lights.sun = sun;

      clockSet = wallClock(S, { pos: [-0.75, 2.05, -RZ + 0.005] });

      // desk-top props
      await f.model("clipboard", { pos: [0.35, deskTop, 0.22], rot: [0, 0.12, 0], width: 0.33 });
      paper(f, { pos: [-0.12, deskTop + 0.001, 0.18], rot: [-Math.PI / 2, 0, -0.08], lines: 20 });
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 10), new THREE.MeshStandardMaterial({ color: "#1d1f22", roughness: 0.4 }));
      pen.rotation.set(Math.PI / 2, 0, 0.9); pen.position.set(0.02, deskTop + 0.006, 0.2); S.add(pen);

      if (M.lamp) {
        const lamp = await f.model("desk_lamp_arm_01", { pos: [-0.58, deskTop, -0.12], rot: [0, -2.2, 0], height: 0.55 });
        lamp.traverse((o) => { if (o.isMesh && /light/.test(o.material.name)) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(AMBER); o.material.emissiveIntensity = 3; } });
        const head = new THREE.Vector3(0, 0.71, -0.18).multiplyScalar(1).applyMatrix4(lamp.children[0].matrixWorld);
        const ll = new THREE.SpotLight("#ffb257", 3.2, 0, 0.9, 0.8, 2);
        ll.position.copy(head); ll.target.position.set(-0.25, deskTop, 0.05);
        S.add(ll, ll.target);
        const glow = new THREE.PointLight("#ffae55", 0.5, 2.5, 2);
        glow.position.copy(head).add(new THREE.Vector3(0, -0.05, 0)); S.add(glow);
      }

      if (opts.mikan) {
        const plate = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.085, 0.008], [0.095, 0.016]].map(([x, y]) => new THREE.Vector2(x, y)), 40),
          new THREE.MeshStandardMaterial({ color: "#ece9e2", roughness: 0.25 }));
        plate.position.set(-0.42, deskTop, -0.22); S.add(plate);
        const peel = document.createElement("canvas"); peel.width = peel.height = 128;
        const px = peel.getContext("2d"); px.fillStyle = "#e88a1e"; px.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 900; i++) { px.fillStyle = `rgba(150,70,10,${0.15 * hash(i)})`; px.fillRect(hash(i * 3) * 128, hash(i * 7) * 128, 2, 2); }
        const pt = new THREE.CanvasTexture(peel); pt.colorSpace = THREE.SRGBColorSpace;
        const mikan = new THREE.Mesh(new THREE.SphereGeometry(0.036, 32, 20), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.55 }));
        mikan.scale.set(1, 0.8, 1); mikan.position.set(-0.42, deskTop + 0.008 + 0.029, -0.22); S.add(mikan);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 8), new THREE.MeshStandardMaterial({ color: "#3d4a22" }));
        stem.position.set(-0.42, deskTop + 0.066, -0.22); S.add(stem);
      }

      if (M.polygraph) polyUpdate = buildPolygraph(f, S, deskTop);
      if (M.shirt === "assembled") layShirt(S, shirtPieces(f, weave), "assembled", { at: [0, deskTop, -0.02], scale: 0.98 });

      // chairs + people
      chair(f, S, vinyl, { pos: [0, 0, -0.74], rotY: 0 });            // subject's seat, back to the window wall
      chair(f, S, vinyl, { pos: [0, 0, 0.78], rotY: Math.PI });        // across the desk
      if (people.includes("clerk") || !M.polygraph) chair(f, S, vinyl, { pos: [-1.28, 0, -1.05], rotY: -Math.PI / 2 });
      if (M.polygraph) chair(f, S, vinyl, { pos: [0.98, 0, 0.62], rotY: Math.PI + 0.5 });
      const seat = async (kind, pos, rotY, forearms = 0.85) => {
        const fig = await f.figure(kind);
        fig.root.rotation.y = rotY;
        poseSeated(fig, { style: "chair", forearms });
        settle(fig, 0);
        fig.root.position.x = pos[0]; fig.root.position.z = pos[2];
        return fig;
      };
      if (people.includes("subject")) {
        const s = figs.subject = await seat("film", [0, 0, -0.68], 0, M.polygraph ? 0.55 : 0.95);
        turn(s, "neck_01", [1, 0, 0], 0.32);
        turn(s, "spine_02", [1, 0, 0], 0.08);
        f.hold(s);
      }
      if (people.includes("detective")) {
        const d = figs.detective = await seat("onlooker", [0, 0, 0.72], Math.PI, 0.95);
        turn(d, "neck_01", [1, 0, 0], 0.22);
        f.hold(d);
      }
      if (people.includes("clerk")) {
        const c = figs.clerk = await seat("onlooker", [-1.36, 0, -1.05], -Math.PI / 2, 0.95);
        turn(c, "neck_01", [1, 0, 0], 0.38);
        turn(c, "spine_02", [1, 0, 0], 0.12);
        f.hold(c);
      }
      if (people.includes("examiner")) {
        const e = figs.examiner = await seat("onlooker", [0.95, 0, 0.58], Math.PI + 0.5, 0.9);
        turn(e, "neck_01", [1, 0, 0], 0.3);
        f.hold(e);
      }
      if (M.polygraph && figs.subject) polyUpdate.attach(figs.subject);
    } else {
      // ---------- B': the evidence-viewing desk (generic room; the real one is not on record) ----------
      const late = M.year === 2012;
      const floor = f.tiled(lino, 2.5, 2.5); floor.color = new THREE.Color(late ? "#8a8578" : "#77705f");
      plane(6, 6, floor, [0, 0, 0], [-Math.PI / 2, 0, 0]);
      const wall = f.tiled(plaster, 3.0, 1.3); wall.color = new THREE.Color(late ? "#8f8b82" : "#7d776a");
      plane(6, 2.8, wall, [0, 1.4, -2.0], [0, 0, 0]);
      const wallL = f.tiled(plaster, 2.0, 1.3); wallL.color = wall.color;
      plane(4, 2.8, wallL, [-2.6, 1.4, 0], [0, Math.PI / 2, 0]);

      // steel shelving with archive boxes along the back wall
      const shelfM = steel("#5f625d", 0.55);
      const boxSrc = await f.model("cardboard_box_01", { pos: [0, -10, 0], height: 0.3 });
      boxSrc.visible = false;
      const dust = new THREE.MeshStandardMaterial({ map: dustTexture(3), transparent: true, depthWrite: false, roughness: 1 });
      const addBox = (pos, rotY = 0, s = 1, dusty = true) => {
        const b = boxSrc.clone();
        b.visible = true;
        b.position.set(...pos); b.rotation.y = rotY; b.scale.multiplyScalar(s);
        S.add(b);
        if (dusty) {
          const d = new THREE.Mesh(new THREE.PlaneGeometry(0.4 * s, 0.48 * s), dust);
          d.rotation.set(-Math.PI / 2, 0, rotY); d.position.set(pos[0], pos[1] + 0.3 * s + 0.004, pos[2]);
          S.add(d);
        }
        return b;
      };
      for (const x of [-1.9, -0.7, 0.5, 1.7]) {
        for (const y of [0.05, 0.6, 1.15, 1.7]) {
          f.box({ size: [1.15, 0.025, 0.5], radius: 0.004, material: shelfM, pos: [x, y, -1.7] });
          if (y < 1.7) for (let k = 0; k < 2; k++) {
            if (hash(x * 13 + y * 7 + k) < 0.2) continue;
            addBox([x - 0.3 + k * 0.58, y + 0.013, -1.68], (hash(x + y + k) - 0.5) * 0.12, 0.95 + 0.1 * hash(x * y + k));
          }
        }
        for (const dx of [-0.57, 0.57]) for (const dz of [-0.24, 0.24]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.0, 0.03), shelfM);
          p.position.set(x + dx, 1.0, -1.7 + dz); S.add(p);
        }
      }
      // boxes on the floor beside the desk and one on the desk
      addBox([1.25, 0, -0.35], 0.2);
      addBox([1.25, 0.3, -0.3], 0.05, 0.9);
      addBox([-1.3, 0, 0.1], -0.4);
      if (!late) addBox([0.55, deskTop, -0.22], 0.1, 0.85);

      // the lamp: one amber light, the shadow light
      const lamp = await f.model("desk_lamp_arm_01", { pos: [-0.6, deskTop, -0.28], rot: [0, -2.35, 0], height: 0.62 });
      lamp.traverse((o) => { if (o.isMesh && /light/.test(o.material.name)) { o.material = o.material.clone(); o.material.emissive = new THREE.Color("#ffb35c"); o.material.emissiveIntensity = 4; } });
      lamp.updateMatrixWorld(true);
      const head = new THREE.Vector3(0, 0.71, -0.18).applyMatrix4(lamp.children[0].matrixWorld);
      const key = f.key({ pos: [head.x, head.y, head.z], target: [-0.05, deskTop, 0.05], intensity: 5.5, angle: 0.95, penumbra: 0.75, color: "#ffb15e" });
      key.shadow.bias = -0.0004; key.shadow.camera.near = 0.05; key.shadow.camera.far = 6; key.shadow.radius = 3;
      lights.key = key;
      const bounce = new THREE.PointLight("#c9874a", 0.9, 3.5, 2);
      bounce.position.set(0, deskTop + 0.25, 0.1); S.add(bounce);
      lights.bounce = bounce;
      // cold edge from a high window off-frame right: separates the shelves and the standing figures
      const rim = new THREE.SpotLight(late ? "#9fb3c8" : "#7389a6", late ? 14 : 9, 0, 0.6, 0.9, 2);
      rim.position.set(3.2, 2.7, -0.4); rim.target.position.set(-0.6, 0.9, -1.2);
      S.add(rim, rim.target);
      S.add(new THREE.AmbientLight("#8a7a68", late ? 0.12 : 0.07));
      lampFade = (t) => {
        if (!opts.fade) return 1;
        return 1 - 0.7 * ease.sine(clamp01((t - opts.fade[0]) / (opts.fade[1] - opts.fade[0])));
      };

      // papers on the desk; 2012: binders and a plain envelope
      paper(f, { pos: [0.32, deskTop + 0.001, 0.2], rot: [-Math.PI / 2, 0, 0.18], lines: 22, age: 0.5 });
      paper(f, { pos: [0.36, deskTop + 0.002, 0.24], rot: [-Math.PI / 2, 0, 0.05], lines: 18, age: 0.5 });
      await f.model("clipboard", { pos: [-0.25, deskTop, 0.3], rot: [0, -0.3, 0], width: 0.33 });
      if (late) {
        const binderCols = ["#2f3d52", "#4b5a3f", "#5a3b33", "#2f3d52"];
        binderCols.forEach((c, i) => f.box({ size: [0.3, 0.05, 0.26], radius: 0.006, material: new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), pos: [0.5, deskTop + 0.026 + i * 0.052, -0.18], rot: [0, 0.06 * (i % 2 ? 1 : -1), 0] }));
        const env = f.sheet({ w: 0.24, h: 0.332, pos: [-0.02, deskTop + 0.004, 0.02], rot: [-Math.PI / 2, 0, -0.12], paper: "#b88f5d", age: 0.15, torn: 0 });
        env.castShadow = false;
        const flap = f.sheet({ w: 0.24, h: 0.04, pos: [-0.02 - 0.162 * Math.sin(-0.12), deskTop + 0.006, 0.02 - 0.162 * Math.cos(-0.12)], rot: [-Math.PI / 2, 0, -0.12], paper: "#a57f51", age: 0.1, torn: 0 });
        flap.castShadow = false;
        paper(f, { pos: [-0.33, deskTop + 0.003, 0.02], rot: [-Math.PI / 2, 0, 0.1], lines: 24, age: 0.1 });
      }
      if (M.shirt) {
        const lay = M.shirt === "sleeve" ? { at: [-0.05, deskTop + 0.002, 0.02], scale: 1, yaw: 0.25 } : { at: [-0.06, deskTop + 0.002, 0.0], scale: 0.62, yaw: 0 };
        layShirt(S, shirtPieces(f, weave), M.shirt, lay);
      }

      // dust motes in the lamp beam
      const N = 140;
      const mg = new THREE.BufferGeometry();
      mg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      const dot = document.createElement("canvas"); dot.width = dot.height = 32;
      const dx = dot.getContext("2d"); const gr = dx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, "rgba(255,230,190,1)"); gr.addColorStop(1, "rgba(255,230,190,0)"); dx.fillStyle = gr; dx.fillRect(0, 0, 32, 32);
      const pts = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.006, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#ffcf96", opacity: 0.7 }));
      S.add(pts);
      motes = (t) => {
        const a = mg.attributes.position.array;
        for (let i = 0; i < N; i++) {
          const h = (hash(i * 3.1) + t * (0.004 + 0.006 * hash(i * 5.3))) % 1;
          const r = 0.25 * Math.sqrt(hash(i * 1.9)) * (0.4 + h);
          const th = hash(i * 7.7) * Math.PI * 2 + t * 0.05 * (hash(i) - 0.5);
          a[i * 3] = -0.3 + r * Math.cos(th) + 0.02 * Math.sin(t * 0.3 + i);
          a[i * 3 + 1] = head.y - 0.06 - h * (head.y - deskTop - 0.05);
          a[i * 3 + 2] = -0.05 + r * Math.sin(th);
        }
        mg.attributes.position.needsUpdate = true;
        pts.material.opacity = 0.7 * (lampFade ? lampFade(t) : 1);
      };

      chair(f, S, vinyl, { pos: [0, 0, 0.8], rotY: Math.PI });
      if (people.includes("reader")) {
        const r = figs.reader = await f.figure("film");
        r.root.rotation.y = Math.PI;
        poseSeated(r, { style: "chair", forearms: 1.0, lean: 0.12 });
        settle(r, 0);
        r.root.position.z = 0.7;
        turn(r, "neck_01", [1, 0, 0], 0.45);
        f.hold(r);
      }
      const stand = async (kind, pos, rotY) => {
        const s = await f.figure(kind);
        poseArmsDown(s, 0.1);
        s.root.rotation.y = rotY;
        settle(s, 0);
        s.root.position.x = pos[0]; s.root.position.z = pos[2];
        turn(s, "spine_02", [1, 0, 0], 0.16);
        turn(s, "neck_01", [1, 0, 0], 0.4);
        f.hold(s);
        return s;
      };
      if (people.includes("standL")) figs.standL = await stand("onlooker", [-0.95, 0, -0.75], 0.85);
      if (people.includes("standR")) figs.standR = await stand("film", [0.75, 0, -0.85], -0.6);
    }

    const clk = opts.clock ? { a: hhmm(opts.clock.from), b: hhmm(opts.clock.to), s: opts.clock.start ?? 0, e: opts.clock.end ?? 10 } : null;
    const baseClock = night ? 22.25 : 10.4;

    return (t) => {
      for (const k in figs) f.rest(figs[k]);
      const br = Math.sin(t * 1.7);
      if (figs.subject && !M.polygraph) turn(figs.subject, "spine_03", [1, 0, 0], 0.012 * br);
      if (figs.subject && M.polygraph) turn(figs.subject, "neck_01", [1, 0, 0], 0.01 * Math.sin(t * 0.6));
      if (figs.detective) {
        // writing: the right hand moves a little along the page, nothing toward the subject
        turn(figs.detective, "hand_r", [0, 1, 0], 0.12 * Math.sin(t * 3.1) * (0.5 + 0.5 * Math.sin(t * 0.4)));
        turn(figs.detective, "spine_03", [1, 0, 0], 0.01 * Math.sin(t * 1.4 + 1));
      }
      if (figs.clerk) turn(figs.clerk, "hand_r", [0, 1, 0], 0.15 * Math.sin(t * 2.6 + 0.5));
      if (figs.reader) {
        turn(figs.reader, "hand_r", [1, 0, 0], 0.05 * Math.sin(t * 0.8));
        turn(figs.reader, "spine_03", [1, 0, 0], 0.01 * Math.sin(t * 1.5));
      }
      for (const k of ["standL", "standR"]) if (figs[k]) turn(figs[k], "spine_03", [1, 0, 0], 0.01 * Math.sin(t * 1.3 + k.length));
      if (clockSet) {
        const h = clk ? clk.a + (clk.b - clk.a) * clamp01((t - clk.s) / Math.max(0.01, clk.e - clk.s)) : baseClock + t / 3600;
        clockSet(h);
      }
      if (polyUpdate) polyUpdate(t);
      if (motes) motes(t);
      if (lights.key && lampFade) {
        const k = lampFade(t);
        lights.key.intensity = 5.5 * k; lights.bounce.intensity = 0.9 * k;
      }
      f.shot(opts.camera, t);
    };
  });
}

// Home-made polygraph: steel case, a chart paper strip that scrolls, four pens tracing; cables to the seated subject
// (chest band, arm cuff, two finger plates). Built from primitives; no dials with numbers, no labels.
function buildPolygraph(f, S, top) {
  const g = new THREE.Group();
  const caseM = new THREE.MeshStandardMaterial({ color: "#4f5a55", roughness: 0.42, metalness: 0.45 });
  const panelM = new THREE.MeshStandardMaterial({ color: "#2b302e", roughness: 0.5, metalness: 0.3 });
  const base = f.box({ size: [0.52, 0.12, 0.36], radius: 0.012, material: caseM });
  g.add(base); base.position.y = 0.06;
  const deck = f.box({ size: [0.46, 0.012, 0.22], radius: 0.004, material: panelM });
  g.add(deck); deck.position.set(0, 0.126, 0.03);
  // chart strip with grid + traces, scrolled by texture offset
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#efeadc"; x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = "rgba(160,120,110,0.35)"; x.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  for (let j = 0; j <= 256; j += 16) { x.beginPath(); x.moveTo(0, j); x.lineTo(1024, j); x.stroke(); }
  const tr = (row, u) => {
    const s = row * 1.7;
    const k = (2 * Math.PI) / 1024;
    if (row === 0) return 0.6 * Math.sin(u * k * 14) + 0.15 * Math.sin(u * k * 41 + s);             // breathing
    if (row === 1) return 0.35 * Math.sin(u * k * 60) + 0.25 * Math.max(0, Math.sin(u * k * 60 + 0.8)) ** 6;  // pulse
    if (row === 2) return 0.4 * Math.sin(u * k * 3 + s) + 0.25 * Math.sin(u * k * 9 + 2);            // skin response
    return 0.25 * Math.sin(u * k * 20 + s) + 0.1 * Math.sin(u * k * 70);
  };
  x.strokeStyle = "#2b2a3a"; x.lineWidth = 2.2;
  for (let r = 0; r < 4; r++) {
    x.beginPath();
    for (let u = 0; u <= 1024; u += 2) { const y = 36 + r * 60 + 20 * tr(r, u); if (u) x.lineTo(u, y); else x.moveTo(u, y); }
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(0.4, 1);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.15), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.1335, 0.03);
  g.add(strip);
  for (const sx of [-0.2, 0.2]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 20), new THREE.MeshStandardMaterial({ color: "#e9e3d3", roughness: 0.8 }));
    roll.rotation.x = Math.PI / 2; roll.position.set(sx, 0.15, 0.03); g.add(roll);
  }
  // pen arms pivoting from the back of the deck
  const penM = new THREE.MeshStandardMaterial({ color: "#a9aba6", roughness: 0.3, metalness: 0.7 });
  const pens = [];
  for (let r = 0; r < 4; r++) {
    const piv = new THREE.Group();
    piv.position.set(0.02, 0.15, -0.09);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.1 + r * 0.008), penM);
    arm.position.z = (0.1 + r * 0.008) / 2;
    piv.add(arm);
    piv.position.x = 0.02 + (r - 1.5) * 0.004;
    piv.position.y = 0.142 + r * 0.004;
    g.add(piv);
    pens.push(piv);
  }
  // front panel knobs and an amber pilot lamp
  for (let i = 0; i < 6; i++) {
    const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.016, 20), panelM);
    kb.rotation.x = Math.PI / 2; kb.position.set(-0.19 + i * 0.065, 0.06, 0.185); g.add(kb);
  }
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), new THREE.MeshStandardMaterial({ color: "#000", emissive: AMBER, emissiveIntensity: 3 }));
  pilot.position.set(0.215, 0.09, 0.181); g.add(pilot);
  // instrument faces the examiner (+z side of the desk), right of centre
  g.position.set(0.32, top, 0.12);
  g.rotation.y = Math.PI + 0.35;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  S.add(g);

  const cableM = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.6 });
  const strapM = new THREE.MeshStandardMaterial({ color: "#26282b", roughness: 0.7 });
  const update = (t) => {
    tex.offset.x = (t * 0.06) % 1;
    pens.forEach((p, r) => {
      const u = ((t * 0.06 + 0.2) % 1) * 1024;
      p.rotation.y = 0.18 * tr(r, u);
    });
  };
  update.attach = (fig) => {
    fig.root.updateMatrixWorld(true);
    const P = (n) => fig.bone(n).getWorldPosition(new THREE.Vector3());
    const chest = P("spine_03");
    // chest band (pneumograph)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.035, 40, 1, true), strapM);
    band.scale.set(0.175, 1, 0.13);
    band.position.set(chest.x, chest.y - 0.02, chest.z + 0.035);
    band.material.side = THREE.DoubleSide;
    S.add(band);
    // arm cuff on the left upper arm
    const ua = P("upperarm_l"), la = P("lowerarm_l");
    const mid = ua.clone().lerp(la, 0.55);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.11, 24, 1, true), strapM);
    cuff.material = strapM.clone(); cuff.material.side = THREE.DoubleSide;
    cuff.position.copy(mid);
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), la.clone().sub(ua).normalize());
    S.add(cuff);
    // finger plates on the right hand
    const hr = P("hand_r");
    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: "#8b8f8c", metalness: 0.6, roughness: 0.35 }));
    fp.position.copy(hr).add(new THREE.Vector3(0, 0.0, 0.07));
    S.add(fp);
    // cables: from the attachments, down over the desk edge, to the back of the case
    const back = new THREE.Vector3(0, 0.07, -0.19).applyMatrix4(g.matrixWorld);
    const ends = [band.position.clone().add(new THREE.Vector3(0.12, 0, 0.1)), mid, fp.position.clone()];
    ends.forEach((e, i) => {
      const m1 = e.clone().lerp(back, 0.35); m1.y = top + 0.01 + 0.01 * i;
      const m2 = e.clone().lerp(back, 0.75); m2.y = top + 0.008;
      const curve = new THREE.CatmullRomCurve3([e, new THREE.Vector3(e.x + 0.02, Math.max(top + 0.03, e.y - 0.08), e.z + 0.08), m1, m2, back.clone().add(new THREE.Vector3((i - 1) * 0.03, 0, 0))]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.0035, 6, false), cableM);
      tube.castShadow = true;
      S.add(tube);
    });
  };
  return update;
}
