// Dress a film-kit figure (assets/kit3d/figures.js) so it reads as a clothed person, not a painted base mesh:
// short dark hair, a suit (jacket body + sleeves, trousers) as smooth shells fitted to the body, a shirt collar and cuffs,
// natural skin tone. Every piece is fitted in the rest pose from the figure's own skinned vertices and attached to its
// bone (Object3D.attach keeps the world transform), so it follows any bone pose set afterwards. Deterministic.
//
//   const man = await f.figure("film");
//   dress(man, { suit: "#2c2b29", shirt: "#bdb8ae", fabric: wool.normalMap });   // call BEFORE posing
//   poseSeated(man, ...); settle(man, 0); f.hold(man);
//
// The record gives no clothes for anyone in this episode (SPEC: "옷은 어두운 무채색"), so suits are plain dark neutrals.
import { THREE } from "../kit3d/film.js";

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const n3 = (x, y, z, s) => 0.5 * Math.sin(x * 37.1 + s) * Math.sin(y * 29.3 + s * 1.7) * Math.sin(z * 31.7 + s * 2.3)
  + 0.3 * Math.sin(x * 83.0 + y * 61.0 + s) * Math.sin(z * 71.0 - s);

let STRANDS = null;
function strandNormals() {               // vertical hair strands as a normal map (canvas, seeded)
  if (STRANDS) return STRANDS;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "rgb(128,128,255)"; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2600; i++) {
    const px = hash(i * 1.3) * 512, py = hash(i * 2.9) * 256, l = 20 + hash(i * 4.1) * 70;
    const dx = hash(i * 7.3) > 0.5 ? 168 : 88;
    x.strokeStyle = `rgba(${dx},128,235,0.55)`;
    x.lineWidth = 1 + hash(i * 5.7) * 1.5;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (hash(i * 9.1) - 0.5) * 6, py + l); x.stroke();
  }
  STRANDS = new THREE.CanvasTexture(c);
  STRANDS.wrapS = STRANDS.wrapT = THREE.RepeatWrapping;
  STRANDS.repeat.set(6, 2);
  return STRANDS;
}

function bodyMesh(fig) {
  let best = null;
  fig.scene.traverse((o) => { if (o.isSkinnedMesh && o.visible && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o; });
  return best;
}

// world-space vertices of the rest pose with their dominant bone name and zone
function sample(fig) {
  fig.root.updateMatrixWorld(true);
  const m = bodyMesh(fig);
  const g = m.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, zone = g.attributes.zone;
  const bones = m.skeleton.bones;
  const out = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    let b = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; b = si.getComponent(i, k); } }
    m.getVertexPosition(i, v);
    v.applyMatrix4(m.matrixWorld);
    out.push({ i, p: v.clone(), bone: bones[b].name, zone: zone ? zone.getX(i) : -1 });
  }
  return { mesh: m, verts: out };
}

const wp = (fig, name) => fig.bone(name).getWorldPosition(new THREE.Vector3());

