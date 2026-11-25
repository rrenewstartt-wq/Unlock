// Reference look for the film kit (docs/reference-look.md): look presets, leaf-shadow gobo, a deterministic grade
// (saturation, cool shadows, highlight shoulder, vignette, t-seeded grain), depth of field and camera move presets.
// film.js wires these in; a set only names them:
//
//   return film(stage, "street", { look: "unlock-day", dof: true }, async (f) => {
//     f.sun({ azimuth: -52, elevation: 24, target: [0, 1.5, 0], size: 14, leaves: { density: 1.7, leaf: 0.34 } });
//     f.hero(door, knob);                                   // the one material that keeps its colour
//     return (t) => f.shot(opts.camera, t);                 // camera: keys, or { preset: "approach", ... }
//   });
//
// Determinism: the grade, grain and leaf sway are pure functions of t (scene seconds); nothing reads a clock.
// Usage and render cost: thumbkit/LOOK.md.
import { THREE } from "./thumbkit.js";

// ---------------------------------------------------------------- accent colour (one variable)
// The accent (route lines, distance numbers, the one emphasised object) is a person's decision (STATUS user decision 5):
// amber (ours so far) or the reference's red. Change it here, or per film with film(..., { accent: "#..." }) → f.accent.
export const ACCENT = "#F0A23B";
export const ACCENT_RED = "#D8382E"; // the reference's glowing route red, kept for when the person picks it

// ---------------------------------------------------------------- clay palette (architectural-visualisation tone)
// Walls, roofs, floors and furniture are matte grey-white with weak texture; only the hero material is real.
export const CLAY = {
  wall: "#c9c6c0",     // stucco / plaster
  wallDark: "#a9a6a1",
  trim: "#8e8c88",     // sills, gutters, fascia
  roof: "#55585d",
  block: "#a3a19c",    // concrete block fence
  ground: "#6a6966",   // asphalt / earth seen from above
  concrete: "#a8a6a1",
  frame: "#2c2e31",    // window frames, aluminium
  glass: "#0d1014",
  fabric: "#b8b6b2",   // curtains
  foliage: "#3d4339",
};

// ---------------------------------------------------------------- look presets
// film: options merged under the film's own (explicit options win). grade: the post-process (see Grade below).
// sun: defaults for f.sun(). Numbers were tuned against data/benchmark/unlock_kr/raw/screen-rec (look_check.py --ref).
export const LOOKS = {
  "unlock-day": {   // low sun through leaves on clay buildings, cool shadows, almost monochrome
    film: { hdri: "kloofendal_misty_morning_puresky", envIntensity: 0.07, exposure: 1.0, background: "#2a2f37",
      fog: { color: "#2a2f37", density: 0.006 } },
    sun: { color: "#fff3e2", intensity: 3.6, elevation: 24 },
    grade: { saturation: 0.2, heroSaturation: 0.5, shadowTint: [-0.02, -0.004, 0.07], tint: [-0.012, 0, 0.022],
      gamma: 1.3, knee: 0.36, ceiling: 0.58, vignette: 0.45, grain: 0.045, black: 0.0 },
  },
  "unlock-night": { // navy dark, one cool moon/street key through leaves, one window
    film: { hdri: "evening_road_01_puresky", envIntensity: 0.05, exposure: 1.0, background: "#0b0f17",
      fog: { color: "#0e131c", density: 0.012 } },
    sun: { color: "#c9d6ee", intensity: 1.6, elevation: 32 },
    grade: { saturation: 0.3, heroSaturation: 0.8, shadowTint: [-0.01, 0.0, 0.045], tint: [-0.01, 0, 0.02],
      gamma: 1.05, knee: 0.3, ceiling: 0.5, vignette: 0.5, grain: 0.05, black: 0.0 },
  },
  "unlock-interior": { // grey-blue haze, light from one window/board, faces lost in the dark
    film: { hdri: "blinds", envIntensity: 0.1, exposure: 1.0, background: "#151920",
      fog: { color: "#3a4049", density: 0.045 } },
    sun: { color: "#e6ecf5", intensity: 2.2, elevation: 30 },
    grade: { saturation: 0.15, heroSaturation: 0.7, shadowTint: [-0.008, 0.0, 0.03], tint: [-0.004, 0, 0.01],
      gamma: 1.0, knee: 0.34, ceiling: 0.5, vignette: 0.55, grain: 0.05, black: 0.02 },
  },
};

