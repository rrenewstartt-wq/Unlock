"""ep02 police.js scenes — interrogation (SHOTS 10), arrest_wish (SHOTS 14). set-builder.

Set coordinates (assets/lib/police.js): floor y=0, room x ∈ [-2.8, 3.1] (east +x), z ∈ [-2.2, 3.0] (south +z), ceiling 2.6.
Desk at (0, -0.6), top y = 0.74; the man seated at (0.05, 0.12) facing north (-z); the officer's chair (always empty) at
(-0.1, -1.5); desk stand (amber) at (-0.5, -0.82); papers at (0.42, -0.6); frosted window in the north wall; door ajar
in the east wall (z 1.6~2.5). Night: only the WEST fluorescent row (x = -1.6) is on and washes the west wall.
Every cut is a hard cut (cam_shots). The man is only in wide shots, 3 m or more away, back / 3/4 back / full silhouette.

Shared with scenes_vault.py / scenes_knife.py: set_label (name label = dark plate + 8 px band) and SET_CSS.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import clip, cam_shots, scene3d

SET_CSS = """
    .slabel { position: absolute; left: 96px; top: 150px; padding: 16px 30px 18px 30px; background: rgba(16,18,21,.76);
      border-left: 8px solid #E9E5DD; font-size: 46px; line-height: 1.15; color: #F3F0EA; max-width: 1100px; }
    .slabel small { display: block; font-family: "Gothic A1", sans-serif; font-size: 34px; margin-top: 8px; color: rgba(243,240,234,.9); }
    .slabel.quote { font-family: "Gothic A1", sans-serif; font-size: 42px; line-height: 1.3; }
    .slabel.quote small { font-size: 30px; color: rgba(243,240,234,.82); }
    .slabel.amber { border-left-color: #F0A23B; }
    .slabel.right { left: auto; right: 96px; }"""


def set_label(sid, n, t0, t1, text, small="", amber=False, right=False, quote=False):
    """Name label (or quoted line) from t0 to t1 — cut in with the shot, short fade out. Returns (markup, tweens)."""
    lid = f"{sid}-lb{n}"
    cls = "slabel" + ("" if quote else " disp") + (" quote" if quote else "") + (" amber" if amber else "") + (" right" if right else "")
    inner = text + (f"<small>{small}</small>" if small else "")
    markup = "    " + clip(lid, round(t0, 2), t1 - t0, cls, inner)
    tweens = (f'    tl.fromTo("#{lid}", {{ opacity: 0, x: -24 }}, {{ opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }}, {round(t0 + 0.05, 2)});\n'
              f'    tl.to("#{lid}", {{ opacity: 0, duration: 0.3, ease: "power2.in" }}, {round(t1 - 0.35, 2)});')
    return markup, tweens


def _join(labels):
    return "\n".join(m for m, _ in labels), "\n".join(t for _, t in labels)


def interrogation(sid, dur, q):
    """SHOTS 10 (police/interrogation, daytime fluorescent, amber = desk stand).
    c1 W the man seated, back view, about 3.5 m, window beyond — bright: frosted window, top centre-right
    c2 M the empty chair (he is hidden: the three days at home) — bright: lit desk edge + floor, lower left
    c3 W 3/4 back from the south-west, "1월 18일" — bright: window top left, lit desk
    c4 D the papers on the desk under the stand, "13시간 42분" — bright: paper stack centre
    c5 M through the open door: a brushed-metal case corner in the next room — bright: door gap right."""
    cam = cam_shots([
        (0, [1.9, 1.6, 3.0], [-0.15, 0.85, -0.7], 46),
        (q[1] - 0.05, [-1.6, 1.0, 1.6], [0.05, 0.5, 0.2], 40),
        (q[2] - 0.05, [-2.4, 1.7, 2.6], [0.3, 0.9, -0.5], 44),
        (q[3] - 0.05, [0.62, 1.38, -0.12], [0.36, 0.74, -0.66], 36),
        (q[4] - 0.05, [0.6, 1.3, 0.9], [3.1, 1.0, 2.05], 38),
    ], dur)
    opts = f'{{ mode: "interrogation", camera: {cam}, cues: {{ empty: [{round(q[1] - 0.05, 2)}, {round(q[2] - 0.05, 2)}] }} }}'
    m, t = _join([
        set_label(sid, 0, q[1], q[2] - 0.1, "1월 15~17일", "“집에 있어 달라”"),
        set_label(sid, 1, q[2], q[3] - 0.1, "1월 18일", right=True),
        set_label(sid, 2, q[3], q[4] - 0.1, "13시간 42분", "1월 18일 조사 시간"),
    ])
    return scene3d(sid, dur, "police", "createPolice", opts, m, t, SET_CSS)


def arrest_wish(sid, dur, q):
    """SHOTS 14 (police/night: one fluorescent row, amber = desk stand). The man stays seated and still.
    Bright area per cut (moves every cut): c1 the lit row + west wall, top left / c2 lamp pool on the desk + west wall, left /
    c3 the stand, lower right (dark north wall) / c4 the papers, centre (top-down) / c5 full back-light silhouette in profile
    against the washed west wall, centre-right / c6 the lit tube's end, top edge / c7 the papers, bottom."""
    cam = cam_shots([
        (0, [0.9, 1.35, 3.0], [-0.6, 1.35, -1.0], 50),
        (q[1] - 0.05, [1.3, 1.2, -0.2], [-0.5, 0.6, -1.6], 40),
        (q[2] - 0.05, [-1.3, 1.25, 0.3], [-0.4, 0.95, -1.7], 40),
        (q[3] - 0.05, [0.5, 1.75, -0.95], [0.4, 0.74, -0.62], 36),
        (q[4] - 0.05, [3.0, 1.0, 0.25], [-1.0, 0.9, -0.45], 42),
        (q[5] - 0.05, [-0.4, 1.5, 1.9], [-1.6, 2.2, 0.6], 44),
        (q[6] - 0.05, [1.35, 1.2, -0.75], [0.45, 0.72, -0.8], 34),
    ], dur)
    opts = f'{{ mode: "night", camera: {cam} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "1월 18일 밤 · 경찰관"),
        set_label(sid, 1, q[1], q[2] - 0.1, "“죽였다는 이야기를 한다고 한 줄 알았는데”", "1월 18일 밤 · 경찰관", quote=True),
        set_label(sid, 2, q[2], q[3] - 0.1, "19일 · 12시간 45분"),
        set_label(sid, 3, q[3], q[4] - 0.1, "“부인한 채로 체포해 달라”", "19일 · 그의 말", quote=True),
        set_label(sid, 4, q[4], q[5] - 0.1, "“체포되면 놀랄 만큼 술술”", quote=True),
        set_label(sid, 5, q[6], dur, "“저는 이제 견딜 수 없습니다”", "19일 밤", quote=True),
    ])
    return scene3d(sid, dur, "police", "createPolice", opts, m, t, SET_CSS)
