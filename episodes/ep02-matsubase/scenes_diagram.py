"""ep02 diagram scenes (diagram-builder): counter34, calendar, feb5_change.

Board rules (SPEC "▶ 큰 변화 규칙", review-design-2 P0-1):
- every ▶ is a 0-frame hard cut: each board ("판") or re-framing is its own clip, the next one starts on the frame the
  previous one ends. No GSAP zoom/move between boards; only elements inside a board animate in.
- at every ▶ a bright area (paper #D9D5CC card/band) of 25 %+ of the frame appears, disappears or moves, and the new
  board's main element is on screen at the cut (in-board entries come after it).
- nothing below y = 900 (captions), reading text 46 px+, one amber focus per scene.
Pilot fix 2 (judge-pilot-1 blind 3/4: "same counter frame repeated, empty slots, small text"):
- each scene has its own form: counter34 = 35 year cells that fill amber + age axis; calendar = date grid, warrant form,
  13-day tally band, two-bar chart (1심/2심); feb5_change = before/after ledger with dated columns.
- every board shows information from its first frame (no "0", no empty frames waiting for content).
Facts: facts.md F14 F17 F30 F33 F34 F36 F37 F38 F60 F64 F67 F73 F74 F75 F76 F81 F178 F186 F221 (✅ only; X05 respected).
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import wrap, clip, BOARD, person_card, AMBER, INK
from scenes_archive import record_insert

PAPER = "#D9D5CC"
DARK = "#1E2125"


def _cuts(q, dur, idx):
    """Board boundaries: 0, then q[i] - 0.05 for each ▶ caption index, then dur (2-decimal, contiguous)."""
    return [0.0] + [round(q[i] - 0.05, 2) for i in idx] + [round(dur, 2)]


def _board(sid, n, t0, t1, inner):
    return "    " + clip(f"{sid}-b{n}", t0, round(t1 - t0, 2), "pn", inner)


def _tag(sid, n, t0, t1, text="도식"):
    return "    " + clip(f"{sid}-tg{n}", round(t0 + (0.3 if t0 == 0 else 0), 2), round(t1 - t0 - (0.3 if t0 == 0 else 0), 2),
                         "tag-re", text)


# in-board entries (one element, one moment; kinds vary so not everything fades and slides up)
def _fade(sel, t, d=0.35):
    return f'    tl.fromTo("{sel}", {{ opacity: 0 }}, {{ opacity: 1, duration: {d}, ease: "power2.out" }}, {round(t, 2)});'


def _pop(sel, t, s=1.14, d=0.3):
    return (f'    tl.fromTo("{sel}", {{ opacity: 0, scale: {s} }}, {{ opacity: 1, scale: 1, duration: {d}, ease: "power3.out" }}, '
            f'{round(t, 2)});')


def _grow(sel, t, d=0.5, axis="X", ease="power2.inOut"):
    return (f'    tl.fromTo("{sel}", {{ opacity: 0, scale{axis}: 0 }}, {{ opacity: 1, scale{axis}: 1, duration: {d}, ease: "{ease}" }}, '
            f'{round(t, 2)});')


def _slide(sel, t, x=-28):
    return (f'    tl.fromTo("{sel}", {{ opacity: 0, x: {x} }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, '
            f'{round(t, 2)});')


def _count(el_id, t, d, to):
    return (f'    (() => {{ const o = {{ v: 0 }}; tl.to(o, {{ v: {to}, duration: {d}, ease: "power2.out", onUpdate: () => '
            f'{{ document.getElementById("{el_id}").textContent = Math.round(o.v); }} }}, {round(t, 2)}); }})();')


def _script(sid, tw):
    return ("    const tl = gsap.timeline({ paused: true });\n" + "\n".join(tw) +
            f'\n    window.__timelines["{sid}"] = tl;')


BASE_CSS = f"""
    #root {{ background: {BOARD}; }}
    .pn {{ position: absolute; inset: 0; }}
    .h {{ opacity: 0; }}
    .abs {{ position: absolute; }}
    .paper {{ position: absolute; background: {PAPER}; color: {DARK}; box-shadow: 0 24px 60px rgba(0,0,0,.5); }}
    .lab {{ position: absolute; background: rgba(12,13,15,.8); border-left: 8px solid {INK}; color: #F3F0EA; padding: 12px 28px 14px; }}
"""



def _stagger(sel, t, each, d=0.12, prop="opacity"):
    return (f'    tl.fromTo("{sel}", {{ {prop}: 0 }}, {{ {prop}: 1, duration: {d}, stagger: {each}, ease: "none" }}, '
            f'{round(t, 2)});')


# ============================================================================ counter34 (SHOTS 5)

def counter34(sid, dur, q):
    """▶c1 board A: 35 year cells 1985…2019 (one per year), 1985 lit, "결론 ?" at the far end; c2 the cells fill amber
    left → right and '34년' lands inside the band / ▶c3 re-frame: the 34-year band shrinks to the top, two big paper
    cards "1985 겨울 · 2019 봄" / ▶c4 board B outline person card + age axis 50대 초반 → 85세 (amber fill = 34년).
    F17 F178 F30 F186."""
    c = _cuts(q, dur, [2, 3])
    p = sid
    n, x0, w, g = 35, 120, 1680, 6
    cw = (w - g * (n - 1)) / n

    def cx(i):
        return round(x0 + i * (cw + g), 1)
    cells = "".join(f'<div class="yc0{" on" if i == 0 else ""}" style="left:{cx(i)}px;width:{round(cw, 1)}px"><i class="f"></i></div>'
                    for i in range(n))
    years = "".join(f'<span class="yl" style="left:{round(cx(y - 1985) + cw / 2, 1)}px">{y}</span>'
                    for y in (1985, 1990, 1995, 2000, 2005, 2010, 2015, 2019))
    A = f"""
      <div class="nl"><b class="disp">1985.1</b><span>사건</span></div>
      <div id="{p}-tq" class="nr"><b class="disp">결론</b><span>?</span></div>
      <div id="{p}-tr" class="nr h"><b class="disp">2019.3</b><span>재심 판결</span></div>
      <div id="{p}-strip" class="strip">{cells}</div>{years}
      <div id="{p}-n34" class="n34 h"><b class="disp">34년</b></div>"""
    A2 = f"""
      <div class="ms disp">1985 ― 34년 ― 2019</div>
      <i class="drop l"></i><i class="drop r"></i>
      <div class="paper yc l"><b class="disp">1985</b><em class="disp">겨울</em><span>1월 · 사건</span></div>
      <div class="paper yc r"><b class="disp">2019</b><em class="disp">봄</em><span>3월 28일 · 재심 판결</span></div>"""

    def ay(age):
        return round(170 + (age - 51) / 34 * 650)
    ticks = "".join(f'<i class="tk" style="top:{ay(a) - 2}px"></i><span class="tkl" style="top:{ay(a) - 30}px">{a}세</span>'
                    for a in (60, 70, 80))
    B = f"""
      <div class="pc">{person_card(520, 650, sw=4)}</div>
      <div class="lab pname disp">미야타 씨</div>
      <div class="ag"><i id="{p}-agf" class="h"></i></div>{ticks}
      <i class="tk end" style="top:168px"></i><i class="tk end" style="top:818px"></i>
      <div class="age a1"><span>1985</span><b class="disp">50대 초반</b></div>
      <div id="{p}-y34" class="y34 disp h">34년</div>
      <div id="{p}-a2" class="age a2 h"><span>2019</span><b class="disp">85세</b></div>"""
    markup = "\n".join([_board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B),
                        _tag(p, 0, 0, dur)])
    css = BASE_CSS + f"""
    .nl, .nr {{ position: absolute; top: 166px; }}
    .nl {{ left: 120px; }} .nr {{ right: 120px; text-align: right; }}
    .nl b, .nr b {{ display: block; font-size: 96px; line-height: 1; font-weight: 400; color: {INK}; }}
    .nl span, .nr span {{ display: block; font-size: 54px; margin-top: 10px; color: rgba(233,229,221,.88); }}
    .strip {{ position: absolute; left: 0; top: 360px; width: 1920px; height: 300px; }}
    .yc0 {{ position: absolute; top: 0; height: 300px; background: rgba(233,229,221,.1); border-radius: 3px; }}
    .yc0.on {{ background: {INK}; }}
    .yc0 .f {{ position: absolute; inset: 0; border-radius: 3px; background: {AMBER}; opacity: 0; }}
    .yl {{ position: absolute; top: 684px; font-size: 48px; color: rgba(233,229,221,.88); transform: translateX(-50%); }}
    .n34 {{ position: absolute; left: 120px; width: 1680px; top: 360px; height: 300px; text-align: center; }}
    .n34 b {{ display: inline-block; height: 300px; line-height: 312px; padding: 0 56px; font-size: 236px; font-weight: 400;
      color: {DARK}; background: {AMBER}; }}
    .ms {{ position: absolute; left: 96px; width: 1728px; top: 140px; height: 96px; line-height: 100px; text-align: center;
      background: {AMBER}; color: {DARK}; font-size: 66px; border-radius: 4px; }}
    .drop {{ position: absolute; top: 236px; width: 6px; height: 64px; background: {AMBER}; }}
    .drop.l {{ left: 110px; }} .drop.r {{ left: 1804px; }}
    .yc {{ top: 300px; width: 834px; height: 590px; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
    .yc.l {{ left: 96px; }} .yc.r {{ left: 990px; }}
    .yc b {{ font-size: 230px; line-height: .95; font-weight: 400; }}
    .yc em {{ font-style: normal; font-size: 120px; line-height: 1.05; }}
    .yc span {{ font-size: 54px; margin-top: 26px; padding-top: 18px; border-top: 4px solid rgba(30,33,37,.55); }}
    .pc {{ position: absolute; left: 150px; top: 150px; }}
    .pname {{ left: 150px; top: 818px; font-size: 48px; padding: 6px 26px 8px; }}
    .ag {{ position: absolute; left: 836px; top: 170px; width: 16px; height: 650px; border-radius: 8px; background: rgba(233,229,221,.24); }}
    .ag i {{ position: absolute; inset: 0; border-radius: 8px; background: {AMBER}; transform-origin: center top; }}
    .tk {{ position: absolute; left: 818px; width: 52px; height: 4px; background: rgba(233,229,221,.7); }}
    .tk.end {{ background: {INK}; height: 4px; left: 812px; width: 64px; }}
    .tkl {{ position: absolute; right: 1124px; font-size: 48px; color: rgba(233,229,221,.85); }}
    .age {{ position: absolute; left: 920px; }}
    .age span {{ display: block; font-size: 52px; color: rgba(233,229,221,.85); }}
    .age b {{ display: block; font-weight: 400; line-height: 1; color: {INK}; }}
    .a1 {{ top: 120px; }} .a1 b {{ font-size: 150px; }}
    .a2 {{ top: 590px; transform-origin: left center; }} .a2 b {{ font-size: 220px; }}
    .y34 {{ position: absolute; left: 920px; top: 410px; font-size: 120px; line-height: 1; color: {AMBER}; }}
"""
    tw = [
        _stagger(f"#{p}-strip .f", q[1], 0.026, 0.1),
        f'    tl.to("#{p}-tq", {{ opacity: 0, duration: 0.15 }}, {round(q[1] + 0.85, 2)});',
        _fade(f"#{p}-tr", q[1] + 0.95, 0.25),
        _pop(f"#{p}-n34", q[1] + 1.0, 1.12, 0.3),
        _grow(f"#{p}-agf", q[3] + 0.8, 1.1, "Y", "power1.inOut"),
        _fade(f"#{p}-y34", q[3] + 0.9, 0.3),
        _pop(f"#{p}-a2", q[3] + 1.8, 1.12, 0.35),
    ]
    return wrap(sid, dur, css, markup, _script(sid, tw))


# ============================================================================ calendar (SHOTS 9)

CW, CH, CG = 200, 230, 16
DAYS = [list(range(8, 15)), list(range(15, 21))]
WORKED = {8, 9, 10, 12, 13, 14}


def _grid(p, key, x0, y0, s, state, words=None):
    """Calendar cells 1/8~1/20 (two rows of a week). state(d) -> 'empty' | 'fill' | 'fillh' (filled later) | 'hatch' | 'hatchh'.
    The day number is always readable: a light number on the empty cell, and a dark copy inside the paper fill above it."""
    out = []
    w, h, g = round(CW * s), round(CH * s), round(CG * s)
    sm = s < 0.9
    for r, row in enumerate(DAYS):
        for i, d in enumerate(row):
            st = state(d)
            x, y = x0 + i * (w + g), y0 + r * (h + g)
            fid = f' id="{p}-{key}{d}"' if st.endswith("h") else ""
            hcls = " h" if st.endswith("h") else ""
            word = (words or {}).get(d, "조사" if st.startswith("fill") else "")
            wd = f'<em>{word}</em>' if word and not sm else ""
            if st.startswith("fill"):
                inner = f'<i{fid} class="fl{hcls}"><b class="disp">{d}</b>{wd}</i>'
            elif st.startswith("hatch"):
                inner = f'<i{fid} class="ht{hcls}"></i>'
            else:
                inner = ""
            base = "" if st == "fill" else f'<b class="disp">{d}</b>'
            ov = " data-layout-allow-overlap" if st == "fillh" else ""
            out.append(f'<div class="cell{" sm" if sm else ""}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"{ov}>'
                       f'{base}{inner}</div>')
    return "".join(out)


def calendar(sid, dur, q):
    """▶c1 board A calendar 1/8~1/20 (13 cells, numbers + legend from frame 0), 8~10·12~14 fill / c2 "체포 없이 · 임의 조사" /
    ▶c3 re-frame: calendar small left, warrant request form (paper, 50 %): "청구 못 함" stamp / c4 form field "근거 … 없음" /
    ▶c5 board B full calendar, 15~17 hatched "조사 없음" / ▶c6 re-frame: 13-day strip + paper tally band 6 → 9 as 18·19·20 fill /
    ▶c7 two-bar chart 1심 약 74 · 2심 약 81 (what each includes), '70시간+' amber (the scene's one focus).
    F33 F64 F14 F221 F34 F36 F60 F37 F38."""
    c = _cuts(q, dur, [2, 4, 5, 6])
    p = sid
    gx, gy = 212, 190
    lx, ly = gx + 6 * (CW + CG), gy + CH + CG   # free 7th slot of row 2 → legend
    leg_a = (f'<div class="leg" style="left:{lx}px;top:{ly + 40}px"><p><i class="lf"></i>조사</p>'
             f'</div>')
    leg_b = (f'<div class="leg" style="left:{lx}px;top:{ly + 40}px"><p><i class="lf"></i>조사</p>'
             f'<p><i class="lh"></i>조사 없음</p></div>')
    A = (f'<div class="hd">1985년 1월 · 그가 조사받은 날</div>'
         + _grid(p, "a", gx, gy, 1, lambda d: "fillh" if d in WORKED else "empty") + leg_a
         + f'<div id="{p}-l1" class="lab l1 h">체포 없이 · <b class="disp">임의 조사</b></div>')
    A2 = (f'<div class="hd sm">1985년 1월</div>'
          + _grid(p, "s", 96, 250, 0.36, lambda d: "fill" if d in WORKED else "empty")
          + f"""<div class="lab l1s">체포 없이<b class="disp">임의 조사</b></div>
          <div class="paper wr"><i class="dash"></i>
            <div class="wt disp">체포영장 청구</div>
            <div class="fd f1"><span>청구하는 쪽</span><b class="disp">경찰</b></div>
            <div class="fd f2"><span>근거</span><b class="disp">범인을 가리키는 증거<em id="{p}-none" class="h"> 없음</em></b></div>
            <div id="{p}-st" class="stamp h"><b class="disp">청구 못 함</b><span>자백 전까지</span></div></div>""")
    B = (f'<div class="hd">1985년 1월 · 그가 조사받은 날</div>'
         + _grid(p, "b", gx, gy, 1, lambda d: "fill" if d in WORKED else "hatchh" if d in (15, 16, 17) else "empty")
         + leg_b + f'<div id="{p}-l3" class="lab l3 h">15~17일 · <b class="disp">조사 없음</b></div>')
    cols = []
    for k, d in enumerate(range(8, 21)):
        x = 96 + k * 134
        word = "자백" if d == 20 else "조사"
        if d in WORKED:
            inner = f'<i class="fl"><b class="disp">{d}</b><em>{word}</em></i>'
        elif d in (18, 19, 20):
            inner = f'<i id="{p}-c{d}" class="fl h"><b class="disp">{d}</b><em>{word}</em></i>'
        elif d in (15, 16, 17):
            inner = '<i class="ht"></i>'
        else:
            inner = ""
        base = "" if d in WORKED else f'<b class="disp">{d}</b>'
        ov = " data-layout-allow-overlap" if d in (18, 19, 20) else ""
        cols.append(f'<div class="col" style="left:{x}px"{ov}>{base}{inner}</div>')
    C = (f'<div class="hd hc">자백하는 날까지 · 1월 8일 ~ 20일</div>' + "".join(cols)
         + f"""<div class="paper tally"><div class="tl1 disp">13일 가운데</div><div class="tl2">조사한 날</div>
           <div id="{p}-n9b" class="tn disp"><b id="{p}-n9">6</b>일</div></div>""")
    S = 14.44   # px per hour
    ticks = "".join(f'<span class="xt" style="left:{round(300 + h * S)}px">{h}</span>' for h in (0, 20, 40, 60, 80))
    D = f"""<div class="hd2">법원이 따진 조사 시간</div>
      <div id="{p}-hr" class="hr disp h">70시간+</div>
      <div class="bl disp" style="top:388px">1심</div><div class="bl disp" style="top:568px">2심</div>
      <div id="{p}-bar1" class="bar" style="top:380px;width:{round(74 * S)}px"><span>식사·휴식 포함</span></div>
      <div id="{p}-bar2" class="bar" style="top:560px;width:{round(81 * S)}px"><span>폴리그래프 검사 포함</span></div>
      <div id="{p}-v1" class="bv disp h" style="top:396px;left:{round(300 + 74 * S + 28)}px">약 74시간</div>
      <div id="{p}-v2" class="bv disp h" style="top:576px;left:{round(300 + 81 * S + 28)}px">약 81시간</div>
      <i class="xax"></i>{ticks}
      <i id="{p}-l70" class="l70 h" style="left:{round(300 + 70 * S) - 3}px"></i>
      <span id="{p}-t70" class="xt t70 h" style="left:{round(300 + 70 * S)}px">70</span>"""
    markup = "\n".join([
        _board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B),
        _board(p, 3, c[3], c[4], C), _board(p, 4, c[4], c[5], D),
        _tag(p, 0, c[0], c[1]), _tag(p, 1, c[1], c[2], "도식 · 실제 영장 아님"), _tag(p, 2, c[2], c[5])])
    css = BASE_CSS + f"""
    .hd {{ position: absolute; left: 212px; top: 104px; font-size: 54px; color: rgba(233,229,221,.9); }}
    .hd.sm {{ left: 96px; top: 176px; font-size: 52px; }}
    .hd.hc {{ left: 96px; top: 120px; }}
    .cell {{ position: absolute; border: 3px solid rgba(233,229,221,.5); border-radius: 6px; overflow: hidden; }}
    .cell > i {{ position: absolute; inset: -3px; }}
    .cell .fl {{ background: {PAPER}; font-style: normal; }}
    .cell .ht {{ background: repeating-linear-gradient(135deg, rgba(233,229,221,.34) 0 10px, rgba(233,229,221,0) 10px 26px); }}
    .cell > b {{ position: absolute; left: 22px; top: 14px; font-size: 104px; line-height: 1; font-weight: 400; color: rgba(233,229,221,.82); }}
    .cell .fl b {{ position: absolute; left: 25px; top: 17px; font-size: 104px; line-height: 1; font-weight: 400; color: {DARK}; }}
    .cell .fl em {{ position: absolute; left: 25px; bottom: 15px; font-style: normal; font-size: 54px; color: {DARK}; }}
    .cell.sm {{ border-width: 2px; border-radius: 4px; }}
    .cell.sm > b {{ left: 7px; top: 6px; font-size: 48px; }}
    .cell.sm .fl b {{ left: 9px; top: 8px; font-size: 48px; }}
    .leg {{ position: absolute; }}
    .leg p {{ display: flex; align-items: center; gap: 16px; font-size: 48px; color: rgba(233,229,221,.92); margin-bottom: 22px; white-space: nowrap; }}
    .leg i {{ display: block; width: 52px; height: 52px; border-radius: 4px; }}
    .leg .lf {{ background: {PAPER}; }}
    .leg .le {{ border: 3px solid rgba(233,229,221,.5); }}
    .leg .lh {{ border: 3px solid rgba(233,229,221,.5);
      background: repeating-linear-gradient(135deg, rgba(233,229,221,.4) 0 7px, rgba(233,229,221,0) 7px 16px); }}
    .lab b {{ font-weight: 400; }}
    .l1 {{ left: 212px; top: 704px; font-size: 54px; }} .l1 b {{ font-size: 66px; }}
    .l1s {{ left: 96px; top: 470px; width: 540px; font-size: 52px; line-height: 1.3; }} .l1s b {{ display: block; font-size: 96px; line-height: 1.1; }}
    .wr {{ left: 690px; top: 96px; width: 1134px; height: 794px; }}
    .wr .dash {{ position: absolute; inset: 26px; border: 6px dashed rgba(30,33,37,.55); border-radius: 4px; }}
    .wt {{ position: absolute; left: 80px; top: 64px; font-size: 92px; letter-spacing: .06em; }}
    .fd {{ position: absolute; left: 80px; right: 80px; padding-bottom: 14px; border-bottom: 4px dashed rgba(30,33,37,.4); }}
    .fd span {{ display: block; font-size: 46px; color: rgba(30,33,37,.72); }}
    .fd b {{ display: block; font-weight: 400; font-size: 66px; line-height: 1.15; }}
    .fd em {{ font-style: normal; font-size: 96px; }}
    .f1 {{ top: 180px; }} .f2 {{ top: 324px; }}
    .stamp {{ position: absolute; left: 170px; top: 498px; width: 794px; padding: 14px 0 18px; text-align: center;
      border: 12px solid {DARK}; border-radius: 14px; transform: rotate(-4deg); background: {PAPER}; }}
    .stamp b {{ display: block; font-weight: 400; font-size: 134px; line-height: 1; }}
    .stamp span {{ display: block; font-size: 54px; margin-top: 12px; }}
    .l3 {{ left: 212px; top: 704px; font-size: 54px; }} .l3 b {{ font-size: 66px; }}
    .col {{ position: absolute; top: 200px; width: 122px; height: 290px; border: 3px solid rgba(233,229,221,.5); border-radius: 6px; overflow: hidden; }}
    .col > i {{ position: absolute; inset: -3px; }}
    .col .fl {{ background: {PAPER}; font-style: normal; }}
    .col .ht {{ background: repeating-linear-gradient(135deg, rgba(233,229,221,.34) 0 9px, rgba(233,229,221,0) 9px 22px); }}
    .col > b, .col .fl b {{ position: absolute; left: 0; right: 0; top: 22px; text-align: center; font-size: 76px; line-height: 1; font-weight: 400; }}
    .col > b {{ color: rgba(233,229,221,.82); }}
    .col .fl b {{ top: 25px; color: {DARK}; }}
    .col .fl em {{ position: absolute; left: 0; right: 0; bottom: 22px; text-align: center; font-style: normal; font-size: 48px; color: {DARK}; }}
    .tally {{ left: 96px; top: 540px; width: 1728px; height: 340px; }}
    .tl1 {{ position: absolute; left: 80px; top: 70px; font-size: 110px; line-height: 1; }}
    .tl2 {{ position: absolute; left: 84px; top: 210px; font-size: 68px; }}
    .tn {{ position: absolute; right: 90px; top: 22px; font-size: 140px; line-height: 300px; transform-origin: 80% 60%; }}
    .tn b {{ font-weight: 400; font-size: 290px; }}
    .hd2 {{ position: absolute; left: 96px; top: 150px; font-size: 56px; color: rgba(233,229,221,.9); }}
    .hr {{ position: absolute; right: 96px; top: 70px; font-size: 230px; line-height: 1; color: {AMBER}; transform-origin: right center; }}
    .bl {{ position: absolute; left: 96px; font-size: 92px; line-height: 1; color: {INK}; }}
    .bar {{ position: absolute; left: 300px; height: 130px; background: {PAPER}; overflow: hidden; border-radius: 0 6px 6px 0; }}
    .bar span {{ position: absolute; left: 32px; top: 38px; font-size: 48px; color: {DARK}; white-space: nowrap; }}
    .bv {{ position: absolute; font-size: 70px; line-height: 1; color: {INK}; white-space: nowrap; }}
    .xax {{ position: absolute; left: 300px; top: 724px; width: {round(90 * S)}px; height: 4px; background: rgba(233,229,221,.45); }}
    .xt {{ position: absolute; top: 742px; font-size: 48px; color: rgba(233,229,221,.8); transform: translateX(-50%); }}
    .t70 {{ color: {INK}; }}
    .l70 {{ position: absolute; top: 350px; width: 6px; height: 386px; background: #FFFFFF; mix-blend-mode: difference; }}
"""
    tw = []
    # A: 8~10 while "1월 8일부터 10일", 12~14 while "12일부터 14일까지"
    for k, d in enumerate([8, 9, 10]):
        tw.append(_fade(f"#{p}-a{d}", q[0] + 0.35 + k * 0.22, 0.25))
    for k, d in enumerate([12, 13, 14]):
        tw.append(_fade(f"#{p}-a{d}", q[0] + 1.75 + k * 0.22, 0.25))
    tw += [
        _slide(f"#{p}-l1", q[1] + 0.1),
        _pop(f"#{p}-st", q[2] + 1.35, 1.25, 0.25),
        _pop(f"#{p}-none", q[3] + 0.9, 1.3, 0.25),
    ]
    for k, d in enumerate([15, 16, 17]):
        tw.append(_fade(f"#{p}-b{d}", q[4] + 0.2 + k * 0.2, 0.3))
    tw += [
        _slide(f"#{p}-l3", q[4] + 1.2),
        # tally 6 → 9: one step as each of 18·19·20 fills (no zero state)
        (f'    (() => {{ const o = {{ v: 6 }}; tl.to(o, {{ v: 9, duration: 1.8, ease: "none", onUpdate: () => '
         f'{{ document.getElementById("{p}-n9").textContent = Math.floor(o.v + 1e-6); }} }}, {round(q[5] + 0.6, 2)}); }})();'),
        _fade(f"#{p}-c18", q[5] + 1.15, 0.15),
        _fade(f"#{p}-c19", q[5] + 1.75, 0.15),
        _fade(f"#{p}-c20", q[5] + 2.35, 0.15),
        f'    tl.fromTo("#{p}-n9b", {{ scale: 1.14 }}, {{ scale: 1, duration: 0.3, ease: "power3.out" }}, {round(q[5] + 2.4, 2)});',
        f'    tl.fromTo("#{p}-bar1", {{ width: 0 }}, {{ width: {round(74 * S)}, duration: 1.15, ease: "power2.out" }}, {round(q[6] + 0.1, 2)});',
        f'    tl.fromTo("#{p}-bar2", {{ width: 0 }}, {{ width: {round(81 * S)}, duration: 1.25, ease: "power2.out" }}, {round(q[6] + 0.1, 2)});',
        _fade(f"#{p}-v1", q[6] + 1.1, 0.25),
        _fade(f"#{p}-v2", q[6] + 1.2, 0.25),
        _grow(f"#{p}-l70", q[6] + 1.45, 0.3, "Y", "power2.out"),
        _fade(f"#{p}-t70", q[6] + 1.45, 0.25),
        _pop(f"#{p}-hr", q[6] + 1.7, 1.12, 0.3),
    ]
    return wrap(sid, dur, css, markup, _script(sid, tw))


# ============================================================================ feb5_change (SHOTS 20)

def feb5_change(sid, dur, q):
    """Before → after ledger (columns: 이전 진술 / 2월 5일 자 조서), one row enlarged at a time (no three-card line-up).
    ▶c1 board A paper card "2월 5일 자 조서" + date line 1/20 첫 자백 → 2/5 / c2 rows ① 장갑 ② 칼자루 ③ 구두 /
    ▶c3 re-frame: row ① big band, 1/20 "다리에서 강에 던져 버림" struck → "아궁이에서 태움" /
    ▶c4 board B the statement frame "경찰관에게서 「?」 라는 물음을 받았다" / ▶c5 record 3 s: [2] p.4 l.20 strip (shared desk look scenes_archive.record_insert) /
    ▶c6 board C the whole ledger, row ② (amber, the scene's one focus) / ▶c7 re-frame: row ③ big band.
    F73 F67 F74 F75 F76 F81 (X05: the cloth first appears in the 2/5 statement)."""
    c = _cuts(q, dur, [2, 3, 4, 5, 6])  # c[3] = record cut start, c[4] = board C
    p = sid
    A = f"""<div class="paper doc"><span class="k">경찰 조서</span><b class="disp">2월 5일 자</b><b class="disp big">조서</b>
        <em>1985년 · 고법 결정문의 요약</em></div>
      <div class="tln"><i class="ln"></i><i class="nd a"></i><i class="nd b"></i>
        <div class="tla"><b class="disp">1월 20일</b><span>첫 자백 조서</span></div>
        <div class="tlb"><b class="disp">2월 5일</b><span>이 조서</span></div></div>
      <div id="{p}-f1" class="frm h" style="top:380px"><b class="disp">① 장갑</b><span>바뀜</span></div>
      <div id="{p}-f2" class="frm h" style="top:550px"><b class="disp">② 칼자루</b><span>바뀜</span></div>
      <div id="{p}-f3" class="frm h" style="top:720px"><b class="disp">③ 구두</b><span>바뀜</span></div>"""
    A2 = f"""<div class="hd3">2월 5일 자 조서 · 바뀐 진술 <b class="disp">①</b></div>
      <div class="paper band b1"><div class="it"><b class="disp">①</b><span class="disp">장갑</span></div>
        <div class="ct"><span class="k2">이전 진술 · 1월 20일 첫 자백</span>
          <div class="old">다리에서 강에 던져 버림<i id="{p}-strike" class="strike h"></i></div>
          <span class="k2 kb">2월 5일 자 조서</span>
          <div id="{p}-new1" class="new disp h">아궁이에서 태움</div></div></div>
      <div class="ghost" style="left:96px"><b class="disp">② 칼자루</b></div>
      <div class="ghost" style="left:968px"><b class="disp">③ 구두</b></div>"""
    B = f"""<div class="mini"><b class="disp">① 장갑</b><span>강 → 아궁이</span></div><i class="link"></i>
      <div class="paper qc"><span class="k">2월 5일 자 조서 속 그의 설명</span>
        <b class="disp">경찰관에게서</b>
        <div class="qq disp"><i>「</i><b>?</b><i>」</i></div>
        <b class="disp">라는 물음을 받았다</b>
        <em id="{p}-qn" class="h">원문 → 고법 결정문 4쪽 20행</em></div>"""
    C = f"""<div class="hd3">2월 5일 자 조서 · 바뀐 진술</div>
      <div class="chd" style="left:576px">이전 진술</div><div class="chd" style="left:1016px">2월 5일 자 조서</div>
      <div class="paper row r1"><b class="disp">① 장갑</b><span class="c2">강에 던져 버림</span><span class="c3">아궁이에서 태움</span></div>
      <div class="paper row r2"><i class="am"></i><b class="disp">② 칼자루</b>
        <span class="c2 was">천 이야기 없음</span>
        <div id="{p}-new2" class="c3 new2 disp h">낡은 플란넬<br><u>셔츠 천<i id="{p}-ul2" class="h"></i></u>을 감음</div></div>
      <div class="row r3"><b class="disp">③ 구두</b></div>"""
    D = f"""<div class="hd3">2월 5일 자 조서 · 바뀐 진술 <b class="disp">③</b></div>
      <div class="paper sm s1"><b class="disp">① 장갑</b><span>강 → 아궁이에서 태움</span></div>
      <div class="paper sm s2"><i class="am"></i><b class="disp">② 칼자루</b><span>낡은 플란넬 셔츠 천을 감음</span></div>
      <div class="paper band b3"><div class="it"><b class="disp">③</b><span class="disp">구두</span></div>
        <div class="ct"><span class="k2">2월 5일 자 조서</span><div class="old o3">가죽 구두</div>
          <div id="{p}-new3" class="new disp h">→ 고무 구두로 갈아 신음</div></div></div>"""
    im, icss, itw = record_insert(p, c[3], round(c[4] - c[3], 2), "assets/archive/kousai-p4-l20.png", (2798, 122),
                                  crop=(0.158, 0.948), underline=True, lean=9, tilt=1.2,
                                  caption="2월 5일 자 조서 속 그의 설명 — 고법 결정문 4쪽 20행",
                                  credit="후쿠오카고법 결정문(2017) · 조서 요약 부분", hide=f"#{p}-b2, #{p}-tg0")
    tagt = "도식 · 실제 조서 아님"
    markup = "\n".join([
        _board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B), im,
        _board(p, 3, c[4], c[5], C), _board(p, 4, c[5], c[6], D),
        _tag(p, 0, c[0], c[3], tagt), _tag(p, 1, c[4], c[6], tagt)])
    css = BASE_CSS + icss + f"""
    .k {{ display: block; font-size: 48px; opacity: .75; }}
    .doc {{ left: 96px; top: 140px; width: 800px; height: 750px; padding: 64px 70px; }}
    .doc b {{ display: block; font-weight: 400; font-size: 110px; line-height: 1.1; margin-top: 34px; }}
    .doc b.big {{ font-size: 230px; margin-top: 0; }}
    .doc em {{ position: absolute; left: 70px; right: 70px; bottom: 60px; font-style: normal; font-size: 48px; padding-top: 22px;
      border-top: 4px solid rgba(30,33,37,.5); }}
    .tln {{ position: absolute; left: 980px; top: 130px; width: 844px; height: 220px; }}
    .tln .ln {{ position: absolute; left: 18px; right: 18px; top: 38px; height: 4px; background: rgba(233,229,221,.6); }}
    .tln .nd {{ position: absolute; top: 22px; width: 36px; height: 36px; border-radius: 50%; border: 4px solid {INK}; background: #121316; }}
    .tln .nd.a {{ left: 0; }} .tln .nd.b {{ right: 0; background: {INK}; }}
    .tla, .tlb {{ position: absolute; top: 84px; }}
    .tla {{ left: 0; }} .tlb {{ right: 0; text-align: right; }}
    .tla b, .tlb b {{ display: block; font-weight: 400; font-size: 64px; line-height: 1; color: {INK}; }}
    .tla span, .tlb span {{ display: block; font-size: 48px; margin-top: 8px; color: rgba(233,229,221,.86); }}
    .frm {{ position: absolute; left: 980px; width: 844px; height: 150px; border: 4px solid rgba(233,229,221,.6); border-radius: 6px;
      transform-origin: left center; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }}
    .frm b {{ font-size: 88px; line-height: 1; font-weight: 400; color: {INK}; }}
    .frm span {{ font-size: 48px; color: rgba(233,229,221,.8); }}
    .hd3 {{ position: absolute; left: 96px; top: 136px; font-size: 52px; color: rgba(233,229,221,.9); }}
    .hd3 b {{ font-weight: 400; }}
    .band {{ left: 96px; width: 1728px; display: flex; align-items: center; }}
    .b1 {{ top: 226px; height: 510px; }} .b3 {{ top: 400px; height: 490px; }}
    .band .it {{ width: 400px; padding-left: 60px; display: flex; flex-direction: column; }}
    .band .it b {{ font-weight: 400; font-size: 110px; line-height: 1; }}
    .band .it span {{ font-size: 130px; line-height: 1.1; }}
    .band .ct {{ flex: 1; border-left: 4px solid rgba(30,33,37,.4); padding: 10px 0 10px 64px; }}
    .k2 {{ display: block; font-size: 46px; color: rgba(30,33,37,.7); margin-bottom: 6px; }}
    .k2.kb {{ margin-top: 40px; }}
    .old {{ position: relative; display: inline-block; font-size: 70px; line-height: 1.15; color: rgba(30,33,37,.68); }}
    .strike {{ position: absolute; left: -10px; right: -10px; top: 50%; height: 8px; background: {DARK}; transform-origin: left center; }}
    .new {{ font-size: 112px; line-height: 1.1; }}
    .o3 {{ color: {DARK}; font-size: 80px; }}
    .b3 .new {{ margin-top: 16px; font-size: 104px; }}
    .ghost {{ position: absolute; top: 760px; width: 856px; height: 120px; border: 4px solid rgba(233,229,221,.55); border-radius: 6px; opacity: .25;
      display: flex; align-items: center; padding-left: 36px; }}
    .ghost b {{ font-size: 72px; line-height: 1; font-weight: 400; color: {INK}; }}
    .mini {{ position: absolute; left: 96px; top: 400px; width: 560px; height: 200px; background: {PAPER}; color: {DARK}; opacity: .25;
      padding: 30px 40px; }}
    .mini b {{ display: block; font-weight: 400; font-size: 66px; }} .mini span {{ font-size: 48px; }}
    .link {{ position: absolute; left: 656px; top: 498px; width: 164px; height: 4px; background: rgba(233,229,221,.6); border-radius: 2px; }}
    .qc {{ left: 820px; top: 96px; width: 1004px; height: 794px; padding: 62px 76px; }}
    .qc > b {{ display: block; font-weight: 400; font-size: 96px; line-height: 1.1; margin-top: 30px; }}
    .qq {{ margin: 26px 0 0; height: 220px; border: 5px dashed rgba(30,33,37,.45); border-radius: 6px;
      display: flex; justify-content: center; align-items: center; gap: 40px; }}
    .qq i {{ font-style: normal; font-size: 170px; line-height: 1; color: rgba(30,33,37,.45); }}
    .qq b {{ font-weight: 400; font-size: 170px; line-height: 1; }}
    .qc em {{ position: absolute; left: 76px; right: 76px; bottom: 56px; font-style: normal; font-size: 48px; text-align: center; }}
    .chd {{ position: absolute; top: 210px; font-size: 48px; color: rgba(233,229,221,.85); }}
    .row {{ position: absolute; left: 96px; width: 1728px; display: flex; align-items: center; padding-left: 56px; }}
    .row b {{ font-weight: 400; width: 424px; flex: none; white-space: nowrap; }}
    .row .c2 {{ width: 440px; flex: none; }}
    .r1 {{ top: 280px; height: 110px; opacity: .25; }} .r1 b {{ font-size: 66px; }} .r1 span {{ font-size: 52px; }}
    .r2 {{ top: 410px; height: 300px; }}
    .r2 b {{ font-size: 88px; line-height: 1; }}
    .r2 .was {{ font-size: 52px; color: rgba(30,33,37,.66); }}
    .am {{ position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: {AMBER}; }}
    .new2 {{ font-size: 92px; line-height: 1.12; }}
    .new2 u {{ position: relative; text-decoration: none; }}
    .new2 u i {{ position: absolute; left: 0; right: 0; bottom: -6px; height: 12px; background: {AMBER}; transform-origin: left center; }}
    .r3 {{ top: 730px; height: 130px; border: 4px solid rgba(233,229,221,.55); border-radius: 6px; opacity: .25; }}
    .r3 b {{ font-size: 72px; color: {INK}; }}
    .sm {{ left: 96px; width: 1728px; height: 84px; display: flex; align-items: center; padding-left: 50px; opacity: .25; box-shadow: none; }}
    .sm b {{ font-weight: 400; font-size: 56px; width: 360px; }} .sm span {{ font-size: 50px; }}
    .s1 {{ top: 214px; }} .s2 {{ top: 308px; }}
    .s2 .am {{ width: 12px; }}
"""
    tw = [
        _grow(f"#{p}-f1", q[1] + 0.1, 0.4, "X", "power3.out"),
        _grow(f"#{p}-f2", q[1] + 0.35, 0.4, "X", "power3.out"),
        _grow(f"#{p}-f3", q[1] + 0.6, 0.4, "X", "power3.out"),
        _grow(f"#{p}-strike", q[2] + 0.85, 0.35, "X", "power2.out"),
        _slide(f"#{p}-new1", q[2] + 1.4, -36),
        _fade(f"#{p}-qn", q[3] + 0.55, 0.4),
        itw,
        _slide(f"#{p}-new2", q[5] + 0.6, -36),
        _grow(f"#{p}-ul2", q[5] + 1.5, 0.5, "X", "power2.out"),
        _slide(f"#{p}-new3", q[6] + 1.1, -36),
    ]
    return wrap(sid, dur, css, markup, _script(sid, tw))


# ============================================================================ shared parts for the other 17 boards

def _d(x, y, inner="", cls="", w=None, h=None, id=None, st=""):
    """An absolutely placed block (frame px)."""
    s = f"left:{x}px;top:{y}px;" + (f"width:{w}px;" if w else "") + (f"height:{h}px;" if h else "") + st
    i = f' id="{id}"' if id else ""
    c = cls if "paper" in cls.split() else ("abs " + cls).strip()
    return f'<div{i} class="{c}" style="{s}">{inner}</div>'


def _t(text, fs, st="", id=None, cls=""):
    """Display line (Black Han Sans)."""
    i = f' id="{id}"' if id else ""
    return f'<b{i} class="disp t {cls}" style="font-size:{fs}px;{st}">{text}</b>'


def _s(text, fs, st="", id=None, cls=""):
    """Body line (Gothic A1)."""
    i = f' id="{id}"' if id else ""
    return f'<span{i} class="s {cls}" style="font-size:{fs}px;{st}">{text}</span>'


def _ln(x, y, w, id=None, cls="", st=""):
    return _d(x, y, "", ("ln " + cls).strip(), w=w, id=id, st=st)


def _lv(x, y, h, id=None, cls="", st=""):
    return _d(x, y, "", ("lv " + cls).strip(), h=h, id=id, st=st)


def _node(cx, cy, r, cls="", id=None):
    return _d(cx - r, cy - r, "", ("nd " + cls).strip(), w=2 * r, h=2 * r, id=id)


def _person(x, y, w, h, cls="", id=None, dim=False):
    return _d(x, y, person_card(w, h, sw=4), cls + (" dim" if dim else ""), id=id)


KNIFE_PTS = "9,0 20,0 20,0.22 15.05,2.2 9,2.2"   # blade 11 (cm) long, 2.2 wide, width 1.5 at 3.2 / 2.1 at 4.7 from the tip (F65 F137 F138)


def _knife(w, stroke=INK):
    """Kiridashi silhouette, blade to the right (same ratio as knife.js; handle length is not in the record → not dimensioned)."""
    h = round(w * 2.6 / 20.6)
    return (f'<svg width="{w}" height="{h}" viewBox="-0.2 -0.2 20.6 2.6">'
            f'<rect x="0" y="-0.05" width="9" height="2.3" rx="0.35" fill="rgba(233,229,221,.06)" stroke="{stroke}" stroke-width="0.1"/>'
            f'<polygon points="{KNIFE_PTS}" fill="rgba(233,229,221,.22)" stroke="{stroke}" stroke-width="0.1" stroke-linejoin="round"/></svg>')


def _shirt(w, left="solid", body="solid", amber_left=False):
    """Plain sports-shirt outline (no pattern, no piece borders — those are not in the record). The wearer's left sleeve is
    on the viewer's right (laid face up). left/body: 'solid' (paper fill) | 'line' (outline only) | 'dash' (dashed gap)."""
    h = round(w * 560 / 600)

    def part(d, mode, am=False):
        col = AMBER if am else INK
        if mode == "solid":
            return f'<path d="{d}" fill="{PAPER}" stroke="#0E0F11" stroke-width="5" stroke-linejoin="round"/>'
        if mode == "dash":
            return (f'<path d="{d}" fill="none" stroke="{col}" stroke-width="7" stroke-dasharray="20 14" '
                    f'stroke-linejoin="round" stroke-linecap="round"/>')
        return f'<path d="{d}" fill="none" stroke="rgba(233,229,221,.7)" stroke-width="5" stroke-linejoin="round"/>'
    bd = "M200,60 L262,40 Q300,78 338,40 L400,60 L430,110 L430,540 L170,540 L170,110 Z"
    sr = "M200,60 L170,110 L170,218 L122,292 L52,246 Z"      # wearer's right sleeve (viewer's left)
    sl = "M400,60 L430,110 L430,218 L478,292 L548,246 Z"      # wearer's left sleeve (viewer's right)
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 600 560">' + part(bd, body) + part(sr, body)
            + part(sl, left, amber_left) + '</svg>')


DCSS = f"""
    .t {{ display: block; font-weight: 400; line-height: 1.06; }}
    .s {{ display: block; line-height: 1.25; }}
    .k {{ display: block; font-size: 48px; line-height: 1.2; color: rgba(30,33,37,.72); }}
    .kd {{ display: block; font-size: 48px; line-height: 1.2; color: rgba(233,229,221,.84); }}
    .ink {{ color: {INK}; }} .amt {{ color: {AMBER}; }} .drk {{ color: {DARK}; }}
    .ln {{ position: absolute; height: 5px; background: rgba(233,229,221,.62); border-radius: 3px; transform-origin: left center; }}
    .lv {{ position: absolute; width: 5px; background: rgba(233,229,221,.62); border-radius: 3px; transform-origin: center top; }}
    .ln.am, .lv.am {{ background: {AMBER}; }}
    .nd {{ position: absolute; border-radius: 50%; border: 6px solid {INK}; background: #121316; }}
    .nd.on {{ background: {INK}; }}
    .nd.am {{ border-color: {AMBER}; border-width: 10px; }}
    .nd.amf {{ border-color: {AMBER}; background: {AMBER}; }}
    .dc {{ position: absolute; border: 6px dashed rgba(233,229,221,.78); border-radius: 8px; }}
    .dc.am {{ border-color: {AMBER}; }}
    .dc.dk {{ border-color: rgba(30,33,37,.5); }}
    .amb {{ position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: {AMBER}; }}
    .dim {{ opacity: .25; }}
    .gr {{ position: absolute; border: 4px solid rgba(233,229,221,.55); border-radius: 6px; opacity: .25; }}
    .seal {{ position: absolute; border: 10px solid {INK}; border-radius: 14px; color: {INK}; text-align: center; transform: rotate(-4deg); }}
    .seal.dk {{ border-color: {DARK}; color: {DARK}; }}
    .pad {{ padding: 52px 70px; }}
    .ctr {{ display: flex; flex-direction: column; justify-content: center; }}
    .row {{ display: flex; align-items: center; }}
    .lab b {{ font-weight: 400; }}
    .tick {{ position: absolute; width: 5px; height: 34px; background: rgba(233,229,221,.7); }}
    .q {{ font-family: "Black Han Sans", sans-serif; font-weight: 400; }}
    .q i {{ font-style: normal; color: rgba(30,33,37,.42); }}
"""


def _scene(sid, dur, boards, tags, tw, css="", extra=()):
    """boards: [(t0, t1, html)], tags: [(t0, t1, text)] → composition."""
    markup = [_board(sid, n, a, b, h) for n, (a, b, h) in enumerate(boards)]
    markup += list(extra)
    markup += [_tag(sid, n, a, b, txt) for n, (a, b, txt) in enumerate(tags)]
    return wrap(sid, dur, BASE_CSS + DCSS + css, "\n".join(markup), _script(sid, [x for x in tw if x]))


# ============================================================================ mikan_question (SHOTS 12)

def mikan_question(sid, dur, q):
    """▶c1 board A question card (paper, 60 %) — c2 the quoted question lands in its box / ▶c3 re-frame: the card goes
    small to the top right, the mikan node (amber hollow ring, the scene's focus) big on the left, a line reaches the card /
    ▶c4 board B the verdict card "확정 판결 · 폴리그래프 반응" — c5 a line to "자백을 믿을 사정" (linked to the reaction as a
    whole, not to the mikan question: F216) / ▶c6 board C outline person card "자백한 뒤에도" — c7 his statement.
    F45 F11 F95 F215 F216 F51."""
    c = _cuts(q, dur, [2, 3, 5])
    p = sid
    A = (_d(160, 120, _s("폴리그래프 검사에서 나온 질문", 50, cls="k")
            + _t("질문 하나", 120, "margin-top:18px")
            + _d(70, 330, _t("피해자 집 고타츠에<br>귤이 있었다", 92, "line-height:1.12", id=f"{p}-qq", cls="h"),
                 "dc dk ctr", w=1460, h=330, st="padding-left:64px"),
            "paper", w=1600, h=760, st="padding:56px 70px"))
    A2 = (_d(1150, 110, _s("폴리그래프 질문", 46, cls="k") + _t("고타츠에<br>귤이 있었다", 82, "margin-top:10px;line-height:1.1"),
             "paper", w=674, h=330, st="padding:36px 48px")
          + _node(470, 500, 250, "am")
          + _d(220, 340, _t("귤", 230, "text-align:center;width:500px", cls="ink"), "", w=500)
          + _d(270, 610, _s("망 속 19개", 58, "text-align:center;width:400px", cls="ink"), "", w=400)
          + _ln(700, 352, 452, id=f"{p}-lk", st="transform:rotate(-6deg);transform-origin:left center")
          + _d(780, 790, '<b class="disp" style="font-size:60px">발견 당시</b> · 고타츠 남동쪽 구석', "lab", st="font-size:50px"))
    B = (_d(96, 140, _s("확정 판결이 든 것", 50, cls="k") + _t("폴리그래프<br>반응", 150, "margin-top:26px;line-height:1.08")
            + _s("질문에 특이 반응을 보였다", 52, "margin-top:40px;color:rgba(30,33,37,.8)"),
            "paper", w=980, h=700, st="padding:60px 70px")
         + _ln(1076, 488, 140, id=f"{p}-l2")
         + _d(1216, 330, _s("판결이 둔 자리", 48, cls="kd") + _t("자백을<br>믿을 사정", 120, "margin-top:14px;line-height:1.1", cls="ink"),
              "", w=640, id=f"{p}-why", st="opacity:0"))
    C = (_person(120, 150, 520, 650)
         + _d(120, 818, '<b class="disp" style="font-size:52px">자백한 뒤에도</b>', "lab", st="padding:6px 26px 8px")
         + _d(760, 150, _s("2월 6일 검사 조서 · 그의 진술", 48, cls="k")
              + _d(0, 0, _s("검사가 물은 것", 50, "margin-top:34px;color:rgba(30,33,37,.8)")
                   + _t("고타츠 위에 있던 물건", 82, "margin-top:8px"), "", st="position:relative")
              + _t("→ 알아차리지 못했다", 104, "margin-top:56px", id=f"{p}-ans", cls="h"),
              "paper", w=1064, h=650, st="padding:56px 66px"))
    tw = [_pop(f"#{p}-qq", q[1] + 0.15, 1.08, 0.3),
          _grow(f"#{p}-lk", q[2] + 0.4, 0.5, "X", "power2.out"),
          _grow(f"#{p}-l2", q[4] + 0.15, 0.45, "X", "power2.out"),
          _slide(f"#{p}-why", q[4] + 0.5, -30),
          _slide(f"#{p}-ans", q[6] + 1.2, -36)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], C)],
                  [(0, c[2], "도식"), (c[2], c[4], "도식 · 실제 조서 아님")], tw)


# ============================================================================ confession_day (SHOTS 16)

def confession_day(sid, dur, q):
    """One day on a time axis 10:00 → 23:03 (1985-01-20). ▶c1 axis + 10:40 node "자백" (amber, the scene's one focus), 10:00
    visit dim / ▶c2 re-frame: the knife silhouette 40 %+, "칼 제출 · 흉기로" / ▶c3 the whole axis, 23:03 "살인 혐의로 체포" /
    ▶c4 board B warrant form, a line leaves the 자백 node and reaches its "근거" field / ▶c5 board C the 13-day strip, "13일째" /
    ▶c6 an empty board: the dashed outline of the statement card (Q2). F59 F60 F61 F62 F63 F36."""
    c = _cuts(q, dur, [1, 2, 3, 4, 5])
    p = sid
    X0, X1 = 150, 1770

    def ax(hh, mm):
        return round(X0 + ((hh - 10) * 60 + mm) / (13 * 60 + 3) * (X1 - X0))
    axis = (_ln(X0, 700, X1 - X0, st="height:6px;background:rgba(233,229,221,.5)")
            + "".join(f'<i class="tick" style="left:{ax(h, 0) - 2}px;top:684px"></i>'
                      f'<span class="abs xl" style="left:{ax(h, 0)}px;top:736px">{h}시</span>' for h in (15, 18, 21)))
    A = (f'<div class="hd">1985년 1월 20일 · 그의 집</div>' + axis
         + _node(ax(10, 0), 703, 20, "dim") + _d(ax(10, 0) - 30, 750, _s("10:00 경찰 방문", 46, cls="ink"), "dim")
         + _node(ax(10, 40), 703, 34, "amf")
         + _lv(ax(10, 40) - 2, 530, 140, st="background:{0}".format(AMBER))
         + _d(ax(10, 40) - 130, 230, _s("오전 10시 40분 무렵", 52, cls="k") + _t("자백", 200, "margin-top:4px"),
              "paper", w=760, h=300, st="padding:34px 56px")
         + _node(ax(23, 3), 703, 20) + _d(ax(23, 3) - 190, 600, _s("23:03", 50, "text-align:right;width:190px", cls="ink"), ""))
    A2 = (_d(96, 130, '<b class="disp" style="font-size:56px">10:40 자백</b> 그날', "lab", st="font-size:50px")
          + _d(130, 330, _knife(1660), "", w=1660)
          + _d(96, 640, _t("칼 한 자루 제출", 120, cls="ink") + _s("그가 흉기라며 경찰에 · 작업장에 있던 기리다시 고가타나", 50,
               "margin-top:18px;color:rgba(233,229,221,.86)"), "", w=1728))
    B = (f'<div class="hd" style="top:200px">1985년 1월 20일</div>' + axis
         + _node(ax(10, 0), 703, 20, "dim") + _node(ax(10, 40), 703, 34, "amf")
         + _d(ax(10, 40) - 60, 770, '<b class="disp" style="font-size:52px">10:40 자백</b>', "lab", st="padding:6px 24px 8px")
         + _ln(ax(10, 40), 690, ax(23, 3) - ax(10, 40), st="height:30px;top:688px;background:rgba(233,229,221,.18)")
         + _node(ax(23, 3), 703, 34, "on")
         + _lv(ax(23, 3) - 2, 560, 110)
         + _d(830, 120, _s("그날 밤 11시 3분", 52, cls="k") + _t("살인 혐의로<br>체포", 132, "margin-top:8px;line-height:1.08"),
              "paper", w=980, h=440, st="padding:40px 56px"))
    Bf = (_node(250, 500, 64, "amf")
          + _d(130, 600, '<b class="disp" style="font-size:66px">자백</b>', "lab", st="padding:8px 30px 10px")
          + _d(140, 690, _s("1월 20일 10:40", 48, cls="ink"), "")
          + _ln(320, 497, 560, id=f"{p}-lk", cls="am", st="height:6px")
          + _d(880, 110, _s("1월 20일 밤 · 경찰이 청구", 48, cls="k") + _t("체포영장", 150, "margin-top:10px;letter-spacing:.04em")
               + _d(0, 0, _s("근거(소명 자료)", 48, "color:rgba(30,33,37,.72)") + _t("그날의 자백", 104, "margin-top:6px", id=f"{p}-gr", cls="h"),
                    "", st="position:relative;margin-top:60px;padding-top:24px;border-top:4px dashed rgba(30,33,37,.4)"),
               "paper", w=944, h=760, st="padding:56px 64px"))
    cells = []
    for k, d in enumerate(range(8, 21)):
        x = 96 + k * 134
        worked = d in (8, 9, 10, 12, 13, 14, 18, 19, 20)
        if d == 20:
            inner = f'<i class="fl" style="background:{PAPER}"><b class="disp">{d}</b><em>자백</em></i>'
        elif worked:
            inner = f'<i class="fl" style="background:rgba(217,213,204,.32)"><b class="disp">{d}</b></i>'
        else:
            inner = f'<b class="disp nb">{d}</b>'
        cells.append(f'<div class="col" style="left:{x}px">{inner}</div>')
    D = (f'<div class="hd" style="left:96px">처음 조사받은 1월 8일부터</div>' + "".join(cells)
         + _d(96, 520, _t("13일째", 230, "line-height:1"), "paper ctr", w=1728, h=330, st="padding-left:80px")
         + _d(1100, 600, _s("1월 20일 · 자백한 날", 56, "text-align:right;width:640px", cls="drk"), ""))
    E = (_d(510, 150, _s("1월 20일 · 첫 자백 조서", 54, "text-align:center", cls="ink")
            + _t("?", 300, "text-align:center;margin-top:30px", cls="ink"), "dc ctr", w=900, h=700,
            st="justify-content:flex-start;padding-top:70px"))
    css = f"""
    .hd {{ position: absolute; left: 150px; top: 130px; font-size: 54px; color: rgba(233,229,221,.9); }}
    .xl {{ font-size: 46px; color: rgba(233,229,221,.7); transform: translateX(-50%); }}
    .col {{ position: absolute; top: 230px; width: 122px; height: 230px; border: 3px solid rgba(233,229,221,.5); border-radius: 6px; overflow: hidden; }}
    .col .fl {{ position: absolute; inset: -3px; font-style: normal; }}
    .col b {{ position: absolute; left: 0; right: 0; top: 24px; text-align: center; font-size: 72px; line-height: 1; font-weight: 400; color: {DARK}; }}
    .col b.nb {{ color: rgba(233,229,221,.8); }}
    .col em {{ position: absolute; left: 0; right: 0; bottom: 22px; text-align: center; font-style: normal; font-size: 48px; color: {DARK}; }}
"""
    tw = [_grow(f"#{p}-lk", q[3] + 0.4, 0.6, "X", "power2.out"),
          _pop(f"#{p}-gr", q[3] + 1.0, 1.1, 0.3)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], Bf), (c[4], c[5], D), (c[5], c[6], E)],
                  [(0, c[3], "도식"), (c[3], c[4], "도식 · 실제 영장 아님"), (c[4], dur, "도식")], tw, css)


# ============================================================================ first_story (SHOTS 18)

def first_story(sid, dur, q):
    """Statement cards (도식 · 실제 조서 아님). ▶c1 board A the 1/20 card with its two item slots — c2 row ① "장갑 → 강에 던져
    버림" (amber bar: the scene's focus) / ▶c3 re-frame: row ② big "칼 → 씻은 뒤 · 이 빠진 세 곳을 숫돌로" / ▶c4 board B the
    1/31 card on the right, a 1/20 → 1/31 date rail on the left — c5 the quote. F67 F68 F69 (X05: no cloth yet)."""
    c = _cuts(q, dur, [2, 3])
    p = sid
    A = (_d(96, 110, _s("경찰 조서", 48, cls="k") + _t("1월 20일 · 첫 자백 조서", 104, "margin-top:8px"),
            "paper", w=1728, h=780, st="padding:52px 70px")
         + _d(166, 400, '<i class="amb"></i>' + _t("① 장갑", 84, "width:330px;flex:none")
              + _t("다리에서 강에 던져 버림", 92, id=f"{p}-r1", cls="h"),
              "row", w=1588, h=190, st="padding-left:52px;border-top:4px solid rgba(30,33,37,.35)")
         + _d(166, 600, _t("② 칼", 84, "width:330px;flex:none;color:rgba(30,33,37,.5)"),
              "row", w=1588, h=190, st="padding-left:52px;border-top:4px solid rgba(30,33,37,.35)"))
    A2 = (_d(96, 120, '<i class="amb" style="width:12px"></i>' + _t("① 장갑", 56, "width:300px") + _s("다리에서 강에 던져 버림", 52),
             "paper row dim", w=1728, h=110, st="padding-left:50px;box-shadow:none")
          + _d(96, 270, _s("1월 20일 · 첫 자백 조서", 48, cls="k") + _t("② 칼", 150, "margin-top:6px")
               + _t("씻은 뒤,", 96, "margin-top:28px") + _t("이 빠진 세 곳을 숫돌로 갈았다", 96, "margin-top:6px"),
               "paper", w=1728, h=620, st="padding:46px 70px"))
    B = (_lv(214, 230, 470, st="background:rgba(233,229,221,.4)")
         + _node(216, 230, 22, "dim") + _d(120, 140, _s("1월 20일", 50, cls="ink"), "dim")
         + _node(216, 700, 30, "on") + _d(270, 676, _t("1월 31일", 60, cls="ink"), "")
         + _d(620, 110, _s("경찰 조서", 48, cls="k") + _t("1월 31일 조서", 120, "margin-top:8px")
              + _d(0, 0, _t("수세미로 칼자루와<br>날의 피를 씻어 냈다", 96, "line-height:1.16"), "dc dk",
                   st="position:relative;margin-top:50px;padding:34px 44px", id=f"{p}-qt"),
              "paper", w=1204, h=780, st="padding:52px 66px"))
    tw = [_slide(f"#{p}-r1", q[1] + 0.25, -36),
          f'    tl.fromTo("#{p}-qt b", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, {round(q[4] + 0.2, 2)});']
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B)], [(0, dur, "도식 · 실제 조서 아님")], tw)


