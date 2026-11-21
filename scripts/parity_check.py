"""레퍼런스 동급 검사: 에피소드 하나를 docs/quality-bar.md 의 숫자 기준으로 잰다.

    python3 scripts/parity_check.py episodes/<ep>            # 표 + data/parity.json
    python3 scripts/parity_check.py episodes/<ep> --strict   # 하나라도 ❌ 이면 종료 코드 1 (넘기기 전 관문)
    python3 scripts/parity_check.py episodes/<ep> --test     # 3분 시험편 기준(길이·질문 수만 완화)

사람이 알고 남긴 예외는 episodes/<ep>/data/exceptions.json {"exceptions": [{"item": "<항목 이름>", "reason", "decided": "YYYY-MM-DD"}]}
— 그 항목은 ❌ 대신 "⚪ 예외"로 표시되고 --strict 를 막지 않는다. 기준을 낮추는 용도로 쓰지 않는다(사람 결정만).

렌더(renders/*.mp4)가 있으면 화면 변화율·컷 길이·음량도 잰다. 없으면 대본·장면 파일로 추정하고 "렌더 후"로 남긴다.
기준값의 근거는 data/benchmark/unlock_kr/summary.json 과 docs/benchmark-report.md (레퍼런스 4편).
"""
import json
import pathlib
import re
import shutil
import statistics
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
Q_END = re.compile(r"(까|까요|나요|는가|을까|ㄹ까|\?)\s*$")


def ending(line):
    t = re.sub(r"[\s\"'”’.…!]+$", "", line)
    if Q_END.search(t):
        return "q"
    if re.search(r"(습니다|ㅂ니다|입니다|됩니다|봅니다|옵니다|납니다|집니다|냅니다|겠습니다)$", t):
        return "da"
    if re.search(r"죠$", t):
        return "jyo"
    return "other"


def ffprobe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def frame_change_ratio(video, step=10):
    """레퍼런스 측정과 같은 방식: step초 간격 프레임이 이전과 '다른 화면'인 비율(평균 밝기 차이 > 12/255)."""
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        return None
    dur = ffprobe_dur(video) or 0
    frames = []
    t = step / 2
    while t < dur:
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-vf", "scale=160:90",
                            "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True)
        if len(r.stdout) == 160 * 90:
            frames.append(np.frombuffer(r.stdout, dtype=np.uint8).astype(float))
        t += step
    if len(frames) < 3:
        return None
    diffs = [float(abs(a - b).mean()) for a, b in zip(frames, frames[1:])]
    return sum(d > 12 for d in diffs) / len(diffs)


def shot_lengths(video):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(video), "-vf", "scale=320:180,select='gt(scene,0.28)',showinfo", "-f", "null", "-"],
                       capture_output=True, text=True)
    cuts = [float(m) for m in re.findall(r"pts_time:([\d.]+)", r.stderr)]
    dur = ffprobe_dur(video) or 0
    edges = [0.0] + cuts + [dur]
    return [b - a for a, b in zip(edges, edges[1:]) if b - a > 0.3]


def loudness(video):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(video), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


