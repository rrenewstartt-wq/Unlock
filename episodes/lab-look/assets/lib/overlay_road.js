// lab-look test set for the overlay3d marks (motion-designer). NOT a real place: a generic quiet residential road with
// block walls and plain plaster houses, low cool morning sun. Only here to test the title card over 3D, the person card
// and the in-scene distance line / route / pin / big number (thumbkit/overlay3d.js).
// Coordinates (metres): road along z (camera side +z), road x ∈ [-3, 3], walls at x = ±3.4, houses behind the walls.
// Modes: "street" (title + person scenes, a figure walks away from camera), "measure" (high angle, marks on the road).
import { film, THREE, poseArmsDown, settle, turn } from "../kit3d/film.js";
import { measure, route, pin, play } from "../kit3d/overlay3d.js";

const ROAD = 3, WALL = 3.4;

export function createOverlayRoad(stage, opts) {
  const mode = opts.mode || "street";
  return film(stage, `overlay-road-${mode}-${stage.id}`, {
    hdri: "kloofendal_misty_morning_puresky", envIntensity: 0.18, exposure: 0.95, background: "#1a1f27",
    fog: { color: "#1b2029", density: 0.018 },
  }, async (f) => {
    const S = f.scene;
    const [asphalt, block, plaster, curb] = await Promise.all([
      f.material("asphalt_04", { normalScale: 0.7 }),
      f.material("concrete_block_wall", { normalScale: 0.8 }),
      f.material("beige_wall_001", { normalScale: 0.4 }),
      f.material("brushed_concrete", { normalScale: 0.5 }),
    ]);
    const mesh = (geo, mat, pos, rot = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos); m.rotation.set(...rot);
      m.castShadow = true; m.receiveShadow = true;
      S.add(m);
      return m;
    };
    // road, verges, walls
    const L = 160;
    mesh(new THREE.PlaneGeometry(2 * ROAD, L), f.tiled(asphalt, 2, L / 3), [0, 0, -L / 2 + 20], [-Math.PI / 2, 0, 0]);
    for (const sx of [-1, 1]) {
      mesh(new THREE.PlaneGeometry(WALL - ROAD, L), f.tiled(curb, 0.3, L / 2), [sx * (ROAD + WALL) / 2, 0.005, -L / 2 + 20], [-Math.PI / 2, 0, 0]);
      for (let z = 18; z > -L + 20; z -= 12) {
        const len = 11.6;
        mesh(new THREE.BoxGeometry(0.22, 1.7, len), f.tiled(block, len / 2.4, 0.7), [sx * WALL, 0.85, z - len / 2]);
        // house behind the wall: plain plaster mass with a dark shallow roof
        const hw = 7 + ((Math.abs(z) * 7) % 3), hh = 5.2 + ((Math.abs(z) * 3) % 2);
        mesh(new THREE.BoxGeometry(6, hh, hw), f.tiled(plaster, 2, 1.5), [sx * (WALL + 5), hh / 2, z - 6]);
        mesh(new THREE.BoxGeometry(7, 0.3, hw + 0.8), new THREE.MeshStandardMaterial({ color: "#2a2d31", roughness: 0.85 }), [sx * (WALL + 5), hh + 0.15, z - 6]);
      }
    }
    // poles (plain cylinders, no signs)
    for (let z = 10; z > -L + 20; z -= 26) {
      mesh(new THREE.CylinderGeometry(0.13, 0.15, 8, 12), new THREE.MeshStandardMaterial({ color: "#5d5a55", roughness: 0.9 }), [ROAD - 0.2, 4, z]);
    }
    // ground beyond everything
    mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#2b2e33", roughness: 1 }), [0, -0.02, -60], [-Math.PI / 2, 0, 0]);
    // low cool sun from the right, long shadows across the road
    const sun = new THREE.DirectionalLight("#dfe6f0", 2.2);
    sun.position.set(30, 14, -10);
    sun.target.position.set(0, 0, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
    sun.shadow.bias = -0.0004;
    S.add(sun, sun.target);
    f.amb(0.05, "#9fb0c8");

    let woman = null;
    if (mode === "street") {
      woman = await f.figure("woman");
      poseArmsDown(woman, 0.1);
      woman.root.rotation.y = Math.PI;   // facing away from camera (-z)
      settle(woman, 0);
      f.hold(woman);
    }
    let marks = () => {};
    if (mode === "measure") {
      // a 30 m line along the road centre, a pin at its far end, a route turning into a side gap
      const m = await measure(f, [0, 0, 8], [0, 0, -22], { label: "30m", start: 0.6, dur: 1.5, labelHeight: 2.2, labelSize: 2.2, width: 0.22 });
      const p = await pin(f, [0, 0, -22], { start: 2.0, height: 2.2, head: 0.28 });
      const r = await route(f, [[-1.6, 0, 14], [-1.6, 0, 4], [-1.0, 0, -6], [1.2, 0, -14], [2.2, 0, -26]], { start: 3.4, dur: 2.0, width: 0.14, dash: [1.2, 0.8] });
      marks = play(m, p, r);
    }
    return (t) => {
      f.shot(opts.camera, t);
      if (woman) {
        f.rest(woman);
        // a slow walk away: drift down the road with a small alternating leg swing (test only)
        const z = 0 - 0.9 * t;
        woman.root.position.z = z;
        const s = Math.sin(t * 2 * Math.PI * 0.9) * 0.32;
        turn(woman, "thigh_l", [1, 0, 0], s);
        turn(woman, "thigh_r", [1, 0, 0], -s);
        turn(woman, "upperarm_l", [1, 0, 0], -s * 0.4);
        turn(woman, "upperarm_r", [1, 0, 0], s * 0.4);
      }
      marks(t);
    };
  });
}
