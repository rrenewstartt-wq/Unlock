// Evidence reading table (film kit: CC0 Poly Haven painted-concrete floor, brushed-concrete walls, storeroom HDRI,
// steel_frame_shelves_01 + cardboard_box_01 as dim background only, mounted_fluorescent_lights; dressed figures standing
// back-lit at a distance). SPEC "3D 세트" vault.js. The place's look is not in the records ("창고" is never said): a plain
// room with a reading table under a neutral white table light, shelves only as a dark, fogged background (no aisle wide).
// Modes:
//   open   → vault_open   two standing figures behind the table, back-lit (number and sex not specified by the record —
//                          generic onlooker palette), an open cardboard box with the cloth inside, its lid, a paper tag.
//                          amber = the cloth end inside the box.
//   pieces → five_pieces  the five pieces of the shirt (assets/lib/cloth.js: ONE cloth, same check) laid on the table one by
//                          one into a shirt outline; from cue.sleeve the LEFT sleeve alone gets a warm narrow light (amber
//                          focus). The cloth never changes — only the light on it.
// Coordinates (metres): floor y = 0, x ∈ [-4, 4], z ∈ [-5, 3.5] (camera side +z), table top centred at (0, 0.74, 0),
// 1.8 × 0.9. Shirt (pieces): hem at z = +0.36, collar toward -z, the wearer's left sleeve at +x.
// opts: { mode, camera, cues: { drops: [t, t, t, t, t] (pieces, in PIECES order), sleeve: t (amber on) } }
import { film, THREE, poseArmsDown, settle, turn, setFabric, ease, clamp01 } from "../kit3d/film.js";
import { dress } from "./dress.js";
import { shirtClothMaterial, clothPiece, PIECES } from "./cloth.js";

const AMBER = "#F0A23B";
const TOP = 0.74;
const X0 = -4, X1 = 4, Z0 = -5, Z1 = 5.2, H = 2.8;

