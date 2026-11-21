"""ep01 서머턴 맨 — scene bodies. Shared helpers come from scenes_kit.py.

cues q[i] is the scene-local start (s) of caption i; visuals land on their caption.
"""
from scenes_kit import *  # noqa: F401,F403
from scenes_kit import AMBER, INK, GROUND, BOARD, wrap, clip, scene3d, cam_shots, person_card, archive_scene, archive_insert  # noqa: F401


POLICE_1948 = "기록 사진: 남호주 경찰, 1948 (퍼블릭 도메인, Wikimedia Commons)"
POLICE_1949 = "기록 사진: 남호주 경찰, 1949 (퍼블릭 도메인, Wikimedia Commons)"


def hook(sid, dur, q):
    """Cold open: three real police records, one per caption (~3 s each), before the date opening."""
    return archive_scene(sid, dur, q, [
        {"src": "assets/archive/beach-deathsite-1948.jpg", "size": (500, 326), "at": 0, "focus": [(0, 0.22, 0.9, 0.07)],
         "caption": "1948년 12월, 서머턴 해변의 발견 지점", "credit": POLICE_1948},
        {"src": "assets/archive/person-bust-1949.jpg", "size": (300, 261), "at": 1, "tilt": 1.4,
         "caption": "1949년 경찰 신원 확인 포스터의 사진", "credit": "기록 사진: 남호주 경찰 포스터, 1949 (퍼블릭 도메인, Wikimedia Commons)"},
        {"src": "assets/archive/code-rubaiyat-1949.jpg", "size": (1600, 1279), "at": 2, "focus": [(2, 0.5, 0.62, 0.42)],
         "caption": "『루바이야트』 뒤표지에 눌린 글자, 경찰 사진", "credit": POLICE_1949},
    ])


def beach(sid, dur, q):
    cam = cam_shots([
        (0, [10, 5.2, 15], [0, 0.6, -2.6], 34),
        (q[1] - 0.1, [6.5, 0.9, 6.0], [-0.5, 0.9, -2.8], 30),
        (q[2], [2.6, 1.25, 2.2], [0, 0.45, -2.5], 32),
        (q[3], [1.0, 0.42, -0.6], [-0.05, 0.16, -1.9], 32),
        (q[4], [-1.35, 0.95, -1.35], [-0.05, 0.5, -2.8], 30),
    ], dur)
    opts = f'{{ mode: "morning", camera: {cam} }}'
    overlay = f"""    {clip('beach-date', q[0], q[2] - q[0] - 0.2, 'stamp disp', '1948.12.01<small>오전 6:30</small>')}
    {clip('beach-place', q[1], q[2] - q[1] - 0.2, 'place', '서머턴 해변<small>호주 애들레이드 남서쪽 약 11km</small>')}"""
    css = """
    .stamp { position: absolute; left: 96px; top: 150px; font-size: 120px; line-height: 1; color: #F3F0EA; background: rgba(20,22,25,.6); padding: 26px 36px 30px; }
    .stamp small, .place small { display: block; font-family: "Gothic A1", sans-serif; font-size: 40px; margin-top: 18px; color: #F3F0EA; }
    .place { position: absolute; right: 96px; top: 150px; text-align: right; font-family: "Black Han Sans"; font-size: 84px; color: #F3F0EA; background: rgba(20,22,25,.6); padding: 26px 36px 30px; }
    .place small { font-size: 32px; opacity: .85; }"""
    tweens = f"""    tl.fromTo("#beach-date", {{ opacity: 0, x: -24 }}, {{ opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }}, {q[0]});
    tl.to("#beach-date", {{ opacity: 0, duration: 0.3, ease: "power2.in" }}, {q[2] - 0.55});
    tl.fromTo("#beach-place", {{ opacity: 0, clipPath: "inset(0 0 0 100%)" }}, {{ opacity: 1, clipPath: "inset(0 0 0 0%)", duration: 0.7, ease: "power3.out" }}, {q[1]});
    tl.to("#beach-place", {{ opacity: 0, duration: 0.3, ease: "power2.in" }}, {q[2] - 0.55});"""
    return scene3d(sid, dur, "beach", "createBeach", opts, overlay, tweens, css)


def dusk(sid, dur, q):
    cam = cam_shots([
        (0, [4.2, 1.5, 4.6], [-1.6, 1.4, -3.6], 36),
        (q[1], [-6.2, 2.8, -7.4], [-2.3, 2.6, -4.7], 34),
        (q[2], [2.0, 0.95, 1.5], [-0.7, 1.05, -2.9], 36),
        (q[3], [1.5, 0.75, 0.3], [0.05, 0.6, -2.5], 32),
        (q[4], [5.8, 0.55, 3.2], [-1.2, 2.6, -3.4], 36),
        (q[5], [-1.0, 1.05, -1.75], [0.0, 0.7, -2.85], 30),
        (q[6], [6.0, 2.4, 6.2], [-1.5, 1.3, -3.5], 34),
    ], dur)
    opts = f'{{ mode: "dusk", camera: {cam}, cues: {{ arm: {q[3] + 0.3}, lampsOn: {q[4] + 0.2} }} }}'
    overlay = f"""    {clip('dusk-rew', q[0], q[1] - q[0] + 2.6, 'rew disp', '<span>◀◀</span> 하루 전')}
    {clip('dusk-time', q[1], dur - q[1], 'clock disp', '<b>11.30</b><i id="dusk-hh">오후 7:00</i>')}"""
    css = """
    .rew { position: absolute; left: 96px; top: 150px; font-size: 96px; color: #F3F0EA; background: rgba(20,22,25,.6); padding: 20px 36px 26px; }
    .rew span { color: #F0A23B; font-size: 70px; margin-right: 18px; }
    .clock { position: absolute; right: 96px; top: 150px; text-align: right; font-size: 92px; color: #F3F0EA; line-height: 1.05; background: rgba(20,22,25,.6); padding: 22px 36px 26px; }
    .clock b { font-weight: 400; display: block; }
    .clock i { font-style: normal; display: block; font-size: 64px; color: #F0A23B; }"""
    tweens = f"""    tl.fromTo("#dusk-rew", {{ opacity: 0, x: 40 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[0]});
    tl.to("#dusk-rew", {{ opacity: 0, duration: 0.3 }}, {q[1] + 2.2});
    tl.fromTo("#dusk-time", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.5, ease: "power3.out" }}, {q[1]});
    tl.set("#dusk-hh", {{ textContent: "오후 7:30" }}, {q[4]});
    tl.to("#dusk-hh", {{ opacity: 0.2, duration: 0.05 }}, {q[4] - 0.05});
    tl.to("#dusk-hh", {{ opacity: 1, duration: 0.4 }}, {q[4]});
    tl.to("#dusk-time", {{ opacity: 0, duration: 0.3 }}, {dur - 0.4});"""
    return scene3d(sid, dur, "beach", "createBeach", opts, overlay, tweens, css)


