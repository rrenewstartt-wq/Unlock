// Thumbnail still kit: one photoreal-ish 3D still (CC0 Poly Haven models, textures, HDRI) + a focus mask.
// A concept page (episodes/<ep>/thumbnail/cN.html) builds the scene, then calls `await t.done()`.
// scripts/shoot_thumb.cjs screenshots the beauty pass, calls window.__mask() and screenshots the mask
// (focus objects white, everything else black). scripts/thumb_grade.py grades the two into the thumbnail.
//
//   import { Thumb } from '/thumbkit/thumbkit.js';
//   const t = await Thumb.create({ hdri: 'evening_road_01_puresky', exposure: 1.0 });
//   t.camera([0, 1.2, 2.4], [0, 0.4, 0], 32);
//   t.surface('old_wood_floor', { w: 6, h: 6, repeat: 3 });
//   const pack = await t.model('cigarette_pack', { pos: [0, 0, 0], height: 0.09 });
//   t.focus(pack);
//   t.key({ pos: [1.5, 3, 1], target: [0, 0, 0], intensity: 60, angle: 0.5 });
//   await t.done();
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };
export const CACHE = '/thumbkit/cache';
const texLoader = new THREE.TextureLoader();

function loadTex(url, srgb) {
  return new Promise((ok) => texLoader.load(url, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    ok(t);
  }, undefined, () => ok(null)));
}

// deterministic fractal value noise in 0..1 for torn paper edges
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function vnoise(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i + s * 57) * (1 - u) + hash(i + 1 + s * 57) * u; }
function tear(x, s) { return 0.55 * vnoise(x, s) + 0.3 * vnoise(x * 3.1, s + 9) + 0.15 * vnoise(x * 9.7, s + 17); }

export class Thumb {
  static async create(o = {}) {
    const t = new Thumb();
    await t._init(o);
    return t;
  }

  async _init({ width = 1920, height = 1080, hdri = null, envIntensity = 1, exposure = 1, background = '#000000',
    envBackground = false, fog = null } = {}) {
    this.w = width; this.h = height;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(width, height);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = exposure;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    document.body.style.margin = '0';
    document.body.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(background);
    if (fog) s.fog = new THREE.FogExp2(fog.color || background, fog.density || 0.08);
    this.cam = new THREE.PerspectiveCamera(35, width / height, 0.01, 200);
    this.focusSet = new Set();
    if (hdri) {
      const pm = new THREE.PMREMGenerator(r);
      const hdr = await new HDRLoader().loadAsync(`${CACHE}/hdris/${hdri}.hdr`);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      s.environment = pm.fromEquirectangular(hdr).texture;
      s.environmentIntensity = envIntensity;
      if (envBackground) { s.background = hdr; s.backgroundIntensity = envIntensity; }
    }
  }

  camera(pos, look, fov = 35) {
    this.cam.position.set(...pos);
    this.cam.fov = fov;
    this.cam.updateProjectionMatrix();
    this.cam.lookAt(new THREE.Vector3(...look));
    return this.cam;
  }

  // Poly Haven texture set as a PBR material. repeat = tiles across the surface.
  async material(texId, { repeat = 1, color = null, roughness = null, normalScale = 1, metalness = 0 } = {}) {
    const base = `${CACHE}/textures/${texId}`;
    const [map, nor, rough, arm] = await Promise.all([
      loadTex(`${base}/diff.jpg`, true), loadTex(`${base}/nor.jpg`), loadTex(`${base}/rough.jpg`), loadTex(`${base}/arm.jpg`)]);
    for (const x of [map, nor, rough, arm]) if (x) x.repeat.set(repeat, repeat);
    const m = new THREE.MeshStandardMaterial({ map, normalMap: nor, roughnessMap: rough || arm, metalness });
    if (!rough && arm) m.aoMap = arm;
    if (nor) m.normalScale.set(normalScale, normalScale);
    if (color) m.color = new THREE.Color(color);
    if (roughness !== null) m.roughness = roughness;
    return m;
  }

