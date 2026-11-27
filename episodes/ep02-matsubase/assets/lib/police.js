// 1985 interrogation room (film kit: CC0 Poly Haven linoleum / painted plaster / concrete textures, an indoor HDRI for
// reflections, metal_office_desk, desk_lamp_arm_01, clipboard, office_notepads, mounted_fluorescent_lights;
// one realistic faceless figure seated with his back or side to the camera). SPEC "3D 세트" police.js.
// Modes:
//   interrogation → interrogation  daytime: both fluorescent rows on, frosted window bright, amber = the desk stand
//   polygraph     → polygraph     daytime as interrogation; the polygraph on a side table in the south-west corner
//                                  (behind the man, so the cuts that show him never show it), amber = a warm lamp on the pens
//   again         → polygraph_again  the same, the machine off (paper and pens still), amber = the paper roll end
//   insert_mikan  → mikan_table   desk inserts in diffuse daylight (no tubes, stand off), the man hidden; amber = ONE mikan,
//                                  only from c4 to c5 (cues.mikan), then its empty place
//   night         → arrest_wish    night: ONE fluorescent row on (the east row, cold and narrow), window dark,
//                                  amber = the desk stand. Full back-light silhouettes against the washed east wall.
// The room's look is not in the records: a plain generic room (painted lower wall, plaster, linoleum, one frosted window,
// one door). No wall clock (SPEC), no second person (the officer's chair stays empty), no signage or text.
// Coordinates (metres): floor y = 0, x ∈ [-2.8, 2.8] (east = +x), z ∈ [-2.2, 3.0] (south = +z, camera side), ceiling 2.6.
// Desk centred at (0, 0, -0.6), its drawers toward the officer's side (north). The man sits south of it at z ≈ 0.28,
// facing north (-z). The officer's chair (empty) is at z ≈ -1.45.
//
// opts: { mode, camera: cam_shots keys, cues: { empty: [t0, t1], mikan: [t0, t1] } }  — `empty` hides the man (the empty chair shot).
import { film, THREE, poseSeated, settle, turn, setFabric } from "../kit3d/film.js";
import { dress } from "./dress.js";
import { RoundedBoxGeometry } from "../kit3d/addons/geometries/RoundedBoxGeometry.js";

const AMBER = "#F0A23B";
const X0 = -2.8, X1 = 3.1, Z0 = -2.2, Z1 = 3.0, H = 2.6;
const DESK = [0, -0.6];
const SEAT_Z = 0.12;
const CHAIR_FACE = 0;                                            // model yaw that makes a chair face +z

const WIN = { x0: -1.0, x1: 0.9, y0: 1.05, y1: 2.05 };          // frosted window in the north wall
const DOOR = { z0: 1.6, z1: 2.5, y1: 2.0 };                     // door in the east wall

const MODES = {
  interrogation: { hdri: "blinds", env: 0.12, exposure: 1.0, rows: [1, 1], tube: 1.0, winGlow: "#7f888b", winLight: 2.4,
    amb: 0.04, lamp: 1, fill: 0.32 },
  night: { hdri: "blinds", env: 0.01, exposure: 1.0, rows: [1, 0], tube: 1.0, winGlow: "#10161f", winLight: 0,
    amb: 0.006, lamp: 1, fill: 0 },
  // same daytime fluorescent room; the polygraph stands on a side table in the south-west corner (behind the man)
  polygraph: { hdri: "blinds", env: 0.12, exposure: 1.0, rows: [1, 1], tube: 1.0, winGlow: "#7f888b", winLight: 2.4,
    amb: 0.04, lamp: 1, fill: 0.32, device: true },
  // the same room later: the machine switched off (pens still, paper still), a little dimmer
  again: { hdri: "blinds", env: 0.1, exposure: 0.95, rows: [1, 1], tube: 1.0, winGlow: "#6f777a", winLight: 2.0,
    amb: 0.035, lamp: 0.8, fill: 0.26, device: true, off: true },
  // desk inserts in diffuse daylight (his own account of 1/9): no tubes, a bright soft window, the stand off,
  // amber = the one mikan (then its empty place)
  insert_mikan: { hdri: "blinds", env: 0.22, exposure: 1.0, rows: [0, 0], tube: 0, winGlow: "#c3c8c6", winLight: 3.4,
    amb: 0.06, lamp: 0, fill: 0.7, day: true },
};

// Colour grade a (texture) material in the shader: sat 0 = grey, 1 = as is; tint multiplies. Poly Haven diffuse maps
// are often warm; the 1985 room is cool fluorescent, so the room's surfaces are pulled toward grey-green.
export function grade(mat, sat = 0.5, tint = "#ffffff") {
  const tc = new THREE.Color(tint);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSat = { value: sat };
    sh.uniforms.uTint = { value: tc };
    sh.fragmentShader = "uniform float uSat;\nuniform vec3 uTint;\n" + sh.fragmentShader.replace("#include <map_fragment>",
      "#include <map_fragment>\n  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat) * uTint;");
  };
  mat.customProgramCacheKey = () => `grade-${sat}-${tint}`;
  mat.needsUpdate = true;
  return mat;
}