def station(sid, dur, q):
    cam = cam_shots([
        (0, [-5.5, 2.6, 7.5], [0, 1.4, 0], 36),
        (q[1], [-2.2, 2.0, 3.8], [0, 1.15, 0], 34),
        (q[2], [1.6, 2.6, 2.2], [0, 1.1, 0], 30),
        (q[3], [-1.2, 2.25, 2.0], [0, 1.1, 0], 32),
        (q[4], [-0.5, 1.75, 1.1], [0.2, 1.15, 0.05], 28),
        (q[5], [-0.15, 1.6, 0.95], [-0.62, 1.07, 0.15], 30),
        (q[6], [-3.6, 2.2, 4.2], [0, 1.2, 0], 34),
    ], dur)
    opts = f'{{ camera: {cam}, cues: {{ open: {q[3] - 0.2}, thread: {q[3] + 0.4}, tie: {q[5] - 0.2} }} }}'
    overlay = f"""    {clip('st-date', q[0], q[2] - q[0], 'stamp disp', '1949.01.14<small>애들레이드 기차역 수하물 보관소</small>')}
    {clip('st-ticket', q[2], q[3] - q[2] + 0.2, 'ticket', '<b>맡긴 시각</b><span class="disp">1948.11.30 오전 11:00 이후</span><em>사망 추정 약 15시간 전</em>')}
    {clip('st-match', q[4] - 0.1, q[5] - q[4] + 0.5, 'match', '<div class="m-a"><svg width="300" height="190" viewBox="0 0 300 190"><path d="M70 20 h160 v40 l-14 10 l14 10 v80 h-160 v-80 l14 -10 l-14 -10 z" fill="#D8D2C4"/><line x1="78" x2="222" y1="78" y2="81" stroke="#F0A23B" stroke-width="7" stroke-linecap="round"/><line x1="78" x2="222" y1="87" y2="90" stroke="#F0A23B" stroke-width="7" stroke-linecap="round"/><line x1="78" x2="222" y1="96" y2="99" stroke="#F0A23B" stroke-width="7" stroke-linecap="round"/><line x1="78" x2="222" y1="105" y2="108" stroke="#F0A23B" stroke-width="7" stroke-linecap="round"/><line x1="78" x2="222" y1="114" y2="117" stroke="#F0A23B" stroke-width="7" stroke-linecap="round"/><line x1="78" x2="222" y1="123" y2="126" stroke="#F0A23B" stroke-width="7" stroke-linecap="round"/></svg><b>가방 속 실타래</b></div><div class="m-eq disp">=</div><div class="m-b"><svg width="300" height="190" viewBox="0 0 300 190"><defs><pattern id="tw" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#4A3D30"/><rect width="5" height="10" fill="#3E3328"/></pattern></defs><rect x="10" y="10" width="280" height="170" fill="url(#tw)"/><path d="M30 120 C 100 60, 200 60, 270 110" fill="none" stroke="#2A2017" stroke-width="10"/><path d="M30 120 C 100 60, 200 60, 270 110" fill="none" stroke="#F0A23B" stroke-width="6" stroke-dasharray="16 10"/></svg><b>바지 주머니 수선 자국</b></div><p class="m-note">같은 주황색 왁스 실 · 호주에서 팔지 않던 종류</p>')}
    {clip('st-name', q[5], dur - q[5], 'nametag', '<span class="disp">T. KEANE</span><em id="st-none">실종 신고 일치: 0건</em>')}"""
    css = """
    .stamp { position: absolute; left: 96px; top: 150px; font-size: 110px; line-height: 1; color: #F3F0EA; }
    .stamp small { display: block; font-family: "Gothic A1"; font-size: 38px; margin-top: 18px; }
    .ticket { position: absolute; right: 120px; top: 170px; width: 780px; padding: 30px 36px; background: #D8D2C4; color: #1E2125; border-left: 10px solid #F0A23B; }
    .ticket b { display: block; font-size: 30px; font-weight: 500; opacity: .7; }
    .ticket span { display: block; font-size: 46px; margin-top: 8px; white-space: nowrap; }
    .ticket em { display: block; font-style: normal; font-size: 30px; margin-top: 10px; }
    .match { position: absolute; right: 96px; top: 140px; display: flex; flex-wrap: wrap; align-items: center; gap: 22px; width: 880px;
      background: rgba(20,22,25,.86); padding: 30px 34px 26px; }
    .match .m-a, .match .m-b { width: 330px; text-align: center; }
    .match svg { display: block; margin: 0 auto 12px; }
    .match b { font-size: 34px; font-weight: 500; color: #F3F0EA; }
    .m-eq { font-size: 110px; color: #F0A23B; width: 80px; text-align: center; }
    .m-note { width: 100%; text-align: center; font-size: 34px; color: #F0A23B; margin-top: 6px; }
    .nametag { position: absolute; right: 120px; top: 170px; text-align: right; }
    .nametag span { display: inline-block; font-size: 120px; color: #1E2125; background: #E9E5DD; padding: 6px 34px 14px; transform: rotate(-2deg); }
    .nametag em { display: block; font-style: normal; font-size: 46px; margin-top: 36px; color: #F3F0EA; }"""
    tweens = f"""    tl.fromTo("#st-date", {{ opacity: 0, x: -24 }}, {{ opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }}, {q[0]});
    tl.to("#st-date", {{ opacity: 0, duration: 0.3 }}, {q[2] - 0.35});
    tl.fromTo("#st-ticket", {{ opacity: 0, y: -40, rotation: -3 }}, {{ opacity: 1, y: 0, rotation: 0, duration: 0.6, ease: "power3.out" }}, {q[2]});
    tl.to("#st-ticket", {{ opacity: 0, duration: 0.3 }}, {q[3] - 0.15});
    tl.fromTo("#st-match .m-a", {{ opacity: 0, x: -30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[4] - 0.1});
    tl.fromTo("#st-match .m-eq", {{ opacity: 0, scale: 0.6 }}, {{ opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }}, {q[4] + 0.6});
    tl.fromTo("#st-match .m-b", {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[4] + 0.3});
    tl.fromTo("#st-match .m-note", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, {q[4] + 0.8});
    tl.to("#st-match", {{ opacity: 0, duration: 0.25 }}, {q[5] + 0.1});
    tl.fromTo("#st-name span", {{ opacity: 0, scale: 1.25 }}, {{ opacity: 1, scale: 1, duration: 0.25, ease: "power4.out" }}, {q[5] + 0.35});
    tl.fromTo("#st-none", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {q[6]});"""
    ins, ins_css, ins_tw = archive_insert(sid, q[1] + 0.6, "assets/archive/suitcase-1949.jpg", (250, 295), focus=(0.33, 0.5, 0.2),
                                          caption="1949년 1월, 가방 속 옷을 살피는 형사들", credit=POLICE_1949)
    return scene3d(sid, dur, "station", "createStation", opts, overlay + "\n" + ins, tweens + "\n" + ins_tw, css + ins_css)


def ending(sid, dur, q):
    title_at = q[-1] + 2.6
    cam = cam_shots([
        (0, [-1.35, 0.95, -1.35], [-0.05, 0.5, -2.8], 30),
        (q[1], [3.2, 1.2, 1.6], [0, 0.6, -2.6], 32),
        (q[2], [7.0, 0.7, 6.5], [0, 0.9, -2.8], 34),
        (q[3], [14, 9, 22], [0, 0.6, -2.6], 34),
    ], dur, push=0.12)
    opts = f'{{ mode: "end", camera: {cam} }}'
    overlay = f"""    {clip('end-q1', q[1], q[3] - q[1] - 0.2, 'qlist', '<p id="end-qa">왜 상표를 잘라냈나</p><p id="end-qb">그날 밤 무슨 일이 있었나</p>')}
    {clip('end-title', title_at, dur - title_at, 'title', '<div class="disp"><em>73년</em> 만에<br/>이름을 찾은 해변의 남자</div><small>서머턴 맨 · 1948</small>', extra=' data-layout-allow-caption-zone')}"""
    css = """
    .qlist { position: absolute; left: 96px; top: 160px; background: rgba(20,22,25,.6); padding: 30px 40px 12px; }
    .qlist p { font-family: "Black Han Sans"; font-size: 72px; color: #F3F0EA; margin-bottom: 20px; text-shadow: 0 2px 16px rgba(0,0,0,.3); }
    .qlist p::before { content: "?"; color: #F0A23B; margin-right: 22px; }
    .title { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding-left: 140px; background: rgba(20,22,25,.55); }
    .title div { font-size: 128px; line-height: 1.12; color: #F3F0EA; }
    .title em { font-style: normal; color: #F0A23B; }
    .title small { font-size: 40px; margin-top: 34px; color: rgba(243,240,234,.8); letter-spacing: .04em; }"""
    tweens = f"""    tl.fromTo("#end-qa", {{ opacity: 0, x: -30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[1]});
    tl.fromTo("#end-qb", {{ opacity: 0, x: -30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[2]});
    tl.to("#end-q1", {{ opacity: 0, duration: 0.3 }}, {q[3] - 0.5});
    tl.fromTo("#end-title", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.6, ease: "power2.out" }}, {title_at});
    tl.fromTo("#end-title div", {{ clipPath: "inset(0 100% 0 0)" }}, {{ clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }}, {title_at + 0.1});"""
    return scene3d(sid, dur, "beach", "createBeach", opts, overlay, tweens, css)


