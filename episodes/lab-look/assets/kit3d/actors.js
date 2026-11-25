// Film kit actors: clothed, haired people that really walk, sit, turn and shake their heads (character-animator).
//
//   import { actor, faceBlur } from "../kit3d/actors.js";
//   const girl = await actor(f, "schoolgirl", { path: [[0, 6], [0, 2], [1, 0]], at: 0.5, face: "plain" });
//   const cop = await actor(f, "man_sweater", { seat: [1.2, 0.46, -0.4], yaw: Math.PI, clip: "sit", face: "blur" });
//   const blur = faceBlur(f, [cop]);                  // CSS backdrop blur over faces (reference: investigators' faces)
//   return (t) => { girl.pose(t); cop.pose(t); f.shot(cam, t); blur(t); };
//
// Assets (all CC0, scripts/thumb_assets.py figures + actors → thumbkit/cache/figures/):
//   body   Quaternius Universal Base Characters [Standard] (Superhero_Male/Female_FullBody, textures stripped)
//   motion Quaternius Universal Animation Library 1 + 2 [Standard] (same 65-bone rig; in-place versions)
//   hair   Universal Base Characters hairstyles, rigged to the head bone (normal map kept, colour tinted here)
// Clothes are tailored from the body mesh at load (deterministic): each garment is its own skinned mesh cut from the
// body's triangles, re-fitted in the bind pose (loose tubes for sleeves and trouser legs, cloth hanging from the chest
// instead of following the muscles), smoothed, offset, with a hem strip; the skin under it is removed so nothing pokes
// through in any pose. Skirts and jacket skirts are generated rings skinned to the pelvis and both thighs. Fold relief
// and cloth tone are computed in the shader from bind-pose coordinates, so folds ride with the cloth.
//
// Motion is a pure function of t: AnimationAction.time and weights are set from t, then mixer.update(0). No clock.
import * as THREE from "../lib/three.module.min.js";
import { GLTFLoader } from "./addons/loaders/GLTFLoader.js";
import { clone as skelClone } from "./addons/utils/SkeletonUtils.js";
import { CACHE } from "./thumbkit.js";

const loader = new GLTFLoader();
const files = {};
const load = (url) => (files[url] ||= loader.loadAsync(url));
const ACT = () => `${CACHE}/figures/actors`;

// ---------------------------------------------------------------------------------------------------------------
// Clips: short name → [file, clip name, loops]. UAL1 = Universal Animation Library, UAL2 = its second volume.
export const CLIPS = {
  idle: ["UAL1", "Idle_Loop", true],               // standing, breathing
  walk: ["UAL1", "Walk_Loop", true],               // 1.3 m per 1.333 s cycle on the mannequin
  walkFormal: ["UAL1", "Walk_Formal_Loop", true],  // stiffer walk, same stride
  talk: ["UAL1", "Idle_Talking_Loop", true],       // standing, hands moving while talking
  sit: ["UAL1", "Sitting_Idle_Loop", true],        // seated, breathing
  sitTalk: ["UAL1", "Sitting_Talking_Loop", true], // seated, talking with hands
  sitDown: ["UAL1", "Sitting_Enter", false],       // stand → sit (1.3 s)
  standUp: ["UAL1", "Sitting_Exit", false],        // sit → stand
  interact: ["UAL1", "Interact", false],           // reach out with a hand (door, switch)
  pickUp: ["UAL1", "PickUp_Table", false],         // pick something up from a table
  kneel: ["UAL1", "Fixing_Kneeling", true],        // kneeling, working with the hands
  crouch: ["UAL1", "Crouch_Idle_Loop", true],
  no: ["UAL2", "Idle_No_Loop", true],              // standing head shake
  yes: ["UAL2", "Yes", false],                     // nod
  foldArms: ["UAL2", "Idle_FoldArms_Loop", true],
  phone: ["UAL2", "Idle_TalkingPhone_Loop", true],
  carry: ["UAL2", "Walk_Carry_Loop", true],        // walking with a box
  lean: ["UAL2", "Idle_Rail_Loop", true],          // leaning on a rail
};
const WALK_CYCLE_M = 1.3;                          // root-motion distance of Walk_Loop per cycle (UAL1_Standard_RM)

// ---------------------------------------------------------------------------------------------------------------
// Kinds. Colours are sRGB hex. Every field can be overridden through opts (opts.colors, opts.hair, opts.scale ...).
const SKIN = "#b39a86";
export const KINDS = {
  // High-school girl, summer uniform: white long-sleeve blouse tucked into a navy pleated knee skirt, navy socks, loafers.
  schoolgirl: { body: "F", scale: 0.9, hair: "bob", top: { type: "blouse", sleeve: "long" }, skirt: { length: "knee", pleats: 18, flare: 1.18 },
    legwear: { top: 0.40 }, colors: { skin: SKIN, hair: "#1c1714", top: "#d8d6d0", skirt: "#262a36", legwear: "#22252e", shoes: "#16130f" } },
  // Woman: blouse + mid-calf skirt.
  woman: { body: "F", scale: 0.93, hair: "long", top: { type: "blouse", sleeve: "long" }, skirt: { length: "calf", pleats: 0, flare: 1.22 },
    colors: { skin: SKIN, hair: "#2a211b", top: "#b9b4aa", skirt: "#3d3a36", shoes: "#1d1a17" } },
  // Woman in a cardigan-like sweater and trousers.
  woman_sweater: { body: "F", scale: 0.93, hair: "buns", top: { type: "sweater", sleeve: "long" }, bottom: { type: "trousers" },
    colors: { skin: SKIN, hair: "#2a211b", top: "#6e6a62", bottom: "#33312e", shoes: "#1d1a17" } },
  // Man: shirt tucked into trousers, belt.
  man_shirt: { body: "M", scale: 0.97, hair: "parted", top: { type: "shirt", sleeve: "long" }, bottom: { type: "trousers", belt: true },
    colors: { skin: SKIN, hair: "#1f1b18", top: "#c9c6bf", bottom: "#34332f", shoes: "#151311", belt: "#1a1714" } },
  // Man: crew-neck sweater over trousers (the investigators in the reference meeting room).
  man_sweater: { body: "M", scale: 0.97, hair: "parted", top: { type: "sweater", sleeve: "long" }, bottom: { type: "trousers" },
    colors: { skin: SKIN, hair: "#1f1b18", top: "#4a4a4c", bottom: "#2e2d2b", shoes: "#151311" } },
  // Man: suit jacket over a shirt, trousers.
  man_jacket: { body: "M", scale: 0.97, hair: "short", top: { type: "jacket", sleeve: "long" }, bottom: { type: "trousers" },
    colors: { skin: SKIN, hair: "#1b1816", top: "#38383a", shirt: "#c4c1ba", bottom: "#38383a", shoes: "#141210" } },
};

const HAIR = {
  bob: { file: "Hair_Long", cut: 0.075 },         // the long cut trimmed at the jaw line (bob)
  long: { file: "Hair_Long" },
  buns: { file: "Hair_Buns" },
  parted: { file: "Hair_SimpleParted" },
  short: { file: "Hair_Buzzed" },
};

// ---------------------------------------------------------------------------------------------------------------
// Shader: cloth folds (bump from bind-pose noise), tone variation, ribs. Shared by every garment material.
const GLSL_NOISE = `
float a_h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float a_vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(a_h3(i), a_h3(i + vec3(1,0,0)), f.x), mix(a_h3(i + vec3(0,1,0)), a_h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(a_h3(i + vec3(0,0,1)), a_h3(i + vec3(1,0,1)), f.x), mix(a_h3(i + vec3(0,1,1)), a_h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 a_perturb(vec3 sp, vec3 n, vec2 d, float fd){
  vec3 sx = normalize(dFdx(sp)), sy = normalize(dFdy(sp));
  vec3 r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1) * fd;
  return normalize(abs(det) * n - sign(det) * (d.x * r1 + d.y * r2)); }
`;