# ============================================================================ cloth_story (SHOTS 21)

def cloth_story(sid, dur, q):
    """▶c1 record 3 s: [2] p.15 l.20~21 strip (the cloth size in the statement) / c2 board A the cloth band (no pattern;
    도식 · 실제 천 아님) with 30cm × 3cm dimension lines, the knife silhouette apart (no winding drawn), "자루와 날 사이 · 대여섯 번" /
    ▶c3 the quote "피가 자루에 묻지 않게" full frame / ▶c4 board B band → "아궁이에서 태움(조서)" / ▶c5 re-frame: the band big
    and dashed amber (the scene's focus) "조서대로라면 → 재" / ▶c6 board C the 2/9 blood test reply — c7 "피 확인되지 않음".
    F77 F78 F79 F76 F80 F71 F72."""
    c = _cuts(q, dur, [1, 2, 3, 4, 5])
    p = sid
    im, icss, itw = record_insert(p, 0.0, c[1], "assets/archive/kousai-p15-l20.png", (2651, 264),
                                  focus=(0.37, 0.25, 0.26), lean=10, tilt=-1.2,
                                  caption="「길이 30cm, 폭 3cm 정도로 손으로 찢어…」 — 2월 5일 경찰 조서의 요약",
                                  credit="후쿠오카고법 결정문(2017) · 조서 요약 부분")
    A = (_d(140, 250, "", "", w=1400, h=140, st=f"background:#9C988F;border-radius:4px")
         + _ln(140, 196, 1400, st="height:4px") + '<i class="tick" style="left:138px;top:180px"></i><i class="tick" style="left:1537px;top:180px"></i>'
         + _d(590, 110, _t("길이 30cm", 66, "text-align:center;width:500px;white-space:nowrap", cls="ink"), "", w=500)
         + _lv(1580, 250, 140, st="width:4px") + _d(1606, 282, _t("폭 3cm", 60, "white-space:nowrap", cls="ink"), "")
         + _d(160, 430, _s("셔츠를 손으로 찢은 천 · 조서", 48, cls="ink"), "")
         + _d(1010, 560, _knife(780), "", id=f"{p}-kn", st="opacity:0")
         + _d(160, 580, '<b class="disp" style="font-size:64px">자루와 날 사이</b><br>대여섯 번 감았다(조서)', "lab", id=f"{p}-wl",
              st="opacity:0;font-size:54px;line-height:1.35;padding:20px 34px 22px"))
    A2 = (_d(96, 150, _s("2월 5일 자 경찰 조서 · 그 이유", 52, cls="k") + _t("“피가 자루에<br>묻지 않게”", 196, "margin-top:36px;line-height:1.1"),
              "paper", w=1728, h=720, st="padding:64px 80px"))
    B = (_d(96, 220, "", "", w=700, h=70, st="background:#9C988F;border-radius:4px")
         + _d(96, 310, _s("천 띠 · 조서", 48, cls="ink"), "")
         + _ln(830, 252, 210, id=f"{p}-ar")
         + _d(1080, 120, _s("2월 5일 자 경찰 조서", 48, cls="k") + _t("장갑과 함께", 96, "margin-top:20px")
              + _t("아궁이에서<br>태웠다", 150, "margin-top:14px;line-height:1.08"),
              "paper", w=744, h=760, st="padding:52px 60px"))
    B2 = (_d(96, 230, "", "dc am", w=1728, h=200)
          + _d(96, 470, _s("조서대로라면", 64, cls="ink") + _t("→ 이미 재", 190, "margin-top:12px", cls="ink"), "", w=1728))
    C = (_d(96, 110, _s("1985년 2월 9일 · 과학수사연구소 회답", 50, cls="k") + _t("칼 혈액 감정", 150, "margin-top:12px")
            + _d(0, 0, _knife(880, DARK), "", st="position:relative;margin-top:44px;opacity:.85"),
            "paper", w=1100, h=780, st="padding:56px 70px")
         + _d(1250, 300, _t("피", 150, "line-height:1") + _t("확인되지<br>않음", 96, "margin-top:16px;line-height:1.1"),
              "seal ctr", w=520, h=420, id=f"{p}-st", st="opacity:0;padding:20px"))
    tw = [itw,
          _fade(f"#{p}-kn", q[1] + 0.2, 0.3),
          _slide(f"#{p}-wl", q[1] + 1.2, -30),
          _grow(f"#{p}-ar", q[3] + 0.3, 0.4, "X", "power2.out"),
          _pop(f"#{p}-st", q[6] + 0.3, 1.2, 0.3)]
    return _scene(sid, dur, [(c[1], c[2], A), (c[2], c[3], A2), (c[3], c[4], B), (c[4], c[5], B2), (c[5], c[6], C)],
                  [(c[1], c[5], "도식 · 실제 천 아님"), (c[5], dur, "도식")], tw, icss, extra=[im])