# ---------------------------------------------------------------- 2D scenes

def evidence(sid, dur, q):
    # Top-down table: jacket with cut labels (left), missing items (right), then pocket contents.
    items = [
        ("ev-rail", "기차표<small>애들레이드→헨리 비치 · 미사용</small>", "left:160px;top:170px;width:500px;height:210px", "ticket", -6),
        ("ev-bus", "버스표", "left:690px;top:150px;width:300px;height:150px", "ticket bus", 5),
        ("ev-comb", "알루미늄 빗", "left:1100px;top:210px;width:520px;height:110px", "comb", -3),
        ("ev-gum", "껌 반 통", "left:260px;top:520px;width:320px;height:200px", "gum", 8),
        ("ev-cig", "담배갑<small>다른 상표 담배 7개비</small>", "left:700px;top:430px;width:330px;height:420px", "cigbox", -4),
        ("ev-match", "성냥", "left:1150px;top:500px;width:300px;height:230px", "match", 6),
    ]
    starts = [q[3] - 0.05, q[3] + 1.0, q[4] + 0.1, q[4] + 0.9, q[4] + 1.7, q[4] + 2.5]
    item_html = "\n".join(
        f'      <div id="{i}" class="item {cls}" style="{st}"><span>{lab}</span></div>' for (i, lab, st, cls, _) in items
    )
    markup = f"""    {clip('ev-table', 0, dur, 'table')}
    {clip('ev-a', 0, q[3] + 0.1, 'phase-a', '''
      <div id="ev-jacket" class="jacket"><svg width="760" height="820" viewBox="0 0 760 820"><path d="M40 150 L150 110 L172 770 L62 790 Z" fill="#463F37"/><path d="M720 150 L610 110 L588 770 L698 790 Z" fill="#463F37"/><path d="M150 110 L300 58 L380 120 L460 58 L610 110 L600 800 L160 800 Z" fill="#564E45"/><path d="M300 58 L380 120 L460 58 L446 430 L380 480 L314 430 Z" fill="#8C7A62"/><path d="M300 58 L314 430 L246 300 L236 150 Z" fill="#3E3832"/><path d="M460 58 L446 430 L514 300 L524 150 Z" fill="#3E3832"/><circle cx="380" cy="540" r="11" fill="#2A2622"/><circle cx="380" cy="620" r="11" fill="#2A2622"/><rect x="200" y="610" width="120" height="22" fill="#3E3832"/><rect x="440" y="610" width="120" height="22" fill="#3E3832"/><rect x="470" y="250" width="90" height="14" fill="#3E3832"/></svg><div id="ev-label" class="label"><span>상표</span></div><div id="ev-cut" class="cut"></div></div>
      <div id="ev-callout" class="callout"><b>상표 제거</b><span>입고 있던 모든 옷</span></div>
      <div class="missing">
        <div id="ev-m1" class="miss"><b>지갑</b><s>없음</s></div>
        <div id="ev-m2" class="miss"><b>신분증</b><s>없음</s></div>
        <div id="ev-m3" class="miss"><b>모자</b><s>없음</s></div>
      </div>''')}
    {clip('ev-b', q[3], dur - q[3], 'phase-b', chr(10) + item_html + chr(10) + '      <div class="pocket-title disp">주머니 속 물건</div>')}"""
    css = """
    .table { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 42%, #1D1F22 0%, #0E0F11 78%); }
    .phase-a, .phase-b { position: absolute; inset: 0; }
    .jacket { position: absolute; left: 230px; top: 110px; width: 760px; height: 820px; }
    .jacket svg { position: absolute; left: 0; top: 0; filter: drop-shadow(0 24px 30px rgba(0,0,0,.45)); }
    .label { position: absolute; left: 320px; top: 92px; width: 120px; height: 52px; background: #E5DFD2; color: #3A342E; font-size: 30px; display: flex; align-items: center; justify-content: center; }
    .cut { position: absolute; left: 306px; top: 80px; width: 148px; height: 76px; border: 5px dashed #F0A23B; opacity: 0; }
    .callout { position: absolute; left: 720px; top: 150px; padding: 14px 24px 18px; background: #1E2125; border-left: 8px solid #F0A23B; }
    .callout b { display: block; font-family: "Black Han Sans"; font-weight: 400; font-size: 52px; color: #F3F0EA; }
    .callout span { display: block; font-size: 32px; color: #E9E5DD; margin-top: 4px; }
    .missing { position: absolute; left: 1220px; top: 330px; }
    .miss { width: 560px; height: 150px; border: 3px dashed rgba(233,229,221,.45); margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
    .miss b { font-family: "Black Han Sans"; font-weight: 400; font-size: 72px; }
    .miss s { text-decoration: none; font-size: 40px; color: #F3F0EA; border: 3px solid #F3F0EA; padding: 4px 18px 8px; transform: rotate(-6deg); display: inline-block; }
    .item { position: absolute; display: flex; align-items: flex-end; justify-content: flex-start; padding: 16px 20px; box-shadow: 0 18px 30px rgba(0,0,0,.45); }
    .item span { font-size: 34px; font-weight: 500; line-height: 1.15; }
    .item small { display: block; font-size: 28px; opacity: .8; margin-top: 4px; }
    .ticket { background: #CFC6B2; color: #2A2622; border-left: 6px dotted #2A2622; }
    .ticket.bus { background: #B9C2B5; }
    .comb { background: linear-gradient(180deg, #C9CDD2 0 40%, transparent 40%); color: #1E2125; padding: 0; box-shadow: none; }
    .comb::after { content: ""; position: absolute; left: 0; right: 0; top: 40%; height: 60%; background: repeating-linear-gradient(90deg, #A9AEB4 0 6px, transparent 6px 12px); }
    .comb span { position: absolute; left: 0; top: 124px; color: #E9E5DD; white-space: nowrap; }
    .gum { background: #D9C34A; color: #2A2622; }
    .cigbox { background: linear-gradient(180deg, #7C2E2A 0 30%, #E5DFD2 30%); color: #2A2622; }
    .match { background: #E5DFD2; color: #2A2622; border-top: 40px solid #3C5A7A; }
    .pocket-title { position: absolute; left: 96px; bottom: 210px; font-size: 64px; color: rgba(233,229,221,.9); }"""
    tw = [
        f'tl.fromTo("#ev-jacket", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }}, {q[0] + 0.1});',
        f'tl.fromTo("#ev-m1", {{ opacity: 0, scale: 0.9 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }}, {q[1] + 0.1});',
        f'tl.fromTo("#ev-m2", {{ opacity: 0, scale: 0.9 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }}, {q[1] + 0.8});',
        f'tl.fromTo("#ev-m3", {{ opacity: 0, scale: 0.9 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }}, {q[1] + 1.6});',
        f'tl.fromTo("#ev-cut", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, {q[2] + 0.2});',
        f'tl.to("#ev-label", {{ x: 260, y: -220, rotation: 38, opacity: 0, duration: 0.8, ease: "power2.in" }}, {q[2] + 0.9});',
        f'tl.fromTo("#ev-callout", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[2] + 1.3});',
        f'tl.to("#ev-a", {{ opacity: 0, duration: 0.25 }}, {q[3] - 0.15});',
        f'tl.fromTo("#ev-b .pocket-title", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {q[3] + 0.1});',
    ]
    for (i, _, _, _, rot), s in zip(items, starts):
        tw.append(
            f'tl.fromTo("#{i}", {{ opacity: 0, y: -60, rotation: {rot - 10}, scale: 1.08 }}, '
            f'{{ opacity: 1, y: 0, rotation: {rot}, scale: 1, duration: 0.45, ease: "power3.out" }}, {round(s, 2)});'
        )
    script = "    const tl = gsap.timeline({ paused: true });\n    " + "\n    ".join(tw) + f'\n    window.__timelines["{sid}"] = tl;'
    return wrap(sid, dur, css, markup, script)


