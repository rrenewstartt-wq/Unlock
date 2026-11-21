"""징역 13년이 확정됐던 일본 남자, 34년 만에 무죄｜마쓰바세 사건 — scene bodies. Shared helpers come from scenes_kit.py.

One function per @scene id in data/script.txt: def <id>(sid, dur, q) -> HTML (q[i] = local start of caption i).
Ids without a function yet fall back to `placeholder`, so the build always works; replace each one.
Rules: ../../docs/visual-style.md (look and diagram rules), SPEC.md.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import wrap, clip


def placeholder(sid, dur, q):
    markup = f"""    {clip(sid + '-ph', 0, dur, 'ph', '<b class="disp">' + sid + '</b><span>장면을 만들어 주세요</span>')}"""
    css = """    .ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ph b { font-size: 120px; font-weight: 400; color: #F0A23B; } .ph span { font-size: 40px; margin-top: 16px; }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#{sid}-ph b", {{ opacity: 0.4 }}, {{ opacity: 1, duration: 0.4 }}, 0);
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)


def __getattr__(name):  # any scene id without its own function yet
    return placeholder


# ---------------------------------------------------------------- room.js (피해자 집 방) — set-builder
# Room coordinates (assets/lib/room.js): floor y=0, x ∈ [-2.25, 2.25] (east +x = window wall), z ∈ [-1.8, 1.8] (south +z),
# kotatsu at the origin, top y=0.42, net of 19 mikan at the top's south-east corner (0.27, 0.27), peel at (-0.06, 0.17).
# Every cut is a hard cut (cam_shots: cut: true) and the bright area (window / sun patch / bulb) moves between neighbours.

ROOM_CSS = """
    .rlabel { position: absolute; left: 96px; top: 150px; padding: 16px 30px 18px 30px; background: rgba(16,18,21,.74);
      border-left: 8px solid #E9E5DD; font-size: 46px; line-height: 1.15; color: #F3F0EA; }
    .rlabel small { display: block; font-family: "Gothic A1", sans-serif; font-size: 34px; margin-top: 8px; color: rgba(243,240,234,.9); }
    .rlabel.amber { border-left-color: #F0A23B; }
    .rlabel.right { left: auto; right: 96px; }"""


def _room_label(sid, n, t0, t1, text, small="", amber=False, right=False):
    """Name label (dark plate + 8 px band) shown from t0 to t1; returns (markup, tweens)."""
    lid = f"{sid}-lb{n}"
    cls = "rlabel disp" + (" amber" if amber else "") + (" right" if right else "")
    inner = text + (f"<small>{small}</small>" if small else "")
    markup = "    " + clip(lid, round(t0, 2), t1 - t0, cls, inner)
    tweens = (f'    tl.fromTo("#{lid}", {{ opacity: 0, x: -24 }}, {{ opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }}, {round(t0 + 0.05, 2)});\n'
              f'    tl.to("#{lid}", {{ opacity: 0, duration: 0.3, ease: "power2.in" }}, {round(t1 - 0.35, 2)});')
    return markup, tweens


def room_morning(sid, dur, q):
    """SHOTS 3: c1 W room, winter-morning window light / c2 D the net of 19 mikan (cool) / c3 D low, amber on the peel /
    c4 M kotatsu + label. Bright area: c1 window right + sun patch centre floor / c2 lit net lower-centre, dark wall behind /
    c3 window blown out upper-centre behind the peel / c4 sun patch on the left half, window off-frame right."""
    cam = cam_shots([
        (0, [-1.95, 1.3, 1.55], [0.55, 0.56, -0.3], 50),
        (q[1] - 0.05, [0.78, 0.8, -0.32], [0.24, 0.5, 0.28], 34),
        (q[2] - 0.05, [-0.58, 0.56, 0.52], [-0.04, 0.45, 0.15], 38),
        (q[3] - 0.05, [1.55, 1.3, -1.5], [-0.15, 0.32, 0.25], 44),
    ], dur)
    opts = f'{{ mode: "morning", camera: {cam} }}'
    lm, lt = _room_label(sid, 0, q[3], dur, "숨진 날 · 1월 6일 무렵", "재심 판결의 인정")
    return scene3d(sid, dur, "room", "createRoom", opts, lm, lt, ROOM_CSS)


def sfx_events(DATA):
    """(bundled sfx name, absolute hit time s, volume). One whoosh per scene cut by default."""
    return [("whoosh-short" if i % 2 else "whoosh", s["start"] + 0.05, 0.35) for i, s in enumerate(DATA["scenes"][1:])]
