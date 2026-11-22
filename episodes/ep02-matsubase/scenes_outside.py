"""Scenes on the outside set (assets/lib/outside.js) — set-builder. night_road.

scenes.py imports these (`from scenes_outside import ...`). Each function: def <id>(sid, dur, q) -> composition HTML.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import scene3d
from scenes_room import ROOM_CSS, _room_label


def cam_keys(shots, end):
    """Like scenes_kit.cam_shots, but each shot carries its own push (5th item; 0 = a locked-off shot).
    Every shot after the first starts on a hard cut (cut: true)."""
    keys = []
    for i, (t, pos, look, fov, push) in enumerate(shots):
        t_end = shots[i + 1][0] - 0.02 if i + 1 < len(shots) else end
        p2 = [round(p + (l - p) * push, 3) for p, l in zip(pos, look)]
        cut = ", cut: true" if i else ""
        keys.append(f"{{ t: {round(t, 2)}, pos: {list(pos)}, look: {list(look)}, fov: {fov}{cut} }}")
        keys.append(f"{{ t: {round(t_end, 2)}, pos: {p2}, look: {list(look)}, fov: {fov}, ease: \"linear\" }}")
    return "[\n      " + ",\n      ".join(keys) + "\n    ]"


def night_road(sid, dur, q):
    """SHOTS 7 (outside/night): no walking camera, no signs, no people; amber = the one sodium lamp.
    c1 W high view over the roofs, the lit building mass far away (toward the station, shape unclear) "1985.1.8" /
    c2 M the street lamp "그날 밤 · 임의 조사 시작" / c3 D the lamp head "밤 11:56까지 · 4시간 26분" /
    c4 W across the road to the left block wall and its cool-lit end "함께 있던 부부 · 말다툼을 경찰에" /
    c5 locked-off W, reverse angle down the empty road back under the sodium lamp "그 · 집에 갔을 뿐".
    Bright area per cut: far lit block, upper left-centre (rest dark) -> sodium lamp upper right + amber road bottom ->
    lamp head and glow, centre -> cool wall end + road, bottom left -> amber road centre, lamp left of centre."""
    cam = cam_keys([
        (0, [2.0, 8.5, -16], [-2.0, 5.5, -150], 34, 0.04),
        (q[1] - 0.05, [-1.8, 1.6, 3], [0.0, 2.8, -9], 40, 0.05),
        (q[2] - 0.05, [0.6, 4.2, -5.2], [1.9, 5.45, -8], 30, 0.06),
        (q[3] - 0.05, [2.0, 1.5, -24], [-3.2, 1.3, -40], 38, 0.04),
        (q[4] - 0.05, [-0.3, 1.25, -21], [1.0, 2.2, 0], 40, 0.0),
    ], dur)
    opts = f'{{ mode: "night", camera: {cam} }}'
    labels = [_room_label(sid, 0, 0.0, q[1] - 0.1, "1985.1.8", right=True),
              _room_label(sid, 1, q[1], q[2] - 0.1, "그날 밤 · 임의 조사 시작"),
              _room_label(sid, 2, q[2], q[3] - 0.1, "밤 11:56까지 · 4시간 26분"),
              _room_label(sid, 3, q[3], q[4] - 0.1, "함께 있던 부부 · 말다툼을 경찰에", right=True),
              _room_label(sid, 4, q[4], dur, "그 · 집에 갔을 뿐")]
    overlay = "\n".join(m for m, _ in labels)
    tweens = "\n".join(t for _, t in labels)
    return scene3d(sid, dur, "outside", "createOutside", opts, overlay, tweens, ROOM_CSS)
