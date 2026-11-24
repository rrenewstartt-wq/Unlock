"""Archive (real record) scenes for ep02 — hook and place. Files and licences: assets/archive/SOURCES.md.

Court documents: not copyrightable (Japanese Copyright Act art. 13). GSI map tiles: credit must stay on screen.
Line strips are cut in the image files themselves (no names on any file); never crop names with CSS.

The record look (pilot judge 1, fix 2): a document is a physical sheet lying on a dark desk, shot from above at a slight
angle (CSS perspective), with a contact shadow, paper grain and a lamp falloff, and a slow push toward the amber ring.
Every cut changes distance, angle and light. One Korean gloss line on a dark name plate (44 px), above the subtitles.
  record_cut(...)     one paper cut (full page or a cropped line strip) -> (markup, tweens)   [used by hook, place]
  map_cut(...)        one GSI map cut with high contrast and place-name plates -> (markup, tweens)
  record_scene(...)   a whole archive scene from those cuts (hard cuts)
  record_insert(...)  a ~3 s record cut inside a 3D / diagram scene -> (markup, css, tweens), like scenes_kit.archive_insert
Pixels of real media are graded only with data-color-grading (mono-fade); the desk is a CC0 wood texture (kit3d cache).
"""
import json
import math

from scenes_kit import clip, wrap, AMBER

KOUSAI = "후쿠오카고법 결정문(2017) · 조서 요약 부분 · 재판소 공개본"
SAISHIN = "구마모토지법 재심 판결(2019) · 재판소 공개본"
GSI = "出典：国土地理院（地理院タイル・淡色地図）を加工して作成 · 현재 지도"
A = "assets/archive/"
DESK = "assets/kit3d/cache/textures/dark_wood/diff.jpg"  # Poly Haven dark_wood (CC0), restored by kit3d.json

STRIP_W = 1600        # every line strip is drawn at this image width, so the text has one size in every strip cut
STRIP_PAD = (80, 66)  # paper margin around a strip (x, y)
LINE_PX = 122         # source height of one document line in the strip files (2651 px wide)


def _grade(exposure=0.0, vignette=0.0, grain=0.12, contrast=0.0, extra=None):
    g = {"preset": "mono-fade", "intensity": 0.9,
         "adjust": {"exposure": exposure, "contrast": contrast},
         "details": {"vignette": vignette, "grain": grain, "grainSize": 0.22, "grainRoughness": 0.6}}
    if extra:
        g.update(extra)
    return json.dumps(g, separators=(",", ":"))