def main():
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    ep = pathlib.Path(args[0]).resolve()
    strict, test = "--strict" in args, "--test" in args
    data = json.loads((ep / "data" / "script.json").read_text(encoding="utf-8"))
    scenes = data["scenes"]
    caps = [c for s in scenes for c in s["captions"]]
    total = data["total"]
    text = "".join(c["text"] for c in caps)
    rows = []

    def row(area, item, target, value, ok, note=""):
        rows.append({"area": area, "item": item, "target": target, "value": value,
                     "ok": ok, "note": note})

    # ---------------- 대본
    lo, hi = (150, 240) if test else (720, 1200)
    row("대본", "길이", f"{lo // 60}~{hi // 60}분" + (" (시험편)" if test else " (기본 16~20분, docs/competitor-report.md)"), f"{total / 60:.1f}분", lo <= total <= hi)
    cpm = len(text) / (total / 60)
    row("대본", "분당 글자", "380~420", f"{cpm:.0f}", 370 <= cpm <= 430 if data.get("voice") else None,
        "" if data.get("voice") else "읽기 속도 추정값 — 내레이션을 넣은 뒤 판정")
    hook = scenes[0] if scenes[0]["id"] == "hook" else None
    first = (scenes[1] if hook and len(scenes) > 1 else scenes[0])["captions"][0]
    row("대본", "날짜로 시작", "콜드 오픈 뒤 첫 자막이 연·월·일", first["text"], bool(re.match(r"^\s*\d{4}년", first["text"])))
    teaser = next((c for c in caps if c["start"] <= 60 and re.search(r"\d+\s*년(이|만에|간| 동안)", c["text"])), None)
    row("대본", "떡밥(걸린 햇수)", "60초 안", f'{teaser["start"]:.0f}초 "{teaser["text"]}"' if teaser else "없음", bool(teaser))
    rew = next((c for c in caps if re.search(r"되돌려|거슬러", c["text"])), None)
    row("대본", "되감기", "\"~전으로 되돌려 보겠습니다\"", f'{rew["start"]:.0f}초' if rew else "없음", bool(rew))
    qs = [c for c in caps if ending(c["text"]) == "q"]
    qlo, qhi = (3, 6) if test else (5, 9)
    row("대본", "질문형 문장 수", f"{qlo}~{qhi}", len(qs), qlo <= len(qs) <= qhi + 2)
    fq = qs[0]["start"] / total if qs else None
    row("대본", "첫 질문 위치", "8~20%", f"{fq * 100:.0f}%" if fq is not None else "없음", fq is not None and 0.08 <= fq <= 0.2)
    ends = [ending(c["text"]) for c in caps]
    da, jy = ends.count("da"), ends.count("jyo")
    share = jy / (da + jy) if da + jy else 0
    row("대본", "어미 ~죠 비율", "30~60% (~습니다와 섞기)", f"{share * 100:.0f}% (습니다 {da}, 죠 {jy})", 0.3 <= share <= 0.6)
    run = mx = 0
    prev = None
    for e in ends:
        run = run + 1 if e == prev and e in ("da", "jyo") else 1
        prev = e
        mx = max(mx, run)
    row("대본", "같은 어미 연속", "3번 미만", f"최대 {mx}번", mx < 3)
    long_caps = [c["text"] for c in caps if len(c["text"]) > 28]
    row("대본", "자막 길이", "28자 이하", f"{len(long_caps)}줄 초과" + (f' 예: "{long_caps[0]}"' if long_caps else ""), not long_caps)
    words = lambda cs: {w for c in cs for w in re.findall(r"[가-힣A-Za-z]{2,}", c["text"])}
    stop = {"그리고", "그런데", "하지만", "있었습니다", "있었죠", "합니다", "입니다", "그날", "이었습니다", "남자", "여자", "사람"}
    callback = (words(scenes[0]["captions"]) & words(scenes[-1]["captions"])) - stop
    row("대본", "소품 회수", "마지막 장면이 도입의 물건을 다시 꺼냄", ", ".join(sorted(callback)[:4]) or "겹치는 말 없음", bool(callback))
    nsc = len(scenes)
    want = 10 if test else max(18, round(total / 45))
    row("대본", "장면 수", f"{want}개 이상", nsc, nsc >= want)

    # ---------------- 화면
    comp = {p.stem: p.read_text(encoding="utf-8") for p in (ep / "compositions").glob("*.html")}
    is3d = {sid: ("assets/lib/" in h and "-stage" in h) for sid, h in comp.items()}
    real = {}
    for sid, h in comp.items():
        m = re.search(r'from "\./assets/lib/(\w+)\.js"', h)
        if m and is3d[sid]:
            lib = (ep / "assets" / "lib" / f"{m.group(1)}.js").read_text(encoding="utf-8")
            real[sid] = "kit3d/film.js" in lib
    dur = {s["id"]: s["end"] - s["start"] for s in scenes}
    t3 = sum(dur.get(s, 0) for s in real)
    row("화면", "3D 재연 비중", "35~65% 길이", f"{t3 / total * 100:.0f}%", 0.35 <= t3 / total <= 0.65)
    n_real = sum(real.values())
    row("화면", "사실적 3D(film 키트)", "3D 장면 100%", f"{n_real}/{len(real)}", bool(real) and n_real == len(real),
        "나머지는 기본 도형 마네킹(world.js)")
    arch = [sid for sid, h in comp.items() if "assets/archive/" in h]
    ledger = ep / "assets" / "archive" / "SOURCES.md"
    row("화면", "실제 자료(기록 사진·지도·문서)", "3장면 이상 + 출처 대장", f"{len(arch)}장면, 대장 {'있음' if ledger.exists() else '없음'}",
        len(arch) >= (1 if test else 3) and ledger.exists())
    # 핵심 장면 = 실제 사진 (docs/quality-bar.md "핵심 장면"): data/shots.json
    shots_f = ep / "data" / "shots.json"
    keys = json.loads(shots_f.read_text(encoding="utf-8")).get("key_scenes", []) if shots_f.exists() else []
    ledger_txt = ledger.read_text(encoding="utf-8") if ledger.exists() else ""
    with_photo, bad = 0, []
    for k in keys:
        ph = k.get("photo")
        if ph:
            name = pathlib.Path(ph).name
            ok = (ep / ph).exists() and ph in comp.get(k["scene"], "") and name in ledger_txt
            with_photo += ok
            if not ok:
                bad.append(f'{k["scene"]}(사진 지정했지만 파일·장면·대장 중 빠짐)')
        elif not (k.get("no_photo_reason") or "").strip():
            bad.append(f'{k["scene"]}(사진도 이유도 없음)')
    need = 2 if test else 5
    share = with_photo / len(keys) if keys else 0
    row("화면", "핵심 장면 실제 사진", f"핵심 장면 {need}개 이상, 사진 60% 이상, 못 쓴 장면은 이유",
        f"{len(keys)}개 중 사진 {with_photo}" + (f", 문제: {', '.join(bad)}" if bad else "") if keys else "data/shots.json 없음",
        len(keys) >= need and share >= 0.6 and not bad)
    hook_photo = bool(hook) and "assets/archive/" in comp.get("hook", "") and hook["end"] - hook["start"] <= 12
    hook_skip = next((k for k in keys if k.get("scene") == "hook" and (k.get("no_photo_reason") or "").strip()), None)
    row("화면", "콜드 오픈 실제 사진", "첫 10초 안에 hook 장면(실제 기록 사진, 12초 이하)",
        f'{hook["end"] - hook["start"]:.1f}초, 사진 {"있음" if hook_photo else "없음"}' if hook else ("없음 — 이유: " + hook_skip["no_photo_reason"] if hook_skip else "없음"),
        hook_photo or bool(hook_skip))
    ar_d = [float(m) for h in comp.values() for m in re.findall(r'class="clip ar-shot[^"]*" data-start="[\d.]+" data-duration="([\d.]+)"', h)]
    n_ins = sum(h.count("clip ar-shot ar-ins") for h in comp.values())
    want_ins = 1 if test else max(4, round(total / 150))
    row("화면", "실제 사진 컷(약 3초)", f"컷 2.5~4초, 중간 하이라이트 3초 컷 {want_ins}개 이상(2~3분마다)",
        f"사진 컷 {len(ar_d)}개" + (f", 길이 {min(ar_d):.1f}~{max(ar_d):.1f}초" if ar_d else "") + f", 중간 삽입 {n_ins}개",
        bool(ar_d) and all(2.5 <= d <= 4.2 for d in ar_d) and n_ins >= want_ins)
    missing_tag = [sid for sid in real if "tag-re" not in comp[sid]]
    row("화면", "3D 에 '재현' 표기", "모든 3D 장면", "누락 " + (", ".join(missing_tag) if missing_tag else "없음"), not missing_tag)
    # Static shot estimate: 3D = camera cuts, 2D = one beat per caption.
    est = []
    for s in scenes:
        h = comp.get(s["id"], "")
        n = h.count("cut: true") + 1 if is3d.get(s["id"]) else max(1, len(s["captions"]))
        est += [dur[s["id"]] / n] * n
    med = statistics.median(est) if est else 0
    row("화면", "컷 길이(추정)", "중앙값 3~8초, 최대 12초", f"중앙값 {med:.1f}초, 최대 {max(est):.1f}초", 3 <= med <= 8 and max(est) <= 12,
        "장면 파일로 추정. 렌더가 있으면 아래 실측을 본다")

    # ---------------- 소리
    idx = (ep / "index.html").read_text(encoding="utf-8") if (ep / "index.html").exists() else ""
    row("소리", "내레이션", "본인 목소리 복제(docs/voice.md)", "있음" if data.get("voice") else "없음", bool(data.get("voice")))
    music = re.findall(r'<audio[^>]+src="([^"]*music[^"]*)"', idx)
    row("소리", "음악 베드", "있음 + 라이선스 기록", f"{len(music)}곡" if music else "없음",
        bool(music) and (ep / "assets" / "music" / "LICENSE.md").exists())
    sfx = len(re.findall(r'<audio[^>]+src="[^"]*sfx', idx))
    row("소리", "효과음", "화면 원인 있는 것만", f"{sfx}개", sfx > 0)

    # ---------------- 사실·썸네일·메타
    facts = (ep / "data" / "facts.md").read_text(encoding="utf-8") if (ep / "data" / "facts.md").exists() else ""
    warn = len(re.findall(r"^\|.*⚠️.*\|\s*$", facts, re.M))
    row("사실", "⚠️ 남은 사실", "업로드 전 0", warn, warn == 0, "1차 자료로 확인하거나 자막에서 뺀다")
    out = ep / "thumbnail" / "out"
    finals = sorted(out.glob("copy-*.jpg")) if out.exists() else []
    row("썸네일", "완성 썸네일", "문구 검수 통과안 2~3개", f"{len(finals)}개", len(finals) >= 2)
    up = ep / "upload.json"
    meta = json.loads(up.read_text(encoding="utf-8")) if up.exists() else {}
    tags = meta.get("tags", [])
    row("메타", "업로드 정보(upload.json)", "제목(공식) + 한·일 태그 8개 이상", f'제목 {"있음" if meta.get("title") else "없음"}, 태그 {len(tags)}개',
        bool(meta.get("title")) and len(tags) >= 8 and any(re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", t) for t in tags))

    # ---------------- 렌더 실측
    renders = sorted((ep / "renders").glob("*.mp4")) if (ep / "renders").exists() else []
    renders = [r for r in renders if "preview" not in r.name] or renders
    if renders and shutil.which("ffmpeg"):
        v = renders[-1]
        ratio = frame_change_ratio(v)
        row("렌더", "10초 간격 화면 변화율", "74~92% (레퍼런스 실측)", f"{ratio * 100:.0f}%" if ratio is not None else "측정 실패",
            ratio is not None and ratio >= 0.74, v.name)
        sl = shot_lengths(v)
        if sl:
            row("렌더", "컷 길이(실측)", "중앙값 3~8초, 최대 12초", f"중앙값 {statistics.median(sl):.1f}초, 최대 {max(sl):.1f}초",
                3 <= statistics.median(sl) <= 8 and max(sl) <= 12)
        li, pk = loudness(v)
        row("렌더", "음량", "-16~-14 LUFS, 피크 -1 dB 이하", f"{li} LUFS, 피크 {pk}", li is not None and -16.5 <= li <= -13.5 and (pk or 0) <= -1,
            "측정값이다. 들어 본 것은 아니다")
    else:
        row("렌더", "렌더 실측", "화면 변화율·컷 길이·음량", "렌더 없음", None, "npm run render 뒤 다시 실행")

    # ---------------- 사람이 알고 남긴 예외 (data/exceptions.json: [{"item", "reason", "decided"}])
    exf = ep / "data" / "exceptions.json"
    exc = {e["item"]: e for e in json.loads(exf.read_text(encoding="utf-8")).get("exceptions", [])} if exf.exists() else {}
    for r in rows:
        e = exc.get(r["item"])
        if e and r["ok"] is False:
            r["ok"] = "exc"
            r["note"] = f'사람 결정 {e.get("decided", "")}: {e.get("reason", "")}'

    # ---------------- 출력
    mark = {True: "✅", False: "❌", None: "–", "exc": "⚪ 예외"}
    print(f"\n레퍼런스 동급 검사 — {ep.name}{' (시험편 기준)' if test else ''}\n")
    print("| 영역 | 항목 | 목표 | 측정 | 판정 |\n|---|---|---|---|---|")
    for r in rows:
        note = f" ({r['note']})" if r["note"] and r["ok"] is not True else ""
        print(f"| {r['area']} | {r['item']} | {r['target']} | {r['value']}{note} | {mark[r['ok']]} |")
    fails = [r for r in rows if r["ok"] is False]
    print(f"\n통과 {sum(r['ok'] is True for r in rows)} · 실패 {len(fails)} · 보류 {sum(r['ok'] is None for r in rows)} · 예외(사람 결정) {sum(r['ok'] == 'exc' for r in rows)}")
    (ep / "data" / "parity.json").write_text(json.dumps({"episode": ep.name, "test": test, "rows": rows}, ensure_ascii=False, indent=1),
                                             encoding="utf-8")
    if strict and fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
