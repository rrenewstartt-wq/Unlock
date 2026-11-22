// Miyata-san's house (film kit: CC0 Poly Haven old_wood_floor / plaster / cedar textures, workbench, bench vice, shelf and
// toolbox models, winter HDRI through the window). Modes (SPEC "3D 세트" home.js):
//   workshop → workshop_intro   the 2nd-floor workshop by overcast winter daylight, nobody in it (SPEC v3)
//   rags_0121, living_tv        not built yet
// Facts kept: F31 — there was a workshop on the 2nd floor of his house. Nothing about its contents is on record, so the set
// is a plain generic room: one workbench under one window, a bench vice, a shelf with a toolbox, a stairwell coming up
// from below. No hand tools laid out, no cloth, no knife, no lettering. No amber light in the set (the scene's amber is the
// name band of the person card, drawn in HTML).
// Coordinates (metres): floor y = 0, room x ∈ [-2.5, 2.5], z ∈ [-2, 2] (window wall at z = -2), ceiling y = 2.4.
// Stairwell opening x ∈ [-2.45, -1.55], z ∈ [-0.6, 1.95]; the stairs go down toward +z.
import { film, THREE } from "../kit3d/film.js";

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const W = 5, D = 4, H = 2.4;
const X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
const WIN = { x0: -0.1, x1: 1.6, y0: 0.9, y1: 1.95 };      // window in the back wall (z = Z0)
const HOLE = { x0: -2.45, x1: -1.55, z0: -0.6, z1: 1.95 };  // stairwell opening
export const BENCH = [0.75, -1.4];                          // workbench centre (x, z), under the window

const MODES = {
  // overcast: no sun, soft sky through the window; outside a hazy low-roof neighbourhood (not the victim's orchard view)
  workshop: { hdri: "kloofendal_misty_morning_puresky", env: 0.3, bg: 0.55, exposure: 0.9, fill: 1.0, fog: ["#a3aab2", 0.045] },
};

// Desaturate a loaded model's materials toward grey (generic, out-of-focus props should not draw the eye).
function mute(root, k = 0.55, dark = 0.8) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.color) continue;
      const hsl = {};
      m.color.getHSL(hsl);
      m.color.setHSL(hsl.h, hsl.s * (1 - k), hsl.l * dark);
    }
  });
}

