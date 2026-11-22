"""ep02 vault.js scenes — vault_open (SHOTS 27), five_pieces (SHOTS 28). set-builder.

Set coordinates (assets/lib/vault.js): reading table top y = 0.74 centred at the origin (1.8 x 0.9), camera side +z.
open: open box at (-0.32, 0.02), lid at (0.42, 0.12), paper tag on the box front, two back-lit standing onlookers at
z ≈ -1.1 (3 m+ from every camera that shows them). pieces: shirt hem at z = +0.36, collar toward -z, the wearer's left
sleeve at +x ≈ 0.3~0.7. The cloth is one material for all five pieces (assets/lib/cloth.js); only the light differs.
No record photo of the place is usable (SOURCES.md R6 보류), so vault_open c2 stays 3D.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import cam_shots, scene3d, archive_insert
from scenes_police import set_label, SET_CSS

KOUSAI_NEW = "후쿠오카고법 결정문(2017) · 새 증거"


def _join(labels):
    return "\n".join(m for m, _ in labels), "\n".join(t for _, t in labels)


def vault_open(sid, dur, q):
    """SHOTS 27 (vault/open, amber = the cloth inside the box). Bright area per cut:
    c1 W back wall wash behind two back-lit standing figures, centre / c2 M box under the table light, left /
    c3 M into the open box, amber cloth, centre-left / c4 D the paper tag, lower centre / c5 M the lid, right /
    c6 D box corner against the dark, left / c7 W from the south-west, figures back-lit, wash centre-right."""
    cam = cam_shots([
        (0, [0.5, 1.4, 3.2], [0.0, 0.95, -0.8], 40),
        (q[1] - 0.05, [1.2, 1.0, 1.0], [-0.35, 0.86, -0.05], 36),
        (q[2] - 0.05, [-0.05, 1.3, 0.62], [-0.32, 0.78, 0.0], 38),
        (q[3] - 0.05, [-0.12, 0.92, 0.62], [-0.22, 0.87, 0.17], 30),
        (q[4] - 0.05, [0.95, 1.12, 0.85], [0.42, 0.76, 0.12], 36),
        (q[5] - 0.05, [-0.95, 0.9, 0.5], [-0.5, 0.86, 0.12], 32),
        (q[6] - 0.05, [-1.7, 1.3, 2.7], [0.15, 1.0, -0.9], 40),
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
