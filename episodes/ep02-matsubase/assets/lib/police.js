// 1985 interrogation room (film kit: CC0 Poly Haven linoleum / painted plaster / concrete textures, an indoor HDRI for
// reflections, metal_office_desk, WoodenChair_01, desk_lamp_arm_01, clipboard, office_notepads, mounted_fluorescent_lights;
// one realistic faceless figure seated with his back or side to the camera). SPEC "3D 세트" police.js.
// Modes:
//   interrogation → interrogation  daytime: both fluorescent rows on, frosted window bright, amber = the desk stand
//   night         → arrest_wish    night: ONE fluorescent row on (the east row, cold and narrow), window dark,
//                                  amber = the desk stand. Full back-light silhouettes against the washed east wall.
// The room's look is not in the records: a plain generic room (painted lower wall, plaster, linoleum, one frosted window,
// one door). No wall clock (SPEC), no second person (the officer's chair stays empty), no signage or text.
// Coordinates (metres): floor y = 0, x ∈ [-2.8, 2.8] (east = +x), z ∈ [-2.2, 3.0] (south = +z, camera side), ceiling 2.6.
// Desk centred at (0, 0, -0.6), its drawers toward the officer's side (north). The man sits south of it at z ≈ 0.28,
// facing north (-z). The officer's chair (empty) is at z ≈ -1.45.
//
// opts: { mode, camera: cam_shots keys, cues: { empty: [t0, t1] } }  — `empty` hides the man (the empty chair shot).
import { film, THREE, poseSeated, settle, turn, setFabric } from "../kit3d/film.js";

const AMBER = "#F0A23B";
const X0 = -2.8, X1 = 2.8, Z0 = -2.2, Z1 = 3.0, H = 2.6;
const DESK = [0, -0.6];
const SEAT_Z = 0.12;
const CHAIR_FACE = 0;                                            // model yaw that makes a chair face +z

const WIN = { x0: -1.0, x1: 0.9, y0: 1.05, y1: 2.05 };          // frosted window in the north wall
const DOOR = { z0: 1.6, z1: 2.5, y1: 2.0 };                     // door in the east wall

const MODES = {
  interrogation: { hdri: "blinds", env: 0.12, exposure: 1.0, rows: [1, 1], tube: 1.0, winGlow: "#d9e0e2", winLight: 2.4,
    amb: 0.08, lamp: 1, fill: 1.3 },
  night: { hdri: "blinds", env: 0.01, exposure: 1.0, rows: [0, 1], tube: 1.0, winGlow: "#10161f", winLight: 0,
    amb: 0.006, lamp: 1, fill: 0 },
};

// Colour grade a (texture) material in the shader: sat 0 = grey, 1 = as is; tint multiplies. Poly Haven diffuse maps
// are often warm; the 1985 room is cool fluorescent, so the room's surfaces are pulled toward grey-green.
export function grade(mat, sat = 0.5, tint = "#ffffff") {
  const tc = new THREE.Color(tint);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSat = { value: sat };
    sh.uniforms.uTint = { value: tc };
    sh.fragmentShader = "uniform float uSat;\nuniform vec3 uTint;\n" + sh.fragmentShader.replace("#include <map_fragment>",
      "#include <map_fragment>\n  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat) * uTint;");
  };
  mat.customProgramCacheKey = () => `grade-${sat}-${tint}`;
  mat.needsUpdate = true;
  return mat;
}

// A generic glTF part: load the model, keep only the named node, centre it on x/z and stand it on y = 0.
async function part(f, id, name, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 } = {}) {
  const h = await f.model(id, { scale: 1 });
  const keep = h.getObjectByName(name);
  h.traverse((o) => { if (o.isMesh && !(o === keep || keep.getObjectById(o.id))) o.visible = false; });
  const g = new THREE.Group();
  f.scene.remove(h);
  g.add(h);
  h.position.set(0, 0, 0);
  keep.position.set(0, 0, 0);
  h.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(keep);
  h.children[0].position.x -= (box.min.x + box.max.x) / 2;
  h.children[0].position.z -= (box.min.z + box.max.z) / 2;
  h.children[0].position.y -= box.min.y;
  g.position.set(...pos);
  g.rotation.set(...rot);
  g.scale.setScalar(scale);
  f.scene.add(g);
  return g;
}

