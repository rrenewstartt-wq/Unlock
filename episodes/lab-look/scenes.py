"""룩 테스트(레퍼런스 룩 실험장) — scene bodies. Shared helpers come from scenes_kit.py.

One function per @scene id in data/script.txt: def <id>(sid, dur, q) -> HTML (q[i] = local start of caption i).
Rules: ../../docs/visual-style.md (look and diagram rules), SPEC.md.

Pilot test (motion-designer, 2026-11-25): the reference's opening grammar with the three kits together, on a FAKE case
(fake date, place and name — not a real event, not the reference's date/place/name):
  aerial    aerial descent over the look street (cinematographer look_street.js, cut "aerial") + date/place card typing
  approach  walk up to the door                  ┐ the date card (build-level cards layer) stays through both cuts
  macro     brass knob close-up, depth of field  ┘
  follow    schoolgirl from behind (character-animator actors.js) + person card "하나 ▌" / "열여섯 살"
  distance  red distance line + big "20m" + pin on the street (overlay3d.js after the grade, assets/lib/look_marks.js)
  night     night window, slow lateral drift, fade to black
Every cut is one 3D scene with a camera preset (thumbkit/LOOK.md) whose t1 lies past the cut, so no cut ever settles.
Captions: reference skin. RECON_TAG False and ACCENT red come from scenes_kit. The look grade already adds grain and
vignette, so the index CSS grain/vignette layers are off (INDEX_FILM_LAYERS = False).
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import wrap, clip, scene3d, cam_shots, title_card, archive_scene
import json

CAPTION_SKIN = "unlock"
INDEX_FILM_LAYERS = False   # build.py: no CSS #grain / #vignette over the graded 3D (it would be applied twice)

# fake card copy (not a real case)
DATE, PLACE = "1998년 3월 17일 화요일", "시오노현 아카리시"     # 1998-03-17 is a Tuesday
NAME, AGE = "하나", "열여섯 살"

# Camera presets: the set's own CUTS (look_street.js) with t1 moved past the cut so the glide never comes to rest on screen.
KNOB = [1.5 + 0.86 / 2 - 0.075, 0.95, -1 + 0.0675 + 0.055]


def street(sid, dur, cut, camera=None, overlay="", tweens="", css="", module="look_street", factory="createLookStreet", **extra):
    opts = {"cut": cut, **({"camera": camera} if camera else {}), **extra}
    return scene3d(sid, dur, module, factory, json.dumps(opts), overlay=overlay, tweens=tweens, css=css)


def placeholder(sid, dur, q):
    markup = f"""    {clip(sid + '-ph', 0, dur, 'ph', '<b class="disp">' + sid + '</b><span>장면을 만들어 주세요</span>')}"""
    css = """    .ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ph b { font-size: 120px; font-weight: 400; color: #F0A23B; } .ph span { font-size: 40px; margin-top: 16px; }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#{sid}-ph b", {{ opacity: 0.4 }}, {{ opacity: 1, duration: 0.4 }}, 0);
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)


def aerial(sid, dur, q):
    cam = {"preset": "aerialDescend", "target": [0.6, 0.8, -0.5], "t0": 0, "t1": dur + 1.2, "azimuth": 24, "orbit": -9,
           "height": [17, 11.5], "dist": [12.5, 9.2], "fov": [42, 38.5], "lookLift": [0, 1.0]}
    return street(sid, dur, "aerial", cam)


def approach(sid, dur, q):
    cam = {"preset": "approach", "target": [1.5, 1.15, -1], "t0": 0, "t1": dur + 0.8, "azimuth": 22,
           "from": 3.9, "to": 2.15, "height": 1.5, "drift": 0.45, "fov": [40, 37.5], "lookHeight": 1.05}
    return street(sid, dur, "approach", cam)


def macro(sid, dur, q):
    cam = {"preset": "macroPush", "target": KNOB, "t0": 0, "t1": dur + 0.8, "azimuth": 54, "elevation": 2,
           "from": 0.44, "to": 0.32, "fov": [30, 27.5], "aperture": 4.5, "arc": 9}
    return street(sid, dur, "macro", cam)


def follow(sid, dur, q):
    # the set's own followBack (t1 = 5 > cut, the walker's speed is constant to t = 5)
    m, css, tw = title_card(sid, 0.35, NAME, AGE, hold=dur - 0.35, sub_at=1.55, cursor=2.6)
    return street(sid, dur, "follow", overlay=m, tweens=tw, css=css)


