"""ep02 vault.js scenes — vault_open (SHOTS 27), five_pieces (SHOTS 28). set-builder.

Set coordinates (assets/lib/vault.js): reading table top y = 0.74 centred at the origin (1.8 x 0.9), camera side +z.
open: open box at (-0.32, 0.02), lid at (0.42, 0.12), paper tag on the box front, two back-lit standing onlookers at
z ≈ -1.1 (3 m+ from every camera that shows them). pieces: shirt hem at z = +0.36, collar toward -z, the wearer's left
sleeve at +x ≈ 0.3~0.7. The cloth is one material for all five pieces (assets/lib/cloth.js); only the light differs.
No record photo of the place is usable (SOURCES.md R6 보류), so vault_open c2 stays 3D.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import cam_shots, scene3d, archive_insert, clip
from scenes_police import set_label, SET_CSS, cam_moves

KOUSAI_NEW = "후쿠오카고법 결정문(2017) · 새 증거"


def _join(labels):
    return "\n".join(m for m, _ in labels), "\n".join(t for _, t in labels)


def vault_open(sid, dur, q):
    """SHOTS 27 (vault/open, amber = the cloth inside the box). Bright area per cut:
    c1 W back wall wash behind two back-lit standing figures, centre / c2 M box under the table light, left /
    c3 M into the open box, amber cloth, centre-left / c4 D the paper tag, lower centre / c5 M the lid, right /
    c6 D box corner against the dark, left / c7 W from the south-west, figures back-lit, wash centre-right."""
    cam = cam_shots([
        (0, [1.15, 1.6, 4.4], [-0.2, 0.95, 0.15], 37),
        (q[1] - 0.05, [1.25, 0.98, 0.25], [-0.35, 0.86, 0.15], 36),
        (q[2] - 0.05, [-0.18, 1.42, 0.42], [-0.32, 0.76, 0.0], 38),
        (q[3] - 0.05, [0.22, 0.9, 0.12], [-0.11, 0.83, 0.02], 30),
        (q[4] - 0.05, [0.75, 1.35, 0.75], [0.42, 0.74, 0.1], 36),
        (q[5] - 0.05, [-0.95, 0.9, 0.5], [-0.5, 0.86, 0.12], 32),
        (q[6] - 0.05, [-2.3, 1.45, 3.7], [0.0, 0.95, 0.2], 38),
    ], dur)
    opts = f'{{ mode: "open", camera: {cam} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "재심을 준비하던 변호인단"),
        set_label(sid, 1, q[3], q[4] - 0.1, "원래 재판에 나온 적 없는 천"),
        set_label(sid, 2, q[4], q[5] - 0.1, "2012. 3. 12", "후견인이 재심 청구"),
        set_label(sid, 3, q[5], q[6] - 0.1, "확정 22년 만"),
        set_label(sid, 4, q[6], dur, "이후 판단: 2017 후쿠오카고법", right=True),
    ])
    return scene3d(sid, dur, "vault", "createVault", opts, m, t, SET_CSS)


def five_pieces(sid, dur, q):
    """SHOTS 28 (vault/pieces, amber = the left sleeve, light only). c1 top-view W: the five pieces come down one by one into a
    shirt outline (bright: table + cloth, centre) / c2 record cut @c2 [2] p.15 l.16-17 「ほぼ完全な形で…」 (paper strip on the board) /
    c3 D check macro on a body piece (bright: cloth fills the frame, lower left) / c4 M the left sleeve alone in a warm light, the
    rest dimmer (bright: right) / c5 D left-sleeve macro: same cloth, folds, weave, loose threads at the tear (bright: frame-wide
    warm cloth, upper area dark table) / c6 top-view W the whole shirt, the sleeve still lit."""
    drops = [round(0.25 + i * 0.45, 2) for i in range(5)]
    ins_at = q[1] - 0.05
    ins_dur = round(min(4.0, max(2.5, q[2] - 0.05 - ins_at)), 2)
    cam = cam_shots([
        (0, [0.0, 2.65, 0.06], [0.0, 0.74, 0.0], 40),
        (q[1] - 0.05, [-0.2, 0.98, 0.6], [-0.12, 0.74, 0.22], 32),
        (q[2] - 0.05, [-0.2, 0.98, 0.6], [-0.12, 0.74, 0.22], 32),
        (q[3] - 0.05, [0.95, 1.35, 0.75], [0.42, 0.74, -0.08], 36),
        (q[4] - 0.05, [0.5, 0.88, -0.04], [0.36, 0.745, -0.21], 30),
        (q[5] - 0.05, [0.12, 2.5, 0.25], [0.12, 0.74, -0.02], 40),
    ], dur)
    opts = (f'{{ mode: "pieces", camera: {cam}, cues: {{ drops: {drops}, sleeve: {round(q[3] - 0.05, 2)} }} }}')
    im, icss, itw = archive_insert(sid, ins_at, "assets/archive/kousai-p15-l16.png", (2650, 264), dur=ins_dur,
                                   focus=(0.88, 0.26, 0.09), credit=KOUSAI_NEW, tilt=0)
    m, t = _join([
        set_label(sid, 0, q[2], q[3] - 0.1, "빨강 · 갈색 · 흰색 체크", "결정문 15쪽 8행"),
        set_label(sid, 1, q[3], q[4] - 0.1, "왼쪽 소매", right=True),
        set_label(sid, 2, q[4], q[5] - 0.1, "같은 천", "결정문 15쪽 13~14행", right=True),
        set_label(sid, 3, q[5], dur, "조서: “태웠다”"),
    ])
    return scene3d(sid, dur, "vault", "createVault", opts, m + "\n" + im, t + "\n" + itw, SET_CSS + icss)


KOUSAI_SUM = "후쿠오카고법 결정문(2017) · 조서 요약 부분 · 재판소 공개본"


def golf_wear(sid, dur, q):
    """SHOTS 39 (vault/golf, amber = the fingertip-size gauge only). The garment's cut is not recorded: a folded grey knit
    bundle with a paper tag; no stain is drawn. c1 W the bundle + tag on the table (bright: table + bundle, centre) /
    c2 D the tag (bright: tag, right) / c3 M the cloth from the other side (bright: cloth top, centre) / c4 D the dotted
    fingertip-size circle on the EMPTY table beside it (bright: table, centre) / c5 M bundle and gauge (bright: centre-left)
    / c6 W pull back (bright: the lit table in the dark, centre). F150~F154."""
    cam = cam_moves([
        (0, [0.55, 1.35, 1.25], [-0.1, 0.78, 0.0], 38),
        (q[1] - 0.05, [0.16, 0.95, 0.42], [0.06, 0.745, 0.21], 30),
        (q[2] - 0.05, [-0.75, 1.05, 0.6], [-0.2, 0.79, 0.02], 36),
        (q[3] - 0.05, [0.21, 0.88, 0.25], [0.1, 0.745, 0.05], 30),
        (q[4] - 0.05, [0.75, 1.1, 0.55], [-0.08, 0.76, 0.02], 34),
        (q[5] - 0.05, [-0.25, 1.75, 2.1], [-0.05, 0.74, 0.0], 38, [-0.3, 2.15, 3.0]),
    ], dur)
    opts = f'{{ mode: "golf", camera: {cam}, cues: {{ gauge: {round(q[3] - 0.05, 2)} }} }}'
    m, t = _join([
        set_label(sid, 0, 0.3, q[1] - 0.1, "검찰이 내놓은 물건"),
        set_label(sid, 1, q[1], q[2] - 0.1, "1월 9일 압수", "그의 회색 골프웨어", right=True),
        set_label(sid, 2, q[2], q[3] - 0.1, "혈흔 예비 검사 · 양성 부분", "검찰 주장"),
        set_label(sid, 3, q[3], q[4] - 0.1, "손가락 끝만 한 아주 적은 양", "결정문 9쪽", amber=True),
        set_label(sid, 4, q[4], q[5] - 0.1, "혈액형 검사 안 함"),
        set_label(sid, 5, q[5], dur, "고법: 사건과 관련 인정 안 됨", "후쿠오카고법 (2017)"),
    ])
    return scene3d(sid, dur, "vault", "createVault", opts, m, t, SET_CSS)


def ending(sid, dur, q):
    """SHOTS 52 (vault/ending, amber = the left sleeve, light only). The shirt already laid out; close → wide pull-back.
    c1 D left-sleeve macro from the shoulder side (bright: warm cloth, centre) / c2 M sleeve + paper tag (bright: sleeve,
    left) / c3 D the check in low light (table light dimmed) / c4 D light on the body cloth, no stain (bright: centre) /
    c5 W top view, the whole shirt (bright: table, centre) / c6 record cut @c6 [2] p.16 l.6 / c7 W pull back to the end,
    the sleeve alone warm → title card. F207 F111 F114 F01 F117."""
    ins_at = q[5] - 0.05
    ins_dur = round(min(4.0, max(2.5, q[6] - 0.05 - ins_at)), 2)
    cam = cam_moves([
        (0, [0.62, 0.9, -0.32], [0.42, 0.745, -0.2], 30),
        (q[1] - 0.05, [1.0, 1.15, 0.6], [0.6, 0.74, 0.0], 34),
        (q[2] - 0.05, [-0.22, 0.95, 0.55], [-0.1, 0.74, 0.2], 30),
        (q[3] - 0.05, [0.12, 1.0, 0.05], [0.0, 0.745, -0.2], 30),
        (q[4] - 0.05, [0.0, 2.5, 0.3], [0.0, 0.74, -0.02], 40),
        (q[5] - 0.05, [0.0, 2.5, 0.3], [0.0, 0.74, -0.02], 40),
        (q[6] - 0.05, [0.0, 2.3, 0.75], [0.0, 0.74, -0.02], 40, [0.0, 4.4, 2.7], [0.0, 0.74, -0.05]),
    ], dur)
    opts = (f'{{ mode: "ending", camera: {cam}, cues: {{ drops: [-1, -1, -1, -1, -1], sleeve: -1, '
            f'low: [{round(q[2] - 0.05, 2)}, {round(q[3] - 0.05, 2)}] }} }}')
    im, icss, itw = archive_insert(sid, ins_at, "assets/archive/kousai-p16-l6.png", (2651, 122), dur=ins_dur,
                                   focus=(0.49, 0.5, 0.045), credit=KOUSAI_SUM, tilt=0)
    t_title = round(q[6] + 1.6, 2)
    title = ("    " + clip(f"{sid}-title", t_title, round(dur - t_title, 2), "etitle disp", "마쓰바세 사건"))
    m, t = _join([
        set_label(sid, 0, q[1], q[2] - 0.1, "1985. 2. 14", "창고와 살림집 경계 모퉁이"),
        set_label(sid, 1, q[2], q[3] - 0.1, "조서대로라면", "아궁이에서 탔어야 할 천"),
        set_label(sid, 2, q[3], q[4] - 0.1, "혈액 확인 안 됨"),
        set_label(sid, 3, q[4], ins_at - 0.05, "재심 개시의 근거 가운데 하나", "2016 재심 개시 결정"),
    ])
    t += (f'\n    tl.fromTo("#{sid}-title", {{ opacity: 0, y: 18 }}, {{ opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }}, {t_title});')
    css = SET_CSS + icss + """
    .etitle { position: absolute; left: 0; right: 0; top: 452px; text-align: center; font-size: 150px; line-height: 1;
      color: #F3F0EA; letter-spacing: 0.04em; text-shadow: 0 4px 30px rgba(0,0,0,.8); }"""
    return scene3d(sid, dur, "vault", "createVault", opts, m + "\n" + im + "\n" + title, t + "\n" + itw, css)