function clothMaterial(color, { rough = 0.9, fold = 0.006, tone = 0.12, rib = null, sheen = 0, inner = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, side: THREE.DoubleSide });
  if (sheen) { m.roughness = rough - sheen; }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFold = { value: fold };
    sh.uniforms.uTone = { value: tone };
    sh.uniforms.uRib = { value: new THREE.Vector4(...(rib || [0, 0, 0, 0])) };  // (y0, y1, armX, depth)
    sh.vertexShader = "attribute vec3 fold;\nvarying vec3 vRest;\nvarying vec3 vFold;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nvRest = position; vFold = fold;");
    sh.fragmentShader = "uniform float uFold;\nuniform float uTone;\nuniform vec4 uRib;\nvarying vec3 vRest;\nvarying vec3 vFold;\n" + GLSL_NOISE +
      sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
  float a_n1 = a_vn(vRest * vFold);
  float a_n2 = a_vn(vRest * vFold * 2.3 + 7.1);
  float a_fold = smoothstep(0.15, 0.85, 0.65 * a_n1 + 0.35 * a_n2);            // soft folds
  diffuseColor.rgb *= (1.0 - uTone * 0.5) + uTone * a_vn(vRest * 5.0 + 3.0);    // cloth tone, not flat CG colour
  diffuseColor.rgb *= mix(0.88, 1.0, a_fold);                                    // folds hold a little shade
  ${inner ? "if (!gl_FrontFacing) diffuseColor.rgb *= 0.35;" : ""}`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
  {
    vec3 a_sp = -vViewPosition;
    float a_h = uFold * a_fold;
    float a_ang = atan(vRest.z, vRest.x);
    float a_r = 0.0;
    if (uRib.w > 0.0) {   // knitted ribs at the hem band and the cuffs
      if (vRest.y > uRib.x && vRest.y < uRib.y && abs(vRest.x) < 0.25) a_r = 1.0;
      if (abs(vRest.x) > uRib.z) a_r = 1.0;
      a_h += a_r * uRib.w * sin((abs(vRest.x) > uRib.z ? atan(vRest.z, vRest.y) * 40.0 : a_ang * 70.0));
    }
    vec2 a_d = vec2(dFdx(a_h) / max(length(dFdx(a_sp)), 1e-6), dFdy(a_h) / max(length(dFdy(a_sp)), 1e-6));
    normal = a_perturb(a_sp, normal, clamp(a_d, -1.5, 1.5), faceDirection);
  }`);
  };
  m.customProgramCacheKey = () => `actor-cloth-${inner}`;
  return m;
}

function skinMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, vertexColors: true });
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry helpers (bind pose).
function weldMap(pos) {
  const key = new Map();
  const canon = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    if (!key.has(k)) key.set(k, i);
    canon[i] = key.get(k);
  }
  return canon;
}

function neighbours(index, canon, n) {
  const nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < index.length; t += 3) {
    const a = canon[index[t]], b = canon[index[t + 1]], c = canon[index[t + 2]];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  return nb;
}

// Taubin smoothing (no shrink). w[i] = 0..1 per vertex (0 = pinned).
function taubin(P, nb, canon, w, iters, lam = 0.5, mu = -0.53) {
  const n = canon.length;
  for (let it = 0; it < iters * 2; it++) {
    const f = it % 2 ? mu : lam;
    const Q = Float32Array.from(P);
    for (let i = 0; i < n; i++) {
      if (canon[i] !== i || !w[i] || nb[i].size === 0) continue;
      let sx = 0, sy = 0, sz = 0;
      for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; }
      const m = nb[i].size, k = f * w[i];
      Q[i * 3] += (sx / m - P[i * 3]) * k;
      Q[i * 3 + 1] += (sy / m - P[i * 3 + 1]) * k;
      Q[i * 3 + 2] += (sz / m - P[i * 3 + 2]) * k;
    }
    P.set(Q);
  }
  for (let i = 0; i < n; i++) { const c = canon[i]; P[i * 3] = P[c * 3]; P[i * 3 + 1] = P[c * 3 + 1]; P[i * 3 + 2] = P[c * 3 + 2]; }
}

function weldedNormals(geo, canon) {
  geo.computeVertexNormals();
  const nr = geo.attributes.normal, n = canon.length;
  const acc = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = canon[i]; acc[c * 3] += nr.getX(i); acc[c * 3 + 1] += nr.getY(i); acc[c * 3 + 2] += nr.getZ(i); }
  for (let i = 0; i < n; i++) {
    const c = canon[i];
    const l = Math.hypot(acc[c * 3], acc[c * 3 + 1], acc[c * 3 + 2]) || 1;
    nr.setXYZ(i, acc[c * 3] / l, acc[c * 3 + 1] / l, acc[c * 3 + 2] / l);
  }
  nr.needsUpdate = true;
  return nr;
}

const smooth01 = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// Project p onto a polyline chain of joints; returns { s, c (closest point), seg }.
function onChain(chain, p) {
  let best = null, acc = 0;
  for (let k = 0; k < chain.length - 1; k++) {
    const a = chain[k], b = chain[k + 1];
    const ab = b.clone().sub(a), L = ab.length();
    const u = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / (L * L)));
    const c = a.clone().addScaledVector(ab, u);
    const d = p.distanceTo(c);
    if (!best || d < best.d - 1e-9) best = { d, s: acc + u * L, c, seg: k };
    acc += L;
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------
// The body: regions per vertex from the dominant bone.
function regionOf(bone) {
  if (/^(Head)$/.test(bone)) return "head";
  if (/^neck_01$/.test(bone)) return "neck";
  if (/(index|middle|pinky|ring|thumb|hand)/.test(bone)) return "hand";
  if (/^(upperarm|lowerarm)/.test(bone)) return "arm";
  if (/^(clavicle|spine)/.test(bone)) return "torso";
  if (/^pelvis/.test(bone)) return "hip";
  if (/^thigh/.test(bone)) return "thigh";
  if (/^calf/.test(bone)) return "calf";
  if (/^(foot|ball)/.test(bone)) return "foot";
  return "torso";
}

// Layers: 0 skin, 1 top, 2 bottom, 3 shoes, 4 legwear, 9 hidden (under a skirt).
function layerFor(spec, J, reg, p) {
  const top = spec.top, bottom = spec.bottom;
  const ax = Math.abs(p.x);
  const neckY = J.neck_01.y, waistY = J.spine_01.y - 0.02, hipY = J.pelvis.y;
  if (reg === "foot") return 3;
  if ((reg === "calf" || reg === "foot") && p.y < J.foot_l.y + 0.02) return 3;
  if (spec.legwear && (reg === "calf" || reg === "thigh") && p.y < spec.legwear.top * (J.calf_l.y / 0.535)) return 4;
  if (bottom && bottom.type === "trousers") {
    if (reg === "thigh" || reg === "calf") return 2;
    if (reg === "hip" && !(top && top.untucked && p.y > hipY - 0.04)) return 2;
    if (reg === "torso" && p.y < waistY && !(top && top.untucked)) return 2;
  }
  if (spec.skirt && (reg === "hip" || (reg === "torso" && p.y < waistY))) return 9;
  if (spec.skirt && reg === "thigh" && p.y > spec.skirtHemY + 0.12) return 9;     // inside the skirt: never seen, never pokes
  if (top) {
    if (reg === "torso" || reg === "hip") return 1;
    if (reg === "arm") {
      const cuff = top.sleeve === "short" ? J.upperarm_l.x + 0.17 : J.hand_l.x - 0.035;
      if (ax < cuff) return 1;
    }
    if (reg === "neck") {
      // collar line: lower at the front; a blouse/shirt is open in a small V at the throat
      const front = p.z > J.neck_01.z + 0.02;
      const line = neckY - 0.035 + (front ? -0.02 : 0.015);
      if (p.y < line + (top.type === "sweater" ? 0.012 : 0)) {
        if ((top.type === "blouse" || top.type === "shirt") && front && ax < 0.03 + (line - p.y) * 0.4 && p.y > line - 0.07) return 0;
        return 1;
      }
    }
  }
  return 0;
}

