"""Re-download the benchmark thumbnails that are not committed (other channels' works: analysis only).

    python3 scripts/fetch_benchmark.py      # → data/benchmark/unlock_kr/raw/thumbs/, data/benchmark/thumbs-study/raw/img/

Reads the committed summaries (video ids) and fetches the public thumbnails from i.ytimg.com.
YouTube can replace a thumbnail at any time, so a few may differ from the ones analysed on 2026-11-19;
the analysis itself (docs/thumbnail-benchmark.md, data/benchmark/thumbs-study/texts.md) is committed.
"""
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent.parent
B = HERE / "data" / "benchmark"


def fetch(vid, dst):
    if dst.exists() and dst.stat().st_size > 0:
        return True
    dst.parent.mkdir(parents=True, exist_ok=True)
    for name in ("maxresdefault", "hqdefault"):
        r = subprocess.run(["curl", "-sSfL", "-o", str(dst), f"https://i.ytimg.com/vi/{vid}/{name}.jpg"], capture_output=True)
        if r.returncode == 0:
            return True
    return False


def main():
    ok = miss = 0
    study = json.loads((B / "thumbs-study" / "summary.json").read_text(encoding="utf-8"))
    for v in study["videos"]:
        if fetch(v["id"], B / "thumbs-study" / "raw" / "img" / f"{v['id']}.jpg"):
            ok += 1
        else:
            miss += 1
    unlock = json.loads((B / "unlock_kr" / "summary.json").read_text(encoding="utf-8"))
    for v in unlock.get("videos", []):
        if fetch(v["id"], B / "unlock_kr" / "raw" / "thumbs" / f"{v['id']}.jpg"):
            ok += 1
        else:
            miss += 1
    print(f"벤치마크 썸네일 {ok}개 준비{f', {miss}개 못 받음' if miss else ''}")


if __name__ == "__main__":
    main()