def counter(sid, dur, q):
    """A timeline that fills over 73 years, then a ledger: what was solved, what was not."""
    markup = f"""    {clip('ct-wrap', 0, dur, 'ctwrap', '''
      <div id="ct-top" class="top">
        <div class="axis"><i id="ct-bar"></i><i id="ct-fill"></i>
          <div class="tick l"><b class="disp">1948</b><span>해변에서 발견</span></div>
          <div class="tick r"><b class="disp">2022</b><span>이름 발표</span></div></div>
        <div id="ct-big" class="big disp"><b id="ct-n">0</b>년</div>
      </div>
      <div id="ct-ledger" class="ledger">
        <div id="ct-row1" class="row"><span>그는 누구였나</span><b>2022년 발표</b></div>
        <div id="ct-row2" class="row"><span>그날 밤 무슨 일이 있었나</span><b id="ct-q" class="q">?</b><b id="ct-un" class="un disp">미상</b></div>
      </div>''')}"""
    css = """
    .ctwrap { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 42%, #1D1F22 0%, #0E0F11 78%); }
    #ct-ledger, #ct-row1, #ct-row2, #ct-un { opacity: 0; }
    .top { position: absolute; left: 0; right: 0; top: 0; height: 1080px; transform-origin: 50% 0; }
    .axis { position: absolute; left: 220px; right: 220px; top: 230px; height: 12px; }
    .axis i { position: absolute; left: 0; top: 0; height: 12px; width: 100%; background: rgba(233,229,221,.35); transform-origin: left center; }
    .axis #ct-fill { background: #F0A23B; }
    .tick { position: absolute; top: -110px; }
    .tick.l { left: -20px; } .tick.r { right: -20px; text-align: right; }
    .tick b { display: block; font-size: 72px; font-weight: 400; color: #E9E5DD; line-height: 1; }
    .tick span { display: block; font-size: 32px; color: rgba(233,229,221,.85); margin-top: 6px; }
    .tick::after { content: ""; position: absolute; top: 104px; width: 6px; height: 40px; background: #E9E5DD; }
    .tick.l::after { left: 20px; } .tick.r::after { right: 20px; }
    .big { position: absolute; left: 0; right: 0; top: 320px; text-align: center; font-size: 300px; line-height: 1; color: #F0A23B; }
    .big b { font-weight: 400; }
    .ledger { position: absolute; left: 260px; right: 260px; top: 400px; }
    .row { position: relative; display: flex; justify-content: space-between; align-items: center; height: 130px; padding: 0 44px; background: #D9D5CC; color: #1E2125; margin-bottom: 22px; }
    .row span { font-size: 48px; }
    .row b { font-weight: 500; font-size: 52px; }
    .row .q { font-family: "Black Han Sans"; font-weight: 400; font-size: 80px; color: #6D6A66; }
    .row .un { position: absolute; right: 44px; font-weight: 400; font-size: 64px; color: #1E2125; background: #F0A23B; padding: 2px 28px 8px; }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    const n = {{ v: 0 }};
    tl.fromTo("#ct-bar", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 1.0, ease: "power2.inOut" }}, {q[0] + 0.1});
    tl.fromTo(".tick.l", {{ opacity: 0, y: 10 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, {q[0] + 0.1});
    tl.fromTo(".tick.r", {{ opacity: 0, y: 10 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, {q[0] + 1.0});
    tl.fromTo("#ct-fill", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 1.4, ease: "power3.out" }}, {q[1]});
    tl.fromTo("#ct-big", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, {q[1]});
    tl.fromTo(n, {{ v: 0 }}, {{ v: 73, duration: 1.4, ease: "power3.out", onUpdate: () => {{ document.getElementById("ct-n").textContent = Math.round(n.v); }} }}, {q[1]});
    tl.to(["#ct-top .axis"], {{ opacity: 0, duration: 0.3 }}, {q[2] - 0.4});
    tl.to("#ct-big", {{ scale: 0.55, y: -250, duration: 0.6, ease: "power2.inOut" }}, {q[2] - 0.3});
    tl.to("#ct-ledger", {{ opacity: 1, duration: 0.01 }}, {q[2] - 0.1});
    tl.fromTo("#ct-row1", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, {q[2] - 0.1});
    tl.fromTo("#ct-row2", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, {q[2] + 0.4});
    tl.to("#ct-q", {{ opacity: 0, duration: 0.15 }}, {q[3]});
    tl.fromTo("#ct-un", {{ opacity: 0, scale: 1.3 }}, {{ opacity: 1, scale: 1, duration: 0.25, ease: "power4.out" }}, {q[3] + 0.05});
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)

def autopsy(sid, dur, q):
    rows = [
        ("ap-r1", "사망 추정 시각", "12월 1일 새벽 2시"),
        ("ap-r2", "마지막 식사", "고기 파이(패스티) 1개"),
        ("ap-r3", "독극물 검사", "검출 없음"),
    ]
    rh = "".join(f'<div id="{i}" class="row"><span>{a}</span><b>{b}</b></div>' for i, a, b in rows)
    markup = f"""    {clip('ap-wrap', 0, dur, 'apwrap', f'''
      <div id="ap-card" class="card"><div class="head"><span class="disp">검안 소견</span><em>1948 · 남호주</em></div>{rh}</div>
      <div id="ap-quote" class="quote"><p class="disp">“자연사일 리가 없다”</p><small>병리학자 존 드와이어</small></div>''')}"""
    css = """
    .apwrap { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 42%, #1D1F22 0%, #0E0F11 78%); }
    .card { position: absolute; left: 150px; top: 110px; width: 1000px; background: #D9D5CC; color: #1E2125; padding: 50px 60px 30px; box-shadow: 0 30px 60px rgba(0,0,0,.45); }
    .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 4px solid #1E2125; padding-bottom: 18px; margin-bottom: 14px; }
    .head span { font-size: 64px; }
    .head em { font-style: normal; font-size: 28px; opacity: .7; }
    .row { display: flex; justify-content: space-between; align-items: baseline; padding: 24px 0; border-bottom: 2px solid rgba(30,33,37,.25); }
    .row span { font-size: 34px; opacity: .75; }
    .row b { font-weight: 500; font-size: 50px; }
    #ap-r3 b { color: #1E2125; background: #F0A23B; padding: 0 14px 4px; }
    .quote { position: absolute; right: 120px; top: 640px; text-align: right; white-space: nowrap; }
    .quote p { font-size: 86px; line-height: 1.1; color: #F3F0EA; }
    .quote small { display: block; font-size: 32px; margin-top: 18px; color: rgba(233,229,221,.8); }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#ap-card", {{ opacity: 0, y: 60, rotation: -2 }}, {{ opacity: 1, y: 0, rotation: -1, duration: 0.7, ease: "power3.out" }}, {q[0] - 0.2 if q[0] > 0.3 else 0.1});
    tl.fromTo("#ap-r1", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[0] + 0.5});
    tl.fromTo("#ap-r2", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[1] + 0.2});
    tl.fromTo("#ap-r3", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[2] + 0.2});
    tl.to("#ap-card", {{ x: -40, scale: 0.92, opacity: 0.55, duration: 0.8, ease: "power2.inOut" }}, {q[3]});
    tl.fromTo("#ap-quote", {{ opacity: 0, x: 40 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[4]});
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)