RC_CSS = f"""
    .rc-shot {{ position: absolute; inset: 0; background: #0B0C0D; overflow: hidden; }}
    .rc-cam {{ position: absolute; inset: 0; }}
    .rc-plane {{ position: absolute; inset: 0; transform-style: preserve-3d; }}
    .rc-desk {{ position: absolute; left: -900px; top: -760px; width: 3720px; height: 2600px; display: block; }}
    .rc-paper {{ position: absolute; margin: 0; padding: 0; background: #DCDAD6;
      box-shadow: 0 1px 1px rgba(0,0,0,.7), 0 3px 6px rgba(0,0,0,.55), 0 26px 60px rgba(0,0,0,.6), 0 60px 140px rgba(0,0,0,.45); }}
    .rc-paper img {{ position: absolute; display: block; }}
    .rc-sheen {{ position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(172deg, rgba(255,250,240,.05) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,.16) 100%); }}
    .rc-shade {{ position: absolute; inset: 0; pointer-events: none; background: #0B0C0E; }}
    .rc-ring {{ position: absolute; left: 0; top: 0; overflow: visible; }}
    .rc-ring ellipse {{ fill: none; stroke: {AMBER}; stroke-width: 7; stroke-linecap: round; }}
    .rc-fall {{ position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse 120% 95% at 50% 30%, rgba(0,0,0,0) 45%, rgba(0,0,0,.42) 100%),
                  linear-gradient(to bottom, rgba(6,7,8,0) 56%, rgba(6,7,8,.62) 78%, rgba(6,7,8,.9) 100%); }}
    .rc-gloss {{ position: absolute; left: 50%; top: 786px; transform: translateX(-50%); white-space: nowrap;
      padding: 12px 32px 15px 30px; background: rgba(12,13,15,.84); border-left: 8px solid #E9E5DD;
      font-size: 44px; line-height: 1.25; color: #F3F0EA; }}
    .rc-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.8);
      text-shadow: 0 0 3px #000, 0 2px 8px #000; }}
    .rc-map {{ position: absolute; inset: 0; }}
    .rc-map img {{ position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: block; }}
    .rc-place {{ position: absolute; transform: translate(-50%, -50%); }}
    .rc-node {{ position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
      border: 4px solid #F3F0EA; background: rgba(12,13,15,.6); box-shadow: 0 0 0 3px rgba(12,13,15,.6); }}
    .rc-name {{ position: absolute; white-space: nowrap; padding: 8px 20px 10px 18px; background: rgba(12,13,15,.84);
      border-left: 8px solid #E9E5DD; font-size: 38px; line-height: 1.2; color: #F3F0EA; }}
    .rc-name small {{ display: block; font-size: 32px; color: rgba(243,240,234,.86); margin-top: 2px; }}
    .rc-date {{ position: absolute; left: 96px; top: 150px; padding: 16px 32px 20px 30px; background: rgba(12,13,15,.86);
      border-left: 8px solid #E9E5DD; font-size: 58px; line-height: 1.1; color: #F3F0EA; }}
    .rc-date small {{ display: block; font-family: "Gothic A1", sans-serif; font-size: 36px; margin-top: 8px; color: rgba(243,240,234,.9); }}
    .rc-tag {{ position: absolute; left: 96px; top: 72px; font-size: 28px; letter-spacing: 0.08em; color: #E9E5DD;
      background: rgba(20,22,25,.72); border: 2px solid {AMBER}; padding: 4px 14px 6px; }}"""


def _ring_svg(rid, pw, ph, cx, cy, rx, ry):
    return (f'<svg class="rc-ring" viewBox="0 0 {pw} {ph}" width="{pw}" height="{ph}">'
            f'<ellipse id="{rid}" cx="{round(cx)}" cy="{round(cy)}" rx="{round(rx)}" ry="{round(ry)}" '
            f'pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/></svg>')


