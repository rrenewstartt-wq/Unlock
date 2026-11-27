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
        (q[2] - 0.05, [-2.65, 1.7, 2.15], [0.3, 0.9, -0.45], 44),
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
        set_label(sid, 1, q[1], q[2] - 0.1, "경찰관의 말", "1월 18일 밤"),
        set_label(sid, 2, q[2], q[3] - 0.1, "19일 · 12시간 45분"),
        set_label(sid, 3, q[3], q[4] - 0.1, "그의 요청", "1월 19일"),
        set_label(sid, 4, q[4], q[5] - 0.1, "그의 말", "1월 19일"),
        set_label(sid, 5, q[6], dur, "그날 밤", "1월 19일"),
    ])
    return scene3d(sid, dur, "police", "createPolice", opts, m, t, SET_CSS)


def cam_moves(shots, end, push=0.06):
    """cam_shots with an optional end framing per shot: (t, pos, look, fov[, pos_end[, look_end]]). Shots with an end
    framing move there over the shot (sine ease — a pull-back); the others push `push` toward the look point (linear)."""
    keys = []
    for i, s in enumerate(shots):
        t, pos, look, fov = s[:4]
        t_end = shots[i + 1][0] - 0.02 if i + 1 < len(shots) else end
        if len(s) > 4:
            p2, l2, ez = list(s[4]), list(s[5] if len(s) > 5 else look), ""
        else:
            p2, l2, ez = [round(p + (l - p) * push, 3) for p, l in zip(pos, look)], list(look), ', ease: "linear"'
        cut = ", cut: true" if i else ""
        keys.append(f"{{ t: {round(t, 2)}, pos: {list(pos)}, look: {list(look)}, fov: {fov}{cut} }}")
        keys.append(f"{{ t: {round(t_end, 2)}, pos: {p2}, look: {l2}, fov: {fov}{ez} }}")
    return "[\n      " + ",\n      ".join(keys) + "\n    ]"


KOUSAI_P20 = "후쿠오카고법 결정문(2017) · 20쪽 · 재판소 공개본"


def polygraph(sid, dur, q):
    """SHOTS 11 (police/polygraph, daytime fluorescent, amber = a warm lamp on the pens). The man and the machine are never
    in the same cut: the machine stands on a side table in the south-west corner, behind him.
    c1 W the machine alone (bright: lit chart paper, centre) / c2 W the man seated, 3/4 back, machine off-frame (bright:
    window, top) / c3 D paper roll and pens (bright: paper, centre) / c4 D the pens swinging — symbolic traces (bright:
    paper under the warm lamp) / c5 record cut @c5 [2] p.20 l.12-13 / c6 M papers on the desk (bright: desk top, centre) /
    c7 W his back, pulling back, machine off-frame (bright: window + desk, centre)."""
    from scenes_kit import archive_insert
    ins_at = q[4] - 0.05
    ins_dur = round(min(4.0, max(2.5, q[5] - 0.05 - ins_at)), 2)
    cam = cam_moves([
        (0, [-1.05, 1.5, 1.25], [-2.45, 0.85, 2.1], 42),
        (q[1] - 0.05, [-1.2, 1.6, 2.3], [0.05, 0.9, -0.2], 40),
        (q[2] - 0.05, [-2.1, 1.08, 2.0], [-2.4, 0.86, 2.03], 34),
        (q[3] - 0.05, [-2.27, 0.98, 1.97], [-2.47, 0.865, 2.04], 30),
        (q[4] - 0.05, [-2.27, 0.98, 1.97], [-2.47, 0.865, 2.04], 30),
        (q[5] - 0.05, [1.25, 1.2, -0.3], [0.35, 0.74, -0.62], 36),
        (q[6] - 0.05, [0.4, 1.45, 2.2], [0.0, 0.9, -0.6], 44, [0.6, 1.65, 2.9]),
    ], dur)
    opts = f'{{ mode: "polygraph", camera: {cam} }}'
    im, icss, itw = archive_insert(sid, ins_at, "assets/archive/kousai-p20-l12.png", (2720, 264), dur=ins_dur,
                                   focus=(0.377, 0.25, 0.085), credit=KOUSAI_P20, tilt=0)
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "오전 9:10 ~ 11:37", "1월 18일 · 폴리그래프 검사"),
        set_label(sid, 1, q[1], q[2] - 0.1, "경찰의 요구에 응해", right=True),
        set_label(sid, 2, q[2], q[3] - 0.1, "담당 경찰관", "원 재판 증언"),
        set_label(sid, 3, q[3], ins_at - 0.05, "질문: 범인이 자전거를 버렸다", "경찰관 증언 · 반응했다"),
        set_label(sid, 4, q[5], q[6] - 0.1, "결과와 말이 다르다", "검사 뒤 추궁"),
        set_label(sid, 5, q[6], dur, "그날 진술은 바꾸지 않았다", "1월 18일"),
    ])
    return scene3d(sid, dur, "police", "createPolice", opts, m + "\n" + im, t + "\n" + itw, SET_CSS + icss)


