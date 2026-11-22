"""Blind comparison sheets for parity-judge (reference-analyst's tool). Everything it writes goes to raw/ (not committed).

    # 1) Reference: cut storyboard sheets (raw/<id>.sb*.webp, from benchmark.py --all-storyboards) into 10 s frames
    python3 scripts/blind_sheet.py cells kXHIhuQLRvY
        → data/benchmark/unlock_kr/raw/frames/<id>/t00000.jpg ... (320x180) + 10 s change ratio (same method as parity_check.py)
        options: --info <info.json> --sheets <files...>  (or --rows 3 --cols 3 --interval 10 without info.json)

    # 2) Ours: frames from a render (or pilot) at the same size, 320 px wide
    python3 scripts/blind_sheet.py ours episodes/<ep>/renders/pilot.mp4 --at 12,31.5,48 --tag 3d
        → data/benchmark/unlock_kr/raw/blind/<ep>/ours/3d_12.0.jpg ...   (or --images a.png b.png for snapshots)

    # 3) Sheets: per area, 2 ours + 2 reference in random order on a 2x2 sheet, labels A~D only
    python3 scripts/blind_sheet.py sheet <ep> --area 3d --ours <ours...> --ref <ref frames...> [--n 3]
    python3 scripts/blind_sheet.py sheet <ep> --area 3d --ours-dir .../ours --ref-from-pack     # reference = pack frames of kind 3d
        → raw/blind/<ep>/sheets/<area>-<k>.jpg   (give ONLY this folder to the judge)
          raw/blind/<ep>/answers.json             (which cell is ours; open after the judgement)

Fairness: every cell is fitted to 320x180 (the storyboard size) and our cells are re-encoded once as JPEG
(--ours-q, default 55) so sharpness or compression does not give them away. Labels sit in a strip above each cell.
"""
import argparse
import datetime
import json
import math
import pathlib
import random
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
REF = HERE / "data" / "benchmark" / "unlock_kr"
RAW = REF / "raw"
CW, CH = 320, 180          # storyboard cell size (YouTube sb L3)
GAP, LABEL = 6, 26
AREAS = ("3d", "diagram", "archive", "title")


def fit(im, w=CW, h=CH):
    """Scale to cover w x h and centre-crop (both sides are 16:9, so this only trims rounding)."""
    im = im.convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def change_ratio(paths, thr=12.0):
    """parity_check.frame_change_ratio 와 같은 방식: 160x90 회색, 평균 밝기 차이 > 12/255 이면 '다른 화면'."""
    if len(paths) < 3:
        return None
    px = [Image.open(p).convert("L").resize((160, 90)).tobytes() for p in paths]
    diffs = [sum(abs(x - y) for x, y in zip(a, b)) / len(a) for a, b in zip(px, px[1:])]
    return round(sum(d > thr for d in diffs) / len(diffs), 3)


# ---------------------------------------------------------------- cells (reference storyboard → frames)
def sb_meta(info_path):
    d = json.loads(pathlib.Path(info_path).read_text(encoding="utf-8"))
    sb = [x for x in d.get("formats", []) if str(x.get("format_id", "")).startswith("sb")]
    if not sb:
        sys.exit(f"{info_path}: 스토리보드 포맷(sb*)이 없습니다")
    best = max(sb, key=lambda x: x.get("width") or 0)      # benchmark.py 와 같은 선택
    rows, cols = best.get("rows"), best.get("columns")
    frags = best.get("fragments") or []
    per = rows * cols
    interval = None
    if best.get("fps"):
        interval = 1 / best["fps"]
    elif frags and frags[0].get("duration"):
        interval = frags[0]["duration"] / per
    return {"format": best.get("format_id"), "rows": rows, "cols": cols, "w": best.get("width"), "h": best.get("height"),
            "interval": interval, "fragments": len(frags), "duration": d.get("duration")}