# ============================================================================ verdict_basis (SHOTS 24)

def verdict_basis(sid, dur, q):
    """The 1986 judgment's reasons as a ledger, one row enlarged at a time (no three-card line-up).
    ▶c1 board A the judgment card / ▶c2 board B row ① big — c3 a small flow 부엌 창 밖 등유통 → 꽁치 깡통 / ▶c4 re-frame: row ②
    big / ▶c5 board C ①② bracket → '비밀의 폭로' (amber, the scene's focus) / ▶c6 re-frame: the term on top, its meaning big /
    ▶c7 board D the whole ledger, ③ 폴리그래프 특이 반응. F91 F92 F93 F94 F211 F95."""
    c = _cuts(q, dur, [1, 3, 4, 5, 6])
    p = sid
    A = _d(96, 130, _s("1986년 12월 22일 · 구마모토지법 판결", 54, cls="k") + _t("자백을<br>믿은 이유", 210, "margin-top:34px;line-height:1.05"),
           "paper", w=1728, h=740, st="padding:64px 84px")
    B = (_d(96, 136, _s("판결이 든 이유", 48, cls="kd"), "")
         + _d(96, 210, _t("①", 130, "width:200px;flex:none") + _d(0, 0, _s("태웠다는 구두의", 66) + _t("금속 부품이 나왔다", 120, "margin-top:8px"), "", st="position:relative"),
              "paper row", w=1728, h=360, st="padding-left:70px")
         + _d(96, 640, _t("부엌 창 밖 등유통", 66, cls="ink"), "", id=f"{p}-f1", st="opacity:0")
         + _ln(730, 677, 230, id=f"{p}-fa")
         + _d(1000, 640, _t("꽁치 깡통 안", 66, cls="ink"), "", id=f"{p}-f2", st="opacity:0")
         + _d(96, 740, _s("그의 집 · 판결이 적은 발견 장소", 46, "color:rgba(233,229,221,.75)"), "", id=f"{p}-f3", st="opacity:0"))
    B2 = (_d(96, 120, _t("①", 56, "width:110px") + _s("태웠다는 구두의 금속 부품이 나왔다", 52), "paper row dim", w=1728, h=110, st="padding-left:50px;box-shadow:none")
          + _d(96, 290, _t("②", 130, "width:200px;flex:none") + _d(0, 0, _t("어느 집 거실에", 110) + _t("불이 켜져 있었다", 110, "margin-top:6px")
               + _s("그의 진술", 52, "margin-top:20px;color:rgba(30,33,37,.75)"), "", st="position:relative"),
               "paper row", w=1728, h=560, st="padding-left:70px"))
    C = (_d(96, 230, _t("①", 54, "width:90px") + _s("구두의 금속 부품", 50), "paper row", w=760, h=130, st="padding-left:40px")
         + _d(96, 400, _t("②", 54, "width:90px") + _s("거실의 불빛(진술)", 50), "paper row", w=760, h=130, st="padding-left:40px")
         + _d(880, 230, "", "", w=40, h=300, st=f"border:6px solid {INK};border-left:none;border-radius:0 14px 14px 0")
         + _ln(926, 378, 60)
         + _d(1010, 200, _s("판결이 붙인 이름", 52, cls="kd") + _t("‘비밀의<br>폭로’", 200, "margin-top:20px;line-height:1.05", cls="amt"), "", w=860)
         + _d(96, 620, _s("1986년 판결", 48, cls="kd"), ""))
    C2 = (_d(96, 120, _t("‘비밀의 폭로’", 96, cls="amt"), "")
          + _d(96, 300, _t("수사관도 몰랐던 사실을", 112) + _t("그가 먼저 말했다", 112, "margin-top:20px")
               + _s("판결의 설명 · ② 거실 불빛을 두고", 50, "margin-top:40px;color:rgba(30,33,37,.75)"),
               "paper", w=1728, h=560, st="padding:62px 80px"))
    D = (_d(96, 120, _t("①", 56, "width:110px") + _s("구두의 금속 부품", 52), "paper row dim", w=1728, h=110, st="padding-left:50px;box-shadow:none")
         + _d(96, 250, _t("②", 56, "width:110px") + _s("거실의 불빛(진술)", 52), "paper row dim", w=1728, h=110, st="padding-left:50px;box-shadow:none")
         + _d(96, 410, _t("③", 130, "width:200px;flex:none") + _d(0, 0, _t("폴리그래프", 120) + _t("특이 반응", 120, "margin-top:6px"), "", st="position:relative"),
              "paper row", w=1728, h=470, st="padding-left:70px"))
    tw = [_fade(f"#{p}-f1", q[2] + 0.2, 0.3), _grow(f"#{p}-fa", q[2] + 0.6, 0.4, "X", "power2.out"),
          _fade(f"#{p}-f2", q[2] + 1.0, 0.3), _fade(f"#{p}-f3", q[2] + 1.4, 0.3)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], B), (c[2], c[3], B2), (c[3], c[4], C), (c[4], c[5], C2), (c[5], c[6], D)],
                  [(0, dur, "도식")], tw)


