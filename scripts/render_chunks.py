"""Render a long episode in chunks (scene boundaries), resumable, then join.

    python3 scripts/render_chunks.py episodes/<ep> plan            # 구간 계획만 보기
    python3 scripts/render_chunks.py episodes/<ep> render [N ...]  # 아직 없는 구간(또는 N번)만 렌더 → renders/chunks/NN.mp4
    python3 scripts/render_chunks.py episodes/<ep> join            # 이어 붙이기 → renders/<ep>.mp4 (+ 길이 확인)
    python3 scripts/render_chunks.py episodes/<ep> range <dir> <이름> <시작> <끝> [...]   # 임의 구간(파일럿·시험 컷) → renders/<dir>/<이름>.mp4

왜: 이 하네스의 3D(film 키트)는 4코어·GPU 없음에서 영상 1초에 약 45초, 도식은 약 23초가 걸린다(2026-11-21 실측).
16~20분 편은 10시간 가까이 걸리고, 클라우드 세션의 명령 하나는 2시간까지만 돈다. 구간마다 따로 렌더하고 끊겨도 이어서 한다.
구간 경계는 장면 경계(장면 시작 0.4초 전, 효과음이 걸치지 않는 곳). 목표 구간 길이 기본 90초(--max 초).
메모리: 전체 index.html 은 3D 세트를 모두 한 페이지에 지어서 14GB 컨테이너에서 브라우저가 메모리 부족으로 죽는다
(2026-11-24 ep02, check 도 같은 이유로 "Page crashed"). 그래서 렌더하는 동안만 index.html 을 그 구간에 걸치는
장면(앞뒤 1초 여유)만 남긴 판으로 바꾸고, 끝나면(실패·중단해도) 원래 파일로 되돌린다. 되돌리지 못했으면 build.py 를 다시 돌린다.
"""
import contextlib
import re
import json
import os
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


@contextlib.contextmanager
def windowed(ep, s, e, pad=1.0):
    """index.html 을 [s-pad, e+pad] 와 겹치는 장면·효과음만 남긴 판으로 잠시 바꾼다(시각은 그대로)."""
    idx = ep / "index.html"
    orig = idx.read_text(encoding="utf-8")
    bak = ep / "index.full.html.bak"
    bak.write_text(orig, encoding="utf-8")

    def keep(line):
        m = re.search(r'data-start="([\d.]+)" data-duration="([\d.]+)"', line)
        if not m or 'data-composition-id="main"' in line:
            return True
        a, d = float(m.group(1)), float(m.group(2))
        return a < e + pad and a + d > s - pad

    lines = orig.splitlines(keepends=True)
    kept = [ln for ln in lines if keep(ln)]
    idx.write_text("".join(kept), encoding="utf-8")
    print(f"  index.html: {len(lines) - len(kept)}줄 빼고 렌더(구간 {s:.2f}~{e:.2f})", flush=True)
    try:
        yield
    finally:
        idx.write_text(orig, encoding="utf-8")
        bak.unlink(missing_ok=True)


def render_one(ep, s, e, dst):
    tmp = dst.with_suffix(".part.mp4")
    # CPU-only WebGL: many 3D sets take minutes (not the 45 s default) to finish buildReady (2026-11-22, ep02)
    env = {**os.environ, "PRODUCER_PLAYER_READY_TIMEOUT_MS": os.environ.get("PRODUCER_PLAYER_READY_TIMEOUT_MS", "900000"),
           "PRODUCER_RENDER_READY_TIMEOUT_MS": os.environ.get("PRODUCER_RENDER_READY_TIMEOUT_MS", "900000")}
    with windowed(ep, s, e):
        r = subprocess.run(HF + ["render", "--start", str(s), "--end", str(e), "-o", str(tmp)], cwd=ep, env=env)
    if r.returncode != 0 or abs(dur(tmp) - (e - s)) > 0.2:
        return f"실패(종료 코드 {r.returncode}, 길이 {dur(tmp):.2f}/{e - s:.2f})"
    tmp.rename(dst)
    return None


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
        skip = {a.index("--max") + 1} if "--max" in a else set()
        want = [int(x) for i, x in enumerate(a[2:], 2) if x.isdigit() and i not in skip] or range(len(chunks))
        for i in want:
            s, e = chunks[i]
            dst = out / f"{i:02d}.mp4"
            if dst.exists() and abs(dur(dst) - (e - s)) < 0.2:
                print(f"{i:02d} 이미 있음")
                continue
            print(f"{i:02d} 렌더 {s:.2f}~{e:.2f}", flush=True)
            err = render_one(ep, s, e, dst)
            if err:
                sys.exit(f"{i:02d} {err}")
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
    elif a[1] == "range" and len(a) >= 6 and (len(a) - 3) % 3 == 0:
        d = ep / "renders" / a[2]
        d.mkdir(parents=True, exist_ok=True)
        for k in range(3, len(a), 3):
            name, s, e = a[k], float(a[k + 1]), float(a[k + 2])
            dst = d / f"{name}.mp4"
            if dst.exists() and abs(dur(dst) - (e - s)) < 0.2:
                print(f"{name} 이미 있음")
                continue
            print(f"{name} 렌더 {s:.2f}~{e:.2f}", flush=True)
            err = render_one(ep, s, e, dst)
            print(f"{name} {err or '완료'}", flush=True)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
