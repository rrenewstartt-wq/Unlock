"""경쟁 채널 분석: 공개 영상 목록(제목·조회수·길이)으로 무엇이 터지는지 잰다.

    python3 scripts/competitors.py            # 수집(없는 채널만) + 분석
    python3 scripts/competitors.py --refresh  # 전부 다시 수집
    python3 scripts/competitors.py --offline  # 수집 없이 raw/ 로 다시 분석

채널 목록: config/competitors.json. 수집은 yt-dlp --flat-playlist(채널 목록 페이지)만 쓴다 — 개별 영상 페이지는 열지 않는다.
결과: data/benchmark/competitors/summary.json (커밋), raw/ (목록·썸네일 시트, 커밋 안 함), 보고서는 docs/competitor-report.md(사람이 씀).

측정 방법
- 채널마다 최근 순 목록에서 4분 미만(쇼츠)과 가장 최근 5편(조회수가 아직 쌓이는 중)을 뺀다.
- 배수 = 조회수 / 그 채널 중앙값. 채널 크기 차이를 지우고 "그 채널 평소 대비 얼마나 터졌나"를 본다. 히트 = 배수 2 이상.
- 제목 특징·길이·소재마다: 해당 영상 수, 배수 중앙값, 히트율, 그리고 없는 쪽과의 비(lift).
"""
import json
import pathlib
import re
import statistics
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / "data" / "benchmark" / "competitors"
RAW = OUT / "raw"

FEATURES = {
    "N년 만에": r"\d+\s*년\s*만에",
    "풀린·잡힌·밝혀진": r"풀린|해결된|잡힌|밝혀진|검거|체포",
    "미제·미스터리": r"미제|미스터리|미스테리|미해결",
    "국가명": r"일본|미국|중국|영국|호주|독일|프랑스|러시아|캐나다|이탈리아|멕시코|브라질|인도|필리핀|태국|세르비아|스웨덴|노르웨이|핀란드|아일랜드|스페인|대만|베트남|뉴질랜드|네덜란드|벨기에|오스트리아|폴란드|체코|남아공|콜롬비아|아르헨티나",
    "한국 사건": r"한국|국내|서울|부산|대구|인천|광주|대전|울산|경기|강원|충북|충남|전북|전남|경북|경남|제주",
    "최상급(역사상·가장·최악)": r"역사상|가장|최악|최초|사상 최",
    "~한 이유": r"이유",
    "최후·정체·진실": r"최후|정체|진실|진범|결말|비밀",
    "실화·실제로": r"실화|실제로|실제 사건",
    "숫자": r"\d",
    "물음": r"\?|까$|까\s|나\?|는가",
    "인용 “…”": r"[\"“”'‘’]",
    "신체·시신": r"시신|시체|토막|유골|백골|장기|머리|뼈|미라",
    "살해·살인": r"살인|살해|살O|살ㅇ|죽인|죽였",
    "실종·사라진": r"실종|사라진|행방|증발",
    "감금·학대": r"감금|학대|노예|가스라이팅|세뇌",
    "가족": r"아들|딸|엄마|아빠|어머니|아버지|남편|아내|부부|가족|형제|자매",
    "아이·학생": r"아이|소녀|소년|아동|여고생|여중생|학생|초등",
    "모음·몰아보기": r"모음|몰아보기|\d+\s*가지|TOP|\d+선|정리",
    "시리즈 표기(1부·EP)": r"\d+\s*부|\d+\s*화|EP\.?\s*\d|ep\.?\s*\d|#\d",
    "말머리 【】[]": r"^\s*[\[【]",
    "사건명 꼬리표(｜사건)": r"[|｜]\s*\S+.*사건\s*$",
    "말줄임(...)": r"\.\.|…",
}
BUCKETS = [(4, 8), (8, 12), (12, 16), (16, 20), (20, 30), (30, 999)]


def collect(ch, refresh):
    f = RAW / f"{ch['handle']}.json"
    if f.exists() and not refresh:
        return json.loads(f.read_text(encoding="utf-8"))
    url = (ch.get("url") or f"https://www.youtube.com/@{ch['handle']}").rstrip("/") + "/videos"
    # 두 번 받는다: 기본(영어) 목록은 조회수를 읽을 수 있지만 제목이 영어 자동 번역으로 바뀌고,
    # lang=ko 목록은 원래 한국어 제목이지만 조회수("조회수 3.4만회")를 읽지 못한다. 영상 id 로 합친다.
    def flat(extra):
        r = subprocess.run(["yt-dlp", "--flat-playlist", "--playlist-end", "150", *extra, "-J", url], capture_output=True, text=True, timeout=300)
        if r.returncode != 0 or not r.stdout.strip():
            print(f"  ✗ {ch['handle']}: {(r.stderr or '').strip().splitlines()[-1:] or '실패'}")
            return None
        return json.loads(r.stdout)
    d = flat([])
    if d is None:
        return None
    time.sleep(2)
    ko = flat(["--extractor-args", "youtube:lang=ko"]) or {}
    ko_title = {e["id"]: e.get("title") for e in ko.get("entries", []) if e.get("id")}
    vids = [{"id": e["id"], "title": ko_title.get(e["id"]) or e.get("title") or "", "views": e.get("view_count"), "duration": e.get("duration")}
            for e in d.get("entries", []) if e.get("id")]
    meta = {"handle": ch["handle"], "channel": d.get("channel") or d.get("title"), "channel_id": d.get("channel_id"),
            "followers": d.get("channel_follower_count"), "videos": vids}
    RAW.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    time.sleep(2)
    return meta