def scrap(sid, dur, q):
    markup = f"""    {clip('sc-wrap', 0, dur, 'scwrap', '''
      <div id="sc-cloth" class="cloth"><div class="pocket"><div id="sc-fob" class="fob"></div></div></div>
      <div id="sc-flab" class="flab"><b>시계 주머니</b><span>바지 안쪽에 덧댄 작은 주머니</span></div>
      <div id="sc-roll" class="roll"></div>
      <div id="sc-paper" class="paper"><span>Tamám Shud</span></div>
      <div id="sc-book" class="bookpage"><em>THE RUBÁIYÁT OF OMAR KHAYYÁM</em><i></i><i></i><i></i><i class="s"></i><span>TAMÁM SHUD</span></div>
      <div id="sc-mean" class="mean disp">끝났다</div>''')}
    {clip('sc-re', 0.3, dur - 0.3, 'tag-re', '재현')}"""
    css = """
    .scwrap { position: absolute; inset: 0; background: #2A2521; }
    .cloth { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, #4B4036 0 5px, #3F352D 5px 10px), #45392F; }
    .pocket { position: absolute; left: 520px; top: 160px; width: 880px; height: 760px; border: 6px dashed rgba(240,162,59,.0); background: rgba(0,0,0,.12);
      box-shadow: inset 0 0 0 4px rgba(233,229,221,.18); }
    .fob { position: absolute; left: 260px; top: 70px; width: 360px; height: 300px; background: rgba(0,0,0,.3); box-shadow: inset 0 0 0 3px rgba(233,229,221,.3); outline: 5px dashed #F0A23B; outline-offset: 10px; }
    .flab { position: absolute; left: 1430px; top: 250px; padding: 14px 24px 18px; background: #1E2125; border-left: 8px solid #F0A23B; }
    .flab b { display: block; font-family: "Black Han Sans"; font-weight: 400; font-size: 52px; color: #F3F0EA; }
    .flab span { display: block; font-size: 30px; color: #E9E5DD; margin-top: 4px; }
    .roll { position: absolute; left: 860px; top: 270px; width: 200px; height: 48px; border-radius: 24px; background: linear-gradient(180deg, #F2EDE2, #BDB6A8); box-shadow: 0 10px 20px rgba(0,0,0,.4); }
    .paper { position: absolute; left: 560px; top: 380px; width: 800px; height: 220px; background: #EFE9DC; box-shadow: 0 30px 50px rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center; clip-path: polygon(1% 4%, 99% 0, 100% 96%, 0 100%); }
    .paper span { font-family: "EB Garamond", serif; font-style: italic; font-size: 120px; color: #1E1B18; letter-spacing: .02em; }
    .bookpage { position: absolute; left: 1130px; top: 150px; width: 640px; height: 800px; background: #E6DFD0; color: #2A2622; padding: 70px 60px; box-shadow: 0 30px 60px rgba(0,0,0,.5); }
    .bookpage em { font-family: "EB Garamond", serif; font-style: normal; font-size: 30px; letter-spacing: .08em; display: block; text-align: center; margin-bottom: 60px; }
    .bookpage i { display: block; height: 14px; margin: 26px 0; background: rgba(42,38,34,.25); }
    .bookpage i.s { width: 60%; }
    .bookpage span { position: absolute; left: 0; right: 0; bottom: 120px; text-align: center; font-family: "EB Garamond", serif; font-size: 60px; letter-spacing: .1em; color: #2A2622; outline: 4px solid #F0A23B; outline-offset: 16px; margin: 0 120px; }
    .mean { position: absolute; left: 140px; top: 640px; font-size: 220px; color: #F0A23B; }"""
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#sc-cloth", {{ scale: 1.25 }}, {{ scale: 1.0, duration: {q[1]}, ease: "sine.inOut" }}, 0);
    tl.fromTo("#sc-flab", {{ opacity: 0, x: 20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[0] + 0.6});
    tl.to("#sc-flab", {{ opacity: 0, duration: 0.3 }}, {q[2] - 0.2});
    tl.fromTo("#sc-roll", {{ opacity: 0, y: -60 }}, {{ opacity: 1, y: 60, duration: 1.0, ease: "power2.out" }}, {q[1] + 0.2});
    tl.to("#sc-roll", {{ opacity: 0, duration: 0.2 }}, {q[2] - 0.05});
    tl.fromTo("#sc-paper", {{ opacity: 0, scaleX: 0.25 }}, {{ opacity: 1, scaleX: 1, duration: 0.8, ease: "power3.out" }}, {q[2]});
    tl.to("#sc-cloth", {{ opacity: 0.35, duration: 0.6 }}, {q[2]});
    tl.to("#sc-paper", {{ x: -380, y: -140, scale: 0.7, duration: 0.8, ease: "power2.inOut" }}, {q[3]});
    tl.fromTo("#sc-book", {{ opacity: 0, x: 80 }}, {{ opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }}, {q[3] + 0.2});
    tl.fromTo("#sc-mean", {{ opacity: 0, scale: 1.15 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "power4.out" }}, {q[4]});
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)


