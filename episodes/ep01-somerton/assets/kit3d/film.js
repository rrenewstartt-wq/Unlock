// Film kit: thumbkit's CC0 photoreal scene builder (Poly Haven HDRI/PBR textures/models, Quaternius figures)
// running as a HyperFrames 3D scene, so episode reconstructions look like the thumbnails instead of
// primitive mannequins. Copied into an episode by `python3 scripts/kit3d.py episodes/<ep>`.
//
//   import { film, THREE } from "../kit3d/film.js";
//   export function createRoom(stage, opts) {
//     return film(stage, "room", { hdri: "brown_photostudio_07", exposure: 0.9 }, async (f) => {
//       await f.surface("dark_wood", { w: 8, h: 8, repeat: 4 });
//       const man = await f.figure("man");            // realistic faceless figure, posable by bone
//       f.key({ pos: [2, 4, 2], target: [0, 1, 0], intensity: 60 });
//       return (t) => { f.shot(opts.camera, t); };     // per-frame update; t = scene-local seconds
//     });
//   }
//
// Determinism: everything is built once inside a window.__hf.buildReady promise (the first seek waits for it);
// render(t) is a pure function of t. Bone animation: call f.rest(fig) at the top of each frame, then pose.
import { Thumb, THREE, CACHE } from "./thumbkit.js";
import { loadFigure, turn, settle, poseArmsDown, poseReclined, poseSeated, setFabric } from "./figures.js";

export { THREE, turn, settle, poseArmsDown, poseReclined, poseSeated, setFabric };

export const ease = {
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  out: (x) => 1 - Math.pow(1 - x, 3),
};
export const clamp01 = (x) => Math.max(0, Math.min(1, x));

// keys: [{t, pos, look, fov?, cut?, ease?}] — same format as scenes_kit.cam_shots / world.js.
export function cameraAt(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t && b.cut) return a;
    if (t <= b.t) {
      const k = (b.ease === "linear" ? (x) => x : ease.sine)(clamp01((t - a.t) / (b.t - a.t)));
      const mix = (u, v) => u.map((x, j) => x + (v[j] - x) * k);
      return { pos: mix(a.pos, b.pos), look: mix(a.look, b.look), fov: (a.fov ?? 35) + ((b.fov ?? 35) - (a.fov ?? 35)) * k };
    }
  }
  return keys[keys.length - 1];
}

const FIG = {
  film: ["Superhero_Male_FullBody", "film"],
  filmWoman: ["Superhero_Female_FullBody", "filmWoman"],
  man: ["Superhero_Male_FullBody", "man"],
  manLight: ["Superhero_Male_FullBody", "manLight"],
  onlooker: ["Superhero_Male_FullBody", "onlooker"],
  subject: ["Superhero_Male_FullBody", "subject"],
  clay: ["Superhero_Male_FullBody", "clay"],
  woman: ["Superhero_Female_FullBody", "woman"],
};

export class Film extends Thumb {
  static async create(stage, o = {}) {
    const f = new Film();
    f.stage = stage;
    await f._init(o);
    return f;
  }

  async _init({ width = 1920, height = 1080, hdri = null, envIntensity = 1, exposure = 1, background = "#000000",
    envBackground = false, fog = null, shadowSize = 2048, antialias = true } = {}) {
    this.w = width; this.h = height;
    this.shadowSize = shadowSize;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias, alpha: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(width, height);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = exposure;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    Object.assign(r.domElement.style, { width: `${width}px`, height: `${height}px`, display: "block" });
    this.stage.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(background);
    if (fog) s.fog = new THREE.FogExp2(fog.color || background, fog.density || 0.08);
    this.cam = new THREE.PerspectiveCamera(35, width / height, 0.02, 400);
    this.focusSet = new Set();
    this.poses = new Map();
    if (hdri) {
      const pm = new THREE.PMREMGenerator(r);
      const { HDRLoader } = await import("./addons/loaders/HDRLoader.js");
      const hdr = await new HDRLoader().loadAsync(`${CACHE}/hdris/${hdri}.hdr`);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      s.environment = pm.fromEquirectangular(hdr).texture;
      s.environmentIntensity = envIntensity;
      if (envBackground) { s.background = hdr; s.backgroundIntensity = envIntensity; }
    }
  }

  // Realistic faceless figure (see figures.js palettes). The bind pose is stored so f.rest(fig) can reset it.
  async figure(kind = "man") {
    const [file, pal] = FIG[kind] || FIG.man;
    const fig = await loadFigure(`${CACHE}/figures/${file}.gltf`, pal);
    this.scene.add(fig.root);
    // Softer weave than the thumbnails: video close-ups move, and a strong normal map crawls.
    fig.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.normalMap) o.material.normalScale.set(0.9, 0.9); } });
    return fig;
  }

  // Remember the current pose of a figure (call after the static pose is set), restore it each frame.
  hold(fig) {
    const q = [];
    fig.scene.traverse((o) => { if (o.isBone) q.push([o, o.quaternion.clone()]); });
    this.poses.set(fig, { q, pos: fig.root.position.clone(), rot: fig.root.rotation.clone() });
  }

  rest(fig) {
    const p = this.poses.get(fig);
    if (!p) return;
    for (const [b, q] of p.q) b.quaternion.copy(q);
    fig.root.position.copy(p.pos);
    fig.root.rotation.copy(p.rot);
  }

  key(o = {}) {
    const l = super.key(o);
    l.shadow.mapSize.set(this.shadowSize, this.shadowSize);
    return l;
  }

  // A copy of a PBR material with its own texture repeat. Textures are cloned: a shared texture shares its
  // repeat, so setting the repeat on one wall would silently stretch the floor (ep01 bug, 2026-11-20).
  tiled(mat, rx, ry = rx) {
    const m = mat.clone();
    for (const k of ["map", "normalMap", "roughnessMap", "aoMap"]) {
      if (!mat[k]) continue;
      m[k] = mat[k].clone();
      m[k].repeat.set(rx, ry);
      m[k].needsUpdate = true;
    }
    return m;
  }

  shot(keys, t) {
    const c = cameraAt(keys, t);
    this.cam.position.set(...c.pos);
    this.cam.lookAt(...c.look);
    const fov = c.fov ?? 35;
    if (this.cam.fov !== fov) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }

  async ready() {
    await this.renderer.compileAsync(this.scene, this.cam);
    this.render();
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); // make the GPU finish the first frame
  }
}

// One 3D scene: build once (async, registered as a buildReady promise), then a pure render(t).
export function film(stage, key, opts, build) {
  let draw = null;
  const ready = (async () => {
    const f = await Film.create(stage, opts);
    const update = await build(f);
    draw = (t) => { update(t); f.render(); };
    draw(0);
    await f.ready();
  })();
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady[key] = ready;
  return (t) => { if (draw) draw(t); };
}