export function createHome(stage, opts) {
  const mode = opts.mode || "workshop";
  const M = MODES[mode];
  return film(stage, `home-${mode}-${stage.id}`, {
    hdri: M.hdri, envIntensity: M.env, exposure: M.exposure, envBackground: true, background: "#0b0d10",
    fog: { color: M.fog[0], density: M.fog[1] },
  }, async (f) => {
    const S = f.scene;
    S.backgroundIntensity = M.bg;
    const [floorTex, plaster, cedar, wood] = await Promise.all([
      f.material("old_wood_floor", { normalScale: 0.8 }),
      f.material("beige_wall_001", { normalScale: 0.6 }),
      f.material("japanese_cedar_planks", { normalScale: 0.6 }),
      f.material("dark_wood", { normalScale: 0.7 }),
    ]);
    const mesh = (geo, mat, pos, rot = [0, 0, 0], cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos); m.rotation.set(...rot);
      m.castShadow = cast; m.receiveShadow = true;
      S.add(m);
      return m;
    };
    const slab = (sx, sy, sz, mat, pos) => mesh(new THREE.BoxGeometry(sx, sy, sz), mat, pos);

    // ---------------------------------------------------------------- floor with the stairwell opening (old_wood_floor: 3 m tile)
    const fl = (x0, x1, z0, z1) => {
      const m = f.tiled(floorTex, (x1 - x0) / 3, (z1 - z0) / 3);
      m.color = new THREE.Color().setRGB(1.5, 1.42, 1.32);
      slab(x1 - x0, 0.06, z1 - z0, m, [(x0 + x1) / 2, -0.03, (z0 + z1) / 2]);
    };
    fl(HOLE.x1, X1, Z0, Z1);                 // main floor
    fl(X0, HOLE.x1, Z0, HOLE.z0);            // strip behind the opening
    fl(X0, HOLE.x0, HOLE.z0, Z1);            // thin strip at the wall
    // ceiling with exposed joists
    const ceil = f.tiled(cedar, W / 1.13, D / 1.13);
    ceil.color = new THREE.Color("#6d6966");
    slab(W + 0.2, 0.05, D + 0.2, ceil, [0, H + 0.025, 0]);
    const joist = f.tiled(wood, 0.1, 2);
    joist.color = new THREE.Color("#9a8c80");
    for (let x = -2.0; x <= 2.01; x += 0.9) slab(0.09, 0.12, D, joist, [x, H - 0.06, 0]);

    // walls (beige_wall_001: 3 m tile), window opening in the back wall
    const wallMat = (w, h) => { const m = f.tiled(plaster, w / 3, h / 3); m.color = new THREE.Color("#cfc8bd"); return m; };
    const wall = (sx, sy, sz, pos) => slab(sx, sy, sz, wallMat(Math.max(sx, sz), sy), pos);
    const T = 0.1;
    wall(W + 2 * T, H, T, [0, H / 2, Z1 + T / 2]);
    wall(T, H, D, [X0 - T / 2, H / 2, 0]);
    wall(T, H, D, [X1 + T / 2, H / 2, 0]);
    wall(WIN.x0 - X0, H, T, [(X0 + WIN.x0) / 2, H / 2, Z0 - T / 2]);
    wall(X1 - WIN.x1, H, T, [(WIN.x1 + X1) / 2, H / 2, Z0 - T / 2]);
    wall(WIN.x1 - WIN.x0, WIN.y0, T, [(WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, Z0 - T / 2]);
    wall(WIN.x1 - WIN.x0, H - WIN.y1, T, [(WIN.x0 + WIN.x1) / 2, (H + WIN.y1) / 2, Z0 - T / 2]);
    // posts and a rail (plain structure)
    const post = f.tiled(wood, 0.06, 1.2);
    post.color = new THREE.Color("#9a8c80");
    for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) slab(0.12, H, 0.12, post, [x + Math.sign(-x) * 0.04, H / 2, z + Math.sign(-z) * 0.04]);

    // window: frame, two sashes, glass
    const frame = f.tiled(wood, 0.1, 1);
    frame.color = new THREE.Color("#8a7a6c");
    const wx = (WIN.x0 + WIN.x1) / 2, wy = (WIN.y0 + WIN.y1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0;
    slab(ww + 0.1, 0.05, 0.14, frame, [wx, WIN.y0 - 0.02, Z0]);
    slab(ww + 0.1, 0.05, 0.12, frame, [wx, WIN.y1 + 0.02, Z0]);
    slab(0.05, wh, 0.12, frame, [WIN.x0 - 0.02, wy, Z0]);
    slab(0.05, wh, 0.12, frame, [WIN.x1 + 0.02, wy, Z0]);
    for (const k of [0, 1]) {
      const x0 = WIN.x0 + k * ww / 2, x1 = x0 + ww / 2, dz = k ? 0.02 : -0.02;
      slab(0.04, wh, 0.035, frame, [x0 + 0.02, wy, Z0 + dz]);
      slab(0.04, wh, 0.035, frame, [x1 - 0.02, wy, Z0 + dz]);
      slab(x1 - x0, 0.03, 0.035, frame, [(x0 + x1) / 2, wy + 0.1, Z0 + dz]);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, wh), new THREE.MeshStandardMaterial({
        color: "#dfe6ea", roughness: 0.06, transparent: true, opacity: 0.08, depthWrite: false, envMapIntensity: 0.25 }));
      glass.position.set((x0 + x1) / 2, wy, Z0 + dz);
      S.add(glass);
    }

    // ---------------------------------------------------------------- stairwell: steps going down, a plain railing, a dim lower hall
    const stepMat = f.tiled(wood, 0.4, 0.1);
    stepMat.color = new THREE.Color("#a3968a");
    const NSTEP = 12, RISE = H / NSTEP, RUN = (HOLE.z1 - HOLE.z0 - 0.05) / NSTEP;
    for (let i = 0; i < NSTEP; i++) {
      const top = -RISE * (i + 1);
      slab(HOLE.x1 - HOLE.x0 - 0.04, 0.04, RUN + 0.03, stepMat, [(HOLE.x0 + HOLE.x1) / 2, top, HOLE.z0 + RUN * (i + 0.5)]);
    }
    const lower = new THREE.MeshStandardMaterial({ color: "#3a3631", roughness: 0.95 });
    slab(3, 0.05, 3, lower, [-1.5, -H - 0.03, 2.6]);                 // lower floor (hall)
    const lowerWall = wallMat(3.5, H);
    slab(0.05, H, 3.5, lowerWall, [HOLE.x1 + 0.05, -H / 2, 1.2]);     // stair side wall below
    slab(0.05, H, 3.5, lowerWall, [HOLE.x0 - 0.08, -H / 2, 1.2]);
    slab(3, H, 0.05, lowerWall, [-1.5, -H / 2, 4.1]);
    // the entrance at the foot of the stairs: a frosted door pane with daylight behind it (plain, no lettering)
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.5), new THREE.MeshStandardMaterial({ color: "#20242a", emissive: "#cfd6de", emissiveIntensity: 0.9, roughness: 0.9 }));
    pane.position.set(-2.0, -H + 1.25, 4.07);
    pane.rotation.y = Math.PI;
    S.add(pane);
    slab(0.06, 1.95, 0.08, post, [-2.42, -H + 0.97, 4.05]);
    slab(0.06, 1.95, 0.08, post, [-1.58, -H + 0.97, 4.05]);
    slab(0.9, 0.06, 0.08, post, [-2.0, -H + 1.98, 4.05]);
    const rail = f.tiled(wood, 0.05, 1);
    rail.color = new THREE.Color("#8d7f73");
    slab(0.05, 0.05, HOLE.z1 - HOLE.z0, rail, [HOLE.x1 + 0.03, 0.85, (HOLE.z0 + HOLE.z1) / 2]);
    slab(HOLE.x1 - HOLE.x0, 0.05, 0.05, rail, [(HOLE.x0 + HOLE.x1) / 2, 0.85, HOLE.z0 - 0.03]);
    for (const [x, z] of [[HOLE.x1 + 0.03, HOLE.z0 - 0.03], [HOLE.x1 + 0.03, 0.7], [HOLE.x1 + 0.03, HOLE.z1 - 0.05], [HOLE.x0 + 0.05, HOLE.z0 - 0.03]]) {
      slab(0.05, 0.85, 0.05, rail, [x, 0.425, z]);
    }

    // ---------------------------------------------------------------- props (generic, muted): workbench + vice, shelf + toolbox
    const bench = await f.model("painted_wooden_table", { pos: [BENCH[0], 0, BENCH[1]], width: 1.8 });
    // the model is painted blue: pull it to a worn grey-brown (multiply by a warm grey)
    const benchWood = f.tiled(floorTex, 0.6, 0.6);                  // rough, matte, worn planks — not a polished table
    benchWood.color = new THREE.Color("#5e574f");
    benchWood.roughness = 1;
    benchWood.envMapIntensity = 0.3;
    bench.traverse((o) => { if (o.isMesh) o.material = benchWood; });
    const benchTop = new THREE.Box3().setFromObject(bench).max.y;
    const vice = await f.model("bench_vice_01", { pos: [BENCH[0] - 0.85, benchTop, BENCH[1] + 0.28], rot: [0, Math.PI / 2, 0], height: 0.17 });
    mute(vice, 0.4, 0.9);
    // a few plain offcuts of wood on the bench (no tools laid out)
    const offcut = f.tiled(cedar, 0.3, 0.1);
    offcut.color = new THREE.Color("#6f6155");
    f.box({ size: [0.42, 0.03, 0.09], radius: 0.004, material: offcut, pos: [BENCH[0] + 0.25, benchTop + 0.009, BENCH[1] - 0.05], rot: [0, 0.12, 0] });
    f.box({ size: [0.3, 0.025, 0.07], radius: 0.004, material: offcut, pos: [BENCH[0] + 0.32, benchTop + 0.031, BENCH[1] - 0.02], rot: [0, -0.2, 0] });
    const shelf = await f.model("Shelf_01", { pos: [X1 - 0.16, 0, 0.2], rot: [0, -Math.PI / 2, 0], height: 1.75 });
    // dark stained wood with worn edges, not white: multiply the pale paint down to a dark brown
    shelf.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) { m.color = new THREE.Color("#3b332c"); m.roughness = 0.9; } });
    const box = await f.model("metal_toolbox", { pos: [X1 - 0.18, 0.0, 1.1], rot: [0, -Math.PI / 2 + 0.2, 0], height: 0.16 });
    mute(box, 0.6, 0.75);

    // ---------------------------------------------------------------- light: overcast window daylight
    // c5: a narrow band of window light across the dark bench top (a soft spot at a grazing angle → a long thin strip)
    const band = new THREE.SpotLight("#e3e8ee", 22, 0, 0.05, 0.7, 1.2);
    band.position.set(BENCH[0] - 0.12, benchTop + 0.16, Z0 + 0.02);            // low, just inside the glass: grazing → a long strip
    band.target.position.set(BENCH[0] - 0.12, benchTop, BENCH[1] + 0.2);
    S.add(band, band.target);
    const fill = new THREE.SpotLight("#d3dce6", 40 * M.fill, 0, 0.95, 1, 1.4);   // sky through the window
    fill.position.set(wx, 1.9, Z0 - 1.6);
    fill.target.position.set(wx - 0.4, 0.4, 1.0);
    fill.castShadow = false;                                       // overcast: no hard window-frame shadows
    S.add(fill, fill.target);
    const below = new THREE.PointLight("#c9d1da", 2.2, 0, 2);       // daylight from the entrance pane, in the hall below
    below.position.set(-2.0, -1.3, 3.7);
    S.add(below);
    S.add(new THREE.HemisphereLight("#a9b6c4", "#3b342c", 0.3));

    // ---------------------------------------------------------------- outside the window: low roofs of the neighbourhood in haze
    const roofDark = new THREE.MeshStandardMaterial({ color: "#3a3d42", roughness: 0.9 });
    const wallOut = new THREE.MeshStandardMaterial({ color: "#7d7a74", roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const x = -26 + i * 4.2 + 2 * hash(i + 5), z = Z0 - 22 - 10 * hash(i + 9) - (i % 3) * 9, w = 6 + 3 * hash(i), d = 7, h = 4.5 + 3 * hash(i + 2);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallOut);
      body.position.set(x, h / 2 - 3.5, z);                         // we look out from the 2nd floor: their roofs sit lower
      S.add(body);
      for (const sgn of [-1, 1]) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.12, d / 2 / Math.cos(0.45) + 0.3), roofDark);
        roof.position.set(x, h - 3.5 + Math.tan(0.45) * d / 4, z + sgn * d / 4);
        roof.rotation.x = sgn * 0.45;
        S.add(roof);
      }
    }

    return (t) => { f.shot(opts.camera, t); };
  });
}