// A plain office chair (faces +z): steel tube legs and back posts, wooden seat and back board. Seat top at 0.45 m.
function officeChair(f, wood, pos, rotY, seatH = 0.456) {
  const k = seatH / 0.456;                                 // legs scale with the seat height
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#5d605f", metalness: 0.75, roughness: 0.38 });
  const tubeAt = (x0, y0, z0, x1, y1, z1, r = 0.011) => {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 12), steel);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  };
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) tubeAt(x, 0, z, x, 0.43 * k, z);
  tubeAt(-0.19, 0.14, -0.18, -0.19, 0.14, 0.18); tubeAt(0.19, 0.14, -0.18, 0.19, 0.14, 0.18);
  tubeAt(-0.19, 0.14, 0.0, 0.19, 0.14, 0.0, 0.009);
  for (const x of [-0.17, 0.17]) tubeAt(x, seatH - 0.016, -0.19, x, seatH + 0.4, -0.26);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.024, 0.41), wood);
  seat.position.set(0, seatH - 0.012, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.13, 0.016), wood);
  back.position.set(0, seatH + 0.3, -0.245);
  back.rotation.x = -0.17;
  for (const m of [seat, back]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  g.position.set(...pos);
  g.rotation.y = rotY;
  f.scene.add(g);
  return g;
}

// A generic glTF part: load the model, keep only the named node, centre it on x/z and stand it on y = 0.
async function part(f, id, name, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 } = {}) {
  const h = await f.model(id, { scale: 1 });
  const keep = h.getObjectByName(name);
  h.traverse((o) => { if (o.isMesh && !(o === keep || keep.getObjectById(o.id))) o.visible = false; });
  const g = new THREE.Group();
  f.scene.remove(h);
  g.add(h);
  h.position.set(0, 0, 0);
  keep.position.set(0, 0, 0);
  h.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(keep);
  h.children[0].position.x -= (box.min.x + box.max.x) / 2;
  h.children[0].position.z -= (box.min.z + box.max.z) / 2;
  h.children[0].position.y -= box.min.y;
  g.position.set(...pos);
  g.rotation.set(...rot);
  g.scale.setScalar(scale);
  f.scene.add(g);
  return g;
}

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Brushed-metal roughness streaks (deterministic canvas), for the polygraph case.
function brushed() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#6c6c6c"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const v = 60 + Math.floor(hash(i * 2.3) * 110);
    x.strokeStyle = `rgba(${v},${v},${v},0.5)`;
    x.lineWidth = 0.6 + hash(i * 4.1) * 0.9;
    const py = hash(i * 1.7) * 256, px = hash(i * 3.9) * 256, l = 20 + hash(i * 6.1) * 90;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + l, py); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Soft contact shadow (AO) under a resting object: a radial alpha disc lying on the surface.
function contactDisc(r, y, opacity = 0.75) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.9)"); g.addColorStop(0.45, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y + 0.0006;
  return m;
}

