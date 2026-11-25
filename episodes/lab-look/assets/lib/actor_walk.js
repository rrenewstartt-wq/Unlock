// lab-look test set (character-animator): a schoolgirl walking away toward a house door, camera following behind.
// Plain clay ground and wall, one low directional sun (leaf gobo is the cinematographer's). Tests thumbkit/actors.js.
//   opts: { kind: "schoolgirl", face, follow: {back, height, side}, path: [[x,z],...], at, fixed: [pos, look] }
import { film, THREE } from "../kit3d/film.js";
import { actor } from "../kit3d/actors.js";

export function createActorWalk(stage, opts = {}) {
  return film(stage, opts.key || "actor_walk", { exposure: 1.0, background: "#1b1d22" }, async (f) => {
    const clay = (c, r = 0.92) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), clay("#77736c"));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; f.scene.add(ground);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 0.3), clay("#a9a59d"));
    wall.position.set(0, 2.25, -8.2); wall.receiveShadow = wall.castShadow = true; f.scene.add(wall);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.45), clay("#8e8a83"));
    plinth.position.set(0, 0.25, -7.95); plinth.receiveShadow = true; f.scene.add(plinth);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.08), clay("#4a3a2c", 0.7));
    door.position.set(0.4, 1.05 + 0.15, -8.02); door.castShadow = door.receiveShadow = true; f.scene.add(door);
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.7), clay("#8a867f"));
    step.position.set(0.4, 0.075, -7.55); step.receiveShadow = step.castShadow = true; f.scene.add(step);
    const sun = new THREE.DirectionalLight("#fff4e6", 2.6);
    sun.position.set(-6, 5, 2); sun.target.position.set(0, 0, -4);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    f.scene.add(sun, sun.target);
    f.scene.add(new THREE.HemisphereLight("#9fb0c8", "#4a4640", 0.55));
    const girl = await actor(f, opts.kind || "schoolgirl", {
      path: opts.path || [[0.2, 0.5], [0.3, -3.5], [0.4, -6.8]], at: opts.at ?? 0, face: opts.face || "plain", ramp: opts.ramp ?? 0.6, ...(opts.actor || {}),
    });
    window.__actor = girl;
    return (t) => {
      girl.pose(t);
      if (opts.fixed) { f.cam.position.set(...opts.fixed[0]); f.cam.lookAt(...opts.fixed[1]); f.cam.fov = opts.fov || 35; f.cam.updateProjectionMatrix(); }
      else {
        const c = girl.follow(t, { back: 2.4, height: 1.45, side: 0.25, ahead: 3, lookY: 0.9, ...(opts.follow || {}) });
        f.cam.position.set(...c.pos); f.cam.lookAt(...c.look); f.cam.fov = opts.fov || 38; f.cam.updateProjectionMatrix();
      }
    };
  });
}
