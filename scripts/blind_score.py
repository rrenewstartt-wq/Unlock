"""Score a blind comparison on a 100-point scale (사용자 결정 2026-11-26: 90점 이상이면 통과).

    python3 scripts/blind_score.py <scores.json> <key.json> [--look IN/TOTAL]

scores.json — what the judge wrote, without knowing which panel is ours:
    {"sheet1": {"A": 78, "B": 85}, "sheet2": {"A": 70, "B": 92}, ...}       (0..100 per panel, quality)
key.json — kept by the showrunner, never shown to the judge:
    {"sheet1": {"종류": "부감", "A": "레퍼런스", "B": "우리"}, ...}
--look — look_check frames in range / frames counted (intentional fades left out), e.g. --look 21/23

Score per shot = min(100, 100 * ours / reference); on a 2x2 sheet (2 ours + 2 reference) the two means are used. Blind score = mean of shots.
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
        # 칸 수는 2(A/B) 또는 2×2(A~D, 우리 2 + 레퍼런스 2). 여러 칸이면 양쪽 평균끼리 나눈다.
        ours = [s[p] for p, v in k.items() if v == "우리"]
        ref = [s[p] for p, v in k.items() if v == "레퍼런스"]
        if not ours or not ref:
            raise SystemExit(f"{sheet}: 정답표에 우리·레퍼런스 칸이 모두 있어야 한다")
        o, r = sum(ours) / len(ours), sum(ref) / len(ref)
        shot = min(100.0, 100 * o / max(r, 1))
        rows.append((sheet, k.get("종류", ""), round(o, 1), round(r, 1), shot))
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
