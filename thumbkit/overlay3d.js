// Overlay3D: the reference's diagrams drawn INSIDE a 3D reconstruction (docs/reference-look.md §2-7) — a glowing distance
// line that draws itself along the road, a big number standing in the scene, a route, a pin. Not a black board:
// the marks live in the set, so buildings occlude them and the camera moves past them.
// Copied into an episode with the film kit (`python3 scripts/kit3d.py episodes/<ep>`), next to film.js.
//
//   import { film } from "../kit3d/film.js";
//   import { measure, route, label3d, pin, setAccent, play } from "../kit3d/overlay3d.js";
//   return film(stage, "road", {...}, async (f) => {
//     ...build the set...
//     const m = await measure(f, [-6, 0, 2], [6, 0, 2], { label: "120m", start: 1.0, dur: 1.4 });
//     const p = await pin(f, [6, 0, 2], { start: 2.6 });
//     const marks = play(m, p);
//     return (t) => { f.shot(opts.camera, t); marks(t); };   // camera first: labels face the camera
//   });
//
// Every mark is a pure function of scene time t: build once (async), then `.at(t)` sets its state. Times are
// scene-local seconds. All marks share ONE accent colour, ACCENT (the reference draws in red; amber vs red is a
// human decision — STATUS 5). Change it for a whole set with setAccent("#F0A23B") before building the marks.
import { THREE } from "./film.js";

export let ACCENT = "#E0352B";           // reference red (screen-rec "150m" frame). Pending human decision: red or amber.
export function setAccent(hex) { ACCENT = hex; }
export const INK = "#FFFFFF";

// One font for in-scene numbers and words: Gothic A1 Bold, the same file as the 2D title card.
const FONT = { family: "Overlay Gothic Bold", url: "assets/fonts/GothicA1-Bold.ttf" };
let fontReady = null;
function loadFont() {
  if (fontReady) return fontReady;
  fontReady = (async () => {
    try {
      const ff = new FontFace(FONT.family, `url(${FONT.url})`, { weight: "700" });
      document.fonts.add(await ff.load());
      return `"${FONT.family}"`;
    } catch (e) {
      return "sans-serif";          // still deterministic: same fallback every render
    }
  })();
  return fontReady;
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const V = (p) => new THREE.Vector3(...p);

// Soft falloff across a ribbon's width (v = 0..1): the glow halo around the bright core.
let GLOW_TEX = null;
function glowTex() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement("canvas");
  c.width = 4; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.3, "rgba(255,255,255,0.18)");
  g.addColorStop(0.5, "rgba(255,255,255,1)");
  g.addColorStop(0.7, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 4, 128);
  GLOW_TEX = new THREE.CanvasTexture(c);
  return GLOW_TEX;
}
let DOT_TEX = null;
function dotTex() {
  if (DOT_TEX) return DOT_TEX;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  DOT_TEX = new THREE.CanvasTexture(c);
  return DOT_TEX;
}

// Unlit accent material: never tone-mapped or fogged, so the line glows at its own colour whatever the set's exposure.
function lineMat(color, { glow = false, opacity = 1, onTop = false } = {}) {
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, toneMapped: false, fog: false, depthWrite: false, side: THREE.DoubleSide,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, map: glow ? glowTex() : null,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  if (onTop) m.depthTest = false;
  return m;
}

// A flat ribbon along a polyline lying on the ground (normal = up). Each segment is its own quad, in path order,
// so geometry.setDrawRange(0, 6 * k) shows the first k segments: the line "draws" along its length.
function ribbon(points, width) {
  const n = points.length;
  const pos = [], uv = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  let acc = 0;
  const lens = [0];
  for (let i = 1; i < n; i++) { acc += points[i].distanceTo(points[i - 1]); lens.push(acc); }
  const side = (i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    const tng = b.clone().sub(a).setY(0).normalize();
    return new THREE.Vector3().crossVectors(up, tng).normalize().multiplyScalar(width / 2);
  };
  for (let i = 0; i < n; i++) {
    const s = side(i);
    const L = points[i].clone().add(s), R = points[i].clone().sub(s);
    pos.push(L.x, L.y, L.z, R.x, R.y, R.z);
    const u = acc ? lens[i] / acc : 0;
    uv.push(u, 0, u, 1);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = 2 * i, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return { geo: g, lens, total: acc };
}

// Resample a polyline every `step` metres (optionally smoothed with a Catmull-Rom curve) so drawing is smooth.
function resample(pts, step, smooth) {
  const P = pts.map(V);
  if (smooth && P.length > 2) {
    const curve = new THREE.CatmullRomCurve3(P, false, "centripetal");
    const n = Math.max(2, Math.ceil(curve.getLength() / step));
    return curve.getSpacedPoints(n);
  }
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const k = Math.max(1, Math.ceil(a.distanceTo(b) / step));
    for (let j = 1; j <= k; j++) out.push(a.clone().lerp(b, j / k));
  }
  return out;
}

