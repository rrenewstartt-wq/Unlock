"""Scenes on the room set (assets/lib/room.js) — set-builder. room_morning, empty_room, rewind_party.

scenes.py imports these (`from scenes_room import ...`). Each function: def <id>(sid, dur, q) -> composition HTML.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import clip, scene3d, cam_shots, archive_insert

# ---------------------------------------------------------------- room.js (피해자 집 방) — set-builder
# Room coordinates (assets/lib/room.js): floor y=0, x ∈ [-2.25, 2.25] (east +x = window wall), z ∈ [-1.8, 1.8] (south +z),
# kotatsu at the origin, top y=0.42, net of 19 mikan at the top's south-east corner (0.2, 0.22), peel at (-0.12, 0.15).
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
    c4 M kotatsu + label. Bright area (measured at the cuts): c1 window upper right / c2 sunlit net + lit wall, centre /
    c3 window top right, amber peel centre / c4 sunlit kotatsu top + floor patch, lower centre-left."""
    cam = cam_shots([
        (0, [-1.95, 1.3, 1.55], [0.55, 0.56, -0.3], 50),
        (q[1] - 0.05, [0.78, 0.8, -0.32], [0.24, 0.5, 0.28], 34),
        (q[2] - 0.05, [-0.58, 0.56, 0.52], [-0.04, 0.45, 0.15], 38),
        (q[3] - 0.05, [1.55, 1.3, -1.5], [-0.15, 0.32, 0.25], 44),
    ], dur)
    opts = f'{{ mode: "morning", camera: {cam} }}'
    lm, lt = _room_label(sid, 0, q[3], dur, "숨진 날 · 1월 6일 무렵", "재심 판결의 인정")
    return scene3d(sid, dur, "room", "createRoom", opts, lm, lt, ROOM_CSS)


def empty_room(sid, dur, q):
    """SHOTS 4 (room/still, cooled afternoon light, no amber in the set): c1 W threshold-height empty room /
    c2 M window side "목격자 없음" / c3 D empty tatami "다른 증거 없음" / c4 M kotatsu front, amber label "자백 하나" /
    c5 record cut @c5 to the scene end (about 3.8 s, inside 2.5~4 s): [1] p.2 l.16-17 paper strip (saishin-p2-l16)."""
    cam = cam_shots([
        (0, [-2.34, 0.3, -1.0], [1.2, 0.62, 0.3], 50),
        (q[1] - 0.05, [0.35, 1.25, 1.5], [2.25, 1.2, -0.05], 40),
        (q[2] - 0.05, [-0.55, 1.15, 0.2], [-1.35, 0.0, -1.0], 40),
        (q[3] - 0.05, [0.0, 0.95, 1.68], [0.0, 0.36, 0.0], 44),
    ], dur)
    opts = f'{{ mode: "still", camera: {cam} }}'
    ins_at = q[4] - 0.05
    labels = [_room_label(sid, 0, q[1], q[2] - 0.1, "목격자 없음"),
              _room_label(sid, 1, q[2], q[3] - 0.1, "다른 증거 없음"),
              _room_label(sid, 2, q[3], ins_at, "자백 하나", amber=True)]
    im, icss, itw = archive_insert(sid, ins_at, "assets/archive/saishin-p2-l16.png", (2653, 264), dur=round(min(4.0, dur - ins_at), 2),
                                   focus=(0.345, 0.3, 0.12), credit="구마모토지법 재심 판결(2019) · 사건 경위", tilt=0)
    overlay = "\n".join(m for m, _ in labels) + "\n" + im
    tweens = "\n".join(t for _, t in labels) + "\n" + itw
    return scene3d(sid, dur, "room", "createRoom", opts, overlay, tweens, ROOM_CSS + icss)


def rewind_party(sid, dur, q):
    """SHOTS 6 (room/night, kotatsu top empty, amber = the bulb). c1 opens on the morning room and dissolves to night
    in 0.6 s. Bright area per cut (measured): lamp pool on the kotatsu, centre-bottom -> bulb upper right -> shade fills
    the centre -> kotatsu top + lit wall right, dark doorway left of centre -> bulb upper right, dark window centre ->
    lit tatami strip along the bottom."""
    cam = cam_shots([
        (0, [-1.95, 1.3, 1.55], [0.55, 0.56, -0.3], 50),
        (q[1] - 0.05, [-1.4, 0.8, -1.3], [0.6, 1.2, -0.45], 50),
        (q[2] - 0.05, [0.5, 1.5, 0.45], [0.0, 1.88, 0.0], 40),
        (q[3] - 0.05, [1.9, 1.0, 1.3], [-2.25, 0.62, -1.75], 44),
        (q[4] - 0.05, [-1.9, 1.2, -0.9], [0.4, 1.55, -0.55], 42),
        (q[5] - 0.05, [-2.05, 0.1, 1.25], [0.6, 0.18, -0.35], 40),
    ], dur)
    opts = f'{{ mode: "night", camera: {cam}, cues: {{ dissolve: 0.6 }} }}'
    labels = [_room_label(sid, 0, 0.0, q[1] - 0.1, "◀◀ 사흘 전"),
              _room_label(sid, 1, q[1], q[2] - 0.1, "1985.1.5 밤"),
              _room_label(sid, 2, q[2], q[3] - 0.1, "넷 · 장기 친구"),
              _room_label(sid, 3, q[3], q[4] - 0.1, "한 친구 집 → 피해자 집", right=True),
              _room_label(sid, 4, q[4], q[5] - 0.1, "공소장 · 밤 11:30 무렵"),
              _room_label(sid, 5, q[5], dur, "말다툼")]
    overlay = "\n".join(m for m, _ in labels)
    tweens = "\n".join(t for _, t in labels)
    return scene3d(sid, dur, "room", "createRoom", opts, overlay, tweens, ROOM_CSS)
