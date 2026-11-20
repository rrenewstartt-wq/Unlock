"""Check that this machine reproduces the committed results (another account / PC / cloud session).

    python3 scripts/verify_repro.py            # assets lock + 2D thumbnail recipes (bit-for-bit expected)
    python3 scripts/verify_repro.py --3d       # also re-shoot the 3D concept pages and compare (needs Chromium)

2D: every episodes/*/thumbnail/recipes.json step is rebuilt into a temp folder and compared with the committed
file (sha256; if not identical, mean pixel difference — under 0.5/255 counts as the same picture: JPEG encoders
can differ by a bit between Pillow builds).
3D: WebGL through SwiftShader can differ slightly between machines; compared by mean pixel difference (≤ 3/255).
"""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent.parent


def sha(p):
    return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()


def diff(a, b):
    A = np.asarray(Image.open(a).convert("RGB")).astype(np.float32)
    B = np.asarray(Image.open(b).convert("RGB")).astype(np.float32)
    if A.shape != B.shape:
        return 999.0
    return float(np.abs(A - B).mean())


def check_2d():
    fails = 0
    for rec in sorted(HERE.glob("episodes/*/thumbnail/recipes.json")):
        tdir = rec.parent
        tmp = pathlib.Path(tempfile.mkdtemp())
        (tmp / "out").mkdir()
        made = set()
        for step in json.loads(rec.read_text(encoding="utf-8"))["steps"]:
            script, *args = step
            # inputs under out/ that this recipe did not make come from the committed folder (e.g. 3D renders)
            args2 = []
            for x in args:
                if x.startswith("out/"):
                    src = tmp / x if x in made else tdir / x
                    args2.append(str(src) if x != args[1] else str(tmp / x))
                else:
                    args2.append(str(HERE / x) if (HERE / x).exists() else x)
            out_rel = args[1]
            args2[1] = str(tmp / out_rel)
            subprocess.run([sys.executable, str(HERE / "scripts" / script), *args2], check=True, capture_output=True)
            made.add(out_rel)
            ref = tdir / out_rel
            if not ref.exists():
                print(f"  ? {rec.parent.parent.name}/{out_rel}: 커밋된 파일 없음"); continue
            if sha(ref) == sha(tmp / out_rel):
                print(f"  ✓ {rec.parent.parent.name}/{out_rel}: 바이트까지 같음")
            else:
                d = diff(ref, tmp / out_rel)
                ok = d < 0.5
                fails += not ok
                print(f"  {'✓' if ok else '✗'} {rec.parent.parent.name}/{out_rel}: 평균 픽셀 차이 {d:.2f}/255")
        shutil.rmtree(tmp, ignore_errors=True)
    return fails


def check_3d():
    fails = 0
    for ep in sorted(HERE.glob("episodes/*")):
        pages = sorted((ep / "thumbnail").glob("c*.html"))
        if not pages:
            continue
        keep = {}
        for p in pages:
            ref = ep / "thumbnail" / "out" / f"thumb-{p.stem}.jpg"
            if ref.exists():
                keep[p.stem] = ref.read_bytes()
        subprocess.run(["bash", str(HERE / "scripts" / "thumbnail.sh"), str(ep)], check=True, capture_output=True)
        for c, old in keep.items():
            new = ep / "thumbnail" / "out" / f"thumb-{c}.jpg"
            tmp = pathlib.Path(tempfile.mkdtemp()) / "old.jpg"
            tmp.write_bytes(old)
            d = diff(tmp, new)
            ok = d <= 3
            fails += not ok
            print(f"  {'✓' if ok else '✗'} {ep.name}/thumb-{c}.jpg (3D): 평균 픽셀 차이 {d:.2f}/255")
            new.write_bytes(old)   # keep the committed version in the working tree
    return fails


def main():
    print("1) 썸네일 자산 잠금(sha256)")
    r = subprocess.run([sys.executable, str(HERE / "scripts" / "thumb_assets.py"), "verify"])
    fails = r.returncode != 0
    print("2) 사진·글자 썸네일 레시피 다시 만들기")
    fails += check_2d()
    if "--3d" in sys.argv:
        print("3) 3D 컨셉 페이지 다시 촬영")
        fails += check_3d()
    print("결과:", "모두 같음 ✓" if not fails else f"{fails}개 다름 ✗")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
