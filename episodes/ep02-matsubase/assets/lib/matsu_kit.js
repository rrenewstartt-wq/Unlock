// Shared helpers for the ep02 film-kit sets (house.js, river.js): world-scaled UV boxes and planes (one shared
// Poly Haven material, no stretched tiles), a gradient sky dome for night/dusk, procedural cloth and fruit textures.
// Everything is deterministic (seeded hash), built once.
import { THREE } from "../kit3d/film.js";
import { mergeGeometries } from "../kit3d/addons/utils/BufferGeometryUtils.js";

export { mergeGeometries };
export const AMBER = "#F0A23B";
export const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Box whose UVs are in tiles of `tile` metres on every face, so one material (repeat 1) fits any size.
// swap: turn the texture 90 degrees on the side faces (vertical planks instead of horizontal).
export function uvBox(w, h, d, tile = 1, seed = 0, swap = false) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const ou = hash(seed * 3 + 1), ov = hash(seed * 3 + 2);
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      let u = uv.getX(i) * spans[f][0] / tile, v = uv.getY(i) * spans[f][1] / tile;
      if (swap && f !== 2 && f !== 3) [u, v] = [v, u];
      uv.setXY(i, u + ou, v + ov);
    }
  }
  return g;
}

export function uvPlane(w, h, tile = 1, seed = 0, swap = false) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i) * w / tile, v = uv.getY(i) * h / tile;
    if (swap) [u, v] = [v, u];
    uv.setXY(i, u + hash(seed + 5), v + hash(seed + 9));
  }
  return g;
}

// A builder bound to one scene: slab(center, size, material, tile) etc.
export function builder(scene) {
  let seed = 1;
  const put = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], { cast = true, receive = true } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = cast;
    m.receiveShadow = receive;
    scene.add(m);
    return m;
  };
  const slab = (pos, size, mat, tile = 1, o = {}) => put(uvBox(size[0], size[1], size[2], tile, seed++, o.swap), mat, pos, o.rot || [0, 0, 0], o);
  const plane = (pos, w, h, mat, rot, tile = 1, o = {}) => put(uvPlane(w, h, tile, seed++, o.swap), mat, pos, rot, o);
  const cyl = (pos, r0, r1, h, mat, seg = 16, o = {}) => put(new THREE.CylinderGeometry(r0, r1, h, seg, 1, !!o.open), mat, pos, o.rot || [0, 0, 0], o);
  return { put, slab, plane, cyl };
}

export const flat = (color, roughness = 0.8, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

// Gradient sky (zenith -> horizon -> below) with an optional soft sun/moon glow. Unaffected by fog.
export function skyDome(scene, { top = "#1a2233", horizon = "#55606e", bottom = "#202226", sun = [0, 0.1, -1], sunColor = "#000000", sunSize = 0.08, gain = 1 } = {}) {
  const u = {
    uTop: { value: new THREE.Color(top) }, uHor: { value: new THREE.Color(horizon) }, uBot: { value: new THREE.Color(bottom) },
    uSun: { value: new THREE.Vector3(...sun).normalize() }, uSunC: { value: new THREE.Color(sunColor) }, uSize: { value: sunSize }, uGain: { value: gain },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 uTop, uHor, uBot, uSun, uSunC; uniform float uSize, uGain; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.55)) : mix(uHor, uBot, clamp(-y*6.0,0.0,1.0));
        float s = max(dot(vDir, uSun), 0.0); c += uSunC * (pow(s, 1.0/uSize) * 0.9 + pow(s, 6.0) * 0.25);
        gl_FragColor = vec4(c * uGain, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), m);
  mesh.renderOrder = -1;
  scene.add(mesh);
  return u;
}

function canvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Cloth prints. kind: check (red/brown/white), floral (green on white), red, white, stain.
export function clothTexture(kind) {
  const t = canvas(512, 512, (x, w, h) => {
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const bg = { check: "#e9e1d3", floral: "#ece8dc", red: "#9c2a22", white: "#e6e2d8", stain: "#d8ccb4" }[kind];
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    if (kind === "check") {
      const band = (c, a, pos, wd) => { x.fillStyle = c; x.globalAlpha = a; x.fillRect(pos, 0, wd, h); x.fillRect(0, pos, w, wd); };
      for (let k = 0; k < 4; k++) {
        const o = k * 128;
        band("#a3271f", 0.72, o + 6, 52);
        band("#5e3a26", 0.7, o + 70, 22);
        band("#a3271f", 0.45, o + 100, 8);
      }
      x.globalAlpha = 1;
    } else if (kind === "floral") {
      for (let i = 0; i < 70; i++) {
        const cx = rnd() * w, cy = rnd() * h, r = 6 + rnd() * 10;
        x.fillStyle = i % 3 ? "#3f7a4a" : "#6c9b58";
        for (let p = 0; p < 5; p++) { const a = p * 1.2566 + rnd(); x.beginPath(); x.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.7, r * 0.35, a, 0, 6.3); x.fill(); }
        x.fillStyle = "#d9c45a"; x.beginPath(); x.arc(cx, cy, r * 0.3, 0, 6.3); x.fill();
      }
    } else if (kind === "stain") {
      for (let i = 0; i < 9; i++) {
        const g = x.createRadialGradient(rnd() * w, rnd() * h, 2, rnd() * w, rnd() * h, 60 + rnd() * 90);
        g.addColorStop(0, "rgba(90,70,40,0.35)"); g.addColorStop(1, "rgba(90,70,40,0)");
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      }
    }
    // weave
    x.globalAlpha = 0.08;
    for (let i = 0; i < h; i += 3) { x.fillStyle = i % 6 ? "#000" : "#fff"; x.fillRect(0, i, w, 1); }
    x.globalAlpha = 1;
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A crumpled cloth sheet, w x h metres, lying in the xz plane (y up), deterministic folds.
export function crumple(w, h, seed = 0, amp = 0.025, sag = 0) {
  const g = new THREE.PlaneGeometry(w, h, 24, 20);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Z = p.getZ(i);
    const fold = Math.sin(X * 31 + hash(seed) * 6) * Math.cos(Z * 23 + hash(seed + 1) * 6) + 0.6 * Math.sin((X + Z) * 47 + seed);
    const r2 = (X * X) / (w * w / 4) + (Z * Z) / (h * h / 4);
    p.setY(i, amp * (0.5 + 0.5 * fold) * (1 - 0.5 * r2) - sag * r2);
  }
  g.computeVertexNormals();
  return g;
}

// Small bumpy fruit-peel normal-ish map (used as bumpMap) for mikan.
export function peelBump() {
  return canvas(256, 256, (x, w, h) => {
    x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
    let s = 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) { x.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)"; x.beginPath(); x.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.2, 0, 6.3); x.fill(); }
  });
}

// Diamond mesh of a fruit net (alpha-tested), colour drawn into the texture.
export function netTexture(color = "#c4161c") {
  const t = canvas(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.strokeStyle = color; x.lineWidth = 22; x.lineCap = "round";
    for (let k = -2; k <= 2; k++) {
      x.beginPath(); x.moveTo(k * w, 0); x.lineTo(k * w + w, h); x.stroke();
      x.beginPath(); x.moveTo(k * w + w, 0); x.lineTo(k * w, h); x.stroke();
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Bright soft "outside" seen through glass: vertical gradient, emissive.
export function glowTexture(top, bottom) {
  const t = canvas(64, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