// Straighten the seams between layers on the source mesh (both sides move together, so no holes): the per-triangle
// cut is a zig-zag; a 1-D Taubin smoothing along each seam loop makes hems, cuffs and sock tops clean lines.
function smoothSeams(src, triLayer, iters = 24) {
  const pos = src.attributes.position;
  const canon = weldMap(pos);
  const idx = src.index.array;
  const edges = new Map();
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = canon[idx[t + k]], b = canon[idx[t + (k + 1) % 3]];
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const e = edges.get(key) || [];
    e.push(triLayer[t / 3]);
    edges.set(key, e);
  }
  const adj = new Map();
  for (const [key, ls] of edges) {
    if (ls.length !== 2 || ls[0] === ls[1]) continue;
    const [a, b] = key.split("_").map(Number);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b); adj.get(b).push(a);
  }
  const P = Float32Array.from(pos.array);
  for (let it = 0; it < iters * 2; it++) {
    const f = it % 2 ? -0.53 : 0.5;
    const Q = Float32Array.from(P);
    for (const [i, nb] of adj) {
      if (nb.length !== 2) continue;
      for (let k = 0; k < 3; k++) Q[i * 3 + k] += ((P[nb[0] * 3 + k] + P[nb[1] * 3 + k]) / 2 - P[i * 3 + k]) * f;
    }
    P.set(Q);
  }
  for (let i = 0; i < pos.count; i++) { const c = canon[i]; for (let k = 0; k < 3; k++) pos.array[i * 3 + k] = P[c * 3 + k]; }
  pos.needsUpdate = true;
}

// Cut one layer out of the body into its own skinned geometry. Returns { geo, map } (body index → layer index).
function cutLayer(src, triLayer, layer) {
  const idx = src.index.array;
  const map = new Map();
  const out = [];
  for (let t = 0; t < idx.length; t += 3) {
    if (triLayer[t / 3] !== layer) continue;
    for (let k = 0; k < 3; k++) {
      const i = idx[t + k];
      if (!map.has(i)) map.set(i, map.size);
      out.push(map.get(i));
    }
  }
  const n = map.size;
  const g = new THREE.BufferGeometry();
  const ids = [...map.keys()];
  for (const name of ["position", "normal", "skinIndex", "skinWeight", "uv"]) {
    const a = src.attributes[name];
    if (!a) continue;
    const arr = new a.array.constructor(n * a.itemSize);
    ids.forEach((i, j) => { for (let k = 0; k < a.itemSize; k++) arr[j * a.itemSize + k] = a.array[i * a.itemSize + k]; });
    g.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
  }
  g.setIndex(out);
  return { geo: g, ids };
}

// Tailor a garment in the bind pose: tubes for limbs, drape for the torso, then smoothing, an offset and a hem strip.
function tailor(geo, ids, regions, J, opt) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const P = Float32Array.from(pos.array);
  const P0 = Float32Array.from(pos.array);
  const canon = weldMap(pos);
  const reg = ids.map((i) => regions[i]);
  const v = new THREE.Vector3();
  // --- limbs: refit to smooth tubes around the joint chain
  const chains = [];
  if (opt.arms) for (const s of ["l", "r"]) chains.push({ side: s, kind: "arm", pts: [J[`upperarm_${s}`], J[`lowerarm_${s}`], J[`hand_${s}`]] });
  if (opt.legs) for (const s of ["l", "r"]) chains.push({ side: s, kind: "leg", pts: [J[`thigh_${s}`], J[`calf_${s}`], J[`foot_${s}`]] });
  for (const ch of chains) {
    const mine = [];
    for (let i = 0; i < n; i++) {
      if (canon[i] !== i) continue;
      const x = P[i * 3];
      if ((ch.side === "l") !== (x > 0)) continue;
      if (ch.kind === "arm" ? reg[i] !== "arm" : !(reg[i] === "thigh" || reg[i] === "calf")) continue;
      v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      const q = onChain(ch.pts, v);
      mine.push({ i, s: q.s, c: q.c, r: v.clone().sub(q.c) });
    }
    if (!mine.length) continue;
    const L = ch.pts[0].distanceTo(ch.pts[1]) + ch.pts[1].distanceTo(ch.pts[2]);
    const NB = Math.ceil(L / 0.01) + 1;
    const rmax = new Float32Array(NB);
    for (const m of mine) { const b = Math.min(NB - 1, Math.max(0, Math.round(m.s / 0.01))); rmax[b] = Math.max(rmax[b], m.r.length()); }
    for (let b = 1; b < NB; b++) if (!rmax[b]) rmax[b] = rmax[b - 1];
    const R = new Float32Array(NB);
    for (let b = 0; b < NB; b++) { let s = 0, c = 0; for (let k = -4; k <= 4; k++) { const j = b + k; if (j >= 0 && j < NB && rmax[j]) { s += rmax[j]; c++; } } R[b] = c ? s / c : 0; }
    const mid = Math.round(ch.pts[0].distanceTo(ch.pts[1]) / 0.01);   // elbow / knee bin
    const Rmid = R[Math.min(NB - 1, mid)];
    for (let b = 0; b < NB; b++) {
      if (ch.kind === "leg" && b > mid - 6) R[b] = Math.max(R[b], Rmid * opt.legFlare);          // straight trouser leg
      if (ch.kind === "arm" && b > mid - 4) R[b] = Math.max(R[b], Rmid * opt.sleeveLoose);        // loose forearm sleeve
    }
    for (const m of mine) {
      const b = Math.min(NB - 1, Math.max(0, Math.round(m.s / 0.01)));
      const len = m.r.length() || 1e-6;
      const root = smooth01(0.0, ch.kind === "arm" ? 0.07 : 0.12, m.s);    // blend into the torso / seat at the limb root
      const target = Math.max(len, len + (R[b] * opt.circ + len * (1 - opt.circ) - len) * root) + opt.ease * root;
      const k = target / len;
      P[m.i * 3] = m.c.x + m.r.x * k; P[m.i * 3 + 1] = m.c.y + m.r.y * k; P[m.i * 3 + 2] = m.c.z + m.r.z * k;
    }
  }
  // --- torso drape: cloth hangs from the chest / shoulder blades instead of following waist and abs
  if (opt.drape) {
    const zc = J.spine_02.z;
    const TB = 48, Y0 = J.pelvis.y - 0.25, YB = 0.012, NY = Math.ceil((J.neck_01.y + 0.05 - Y0) / YB);
    const rm = new Float32Array(TB * NY);
    const xLim = J.upperarm_l.x - 0.03;
    const isTorso = (i) => (reg[i] === "torso" || reg[i] === "hip" || reg[i] === "neck") && Math.abs(P[i * 3]) < xLim;
    const bin = (i) => {
      const a = Math.atan2(P[i * 3 + 2] - zc, P[i * 3]);
      const tb = ((Math.floor((a + Math.PI) / (2 * Math.PI) * TB) % TB) + TB) % TB;
      const yb = Math.max(0, Math.min(NY - 1, Math.floor((P[i * 3 + 1] - Y0) / YB)));
      return [tb, yb, Math.hypot(P[i * 3], P[i * 3 + 2] - zc)];
    };
    for (let i = 0; i < n; i++) { if (canon[i] !== i || !isTorso(i)) continue; const [tb, yb, r] = bin(i); rm[yb * TB + tb] = Math.max(rm[yb * TB + tb], r); }
    const DR = new Float32Array(TB * NY);
    const span = Math.round(opt.drape / YB);
    for (let yb = 0; yb < NY; yb++) for (let tb = 0; tb < TB; tb++) {
      let m = 0;
      for (let k = 0; k <= span && yb + k < NY; k++) m = Math.max(m, rm[(yb + k) * TB + tb] * (1 - 0.15 * k / span));
      DR[yb * TB + tb] = m;
    }
    for (let i = 0; i < n; i++) {
      if (canon[i] !== i || !isTorso(i)) continue;
      const [tb, yb, r] = bin(i);
      let m = 0, c = 0;
      for (let k = -4; k <= 4; k++) for (let j = -2; j <= 2; j++) {
        const yy = Math.max(0, Math.min(NY - 1, yb + j));
        const d = DR[yy * TB + ((tb + k + TB) % TB)]; if (d) { m += d; c++; }
      }
      if (!c || r < 1e-4) continue;
      let target = Math.max(r, (m / c) * 0.97);
      const y = P[i * 3 + 1];
      if (opt.tuckY != null) target = r + (target - r) * smooth01(opt.tuckY, opt.tuckY + 0.1, y);   // pulled in at the waistband
      if (opt.neckY != null) target = r + (target - r) * (1 - smooth01(opt.neckY - 0.08, opt.neckY, y)); // stays at the neck
      const k = target / r;
      P[i * 3] *= k; P[i * 3 + 2] = zc + (P[i * 3 + 2] - zc) * k;
    }
  }
  // --- smoothing (boundary pinned half), offset along the normal, hem strip back to the skin
  const nb = neighbours(geo.index.array, canon, n);
  const edgeCount = new Map();
  const ix = geo.index.array;
  for (let t = 0; t < ix.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = canon[ix[t + k]], b = canon[ix[t + (k + 1) % 3]];
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
  }
  const onEdge = new Uint8Array(n);
  for (const [key, c] of edgeCount) if (c === 1) { const [a, b] = key.split("_").map(Number); onEdge[a] = 1; onEdge[b] = 1; }
  const w = new Float32Array(n).map((_, i) => (onEdge[i] ? 0.6 : 1));
  taubin(P, nb, canon, w, opt.smooth);
  pos.array.set(P);
  const nr = weldedNormals(geo, canon);
  for (let i = 0; i < n; i++) {
    const d = opt.offset;
    pos.setXYZ(i, pos.getX(i) + nr.getX(i) * d, pos.getY(i) + nr.getY(i) * d, pos.getZ(i) + nr.getZ(i) * d);
  }
  pos.needsUpdate = true;
  weldedNormals(geo, canon);
  if (opt.hem) addHem(geo, canon, edgeCount, P0);
  return geo;
}