def record_cut(cid, t0, t1, s, ring_at=None):
    """One paper cut: a document lying on the desk. Returns (inner markup, tweens). Plane coordinates = frame px.

    s keys:
      src, size (w, h)  file and its pixel size
      mode    "page" (a whole page; `width` px wide on the desk) or "strip" (a cropped line file; always STRIP_W wide,
              on a paper slip with margins, so every strip has the same text size)
      width   page width on the desk (page mode, default 1500). Bigger = closer.
      anchor  (fx, fy) point of the file (0..1) placed at `spot` (default: page = the first focus, strip = the centre)
      spot    (x, y) frame px where the anchor sits (default (960, 430)); the desk tilts around this point, the push goes to it
      lean    rotateX degrees (top edge away from the camera; desk-shot look), default 16
      tilt    rotateZ degrees, default 0
      light   how much lamp light the sheet gets (-0.6 .. 0.1; <0 = a shade layer over the sheet), default 0; desk follows it
      push    (scale_from, scale_to), default (1.0, 1.06);  drift (dx, dy) px over the cut, default (0, 0)
      focus   [(cx, cy, r)] amber ring on the file (0..1 of its width/height, r = half width / file width), drawn at ring_at
      caption Korean gloss line (name plate, 44 px);  credit  licence line
    """
    w, h = s["size"]
    mode = s.get("mode", "page")
    focus = s.get("focus", [])
    if mode == "strip":
        iw = STRIP_W
        ih = round(h * iw / w)
        padx, pady = STRIP_PAD
        pw, ph = iw + 2 * padx, ih + 2 * pady
        ox, oy = padx, pady
    else:
        pw = s.get("width", 1500)
        ph = round(h * pw / w)
        iw, ih, ox, oy = pw, ph, 0, 0
    fx, fy = s.get("anchor", (0.5, 0.5) if mode == "strip" or not focus else focus[0][:2])
    ax, ay = s.get("spot", (960, 430))
    left, top = ax - (ox + fx * iw), ay - (oy + fy * ih)
    lean, tilt, light = s.get("lean", 16), s.get("tilt", 0), s.get("light", 0.0)
    img = (f'<img src="{s["src"]}" alt="" style="left:{ox}px;top:{oy}px;width:{iw}px;height:{ih}px" '
           f"data-color-grading='{_grade(0.0, 0.0 if mode == 'strip' else 0.14)}'/>")
    # Light falls on the whole sheet (image + its paper margin alike), so the shade is one layer over both.
    shade = f'<div class="rc-shade" style="opacity:{round(min(0.75, max(0.0, -light) * 1.1), 3)}"></div>' if light < 0 else ""
    rings, tw = "", []
    nlines = max(1, round(h / LINE_PX)) if mode == "strip" else 1
    for j, (cx, cy, r) in enumerate(focus):
        rid = f"{cid}-r{j}"
        rx = r * iw * (1.12 if mode == "strip" else 1.0)
        ry = min(rx * 0.82, (ih / nlines) * 0.62 + 16) if mode == "strip" else min(rx * 0.6, pw * 0.024)
        rings += _ring_svg(rid, pw, ph, ox + cx * iw, oy + cy * ih, rx, ry)
        if ring_at is not None:
            tw.append(f'    tl.to("#{rid}", {{ strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }}, {round(ring_at + 0.15, 2)});')
    paper = (f'<figure class="rc-paper" data-layout-allow-overflow style="left:{round(left)}px;top:{round(top)}px;width:{pw}px;height:{ph}px">'
             f'{img}<div class="rc-sheen"></div>{shade}{rings}</figure>')
    desk = f"<img class=\"rc-desk\" data-layout-allow-overflow src=\"{DESK}\" alt=\"\" data-color-grading='{_grade(-1.25 + light, 0.55, 0.16, 0.12)}'/>"
    plane = (f'<div class="rc-plane" data-layout-allow-overflow style="transform-origin:{ax}px {ay}px;'
             f'transform:rotateX({lean}deg) rotateZ({tilt}deg)">{desk}{paper}</div>')
    cam = (f'<div id="{cid}-cam" class="rc-cam" data-layout-allow-overflow style="perspective:1900px;perspective-origin:{ax}px {ay - 160}px;'
           f'transform-origin:{ax}px {ay}px">{plane}</div>')
    inner = (cam + '<div class="rc-fall"></div>'
             + (f'<div class="rc-gloss">{s["caption"]}</div>' if s.get("caption") else "")
             + (f'<div class="rc-credit">{s["credit"]}</div>' if s.get("credit") else ""))
    s0, s1 = s.get("push", (1.0, 1.06))
    dx, dy = s.get("drift", (0, 0))
    tw.append(f'    tl.fromTo("#{cid}-cam", {{ scale: {s0}, x: 0, y: 0 }}, '
              f'{{ scale: {s1}, x: {dx}, y: {dy}, duration: {round(t1 - t0, 2)}, ease: "none" }}, {round(t0, 2)});')
    return inner, tw


def _merc(lon, lat, z):
    n = 256 * 2 ** z
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n


def map_px(lon, lat, z, centre, size=(2560, 1440)):
    """Pixel of (lon, lat) on a GSI tile mosaic of zoom z centred on `centre` (lon, lat) — see SOURCES.md for each map."""
    x, y = _merc(lon, lat, z)
    cx, cy = _merc(*centre, z)
    return x - cx + size[0] / 2, y - cy + size[1] / 2


