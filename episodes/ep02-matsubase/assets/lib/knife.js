// The kiridashi kogatana on a workbench (film kit: CC0 Poly Haven dark_wood bench, hinoki_planks handle, carpentry_shop_01
// HDRI for the steel's reflections). SPEC "3D 세트" knife.js. Only recorded dimensions are drawn:
//   blade length about 11 cm, width about 2.2 cm, back about 0.3 cm thick ([13] 85쪽, F65);
//   width 2.1 cm at 4.7 cm from the tip ([2] 9쪽 21~22행, F137), 1.5 cm at about 3.2 cm from the tip (F138).
// The shape between those stations is a plain straight slant (kiridashi = "끝이 비스듬"), the handle a plain wooden
// handle (its length is not shown or measured). No body, no wound, no cloth around the knife (BANNED).
// Modes: blade_macro → blade_width (gauges, amber = ONLY the 0.6 cm overflow), insert / handle → (later) knife_insert,
//        handle_wood (no gauges; handle mode keeps the background soft for a quote board in front).
// Coordinates: bench top y = 0; blade lying flat, back (spine) along +x at z = 0, tip at x = 0, edge side toward +z
// (so in a top view with the camera's up = -z the spine is the top edge and the tip the left end). 1 unit = 1 m.
// opts: { mode, camera, cues: { c: [t1, ..., t7] } }  — caption starts for the gauge states.
import { film, THREE, ease, clamp01 } from "../kit3d/film.js";