// Close the gap between a garment's edge and the skin under it with an inward strip (seen inside sleeves and hems).
function addHem(geo, canon, edgeCount, P0) {
  const ix = Array.from(geo.index.array);
  const n = geo.attributes.position.count;
  const extra = new Map();
  const add = [];
  const inner = (i) => {
    if (!extra.has(i)) { extra.set(i, n + extra.size); add.push(i); }
    return extra.get(i);
  };
  const tris = [];
  for (let t = 0; t < ix.length; t += 3) for (let k = 0; k < 3; k++) {
    const a0 = ix[t + k], b0 = ix[t + (k + 1) % 3];
    const a = canon[a0], b = canon[b0];
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (edgeCount.get(key) !== 1) continue;
    const ai = inner(a), bi = inner(b);
    tris.push(b, a, ai, b, ai, bi);
  }
  if (!add.length) return;
  const m = n + add.length;
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name];
    const arr = new a.array.constructor(m * a.itemSize);
    arr.set(a.array);
    add.forEach((i, j) => {
      for (let k = 0; k < a.itemSize; k++) arr[(n + j) * a.itemSize + k] = a.array[i * a.itemSize + k];
      if (name === "position") {
        const nr = geo.attributes.normal;
        for (let k = 0; k < 3; k++) arr[(n + j) * 3 + k] = P0[i * 3 + k] - nr.array[i * 3 + k] * 0.004;
      }
      if (name === "normal") for (let k = 0; k < 3; k++) arr[(n + j) * 3 + k] = -a.array[i * 3 + k];
    });
    geo.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
  }
  geo.setIndex(ix.concat(tris));
}