const GRADE_DEFAULT = { ...LOOKS["unlock-day"].grade, maxBlur: 26, blurTaps: 40, dofQuality: 0.5 };

// Merge a look preset under the film options. Returns { opts, grade } (grade null when neither look nor grade is set).
export function resolveLook(o = {}) {
  const L = typeof o.look === "string" ? LOOKS[o.look] : o.look;
  if (o.look && !L) throw new Error(`unknown look "${o.look}" (${Object.keys(LOOKS).join(", ")})`);
  if (!L && !o.grade) return { opts: o, grade: null, sun: null };
  const opts = { ...(L ? L.film : {}), ...o };
  const grade = { ...GRADE_DEFAULT, ...(L ? L.grade : {}), ...(o.grade || {}), dof: !!o.dof };
  return { opts, grade, sun: L ? L.sun : null };
}

// ---------------------------------------------------------------- deterministic random
export function rng(seed = 1) {
  let s = (Math.floor(seed * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// ---------------------------------------------------------------- leaf shadows (gobo)
// A SpotLight "sun" far away with a procedural canopy texture as its light map (three's SpotLight.map), so walls,
// doors and the ground get dappled leaf shadows. The canopy is drawn on a canvas from a fixed seed; sway moves each
// branch by a sine of t, so the pattern is a pure function of t.
//   size: diameter (m) of the sunlit circle at the target — keep the whole shot inside it (outside is shade)
//   density: canopy amount (≈ share of the circle in leaf shade; 1–2 = mostly shade with sun flecks, like the reference)
//   leaf: leaf length (m) · soft: edge blur (m) · sway: branch sway amplitude (m) · bias: -1…+1 canopy to one side
//   lit: [[x, y, z, r], …] keep these world points in sun (a gap in the canopy for the hero)
export function leafShadows(f, { sun = null, target = [0, 1, 0], size = 20, density = 1.5, leaf = 0.4, sway = 0.04,
  soft = 0.017, seed = 3, bias = 0, intensity = null, color = null, dist = 45, res = 2048, swayHz = 0.35, lit = [] } = {}) {
  const preset = f.lookSun || {};
  let light = sun && sun.isSpotLight ? sun : null;
  if (!light) {
    const tgt = new THREE.Vector3(...target);
    const pos = Array.isArray(sun) ? new THREE.Vector3(...sun) : tgt.clone().add(new THREE.Vector3(-0.6, 0.45, 0.65).normalize().multiplyScalar(dist));
    light = new THREE.SpotLight(color || preset.color || "#ffffff", intensity ?? preset.intensity ?? 4, 0, 0.3, 0.25, 0);
    light.position.copy(pos);
    light.target.position.copy(tgt);
    f.scene.add(light, light.target);
  }
  const d = light.position.distanceTo(light.target.position);
  light.angle = Math.atan((size / 2) / d);       // the light map spans exactly size × size at the target
  light.penumbra = Math.max(light.penumbra, 0.2);
  light.castShadow = true;
  light.shadow.mapSize.set(f.shadowSize || 2048, f.shadowSize || 2048);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.003;
  light.shadow.radius = 3;
  light.shadow.camera.near = Math.max(0.5, d - 60);
  light.shadow.camera.far = d + 60;

  light.updateMatrixWorld(); light.target.updateMatrixWorld();
  light.shadow.updateMatrices(light);
  const holes = lit.map(([hx, hy, hz, hr = 0.3]) => {
    const v = new THREE.Vector4(hx, hy, hz, 1).applyMatrix4(light.shadow.matrix);
    return [v.x / v.w * res, (1 - v.y / v.w) * res, hr * res / size];
  });
  const c = document.createElement("canvas");      // the light map (blurred)
  c.width = c.height = res;
  const out = c.getContext("2d");
  const sharp = document.createElement("canvas");  // leaves are drawn sharp here, then blurred once onto c
  sharp.width = sharp.height = res;
  const x = sharp.getContext("2d");
  const R = rng(seed);
  const px = res / size;                       // canvas pixels per metre at the target
  // Sprays (radius 1.4–3.4 m) are placed until their area reaches density × size².
  const branches = [];
  let covered = 0;
  const want = density * size * size;
  for (let i = 0; covered < want && i < 400; i++) {
    let u = R();
    if (bias) u = bias > 0 ? Math.pow(u, 1 / (1 + 2 * bias)) : 1 - Math.pow(1 - u, 1 / (1 - 2 * bias));
    const rm = 1.4 + R() * 2.0;
    const b = { x: u * res, y: R() * res, r: rm * px, ph: R() * 6.283, ph2: R() * 6.283, leaves: [], twigs: [] };
    // a spray: 5–9 twigs fanning from one point, leaves in alternate pairs along each twig, angled forward
    // twig count scales with 1/leaf so the shadowed share stays ~density whatever the leaf size
    const fan = R() * 6.283, nt = Math.round((5 + Math.floor(R() * 5)) * Math.min(2.2, Math.max(0.6, 0.43 / leaf)));
    for (let k = 0; k < nt; k++) {
      const a = fan + (k / nt - 0.5) * (2.2 + R() * 2.0) + (R() - 0.5) * 0.3;
      const len = rm * px * (0.55 + R() * 0.45);
      const bend = (R() - 0.5) * 0.6;
      b.twigs.push({ a, len, bend });
      const step = leaf * px * (0.42 + R() * 0.12);
      for (let d = step * 0.8, side = 1; d < len; d += step * 0.5, side = -side) {
        const aa = a + bend * (d / len);
        const l = leaf * px * (0.75 + R() * 0.5) * (0.7 + 0.3 * Math.min(1, d / (len * 0.4)));
        const rot = aa + side * (0.5 + R() * 0.45);
        const cx = Math.cos(aa) * d + Math.cos(rot) * l * 0.5, cy = Math.sin(aa) * d + Math.sin(rot) * l * 0.5;
        b.leaves.push({ dx: cx, dy: cy, rot, l, w: 0.32 + R() * 0.2, ph: R() * 6.283 });
      }
    }
    branches.push(b);
    covered += Math.PI * rm * rm * 0.55;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  let last = null;
  const draw = (t) => {
    if (last !== null && (sway === 0 || last === t)) return;
    last = t;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, res, res);
    x.fillStyle = "#080808";
    const w = 6.283 * swayHz;
    for (const b of branches) {
      const ox = sway * px * Math.sin(w * t + b.ph), oy = sway * px * 0.6 * Math.sin(w * 0.73 * t + b.ph2);
      for (const l of b.leaves) {
        const lx = b.x + ox + l.dx, ly = b.y + oy + l.dy;
        if (holes.some(([hx, hy, hr]) => (lx - hx) ** 2 + (ly - hy) ** 2 < (hr + l.l * 0.5) ** 2)) continue;
        const fl = 0.18 * Math.sin(w * 1.9 * t + l.ph) * (sway > 0 ? 1 : 0);
        x.save();
        x.translate(lx, ly);
        x.rotate(l.rot + fl);
        x.beginPath();               // pointed leaf: two quadratic arcs
        x.moveTo(-l.l / 2, 0);
        x.quadraticCurveTo(0, -l.l * l.w, l.l / 2, 0);
        x.quadraticCurveTo(0, l.l * l.w, -l.l / 2, 0);
        x.fill();
        x.restore();
      }
    }
    // twigs so sprays read as branches, not confetti
    x.strokeStyle = "#080808";
    x.lineWidth = Math.max(1.2, 0.018 * px);
    for (const b of branches) {
      const ox = sway * px * Math.sin(w * t + b.ph), oy = sway * px * 0.6 * Math.sin(w * 0.73 * t + b.ph2);
      for (const tw of b.twigs) {
        x.beginPath(); x.moveTo(b.x + ox, b.y + oy);
        const ae = tw.a + tw.bend;
        x.quadraticCurveTo(b.x + ox + Math.cos(tw.a) * tw.len * 0.5, b.y + oy + Math.sin(tw.a) * tw.len * 0.5, b.x + ox + Math.cos(ae) * tw.len, b.y + oy + Math.sin(ae) * tw.len);
        x.stroke();
      }
    }
    out.filter = `blur(${Math.max(0.5, soft * px).toFixed(2)}px)`;
    out.fillStyle = "#ffffff";
    out.fillRect(0, 0, res, res);
    out.drawImage(sharp, 0, 0);
    out.filter = "none";
    tex.needsUpdate = true;
  };
  draw(0);
  light.map = tex;
  light.userData.leaves = draw;
  f.onFrame((t) => draw(t));
  return light;
}

// ---------------------------------------------------------------- camera presets
// Each returns camera keys ([{t, pos, look, fov, focus?, aperture?, ease}]) for cameraAt()/f.shot(). Every preset
// moves from t0 to t1 (no still cut) and decelerates softly at the end ("glide": velocity 2→0 over the cut, never a
// hold). Angles in degrees; azimuth 0 = camera on the +z side of the target looking toward -z, 90 = on the +x side.
// From Python (scenes_kit/scene opts) pass the same thing as JSON: "camera": {"preset": "approach", "target": [...]}
// or a list of such objects for a multi-cut scene (each later one starts with a hard cut).
const glide = (x) => 1 - (1 - x) * (1 - x);
const V = (a) => new THREE.Vector3(...a);
const dirAz = (az) => new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(az)), 0, Math.cos(THREE.MathUtils.degToRad(az)));
const arr = (v) => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];
const lerp = (a, b, k) => a + (b - a) * k;

