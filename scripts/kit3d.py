"""Put the film kit (thumbkit's photoreal CC0 3D: HDRI, PBR textures, models, realistic figures) into an episode.

    python3 scripts/kit3d.py episodes/<ep>          # 코드 복사 + episodes/<ep>/kit3d.json 의 자산을 assets/kit3d/cache 로
    python3 scripts/kit3d.py --all                  # kit3d.json 이 있는 모든 에피소드 (setup.sh 가 부른다)

episodes/<ep>/kit3d.json:  {"assets": ["figure:quaternius", "hdri:misty_dawn", "texture:damp_beach_sand", "model:street_lamp_01"]}

- 코드(assets/kit3d/*.js, addons/)는 커밋한다. 자산 캐시(assets/kit3d/cache/)는 커밋하지 않는다(thumbkit/cache 에서 복사,
  없으면 scripts/thumb_assets.py 로 받는다. 잠금: thumbkit/assets.lock.json).
- three.js 는 에피소드의 assets/lib/three.module.min.js 를 같이 쓴다(같은 판, r185).
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
KIT = HERE / "thumbkit"
CACHE = KIT / "cache"
TEX_FILES = ("diff.jpg", "nor.jpg", "rough.jpg", "arm.jpg")  # what thumbkit.material() loads


def rewrite(src, depth):
    """Point bare 'three' imports at the episode's three.module.min.js and the cache at the episode folder."""
    up = "../" * depth
    s = src.read_text(encoding="utf-8")
    s = re.sub(r"""(['"])three/addons/""", lambda m: m.group(1) + ("./" if depth == 1 else up[3:]) + "addons/", s)
    s = re.sub(r"""(['"])three\1""", lambda m: f"{m.group(1)}{up}lib/three.module.min.js{m.group(1)}", s)
    s = s.replace("'/thumbkit/cache'", "'assets/kit3d/cache'")
    return s


def sync_code(ep):
    dst = ep / "assets" / "kit3d"
    if not (ep / "assets" / "lib" / "three.module.min.js").exists():
        sys.exit(f"{ep}/assets/lib/three.module.min.js 가 없습니다 (scripts/new_episode.py 로 만든 에피소드인지 확인)")
    dst.mkdir(parents=True, exist_ok=True)
    for name in ("thumbkit.js", "figures.js", "film.js"):
        (dst / name).write_text(rewrite(KIT / name, 1), encoding="utf-8")
    for f in sorted((KIT / "lib" / "addons").rglob("*.js")):
        rel = f.relative_to(KIT / "lib")
        out = dst / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(rewrite(f, len(rel.parts)), encoding="utf-8")
    gi = ep / ".gitignore"
    lines = gi.read_text(encoding="utf-8").splitlines() if gi.exists() else []
    if "assets/kit3d/cache/" not in lines:
        gi.write_text("\n".join(lines + ["assets/kit3d/cache/"]) + "\n", encoding="utf-8")


def ensure(kind, aid):
    if kind == "figure":
        if not (CACHE / "figures" / "Superhero_Female_FullBody.gltf").exists():
            subprocess.run([sys.executable, str(HERE / "scripts" / "thumb_assets.py"), "figures"], check=True)
        return CACHE / "figures"
    aid, _, res = aid.partition("@")
    store = f"{aid}_{res}" if res else aid
    p = {"hdri": CACHE / "hdris" / f"{store}.hdr", "texture": CACHE / "textures" / store, "model": CACHE / "models" / store}[kind]
    if not p.exists():
        subprocess.run([sys.executable, str(HERE / "scripts" / "thumb_assets.py"), "get", kind, aid] + ([res] if res else []), check=True)
    return p


def sync_assets(ep):
    spec = ep / "kit3d.json"
    if not spec.exists():
        return 0
    out = ep / "assets" / "kit3d" / "cache"
    n = 0
    for x in json.loads(spec.read_text(encoding="utf-8"))["assets"]:
        kind, aid = x.split(":", 1)
        src = ensure(kind, aid)
        dst = out / src.relative_to(CACHE)
        if src.is_file():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            n += 1
        else:
            for f in src.rglob("*"):
                if f.is_dir() or (kind == "texture" and f.name not in TEX_FILES):
                    continue
                d = out / f.relative_to(CACHE)
                d.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, d)
                n += 1
    return n


def main():
    a = sys.argv[1:]
    if a == ["--all"]:
        eps = sorted(p.parent for p in (HERE / "episodes").glob("*/kit3d.json"))
    elif len(a) == 1:
        eps = [pathlib.Path(a[0]).resolve()]
    else:
        raise SystemExit(__doc__)
    for ep in eps:
        sync_code(ep)
        n = sync_assets(ep)
        print(f"✓ {ep.name}: 키트 코드 + 자산 파일 {n}개 → assets/kit3d/")


if __name__ == "__main__":
    main()
