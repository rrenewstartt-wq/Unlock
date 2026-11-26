// lab-look pilot (motion-designer): the cinematographer's look street (look_street.js, unchanged) with the in-scene
// distance marks of thumbkit/overlay3d.js on top — the reference's "red line on the road + big number" grammar.
//
// Why a wrapper: look_street.js returns its own per-frame update and must not be edited, and the look grade
// (look.js Grade: saturation 0.2, highlight ceiling 0.58) would turn a red line into grey-pink and the white number
// into mid-grey if the marks lived in the graded scene (the hero mask can't be used: it writes alpha 0, which makes a
// blended line invisible). So the marks get their own scene, drawn straight onto the canvas AFTER the grade with the
// same camera. Proper fix belongs in film.js/overlay3d.js (an "after grade" layer) — reported, not done here.
//
// opts: everything createLookStreet takes, plus
//   marks: [{ type: "measure", a, b, ...o } | { type: "route", pts, ...o } | { type: "pin", pos, ...o } | { type: "label", pos, text, ...o }]
//   accent: "#D8382E" (setAccent)
import { Film } from "../kit3d/film.js";
import { createLookStreet } from "./look_street.js";
import { measure, route, pin, label3d, play, setAccent } from "../kit3d/overlay3d.js";
import { THREE } from "../kit3d/film.js";

export function createLookStreetMarks(stage, opts = {}) {
  if (opts.accent) setAccent(opts.accent);
  const orig = Film.create;
  let marks = null;
  // film() calls Film.create synchronously (first statement of its async build), so the patch only sees this stage.
  Film.create = async function (st, o) {
    const f = await orig.call(this, st, o);
    if (st !== stage) return f;
    const over = new THREE.Scene();
    const fo = Object.create(f);          // same camera/renderer, marks go into `over`
    fo.scene = over;
    const built = (async () => {
      const list = [];
      for (const m of opts.marks || []) {
        if (m.type === "measure") list.push(await measure(fo, m.a, m.b, m));
        else if (m.type === "route") list.push(await route(fo, m.pts, m));
        else if (m.type === "pin") list.push(await pin(fo, m.pos, m));
        else if (m.type === "label") list.push(await label3d(fo, m.pos, m.text, m));
      }
      marks = play(...list);
    })();
    const ready = f.ready.bind(f);
    f.ready = async () => { await built; return ready(); };
    const render = f.render.bind(f);
    f.render = () => {
      render();                           // the set, graded (grain, vignette, depth of field)
      if (!marks) return;
      marks(f.time);                      // after f.shot: labels face this frame's camera
      const r = f.renderer, ac = r.autoClear;
      r.setRenderTarget(null);
      r.autoClear = false;
      r.clearDepth();
      r.render(over, f.cam);
      r.autoClear = ac;
    };
    return f;
  };
  try {
    // blind-1 fix 4: the street the line runs along was outside the aerial's sunlit circle (luma 0.06–0.08), so this
    // scene widens the sun over the whole block (the leaf shade still stays at the yard tree)
    return createLookStreet(stage, { sun: { target: [-7, 0.5, 4.5], size: 46 }, ...opts });
  } finally {
    Film.create = orig;
  }
}
