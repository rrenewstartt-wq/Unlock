"""ep02 knife.js scenes — blade_width (SHOTS 36). set-builder.

Set coordinates (assets/lib/knife.js): bench top y = 0; the blade lies flat, back (spine) along +x at z = 0, tip at x = 0,
edge side toward +z, 1 unit = 1 m (the blade is 0.11 long). Top-view cameras use up = -z, so the back is the top edge
and the tip the left end. Gauges follow the caption starts (cues.c). Amber = ONLY the 0.6 cm overflow bar (c6, c7).
Only recorded numbers are drawn (F65 F135~F140 F223); no body, no wound.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import cam_shots, scene3d, archive_insert
from scenes_police import set_label, SET_CSS

KOUSAI_K = "후쿠오카고법 결정문(2017) · 감정 요지"


def blade_width(sid, dur, q):
    """SHOTS 36. Bright area per cut (steel reflections move with the angle):
    c1 D tip + the 1.5 cm entrance gauge beside it (bright: blade, lower right) / c2 D 4.7 cm along the back (bright: centre
    band) / c3 M the 1.5 gauge across the blade at 4.7 (bright: right, handle) / c4 record cut @c4 [2] p.9 l.21-22 /
    c5 D the gauge slides to 3.2 where it fits (bright: right half) / c6 D at 4.7: 1.5 ink + 0.6 amber overflow, 2.1 beside
    (bright: blade fills the frame) / c7 M the whole knife + quote (bright: blade + handle, centre)."""
    ins_at = q[3] - 0.05
    ins_dur = round(min(4.0, max(2.5, q[4] - 0.05 - ins_at)), 2)
    cam = cam_shots([
        (0, [0.013, 0.13, 0.03], [0.013, 0.0, 0.0], 30),
        (q[1] - 0.05, [0.026, 0.16, 0.04], [0.026, 0.0, 0.002], 30),
        (q[2] - 0.05, [0.04, 0.2, 0.07], [0.045, 0.0, 0.008], 30),
        (q[3] - 0.05, [0.04, 0.2, 0.07], [0.045, 0.0, 0.008], 30),
        (q[4] - 0.05, [0.035, 0.12, 0.04], [0.038, 0.0, 0.008], 30),
        (q[5] - 0.05, [0.05, 0.09, 0.03], [0.05, 0.0, 0.01], 30),
        (q[6] - 0.05, [0.09, 0.24, 0.13], [0.085, 0.0, 0.012], 32),
    ], dur)
    cues = [round(x - 0.05, 2) for x in q]
    opts = f'{{ mode: "blade_macro", camera: {cam}, cues: {{ c: {cues} }} }}'
    im, icss, itw = archive_insert(sid, ins_at, "assets/archive/kousai-p9-l21.png", (2728, 264), dur=ins_dur,
                                   focus=(0.085, 0.75, 0.06), credit=KOUSAI_K, tilt=0)
    labels = [
        set_label(sid, 0, 0.3, q[1] - 0.1, "입구 약 1.5cm", "상처 하나"),
        set_label(sid, 1, q[1], q[2] - 0.1, "깊이 약 4.7cm"),
        set_label(sid, 2, q[2], ins_at - 0.05, "이 지점 폭 ≤ 1.5cm 여야", "상처대로라면"),
        set_label(sid, 3, q[4], q[5] - 0.1, "폭 1.5cm는 여기", "끝에서 약 3.2cm", right=True),
        set_label(sid, 4, q[5], q[6] - 0.1, "입구가 0.6cm 좁다", "4.7cm 지점 날 폭 2.1cm", right=True),
        set_label(sid, 5, q[6], dur, "“미묘한 차이라 할 수 없다”", "후쿠오카고법 (2017)", quote=True),
    ]
    m = "\n".join(x for x, _ in labels) + "\n" + im
    t = "\n".join(x for _, x in labels) + "\n" + itw
    return scene3d(sid, dur, "knife", "createKnife", opts, m, t, SET_CSS + icss)
