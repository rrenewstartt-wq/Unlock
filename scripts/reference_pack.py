import json, pathlib, collections, statistics
HERE = pathlib.Path("/home/user/Unlock")
REF = HERE / "data/benchmark/unlock_kr"
RAW = REF / "raw"
summ = json.loads((REF / "summary.json").read_text(encoding="utf-8"))
sv = {v["id"]: v for v in summ["videos"]}
old = json.loads((REF / "reference-pack.json").read_text(encoding="utf-8"))
ORDER = ["UV4I5My5C0E", "0pU_k2OUC1I", "t5BgBYoW_zg", "kXHIhuQLRvY", "TpyIVmDYd3k"]
def nb(x):
    return None if x in ("?",) else x
videos = []
agg = collections.Counter(); agg_n = 0
fig3d = collections.Counter(); style_all = collections.Counter()
for vid in ORDER:
    cells = json.loads((RAW / "frames" / vid / "cells.json").read_text(encoding="utf-8"))
    rows = [l.split("\t") for l in (RAW / "frames/_notes" / f"{vid}.tsv").read_text(encoding="utf-8").splitlines() if l.strip()]
    rows.sort(key=lambda r: int(r[0]))
    frames = []
    for t, kind, fig, ff, text, acc, style, setn in rows:
        kind = nb(kind)
        figure = None if fig == "?" else fig == "1"
        face_front = None if ff == "?" else (None if ff == "-" else ff == "1")
        if not figure:
            face_front = None if figure is None else None
        # face_visible = 이목구비(눈·코·입)가 읽히는 얼굴. 3D 인물은 정면이어도 이목구비가 없다(아래 conclusion), 실제 자료는 정면이면 true.
        if figure and kind == "archive":
            face_visible = face_front
        elif figure and kind == "3d":
            face_visible = False
        elif figure is None:
            face_visible = None
        else:
            face_visible = False
        f = {"t": int(t), "kind": kind, "figure": figure, "face_visible": face_visible,
             "text_on_screen": text, "accent": nb(acc), "set": setn}
        if figure and kind == "3d":
            f["face_front"] = face_front
            f["figure_style"] = None if style in ("?", "-") else style
        frames.append(f)
    n = len(frames)
    kc = collections.Counter(f["kind"] for f in frames)
    pct = lambda c: round(100 * c / n, 1)
    f3 = [f for f in frames if f["kind"] == "3d"]
    f3fig = [f for f in f3 if f["figure"]]
    styles = collections.Counter()
    for f in f3fig:
        for s in (f.get("figure_style") or "unknown").split("+"):
            styles[s] += 1
    style_all.update(styles)
    arch = [f for f in frames if f["kind"] == "archive"]
    # 연속된 archive 프레임은 한 덩어리(장면)로 센다
    runs, prev = 0, None
    for f in frames:
        if f["kind"] == "archive" and prev != "archive":
            runs += 1
        prev = f["kind"]
    first_arch = arch[0]["t"] if arch else None
    acc = collections.Counter(f["accent"] for f in frames)
    txt = collections.Counter(f["text_on_screen"] for f in frames)
    t = (sv.get(vid) or {}).get("transcript") or {}
    e = t.get("endings") or {}
    stats = {
        "frames": n,
        "kind_pct": {k: pct(kc.get(k, 0)) for k in ("3d", "diagram", "archive", "title", "black")} | {"unclassified": pct(kc.get(None, 0))},
        "change_ratio_10s": cells["change_ratio_10s"],
        "archive_frames": len(arch), "archive_runs": runs, "first_archive_t": first_arch,
        "figure_in_3d_pct": round(100 * len(f3fig) / len(f3), 1) if f3 else None,
        "figure_style_3d": dict(styles),
        "face_front_3d": sum(1 for f in f3fig if f.get("face_front")),
        "face_visible_3d": sum(1 for f in f3fig if f["face_visible"]),
        "face_visible_archive": sum(1 for f in arch if f["face_visible"]),
        "accent_pct": {"red-light": pct(acc.get("red-light", 0)), "red-mark": pct(acc.get("red-mark", 0))},
        "text_on_screen_pct": {k: pct(txt.get(k, 0)) for k in ("none", "label", "panel")},
        "captions_per_min": None,
        "chars_per_min": t.get("chars_per_min"),
        "first_question_pct": None,
        "questions": e.get("질문형(~까?)"),
        "jyo_pct": round(e["~죠"] / (e["~죠"] + e["~습니다/~ㅂ니다"]) * 100) if e else None,
    }
    for k in ("3d", "diagram", "archive", "title", "black", None):
        agg[k] += kc.get(k, 0)
    agg_n += n
    videos.append({
        "video": vid, "duration_s": (sv.get(vid) or {}).get("duration_s"),
        "source": f"storyboard {cells['format']} {cells['rows']}x{cells['cols']}, 칸 {cells['interval_s']:.2f}초 → 10초 표본 {n}장 (칸 {cells['frames']}장 중 {cells['step_10s']}칸마다) / 320px",
        "status": "classified",
        "frames": frames, "stats": stats,
        "stats_source": {"chars_per_min/questions/jyo_pct": "summary.json 자동 자막(2026-11-17 수집, 이번 재수집에서 자막은 못 받음)" if t else "자막 없음",
                         "change_ratio_10s": "blind_sheet.py cells (parity_check 와 같은 밝기 차 방식)"},
    })
