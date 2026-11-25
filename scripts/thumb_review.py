"""Review sheet + numbers for thumbnail candidates (for thumb-critic and the human).

    python3 scripts/thumb_review.py episodes/<ep>/thumbnail/out      # every thumb-*.jpg there
    → review.png (each candidate at 1280 / home 360 / search 246 / phone 168 px, light and dark UI, greyscale)
    → review.json (numbers below)

Numbers per candidate
  focus_area   % of frame that is the focus (mask) — the benchmark's symbol fills 15–60%
  focus_center where the focus sits (0..1); YouTube covers the bottom-right with the duration badge
  contrast     focus vs field mean luminance difference (0..255) — under ~40 the symbol melts at phone size
  clutter      edge density at 168 px — high = busy, reads as noise on a phone
  bench_hash   smallest perceptual-hash distance to the benchmark thumbnails (data/benchmark/*/raw/thumbs/*.jpg,
               local only). Under 6 of 64 bits = a near-copy of one existing thumbnail: redo it. Same composition style is fine.
  overlap      words shared by the text board and the title (from the concept page's `text:` / `title:` comments).
               Numbers may repeat (genre hits do); two or more shared non-number words = the same sentence twice → warning
  bench_hue    red share of the image (hue 345–15°, sat > .4) — reported only; red is allowed (2026-11-25).
"""
import json
import pathlib
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = pathlib.Path(__file__).resolve().parent.parent
FONT = HERE / "assets" / "fonts" / "GothicA1-Medium.ttf"
SIZES = [(360, 202), (246, 138), (168, 94)]


def dhash(img, n=8):
    g = np.asarray(img.convert("L").resize((n + 1, n), Image.LANCZOS)).astype(np.int16)
    return (g[:, 1:] > g[:, :-1]).flatten()


def red_share(img):
    hsv = np.asarray(img.convert("HSV").resize((320, 180))).astype(np.float32) / 255
    h, s = hsv[..., 0] * 360, hsv[..., 1]
    return float((((h > 345) | (h < 15)) & (s > 0.4)).mean())


PARTICLES = ("에서", "으로", "은", "는", "이", "가", "을", "를", "의", "에", "도", "만", "로", "와", "과")


def words(text):
    out = set()
    for w in re.findall(r"[0-9]+|[가-힣A-Za-z]+", text):
        if w.isdigit():
            out.add(w); continue
        for pt in PARTICLES:
            if w.endswith(pt) and len(w) > len(pt) + 1:
                w = w[: -len(pt)]; break
        if len(w) >= 2:
            out.add(w)
    return out


def overlap(page):
    if not page.exists():
        return None, None
    html = page.read_text(encoding="utf-8")
    t = re.search(r"<!--\s*text:(.*?)-->", html, re.S)
    ti = re.search(r"<!--\s*title:(.*?)-->", html, re.S)
    if not (t and ti):
        return None, None
    a, b = words(t.group(1)), ti.group(1).strip().strip('"')
    shared = sorted(w for w in a if w in b)
    return shared, b


def metrics(p, bench):
    img = Image.open(p).convert("RGB")
    L = np.asarray(img.convert("L").resize((640, 360))).astype(np.float32)
    mp = p.with_name(p.stem.replace("thumb-", "mask-") + ".png")
    m = {}
    if mp.exists():
        M = np.asarray(Image.open(mp).convert("L").resize((640, 360))).astype(np.float32) / 255 > 0.5
        if M.any():
            ys, xs = np.nonzero(M)
            m["focus_area"] = round(float(M.mean() * 100), 1)
            m["focus_center"] = [round(float(xs.mean() / 640), 2), round(float(ys.mean() / 360), 2)]
            m["contrast"] = round(float(abs(L[M].mean() - L[~M].mean())), 1)
    small = img.resize((168, 94), Image.LANCZOS).convert("L").filter(ImageFilter.FIND_EDGES)
    m["clutter"] = round(float((np.asarray(small) > 40).mean() * 100), 1)
    h = dhash(img)
    if bench:
        d = min(int((h != dhash(b)).sum()) for b in bench)
        m["bench_hash"] = d
    m["bench_hue"] = round(red_share(img) * 100, 1)
    shared, title = overlap(p.parent.parent / (p.stem.replace("thumb-", "") + ".html"))
    if title is not None:
        m["overlap"] = len(shared)
        m["title"] = title
    flags = []
    words_only = [w for w in (shared or []) if not w.isdigit()]
    if len(words_only) >= 2:
        flags.append(f"글자판이 제목과 같은 말: {', '.join(shared)}")
    if "focus_area" in m and not (8 <= m["focus_area"] <= 65):
        flags.append("초점 크기")
    if "contrast" in m and m["contrast"] < 40:
        flags.append("초점 대비 약함")
    if "focus_center" in m and m["focus_center"][0] > 0.8 and m["focus_center"][1] > 0.8:
        flags.append("오른쪽 아래(재생시간 표시에 가림)")
    if m["clutter"] > 22:
        flags.append("작은 화면에서 복잡")
    if m.get("bench_hash", 64) < 6:
        flags.append("벤치마크 썸네일 한 장을 베낀 수준")
    m["flags"] = flags
    return m


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    d = pathlib.Path(sys.argv[1])
    thumbs = sorted(d.glob("thumb-*.jpg"))
    if not thumbs:
        raise SystemExit(f"{d} 에 thumb-*.jpg 없음")
    bench = [Image.open(b).convert("RGB") for b in sorted(HERE.glob("data/benchmark/*/raw/thumbs/*.jpg"))]
    font = ImageFont.truetype(str(FONT), 22)
    rowh = 360 + 60
    sheet = Image.new("RGB", (640 + 40 + 360 + 20 + 246 + 20 + 168 + 20 + 168 + 40, rowh * len(thumbs) + 20), (18, 18, 18))
    dr = ImageDraw.Draw(sheet)
    report = {}
    for i, p in enumerate(thumbs):
        img = Image.open(p).convert("RGB")
        m = metrics(p, bench)
        report[p.name] = m
        y = 20 + i * rowh
        sheet.paste(img.resize((640, 360), Image.LANCZOS), (20, y))
        x = 680
        for j, (w, h) in enumerate(SIZES):
            bg = (255, 255, 255) if j == 1 else (15, 15, 15)   # one on light UI, the rest on dark
            dr.rectangle([x - 8, y - 8, x + w + 8, y + h + 8], fill=bg)
            sheet.paste(img.resize((w, h), Image.LANCZOS), (x, y))
            x += w + 20
        sheet.paste(ImageOps.grayscale(img.resize((168, 94), Image.LANCZOS)).convert("RGB"), (x, y))
        txt = f"{p.stem}  " + "  ".join(f"{k}={v}" for k, v in m.items() if k not in ("flags", "title"))
        dr.text((20, y + 366), txt, font=font, fill=(220, 220, 220))
        if m["flags"]:
            dr.text((680, y + 230), "! " + ", ".join(m["flags"]), font=font, fill=(255, 170, 80))
    sheet.save(d / "review.png")
    (d / "review.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    for k, v in report.items():
        print(k, {a: b for a, b in v.items() if a != "flags"}, ("⚠ " + ", ".join(v["flags"])) if v["flags"] else "✓")
    print(f"→ {d / 'review.png'}  (벤치마크 비교 {len(bench)}장)")


if __name__ == "__main__":
    main()
