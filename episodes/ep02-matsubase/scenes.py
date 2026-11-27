"""징역 13년이 확정됐던 일본 남자, 34년 만에 무죄｜마쓰바세 사건 — scene bodies. Shared helpers come from scenes_kit.py.

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


# ---------------------------------------------------------------- 장면 파일(담당별로 나눔, 한 파일은 한 담당만 고친다)
from scenes_archive import hook, place  # noqa: E402,F401  기록(제작 책임자)
from scenes_room import room_morning, empty_room, rewind_party  # noqa: E402,F401  room.js(set-builder)
from scenes_outside import night_road  # noqa: E402,F401  outside.js(set-builder)
from scenes_home import workshop_intro  # noqa: E402,F401  home.js(set-builder)
from scenes_police import interrogation, arrest_wish, polygraph, mikan_table, polygraph_again  # noqa: E402,F401  police.js(set-builder)
from scenes_vault import vault_open, five_pieces, golf_wear, ending  # noqa: E402,F401  vault.js(set-builder)
from scenes_knife import blade_width, knife_insert, handle_wood  # noqa: E402,F401  knife.js(set-builder)
from scenes_diagram import (counter34, calendar, feb5_change, mikan_question, confession_day, first_story, cloth_story,  # noqa: E402,F401  도식(diagram-builder)
                            verdict_basis, prison_years, seizure_dates, no_blood, cloth_origin, autopsy_memo, second_wound,
                            cloth_holes, not_requested, verdict_order, after, appeal, open_ledger)