def cmd_cells(a):
    vid = a.video
    info = pathlib.Path(a.info) if a.info else RAW / f"{vid}.info.json"
    meta = sb_meta(info) if info.exists() else {}
    rows, cols = a.rows or meta.get("rows"), a.cols or meta.get("cols")
    interval = a.interval or meta.get("interval")
    duration = a.duration or meta.get("duration")
    if not (rows and cols and interval):
        sys.exit("행·열·간격을 알 수 없습니다: info.json 을 주거나 --rows --cols --interval 을 주세요")
    sheets = [pathlib.Path(s) for s in a.sheets] if a.sheets else list(RAW.glob(f"{vid}.sb*.webp"))
    sheets.sort(key=lambda p: int((re.search(r"\.sb(\d+)\.", p.name) or re.search(r"(\d+)", p.name) or [0, 0])[1]))
    if not sheets:
        sys.exit(f"스토리보드 시트가 없습니다: {RAW}/{vid}.sb*.webp (benchmark.py --all-storyboards 로 받기)")
    if meta.get("fragments") and len(sheets) < meta["fragments"]:
        print(f"주의: 시트 {len(sheets)}/{meta['fragments']}장 — 영상 전체를 덮지 않습니다")
    out = pathlib.Path(a.out) if a.out else RAW / "frames" / vid
    out.mkdir(parents=True, exist_ok=True)
    n_max = math.ceil(duration / interval) if duration else None
    k, written, blank = 0, [], 0
    for si, sh in enumerate(sheets):
        im = Image.open(sh).convert("RGB")
        cw, ch = im.width // cols, im.height // rows
        cells = []
        for r in range(rows):
            for c in range(cols):
                cells.append(im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
        if si == len(sheets) - 1 and n_max is None:
            # 길이를 모르면 마지막 시트 끝의 빈 칸(완전한 검정)만 버린다. 영상 중간의 검은 화면은 프레임으로 남긴다.
            while cells and cells[-1].convert("L").getextrema()[1] < 4:
                cells.pop()
                blank += 1
        for cell in cells:
            if n_max is not None and k >= n_max:
                break
            p = out / f"t{round(k * interval):05d}.jpg"
            fit(cell).save(p, quality=92)
            written.append(p)
            k += 1
    # 칸 간격이 10초보다 짧으면(짧은 영상은 약 5초) 10초에 가장 가까운 간격으로 솎아서 잰다 — parity_check 의 10초 표본과 맞춘다.
    step = max(1, round(10 / interval))
    ratio_cell = change_ratio(written)
    ratio = change_ratio(written[::step])
    print(f"{vid}: 시트 {len(sheets)}장({rows}x{cols}, 간격 {interval:g}초) → 프레임 {len(written)}장 → {out}")
    if step > 1:
        print(f"  칸 간격({interval:.1f}초) 화면 변화율: {'측정 불가' if ratio_cell is None else f'{ratio_cell * 100:.0f}%'}, "
              f"{step}칸마다({step * interval:.1f}초) 솎은 프레임 {len(written[::step])}장으로 10초 값을 잰다")
    print(f"10초 화면 변화율(밝기 차 > 12/255): {'측정 불가' if ratio is None else f'{ratio * 100:.0f}%'}")
    (out / "cells.json").write_text(json.dumps({"video": vid, "rows": rows, "cols": cols, "interval_s": interval,
                                                "sheets": len(sheets), "frames": len(written), "step_10s": step,
                                                "frames_10s": [p.name for p in written[::step]],
                                                "change_ratio_cell": ratio_cell, "change_ratio_10s": ratio,
                                                "format": meta.get("format")}, ensure_ascii=False, indent=1), encoding="utf-8")


# ---------------------------------------------------------------- ours (render → 320px frames)
def cmd_ours(a):
    out = pathlib.Path(a.out) if a.out else RAW / "blind" / a.ep_name() / "ours"
    out.mkdir(parents=True, exist_ok=True)
    tag = f"{a.tag}_" if a.tag else ""
    done = []
    if a.images:
        for i, src in enumerate(a.images):
            p = out / f"{tag}img{i:02d}.jpg"
            fit(Image.open(src)).save(p, quality=95)
            done.append(p)
    else:
        for t in [float(x) for x in a.at.split(",") if x.strip()]:
            p = out / f"{tag}{t:.1f}.jpg"
            r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(a.video), "-frames:v", "1",
                                "-vf", f"scale={CW}:-2", "-q:v", "2", str(p)], capture_output=True, text=True)
            if r.returncode != 0 or not p.exists():
                print(f"  {t}s: 추출 실패 {r.stderr.strip()[:200]}")
                continue
            fit(Image.open(p)).save(p, quality=95)
            done.append(p)
    for p in done:
        print(p)