def mikan_table(sid, dur, q):
    """SHOTS 13 (police/insert_mikan: desk inserts only, diffuse daylight — clearly not the fluorescent room of SHOTS 10).
    His own account (2/8 and 2/9 statements, F48~F50), so the tag reads `재현 · 본인 진술`. Amber = the one mikan, then its
    empty place. c1 M daylight desk corner (bright: desk top, left-centre) / c2 D the empty top (bright: top, centre) /
    c3 D desk end + the quoted question (bright: top, right) / c4 D one mikan (bright: the mikan, centre) / c5 D same
    framing, hard cut, the mikan gone / c6 M the stack of statement papers (bright: papers, lower right)."""
    cam = cam_shots([
        (0, [0.95, 1.15, 0.2], [0.1, 0.74, -0.5], 40),
        (q[1] - 0.05, [-0.35, 0.98, 0.05], [-0.05, 0.74, -0.45], 34),
        (q[2] - 0.05, [0.55, 0.86, -0.05], [0.2, 0.75, -0.5], 32),
        (q[3] - 0.05, [0.12, 0.9, -0.12], [-0.08, 0.76, -0.36], 30),
        (q[4] - 0.05, [0.12, 0.9, -0.12], [-0.08, 0.76, -0.36], 30),
        (q[5] - 0.05, [0.75, 1.2, -0.15], [0.4, 0.74, -0.62], 34),
    ], dur)
    opts = f'{{ mode: "insert_mikan", camera: {cam}, cues: {{ mikan: [{round(q[3] - 0.05, 2)}, {round(q[4] - 0.05, 2)}] }} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "그의 진술"),
        set_label(sid, 1, q[1], q[2] - 0.1, "검사 전 · 서너 번"),
        set_label(sid, 2, q[2], q[3] - 0.1, "“귤 먹지 않았느냐”", "경찰관의 질문 · 그의 진술", quote=True),
        set_label(sid, 3, q[3], q[4] - 0.1, "1월 9일 무렵", "조사 때 귤이 나왔다"),
        set_label(sid, 4, q[4], q[5] - 0.1, "화장실에 다녀오니", "귤이 없어졌다"),
        set_label(sid, 5, q[5], dur, "2월 8일 · 9일 조서", "그의 진술"),
    ])
    html = scene3d(sid, dur, "police", "createPolice", opts, m, t, SET_CSS)
    return html.replace(">재현</div>", ">재현 · 본인 진술</div>", 1)


def polygraph_again(sid, dur, q):
    """SHOTS 40 (police/again: the SHOTS 11 room, the machine switched off; amber = the paper roll's curled end).
    The man and the machine are never in the same cut. c1 W his back from the south, low (bright: window, top centre) /
    c2 M the empty desk (bright: desk top, centre) / c3 D the still pens and paper (bright: paper) / c4 M the door side, no
    one (bright: door gap, right) / c5 W high-angle long shot of him from the south-east corner (bright: desk, centre) /
    c6 D the curled end of the chart paper (bright: paper under the warm light)."""
    cam = cam_shots([
        (0, [0.3, 1.25, 2.8], [0.05, 0.95, -0.6], 40),
        (q[1] - 0.05, [1.3, 1.3, 0.9], [0.0, 0.74, -0.55], 38),
        (q[2] - 0.05, [-2.15, 1.05, 1.95], [-2.42, 0.86, 2.03], 32),
        (q[3] - 0.05, [-0.8, 1.5, 0.4], [3.1, 1.0, 2.0], 40),
        (q[4] - 0.05, [2.6, 2.35, 2.6], [0.05, 0.6, -0.1], 40),
        (q[5] - 0.05, [-1.95, 0.95, 2.2], [-2.27, 0.8, 2.05], 32),
    ], dur)
    opts = f'{{ mode: "again", camera: {cam}, cues: {{ empty: [{round(q[1] - 0.05, 2)}, {round(q[4] - 0.05, 2)}] }} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "재판에서 그의 설명"),
        set_label(sid, 1, q[1], q[2] - 0.1, "1월 8일", "장기 친구에게 현장 이야기(증언)"),
        set_label(sid, 2, q[2], q[3] - 0.1, "사진도 봤다", "그의 증언"),
        set_label(sid, 3, q[3], q[4] - 0.1, "자전거 이야기", "경찰의 귓속말(증언)"),
        set_label(sid, 4, q[4], q[5] - 0.1, "1월 10일 무렵부터", "보고 들은 것으로"),
        set_label(sid, 5, q[5], dur, "줄거리를 짜 맞췄다", "그의 증언"),
    ])
    return scene3d(sid, dur, "police", "createPolice", opts, m, t, SET_CSS)
