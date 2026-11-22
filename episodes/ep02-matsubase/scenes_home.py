"""Scenes on the home set (assets/lib/home.js) — set-builder. workshop_intro.

scenes.py imports these (`from scenes_home import ...`). Each function: def <id>(sid, dur, q) -> composition HTML.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import clip, scene3d, person_card
from scenes_room import ROOM_CSS, _room_label
from scenes_outside import cam_keys

CARD_CSS = """
    .pcard-wrap { position: absolute; left: 110px; top: 196px; width: 380px; }
    .pcard-wrap .pcard { display: block; filter: drop-shadow(0 18px 40px rgba(0,0,0,.6)); }
    .pc-name { margin-top: 18px; padding: 14px 26px 16px; background: rgba(16,18,21,.82); border-left: 8px solid #F0A23B;
      font-size: 54px; line-height: 1.1; color: #F3F0EA; }
    .pc-sub { margin-top: 10px; padding: 10px 26px 12px; background: rgba(16,18,21,.74); border-left: 8px solid #E9E5DD;
      font-family: "Gothic A1", sans-serif; font-size: 34px; color: rgba(243,240,234,.94); white-space: nowrap; width: max-content; }"""


def workshop_intro(sid, dur, q):
    """SHOTS 8 (home/workshop): the 2nd-floor workshop by overcast winter daylight, nobody in it (SPEC v3); tools are a
    plain generic bench, vice and shelf. The amber is the person card's name band "미야타 씨" (an outline card, no face,
    left 30 % of the frame, c1-c2).
    c1 W workshop, window + bench right, card left / c2 M bench from the side, card + "당시 50대 초반 · 장기 친구" /
    c3 W the window, overcast day outside "경찰서까지 약 300m" / c4 W from the top of the stairs down to the empty
    entrance "2층 작업장" / c5 D a streak of window light on the bench, no label (the silence over Q1).
    Bright area per cut: window upper right -> bench top lower right -> window centre -> entrance pane at the bottom of the
    stairwell, centre + lit floor left -> sunlit bench top filling the lower left."""
    cam = cam_keys([
        (0, [-0.3, 1.65, 1.85], [-1.3, 0.85, -1.6], 50, 0.05),
        (q[1] - 0.05, [2.0, 1.25, -0.2], [0.3, 0.8, -1.45], 40, 0.05),
        (q[2] - 0.05, [-1.0, 1.35, 1.2], [0.8, 1.35, -2.0], 40, 0.05),
        (q[3] - 0.05, [-2.0, 1.6, -1.2], [-2.0, -1.1, 1.6], 52, 0.04),
        (q[4] - 0.05, [0.2, 1.0, -0.6], [0.7, 0.74, -1.45], 34, 0.05),
    ], dur)
    opts = f'{{ mode: "workshop", camera: {cam} }}'
    card_end = q[2] - 0.1
    card = (f'<div class="pcard-wrap">{person_card(380, 440, fill="rgba(14,15,17,.72)")}'
            f'<div class="pc-name disp">미야타 씨</div><div id="{sid}-pcsub" class="pc-sub">당시 50대 초반 · 장기 친구</div></div>')
    overlay = "    " + clip(f"{sid}-pc", 0.05, card_end - 0.05, "", card)
    labels = [_room_label(sid, 0, q[2], q[3] - 0.1, "경찰서까지 약 300m"),
              _room_label(sid, 1, q[3], q[4] - 0.1, "2층 작업장", right=True)]
    overlay += "\n" + "\n".join(m for m, _ in labels)
    tweens = (f'    tl.fromTo("#{sid}-pc .pcard-wrap", {{ opacity: 0, x: -24 }}, {{ opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }}, 0.1);\n'
              f'    tl.fromTo("#{sid}-pcsub", {{ opacity: 0, y: 10 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }}, {round(q[1] + 0.05, 2)});\n'
              f'    tl.to("#{sid}-pc .pcard-wrap", {{ opacity: 0, duration: 0.3, ease: "power2.in" }}, {round(card_end - 0.35, 2)});\n'
              + "\n".join(t for _, t in labels))
    return scene3d(sid, dur, "home", "createHome", opts, overlay, tweens, ROOM_CSS + CARD_CSS)