// The polygraph (generic analogue chart recorder; no make, no model, no scale numbers — SPEC). Local frame: front = +z,
// table top at y = 0. A brushed-metal case with an open lid, a dark deck, the chart paper running from a roll at the
// back over the deck toward the front and curling down over the front edge, three pens on arms writing across it,
// knobs on the front face, cables coiled on the table at its left (local -x). The traces are symbolic (SPEC: 파형은 상징).
// update(t): the paper moves toward +z and the pens swing; with off = true everything is still (a fixed moment).
const PV = 0.015;                         // paper speed (m/s): exaggerated so the movement reads
const PEN_Z = 0.0, PAPER_X = -0.02, PAPER_W = 0.2;
const CH = [-0.062, -0.005, 0.052];       // channel centres across the paper (paper-local x)
function signal(i, tau) {
  if (i === 0) return 0.012 * Math.sin(2 * Math.PI * 0.27 * tau + 0.6) + 0.003 * Math.sin(2 * Math.PI * 0.61 * tau);
  if (i === 1) { const ph = (((tau * 1.12) % 1) + 1) % 1; return 0.0065 * (ph < 0.18 ? Math.sin(ph / 0.18 * Math.PI) : -0.18 * Math.sin((ph - 0.18) / 0.82 * Math.PI)) + 0.003 * Math.sin(0.4 * tau); }
  return 0.007 * Math.sin(0.13 * tau + 1.1) + 0.004 * Math.sin(0.31 * tau + 2.3) + 0.0015 * Math.sin(1.7 * tau);
}
function buildPolygraph(f, { pos, rotY, off = false, tFreeze = 30 }) {
  const G = new THREE.Group();
  const add = (m, p = [0, 0, 0], r = [0, 0, 0]) => { m.position.set(...p); m.rotation.set(...r); m.castShadow = m.receiveShadow = true; G.add(m); return m; };
  const rbox = (size, mat, p, r, rad = 0.004) => add(new THREE.Mesh(new RoundedBoxGeometry(...size, 3, rad), mat), p, r);
  const br = brushed();
  const caseMat = new THREE.MeshStandardMaterial({ color: "#b9bcbb", metalness: 0.6, roughness: 0.4, roughnessMap: br, envMapIntensity: 4 });
  const deckMat = new THREE.MeshStandardMaterial({ color: "#2a2d2e", roughness: 0.55, metalness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: "#151617", roughness: 0.42 });
  const paperGrey = new THREE.MeshStandardMaterial({ color: "#d4d1c8", roughness: 0.9 });
  // case body + deck + lid (open, leaning back)
  rbox([0.56, 0.11, 0.4], caseMat, [0, 0.055, 0], [0, 0, 0], 0.008);
  rbox([0.53, 0.006, 0.37], deckMat, [0, 0.112, 0], [0, 0, 0], 0.002);
  const lid = new THREE.Group();
  const lidOut = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.3, 0.018, 3, 0.006), caseMat);
  lidOut.position.set(0, 0.15, -0.009);
  const lidIn = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.27), new THREE.MeshStandardMaterial({ color: "#45494b", roughness: 0.7 }));
  lidIn.position.set(0, 0.15, 0.0005);
  lidOut.castShadow = true; lid.add(lidOut, lidIn);
  lid.position.set(0, 0.11, -0.2);
  lid.rotation.x = -0.32;
  G.add(lid);
  // feet
  for (const [x, z] of [[-0.24, -0.16], [0.24, -0.16], [-0.24, 0.16], [0.24, 0.16]]) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12), black), [x, 0.003, z]);
  }
  G.children.forEach((m) => { if (m.isMesh && m.geometry.type === "CylinderGeometry") m.position.y = 0.003; });
  // front face: knobs (black, a pale pointer line each), two toggles, a pilot lamp (no letters, no scale)
  const pointer = new THREE.MeshStandardMaterial({ color: "#d9d6cd", roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const x = -0.22 + i * 0.062;
    const k = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.014, 20), black), [x, 0.058, 0.207], [Math.PI / 2, 0, 0]);
    const ln = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.0006, 0.01), pointer);
    ln.position.set(0, 0.0072, 0.004);
    k.add(ln);
    k.rotation.y = (hash(i + 3) - 0.5) * 2.2;
  }
  for (const x of [0.17, 0.2]) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12), caseMat), [x, 0.07, 0.202], [Math.PI / 2, 0, 0]);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0018, 0.016, 8), pointer), [x, 0.074, 0.209], [Math.PI / 2 - 0.5, 0, 0]);
  }
  const pilot = add(new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 8),
    new THREE.MeshBasicMaterial({ color: off ? "#3d3a35" : "#ffc98a" })), [0.235, 0.04, 0.203]);
  // paper roll at the back (axis x) and its brackets
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, PAPER_W, 32), paperGrey), [PAPER_X, 0.145, -0.145], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) rbox([0.006, 0.05, 0.03], caseMat, [PAPER_X + sx * (PAPER_W / 2 + 0.006), 0.135, -0.145], [0, 0, 0], 0.002);
  // pen bridge (dark housing across the paper behind the pens)
  rbox([0.27, 0.045, 0.05], black, [PAPER_X, 0.14, -0.085], [0, 0, 0], 0.005);
  // paper canvas: left half = grid + traces (written), right half = grid only (not yet written). y = paper position p.
  const P0 = -0.5, P1 = PV * 40 + 0.05, PXM = 1300;
  const cw = Math.round(PAPER_W * PXM), chh = 2048;
  const c = document.createElement("canvas");
  c.width = cw * 2; c.height = chh;
  const x = c.getContext("2d");
  x.fillStyle = "#e4e1d8"; x.fillRect(0, 0, c.width, chh);
  const py = (p) => (p - P0) / (P1 - P0) * chh;
  x.strokeStyle = "rgba(110,135,128,0.35)"; x.lineWidth = 1;
  for (const ox of [0, cw]) {
    for (let gx = 0; gx <= PAPER_W + 1e-6; gx += 0.005) { x.beginPath(); x.moveTo(ox + gx * PXM, 0); x.lineTo(ox + gx * PXM, chh); x.stroke(); }
    for (let p = Math.ceil(P0 / 0.005) * 0.005; p < P1; p += 0.005) { x.beginPath(); x.moveTo(ox, py(p)); x.lineTo(ox + cw, py(p)); x.stroke(); }
  }
  x.strokeStyle = "#23272c"; x.lineWidth = 2.2; x.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    x.beginPath();
    for (let k = 0; k <= 3000; k++) {
      const p = P0 + (P1 - P0) * k / 3000;
      const xx = (CH[i] + signal(i, p / PV) + PAPER_W / 2) * PXM;
      if (k) x.lineTo(xx, py(p)); else x.moveTo(xx, py(p));
    }
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const paperMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, side: THREE.DoubleSide });
  // paper path, by arc length s from the roll's top: flat over the deck to the front edge, then a curl down
  const Z0p = -0.14, ZE = 0.2, Y = 0.1165, R = 0.018, HANG = 0.075;
  const path = (s) => {
    const flat = ZE - Z0p;
    if (s <= flat) return [Z0p + s, Y];
    const a = Math.min((s - flat) / R, Math.PI / 2);
    if (s <= flat + R * Math.PI / 2) return [ZE + R * Math.sin(a), Y - R * (1 - Math.cos(a))];
    return [ZE + R + 0.004 * Math.sin((s - flat - R * Math.PI / 2) * 30), Y - R - (s - flat - R * Math.PI / 2)];
  };
  const SPEN = PEN_Z - Z0p, SEND = ZE - Z0p + R * Math.PI / 2 + HANG;
  const strip = (s0, s1, written) => {
    const N = 48, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const s = s0 + (s1 - s0) * i / N, [z, y] = path(s);
      for (const e of [0, 1]) { pos.push(PAPER_X - PAPER_W / 2 + e * PAPER_W, y, z); uv.push(0, 0); }
      if (i) { const a = 2 * (i - 1); idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = add(new THREE.Mesh(g, paperMat));
    m.userData = { s0, s1, N, written };
    return m;
  };
  const sBlank = strip(0, SPEN, false), sWritten = strip(SPEN, SEND, true);
  const setUV = (m, tt) => {
    const { s0, s1, N, written } = m.userData, uv = m.geometry.attributes.uv;
    for (let i = 0; i <= N; i++) {
      const s = s0 + (s1 - s0) * i / N, p = PV * tt - (s - SPEN);
      const v = 1 - (p - P0) / (P1 - P0);
      uv.setXY(2 * i, written ? 0 : 0.5, v); uv.setXY(2 * i + 1, written ? 0.5 : 1, v);
    }
    uv.needsUpdate = true;
  };
  // pens: arms along z from pivots under the bridge, tips on the pen line; the tip swings across (x)
  const ARM = 0.085;
  const pens = CH.map((cx) => {
    const piv = new THREE.Group();
    piv.position.set(PAPER_X + cx, 0.124, PEN_Z - ARM);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.0018, ARM), black);
    arm.position.z = ARM / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0008, 0.008, 10), black);
    tip.position.set(0, -0.0035, ARM);
    arm.castShadow = tip.castShadow = true;
    piv.add(arm, tip);
    G.add(piv);
    return piv;
  });
  // cables from the left side down to the table, a loose coil each, and a folded cuff (no make, no labels)
  const rubber = new THREE.MeshStandardMaterial({ color: "#1d1f20", roughness: 0.55 });
  for (let i = 0; i < 3; i++) {
    const zc = 0.05 - i * 0.05, cx = -0.42 - 0.02 * i, cz = 0.06 - i * 0.07, rr = 0.045 + 0.008 * i;
    const pts = [new THREE.Vector3(-0.28, 0.07, zc), new THREE.Vector3(-0.31, 0.05, zc), new THREE.Vector3(-0.34, 0.006, zc - 0.01)];
    for (let k = 0; k <= 14; k++) {
      const a = Math.PI * 0.2 + k / 14 * Math.PI * 1.7 + i;
      pts.push(new THREE.Vector3(cx + rr * Math.cos(a), 0.0045, cz + rr * Math.sin(a)));
    }
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0035, 8), rubber));
  }
  const cuffMat = new THREE.MeshStandardMaterial({ color: "#3a3d3f", roughness: 0.85 });
  rbox([0.12, 0.022, 0.07], cuffMat, [-0.44, 0.011, -0.15], [0, 0.3, 0], 0.01);
  G.add(contactDisc(0.36, 0, 0.6));
  G.position.set(...pos);
  G.rotation.y = rotY;
  f.scene.add(G);
  G.updateMatrixWorld(true);
  const world = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(G.matrixWorld);
  const update = (t) => {
    const tt = off ? tFreeze : t;
    setUV(sBlank, tt); setUV(sWritten, tt);
    pens.forEach((pv, i) => { pv.rotation.y = -Math.asin(Math.max(-0.9, Math.min(0.9, signal(i, tt) / ARM))); });
  };
  return { G, update, world, pilot };
}