def stats(items):
    r = [v["ratio"] for v in items]
    return {"n": len(r), "median_ratio": round(statistics.median(r), 2) if r else None,
            "hit_rate": round(sum(x >= 2 for x in r) / len(r), 3) if r else None}


def lift(a, b):
    if not a["n"] or not b["n"] or not b["median_ratio"]:
        return None
    return round(a["median_ratio"] / b["median_ratio"], 2)


def main():
    args = sys.argv[1:]
    cfg = json.loads((HERE / "config" / "competitors.json").read_text(encoding="utf-8"))
    rows, chans = [], {}
    for ch in cfg["channels"]:
        meta = None if "--offline" in args and not (RAW / f"{ch['handle']}.json").exists() else (
            json.loads((RAW / f"{ch['handle']}.json").read_text(encoding="utf-8")) if "--offline" in args else collect(ch, "--refresh" in args))
        if not meta:
            continue
        vids = [v for v in meta["videos"] if v["views"] is not None and (v["duration"] or 0) >= 240]
        if ch["handle"] != "unlock_kr":   # 레퍼런스는 편수가 적어 그대로 둔다(분석 표에는 넣지 않고 채널 표에만)
            vids = vids[5:]  # 가장 최근 5편은 조회수가 아직 쌓이는 중
        if len(vids) < 8 and ch["handle"] != "unlock_kr":
            print(f"  – {ch['handle']}: 분석할 영상 {len(vids)}편(8편 미만) — 제외")
            continue
        if not vids:
            print(f"  – {ch['handle']}: 분석할 영상 없음 — 제외")
            continue
        med = statistics.median(v["views"] for v in vids)
        for v in vids:
            v.update(ch=ch["handle"], group=ch["group"], ratio=v["views"] / med if med else 0)
        if ch["handle"] != "unlock_kr":
            rows += vids
        top = sorted(vids, key=lambda v: -v["ratio"])[:5]
        chans[ch["handle"]] = {"group": ch["group"], "channel": meta["channel"], "followers": meta.get("followers"), "videos": len(vids),
                               "median_views": int(med), "max_views": max(v["views"] for v in vids),
                               "median_minutes": round(statistics.median((v["duration"] or 0) / 60 for v in vids), 1),
                               "top": [{"title": v["title"], "views": v["views"], "ratio": round(v["ratio"], 1), "id": v["id"]} for v in top]}
    out = {"collected": time.strftime("%Y-%m-%d"), "method": __doc__.split("측정 방법")[1].strip(), "channels": chans}
    CORE = ("ai3d", "photo")  # 내레이션 사건 채널(진행자·실제 영상·장르 밖 제외)
    rows = [v for v in rows if v["group"] != "other"]
    for grp in ("all", "core"):
        sub = [v for v in rows if grp == "all" or v["group"] in CORE]
        feat = {}
        for name, pat in FEATURES.items():
            has = [v for v in sub if re.search(pat, v["title"])]
            hasnt = [v for v in sub if not re.search(pat, v["title"])]
            a, b = stats(has), stats(hasnt)
            feat[name] = {"with": a, "without": b, "lift": lift(a, b)}
        dur = {}
        for lo, hi in BUCKETS:
            dur[f"{lo}~{hi if hi < 999 else ''}분"] = stats([v for v in sub if lo * 60 <= (v["duration"] or 0) < hi * 60])
        out[grp] = {"videos": len(sub), "features": feat, "duration": dur}
    hits = sorted([v for v in rows if v["group"] in CORE], key=lambda v: -v["ratio"])[:40]
    out["core_top40"] = [{"ch": v["ch"], "title": v["title"], "views": v["views"], "ratio": round(v["ratio"], 1),
                          "minutes": round((v["duration"] or 0) / 60, 1), "id": v["id"]} for v in hits]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "summary.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n채널 {len(chans)}곳, 영상 {len(rows)}편 → {OUT.relative_to(HERE)}/summary.json\n")
    print("| 채널 | 형식 | 중앙값 | 최고 | 길이 중앙값 | 영상 |\n|---|---|---|---|---|---|")
    for h, c in sorted(chans.items(), key=lambda x: -x[1]["median_views"]):
        print(f"| {h} | {c['group']} | {c['median_views']:,} | {c['max_views']:,} | {c['median_minutes']}분 | {c['videos']} |")
    print("\n## 형식별 채널 중앙값의 중앙값")
    for g in ("ai3d", "photo", "footage", "host"):
        meds = [c["median_views"] for c in chans.values() if c["group"] == g]
        if meds:
            print(f"- {g}: {len(meds)}곳, {int(statistics.median(meds)):,}")
    for grp in ("core", "all"):
        print(f"\n## 제목 특징 ({grp}, {out[grp]['videos']}편) — 배수 중앙값·히트율(배수 2+), 없는 쪽 대비")
        print("| 특징 | 편수 | 배수 중앙값 | 히트율 | lift |\n|---|---|---|---|---|")
        for k, f in sorted(out[grp]["features"].items(), key=lambda x: -(x[1]["lift"] or 0)):
            w = f["with"]
            if w["n"] >= 10:
                print(f"| {k} | {w['n']} | {w['median_ratio']} | {w['hit_rate'] * 100:.0f}% | {f['lift']} |")
        print("\n| 길이 | 편수 | 배수 중앙값 | 히트율 |\n|---|---|---|---|")
        for k, s in out[grp]["duration"].items():
            if s["n"]:
                print(f"| {k} | {s['n']} | {s['median_ratio']} | {s['hit_rate'] * 100:.0f}% |")


if __name__ == "__main__":
    main()
