"""Archive (real record) scenes for ep02 — hook and place. Files and licences: assets/archive/SOURCES.md.

Court documents: not copyrightable (Japanese Copyright Act art. 13). GSI map tiles: credit must stay on screen.
Line strips are cut in the image files themselves (no names on any file); never crop names with CSS.
"""
from scenes_kit import archive_scene

KOUSAI = "후쿠오카고법 결정문(2017) · 조서 요약 부분 · 재판소 공개본"
SAISHIN = "구마모토지법 재심 판결(2019) · 재판소 공개본"
GSI = "出典：国土地理院（地理院タイル・淡色地図）を加工して作成 · 현재 지도"
A = "assets/archive/"


def hook(sid, dur, q):
    """Cold open: the confession line ('burned it'), then the line that says the left sleeve still exists. No verdict."""
    return archive_scene(sid, dur, q, [
        {"src": A + "kousai-p16.png", "size": (2481, 3508), "at": 0, "push": (1.0, 1.08), "pan": (-30, -20),
         "focus": [(0, 0.69, 0.285, 0.10)], "caption": "1985년 조서의 진술 — 2017년 고법 결정문이 요약한 부분", "credit": KOUSAI},
        {"src": A + "kousai-p16-l6.png", "size": (2651, 122), "mode": "strip", "at": 1, "push": (1.0, 1.05),
         "focus": [(1, 0.57, 0.5, 0.11)], "caption": "「…범행 뒤 목욕 아궁이에서 태워 버린 것이다…」", "credit": KOUSAI},
        {"src": A + "saishin-p3-l5.png", "size": (2653, 264), "mode": "strip", "at": 2, "push": (1.0, 1.05),
         "focus": [(2, 0.70, 0.25, 0.11)], "caption": "「셔츠의 왼소매가 현존하고 혈액 부착도 인정되지 않았다」",
         "credit": SAISHIN + " · 재심 개시 결정 요지"},
    ])


MAP_CSS = """
    .ar-cover::after { content: ""; position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(to bottom, rgba(14,16,19,.45) 0%, rgba(14,16,19,.30) 35%, rgba(14,16,19,.55) 70%, rgba(14,16,19,.88) 100%); }
    .ar-cover .ar-img { filter: brightness(.78) contrast(1.08); }"""


def place(sid, dur, q):
    """Date and place over today's GSI map (zooming in), then the retrial judgment page that records the discovery."""
    return archive_scene(sid, dur, q, css=MAP_CSS, shots=[
        {"src": A + "map-kyushu.png", "size": (2560, 1440), "mode": "cover", "at": 0, "push": (1.0, 1.06),
         "caption": "일본 규슈", "credit": GSI},
        {"src": A + "map-kumamoto.png", "size": (2560, 1440), "mode": "cover", "at": 1, "push": (1.0, 1.08),
         "caption": "구마모토현 서부", "credit": GSI},
        {"src": A + "map-matsubase.png", "size": (2560, 1440), "mode": "cover", "at": 2, "push": (1.0, 1.12), "pan": (20, -10),
         "focus": [(2, 0.49, 0.50, 0.05)], "caption": "지금의 우키시 마쓰바세 · 마쓰바세역 부근(집 위치는 표시하지 않음)", "credit": GSI},
        {"src": A + "saishin-p2.png", "size": (2481, 3508), "at": 3, "push": (1.0, 1.08), "pan": (20, -20),
         "focus": [(3, 0.33, 0.188, 0.11)], "caption": "재심 판결문 2쪽 — 사건의 발견", "credit": SAISHIN},
        {"src": A + "saishin-p2-l5.png", "size": (2652, 406), "mode": "strip", "at": 4, "push": (1.0, 1.04),
         "caption": "「1985년 1월 8일 오전 9시 30분경 … 자택 방 안에서 … 발견되었다」", "credit": SAISHIN},
    ])