# ============================================================================ prison_years (SHOTS 26)

def prison_years(sid, dur, q):
    """▶c1 board A a 12-year bar (one cell per year; no start date is drawn — the record gives only the length) "12년 남짓 구금" —
    c2 the last 9 cells change tone "약 9년 · 형 복역" / ▶c3 re-frame: the end of 1999 big — 3/25 가석방, c4 7/22 형기 종료 /
    ▶c5 board B the dashed amber "?" card (what shook the verdict). F102 F100 F101."""
    c = _cuts(q, dur, [2, 4])
    p = sid
    n, x0, w, g = 12, 96, 1728, 10
    cw = (w - g * (n - 1)) / n
    cells = "".join(f'<i class="yc{" sv" if k >= 3 else ""}" style="left:{round(x0 + k * (cw + g), 1)}px;width:{round(cw, 1)}px">'
                    f'<i class="f"></i></i>' for k in range(n))
    A = (_d(96, 130, _s("1986년 판결 뒤", 52, cls="kd") + _t("12년 남짓 구금", 130, "margin-top:10px", cls="ink"), "")
         + f'<div id="{p}-bar" class="abs" style="left:0;top:420px;width:1920px;height:260px">{cells}</div>'
         + _d(96, 700, _s("한 칸 = 1년", 46, "color:rgba(233,229,221,.72)"), "")
         + _d(x0 + 3 * (cw + g), 700, _t("약 9년 · 형 복역", 72, cls="ink"), "", id=f"{p}-sv", st="opacity:0"))
    A2 = (_d(0, 300, "", "", w=430, h=200, st="background:rgba(217,213,204,.55)")
          + _ln(430, 398, 1390, st="height:6px;background:rgba(233,229,221,.5)")
          + _node(430, 400, 34, "on") + _node(1500, 400, 34, "", id=f"{p}-n2")
          + _d(96, 150, _s("1999년", 56, cls="kd"), "")
          + _d(250, 500, _s("3월 25일", 56, cls="k") + _t("가석방", 150, "margin-top:4px"), "paper", w=700, h=330, st="padding:40px 56px")
          + _d(1050, 500, _s("7월 22일", 56, cls="k") + _t("형기 종료", 130, "margin-top:4px"), "paper", w=774, h=330, id=f"{p}-c2",
               st="padding:40px 56px;opacity:0"))
    B = (_d(510, 140, _t("?", 380, "text-align:center;line-height:1", cls="amt") + _s("이 판결을 흔든 것", 64, "text-align:center;margin-top:30px", cls="ink"),
            "dc am ctr", w=900, h=700))
    css = f"""
    .yc {{ position: absolute; top: 0; height: 260px; background: {PAPER}; border-radius: 3px; overflow: hidden; }}
    .yc .f {{ position: absolute; inset: 0; background: #8E8A82; opacity: 0; }}
"""
    tw = [_stagger(f"#{p}-bar .yc.sv .f", q[1] + 0.2, 0.07, 0.15),
          _fade(f"#{p}-sv", q[1] + 0.6, 0.3),
          _fade(f"#{p}-n2", q[3] + 0.2, 0.2), _slide(f"#{p}-c2", q[3] + 0.25, -30)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B)], [(0, dur, "도식")], tw, css)