// A ring garment hanging from the waist (skirt, jacket skirt): rings around the hips, skinned to pelvis + thighs.
function ringGarment(body, J, regionsP, { top, bottom, flare = 1.15, pleats = 0, open = 0, rows = 16, seg = 120, thick = 0.006, zc = null }) {
  const P = body.geometry.attributes.position;
  zc = zc ?? J.pelvis.z + 0.01;
  // body radius per angle between the hem and the waist (the cloth must clear the widest part: the seat, the thighs)
  const TB = seg;
  const rAt = (y0, y1) => {
    const r = new Float32Array(TB);
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i);
      if (y < y0 || y > y1) continue;
      const reg = regionsP[i];
      if (!(reg === "hip" || reg === "thigh" || reg === "torso")) continue;
      const a = Math.atan2(P.getZ(i) - zc, P.getX(i));
      const tb = ((Math.floor((a + Math.PI) / (2 * Math.PI) * TB) % TB) + TB) % TB;
      r[tb] = Math.max(r[tb], Math.hypot(P.getX(i), P.getZ(i) - zc));
    }
    const s = new Float32Array(TB);
    for (let b = 0; b < TB; b++) { let m = 0; for (let k = -6; k <= 6; k++) m = Math.max(m, r[(b + k + TB) % TB]); s[b] = m; }
    return s;
  };
  const rWaist = rAt(top - 0.03, top + 0.03);
  const rHips = rAt(Math.max(bottom, J.pelvis.y - 0.25), top);
  const bones = body.skeleton.bones.map((b) => b.name);
  const bi = (n) => bones.indexOf(n);
  const pelvis = bi("pelvis"), thL = bi("thigh_l"), thR = bi("thigh_r");
  const pos = [], skI = [], skW = [], fold = [], idx = [];
  const ring = rows + 1;
  const vert = (x, y, z, wT, side) => {
    pos.push(x, y, z);
    const wl = side > 0 ? wT * Math.min(1, side) : 0, wr = side < 0 ? wT * Math.min(1, -side) : 0;
    const wc = Math.max(0, 1 - Math.abs(side)) * wT * 0.5;   // front/back middle follows both thighs a little
    skI.push(pelvis, thL, thR, 0); skW.push(1 - wl - wr - 2 * wc, wl + wc, wr + wc, 0);
    fold.push(9, 1.6, 9);
  };
  const cols = seg + 1;
  for (let c = 0; c < cols; c++) {
    const u = c / seg;
    // the open front (jacket) leaves a gap at angle +pi/2 (front = +z)
    const a = Math.PI / 2 + (open ? open / 2 + u * (2 * Math.PI - open) : u * 2 * Math.PI);
    const tb = ((Math.floor((a + Math.PI) / (2 * Math.PI) * TB) % TB) + TB) % TB;
    const tri = pleats ? Math.abs(((u * pleats) % 1) - 0.5) * 2 : 0;   // 0..1 sawtooth → knife pleats
    for (let r = 0; r <= rows; r++) {
      const k = r / rows;                    // 0 waist → 1 hem
      const y = top + (bottom - top) * k;
      const base = rWaist[tb] + 0.022;
      const hang = Math.max(base, rHips[tb] + 0.035) * (1 + (flare - 1) * k * k);
      let rad = base + (hang - base) * smooth01(0, 0.35, k);
      rad *= 1 + (pleats ? (tri - 0.5) * 0.05 * smooth01(0.05, 0.6, k) : 0);
      const x = Math.cos(a) * rad, z = zc + Math.sin(a) * rad;
      const side = Math.cos(a) * 1.6;
      vert(x, y, z, 0.62 * smooth01(0.15, 1, k), Math.max(-1, Math.min(1, side)));
    }
  }
  for (let c = 0; c < seg; c++) for (let r = 0; r < rows; r++) {
    const a = c * ring + r, b = (c + 1) * ring + r;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  // hem thickness: an inner ring at the bottom
  const n0 = pos.length / 3;
  for (let c = 0; c < cols; c++) {
    const o = (c * ring + rows) * 3;
    const x = pos[o], y = pos[o + 1], z = pos[o + 2];
    const d = Math.hypot(x, z - zc) || 1;
    pos.push(x - (x / d) * thick, y + 0.01, zc + (z - zc) * (1 - thick / d));
    skI.push(...skI.slice((c * ring + rows) * 4, (c * ring + rows) * 4 + 4));
    skW.push(...skW.slice((c * ring + rows) * 4, (c * ring + rows) * 4 + 4));
    fold.push(9, 1.6, 9);
  }
  for (let c = 0; c < seg; c++) { const a = c * ring + rows, b = (c + 1) * ring + rows; idx.push(a, b, n0 + c, b, n0 + c + 1, n0 + c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skI, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skW, 4));
  g.setAttribute("fold", new THREE.Float32BufferAttribute(fold, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Shirt/blouse collar: a stand band and a turned-down leaf around the neck, open at the front.
function collarGeo(body, J, { y, gap = 0.5, stand = 0.03, leaf = 0.035, zc }) {
  const P = body.geometry.attributes.position;
  const TB = 64;
  const r = new Float32Array(TB);
  for (let i = 0; i < P.count; i++) {
    const py = P.getY(i);
    if (Math.abs(py - y) > 0.015 || Math.abs(P.getX(i)) > 0.12) continue;
    const a = Math.atan2(P.getZ(i) - zc, P.getX(i));
    const tb = ((Math.floor((a + Math.PI) / (2 * Math.PI) * TB) % TB) + TB) % TB;
    r[tb] = Math.max(r[tb], Math.hypot(P.getX(i), P.getZ(i) - zc));
  }
  const mean = r.reduce((s, x) => s + x, 0) / Math.max(1, r.filter((x) => x).length);
  for (let b = 0; b < TB; b++) if (!r[b]) r[b] = mean;
  const bones = body.skeleton.bones.map((b) => b.name);
  const nI = bones.indexOf("neck_01"), sI = bones.indexOf("spine_03");
  const pos = [], skI = [], skW = [], fold = [], idx = [];
  const seg = 48, rowsY = [[0, 0.004, 0.9], [stand, 0.006, 0.6], [stand + 0.004, 0.012, 0.5], [stand - leaf, 0.03, 0.2]];
  for (let c = 0; c <= seg; c++) {
    const u = c / seg;
    const a = Math.PI / 2 + gap / 2 + u * (2 * Math.PI - gap);
    const tb = ((Math.floor((a + Math.PI) / (2 * Math.PI) * TB) % TB) + TB) % TB;
    const front = Math.max(0, Math.sin(a));             // the collar sits lower at the front
    for (const [dy, dr, wn] of rowsY) {
      const rad = r[tb] + dr;
      pos.push(Math.cos(a) * rad, y + dy - front * 0.025, zc + Math.sin(a) * rad);
      skI.push(nI, sI, 0, 0); skW.push(wn, 1 - wn, 0, 0);
      fold.push(20, 20, 20);
    }
  }
  const R = rowsY.length;
  for (let c = 0; c < seg; c++) for (let k = 0; k < R - 1; k++) {
    const a = c * R + k, b = (c + 1) * R + k;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skI, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skW, 4));
  g.setAttribute("fold", new THREE.Float32BufferAttribute(fold, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function foldVec(reg) {
  if (reg === "arm") return [13, 4, 4];       // compression rings around the sleeve
  if (reg === "thigh" || reg === "calf") return [4, 9, 4];
  if (reg === "foot") return [30, 30, 30];
  return [8, 2.4, 8];                         // torso: long vertical drape folds
}

// ---------------------------------------------------------------------------------------------------------------
// Clip retargeting: animation rotations are deltas from the animation rig's rest, applied on the body's rest.
const clipCache = new Map();
async function clipFor(bodyKey, bodyScene, name) {
  const key = `${bodyKey}:${name}`;
  if (clipCache.has(key)) return clipCache.get(key);
  const [file, clipName] = CLIPS[name] || [null, name];
  const gltf = await load(`${ACT()}/${file || "UAL1"}_Standard.glb`);
  const src = gltf.animations.find((a) => a.name === clipName);
  if (!src) throw new Error(`actors: no clip ${clipName}`);
  const restA = new Map(), restB = new Map();
  gltf.scene.traverse((o) => restA.set(o.name, { q: o.quaternion.clone(), p: o.position.clone() }));
  bodyScene.traverse((o) => restB.set(o.name, { q: o.quaternion.clone(), p: o.position.clone() }));
  const legA = restA.get("calf_l").p.length() + restA.get("foot_l").p.length();
  const legB = restB.get("calf_l").p.length() + restB.get("foot_l").p.length();
  const kLeg = legB / legA;
  const tracks = [];
  const q = new THREE.Quaternion(), qa = new THREE.Quaternion();
  for (const tr of src.tracks) {
    const [node, prop] = tr.name.split(".");
    const a = restA.get(node), b = restB.get(node);
    if (!a || !b || node === "root" || node === "Armature") continue;
    if (prop === "quaternion") {
      const v = Float32Array.from(tr.values);
      const d = a.q.clone().invert();
      for (let i = 0; i < v.length; i += 4) {
        qa.fromArray(v, i);
        q.copy(b.q).multiply(d).multiply(qa).normalize();   // body rest * (anim rest)^-1 * anim
        q.toArray(v, i);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(tr.name, Float32Array.from(tr.times), v));
    } else if (prop === "position" && node === "pelvis") {
      const v = Float32Array.from(tr.values);
      for (let i = 0; i < v.length; i += 3) {
        v[i] = b.p.x + (v[i] - a.p.x) * kLeg; v[i + 1] = b.p.y + (v[i + 1] - a.p.y) * kLeg; v[i + 2] = b.p.z + (v[i + 2] - a.p.z) * kLeg;
      }
      tracks.push(new THREE.VectorKeyframeTrack(tr.name, Float32Array.from(tr.times), v));
    }
  }
  const clip = new THREE.AnimationClip(`${bodyKey}:${name}`, src.duration, tracks);
  const out = { clip, kLeg };
  clipCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Hair: the Quaternius hairstyle, moved rigidly onto the body's head bone.
async function hairMesh(style, headBone, color, bodyKey) {
  const h = HAIR[style];
  if (!h) return null;
  const g = await load(`${ACT()}/${h.file}.gltf`);
  let src = null;
  g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => { if (o.isSkinnedMesh && !src) src = o; });
  const geo = new THREE.BufferGeometry();
  const P = src.geometry.attributes.position;
  const out = new Float32Array(P.count * 3);
  const v = new THREE.Vector3();
  headBone.updateWorldMatrix(true, false);
  const inv = headBone.matrixWorld.clone().invert();
  // the hair was modelled on the male head; the female head is ~5 cm lower and a little smaller
  const hb = new THREE.Vector3(); g.scene.getObjectByName("Head").getWorldPosition(hb);
  const fit = bodyKey === "F" ? 0.965 : 1.0;
  for (let i = 0; i < P.count; i++) {
    src.getVertexPosition(i, v);
    v.applyMatrix4(src.matrixWorld);
    v.sub(hb).multiplyScalar(fit);
    if (h.cut) {   // a bob: hair below the jaw line pulled up and in
      const hy = -h.cut;
      if (v.y < hy) { const k = (hy - v.y); v.y = hy - k * 0.18; v.x *= 1 - Math.min(0.12, k * 0.6); v.z = v.z * (1 - Math.min(0.12, k * 0.6)) - k * 0.05; }
    }
    v.add(new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld));
    v.applyMatrix4(inv);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(out, 3));
  geo.setAttribute("uv", src.geometry.attributes.uv);
  geo.setIndex(src.geometry.index);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
  if (src.material.normalMap) { mat.normalMap = src.material.normalMap; mat.normalScale = new THREE.Vector2(1, 1); }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Path: Catmull-Rom through floor points [[x, z], ...] (or [x, y, z]); arc-length parameterised.
function makePath(pts, y0) {
  const v = pts.map((p) => (p.length === 3 ? new THREE.Vector3(...p) : new THREE.Vector3(p[0], y0, p[1])));
  const curve = new THREE.CatmullRomCurve3(v, false, "centripetal");
  curve.arcLengthDivisions = 400;
  return { curve, length: curve.getLength() };
}

// Walk progress with an acceleration ramp at both ends: s(τ) metres, u(τ) = speed / top speed.
function walkProgress(tau, L, v, ramp) {
  if (tau <= 0) return { s: 0, u: 0 };
  const T = L / v + ramp;
  if (tau >= T) return { s: L, u: 0 };
  if (tau < ramp) return { s: (v * tau * tau) / (2 * ramp), u: tau / ramp };
  if (tau > T - ramp) { const r = T - tau; return { s: L - (v * r * r) / (2 * ramp), u: r / ramp }; }
  return { s: v * (tau - ramp / 2), u: 1 };
}

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : -(Math.cos(Math.PI * x) - 1) / 2);

// ---------------------------------------------------------------------------------------------------------------
/**
 * actor(f, kind, opts) → Actor
 *   kind   one of KINDS (schoolgirl, woman, woman_sweater, man_shirt, man_sweater, man_jacket)
 *   opts   pos [x,y,z] | seat [x, seatTopY, z] (sitting clips) | path [[x,z],...] + at, speed (1 = natural walk)
 *          yaw (radians, 0 faces +z) or lookAt [x,z] · clip "idle" | clips [[t, clip, fade?], ...] · rate (clip speed)
 *          look [{t, yaw, pitch?, dur?}] (turn head + upper body; yaw radians, + = to the actor's left)
 *          shake [[t0, t1, amp?]] (head shake overlay) · face "plain" | "dark" | "blur" · colors {...} · hair · scale
 *          offset (clip time offset, desynchronises several actors with the same clip)
 */
export async function actor(f, kind = "man_shirt", opts = {}) {
  const spec0 = KINDS[kind] || KINDS.man_shirt;
  const spec = { ...spec0, ...opts, colors: { ...spec0.colors, ...(opts.colors || {}) } };
  const bodyKey = spec.body;
  const url = `${CACHE}/figures/${bodyKey === "F" ? "Superhero_Female_FullBody" : "Superhero_Male_FullBody"}.gltf`;
  const gltf = await load(url);
  const scene = skelClone(gltf.scene);
  scene.updateMatrixWorld(true);
  let body = null;
  scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (/Eye|Face/.test(o.name) && o.geometry.attributes.position.count < 2000) { o.visible = false; return; }
    if (!body) body = o;
  });
  const J = {};
  scene.traverse((o) => { if (o.isBone) J[o.name] = o.getWorldPosition(new THREE.Vector3()); });

  // --- regions, layers
  const src = body.geometry.clone();
  const P = src.attributes.position, si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
  const bones = body.skeleton.bones;
  const regions = new Array(P.count);
  const p = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    regions[i] = regionOf(bones[best].name);
  }
  if (spec.skirt) spec.skirtHemY = { knee: J.calf_l.y - 0.07, calf: J.calf_l.y - 0.2, mini: J.calf_l.y + 0.12 }[spec.skirt.length || "knee"];
  const idx = src.index.array;
  const triLayer = new Uint8Array(idx.length / 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    p.set((P.getX(a) + P.getX(b) + P.getX(c)) / 3, (P.getY(a) + P.getY(b) + P.getY(c)) / 3, (P.getZ(a) + P.getZ(b) + P.getZ(c)) / 3);
    const rs = [regions[a], regions[b], regions[c]];
    const reg = rs[0] === rs[1] || rs[0] === rs[2] ? rs[0] : rs[1];
    triLayer[t / 3] = layerFor(spec, J, reg, p);
  }
  smoothSeams(src, triLayer);
  const C = spec.colors;
  const group = new THREE.Group();
  const parent = body.parent;
  const addSkinned = (geo, mat) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(body.skeleton, body.bindMatrix);
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };
  const withFold = (geo, ids, fixed) => {
    if (geo.attributes.fold) return geo;
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const fv = fixed || foldVec(regions[ids[i]] || "torso"); arr.set(fv, i * 3); }
    geo.setAttribute("fold", new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const meshes = {};
  // top
  if (spec.top) {
    const { geo, ids } = cutLayer(src, triLayer, 1);
    withFold(geo, ids);
    const tt = spec.top.type;
    tailor(geo, ids, regions, J, {
      arms: true, legs: false, circ: 0.65, ease: tt === "jacket" ? 0.012 : 0.006, sleeveLoose: tt === "sweater" ? 0.9 : 0.85, legFlare: 1,
      drape: bodyKey === "F" ? 0.26 : 0.2, tuckY: spec.top.untucked || tt === "jacket" ? null : J.spine_01.y - 0.04, neckY: J.neck_01.y - 0.03,
      smooth: 10, offset: tt === "jacket" ? 0.016 : tt === "sweater" ? 0.012 : 0.009, hem: true,
    });
    const rib = tt === "sweater" ? [J.spine_01.y - 0.07, J.spine_01.y - 0.01, J.hand_l.x - 0.09, 0.0012] : null;
    meshes.top = addSkinned(geo, clothMaterial(C.top, { rough: tt === "jacket" ? 0.78 : 0.9, fold: tt === "sweater" ? 0.004 : 0.006, rib, inner: true }));
    if (tt === "blouse" || tt === "shirt" || tt === "jacket") {
      const cg = collarGeo(body, J, { y: J.neck_01.y - 0.045, gap: tt === "jacket" ? 0.9 : 0.55, zc: J.neck_01.z + 0.005 });
      cg.attributes.fold.array.fill(3);
      meshes.collar = addSkinned(cg, clothMaterial(tt === "jacket" ? C.shirt : C.top, { fold: 0.0, tone: 0.05 }));
      meshes.collar.castShadow = false;
    }
    if (tt === "jacket") {
      const jg = ringGarment(body, J, regions, { top: J.spine_01.y - 0.02, bottom: J.pelvis.y - 0.13, flare: 1.04, open: 0.55, rows: 8, seg: 96 });
      meshes.jacketSkirt = addSkinned(jg, clothMaterial(C.top, { rough: 0.78, fold: 0.004, inner: true }));
    }
  }
  // bottom
  if (spec.bottom) {
    const { geo, ids } = cutLayer(src, triLayer, 2);
    withFold(geo, ids);
    tailor(geo, ids, regions, J, { arms: false, legs: true, circ: 0.7, ease: 0.008, legFlare: 1.0, sleeveLoose: 1, drape: 0, smooth: 6, offset: 0.009, hem: true });
    meshes.bottom = addSkinned(geo, clothMaterial(C.bottom, { rough: 0.86, fold: 0.006, inner: true }));
  }
  if (spec.skirt) {
    const lenY = spec.skirtHemY;
    const sg = ringGarment(body, J, regions, { top: J.spine_01.y + 0.015, bottom: lenY, flare: spec.skirt.flare || 1.15, pleats: spec.skirt.pleats || 0, rows: 18, seg: 144 });
    meshes.skirt = addSkinned(sg, clothMaterial(C.skirt, { rough: 0.82, fold: 0.003, inner: true }));
  }
  // shoes, legwear
  {
    const { geo, ids } = cutLayer(src, triLayer, 3);
    withFold(geo, ids, [30, 30, 30]);
    tailor(geo, ids, regions, J, { arms: false, legs: false, circ: 0, ease: 0, legFlare: 1, sleeveLoose: 1, drape: 0, smooth: 10, offset: 0.005, hem: false });
    const sm = new THREE.MeshStandardMaterial({ color: C.shoes, roughness: 0.45, metalness: 0 });
    meshes.shoes = addSkinned(geo, sm);
  }
  if (spec.legwear) {
    const { geo, ids } = cutLayer(src, triLayer, 4);
    withFold(geo, ids, [4, 14, 4]);
    tailor(geo, ids, regions, J, { arms: false, legs: false, circ: 0, ease: 0, legFlare: 1, sleeveLoose: 1, drape: 0, smooth: 3, offset: 0.0025, hem: false });
    meshes.legwear = addSkinned(geo, clothMaterial(C.legwear, { rough: 0.8, fold: 0.0015 }));
  }
  // skin: what is left, featureless face, hands as they are
  {
    const { geo, ids } = cutLayer(src, triLayer, 0);
    const n = geo.attributes.position.count;
    const canon = weldMap(geo.attributes.position);
    const nb = neighbours(geo.index.array, canon, n);
    const Pp = Float32Array.from(geo.attributes.position.array);
    const w = new Float32Array(n);
    const hy = J.Head.y, hz = J.Head.z;
    const isFace = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const y = Pp[i * 3 + 1], z = Pp[i * 3 + 2];
      const r = regions[ids[i]];
      if ((r === "head") && y > hy - 0.03 && y < hy + 0.15 && z > hz + 0.02) { w[i] = 0.9; isFace[i] = 1; }
      else if (r === "arm" || r === "thigh" || r === "calf" || r === "neck" || r === "torso") w[i] = 0.5;   // less muscle relief
    }
    taubin(Pp, nb, canon, w, 8);
    geo.attributes.position.array.set(Pp);
    weldedNormals(geo, canon);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(C.skin);
    const dark = spec.face === "dark" ? 0.22 : 1;
    for (let i = 0; i < n; i++) {
      const k = isFace[i] ? dark : 1;
      col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    body.geometry = geo;
    body.material = skinMaterial("#ffffff");
    body.castShadow = body.receiveShadow = true;
    body.frustumCulled = false;
  }
  // hair
  const head = scene.getObjectByName("Head");
  const hair = await hairMesh(spec.hair, head, C.hair, bodyKey);
  if (hair) head.add(hair);
  // less "superhero": narrower chest (same trick as figures.js)
  const sp3 = scene.getObjectByName("spine_03");
  sp3.scale.setScalar(0.94);
  scene.getObjectByName("neck_01").scale.setScalar(1 / 0.94);

  group.add(scene);
  const root = new THREE.Group();
  root.add(group);
  root.scale.setScalar(spec.scale || 1);
  f.scene.add(root);

  // --- animation
  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map();
  const need = new Set(["idle"]);
  if (spec.path) need.add(spec.walkClip || "walk");
  if (spec.clip) need.add(spec.clip);
  for (const c of spec.clips || []) need.add(c[1]);
  let kLeg = 1;
  for (const name of need) {
    const { clip, kLeg: k } = await clipFor(bodyKey, gltf.scene, name);
    kLeg = k;
    const a = mixer.clipAction(clip);
    a.play();
    a.setEffectiveWeight(0);
    actions.set(name, { a, loop: (CLIPS[name] || [0, 0, true])[2], dur: clip.duration });
  }
  const scale = spec.scale || 1;
  const stride = WALK_CYCLE_M * kLeg * scale;
  const walkV = (stride / actions.get(spec.walkClip || "walk")?.dur || 1) * (spec.speed || 1);
  const path = spec.path ? makePath(spec.path, spec.pos ? spec.pos[1] : 0) : null;
  const ramp = spec.ramp ?? 0.6;
  const off = spec.offset || 0;
  const rate = spec.rate || 1;
  const timeline = spec.clips || [[-1e9, spec.clip || "idle", 0]];

  const setClip = (name, local, w) => {
    const e = actions.get(name);
    if (!e) return;
    let tt = local * rate + off;
    tt = e.loop ? ((tt % e.dur) + e.dur) % e.dur : Math.max(0, Math.min(e.dur - 1e-4, tt));
    e.a.time = tt;
    e.a.setEffectiveWeight(w);
  };

  const sitClip = (name) => /^sit/.test(name);
  // seat placement: once, measure the sitting pose (lowest seat point and pelvis offset)
  let seatFix = null;
  if (spec.seat) {
    const name = timeline.map((x) => x[1]).find(sitClip) || "sit";
    if (!actions.has(name)) {
      const { clip } = await clipFor(bodyKey, gltf.scene, name);
      const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0);
      actions.set(name, { a, loop: true, dur: clip.duration });
    }
    for (const [, e] of actions) e.a.setEffectiveWeight(0);
    setClip(name, 0, 1);
    mixer.update(0);
    root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    let minY = Infinity;
    const pel = new THREE.Vector3();
    scene.getObjectByName("pelvis").getWorldPosition(pel);
    for (const m of [body, meshes.bottom, meshes.skirt]) {
      if (!m) continue;
      const P2 = m.geometry.attributes.position;
      const sk = m.geometry.attributes.skinIndex, swt = m.geometry.attributes.skinWeight;
      for (let i = 0; i < P2.count; i += 2) {
        let best = 0, bw = -1;
        for (let k = 0; k < 4; k++) { const w = swt.getComponent(i, k); if (w > bw) { bw = w; best = sk.getComponent(i, k); } }
        if (!/^(pelvis|thigh)/.test(bones[best].name)) continue;
        m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld);
        if (m === body || v.y < pel.y) minY = Math.min(minY, v.y);
      }
    }
    if (!isFinite(minY)) minY = pel.y - 0.1;
    seatFix = { dy: -minY, dz: -pel.z, dx: -pel.x };  // in actor space (root at origin, facing +z)
  }

  const origin = spec.seat || spec.pos;
  const baseYaw = spec.lookAt && origin ? Math.atan2(spec.lookAt[0] - origin[0], spec.lookAt[1] - origin[2]) : spec.yaw || 0;
  const turnQ = new THREE.Quaternion(), qp = new THREE.Quaternion(), ax = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const turnBone = (name, axis, ang) => {
    const b = scene.getObjectByName(name);
    b.parent.updateWorldMatrix(true, false);
    b.parent.getWorldQuaternion(qp);
    ax.copy(axis).applyQuaternion(qp.invert()).normalize();
    b.quaternion.premultiply(turnQ.setFromAxisAngle(ax, ang));
  };
  const state = { pos: new THREE.Vector3(), yaw: baseYaw, s: 0 };

  const A = {
    kind, root, scene, body, meshes, hair, mixer, J, spec, stride, speed: walkV,
    bone: (n) => scene.getObjectByName(n),
    get length() { return path ? path.length : 0; },
    // Where the actor is at time t (no posing): { pos: Vector3, yaw, s }
    at(t) {
      if (path) {
        const { s } = walkProgress(t - (spec.at || 0), path.length, walkV, ramp);
        const u = Math.min(1, s / path.length);
        const P0 = path.curve.getPointAt(u);
        const T0 = path.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
        return { pos: P0, yaw: Math.atan2(T0.x, T0.z), s };
      }
      const pos = new THREE.Vector3(...(spec.seat || spec.pos || [0, 0, 0]));
      return { pos, yaw: baseYaw, s: 0 };
    },
    pose(t) {
      for (const [, e] of actions) e.a.setEffectiveWeight(0);
      if (path) {
        const tau = t - (spec.at || 0);
        const { s, u } = walkProgress(tau, path.length, walkV, ramp);
        const wk = ease(Math.min(1, u * 1.4));
        const wc = spec.walkClip || "walk";
        const phase = s / stride;                                  // feet locked to the distance walked
        setClip(wc, (phase * actions.get(wc).dur) / rate - off / rate, wk);
        setClip("idle", t, 1 - wk);
        const pt = this.at(t);
        state.pos.copy(pt.pos); state.yaw = pt.yaw; state.s = s;
      } else {
        // clip timeline with cross-fades
        let i = 0;
        while (i + 1 < timeline.length && t >= timeline[i + 1][0]) i++;
        const [t0, name, fade = 0.35] = timeline[i];
        const k = fade > 0 && i > 0 ? Math.min(1, (t - t0) / fade) : 1;
        setClip(name, t - Math.max(t0, -1e8), ease(k));
        if (k < 1) { const [tp, prev] = timeline[i - 1]; setClip(prev, t - Math.max(tp, -1e8), 1 - ease(k)); }
        const pp = spec.seat || spec.pos || [0, 0, 0];
        state.pos.set(pp[0], pp[1], pp[2]);
        state.yaw = baseYaw;
      }
      mixer.update(0);
      // overlays: look (turn head + upper body), shake
      let yaw = 0, pitch = 0;
      if (spec.look) {
        for (const L of spec.look) {
          const k = ease((t - L.t) / (L.dur || 0.8));
          yaw = yaw + ((L.yaw ?? yaw) - yaw) * k * (t >= L.t ? 1 : 0);
          pitch = pitch + ((L.pitch ?? pitch) - pitch) * k * (t >= L.t ? 1 : 0);
        }
      }
      if (spec.shake) {
        for (const [a, b, amp = 0.28] of spec.shake) {
          if (t < a || t > b) continue;
          const env = Math.min(1, (t - a) / 0.25, (b - t) / 0.25);
          yaw += amp * env * Math.sin(2 * Math.PI * 1.9 * (t - a));
        }
      }
      // root placement
      root.position.copy(state.pos);
      root.rotation.set(0, state.yaw, 0);
      if (seatFix) {   // the seated pelvis over the seat point, the lowest seat point on the seat top (constant offset)
        const c = Math.cos(state.yaw), sn = Math.sin(state.yaw);
        root.position.x += seatFix.dx * c + seatFix.dz * sn;
        root.position.z += -seatFix.dx * sn + seatFix.dz * c;
        root.position.y += seatFix.dy;
      } else {
        root.position.y += 0.004;   // shoe soles
      }
      root.updateMatrixWorld(true);
      if (yaw || pitch) {
        const parts = [["spine_02", 0.15], ["spine_03", 0.25], ["neck_01", 0.3], ["Head", 0.3]];
        for (const [n, w] of parts) turnBone(n, up, yaw * w);
        if (pitch) {
          const side = new THREE.Vector3(1, 0, 0).applyQuaternion(scene.getObjectByName("Head").getWorldQuaternion(new THREE.Quaternion()));
          turnBone("neck_01", side, pitch * 0.5); turnBone("Head", side, pitch * 0.5);
        }
      }
    },
    // Camera helper for "following from behind": { pos, look } at time t. back/height/side in metres.
    follow(t, { back = 2.2, height = 1.55, side = 0.35, ahead = 2.5, lookY = 1.2 } = {}) {
      const { pos, yaw } = this.at(t);
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      return {
        pos: [pos.x - fx * back + fz * side, pos.y + height, pos.z - fz * back - fx * side],
        look: [pos.x + fx * ahead, pos.y + lookY, pos.z + fz * ahead],
      };
    },
    // Face centre and radius on screen (px) for blur overlays; null when behind the camera or facing away.
    faceScreen(cam, w, h) {
      const head = scene.getObjectByName("Head");
      const c = new THREE.Vector3(0, 0.09, 0.07).applyMatrix4(head.matrixWorld);
      const back = new THREE.Vector3(0, 0.09, -0.05).applyMatrix4(head.matrixWorld);
      const toCam = cam.position.clone().sub(c);
      const facing = c.clone().sub(back).normalize().dot(toCam.clone().normalize());
      const s = c.clone().project(cam);
      if (s.z > 1) return null;
      const edge = c.clone().add(new THREE.Vector3(0, 0.12 * scale, 0)).project(cam);
      const r = Math.abs(edge.y - s.y) * h / 2;
      return { x: (s.x + 1) * w / 2, y: (1 - s.y) * h / 2, r, facing };
    },
  };
  A.pose(0);
  return A;
}

