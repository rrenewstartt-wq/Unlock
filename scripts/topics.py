"""Topic backlog for the planning team: add candidates, check duplicates, score, pick.

    python3 scripts/topics.py add <inbox.json>          # merge scout output (dedupe by slug and covered cases)
    python3 scripts/topics.py list [--top 10] [--all]   # ranked table
    python3 scripts/topics.py show <slug>
    python3 scripts/topics.py check "<name or keyword>" # is it already covered (us / benchmark channels)?
    python3 scripts/topics.py set <slug> <status> [--note "..."]   # 후보 → 검증됨 → 선정 → 기획됨 → 제작됨 | 보류 | 제외
    python3 scripts/topics.py rescore                   # after weights change

Candidate shape (what agents write): see docs/topic-criteria.md.
"""
import argparse
import datetime
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
BACKLOG = HERE / "data" / "topics" / "backlog.json"
COVERED = HERE / "data" / "topics" / "covered.json"
CONFIG = HERE / "config" / "topics.json"
STATUSES = ["후보", "검증됨", "선정", "기획됨", "제작됨", "보류", "제외"]
SCORE_KEYS = ["hook", "resolution", "sources", "visual", "novelty", "audience", "risk"]
REQUIRED = ["slug", "name", "region", "years", "logline", "scores", "sources"]


def load(p):
    return json.loads(p.read_text(encoding="utf-8"))


def save(p, d):
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def norm(s):
    return re.sub(r"[\s'\"·\-_.,()]", "", str(s).lower())


def covered_hits(c):
    """Covered cases whose keys appear in the candidate's name, aliases or keys."""
    hay = norm(" ".join([c.get("name", ""), *c.get("aliases", []), *c.get("keys", [])]))
    hits = []
    for case in load(COVERED)["cases"]:
        for k in case.get("keys", []):
            if k and norm(k) in hay:
                hits.append(f'{case["by"]}: {case.get("title") or case["name"]}')
                break
    return hits


def score(c, w):
    s = c["scores"]
    return round(sum(w[k] * float(s.get(k, 0)) for k in SCORE_KEYS), 2)


def validate(c):
    missing = [k for k in REQUIRED if k not in c]
    if missing:
        return f"필수 항목 없음: {missing}"
    bad = [k for k in SCORE_KEYS if not (1 <= float(c["scores"].get(k, 0)) <= 5)]
    if bad:
        return f"점수는 1~5: {bad}"
    if not re.fullmatch(r"[a-z0-9-]+", c["slug"]):
        return "slug 는 영문 소문자·숫자·하이픈"
    return None


def cmd_add(a):
    cfg = load(CONFIG)
    w = cfg["weights"]
    inbox = load(pathlib.Path(a.file))
    items = inbox["candidates"] if isinstance(inbox, dict) else inbox
    back = load(BACKLOG)
    have = {c["slug"] for c in back["candidates"]}
    added = skipped = 0
    for c in items:
        err = validate(c)
        if err:
            print(f"✗ {c.get('slug', '?')}: {err}"); skipped += 1; continue
        if c["slug"] in have:
            print(f"· {c['slug']}: 이미 백로그에 있음"); skipped += 1; continue
        hits = covered_hits(c)
        if hits:
            print(f"✗ {c['slug']}: 이미 다룬 사건 — {hits[0]}"); skipped += 1; continue
        if len(c["sources"]) < cfg["min_sources"]:
            c.setdefault("flags", []).append(f"출처 {len(c['sources'])}개(최소 {cfg['min_sources']})")
        c["total"] = score(c, w)
        c.setdefault("status", "후보")
        c["added"] = datetime.date.today().isoformat()
        back["candidates"].append(c); have.add(c["slug"]); added += 1
    save(BACKLOG, back)
    print(f"추가 {added}, 건너뜀 {skipped} → {BACKLOG.relative_to(HERE)}")


def cmd_list(a):
    back = load(BACKLOG)["candidates"]
    rows = [c for c in back if a.all or c.get("status") not in ("제외", "제작됨")]
    rows.sort(key=lambda c: -c.get("total", 0))
    if a.top:
        rows = rows[: a.top]
    print(f'{"점수":>5}  {"상태":4}  {"slug":28} {"지역":4} {"간격":>4}  사건')
    for c in rows:
        gap = c.get("years", {}).get("gap", "")
        print(f'{c.get("total", 0):5.1f}  {c.get("status", ""):4}  {c["slug"]:28} {c["region"]:4} {str(gap):>4}  {c["name"]}')
        if c.get("flags"):
            print(f'{"":13}⚠ {", ".join(c["flags"])}')


def find(slug):
    back = load(BACKLOG)
    for c in back["candidates"]:
        if c["slug"] == slug:
            return back, c
    sys.exit(f"없는 slug: {slug}")


def cmd_show(a):
    _, c = find(a.slug)
    print(json.dumps(c, ensure_ascii=False, indent=1))


def cmd_check(a):
    probe = {"name": a.text, "keys": [a.text]}
    hits = covered_hits(probe)
    back = [c for c in load(BACKLOG)["candidates"] if norm(a.text) in norm(c["name"] + " ".join(c.get("aliases", [])))]
    print("이미 다룬 사건:", hits or "없음")
    print("백로그:", [c["slug"] for c in back] or "없음")


def cmd_set(a):
    if a.status not in STATUSES:
        sys.exit(f"상태는 {STATUSES}")
    back, c = find(a.slug)
    c["status"] = a.status
    if a.note:
        c.setdefault("notes", []).append(f"{datetime.date.today().isoformat()} {a.status}: {a.note}")
    save(BACKLOG, back)
    print(f"{a.slug} → {a.status}")


def cmd_rescore(a):
    w = load(CONFIG)["weights"]
    back = load(BACKLOG)
    for c in back["candidates"]:
        c["total"] = score(c, w)
    save(BACKLOG, back)
    print(f'{len(back["candidates"])}개 다시 계산')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("add"); p.add_argument("file"); p.set_defaults(f=cmd_add)
    p = sub.add_parser("list"); p.add_argument("--top", type=int, default=0); p.add_argument("--all", action="store_true"); p.set_defaults(f=cmd_list)
    p = sub.add_parser("show"); p.add_argument("slug"); p.set_defaults(f=cmd_show)
    p = sub.add_parser("check"); p.add_argument("text"); p.set_defaults(f=cmd_check)
    p = sub.add_parser("set"); p.add_argument("slug"); p.add_argument("status"); p.add_argument("--note", default=""); p.set_defaults(f=cmd_set)
    p = sub.add_parser("rescore"); p.set_defaults(f=cmd_rescore)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