// One mikan on the desk (matte pitted skin, a calyx, a soft contact shadow). Radius about 3.2 cm, a little flattened.
function dimples() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const px = hash(i * 3.1) * 256, py = hash(i * 7.7 + 1) * 256, r = 0.6 + hash(i * 1.3 + 2) * 1.3;
    x.fillStyle = `rgba(40,40,40,${0.25 + 0.35 * hash(i + 9)})`;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  return t;
}
function buildMikan(pos) {
  const g = new THREE.Group();
  const R = 0.033, K = 0.84;
  const skin = new THREE.MeshStandardMaterial({ color: "#d8701c", roughness: 0.8, bumpMap: dimples(), bumpScale: 2.0, envMapIntensity: 0.5 });
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), skin);
  fruit.scale.set(1, K, 1);
  fruit.position.y = R * K - 0.0006;
  fruit.castShadow = fruit.receiveShadow = true;
  g.add(fruit);
  const shape = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.0034 : 0.0072;
    if (i === 0) shape.moveTo(r * Math.cos(a), r * Math.sin(a)); else shape.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  const cg = new THREE.ExtrudeGeometry(shape, { depth: 0.0012, bevelEnabled: false });
  cg.rotateX(-Math.PI / 2);
  const calyx = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: "#4a4a26", roughness: 0.85 }));
  calyx.position.y = 2 * R * K - 0.0012;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0016, 0.004, 6), calyx.material);
  stem.position.y = 2 * R * K + 0.0015;
  g.add(calyx, stem, contactDisc(R * 1.35, 0, 0.8));
  g.position.set(...pos);
  g.rotation.set(0, 0.6, 0);
  return g;
}

