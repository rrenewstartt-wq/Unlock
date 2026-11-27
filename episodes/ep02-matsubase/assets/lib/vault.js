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
//   golf   → golf_wear    the grey golf wear as a folded cloth bundle (the garment's cut is not in the record), a paper tag
//                          on a string, and from cue.gauge a dotted fingertip-size circle (about 1.6 cm) on the EMPTY table
//                          beside it (amber focus — a size comparison only; no stain is drawn on the cloth).
//   ending → ending       the five pieces already laid as the shirt, the left sleeve warm from the start, a paper tag by the
//                          sleeve; cue.low = [t0, t1] dims the table light (the check in low light).
// Coordinates (metres): floor y = 0, x ∈ [-4, 4], z ∈ [-5, 3.5] (camera side +z), table top centred at (0, 0.74, 0),
// 1.8 × 0.9. Shirt (pieces): hem at z = +0.36, collar toward -z, the wearer's left sleeve at +x.
// opts: { mode, camera, cues: { drops: [t, t, t, t, t] (pieces, in PIECES order), sleeve: t (amber on), gauge: t, low: [t0, t1] } }
import { film, THREE, poseArmsDown, settle, turn, setFabric, ease, clamp01 } from "../kit3d/film.js";
import { dress } from "./dress.js";
import { RoundedBoxGeometry } from "../kit3d/addons/geometries/RoundedBoxGeometry.js";
import { shirtClothMaterial, clothPiece, PIECES } from "./cloth.js";

const AMBER = "#F0A23B";
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Soft contact shadow (AO) under the bundle: a rounded-rectangle alpha card lying on the table.
function contactCard(w, d, y, opacity = 0.7) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.filter = "blur(9px)";
  x.fillStyle = "rgba(0,0,0,0.9)";
  x.fillRect(20, 20, 88, 88);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y + 0.0005;
  return m;
}

