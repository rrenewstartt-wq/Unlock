"""Genre text board for a thumbnail (docs/thumbnail-benchmark.md): two big lines at the bottom-left,
white hook line + amber key line, thick black outline, a dark band behind; optional circle/arrow on the anomaly.

    python3 scripts/thumb_text.py <in.jpg|png> <out.jpg> --hook "넥타이엔 이름이 있었다" --key "73년간 아무도 몰랐다"
        [--circle X,Y,R] [--arrow X1,Y1,X2,Y2] [--tag "#실화"] [--right]

Coordinates are 0..1 of the frame. Lines shrink to fit 92% of the width.
"""
import argparse
import math
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
FONT = HERE / "assets" / "fonts" / "BlackHanSans-Regular.ttf"
W, H = 1280, 720
WHITE = (255, 248, 236)
AMBER = (255, 184, 48)      # brighter than the video's #F0A23B so it survives YouTube's small sizes
MARK = (255, 196, 40)


def fit(draw, text, size, maxw):
    while size > 30:
        f = ImageFont.truetype(str(FONT), size)
        if draw.textlength(text, font=f) <= maxw:
            return f
        size -= 4
    return ImageFont.truetype(str(FONT), size)


def outlined(draw, xy, text, font, fill, stroke):
    x, y = xy
    draw.text((x + 5, y + 7), text, font=font, fill=(0, 0, 0), stroke_width=stroke, stroke_fill=(0, 0, 0))
    draw.text((x, y), text, font=font, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--hook", default=""); ap.add_argument("--key", required=True)
    ap.add_argument("--circle", default=""); ap.add_argument("--arrow", default="")
    ap.add_argument("--tag", default=""); ap.add_argument("--right", action="store_true")
    a = ap.parse_args()

    img = Image.open(a.src).convert("RGB").resize((W, H), Image.LANCZOS)
    # dark band at the bottom so the text reads on any picture
    band = Image.new("L", (W, H), 0)
    bd = ImageDraw.Draw(band)
    for y in range(int(H * 0.45), H):
        bd.line([(0, y), (W, y)], fill=int(200 * ((y - H * 0.45) / (H * 0.55)) ** 1.3))
    img = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), img, band)
    d = ImageDraw.Draw(img)

    if a.circle:
        cx, cy, r = (float(v) for v in a.circle.split(","))
        cx, cy, r = cx * W, cy * H, r * W
        for k in range(3):
            d.ellipse([cx - r - k, cy - r - k, cx + r + k, cy + r + k], outline=(0, 0, 0), width=14)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=MARK, width=9)
    if a.arrow:
        x1, y1, x2, y2 = (float(v) for v in a.arrow.split(","))
        x1, y1, x2, y2 = x1 * W, y1 * H, x2 * W, y2 * H
        ang = math.atan2(y2 - y1, x2 - x1)
        head = [(x2, y2), (x2 - 46 * math.cos(ang - 0.5), y2 - 46 * math.sin(ang - 0.5)),
                (x2 - 46 * math.cos(ang + 0.5), y2 - 46 * math.sin(ang + 0.5))]
        tail = (x2 - 30 * math.cos(ang), y2 - 30 * math.sin(ang))
        d.line([(x1, y1), tail], fill=(0, 0, 0), width=26)
        d.polygon(head, fill=(0, 0, 0), outline=(0, 0, 0), width=8)
        d.line([(x1, y1), tail], fill=MARK, width=16)
        d.polygon(head, fill=MARK)

    maxw = W * 0.92
    key = fit(d, a.key, 132, maxw)
    hook = fit(d, a.hook, 80, maxw) if a.hook else None
    kh = key.getbbox(a.key)[3]
    ky = H - 46 - kh
    def x_of(text, font):
        return (W - 40 - d.textlength(text, font=font)) if a.right else 40
    if hook:
        hh = hook.getbbox(a.hook)[3]
        outlined(d, (x_of(a.hook, hook), ky - hh - 18), a.hook, hook, WHITE, 7)
    outlined(d, (x_of(a.key, key), ky), a.key, key, AMBER, 9)
    if a.tag:
        tf = ImageFont.truetype(str(FONT), 46)
        tx = 40 if a.right else W - 40 - d.textlength(a.tag, font=tf)
        outlined(d, (tx, 30), a.tag, tf, WHITE, 5)
    out = pathlib.Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=92)
    print(f"✓ {out}")


if __name__ == "__main__":
    main()