def book(sid, dur, q):
    """The book's back cover grows its marks; the phone number leads to a person; the code stays unsolved."""
    code = [("W RGOABABD", ""), ("M LIAOI", "strike"), ("WTBIMPANETP", ""), ("MLIABO AIAQC", ""), ("ITTMTSAMSTGAB", "")]
    code_html = "".join(f'<p id="bk-c{i}" class="{c}">{t}</p>' for i, (t, c) in enumerate(code))
    markup = f"""    {clip('bk-wrap', 0, dur, 'bkwrap', f'''
      <div id="bk-cover" class="cover"><div class="tear"></div>
        <div class="ctitle">THE RUBÁIYÁT</div>
        <div id="bk-phone" class="phone"><span>전화번호</span><b>● ● ● ● ●</b></div>
        <div id="bk-code" class="code">{code_html}</div>
        <div id="bk-brace" class="brace"><span>암호 5줄</span></div></div>
      <div id="bk-torn" class="tag t1"><b>마지막 장</b><span>찢겨 나감</span></div>
      <div id="bk-press" class="tag t2"><b>눌린 자국</b><span>희미하게 눌린 글자</span></div>
      <svg id="bk-svg" class="links" width="1920" height="1080" viewBox="0 0 1920 1080"><path id="bk-path" d="M 600 312 C 900 312, 980 330, 1180 330" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/></svg>
      <div id="bk-nurse" class="person">
        <div class="sil">{person_card(150, 180, sw=4)}</div>
        <div class="who"><small>전화번호 주인</small><b class="disp">간호사</b><span>해변 근처 거주</span></div>
      </div>
      <div id="bk-deny" class="deny disp">“모르는 사람입니다”</div>
      <div id="bk-stamp" class="stamp disp">미해독</div>''')}
    {clip('bk-re', 0.3, dur - 0.3, 'tag-re', '재현')}"""
    css = """
    .bkwrap { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 42%, #1D1F22 0%, #0E0F11 78%); }
    #bk-phone, #bk-brace, #bk-torn, #bk-press, #bk-nurse, #bk-deny, #bk-stamp, #bk-cover .tear, #bk-code p { opacity: 0; }
    .cover { position: absolute; left: 150px; top: 120px; width: 780px; height: 820px; background: linear-gradient(135deg, #3C4A3E, #2E3A31); box-shadow: 0 30px 60px rgba(0,0,0,.5); }
    .ctitle { position: absolute; left: 70px; top: 40px; font-family: "EB Garamond", serif; font-size: 30px; letter-spacing: .2em; color: rgba(233,229,221,.62); }
    .tear { position: absolute; right: -26px; top: 0; bottom: 0; width: 30px; background: #E6DFD0;
      clip-path: polygon(0 0, 60% 0, 30% 4%, 70% 9%, 20% 15%, 60% 22%, 30% 30%, 80% 38%, 20% 46%, 70% 55%, 30% 63%, 60% 72%, 20% 80%, 70% 88%, 30% 95%, 50% 100%, 0 100%); }
    .phone { position: absolute; left: 70px; top: 130px; color: rgba(233,229,221,.9); }
    .phone span { font-size: 32px; display: block; }
    .phone b { font-weight: 500; font-size: 54px; letter-spacing: .1em; }
    .code { position: absolute; left: 70px; top: 330px; font-family: "IBM Plex Mono", monospace; font-size: 56px; line-height: 1.5; color: rgba(233,229,221,.92);
      text-shadow: 1px 1px 0 rgba(0,0,0,.6), -1px -1px 0 rgba(255,255,255,.15); }
    .code .strike { text-decoration: line-through; }
    .brace { position: absolute; left: 560px; top: 345px; height: 400px; width: 40px; border: 5px solid #E9E5DD; border-left: none; }
    .brace span { position: absolute; left: 60px; top: 170px; white-space: nowrap; font-size: 36px; color: #E9E5DD; }
    .tag { position: absolute; padding: 12px 22px 16px; background: #1E2125; border-left: 8px solid #E9E5DD; }
    .tag b { display: block; font-family: "Black Han Sans"; font-weight: 400; font-size: 46px; color: #F3F0EA; }
    .tag span { display: block; font-size: 30px; color: #E9E5DD; margin-top: 2px; }
    .t1 { left: 1000px; top: 160px; }
    .t2 { left: 1000px; top: 420px; }
    .links { position: absolute; left: 0; top: 0; }
    .links path { fill: none; stroke: #F0A23B; stroke-width: 4; stroke-linecap: round; }
    .person { position: absolute; left: 1190px; top: 210px; width: 600px; height: 250px; color: #F3F0EA; display: flex; align-items: center; gap: 34px; padding: 0 36px; border: 3px solid #E9E5DD; background: #0E0F11; }
    .sil { width: 150px; height: 180px; flex: none; }
    .who small { display: block; font-size: 30px; color: rgba(233,229,221,.8); }
    .who b { display: block; font-weight: 400; font-size: 84px; line-height: 1.1; }
    .who span { display: block; font-size: 34px; }
    .deny { position: absolute; left: 1190px; top: 500px; width: 600px; text-align: center; font-size: 66px; color: #F3F0EA; }
    .stamp { position: absolute; left: 1000px; top: 650px; font-size: 120px; color: #F0A23B; border: 8px solid #F0A23B; padding: 0 36px 10px; transform: rotate(-6deg); background: #1C1E21; }"""
    lines = "\n".join(
        f'    tl.to("#bk-c{i}", {{ opacity: 1, duration: 0.3, ease: "power2.out" }}, {round(q[3] + 0.6 + i * 0.4, 2)});'
        for i in range(5)
    )
    ins, ins_css, ins_tw = archive_insert(sid, q[3] + 0.3, "assets/archive/code-rubaiyat-1949.jpg", (1600, 1279), focus=(0.5, 0.62, 0.42),
                                          caption="실제 암호 사진: 경찰이 눌린 자국을 덧그려 찍은 것", credit=POLICE_1949,
                                          hide="#bk-wrap, #bk-re")
    markup += "\n" + ins
    css += ins_css
    script = f"""    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#bk-cover", {{ opacity: 0, y: 50, rotation: -3 }}, {{ opacity: 1, y: 0, rotation: -1.5, duration: 0.7, ease: "power3.out" }}, {q[0] + 0.1});
    tl.to("#bk-cover .tear", {{ opacity: 1, duration: 0.3 }}, {q[1] + 0.2});
    tl.fromTo("#bk-torn", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[1] + 0.4});
    tl.fromTo("#bk-press", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[2] + 0.2});
    tl.to(["#bk-torn", "#bk-press"], {{ opacity: 0, duration: 0.3 }}, {q[4] - 0.3});
    tl.to("#bk-phone", {{ opacity: 0.18, duration: 0.6 }}, {q[2] + 0.3});
    tl.to("#bk-code p", {{ opacity: 0.18, duration: 0.6 }}, {q[2] + 0.3});
    tl.to("#bk-phone", {{ opacity: 1, duration: 0.4 }}, {q[3]});
{lines}
    tl.fromTo("#bk-brace", {{ opacity: 0, x: -10 }}, {{ opacity: 1, x: 0, duration: 0.3 }}, {round(q[3] + 2.7, 2)});
    tl.to("#bk-phone b", {{ color: "#F0A23B", duration: 0.3 }}, {q[4]});
    tl.to("#bk-path", {{ strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }}, {q[4] + 0.15});
    tl.fromTo("#bk-nurse", {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[4] + 0.8});
    tl.fromTo("#bk-deny", {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, {q[5] + 0.2});
    tl.to(["#bk-nurse", "#bk-svg", "#bk-deny"], {{ opacity: 0.25, duration: 0.5 }}, {q[6]});
    tl.to("#bk-phone b", {{ color: "rgba(233,229,221,.6)", duration: 0.3 }}, {q[6]});
    tl.to("#bk-code", {{ color: "#F0A23B", duration: 0.3 }}, {q[6] + 0.1});
    tl.fromTo("#bk-stamp", {{ opacity: 0, scale: 1.4 }}, {{ opacity: 1, scale: 1, duration: 0.25, ease: "power4.out" }}, {q[6] + 0.5});
{ins_tw}
    window.__timelines["{sid}"] = tl;"""
    return wrap(sid, dur, css, markup, script)

