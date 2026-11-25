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
# 강조색과 재현 표기 — new_episode.py 가 새 편에서 빨강·표기 없음으로 바꾼다(사용자 결정 2026-11-25: 레퍼런스와 같게).
ACCENT = AMBER
RECON_TAG = True
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
    {clip(sid + '-re', 0.3, dur - 0.3, 'tag-re', '재현') if RECON_TAG else ''}
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


# ---------------------------------------------------------------- title card (reference grammar, docs/reference-look.md §1, §2-6)

# Bold face for title cards and in-scene numbers (thumbkit/overlay3d.js loads the same file). Its own family name, so
# nothing that already asks for "Gothic A1" changes weight.
TITLE_FONT = '    @font-face { font-family: "Gothic A1 Bold"; font-weight: 700; src: url("assets/fonts/GothicA1-Bold.ttf"); }\n'
# Measured on the reference frames at 1920x1080 (screen-rec v1_4.5, v1_7.5): text left x=116; title glyphs y 751-788
# (38 px tall), sub glyphs y 814-837 (24 px), rule y=873 from x=112, 461 px long; cursor block 20x40 px, 6 px after the text.
# Box values below were fitted on our own snapshots (lab-look, 2026-11-25) so the GLYPHS land on those measurements.
TITLE_CARD = {"x": 113, "title_px": 41, "title_top": 750, "sub_x": 116, "sub_px": 28, "sub_top": 812, "rule_x": 112,
              "rule_top": 872, "rule": 461, "rule_h": 2, "cursor_w": 20, "cursor_h": 40, "cursor_gap": 2, "cursor_dy": 0}


def title_card(sid, at, title, sub="", hold=4.5, sub_at=None, n=0, cps=0.065, sub_cps=0.045, cursor=3.0, rule=None, z=30):
    """Reference title card: bottom-left, typed one character at a time with a block cursor ▌, a grey second line and a
    thin white rule. One frame for both kinds of card:
        date/place   title_card(sid, q[0] + 0.2, "1999년 9월 9일 목요일", "어느 해안 마을")
        person       title_card(sid, q[1], "민지", "스무 살")            # the cursor keeps blinking after the name
    It is one clip over the whole scene, so it stays through every camera cut inside the scene (cam_shots). For a card that
    must cross a scene boundary, return it from `title_cards(DATA)` in scenes.py instead (build.py puts it above all scenes).

    at      scene-local start (s).        hold   total time on screen (s), fades out over its last 0.3 s
    sub_at  scene-local time the second line starts typing (default: right after the title and the rule)
    cps     seconds per character (title), sub_cps for the second line.  cursor: seconds the cursor blinks after typing
    rule    rule length px (default 461, measured)
    Returns (markup, css, tweens) like archive_insert: add them to a scene3d()/wrap() scene.
    """
    T = TITLE_CARD
    cid = f"{sid}-tc{n}"
    hold = float(hold)
    rule = T["rule"] if rule is None else rule

    def chars(text, key):
        return "".join(f'<span id="{cid}-{key}{i}" class="tc-ch">{"&nbsp;" if ch == " " else ch}</span>' for i, ch in enumerate(text))

    tw = []
    t = at + 0.05
    for i in range(len(title)):
        tw.append(f'    tl.set("#{cid}-t{i}", {{ display: "inline" }}, {round(t + i * cps, 3)});')
    t_typed = t + len(title) * cps
    tw.append(f'    tl.fromTo("#{cid}-rule", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.55, ease: "power2.out" }}, {round(t_typed + 0.1, 3)});')
    if sub:
        s0 = sub_at if sub_at is not None else t_typed + 0.45
        for i in range(len(sub)):
            tw.append(f'    tl.set("#{cid}-s{i}", {{ display: "inline" }}, {round(s0 + i * sub_cps, 3)});')
    # cursor: solid while typing, then blinks (0.5 s on / 0.5 s off) for `cursor` seconds, then stays off
    tw.append(f'    tl.set("#{cid}-cur", {{ opacity: 1 }}, {round(at, 3)});')
    k, tb = 0, t_typed + 0.5
    while tb < min(t_typed + cursor, at + hold - 0.3):
        tw.append(f'    tl.set("#{cid}-cur", {{ opacity: {0 if k % 2 == 0 else 1} }}, {round(tb, 3)});')
        k, tb = k + 1, tb + 0.5
    if k % 2 == 0:  # the last state set was "on" (or no blink fitted): switch it off
        tw.append(f'    tl.set("#{cid}-cur", {{ opacity: 0 }}, {round(tb, 3)});')
    tw.append(f'    tl.to("#{cid}-in", {{ opacity: 0, duration: 0.3, ease: "power2.in" }}, {round(at + hold - 0.32, 3)});')
    inner = (f'<div id="{cid}-in" class="tc-in">'
             f'<div class="tc-t">{chars(title, "t")}<span id="{cid}-cur" class="tc-cur"></span></div>'
             + (f'<div class="tc-s">{chars(sub, "s")}</div>' if sub else "")
             + f'<div id="{cid}-rule" class="tc-rule" style="width:{rule}px"></div></div>')
    markup = "    " + clip(cid, round(at, 2), hold, "tcard", inner)
    css = TITLE_FONT + f"""
    .tcard {{ position: absolute; inset: 0; z-index: {z}; pointer-events: none; }}
    .tc-in {{ position: absolute; inset: 0; }}
    .tc-ch {{ display: none; }}
    .tc-t {{ position: absolute; left: {T["x"]}px; top: {T["title_top"]}px; height: {T["cursor_h"] + 8}px; white-space: nowrap;
      font-family: "Gothic A1 Bold", "Gothic A1", sans-serif; font-weight: 700; font-size: {T["title_px"]}px; line-height: {T["cursor_h"] + 8}px;
      color: #FFFFFF; letter-spacing: -0.005em; text-shadow: 0 1px 2px rgba(0,0,0,.55), 0 0 14px rgba(0,0,0,.35); }}
    .tc-cur {{ display: inline-block; width: {T["cursor_w"]}px; height: {T["cursor_h"]}px; margin-left: {T["cursor_gap"]}px;
      vertical-align: top; margin-top: {T["cursor_dy"]}px; background: #FFFFFF; opacity: 0; }}
    .tc-s {{ position: absolute; left: {T["sub_x"]}px; top: {T["sub_top"]}px; white-space: nowrap; font-family: "Gothic A1", sans-serif;
      font-weight: 500; font-size: {T["sub_px"]}px; line-height: 1.2; color: #E4E2DF; text-shadow: 0 1px 2px rgba(0,0,0,.6), 0 0 12px rgba(0,0,0,.35); }}
    .tc-rule {{ position: absolute; left: {T["rule_x"]}px; top: {T["rule_top"]}px; height: {T["rule_h"]}px; background: rgba(255,255,255,.82);
      transform-origin: 0 50%; box-shadow: 0 0 6px rgba(0,0,0,.35); }}"""
    return markup, css, "\n".join(tw)


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


