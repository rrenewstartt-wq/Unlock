// Dress a film-kit figure (assets/kit3d/figures.js) so it reads as a clothed person, not a painted superhero base mesh.
// The body mesh itself is re-shaped in its bind pose (so the clothes follow every bone pose, no gaps at the joints):
//   - the suit zones lose the muscle relief: each limb / the torso is re-fitted ring by ring to a smoothed, slightly
//     loose section (sleeves and trouser legs hang as soft tubes, the jacket drops straight from the chest — no V taper)
//   - the jacket runs down over the hips; a jacket skirt (open at the front, vent at the back) hangs to the seat
//   - shirt collar + jacket collar at the neck (hide the neck seam), shirt cuffs below the sleeve ends
//   - fold relief as a bump in the shader: creases around the elbows, the knees and the small of the back
//   - real hair: Quaternius Hair_SimpleParted (CC0, Universal Base Characters [Standard], same pack as the body;
//     ./Hair_SimpleParted.gltf, textures stripped), natural skin tone on hands, neck and the featureless face.
// Extra pieces are rigidly bound to a bone with the skin's own bind transform, so they sit exactly where the skinned
// surface is in any pose. Deterministic (no random). Call BEFORE posing:
//
//   const man = await f.figure("film");
//   await dress(man, { suit: "#2c2b29", shirt: "#bdb8ae", fabric: wool.normalMap });
//   poseSeated(man, ...); settle(man, 0); f.hold(man);
//
// The record gives no clothes for anyone in this episode (SPEC: "옷은 어두운 무채색"), so suits are plain dark neutrals.
import { THREE } from "../kit3d/film.js";
import { GLTFLoader } from "../kit3d/addons/loaders/GLTFLoader.js";

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

let HAIR = null;
const hairGeo = () => (HAIR ||= new GLTFLoader().loadAsync(new URL("./Hair_SimpleParted.gltf", import.meta.url).href)
  .then((g) => { let geo = null; g.scene.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; }); return geo; }));

let STRANDS = null;
function strandNormals() {               // fine strands as a normal map (canvas, seeded)
  if (STRANDS) return STRANDS;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "rgb(128,128,255)"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const px = hash(i * 1.3) * 512, py = hash(i * 2.9) * 512, l = 16 + hash(i * 4.1) * 60;
    x.strokeStyle = `rgba(${hash(i * 7.3) > 0.5 ? 172 : 84},128,232,0.5)`;
    x.lineWidth = 0.8 + hash(i * 5.7) * 1.4;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (hash(i * 9.1) - 0.5) * 5, py + l); x.stroke();
  }
  STRANDS = new THREE.CanvasTexture(c);
  STRANDS.wrapS = STRANDS.wrapT = THREE.RepeatWrapping;
  return STRANDS;
}

