"""Collect a reference channel's public data with yt-dlp and summarise its format.

    python3 scripts/benchmark.py @unlock_kr [--limit 30]

Writes data/benchmark/<handle>/summary.json (committed: numbers and patterns only) and
data/benchmark/<handle>/raw/ (not committed: metadata, transcripts, thumbnails and storyboard sheets,
which belong to the channel and are for viewing only). No video files are downloaded.
"""
import argparse
import json
import pathlib
import re
import shutil
import statistics
import subprocess
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent.parent
TITLE_PATTERNS = {
    "N년만에 풀린/밝혀진": r"\d+\s*년\s*만에",
    "역사상 가장 ~한": r"역사상\s*가장",
    "실제로 존재했던": r"실제로\s*존재했던",
    "국가명 포함": r"(일본|미국|한국|중국|영국|호주|독일|프랑스|러시아|세르비아|이탈리아)",
    "미제/미스터리 단어": r"(미제|미스터리|미스테리|미해결)",
}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def clean_vtt(path):
    out, prev = [], None
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:")) or line.isdigit():
            continue
        line = re.sub(r"<[^>]+>", "", line).replace("&gt;", ">").replace("&amp;", "&")
        if line != prev:
            out.append(line)
            prev = line
    return " ".join(out)


def transcript_stats(text, minutes):
    sent = [s for s in re.split(r"(?<=[.?!])\s+|(?<=다)\s+|(?<=죠)\s+", text) if s.strip()]
    ends = {"~습니다/~ㅂ니다": len(re.findall(r"(습니다|ㅂ니다|입니다)[.\s]", text)), "~죠": len(re.findall(r"죠[.\s]", text)),
            "질문형(~까?)": len(re.findall(r"까\?|을까|일까", text))}
    return {
        "chars": len(text),
        "chars_per_min": round(len(text) / minutes) if minutes else None,
        "sentences": len(sent),
        "endings": ends,
        "opens_with_date": bool(re.match(r"^\s*\d{4}년", text)),
        "has_rewind_line": bool(re.search(r"(되돌려|거슬러)\s*(보겠습니다|올라가)", text)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("handle")
    ap.add_argument("--limit", type=int, default=30)
    ap.add_argument("--offline", action="store_true", help="수집 없이 raw/ 에 있는 자료만 다시 요약")
    a = ap.parse_args()
    handle = a.handle.lstrip("@")
    base = HERE / "data" / "benchmark" / handle
    raw = base / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    url = f"https://www.youtube.com/@{handle}/videos"
    r = None if a.offline else run(["yt-dlp", "--skip-download", "--write-info-json", "--write-thumbnail", "--convert-thumbnails", "jpg",
             "--write-auto-subs", "--write-subs", "--sub-langs", "ko.*", "--sub-format", "vtt",
             "--playlist-end", str(a.limit), "-o", str(raw / "%(id)s.%(ext)s"), url])
    if r is not None and r.returncode != 0 and "Sign in to confirm" in (r.stderr or ""):
        print("경고: YouTube 가 봇 확인을 요구해 일부만 수집됐습니다. 우회하지 말고 나중에 다시 시도하세요. raw/ 에 있는 자료로 요약합니다.")
    channel, videos = {}, []
    for f in sorted(raw.glob("*.info.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        if d.get("_type") == "playlist":
            channel = {"name": d.get("channel"), "followers": d.get("channel_follower_count"), "id": d.get("channel_id")}
            continue
        vid = d["id"]
        subs = sorted(raw.glob(f"{vid}.ko*.vtt"))
        text = clean_vtt(subs[0]) if subs else ""
        if text:
            (raw / f"{vid}.txt").write_text(text, encoding="utf-8")
        # Storyboard: fetch the largest sheet set's first 4 images (scene grammar, not the video).
        sb = [x for x in d.get("formats", []) if str(x.get("format_id", "")).startswith("sb")]
        if sb and not a.offline and not list(raw.glob(f"{vid}.sb*.webp")):
            best = max(sb, key=lambda x: x.get("width") or 0)
            for i, frag in enumerate(best.get("fragments", [])[:4]):
                try:
                    urllib.request.urlretrieve(frag["url"], raw / f"{vid}.sb{i}.webp")
                except Exception:
                    pass
        minutes = (d.get("duration") or 0) / 60
        videos.append({
            "id": vid, "title": d.get("title"), "upload_date": d.get("upload_date"), "duration_s": d.get("duration"),
            "views": d.get("view_count"), "likes": d.get("like_count"), "comments": d.get("comment_count"),
            "tags": d.get("tags") or [], "width": d.get("width"), "height": d.get("height"),
            "title_patterns": [k for k, p in TITLE_PATTERNS.items() if re.search(p, d.get("title") or "")],
            "transcript": transcript_stats(text, minutes) if text else None,
        })
    videos.sort(key=lambda v: v["upload_date"] or "")
    views = [v["views"] for v in videos if v["views"]]
    summary = {
        "handle": "@" + handle, "channel": channel, "count": len(videos),
        "views": {"median": statistics.median(views) if views else None, "max": max(views) if views else None},
        "duration_s": {"median": statistics.median([v["duration_s"] for v in videos if v["duration_s"]]) if videos else None},
        "title_pattern_counts": {k: sum(k in v["title_patterns"] for v in videos) for k in TITLE_PATTERNS},
        "videos": videos,
    }
    (base / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    # Contact sheets for a person or Claude to look at (raw, not committed).
    thumbs = sorted(t for t in raw.glob("*.jpg") if not t.name.startswith(("UC", "thumbs-sheet")))
    if thumbs and shutil.which("ffmpeg"):
        n = min(len(thumbs), 8)
        ins = sum([["-i", str(t)] for t in thumbs[:n]], [])
        cols = 4 if n >= 4 else n
        rows = (n + cols - 1) // cols
        fil = "".join(f"[{i}]scale=480:270[s{i}];" for i in range(n))
        fil += "".join(f"[s{i}]" for i in range(n)) + f"xstack=inputs={n}:layout=" + "|".join(
            f"{(i % cols) * 480}_{(i // cols) * 270}" for i in range(n)) if n > 1 else "[0]scale=480:270"
        run(["ffmpeg", "-loglevel", "error", "-y", *ins, "-filter_complex", fil, str(raw / "thumbs-sheet.jpg")])
    print(f"{len(videos)} videos → {base / 'summary.json'}")
    for v in videos:
        t = v["transcript"] or {}
        print(f'- {v["upload_date"]} {v["views"]:>9,} {v["duration_s"]:>5}s {t.get("chars_per_min", "-")}자/분  {v["title"]}')


if __name__ == "__main__":
    main()
