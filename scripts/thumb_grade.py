"""Grade a thumbkit still (beauty + focus mask) into the channel's thumbnail look. 1280x720 JPG.

    python3 scripts/thumb_grade.py <beauty.png> <mask.png|-> <out.jpg> --mode spot|flood [options]

Modes (docs/thumbnail-formula.md):
  spot   the frame goes near-black neutral grey; ONLY the focus keeps a colour: amber.    (어둠 속 앰버 하나)
  flood  the whole frame is flooded amber; the focus is the odd one out: cold steel/ice.  (앰버 바다 속 다른 색 하나)
  tone   amber is the light: the whole frame black → amber → cream by brightness. Light the focus, leave the rest dark. (어둠 속 앰버 빛)
Options:
  --focus amber|cold|pale|natural   override the focus treatment
  --lift 0..1      brighten the field (flood fields are mid-bright, spot fields dark)
  --grain 0..30    film grain strength (default 13)    --vignette 0..1 (default .5)
  --glow 0..1      amber light spilling from the focus into the dark (spot mode)
  --text "큰 글자" --sub "작은 글자"   optional text board (A/B only; the default thumbnail has no text)
  --text-at X,Y    top-left of the text block in 0..1 of the frame (default 0.05,0.07). Keep it off the focus.
"""
import argparse
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
FONT = HERE / "assets" / "fonts" / "BlackHanSans-Regular.ttf"
W, H = 1280, 720

# luminance → colour ramps (dark, mid, light) in sRGB
RAMPS = {
    "amber":   ([12, 6, 2],   [236, 150, 46],  [255, 236, 196]),
    "field":   ([22, 10, 3],  [196, 112, 30],  [255, 214, 150]),   # amber flood for the whole frame
    "cold":    ([4, 10, 18],  [70, 120, 160],  [214, 236, 248]),
    "pale":    ([14, 14, 14], [150, 150, 146], [246, 244, 238]),
    "grey":    ([4, 5, 6],    [72, 76, 80],    [200, 202, 204]),    # spot-mode background
}


def ramp(l, name, mid_at=0.55):
    d, m, h = (np.array(c, np.float32) for c in RAMPS[name])
    l = l[..., None]
    return np.where(l < mid_at, d + (m - d) * (l / mid_at), m + (h - m) * ((l - mid_at) / (1 - mid_at)))


def lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def levels(l, black, white, gamma):
    return np.clip((l - black) / max(white - black, 1e-3), 0, 1) ** gamma


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("beauty"); ap.add_argument("mask"); ap.add_argument("out")
    ap.add_argument("--mode", choices=["spot", "flood", "tone"], default="spot")
    ap.add_argument("--focus", choices=["amber", "cold", "pale", "natural"], default=None)
    ap.add_argument("--lift", type=float, default=None)
    ap.add_argument("--grain", type=float, default=13)
    ap.add_argument("--vignette", type=float, default=0.5)
    ap.add_argument("--glow", type=float, default=0.25)
    ap.add_argument("--depth", type=float, default=0.6, help="0..1 how deep (saturated) the focus colour sits; 0 = pale")
    ap.add_argument("--text", default=""); ap.add_argument("--sub", default="")
    ap.add_argument("--text-at", default="0.05,0.07")
    a = ap.parse_args()

    img = Image.open(a.beauty).convert("RGB").resize((W, H), Image.LANCZOS)
    rgb_in = np.asarray(img).astype(np.float32) / 255
    L = lum(rgb_in)
    if a.mask != "-" and pathlib.Path(a.mask).exists():
        mk = Image.open(a.mask).convert("L").resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5))
        M = np.asarray(mk).astype(np.float32)[..., None] / 255
    else:
        M = np.zeros((H, W, 1), np.float32)

    focus = a.focus or ("amber" if a.mode == "spot" else "cold")
    if a.mode == "spot":
        lift = 0.0 if a.lift is None else a.lift
        bg = ramp(levels(L, 0.03, 0.75 - 0.3 * lift, 1.25), "grey")
    else:
        lift = 0.35 if a.lift is None else a.lift
        bg = ramp(levels(L, 0.02, 0.95 - 0.35 * lift, 1.0), "field")
    if a.mode == "tone":   # amber is the light itself: black → amber → cream by luminance, whole frame (mask unused)
        bg = ramp(levels(L, 0.015, 0.85 - 0.35 * (a.lift or 0), 1.1), "amber", 0.6)
        M = np.zeros_like(M)
    lf = levels(L, 0.02, 0.8 + 0.5 * a.depth, 0.85 + 0.6 * a.depth)
    fg = rgb_in * 255 if focus == "natural" else ramp(lf, focus)
    out = bg * (1 - M) + fg * M

    if a.mode == "spot" and a.glow > 0 and M.max() > 0:   # amber spill around the focus, in screen space
        halo = Image.fromarray((M[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(60))
        hv = np.asarray(halo).astype(np.float32)[..., None] / 255
        out = out + (1 - M) * hv * a.glow * np.array([240, 150, 50], np.float32)

    yy, xx = np.mgrid[0:H, 0:W]
    v = 1 - a.vignette * np.clip(((xx - W / 2) / (W * 0.72)) ** 2 + ((yy - H / 2) / (H * 0.72)) ** 2, 0, 1)
    out *= v[..., None]
    rng = np.random.default_rng(23)
    g = rng.normal(0, 1, (H, W)).astype(np.float32)
    g = np.asarray(Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)
    out += ((g - 128) / 40 * a.grain)[..., None]
    res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

    if a.text:
        d = ImageDraw.Draw(res)
        big = ImageFont.truetype(str(FONT), 168)
        small = ImageFont.truetype(str(FONT), 64)
        sh = (0, 0, 0)
        for dx, dy in ((4, 4), (0, 0)):
            col = sh if dx else (255, 240, 214)
            tx, ty = (float(v) for v in a.text_at.split(","))
            ox, oy = int(tx * W), int(ty * H)
            d.text((ox + dx, oy + dy), a.text, font=big, fill=col)
            if a.sub:
                d.text((ox + 6 + dx, oy + 190 + dy), a.sub, font=small, fill=col)
    out_p = pathlib.Path(a.out)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    res.save(out_p, quality=92)
    print(f"✓ {out_p}  ({a.mode}, focus={focus}, focus area {M.mean() * 100:.1f}%)")


if __name__ == "__main__":
    main()
