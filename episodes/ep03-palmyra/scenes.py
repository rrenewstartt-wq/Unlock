"""팔미라 환초 요트 부부 실종 — scene bodies. Shared helpers come from scenes_kit.py.

One function per @scene id in data/script.txt: def <id>(sid, dur, q) -> HTML (q[i] = local start of caption i).
Ids without a function yet fall back to `placeholder`, so the build always works; replace each one.
Rules: ../../docs/visual-style.md (look and diagram rules), SPEC.md.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import wrap, clip


def placeholder(sid, dur, q):
    markup = f"""    {clip(sid + '-ph', 0, dur, 'ph', '<b class="disp">' + sid + '</b><span>장면을 만들어 주세요</span>')}"""
    css = """    .ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ph b { font-size: 120px; font-weight: 400; color: #F0A23B; } .ph span { font-size: 40px; margin-top: 16px; }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#{sid}-ph b", {{ opacity: 0.4 }}, {{ opacity: 1, duration: 0.4 }}, 0);
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)


def __getattr__(name):  # any scene id without its own function yet
    return placeholder


def sfx_events(DATA):
    """(bundled sfx name, absolute hit time s, volume). One whoosh per scene cut by default."""
    return [("whoosh-short" if i % 2 else "whoosh", s["start"] + 0.05, 0.35) for i, s in enumerate(DATA["scenes"][1:])]