# ============================================================================ seizure_dates (SHOTS 29)

def seizure_dates(sid, dur, q):
    """Seizure time line 1/21 → 2/14 and the shirt outline (plain, no pattern or piece borders: not in the record).
    ▶c1 board A axis + empty shirt outline / ▶c2 re-frame: 1/21 node big, "가족이 냄 · 3조각" / ▶c3 re-frame: 2/5 node big, the
    27×34cm piece to scale / ▶c4 board B the shirt big, the wearer's left sleeve a dashed amber gap (the scene's focus)
    "어깨부터 없음" / ▶c5 board C statement card "그 왼소매를 칼에 감았다" / ▶c6 re-frame: "'왼소매를 태웠다' · 2/6 조서".
    F106 F108 F109 F110 F01."""
    c = _cuts(q, dur, [1, 2, 3, 4, 5])
    p = sid
    X0, X1 = 140, 1100

    def ax(day):   # day of year 1985 (1/21 = 21, 2/14 = 45)
        return round(X0 + (day - 21) / 24 * (X1 - X0))
    marks = [(21, "1/21"), (36, "2/5"), (37, "2/6"), (45, "2/14")]
    axis = (_ln(X0, 520, X1 - X0, st="height:6px;background:rgba(233,229,221,.5)")
            + "".join(_node(ax(d), 523, 22) for d, _ in marks)
            + "".join(_d(ax(d) - (110 if t == "2/5" else 0 if t == "2/6" else 60), 570,
                         _t(t, 60, "white-space:nowrap", cls="ink"), "") for d, t in marks))
    A = (_d(140, 140, _s("1985년", 52, cls="kd") + _t("셔츠 천이 압수된 날", 96, "margin-top:6px", cls="ink"), "")
         + axis
         + _d(1220, 230, _shirt(600, "line", "line"), "")
         + _d(1220, 820, _s("셔츠 한 벌 · 그의 작업장", 46, "color:rgba(233,229,221,.75);text-align:center;width:600px"), ""))
    A2 = (_d(96, 130, _t("1월 21일", 150) + _s("가족이 냄 · 작업장에 있던 셔츠 천", 60, "margin-top:30px"),
             "paper", w=1100, h=740, st="padding:60px 70px")
          + _d(1290, 150, _t("3", 520, "line-height:1;text-align:center", cls="ink") + _t("조각", 110, "text-align:center", cls="ink"), "", w=520))
    A3 = (_d(96, 130, _s("2월 5일 · 수색", 60, cls="kd") + _t("1조각", 200, "margin-top:10px", cls="ink")
             + _s("살색 바탕 · 빨강·갈색 체크(기록)", 50, "margin-top:30px;color:rgba(233,229,221,.8)"), "", w=900)
          + _d(1060, 150, "", "", w=540, h=680, st=f"background:{PAPER}")
          + _ln(1060, 866, 540, st="height:4px") + _d(1230, 880, _t("약 27cm", 56, "white-space:nowrap", cls="ink"), "")
          + _lv(1636, 150, 680, st="width:4px") + _d(1664, 440, _t("약<br>34cm", 60, cls="ink"), ""))
    B = (_d(96, 120, _s("2월 6일 · 4조각을 맞춰 보니", 56, cls="kd"), "")
         + _d(260, 200, _shirt(700, "dash", "solid", amber_left=True), "")
         + _d(1100, 300, _s("왼소매", 64, cls="ink") + _t("어깨부터<br>없음", 190, "margin-top:8px;line-height:1.05", cls="ink"), ""))
    C = (_d(96, 130, _s("2월 6일 경찰 조서 · 그의 진술", 52, cls="k") + _t("그 왼소매를<br>칼에 감았다", 170, "margin-top:40px;line-height:1.1"),
            "paper", w=1728, h=740, st="padding:64px 80px"))
    C2 = (_d(96, 120, _t("그 왼소매를 칼에 감았다", 72), "paper row dim", w=1728, h=130, st="padding-left:60px;box-shadow:none")
          + _d(96, 300, _s("같은 날 · 2월 6일 경찰 조서", 54, cls="k") + _t("“범행 뒤 목욕 아궁이에서<br>태워 버렸다”", 128, "margin-top:30px;line-height:1.12"),
               "paper", w=1728, h=580, st="padding:56px 80px"))
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], A3), (c[3], c[4], B), (c[4], c[5], C), (c[5], c[6], C2)],
                  [(0, c[4], "도식"), (c[4], dur, "도식 · 실제 조서 아님")], [])