// A tube shell along a bone segment: radius profile from the vertices of `bones`, `rings` slices, elliptic sections
// (semi-axes measured along two perpendicular directions), slightly inflated.
function tube(verts, bones, a, b, { rings = 8, extend = [0.03, 0.03], inflate = 1.0, pad = 0.008, segs = 28, side = null, close = false, pct = 0.8 } = {}) {
  const axis = b.clone().sub(a);
  const len = axis.length();
  axis.normalize();
  // perpendicular frame: u roughly the figure's x (or z for vertical limbs), w = axis × u
  const ref = Math.abs(axis.x) > 0.8 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const w = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const u = new THREE.Vector3().crossVectors(w, axis).normalize();
  const t0 = -extend[0], t1 = len + extend[1];
  const slices = Array.from({ length: rings }, () => ({ pu: [], pw: [], cu: 0, cw: 0, n: 0 }));
  const sel = verts.filter((q) => bones.includes(q.bone) && (!side || side(q.p)));
  for (const q of sel) {
    const d = q.p.clone().sub(a);
    const t = d.dot(axis);
    if (t < t0 || t > t1) continue;
    const k = Math.min(rings - 1, Math.max(0, Math.floor((t - t0) / (t1 - t0) * rings)));
    const s = slices[k];
    s.pu.push(d.dot(u)); s.pw.push(d.dot(w)); s.cu += d.dot(u); s.cw += d.dot(w); s.n++;
  }
  // per slice: centre and semi-axes (95th percentile of |offset|)
  const prof = slices.map((s) => {
    if (!s.n) return null;
    const cu = s.cu / s.n, cw = s.cw / s.n;
    const q95 = (arr, c) => { const v = arr.map((x) => Math.abs(x - c)).sort((x, y) => x - y); return v[Math.floor(v.length * pct)] || v[v.length - 1]; };
    return { cu, cw, ru: q95(s.pu, cu) * inflate + pad, rw: q95(s.pw, cw) * inflate + pad };
  });
  // fill gaps from neighbours, smooth
  for (let k = 0; k < rings; k++) if (!prof[k]) prof[k] = prof[k - 1] || prof.find(Boolean);
  const sm = prof.map((p, k) => {
    const nb = [prof[k - 1], p, prof[k + 1]].filter(Boolean);
    const avg = (key) => nb.reduce((s, x) => s + x[key], 0) / nb.length;
    return { cu: avg("cu"), cw: avg("cw"), ru: Math.max(p.ru, avg("ru")), rw: Math.max(p.rw, avg("rw")) };
  });
  const posArr = [], idx = [], uvArr = [];
  for (let k = 0; k < rings; k++) {
    const t = t0 + (t1 - t0) * (k + 0.5) / rings;
    const s = sm[k];
    for (let j = 0; j <= segs; j++) {
      const ang = (j / segs) * Math.PI * 2;
      const P = a.clone().addScaledVector(axis, t)
        .addScaledVector(u, s.cu + Math.cos(ang) * s.ru).addScaledVector(w, s.cw + Math.sin(ang) * s.rw);
      // soft cloth folds: a little noise
      const f = 0.004 * n3(P.x, P.y, P.z, k);
      P.addScaledVector(u, Math.cos(ang) * f).addScaledVector(w, Math.sin(ang) * f);
      posArr.push(P.x, P.y, P.z);
      uvArr.push(j / segs * 2, t * 6);
    }
  }
  for (let k = 0; k < rings - 1; k++) for (let j = 0; j < segs; j++) {
    const A = k * (segs + 1) + j, B = A + 1, C = A + segs + 1, D = C + 1;
    idx.push(A, C, B, B, C, D);
  }
  if (close) {   // cap both ends (fan to the slice centre)
    for (const [k, flip] of [[0, true], [rings - 1, false]]) {
      const t = t0 + (t1 - t0) * (k + 0.5) / rings, s = sm[k];
      const c = a.clone().addScaledVector(axis, t).addScaledVector(u, s.cu).addScaledVector(w, s.cw);
      const ci = posArr.length / 3;
      posArr.push(c.x, c.y, c.z); uvArr.push(0.5, 0.5);
      for (let j = 0; j < segs; j++) { const A = k * (segs + 1) + j; if (flip) idx.push(ci, A, A + 1); else idx.push(ci, A + 1, A); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, prof: sm, axis, u, w, t0, t1 };
}

function ringBand(center, axis, r, h, segs = 32) {     // an open band (collar, cuff) around an axis
  const g = new THREE.CylinderGeometry(r, r * 1.04, h, segs, 1, true);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()));
  g.applyMatrix4(m);
  g.translate(center.x, center.y, center.z);
  return g;
}