  add(obj, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 } = {}) {
    obj.position.set(...pos);
    obj.rotation.set(...rot);
    obj.scale.setScalar(scale);
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.scene.add(obj);
    return obj;
  }

  // Textured floor/wall. rot defaults to lying flat.
  async surface(texId, { w = 6, h = 6, repeat = 2, pos = [0, 0, 0], rot = [-Math.PI / 2, 0, 0], ...mo } = {}) {
    const m = await this.material(texId, { repeat, ...mo });
    const g = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(g, m);
    this.add(mesh, { pos, rot });
    mesh.castShadow = false;
    return mesh;
  }

  // GLTF model from the cache. height/width: scale so the model is that tall/wide (metres). It sits on y=0 at pos.
  async model(id, { pos = [0, 0, 0], rot = [0, 0, 0], height = null, width = null, scale = 1 } = {}) {
    const g = await new GLTFLoader().loadAsync(`${CACHE}/models/${id}/${id}.gltf`);
    const root = g.scene;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    let k = scale;
    if (height) k = height / size.y;
    if (width) k = width / Math.max(size.x, size.z);
    const holder = new THREE.Group();
    root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    holder.add(root);
    this.add(holder, { pos, rot, scale: k });
    return holder;
  }

  // A sheet of paper (note, ticket, torn scrap) with text drawn on a canvas. curl bends it around the x axis end.
  sheet({ w = 0.2, h = 0.07, text = '', font = 'italic 120px Georgia, serif', ink = '#1b1814', paper = '#efe8da',
    curl = 0, curlStart = 0.75, pos = [0, 0, 0], rot = [0, 0, 0], torn = 0.02, px = 1024, age = 0.25, textX = 0.5, lines = 0, cut = null } = {}) {
    const c = document.createElement('canvas');
    c.width = px; c.height = Math.round(px * h / w);
    const x = c.getContext('2d');
    x.fillStyle = paper; x.fillRect(0, 0, c.width, c.height);
    // deterministic speckle/age
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2500 * age; i++) {
      x.fillStyle = `rgba(90,70,40,${0.05 + rnd() * 0.08})`;
      x.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    if (lines) {   // illegible body text as grey bars (we never invent a document's real words)
      const top = c.height * 0.12, step = (c.height * 0.76) / lines;
      for (let i = 0; i < lines; i++) {
        const len = 0.55 + 0.3 * rnd();
        x.fillStyle = 'rgba(40,34,28,0.55)';
        x.fillRect(c.width * 0.12, top + i * step, c.width * 0.76 * len, step * 0.32);
      }
    }
    if (cut) {     // torn-out piece [x0,y0,x1,y1] in 0..1 (canvas space, y down)
      const [x0, y0, x1, y1] = cut.map((v, i) => v * (i % 2 ? c.height : c.width));
      x.globalCompositeOperation = 'destination-out';
      x.beginPath();
      x.moveTo(x0, y0);
      for (let k = 0; k <= 40; k++) x.lineTo(x0 + (x1 - x0) * k / 40, y0 + (tear(k * 0.7, 5) - 0.5) * 18);
      x.lineTo(x1, y1); x.lineTo(x0, y1); x.closePath(); x.fill();
      x.globalCompositeOperation = 'source-over';
    }
    if (text) {
      x.fillStyle = ink; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, c.width * textX, c.height / 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const seg = 160;
    const g = new THREE.PlaneGeometry(w, h, seg, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let vx = p.getX(i), vy = p.getY(i);
      // torn edge: jitter the outline deterministically
      if (torn && Math.abs(Math.abs(vy) - h / 2) < 1e-6) vy -= Math.sign(vy) * torn * h * tear(vx / w * 9, vy > 0 ? 1 : 2);
      if (torn && Math.abs(Math.abs(vx) - w / 2) < 1e-6) vx -= Math.sign(vx) * torn * h * 0.6 * tear(vy / h * 3, vx > 0 ? 3 : 4);
      let vz = 0;
      const u = (vx + w / 2) / w;
      if (curl && u > curlStart) {   // roll the end up around a cylinder of radius curl
        const arc = (u - curlStart) * w;
        const a = arc / curl;
        vx = -w / 2 + curlStart * w + Math.sin(a) * curl;
        vz = curl - Math.cos(a) * curl;
      }
      p.setXYZ(i, vx, vy, vz);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide, alphaTest: cut ? 0.5 : 0 });
    const mesh = new THREE.Mesh(g, m);
    return this.add(mesh, { pos, rot });
  }

  box({ size = [1, 1, 1], radius = 0.01, material = null, color = '#777', pos = [0, 0, 0], rot = [0, 0, 0] } = {}) {
    const g = new RoundedBoxGeometry(...size, 3, radius);
    const mesh = new THREE.Mesh(g, material || new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    return this.add(mesh, { pos, rot });
  }

  // Lights. key = spot with soft shadow; point/rect for practicals; amb for a floor of light.
  key({ pos = [2, 4, 2], target = [0, 0, 0], intensity = 40, angle = 0.5, penumbra = 0.8, color = '#ffffff', shadow = true,
    distance = 0, decay = 2 } = {}) {
    const l = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
    l.position.set(...pos);
    l.target.position.set(...target);
    l.castShadow = shadow;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0002;
    l.shadow.radius = 4;
    this.scene.add(l, l.target);
    return l;
  }

  point({ pos = [0, 1, 0], intensity = 5, color = '#ffb35c', distance = 0, shadow = false } = {}) {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.set(...pos);
    l.castShadow = shadow;
    this.scene.add(l);
    return l;
  }

  amb(intensity = 0.05, color = '#ffffff') {
    this.scene.add(new THREE.AmbientLight(color, intensity));
  }

  // Mark objects as the focus (the one element that keeps its own colour in the graded thumbnail).
  focus(...objs) { for (const o of objs) this.focusSet.add(o); }

  render() { this.renderer.render(this.scene, this.cam); }

  async done() {
    this.render();
    window.__mask = () => this._mask();
    window.__done = true;
  }

  _mask() {
    const white = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    const black = new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide });
    const inFocus = new Set();
    for (const f of this.focusSet) f.traverse((m) => inFocus.add(m));
    this.scene.traverse((m) => { if (m.isMesh) m.material = inFocus.has(m) ? white : black; });
    this.scene.background = new THREE.Color('#000000');
    this.scene.fog = null;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;
    this.render();
    window.__maskDone = true;
  }
}
