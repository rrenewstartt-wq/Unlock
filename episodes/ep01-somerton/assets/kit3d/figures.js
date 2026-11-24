// thumbkit copy: Quaternius CC0 base male (thumbkit/cache/figures/, fetched by scripts/thumb_assets.py figures).
// Realistic figures from the CC0 Quaternius base meshes: clothing painted per vertex by the bone that
// moves it (jacket, trousers, shoes, shirt V and tie, faceless matte skin, short hair), posed by rotating
// bones about world axes. Deterministic: everything is set once at load.
import * as THREE from "../lib/three.module.min.js";
import { GLTFLoader } from "./addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = {};
let FABRIC = null; // optional normal map for clothes (wool weave)
export function setFabric(tex) { FABRIC = tex; }

const PAL = {
  man: { skin: "#a99c90", hair: "#2a2622", jacket: "#3b3834", trousers: "#4a4239", shoes: "#1d1b19", shirt: "#d6d2ca", tie: "#5a3634" },
  woman: { skin: "#ab9e93", hair: "#3a3029", jacket: "#5a5650", trousers: "#5a5650", shoes: "#24211e", shirt: "#cfcac1", tie: "#5a5650", skirt: true },
  onlooker: { skin: "#7d746c", hair: "#24211e", jacket: "#2f2d2a", trousers: "#35322e", shoes: "#1a1917", shirt: "#8a8781", tie: "#2f2d2a" },
  // Mixed look: the focus figure's clothes a little lighter, so the amber grade reads.
  manLight: { skin: "#c9b6a3", hair: "#3b3027", jacket: "#7d7266", trousers: "#6f655b", shoes: "#3a3029", shirt: "#e5ddd0", tie: "#7a4a3a" },
  // Clay world: everyone matte grey, a few values apart so clothes still read.
  clay: { skin: "#d3d0ca", hair: "#76736e", jacket: "#9b9892", trousers: "#8d8a85", shoes: "#6b6863", shirt: "#e2dfd9", tie: "#7f7c77" },
  // Episode reconstructions (thumbkit/film.js): darker matte skin so the featureless face does not glow in daylight.
  film: { skin: "#7f7368", hair: "#24201c", jacket: "#3a3733", trousers: "#45403a", shoes: "#1c1a18", shirt: "#c9c4bb", tie: "#3f3a36" },
  filmWoman: { skin: "#84776c", hair: "#2e2620", jacket: "#4f4a45", trousers: "#4f4a45", shoes: "#211e1b", shirt: "#c4bfb6", tie: "#4f4a45", skirt: true },
  // The subject: the one figure in the channel's amber.
  subject: { skin: "#b9813c", hair: "#6e4818", jacket: "#a8692a", trousers: "#9c6226", shoes: "#5e3c17", shirt: "#c08a46", tie: "#8a5520" },
};

// Zones: 0 skin, 1 hair, 2 jacket, 3 trousers, 4 shoes, 5 shirt (collar/cuff).
function zoneOf(bone, p, female) {
  const [x, y, z] = p;
  if (/^(Head|neck_01)$/.test(bone)) {
    if (y > 1.738 || (y > 1.62 && z < -0.045)) return 1;
    if (bone === "neck_01" && y < 1.535) return 5;
    return 0;
  }
  if (/(index|middle|pinky|ring|thumb|hand)/.test(bone)) return 0;
  if (/^(foot|ball)/.test(bone)) return 4;
  if (/^(thigh|calf|pelvis)/.test(bone)) return female && /^calf/.test(bone) ? 0 : 3;
  if (/^lowerarm/.test(bone) && Math.abs(x) > 0.665) return 5;
  return 2;
}

const ZONE_KEYS = ["skin", "hair", "jacket", "trousers", "shoes", "shirt"];