export function createPolice(stage, opts) {
  const mode = opts.mode || "interrogation";
  const M = MODES[mode];
  const cue = opts.cues || {};
  return film(stage, `police-${mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, background: "#07090b",
  }, async (f) => {
    const S = f.scene;
    const [lino, plaster, lower, wood, fabric, wool] = await Promise.all([
      f.material("old_linoleum_flooring_01", { normalScale: 0.8 }),
      f.material("beige_wall_002", { normalScale: 0.9 }),
      f.material("concrete_wall_008", { normalScale: 0.6 }),
      f.material("dark_wood"),
      f.material("stretch_poplin"),
      f.material("poly_wool_herringbone"),
    ]);
    setFabric(fabric.normalMap);

    // Floor, walls (painted lower band + plaster above), ceiling.
    const W = X1 - X0, D = Z1 - Z0;
    const floorMat = f.tiled(lino, W / 1.2, D / 1.2);
    floorMat.color = new THREE.Color("#7a7e78");
    grade(floorMat, 0.22);
    floorMat.roughnessMap = null;
    floorMat.roughness = 0.62;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    floor.receiveShadow = true;
    S.add(floor);
    const ceilMat = f.tiled(plaster, W / 1.5, D / 1.5);
    ceilMat.color = new THREE.Color("#c9ccc9");
    grade(ceilMat, 0.08);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set((X0 + X1) / 2, H, (Z0 + Z1) / 2);
    S.add(ceil);

    const BAND = 1.0;
    const upperTint = new THREE.Color("#d3d8d3"), lowerTint = new THREE.Color("#8d9a93");
    // wall(len, height, y0) as a plane facing into the room; holes are made by splitting into pieces.
    const wallPiece = (w, h, y0, along, at, ry, upper) => {
      const m = f.tiled(upper ? plaster : lower, w / 1.6, h / 1.6);
      m.color = (upper ? upperTint : lowerTint).clone();
      grade(m, upper ? 0.14 : 0.45);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.rotation.y = ry;
      if (along === "x") p.position.set(at[0] + w / 2, y0 + h / 2, at[1]);
      else p.position.set(at[0], y0 + h / 2, at[1] + w / 2);
      p.receiveShadow = true;
      S.add(p);
      return p;
    };
    const wallRun = (along, fixed, ry, from, to, holes = []) => {
      // holes: [{a0, a1, y0, y1}] along the run
      const segs = [];
      let a = from;
      for (const h of holes) { segs.push([a, h.a0, null]); segs.push([h.a0, h.a1, h]); a = h.a1; }
      segs.push([a, to, null]);
      for (const [a0, a1, h] of segs) {
        if (a1 - a0 < 1e-3) continue;
        const at = along === "x" ? [a0, fixed] : [fixed, a0];
        const spans = h ? [[0, h.y0], [h.y1, H]] : [[0, H]];
        for (const [y0, y1] of spans) {
          if (y1 - y0 < 1e-3) continue;
          const lo = Math.min(y1, BAND);
          if (lo > y0) wallPiece(a1 - a0, lo - y0, y0, along, at, ry, false);
          const hi0 = Math.max(y0, BAND);
          if (y1 > hi0) wallPiece(a1 - a0, y1 - hi0, hi0, along, at, ry, true);
        }
      }
    };
    wallRun("x", Z0, 0, X0, X1, [{ a0: WIN.x0, a1: WIN.x1, y0: WIN.y0, y1: WIN.y1 }]); // north, with window
    // south wall: faces -z. PlaneGeometry faces +z, so turn it around and lay it from x1 down.
    for (const [y0, y1, up] of [[0, BAND, false], [BAND, H, true]]) {
      const m = f.tiled(up ? plaster : lower, W / 1.6, (y1 - y0) / 1.6);
      m.color = (up ? upperTint : lowerTint).clone();
      grade(m, up ? 0.14 : 0.45);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(W, y1 - y0), m);
      p.rotation.y = Math.PI;
      p.position.set(0, (y0 + y1) / 2, Z1);
      S.add(p);
    }
    // west wall faces +x: plane rotated +90°; runs along z.
    const westRun = (z0, z1) => {
      for (const [y0, y1, up] of [[0, BAND, false], [BAND, H, true]]) {
        const m = f.tiled(up ? plaster : lower, (z1 - z0) / 1.6, (y1 - y0) / 1.6);
        m.color = (up ? upperTint : lowerTint).clone();
      grade(m, up ? 0.14 : 0.45);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), m);
        p.rotation.y = Math.PI / 2;
        p.position.set(X0, (y0 + y1) / 2, (z0 + z1) / 2);
        p.receiveShadow = true;
        S.add(p);
      }
    };
    westRun(Z0, Z1);
    // east wall faces -x, with the door opening.
    const eastPiece = (z0, z1, y0, y1) => {
      for (const [a, b, up] of [[y0, Math.min(y1, BAND), false], [Math.max(y0, BAND), y1, true]]) {
        if (b - a < 1e-3) continue;
        const m = f.tiled(up ? plaster : lower, (z1 - z0) / 1.6, (b - a) / 1.6);
        m.color = (up ? upperTint : lowerTint).clone();
      grade(m, up ? 0.14 : 0.45);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, b - a), m);
        p.rotation.y = -Math.PI / 2;
        p.position.set(X1, (a + b) / 2, (z0 + z1) / 2);
        p.receiveShadow = true;
        S.add(p);
      }
    };
    eastPiece(Z0, DOOR.z0, 0, H);
    eastPiece(DOOR.z0, DOOR.z1, DOOR.y1, H);
    eastPiece(DOOR.z1, Z1, 0, H);

    // Skirting + chair rail (painted wood), window frame and bars, door frame and door leaf (ajar).
    const paint = new THREE.MeshStandardMaterial({ color: "#4b524d", roughness: 0.6 });
    const frameMat = new THREE.MeshStandardMaterial({ color: "#5b5f5c", roughness: 0.45, metalness: 0.3 });
    const strip = (size, pos, mat = paint) => f.box({ size, radius: 0.004, material: mat, pos });
    strip([W, 0.09, 0.02], [0, 0.045, Z0 + 0.01]);
    strip([W, 0.04, 0.025], [0, BAND, Z0 + 0.012]);
    strip([0.02, 0.09, D], [X0 + 0.01, 0.045, (Z0 + Z1) / 2]);
    strip([0.025, 0.04, D], [X0 + 0.012, BAND, (Z0 + Z1) / 2]);
    strip([W, 0.04, 0.025], [0, BAND, Z1 - 0.012]);
    const wx = (WIN.x0 + WIN.x1) / 2, wy = (WIN.y0 + WIN.y1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0;
    // Frosted glass: a lit pane (its glow is the window's brightness; light through it comes from a spot below).
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ color: M.winGlow }));
    glass.position.set(wx, wy, Z0 - 0.06);
    S.add(glass);
    for (const [sx, sy, px, py] of [[ww + 0.1, 0.06, wx, WIN.y0 - 0.02], [ww + 0.1, 0.06, wx, WIN.y1 + 0.02],
      [0.06, wh, WIN.x0 - 0.02, wy], [0.06, wh, WIN.x1 + 0.02, wy], [0.04, wh, wx, wy], [ww, 0.035, wx, wy]]) {
      strip([sx, sy, 0.09], [px, py, Z0 - 0.02], frameMat);
    }
    const iron = new THREE.MeshStandardMaterial({ color: "#2b2d2c", roughness: 0.5, metalness: 0.6 });
    for (let i = 1; i < 7; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, wh, 8), iron);
      bar.position.set(WIN.x0 + (ww * i) / 7, wy, Z0 + 0.04);
      bar.castShadow = true;
      S.add(bar);
    }
    // Door: frame + leaf ajar about 0.3 m, the next room dark except one cold strip (c5 looks through the gap).
    const dz = (DOOR.z0 + DOOR.z1) / 2, dw = DOOR.z1 - DOOR.z0;
    strip([0.12, 0.07, dw + 0.14], [X1 - 0.02, DOOR.y1 + 0.035, dz], paint);
    strip([0.12, DOOR.y1, 0.07], [X1 - 0.02, DOOR.y1 / 2, DOOR.z0 - 0.035], paint);
    strip([0.12, DOOR.y1, 0.07], [X1 - 0.02, DOOR.y1 / 2, DOOR.z1 + 0.035], paint);
    const leafMat = f.tiled(wood, 1, 2);
    leafMat.color = new THREE.Color("#8d8479");
    grade(leafMat, 0.35);
    const leaf = new THREE.Group();
    const leafBox = f.box({ size: [0.04, DOOR.y1 - 0.01, dw - 0.02], radius: 0.006, material: leafMat, pos: [0, (DOOR.y1 - 0.01) / 2, -(dw - 0.02) / 2] });
    S.remove(leafBox);
    leaf.add(leafBox);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: "#8a8780", metalness: 0.9, roughness: 0.3 }));
    knob.position.set(-0.05, 0.95, -(dw - 0.12));
    leaf.add(knob);
    leaf.position.set(X1 - 0.02, 0, DOOR.z1);
    leaf.rotation.y = 0.45; // swung into the room, hinge at the south jamb
    S.add(leaf);
    // Next room: a dark box with a painted floor; a corner of a brushed-metal case on a table (no knobs, no labels).
    const nextMat = new THREE.MeshStandardMaterial({ color: "#2e3230", roughness: 0.9, side: THREE.BackSide });
    const next = new THREE.Mesh(new THREE.BoxGeometry(3, H, 3), nextMat);
    next.position.set(X1 + 1.52, H / 2, dz);
    next.receiveShadow = true;
    S.add(next);
    const brushed = new THREE.MeshStandardMaterial({ color: "#9a9c9b", metalness: 0.85, roughness: 0.34 });
    f.box({ size: [0.9, 0.74, 0.6], radius: 0.01, material: new THREE.MeshStandardMaterial({ color: "#3c3a36", roughness: 0.7 }), pos: [X1 + 0.9, 0.37, dz - 0.2] });
    f.box({ size: [0.46, 0.2, 0.34], radius: 0.012, material: brushed, pos: [X1 + 0.75, 0.84, dz - 0.05] });
    const nextLight = new THREE.SpotLight("#dfe8ee", mode === "interrogation" ? 8 : 0, 4, 0.7, 0.9, 2);
    nextLight.position.set(X1 + 1.0, H - 0.1, dz);
    nextLight.target.position.set(X1 + 0.75, 0.8, dz - 0.05);
    S.add(nextLight, nextLight.target);

    // Desk (drawers toward the officer, north), two chairs, stand, papers.
    const desk = await f.model("metal_office_desk", { pos: [DESK[0], 0, DESK[1]], rot: [0, 0, 0], height: 0.74 });
    desk.traverse((o) => { if (o.isMesh) grade(o.material, 0.5, "#9da3a0"); });
    // daylight inserts look at the top from close: a satin (not mirror) top so the window does not blow it out
    if (M.day) desk.traverse((o) => { if (o.isMesh) { o.material.roughnessMap = null; o.material.roughness = 0.62; o.material.envMapIntensity = 0.5; } });
    // Office chairs: steel tube frame + wooden seat and back (generic 1980s office chair, built here).
    const seatWood = f.tiled(wood, 0.5, 0.5);
    seatWood.color = new THREE.Color("#a08c78");
    officeChair(f, seatWood, [-0.1, 0, -1.5], 0.12);
    // the stand stands at the desk's right end (seen from the man's back) so it never sits behind his head
    const lamp = await f.model("desk_lamp_arm_01", { pos: [0.8, 0.74, -0.86], rot: [0, 2.3, 0], height: 0.5 });
    const papers = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const s = f.sheet({ w: 0.21, h: 0.297, lines: 16, age: 0.35, torn: 0, px: 512, paper: i % 2 ? "#b9b3a6" : "#c2bcae",
        pos: [0.42 + 0.004 * Math.sin(i * 2.1), 0.742 + i * 0.0016, -0.6 + 0.005 * Math.cos(i * 1.7)], rot: [-Math.PI / 2, 0, 0.05 * Math.sin(i * 3.3)] });
      S.remove(s); papers.add(s);
    }
    S.add(papers);
    await f.model("clipboard", { pos: [0.12, 0.741, -0.86], rot: [0, 0.5, 0], height: 0.03 });
    const notes = await f.model("office_notepads", { pos: [-0.2, 0.762, -0.35], rot: [0, 0.2, 0], scale: 1 });
    notes.traverse((o) => { if (o.isMesh && !/a4_stack/.test(o.name)) o.visible = false; });
    notes.rotation.y = 0;
    notes.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color = new THREE.Color("#a8a49c"); } });
    notes.position.set(-0.5 + 0.45, 0.741, -0.78 + 0.175); // puts the a4 stack (node at -0.45, -0.175) at (-0.5, -0.78)

    // Fluorescent battens: two rows of two along z. Each: model fixture (one variant) + lit tube + down spot.
    const rowsX = [-1.6, 1.2];
    const tubes = [];
    const rowLights = [];
    for (const [ri, rx] of rowsX.entries()) {
      for (const z of [-1.0, 1.0]) {
        const fix = await part(f, "mounted_fluorescent_lights", "mounted_fluorescent_lights_d", { pos: [rx, H - 0.046, z], rot: [0, Math.PI / 2, 0], scale: 1.3 });
        const on = M.rows[ri];
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.16, 12),
          new THREE.MeshBasicMaterial({ color: on ? "#eef6f4" : "#55595a" }));
        tube.rotation.x = Math.PI / 2;
        tube.position.set(rx, H - 0.075, z);
        S.add(tube);
        tubes.push(tube);
      }
      const on = M.rows[ri];
      const l = new THREE.SpotLight("#e9f2ef", on ? (mode === "night" ? 30 : 26) : 0, 9, mode === "night" ? 1.15 : 0.85, 0.9, 1.6);
      l.position.set(rx, H - 0.1, 0);
      l.target.position.set(mode === "night" && ri === 0 ? rx - 0.5 : rx * 0.6, 0, 0);
      l.castShadow = !!on && ri === 0;   // one shadow-casting row keeps the build light (many sets share a page)
      l.shadow.mapSize.set(1536, 1536);
      l.shadow.bias = -0.0004;
      l.shadow.radius = 5;
      Object.assign(l.shadow.camera, { near: 0.3, far: 8 });
      S.add(l, l.target);
      rowLights.push(l);
    }
    if (mode === "night") {
      // a faint cold rim from the west wall side: hair, collar and shoulder edges separate from the washed wall
      const nrim = new THREE.SpotLight("#dfe8ec", 9, 6, 0.26, 0.7, 1.4);
      nrim.position.set(-2.3, 1.85, 0.55);
      nrim.target.position.set(0.05, 1.25, 0.1);
      S.add(nrim, nrim.target);
      // The one lit row washes the west wall: a grazing spot so the wall behind the man (seen from the east) reads bright.
      const wash = new THREE.SpotLight("#dfeae8", 26, 6, 0.6, 0.85, 1.5);
      wash.position.set(-1.75, H - 0.12, 0.0);
      wash.target.position.set(X0, 0.9, -0.2);
      S.add(wash, wash.target);
    }
    // Daylight through the frosted window: a soft spot from outside, low and cool.
    if (M.winLight) {
      const sun = new THREE.SpotLight("#dfe7ec", M.winLight * 10, 9, 0.75, 1, 1.4);
      sun.position.set(wx, 2.0, Z0 - 0.4);
      sun.target.position.set(0, 0.6, 0.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.bias = -0.0005;
      S.add(sun, sun.target);
      // window-side rim: from the window, level with his shoulders, so his hair, collar and shoulders get an edge
      const wrim = new THREE.SpotLight("#e2eaee", 26, 6, 0.28, 0.7, 1.3);
      wrim.position.set(wx - 0.2, 1.55, Z0 + 0.15);
      wrim.target.position.set(0.05, 1.2, 0.2);
      S.add(wrim, wrim.target);
      const fill = new THREE.HemisphereLight("#dfe6e6", "#77746c", M.fill);
      S.add(fill);
    }
    S.add(new THREE.AmbientLight("#9fb0bd", M.amb));

    // Amber focus: the desk stand's bulb and the pool it throws on the desk.
    const lampHead = new THREE.Vector3();
    lamp.updateMatrixWorld(true);
    const lb = new THREE.Box3().setFromObject(lamp);
    lampHead.set(lb.min.x + 0.06, lb.max.y - 0.07, (lb.min.z + lb.max.z) / 2 + 0.06);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshBasicMaterial({ color: M.lamp ? "#ffd9a0" : "#5d5850" }));
    bulb.position.copy(lampHead).add(new THREE.Vector3(0, -0.03, 0));
    S.add(bulb);
    const pool = new THREE.SpotLight(AMBER, M.lamp * (mode === "night" ? 5.5 : 4), 2.2, 0.75, 0.6, 1.6);
    pool.position.copy(bulb.position);
    pool.target.position.set(0.38, 0.74, -0.62);
    pool.castShadow = true;
    pool.shadow.mapSize.set(1024, 1024);
    pool.shadow.bias = -0.0004;
    S.add(pool, pool.target);

    // The man: seated (chair), forearms toward the desk, facing north (-z), back to the camera side.
    const man = await f.figure("film");
    await dress(man, { suit: "#2d2c2a", trousers: "#33312e", shirt: "#aaa69d", fabric: wool.normalMap, seated: true });
    poseSeated(man, { style: "chair", forearms: 0.75, lean: 0.12 });
    turn(man, "neck_01", [1, 0, 0], 0.18);
    man.root.rotation.y = Math.PI;
    settle(man, 0);
    man.root.position.set(0.05, man.root.position.y, SEAT_Z);
    // his chair goes under him: seat top at the underside of his thighs, the back just behind his pelvis
    man.root.updateMatrixWorld(true);
    const pv = man.bone("pelvis").getWorldPosition(new THREE.Vector3());
    let seatY = 1, vv = new THREE.Vector3();
    man.scene.traverse((o) => {
      if (!o.isSkinnedMesh || !o.visible) return;
      const za = o.geometry.attributes.zone, ps = o.geometry.attributes.position;
      for (let i = 0; i < ps.count; i += 2) {
        if (za && za.getX(i) !== 3 && za.getX(i) !== 2) continue;
        o.getVertexPosition(i, vv); vv.applyMatrix4(o.matrixWorld);
        if (Math.abs(vv.x - pv.x) < 0.16 && vv.z > pv.z - 0.25 && vv.z < pv.z + 0.12) seatY = Math.min(seatY, vv.y);
      }
    });
    officeChair(f, seatWood, [pv.x, 0, pv.z - 0.05], Math.PI, seatY);
    f.hold(man);
    const empty = cue.empty || null;

    // Polygraph corner (polygraph / again): side table against the west wall near the south-west corner, an empty
    // examiner's chair east of it. The machine's front faces east (+x).
    let device = null, mikan = null;
    if (M.device) {
      const tableMat = new THREE.MeshStandardMaterial({ color: "#5f6461", roughness: 0.7, metalness: 0.1 });
      grade(tableMat, 0.5);
      f.box({ size: [0.6, 0.03, 1.05], radius: 0.004, material: tableMat, pos: [-2.48, 0.725, 2.15] });
      const leg = new THREE.MeshStandardMaterial({ color: "#3b3e3d", metalness: 0.7, roughness: 0.45 });
      for (const [x, z] of [[-2.74, 1.67], [-2.22, 1.67], [-2.74, 2.63], [-2.22, 2.63]]) {
        f.box({ size: [0.035, 0.71, 0.035], radius: 0.003, material: leg, pos: [x, 0.355, z] });
      }
      device = buildPolygraph(f, { pos: [-2.47, 0.74, 2.03], rotY: Math.PI / 2, off: !!M.off, tFreeze: 31 });
      // amber focus: a small warm lamp over the pens (polygraph) or on the curled paper end (again)
      const pen = device.world(PAPER_X, 0.12, M.off ? 0.21 : -0.02);
      const warm = new THREE.SpotLight(AMBER, M.off ? 1.6 : 2.2, 1.4, 0.24, 0.8, 1.6);
      warm.position.copy(pen).add(new THREE.Vector3(0.35, 0.6, -0.15));
      warm.target.position.copy(pen);
      warm.castShadow = true;
      warm.shadow.mapSize.set(1024, 1024);
      warm.shadow.bias = -0.0004;
      S.add(warm, warm.target);
    }
    // Desk inserts (insert_mikan): one mikan on the desk, a soft daylight key from the window side, the man hidden.
    if (M.day) {
      mikan = buildMikan([-0.08, 0.741, -0.36]);
      S.add(mikan);
      const day = new THREE.SpotLight("#f1ede4", 26, 7, 0.6, 1, 1.4);
      day.position.set(-0.6, 2.3, -2.0);
      day.target.position.set(0, 0.74, -0.45);
      day.castShadow = true;
      day.shadow.mapSize.set(2048, 2048);
      day.shadow.bias = -0.0003;
      day.shadow.radius = 8;
      S.add(day, day.target);
      const warmSpot = new THREE.SpotLight("#f3c68c", 2.4, 1.6, 0.16, 0.9, 1.6);
      warmSpot.position.set(0.25, 1.55, -0.1);
      warmSpot.target.position.set(-0.08, 0.74, -0.36);
      S.add(warmSpot, warmSpot.target);
    }
    const mikanOn = cue.mikan || null;   // [t0, t1]: the mikan is on the desk only between these

    return (t) => {
      f.rest(man);
      man.root.visible = !M.day && !(empty && t >= empty[0] && t < empty[1]);
      if (device) device.update(t);
      if (mikan) mikan.visible = !mikanOn || (t >= mikanOn[0] && t < mikanOn[1]);
      f.shot(opts.camera, t);
    };
  });
}