def archive_scene(sid, dur, q, shots, label="기록", css="", overlay="", tweens="", look="board"):
    """A scene built from real archive photos (assets/archive/, licensed in assets/archive/SOURCES.md).
    Each photo should hold about 3 s (2.5~4 s): the hook = 1~3 photos, one caption line each.

    look  "board" (default): prints on the dark board, amber 기록 tag, caption line under the print.
          "unlock": the reference's real-photo grammar (docs/reference-look.md §2-8) — every photo full frame, the same
          near-monochrome cool grade as the 3D (UNLOCK_GRADE: grain, vignette), a slow push, no frame, no tag, no caption
          line; only the credit stays as one small line (fact + licence). Extra per-shot key: crop (x0, y0, x1, y1) in 0..1
          of the source — the part that must fill the frame (cut film borders, handwriting). `label`/`tilt`/`mode` are ignored.

    shots: list of dicts, one per photo, cut hard from one to the next:
      src     "assets/archive/<file>.jpg"
      at      start: caption index (int) or seconds (float). The first shot starts at 0.
      size    (w, h) pixel size of the source file — used for layout
      mode    "print" (default; small/old photos: a print on the board, max ~2.6x upscale) or "cover" (≥1600px wide)
      tilt    print rotation in degrees (default alternates ±1.2)
      push    (scale_from, scale_to) slow camera push (default 1.0 → 1.07)
      pan     (dx, dy) px drift over the shot (default 0, 0)
      focus   [(caption index, cx, cy, r)] amber rings drawn on the photo at that caption; cx, cy, r in 0..1 of photo width/height
      caption small line under the print, e.g. "1948년 12월, 남호주 경찰 사진"
      credit  licence line, bottom right, e.g. "South Australia Police · 퍼블릭 도메인"
    """
    def t_of(v):
        return q[v] if isinstance(v, int) else float(v)

    if look == "unlock":
        return _archive_unlock(sid, dur, q, shots, t_of, css, overlay, tweens)
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
            k_fit = min(1240 / w, 640 / h, 2.6)
            pw, ph = round(w * k_fit), round(h * k_fit)
            tilt = s.get("tilt", 1.2 if k % 2 else -1.2)
            fig = (f'<figure class="ar-print" style="width:{pw}px;height:{ph}px;transform:translate(-50%,-50%) rotate({tilt}deg)">'
                   f'<img class="ar-img" src="{s["src"]}" alt="" style="width:{pw}px;height:{ph}px" '
                   f"data-color-grading='{ARCHIVE_GRADE}'/>")
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
    .ar-ring ellipse {{ fill: none; stroke: {ACCENT}; stroke-width: 7; stroke-linecap: round; }}
    .ar-cap {{ position: absolute; left: 0; right: 0; top: 830px; text-align: center; font-size: 32px; color: rgba(233,229,221,.9); }}
    .ar-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.78); }}
    .tag-ar {{ border-color: {ACCENT}; }}"""
    script = ("    const tl = gsap.timeline({ paused: true });\n" + "\n".join(tw) + "\n" + tweens +
              f'\n    window.__timelines["{sid}"] = tl;')
    return wrap(sid, dur, base_css + css, "\n".join(["    " + m for m in markup]) + "\n    " + tag + "\n" + overlay, script)


# Reference real-photo look (docs/reference-look.md §1 "실제 사진": luma 0.36~0.46, p99 ~0.84, chroma 0.05~0.08, B-R +0.02~+0.04,
# vignette 0.65~1.0, coarse grain). HyperFrames media treatment (deterministic), never CSS filters.
UNLOCK_GRADE = ('{"adjust":{"exposure":-0.24,"contrast":0.1,"highlights":0,"whites":0.16,"shadows":0.06,"blacks":0.02,'
                '"saturation":-0.7,"temperature":-0.38},'
                '"wheels":{"shadows":{"hue":212,"amount":0.24,"level":0},"midtones":{"hue":208,"amount":0.16,"level":0}},'
                '"details":{"vignette":0.42,"vignetteMidpoint":0.42,"vignetteFeather":0.75,"grain":0.38,"grainSize":0.5,"grainRoughness":0.75}}')


def _archive_unlock(sid, dur, q, shots, t_of, css="", overlay="", tweens=""):
    """archive_scene(look="unlock"): full-frame graded photos with a slow push; credit as one small line."""
    starts = [0.0] + [t_of(s["at"]) - 0.05 for s in shots[1:]]
    ends = starts[1:] + [dur]
    markup, tw = [], []
    for k, (s, t0, t1) in enumerate(zip(shots, starts, ends)):
        w, h = s.get("size", (1920, 1080))
        x0, y0, x1, y1 = s.get("crop", (0, 0, 1, 1))
        cw, ch = (x1 - x0) * w, (y1 - y0) * h
        kf = max(1920 / cw, 1080 / ch)                      # cover the frame with the crop
        iw, ih = round(w * kf), round(h * kf)
        left = round(-x0 * w * kf + (1920 - cw * kf) / 2)
        top = round(-y0 * h * kf + (1080 - ch * kf) / 2)
        rings = ""
        for j, (ci, cx, cy, r) in enumerate(s.get("focus", [])):
            rid = f"{sid}-r{k}-{j}"
            rings += (f'<svg class="ar-ring" style="left:{left}px;top:{top}px" viewBox="0 0 {iw} {ih}" width="{iw}" height="{ih}">'
                      f'<ellipse id="{rid}" cx="{round(cx * iw)}" cy="{round(cy * ih)}" rx="{round(r * iw)}" ry="{round(r * iw * 0.82)}" '
                      f'pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/></svg>')
            tw.append(f'    tl.to("#{rid}", {{ strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }}, {round(max(t0, t_of(ci)) + 0.15, 2)});')
        img = (f'<img class="ar-img" src="{s["src"]}" alt="" style="position:absolute;left:{left}px;top:{top}px;width:{iw}px;height:{ih}px" '
               f"data-color-grading='{s.get('grade', UNLOCK_GRADE)}'/>")
        cam = f'<div id="{sid}-cam{k}" class="ar-cam ar-u-cam">{img}{rings}</div>'
        cred = f'<div class="ar-u-credit" data-layout-ignore>{s["credit"]}</div>' if s.get("credit") else ""
        markup.append(clip(f"{sid}-ph{k}", round(t0, 2), t1 - t0, "ar-shot ar-u", cam + cred))
        s0, s1 = s.get("push", (1.0, 1.06))
        dx, dy = s.get("pan", (0, 0))
        tw.append(f'    tl.fromTo("#{sid}-cam{k}", {{ scale: {s0}, x: 0, y: 0 }}, '
                  f'{{ scale: {s1}, x: {dx}, y: {dy}, duration: {round(t1 - t0, 2)}, ease: "none" }}, {round(t0, 2)});')
    base_css = f"""
    .ar-shot {{ position: absolute; inset: 0; background: #050505; overflow: hidden; }}
    .ar-cam {{ position: absolute; inset: 0; transform-origin: 50% 50%; }}
    .ar-img {{ display: block; }}
    .ar-ring {{ position: absolute; overflow: visible; }}
    .ar-ring ellipse {{ fill: none; stroke: {ACCENT}; stroke-width: 7; stroke-linecap: round; }}
    .ar-u-credit {{ position: absolute; right: 40px; top: 34px; font-size: 22px; line-height: 1.2; color: rgba(240,238,234,.72);
      text-shadow: 0 1px 3px rgba(0,0,0,.9); white-space: nowrap; }}"""
    script = ("    const tl = gsap.timeline({ paused: true });\n" + "\n".join(tw) + "\n" + tweens +
              f'\n    window.__timelines["{sid}"] = tl;')
    return wrap(sid, dur, base_css + css, "\n".join(["    " + m for m in markup]) + "\n" + overlay, script)


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
    .ar-ring ellipse {{ fill: none; stroke: {ACCENT}; stroke-width: 7; stroke-linecap: round; }}
    .ar-cap {{ position: absolute; left: 0; right: 0; top: 830px; text-align: center; font-size: 32px; color: rgba(233,229,221,.9); }}
    .ar-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.78); }}
    .tag-ar {{ border-color: {ACCENT}; }}"""
    return markup, css, "\n".join(tw)