// Blur faces with CSS backdrop-filter discs over the canvas (the reference blurs the investigators' faces).
// Returns update(t) to call after the actors are posed and the camera is set, every frame.
export function faceBlur(f, actors, { px = 9, grow = 1.25, minFacing = -0.2 } = {}) {
  const divs = actors.map(() => {
    const d = document.createElement("div");
    Object.assign(d.style, { position: "absolute", borderRadius: "50%", pointerEvents: "none", backdropFilter: `blur(${px}px)`,
      webkitBackdropFilter: `blur(${px}px)`, display: "none",
      maskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)", webkitMaskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)" });
    f.stage.appendChild(d);
    return d;
  });
  if (getComputedStyle(f.stage).position === "static") f.stage.style.position = "relative";
  return () => {
    f.cam.updateMatrixWorld(true);
    actors.forEach((a, i) => {
      a.root.updateMatrixWorld(true);
      const s = a.faceScreen(f.cam, f.w, f.h);
      const d = divs[i];
      if (!s || s.facing < minFacing) { d.style.display = "none"; return; }
      const r = s.r * grow;
      Object.assign(d.style, { display: "block", left: `${s.x - r}px`, top: `${s.y - r * 1.1}px`, width: `${2 * r}px`, height: `${2.2 * r}px` });
    });
  };
}