// Dotted ring (canvas alpha), lying flat: the fingertip-size gauge. d = outer diameter (m).
function dottedRing(d, color) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    x.beginPath(); x.arc(128 + 110 * Math.cos(a), 128 + 110 * Math.sin(a), 13, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(d, d), new THREE.MeshBasicMaterial({ color, alphaMap: t, transparent: true, toneMapped: false, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// Pull a (texture) material toward grey in the shader (the jersey scan is blue; the record says grey).
function greyed(mat, sat = 0.06, tint = "#ffffff") {
  const tc = new THREE.Color(tint);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSat = { value: sat };
    sh.uniforms.uTint = { value: tc };
    sh.fragmentShader = "uniform float uSat;\nuniform vec3 uTint;\n" + sh.fragmentShader.replace("#include <map_fragment>",
      "#include <map_fragment>\n  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat) * uTint;");
  };
  mat.customProgramCacheKey = () => `greyed-${sat}-${tint}`;
  mat.needsUpdate = true;
  return mat;
}

// The rumpled top of a folded knit bundle: a subdivided sheet with soft wrinkles whose border rolls down into the
// layer below (so it reads as cloth folded over, not a lid). Deterministic.
function rumpledTop(w, d, drop, seed) {
  const g = new THREE.PlaneGeometry(w, d, 60, 46);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const ex = Math.abs(x) / (w / 2), ez = Math.abs(z) / (d / 2);
    const e = Math.max(ex, ez);
    const fall = Math.pow(Math.max(0, (e - 0.86) / 0.14), 2);
    // soft wrinkles + one diagonal crease (where the garment was folded over) + fine ripples
    const cr = (x * 0.8 + z * 0.6 - 0.03) / 0.012;
    const wr = 0.0022 * Math.sin(x * 41 + seed + 1.3 * Math.sin(z * 23)) * Math.sin(z * 17 + seed * 2)
      + 0.0018 * Math.sin(x * 9 - z * 13 + seed * 3) + 0.0009 * Math.sin(x * 88 + z * 31 + seed)
      + 0.0035 * Math.exp(-cr * cr) - 0.0012 * Math.exp(-(cr - 2) * (cr - 2));
    p.setY(i, wr * (1 - fall) - drop * fall);
    p.setX(i, x * (1 - 0.02 * fall));
    p.setZ(i, z * (1 - 0.02 * fall));
  }
  g.computeVertexNormals();
  return g;
}
const TOP = 0.74;
const X0 = -4, X1 = 4, Z0 = -5, Z1 = 5.2, H = 2.8;

export function createVault(stage, opts) {
  const mode = opts.mode || "open";
  const cue = opts.cues || {};
  return film(stage, `vault-${mode}-${stage.id}`, {
    hdri: "storeroom", envIntensity: mode === "open" ? 0.04 : 0.05, exposure: 1.0, background: "#08090a",
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
    const key = f.key({ pos: [0.15, 2.65, 0.25], target: [0, TOP, 0], intensity: mode === "open" || mode === "golf" ? 24 : 34, angle: mode === "open" ? 0.42 : 0.5,
      penumbra: 0.65, color: "#f3f2ee" });
    key.shadow.bias = -0.0003;
    key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { near: 0.5, far: 5 });
    // Back light / separation: a cold wash on the back wall between the shelves + a rim spot behind the figures.
    const wash = new THREE.SpotLight("#dfe6ea", mode === "open" ? 70 : 10, 9, 0.5, 0.9, 1.4);
    wash.position.set(-0.3, 2.6, -1.6);
    wash.target.position.set(-0.5, 1.2, Z0);
    S.add(wash, wash.target);
    // Rims: two low, near-level spots from beyond the table onto the people's collars, shoulders and sleeves (no floor
    // stripes: aimed level, their cones run out past the camera), and a faint cold fill from the camera side so the
    // jackets read as cloth, not cut-outs.
    if (mode === "open") {
      for (const [px, tx, tz] of [[-1.5, -0.62, 0.98], [1.4, 0.28, 1.12]]) {
        const rim = new THREE.SpotLight("#e4ebf0", 34, 7, 0.32, 0.6, 1.4);
        rim.position.set(px, 1.95, -1.3);
        rim.target.position.set(tx, 1.42, tz);
        S.add(rim, rim.target);
      }
      const fill = new THREE.SpotLight("#cfd9e0", 5, 9, 0.38, 0.9, 1.2);
      fill.position.set(1.6, 2.6, 4.2);
      fill.target.position.set(-0.2, 1.25, 1.0);
      S.add(fill, fill.target);
    }
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
      for (const [x, z, ry, suit] of [[-0.62, 0.98, Math.PI - 0.3, "#2a2927"], [0.46, 1.1, Math.PI + 0.5, "#34332f"]]) {
        const p = await f.figure("film");
        await dress(p, { suit, trousers: suit, shirt: "#a29e96", fabric: wool.normalMap });
        poseArmsDown(p, 0.03);
        turn(p, "spine_02", [1, 0, 0], 0.16);
        turn(p, "neck_01", [1, 0, 0], 0.42);
        settle(p, 0);
        p.root.position.set(x, p.root.position.y, z);
        p.root.rotation.y = ry;
        f.hold(p);
        man.push(p);
      }
    } else if (mode === "golf") {
      // The grey golf wear (seized 1/9): only "grey golf wear" is recorded, so a folded knit bundle — three soft layers,
      // a rumpled top — with a paper tag on a string. No stain is drawn anywhere.
      const jersey = await f.material("jersey_melange", { normalScale: 0.7 });
      const knit = f.tiled(jersey, 0.5 / 0.25, 0.42 / 0.25);
      knit.color = new THREE.Color("#ffffff");
      knit.roughness = 0.95;
      const GX = -0.2, GZ = 0.02;
      const bundle = new THREE.Group();
      greyed(knit, 0.05, "#f2f2ef");
      // one soft heap: a knit sheet over a folded core, its border falling to the table in irregular folds
      const W0 = 0.5, D0 = 0.42, IW = 0.14, ID = 0.1, H0 = 0.048, FALL = 0.08;
      const g = new THREE.PlaneGeometry(W0, D0, 150, 126);
      g.rotateX(-Math.PI / 2);
      const pp = g.attributes.position;
      const sm = (u) => u * u * (3 - 2 * u);
      for (let i = 0; i < pp.count; i++) {
        const x = pp.getX(i), z = pp.getZ(i);
        const dx = Math.max(0, Math.abs(x) - IW), dz = Math.max(0, Math.abs(z) - ID);
        const ang = Math.atan2(z, x);
        const wob = 0.012 * Math.sin(ang * 3 + 0.7) + 0.008 * Math.sin(ang * 7 + 2.1);
        const dd = Math.max(0, Math.hypot(dx, dz) - wob);
        const k = Math.min(1, dd / FALL);
        let y = H0 * (1 - sm(k));
        // folds where the cloth drapes: radial ridges, strongest mid-fall, gone on the table and on the top
        const fold = Math.sin(ang * 11 + 3 * Math.sin(ang * 2)) * 0.5 + Math.sin(ang * 17 + 1.3) * 0.3;
        y += 0.007 * fold * Math.sin(Math.PI * Math.min(1, k * 1.15));
        // top: soft wrinkles and one crease
        const top = 1 - Math.min(1, dd / 0.02);
        const cr = (x * 0.8 + z * 0.6 - 0.02) / 0.014;
        y += top * (0.0022 * Math.sin(x * 41 + 1.3 * Math.sin(z * 23)) * Math.sin(z * 17) + 0.0016 * Math.sin(x * 9 - z * 13)
          + 0.0018 * Math.exp(-cr * cr));
        // the hem lying on the table, slightly lifted in a few waves
        if (k >= 1) y = 0.0015 + 0.0025 * Math.max(0, Math.sin(ang * 5 + 1.1)) * Math.min(1, (dd - FALL) / 0.02);
        pp.setY(i, y);
      }
      g.computeVertexNormals();
      const heap = new THREE.Mesh(g, knit);
      heap.castShadow = heap.receiveShadow = true;
      bundle.add(heap);
      const cut = 0.04;   // trim the sheet's square corners into a rounded outline (alpha) so the hem is not a rectangle
      const ac = document.createElement("canvas");
      ac.width = 500; ac.height = 420;
      const ax = ac.getContext("2d");
      ax.fillStyle = "#000"; ax.fillRect(0, 0, 500, 420);
      ax.fillStyle = "#fff"; ax.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const r = 1 + 0.035 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 9 + 2);
        const ex = Math.cos(a), ez = Math.sin(a);
        const sq = Math.pow(Math.pow(Math.abs(ex), 4) + Math.pow(Math.abs(ez), 4), -0.25);   // squircle
        const px = 250 + 238 * r * sq * ex, pz = 210 + 198 * r * sq * ez;
        if (i) ax.lineTo(px, pz); else ax.moveTo(px, pz);
      }
      ax.fill();
      knit.alphaMap = new THREE.CanvasTexture(ac);
      knit.alphaTest = 0.5;
      knit.side = THREE.DoubleSide;
      void cut;
      bundle.position.set(GX, TOP, GZ);
      bundle.rotation.y = -0.12;
      S.add(bundle);
      const ao = contactCard(0.5, 0.42, TOP, 0.8);
      ao.position.set(GX, TOP + 0.0005, GZ + 0.01);
      ao.rotation.z = -0.12;
      S.add(ao);
      // paper tag on a string from the bundle's front-right corner, lying on the table (grey bars, no real text)
      const tag = f.sheet({ w: 0.06, h: 0.105, lines: 9, paper: "#cdbf9e", age: 0.4, torn: 0, px: 256,
        pos: [GX + 0.27, TOP + 0.0012, GZ + 0.2], rot: [-Math.PI / 2, 0, 0.5] });
      const strMat = new THREE.MeshStandardMaterial({ color: "#b8ab90", roughness: 0.9 });
      const pts = [[GX + 0.17, TOP + 0.022, GZ + 0.12], [GX + 0.2, TOP + 0.008, GZ + 0.16], [GX + 0.22, TOP + 0.002, GZ + 0.19], [GX + 0.25, TOP + 0.0015, GZ + 0.175]]
        .map((v) => new THREE.Vector3(...v));
      S.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0008, 6), strMat));
      // fingertip-size gauge (index fingertip ≈ 1.6 cm) on the empty table to the right of the bundle
      amber = dottedRing(0.018, AMBER);
      amber.position.set(0.12, TOP + 0.0008, 0.06);
      amber.visible = false;
      S.add(amber);
      amber.userData.gauge = true;
    } else {
      // Five pieces of the one shirt, laid flat into its outline.
      for (const [i, name] of PIECES.entries()) {
        const pc = clothPiece(f, cloth, name, { pos: [0, TOP, 0.36], wrinkle: name.startsWith("sleeve") ? 0.016 : 0.008,
          res: name === "sleeveL" ? 3600 : 1600, seed: 3 + i });
        pc.userData.name = name;
        pieces.push(pc);
      }
      if (mode === "ending") {
        // a paper tag beside the left sleeve (grey bars only; the date is the on-screen label)
        f.sheet({ w: 0.055, h: 0.095, lines: 6, paper: "#cdbf9e", age: 0.45, torn: 0, px: 256,
          pos: [0.78, TOP + 0.0012, 0.12], rot: [-Math.PI / 2, 0, -0.25] });
      }
      // raking from the right, low: it shows the folds, weave and loose threads of the sleeve alone
      // one warm highlight on the left sleeve (a patch near its torn shoulder end), not a wash over the cloth
      amber = new THREE.SpotLight("#e9b06a", 0, 3, 0.085, 0.75, 1.5);
      amber.position.set(1.25, TOP + 0.62, 0.32);
      amber.target.position.set(0.42, TOP, -0.16);
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
        // cue.low: the table light dims to a third (and comes back) — the check in low light
        const lo = cue.low ? Math.min(clamp01((t - cue.low[0]) / 0.3), clamp01((cue.low[1] - t) / 0.3)) : 0;
        amber.intensity = 17 * on;
        key.intensity = (34 - 10 * on) * (1 - 0.68 * lo);
      }
      if (amber && amber.userData.gauge) amber.visible = cue.gauge != null && t >= cue.gauge;
      f.shot(opts.camera, t);
    };
  });
}