# ============================================================================ no_blood (SHOTS 31)

def no_blood(sid, dur, q):
    """▶c1 board A retrial judgment card fed by the 2016 opening decision / ▶c2 board B the quote card (60 %) /
    ▶c3 board C match pattern 조서 "태웠다" ≠ "남아 있다 · 혈액 확인 안 됨" (amber ≠, the focus) / ▶c4 board D date strip, 4/5
    node "5조각 → 검찰" — c5 "그 소매도" / ▶c6 re-frame: 4/8 node big "첫 공판" + "사흘 전". F117 F165 F118 F119 F88."""
    c = _cuts(q, dur, [1, 2, 3, 5])
    p = sid
    A = (_d(96, 300, _s("2016년 6월 30일", 48, cls="k") + _t("재심 개시 결정", 72, "margin-top:8px"),
            "paper", w=620, h=300, st="padding:44px 50px;opacity:.55")
         + _ln(730, 448, 150)
         + _d(900, 130, _s("2019년 3월 28일", 52, cls="k") + _t("재심 판결", 150, "margin-top:12px")
              + _s("개시 결정의 판단을 이렇게 옮겼다", 54, "margin-top:60px;padding-top:26px;border-top:4px solid rgba(30,33,37,.4)"),
              "paper", w=924, h=740, st="padding:60px 66px"))
    B = _d(96, 130, _s("재심 판결문 3쪽 · 개시 결정 요지", 52, cls="k")
           + _t("“왼소매가 남아 있고,<br>혈액도 확인되지<br>않았다”", 150, "margin-top:40px;line-height:1.12"),
           "paper", w=1728, h=740, st="padding:60px 80px")
    C = (_d(96, 130, _s("조서와 맞지 않는 두 사실", 56, cls="kd"), "")
         + _d(96, 250, _s("조서 · 2월 6일", 52, cls="k") + _t("태웠다", 170, "margin-top:20px"), "paper ctr", w=700, h=560, st="padding:0 60px")
         + _d(800, 330, _t("≠", 300, "text-align:center;line-height:1", cls="amt"), "", w=320)
         + _d(1124, 250, _s("재심 판결", 52, cls="k") + _t("남아 있다", 120, "margin-top:20px") + _t("혈액 확인<br>안 됨", 100, "margin-top:24px;line-height:1.08"),
              "paper ctr", w=700, h=560, st="padding:0 60px"))
    X0, X1 = 140, 1780

    def ax(day):  # 1985 day of year: 2/14 = 45, 4/5 = 95, 4/8 = 98
        return round(X0 + (day - 45) / 53 * (X1 - X0))
    axis = (_ln(X0, 300, X1 - X0, st="height:6px;background:rgba(233,229,221,.5)")
            + _node(ax(45), 303, 20) + _d(ax(45) - 40, 340, _t("2/14", 56, cls="ink"), "")
            + _d(ax(45) - 40, 410, _s("왼소매 압수", 46, "color:rgba(233,229,221,.75);white-space:nowrap"), ""))
    D = (axis + _node(ax(95), 303, 34, "on") + _node(ax(98), 303, 20)
         + _d(ax(98) - 40, 220, _t("4/8", 56, cls="ink"), "")
         + _d(560, 470, _s("1985년 4월 5일", 52, cls="k") + _t("5조각 → 검찰", 130, "margin-top:10px")
              + _s("구마모토현경이 보냄", 50, "margin-top:20px;color:rgba(30,33,37,.78)"), "paper", w=1080, h=420, st="padding:46px 62px")
         + _lv(ax(95) - 2, 337, 113)
         + _d(560, 356, '<b class="disp" style="font-size:56px">그 소매도 · 함께</b>', "lab", id=f"{p}-sl", st="opacity:0;padding:8px 30px 10px"))
    D2 = (_d(96, 140, _t("4/5", 120, cls="ink") + _s("5조각 → 검찰", 52, "margin-top:10px", cls="ink"), "", w=500)
          + _d(96, 470, "", "", w=1728, h=110, st="border:6px solid rgba(233,229,221,.7);border-top:none;border-radius:0 0 18px 18px;height:70px")
          + _d(780, 600, _t("사흘 전", 120, "text-align:center;width:360px", cls="ink"), "", w=360)
          + _d(1090, 110, _s("1985년 4월 8일", 54, cls="k") + _t("첫 공판", 170, "margin-top:10px"), "paper", w=734, h=360, st="padding:46px 60px"))
    tw = [_slide(f"#{p}-sl", q[4] + 0.3, -30)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], B), (c[2], c[3], C), (c[3], c[4], D), (c[4], c[5], D2)],
                  [(0, dur, "도식")], tw)


# ============================================================================ cloth_origin (SHOTS 33)

def cloth_origin(sid, dur, q):
    """▶c1 board A statement-date axis 1/20 · 1/31 · 2/5, the 1/20~1/31 span "칼을 씻었다" / ▶c2 re-frame: 2/5 node big, the '천'
    card appears (amber node, the scene's focus) / ▶c3 board B outline person card "재판 증언" — c4 his words, part 1 /
    ▶c5 re-frame: part 2 full frame / ▶c6 board C damages 1st-instance card — c7 a line leaves it and reaches the 2/5 node
    "경찰 조사" (no line claiming who prompted it). F124 F125 F126 F219 F128."""
    c = _cuts(q, dur, [1, 2, 4, 5])
    p = sid
    X = {20: 160, 31: 900, 36: 1640}
    A = (_d(140, 140, _s("1985년 · 경찰 조서에 적힌 말", 52, cls="kd"), "")
         + _ln(160, 640, 1480, st="height:6px;background:rgba(233,229,221,.5)")
         + _node(X[20], 643, 24, "on") + _node(X[31], 643, 24, "on") + _node(X[36], 643, 24)
         + _d(X[20] - 30, 690, _t("1/20", 60, cls="ink"), "") + _d(X[31] - 50, 690, _t("1/31", 60, cls="ink"), "")
         + _d(X[36] - 70, 690, _t("2/5", 60, cls="ink"), "")
         + _d(X[20], 300, _t("칼을 씻었다", 120) + _s("천 이야기 없음", 54, "margin-top:16px;color:rgba(30,33,37,.75)"),
              "paper", w=X[31] - X[20], h=300, st="padding:40px 50px"))
    A2 = (_d(96, 140, _t("1/20 · 1/31", 56, cls="ink") + _s("칼을 씻었다", 50, "margin-top:6px;color:rgba(233,229,221,.8)"), "dim", w=520)
          + _ln(96, 400, 520, st="opacity:.25") + _ln(616, 400, 300)
          + _node(1010, 403, 90, "am")
          + _d(940, 360, _t("2/5", 70, "text-align:center;width:140px", cls="ink"), "", w=140)
          + _d(1150, 200, _s("2월 5일 조서", 52, cls="k") + _t("천", 230, "line-height:1;margin-top:10px")
               + _s("처음 나온다", 64, "margin-top:20px"), "paper", w=674, h=560, st="padding:50px 60px"))
    B = (_person(96, 150, 520, 650)
         + _d(96, 818, '<b class="disp" style="font-size:52px">재판에서 · 그의 증언</b>', "lab", st="padding:6px 26px 8px")
         + _d(720, 150, _t("“검사가 자루에<br>피가 묻을 텐데,<br>하고 물어서”", 120, "line-height:1.14"),
              "paper", w=1104, h=650, id=f"{p}-q1", st="padding:60px 66px;opacity:0"))
    B2 = (_d(96, 120, _s("“검사가 자루에 피가 묻을 텐데, 하고 물어서”", 54), "paper row dim", w=1728, h=120, st="padding-left:60px;box-shadow:none")
          + _d(96, 290, _s("그의 증언 · 원 재판", 54, cls="k") + _t("“생각나는 대로<br>넝마를 감았다고 했다”", 150, "margin-top:30px;line-height:1.12"),
               "paper", w=1728, h=600, st="padding:56px 80px"))
    C = (_node(330, 470, 90, "am") + _d(260, 427, _t("2/5", 70, "text-align:center;width:140px", cls="ink"), "", w=140)
         + _d(150, 610, _t("경찰 조사", 84, "text-align:center;width:360px", cls="ink"), "", w=360)
         + _ln(430, 467, 520, id=f"{p}-lk")
         + _d(950, 130, _s("2025년 3월 14일", 50, cls="k") + _t("배상 소송<br>1심 판결", 130, "margin-top:12px;line-height:1.08")
              + _s("천 이야기가 처음 나온 곳", 54, "margin-top:44px;padding-top:24px;border-top:4px solid rgba(30,33,37,.4)")
              + _t("2월 5일 경찰 조사", 74, "margin-top:10px", id=f"{p}-at", cls="h"),
              "paper", w=874, h=740, st="padding:56px 60px"))
    tw = [_fade(f"#{p}-q1", q[3] + 0.15, 0.3),
          _grow(f"#{p}-lk", q[6] + 0.2, 0.5, "X", "power2.out"),
          _pop(f"#{p}-at", q[6] + 0.6, 1.1, 0.3)]
    # C's line runs right → left from the card to the node
    tw[1] = tw[1].replace("scaleX: 0 }", "scaleX: 0, transformOrigin: \"right center\" }")
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], B2), (c[4], c[5], C)],
                  [(0, dur, "도식")], tw)


# ============================================================================ autopsy_memo (SHOTS 35)

AH = {5, 7, 8, 13, 14, 15}   # wounds measured with '약' (F133)