function bodyMesh(fig) {
  let best = null;
  fig.scene.traverse((o) => { if (o.isSkinnedMesh && o.visible && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o; });
  return best;
}

// bone position in the mesh's geometry (bind) space
function bindPos(mesh, name) {
  const sk = mesh.skeleton;
  const i = sk.bones.findIndex((b) => b.name === name);
  const m = sk.boneInverses[i].clone().invert().premultiply(mesh.bindMatrixInverse);
  return new THREE.Vector3().setFromMatrixPosition(m);
}

// add a mesh built in geometry (bind) space, rigidly bound to a bone exactly as the skin is
function bindTo(fig, mesh, geoMesh, boneName) {
  const sk = mesh.skeleton;
  const i = sk.bones.findIndex((b) => b.name === boneName);
  geoMesh.matrixAutoUpdate = false;
  geoMesh.matrix.copy(sk.boneInverses[i]).multiply(mesh.bindMatrix);
  geoMesh.castShadow = geoMesh.receiveShadow = true;
  sk.bones[i].add(geoMesh);
  return geoMesh;
}

// Re-fit vertices `ids` (canonical indices) around the segment a→b: per (ring, sector) mean radius, smoothed over the
// angle and along the axis, blended in by `alpha` and inflated by pad(t). centre: per-ring centroid (torso) or the axis.
function refit(P, ids, a, b, { rings = 10, sectors = 24, alpha = 0.85, pad = () => 0.01, centroid = false, floorRef = null, kTheta = 2 } = {}) {
  const axis = b.clone().sub(a); const len = axis.length(); axis.normalize();
  const ref = Math.abs(axis.y) > 0.8 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const w = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const u = new THREE.Vector3().crossVectors(w, axis).normalize();
  const d = new THREE.Vector3();
  const T = new Float32Array(ids.length);
  for (const [n, i] of ids.entries()) { d.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).sub(a); T[n] = d.dot(axis) / len; }
  const ringOf = (t) => Math.min(rings - 1, Math.max(0, Math.floor(t * rings)));
  // ring centres
  const cen = Array.from({ length: rings }, () => [0, 0, 0]);
  if (centroid) {
    for (const [n, i] of ids.entries()) { const c = cen[ringOf(T[n])]; d.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).sub(a); c[0] += d.dot(u); c[1] += d.dot(w); c[2]++; }
    for (const c of cen) if (c[2]) { c[0] /= c[2]; c[1] /= c[2]; }
    for (let k = 0; k < rings; k++) if (!cen[k][2]) cen[k] = cen[k - 1] || cen.find((c) => c[2]) || [0, 0, 1];
  }
  const R = Array.from({ length: rings }, () => new Float32Array(sectors));
  const N = Array.from({ length: rings }, () => new Float32Array(sectors));
  const polar = new Array(ids.length);
  for (const [n, i] of ids.entries()) {
    const k = ringOf(T[n]);
    d.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).sub(a);
    const kf = Math.min(rings - 1.0001, Math.max(0, T[n] * rings - 0.5)), k0 = Math.floor(kf), fk = kf - k0, k1 = Math.min(rings - 1, k0 + 1);
    const pu = d.dot(u) - (cen[k0][0] * (1 - fk) + cen[k1][0] * fk), pw = d.dot(w) - (cen[k0][1] * (1 - fk) + cen[k1][1] * fk);
    const r = Math.hypot(pu, pw), th = Math.atan2(pw, pu);
    const s = Math.min(sectors - 1, Math.floor((th + Math.PI) / (2 * Math.PI) * sectors));
    R[k][s] += r; N[k][s]++;
    polar[n] = { k, r, th, pu, pw };
  }
  for (let k = 0; k < rings; k++) for (let s = 0; s < sectors; s++) R[k][s] = N[k][s] ? R[k][s] / N[k][s] : 0;
  // fill empty bins from angular neighbours, then smooth (angle ±kTheta, rings ±1)
  for (let k = 0; k < rings; k++) for (let pass = 0; pass < sectors; pass++) for (let s = 0; s < sectors; s++) {
    if (R[k][s]) continue;
    const l = R[k][(s + sectors - 1) % sectors], r = R[k][(s + 1) % sectors];
    if (l || r) R[k][s] = l && r ? (l + r) / 2 : l || r;
  }
  for (let k = 0; k < rings; k++) if (!R[k].some(Boolean)) R[k] = Float32Array.from(R[k - 1] || R.find((x) => x.some(Boolean)));
  const S = R.map((row, k) => row.map((_, s) => {
    let acc = 0, wt = 0;
    for (let dk = -1; dk <= 1; dk++) {
      const kk = k + dk; if (kk < 0 || kk >= rings) continue;
      for (let ds = -kTheta; ds <= kTheta; ds++) { const ww = (dk ? 0.5 : 1) * (1 - Math.abs(ds) / (kTheta + 1)); acc += R[kk][(s + ds + sectors) % sectors] * ww; wt += ww; }
    }
    return acc / wt;
  }));
  if (floorRef) floorRef(S, rings, sectors);
  // bilinear lookup in (t, theta)
  const look = (t, th) => {
    const kf = Math.min(rings - 1.0001, Math.max(0, t * rings - 0.5)), k0 = Math.floor(kf), fk = kf - k0;
    const sf = ((th + Math.PI) / (2 * Math.PI) * sectors - 0.5 + sectors) % sectors, s0 = Math.floor(sf), fs = sf - s0, s1 = (s0 + 1) % sectors;
    const k1 = Math.min(rings - 1, k0 + 1);
    return (S[k0][s0] * (1 - fs) + S[k0][s1] * fs) * (1 - fk) + (S[k1][s0] * (1 - fs) + S[k1][s1] * fs) * fk;
  };
  for (const [n, i] of ids.entries()) {
    const p = polar[n]; if (!p.r) continue;
    const t = T[n];
    const al = typeof alpha === "function" ? alpha(t, p.th) : alpha;
    const r2 = p.r * (1 - al) + look(t, p.th) * al + pad(t, p.th);
    const kf = Math.min(rings - 1.0001, Math.max(0, t * rings - 0.5)), k0 = Math.floor(kf), fk = kf - k0, k1 = Math.min(rings - 1, k0 + 1);
    const cu = cen[k0][0] * (1 - fk) + cen[k1][0] * fk, cw = cen[k0][1] * (1 - fk) + cen[k1][1] * fk;
    const nu = cu + p.pu / p.r * r2, nw = cw + p.pw / p.r * r2;
    const base = a.clone().addScaledVector(axis, t * len).addScaledVector(u, nu).addScaledVector(w, nw);
    P[i * 3] = base.x; P[i * 3 + 1] = base.y; P[i * 3 + 2] = base.z;
  }
  return { axis, u, w, len, S, rings, sectors, cen };
}