export function createPolice(stage, opts) {
  const mode = opts.mode || "interrogation";
  const M = MODES[mode];
  const cue = opts.cues || {};
  return film(stage, `police-${mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, background: "#07090b",
  }, async (f) => {
    const S = f.scene;
    const [lino, plaster, lower, wood, fabric] = await Promise.all([
      f.material("old_linoleum_flooring_01", { normalScale: 0.8 }),
      f.material("beige_wall_002", { normalScale: 0.9 }),
      f.material("concrete_wall_008", { normalScale: 0.6 }),
      f.material("dark_wood"),
      f.material("stretch_poplin"),
    ]);
    setFabric(fabric.normalMap);

    // Floor, walls (painted lower band + plaster above), ceiling.
    const W = X1 - X0, D = Z1 - Z0;
    const floorMat = f.tiled(lino, W / 1.2, D / 1.2);
    floorMat.color = new THREE.Color("#a9aea6");
    grade(floorMat, 0.22);
    floorMat.roughnessMap = null;
    floorMat.roughness = 0.62;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    floor.receiveShadow = true;
    S.add(floor);
    const ceilMat = f.tiled(plaster, W / 1.5, D / 1.5);
    ceilMat.color = new THREE.Color("#d8d6d0");
    grade(ceilMat, 0.2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set((X0 + X1) / 2, H, (Z0 + Z1) / 2);
    S.add(ceil);

    const BAND = 1.0;
    const upperTint = new THREE.Color("#e6e3d8"), lowerTint = new THREE.Color("#8d9a93");
    // wall(len, height, y0) as a plane facing into the room; holes are made by splitting into pieces.
    const wallPiece = (w, h, y0, along, at, ry, upper) => {
      const m = f.tiled(upper ? plaster : lower, w / 1.6, h / 1.6);
      m.color = (upper ? upperTint : lowerTint).clone();
      grade(m, upper ? 0.3 : 0.45);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.rotation.y = ry;
      if (along === "x") p.position.set(at[0] + w / 2, y0 + h / 2, at[1]);
      else p.position.set(at[0], y0 + h / 2, at[1] + w / 2);
      p.receiveShadow = true;
      S.add(p);
      return p;
    };
    const wallRun = (along, fixed, ry, from, to, holes = []) => {
      // holes: [{a0, a1, y0, y1}] along the run
      const segs = [];
      let a = from;
      for (const h of holes) { segs.push([a, h.a0, null]); segs.push([h.a0, h.a1, h]); a = h.a1; }
      segs.push([a, to, null]);
      for (const [a0, a1, h] of segs) {
        if (a1 - a0 < 1e-3) continue;
        const at = along === "x" ? [a0, fixed] : [fixed, a0];
        const spans = h ? [[0, h.y0], [h.y1, H]] : [[0, H]];
        for (const [y0, y1] of spans) {
          if (y1 - y0 < 1e-3) continue;
          const lo = Math.min(y1, BAND);
          if (lo > y0) wallPiece(a1 - a0, lo - y0, y0, along, at, ry, false);
          const hi0 = Math.max(y0, BAND);
          if (y1 > hi0) wallPiece(a1 - a0, y1 - hi0, hi0, along, at, ry, true);
        }
      }
    };
    wallRun("x", Z0, 0, X0, X1, [{ a0: WIN.x0, a1: WIN.x1, y0: WIN.y0, y1: WIN.y1 }]); // north, with window
    // south wall: faces -z. PlaneGeometry faces +z, so turn it around and lay it from x1 down.
    for (const [y0, y1, up] of [[0, BAND, false], [BAND, H, true]]) {
      const m = f.tiled(up ? plaster : lower, W / 1.6, (y1 - y0) / 1.6);
      m.color = (up ? upperTint : lowerTint).clone();
      grade(m, up ? 0.3 : 0.45);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(W, y1 - y0), m);
      p.rotation.y = Math.PI;
      p.position.set(0, (y0 + y1) / 2, Z1);
      S.add(p);
    }
    // west wall faces +x: plane rotated +90°; runs along z.
    const westRun = (z0, z1) => {
      for (const [y0, y1, up] of [[0, BAND, false], [BAND, H, true]]) {
        const m = f.tiled(up ? plaster : lower, (z1 - z0) / 1.6, (y1 - y0) / 1.6);
        m.color = (up ? upperTint : lowerTint).clone();
      grade(m, up ? 0.3 : 0.45);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), m);
        p.rotation.y = Math.PI / 2;
        p.position.set(X0, (y0 + y1) / 2, (z0 + z1) / 2);
        p.receiveShadow = true;
        S.add(p);
      }
    };
    westRun(Z0, Z1);
    // east wall faces -x, with the door opening.
    const eastPiece = (z0, z1, y0, y1) => {
      for (const [a, b, up] of [[y0, Math.min(y1, BAND), false], [Math.max(y0, BAND), y1, true]]) {
        if (b - a < 1e-3) continue;
        const m = f.tiled(up ? plaster : lower, (z1 - z0) / 1.6, (b - a) / 1.6);
        m.color = (up ? upperTint : lowerTint).clone();
      grade(m, up ? 0.3 : 0.45);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, b - a), m);
        p.rotation.y = -Math.PI / 2;
        p.position.set(X1, (a + b) / 2, (z0 + z1) / 2);
        p.receiveShadow = true;
        S.add(p);
      }
    };
    eastPiece(Z0, DOOR.z0, 0, H);
    eastPiece(DOOR.z0, DOOR.z1, DOOR.y1, H);
    eastPiece(DOOR.z1, Z1, 0, H);

    // Skirting + chair rail (painted wood), window frame and bars, door frame and door leaf (ajar).
    const paint = new THREE.MeshStandardMaterial({ color: "#4b524d", roughness: 0.6 });
    const frameMat = new THREE.MeshStandardMaterial({ color: "#5b5f5c", roughness: 0.45, metalness: 0.3 });
    const strip = (size, pos, mat = paint) => f.box({ size, radius: 0.004, material: mat, pos });
    strip([W, 0.09, 0.02], [0, 0.045, Z0 + 0.01]);
    strip([W, 0.04, 0.025], [0, BAND, Z0 + 0.012]);
    strip([0.02, 0.09, D], [X0 + 0.01, 0.045, (Z0 + Z1) / 2]);
    strip([0.025, 0.04, D], [X0 + 0.012, BAND, (Z0 + Z1) / 2]);
    strip([W, 0.04, 0.025], [0, BAND, Z1 - 0.012]);
    const wx = (WIN.x0 + WIN.x1) / 2, wy = (WIN.y0 + WIN.y1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0;
    // Frosted glass: a lit pane (its glow is the window's brightness; light through it comes from a spot below).
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ color: M.winGlow }));
    glass.position.set(wx, wy, Z0 - 0.06);
    S.add(glass);
    for (const [sx, sy, px, py] of [[ww + 0.1, 0.06, wx, WIN.y0 - 0.02], [ww + 0.1, 0.06, wx, WIN.y1 + 0.02],
      [0.06, wh, WIN.x0 - 0.02, wy], [0.06, wh, WIN.x1 + 0.02, wy], [0.04, wh, wx, wy], [ww, 0.035, wx, wy]]) {
      strip([sx, sy, 0.09], [px, py, Z0 - 0.02], frameMat);
    }
    const iron = new THREE.MeshStandardMaterial({ color: "#2b2d2c", roughness: 0.5, metalness: 0.6 });
    for (let i = 1; i < 7; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, wh, 8), iron);
      bar.position.set(WIN.x0 + (ww * i) / 7, wy, Z0 + 0.04);
      bar.castShadow = true;
      S.add(bar);
    }
    // Door: frame + leaf ajar about 0.3 m, the next room dark except one cold strip (c5 looks through the gap).
    const dz = (DOOR.z0 + DOOR.z1) / 2, dw = DOOR.z1 - DOOR.z0;
    strip([0.12, 0.07, dw + 0.14], [X1 - 0.02, DOOR.y1 + 0.035, dz], paint);
    strip([0.12, DOOR.y1, 0.07], [X1 - 0.02, DOOR.y1 / 2, DOOR.z0 - 0.035], paint);
    strip([0.12, DOOR.y1, 0.07], [X1 - 0.02, DOOR.y1 / 2, DOOR.z1 + 0.035], paint);
    const leafMat = f.tiled(wood, 1, 2);
    leafMat.color = new THREE.Color("#8d8479");
    const leaf = new THREE.Group();
    const leafBox = f.box({ size: [0.04, DOOR.y1 - 0.01, dw - 0.02], radius: 0.006, material: leafMat, pos: [0, (DOOR.y1 - 0.01) / 2, -(dw - 0.02) / 2] });
    S.remove(leafBox);
    leaf.add(leafBox);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: "#8a8780", metalness: 0.9, roughness: 0.3 }));
    knob.position.set(-0.05, 0.95, -(dw - 0.12));
    leaf.add(knob);
    leaf.position.set(X1 - 0.02, 0, DOOR.z1);
    leaf.rotation.y = -0.42; // swung into the room, hinge at the south jamb
    S.add(leaf);
    // Next room: a dark box with a painted floor; a corner of a brushed-metal case on a table (no knobs, no labels).
    const nextMat = new THREE.MeshStandardMaterial({ color: "#2e3230", roughness: 0.9, side: THREE.BackSide });
    const next = new THREE.Mesh(new THREE.BoxGeometry(3, H, 3), nextMat);
    next.position.set(X1 + 1.52, H / 2, dz);
    next.receiveShadow = true;
    S.add(next);
    const brushed = new THREE.MeshStandardMaterial({ color: "#9a9c9b", metalness: 0.85, roughness: 0.34 });
    f.box({ size: [0.9, 0.74, 0.6], radius: 0.01, material: new THREE.MeshStandardMaterial({ color: "#3c3a36", roughness: 0.7 }), pos: [X1 + 0.9, 0.37, dz - 0.2] });
    f.box({ size: [0.46, 0.2, 0.34], radius: 0.012, material: brushed, pos: [X1 + 0.75, 0.84, dz - 0.05] });
    const nextLight = new THREE.SpotLight("#dfe8ee", mode === "interrogation" ? 8 : 0, 4, 0.7, 0.9, 2);
    nextLight.position.set(X1 + 1.0, H - 0.1, dz);
    nextLight.target.position.set(X1 + 0.75, 0.8, dz - 0.05);
    S.add(nextLight, nextLight.target);

    // Desk (drawers toward the officer, north), two chairs, stand, papers.
    const desk = await f.model("metal_office_desk", { pos: [DESK[0], 0, DESK[1]], rot: [0, 0, 0], height: 0.74 });
    desk.traverse((o) => { if (o.isMesh) grade(o.material, 0.5, "#c9cfcc"); });
    for (const c of [await f.model("SchoolChair_01", { pos: [0.05, 0, SEAT_Z + 0.12], rot: [0, CHAIR_FACE + Math.PI, 0], height: 0.84 }),
      await f.model("SchoolChair_01", { pos: [-0.1, 0, -1.5], rot: [0, CHAIR_FACE + 0.12, 0], height: 0.84 })]) {
      c.traverse((o) => { if (o.isMesh) grade(o.material, 0.25, "#b8bcbc"); });
    }
    const lamp = await f.model("desk_lamp_arm_01", { pos: [-0.5, 0.76, -0.82], rot: [0, 2.3, 0], height: 0.5 });
    const papers = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const s = f.sheet({ w: 0.21, h: 0.297, lines: 16, age: 0.35, torn: 0, px: 512, paper: i % 2 ? "#e6dfcf" : "#ece6d8",
        pos: [0.18 + 0.004 * Math.sin(i * 2.1), 0.762 + i * 0.0016, -0.58 + 0.005 * Math.cos(i * 1.7)], rot: [-Math.PI / 2, 0, 0.05 * Math.sin(i * 3.3)] });
      S.remove(s); papers.add(s);
    }
    S.add(papers);
    await f.model("clipboard", { pos: [0.42, 0.762, -0.42], rot: [0, -0.35, 0], height: 0.03 });
    const notes = await f.model("office_notepads", { pos: [-0.2, 0.762, -0.35], rot: [0, 0.2, 0], scale: 1 });
    notes.traverse((o) => { if (o.isMesh && !/a4_stack|note_stack/.test(o.name)) o.visible = false; });
    notes.position.set(0.15, 0.762, -0.5);

    // Fluorescent battens: two rows of two along z. Each: model fixture (one variant) + lit tube + down spot.
    const rowsX = [-0.9, 1.6];
    const tubes = [];
    const rowLights = [];
    for (const [ri, rx] of rowsX.entries()) {
      for (const z of [-1.0, 1.0]) {
        const fix = await part(f, "mounted_fluorescent_lights", "mounted_fluorescent_lights_d", { pos: [rx, H - 0.046, z], rot: [0, Math.PI / 2, 0], scale: 1.3 });
        const on = M.rows[ri];
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.16, 12),
          new THREE.MeshBasicMaterial({ color: on ? "#eef6f4" : "#55595a" }));
        tube.rotation.x = Math.PI / 2;
        tube.position.set(rx, H - 0.075, z);
        S.add(tube);
        tubes.push(tube);
      }
      const on = M.rows[ri];
      const l = new THREE.SpotLight("#e9f2ef", on ? (mode === "night" ? 30 : 22) : 0, 9, 1.15, 0.95, 1.6);
      l.position.set(rx, H - 0.1, 0);
      l.target.position.set(mode === "night" && ri === 1 ? rx + 0.6 : rx * 0.6, 0, 0);
      l.castShadow = !!on;
      l.shadow.mapSize.set(2048, 2048);
      l.shadow.bias = -0.0004;
      l.shadow.radius = 5;
      Object.assign(l.shadow.camera, { near: 0.3, far: 8 });
      S.add(l, l.target);
      rowLights.push(l);
    }
    if (mode === "night") {
      // The one lit row washes the east wall: a narrow grazing spot so the wall behind the man reads bright.
      const wash = new THREE.SpotLight("#dfeae8", 26, 6, 0.55, 0.85, 1.5);
      wash.position.set(1.75, H - 0.12, 0.3);
      wash.target.position.set(X1, 0.9, 0.3);
      S.add(wash, wash.target);
    }
    // Daylight through the frosted window: a soft spot from outside, low and cool.
    if (M.winLight) {
      const sun = new THREE.SpotLight("#dfe7ec", M.winLight * 10, 9, 0.75, 1, 1.4);
      sun.position.set(wx, 2.0, Z0 - 0.4);
      sun.target.position.set(0, 0.6, 0.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.bias = -0.0005;
      S.add(sun, sun.target);
      const fill = new THREE.HemisphereLight("#dfe6e6", "#77746c", M.fill);
      S.add(fill);
    }
    S.add(new THREE.AmbientLight("#9fb0bd", M.amb));

    // Amber focus: the desk stand's bulb and the pool it throws on the desk.
    const lampHead = new THREE.Vector3();
    lamp.updateMatrixWorld(true);
    const lb = new THREE.Box3().setFromObject(lamp);
    lampHead.set(lb.min.x + 0.06, lb.max.y - 0.07, (lb.min.z + lb.max.z) / 2 + 0.06);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffd9a0" }));
    bulb.position.copy(lampHead).add(new THREE.Vector3(0, -0.03, 0));
    S.add(bulb);
    const pool = new THREE.SpotLight(AMBER, M.lamp * (mode === "night" ? 5.5 : 4), 2.2, 0.75, 0.6, 1.6);
    pool.position.copy(bulb.position);
    pool.target.position.set(-0.15, 0.76, -0.55);
    pool.castShadow = true;
    pool.shadow.mapSize.set(1024, 1024);
    pool.shadow.bias = -0.0004;
    S.add(pool, pool.target);

    // The man: seated (chair), forearms toward the desk, facing north (-z), back to the camera side.
    const man = await f.figure("film");
    poseSeated(man, { style: "chair", forearms: 0.75, lean: 0.12 });
    turn(man, "neck_01", [1, 0, 0], 0.18);
    man.root.rotation.y = Math.PI;
    settle(man, 0);
    man.root.position.set(0.05, man.root.position.y, SEAT_Z);
    f.hold(man);
    const empty = cue.empty || null;

    return (t) => {
      f.rest(man);
      man.root.visible = !(empty && t >= empty[0] && t < empty[1]);
      f.shot(opts.camera, t);
    };
  });
}
