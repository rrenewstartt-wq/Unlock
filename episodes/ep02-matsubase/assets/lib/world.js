// Shared 3D kit for the episode: renderer, faceless mannequin, camera keys.
// Every frame is a pure function of scene-local time t (seconds).
import * as THREE from "./three.module.min.js";

export { THREE };

export const C = {
  ground: "#1E2125",
  ink: "#E9E5DD",
  amber: "#F0A23B",
  skyCold: "#6E7F95",
};

export function makeRenderer(stage, clear) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080);
  renderer.setClearColor(clear);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.width = "1920px";
  renderer.domElement.style.height = "1080px";
  renderer.domElement.style.display = "block";
  stage.appendChild(renderer.domElement);
  return renderer;
}

export function mannequinMaterial(color = "#B9B4AC") {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.0 });
}

// Articulated faceless figure. Standing: pelvis at y = 1.0, head top ~1.87.
// clothes: optional { top, bottom, shoe } materials; skin parts keep `mat`.
export function makeFigure(mat, clothes = {}) {
  const top = clothes.top || mat;
  const bottom = clothes.bottom || mat;
  const shoe = clothes.shoe || mat;
  const root = new THREE.Group();
  const cap = (r, l, m0 = mat) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const pelvis = new THREE.Group();
  root.add(pelvis);
  const hips = cap(0.13, 0.12, bottom);
  hips.rotation.z = Math.PI / 2;
  hips.scale.set(1, 1, 0.8);
  pelvis.add(hips);
  const spine = new THREE.Group();
  pelvis.add(spine);
  const torso = cap(0.16, 0.32, top);
  torso.position.y = 0.3;
  torso.scale.set(1.18, 1, 0.72);
  spine.add(torso);
  const neck = new THREE.Group();
  neck.position.y = 0.62;
  spine.add(neck);
  const neckMesh = cap(0.045, 0.06);
  neckMesh.position.y = 0.02;
  neck.add(neckMesh);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 28, 18), mat);
  head.castShadow = true;
  head.scale.set(0.88, 1.14, 1);
  head.position.y = 0.15;
  neck.add(head);
  const arm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.235, 0.5, 0);
    spine.add(sh);
    const up = cap(0.052, 0.24, top);
    up.position.y = -0.17;
    sh.add(up);
    const el = new THREE.Group();
    el.position.y = -0.34;
    sh.add(el);
    const fo = cap(0.045, 0.22, top);
    fo.position.y = -0.16;
    el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), mat);
    hand.scale.set(0.8, 1.3, 0.55);
    hand.position.y = -0.35;
    hand.castShadow = true;
    el.add(hand);
    return { sh, el };
  };
  const leg = (side) => {
    const hp = new THREE.Group();
    hp.position.set(side * 0.1, -0.02, 0);
    pelvis.add(hp);
    const th = cap(0.078, 0.34, bottom);
    th.position.y = -0.24;
    hp.add(th);
    const kn = new THREE.Group();
    kn.position.y = -0.48;
    hp.add(kn);
    const sn = cap(0.062, 0.34, bottom);
    sn.position.y = -0.23;
    kn.add(sn);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.065, 0.2), shoe);
    ft.position.set(0, -0.47, 0.05);
    ft.castShadow = true;
    kn.add(ft);
    return { hp, kn };
  };
  return {
    root,
    pelvis,
    spine,
    neck,
    head,
    armL: arm(-1),
    armR: arm(1),
    legL: leg(-1),
    legR: leg(1),
  };
}

// Standing pose, optionally with a small weight shift.
export function poseStanding(f, lean = 0) {
  f.pelvis.position.y = 1.0;
  f.spine.rotation.set(lean, 0, 0);
  f.armL.sh.rotation.set(0, 0, -0.08);
  f.armR.sh.rotation.set(0, 0, 0.08);
  f.armL.el.rotation.set(-0.15, 0, 0);
  f.armR.el.rotation.set(-0.15, 0, 0);
  f.legL.hp.rotation.set(0, 0, 0);
  f.legR.hp.rotation.set(0, 0, 0);
}

// Lying on the sand, back against a wall behind (-z), legs out (+z), feet crossed.
export function poseLying(f) {
  f.pelvis.position.set(0, 0.13, 0);
  f.spine.rotation.set(-0.56, 0, 0);
  f.neck.rotation.set(0.22, 0.12, 0.08);
  f.armL.sh.rotation.set(0.45, 0, -0.22);
  f.armL.el.rotation.set(-0.35, 0, 0);
  f.armR.sh.rotation.set(0.45, 0, 0.22);
  f.armR.el.rotation.set(-0.35, 0, 0);
  f.legL.hp.rotation.set(-Math.PI / 2 + 0.03, 0.06, 0);
  f.legR.hp.rotation.set(-Math.PI / 2 + 0.1, -0.15, 0);
  f.legL.kn.rotation.set(0, 0, 0);
  f.legR.kn.rotation.set(0.05, 0, 0);
}

export const ease = {
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  out: (x) => 1 - Math.pow(1 - x, 3),
};

export const clamp01 = (x) => Math.max(0, Math.min(1, x));

// keys: [{t, pos:[x,y,z], look:[x,y,z], fov?, cut?}] sorted by t. Eased hold-and-move;
// a key with cut: true is a hard cut — the camera jumps to it at its t instead of travelling there.
export function cameraAt(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t && b.cut) return a;
    if (t <= b.t) {
      const k = (b.ease === "linear" ? (x) => x : ease.sine)(clamp01((t - a.t) / (b.t - a.t)));
      const mix = (u, v) => u.map((x, j) => x + (v[j] - x) * k);
      return {
        pos: mix(a.pos, b.pos),
        look: mix(a.look, b.look),
        fov: (a.fov ?? 35) + ((b.fov ?? 35) - (a.fov ?? 35)) * k,
      };
    }
  }
  return keys[keys.length - 1];
}

export function applyCamera(camera, c) {
  camera.position.set(...c.pos);
  camera.lookAt(...c.look);
  const fov = c.fov ?? 35;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

// Seeded hash in [0,1).
export function hash(i) {
  let x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