function sample(t0, t1, n, fn, extra = {}) {
  const keys = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const k = glide(u);
    const c = fn(k);
    keys.push({ t: +(t0 + (t1 - t0) * u).toFixed(4), pos: arr(c.pos), look: arr(c.look), fov: +c.fov.toFixed(3),
      ...(c.focus !== undefined ? { focus: +c.focus.toFixed(4) } : {}), ...(c.aperture !== undefined ? { aperture: c.aperture } : {}),
      ...(i ? { ease: "linear" } : {}), ...extra });
  }
  return keys;
}

export const cam = {
  // Drone establishing shot: high above, descending and pushing in while orbiting a little.
  aerialDescend({ target = [0, 0, 0], t0 = 0, t1 = 5, azimuth = 200, orbit = 10, height = [22, 11], dist = [16, 10],
    fov = [40, 36], lookLift = [0, 0.8], n = 16 } = {}) {
    const T = V(target);
    return sample(t0, t1, n, (k) => {
      const d = dirAz(azimuth + orbit * k);
      return { pos: T.clone().addScaledVector(d, lerp(dist[0], dist[1], k)).setY(T.y + lerp(height[0], height[1], k)),
        look: T.clone().setY(T.y + lerp(lookLift[0], lookLift[1], k)), fov: lerp(fov[0], fov[1], k) };
    });
  },
  // Walk up to a subject (door, window) at standing height, drifting slightly sideways.
  approach({ target = [0, 1, 0], t0 = 0, t1 = 4, azimuth = 0, from = 6, to = 2.4, height = 1.55, drift = 0.35, fov = [36, 34],
    lookHeight = null, aperture = undefined, n = 12 } = {}) {
    const T = V(target), d = dirAz(azimuth), side = new THREE.Vector3(d.z, 0, -d.x);
    const ly = lookHeight ?? T.y;
    return sample(t0, t1, n, (k) => {
      const pos = T.clone().addScaledVector(d, lerp(from, to, k)).addScaledVector(side, drift * (1 - k)).setY(lerp(height + 0.08, height, k));
      const look = T.clone().setY(ly);
      return { pos, look, fov: lerp(fov[0], fov[1], k), ...(aperture ? { aperture, focus: pos.distanceTo(look) } : {}) };
    });
  },
  // Close-up push on a small object (door knob) with shallow focus held on it.
  macroPush({ target = [0, 1, 0], t0 = 0, t1 = 4, azimuth = 30, elevation = 8, from = 0.62, to = 0.36, fov = [30, 28],
    aperture = 4, arc = 6, n = 12 } = {}) {
    const T = V(target);
    return sample(t0, t1, n, (k) => {
      const az = THREE.MathUtils.degToRad(azimuth - arc * k), el = THREE.MathUtils.degToRad(elevation);
      const r = lerp(from, to, k);
      const pos = T.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(r));
      return { pos, look: T.clone(), fov: lerp(fov[0], fov[1], k), focus: r, aperture };
    });
  },
  // Over-the-shoulder follow of a walker going from → to (the walker must use the same t0, t1 and constant speed).
  followBack({ from = [0, 0, 4], to = [0, 0, 0], t0 = 0, t1 = 4, back = 1.7, side = 0.42, height = 1.6, lookAhead = 4,
    lookHeight = 1.25, fov = 38, catchUp = 0.35, aperture = undefined, n = 12 } = {}) {
    const A = V(from), B = V(to), dir = B.clone().sub(A).setY(0).normalize(), right = new THREE.Vector3(-dir.z, 0, dir.x);
    const keys = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const s = A.clone().lerp(B, u);                                   // walker at constant speed
      const b = back + catchUp * (1 - glide(u));                        // camera closes in a little, then rides along
      const pos = s.clone().addScaledVector(dir, -b).addScaledVector(right, side).setY(height);
      const look = s.clone().addScaledVector(dir, lookAhead).setY(lookHeight);
      keys.push({ t: +(t0 + (t1 - t0) * u).toFixed(4), pos: arr(pos), look: arr(look), fov,
        ...(aperture ? { aperture, focus: b } : {}), ...(i ? { ease: "linear" } : {}) });
    }
    return keys;
  },
  // Slow sideways slide past a wall/window, looking at the target with a slight lead.
  lateralDrift({ target = [0, 1, 0], t0 = 0, t1 = 5, azimuth = 0, dist = 6, travel = 1.6, height = null, lead = 0.25,
    fov = 34, rise = 0, aperture = undefined, n = 12 } = {}) {
    const T = V(target), d = dirAz(azimuth), side = new THREE.Vector3(d.z, 0, -d.x);
    const y = height ?? T.y;
    return sample(t0, t1, n, (k) => {
      const s = (k - 0.5) * travel;
      const pos = T.clone().addScaledVector(d, dist).addScaledVector(side, s).setY(y + rise * k);
      const look = T.clone().addScaledVector(side, s * lead);
      return { pos, look, fov, ...(aperture ? { aperture, focus: pos.distanceTo(look) } : {}) };
    });
  },
};

