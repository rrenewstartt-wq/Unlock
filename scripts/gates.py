"""관문 장부: 에피소드의 단계마다 누가·무슨 근거로 넘겼는지 기록하고, 순서를 지키게 한다.

    python3 scripts/gates.py episodes/<ep>                                   # 장부 보기(다음 관문 표시)
    python3 scripts/gates.py episodes/<ep> pass <stage> --by <담당> --evidence "<근거: 파일·보고 요약>"
    python3 scripts/gates.py episodes/<ep> fail <stage> --by <담당> --evidence "<무엇이 미달인지>"
    python3 scripts/gates.py episodes/<ep> waive "<parity 항목>" --by 사람 --reason "<이유>"   # 사람이 정한 예외만

장부: episodes/<ep>/data/gates.json. 규칙:
- 앞 관문(REQUIRES)이 통과 상태가 아니면 pass 를 거부한다.
- 자동 확인이 있는 관문은 pass 전에 확인한다(사실 수, parity 영역, 렌더 파일). 실패면 거부.
- 대본(data/script.txt)이 바뀌면 그 뒤 관문은 "다시 필요"로 보인다(통과 당시 대본 해시와 비교).
- waive 는 사람 결정만 기록한다(--by 사람). parity 행은 그대로 ❌ 로 남고, 판정자가 예외 목록을 본다.
"""
import datetime
import hashlib
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent

STAGES = [
    ("plan", "기획 승인", "episode-planner → 사람"),
    ("facts", "사실", "fact-checker → source-verifier"),
    ("script", "대본", "script-writer → script-critic → 사람"),
    ("design", "화면 설계", "storyboard-director → visual-critic(설계 검토)"),
    ("archive", "실제 자료", "archive-researcher → risk-reviewer"),
    ("pilot", "파일럿(콜드 오픈~첫 질문 직후)", "set-builder·diagram-builder·editor → visual-critic + parity-judge(파일럿)"),
    ("scenes", "전체 장면", "set-builder·diagram-builder → editor → visual-critic"),
    ("sound", "소리", "sound-designer → editor"),
    ("render", "렌더", "제작 책임자 → editor(실측) + visual-critic(렌더 프레임)"),
    ("thumbnail", "썸네일", "thumb-director·thumb-builder → thumb-critic"),
    ("meta", "메타(upload.json)", "meta-writer → thumb-copy-critic"),
    ("judge", "최종 판정", "reference-analyst → parity-judge"),
]
REQUIRES = {
    "plan": [], "facts": ["plan"], "script": ["facts"], "design": ["script"], "archive": ["design"],
    "pilot": ["design", "archive"], "scenes": ["pilot"], "sound": ["script"], "render": ["scenes", "sound"],
    "thumbnail": ["script"], "meta": ["script"], "judge": ["render", "thumbnail", "meta"],
}
AFTER_SCRIPT = {"script", "design", "archive", "pilot", "scenes", "sound", "render", "thumbnail", "meta", "judge"}
NAMES = [s for s, _, _ in STAGES]


def script_hash(ep):
    p = ep / "data" / "script.txt"
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12] if p.exists() else None


def load(ep):
    p = ep / "data" / "gates.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"stages": {}, "waivers": [], "log": []}


