import { film, THREE, poseSeated, settle } from "../kit3d/film.js";
export function createProbe(stage, opts) {
  return film(stage, "probe", { hdri: "church_meeting_room", exposure: 1, envBackground: true }, async (f) => {
    const fig = await f.figure("film");
    poseSeated(fig, { style: "chair", forearms: 0.8 });
    settle(fig, 0);
    fig.root.updateMatrixWorld(true);
    const out = {};
    for (const b of ["pelvis", "thigh_l", "calf_l", "foot_l", "hand_l", "lowerarm_l", "Head", "spine_03", "neck_01"]) {
      const p = fig.bone(b).getWorldPosition(new THREE.Vector3()); out[b] = [p.x, p.y, p.z].map((v) => v.toFixed(3)).join(",");
    }
    const box = new THREE.Box3().setFromObject(fig.root);
    console.error(JSON.stringify(out), "box", JSON.stringify(box));
    return (t) => { f.shot(opts.camera, t); };
  });
}
