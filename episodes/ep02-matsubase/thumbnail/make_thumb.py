"""raw.png (3D frame) -> amber duotone thumbnails, 1280x720.

    python3 thumbnail/make_thumb.py ["큰 글자"] ["작은 글자"]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pathlib
here = pathlib.Path(__file__).parent
img = Image.open(here / "raw.png").convert("RGB").resize((1280, 720), Image.LANCZOS)
a = np.asarray(img).astype(np.float32) / 255
lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
lum = np.clip((lum - 0.02) / 0.45, 0, 1) ** 0.85  # lift and stretch
dark = np.array([14, 8, 3], np.float32)
mid = np.array([240, 162, 59], np.float32)
hi = np.array([255, 236, 200], np.float32)
l = lum[..., None]
rgb = np.where(l < 0.6, dark + (mid - dark) * (l / 0.6), mid + (hi - mid) * ((l - 0.6) / 0.4))
h, w = lum.shape
yy, xx = np.mgrid[0:h, 0:w]
vig = 1 - 0.55 * np.clip(((xx - w * 0.55) / (w * 0.75)) ** 2 + ((yy - h * 0.5) / (h * 0.75)) ** 2, 0, 1)
rgb *= vig[..., None]
rng = np.random.default_rng(11)
rgb += rng.normal(0, 9, (h, w, 1))
base = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
base.save(here / "thumb-notext.jpg", quality=92)
d = ImageDraw.Draw(base)
font_path = str(here.parent / "assets/fonts/BlackHanSans-Regular.ttf")
big = ImageFont.truetype(font_path, 168)
small = ImageFont.truetype(font_path, 64)
big_text = sys.argv[1] if len(sys.argv) > 1 else "73년"
small_text = sys.argv[2] if len(sys.argv) > 2 else "이름 없던 남자"
d.text((64, 60), big_text, font=big, fill=(255, 240, 214))
d.text((70, 250), small_text, font=small, fill=(255, 240, 214))
base.save(here / "thumb-text.jpg", quality=92)
print("ok")
