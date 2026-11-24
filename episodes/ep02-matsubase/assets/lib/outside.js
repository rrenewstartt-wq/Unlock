// Night neighbourhood street (film kit: CC0 Poly Haven asphalt / concrete block wall / plaster textures, utility pole
// model, evening sky HDRI kept very dark). Mode "night" → night_road (SPEC row 7). "river" (river_search) is not built yet.
// Rules kept: no signs, no lettering, no people; the camera never walks. Generic narrow residential road with block walls,
// plain dark houses behind them, wooden utility poles and wires; one sodium lamp (the scene's only amber) and two dimmer
// cool mercury lamps further down; far away a lower skyline of unlit 2-3 storey masses in the haze (toward the police
// station; no windows or lights, nothing to read). Nothing here is from a record except "a night street in the town".
// Coordinates (metres): road along z (camera side +z, far end -z), road x ∈ [-2.4, 2.4], block walls at x = ±2.75.
import { film, THREE } from "../kit3d/film.js";
import { GLTFLoader } from "../kit3d/addons/loaders/GLTFLoader.js";
import { CACHE } from "../kit3d/thumbkit.js";

const AMBER = "#F0A23B";
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const ROAD = 2.4, WALL = 2.75;
export const LAMPS = {                      // [x, head y, z] of each lamp head (scenes_outside.py frames these)
  hero: [1.75, 5.55, -8],                    // sodium, right side
  left: [-1.75, 5.2, -35],                   // mercury, left side
  far: [1.75, 5.2, -72],                     // mercury, right side, far
};

const MODES = {
  night: { hdri: "evening_road_01_puresky", env: 0.02, bg: 0.03, exposure: 1.2, fog: ["#0a0e15", 0.0085], moon: 0.22 },
};