def map_cut(cid, t0, t1, s, ring_at=None):
    """One map cut (cover). Returns (inner markup, tweens).

    s keys: src, size (w, h); zoom (static scale about `origin`, default 1), origin (file px, default centre);
      grade (data-color-grading JSON); push (default (1.0, 1.05)); places [(file_x, file_y, text, small, side)] name plates
      with a hollow node (side "r" / "l" / "t" / "b" = plate side of the node; a 6th item False = plate centred on the point, no node); ring (file_x, file_y, radius_px_on_screen)
      amber ring drawn at ring_at; date (text, small) top-left plate; caption, credit.
    """
    w, h = s["size"]
    k = 1920 / w
    zoom = s.get("zoom", 1.0)
    ox, oy = s.get("origin", (w / 2, h / 2))

    def scr(x, y):  # file px -> frame px after cover fit and the static zoom about origin
        return 960 + (x - ox) * k * zoom, 540 + (y - oy) * k * zoom

    img = f"<img src=\"{s['src']}\" alt=\"\" data-color-grading='{s.get('grade', MAP_GRADE)}'/>"
    mx = ox * k
    my = oy * k
    mapdiv = (f'<div class="rc-map" data-layout-allow-overflow style="transform-origin:{round(mx)}px {round(my)}px;'
              f'transform:translate({round(960 - mx)}px,{round(540 - my)}px) scale({zoom})">{img}</div>')
    marks, tw = [], []
    for j, (x, y, text, small, side, *rest) in enumerate(s.get("places", [])):
        node = rest[0] if rest else True
        X, Y = scr(x, y)
        off = {"r": f"left:{round(X + 30)}px;top:{round(Y)}px;transform:translateY(-50%)",
               "l": f"right:{round(1920 - X + 30)}px;top:{round(Y)}px;transform:translateY(-50%)",
               "t": f"left:{round(X)}px;bottom:{round(1080 - Y + 30)}px;transform:translateX(-50%)",
               "b": f"left:{round(X)}px;top:{round(Y + 30)}px;transform:translateX(-50%)"}[side]
        sm = f"<small>{small}</small>" if small else ""
        dot = f'<div class="rc-node" style="left:{round(X)}px;top:{round(Y)}px"></div>' if node else ""
        if not node:
            off = f"left:{round(X)}px;top:{round(Y)}px;transform:translate(-50%,-50%)"
        marks.append(dot + f'<div class="rc-name" style="{off}">{text}{sm}</div>')
    if s.get("ring"):
        x, y, r = s["ring"]
        X, Y = scr(x, y)
        rid = f"{cid}-r0"
        marks.append(f'<svg class="rc-ring" viewBox="0 0 1920 1080" width="1920" height="1080">'
                     f'<ellipse id="{rid}" cx="{round(X)}" cy="{round(Y)}" rx="{r}" ry="{round(r * 0.9)}" '
                     f'pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/></svg>')
        if ring_at is not None:
            tw.append(f'    tl.to("#{rid}", {{ strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }}, {round(ring_at + 0.15, 2)});')
    fx, fy = scr(*s["push_to"]) if s.get("push_to") else (960, 470)
    cam = (f'<div id="{cid}-cam" class="rc-cam" data-layout-allow-overflow style="transform-origin:{round(fx)}px {round(fy)}px">'
           f'{mapdiv}<div class="rc-fall"></div>{"".join(marks)}</div>')
    date = ""
    if s.get("date"):
        dt, ds = s["date"]
        date = f'<div class="rc-date disp">{dt}<small>{ds}</small></div>'
    inner = (cam + date
             + (f'<div class="rc-gloss">{s["caption"]}</div>' if s.get("caption") else "")
             + (f'<div class="rc-credit">{s["credit"]}</div>' if s.get("credit") else ""))
    s0, s1 = s.get("push", (1.0, 1.05))
    tw.append(f'    tl.fromTo("#{cid}-cam", {{ scale: {s0} }}, {{ scale: {s1}, duration: {round(t1 - t0, 2)}, ease: "none" }}, {round(t0, 2)});')
    return inner, tw


# Pale GSI tiles go flat in mono: darken the blue sea (hue ~220) before the mono fade, lift contrast, so land reads.
MAP_GRADE = json.dumps({
    "adjust": {"exposure": -0.05, "contrast": 0.35, "blacks": -0.15, "saturation": 0},
    "hueCurves": {"hueVsLuma": [[150, 0], [200, -0.45], [225, -0.6], [255, -0.45], [300, 0]],
                  "hueVsSaturation": [[0, -1], [90, -1], [180, -1], [270, -1]]},
    "details": {"vignette": 0.2, "grain": 0.1, "grainSize": 0.22, "grainRoughness": 0.6}}, separators=(",", ":"))