// Resolve a camera spec: keys array (as is), { preset, ...args }, or a list of presets (cuts between them).
const _resolved = new WeakMap();
export function cameraKeys(spec) {
  if (!spec) return null;
  if (Array.isArray(spec) && (spec.length === 0 || spec[0].pos)) return spec;
  if (_resolved.has(spec)) return _resolved.get(spec);
  const list = Array.isArray(spec) ? spec : [spec];
  const keys = [];
  list.forEach((s, i) => {
    const fn = cam[s.preset];
    if (!fn) throw new Error(`unknown camera preset "${s.preset}" (${Object.keys(cam).join(", ")})`);
    const k = fn(s);
    if (i) k[0] = { ...k[0], cut: true };
    keys.push(...k);
  });
  _resolved.set(spec, keys);
  return keys;
}

// ---------------------------------------------------------------- the grade (post-process)
// scene → linear HDR target (MSAA, depth) → [depth of field at half resolution] → one full-screen pass:
// exposure + ACES (same curve as the plain film kit) → sRGB → saturation (hero keeps more) → cool shadows →
// gamma → highlight shoulder (knee → ceiling, nothing reaches white) → vignette → grain seeded by the frame of t.
// Hero mask: materials marked with f.hero() write alpha 0 into the scene target.
const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DEPTH = `
uniform sampler2D tDepth; uniform float uNear; uniform float uFar;
float linDepth(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
uniform float uFocus; uniform float uCocScale; uniform float uMaxCoc;
float coc(float d) { return clamp(uCocScale * (d - uFocus) / max(d, 1e-3), -uMaxCoc, uMaxCoc); }`;