# ---------------------------------------------------------------- sheet (2 ours + 2 ref, random 2x2)
def font(size):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        if pathlib.Path(f).exists():
            return ImageFont.truetype(f, size)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def degrade(im, q):
    import io
    b = io.BytesIO()
    im.save(b, "JPEG", quality=q)
    b.seek(0)
    return Image.open(b).convert("RGB")


def ref_from_pack(area):
    pack = json.loads((REF / "reference-pack.json").read_text(encoding="utf-8"))
    out = []
    for v in pack.get("videos", []):
        for f in v.get("frames", []):
            if f.get("kind") == area:
                p = RAW / "frames" / v["video"] / f"t{int(f['t']):05d}.jpg"
                if p.exists():
                    out.append(p)
    return out


def draw_sheet(cells, labels):
    W = CW * 2 + GAP * 3
    H = (CH + LABEL) * 2 + GAP * 3
    sheet = Image.new("RGB", (W, H), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    f = font(18)
    for i, (im, lab) in enumerate(zip(cells, labels)):
        x = GAP + (i % 2) * (CW + GAP)
        y = GAP + (i // 2) * (CH + LABEL + GAP)
        d.text((x + 4, y + 3), lab, fill=(235, 235, 235), font=f)
        sheet.paste(im, (x, y + LABEL))
    return sheet


def cmd_sheet(a):
    ep = a.ep
    area = a.area
    ours = [pathlib.Path(p) for p in (a.ours or [])]
    if a.ours_dir:
        ours += sorted(p for p in pathlib.Path(a.ours_dir).glob("*.jpg") if not a.tag or p.name.startswith(f"{a.tag}_"))
    refs = [pathlib.Path(p) for p in (a.ref or [])]
    if a.ref_from_pack:
        refs += ref_from_pack(area)
    if len(ours) < 2 or len(refs) < 2:
        sys.exit(f"시트 한 장에 우리 2장 + 레퍼런스 2장이 필요합니다 (우리 {len(ours)}, 레퍼런스 {len(refs)})")
    if a.n < 3:
        print("주의: 영역마다 시트 3장 이상이 기준입니다(docs/quality-bar.md 0절)")
    rng = random.Random(a.seed) if a.seed is not None else random.SystemRandom()
    need = 2 * a.n
    for name, pool in (("우리", ours), ("레퍼런스", refs)):
        if len(pool) < need:
            print(f"주의: {name} 프레임 {len(pool)}장 < {need}장 — 시트끼리 같은 프레임이 다시 나옵니다")
    o_pick = rng.sample(ours, len(ours)) * math.ceil(need / len(ours))
    r_pick = rng.sample(refs, len(refs)) * math.ceil(need / len(refs))
    base = RAW / "blind" / ep
    sdir = base / "sheets"
    sdir.mkdir(parents=True, exist_ok=True)
    ans_path = base / "answers.json"
    answers = json.loads(ans_path.read_text(encoding="utf-8")) if ans_path.exists() else {"ep": ep, "sheets": {}}
    labels = ["A", "B", "C", "D"]
    made = []
    for k in range(a.n):
        items = [("ours", o_pick[2 * k]), ("ours", o_pick[2 * k + 1]), ("ref", r_pick[2 * k]), ("ref", r_pick[2 * k + 1])]
        rng.shuffle(items)
        cells = []
        for side, p in items:
            im = fit(Image.open(p))
            if side == "ours" and a.ours_q:
                im = degrade(im, a.ours_q)
            cells.append(im)
        key = f"{area}-{k + 1}"
        path = sdir / f"{key}.jpg"
        draw_sheet(cells, labels).save(path, quality=90)          # Pillow 는 EXIF·파일명을 시트에 넣지 않는다
        answers["sheets"][key] = {
            "area": area, "sheet": str(path.relative_to(HERE)),
            "ours": [lab for lab, (side, _) in zip(labels, items) if side == "ours"],
            "cells": {lab: {"side": side, "src": str(p.resolve().relative_to(HERE)) if p.resolve().is_relative_to(HERE) else str(p)}
                      for lab, (side, p) in zip(labels, items)},
            "ours_jpeg_q": a.ours_q, "created": datetime.datetime.now().isoformat(timespec="seconds"),
        }
        made.append(path)
    ans_path.write_text(json.dumps(answers, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"시트 {len(made)}장 → {sdir}  (판정자에게는 이 폴더만)")
    for p in made:
        print(" ", p)
    print(f"정답표 → {ans_path}  (판정이 끝난 뒤 공개)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cells", help="레퍼런스 스토리보드 시트 → 10초 프레임")
    c.add_argument("video")
    c.add_argument("--info")
    c.add_argument("--sheets", nargs="*")
    c.add_argument("--rows", type=int)
    c.add_argument("--cols", type=int)
    c.add_argument("--interval", type=float, help="칸 하나의 간격(초)")
    c.add_argument("--duration", type=float, help="영상 길이(초), 마지막 시트의 남는 칸을 버린다")
    c.add_argument("--out")
    o = sub.add_parser("ours", help="우리 렌더 → 320px 프레임")
    o.add_argument("video", nargs="?", help="mp4 (episodes/<ep>/renders/...)")
    o.add_argument("--at", default="", help="초 목록, 쉼표로")
    o.add_argument("--images", nargs="*", help="mp4 대신 이미지(스냅샷)")
    o.add_argument("--ep", help="에피소드 이름(기본: 경로의 episodes/<ep>)")
    o.add_argument("--tag", help="영역 이름을 파일명 앞에(3d/diagram/archive)")
    o.add_argument("--out")
    s = sub.add_parser("sheet", help="무작위 2x2 블라인드 시트 + 정답표")
    s.add_argument("ep")
    s.add_argument("--area", required=True, choices=AREAS)
    s.add_argument("--ours", nargs="*")
    s.add_argument("--ours-dir")
    s.add_argument("--tag", help="--ours-dir 에서 이 접두사 파일만")
    s.add_argument("--ref", nargs="*")
    s.add_argument("--ref-from-pack", action="store_true", help="reference-pack.json 에서 kind == area 인 프레임")
    s.add_argument("--n", type=int, default=3, help="시트 수(기본 3)")
    s.add_argument("--seed", type=int, help="재현용(기본: 무작위)")
    s.add_argument("--ours-q", type=int, default=55, help="우리 칸을 한 번 JPEG 로 다시 저장할 품질(0 이면 안 함)")
    a = ap.parse_args()
    if a.cmd == "ours":
        if not a.images and not (a.video and a.at):
            sys.exit("ours: mp4 + --at, 또는 --images 가 필요합니다")

        def ep_name():
            if a.ep:
                return a.ep
            src = pathlib.Path(a.video or a.images[0]).resolve()
            parts = src.parts
            return parts[parts.index("episodes") + 1] if "episodes" in parts else "misc"
        a.ep_name = ep_name
    {"cells": cmd_cells, "ours": cmd_ours, "sheet": cmd_sheet}[a.cmd](a)


if __name__ == "__main__":
    main()
