"""ep02 knife.js scenes — blade_width (SHOTS 36). set-builder.

Set coordinates (assets/lib/knife.js): bench top y = 0; the blade lies flat, back (spine) along +x at z = 0, tip at x = 0,
edge side toward +z, 1 unit = 1 m (the blade is 0.11 long). Top-view cameras use up = -z, so the back is the top edge
and the tip the left end. Gauges follow the caption starts (cues.c). Amber = ONLY the 0.6 cm overflow bar (c6, c7).
Only recorded numbers are drawn (F65 F135~F140 F223); no body, no wound.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import cam_shots, scene3d, archive_insert, clip
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


def knife_insert(sid, dur, q):
    """SHOTS 17 (knife/insert, amber = a warm glint on the slanted tip). One knife on the wooden bench (no cloth, no blood,
    no whetstone). c1 W the whole knife (bright: blade + handle, centre) / c2 D the slanted tip macro (bright: bevel) /
    c3 D top view, one dimension line along the back "약 11cm" (the handle has no number — not in the record) /
    c4 M low, the knife against a blurred workshop (bright: blade, lower centre) / c5 D the wooden handle's grain.
    F61 F66 F65 F72."""
    cam = cam_shots([
        (0, [0.07, 0.2, 0.2], [0.09, 0.0, 0.01], 34),
        (q[1] - 0.05, [-0.03, 0.06, 0.06], [0.015, 0.0, 0.008], 30),
        (q[2] - 0.05, [0.055, 0.2, 0.03], [0.055, 0.0, 0.0], 36),
        (q[3] - 0.05, [-0.12, 0.07, 0.22], [0.08, 0.01, 0.0], 30),
        (q[4] - 0.05, [0.17, 0.06, 0.07], [0.15, 0.007, 0.012], 30),
    ], dur)
    cues = [round(x - 0.05, 2) for x in q]
    opts = f'{{ mode: "insert", camera: {cam}, cues: {{ c: {cues} }} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "기리다시 고가타나", "그가 낸 칼"),
        set_label(sid, 1, q[1], q[2] - 0.1, "끝이 비스듬한 작은 칼", right=True),
        set_label(sid, 2, q[2], q[3] - 0.1, "날 길이", "공소사실 · 자루 길이는 기록 없음"),
        set_label(sid, 3, q[3], q[4] - 0.1, "그의 집 2층 작업장", "그곳에 있던 칼"),
        set_label(sid, 4, q[4], dur, "나무 자루"),
    ])
    return scene3d(sid, dur, "knife", "createKnife", opts, m, t, SET_CSS)


def _join(labels):
    return "\n".join(m for m, _ in labels), "\n".join(t for _, t in labels)


QB_CSS = """
    .qb { position: absolute; left: 200px; top: 300px; width: 1520px; padding: 58px 80px 64px; background: rgba(14,15,17,.9);
      border-left: 10px solid #E9E5DD; color: #F3F0EA; box-shadow: 0 30px 80px rgba(0,0,0,.55); }
    .qb small { display: block; font-size: 40px; color: rgba(243,240,234,.8); }
    .qb b { display: block; font-family: "Black Han Sans", sans-serif; font-weight: 400; font-size: 96px; line-height: 1.2; margin-top: 26px; }
    .qb.amber { border-left-color: #F0A23B; }"""


def _board(sid, n, t0, t1, head, body, amber=False):
    """Quote / name board in front of the 3D set (the set behind goes soft and dark while it is up)."""
    bid = f"{sid}-qb{n}"
    markup = "    " + clip(bid, round(t0, 2), round(t1 - t0, 2), "qb" + (" amber" if amber else ""), f"<small>{head}</small><b>{body}</b>")
    tw = (f'    tl.fromTo("#{bid}", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }}, {round(t0 + 0.05, 2)});\n'
          f'    tl.set("#{sid}-stage", {{ filter: "blur(14px) brightness(0.45)" }}, {round(t0, 2)});\n'
          f'    tl.set("#{sid}-stage", {{ filter: "blur(0px) brightness(1)" }}, {round(t1, 2)});')
    return markup, tw


def handle_wood(sid, dur, q):
    """SHOTS 34 (knife/handle, evening light, amber = a warm pool on the handle). The knife in 4 cuts (c1 c2 c4 c7); c3 c5 c6
    are boards in front of the softened set. c1 W the knife on the bench, low evening light (bright: handle, centre) /
    c2 D handle grain macro / c3 board: his testimony "물이나 피를 잘 빨아들인다" / c4 M the whole knife from above (bright:
    handle) + label "자루: 혈액 확인 안 됨" / c5 board: the high court's sentence (F129) / c6 board: what it was said about
    (the cloth story) / c7 D the tip side, the question. F127 F72 F129."""
    cam = cam_shots([
        (0, [0.3, 0.16, 0.24], [0.1, 0.0, 0.01], 34),
        (q[1] - 0.05, [0.12, 0.045, 0.06], [0.15, 0.007, 0.012], 30),
        (q[2] - 0.05, [0.2, 0.12, 0.16], [0.12, 0.0, 0.01], 34),
        (q[3] - 0.05, [0.1, 0.25, 0.12], [0.1, 0.0, 0.01], 34),
        (q[4] - 0.05, [0.24, 0.1, -0.12], [0.1, 0.0, 0.01], 34),
        (q[5] - 0.05, [0.24, 0.1, -0.12], [0.1, 0.0, 0.01], 34),
        (q[6] - 0.05, [-0.05, 0.06, 0.07], [0.02, 0.0, 0.008], 30),
    ], dur)
    opts = f'{{ mode: "handle", camera: {cam} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "그의 증언: 칼자루"),
        set_label(sid, 1, q[1], q[2] - 0.1, "후박나무 · 구멍이 많다", "그의 증언 (원 재판)"),
        _board(sid, 0, q[2] - 0.05, q[3] - 0.05, "그의 증언 · 원 재판", "“물이나 피를<br>잘 빨아들인다”"),
        set_label(sid, 2, q[3], q[4] - 0.1, "자루: 혈액 확인 안 됨", "나무 자루 포함"),
        _board(sid, 1, q[4] - 0.05, q[5] - 0.05, "후쿠오카고법 결정문(2017) · 19쪽",
               "수사관에게 맞춘,<br>사실과 다른 진술일 가능성"),
        _board(sid, 2, q[5] - 0.05, q[6] - 0.05, "고법 (2017) · 천 이야기를 두고", "부정하지 못한 가능성", amber=True),
        set_label(sid, 3, q[6], dur, "이 칼은 정말 흉기였을까"),
    ])
    return scene3d(sid, dur, "knife", "createKnife", opts, m, t, SET_CSS + QB_CSS)