total = {
    "frames": agg_n,
    "kind_pct": {("unclassified" if k is None else k): round(100 * agg[k] / agg_n, 1) for k in ("3d", "diagram", "archive", "title", "black", None)},
    "kind_pct_range": {k: [min(v["stats"]["kind_pct"][k] for v in videos), max(v["stats"]["kind_pct"][k] for v in videos)] for k in ("3d", "diagram", "archive")},
    "change_ratio_10s_range": [min(v["stats"]["change_ratio_10s"] for v in videos), max(v["stats"]["change_ratio_10s"] for v in videos)],
    "archive_runs_range": [min(v["stats"]["archive_runs"] for v in videos), max(v["stats"]["archive_runs"] for v in videos)],
    "figure_style_3d": dict(style_all),
}
pack = {
    "handle": "@unlock_kr", "updated": "2026-11-22", "by": "reference-analyst",
    "rule": old["rule"],
    "collection": {
        "date": "2026-11-22",
        "method": "제작 책임자가 사용자 지시로 재수집: YTDLP_ARGS='--js-runtimes deno --extractor-args youtube:player_client=web_safari' python3 scripts/benchmark.py @unlock_kr --all-storyboards (쿠키 없음, CLAUDE.md 4 개정)",
        "result": "storyboards_ok_subtitles_missing",
        "detail": "영상 5편 info.json + 스토리보드 sb0(320x180, 3x3) 전체 68장. 자동 자막은 받지 못함. 2026-11-21 첫 시도는 봇 확인으로 0장.",
        "raw_available": {"video_info_json": 5, "storyboard_sheets": 68, "subtitles": 0, "thumbnails": 5},
    },
    "method": old["method"] | {
        "frames": "스토리보드 sb0 전체 → python3 scripts/blind_sheet.py cells <id> → raw/frames/<id>/. 칸 간격이 약 5초인 짧은 영상(UV4I5My5C0E, TpyIVmDYd3k)은 2칸마다 솎아 10초 표본으로 맞춤. 대조 시트(raw/frames/_contact)를 Read 로 직접 보고 분류, 얼굴은 원본 칸을 확대해 확인.",
        "kind": "3d(3D 재연) | diagram(2D 도식·UI·카드·지도) | archive(실제 사진·문서·영상) | title(글자만 있는 막 전환) | black(검은 화면, 영상 끝·전환) | null(판단 불가)",
        "fields": "figure(인물 있음) / face_visible(눈·코·입이 읽히는 얼굴이 보임) / face_front(3D 인물 머리가 카메라 쪽, 3D 프레임만) / figure_style(3D 프레임만: clothed=옷·머리카락·손이 있는 인물 모델, mono=빨강·황토·흰·회색 한 색 마네킹, silhouette=검은·빛나는 실루엣) / text_on_screen(하단 자막 제외: none|label 작은 이름표·날짜|panel 글자 카드가 주인공) / accent(red-light 빨간 조명, red-mark 빨간 그래픽·빨간 단색 인물) / set 짧은 일반 명사",
        "archive_runs": "연속된 archive 프레임 묶음 수(10초 표본이라 3초짜리 사진 컷은 놓칠 수 있다 — 하한값)",
    },
    "conclusion_3d_figure": {
        "summary": "3D 인물은 옷·머리카락·손이 있는 인물 모델(clothed)이 주력이지만 얼굴에 눈·코·입이 없다(매끈한 살색 얼굴). 정면·허리 위 근접에서도 같다. 여기에 한 색 마네킹(mono: 범인·용의자는 빨강, 경찰은 황토색, 군중은 흰색)과 실루엣을 섞는다.",
        "evidence": "3D 인물 프레임 중 머리가 카메라를 향한 것(face_front) 전부에서 이목구비가 읽히지 않음. 확대 확인: kXHIhuQLRvY t187·t364·t482·t600·t678~767(취조실 허리 위 근접), t5BgBYoW_zg t79, 0pU_k2OUC1I t563, UV4I5My5C0E t79·t128·t207. 실제 자료(archive) 속 실존 인물만 얼굴이 보임.",
        "caveat": "320px 스토리보드라 '이목구비 없음'과 '저해상도라 안 보임'을 완전히 가를 수는 없으나, 머리 높이 60px 이상인 근접(kXHIhuQLRvY 취조실)에서도 눈·코·입 음영이 전혀 없어 의도된 무안(無顔) 디자인으로 판단.",
    },
    "videos": videos,
    "total": total,
    "prior_observations": old["prior_observations"] | {"note": "2026-11-18 관찰(미재확인). 2026-11-22 프레임 분류로 대체: 화면 변화율은 videos[].stats.change_ratio_10s, 3D 인물은 conclusion_3d_figure."},
}
(REF / "reference-pack.json").write_text(json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
for v in videos:
    s = v["stats"]
    print(v["video"], s["frames"], s["kind_pct"], "chg", s["change_ratio_10s"], "arch", s["archive_frames"], s["archive_runs"], s["first_archive_t"],
          "fig3d", s["figure_in_3d_pct"], s["figure_style_3d"], "ff", s["face_front_3d"], "fv3d", s["face_visible_3d"], "fvA", s["face_visible_archive"], s["accent_pct"], s["text_on_screen_pct"])
print(total)