// The glowing line itself (core + additive halo + a bright travelling tip). Shared by measure() and route().
function glowLine(f, pts, { width = 0.12, glow = 5, lift = 0.02, color = null, step = 0.1, smooth = false, onTop = false,
  dash = null } = {}) {
  const col = new THREE.Color(color || ACCENT);
  const core = new THREE.Color(col).lerp(new THREE.Color("#ffffff"), 0.18);   // hot core, coloured halo
  let P = resample(pts, step, smooth).map((p) => p.clone().setY(p.y + lift));
  const group = new THREE.Group();
  const { geo, lens, total } = ribbon(P, width);
  const halo = ribbon(P, width * glow).geo;
  const coreMesh = new THREE.Mesh(geo, lineMat(core, { onTop }));
  const haloMesh = new THREE.Mesh(halo, lineMat(col, { glow: true, opacity: 0.85, onTop }));
  coreMesh.renderOrder = 21; haloMesh.renderOrder = 20;
  group.add(haloMesh, coreMesh);
  const tip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lineMat(core, { glow: true, onTop }));
  tip.material.map = dotTex();
  tip.rotation.x = -Math.PI / 2;
  tip.scale.setScalar(width * glow * 1.6);
  tip.renderOrder = 22;
  group.add(tip);
  f.scene.add(group);
  const segs = P.length - 1;
  // dash: [on, off] metres — hide the "off" quads by collapsing them (index order is kept, so drawing still works)
  if (dash) {
    const [on, off] = dash;
    for (const g of [geo, halo]) {
      const ix = g.index.array;
      for (let i = 0; i < segs; i++) {
        const mid = (lens[i] + lens[i + 1]) / 2;
        if (mid % (on + off) > on) for (let k = 0; k < 6; k++) ix[6 * i + k] = ix[6 * i];
      }
      g.index.needsUpdate = true;
    }
  }
  // progress p in 0..1 of the length
  const draw = (p, alpha = 1) => {
    const len = p * total;
    let k = 0;
    while (k < segs && lens[k + 1] <= len + 1e-6) k++;
    const shown = p >= 1 ? segs : k;
    geo.setDrawRange(0, 6 * shown);
    halo.setDrawRange(0, 6 * shown);
    group.visible = p > 0 && alpha > 0;
    coreMesh.material.opacity = alpha;
    haloMesh.material.opacity = 0.85 * alpha;
    const i = Math.min(Math.max(shown, 1), segs);
    tip.position.copy(P[i]);
    tip.material.opacity = p > 0 && p < 1 ? alpha : 0;
  };
  return { group, draw, total, points: P };
}

