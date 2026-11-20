// Somerton beach set: sand, seawall, promenade, steps, street lamps, sea.
// mode: "morning" (body found), "dusk" (the evening before), "end" (pull-back).
import {
  THREE,
  C,
  makeRenderer,
  makeFigure,
  mannequinMaterial,
  poseLying,
  poseStanding,
  cameraAt,
  applyCamera,
  clamp01,
  ease,
  hash,
} from "./world.js";

const MODES = {
  morning: { sky: "#8E979F", fog: 0.03, sun: 0.9, sunColor: "#D9DEE3", amb: 0.55, lamps: () => 0, sea: "#4C5761", sand: "#9A9385" },
  end: { sky: "#8E979F", fog: 0.028, sun: 0.9, sunColor: "#D9DEE3", amb: 0.55, lamps: () => 0, sea: "#4C5761", sand: "#9A9385" },
  dusk: { sky: "#A3968A", fog: 0.035, sun: 1.1, sunColor: "#E0A672", amb: 0.55, lamps: null, sea: "#3A4450", sand: "#8C8476" },
};

export function createBeach(stage, opts) {
  const M = MODES[opts.mode];
  const renderer = makeRenderer(stage, M.sky);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(M.sky);
  scene.fog = new THREE.FogExp2(M.sky, M.fog);
  const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.05, 400);

  // Light.
  const hemi = new THREE.HemisphereLight(C.skyCold, "#3b3631", M.amb);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(M.sunColor, M.sun);
  sun.position.set(-30, 18, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun);

  // Sand with seeded low dunes.
  const sandGeo = new THREE.PlaneGeometry(220, 80, 220, 80);
  const pos = sandGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = 0.05 * Math.sin(x * 0.7 + hash(Math.floor(y)) * 6) * Math.sin(y * 0.9) + 0.02 * hash(i);
    pos.setZ(i, h - Math.max(0, -y - 8) * 0.03);
  }
  sandGeo.computeVertexNormals();
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ color: M.sand, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.z = 24;
  sand.receiveShadow = true;
  scene.add(sand);

  // Sea with deterministic swell.
  const seaGeo = new THREE.PlaneGeometry(400, 200, 120, 40);
  const seaBase = Float32Array.from(seaGeo.attributes.position.array);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: M.sea, roughness: 0.35, metalness: 0.1 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.12, 116);
  scene.add(sea);

  // Seawall, promenade, kerb.
  const concrete = new THREE.MeshStandardMaterial({ color: "#8A8780", roughness: 0.95 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(160, 1.8, 0.7), concrete);
  wall.position.set(0, 0.8, -3.35);
  wall.castShadow = wall.receiveShadow = true;
  scene.add(wall);
  const prom = new THREE.Mesh(new THREE.BoxGeometry(160, 0.12, 12), new THREE.MeshStandardMaterial({ color: "#5E5C58", roughness: 1 }));
  prom.position.set(0, 1.66, -9.6);
  prom.receiveShadow = true;
  scene.add(prom);
  // Steps down to the beach: a flight against the wall face, descending toward +x.
  const stepMat = new THREE.MeshStandardMaterial({ color: "#77746D", roughness: 0.95 });
  for (let s = 0; s < 9; s++) {
    const h = (9 - s) * 0.19;
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.32, h, 1.1), stepMat);
    step.position.set(5.0 + s * 0.32, h / 2, -2.45);
    step.castShadow = step.receiveShadow = true;
    scene.add(step);
  }
  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: "#2B2B2B", roughness: 0.6 }));
  sideRail.position.set(6.3, 1.75, -1.9);
  sideRail.rotation.z = -Math.atan2(1.71, 2.88);
  scene.add(sideRail);
  for (const [x, top] of [[5.05, 2.65], [7.6, 1.15]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), sideRail.material);
    post.position.set(x, top - 0.45, -1.9);
    scene.add(post);
  }
  // A gap in the promenade railing where the steps start.
  // Railing.
  const rail = new THREE.Mesh(new THREE.BoxGeometry(160, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: "#2B2B2B", roughness: 0.6 }));
  rail.position.set(0, 2.7, -3.2);
  scene.add(rail);
  for (let x = -40; x <= 40; x += 2.5) {
    if (x > 4 && x < 6.5) continue;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), rail.material);
    p.position.set(x, 2.2, -3.2);
    scene.add(p);
  }

  // Street lamps on the promenade.
  const lampHeads = [];
  const lampLights = [];
  const postMat = new THREE.MeshStandardMaterial({ color: "#1F1F1F", roughness: 0.5 });
  [-16, -3.5, 9, 21.5].forEach((x, i) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 10), postMat);
    post.position.set(x, 1.72 + 2.3, -4.0);
    post.castShadow = true;
    scene.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), postMat);
    arm.position.set(x, 6.25, -3.6);
    scene.add(arm);
    const headMat = new THREE.MeshStandardMaterial({ color: "#2a2620", emissive: C.amber, emissiveIntensity: 0 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.22, 14), headMat);
    head.position.set(x, 6.12, -3.2);
    scene.add(head);
    lampHeads.push(headMat);
    const light = new THREE.SpotLight(C.amber, 0, 26, 0.75, 0.6, 1.4);
    light.position.set(x, 6.0, -3.2);
    light.target.position.set(x + 0.6, 0, 0.5);
    if (i === 1) {
      light.target.position.set(0.2, 0.4, -2.4); // the lamp nearest the man lights him
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.0005;
    }
    scene.add(light, light.target);
    lampLights.push(light);
  });

  // The man, against the wall.
  const bodyMat = mannequinMaterial("#B7B2AA");
  const man = makeFigure(bodyMat, {
    top: new THREE.MeshStandardMaterial({ color: "#4F4840", roughness: 0.9 }),
    bottom: new THREE.MeshStandardMaterial({ color: "#5A4634", roughness: 0.9 }),
    shoe: new THREE.MeshStandardMaterial({ color: "#2A2420", roughness: 0.45 }),
  });
  poseLying(man);
  man.root.position.set(0, 0, -2.5);
  scene.add(man.root);

  // Half-smoked cigarette resting on the right collar (not burning).
  const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.055, 10), new THREE.MeshStandardMaterial({ color: "#F2EFE8", roughness: 0.6 }));
  cig.rotation.set(0.25, 0, Math.PI / 2.2);
  cig.position.set(0.1, 0.565, 0.118);
  cig.castShadow = true;
  man.spine.add(cig);
  const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0088, 0.008, 10), new THREE.MeshStandardMaterial({ color: "#3A3632", roughness: 1 }));
  ember.position.set(0, -0.031, 0);
  cig.add(ember);

  // Witnesses (a couple) on the promenade or the sand.
  const witMat = mannequinMaterial("#6D6A66");
  const wits = [makeFigure(witMat), makeFigure(witMat)];
  wits.forEach((w, i) => {
    poseStanding(w, 0.06);
    scene.add(w.root);
    w.root.scale.setScalar(i ? 0.94 : 1);
  });
  if (opts.mode === "dusk") {
    wits[0].root.position.set(-2.6, 1.72, -4.6);
    wits[1].root.position.set(-2.0, 1.72, -4.75);
    wits.forEach((w) => (w.root.rotation.y = 0.35));
    wits.forEach((w) => w.spine.rotation.set(0.18, 0, 0));
  } else {
    wits[0].root.position.set(-3.6, 0, 1.6);
    wits[1].root.position.set(-4.2, 0, 2.1);
    wits.forEach((w) => (w.root.rotation.y = 2.2));
  }
  if (opts.mode === "end") wits.forEach((w) => (w.root.visible = false));

  const keys = opts.camera;
  const cue = opts.cues || {};

  function render(t) {
    // Swell.
    const arr = seaGeo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = seaBase[i];
      const y = seaBase[i + 1];
      arr[i + 2] = 0.08 * Math.sin(x * 0.18 + t * 0.9) + 0.06 * Math.sin(y * 0.33 - t * 1.3);
    }
    seaGeo.attributes.position.needsUpdate = true;

    // Lamps: dusk switches on at cue.lampsOn.
    let lamp = 0;
    if (opts.mode === "dusk") lamp = ease.out(clamp01((t - (cue.lampsOn ?? 9)) / 1.2));
    lampHeads.forEach((m, i) => {
      const flick = lamp > 0 && lamp < 1 ? 0.6 + 0.4 * Math.sin(t * 40 + i * 2) : 1;
      m.emissiveIntensity = 2.4 * lamp * flick;
    });
    lampLights.forEach((l) => (l.intensity = 38 * lamp));
    if (opts.mode === "dusk") {
      const k = 0.7 * clamp01(t / (cue.lampsOn ?? 9)) + 0.3 * clamp01((t - (cue.lampsOn ?? 9)) / 4);
      const sky = new THREE.Color("#A3968A").lerp(new THREE.Color("#2C3440"), k);
      scene.background = sky;
      scene.fog.color = sky;
      sun.intensity = 1.1 * (1 - k) + 0.08;
      hemi.intensity = 0.55 - 0.3 * k;
    }

    // Ember on the collar (morning close-up).

    // Right arm: raised fully, then dropped limp (dusk).
    if (opts.mode === "dusk" && cue.arm != null) {
      const up = ease.inOut(clamp01((t - cue.arm) / 1.1));
      const down = clamp01((t - cue.arm - 1.6) / 0.35);
      const drop = down * down;
      const raise = up * (1 - drop);
      man.armR.sh.rotation.set(0.45 - 2.0 * raise, 0, 0.22 + 0.5 * raise);
      man.armR.el.rotation.set(-0.35 * (1 - raise), 0, 0);
    }

    applyCamera(camera, cameraAt(keys, t));
    renderer.render(scene, camera);
  }
  return render;
}