def dna(sid, dur, q):
    """Genetic genealogy as one diagram that grows:
    grave -> hair becomes a DNA strip -> database scan finds two distant relatives ->
    climb to a common ancestor -> descend the third branch to the empty '?' -> name card."""
    # Tree geometry (illustrative, not the real pedigree).
    TOP = 170
    ROW = 190
    xs = [520, 960, 1400]
    anc = (960, TOP)
    rows = [TOP + ROW * k for k in range(1, 4)]  # 340, 490, 640
    A, B, U = (xs[0], rows[-1]), (xs[1], rows[-1]), (xs[2], rows[-1])

    def branch(x, cls):
        pts = [anc] + [(x, y) for y in rows]
        segs = []
        for i in range(len(pts) - 1):
            (x1, y1), (x2, y2) = pts[i], pts[i + 1]
            # Climb order: segment 0 is nearest the ancestor.
            segs.append(f'<path class="tl {cls} s{i}" d="M {x2} {y2} L {x1} {y1}" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>')
        return "".join(segs)

    def branch_down(x, cls):
        pts = [anc] + [(x, y) for y in rows]
        return "".join(
            f'<path class="tl {cls} s{i}" d="M {pts[i][0]} {pts[i][1]} L {pts[i + 1][0]} {pts[i + 1][1]}" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110"/>'
            for i in range(len(pts) - 1)
        )

    mids = "".join(
        f'<circle class="mid m{x}-{k}" cx="{x}" cy="{y}" r="16"/>' for x in xs for k, y in enumerate(rows[:-1])
    )
    gen_labels = "".join(
        f'<text class="gen" x="130" y="{y + 12}">{lab}</text>'
        for y, lab in [(TOP, "공통 조상"), (rows[0], "↑ 1세대"), (rows[1], "↑ 2세대"), (rows[2], "후손 세대")]
    )
    svg = f"""<svg id="dn-tree" class="tree" width="1920" height="1080" viewBox="0 0 1920 1080">
        <line class="guide" x1="330" y1="{TOP}" x2="1600" y2="{TOP}"/>
        {gen_labels}
        {branch(xs[0], 'ba')}{branch(xs[1], 'bb')}{branch_down(xs[2], 'bu')}
        {mids}
      </svg>"""

    # Database grid of anonymous profiles; two will match.
    cols, rws, cw, ch, gx, gy = 11, 3, 100, 124, 24, 22
    x0 = 960 - (cols * cw + (cols - 1) * gx) / 2
    y0 = 380
    hit = {13: "A", 29: "B"}
    cards = []
    for i in range(cols * rws):
        r, c = divmod(i, cols)
        x = round(x0 + c * (cw + gx))
        y = round(y0 + r * (ch + gy))
        cls = "pc hit" if i in hit else "pc"
        cid = f' id="dn-hit{hit[i]}"' if i in hit else ""
        cards.append(f'<div{cid} class="{cls}" style="left:{x}px;top:{y}px">{person_card(cw, ch, color="rgba(233,229,221,.55)", sw=3)}</div>')
    # Where the two hits fly to (card centre onto node A/B).
    def hit_xy(i):
        r, c = divmod(i, cols)
        return x0 + c * (cw + gx) + cw / 2, y0 + r * (ch + gy) + ch / 2
    (hax, hay), (hbx, hby) = hit_xy(13), hit_xy(29)
    dxa, dya = round(A[0] - hax), round(A[1] - hay)
    dxb, dyb = round(B[0] - hbx), round(B[1] - hby)

    bars = "".join(
        f'<i style="width:{w}px;background:{c}"></i>'
        for w, c in [(w * 1.5, c) for w, c in [(26, "#E9E5DD"), (10, "#6D6A66"), (44, "#E9E5DD"), (14, "#F0A23B"), (30, "#6D6A66"), (18, "#E9E5DD"),
                     (36, "#6D6A66"), (12, "#E9E5DD"), (40, "#F0A23B"), (22, "#6D6A66"), (28, "#E9E5DD"), (16, "#6D6A66")]]
    )

    markup = f"""    {clip('dn-wrap', 0, dur, 'dnwrap', f'''
      <div id="dn-grave" class="grave"><div class="slab"><span>신원 미상</span><b class="disp">1948</b></div>
        <div class="yr"><b class="disp">2021</b><span>무덤 재개봉</span></div></div>
      <div id="dn-strip" class="strip"><span>머리카락 DNA</span><div class="bars">{bars}</div></div>
      <div id="dn-db" class="db"><div class="dbt">유전자 계보 데이터베이스</div>{"".join(cards)}</div>
      {svg}
      <div id="dn-anc" class="anc2" style="left:{anc[0] - 112}px;top:{anc[1] - 62}px">{person_card(100, 124, sw=3)}{person_card(100, 124, sw=3)}</div>
      <div id="dn-lab-a" class="nlab" style="left:{A[0] - 120}px;top:{A[1] + 72}px">먼 친척</div>
      <div id="dn-lab-b" class="nlab" style="left:{B[0] - 120}px;top:{B[1] + 72}px">먼 친척</div>
      <div id="dn-unk" class="unk" style="left:{U[0] - 50}px;top:{U[1] - 62}px"><svg width="100" height="124" viewBox="0 0 100 124"><rect x="2" y="2" width="96" height="120" rx="6" fill="#0E0F11" stroke="#F0A23B" stroke-width="4" stroke-dasharray="10 8"/></svg><b class="disp">?</b></div>
      <div id="dn-lab-u" class="nlab amber" style="left:{U[0] - 190}px;top:{U[1] + 72}px">기록이 끊긴 사람</div>
      <div id="dn-note" class="note">도식 · 실제 가계도 아님</div>
      <div id="dn-date" class="date disp">2022.07</div>
      <div id="dn-card" class="card">
        <div class="before"><div class="sil">{person_card(220, 260, color="#4A4743", sw=5, fill="#C9C4BB")}</div><s>신원 미상 · 1948</s></div>
        <div class="arrow disp">→</div>
        <div class="after"><b class="disp">칼 ‘찰스’ 웹</b><em>Carl “Charles” Webb</em>
          <p id="dn-meta"><span>1905년생</span><span>멜버른 풋스크레이</span><span>전기 기술자</span></p></div>
      </div>
      <div id="dn-stamp" class="stamp">남호주 경찰 · 공식 확인 전</div>''')}"""

    css = f"""
    .dnwrap {{ position: absolute; inset: 0; background: {BOARD}; }}
    #dn-strip, #dn-db .dbt, #dn-db .pc, #dn-lab-a, #dn-lab-b, #dn-unk, #dn-lab-u, #dn-note, #dn-date, #dn-card, #dn-stamp, #dn-anc, #dn-tree .mid, #dn-tree .gen, #dn-tree .guide {{ opacity: 0; }}
    .grave {{ position: absolute; inset: 0; }}
    .slab {{ position: absolute; left: 660px; top: 190px; width: 600px; height: 520px; background: linear-gradient(180deg, #8A8780, #5E5B56);
      border-radius: 250px 250px 0 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #2A2826;
      box-shadow: 0 40px 60px rgba(0,0,0,.5); }}
    .slab span {{ font-size: 52px; }}
    .slab b {{ font-size: 120px; font-weight: 400; }}
    .yr {{ position: absolute; left: 140px; top: 170px; }}
    .yr b {{ font-weight: 400; font-size: 140px; color: #F0A23B; display: block; line-height: 1; }}
    .yr span {{ font-size: 40px; color: #E9E5DD; }}
    .strip {{ position: absolute; left: 0; right: 0; top: 120px; text-align: center; }}
    .strip span {{ display: block; font-size: 46px; color: #E9E5DD; margin-bottom: 18px; }}
    .bars {{ display: inline-flex; height: 90px; gap: 8px; padding: 12px 18px; background: #15171A; border: 2px solid rgba(233,229,221,.35); }}
    .bars i {{ display: block; height: 100%; }}
    .db {{ position: absolute; inset: 0; }}
    .dbt {{ position: absolute; left: 0; right: 0; top: 316px; text-align: center; font-size: 40px; color: rgba(233,229,221,.85); }}
    .pc {{ position: absolute; width: 100px; height: 124px; }}
    .pc svg {{ display: block; }}
    .pc.hit {{ z-index: 3; }}
    .tree {{ position: absolute; left: 0; top: 0; overflow: visible; }}
    .guide {{ stroke: rgba(233,229,221,.12); stroke-width: 2; stroke-dasharray: 6 10; }}
    .gen {{ fill: rgba(233,229,221,.8); font-family: "Gothic A1"; font-size: 36px; }}
    .tl {{ fill: none; stroke: #E9E5DD; stroke-width: 4; stroke-linecap: round; }}
    .tl.bu {{ stroke: #F0A23B; }}
    .mid {{ fill: #0E0F11; stroke: #E9E5DD; stroke-width: 4; }}
    .anc2 {{ position: absolute; display: flex; gap: 24px; }}
    .nlab {{ position: absolute; width: 240px; text-align: center; font-size: 38px; color: #E9E5DD; }}
    .nlab.amber {{ width: 380px; color: #F0A23B; }}
    .unk {{ position: absolute; width: 100px; height: 124px; color: #F0A23B; }}
    .unk b {{ position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-weight: 400; font-size: 64px; }}
    .note {{ position: absolute; right: 140px; top: 120px; font-size: 28px; color: rgba(233,229,221,.75); border: 2px solid rgba(233,229,221,.4); padding: 4px 14px 6px; }}
    .date {{ position: absolute; right: 140px; top: 190px; font-size: 96px; color: #E9E5DD; }}
    .card {{ position: absolute; left: 190px; right: 190px; top: 200px; height: 520px; background: #D9D5CC; color: #1E2125;
      display: flex; align-items: center; padding: 0 70px; gap: 50px; box-shadow: 0 40px 70px rgba(0,0,0,.5); }}
    .before {{ width: 360px; text-align: center; }}
    .sil {{ width: 220px; height: 260px; margin: 0 auto 24px; }}
    .before s {{ font-size: 36px; text-decoration-thickness: 4px; text-decoration-color: #F0A23B; }}
    .arrow {{ font-size: 110px; color: #F0A23B; }}
    .after b {{ display: block; font-weight: 400; font-size: 138px; line-height: 1.05; }}
    .after em {{ display: block; font-style: normal; font-size: 44px; margin-top: 8px; color: #4A4743; }}
    .after p {{ margin-top: 40px; display: flex; gap: 18px; }}
    .after p span {{ font-size: 36px; background: #1E2125; color: #E9E5DD; padding: 6px 18px 10px; }}
    .stamp {{ position: absolute; right: 230px; top: 650px; font-size: 40px; color: #F0A23B; background: #1E2125;
      border: 4px solid #F0A23B; padding: 8px 24px 12px; transform: rotate(-3deg); }}"""

    climb = q[2] + 0.2
    step = 0.55
    tw = [
        # 1. grave
        f'tl.fromTo("#dn-grave .slab", {{ opacity: 0.35, y: 50 }}, {{ opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }}, 0);',
        f'tl.fromTo("#dn-grave .yr", {{ opacity: 0, x: -30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[0] + 0.2});',
        f'tl.to("#dn-grave", {{ opacity: 0, y: -40, duration: 0.4, ease: "power2.in" }}, {q[1] - 0.3});',
        # 2. DNA strip -> database scan -> two hits
        f'tl.fromTo("#dn-strip", {{ opacity: 0, scaleX: 0.2 }}, {{ opacity: 1, scaleX: 1, duration: 0.5, ease: "power3.out" }}, {q[1]});',
        f'tl.to("#dn-strip", {{ y: -20, scale: 0.85, duration: 0.5, ease: "power2.inOut" }}, {q[1] + 0.8});',
        f'tl.fromTo("#dn-db .dbt", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, {q[1] + 0.9});',
        f'tl.fromTo("#dn-db .pc", {{ opacity: 0, scale: 0.6 }}, {{ opacity: 1, scale: 1, duration: 0.25, stagger: {{ each: 0.012, from: "random", seed: 3 }} }}, {q[1] + 0.9});',
        f'tl.to("#dn-db .pc.hit svg *", {{ stroke: "#F0A23B", duration: 0.2 }}, {q[1] + 2.0});',
        f'tl.to("#dn-db .pc:not(.hit)", {{ opacity: 0, duration: 0.4 }}, {q[2] - 0.6});',
        f'tl.to(["#dn-strip", "#dn-db .dbt"], {{ opacity: 0, duration: 0.3 }}, {q[2] - 0.6});',
        f'tl.to("#dn-hitA", {{ x: {dxa}, y: {dya}, duration: 0.6, ease: "power2.inOut" }}, {q[2] - 0.5});',
        f'tl.to("#dn-hitB", {{ x: {dxb}, y: {dyb}, duration: 0.6, ease: "power2.inOut" }}, {q[2] - 0.45});',
        f'tl.fromTo(["#dn-lab-a", "#dn-lab-b"], {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, {q[2] + 0.05});',
        f'tl.fromTo("#dn-note", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, {q[2]});',
        f'tl.fromTo("#dn-tree .gen, #dn-tree .guide", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {q[2]});',
    ]
    # 3. climb both branches from the bottom (segment index 2 -> 0), then the ancestor, then down the third.
    for k, seg in enumerate([2, 1, 0]):
        t = round(climb + k * step, 2)
        tw.append(f'tl.to("#dn-tree .ba.s{seg}, #dn-tree .bb.s{seg}", {{ strokeDashoffset: 0, duration: {step}, ease: "none" }}, {t});')
        if seg > 0:
            tw.append(f'tl.fromTo("#dn-tree .m{xs[0]}-{seg - 1}, #dn-tree .m{xs[1]}-{seg - 1}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15 }}, {round(t + step - 0.05, 2)});')
    t_anc = round(climb + 3 * step, 2)
    tw.append(f'tl.fromTo("#dn-anc", {{ opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }}, {t_anc});')
    for k in range(3):
        t = round(t_anc + 0.35 + k * step, 2)
        tw.append(f'tl.to("#dn-tree .bu.s{k}", {{ strokeDashoffset: 0, duration: {step}, ease: "none" }}, {t});')
        if k < 2:
            tw.append(f'tl.fromTo("#dn-tree .m{xs[2]}-{k}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15 }}, {round(t + step - 0.05, 2)});')
    t_unk = round(t_anc + 0.35 + 3 * step, 2)
    tw += [
        f'tl.fromTo("#dn-unk", {{ opacity: 0, scale: 0.5 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }}, {t_unk});',
        f'tl.fromTo("#dn-lab-u", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, {round(t_unk + 0.2, 2)});',
        # 4. date, then the '?' opens into the name card
        f'tl.fromTo("#dn-date", {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }}, {q[3]});',
        f'tl.to("#dn-unk", {{ scale: 1.25, duration: 0.15, yoyo: true, repeat: 1 }}, {q[3] + 0.6});',
        f'tl.to(["#dn-tree", "#dn-anc", "#dn-hitA", "#dn-hitB", "#dn-lab-a", "#dn-lab-b", "#dn-lab-u", "#dn-unk", "#dn-date", "#dn-note"], {{ opacity: 0, duration: 0.35 }}, {q[4] - 0.35});',
        f'tl.fromTo("#dn-card", {{ opacity: 0, scale: 0.9, transformOrigin: "{U[0] - 190}px {U[1] - 200}px" }}, {{ opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }}, {q[4] - 0.1});',
        f'tl.fromTo("#dn-card .after b", {{ opacity: 0, x: 30 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {q[4] + 0.3});',
        f'tl.fromTo("#dn-card .after em", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {q[4] + 0.7});',
        f'tl.fromTo("#dn-meta span", {{ opacity: 0, y: 12 }}, {{ opacity: 1, y: 0, duration: 0.3, stagger: 0.25, ease: "power3.out" }}, {q[5]});',
        f'tl.fromTo("#dn-stamp", {{ opacity: 0, scale: 1.3 }}, {{ opacity: 1, scale: 1, duration: 0.25, ease: "power4.out" }}, {q[6] + 0.2});',
    ]
    script = "    const tl = gsap.timeline({ paused: true });\n    " + "\n    ".join(tw) + f'\n    window.__timelines["{sid}"] = tl;'
    return wrap(sid, dur, css, markup, script)