def record_scene(sid, dur, q, shots, label="기록", css="", overlay="", tweens=""):
    """A scene of hard-cut record shots. Each shot dict has `at` (caption index or seconds; the first starts at 0) and
    `kind` "paper" (record_cut) or "map" (map_cut). Rings are drawn at the caption `ring_cue` (default `at`)."""
    def t_of(v):
        return q[v] if isinstance(v, int) else float(v)

    starts = [0.0] + [t_of(s["at"]) - 0.05 for s in shots[1:]]
    ends = starts[1:] + [dur]
    markup, tw = [], []
    for k, (s, t0, t1) in enumerate(zip(shots, starts, ends)):
        ring_at = max(t0, t_of(s.get("ring_cue", s["at"]))) if (s.get("focus") or s.get("ring")) else None
        fn = map_cut if s.get("kind") == "map" else record_cut
        inner, stw = fn(f"{sid}-c{k}", t0, t1, s, ring_at)
        markup.append(clip(f"{sid}-ph{k}", round(t0, 2), t1 - t0, "rc-shot", inner))
        tw += stw
    tag = clip(f"{sid}-tag", 0.3, dur - 0.3, "rc-tag", label)
    script = ("    const tl = gsap.timeline({ paused: true });\n" + "\n".join(tw) + "\n" + tweens +
              f'\n    window.__timelines["{sid}"] = tl;')
    return wrap(sid, dur, RC_CSS + css, "\n".join(["    " + m for m in markup]) + "\n    " + tag + "\n" + overlay, script)


def record_insert(sid, at, dur, src, size, focus=None, caption="", credit="", n=0, mode="strip", hide=None, **look):
    """A ~3 s record cut inside a 3D or diagram scene, in the same desk look as hook/place. Returns (markup, css, tweens).

    Drop-in for scenes_room.strip_insert / scenes_kit.archive_insert: focus = (cx, cy, r) on the file, drawn 0.4 s after the cut.
    look: any record_cut key (lean, tilt, light, push, drift, width, anchor, spot).
    hide: selector of the host scene's own container to switch off under the cut (a real cut, no text left underneath).
    """
    iid = f"{sid}-ins{n}"
    s = {"src": src, "size": size, "mode": mode, "caption": caption, "credit": credit,
         "focus": [focus] if focus else [], "lean": 12, "tilt": -1.5, "light": -0.1, "push": (1.0, 1.05)}
    s.update(look)
    inner, tw = record_cut(iid, at, at + dur, s, ring_at=at + 0.25 if focus else None)
    inner += f'<div class="rc-tag">기록</div>'
    markup = "    " + clip(iid, round(at, 2), dur, "rc-shot rc-ins", inner, extra=" data-layout-allow-overlap")
    if hide:
        tw.append(f'    tl.set("{hide}", {{ opacity: 0 }}, {round(at + 0.02, 2)});')
        tw.append(f'    tl.set("{hide}", {{ opacity: 1 }}, {round(at + dur, 2)});')
    return markup, RC_CSS + "\n    .rc-ins { z-index: 20; }", "\n".join(tw)


# ---------------------------------------------------------------- scenes

def hook(sid, dur, q):
    """Cold open (SHOTS 1): c1 the confession page close on the desk, ring 「燃やしてしまった」 / c2 that line as a slip, flat and
    near / c3 the retrial line 「左袖が現存し」, cooler and from the other side. No verdict."""
    return record_scene(sid, dur, q, [
        {"src": A + "kousai-p16.png", "size": (2481, 3508), "at": 0, "width": 1560,
         "focus": [(0.585, 0.287, 0.10)], "lean": 22, "tilt": -6, "light": 0.0, "push": (1.0, 1.12), "drift": (-10, 6),
         "caption": "1985년 조서의 진술 — 2017년 고법 결정문이 요약한 부분", "credit": KOUSAI},
        {"src": A + "kousai-p16-l6.png", "size": (2651, 122), "mode": "strip", "at": 1, "lean": 6, "tilt": 1.4, "light": 0.05,
         "spot": (960, 400), "push": (1.02, 1.08), "drift": (-40, 0),
         "focus": [(0.57, 0.5, 0.11)], "caption": "「…범행 뒤 목욕 아궁이에서 태워 버린 것이다…」", "credit": KOUSAI},
        {"src": A + "saishin-p3-l5.png", "size": (2653, 264), "mode": "strip", "at": 2, "lean": 26, "tilt": -3.5, "light": -0.35,
         "spot": (960, 520), "push": (1.08, 1.14), "drift": (30, -6),
         "focus": [(0.70, 0.25, 0.11)], "caption": "「셔츠의 왼소매가 현존하고 혈액 부착도 인정되지 않았다」",
         "credit": SAISHIN + " · 재심 개시 결정 요지"},
    ])


