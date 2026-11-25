"""관문 장부: 에피소드의 단계마다 누가·무슨 근거로 넘겼는지 기록하고, 순서를 지키게 한다.

    python3 scripts/gates.py episodes/<ep>                                   # 장부 보기(다음 관문 표시)
    python3 scripts/gates.py episodes/<ep> pass <stage> --by <담당> --evidence "<근거: 파일·보고 요약>"
    python3 scripts/gates.py episodes/<ep> fail <stage> --by <담당> --evidence "<무엇이 미달인지>"
    python3 scripts/gates.py episodes/<ep> waive "<parity 항목>" --by 사람 --reason "<이유>"   # 사람이 정한 예외만 → data/exceptions.json
    python3 scripts/gates.py episodes/<ep> todo <stage> P0|P1 "<고칠 것>" --owner <담당> [--src <검수 파일>]   # 미달 항목 하나 등록
    python3 scripts/gates.py episodes/<ep> done <stage> <번호> --by <확인한 검수> --evidence "<무엇으로 확인>"   # 고쳐졌음(검수가 확인)

장부: episodes/<ep>/data/gates.json. 규칙:
- 앞 관문(REQUIRES)이 통과 상태가 아니면 pass 를 거부한다.
- 자동 확인이 있는 관문은 pass 전에 확인한다(사실 수, parity 영역, 렌더 파일). 실패면 거부.
- 대본(data/script.txt)이 바뀌면 그 뒤 관문은 "다시 필요"로 보인다(통과 당시 대본 해시와 비교).
- fail 뒤 고칠 것은 todo 로 하나씩 등록하고, 검수가 확인하면 done 으로 닫는다(2026-11-25 회고: 미달 뒤 사흘 동안
  어느 항목이 고쳐졌는지 장부에 없어 다시 판정하지 못했다). 열린 P0 가 있으면 그 관문은 pass 를 거부한다.
  장부 보기는 열린 항목 수와 마지막 미달 뒤 지난 날수를 보여 준다.
- waive 는 사람 결정만 기록한다(--by 사람). 기록은 data/exceptions.json(parity_check 와 같은 파일)에 가고,
  parity 는 그 행을 "⚪ 예외"로 표시한다. 판정자는 예외가 있는 영역을 최고 "근접"으로 본다.
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
    ("qa_facts", "렌더 직전 최종 사실", "fact-checker(화면 글자·그림 전체 대조)"),
    ("render", "렌더", "제작 책임자 → editor(실측) + visual-critic(렌더 프레임)"),
    ("thumbnail", "썸네일", "thumb-director·thumb-builder → thumb-critic"),
    ("meta", "메타(upload.json)", "meta-writer → thumb-copy-critic"),
    ("judge", "최종 판정", "reference-analyst → parity-judge"),
]
REQUIRES = {
    "plan": [], "facts": ["plan"], "script": ["facts"], "design": ["script"], "archive": ["design"],
    "pilot": ["design", "archive"], "scenes": ["pilot"], "sound": ["script"], "qa_facts": ["scenes"], "render": ["scenes", "sound", "qa_facts"],
    "thumbnail": ["script"], "meta": ["script"], "judge": ["render", "thumbnail", "meta"],
}
AFTER_SCRIPT = {"script", "design", "archive", "pilot", "scenes", "sound", "qa_facts", "render", "thumbnail", "meta", "judge"}
NAMES = [s for s, _, _ in STAGES]


def script_hash(ep):
    p = ep / "data" / "script.txt"
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12] if p.exists() else None


def load(ep):
    p = ep / "data" / "gates.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"stages": {}, "waivers": [], "log": []}


def exceptions(ep):
    f = ep / "data" / "exceptions.json"
    return {e["item"]: e for e in json.loads(f.read_text(encoding="utf-8")).get("exceptions", [])} if f.exists() else {}


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
    waived = {w["item"] for w in g.get("waivers", [])} | set(exceptions(ep))
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


def open_todos(g, name=None):
    return [(i, x) for i, x in enumerate(g.get("todos", []), 1) if not x.get("done") and (name is None or x["stage"] == name)]


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
    todo = open_todos(g)
    if todo:
        print(f"\n열린 고칠 것 {len(todo)}개(P0 {sum(x['prio'] == 'P0' for _, x in todo)}):")
        for i, x in todo:
            print(f"- #{i} [{x['stage']} {x['prio']}] {x['what']} — {x.get('owner', '')} ({x['date']}{', ' + x['src'] if x.get('src') else ''})")
    for name, _, _ in STAGES:
        st = g["stages"].get(name) or {}
        if st.get("status") == "fail":
            days = (datetime.date.today() - datetime.date.fromisoformat(st["date"])).days
            if days >= 1:
                print(f"\n주의: {name} 미달({st['date']}) 뒤 {days}일 — 고친 뒤 다시 검수·판정했는가?")
    exc = exceptions(ep)
    if exc:
        print("\n사람이 정한 예외(data/exceptions.json):")
        for e in exc.values():
            print(f"- {e['item']}: {e.get('reason', '')} ({e.get('decided', '')})")
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
        f = ep / "data" / "exceptions.json"
        d = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"exceptions": []}
        d["exceptions"] = [e for e in d["exceptions"] if e["item"] != item] + [{"item": item, "reason": reason, "decided": today}]
        f.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        return print(f"예외 기록: {item} → {f.relative_to(HERE)}")
    if cmd == "todo":
        if len(a) < 5 or a[2] not in NAMES or a[3] not in ("P0", "P1"):
            raise SystemExit("todo <stage> P0|P1 \"<고칠 것>\" --owner <담당> [--src <검수 파일>]")
        g.setdefault("todos", []).append({"stage": a[2], "prio": a[3], "what": a[4], "owner": opt("--owner"),
                                          "src": opt("--src"), "date": today})
        save(ep, g)
        return print(f"#{len(g['todos'])} 등록: [{a[2]} {a[3]}] {a[4]}")
    if cmd == "done":
        if len(a) < 4 or not a[3].isdigit() or not (1 <= int(a[3]) <= len(g.get("todos", []))):
            raise SystemExit("done <stage> <번호> --by <확인한 검수> --evidence \"<근거>\"")
        x = g["todos"][int(a[3]) - 1]
        if not opt("--by") or not opt("--evidence"):
            raise SystemExit("--by <확인한 검수> --evidence \"<근거>\" 가 필요하다")
        x.update(done=today, by=opt("--by"), evidence=opt("--evidence"))
        save(ep, g)
        return print(f"#{a[3]} 닫음: {x['what']}")
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
        p0 = [f"#{i} {x['what']}" for i, x in open_todos(g, name) if x["prio"] == "P0"]
        if p0:
            raise SystemExit("거부: 열린 P0 가 있다(검수가 확인한 뒤 done)\n- " + "\n- ".join(p0))
        probs = auto_check(ep, g, name)
        if probs:
            raise SystemExit("거부: 자동 확인 실패\n- " + "\n- ".join(probs))
    g["stages"][name] = {"status": cmd, "by": by, "evidence": ev, "date": today, "script": script_hash(ep)}
    g["log"].append({"stage": name, "status": cmd, "by": by, "evidence": ev, "date": today})
    save(ep, g)
    print(f"{name}: {'통과' if cmd == 'pass' else '미달'} 기록")


if __name__ == "__main__":
    main()