export function dress(fig, { suit = "#2b2a28", trousers = null, shirt = "#b9b4aa", hair = "#1b1815", skin = "#674c3e", fabric = null } = {}) {
  const S = sample(fig);
  const V = S.verts;
  const add = (geo, mat, boneName) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    fig.root.add(mesh);
    fig.root.updateMatrixWorld(true);
    fig.bone(boneName).attach(mesh);
    return mesh;
  };
  // skin: natural tone on the skin zone (hands, neck, face)
  const col = S.mesh.geometry.attributes.color;
  const sk = new THREE.Color(skin);
  for (const q of V) if (q.zone === 0 || (q.zone === 5 && q.bone === "neck_01")) col.setXYZ(q.i, sk.r, sk.g, sk.b);
  col.needsUpdate = true;
  // the base mesh's clothed zones (jacket 2, trousers 3) are drawn by the shells instead: discard them, so the
  // muscular base body never shapes the silhouette
  const bm = S.mesh.material;
  const prev = bm.onBeforeCompile;
  bm.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", "if (vZone > 1.5 && vZone < 3.5) discard;\n#include <color_fragment>");
  };
  bm.customProgramCacheKey = () => "dressed-figure";
  bm.needsUpdate = true;

  const cloth = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
  if (fabric) { cloth.normalMap = fabric; cloth.normalScale = new THREE.Vector2(0.7, 0.7); }
  const pants = cloth.clone();
  pants.color = new THREE.Color(trousers || suit);
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8, side: THREE.DoubleSide });

  // jacket body: pelvis → neck, front/back elliptic slices, hem below the hips
  const pelvis = wp(fig, "pelvis"), neck = wp(fig, "neck_01");
  const torsoBones = ["pelvis", "spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r"];
  const body = tube(V, torsoBones, pelvis.clone().add(new THREE.Vector3(0, -0.12, 0)), neck.clone().add(new THREE.Vector3(0, -0.02, 0)),
    { rings: 12, extend: [0, 0], pct: 0.72, inflate: 1.0, pad: 0.014, segs: 40, side: (p) => Math.abs(p.x) < 0.24 });
  add(body.geo, cloth, "spine_02");

  // sleeves (jacket) and trouser legs, with joint caps so bends do not open gaps
  for (const s of ["l", "r"]) {
    const sh = wp(fig, `upperarm_${s}`), el = wp(fig, `lowerarm_${s}`), wr = wp(fig, `hand_${s}`);
    const up = tube(V, [`upperarm_${s}`], sh, el, { rings: 6, extend: [0.05, 0.03], pct: 0.75, pad: 0.012 });
    add(up.geo, cloth, `upperarm_${s}`);
    const lo = tube(V, [`lowerarm_${s}`], el, wr, { rings: 6, extend: [0.03, -0.02], pct: 0.85, pad: 0.012 });
    add(lo.geo, cloth, `lowerarm_${s}`);
    const r0 = Math.max(up.prof[0].ru, up.prof[0].rw);
    const cap = new THREE.SphereGeometry(r0 * 0.86, 20, 14); cap.translate(sh.x, sh.y, sh.z);
    add(cap, cloth, `upperarm_${s}`);
    const re = Math.max(lo.prof[0].ru, lo.prof[0].rw);
    const elb = new THREE.SphereGeometry(re * 1.0, 18, 12); elb.translate(el.x, el.y, el.z);
    add(elb, cloth, `lowerarm_${s}`);
    // shirt cuff just showing at the wrist
    const axis = wr.clone().sub(el).normalize();
    const lastR = Math.max(lo.prof[5].ru, lo.prof[5].rw);
    add(ringBand(wr.clone().addScaledVector(axis, -0.035), axis, lastR * 0.92, 0.025), shirtMat, `lowerarm_${s}`);

    const hp = wp(fig, `thigh_${s}`), kn = wp(fig, `calf_${s}`), an = wp(fig, `foot_${s}`);
    const th = tube(V, [`thigh_${s}`], hp, kn, { rings: 7, extend: [0.1, 0.03], pct: 0.85, pad: 0.012 });
    add(th.geo, pants, `thigh_${s}`);
    const ca = tube(V, [`calf_${s}`], kn, an, { rings: 7, extend: [0.03, -0.03], pct: 0.85, pad: 0.014 });
    add(ca.geo, pants, `calf_${s}`);
    const rk = Math.max(ca.prof[0].ru, ca.prof[0].rw);
    const knee = new THREE.SphereGeometry(rk * 1.02, 18, 12); knee.translate(kn.x, kn.y, kn.z);
    add(knee, pants, `calf_${s}`);
  }

  // collars: the shirt collar around the neck, the jacket collar folded behind it (reads in silhouette)
  const head = wp(fig, "Head");
  const nAxis = head.clone().sub(neck).normalize();
  const neckV = V.filter((q) => q.bone === "neck_01");
  let nr = 0; for (const q of neckV) { const d = q.p.clone().sub(neck); const t = d.dot(nAxis); nr = Math.max(nr, d.addScaledVector(nAxis, -t).length()); }
  nr = Math.min(nr, 0.075);
  const sc = ringBand(neck.clone().addScaledVector(nAxis, 0.028), nAxis, nr * 0.9 + 0.006, 0.036);
  add(sc, shirtMat, "neck_01");
  const jc = new THREE.TorusGeometry(nr + 0.022, 0.012, 10, 36);
  jc.scale(1.12, 1, 1.0);
  jc.rotateX(Math.PI / 2 - 0.25);
  jc.translate(neck.x, neck.y - 0.012, neck.z - 0.012);
  add(jc, cloth, "spine_03");

  // hair: an ellipsoid cap fitted to the head, cut at a hairline (forehead high, sides above the ears, nape low)
  const headV = V.filter((q) => q.bone === "Head");
  const hb = new THREE.Box3(); for (const q of headV) hb.expandByPoint(q.p);
  const hc = hb.getCenter(new THREE.Vector3()), he = hb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const sph = new THREE.SphereGeometry(1, 48, 32);
  const P = sph.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const r = 1 + 0.025 * n3(x, y, z, 3) + (y > 0.3 ? 0.03 * (y - 0.3) : 0);
    P.setXYZ(i, hc.x + x * he.x * 1.0 * r, hc.y + 0.01 + y * he.y * 1.02 * r, hc.z - 0.008 + z * he.z * 1.04 * r);
  }
  const keep = [];
  const ix = sph.index.array;
  const ok = (i) => { const y = (P.getY(i) - hc.y) / he.y, z = (P.getZ(i) - hc.z) / he.z;
    return y > 0.14 + 0.55 * Math.max(0, z) - 0.6 * Math.max(0, -z); };
  for (let t = 0; t < ix.length; t += 3) if (ok(ix[t]) && ok(ix[t + 1]) && ok(ix[t + 2])) keep.push(ix[t], ix[t + 1], ix[t + 2]);
  sph.setIndex(keep);
  sph.computeVertexNormals();
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.62, metalness: 0, normalMap: strandNormals(), side: THREE.DoubleSide });
  hairMat.normalScale = new THREE.Vector2(0.8, 0.8);
  add(sph, hairMat, "Head");
  return fig;
}