def save(ep, g):
    (ep / "data" / "gates.json").write_text(json.dumps(g, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def state(ep, g, name):
    s = g["stages"].get(name)
    if not s:
        return "대기"
    if s["status"] == "pass" and name in AFTER_SCRIPT and s.get("script") and s["script"] != script_hash(ep):
        return "다시 필요(대본 바뀜)"
    return {"pass": "통과", "fail": "미달"}[s["status"]]


def parity(ep, test, extra=()):
    cmd = [sys.executable, str(HERE / "scripts" / "parity_check.py"), str(ep)] + (["--test"] if test else []) + list(extra)
    subprocess.run(cmd, capture_output=True, text=True)
    return json.loads((ep / "data" / "parity.json").read_text(encoding="utf-8"))["rows"]


def auto_check(ep, g, name):
    """관문별 자동 확인. 문제 목록을 돌려준다(빈 목록이면 통과 가능)."""
    test = bool(json.loads((ep / "meta.json").read_text(encoding="utf-8")).get("test")) if (ep / "meta.json").exists() else False
    waived = {w["item"] for w in g.get("waivers", [])}
    probs = []
    if name == "facts":
        facts = (ep / "data" / "facts.md").read_text(encoding="utf-8") if (ep / "data" / "facts.md").exists() else ""
        n = len(re.findall(r"^\|\s*F\d+\s*\|", facts, re.M))
        if n < (8 if test else 40):
            probs.append(f"facts.md 의 사실 ID 행이 {n}개 (롱폼 40개 이상, 시험편 8개 이상)")
    renders = sorted((ep / "renders").glob("*.mp4")) if (ep / "renders").exists() else []
    pilots = [r for r in renders if r.name.startswith("pilot")]
    finals = [r for r in renders if not r.name.startswith("pilot") and "preview" not in r.name]
    if name == "pilot" and not pilots:
        probs.append("renders/pilot.mp4 없음 (npx hyperframes render --start 0 --end <초> -o renders/pilot.mp4)")
    if name == "render" and not finals:
        probs.append("완성 렌더 없음 (renders/<ep>.mp4)")
    if probs:
        return probs
    if name in ("script", "pilot", "render", "judge"):
        extra = ["--render", str(pilots[-1])] if name == "pilot" else []
        rows = parity(ep, test, extra)
        for r in rows:
            if r["ok"] is not False or r["item"] in waived:
                continue
            if name == "script" and (r["area"] not in {"대본", "사실"} or r["item"] == "⚠️ 남은 사실"):
                continue  # ⚠️ 는 업로드 전(judge)까지 0 으로
            if name == "pilot" and r["item"] not in {"10초 간격 화면 변화율", "컷 길이(실측)"}:
                continue  # 파일럿은 화면 리듬만 자동 확인, 나머지는 블라인드 비교로
            if name == "render" and r["area"] != "렌더":
                continue
            probs.append(f"parity ❌ {r['area']}·{r['item']}: {r['value']}")
    return probs


def show(ep, g):
    print(f"\n관문 장부 — {ep.name} (대본 해시 {script_hash(ep)})\n")
    print("| 관문 | 내용 | 담당 → 검수 | 상태 | 근거 |\n|---|---|---|---|---|")
    nxt = None
    for name, label, who in STAGES:
        st = state(ep, g, name)
        ev = (g["stages"].get(name) or {}).get("evidence", "")
        print(f"| {name} | {label} | {who} | {st} | {ev[:60]} |")
        if nxt is None and st != "통과" and all(state(ep, g, r) == "통과" for r in REQUIRES[name]):
            nxt = name
    if g.get("waivers"):
        print("\n사람이 정한 예외:")
        for w in g["waivers"]:
            print(f"- {w['item']}: {w['reason']} ({w['date']})")
    print(f"\n다음 관문: {nxt or '없음(모두 통과)'}")


def main():
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    ep = pathlib.Path(a[0]).resolve()
    g = load(ep)
    if len(a) == 1:
        return show(ep, g)

    def opt(k):
        return a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else ""

    cmd, today = a[1], datetime.date.today().isoformat()
    if cmd == "waive":
        item, by, reason = a[2], opt("--by"), opt("--reason")
        if by != "사람" or not reason:
            raise SystemExit("예외는 사람 결정만 기록한다: --by 사람 --reason \"<이유>\"")
        g["waivers"].append({"item": item, "reason": reason, "date": today})
        save(ep, g)
        return print(f"예외 기록: {item}")
    if cmd not in ("pass", "fail") or len(a) < 3 or a[2] not in NAMES:
        raise SystemExit(f"관문 이름: {', '.join(NAMES)}")
    name, by, ev = a[2], opt("--by"), opt("--evidence")
    if not by or not ev:
        raise SystemExit("--by <담당> --evidence \"<근거>\" 가 필요하다")
    if cmd == "pass":
        missing = [r for r in REQUIRES[name] if state(ep, g, r) != "통과"]
        if missing:
            raise SystemExit(f"거부: 앞 관문이 통과 상태가 아니다 → {', '.join(missing)}")
        if name in ("plan", "script") and by != "사람" and "사람" not in ev:
            raise SystemExit(f"거부: {name} 관문은 사람 승인이 필요하다(--by 사람, 또는 근거에 사람 승인 기록)")
        probs = auto_check(ep, g, name)
        if probs:
            raise SystemExit("거부: 자동 확인 실패\n- " + "\n- ".join(probs))
    g["stages"][name] = {"status": cmd, "by": by, "evidence": ev, "date": today, "script": script_hash(ep)}
    g["log"].append({"stage": name, "status": cmd, "by": by, "evidence": ev, "date": today})
    save(ep, g)
    print(f"{name}: {'통과' if cmd == 'pass' else '미달'} 기록")


if __name__ == "__main__":
    main()
