"""Shared scene kit for mystery-unlock-style episodes.

Episode scenes.py does `from scenes_kit import *` and defines one function per scene id:
    def <scene_id>(sid, dur, q) -> composition HTML
where q[i] is the scene-local start (s) of caption i. Optionally `sfx_events(data)`.
"""
FONTS = """
    @font-face { font-family: "Gothic A1"; font-weight: 500; src: url("assets/fonts/GothicA1-Medium.ttf"); }
    @font-face { font-family: "Black Han Sans"; font-weight: 400; src: url("assets/fonts/BlackHanSans-Regular.ttf"); }
"""

AMBER = "#F0A23B"
INK = "#E9E5DD"
GROUND = "#1E2125"


def wrap(sid, dur, css, markup, script, module=False):
    stype = ' type="module"' if module else ""
    return f"""<template>
  <style>
{FONTS}
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {GROUND}; color: {INK}; font-family: "Gothic A1", sans-serif; }}
    .disp {{ font-family: "Black Han Sans", sans-serif; font-weight: 400; }}
    .tag-re {{ position: absolute; left: 96px; top: 72px; font-size: 28px; letter-spacing: 0.08em; color: #E9E5DD; background: rgba(20,22,25,0.62);
      border: 2px solid rgba(233,229,221,0.6); padding: 4px 14px 6px; }}
{css}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080">
{markup}
  </div>
  <script{stype}>
{script}
  </script>
</template>
"""


def clip(id_, start, dur, cls="", inner="", style="", extra=""):
    c = f' class="clip {cls}"' if cls else ' class="clip"'
    s = f' style="{style}"' if style else ""
    return f'<div id="{id_}"{c} data-start="{start}" data-duration="{round(dur, 2)}"{s}{extra}>{inner}</div>'


# ---------------------------------------------------------------- 3D scenes

