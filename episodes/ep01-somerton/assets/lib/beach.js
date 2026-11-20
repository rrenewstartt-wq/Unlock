// Somerton beach set (film kit: CC0 HDRI sky, PBR sand/concrete, Poly Haven street lamps, realistic faceless figures).
// mode: "morning" (body found), "dusk" (the evening before), "end" (pull-back). Same coordinates as the v1 set:
// seawall face at z = -3.0, the man against it at x ≈ 0, promenade on top at y = 1.72, sea toward +z.
// Facts kept (data/facts.md @beach/@dusk): head against the seawall, legs out, feet crossed, half-smoked cigarette
// on the right collar (not burning); the couple saw him at about 7 p.m. raise his right arm and let it fall.
import { film, THREE, poseReclined, poseArmsDown, settle, turn, setFabric, ease, clamp01 } from "../kit3d/film.js";

const AMBER = "#F0A23B";
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const MODES = {
  morning: { hdri: "kloofendal_misty_morning_puresky", env: 0.55, exposure: 0.85, fog: ["#9aa2a8", 0.022], sun: 1.4, sunColor: "#dfe4e8" },
  end: { hdri: "kloofendal_misty_morning_puresky", env: 0.55, exposure: 0.85, fog: ["#9aa2a8", 0.02], sun: 1.4, sunColor: "#dfe4e8" },
  dusk: { hdri: "qwantani_dusk_2_puresky", env: 0.5, exposure: 0.8, fog: ["#6f6a68", 0.03], sun: 1.6, sunColor: "#e8a56a" },
};

// A copy of a PBR material with its own texture repeat (textures are cloned: a shared texture shares its repeat).
function tile(mat, rx, ry) {
  const m = mat.clone();
  for (const k of ["map", "normalMap", "roughnessMap", "aoMap"]) {
    if (!mat[k]) continue;
    m[k] = mat[k].clone();
    m[k].repeat.set(rx, ry);
    m[k].needsUpdate = true;
  }
  return m;
}

