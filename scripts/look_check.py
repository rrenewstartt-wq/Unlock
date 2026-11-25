"""Measure frames against the reference look (docs/reference-look.md) — numbers, not taste.

    python3 scripts/look_check.py <png|jpg|mp4> [...]            # each image, or 1 frame/s of each video
    python3 scripts/look_check.py --ref                          # the reference frames (data/benchmark/unlock_kr/raw/screen-rec/)
    python3 scripts/look_check.py shot.png --kind 3d|photo        # ranges for a 3D reconstruction (default) or a real photo

Per frame: mean luma, 1/50/99th percentile luma, mean chroma (max-min of RGB), blue-red tint, corner/centre luma
(vignette). A frame passes when every number is inside the measured reference range for its kind. The ranges come
from 19 frames of three phone screen recordings of the reference (2026-11-25); a screen recording adds phone
gamma and compression, so treat them as ±10 % bands, and re-measure when better reference frames arrive.
"""
import glob
import pathlib
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent.parent
REF = HERE / "data" / "benchmark" / "unlock_kr" / "raw" / "screen-rec"

# Measured on the reference frames (see docs/reference-look.md §1). (low, high) per number.
RANGES = {
    "3d": {
        "luma": (0.10, 0.24),      # low key: the reference never averages brighter than a quarter
        "p99": (0.38, 0.62),       # highlights compressed — nothing near white except captions
        "p1": (0.0, 0.05),         # true blacks
        "chroma": (0.025, 0.08),   # almost monochrome; colour only on the one hero material (wood, brass, red line)
        "tint": (-0.06, 0.07),     # blue minus red: cool; only a close-up of the one warm hero material (brass, wood) goes warm
        "vignette": (0.2, 1.3),    # corners darker than the centre; an aerial with a bright edge reaches 1.27
    },
    "photo": {
        "luma": (0.30, 0.50),
        "p99": (0.75, 0.90),
        "p1": (0.0, 0.18),
        "chroma": (0.04, 0.08),
        "tint": (0.0, 0.05),
        "vignette": (0.6, 1.0),
    },
}


def measure(img):
    a = np.asarray(img.convert("RGB").resize((960, 540))).astype(float) / 255
    h, w, _ = a.shape
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    centre = L[h // 3:2 * h // 3, w // 3:2 * w // 3].mean()
    corners = np.mean([L[:h // 6, :w // 6].mean(), L[:h // 6, -w // 6:].mean(), L[-h // 6:, :w // 6].mean(), L[-h // 6:, -w // 6:].mean()])
    p1, p50, p99 = np.percentile(L, [1, 50, 99])
    return {"luma": L.mean(), "p1": p1, "p50": p50, "p99": p99, "chroma": (a.max(-1) - a.min(-1)).mean(),
            "tint": (a[..., 2] - a[..., 0]).mean(), "vignette": corners / max(centre, 1e-6)}


def frames(path):
    p = pathlib.Path(path)
    if p.suffix.lower() in (".mp4", ".mov", ".webm"):
        d = pathlib.Path(tempfile.mkdtemp())
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", "fps=1", str(d / "f%04d.png")], check=True)
        return [(f"{p.name}@{i}s", Image.open(f)) for i, f in enumerate(sorted(d.glob("*.png")))]
    return [(p.name, Image.open(p))]


def main():
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    kind = a[a.index("--kind") + 1] if "--kind" in a else "3d"
    files = sorted(glob.glob(str(REF / "*.png"))) if "--ref" in a else [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or a[i - 1] != "--kind")]
    R = RANGES[kind]
    print(f"| 프레임 | 밝기 | p1/p50/p99 | 채도 | 푸른 기 | 비네트 | 판정({kind}) |\n|---|---|---|---|---|---|---|")
    bad = 0
    for f in files:
        for name, img in frames(f):
            m = measure(img)
            miss = [k for k, (lo, hi) in R.items() if not lo <= m[k] <= hi]
            bad += bool(miss)
            print(f"| {name} | {m['luma']:.3f} | {m['p1']:.2f}/{m['p50']:.2f}/{m['p99']:.2f} | {m['chroma']:.3f} | {m['tint']:+.3f} | "
                  f"{m['vignette']:.2f} | {'✅' if not miss else '❌ ' + ', '.join(miss)} |")
    print("\n범위: " + ", ".join(f"{k} {lo}~{hi}" for k, (lo, hi) in R.items()))
    if bad and "--ref" not in a:
        sys.exit(1)


if __name__ == "__main__":
    main()