// Cloth: Laplacian-smooth the clothed zones (removes muscle definition) and inflate them a little.
function clothe(geo, zone, face) {
  const pos = geo.attributes.position;
  const n = pos.count;
  // Weld duplicates (uv seams) by position so smoothing sees one surface.
  const key = new Map();
  const canon = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    if (!key.has(k)) key.set(k, i);
    canon[i] = key.get(k);
  }
  const nb = Array.from({ length: n }, () => new Set());
  const idx = geo.index.array;
  for (let t = 0; t < idx.length; t += 3) {
    const a = canon[idx[t]], b = canon[idx[t + 1]], c = canon[idx[t + 2]];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const P = Float32Array.from(pos.array);
  // Weight per vertex: jacket 0.55, trousers 0.4, the face 0.6 (a featureless face, as reconstructions use).
  const wOf = (i) => (zone[i] === 2 ? 0.55 : zone[i] === 3 ? 0.4 : zone[i] === 4 ? 0.7 : face[i] ? 0.85 : 0);
  for (let it = 0; it < 16; it++) {
    const Q = Float32Array.from(P);
    for (let i = 0; i < n; i++) {
      const w = wOf(i);
      if (canon[i] !== i || !w || nb[i].size === 0) continue;
      let sx = 0, sy = 0, sz = 0;
      for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; }
      const m = nb[i].size;
      Q[i * 3] = P[i * 3] * (1 - w) + (sx / m) * w;
      Q[i * 3 + 1] = P[i * 3 + 1] * (1 - w) + (sy / m) * w;
      Q[i * 3 + 2] = P[i * 3 + 2] * (1 - w) + (sz / m) * w;
    }
    P.set(Q);
  }
  for (let i = 0; i < n; i++) { const c = canon[i]; P[i * 3] = P[c * 3]; P[i * 3 + 1] = P[c * 3 + 1]; P[i * 3 + 2] = P[c * 3 + 2]; }
  pos.array.set(P);
  pos.needsUpdate = true;
  // One normal per welded point, so uv-seam duplicates move together (no cracks) and shade alike.
  const weldNormals = () => {
    geo.computeVertexNormals();
    const nr = geo.attributes.normal;
    const acc = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = canon[i]; acc[c * 3] += nr.getX(i); acc[c * 3 + 1] += nr.getY(i); acc[c * 3 + 2] += nr.getZ(i); }
    for (let i = 0; i < n; i++) {
      const c = canon[i];
      const x = acc[c * 3], y = acc[c * 3 + 1], z = acc[c * 3 + 2];
      const l = Math.hypot(x, y, z) || 1;
      nr.setXYZ(i, x / l, y / l, z / l);
    }
    nr.needsUpdate = true;
    return nr;
  };
  const nr = weldNormals();
  for (let i = 0; i < n; i++) {
    const d = zone[i] === 2 ? 0.016 : zone[i] === 3 ? 0.01 : 0;
    if (!d) continue;
    pos.setXYZ(i, pos.getX(i) + nr.getX(i) * d, pos.getY(i) + nr.getY(i) * d, pos.getZ(i) + nr.getZ(i) * d);
  }
  weldNormals();
}

