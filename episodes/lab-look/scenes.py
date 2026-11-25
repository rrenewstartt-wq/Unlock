"""룩 테스트(레퍼런스 룩 실험장) — scene bodies. Shared helpers come from scenes_kit.py.

One function per @scene id in data/script.txt: def <id>(sid, dur, q) -> HTML (q[i] = local start of caption i).
Ids without a function yet fall back to `placeholder`, so the build always works; replace each one.
Rules: ../../docs/visual-style.md (look and diagram rules), SPEC.md.

motion-designer test (2026-11-25): the reference's screen grammar as kit parts —
  opening   date/place title card inside a 3D scene (scenes_kit.title_card), over a camera cut
  person    person card on the build-level card layer (title_cards below), over a camera cut
  distance  glowing distance line + big number + pin + route inside the 3D set (thumbkit/overlay3d.js)
  photo     real photo in the reference look (archive_scene(..., look="unlock"))
Captions use the reference skin (CAPTION_SKIN = "unlock"). All text is fake test copy, not a real case.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import wrap, clip, scene3d, cam_shots, title_card, archive_scene

CAPTION_SKIN = "unlock"


def placeholder(sid, dur, q):
    markup = f"""    {clip(sid + '-ph', 0, dur, 'ph', '<b class="disp">' + sid + '</b><span>장면을 만들어 주세요</span>')}"""
    css = """    .ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ph b { font-size: 120px; font-weight: 400; color: #F0A23B; } .ph span { font-size: 40px; margin-top: 16px; }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#{sid}-ph b", {{ opacity: 0.4 }}, {{ opacity: 1, duration: 0.4 }}, 0);
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)


def opening(sid, dur, q):
    shots = [(0, (7, 11, 24), (0, 0, -12), 40),                     # high wide down the road
             (q[1] - 0.1, (0.7, 1.55, 4.2), (0, 1.0, -8), 34)]       # behind the walker
    cam = cam_shots(shots, dur, push=0.05)
    m, css, tw = title_card(sid, 0.3, "1999년 9월 9일 목요일", "어느 해안 마을", hold=dur - 0.3, sub_at=q[1] + 0.2, cursor=0.6)
    return scene3d(sid, dur, "overlay_road", "createOverlayRoad", f'{{ mode: "street", camera: {cam} }}',
                   overlay=m, tweens=tw, css=css)


def person(sid, dur, q):
    shots = [(0, (1.6, 1.4, 6.5), (0, 1.1, -4), 32),
             (q[1] - 0.1, (-2.4, 0.6, 2.0), (0, 1.0, -4), 30)]
    cam = cam_shots(shots, dur, push=0.06)
    return scene3d(sid, dur, "overlay_road", "createOverlayRoad", f'{{ mode: "street", camera: {cam} }}')


def distance(sid, dur, q):
    shots = [(0, (11, 15, 22), (0, 0, -8), 42)]
    cam = cam_shots(shots, dur, push=0.08)
    return scene3d(sid, dur, "overlay_road", "createOverlayRoad", f'{{ mode: "measure", camera: {cam} }}')


def photo(sid, dur, q):
    shots = [{"src": "assets/archive/beach-glenelg-htsa.jpg", "at": 0, "size": (1920, 1440),
              "crop": (0.06, 0.28, 0.94, 0.94),        # 16:9, inside the film border, no handwriting
              "push": (1.0, 1.07),
              "credit": "사진: State Government Photographer / History Trust of South Australia (GN14549), CC0"}]
    return archive_scene(sid, dur, q, shots, look="unlock")


def title_cards(DATA):
    """Cards on the build-level layer (absolute seconds): the person card stays through the cut inside `person`."""
    sc = next(s for s in DATA["scenes"] if s["id"] == "person")
    c0, c1 = sc["captions"][0]["start"], sc["captions"][1]["start"]
    return [dict(at=c0 + 0.35, title="민지", sub="스무 살", sub_at=c1 - 0.6, hold=sc["end"] - c0 - 0.5, cursor=4.0)]


def __getattr__(name):  # any scene id without its own function yet
    return placeholder


def sfx_events(DATA):
    """(bundled sfx name, absolute hit time s, volume). One whoosh per scene cut by default."""
    return [("whoosh-short" if i % 2 else "whoosh", s["start"] + 0.05, 0.35) for i, s in enumerate(DATA["scenes"][1:])]