const BLUR_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform vec2 uTexel; uniform float uLod;
${DEPTH}
#define TAPS ${"__TAPS__"}
void main() {
  float d0 = linDepth(vUv); float k0 = coc(d0); float r0 = abs(k0);
  vec3 acc = textureLod(tColor, vUv, 0.0).rgb; float wsum = 1.0; float fg = 0.0;
  float rot = 6.2831 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / float(TAPS)) * uMaxCoc;
    float a = fi * 2.39996323 + rot;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
    float d = linDepth(uv); float rs = abs(coc(d));
    if (d > d0) rs = min(rs, r0);                 // a sharp thing in front is not covered by the blur behind it
    float w = clamp(rs - r + 1.5, 0.0, 1.0);
    acc += texture2DLodEXT_(tColor, uv, uLod) * w; wsum += w;
    if (d < d0 - 0.05) fg = max(fg, w * smoothstep(1.0, 6.0, rs));
  }
  gl_FragColor = vec4(acc / wsum, max(smoothstep(1.2, 4.0, r0), fg));   // CoC under ~1 px stays sharp
}`.replace("texture2DLodEXT_(tColor, uv, uLod)", "textureLod(tColor, uv, uLod).rgb");

const GRADE_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tBlur; uniform float uDof;
uniform float uExposure, uSat, uHeroSat, uGamma, uKnee, uCeil, uVig, uGrain, uBlack, uSeed, uAspect;
uniform vec3 uShadowTint, uTint;
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 color) {   // three.js ACESFilmicToneMapping, so a look film matches the plain kit before the grade
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = ACESInputMat * color; color = RRTAndODTFit(color); color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float shoulder(float x) { float r = uCeil - uKnee; return x < uKnee ? x : uKnee + r * (1.0 - exp(-(x - uKnee) / r)); }
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec4 s = texture2D(tColor, vUv);
  float hero = clamp(1.0 - s.a, 0.0, 1.0);
  vec3 c = s.rgb;
  if (uDof > 0.5) { vec4 b = texture2D(tBlur, vUv); c = mix(c, b.rgb, b.a); }
  c = srgb(aces(c));
  float L = luma(c);
  c = mix(vec3(L), c, mix(uSat, uHeroSat, hero));
  c += uShadowTint * (1.0 - smoothstep(0.0, 0.45, L)) + uTint * (1.0 - hero);
  c = max(c, 0.0);
  c = pow(c, vec3(uGamma));
  c = max(c - uBlack, 0.0) / (1.0 - uBlack) ;
  L = luma(c);
  c *= shoulder(L) / max(L, 1e-4);
  c = min(c, vec3(uCeil + 0.04));
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  c *= 1.0 - uVig * smoothstep(0.18, 0.95, length(q) * 1.05);
  float g = (h12(gl_FragCoord.xy + uSeed * 17.13) + h12(gl_FragCoord.xy * 1.37 + uSeed * 9.71 + 3.1) - 1.0);
  c += uGrain * g * (0.3 + 0.7 * sqrt(clamp(luma(c) * 2.0, 0.0, 1.0)));
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class Grade {
  constructor(f, o) {
    this.f = f;
    this.o = o;
    const r = f.renderer;
    const w = f.w, h = f.h;
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, samples: o.samples ?? 4, depthTexture: new THREE.DepthTexture(w, h),
      generateMipmaps: !!o.dof, minFilter: o.dof ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter,
    });
    this.sceneRT.texture.generateMipmaps = !!o.dof;
    const q = o.dofQuality ?? 0.5;
    this.blurRT = new THREE.WebGLRenderTarget(Math.round(w * q), Math.round(h * q), { type: THREE.HalfFloatType });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    this.quad = quad;
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.qscene = new THREE.Scene();
    this.qscene.add(quad);
    const depthU = () => ({ tDepth: { value: this.sceneRT.depthTexture }, uNear: { value: 0.1 }, uFar: { value: 100 },
      uFocus: { value: 5 }, uCocScale: { value: 0 }, uMaxCoc: { value: o.maxBlur } });
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: BLUR_FS.replace("__TAPS__", String(o.blurTaps)), depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: this.sceneRT.texture }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, uLod: { value: 1.5 }, ...depthU() },
    });
    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: GRADE_FS, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        tColor: { value: this.sceneRT.texture }, tBlur: { value: this.blurRT.texture }, uDof: { value: 0 },
        uExposure: { value: r.toneMappingExposure }, uSat: { value: o.saturation }, uHeroSat: { value: o.heroSaturation },
        uGamma: { value: o.gamma }, uKnee: { value: o.knee }, uCeil: { value: o.ceiling }, uVig: { value: o.vignette },
        uGrain: { value: o.grain }, uBlack: { value: o.black }, uSeed: { value: 0 }, uAspect: { value: w / h },
        uShadowTint: { value: new THREE.Vector3(...o.shadowTint) }, uTint: { value: new THREE.Vector3(...o.tint) },
      },
    });
    this.fps = o.fps || 30;
  }

  set(k, v) { this.o[k] = v; }

  render(t = 0) {
    const f = this.f, r = f.renderer, cam = f.cam, o = this.o;
    const U = this.gradeMat.uniforms;
    // live overrides (a set may animate exposure etc. as a function of t)
    U.uExposure.value = r.toneMappingExposure;
    U.uSat.value = o.saturation; U.uHeroSat.value = o.heroSaturation; U.uGamma.value = o.gamma; U.uKnee.value = o.knee;
    U.uCeil.value = o.ceiling; U.uVig.value = o.vignette; U.uGrain.value = o.grain; U.uBlack.value = o.black;
    U.uSeed.value = Math.round(t * this.fps) % 9973;   // one grain pattern per video frame, same every render
    const tm = r.toneMapping;
    r.setClearColor(0x000000, 1);
    r.setRenderTarget(this.sceneRT);
    r.render(f.scene, cam);
    const ap = cam.userData.aperture || 0;
    const dof = o.dof && (ap > 0 || this._warm);
    U.uDof.value = dof && ap > 0 ? 1 : 0;
    if (dof) {
      const B = this.blurMat.uniforms;
      // thin lens on a 24 mm-tall sensor: f = 12 / tan(fov/2) mm; CoC (mm) = f² / (N (S - f)) · |d - S| / d → pixels
      const fmm = 12 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      const S = Math.max(cam.userData.focus || 3, fmm / 1000 + 0.01);
      const cmm = (fmm * fmm) / (Math.max(ap, 0.5) * (S * 1000 - fmm));
      B.uFocus.value = S;
      B.uCocScale.value = ap > 0 ? cmm * (f.h / 24) * 0.5 : 0;   // radius, not diameter
      B.uNear.value = cam.near; B.uFar.value = cam.far;
      B.uMaxCoc.value = o.maxBlur;
      B.uLod.value = Math.max(0, Math.log2(o.maxBlur / Math.sqrt(o.blurTaps)) - 0.5);
      this.quad.material = this.blurMat;
      r.setRenderTarget(this.blurRT);
      r.render(this.qscene, this.ortho);
    }
    this.quad.material = this.gradeMat;
    r.setRenderTarget(null);
    r.toneMapping = THREE.NoToneMapping;
    r.render(this.qscene, this.ortho);
    r.toneMapping = tm;
  }

  // Compile every pass inside buildReady (a shader compiled during a seek is slow).
  warm(t = 0) { this._warm = true; this.render(t); this._warm = false; }
}

// Mark meshes as the hero material: they keep heroSaturation in the grade (alpha 0 in the scene target = mask).
export function markHero(...objs) {
  for (const root of objs) root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      if (m.userData.hero) return m;
      const h = m.clone();
      h.userData.hero = true;
      const prev = h.onBeforeCompile;
      h.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r);
        sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, "  gl_FragColor.a = 0.0;\n}");
      };
      h.customProgramCacheKey = () => "hero";
      return h;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}
