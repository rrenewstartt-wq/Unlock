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
