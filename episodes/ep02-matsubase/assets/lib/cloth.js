// The shirt cloth (shared by vault.js, home.js, yard.js — every set that shows the shirt or its pieces uses THIS file,
// so the cloth looks the same in every scene). SPEC "OBJECTS": the five pieces are all the same cloth.
// Record: [2] 15쪽 13~14행 「肌色地に茶色と赤色のチェック模様」(살색 바탕에 갈색과 빨강 체크, F114) and
//         [2] 15쪽 8행 「赤・茶・白のチェックのスポーツシャツ」(빨강·갈색·흰색 체크, F107) — the same cloth described twice:
//         a pale skin-colour ground, brown bands, a red line, a thin white line. No stains, no dirt (BANNED).
// Amber rule: the red is cool and desaturated so it never reads as the channel amber; amber is light only.
//
//   import { SHIRT_CLOTH, shirtClothMaterial, clothPiece, shirtLayout } from "./cloth.js";
//   const mat = await shirtClothMaterial(f);                       // one per set
//   const piece = clothPiece(f, mat, "sleeveL", { pos: [0, 0.742, 0] });   // a piece of the shirt laid flat
import { THREE } from "../kit3d/film.js";

// Colour values (sRGB) and the repeat. Change here and every set follows.
export const SHIRT_CLOTH = {
  ground: "#b4a091",   // 살색 바탕 (채도 한 단계 더 낮게: 복숭아·주황으로 읽히지 않게)
  brown: "#4d372e",    // 갈색 띠
  red: "#74414a",      // 빨강 선 (차갑고 채도 낮게, 주황기 없음)
  white: "#e2ded6",    // 흰 선
  period: 0.06,        // one repeat of the check, metres (6 cm)
  // stripe sequence across one repeat: [colour key, fraction]. Warp and weft use the same sequence (a square check).
  stripes: [["ground", 0.22], ["brown", 0.18], ["ground", 0.04], ["red", 0.06], ["ground", 0.04], ["brown", 0.18],
    ["ground", 0.12], ["white", 0.04], ["ground", 0.06], ["red", 0.025], ["ground", 0.035]],
  thread: 4,           // canvas px per thread (twill 2/2)
  px: 1024,            // canvas px per repeat
};

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const n1 = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i + s * 57.3) * (1 - u) + hash(i + 1 + s * 57.3) * u; };
// smooth fractal noise, roughly -0.5..0.5
const fbm = (x, s) => 0.55 * n1(x, s) + 0.3 * n1(x * 2.7, s + 3) + 0.15 * n1(x * 7.3, s + 7) - 0.5;

