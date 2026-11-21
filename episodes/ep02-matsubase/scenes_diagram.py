"""ep02 diagram scenes (diagram-builder): counter34, calendar, feb5_change.

Board rules (SPEC "▶ 큰 변화 규칙", review-design-2 P0-1):
- every ▶ is a 0-frame hard cut: each board ("판") or re-framing is its own clip, the next one starts on the frame the
  previous one ends. No GSAP zoom/move between boards; only elements inside a board animate in.
- at every ▶ a bright area (paper #D9D5CC card/band) of 25 %+ of the frame appears, disappears or moves, and the new
  board's main element is on screen at the cut (in-board entries come after it).
- nothing below y = 900 (captions), reading text 34 px+, one amber focus per scene.
Facts: facts.md F14 F17 F30 F33 F34 F36 F37 F38 F39 F60 F64 F73 F74 F75 F76 F81 F178 F186 F221 (✅ only).
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


# ============================================================================ counter34 (SHOTS 5)

def counter34(sid, dur, q):
    """▶c1 board A axis "1985.1" / c2 axis fills, '34년' lands / ▶c3 re-frame: axis up top, two big paper cards
    "1985 겨울 · 2019 봄" / ▶c4 board B outline person card, "50대 초반 → 85세" (34년 on the arrow). F17 F178 F30 F186."""
    c = _cuts(q, dur, [2, 3])
    p = sid
    A = f"""
      <div class="ax"><i id="{p}-base" class="h"></i><i id="{p}-fill" class="fill h"></i></div>
      <div id="{p}-tl" class="tick l h"><b class="disp">1985.1</b><span>사건</span></div>
      <div id="{p}-tr" class="tick r h"><b class="disp">2019.3</b><span>재심 판결</span></div>
      <div id="{p}-big" class="big disp h"><b id="{p}-n">0</b>년</div>"""
    A2 = f"""
      <div class="ax top"><i></i><i class="fill"></i></div>
      <div class="big2 disp">34년</div>
      <i class="drop l"></i><i class="drop r"></i>
      <div class="paper yc l"><b class="disp">1985</b><em class="disp">겨울</em><span>1월 · 사건</span></div>
      <div class="paper yc r"><div id="{p}-yr" class="h"><b class="disp">2019</b><em class="disp">봄</em><span>3월 28일 · 재심 판결</span></div></div>"""
    B = f"""
      <div class="pc">{person_card(540, 690, sw=4)}</div>
      <div class="lab pname disp">미야타 씨</div>
      <div class="age a1"><span>1985</span><b class="disp">50대 초반</b></div>
      <div id="{p}-arw" class="arw h"><i></i><em class="disp">34년</em></div>
      <div id="{p}-a2" class="age a2 h"><span>2019</span><b class="disp">85세</b></div>"""
    markup = "\n".join([_board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B),
                        _tag(p, 0, 0, dur)])
    css = BASE_CSS + f"""
    .ax {{ position: absolute; left: 200px; width: 1520px; top: 640px; height: 14px; }}
    .ax i {{ position: absolute; inset: 0; background: rgba(233,229,221,.32); transform-origin: left center; border-radius: 7px; }}
    .ax i.fill {{ background: {INK}; }}
    .ax.top {{ top: 250px; }}
    .tick {{ position: absolute; top: 470px; }}
    .tick.l {{ left: 180px; }} .tick.r {{ right: 180px; text-align: right; }}
    .tick b {{ display: block; font-size: 84px; line-height: 1; color: {INK}; }}
    .tick span {{ display: block; font-size: 40px; color: rgba(233,229,221,.85); margin-top: 8px; }}
    .big {{ position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-size: 250px; line-height: 1; color: {AMBER}; }}
    .big b {{ font-weight: 400; }}
    .big2 {{ position: absolute; left: 0; right: 0; top: 78px; text-align: center; font-size: 150px; line-height: 1; color: {AMBER}; }}
    .big2::before {{ content: ""; }}
    .drop {{ position: absolute; top: 264px; width: 6px; height: 40px; background: {INK}; }}
    .drop.l {{ left: 197px; }} .drop.r {{ left: 1717px; }}
    .yc {{ top: 300px; width: 834px; height: 590px; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
    .yc.l {{ left: 96px; }} .yc.r {{ left: 990px; }}
    .yc > div {{ display: flex; flex-direction: column; align-items: center; }}
    .yc b {{ font-size: 230px; line-height: .95; font-weight: 400; }}
    .yc em {{ font-style: normal; font-size: 120px; line-height: 1.05; }}
    .yc span {{ font-size: 46px; margin-top: 26px; padding-top: 18px; border-top: 4px solid rgba(30,33,37,.55); }}
    .pc {{ position: absolute; left: 150px; top: 110px; }}
    .pname {{ left: 150px; top: 818px; font-size: 48px; padding: 6px 26px 8px; }}
    .age {{ position: absolute; left: 860px; }}
    .age span {{ display: block; font-size: 44px; color: rgba(233,229,221,.8); }}
    .age b {{ display: block; font-weight: 400; line-height: 1; color: {INK}; }}
    .a1 {{ top: 110px; }} .a1 b {{ font-size: 140px; }}
    .a2 {{ top: 560px; transform-origin: left center; }} .a2 b {{ font-size: 250px; }}
    .arw {{ position: absolute; left: 880px; top: 340px; height: 200px; width: 700px; transform-origin: 0 0; }}
    .arw i {{ position: absolute; left: 0; top: 0; width: 8px; height: 186px; background: {INK}; border-radius: 4px; }}
    .arw i::after {{ content: ""; position: absolute; left: -18px; bottom: -14px; border-left: 22px solid transparent;
      border-right: 22px solid transparent; border-top: 30px solid {INK}; }}
    .arw em {{ position: absolute; left: 70px; top: 46px; font-style: normal; font-size: 100px; line-height: 1; color: {AMBER}; }}
"""
    tw = [
        _grow(f"#{p}-base", c[0] + 0.15, 0.8),
        _fade(f"#{p}-tl", c[0] + 0.3),
        _grow(f"#{p}-fill", q[1], 1.6),
        _pop(f"#{p}-big", q[1], 1.0, 0.2),
        _count(f"{p}-n", q[1], 1.6, 34),
        _fade(f"#{p}-tr", q[1] + 1.45),
        _fade(f"#{p}-yr", q[2] + 1.25, 0.3),
        _grow(f"#{p}-arw", q[3] + 0.9, 0.45, "Y", "power2.out"),
        _pop(f"#{p}-a2", q[3] + 1.6, 1.12, 0.35),
    ]
    return wrap(sid, dur, css, markup, _script(sid, tw))


# ============================================================================ calendar (SHOTS 9)

CW, CH, CG = 200, 230, 16
DAYS = [list(range(8, 15)), list(range(15, 21))]


def _grid(p, key, x0, y0, s, state, words=None):
    """Calendar cells 1/8~1/20 (two rows of a week). state(d) -> 'empty' | 'fill' | 'fillh' (filled later) | 'hatch' | 'hatchh'."""
    out = []
    w, h, g = round(CW * s), round(CH * s), round(CG * s)
    for r, row in enumerate(DAYS):
        for i, d in enumerate(row):
            st = state(d)
            x, y = x0 + i * (w + g), y0 + r * (h + g)
            fid = f' id="{p}-{key}{d}"' if st.endswith("h") else ""
            fcls = ("fl" if st.startswith("fill") else "ht" if st.startswith("hatch") else "") + (" h" if st.endswith("h") else "")
            word = (words or {}).get(d, "조사" if st.startswith("fill") else "")
            wd = f'<em>{word}</em>' if word and s >= 0.9 else ""
            out.append(f'<div class="cell{" sm" if s < 0.9 else ""}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">'
                       + (f'<i{fid} class="{fcls}"></i>' if fcls else "")
                       + f'<b class="disp">{d}</b>{wd}</div>')
    return "".join(out)


def calendar(sid, dur, q):
    """▶c1 board A calendar 1/8~1/20 (13 cells), 8~10·12~14 fill / c2 "체포 없이 · 임의 조사" /
    ▶c3 re-frame: calendar small left, dashed warrant card (paper, 42 %) "청구 못 함" / c4 "범인을 가리키는 증거 없음" /
    ▶c5 board B full calendar, 15~17 hatched "조사 없음" / ▶c6 re-frame: 18~20 big + "13일 중 9일" /
    ▶c7 number board "70시간+" (amber, the scene's one focus) on an hours axis with 1심 74 · 2심 81. F33 F64 F14 F221 F34 F36 F60 F37 F38."""
    c = _cuts(q, dur, [2, 4, 5, 6])
    p = sid
    worked = {8, 9, 10, 12, 13, 14}
    gx, gy = 212, 190
    A = (f'<div class="hd">1985년 1월 · 그가 조사받은 날</div>'
         + _grid(p, "a", gx, gy, 1, lambda d: "fillh" if d in worked else "empty")
         + f'<div id="{p}-l1" class="lab l1 h">체포 없이 · <b class="disp">임의 조사</b></div>')
    A2 = (f'<div class="hd sm">1985년 1월</div>'
          + _grid(p, "s", 96, 250, 0.36, lambda d: "fill" if d in worked else "empty")
          + f"""<div class="paper wr"><i class="dash"></i>
            <div class="wt disp">체포영장</div>
            <div class="blank"><i></i><i></i><i></i></div>
            <div id="{p}-st" class="stamp h"><b class="disp">청구 못 함</b><span>자백 전까지</span></div></div>
          <div id="{p}-l2" class="lab l2 h">범인을 가리키는<b class="disp">증거 없음</b></div>""")
    B = (f'<div class="hd">1985년 1월 · 그가 조사받은 날</div>'
         + _grid(p, "b", gx, gy, 1, lambda d: "fill" if d in worked else "hatchh" if d in (15, 16, 17) else "empty",
                 {15: "", 16: "", 17: ""})
         + f'<div id="{p}-l3" class="lab l3 h"><b class="disp">조사 없음</b></div>')
    chips = []
    for k, d in enumerate(range(8, 21)):
        st = "fl" if d in worked or d >= 18 else "ht" if d in (15, 16, 17) else ""
        chips.append(f'<div class="chip" style="left:{212 + k * 116}px"><i class="{st}"></i><b class="disp">{d}</b></div>')
    big = "".join(f'<div class="paper bc" style="left:{212 + k * 370}px"><span>1월</span><b class="disp">{d}</b><em>{w}</em></div>'
                  for k, (d, w) in enumerate([(18, "조사"), (19, "조사"), (20, "자백")]))
    C = ("".join(chips) + big
         + f'<div class="ctr"><span>13일 가운데</span><b class="disp"><i id="{p}-n9">0</i>일</b><em>조사한 날</em></div>')
    D = f"""<div class="hd2">법원이 따진 조사 시간</div>
      <div class="hr disp"><b id="{p}-n70">0</b>시간<i id="{p}-plus" class="h">+</i></div>
      <div class="hax"><i class="base"></i><i id="{p}-hf" class="fill h"></i>
        <span class="z">0</span>
        <div id="{p}-m1" class="mk up h" style="left:{round(74 * 15.56)}px"><i></i><span>1심 약 74</span></div>
        <div id="{p}-m2" class="mk dn h" style="left:{round(81 * 15.56)}px"><i></i><span>2심 약 81</span></div></div>"""
    markup = "\n".join([
        _board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B),
        _board(p, 3, c[3], c[4], C), _board(p, 4, c[4], c[5], D),
        _tag(p, 0, c[0], c[1]), _tag(p, 1, c[1], c[2], "도식 · 실제 영장 아님"), _tag(p, 2, c[2], c[5])])
    css = BASE_CSS + f"""
    .hd {{ position: absolute; left: 212px; top: 112px; font-size: 44px; color: rgba(233,229,221,.88); }}
    .hd.sm {{ left: 96px; top: 186px; font-size: 40px; }}
    .cell {{ position: absolute; border: 3px solid rgba(233,229,221,.5); border-radius: 6px; overflow: hidden; }}
    .cell > i {{ position: absolute; inset: -3px; }}
    .cell .fl {{ background: {PAPER}; }}
    .cell .ht {{ background: repeating-linear-gradient(135deg, rgba(233,229,221,.34) 0 10px, rgba(233,229,221,0) 10px 26px); }}
    .cell b {{ position: absolute; left: 22px; top: 14px; font-size: 104px; line-height: 1; font-weight: 400; color: rgba(233,229,221,.7); }}
    .cell em {{ position: absolute; left: 24px; bottom: 16px; font-style: normal; font-size: 38px; color: {DARK}; }}
    .cell .fl ~ b {{ color: {DARK}; }}
    .cell.sm {{ border-width: 2px; border-radius: 4px; }}
    .cell.sm b {{ left: 8px; top: 6px; font-size: 40px; }}
    .lab b {{ font-weight: 400; }}
    .l1 {{ left: 212px; top: 704px; font-size: 52px; }} .l1 b {{ font-size: 64px; }}
    .wr {{ left: 690px; top: 96px; width: 1134px; height: 794px; }}
    .wr .dash {{ position: absolute; inset: 26px; border: 6px dashed rgba(30,33,37,.55); border-radius: 4px; }}
    .wt {{ position: absolute; left: 80px; top: 64px; font-size: 96px; letter-spacing: .12em; }}
    .blank {{ position: absolute; left: 80px; right: 80px; top: 230px; }}
    .blank i {{ display: block; height: 0; border-top: 4px dashed rgba(30,33,37,.4); margin-bottom: 80px; }}
    .stamp {{ position: absolute; left: 150px; top: 330px; width: 834px; padding: 30px 0 34px; text-align: center;
      border: 12px solid {DARK}; border-radius: 14px; transform: rotate(-4deg); background: {PAPER}; }}
    .stamp b {{ display: block; font-weight: 400; font-size: 168px; line-height: 1; }}
    .stamp span {{ display: block; font-size: 48px; margin-top: 16px; }}
    .l2 {{ left: 96px; top: 560px; width: 540px; font-size: 46px; line-height: 1.3; }} .l2 b {{ display: block; font-size: 96px; line-height: 1.1; }}
    .l3 {{ left: 212px; top: 704px; font-size: 64px; }}
    .chip {{ position: absolute; top: 112px; width: 104px; height: 96px; border: 3px solid rgba(233,229,221,.5); border-radius: 6px; overflow: hidden; }}
    .chip i {{ position: absolute; inset: -3px; }}
    .chip i.fl {{ background: {PAPER}; }}
    .chip i.ht {{ background: repeating-linear-gradient(135deg, rgba(233,229,221,.34) 0 8px, rgba(233,229,221,0) 8px 20px); }}
    .chip b {{ position: absolute; left: 0; right: 0; top: 22px; text-align: center; font-size: 48px; line-height: 1; font-weight: 400; color: rgba(233,229,221,.7); }}
    .chip i.fl ~ b {{ color: {DARK}; }}
    .bc {{ top: 262px; width: 340px; height: 620px; }}
    .bc span {{ position: absolute; left: 34px; top: 30px; font-size: 44px; }}
    .bc b {{ position: absolute; left: 26px; top: 120px; font-size: 250px; line-height: 1; font-weight: 400; }}
    .bc em {{ position: absolute; left: 34px; bottom: 40px; font-style: normal; font-size: 64px; }}
    .ctr {{ position: absolute; left: 1360px; top: 300px; width: 470px; text-align: center; }}
    .ctr span, .ctr em {{ display: block; font-style: normal; font-size: 56px; color: rgba(233,229,221,.9); }}
    .ctr b {{ display: block; font-weight: 400; font-size: 280px; line-height: 1.02; color: {INK}; }}
    .ctr b i {{ font-style: normal; }}
    .hd2 {{ position: absolute; left: 0; right: 0; top: 100px; text-align: center; font-size: 50px; color: rgba(233,229,221,.9); }}
    .hr {{ position: absolute; left: 0; right: 0; top: 170px; text-align: center; font-size: 280px; line-height: 1; color: {AMBER}; }}
    .hr b {{ font-weight: 400; }} .hr i {{ font-style: normal; display: inline-block; }}
    .hax {{ position: absolute; left: 260px; top: 640px; width: 1400px; height: 16px; }}
    .hax .base, .hax .fill {{ position: absolute; left: 0; top: 0; height: 16px; border-radius: 8px; transform-origin: left center; }}
    .hax .base {{ width: 1400px; background: rgba(233,229,221,.28); }}
    .hax .fill {{ width: {round(70 * 15.56)}px; background: {INK}; }}
    .hax .z {{ position: absolute; left: -10px; top: 34px; font-size: 40px; color: rgba(233,229,221,.8); }}
    .mk {{ position: absolute; top: 0; }}
    .mk i {{ position: absolute; left: -3px; width: 6px; height: 70px; background: {INK}; }}
    .mk span {{ position: absolute; white-space: nowrap; font-size: 44px; color: {INK}; transform: translateX(-50%); }}
    .mk.up i {{ top: -70px; }} .mk.up span {{ top: -128px; }}
    .mk.dn i {{ top: 16px; }} .mk.dn span {{ top: 92px; }}
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
        _slide(f"#{p}-l2", q[3] + 0.1),
    ]
    for k, d in enumerate([15, 16, 17]):
        tw.append(_fade(f"#{p}-b{d}", q[4] + 0.2 + k * 0.2, 0.3))
    tw += [
        _slide(f"#{p}-l3", q[4] + 1.2),
        _count(f"{p}-n9", q[5] + 1.6, 1.1, 9),
        _grow(f"#{p}-hf", q[6] + 0.15, 1.9),
        _count(f"{p}-n70", q[6] + 0.15, 1.9, 70),
        _pop(f"#{p}-plus", q[6] + 2.1, 1.4, 0.25),
        _fade(f"#{p}-m1", q[6] + 2.4, 0.3),
        _fade(f"#{p}-m2", q[6] + 2.8, 0.3),
    ]
    return wrap(sid, dur, css, markup, _script(sid, tw))


# ============================================================================ feb5_change (SHOTS 20)

INS_CSS = f"""
    .ar-shot {{ position: absolute; inset: 0; background: {BOARD}; overflow: hidden; }}
    .ar-ins {{ z-index: 20; }}
    .ar-cam {{ position: absolute; inset: 0; transform-origin: 50% 43%; }}
    .ar-print {{ position: absolute; left: 50%; top: 43%; margin: 0; padding: 0; background: #EDE8DE;
      outline: 18px solid #EDE8DE; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 6px 18px rgba(0,0,0,.5); }}
    .ar-img {{ display: block; }}
    .ar-ul {{ position: absolute; height: 8px; background: {AMBER}; border-radius: 4px; transform-origin: left center; }}
    .ar-cap {{ position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-size: 36px; color: rgba(233,229,221,.9); }}
    .ar-credit {{ position: absolute; right: 64px; bottom: 30px; font-size: 28px; color: rgba(233,229,221,.78); }}
    .tag-ar {{ border-color: {AMBER}; }}"""


def _strip_insert(sid, at, dur, src, size, ul, caption, credit, n=0):
    """~3 s record cut of one document line as a wide paper strip (1760 px, like archive_scene mode "strip"), with an amber
    underline under the phrase the caption quotes (ul = (x0, x1) in 0..1 of the strip width), drawn 0.45 s after the cut.
    Returns (markup, tweens). Scene boards end at `at` and resume at `at + dur`, so nothing is hidden beneath it."""
    w, h = size
    k = min(1760 / w, 320 / h, 2.6)
    pw, ph = round(w * k), round(h * k)
    iid = f"{sid}-ins{n}"
    fig = (f'<figure class="ar-print" style="width:{pw}px;height:{ph}px;transform:translate(-50%,-50%)">'
           f'<img class="ar-img" src="{src}" alt="" style="width:{pw}px;height:{ph}px" data-color-grading=\'{ARCHIVE_GRADE}\'/>'
           f'<i id="{iid}-ul" class="ar-ul h" style="left:{round(ul[0] * pw)}px;width:{round((ul[1] - ul[0]) * pw)}px;top:{ph + 2}px"></i>'
           f'</figure>')
    inner = (f'<div id="{iid}-cam" class="ar-cam">{fig}</div><div class="ar-cap">{caption}</div>'
             f'<div class="ar-credit">{credit}</div><div class="tag-re tag-ar">기록</div>')
    markup = "    " + clip(iid, round(at, 2), dur, "ar-shot ar-ins", inner, extra=" data-layout-allow-overlap")
    tw = [f'    tl.fromTo("#{iid}-cam", {{ scale: 1.0 }}, {{ scale: 1.05, duration: {round(dur, 2)}, ease: "none" }}, {round(at, 2)});',
          _grow(f"#{iid}-ul", at + 0.45, 0.6, "X", "power2.out")]
    return markup, "\n".join(tw)


def feb5_change(sid, dur, q):
    """Ledger before → after, three rows, one row enlarged at a time (no three-card line-up).
    ▶c1 board A paper card "2월 5일 자 조서" / c2 empty frames ①②③ / ▶c3 re-frame: row ① big band, "강에 버림" struck →
    "아궁이에서 태움" / ▶c4 board B quote card "조서에 적힌 경찰의 물음" / ▶c5 record 3 s: [2] p.4 l.20 strip /
    ▶c6 board C whole ledger, row ② (amber, the scene's one focus) / ▶c7 re-frame: row ③ big band. F73 F74 F75 F76 F81 (+F67, X05 note)."""
    c = _cuts(q, dur, [2, 3, 4, 5, 6])  # c[3] = record cut start, c[4] = board C
    p = sid
    A = f"""<div class="paper doc"><span class="k">경찰 조서</span><b class="disp">2월 5일 자</b><b class="disp big">조서</b>
        <em>1985년 · 고법 결정문이 요약한 내용</em></div>
      <div id="{p}-fh" class="fh h">바뀐 진술</div>
      <div id="{p}-f1" class="frm h" style="top:200px"><b class="disp">①</b></div>
      <div id="{p}-f2" class="frm h" style="top:420px"><b class="disp">②</b></div>
      <div id="{p}-f3" class="frm h" style="top:640px"><b class="disp">③</b></div>"""
    A2 = f"""<div class="hd3">2월 5일 자 조서 · 바뀐 진술 <b class="disp">①</b></div>
      <div class="paper band b1"><div class="it"><b class="disp">①</b><span class="disp">장갑</span></div>
        <div class="ct"><div class="old">강에 버림<i id="{p}-strike" class="strike h"></i></div>
          <div id="{p}-new1" class="new disp h">→ 아궁이에서 태움</div></div></div>
      <div class="ghost" style="left:96px"><b class="disp">②</b></div><div class="ghost" style="left:968px"><b class="disp">③</b></div>"""
    B = f"""<div class="mini"><b class="disp">① 장갑</b><span>강 → 아궁이</span></div><i class="link"></i>
      <div class="paper qc"><span class="k">2월 5일 자 조서 속 그의 설명</span>
        <b class="disp">경찰의 물음</b><i class="qm o disp">「</i><i class="qm c disp">」</i>
        <em id="{p}-qn" class="h">원문은 고법 결정문 4쪽 20행</em></div>"""
    C = f"""<div class="hd3">2월 5일 자 조서 · 바뀐 진술</div>
      <div class="paper row r1"><b class="disp">① 장갑</b><span>강 → 아궁이에서 태움</span></div>
      <div class="paper row r2"><i class="am"></i><b class="disp">② 칼자루</b>
        <span class="was">이전 진술에 없던 이야기</span>
        <div id="{p}-new2" class="new2 disp h">낡은 플란넬 <u>셔츠 천<i id="{p}-ul2" class="h"></i></u>을 감음</div></div>
      <div class="row r3"><b class="disp">③</b></div>"""
    D = f"""<div class="hd3">2월 5일 자 조서 · 바뀐 진술 <b class="disp">③</b></div>
      <div class="paper sm s1"><b class="disp">① 장갑</b><span>강 → 아궁이에서 태움</span></div>
      <div class="paper sm s2"><i class="am"></i><b class="disp">② 칼자루</b><span>낡은 플란넬 셔츠 천을 감음</span></div>
      <div class="paper band b3"><div class="it"><b class="disp">③</b><span class="disp">구두</span></div>
        <div class="ct"><div id="{p}-old3" class="old h">가죽 구두</div>
          <div id="{p}-new3" class="new disp h">→ 고무 구두로 갈아 신음</div></div></div>"""
    im, itw = _strip_insert(p, c[3], round(c[4] - c[3], 2), "assets/archive/kousai-p4-l20.png", (2798, 122), (0.168, 0.885),
                            "2월 5일 자 조서 속 그의 설명 — 고법 결정문 4쪽 20행", "후쿠오카고법 결정문(2017) · 조서 요약 부분")
    tagt = "도식 · 실제 조서 아님"
    markup = "\n".join([
        _board(p, 0, c[0], c[1], A), _board(p, 1, c[1], c[2], A2), _board(p, 2, c[2], c[3], B), im,
        _board(p, 3, c[4], c[5], C), _board(p, 4, c[5], c[6], D),
        _tag(p, 0, c[0], c[3], tagt), _tag(p, 1, c[4], c[6], tagt)])
    css = BASE_CSS + INS_CSS + f"""
    .k {{ display: block; font-size: 40px; opacity: .72; }}
    .doc {{ left: 120px; top: 96px; width: 780px; height: 794px; padding: 64px 70px; }}
    .doc b {{ display: block; font-weight: 400; font-size: 110px; line-height: 1.1; margin-top: 34px; }}
    .doc b.big {{ font-size: 230px; margin-top: 0; }}
    .doc em {{ position: absolute; left: 70px; right: 70px; bottom: 60px; font-style: normal; font-size: 38px; padding-top: 22px;
      border-top: 4px solid rgba(30,33,37,.5); }}
    .fh {{ position: absolute; left: 980px; top: 110px; font-size: 48px; color: rgba(233,229,221,.9); }}
    .frm {{ position: absolute; left: 980px; width: 844px; height: 190px; border: 4px solid rgba(233,229,221,.55); border-radius: 6px;
      transform-origin: left center; }}
    .frm b {{ position: absolute; left: 34px; top: 40px; font-size: 100px; line-height: 1; font-weight: 400; color: {INK}; }}
    .hd3 {{ position: absolute; left: 96px; top: 140px; font-size: 48px; color: rgba(233,229,221,.9); }}
    .hd3 b {{ font-weight: 400; }}
    .band {{ left: 96px; width: 1728px; display: flex; align-items: center; }}
    .b1 {{ top: 232px; height: 480px; }} .b3 {{ top: 400px; height: 490px; }}
    .band .it {{ width: 400px; padding-left: 60px; display: flex; flex-direction: column; }}
    .band .it b {{ font-weight: 400; font-size: 110px; line-height: 1; }}
    .band .it span {{ font-size: 130px; line-height: 1.1; }}
    .band .ct {{ flex: 1; border-left: 4px solid rgba(30,33,37,.4); padding: 20px 0 20px 64px; }}
    .old {{ position: relative; display: inline-block; font-size: 72px; color: rgba(30,33,37,.62); }}
    .strike {{ position: absolute; left: -10px; right: -10px; top: 48%; height: 8px; background: {DARK}; transform-origin: left center; }}
    .new {{ font-size: 112px; line-height: 1.15; margin-top: 28px; }}
    .ghost {{ position: absolute; top: 760px; width: 856px; height: 120px; border: 4px solid rgba(233,229,221,.55); border-radius: 6px; opacity: .25; }}
    .ghost b {{ position: absolute; left: 28px; top: 18px; font-size: 76px; line-height: 1; font-weight: 400; color: {INK}; }}
    .mini {{ position: absolute; left: 96px; top: 400px; width: 560px; height: 200px; background: {PAPER}; color: {DARK}; opacity: .25;
      padding: 30px 40px; }}
    .mini b {{ display: block; font-weight: 400; font-size: 64px; }} .mini span {{ font-size: 46px; }}
    .link {{ position: absolute; left: 656px; top: 498px; width: 164px; height: 4px; background: rgba(233,229,221,.6); border-radius: 2px; }}
    .qc {{ left: 820px; top: 96px; width: 1004px; height: 794px; padding: 70px 76px; }}
    .qc b {{ display: block; font-weight: 400; font-size: 150px; line-height: 1.1; margin-top: 30px; }}
    .qm {{ position: absolute; font-style: normal; font-size: 220px; line-height: 1; color: rgba(30,33,37,.35); }}
    .qm.o {{ left: 60px; top: 420px; }} .qm.c {{ right: 60px; top: 520px; }}
    .qc em {{ position: absolute; left: 76px; right: 76px; bottom: 64px; font-style: normal; font-size: 40px; text-align: center; }}
    .row {{ position: absolute; left: 96px; width: 1728px; display: flex; align-items: center; padding-left: 60px; }}
    .row b {{ font-weight: 400; width: 420px; }}
    .r1 {{ top: 216px; height: 150px; opacity: .25; }} .r1 b {{ font-size: 76px; }} .r1 span {{ font-size: 56px; }}
    .r2 {{ top: 392px; height: 300px; flex-wrap: wrap; align-content: center; }}
    .r2 b {{ font-size: 100px; line-height: 1; }}
    .r2 .was {{ font-size: 44px; color: rgba(30,33,37,.66); }}
    .am {{ position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: {AMBER}; }}
    .new2 {{ width: 100%; font-size: 100px; line-height: 1.1; margin-top: 30px; }}
    .new2 u {{ position: relative; text-decoration: none; }}
    .new2 u i {{ position: absolute; left: 0; right: 0; bottom: -8px; height: 12px; background: {AMBER}; transform-origin: left center; }}
    .r3 {{ top: 718px; height: 150px; border: 4px solid rgba(233,229,221,.55); border-radius: 6px; }}
    .r3 b {{ font-size: 90px; color: {INK}; }}
    .sm {{ left: 96px; width: 1728px; height: 96px; display: flex; align-items: center; padding-left: 50px; opacity: .25; box-shadow: none; }}
    .sm b {{ font-weight: 400; font-size: 56px; width: 360px; }} .sm span {{ font-size: 46px; }}
    .s1 {{ top: 210px; }} .s2 {{ top: 290px; }}
"""
    tw = [
        _fade(f"#{p}-fh", q[1] + 0.05, 0.3),
        _grow(f"#{p}-f1", q[1] + 0.1, 0.4, "X", "power3.out"),
        _grow(f"#{p}-f2", q[1] + 0.35, 0.4, "X", "power3.out"),
        _grow(f"#{p}-f3", q[1] + 0.6, 0.4, "X", "power3.out"),
        _grow(f"#{p}-strike", q[2] + 0.9, 0.35, "X", "power2.out"),
        _slide(f"#{p}-new1", q[2] + 1.55, -36),
        _fade(f"#{p}-qn", q[3] + 1.4, 0.4),
        itw,
        _slide(f"#{p}-new2", q[5] + 0.8, -36),
        _grow(f"#{p}-ul2", q[5] + 1.6, 0.5, "X", "power2.out"),
        _fade(f"#{p}-old3", q[6] + 0.45, 0.3),
        _slide(f"#{p}-new3", q[6] + 1.5, -36),
    ]
    return wrap(sid, dur, css, markup, _script(sid, tw))


def diagram_sfx(DATA):
    """Optional sfx for these boards (for the editor to merge into scenes.sfx_events): number landings."""
    st = {s["id"]: s for s in DATA["scenes"]}
    ev = []
    if "counter34" in st:
        s = st["counter34"]; c = s["captions"]
        ev.append(("impact-bass-1", c[1]["start"] + 1.6, 0.4))
    if "calendar" in st:
        s = st["calendar"]; c = s["captions"]
        ev += [("click-soft", c[2]["start"] + 1.35, 0.4), ("impact-bass-1", c[6]["start"] + 2.1, 0.4)]
    return ev