export function createBeach(stage, opts) {
  const M = MODES[opts.mode];
  const cue = opts.cues || {};
  return film(stage, `beach-${opts.mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, envBackground: true, fog: { color: M.fog[0], density: M.fog[1] },
  }, async (f) => {
    const S = f.scene;

    // Daylight: one soft sun for shape and contact shadows; the HDRI does the fill.
    const sun = new THREE.DirectionalLight(M.sunColor, M.sun);
    sun.position.set(-30, 18, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 90 });
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 5;
    S.add(sun);

    // Sand: dry and pale against the wall, damp and darker toward the sea; low seeded dunes.
    const [sandWet, sandDry, concrete, fabric] = await Promise.all([
      f.material("damp_beach_sand", { normalScale: 1.4 }),
      f.material("coast_sand_04", { normalScale: 1.2 }),
      f.material("concrete_wall_008", { normalScale: 1.2 }),
      f.material("poly_wool_herringbone"),
    ]);
    setFabric(fabric.normalMap);
    const sandGeo = new THREE.PlaneGeometry(220, 80, 220, 80);
    const pos = sandGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const h = 0.05 * Math.sin(x * 0.7 + hash(Math.floor(y)) * 6) * Math.sin(y * 0.9) + 0.02 * hash(i);
      pos.setZ(i, h - Math.max(0, -y - 8) * 0.03);
    }
    sandGeo.computeVertexNormals();
    const sandMat = tile(sandDry, 110, 40);
    sandMat.color = new THREE.Color("#f3e9d6");
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.z = 24;
    sand.receiveShadow = true;
    S.add(sand);
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(220, 30), tile(sandWet, 110, 15));
    wet.rotation.x = -Math.PI / 2;
    wet.position.set(0, 0.06, 26);
    wet.receiveShadow = true;
    S.add(wet);

    // Sea with deterministic swell.
    const seaGeo = new THREE.PlaneGeometry(400, 200, 120, 40);
    const seaBase = Float32Array.from(seaGeo.attributes.position.array);
    const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: "#3d4a53", roughness: 0.22, metalness: 0.15 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.12, 116);
    S.add(sea);

    // Seawall, promenade.
    const wallMat = tile(concrete, 60, 0.7);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(160, 1.8, 0.7), wallMat);
    wall.position.set(0, 0.8, -3.35);
    wall.castShadow = wall.receiveShadow = true;
    S.add(wall);
    const promMat = tile(concrete, 50, 4);
    promMat.color = new THREE.Color("#8d8a86");
    const prom = new THREE.Mesh(new THREE.BoxGeometry(160, 0.12, 12), promMat);
    prom.position.set(0, 1.66, -9.6);
    prom.receiveShadow = true;
    S.add(prom);

    // Steps down to the beach, descending toward +x.
    const stepMat = tile(concrete, 0.3, 0.6);
    for (let s = 0; s < 9; s++) {
      const h = (9 - s) * 0.19;
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.32, h, 1.1), stepMat);
      step.position.set(5.0 + s * 0.32, h / 2, -2.45);
      step.castShadow = step.receiveShadow = true;
      S.add(step);
    }

    // Railing (painted iron).
    const iron = new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.55, metalness: 0.4 });
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 160, 8), iron);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 2.7, -3.2);
    S.add(rail);
    for (let x = -40; x <= 40; x += 2.5) {
      if (x > 4 && x < 6.5) continue;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 8), iron);
      p.position.set(x, 2.2, -3.2);
      p.castShadow = true;
      S.add(p);
    }

    // Street lamps on the promenade (Poly Haven street_lamp_01), heads lit at dusk.
    const lampLights = [];
    const lampGlows = [];
    for (const [i, x] of [-16, -3.5, 9, 21.5].entries()) {
      await f.model("street_lamp_01", { pos: [x, 1.72, -4.0], height: 4.6 });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0 }));
      glow.position.set(x, 1.72 + 4.15, -4.0);
      S.add(glow);
      lampGlows.push(glow);
      const light = new THREE.SpotLight(AMBER, 0, 26, 0.75, 0.6, 1.4);
      light.position.set(x, 1.72 + 4.1, -3.8);
      light.target.position.set(x + 0.6, 0, 0.5);
      if (i === 1) {
        light.target.position.set(0.2, 0.4, -2.4); // the lamp nearest the man lights him
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -0.0005;
      }
      S.add(light, light.target);
      lampLights.push(light);
    }

    // The man, half-lying against the wall, legs out, ankles crossed.
    const man = await f.figure("film");
    poseReclined(man, 0.52);
    turn(man, "upperarm_l", [1, 0, 0], 0.3); turn(man, "upperarm_r", [1, 0, 0], 0.3);
    turn(man, "lowerarm_l", [1, 0, 0], 0.3); turn(man, "lowerarm_r", [1, 0, 0], 0.3);
    man.root.position.x = 0;
    settle(man, 0.03, -3.0, 0.01);
    f.hold(man);
    // Half-smoked cigarette on the right collar (not burning).
    const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.05, 12), new THREE.MeshStandardMaterial({ color: "#ece6da", roughness: 0.85 }));
    cig.castShadow = true;
    S.add(cig);
    const placeCig = () => {
      man.root.updateMatrixWorld(true);
      const nb = man.bone("neck_01").getWorldPosition(new THREE.Vector3());
      // On the right lapel, just in front of the collar (his right = world -x; he faces +z).
      cig.position.set(nb.x - 0.075, nb.y - 0.03, nb.z + 0.115);
      cig.rotation.set(0.5, 0.2, 1.35);
    };
    placeCig();

    // The couple: on the promenade at dusk, on the sand in the morning; gone at the end.
    const wits = [await f.figure("film"), await f.figure("filmWoman")];
    for (const w of wits) { poseArmsDown(w, 0.1); settle(w, 0); }
    if (opts.mode === "dusk") {
      wits[0].root.position.set(-2.6, wits[0].root.position.y + 1.72, -4.6);
      wits[1].root.position.set(-2.05, wits[1].root.position.y + 1.72, -4.75);
      for (const w of wits) { w.root.rotation.y = 0.35; turn(w, "spine_02", [1, 0, 0], 0.18); turn(w, "neck_01", [1, 0, 0], 0.25); }
    } else {
      wits[0].root.position.set(-3.6, wits[0].root.position.y, 1.6);
      wits[1].root.position.set(-4.2, wits[1].root.position.y, 2.1);
      for (const w of wits) w.root.rotation.y = 2.2;
    }
    if (opts.mode === "end") for (const w of wits) w.root.visible = false;

    const skyDay = new THREE.Color(M.fog[0]);
    const skyNight = new THREE.Color("#1b2129");
    const lampsOn = cue.lampsOn ?? 9;

    return (t) => {
      const arr = seaGeo.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 2] = 0.08 * Math.sin(seaBase[i] * 0.18 + t * 0.9) + 0.06 * Math.sin(seaBase[i + 1] * 0.33 - t * 1.3);
      }
      seaGeo.attributes.position.needsUpdate = true;

      let lamp = 0;
      if (opts.mode === "dusk") {
        lamp = ease.out(clamp01((t - lampsOn) / 1.2));
        const k = 0.7 * clamp01(t / lampsOn) + 0.3 * clamp01((t - lampsOn) / 4);
        S.backgroundIntensity = 0.5 * (1 - 0.85 * k);
        S.environmentIntensity = M.env * (1 - 0.8 * k);
        S.fog.color.copy(skyDay).lerp(skyNight, k);
        sun.intensity = M.sun * (1 - k) + 0.05;
      }
      lampLights.forEach((l, i) => {
        const flick = lamp > 0 && lamp < 1 ? 0.6 + 0.4 * Math.sin(t * 40 + i * 2) : 1;
        l.intensity = 38 * lamp * flick;
        lampGlows[i].material.opacity = 0.9 * lamp * flick;
      });

      // Right arm: raised fully, then dropped limp (dusk).
      f.rest(man);
      if (opts.mode === "dusk" && cue.arm != null) {
        const up = ease.inOut(clamp01((t - cue.arm) / 1.1));
        const down = clamp01((t - cue.arm - 1.6) / 0.35);
        const raise = up * (1 - down * down);
        turn(man, "upperarm_r", [1, 0, 0], -1.9 * raise);
        turn(man, "upperarm_r", [0, 0, 1], 0.35 * raise);
        turn(man, "lowerarm_r", [1, 0, 0], -0.25 * raise);
      }
      f.shot(opts.camera, t);
    };
  });
}