// Big text standing in the scene (canvas texture on a plane). Faces the camera by default.
// opts: size = glyph height in metres (default 0.9), color, face: "camera" | "up" (lying on the ground) | [rx, ry, rz],
// start / dur (fade + small rise), until (fade out), shadow (soft dark halo, default true),
// onTop (default true: a number must stay readable, so roofs and poles never cut it; false = occluded like a set object).
export async function label3d(f, pos, text, opts = {}) {
  const { size = 0.9, color = INK, face = "camera", start = 0, dur = 0.5, until = null, shadow = true, onTop = true,
    rise = 0.15, anchor = "center" } = opts;
  const family = await loadFont();
  const px = 220;                                  // canvas font size; glyph height ≈ 0.72 em for digits/Latin
  const c = document.createElement("canvas");
  const x = c.getContext("2d");
  x.font = `700 ${px}px ${family}, sans-serif`;
  const tw = Math.ceil(x.measureText(text).width);
  const pad = Math.round(px * 0.35);
  c.width = tw + 2 * pad; c.height = Math.round(px * 1.5);
  x.font = `700 ${px}px ${family}, sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  if (shadow) { x.shadowColor = "rgba(0,0,0,0.55)"; x.shadowBlur = px * 0.18; }
  x.fillStyle = color;
  x.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const em = size / 0.72;                          // metres per em
  const h = em * (c.height / px), w = h * (c.width / c.height);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false, depthWrite: false, side: THREE.DoubleSide });
  if (onTop) mat.depthTest = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = 30;
  const holder = new THREE.Group();
  holder.add(mesh);
  if (anchor === "bottom") mesh.position.y = h / 2 - em * 0.25;
  holder.position.set(...pos);
  if (Array.isArray(face)) holder.rotation.set(...face);
  if (face === "up") holder.rotation.set(-Math.PI / 2, 0, 0);
  f.scene.add(holder);
  const base = V(pos);
  return {
    group: holder,
    at(t) {
      const a = easeOut((t - start) / dur);
      const out = until == null ? 1 : 1 - clamp01((t - until) / 0.3);
      mat.opacity = a * out;
      holder.visible = mat.opacity > 0.001;
      holder.position.copy(base).add(new THREE.Vector3(0, (a - 1) * rise, 0));
      if (face === "camera") holder.quaternion.copy(f.cam.quaternion);
    },
  };
}

// Distance line between two ground points a → b that draws itself, with optional end ticks and a big label.
// opts: start, dur (draw time, default 1.2 s), label ("120m"), labelAt (default: when the line lands),
// labelPos (default: midpoint raised labelHeight), labelHeight (1.2 m), labelSize (glyph height m), width (0.12 m),
// glow (halo width × core width, 5), ticks (end bars, true), color, onTop, until (fade out time).
export async function measure(f, a, b, opts = {}) {
  const { start = 0, dur = 1.2, label = null, labelHeight = 1.2, labelSize = 0.9, ticks = true, until = null,
    width = 0.12 } = opts;
  const line = glowLine(f, [a, b], { ...opts, width });
  const A = V(a), B = V(b);
  const tickLen = opts.tickLen ?? width * 6;
  const tk = [];
  if (ticks) {
    const dir = B.clone().sub(A).setY(0).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(tickLen / 2);
    for (const P of [A, B]) tk.push(glowLine(f, [P.clone().add(side).toArray(), P.clone().sub(side).toArray()], { ...opts, width: width * 0.8, glow: (opts.glow ?? 5) * 0.8 }));
  }
  let lab = null;
  const labelAt = opts.labelAt ?? start + dur * 0.85;
  if (label) {
    const mid = opts.labelPos || A.clone().lerp(B, 0.5).add(new THREE.Vector3(0, labelHeight, 0)).toArray();
    lab = await label3d(f, mid, label, { size: labelSize, start: labelAt, until, ...(opts.labelOpts || {}) });
  }
  return {
    line, label: lab, length: A.distanceTo(B),
    at(t) {
      const fade = until == null ? 1 : 1 - clamp01((t - until) / 0.3);
      const p = easeInOut((t - start) / dur);
      line.draw(p, fade);
      tk[0]?.draw(clamp01((t - start) / 0.15), fade);
      tk[1]?.draw(clamp01((t - start - dur) / 0.15), fade);
      lab?.at(t);
    },
  };
}

// A route along ground points (smoothed by default) that draws itself; optional dashes and a moving tip.
// opts: start, dur (default 2.5 s), smooth (true), dash ([on, off] m), width (0.1 m), glow, color, onTop, until.
export async function route(f, pts, opts = {}) {
  const { start = 0, dur = 2.5, smooth = true, until = null, width = 0.1 } = opts;
  const line = glowLine(f, pts, { ...opts, width, smooth });
  return {
    line,
    at(t) {
      const fade = until == null ? 1 : 1 - clamp01((t - until) / 0.3);
      line.draw(easeInOut((t - start) / dur), fade);
    },
  };
}

// A location pin: a thin stem standing on the ground, a glowing head, and one ground ring that opens once when it lands.
// opts: start, height (stem, 1.6 m), head (radius, 0.16 m), label (text above the head), labelSize, color, until.
export async function pin(f, pos, opts = {}) {
  const { start = 0, height = 1.6, head = 0.16, until = null, label = null, labelSize = 0.5 } = opts;
  const col = new THREE.Color(opts.color || ACCENT);
  const hot = new THREE.Color(col).lerp(new THREE.Color("#ffffff"), 0.35);
  const g = new THREE.Group();
  const stemMat = new THREE.MeshBasicMaterial({ color: hot, transparent: true, toneMapped: false, fog: false });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(head * 0.12, head * 0.12, height, 12), stemMat);
  stem.position.y = height / 2;
  const headMat = new THREE.MeshBasicMaterial({ color: hot, transparent: true, toneMapped: false, fog: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(head, 24, 16), headMat);
  ball.position.y = height;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lineMat(col, { glow: true }));
  halo.material.map = dotTex();
  halo.scale.setScalar(head * 7);
  halo.position.y = height;
  const ringMat = lineMat(col, { opacity: 1 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lineMat(col, { glow: true, opacity: 0.9 }));
  spot.material.map = dotTex();
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = 0.015;
  spot.scale.setScalar(head * 6);
  g.add(stem, ball, halo, ring, spot);
  g.position.set(...pos);
  f.scene.add(g);
  let lab = null;
  if (label) lab = await label3d(f, [pos[0], pos[1] + height + head + labelSize * 0.9, pos[2]], label, { size: labelSize, start: start + 0.35, until, ...(opts.labelOpts || {}) });
  return {
    group: g, label: lab,
    at(t) {
      const a = easeOut((t - start) / 0.45);
      const fade = until == null ? 1 : 1 - clamp01((t - until) / 0.3);
      g.visible = t >= start && fade > 0;
      stem.scale.y = Math.max(a, 1e-3); stem.position.y = (height * a) / 2;
      ball.position.y = halo.position.y = height * a;
      stemMat.opacity = headMat.opacity = fade;
      halo.material.opacity = 0.9 * fade;
      halo.quaternion.copy(f.cam.quaternion);
      const r = clamp01((t - start - 0.3) / 0.9);           // one ring, opens and fades (no loop)
      ring.scale.setScalar(head * (1.5 + 9 * easeOut(r)));
      ringMat.opacity = r > 0 && r < 1 ? (1 - r) * fade : 0;
      spot.material.opacity = 0.9 * a * fade;
      lab?.at(t);
    },
  };
}

// Combine marks into one per-frame updater: const marks = play(m1, m2); ... marks(t) after f.shot(...).
export function play(...marks) {
  return (t) => { for (const m of marks) m.at(t); };
}
