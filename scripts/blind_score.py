"""Score a blind comparison on a 100-point scale (사용자 결정 2026-11-26: 90점 이상이면 통과).

    python3 scripts/blind_score.py <scores.json> <key.json> [--look IN/TOTAL]

scores.json — what the judge wrote, without knowing which panel is ours:
    {"sheet1": {"A": 78, "B": 85}, "sheet2": {"A": 70, "B": 92}, ...}       (0..100 per panel, quality)
key.json — kept by the showrunner, never shown to the judge:
    {"sheet1": {"종류": "부감", "A": "레퍼런스", "B": "우리"}, ...}
--look — look_check frames in range / frames counted (intentional fades left out), e.g. --look 21/23

Score per shot = min(100, 100 * ours / reference). Blind score = mean of shots.
Total = 0.7 * blind + 0.3 * look (look = 100 * in/total). Without --look the total is the blind score alone.
Pass = total >= 90. The rule is in docs/quality-bar.md §0.
"""
import json
import sys

PASS = 90


def main():
    a = sys.argv[1:]
    if len(a) < 2:
        raise SystemExit(__doc__)
    scores, key = json.load(open(a[0], encoding="utf-8")), json.load(open(a[1], encoding="utf-8"))
    look = None
    if "--look" in a:
        n, d = a[a.index("--look") + 1].split("/")
        look = 100 * int(n) / int(d)
    rows = []
    for sheet, k in key.items():
        s = scores[sheet]
        ours_p = "A" if k["A"] == "우리" else "B"
        ref_p = "B" if ours_p == "A" else "A"
        shot = min(100.0, 100 * s[ours_p] / max(s[ref_p], 1))
        rows.append((sheet, k.get("종류", ""), s[ours_p], s[ref_p], shot))
    blind = sum(r[4] for r in rows) / len(rows)
    total = blind if look is None else 0.7 * blind + 0.3 * look
    print("| 시트 | 종류 | 우리 | 레퍼런스 | 컷 점수 |\n|---|---|---|---|---|")
    for sheet, kind, o, r, shot in rows:
        print(f"| {sheet} | {kind} | {o} | {r} | {shot:.0f} |")
    print(f"\n블라인드 {blind:.1f}" + ("" if look is None else f" · 숫자(look_check) {look:.1f}") +
          f" → **합계 {total:.1f}점 — {'통과' if total >= PASS else '미달'}**(기준 {PASS}점)")
    sys.exit(0 if total >= PASS else 1)


if __name__ == "__main__":
    main()