def autopsy_memo(sid, dur, q):
    """Autopsy memo as a card (도식 · 실제 메모 아님, no body drawing). ▶c1 board A card "재심 청구 때 새로 제출" — c2 its head
    "당시 부검한 교수의 메모" / ▶c3 board B two boxes '약' · '대략' — c4 their meaning / ▶c5 board C the 15 numbered wound cells,
    the six '약' cells fill / ▶c6 re-frame: the six cells big + "2곳 · 칼 모양과 맞지 않음" (amber 2, the focus; which two is not
    drawn). F131 F130 F132 F133 F134."""
    c = _cuts(q, dur, [2, 4, 5])
    p = sid
    A = (_d(96, 130, _s("재심 청구 때 새로 제출된 기록", 56, cls="k")
            + _d(0, 0, _t("당시 부검한", 150) + _t("교수의 메모", 150, "margin-top:6px"), "", id=f"{p}-hd", st="position:relative;margin-top:60px;opacity:0"),
            "paper", w=1728, h=740, st="padding:64px 84px"))
    B = (_d(96, 130, _s("상처 깊이를 적을 때 · 교수의 구분", 54, cls="kd"), "")
         + _d(96, 250, _t("약", 260, "line-height:1") + _s("더 정확히 잰 것", 64, "margin-top:40px", id=f"{p}-m1", cls="h"),
              "dc ctr", w=820, h=600, id=f"{p}-x1", st="align-items:center")
         + _d(1004, 250, _t("대략", 260, "line-height:1") + _s("그 밖의 것", 64, "margin-top:40px", id=f"{p}-m2", cls="h"),
              "dc ctr", w=820, h=600, id=f"{p}-x2", st="align-items:center"))
    cells = []
    for k in range(15):
        n = k + 1
        r, i = divmod(k, 5)
        x, y = 96 + i * 352, 230 + r * 214
        on = n in AH
        cells.append(_d(x, y, _t(str(n), 110, "line-height:1") + (_s("약", 54, "position:absolute;right:30px;bottom:22px") if on else ""),
                        "cl" + (" on" if on else ""), w=320, h=190, id=f"{p}-c{n}" if on else None))
    C = (_d(96, 120, _s("상처 15곳 · 번호", 54, cls="kd"), "") + "".join(cells))
    big = "".join(_d(96 + k * 292, 200, _t(str(n), 130, "line-height:1") + _s("약", 54, "margin-top:20px"),
                     "paper ctr", w=264, h=300, st="align-items:center") for k, n in enumerate(sorted(AH)))
    C2 = (_d(96, 120, _s("‘약’으로 잰 6곳", 56, cls="kd"), "") + big
          + _d(96, 560, _t("2", 300, "line-height:1", cls="amt"), "", w=240)
          + _d(360, 600, _t("곳", 120, cls="ink") + _s("칼 모양과 맞지 않는다 · 고법", 64, "margin-top:10px", cls="ink"), ""))
    css = f"""
    .cl {{ position: absolute; border: 4px solid rgba(233,229,221,.55); border-radius: 6px; color: {INK}; padding: 20px 30px; }}
    .cl.on {{ border-color: transparent; }}
"""
    tw = [_fade(f"#{p}-hd", q[1] + 0.15, 0.35),
          _fade(f"#{p}-m1", q[3] + 0.3, 0.3), _fade(f"#{p}-m2", q[3] + 1.6, 0.3),
          f'    tl.fromTo("#{p}-x1, #{p}-x2", {{ backgroundColor: "rgba(217,213,204,0)", color: "{INK}" }}, '
          f'{{ backgroundColor: "rgba(217,213,204,1)", color: "{DARK}", duration: 0.3 }}, {round(q[3] + 0.2, 2)});']
    for k, n in enumerate(sorted(AH)):
        tw.append(f'    tl.fromTo("#{p}-c{n}", {{ backgroundColor: "rgba(217,213,204,0)", color: "{INK}" }}, '
                  f'{{ backgroundColor: "rgba(217,213,204,1)", color: "{DARK}", duration: 0.2 }}, {round(q[4] + 0.6 + k * 0.25, 2)});')
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], B), (c[2], c[3], C), (c[3], c[4], C2)],
                  [(0, dur, "도식 · 실제 메모 아님")], tw, css)


# ============================================================================ second_wound (SHOTS 37)

def _gauge(w, label, fs=64, color=INK):
    """Width gauge |——| with its number (the same icon as blade_width's gauge, no body drawn)."""
    return (f'<div style="position:relative;width:{w}px;height:{fs + 70}px">'
            f'<i style="position:absolute;left:0;top:{fs + 24}px;width:{w}px;height:6px;background:{color}"></i>'
            f'<i style="position:absolute;left:0;top:{fs + 4}px;width:6px;height:46px;background:{color}"></i>'
            f'<i style="position:absolute;right:0;top:{fs + 4}px;width:6px;height:46px;background:{color}"></i>'
            f'<b class="disp" style="position:absolute;left:0;right:0;top:0;text-align:center;font-size:{fs}px;line-height:1;font-weight:400;color:{color}">{label}</b></div>')


def second_wound(sid, dur, q):
    """▶c1 board A number card "깊이 약 4.8cm" — c2 "입구 약 1.5cm" + gauge icon / ▶c3 board B the nine '대략' wounds (15 − 6) —
    c4 tally "4곳 · 어긋날 수 있음" (which four is not drawn) / ▶c5 board C two-row ledger: 검찰 "피부가 눌리면 입구가 좁아진다" /
    ▶c6 re-frame: the new expert row big "지방이 적어" — c7 its conclusion (amber bar, the focus). F141 F142 F143 F144."""
    c = _cuts(q, dur, [2, 4, 5])
    p = sid
    A = (_d(96, 130, _s("다른 상처 하나", 56, cls="k") + _s("깊이", 64, "margin-top:60px") + _t("약 4.8cm", 180, "line-height:1.1;white-space:nowrap"),
            "paper", w=1000, h=740, st="padding:60px 72px")
         + _d(1180, 260, _s("입구", 64, cls="ink") + _t("약 1.5cm", 140, "margin-top:6px;white-space:nowrap", cls="ink")
              + _d(0, 0, _gauge(520, "", 1), "", st="position:relative;margin-top:30px"), "", id=f"{p}-in", st="opacity:0"))
    others = [n for n in range(1, 16) if n not in AH]
    cells = "".join(_d(96 + k * 192, 330, _t(str(n), 84, "line-height:1"), "cl", w=172, h=172) for k, n in enumerate(others))
    B = (_d(96, 140, _s("상처 15곳 가운데", 54, cls="kd") + _t("‘대략’으로 잰 9곳", 96, "margin-top:6px", cls="ink"), "")
         + cells
         + _d(96, 580, _t("4", 200, "line-height:1;width:160px", cls="ink")
              + _d(0, 0, _t("곳", 96, cls="ink") + _s("칼 모양과 어긋날 수 있다 · 고법", 60, "margin-top:4px", cls="ink"), "", st="position:relative"),
              "row", w=1728, id=f"{p}-n4", st="opacity:0;gap:24px"))
    C = (_d(96, 130, _s("눌림 현상을 두고", 54, cls="kd"), "")
         + _d(96, 220, _t("검찰", 96, "width:300px;flex:none")
              + _d(0, 0, _s("피부가 눌리면", 66) + _t("입구가 좁아진다", 110, "margin-top:6px"), "", st="position:relative"),
              "paper row", w=1728, h=360, st="padding-left:70px")
         + _d(96, 610, _t("새 감정", 80, "width:300px;flex:none;color:rgba(233,229,221,.8)"), "gr row", w=1728, h=200,
              st="padding-left:70px;opacity:.55"))
    C2 = (_d(96, 120, _t("검찰", 56, "width:200px") + _s("피부가 눌리면 입구가 좁아진다", 52), "paper row dim", w=1728, h=110,
             st="padding-left:50px;box-shadow:none")
          + _d(96, 280, '<i class="amb"></i>' + _s("새 감정", 60, cls="k") + _t("그 부위는 지방이 적어", 120, "margin-top:20px")
               + _t("→ 피부가 잘 눌리지 않는다", 120, "margin-top:24px", id=f"{p}-cc", cls="h"),
               "paper", w=1728, h=600, st="padding:60px 80px 0 96px"))
    css = f"""
    .cl {{ position: absolute; border: 4px solid rgba(233,229,221,.6); border-radius: 6px; color: {INK};
      display: flex; align-items: center; justify-content: center; }}
"""
    tw = [_slide(f"#{p}-in", q[1] + 0.2, -30), _pop(f"#{p}-n4", q[3] + 0.5, 1.08, 0.3), _slide(f"#{p}-cc", q[6] + 0.3, -36)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], B), (c[2], c[3], C), (c[3], c[4], C2)], [(0, dur, "도식")], tw, css)


# ============================================================================ cloth_holes (SHOTS 38)

def _cloth(w, h, slots):
    """Achromatic cloth square (colour is not in the record) with knife holes; slots: [(y_frac, label)]."""
    out = f'<div style="position:relative;width:{w}px;height:{h}px;background:#77787A;border-radius:4px">'
    for y, lab in slots:
        out += (f'<i style="position:absolute;left:{w // 2 - 110}px;top:{round(y * h) - 14}px;width:220px;height:28px;'
                f'border-radius:14px;background:#141517"></i>')
    return out + "</div>"


def cloth_holes(sid, dur, q):
    """Two specimens: a clothing hole = the wound's entry. ▶c1 board A "옷에 남은 구멍" + a grey cloth square (no colour, no
    blood) — c2 the slot "스웨터 15~16.6mm" / ▶c3 re-frame: the square split top/bottom, "속옷 15mm" / ▶c4 board B the two
    specimens side by side with amber '=' (the focus) / ▶c5 board C conclusion "잘 드는 칼날에 찔렸다(고법)" — c6 the 눌림 card
    comes back, "큰 눌림 현상 없음" / ▶c7 record 3 s+: [2] p.15 l.3~4 strip. F145 F146 F147 F148 F224 F149."""
    c = _cuts(q, dur, [2, 3, 4, 6])
    p = sid
    A = (_d(96, 130, _s("피해자의 옷", 54, cls="kd") + _t("옷에 남은 구멍", 120, "margin-top:6px", cls="ink"), "")
         + _d(96, 400, _cloth(860, 470, [(0.5, "")]), "")
         + _d(1040, 520, _s("스웨터", 64, cls="ink") + _t("15~16.6mm", 124, "margin-top:6px;white-space:nowrap", cls="ink"), "", id=f"{p}-sw",
              st="opacity:0"))
    A2 = (_d(96, 150, _cloth(860, 330, [(0.5, "")]), "") + _d(96, 520, _cloth(860, 330, [(0.5, "")]), "")
          + _d(1060, 200, _s("스웨터", 60, cls="ink") + _t("15~16.6mm", 120, "white-space:nowrap", cls="ink"), "")
          + _d(1060, 570, _s("속옷", 60, cls="ink") + _t("15mm", 150, "", cls="ink"), ""))
    B = (_d(96, 130, _s("옷의 구멍", 56, cls="k") + _t("15mm 안팎", 100, "margin-top:20px;white-space:nowrap")
            + _d(0, 0, _cloth(560, 240, [(0.5, "")]), "", st="position:relative;margin-top:40px"),
            "paper", w=720, h=740, st="padding:56px 70px")
         + _d(816, 360, _t("=", 280, "text-align:center;line-height:1", cls="amt"), "", w=288)
         + _d(1104, 130, _s("상처 입구", 56, cls="k") + _t("약 1.5cm", 120, "margin-top:20px")
              + _d(0, 0, _gauge(560, "", 1, DARK), "", st="position:relative;margin-top:90px"),
              "paper", w=720, h=740, st="padding:56px 70px")
         + _d(96, 120, "", "", w=1, h=1))
    C = (_d(96, 130, _s("후쿠오카고법(2017)", 56, cls="k") + _t("잘 드는 칼날에 찔렸다", 140, "margin-top:30px;line-height:1.1"),
            "paper", w=1728, h=400, st="padding:56px 80px")
         + _d(96, 600, _s("검찰", 50, "color:rgba(233,229,221,.8)") + _s("피부가 눌려 입구가 좁아졌다", 54, cls="ink"),
              "gr", w=760, h=240, id=f"{p}-old", st="padding:30px 40px;opacity:0")
         + _d(940, 600, _t("큰 ‘눌림 현상’은<br>없었다", 96, "line-height:1.12", cls="ink"), "", id=f"{p}-nn", st="opacity:0"))
    im, icss, itw = record_insert(p, c[4], round(dur - c[4], 2), "assets/archive/kousai-p15-l3.png", (2728, 264),
                                  focus=(0.745, 0.25, 0.09), lean=14, tilt=1.6, light=-0.05,
                                  caption="「이 칼의 형상과 상당히 모순된다고 하지 않을 수 없다」",
                                  credit="후쿠오카고법 결정문(2017) · 재판소 공개본")
    tw = [_fade(f"#{p}-sw", q[1] + 0.2, 0.3),
          f'    tl.fromTo("#{p}-old", {{ opacity: 0 }}, {{ opacity: 0.25, duration: 0.3 }}, {round(q[5] + 0.1, 2)});',
          _slide(f"#{p}-nn", q[5] + 0.7, -30), itw]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], C)],
                  [(0, c[4], "도식 · 실제 옷 아님")], tw, icss, extra=[im])


# ============================================================================ not_requested (SHOTS 44)

def not_requested(sid, dur, q):
    """▶c1 board A the 2019 judgment card with its bracket "( )" / ▶c2 board B two-row ledger 신청한 것 · 신청하지 않은 것 "?"
    (amber bar, the focus) / ▶c3 record 3 s: [1] p.4 l.17~18 strip / ▶c4 the ledger again, row 2 big "'태웠다'던 천" — c5 "판결문은
    이 천을" / ▶c6 board C the quote "가장 중요한 증거 가운데 하나" full frame. F172 F174 F175."""
    c = _cuts(q, dur, [1, 2, 3, 5])
    p = sid
    A = _d(96, 130, _s("2019년 재심 판결문 · 4쪽", 54, cls="k")
           + _d(0, 0, _t("(", 400, "line-height:.9;color:rgba(30,33,37,.55)") + _d(0, 0, _s("괄호 안의 한 문장", 72), "", st="position:relative;flex:1;text-align:center")
                + _t(")", 400, "line-height:.9;color:rgba(30,33,37,.55)"), "row", st="position:relative;margin-top:60px"),
           "paper", w=1728, h=740, st="padding:60px 90px")
    B = (_d(96, 130, _s("재심 공판 · 검찰의 증거 신청", 54, cls="kd"), "")
         + _d(96, 230, _s("신청한 것", 54, "width:420px;flex:none") + _t("자백 등 많은 증거", 104), "paper row", w=1728, h=260, st="padding-left:70px")
         + _d(96, 530, '<i class="amb"></i>' + _s("신청하지 않은 것", 54, "width:420px;flex:none") + _t("?", 200, "line-height:1"),
              "paper row", w=1728, h=330, st="padding-left:70px"))
    B2 = (_d(96, 120, _s("신청한 것", 46, "width:300px") + _s("자백 등 많은 증거", 54), "paper row dim", w=1728, h=110,
             st="padding-left:50px;box-shadow:none")
          + _d(96, 270, '<i class="amb"></i>' + _s("신청하지 않은 것", 60, cls="k") + _t("조서에서 ‘태웠다’던<br>바로 그 천", 140, "margin-top:20px;line-height:1.1"),
               "paper", w=1728, h=460, st="padding:50px 80px 0 96px")
          + _d(96, 776, '<b class="disp" style="font-size:60px">판결문은 이 천을 —</b>', "lab", id=f"{p}-lb", st="opacity:0;padding:8px 30px 10px"))
    C = _d(96, 130, _s("2019년 재심 판결문 · 이 천을 두고", 54, cls="k")
           + _t("“가장 중요한<br>증거 가운데 하나”", 176, "margin-top:44px;line-height:1.1"),
           "paper", w=1728, h=740, st="padding:64px 84px")
    im, icss, itw = record_insert(p, c[2], round(c[3] - c[2], 2), "assets/archive/saishin-p4-l17.png", (2652, 264),
                                  focus=(0.50, 0.75, 0.11), lean=12, tilt=-1.4,
                                  caption="「태웠다고 된 앞의 천 조각 등은 청구하지 않았다」",
                                  credit="구마모토지법 재심 판결(2019) · 재판소 공개본")
    tw = [_slide(f"#{p}-lb", q[4] + 0.2, -30), itw]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], B), (c[3], c[4], B2), (c[4], c[5], C)],
                  [(0, c[2], "도식"), (c[3], dur, "도식")], tw, icss, extra=[im])


# ============================================================================ verdict_order (SHOTS 46)