let CHECK = null;
const GRAINS = new WeakMap();   // base material → { grain: [map, normalMap] }
// One repeat of the woven check as a canvas: twill 2/2, each thread shows warp or weft colour, a little shading per thread.
export function shirtCheckCanvas() {
  if (CHECK) return CHECK;
  const C = SHIRT_CLOTH, N = C.px, T = C.thread;
  const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const stripeAt = new Array(N);
  let acc = 0, si = 0;
  const bounds = C.stripes.map(([k, w]) => { acc += w; return [k, acc]; });
  for (let p = 0; p < N; p++) {
    const u = (p + 0.5) / N;
    while (si < bounds.length - 1 && u > bounds[si][1]) si++;
    stripeAt[p] = rgb(C[bounds[si][0]]);
  }
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d");
  const img = x.createImageData(N, N);
  const d = img.data;
  for (let py = 0; py < N; py++) {
    const j = Math.floor(py / T), fy = (py % T + 0.5) / T;
    for (let px = 0; px < N; px++) {
      const i = Math.floor(px / T), fx = (px % T + 0.5) / T;
      const warpOver = ((i + j) & 3) < 2;
      const col = warpOver ? stripeAt[px] : stripeAt[py];
      // thread shading: rounded thread across its width, slub variation per thread
      const across = warpOver ? fx : fy;
      const shade = 0.82 + 0.18 * Math.sin(Math.PI * across) + 0.05 * (hash(warpOver ? i * 3.1 : j * 7.7 + 1) - 0.5);
      const o = (py * N + px) * 4;
      d[o] = Math.min(255, col[0] * shade); d[o + 1] = Math.min(255, col[1] * shade); d[o + 2] = Math.min(255, col[2] * shade); d[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  // flannel (ネル地): brushed, so the check edges and the twill are soft, and loose surface fibres lie over it
  const soft = document.createElement("canvas");
  soft.width = soft.height = N;
  const sx = soft.getContext("2d");
  for (const [dx, dy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { sx.filter = "blur(2.2px)"; sx.drawImage(c, dx, dy); }
  sx.filter = "none";
  x.globalAlpha = 0.72; x.drawImage(soft, 0, 0); x.globalAlpha = 1;
  for (let i = 0; i < 9000; i++) {
    const px = hash(i * 1.37) * N, py = hash(i * 2.71) * N, len = 6 + hash(i * 3.9) * 22, a = hash(i * 5.3) * Math.PI * 2;
    const light = hash(i * 7.1) > 0.45;
    x.strokeStyle = light ? "rgba(236,228,216,0.16)" : "rgba(40,30,26,0.07)";
    x.lineWidth = 0.6 + hash(i * 8.3) * 0.8;
    x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a + 0.6) * len * 0.5, py + Math.sin(a + 0.6) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  CHECK = c;
  return c;
}

// Material factory: the check map + Poly Haven stretch_poplin weave normals. Returns a base; clothPiece() clones it.
export async function shirtClothMaterial(f) {
  const poplin = await f.material("stretch_poplin");
  const map = new THREE.CanvasTexture(shirtCheckCanvas());
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  // flannel (ネル地): matte with a soft fibre sheen at grazing angles
  const m = new THREE.MeshPhysicalMaterial({ map, normalMap: poplin.normalMap, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
    sheen: 0.6, sheenRoughness: 0.9, sheenColor: new THREE.Color("#bdb7ae") });
  m.normalScale = new THREE.Vector2(0.3, 0.3);   // brushed nap hides most of the weave relief
  m.userData.period = SHIRT_CLOTH.period;
  return m;
}

// ---- The shirt laid flat (face up), shirt space in metres: x to the viewer's right, y up the shirt. The wearer's LEFT
// sleeve is at +x. Body 0.54 wide, 0.72 long; long sleeves slanting down-out. Five pieces, torn apart along simple lines
// (the records give no tear shapes — SPEC: "조각 경계는 단순한 찢긴 선, 2/5 조각만 27×34cm 비율").
const BODY = { w: 0.54, h: 0.72 };
const SHIRT = [ // outline polygon (clockwise from bottom left)
  [-0.27, 0], [0.27, 0], [0.27, 0.5],
  [0.62, 0.17], [0.7, 0.26], [0.33, 0.69],         // left sleeve (viewer's right): cuff 0.12 wide
  [0.07, 0.72], [0.0, 0.66], [-0.07, 0.72],        // collar notch
  [-0.33, 0.69], [-0.7, 0.26], [-0.62, 0.17], [-0.27, 0.5],
];
// tears (shared by neighbours so the pieces fit): sleeve tears near the shoulder seam, a horizontal tear at y≈0.34,
// a vertical tear at x≈0 below it. The 2/5 piece (lower left) is 0.27 × 0.34 (27 × 34 cm, F108).
const tearH = (x) => 0.34 + 0.012 * fbm(x * 18, 3);
const tearV = (y) => 0.0 + 0.01 * fbm(y * 20, 5);
// the sleeve tear follows the armhole: x = 0.275 below the armpit, out to the shoulder point (0.33, 0.69) above it
const sleeveCut = (x, y, side) => side * x - (0.278 + Math.max(0, y - 0.5) * 0.3 + 0.01 * fbm(y * 22, side > 0 ? 9 : 11));
export function pieceAt(x, y) {
  if (sleeveCut(x, y, 1) > 0) return "sleeveL";
  if (sleeveCut(x, y, -1) > 0) return "sleeveR";
  if (y > tearH(x)) return "upper";
  return x < tearV(y) ? "lowerL" : "lowerR";
}
export const PIECES = ["lowerL", "lowerR", "upper", "sleeveR", "sleeveL"]; // order they come out (lowerL = the 2/5 piece)
const BBOX = {
  sleeveL: [0.24, 0.13, 0.74, 0.72], sleeveR: [-0.74, 0.13, -0.24, 0.72],
  upper: [-0.36, 0.3, 0.36, 0.75], lowerL: [-0.3, -0.03, 0.04, 0.38], lowerR: [-0.04, -0.03, 0.3, 0.38],
};
// where each piece sits in the laid-out reconstruction: pulled apart a little so the tears read
// grain angle of each piece's check (radians, shirt space): sleeves slant down-out at about 41°
const GRAIN = { sleeveL: 0.72, sleeveR: -0.72 };
const SPREAD = { sleeveL: [0.018, -0.006], sleeveR: [-0.018, -0.006], upper: [0, 0.014], lowerL: [-0.008, -0.004], lowerR: [0.008, -0.004] };
export function shirtLayout() { return { BODY, SHIRT, BBOX, SPREAD, PIECES }; }

// A piece as a thin cloth sheet: alpha-mask outline (torn edges with loose threads), gentle wrinkles, the shared check
// continuing across pieces. opts: pos (shirt origin on the table), rot (y), lift (m), wrinkle (m), res (alpha px per m),
// seed. Returns a Group lying flat (y up), the shirt's +y pointing to -z (away from a camera at +z).
export function clothPiece(f, base, name, { pos = [0, 0, 0], rotY = 0, wrinkle = 0.006, res = 3000, seed = 1, spread = true } = {}) {
  const [x0, y0, x1, y1] = BBOX[name];
  const bw = x1 - x0, bh = y1 - y0;
  const W = Math.round(bw * res), Hh = Math.round(bh * res);
  // alpha: shirt outline ∩ this piece's region
  const c = document.createElement("canvas");
  c.width = W; c.height = Hh;
  const g = c.getContext("2d");
  const toPx = ([x, y]) => [(x - x0) * res, (y1 - y) * res];
  g.fillStyle = "#000"; g.fillRect(0, 0, W, Hh);
  g.fillStyle = "#fff";
  g.beginPath();
  SHIRT.forEach((p, i) => { const [px, py] = toPx(p); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
  g.closePath(); g.fill();
  const img = g.getImageData(0, 0, W, Hh);
  const d = img.data;
  for (let py = 0; py < Hh; py++) {
    const y = y1 - (py + 0.5) / res;
    for (let px = 0; px < W; px++) {
      const o = (py * W + px) * 4;
      if (!d[o]) continue;
      const x = x0 + (px + 0.5) / res;
      if (pieceAt(x, y) !== name) d[o] = d[o + 1] = d[o + 2] = 0;
    }
  }
  g.putImageData(img, 0, 0);
  // loose threads along the torn edges: walk the edge pixels, every few mm a 2~7 mm thread out of the edge
  g.strokeStyle = "#fff";
  g.lineCap = "round";
  const inside = (x, y) => { const px = Math.floor((x - x0) * res), py = Math.floor((y1 - y) * res);
    return px >= 0 && py >= 0 && px < W && py < Hh && d[(py * W + px) * 4] > 0; };
  let k = 0;
  for (let y = y0; y < y1; y += 0.0016) {
    for (let x = x0; x < x1; x += 0.0016) {
      if (!inside(x, y)) continue;
      // a torn edge = inside this piece, next to another piece (not next to the shirt outline)
      let dir = null;
      for (const [dx, dy] of [[0.002, 0], [-0.002, 0], [0, 0.002], [0, -0.002]]) {
        const p = pieceAt(x + dx, y + dy);
        if (p !== name && !inside(x + dx, y + dy)) { dir = [dx, dy]; break; }
      }
      if (!dir) continue;
      k++;
      if (hash(k * 1.7 + seed) > 0.33) continue;
      const len = 0.002 + 0.006 * hash(k * 3.3 + seed);
      const a = Math.atan2(-dir[1], dir[0]) + (hash(k * 5.1) - 0.5) * 0.9;
      const [px, py] = toPx([x, y]);
      g.lineWidth = Math.max(1, 0.0005 * res * (0.7 + 0.6 * hash(k * 9.1)));
      g.beginPath(); g.moveTo(px, py);
      const mx = px + Math.cos(a) * len * res * 0.5, my = py + Math.sin(a) * len * res * 0.5;
      g.quadraticCurveTo(mx + (hash(k * 2.2) - 0.5) * 6, my + (hash(k * 4.4) - 0.5) * 6, px + Math.cos(a) * len * res, py + Math.sin(a) * len * res);
      g.stroke();
    }
  }
  const alpha = new THREE.CanvasTexture(c);
  alpha.anisotropy = 8;
  const m = base.clone();
  m.alphaMap = alpha;
  m.alphaTest = 0.5;
  // uv = shirt-space metres. alphaMap maps the bbox to 0..1; the check (and weave) runs along the piece's grain:
  // straight on the body, along the sleeve axis on the sleeves (a sleeve is cut on its own grain).
  alpha.repeat.set(1 / bw, 1 / bh);
  alpha.offset.set(-x0 / bw, -y0 / bh);
  // one texture per grain angle (shared by pieces with the same grain) keeps GPU memory low: several sets share a page
  const grain = GRAIN[name] || 0;
  if (!GRAINS.has(base)) GRAINS.set(base, {});
  const cache = GRAINS.get(base);
  if (!cache[grain]) {
    const map = base.map.clone();
    map.repeat.set(1 / SHIRT_CLOTH.period, 1 / SHIRT_CLOTH.period);
    map.rotation = grain;
    map.needsUpdate = true;
    const nor = base.normalMap.clone();
    nor.repeat.set(1 / 0.05, 1 / 0.05);
    nor.rotation = grain;
    nor.needsUpdate = true;
    cache[grain] = [map, nor];
  }
  [m.map, m.normalMap] = cache[grain];
  // geometry: a fine grid with soft wrinkles (folds running diagonally) and a slight lift toward torn edges
  const sx = Math.max(24, Math.round(bw / 0.004)), sy = Math.max(24, Math.round(bh / 0.004));
  const geo = new THREE.PlaneGeometry(bw, bh, sx, sy);
  const P = geo.attributes.position;
  const UV = geo.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) + x0 + bw / 2, y = P.getY(i) + y0 + bh / 2;
    UV.setXY(i, x, y);
    const fold = 0.6 * Math.pow(Math.max(0, Math.sin((x * 0.8 + y * 1.3) * 15 + 3 * fbm(x * 5, seed + 1))), 1.5)
      + 0.35 * Math.max(0, Math.sin((x * 1.4 - y * 0.7) * 24 + 2 * fbm(y * 7, seed + 2)))
      + 0.4 * (fbm(x * 14 + y * 3, seed + 3) + 0.5);
    P.setZ(i, wrinkle * fold + 0.0012);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // piece-local: centre of its bbox in shirt space
  mesh.position.set(x0 + bw / 2 + (spread ? SPREAD[name][0] : 0), y0 + bh / 2 + (spread ? SPREAD[name][1] : 0), 0);
  const shirt = new THREE.Group();     // shirt space → table: lay flat, shirt +y toward -z
  shirt.add(mesh);
  shirt.rotation.set(-Math.PI / 2, 0, 0);
  const holder = new THREE.Group();
  holder.add(shirt);
  holder.position.set(...pos);
  holder.rotation.y = rotY;
  f.scene.add(holder);
  holder.userData.mesh = mesh;
  return holder;
}