export async function dress(fig, { suit = "#2b2a28", trousers = null, shirt = "#b9b4aa", hair = "#1a1714", skin = "#6c5448", fabric = null, seated = false } = {}) {
  const mesh = bodyMesh(fig);
  const g = mesh.geometry;
  const pos = g.attributes.position, zone = g.attributes.zone, col = g.attributes.color;
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const bones = mesh.skeleton.bones;
  const n = pos.count;
  // weld uv-seam duplicates
  const key = new Map(), canon = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    if (!key.has(k)) key.set(k, i);
    canon[i] = key.get(k);
  }
  const boneOf = new Array(n);
  for (let i = 0; i < n; i++) {
    let b = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const ww = sw.getComponent(i, k); if (ww > bw) { bw = ww; b = si.getComponent(i, k); } }
    boneOf[i] = bones[b].name;
  }
  const P = Float32Array.from(pos.array);
  const Z = (i) => zone.getX(i);
  const B = (name) => bindPos(mesh, name);

  // the jacket runs down over the hips (pelvis vertices above the crotch become jacket)
  const HEM = 0.9;
  const pz0 = bindPos(mesh, "pelvis").z;
  for (let i = 0; i < n; i++) if (Z(i) === 3 && boneOf[i] === "pelvis" && P[i * 3 + 1] > HEM && (P[i * 3 + 2] < pz0 + 0.03 || Math.abs(P[i * 3]) > 0.13)) zone.setX(i, 2);

  const cloth = (i) => Z(i) === 2 || Z(i) === 3;
  const pick = (test) => { const out = []; for (let i = 0; i < n; i++) if (canon[i] === i && cloth(i) && test(i)) out.push(i); return out; };
  const pelvis = B("pelvis"), neck = B("neck_01"), sp3 = B("spine_03");

  // torso: pelvis → neck base, sections around the ring centroid, no V taper (the jacket drops from the chest)
  const torsoBones = new Set(["pelvis", "spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r"]);
  const tA = new THREE.Vector3(0, HEM - 0.02, pelvis.z), tB = new THREE.Vector3(0, neck.y - 0.02, neck.z);
  const tLen = tB.y - tA.y;
  const chestT = (sp3.y + 0.02 - tA.y) / tLen;
  refit(P, pick((i) => torsoBones.has(boneOf[i]) && P[i * 3 + 1] > HEM - 0.02 && P[i * 3 + 1] < neck.y - 0.03), tA, tB, {
    rings: 14, sectors: 32, centroid: true, kTheta: 3,
    alpha: (t) => (t > 0.9 ? 0.35 : 0.85),
    pad: (t) => 0.008 + 0.012 * Math.max(0, 1 - Math.abs(t - 0.35) / 0.4),
    floorRef: (S, rings, sectors) => {
      const kc = Math.min(rings - 1, Math.floor(chestT * rings));
      for (let k = 0; k < kc; k++) for (let s = 0; s < sectors; s++) {
        const th = (s + 0.5) / sectors * 2 * Math.PI - Math.PI;          // front (+z) is th = -π/2
        S[k][s] = Math.max(S[k][s], (0.86 - 0.12 * Math.max(0, Math.cos(th + Math.PI / 2))) * S[kc][s]);
      }
    },
  });
  // sleeves and trouser legs: soft tubes
  for (const s of ["l", "r"]) {
    const sh = B(`upperarm_${s}`), el = B(`lowerarm_${s}`), wr = B(`hand_${s}`);
    refit(P, pick((i) => boneOf[i] === `upperarm_${s}`), sh, el, { rings: 8, sectors: 20, alpha: (t) => (t < 0.15 ? 0.5 : 0.9), pad: (t) => 0.008 + 0.006 * t });
    refit(P, pick((i) => boneOf[i] === `lowerarm_${s}` && Z(i) === 2), el, wr, { rings: 8, sectors: 20, alpha: 0.9, pad: (t) => 0.012 + 0.004 * t });
    const hp = B(`thigh_${s}`), kn = B(`calf_${s}`), an = B(`foot_${s}`);
    refit(P, pick((i) => boneOf[i] === `thigh_${s}` && Z(i) === 3), hp, kn, { rings: 9, sectors: 20, alpha: (t) => (t < 0.12 ? 0.4 : 0.88), pad: () => 0.01 });
    refit(P, pick((i) => boneOf[i] === `calf_${s}` && Z(i) === 3), kn, an, { rings: 9, sectors: 20, alpha: 0.92, pad: (t) => 0.012 + 0.008 * t });
  }
  // blend the seams between groups: a few Laplacian passes on the cloth (skin borders stay put)
  const nb = Array.from({ length: n }, () => new Set());
  const idx = g.index.array;
  for (let t = 0; t < idx.length; t += 3) {
    const a = canon[idx[t]], b = canon[idx[t + 1]], c = canon[idx[t + 2]];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  for (let it = 0; it < 6; it++) {
    const Q = Float32Array.from(P);
    for (let i = 0; i < n; i++) {
      if (canon[i] !== i || !cloth(i) || !nb[i].size) continue;
      let sx = 0, sy = 0, sz = 0, all = true;
      for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; if (!cloth(j)) all = false; }
      if (!all) continue;
      const m = nb[i].size, k = it % 2 ? -0.34 : 0.33;   // Taubin: no shrinking
      Q[i * 3] += (sx / m - P[i * 3]) * k; Q[i * 3 + 1] += (sy / m - P[i * 3 + 1]) * k; Q[i * 3 + 2] += (sz / m - P[i * 3 + 2]) * k;
    }
    P.set(Q);
  }
  for (let i = 0; i < n; i++) { const c = canon[i]; pos.setXYZ(i, P[c * 3], P[c * 3 + 1], P[c * 3 + 2]); }
  pos.needsUpdate = true;
  zone.needsUpdate = true;
  // welded normals
  g.computeVertexNormals();
  const nr = g.attributes.normal, acc = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = canon[i]; acc[c * 3] += nr.getX(i); acc[c * 3 + 1] += nr.getY(i); acc[c * 3 + 2] += nr.getZ(i); }
  for (let i = 0; i < n; i++) { const c = canon[i]; const l = Math.hypot(acc[c * 3], acc[c * 3 + 1], acc[c * 3 + 2]) || 1; nr.setXYZ(i, acc[c * 3] / l, acc[c * 3 + 1] / l, acc[c * 3 + 2] / l); }
  nr.needsUpdate = true;
  g.computeBoundingSphere();

  // colours: suit, trousers, skin
  const cs = new THREE.Color(suit), ct = new THREE.Color(trousers || suit), ck = new THREE.Color(skin);
  for (let i = 0; i < n; i++) {
    const z = Z(i);
    if (z === 2) col.setXYZ(i, cs.r, cs.g, cs.b);
    else if (z === 3) col.setXYZ(i, ct.r, ct.g, ct.b);
    else if (z === 0) col.setXYZ(i, ck.r, ck.g, ck.b);
    else if (z === 1) {   // painted hair under the hair mesh: the front of it is forehead (skin), the rest dark
      const front = (P[canon[i] * 3 + 2] > 0.035 && P[canon[i] * 3 + 1] < 1.79) || P[canon[i] * 3 + 1] < 1.675;
      const c = front ? ck : new THREE.Color(hair);
      col.setXYZ(i, c.r, c.g, c.b);
    }
  }
  col.needsUpdate = true;

  // fold relief (bump from the rest position): creases around the elbows and knees, drape at the small of the back
  const bm = mesh.material;
  if (fabric) { bm.normalMap = fabric; bm.normalScale = new THREE.Vector2(0.45, 0.45); }
  const prev = bm.onBeforeCompile;
  const L = { el: B("lowerarm_l"), kn: B("calf_l"), wst: B("spine_01") };
  bm.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    if (sh.uniforms.uShirt) sh.uniforms.uShirt.value = new THREE.Color(shirt);
    if (sh.uniforms.uTieOn) sh.uniforms.uTieOn.value = 0;
    sh.fragmentShader = sh.fragmentShader.replace("float hw = (vRest.y - 1.17) * 0.36;", "float hw = max(0.0, vRest.y - 1.3) * 0.26;");
    sh.uniforms.uElb = { value: Math.abs(L.el.x) };
    sh.uniforms.uKnee = { value: L.kn.y };
    sh.uniforms.uWaist = { value: L.wst.y };
    sh.fragmentShader = "uniform float uElb;\nuniform float uKnee;\nuniform float uWaist;\n" + sh.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      if (vZone > 1.5 && vZone < 3.5) {
        vec3 q = vRest;
        float ax = abs(q.x);
        // sleeves: a few irregular creases around the arm, crowded at the inside of the elbow
        float wob = sin(q.y * 61.0 + q.z * 47.0) + 0.6 * sin(q.z * 93.0 - q.y * 37.0);
        float hs = smoothstep(0.26, 0.32, ax) * (1.0 - smoothstep(0.64, 0.66, ax)) * exp(-pow((ax - uElb) / 0.07, 2.0))
          * smoothstep(0.2, 0.9, sin(ax * 110.0 + 1.6 * wob)) * 0.0011;
        // trousers: creases at the back of the knee and over the shoe
        float leg = (1.0 - smoothstep(0.86, 0.92, q.y)) * (1.0 - smoothstep(0.24, 0.3, ax));
        float hl = leg * (exp(-pow((q.y - uKnee) / 0.06, 2.0)) * 0.0011 + exp(-pow((q.y - 0.11) / 0.04, 2.0)) * 0.0008)
          * smoothstep(0.1, 0.9, sin(q.y * 120.0 + 1.8 * sin(q.x * 53.0 + q.z * 31.0)));
        // the back: two soft diagonal drapes above the waist
        float hb = step(ax, 0.24) * smoothstep(0.0, -0.05, q.z) * exp(-pow((q.y - uWaist - 0.03) / 0.08, 2.0)) * sin(q.y * 45.0 + ax * 30.0) * 0.0007;
        float h = hs + hl + hb;
        vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
        vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
        normal = normalize(abs(det) * normal - grad);
      }`);
  };
  bm.customProgramCacheKey = () => "dressed-figure-2";
  bm.needsUpdate = true;

  const suitMat = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
  if (fabric) { suitMat.normalMap = fabric; suitMat.normalScale = new THREE.Vector2(0.45, 0.45); }
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.78, side: THREE.DoubleSide });

  // radius of the (re-fitted) body at a height, in a direction (for the skirt and the collars)
  const ringAt = (y, cz, dy = 0.012) => {
    const S = new Float32Array(36), C = new Float32Array(36);
    for (let i = 0; i < n; i++) {
      if (canon[i] !== i || Math.abs(P[i * 3 + 1] - y) > dy || Math.abs(P[i * 3]) > 0.3) continue;
      const th = Math.atan2(P[i * 3 + 2] - cz, P[i * 3]);
      const s = Math.min(35, Math.floor((th + Math.PI) / (2 * Math.PI) * 36));
      S[s] = Math.max(S[s], Math.hypot(P[i * 3], P[i * 3 + 2] - cz)); C[s]++;
    }
    for (let pass = 0; pass < 36; pass++) for (let s = 0; s < 36; s++) if (!C[s]) { const l = S[(s + 35) % 36], r = S[(s + 1) % 36]; if (l || r) { S[s] = Math.max(l, r); C[s] = 1; } }
    return (th) => { const sf = ((th + Math.PI) / (2 * Math.PI) * 36 - 0.5 + 36) % 36, s0 = Math.floor(sf), f = sf - s0; return S[s0] * (1 - f) + S[(s0 + 1) % 36] * f; };
  };

  // jacket skirt (standing only; seated, the tail lies on the chair): from the hips down, open at the front
  if (!seated) {
    const cz = pelvis.z - 0.01;
    const hip = ringAt(HEM + 0.02, cz, 0.02);
    const y0 = HEM + 0.035, y1 = seated ? 0.84 : 0.74, segs = 48, rows = 6, open = 0.5;
    const posA = [], uvA = [], ix = [];
    for (let r = 0; r <= rows; r++) {
      const f = r / rows, y = y0 + (y1 - y0) * f;
      for (let j = 0; j <= segs; j++) {
        const th = Math.PI / 2 + open + (j / segs) * (2 * Math.PI - 2 * open);   // +z is the front
        const vent = Math.abs(Math.cos(th + Math.PI / 2)) > 0 && Math.abs(th - 1.5 * Math.PI) < 0.03 && f > 0.55 ? 0.006 : 0;
        const rr = hip(th) + 0.012 + 0.03 * f + vent + 0.0025 * Math.sin(th * 9 + f * 2);
        posA.push(Math.cos(th) * rr, y, cz + Math.sin(th) * rr);
        uvA.push(j / segs * 4, f);
      }
    }
    for (let r = 0; r < rows; r++) for (let j = 0; j < segs; j++) {
      const a = r * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
      ix.push(a, c, b, b, c, d);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(posA, 3));
    sg.setAttribute("uv", new THREE.Float32BufferAttribute(uvA, 2));
    sg.setIndex(ix); sg.computeVertexNormals();
    bindTo(fig, mesh, new THREE.Mesh(sg, suitMat), "pelvis");
  }

  // collars: shirt collar around the neck, the jacket collar standing behind it (reads in silhouette and hides the
  // seam). Each band follows the real surface radius per angle (the base mesh neck is thick and not round).
  {
    const nAxis = B("Head").sub(neck).normalize();
    const ref = new THREE.Vector3(1, 0, 0);
    const wv = new THREE.Vector3().crossVectors(nAxis, ref).normalize();     // ~ +z (front)
    const uv = new THREE.Vector3().crossVectors(wv, nAxis).normalize();      // ~ +x
    const SEC = 48;
    const surf = (y0, y1) => {               // max radius per angle for points between heights y0..y1 along the neck axis
      const R = new Float32Array(SEC);
      const d = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        if (canon[i] !== i) continue;
        d.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).sub(neck);
        const t = d.dot(nAxis); if (t < y0 || t > y1) continue;
        const x = d.dot(uv), z = d.dot(wv), r = Math.hypot(x, z); if (r > 0.16) continue;
        const sct = Math.min(SEC - 1, Math.floor((Math.atan2(x, z) + Math.PI) / (2 * Math.PI) * SEC));
        R[sct] = Math.max(R[sct], r);
      }
      for (let pass = 0; pass < SEC; pass++) for (let k = 0; k < SEC; k++) if (!R[k]) R[k] = Math.max(R[(k + 1) % SEC], R[(k + SEC - 1) % SEC]);
      return R.map((_, k) => (R[k] * 2 + R[(k + 1) % SEC] + R[(k + SEC - 1) % SEC]) / 4);
    };
    // a band: rings at heights hs[] along the axis, radius = surface + off[], angles th0..th1 (0 = front, +x side positive)
    const band = (hs, R, off, th0, th1, segs = 44) => {
      const pa = [], ia = [];
      for (const [ri, h] of hs.entries()) for (let j = 0; j <= segs; j++) {
        const th = th0 + (th1 - th0) * j / segs;
        const sct = Math.min(SEC - 1, Math.floor((((th + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI) * SEC));
        const r = R[ri][sct] + off[ri];
        const p = neck.clone().addScaledVector(nAxis, h).addScaledVector(uv, Math.sin(th) * r).addScaledVector(wv, Math.cos(th) * r);
        pa.push(p.x, p.y, p.z);
      }
      for (let r = 0; r < hs.length - 1; r++) for (let j = 0; j < segs; j++) {
        const a = r * (segs + 1) + j, b = a + 1, c = a + segs + 1, e = c + 1;
        ia.push(a, b, c, b, e, c);
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.Float32BufferAttribute(pa, 3));
      gg.setIndex(ia); gg.computeVertexNormals();
      return gg;
    };
    // neck proper (above the trapezius slope), smoothed hard around the angle so the bands stay clean
    const raw = surf(0.02, 0.05);
    const Rn = raw.map((_, k) => { let a = 0; for (let d = -4; d <= 4; d++) a += raw[(k + d + SEC) % SEC]; return a / 9; });
    const sc = (f, add) => Rn.map((r) => r * f + add);
    // shirt collar: 4.5 cm up the neck, a small gap at the front
    bindTo(fig, mesh, new THREE.Mesh(band([0.0, 0.022, 0.046], [sc(1, 0.008), sc(1, 0.006), sc(1, 0.005)], [0, 0, 0], 0.24, 2 * Math.PI - 0.24), shirtMat), "neck_01");
    // jacket collar: a frustum from the shoulders up the back and sides of the neck; the shirt collar shows above it
    const lowR = surf(-0.05, -0.03), midR = surf(-0.025, -0.01);
    const sm = (R, add) => R.map((_, k) => { let a = 0; for (let d = -3; d <= 3; d++) a += R[(k + d + SEC) % SEC]; return a / 7 + add; });
    bindTo(fig, mesh, new THREE.Mesh(band([-0.04, -0.018, 0.004, 0.02], [sm(lowR, 0.012), sm(midR, 0.014), sc(1, 0.02), sc(1, 0.024)], [0, 0, 0, 0], 0.95, 2 * Math.PI - 0.95), suitMat), "spine_03");
    // the neck base below the collar: jacket at the back and sides, shirt at the front (no skin strip, no seam)
    const cs2 = new THREE.Color(suit), csh = new THREE.Color(shirt), dd = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (boneOf[i] !== "neck_01" && boneOf[i] !== "spine_03" && !boneOf[i].startsWith("clavicle")) continue;
      if (Z(i) !== 0 && Z(i) !== 5) continue;
      const c = canon[i];
      dd.set(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]).sub(neck);
      if (dd.dot(nAxis) > 0.004) continue;
      const fr = dd.dot(wv) > 0.55 * Math.hypot(dd.dot(uv), dd.dot(wv));
      zone.setX(i, fr ? 5 : 2);
      const cc = fr ? csh : cs2; col.setXYZ(i, cc.r, cc.g, cc.b);
    }
    zone.needsUpdate = true; col.needsUpdate = true;
  }

  // hair (Quaternius mesh, in bind space)
  {
    const hg = (await hairGeo()).clone();
    // fit to this (smaller) skull: ellipsoid skull, the volume outside it compressed to a short neat cut
    const hp = hg.attributes.position, c = [0, 1.722, -0.006], ax3 = [0.08, 0.088, 0.1];
    for (let i = 0; i < hp.count; i++) {
      const d = [hp.getX(i) - c[0], hp.getY(i) - c[1], hp.getZ(i) - c[2]];
      const rho = Math.hypot(d[0] / ax3[0], d[1] / ax3[1], d[2] / ax3[2]);
      if (rho <= 1.0) continue;
      const k = (1 + (rho - 1) * 0.42 + 0.012) / rho;
      hp.setXYZ(i, c[0] + d[0] * k, c[1] + d[1] * k, c[2] + d[2] * k);
    }
    hp.needsUpdate = true;
    hg.computeVertexNormals();
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.72, metalness: 0, normalMap: strandNormals(), side: THREE.DoubleSide });
    hairMat.normalScale = new THREE.Vector2(0.5, 0.5);
    const hm = new THREE.Mesh(hg, hairMat);
    bindTo(fig, mesh, hm, "Head");
  }
  for (const sd of ["l", "r"]) fig.bone(`upperarm_${sd}`).position.multiplyScalar(0.86);
  fig.bone("Head").scale.setScalar(1.05);
  return fig;
}
