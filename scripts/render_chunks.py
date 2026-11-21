"""Render a long episode in chunks (scene boundaries), resumable, then join.

    python3 scripts/render_chunks.py episodes/<ep> plan            # 구간 계획만 보기
    python3 scripts/render_chunks.py episodes/<ep> render [N ...]  # 아직 없는 구간(또는 N번)만 렌더 → renders/chunks/NN.mp4
    python3 scripts/render_chunks.py episodes/<ep> join            # 이어 붙이기 → renders/<ep>.mp4 (+ 길이 확인)

왜: 이 하네스의 3D(film 키트)는 4코어·GPU 없음에서 영상 1초에 약 45초, 도식은 약 23초가 걸린다(2026-11-21 실측).
16~20분 편은 10시간 가까이 걸리고, 클라우드 세션의 명령 하나는 2시간까지만 돈다. 구간마다 따로 렌더하고 끊겨도 이어서 한다.
구간 경계는 장면 경계(장면 시작 0.4초 전, 효과음이 걸치지 않는 곳). 목표 구간 길이 기본 90초(--max 초).
"""
import json
import pathlib
import shutil
import subprocess
import sys

HF = ["npx", "--yes", "hyperframes@0.9.59"]


def plan(ep, max_len):
    d = json.loads((ep / "data" / "script.json").read_text(encoding="utf-8"))
    total = d["total"]
    cuts = [s["start"] for s in d["scenes"][1:]]
    chunks, a = [], 0.0
    for i, c in enumerate(cuts):
        nxt = cuts[i + 1] if i + 1 < len(cuts) else total
        if c - a >= max_len or (nxt - a > max_len * 1.4 and c - a >= max_len * 0.5):
            chunks.append((a, round(c - 0.4, 3)))
            a = round(c - 0.4, 3)
    chunks.append((a, total))
    return chunks, total


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def main():
    a = sys.argv[1:]
    if len(a) < 2:
        raise SystemExit(__doc__)
    ep = pathlib.Path(a[0]).resolve()
    max_len = float(a[a.index("--max") + 1]) if "--max" in a else 90.0
    chunks, total = plan(ep, max_len)
    out = ep / "renders" / "chunks"
    out.mkdir(parents=True, exist_ok=True)
    if a[1] == "plan":
        for i, (s, e) in enumerate(chunks):
            done = (out / f"{i:02d}.mp4").exists()
            print(f"{i:02d}  {s:8.2f} → {e:8.2f}  ({e - s:6.1f}초)  {'완료' if done else ''}")
        print(f"총 {total:.1f}초, {len(chunks)}구간")
    elif a[1] == "render":
        want = [int(x) for x in a[2:] if x.isdigit()] or range(len(chunks))
        for i in want:
            s, e = chunks[i]
            dst = out / f"{i:02d}.mp4"
            if dst.exists() and abs(dur(dst) - (e - s)) < 0.2:
                print(f"{i:02d} 이미 있음")
                continue
            tmp = out / f"{i:02d}.part.mp4"
            print(f"{i:02d} 렌더 {s:.2f}~{e:.2f}", flush=True)
            r = subprocess.run(HF + ["render", "--start", str(s), "--end", str(e), "-o", str(tmp)], cwd=ep)
            if r.returncode != 0 or abs(dur(tmp) - (e - s)) > 0.2:
                sys.exit(f"{i:02d} 실패(종료 코드 {r.returncode}, 길이 {dur(tmp):.2f}/{e - s:.2f})")
            tmp.rename(dst)
    elif a[1] == "join":
        files = [out / f"{i:02d}.mp4" for i in range(len(chunks))]
        missing = [f.name for f in files if not f.exists()]
        if missing:
            sys.exit(f"아직 없는 구간: {missing}")
        lst = out / "list.txt"
        lst.write_text("".join(f"file '{f.name}'\n" for f in files), encoding="utf-8")
        final = ep / "renders" / f"{ep.name}.mp4"
        # 영상은 그대로 잇고 소리는 다시 인코딩해 이음매의 AAC 지연을 없앤다.
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(final)])
        if r.returncode != 0:
            sys.exit("이어 붙이기 실패")
        print(f"{final.relative_to(ep.parent.parent)}: {dur(final):.2f}초 (대본 {total:.2f}초)")
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