const AMBER = "#F0A23B";
const INK = "#E9E5DD";
const CM = 0.01;
const L = 11, WMAX = 2.2, T = 0.3;          // blade (cm)
// width from the back at distance u (cm) from the tip: straight segments through the recorded stations
const SLANT = [[0, 0], [3.2, 1.5], [4.7, 2.1], [5.2, WMAX]];
export function bladeWidth(u) {
  if (u >= SLANT[3][0]) return WMAX;
  for (let i = 0; i < 3; i++) {
    const [a, wa] = SLANT[i], [b, wb] = SLANT[i + 1];
    if (u <= b) return wa + (wb - wa) * (u - a) / (b - a);
  }
  return WMAX;
}
const BEVEL = 0.75;   // single bevel band along the slanted edge, measured along x (cm)

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Brushed-steel roughness streaks along the blade (deterministic canvas).
function streaks() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#5a5a5a"; x.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 900; i++) {
    const y = hash(i * 1.7) * 256, l = 80 + hash(i * 3.1) * 500, x0 = hash(i * 5.3) * 1024;
    const v = 60 + Math.floor(hash(i * 7.9) * 80);
    x.fillStyle = `rgba(${v},${v},${v},0.5)`;
    x.fillRect(x0, y, l, 0.6 + hash(i) * 1.2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Blade mesh: flat bottom at y = 0, flat top at y = T, a ground bevel band along the slant (top falls to the edge).
function bladeGeometry() {
  const pos = [], uv = [];
  const P = (u, w, y) => [u * CM, y * CM, w * CM];   // (u along the back, w toward the edge) → world
  const tri = (a, b, c) => { for (const p of [a, b, c]) { pos.push(...p); uv.push(p[0] / (L * CM), p[2] / (WMAX * CM)); } };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const N = 48;
  // slant polyline (edge) and its bevel line (shifted +BEVEL in u, clamped to the back)
  const edge = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const u = SLANT[3][0] * i / N;
    edge.push([u, bladeWidth(u)]);
  }
  for (const [u, w] of edge) inner.push([u + BEVEL, w]);
  const EDGE_T = 0.025;
  // bevel band (top): from edge (thin) to inner line (full thickness). At the back the band meets the spine.
  for (let i = 0; i < N; i++) {
    const [u0, w0] = edge[i], [u1, w1] = edge[i + 1];
    const [v0, x0] = inner[i], [v1, x1] = inner[i + 1];
    quad(P(u0, w0, EDGE_T), P(v0, x0, T), P(v1, x1, T), P(u1, w1, EDGE_T));
  }
  // flat top: strips in u from the inner line to the handle, between back (w = 0) and the width at that u
  const US = [];
  for (let i = 0; i <= 60; i++) US.push(BEVEL + (L - BEVEL) * i / 60);
  const innerW = (u) => (u - BEVEL >= SLANT[3][0] ? WMAX : bladeWidth(u - BEVEL));
  for (let i = 0; i < US.length - 1; i++) {
    const a = US[i], b = US[i + 1];
    quad(P(a, 0, T), P(b, 0, T), P(b, innerW(b), T), P(a, innerW(a), T));
  }
  // the bevel triangle near the tip between back and inner line (u in [0, BEVEL]): top ramps from the tip
  quad(P(0, 0, EDGE_T), P(BEVEL, 0, T), P(BEVEL, 0, T), P(0, 0, EDGE_T));
  // bottom (flat, full outline)
  for (let i = 0; i < N; i++) {
    const [u0, w0] = edge[i], [u1, w1] = edge[i + 1];
    quad(P(u0, 0, 0), P(u0, w0, 0), P(u1, w1, 0), P(u1, 0, 0));
  }
  quad(P(SLANT[3][0], 0, 0), P(SLANT[3][0], WMAX, 0), P(L, WMAX, 0), P(L, 0, 0));
  // walls: back (spine) w = 0, long edge w = WMAX, slant edge (thin)
  const backTop = (u) => (u < BEVEL ? EDGE_T + (T - EDGE_T) * u / BEVEL : T);
  for (let i = 0; i < 60; i++) {
    const a = L * i / 60, b = L * (i + 1) / 60;
    quad(P(a, 0, 0), P(a, 0, backTop(a)), P(b, 0, backTop(b)), P(b, 0, 0));
  }
  quad(P(SLANT[3][0], WMAX, 0), P(L, WMAX, 0), P(L, WMAX, T), P(SLANT[3][0] + BEVEL, WMAX, T));
  quad(P(SLANT[3][0], WMAX, 0), P(SLANT[3][0] + BEVEL, WMAX, T), P(SLANT[3][0] + BEVEL, WMAX, T), P(SLANT[3][0], WMAX, EDGE_T));
  for (let i = 0; i < N; i++) {
    const [u0, w0] = edge[i], [u1, w1] = edge[i + 1];
    quad(P(u0, w0, 0), P(u0, w0, EDGE_T), P(u1, w1, EDGE_T), P(u1, w1, 0));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  // make every face's normal face away from the solid: flip faces whose normal points into the blade
  const p = g.attributes.position, n = g.attributes.normal;
  const cx = (L / 2) * CM, cy = (T / 2) * CM, cz = (WMAX / 2) * CM;
  for (let i = 0; i < p.count; i += 3) {
    const mx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, my = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, mz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const ax = p.getX(i + 1) - p.getX(i), ay = p.getY(i + 1) - p.getY(i), az = p.getZ(i + 1) - p.getZ(i);
    const bx = p.getX(i + 2) - p.getX(i), by = p.getY(i + 2) - p.getY(i), bz = p.getZ(i + 2) - p.getZ(i);
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    // outward reference: top/bottom faces by y, walls by their side
    let ox = 0, oy = my > 1e-6 ? 1 : -1, oz = 0;   // top faces up, the bottom (y = 0) down
    if (Math.abs(ny) < 0.5 * Math.hypot(nx, ny, nz)) { ox = mx - cx; oy = 0; oz = mz - cz; if (mz < 1e-5) { ox = 0; oz = -1; } }
    if (nx * ox + ny * oy + nz * oz < 0) {
      // swap vertices 1 and 2
      for (const attr of [p, g.attributes.uv]) {
        const k = attr.itemSize, arr = attr.array;
        for (let j = 0; j < k; j++) { const t = arr[(i + 1) * k + j]; arr[(i + 1) * k + j] = arr[(i + 2) * k + j]; arr[(i + 2) * k + j] = t; }
      }
      nx = -nx; ny = -ny; nz = -nz;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    for (let j = 0; j < 3; j++) n.setXYZ(i + j, nx / l, ny / l, nz / l);
  }
  p.needsUpdate = true; n.needsUpdate = true;
  return g;
}

// Number plate: dark plate + ink numerals (canvas), lying flat on the bench, readable from the top-view camera.
async function plate(text, { w = 1.5, h = 0.62, color = INK } = {}) {
  try { await document.fonts.load('500 120px "Gothic A1"'); } catch (e) { /* preview pages have no web font */ }
  const c = document.createElement("canvas");
  c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext("2d");
  x.fillStyle = "rgba(16,18,21,0.86)"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = color; x.fillRect(0, 0, 14, c.height);
  x.fillStyle = INK;
  x.font = `500 ${Math.round(c.height * 0.62)}px "Gothic A1", sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, c.width / 2 + 7, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * CM, h * CM), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// A gauge line (flat thin bar) with end ticks, in the bench plane; from (u0, w0) to (u1, w1) in cm, y in cm.
function bar(color, width = 0.07) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02 * CM, width * CM), mat);
  const t0 = new THREE.Mesh(new THREE.BoxGeometry(width * CM, 0.02 * CM, 0.5 * CM), mat);
  const t1 = t0.clone();
  g.add(body, t0, t1);
  g.userData = { body, t0, t1 };
  g.set = (u0, w0, u1, w1, y = T + 0.06, ticks = true) => {
    const dx = (u1 - u0) * CM, dz = (w1 - w0) * CM;
    const len = Math.hypot(dx, dz);
    g.position.set(u0 * CM, y * CM, w0 * CM);
    g.rotation.set(0, -Math.atan2(dz, dx), 0);
    body.scale.x = Math.max(1e-4, len);
    body.position.x = len / 2;
    t0.position.x = 0; t1.position.x = len;
    t0.visible = t1.visible = ticks;
  };
  return g;
}

export function createKnife(stage, opts) {
  const mode = opts.mode || "blade_macro";
  const cue = (opts.cues || {}).c || [];
  return film(stage, `knife-${mode}-${stage.id}`, {
    hdri: "carpentry_shop_01", envIntensity: 0.5, exposure: 1.0, background: "#0a0b0c",
  }, async (f) => {
    const S = f.scene;
    const [benchTex, hinoki] = await Promise.all([f.material("dark_wood", { normalScale: 0.8 }), f.material("hinoki_planks", { normalScale: 0.6 })]);

    // Bench: dark wood, grain along x.
    const benchMat = f.tiled(benchTex, 1.2, 0.8);
    benchMat.color = new THREE.Color("#8c8580");
    const bench = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), benchMat);
    bench.rotation.x = -Math.PI / 2;
    bench.position.set(0.1, 0, 0.05);
    bench.receiveShadow = true;
    S.add(bench);

    // Blade (steel) and a plain wooden handle.
    const rough = streaks();
    rough.repeat.set(1, 1);
    const steel = new THREE.MeshStandardMaterial({ color: "#cfd3d5", metalness: 1, roughness: 0.32, roughnessMap: rough, envMapIntensity: 1.2 });
    const blade = new THREE.Mesh(bladeGeometry(), steel);
    blade.castShadow = true; blade.receiveShadow = true;
    S.add(blade);
    const handleMat = f.tiled(hinoki, 0.4, 0.15);
    handleMat.color = new THREE.Color("#d8c3a3");
    const HL = 9.5, HW = 2.6, HT = 1.4;
    f.box({ size: [HL * CM, HT * CM, HW * CM], radius: 0.45 * CM, material: handleMat, pos: [(L + HL / 2 - 0.2) * CM, (HT / 2) * CM, (WMAX / 2) * CM] });

    // Lights: key from the upper left (soft spot), a low grazing strip from the edge side (rim on the bevel and back),
    // the HDRI for the steel's reflections. Amber is not a light here — only the overflow bar.
    f.key({ pos: [-0.25, 0.55, -0.22], target: [0.05, 0, 0.01], intensity: 9, angle: 0.5, penumbra: 0.9, color: "#f1f0ec" });
    const rim = new THREE.SpotLight("#dfe8ee", 6, 1.5, 0.6, 0.9, 1.5);
    rim.position.set(0.06, 0.05, 0.4);
    rim.target.position.set(0.05, 0, 0);
    S.add(rim, rim.target);
    S.add(new THREE.AmbientLight("#9aa7b2", 0.05));

    // Gauges (blade_macro only).
    const G = { gauge: bar(INK), along: bar(INK, 0.05), over: bar(AMBER, 0.2), width: bar("#9aa0a4", 0.04) };
    const P = {
      p15: await plate("1.5cm"), p47: await plate("4.7cm"), p32: await plate("3.2cm"), p21: await plate("2.1cm"),
      p06: await plate("0.6cm"), le15: await plate("≤1.5cm", { w: 1.8 }),
    };
    for (const o of [...Object.values(G), ...Object.values(P)]) { o.visible = false; S.add(o); }
    const at = (o, u, w) => { o.position.set(u * CM, (T + 0.08) * CM, w * CM); o.visible = true; };

    const c = (i) => (cue[i - 1] ?? 1e9);   // caption i start (1-based)
    return (t) => {
      for (const o of [...Object.values(G), ...Object.values(P)]) { o.visible = false; o.scale.setScalar(1); }
      if (mode === "blade_macro") {
        if (t < c(2)) {                       // c1: the wound entrance, 1.5 cm, beside the tip
          G.gauge.set(0, -0.9, 1.5, -0.9, T + 0.06); G.gauge.visible = true;
          at(P.p15, 0.75, -1.55);
        } else if (t < c(3)) {                // c2: 4.7 cm from the tip along the back
          G.along.set(0, -0.55, 4.7, -0.55); G.along.visible = true;
          at(P.p47, 2.35, -1.2);
        } else if (t < c(5)) {                // c3 (and c4 behind the record cut): the 1.5 gauge across at 4.7
          G.along.set(0, -0.55, 4.7, -0.55); G.along.visible = true;
          G.gauge.set(4.7, 0, 4.7, 1.5); G.gauge.visible = true;
          at(P.le15, 6.0, 0.75);
        } else if (t < c(6)) {                // c5: the gauge slides to 3.2, where the width is 1.5
          const k = ease.inOut(clamp01((t - c(5)) / 0.9));
          const u = 4.7 + (3.2 - 4.7) * k;
          G.gauge.set(u, 0, u, 1.5); G.gauge.visible = true;
          G.along.set(0, -0.55, u, -0.55); G.along.visible = true;
          at(P.p32, u / 2, -1.2);
          if (k > 0.98) at(P.p15, 1.75, 0.75);
        } else {                              // c6, c7: at 4.7 the blade is 2.1 wide; the 0.6 over the gauge in amber
          G.gauge.set(4.7, 0, 4.7, 1.5); G.gauge.visible = true;
          G.over.set(4.7, 1.5, 4.7, 2.1, T + 0.07, false); G.over.visible = true;
          G.along.set(0, -0.55, 4.7, -0.55); G.along.visible = true;
          G.width.set(5.15, 0, 5.15, 2.1, T + 0.05); G.width.visible = true;   // the blade's width at 4.7, drawn beside
          at(P.p47, 2.35, -1.2);
          at(P.p06, 3.6, 1.8);
          at(P.p21, 6.25, 1.05);
          if (t >= c(7)) {                    // c7 (whole knife): one large plate under the overflow, the others off
            P.p47.visible = P.p21.visible = false;
            at(P.p06, 4.7, 3.9);
            P.p06.scale.setScalar(2.2);
          }
        }
      }
      f.shot(opts.camera, t);
    };
  });
}