export function createOutside(stage, opts) {
  const mode = opts.mode || "night";
  const M = MODES[mode];
  return film(stage, `outside-${mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, envBackground: true, fog: { color: M.fog[0], density: M.fog[1] },
  }, async (f) => {
    const S = f.scene;
    S.backgroundIntensity = M.bg;
    const [asphalt, block, plaster] = await Promise.all([
      f.material("asphalt_04", { normalScale: 0.8 }),
      f.material("concrete_block_wall", { normalScale: 0.9 }),
      f.material("beige_wall_001", { normalScale: 0.5 }),
    ]);
    const mesh = (geo, mat, pos, rot = [0, 0, 0], cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos); m.rotation.set(...rot);
      m.castShadow = cast; m.receiveShadow = true;
      S.add(m);
      return m;
    };

    // ---------------------------------------------------------------- ground: road (asphalt_04 is a 4 m tile), verges
    const Z0 = 70, Z1 = -200;
    const roadMat = f.tiled(asphalt, (2 * ROAD) / 4, (Z0 - Z1) / 4);
    roadMat.color = new THREE.Color("#9a9a9a");
    mesh(new THREE.PlaneGeometry(2 * ROAD, Z0 - Z1), roadMat, [0, 0, (Z0 + Z1) / 2], [-Math.PI / 2, 0, 0], false);
    const verge = new THREE.MeshStandardMaterial({ color: "#23241f", roughness: 1 });
    mesh(new THREE.PlaneGeometry(200, Z0 - Z1), verge, [0, -0.01, (Z0 + Z1) / 2], [-Math.PI / 2, 0, 0], false);
    // a thin concrete gutter cover along each side
    const gutter = f.tiled(block, 0.2, (Z0 - Z1) / 2);
    gutter.color = new THREE.Color("#7c7a76");
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.32, 0.04, Z0 - Z1), gutter, [s * (ROAD + 0.18), 0.02, (Z0 + Z1) / 2], [0, 0, 0], false);

    // ---------------------------------------------------------------- block walls with gaps (gateways), plain houses behind
    const wallMat = (len) => { const m = f.tiled(block, len / 2, 1.3 / 2); m.color = new THREE.Color("#8d8a84"); return m; };
    const capMat = new THREE.MeshStandardMaterial({ color: "#77746e", roughness: 0.9 });
    const houseWall = f.tiled(plaster, 7 / 3, 5.5 / 3);
    houseWall.color = new THREE.Color("#6b665e");
    const roofMat = new THREE.MeshStandardMaterial({ color: "#24272c", roughness: 0.7, metalness: 0.1 });
    const glassDark = new THREE.MeshStandardMaterial({ color: "#0b0d10", roughness: 0.55, metalness: 0 });
    const glassLit = new THREE.MeshStandardMaterial({ color: "#0c0f13", emissive: "#a9b6c4", emissiveIntensity: 0.03, roughness: 0.6 });
    let lot = 0;
    for (const side of [-1, 1]) {
      for (let z = 58; z > -125; z -= 13, lot++) {
        const len = 9.5 + 1.5 * hash(lot);
        const zc = z - len / 2;
        mesh(new THREE.BoxGeometry(0.14, 1.3, len), wallMat(len), [side * WALL, 0.65, zc]);
        mesh(new THREE.BoxGeometry(0.2, 0.06, len), capMat, [side * WALL, 1.33, zc]);
        // house: plain box + simple gable roof, set back from the wall
        const hw = 6.5 + 1.5 * hash(lot + 50), hd = 6.5, hh = 5.2 + 0.8 * hash(lot + 70);
        const hx = side * (WALL + 2.2 + hd / 2), hz = z - 6.5;
        mesh(new THREE.BoxGeometry(hd, hh, hw), houseWall, [hx, hh / 2, hz]);
        const pitch = 0.42, half = hd / 2 + 0.5;
        // gable: the triangle under the roof is solid wall (an open gable showed the moonlit box top as a pale slab)
        const gs = new THREE.Shape([new THREE.Vector2(-hd / 2, 0), new THREE.Vector2(hd / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * hd / 2)]);
        const gable = new THREE.ExtrudeGeometry(gs, { depth: hw, bevelEnabled: false });
        gable.translate(0, 0, -hw / 2);
        mesh(gable, houseWall, [hx, hh - 0.01, hz]);
        for (const s of [-1, 1]) {
          const roof = mesh(new THREE.BoxGeometry(half / Math.cos(pitch) + 0.1, 0.12, hw + 0.8), roofMat,
            [hx + s * half / 2, hh + Math.tan(pitch) * half / 2, hz], [0, 0, -s * pitch]);
          roof.castShadow = true;
        }
        // two windows facing the road; at most one faintly lit (cool, curtained)
        for (const [k, dz] of [[0, -1.6], [1, 1.6]]) {
          const lit = hash(lot * 3 + k) > 0.93;
          const w = mesh(new THREE.PlaneGeometry(1.4, 1.0), lit ? glassLit : glassDark,
            [hx - side * (hd / 2 + 0.01), hh * 0.62, hz + dz], [0, -side * Math.PI / 2, 0], false);
          w.receiveShadow = false;
        }
      }
    }

    // ---------------------------------------------------------------- far away: low 2-3 storey masses, unlit, lost in the haze
    // (toward the station; no windows, no lights, no shapes to read — just a lower skyline than the houses near by)
    const dark = new THREE.MeshStandardMaterial({ color: "#20252d", roughness: 1 });
    const FAR = [[-16, -150, 24, 6.2, 14, 0.25], [-1, -162, 18, 7.4, 12, 0.1], [13, -170, 22, 5.6, 12, -0.15], [-33, -142, 16, 5.2, 10, 0.3],
      [28, -178, 20, 6.6, 12, 0.2]];
    for (const [x, z, w, h, d, ry] of FAR) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dark);
      m.position.set(x, h / 2, z);
      m.rotation.y = ry;
      S.add(m);
    }

    // ---------------------------------------------------------------- utility poles (preset_02 of modular_electricity_poles)
    const g = await new GLTFLoader().loadAsync(`${CACHE}/models/modular_electricity_poles/modular_electricity_poles.gltf`);
    const proto = new THREE.Group();
    for (const o of g.scene.children.filter((c) => c.name.startsWith("preset_02_"))) {
      const c = o.clone();
      c.position.x += 4.5;
      proto.add(c);
    }
    proto.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const POLE_K = 1.35;                      // ~8 m tall
    const poles = [[2.95, 24], [-2.95, 30], [2.95, -8], [-2.95, -35], [2.95, -40], [2.95, -72], [-2.95, -67], [2.95, -104], [-2.95, -99]];
    const tops = [];
    for (const [x, z] of poles) {
      const p = proto.clone();
      p.scale.setScalar(POLE_K);
      p.position.set(x, 0, z);
      p.rotation.y = x > 0 ? Math.PI : 0;
      S.add(p);
      tops.push(new THREE.Vector3(x, 5.9 * POLE_K - 0.25, z));
    }
    // wires: sagging catenaries between neighbouring poles on the same side, plus two across the road
    const wireMat = new THREE.MeshStandardMaterial({ color: "#0d0e10", roughness: 0.6 });
    const wire = (a, b, sag, dy = 0) => {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        pts.push(new THREE.Vector3(a.x + (b.x - a.x) * u, a.y + dy + (b.y - a.y) * u - sag * 4 * u * (1 - u), a.z + (b.z - a.z) * u));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 4, false), wireMat);
      S.add(m);
    };
    const R = tops.filter((t) => t.x > 0).sort((a, b) => b.z - a.z), L = tops.filter((t) => t.x < 0).sort((a, b) => b.z - a.z);
    for (const side of [R, L]) for (let i = 0; i + 1 < side.length; i++) for (const dy of [0, -0.45]) wire(side[i], side[i + 1], 0.55, dy);
    wire(R[0], L[0], 0.35, -0.6);
    wire(R[1], L[1], 0.35, -0.6);
    wire(new THREE.Vector3(R[0].x, R[0].y, 56), R[0], 0.6);

    // ---------------------------------------------------------------- lamps: arm + housing + lens on the pole
    const metal = new THREE.MeshStandardMaterial({ color: "#5b5f63", roughness: 0.5, metalness: 0.6 });
    // soft glow sprite: radial gradient (the night air catching the lamp), deterministic canvas
    const gc = document.createElement("canvas");
    gc.width = gc.height = 128;
    const gx = gc.getContext("2d");
    const grad = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,0.9)"); grad.addColorStop(0.15, "rgba(255,255,255,0.35)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.06)"); grad.addColorStop(1, "rgba(255,255,255,0)");
    gx.fillStyle = grad; gx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(gc);
    // lens emissive: bright at the pole (centre of the dome), falling off to the rim (sphere v runs pole → rim)
    const lc = document.createElement("canvas");
    lc.width = 4; lc.height = 64;
    const lx = lc.getContext("2d");
    const lg = lx.createLinearGradient(0, 0, 0, 64);
    lg.addColorStop(0, "#202020"); lg.addColorStop(0.55, "#9a9a9a"); lg.addColorStop(1, "#ffffff");
    lx.fillStyle = lg; lx.fillRect(0, 0, 4, 64);
    const lensTex = new THREE.CanvasTexture(lc);
    const lampLights = {};
    const addLamp = (key, color, power, shadow) => {
      const [hx, hy, hz] = LAMPS[key];
      const side = Math.sign(hx);
      const poleX = side * 2.95;
      // arm: a pipe from the pole that rises and runs out to the back of the head (no gap)
      const back = hx + side * 0.3;
      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(poleX, hy - 0.25, hz), new THREE.Vector3(poleX - side * 0.12, hy + 0.12, hz),
        new THREE.Vector3((poleX + back) / 2, hy + 0.16, hz), new THREE.Vector3(back, hy + 0.05, hz)]);
      const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 40, 0.028, 10, false), metal);
      arm.castShadow = true;
      S.add(arm);
      const head = new THREE.Group();
      head.position.set(hx, hy, hz);
      head.rotation.z = side * 0.08;
      S.add(head);
      // housing: the upper half of a long ellipsoid, open underneath
      const housing = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal);
      housing.scale.set(0.34, 0.11, 0.16);
      housing.castShadow = true;
      head.add(housing);
      // reflector: the polished inside of the housing, lit by the lamp
      const refl = new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#d9d4cc", roughness: 0.3, metalness: 0.8, emissive: color, emissiveIntensity: 0.25, side: THREE.BackSide }));
      refl.scale.set(0.34, 0.11, 0.16);
      head.add(refl);
      // lens: a shallow glowing dome under the housing, brightest in the middle (the lamp seen through it)
      const lensMat = new THREE.MeshStandardMaterial({ color: "#1a1712", emissive: color, emissiveMap: lensTex, emissiveIntensity: 2.2,
        roughness: 0.35, transparent: true, opacity: 0.95 });
      const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lensMat);
      lens.scale.set(0.3, 0.06, 0.135);
      lens.position.y = 0.004;
      head.add(lens);
      const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), metal);
      rimRing.scale.set(0.31, 0.14, 0.14);
      rimRing.rotation.x = Math.PI / 2;
      head.add(rimRing);
      const l = new THREE.SpotLight(color, power, 40, 1.05, 0.55, 1.7);
      l.position.set(hx, hy - 0.12, hz);
      l.target.position.set(key === "left" ? -2.5 : hx - side * 1.2, 0, hz + 0.5);
      if (shadow) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0004; l.shadow.radius = 3; }
      S.add(l, l.target);
      // a faint halo in the night air around the lens (fog catches the light)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: key === "hero" ? 0.8 : 0.55,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      halo.scale.set(2.0, 2.0, 1);
      halo.position.set(hx, hy - 0.08, hz);
      S.add(halo);
      lampLights[key] = { l, lens, halo };
    };
    addLamp("hero", "#ffb45a", 560, true);     // low-pressure sodium look: the one amber in the scene
    addLamp("left", "#d6e3f2", 380, true);     // mercury: cool white
    addLamp("far", "#d6e3f2", 200, false);
    lampLights.hero.lens.material.emissive.set(AMBER);

    // ---------------------------------------------------------------- moonlight (cool, weak) for the shapes of roofs and walls
    const moon = new THREE.DirectionalLight("#8ea4c8", M.moon);
    moon.position.set(-30, 40, 10);
    moon.target.position.set(0, 0, -30);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 60, bottom: -60, near: 1, far: 140 });
    moon.shadow.bias = -0.0006;
    S.add(moon, moon.target);
    S.add(new THREE.HemisphereLight("#2a3446", "#0d0c0b", 0.12));

    return (t) => { f.shot(opts.camera, t); };
  });
}