function paint(mesh, pal, female) {
  const g = mesh.geometry;
  const pos = g.attributes.position;
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  const bones = mesh.skeleton.bones;
  const zone = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    zone[i] = zoneOf(bones[best].name, [pos.getX(i), pos.getY(i), pos.getZ(i)], female);
  }
  const face = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    face[i] = zone[i] === 0 && y > 1.57 && y < 1.74 && z > -0.03 ? 1 : 0;
  }
  clothe(g, zone, face);
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(pal[ZONE_KEYS[zone[i]]]); // Color.set converts sRGB hex to the linear working space
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("zone", new THREE.BufferAttribute(zone, 1));
  g.deleteAttribute("color_1");
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  if (FABRIC) { mat.normalMap = FABRIC; mat.normalScale = new THREE.Vector2(2.2, 2.2); }
  const shirt = new THREE.Color(pal.shirt), tie = new THREE.Color(pal.tie);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uShirt = { value: shirt };
    sh.uniforms.uTie = { value: tie };
    sh.uniforms.uTieOn = { value: female ? 0 : 1 };
    sh.vertexShader = "attribute float zone;\nvarying float vZone;\nvarying vec3 vRest;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nvZone = zone; vRest = position;");
    sh.fragmentShader = "uniform vec3 uShirt;\nuniform vec3 uTie;\nuniform float uTieOn;\nvarying float vZone;\nvarying vec3 vRest;\n" + sh.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\n  normal = normalize(mix(nonPerturbedNormal, normal, (vZone > 1.5 && vZone < 3.5) ? 1.0 : 0.0));").replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      if (vZone > 1.5 && vZone < 2.5 && vRest.z > 0.035 && vRest.y > 1.17 && vRest.y < 1.53) {
        float hw = (vRest.y - 1.17) * 0.36;
        float ax = abs(vRest.x);
        if (ax < hw) diffuseColor.rgb = (uTieOn > 0.5 && ax < 0.021 + (1.5 - vRest.y) * 0.02 && vRest.y < 1.5) ? uTie : uShirt;
      }`);
  };
  mesh.material = mat;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

export async function loadFigure(url, kind = "man") {
  if (!cache[url]) cache[url] = loader.loadAsync(url);
  const gltf = await cache[url];
  const { clone } = await import("./addons/utils/SkeletonUtils.js");
  const scene = clone(gltf.scene);
  const female = /Female/.test(url);
  const pal = PAL[kind];
  scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (/Eye/.test(o.name)) { o.visible = false; return; }  // faceless: no eyes or brows
    o.geometry = o.geometry.clone(); // clones share geometry; each figure gets its own colours
    paint(o, pal, female);
    o.frustumCulled = false;
  });
  const bone = (n) => scene.getObjectByName(n);
  // Less "superhero": narrower chest and shoulders, head kept at its size.
  bone("spine_03").scale.setScalar(0.93);
  bone("neck_01").scale.setScalar(1 / 0.93);
  const root = new THREE.Group();
  root.add(scene);
  return { root, scene, bone };
}

const _q = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _axis = new THREE.Vector3();
// Rotate a bone by `angle` about an axis given in the figure's model frame (x: its left, y: up, z: facing).
export function turn(fig, name, axis, angle) {
  const b = fig.bone(name);
  fig.scene.updateMatrixWorld(true);
  b.parent.getWorldQuaternion(_qp);
  fig.root.getWorldQuaternion(_q);
  _axis.set(...axis).applyQuaternion(_q).applyQuaternion(_qp.clone().invert()).normalize();
  b.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(_axis, angle));
}

export function poseArmsDown(fig, spread = 0.12) {
  turn(fig, "upperarm_l", [0, 0, 1], -(Math.PI / 2 - spread));
  turn(fig, "upperarm_r", [0, 0, 1], Math.PI / 2 - spread);
  turn(fig, "lowerarm_l", [1, 0, 0], -0.12);
  turn(fig, "lowerarm_r", [1, 0, 0], -0.12);
}

// Half-lying against a wall behind (-z): torso reclined, legs straight out, right ankle over the left.
export function poseReclined(fig, tilt = 0.5) {
  poseArmsDown(fig, 0.16);
  turn(fig, "upperarm_l", [1, 0, 0], -0.32);
  turn(fig, "upperarm_r", [1, 0, 0], -0.32);
  turn(fig, "lowerarm_l", [1, 0, 0], -0.35);
  turn(fig, "lowerarm_r", [1, 0, 0], -0.35);
  turn(fig, "thigh_l", [1, 0, 0], -(Math.PI / 2 - tilt));
  turn(fig, "thigh_r", [1, 0, 0], -(Math.PI / 2 - tilt) - 0.07);
  turn(fig, "thigh_r", [0, 1, 0], 0.11);
  turn(fig, "thigh_l", [0, 1, 0], -0.03);
  turn(fig, "spine_02", [1, 0, 0], 0.12);
  turn(fig, "neck_01", [0, 0, 1], 0.2);
  turn(fig, "neck_01", [1, 0, 0], 0.08);
  fig.scene.rotation.x = -tilt;
}

// Put the lowest point on the ground and the back of the head `gap` in front of a wall at z = wallZ.
// Skin vertices (hands, face) are ignored for the ground: a hand resting by the body is often the lowest
// point and would leave the seat and legs floating a few cm above the sand.
export function settle(fig, ground = 0, wallZ = null, gap = 0.02) {
  fig.root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  fig.scene.traverse((o) => {
    if (!o.isSkinnedMesh || !o.visible) return;
    const pos = o.geometry.attributes.position;
    const zone = o.geometry.attributes.zone;
    for (let i = 0; i < pos.count; i += 3) {
      if (zone && zone.getX(i) < 0.5) continue;
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
    }
  });
  fig.root.position.y += ground - box.min.y;
  if (wallZ !== null) fig.root.position.z += wallZ + gap - box.min.z;
}

// Seated. chair: thighs level, shins down — call settle(fig, 0) so the feet stand on the floor, then put the seat
// under the pelvis (about 0.45 m). seiza: kneeling on the floor,
// shins folded under the thighs (tatami). forearms: forearms forward as if resting on a table/kotatsu (0..1).
export function poseSeated(fig, { style = "chair", forearms = 0.8, lean = 0.05 } = {}) {
  poseArmsDown(fig, 0.14);
  if (style === "seiza") {
    turn(fig, "thigh_l", [1, 0, 0], -Math.PI / 2 + 0.05);
    turn(fig, "thigh_r", [1, 0, 0], -Math.PI / 2 + 0.05);
    turn(fig, "calf_l", [1, 0, 0], Math.PI - 0.12);
    turn(fig, "calf_r", [1, 0, 0], Math.PI - 0.12);
    turn(fig, "foot_l", [1, 0, 0], 0.9);
    turn(fig, "foot_r", [1, 0, 0], 0.9);
  } else {
    turn(fig, "thigh_l", [1, 0, 0], -Math.PI / 2);
    turn(fig, "thigh_r", [1, 0, 0], -Math.PI / 2);
    turn(fig, "thigh_l", [0, 1, 0], -0.06);
    turn(fig, "thigh_r", [0, 1, 0], 0.06);
    turn(fig, "calf_l", [1, 0, 0], Math.PI / 2);
    turn(fig, "calf_r", [1, 0, 0], Math.PI / 2);
  }
  turn(fig, "spine_02", [1, 0, 0], lean);
  if (forearms) {
    turn(fig, "upperarm_l", [1, 0, 0], -0.35 * forearms);
    turn(fig, "upperarm_r", [1, 0, 0], -0.35 * forearms);
    turn(fig, "lowerarm_l", [1, 0, 0], -1.15 * forearms);
    turn(fig, "lowerarm_r", [1, 0, 0], -1.15 * forearms);
  }
}
