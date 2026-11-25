// lab-look test set (character-animator): an investigators' meeting room — two men seated at a table, one standing
// at the board behind it, faces blurred. Plain clay room, one overhead key. Tests thumbkit/actors.js (sit, idle, look, shake, faceBlur).
//   opts: { face: "blur" | "dark" | "plain", cam: [pos, look, fov], kinds: [a, b, c] }
import { film, THREE } from "../kit3d/film.js";
import { actor, faceBlur } from "../kit3d/actors.js";

export function createActorMeeting(stage, opts = {}) {
  return film(stage, opts.key || "actor_meeting", { exposure: 1.0, background: "#15171b", fog: { color: "#1a1c21", density: 0.05 } }, async (f) => {
    const clay = (c, r = 0.92) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const box = (size, pos, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...pos); m.castShadow = m.receiveShadow = true; f.scene.add(m); return m; };
    box([8, 0.02, 8], [0, -0.01, 0], clay("#4a4843"));                 // floor
    box([8, 3, 0.2], [0, 1.5, -2.6], clay("#5d5c58"));                // back wall
    box([0.2, 3, 8], [-3.2, 1.5, 0], clay("#55544f"));                // side walls
    box([0.2, 3, 8], [3.2, 1.5, 0], clay("#55544f"));
    box([2.2, 1.1, 0.03], [0.2, 1.55, -2.48], clay("#c9c7c0", 0.5));  // whiteboard
    const top = clay("#9a978f", 0.7);
    box([1.2, 0.04, 2.6], [0, 0.74, 0.2], top);                        // table
    for (const [x, z] of [[-0.52, -0.98], [0.52, -0.98], [-0.52, 1.38], [0.52, 1.38]]) box([0.05, 0.72, 0.05], [x, 0.36, z], clay("#3b3a37"));
    const chair = (x, z, yaw) => {
      const g = new THREE.Group();
      const m = clay("#2f3340", 0.6);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.42), m); seat.position.set(0, 0.44, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.03), m); back.position.set(0, 0.7, -0.2);
      g.add(seat, back);
      for (const [lx, lz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.44, 0.025), clay("#222")); l.position.set(lx, 0.22, lz); g.add(l); }
      g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      g.position.set(x, 0, z); g.rotation.y = yaw; f.scene.add(g);
    };
    const key = f.key({ pos: [0.3, 2.9, 0.6], target: [0, 0.8, -0.3], intensity: 28, angle: 1.0, penumbra: 1, color: "#e8ecf2" });
    key.shadow.normalBias = 0.02;
    f.scene.add(new THREE.HemisphereLight("#7f8a99", "#2a2826", 0.6));
    const K = opts.kinds || ["man_sweater", "man_shirt", "man_jacket"];
    // seated men face the table across x (yaw: +pi/2 looks to +x)
    chair(-1.0, 0.25, Math.PI / 2); chair(1.0, -0.35, -Math.PI / 2);
    const face = opts.face || "blur";
    const a = await actor(f, K[0], { seat: [-1.0, 0.46, 0.25], yaw: Math.PI / 2, clip: "sit", face, offset: 0.4,
      look: [{ t: 1.5, yaw: -0.5, dur: 0.9 }] });
    const b = await actor(f, K[1], { seat: [1.0, 0.46, -0.35], yaw: -Math.PI / 2, clip: "sitTalk", face, shake: [[2.0, 3.6]] });
    const c = await actor(f, K[2], { pos: [-0.35, 0, -1.95], yaw: 0.25, clip: "idle", face, offset: 1.1 });
    window.__actors = [a, b, c];
    if (opts.hide) for (const x of [a, b, c]) x.root.visible = false;
    if (opts.debug) for (const x of [a, b, c]) { x.pose(0.5); console.error("dbg", x.kind, JSON.stringify(x.root.position), JSON.stringify([...x.root.scale.toArray()])); }
    const blur = face === "blur" ? faceBlur(f, [a, b, c], { px: 7 }) : () => {};
    const [cp, cl, fov] = opts.cam || [[0.05, 1.32, 3.6], [0, 1.0, -1.2], 40];
    return (t) => {
      a.pose(t); b.pose(t); c.pose(t);
      f.cam.position.set(cp[0], cp[1], cp[2] - t * 0.04); f.cam.lookAt(...cl); f.cam.fov = fov; f.cam.updateProjectionMatrix();
      blur(t);
    };
  });
}