def verdict_order(sid, dur, q):
    """The judgment's 주문 as a ledger (honest: not a "complete" acquittal, X02). ▶c1 board A row 1 "살인 → 무죄" (0.25) + empty
    row 2 "한 줄 더" — c2 row 2 "별건 · 권총 1정·실탄 10발" / ▶c3 re-frame: row 2 big, 구형 "징역 2년" — c4 판결 "징역 1년" (amber, the
    focus) / ▶c5 board B row 3 "1년 → 이미 구금된 날수로 채움" — c6 ink outline seal "그날 확정" / ▶c7 board C outline person card
    "85세 · 치매 · 요양 시설". F180 F213 F184 F181 F182 F185 F186."""
    c = _cuts(q, dur, [2, 4, 6])
    p = sid
    A = (_d(96, 130, _s("2019년 3월 28일 · 재심 판결 주문", 54, cls="kd"), "")
         + _d(96, 230, _s("살인", 60, "width:300px") + _t("무죄", 110), "paper row dim", w=1728, h=220, st="padding-left:70px;box-shadow:none")
         + _d(96, 490, _d(0, 0, _s("한 줄 더", 60, "color:rgba(233,229,221,.75)"), "", id=f"{p}-e", st="position:relative")
              + _d(0, 0, _s("별건", 60, "width:300px;flex:none") + _t("집에 권총 1정 · 실탄 10발", 104), "paper row",
                   id=f"{p}-r2", st="position:absolute;inset:0;padding-left:70px;opacity:0"),
              "dc row", w=1728, h=360, st="padding-left:70px"))
    A2 = (_d(96, 120, _s("살인", 46, "width:200px") + _s("무죄", 54), "paper row dim", w=1728, h=100, st="padding-left:50px;box-shadow:none")
          + _d(96, 250, _s("별건 · 권총 1정·실탄 10발을 갖고 있던 죄", 56, cls="kd"), "")
          + _d(96, 350, _s("검찰 구형", 60, cls="k") + _t("징역 2년", 170, "margin-top:20px"), "paper", w=820, h=500, st="padding:56px 64px")
          + _d(1004, 350, _s("판결", 60, cls="k") + _t("징역 1년", 170, "margin-top:20px"), "paper", w=820, h=500, id=f"{p}-y1",
               st=f"padding:56px 64px;opacity:0;box-shadow:0 0 0 10px {AMBER}, 0 24px 60px rgba(0,0,0,.5)"))
    B = (_d(96, 120, _s("별건", 46, "width:200px") + _s("징역 1년", 54), "paper row dim", w=1728, h=100, st="padding-left:50px;box-shadow:none")
         + _d(96, 260, _t("그 1년은", 110) + _t("이미 구금된 날수로 채움", 110, "margin-top:12px"), "paper", w=1728, h=360, st="padding:50px 80px")
         + _d(1060, 650, _t("그날 확정", 104, "line-height:1") + _s("양쪽 상소권 포기", 54, "margin-top:14px"),
              "seal ctr", w=640, h=230, id=f"{p}-sl", st="opacity:0;align-items:center"))
    C = (_person(150, 150, 520, 650)
         + _d(150, 818, '<b class="disp" style="font-size:52px">미야타 씨 · 그날</b>', "lab", st="padding:6px 26px 8px")
         + _d(800, 170, _t("85세", 230, "line-height:1", cls="ink") + _t("치매", 120, "margin-top:40px", cls="ink")
              + _t("요양 시설에", 120, "margin-top:20px", cls="ink"), ""))
    tw = [f'    tl.to("#{p}-e", {{ opacity: 0, duration: 0.15 }}, {round(q[1] + 0.15, 2)});',
          _fade(f"#{p}-r2", q[1] + 0.2, 0.3),
          _pop(f"#{p}-y1", q[3] + 0.25, 1.08, 0.3),
          _pop(f"#{p}-sl", q[5] + 0.4, 1.25, 0.25)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], C)], [(0, dur, "도식")], tw)


# ============================================================================ after (SHOTS 47)

def after(sid, dur, q):
    """▶c1 board A axis 2019 → 2020 + the question / ▶c2 re-frame: 2020 node big "국가·현 상대 배상 소송" / ▶c3 board B counter
    "약 8,481만 엔" (amber, the focus) / ▶c4 board C his outline card goes back to 0.25 (solid, not dashed), "소송을 낸 다음 달 ·
    세상을 떠남" — c5 heirs card (no faces, no count) "소송을 이어받음". F187 F189 F188 F214."""
    c = _cuts(q, dur, [1, 2, 3])
    p = sid
    A = (_d(96, 150, _t("법원은 그 34년을", 120, cls="ink") + _t("어떻게 판단했을까", 120, "margin-top:10px", cls="ink"), "")
         + _ln(96, 640, 1728, st="height:6px;background:rgba(233,229,221,.5)")
         + _node(300, 643, 30, "on") + _d(200, 700, _t("2019", 72, cls="ink") + _s("무죄 확정", 50, "margin-top:4px", cls="ink"), "")
         + _node(900, 643, 24) + _d(840, 700, _t("2020", 72, cls="ink"), "")
         + _d(1500, 700, _t("?", 120, "line-height:1", cls="ink"), ""))
    A2 = (_d(96, 130, _t("2020", 260, "line-height:1", cls="ink"), "")
          + _d(96, 420, _s("그가 낸 소송", 58, cls="k") + _t("국가·현 상대<br>배상 소송", 150, "margin-top:16px;line-height:1.08"),
               "paper", w=1728, h=460, st="padding:50px 80px"))
    B = (_d(96, 140, _s("판결문에 적힌 청구액 · 모두", 60, cls="kd"), "")
         + _d(96, 260, _t("약 8,481만 엔", 250, "line-height:1.1;white-space:nowrap", cls="amt"), "")
         + _d(96, 620, _s("원고 두 사람 몫의 합", 54, "color:rgba(233,229,221,.8)"), ""))
    C = (_person(150, 150, 520, 650, dim=True)
         + _d(150, 818, '<b class="disp" style="font-size:52px">미야타 씨</b>', "lab dim", st="padding:6px 26px 8px")
         + _d(760, 170, _s("소송을 낸 다음 달", 64, cls="ink") + _t("세상을 떠남", 150, "margin-top:10px", cls="ink"), "")
         + _ln(690, 640, 220, id=f"{p}-lk")
         + _d(910, 520, _s("상속인들", 60, cls="k") + _t("소송을 이어받음", 110, "margin-top:10px"), "paper", w=914, h=300,
              id=f"{p}-hr", st="padding:44px 60px;opacity:0"))
    tw = [_grow(f"#{p}-lk", q[4] + 0.1, 0.4, "X", "power2.out"), _slide(f"#{p}-hr", q[4] + 0.4, -30)]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], C)], [(0, dur, "도식")], tw)


# ============================================================================ appeal (SHOTS 49)

def appeal(sid, dur, q):
    """▶c1 board A the 2026 appeal judgment card "검사의 일" — c2 row "공소 취소 또는 무죄 논고를 했어야" / ▶c3 re-frame: row
    "천을 다룬 방식: ___" / ▶c4 record 3 s: [14] p.14 l.13 strip (the 2.3 s caption runs on into c5) / ▶ board B fork from the
    judgment: 현 → 상고 안 함 (enters after the record cut) — c6 국가 → 8/7 상고 / ▶c7 board C dashed amber "?" card (pending; the
    focus). F195 F200 F201 F202 F203 F204(⚠️ re-check before upload)."""
    t3 = round(q[3] - 0.05, 2)
    t4 = round(t3 + 3.0, 2)
    c = [0.0, round(q[2] - 0.05, 2), t3, t4, round(q[6] - 0.05, 2), round(dur, 2)]
    p = sid
    A = (_d(96, 130, _s("2026년 7월 27일 · 배상 소송 2심 판결", 54, cls="k") + _t("검사의 일", 170, "margin-top:20px")
            + _d(0, 0, _s("재심에서 검사는", 56) + _t("공소를 취소하거나<br>무죄 논고를 했어야", 96, "margin-top:10px;line-height:1.1"),
                 "", id=f"{p}-r1", st="position:relative;margin-top:44px;padding-top:24px;border-top:4px solid rgba(30,33,37,.4);opacity:0"),
            "paper", w=1728, h=740, st="padding:56px 80px"))
    A2 = (_d(96, 120, _s("검사는 공소를 취소하거나 무죄 논고를 했어야", 52), "paper row dim", w=1728, h=110, st="padding-left:50px;box-shadow:none")
          + _d(96, 290, _s("2심 판결문 · 그 천을 두고", 56, cls="k") + _t("천을 다룬 방식", 150, "margin-top:20px")
               + _d(0, 0, "", "", st="position:relative;margin-top:60px;width:1200px;height:10px;background:rgba(30,33,37,.5)"),
               "paper", w=1728, h=580, st="padding:56px 80px"))
    B = (_d(96, 330, _s("2심 판결", 54, cls="k") + _t("2026.7.27", 80, "margin-top:8px"), "paper", w=520, h=260, st="padding:40px 50px")
         + _ln(616, 460, 180) + _lv(796, 250, 420)
         + _ln(796, 250, 130) + _ln(796, 665, 130)
         + _d(950, 150, _s("현", 64, cls="ink") + _t("상고 안 함", 130, "margin-top:4px", cls="ink"), "")
         + _d(950, 560, _s("국가", 64, cls="ink") + _t("8월 7일 · 최고재판소에 상고", 96, "margin-top:4px;white-space:nowrap", cls="ink"), "",
              id=f"{p}-gk", st="opacity:0"))
    C = _d(460, 140, _t("?", 300, "text-align:center;line-height:1", cls="amt") + _s("최고재판소의 판단", 64, "text-align:center;margin-top:24px", cls="ink")
           + _s("2026년 11월 기준 · 알려지지 않음", 54, "text-align:center;margin-top:16px;color:rgba(233,229,221,.8)"),
           "dc am ctr", w=1000, h=700)
    im, icss, itw = record_insert(p, t3, 3.0, "assets/archive/kokubai2-p14-l13.png", (2453, 122),
                                  focus=(0.37, 0.5, 0.16), lean=10, tilt=1.4,
                                  caption="「이른바 묵살한 형태가 되어 있어」 — 천을 다룬 방식을 두고",
                                  credit="국가배상 2심 판결(2026, 후쿠오카고법) · 재판소 공개본")
    tw = [_fade(f"#{p}-r1", q[1] + 0.2, 0.3), _slide(f"#{p}-gk", q[5] + 0.2, -30), itw]
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[3], c[4], B), (c[4], c[5], C)],
                  [(0, c[2], "도식"), (c[3], dur, "도식")], tw, icss, extra=[im])


# ============================================================================ open_ledger (SHOTS 51)

def open_ledger(sid, dur, q):
    """Two-row ledger, solved / unsolved (amber on the unsolved). ▶c1 board A "34년 만에 확정된 것" / ▶c2 re-frame: row 1 big
    "그를 범인으로 인정할 수 없다 — 무죄(확정)" / ▶c3 board B quote "'누군가에게' 살해됐다" / ▶c4 re-frame: dashed card "범인 · 이름
    없음" / ▶c5 board C both rows, row 2 "그 방에서 무슨 일이 있었는지 — ?" (amber) / ▶c6 pull back: the rows small, under row 1
    "그를 가리킨 증거: 처음부터 자백뿐". No other person cards, no guessing lines. F205 F180 F206 F15."""
    c = _cuts(q, dur, [1, 2, 3, 4, 5])
    p = sid
    A = _d(96, 150, _s("1985 → 2019", 60, cls="k") + _t("34년 만에<br>확정된 것", 210, "margin-top:30px;line-height:1.05"),
           "paper", w=1728, h=720, st="padding:64px 84px")
    A2 = (_d(96, 130, _s("풀린 것 · 확정", 56, cls="kd"), "")
          + _d(96, 230, _t("그를 범인으로<br>인정할 수 없다", 140, "line-height:1.1") + _t("— 무죄", 120, "margin-top:30px"),
               "paper", w=1728, h=640, st="padding:60px 80px"))
    B = _d(96, 130, _s("2019년 재심 판결 · 피해자에 대해", 54, cls="k") + _t("“‘누군가에게’<br>살해됐다”", 200, "margin-top:40px;line-height:1.1")
           + _s("판결이 적은 것은 여기까지", 56, "margin-top:40px"), "paper", w=1728, h=740, st="padding:60px 84px")
    B2 = (_d(560, 130, _s("범인", 70, "text-align:center", cls="ink") + _t("이름 없음", 170, "text-align:center;margin-top:30px", cls="ink")
             + _s("어느 판결에도", 60, "text-align:center;margin-top:40px;color:rgba(233,229,221,.8)"), "dc ctr", w=800, h=720))
    C = (_d(96, 140, _s("풀린 것", 54, "width:340px;flex:none") + _t("그는 범인으로 인정되지 않음 · 무죄", 84), "paper row", w=1728, h=300,
            st="padding-left:70px")
         + _d(96, 490, '<i class="amb"></i>' + _s("안 풀린 것", 54, "width:340px;flex:none")
              + _t("그 방에서 무슨 일이<br>있었는지", 96, "line-height:1.1;flex:1") + _t("?", 220, "line-height:1;margin-right:60px", cls="amt"),
              "row", w=1728, h=380, st="padding-left:70px;border:6px solid rgba(233,229,221,.7);border-radius:8px;color:#E9E5DD"))
    C2 = (_d(96, 120, _s("풀린 것", 46, "width:240px;flex:none") + _s("그는 범인으로 인정되지 않음 · 무죄", 54), "paper row", w=1728, h=120,
             st="padding-left:50px")
          + _d(96, 270, _s("그를 가리킨 증거", 60, cls="k") + _t("처음부터 자백뿐", 170, "margin-top:20px"), "paper", w=1728, h=420,
               st="padding:56px 80px")
          + _d(96, 730, '<i class="amb" style="width:12px"></i>' + _s("안 풀린 것", 46, "width:240px;flex:none") + _s("그 방에서 무슨 일이 있었는지", 54)
               + _t("?", 80, "margin-left:30px", cls="amt"),
               "row", w=1728, h=120, st="padding-left:50px;border:4px solid rgba(233,229,221,.6);border-radius:6px;color:#E9E5DD"))
    return _scene(sid, dur, [(c[0], c[1], A), (c[1], c[2], A2), (c[2], c[3], B), (c[3], c[4], B2), (c[4], c[5], C), (c[5], c[6], C2)],
                  [(0, dur, "도식")], [])


def diagram_sfx(DATA):
    """Optional sfx for these boards (for the editor to merge into scenes.sfx_events): number landings."""
    st = {s["id"]: s for s in DATA["scenes"]}
    ev = []
    if "counter34" in st:
        s = st["counter34"]; c = s["captions"]
        ev.append(("impact-bass-1", c[1]["start"] + 1.0, 0.4))
    if "calendar" in st:
        s = st["calendar"]; c = s["captions"]
        ev += [("click-soft", c[2]["start"] + 1.35, 0.4), ("impact-bass-1", c[6]["start"] + 1.7, 0.4)]
    return ev