def sfx_events(DATA):
    """(file, absolute hit time, volume). Every sound has a cause on screen."""
    sc = {s["id"]: s for s in DATA["scenes"]}
    ev = []

    def at(sid, i, off=0.0):
        s = sc[sid]
        return s["captions"][i]["start"] + off

    cuts = ["whoosh", "whoosh-short", "whoosh-cinematic"]
    for n, s in enumerate(DATA["scenes"][1:]):
        ev.append((cuts[n % 3], s["start"] + 0.05, 0.35 if cuts[n % 3] != "whoosh-cinematic" else 0.3))
    for k, off in enumerate([0.1, 0.8, 1.6]):
        ev.append(("click-soft", at("evidence", 1, off + 0.05), 0.6))
    ev.append(("whoosh-short", at("evidence", 2, 0.95), 0.4))
    q3, q4 = at("evidence", 3), at("evidence", 4)
    for k, t in enumerate([q3 + 0.2, q3 + 1.1, q4 + 0.1, q4 + 0.9, q4 + 1.7, q4 + 2.5]):
        ev.append(("pop" if k % 2 == 0 else "click-soft", t + 0.2, 0.45))
    ev.append(("impact-bass-1", at("counter", 1, 1.4), 0.6))
    ev.append(("click", at("counter", 3, 0.05), 0.6))
    for i, off in [(0, 0.5), (1, 0.2), (2, 0.2)]:
        ev.append(("click-soft", at("autopsy", i, off + 0.05), 0.55))
    ev.append(("whoosh-short", at("autopsy", 4, 0.05), 0.35))
    ev.append(("click-soft", at("station", 1, 0.6), 0.5))   # cut to the 1949 suitcase photo
    ev.append(("click-soft", at("book", 3, 0.3), 0.5))      # cut to the real code photo
    ev.append(("pop", at("station", 2, 0.2), 0.45))
    ev.append(("pop", at("station", 4, 0.2), 0.4))
    ev.append(("click", at("station", 5, 0.03), 0.6))
    ev.append(("whoosh-short", at("scrap", 2, 0.1), 0.4))
    ev.append(("impact-bass-1", at("scrap", 4, 0.05), 0.45))
    for i in range(5):
        ev.append(("key-press", at("book", 3, 0.5 + i * 0.45 + 0.03), 0.5))
    ev.append(("click", at("book", 6, 0.45), 0.6))
    ev.append(("impact-bass-2", at("dna", 4, 0.05), 0.6))
    ev.append(("whoosh-cinematic", sc["ending"]["captions"][-1]["start"] + 2.7, 0.35))
    return ev
