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
from scenes_kit import wrap, clip, BOARD, person_card, ARCHIVE_GRADE, AMBER, INK

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

INS_CSS = f"""
    .ar-shot {{ position: absolute; inset: 0; background: {BOARD}; overflow: hidden; }}
    .ar-ins {{ z-index: 20; }}
    .ar-cam {{ position: absolute; inset: 0; transform-origin: 50% 43%; }}
    .ar-print {{ position: absolute; left: 50%; top: 43%; margin: 0; padding: 0; background: #EDE8DE;
      outline: 22px solid #EDE8DE; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 6px 18px rgba(0,0,0,.5); }}
    .ar-crop {{ position: absolute; inset: 0; overflow: hidden; }}
    .ar-img {{ display: block; position: absolute; top: 0; }}
    .ar-ul {{ position: absolute; height: 8px; background: {AMBER}; border-radius: 4px; transform-origin: left center; }}
    .ar-cap {{ position: absolute; left: 0; right: 0; top: 690px; text-align: center; font-size: 48px; color: rgba(233,229,221,.9); }}
    .ar-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.78); }}
    .tag-ar {{ border-color: {AMBER}; }}"""


def _strip_insert(sid, at, dur, src, size, crop, caption, credit, n=0):
    """~3 s record cut of one document line as a wide paper strip, cropped to the quoted phrase (crop = (x0, x1) in 0..1 of
    the line image) so the original glyphs are as large as the 1760 px strip allows; amber underline under the whole crop,
    drawn 0.45 s after the cut. Returns (markup, tweens). Scene boards end at `at` and resume at `at + dur`."""
    w, h = size
    cw = (crop[1] - crop[0]) * w
    k = min(1760 / cw, 320 / h, 2.6)
    grade = ARCHIVE_GRADE.replace('"vignette":0.18', '"vignette":0')
    pw, ph, iw = round(cw * k), round(h * k), round(w * k)
    iid = f"{sid}-ins{n}"
    fig = (f'<figure class="ar-print" style="width:{pw}px;height:{ph}px;transform:translate(-50%,-50%)">'
           f'<div class="ar-crop"><img class="ar-img" src="{src}" alt="" style="width:{iw}px;height:{ph}px;left:{-round(crop[0] * w * k)}px" '
           f'data-color-grading=\'{grade}\'/></div>'
           f'<i id="{iid}-ul" class="ar-ul h" style="left:0;width:{pw}px;top:{ph + 6}px"></i>'
           f'</figure>')
    inner = (f'<div id="{iid}-cam" class="ar-cam">{fig}</div><div class="ar-cap">{caption}</div>'
             f'<div class="ar-credit">{credit}</div><div class="tag-re tag-ar">기록</div>')
    markup = "    " + clip(iid, round(at, 2), dur, "ar-shot ar-ins", inner, extra=" data-layout-allow-overlap")
    tw = [f'    tl.fromTo("#{iid}-cam", {{ scale: 1.0 }}, {{ scale: 1.05, duration: {round(dur, 2)}, ease: "none" }}, {round(at, 2)});',
          _grow(f"#{iid}-ul", at + 0.45, 0.6, "X", "power2.out")]
    return markup, "\n".join(tw)


def feb5_change(sid, dur, q):
    """Before → after ledger (columns: 이전 진술 / 2월 5일 자 조서), one row enlarged at a time (no three-card line-up).
    ▶c1 board A paper card "2월 5일 자 조서" + date line 1/20 첫 자백 → 2/5 / c2 rows ① 장갑 ② 칼자루 ③ 구두 /
    ▶c3 re-frame: row ① big band, 1/20 "다리에서 강에 던져 버림" struck → "아궁이에서 태움" /
    ▶c4 board B the statement frame "경찰관에게서 「?」 라는 물음을 받았다" / ▶c5 record 3 s: [2] p.4 l.20 strip /
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
    im, itw = _strip_insert(p, c[3], round(c[4] - c[3], 2), "assets/archive/kousai-p4-l20.png", (2798, 122), (0.158, 0.948),
                            "2월 5일 자 조서 속 그의 설명 — 고법 결정문 4쪽 20행", "후쿠오카고법 결정문(2017) · 조서 요약 부분")
    tagt = "도식 · 실제 조서 아님"
    markup = "\n".join([
        _board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B), im,
        _board(p, 3, c[4], c[5], C), _board(p, 4, c[5], c[6], D),
        _tag(p, 0, c[0], c[3], tagt), _tag(p, 1, c[4], c[6], tagt)])
    css = BASE_CSS + INS_CSS + f"""
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