def distance(sid, dur, q):
    cam = {"preset": "aerialDescend", "target": [-7.5, 0, 5.6], "t0": 0, "t1": dur + 1.0, "azimuth": 24, "orbit": -7,
           "height": [27, 23], "dist": [10, 7.8], "fov": [46, 42.5], "lookLift": [0, 0.3]}
    marks = [{"type": "measure", "a": [1.5, 0, 5.4], "b": [-18.5, 0, 5.4], "label": "20m", "start": 0.4, "dur": 1.5,
              "labelSize": 2.2, "labelHeight": 2.6, "width": 0.26},
             {"type": "pin", "pos": [-18.5, 0, 5.4], "start": 1.8, "height": 2.2, "head": 0.3}]
    return street(sid, dur, "aerial", cam, module="look_marks", factory="createLookStreetMarks", marks=marks)


def night(sid, dur, q):
    cam = {"preset": "lateralDrift", "target": [-1.2, 4.25, -1], "t0": 0, "t1": dur + 1.0, "azimuth": 12, "dist": 5.2,
           "travel": 1.6, "height": 2.7, "lead": 0.3, "fov": 36}
    # the pilot ends here: fade to black after the caption
    fade_at = round(q[0] + 2.9, 2)
    overlay = "    " + clip(sid + "-fade", 0, dur, "fade-k", "", "position:absolute;inset:0;background:#000;opacity:0;z-index:40")
    tweens = f'    tl.to("#{sid}-fade", {{ opacity: 1, duration: {round(dur - fade_at - 0.1, 2)}, ease: "power1.in" }}, {fade_at});'
    return street(sid, dur, "window", cam, overlay=overlay, tweens=tweens)


def title_cards(DATA):
    """Date/place card on the build-level layer (absolute seconds): typed over the aerial, stays through approach and macro."""
    sc = {s["id"]: s for s in DATA["scenes"]}
    t0, end = sc["aerial"]["start"] + 0.55, sc["macro"]["end"]
    return [dict(at=t0, title=DATE, sub=PLACE, sub_at=sc["approach"]["start"] + 1.1, hold=end - t0, cursor=1.2)]


def sfx_events(DATA):
    """No whooshes: the reference opening cuts silently under the narration (no voice/music in this test)."""
    return []


def __getattr__(name):  # any scene id without its own function yet
    return placeholder


# ---------------------------------------------------------------- earlier parts tests (not in the script; OVERLAY.md examples)
def parts_opening(sid, dur, q):
    shots = [(0, (7, 11, 24), (0, 0, -12), 40),                     # high wide down the road
             (q[1] - 0.1, (0.7, 1.55, 4.2), (0, 1.0, -8), 34)]       # behind the walker
    cam = cam_shots(shots, dur, push=0.05)
    m, css, tw = title_card(sid, 0.3, "1999년 9월 9일 목요일", "어느 해안 마을", hold=dur - 0.3, sub_at=q[1] + 0.2, cursor=0.6)
    return scene3d(sid, dur, "overlay_road", "createOverlayRoad", f'{{ mode: "street", camera: {cam} }}',
                   overlay=m, tweens=tw, css=css)


def parts_person(sid, dur, q):
    shots = [(0, (1.6, 1.4, 6.5), (0, 1.1, -4), 32),
             (q[1] - 0.1, (-2.4, 0.6, 2.0), (0, 1.0, -4), 30)]
    cam = cam_shots(shots, dur, push=0.06)
    return scene3d(sid, dur, "overlay_road", "createOverlayRoad", f'{{ mode: "street", camera: {cam} }}')


def parts_distance(sid, dur, q):
    shots = [(0, (11, 15, 22), (0, 0, -8), 42)]
    cam = cam_shots(shots, dur, push=0.08)
    return scene3d(sid, dur, "overlay_road", "createOverlayRoad", f'{{ mode: "measure", camera: {cam} }}')


def parts_photo(sid, dur, q):
    shots = [{"src": "assets/archive/beach-glenelg-htsa.jpg", "at": 0, "size": (1920, 1440),
              "crop": (0.06, 0.28, 0.94, 0.94),        # 16:9, inside the film border, no handwriting
              "push": (1.0, 1.07),
              "credit": "사진: State Government Photographer / History Trust of South Australia (GN14549), CC0"}]
    return archive_scene(sid, dur, q, shots, look="unlock")