export function createVault(stage, opts) {
  const mode = opts.mode || "open";
  const cue = opts.cues || {};
  return film(stage, `vault-${mode}-${stage.id}`, {
    hdri: "storeroom", envIntensity: mode === "pieces" ? 0.05 : 0.04, exposure: 1.0, background: "#08090a",
    fog: { color: "#0b0c0d", density: 0.12 },
  }, async (f) => {
    const S = f.scene;
    const [floorTex, wallTex, fabric] = await Promise.all([
      f.material("concrete_floor_painted", { normalScale: 0.8 }),
      f.material("brushed_concrete", { normalScale: 0.8 }),
      f.material("stretch_poplin"),
    ]);
    setFabric(fabric.normalMap);

    const floorMat = f.tiled(floorTex, (X1 - X0) / 2, (Z1 - Z0) / 2);
    floorMat.color = new THREE.Color("#8f948f");
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (Z0 + Z1) / 2);
    floor.receiveShadow = true;
    S.add(floor);
    const wallMat = f.tiled(wallTex, (X1 - X0) / 2.5, H / 2.5);
    wallMat.color = new THREE.Color("#9a9c98");
    const back = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, H), wallMat);
    back.position.set(0, H / 2, Z0);
    back.receiveShadow = true;
    S.add(back);
    for (const sx of [-1, 1]) {
      const m = f.tiled(wallTex, (Z1 - Z0) / 2.5, H / 2.5);
      m.color = new THREE.Color("#8c8e8a");
      const w = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, H), m);
      w.rotation.y = -sx * Math.PI / 2;
      w.position.set(sx > 0 ? X1 : X0, H / 2, (Z0 + Z1) / 2);
      w.receiveShadow = true;
      S.add(w);
    }

    // Reading table: pale grey laminate top on steel legs.
    // plain pale-grey laminate (a tread or grain texture would fight the cloth's check)
    const topMat = new THREE.MeshStandardMaterial({ color: "#6c6e6c", roughness: 0.78, metalness: 0.02 });
    f.box({ size: [1.8, 0.03, 0.9], radius: 0.006, material: topMat, pos: [0, TOP - 0.015, 0] });
    const steel = new THREE.MeshStandardMaterial({ color: "#3a3c3d", metalness: 0.7, roughness: 0.45 });
    for (const [x, z] of [[-0.84, -0.39], [0.84, -0.39], [-0.84, 0.39], [0.84, 0.39]]) {
      f.box({ size: [0.04, TOP - 0.03, 0.04], radius: 0.004, material: steel, pos: [x, (TOP - 0.03) / 2, z] });
    }
    f.box({ size: [1.64, 0.06, 0.02], radius: 0.003, material: steel, pos: [0, TOP - 0.06, -0.4] });

    // Background: steel shelves with boxes, fogged and dim (never a lit aisle).
    // only at the two sides, darkened, so the lit wall behind the people stays a clean backdrop
    const dim = (o) => o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new THREE.Color("#4a4a48"); } });
    for (const [x, z] of [[-3.0, -3.6], [3.1, -3.6]]) {
      dim(await f.model("steel_frame_shelves_01", { pos: [x, 0, z], height: 2.1 }));
    }
    for (let i = 0; i < 10; i++) {
      const x = [-3.6, -3.0, -2.4, 2.5, 3.1, 3.7][i % 6] + 0.12 * Math.sin(i * 2.3);
      const shelfZ = -3.6;
      const y = [0.02, 0.73, 1.42][i % 3];
      dim(await f.model("cardboard_box_01", { pos: [x, y, shelfZ + 0.05 * Math.cos(i)], rot: [0, 0.2 * Math.sin(i * 1.7), 0], height: 0.28 + 0.05 * Math.sin(i * 3.1) }));
    }

    // Fluorescent battens over the table area (only the frame; light comes from the table key).
    for (const x of [-0.8, 0.8]) {
      const fix = await f.model("mounted_fluorescent_lights", { pos: [x, H - 0.05, 0.2], rot: [0, Math.PI / 2, 0], scale: 1.2 });
      const keep = fix.getObjectByName("mounted_fluorescent_lights_d");
      fix.traverse((o) => { if (!o.isMesh) return; let p = o, ok = false; while (p) { if (p === keep) ok = true; p = p.parent; } o.visible = ok; });
    }

    // Lights. Key: a neutral white table light straight above (narrow, soft-edged, shadows).
    const key = f.key({ pos: [0.15, 2.65, 0.25], target: [0, TOP, 0], intensity: mode === "pieces" ? 34 : 26, angle: mode === "pieces" ? 0.5 : 0.42,
      penumbra: 0.65, color: "#f3f2ee" });
    key.shadow.bias = -0.0003;
    key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { near: 0.5, far: 5 });
    // Back light / separation: a cold wash on the back wall between the shelves + a rim spot behind the figures.
    const wash = new THREE.SpotLight("#dfe6ea", mode === "open" ? 70 : 10, 9, 0.5, 0.9, 1.4);
    wash.position.set(-0.3, 2.6, -1.6);
    wash.target.position.set(-0.5, 1.2, Z0);
    S.add(wash, wash.target);
    const rim = new THREE.SpotLight("#e8eef2", mode === "open" ? 55 : 0, 6, 0.55, 0.7, 1.5);
    rim.position.set(0.0, 2.45, -1.5);          // from beyond the table onto the people's shoulders and collars
    rim.target.position.set(-0.1, 1.3, 1.0);
    rim.castShadow = mode === "open";
    rim.shadow.mapSize.set(1024, 1024);
    rim.shadow.bias = -0.0005;
    S.add(rim, rim.target);
    S.add(new THREE.AmbientLight("#a9b4bd", 0.02));

    const cloth = await shirtClothMaterial(f);
    let amber = null;
    let pieces = [];
    let man = [];

    if (mode === "open") {
      // Open box (cardboard walls), lid beside it, a paper tag on the box side, the cloth end inside.
      const boxRef = await f.model("cardboard_box_01", { pos: [0, -5, 0], height: 0.3 });
      let cardMat = null;
      boxRef.traverse((o) => { if (o.isMesh) cardMat = o.material; });
      boxRef.visible = false;
      const card = new THREE.MeshStandardMaterial({ color: "#8f7556", roughness: 0.93 });
      const BX = -0.32, BZ = 0.02, bw = 0.42, bd = 0.32, bh = 0.17, th = 0.006;
      f.box({ size: [bw, th, bd], radius: 0.001, material: card, pos: [BX, TOP + th / 2, BZ] });
      f.box({ size: [bw, bh, th], radius: 0.001, material: card, pos: [BX, TOP + bh / 2, BZ + bd / 2] });
      f.box({ size: [bw, bh, th], radius: 0.001, material: card, pos: [BX, TOP + bh / 2, BZ - bd / 2] });
      f.box({ size: [th, bh, bd], radius: 0.001, material: card, pos: [BX - bw / 2, TOP + bh / 2, BZ] });
      f.box({ size: [th, bh, bd], radius: 0.001, material: card, pos: [BX + bw / 2, TOP + bh / 2, BZ] });
      // folded-back flaps
      for (const sz of [1, -1]) {
        const a = 1.0, half = 0.07;
        f.box({ size: [bw, th, 2 * half], radius: 0.001, material: card,
          pos: [BX, TOP + bh - Math.sin(a) * half, BZ + sz * (bd / 2 + Math.cos(a) * half)], rot: [sz * a, 0, 0] });
      }
      // lid lying on the table to the right
      f.box({ size: [bw + 0.02, 0.05, bd + 0.02], radius: 0.004, material: card, pos: [0.42, TOP + 0.025, 0.12], rot: [0, 0.32, 0] });
      // paper tag on the box side (no real text: grey bars)
      f.sheet({ w: 0.07, h: 0.12, lines: 7, paper: "#cdbf9e", age: 0.4, torn: 0, px: 256, pos: [BX + bw / 2 + 0.0045, TOP + 0.085, BZ + 0.02], rot: [0, Math.PI / 2, 0.06] });
      // the cloth inside: the lower-right piece, folded into the box (sits on the box floor, one end draped on the rim)
      const inBox = clothPiece(f, cloth, "lowerR", { pos: [BX - 0.12, TOP + 0.01, BZ + 0.15], rotY: 0.2, wrinkle: 0.012, res: 1600, spread: false });
      inBox.scale.setScalar(0.62);
      // Amber focus: a small warm light into the box.
      amber = new THREE.SpotLight(AMBER, 3.2, 1.6, 0.22, 0.6, 1.6);
      amber.position.set(BX + 0.25, TOP + 0.95, BZ + 0.35);
      amber.target.position.set(BX, TOP + 0.05, BZ);
      S.add(amber, amber.target);

      // Two standing people on the camera side of the table, seen from behind / 3/4 behind, looking down at the box;
      // back-lit from beyond the table (rim on collars and sleeves). Suits are generic dark neutrals (no record).
      const wool = await f.material("poly_wool_herringbone");
      for (const [x, z, ry, suit] of [[-0.62, 0.98, Math.PI + 0.32, "#2a2927"], [0.28, 1.12, Math.PI - 0.22, "#34332f"]]) {
        const p = await f.figure("film");
        dress(p, { suit, trousers: suit, shirt: "#a29e96", fabric: wool.normalMap });
        poseArmsDown(p, 0.03);
        turn(p, "spine_02", [1, 0, 0], 0.16);
        turn(p, "neck_01", [1, 0, 0], 0.42);
        settle(p, 0);
        p.root.position.set(x, p.root.position.y, z);
        p.root.rotation.y = ry;
        f.hold(p);
        man.push(p);
      }
    } else {
      // Five pieces of the one shirt, laid flat into its outline.
      for (const [i, name] of PIECES.entries()) {
        const pc = clothPiece(f, cloth, name, { pos: [0, TOP, 0.36], wrinkle: name.startsWith("sleeve") ? 0.016 : 0.008,
          res: name === "sleeveL" ? 3600 : 1600, seed: 3 + i });
        pc.userData.name = name;
        pieces.push(pc);
      }
      // raking from the right, low: it shows the folds, weave and loose threads of the sleeve alone
      amber = new THREE.SpotLight("#f2b25e", 0, 3, 0.26, 0.5, 1.5);
      amber.position.set(1.25, TOP + 0.62, 0.32);
      amber.target.position.set(0.5, TOP, -0.12);
      amber.castShadow = true;
      amber.shadow.mapSize.set(1024, 1024);
      amber.shadow.bias = -0.0003;
      S.add(amber, amber.target);
    }

    const drops = cue.drops || null;
    return (t) => {
      for (const p of man) f.rest(p);
      if (pieces.length) {
        pieces.forEach((pc, i) => {
          const t0 = drops ? drops[i] : -1;
          const k = ease.out(clamp01((t - t0) / 0.5));
          pc.visible = t >= t0;
          pc.position.y = TOP + 0.06 * (1 - k);
        });
        const on = cue.sleeve != null ? ease.out(clamp01((t - cue.sleeve) / 0.4)) : 0;
        amber.intensity = 38 * on;
        key.intensity = 34 - 22 * on;
      }
      f.shot(opts.camera, t);
    };
  });
}
