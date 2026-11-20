// Adelaide railway station cloakroom: counter, shelves of luggage, the brown suitcase.
import { THREE, C, makeRenderer, cameraAt, applyCamera, clamp01, ease, hash } from "./world.js";

export function createStation(stage, opts) {
  const bg = "#26282B";
  const renderer = makeRenderer(stage, bg);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.FogExp2(bg, 0.06);
  const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.05, 200);

  scene.add(new THREE.HemisphereLight("#8E9AAA", "#2a2622", 0.45));
  const key = new THREE.SpotLight("#FFE2B8", 60, 14, 0.55, 0.5, 1.5);
  key.position.set(0.6, 4.2, 1.2);
  key.target.position.set(0, 1.0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight("#6E7F95", 0.6);
  rim.position.set(-4, 3, -5);
  scene.add(rim);

  const mat = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const box = (w, h, d, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
    return b;
  };
  // Room.
  box(30, 0.1, 30, mat("#3A3733"), 0, -0.05, 0);
  box(30, 8, 0.2, mat("#4A4743"), 0, 4, -3.2);
  // Counter (wood) the camera looks across.
  const wood = mat("#5B4632", 0.75);
  box(6, 0.08, 1.1, wood, 0, 1.02, 0);
  box(6, 1.0, 0.08, wood, 0, 0.5, 0.52);
  // Shelves behind with luggage.
  const shelfMat = mat("#4B3B2B", 0.8);
  for (let s = 0; s < 3; s++) {
    box(9, 0.06, 0.7, shelfMat, 0, 0.9 + s * 1.1, -2.6);
    for (let i = 0; i < 9; i++) {
      const w = 0.6 + hash(s * 13 + i) * 0.35;
      const h = 0.45 + hash(s * 7 + i * 3) * 0.3;
      const tone = ["#4E4A45", "#5A534B", "#3F3C39", "#6A6259"][Math.floor(hash(i * 5 + s) * 4)];
      box(w, h, 0.5, mat(tone, 0.85), -4 + i * 1.0, 0.93 + s * 1.1 + h / 2, -2.6);
    }
  }

  // The suitcase: brown body + hinged lid.
  const brown = mat("#6B4A2F", 0.7);
  const caseG = new THREE.Group();
  caseG.position.set(0, 1.06, 0);
  caseG.rotation.y = -0.25;
  scene.add(caseG);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.48), brown);
  body.position.y = 0.08;
  body.castShadow = body.receiveShadow = true;
  caseG.add(body);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.43), mat("#8C7A62", 1));
  inner.position.y = 0.155;
  caseG.add(inner);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.16, -0.24);
  caseG.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.48), brown);
  lid.position.set(0, 0.03, 0.24);
  lid.castShadow = true;
  hinge.add(lid);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), mat("#2B2017", 0.6));
  handle.position.set(0, 0.06, 0.24);
  handle.rotation.x = -Math.PI / 2;
  hinge.add(handle);
  // Folded clothes inside.
  [["#7A2E2A", -0.17], ["#5E5A55", 0.05], ["#B9B2A6", 0.2]].forEach(([c, x], i) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04 + i * 0.01, 0.34), mat(c, 1));
    f.position.set(x, 0.18, 0.0);
    caseG.add(f);
  });
  // Orange waxed thread on a card.
  const spool = new THREE.Group();
  spool.position.set(0.05, 0.2, 0.08);
  caseG.add(spool);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.08), mat("#D8D2C4", 1));
  spool.add(card);
  const threadMat = new THREE.MeshStandardMaterial({ color: C.amber, roughness: 0.4, emissive: C.amber, emissiveIntensity: 0 });
  const thread = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 10, 24), threadMat);
  thread.rotation.x = Math.PI / 2;
  thread.position.y = 0.012;
  spool.add(thread);
  // Tie lying next to the case.
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.5), mat("#2C3E66", 0.8));
  tie.position.set(-0.62, 1.07, 0.15);
  tie.rotation.y = 0.5;
  tie.castShadow = true;
  scene.add(tie);
  const tieStripe = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.012, 0.04), mat("#B33A33", 0.8));
  tieStripe.position.set(0, 0, 0.05);
  tie.add(tieStripe);

  const keys = opts.camera;
  const cue = opts.cues || {};
  function render(t) {
    const open = ease.inOut(clamp01((t - (cue.open ?? 99)) / 1.0));
    hinge.rotation.x = -1.75 * open;
    const lift = ease.out(clamp01((t - (cue.thread ?? 99)) / 0.9));
    spool.position.y = 0.2 + 0.22 * lift;
    spool.rotation.y = 0.8 * lift;
    threadMat.emissiveIntensity = 0.9 * lift;
    const tieOn = clamp01((t - (cue.tie ?? 99)) / 0.4);
    tieStripe.material.emissiveIntensity = 0;
    tie.position.y = 1.07 + 0.0 * tieOn;
    applyCamera(camera, cameraAt(keys, t));
    renderer.render(scene, camera);
  }
  return render;
}