def scene3d(sid, dur, module, factory, opts, overlay="", tweens="", css=""):
    markup = f"""    {clip(sid + '-stage', 0, dur, extra=' data-layout-ignore', style='position:absolute;inset:0')}
    {clip(sid + '-re', 0.3, dur - 0.3, 'tag-re', '재현')}
{overlay}"""
    script = f"""    import {{ {factory} }} from "./assets/lib/{module}.js";
    const render = {factory}(document.getElementById("{sid}-stage"), {opts});
    const st = {{ t: 0 }};
    const tl = gsap.timeline({{ paused: true }});
    tl.to(st, {{ t: {dur}, duration: {dur}, ease: "none", onUpdate: () => render(st.t) }}, 0);
{tweens}
    render(0);
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script, module=True)


def cam_shots(shots, end, push=0.06):
    """Camera keys for a 3D scene cut into shots.

    shots: [(t, pos, look, fov), ...] — each shot starts with a hard cut at t (the first at 0) and slowly
    pushes `push` of the way toward its look point until the next shot. Returns a JS array literal.
    """
    keys = []
    for i, (t, pos, look, fov) in enumerate(shots):
        t_end = shots[i + 1][0] - 0.02 if i + 1 < len(shots) else end
        p2 = [round(p + (l - p) * push, 3) for p, l in zip(pos, look)]
        cut = ", cut: true" if i else ""
        keys.append(f"{{ t: {round(t, 2)}, pos: {list(pos)}, look: {list(look)}, fov: {fov}{cut} }}")
        keys.append(f"{{ t: {round(t_end, 2)}, pos: {p2}, look: {list(look)}, fov: {fov}, ease: \"linear\" }}")
    return "[\n      " + ",\n      ".join(keys) + "\n    ]"


BOARD = "radial-gradient(ellipse at 50% 42%, #1D1F22 0%, #0E0F11 78%)"  # diagram scenes: near-black board


def person_card(w, h, color="#E9E5DD", sw=3, dashed=False, fill="#0E0F11", cls="pcard"):
    """Outline person card (the diagram scenes' one icon for a person). Inline SVG, w x h px."""
    dash = ' stroke-dasharray="10 8"' if dashed else ""
    r = round(w * 0.16, 1)
    return (f'<svg class="{cls}" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect x="{sw / 2}" y="{sw / 2}" width="{w - sw}" height="{h - sw}" rx="6" fill="{fill}" stroke="{color}" stroke-width="{sw}"{dash}/>'
            f'<circle cx="{w / 2}" cy="{round(h * 0.37, 1)}" r="{r}" fill="none" stroke="{color}" stroke-width="{sw}"/>'
            f'<path d="M {round(w * 0.2, 1)} {round(h * 0.84, 1)} Q {round(w * 0.2, 1)} {round(h * 0.58, 1)} {w / 2} {round(h * 0.58, 1)} '
            f'Q {round(w * 0.8, 1)} {round(h * 0.58, 1)} {round(w * 0.8, 1)} {round(h * 0.84, 1)}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>'
            f'</svg>')


# ---------------------------------------------------------------- archive photos (real records)

# Archive look: HyperFrames media treatment (mono, faded, deterministic grain) — one look for every record photo.
ARCHIVE_GRADE = '{"preset":"mono-fade","intensity":0.85,"details":{"vignette":0.18,"grain":0.12,"grainSize":0.22,"grainRoughness":0.6}}'
# Very flat paper strips (a cropped document line): the vignette leaves a white blotch in the middle, so none.
STRIP_GRADE = '{"preset":"mono-fade","intensity":0.85,"details":{"vignette":0,"grain":0.12,"grainSize":0.22,"grainRoughness":0.6}}'


def archive_scene(sid, dur, q, shots, label="기록", css="", overlay="", tweens=""):
    """A scene built from real archive photos (assets/archive/, licensed in assets/archive/SOURCES.md).
    Each photo should hold about 3 s (2.5~4 s): the hook = 1~3 photos, one caption line each.

    shots: list of dicts, one per photo, cut hard from one to the next:
      src     "assets/archive/<file>.jpg"
      at      start: caption index (int) or seconds (float). The first shot starts at 0.
      size    (w, h) pixel size of the source file — used for layout
      mode    "print" (default; small/old photos: a print on the board, max ~2.6x upscale), "cover" (≥1600px wide) or
              "strip" (a cropped line of a document: a wide paper strip, up to 1760 px wide, no tilt by default)
      tilt    print rotation in degrees (default alternates ±1.2)
      push    (scale_from, scale_to) slow camera push (default 1.0 → 1.07)
      pan     (dx, dy) px drift over the shot (default 0, 0)
      focus   [(caption index, cx, cy, r)] amber rings drawn on the photo at that caption; cx, cy, r in 0..1 of photo width/height
      caption small line under the print, e.g. "1948년 12월, 남호주 경찰 사진"
      credit  licence line, bottom right, e.g. "South Australia Police · 퍼블릭 도메인"
    """
    def t_of(v):
        return q[v] if isinstance(v, int) else float(v)

    starts = [0.0] + [t_of(s["at"]) - 0.05 for s in shots[1:]]
    ends = starts[1:] + [dur]
    markup, tw = [], []
    for k, (s, t0, t1) in enumerate(zip(shots, starts, ends)):
        w, h = s.get("size", (1200, 900))
        mode = s.get("mode", "print")
        if mode == "cover":
            pw, ph = 1920, 1080
            fig = (f'<figure class="ar-cover"><img class="ar-img" src="{s["src"]}" alt="" '
                   f"data-color-grading='{ARCHIVE_GRADE}'/>")
        else:
            bw, bh = (1760, 320) if mode == "strip" else (1240, 640)
            k_fit = min(bw / w, bh / h, 2.6)
            pw, ph = round(w * k_fit), round(h * k_fit)
            tilt = s.get("tilt", 0 if mode == "strip" else (1.2 if k % 2 else -1.2))
            fig = (f'<figure class="ar-print" style="width:{pw}px;height:{ph}px;transform:translate(-50%,-50%) rotate({tilt}deg)">'
                   f'<img class="ar-img" src="{s["src"]}" alt="" style="width:{pw}px;height:{ph}px" '
                   f"data-color-grading='{STRIP_GRADE if mode == "strip" else ARCHIVE_GRADE}'/>")
        rings = ""
        for j, (ci, cx, cy, r) in enumerate(s.get("focus", [])):
            rid = f"{sid}-r{k}-{j}"
            rings += (f'<svg class="ar-ring" viewBox="0 0 {pw} {ph}" width="{pw}" height="{ph}">'
                      f'<ellipse id="{rid}" cx="{round(cx * pw)}" cy="{round(cy * ph)}" rx="{round(r * pw)}" ry="{round(r * pw * 0.82)}" '
                      f'pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/></svg>')
            tw.append(f'    tl.to("#{rid}", {{ strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }}, {round(max(t0, t_of(ci)) + 0.15, 2)});')
        fig += rings + "</figure>"
        cap = f'<div class="ar-cap">{s["caption"]}</div>' if s.get("caption") else ""
        cred = f'<div class="ar-credit">{s["credit"]}</div>' if s.get("credit") else ""
        cam = f'<div id="{sid}-cam{k}" class="ar-cam">{fig}</div>'
        markup.append(clip(f"{sid}-ph{k}", round(t0, 2), t1 - t0, "ar-shot", cam + cap + cred))
        s0, s1 = s.get("push", (1.0, 1.07))
        dx, dy = s.get("pan", (0, 0))
        tw.append(f'    tl.fromTo("#{sid}-cam{k}", {{ scale: {s0}, x: 0, y: 0 }}, '
                  f'{{ scale: {s1}, x: {dx}, y: {dy}, duration: {round(t1 - t0, 2)}, ease: "none" }}, {round(t0, 2)});')
    tag = clip(f"{sid}-tag", 0.3, dur - 0.3, "tag-re tag-ar", label)
    base_css = f"""
    .ar-shot {{ position: absolute; inset: 0; background: {BOARD}; overflow: hidden; }}
    .ar-cam {{ position: absolute; inset: 0; transform-origin: 50% 43%; }}
    .ar-print {{ position: absolute; left: 50%; top: 43%; margin: 0; padding: 0; background: #EDE8DE;
      outline: 18px solid #EDE8DE; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 6px 18px rgba(0,0,0,.5); }}
    .ar-cover {{ position: absolute; inset: 0; margin: 0; }}
    .ar-cover .ar-img {{ width: 1920px; height: 1080px; object-fit: cover; }}
    .ar-img {{ display: block; }}
    .ar-ring {{ position: absolute; left: 0; top: 0; overflow: visible; }}
    .ar-ring ellipse {{ fill: none; stroke: {AMBER}; stroke-width: 7; stroke-linecap: round; }}
    .ar-cap {{ position: absolute; left: 0; right: 0; top: 830px; text-align: center; font-size: 32px; color: rgba(233,229,221,.9); }}
    .ar-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.78); }}
    .tag-ar {{ border-color: {AMBER}; }}"""
    script = ("    const tl = gsap.timeline({ paused: true });\n" + "\n".join(tw) + "\n" + tweens +
              f'\n    window.__timelines["{sid}"] = tl;')
    return wrap(sid, dur, base_css + css, "\n".join(["    " + m for m in markup]) + "\n    " + tag + "\n" + overlay, script)


def archive_insert(sid, at, src, size, dur=3.0, focus=None, caption="", credit="", tilt=-1.0, push=(1.0, 1.06), n=0, hide=None):
    """A ~3-second real-photo cut inserted inside any scene (3D or diagram) at a highlight.

    Returns (markup, css, tweens) to add to the scene: scene3d(..., overlay=markup, css=css, tweens=tweens), or into a wrap() scene.
    at: scene-local seconds (usually q[i] + small offset, the moment the caption names the thing).
    focus: (cx, cy, r) amber ring on the photo, 0..1 of width/height, drawn 0.4 s after the cut.
    hide: selector of the scene's own container (one whose opacity no other tween animates) to switch off while the
          photo covers it — a real cut, so text underneath is not "hidden beneath an opaque element".
    """
    w, h = size
    k_fit = min(1240 / w, 640 / h, 2.6)
    pw, ph = round(w * k_fit), round(h * k_fit)
    iid = f"{sid}-ins{n}"
    ring, tw = "", []
    if focus:
        cx, cy, r = focus
        ring = (f'<svg class="ar-ring" viewBox="0 0 {pw} {ph}" width="{pw}" height="{ph}">'
                f'<ellipse id="{iid}-r" cx="{round(cx * pw)}" cy="{round(cy * ph)}" rx="{round(r * pw)}" ry="{round(r * pw * 0.82)}" '
                f'pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/></svg>')
        tw.append(f'    tl.to("#{iid}-r", {{ strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }}, {round(at + 0.4, 2)});')
    fig = (f'<figure class="ar-print" style="width:{pw}px;height:{ph}px;transform:translate(-50%,-50%) rotate({tilt}deg)">'
           f'<img class="ar-img" src="{src}" alt="" style="width:{pw}px;height:{ph}px" data-color-grading=\'{ARCHIVE_GRADE}\'/>{ring}</figure>')
    inner = (f'<div id="{iid}-cam" class="ar-cam">{fig}</div>'
             + (f'<div class="ar-cap">{caption}</div>' if caption else "")
             + (f'<div class="ar-credit">{credit}</div>' if credit else "")
             + '<div class="tag-re tag-ar">기록</div>')
    # A full-frame cut on purpose: it covers the scene underneath for `dur` seconds.
    markup = "    " + clip(iid, round(at, 2), dur, "ar-shot ar-ins", inner, extra=" data-layout-allow-overlap")
    tw.append(f'    tl.fromTo("#{iid}-cam", {{ scale: {push[0]} }}, {{ scale: {push[1]}, duration: {dur}, ease: "none" }}, {round(at, 2)});')
    if hide:
        tw.append(f'    tl.set("{hide}", {{ opacity: 0 }}, {round(at + 0.02, 2)});')
        tw.append(f'    tl.set("{hide}", {{ opacity: 1 }}, {round(at + dur, 2)});')
    css = f"""
    .ar-shot {{ position: absolute; inset: 0; background: {BOARD}; overflow: hidden; }}
    .ar-ins {{ z-index: 20; }}
    .ar-cam {{ position: absolute; inset: 0; transform-origin: 50% 43%; }}
    .ar-print {{ position: absolute; left: 50%; top: 43%; margin: 0; padding: 0; background: #EDE8DE;
      outline: 18px solid #EDE8DE; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 6px 18px rgba(0,0,0,.5); }}
    .ar-img {{ display: block; }}
    .ar-ring {{ position: absolute; left: 0; top: 0; overflow: visible; }}
    .ar-ring ellipse {{ fill: none; stroke: {AMBER}; stroke-width: 7; stroke-linecap: round; }}
    .ar-cap {{ position: absolute; left: 0; right: 0; top: 830px; text-align: center; font-size: 32px; color: rgba(233,229,221,.9); }}
    .ar-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.78); }}
    .tag-ar {{ border-color: {AMBER}; }}"""
    return markup, css, "\n".join(tw)