# GSI mosaics (SOURCES.md): map-kyushu z9 centre (130.75, 32.60) / map-kumamoto z11 (130.71, 32.70) / map-matsubase z14 (130.671, 32.653)
KUMAMOTO_CITY = (130.7417, 32.8032)  # Kumamoto city hall
KUMAMOTO_PREF = (130.93, 32.58)     # a point inside Kumamoto prefecture (Misato/Yamato area) for the prefecture name plate
MATSUBASE_STN = (130.671, 32.653)   # JR Matsubase station (GSI place-name search, SOURCES.md) — not the case site


def place(sid, dur, q):
    """Date and place (SHOTS 2): c1 Kyushu with the date plate / c2 Kumamoto west, wide amber ring on the old town area /
    c3 today's Uki city close, station node (not the case site) / c4 the retrial page 2 on the desk / c5 its discovery line."""
    ky = lambda p: map_px(*p, 9, (130.75, 32.60))  # noqa: E731
    km = lambda p: map_px(*p, 11, (130.71, 32.70))  # noqa: E731
    ms = lambda p: map_px(*p, 14, (130.671, 32.653))  # noqa: E731
    return record_scene(sid, dur, q, [
        {"kind": "map", "src": A + "map-kyushu.png", "size": (2560, 1440), "at": 0, "zoom": 1.05, "origin": ky(KUMAMOTO_CITY),
         "push": (1.0, 1.07), "push_to": ky(MATSUBASE_STN), "date": ("1985. 1. 8", "오전 9시 30분 무렵"),
         "places": [(*ky(KUMAMOTO_PREF), "구마모토현", "", "r", False)], "credit": GSI},
        {"kind": "map", "src": A + "map-kumamoto.png", "size": (2560, 1440), "at": 1, "zoom": 1.25, "origin": km(MATSUBASE_STN),
         "push": (1.0, 1.06), "push_to": km(MATSUBASE_STN),
         "places": [(*km(KUMAMOTO_CITY), "구마모토시", "", "r")], "ring": (*km(MATSUBASE_STN), 105),
         "caption": "옛 시모마시키군 마쓰바세정 일대", "credit": GSI},
        {"kind": "map", "src": A + "map-matsubase.png", "size": (2560, 1440), "at": 2, "zoom": 1.3, "origin": ms(MATSUBASE_STN),
         "push": (1.0, 1.05), "push_to": ms(MATSUBASE_STN),
         "places": [(*ms(MATSUBASE_STN), "마쓰바세역", "사건 장소 아님", "r")],
         "caption": "지금의 우키시 마쓰바세 일대", "credit": GSI},
        {"src": A + "saishin-p2.png", "size": (2481, 3508), "at": 3, "width": 1300, "lean": 28, "tilt": 5, "light": -0.2,
         "push": (1.0, 1.08), "drift": (12, 10),
         "focus": [(0.775, 0.255, 0.125)], "caption": "재심 판결문 2쪽 — 사건의 발견", "credit": SAISHIN},
        {"src": A + "saishin-p2-l5.png", "size": (2652, 406), "mode": "strip", "at": 4, "lean": 12, "tilt": 2.2, "light": -0.1,
         "push": (1.0, 1.05), "drift": (-24, 0),
         "focus": [(0.845, 0.17, 0.13)],
         "caption": "「1985년 1월 8일 오전 9시 30분경 … 자택 방 안에서 … 발견되었다」", "credit": SAISHIN},
    ])
