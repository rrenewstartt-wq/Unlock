"""Archival-photo thumbnail base (docs/thumbnail-benchmark.md rule 2): one real photo, large, on a dark field.

    python3 scripts/thumb_photo.py <photo.jpg> <out.jpg> [--crop x0,y0,x1,y1] [--side right|left|center]
        [--height 1.0] [--tone amber|bw] [--grain 12] [--fade 0.35]

--crop   part of the photo to use, 0..1 of the source (default: all)
--side   where the photo sits; the other side is left dark for the text board
--height photo height as a share of the frame (1.0 = full height; >1 crops further in)
--tone   amber = archival duotone (black → amber → cream), bw = neutral black and white with lifted contrast
--fade   how far the photo's inner edge fades into the dark field (share of the photo width)
Only public-domain / official released photos; record the source in thumbnail/src/SOURCES.md.
"""
import argparse
import pathlib

import numpy as np
from PIL import Image, ImageFilter, ImageOps

W, H = 1280, 720


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--crop", default="0,0,1,1")
    ap.add_argument("--side", choices=["right", "left", "center"], default="right")
    ap.add_argument("--height", type=float, default=1.0)
    ap.add_argument("--tone", choices=["amber", "bw"], default="amber")
    ap.add_argument("--grain", type=float, default=12)
    ap.add_argument("--fade", type=float, default=0.35)
    a = ap.parse_args()

    ph = Image.open(a.src).convert("L")
    x0, y0, x1, y1 = (float(v) for v in a.crop.split(","))
    ph = ph.crop((int(x0 * ph.width), int(y0 * ph.height), int(x1 * ph.width), int(y1 * ph.height)))
    ph = ImageOps.autocontrast(ph, cutoff=1)
    ph_h = int(H * a.height)
    ph_w = int(ph.width * ph_h / ph.height)
    ph = ph.resize((ph_w, ph_h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    L = np.zeros((H, W), np.float32) + 6
    if a.side == "right":
        ox = W - ph_w
    elif a.side == "left":
        ox = 0
    else:
        ox = (W - ph_w) // 2
    oy = (H - ph_h) // 2
    P = np.asarray(ph).astype(np.float32)
    # fade the inner edge (toward the text) and slightly the top/bottom into the dark field
    xs = np.arange(ph_w)[None, :] / max(ph_w - 1, 1)
    fw = max(a.fade, 1e-3)
    if a.side == "right":
        ax = np.clip(xs / fw, 0, 1)
    elif a.side == "left":
        ax = np.clip((1 - xs) / fw, 0, 1)
    else:
        ax = np.clip(np.minimum(xs, 1 - xs) / (fw / 2), 0, 1)
    ys = np.arange(ph_h)[:, None] / max(ph_h - 1, 1)
    ay = np.clip(np.minimum(ys, 1 - ys) / 0.08, 0, 1)
    alpha = (ax ** 1.5) * ay
    # paste with clipping to the frame
    sx0, sy0 = max(0, -ox), max(0, -oy)
    dx0, dy0 = max(0, ox), max(0, oy)
    w = min(ph_w - sx0, W - dx0); h = min(ph_h - sy0, H - dy0)
    reg = L[dy0:dy0 + h, dx0:dx0 + w]
    L[dy0:dy0 + h, dx0:dx0 + w] = reg * (1 - alpha[sy0:sy0 + h, sx0:sx0 + w]) + P[sy0:sy0 + h, sx0:sx0 + w] * alpha[sy0:sy0 + h, sx0:sx0 + w]

    l = np.clip(L / 255, 0, 1) ** 1.1
    if a.tone == "amber":
        d, m, hi = np.array([8, 4, 1]), np.array([190, 112, 36]), np.array([255, 232, 190])
        l3 = l[..., None]
        rgb = np.where(l3 < 0.55, d + (m - d) * (l3 / 0.55), m + (hi - m) * ((l3 - 0.55) / 0.45))
    else:
        rgb = np.repeat((np.clip((l - 0.04) / 0.9, 0, 1) ** 1.05 * 245)[..., None], 3, axis=2)
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.45 * np.clip(((xx - W / 2) / (W * 0.7)) ** 2 + ((yy - H / 2) / (H * 0.7)) ** 2, 0, 1)
    rgb = rgb * vig[..., None]
    rng = np.random.default_rng(7)
    rgb = rgb + rng.normal(0, a.grain, (H, W, 1))
    out = pathlib.Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(out, quality=93)
    print(f"✓ {out}")


if __name__ == "__main__":
    main()
