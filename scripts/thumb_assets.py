"""Fetch CC0 assets (Poly Haven) for thumbnail scenes into thumbkit/cache/ (not committed; re-downloadable).

    python3 scripts/thumb_assets.py search cigarette          # find model / texture / hdri ids
    python3 scripts/thumb_assets.py get model cigarette_pack  # → thumbkit/cache/models/<id>/<id>.gltf (+ textures)
    python3 scripts/thumb_assets.py get texture old_wood_floor
    python3 scripts/thumb_assets.py get hdri evening_road_01_puresky
    python3 scripts/thumb_assets.py need episodes/<ep>/thumbnail   # everything the concept pages ask for
    python3 scripts/thumb_assets.py restore   # 새 PC: thumbkit/assets.lock.json 의 모든 자산을 받고 sha256 검증
    python3 scripts/thumb_assets.py lock      # 자산을 추가한 뒤 잠금 파일 갱신 (verify: 검증만)
    texture:<id>@4k 처럼 해상도를 붙이면 cache/textures/<id>_4k 에 받는다.
    python3 scripts/thumb_assets.py figures   # Quaternius Universal Base Characters (CC0, itch.io free download) → cache/figures
    python3 scripts/thumb_assets.py actors    # 걷는 인물(thumbkit/actors.js): Quaternius 동작 라이브러리 1·2 + 머리카락 (CC0) → cache/figures/actors

A concept page lists what it needs in a comment:  <!-- assets: model:cigarette_pack texture:old_wood_floor hdri:... -->
All Poly Haven assets are CC0 (no attribution required); we still record them in thumbkit/cache/CREDITS.txt.
"""
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
CACHE = HERE / "thumbkit" / "cache"
API = "https://api.polyhaven.com"
RES = "1k"
TYPES = {"hdri": "hdris", "texture": "textures", "model": "models"}


def get_json(url):
    # Poly Haven refuses Python's default user agent; curl works.
    r = subprocess.run(["curl", "-sSfL", "-A", "thumbkit/1.0", url], capture_output=True, check=True)
    return json.loads(r.stdout)


def download(url, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.stat().st_size > 0:
        return
    subprocess.run(["curl", "-sSfL", "-A", "thumbkit/1.0", "-o", str(dst), url], check=True)


def credit(kind, aid):
    f = CACHE / "CREDITS.txt"
    src = (f"https://quaternius.itch.io/{aid.removeprefix('quaternius-')}" if kind == "figure" else f"https://polyhaven.com/a/{aid}")
    line = f"{kind}:{aid}  {src}  CC0\n"
    old = f.read_text() if f.exists() else ""
    if line not in old:
        f.write_text(old + line)


def get(kind, aid, res=RES):
    """res other than 1k is stored under <id>_<res> (e.g. textures/poly_wool_herringbone_4k)."""
    files = get_json(f"{API}/files/{aid}")
    store = aid if res == RES else f"{aid}_{res}"
    if kind == "hdri":
        r = files["hdri"].get(res) or files["hdri"]["1k"]
        download(r["hdr"]["url"], CACHE / "hdris" / f"{store}.hdr")
    elif kind == "texture":
        # maps → <id>/<map>.jpg ; normal is the OpenGL one
        want = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "AO": "ao", "Displacement": "disp", "arm": "arm"}
        for key, name in want.items():
            if key in files and res in files[key]:
                fmt = files[key][res].get("jpg") or files[key][res].get("png")
                ext = "jpg" if "jpg" in files[key][res] else "png"
                download(fmt["url"], CACHE / "textures" / store / f"{name}.{ext}")
    elif kind == "model":
        g = (files["gltf"].get(res) or files["gltf"]["1k"])["gltf"]
        base = CACHE / "models" / store
        download(g["url"], base / f"{store}.gltf")
        for rel, inc in g.get("include", {}).items():
            download(inc["url"], base / rel)
    else:
        raise SystemExit(f"종류는 {list(TYPES)}")
    credit(kind, aid)
    print(f"✓ {kind}:{aid}")


def search(word):
    word = word.lower()
    for kind, t in TYPES.items():
        d = get_json(f"{API}/assets?t={t}")
        hits = [k for k, v in d.items() if word in k.lower() or word in " ".join(v.get("tags", []) + v.get("categories", [])).lower()
                or word in v.get("name", "").lower()]
        if hits:
            print(f"{kind}: {' '.join(sorted(hits)[:40])}")


def need(folder):
    folder = pathlib.Path(folder)
    wanted = set()
    for page in folder.glob("*.html"):
        for m in re.finditer(r"<!--\s*assets:(.*?)-->", page.read_text(encoding="utf-8"), re.S):
            wanted |= {tuple(x.split(":", 1)) for x in m.group(1).split() if ":" in x}
    for kind, aid in sorted(wanted):
        if kind == "figure":
            actors() if aid == "actors" else figures(); continue
        aid, _, res = aid.partition("@")
        get(kind, aid, res or RES)
    print(f"{len(wanted)}개 준비됨 → {CACHE.relative_to(HERE)}")


def figures():
    """Public free-download flow of quaternius.itch.io (no login). Keeps the base male and female, textures stripped."""
    import tempfile, zipfile
    dst = CACHE / "figures"
    bodies = ["Superhero_Male_FullBody", "Superhero_Female_FullBody"]
    if all((dst / f"{b}.gltf").exists() for b in bodies):
        print("✓ figures (이미 있음)"); return
    dst.mkdir(parents=True, exist_ok=True)
    tmp = pathlib.Path(tempfile.mkdtemp()); jar = str(tmp / "c.txt"); page = "https://quaternius.itch.io/universal-base-characters"
    def curl(*a):
        return subprocess.run(["curl", "-sSfL", "-c", jar, "-b", jar, "--max-time", "600", *a], capture_output=True, check=True).stdout.decode("utf-8", "replace")
    csrf = lambda html: re.search(r'name="csrf_token" value="([^"]+)"', html).group(1)
    url = json.loads(curl("-X", "POST", "--data-urlencode", f"csrf_token={csrf(curl(page))}", page + "/download_url"))["url"]
    f = json.loads(curl("-X", "POST", "--data-urlencode", f"csrf_token={csrf(curl(url))}", page + "/file/15861669?source=game_download"))["url"]
    zpath = tmp / "ubc.zip"
    subprocess.run(["curl", "-sSfL", "--max-time", "900", "-o", str(zpath), f], check=True)
    z = zipfile.ZipFile(zpath); base = "Universal Base Characters[Standard]/Base Characters/Godot - UE/"
    for b in bodies:
        for n in [f"{b}.gltf", f"{b}.bin"]:
            (dst / n).write_bytes(z.read(base + n))
        g = json.loads((dst / f"{b}.gltf").read_text())
        for k in ("images", "textures", "samplers"):
            g.pop(k, None)
        for m in g.get("materials", []):
            p = m.get("pbrMetallicRoughness", {}); p.pop("baseColorTexture", None); p.pop("metallicRoughnessTexture", None); m.pop("normalTexture", None)
        (dst / f"{b}.gltf").write_text(json.dumps(g))
    (dst / "LICENSE_Quaternius.txt").write_bytes(z.read("Universal Base Characters[Standard]/License_Standard.txt"))
    zpath.unlink()
    credit("figure", "quaternius-universal-base-characters")
    print("✓ figures")


def itch_zip(slug, upload, tmp):
    """Free (name-your-own-price, no login) itch.io download of one upload → zip path in tmp."""
    jar = str(tmp / "c.txt"); page = f"https://quaternius.itch.io/{slug}"
    def curl(*a):
        return subprocess.run(["curl", "-sSfL", "-c", jar, "-b", jar, "--max-time", "600", *a], capture_output=True, check=True).stdout.decode("utf-8", "replace")
    csrf = lambda html: re.search(r'name="csrf_token" value="([^"]+)"', html).group(1)
    url = json.loads(curl("-X", "POST", "--data-urlencode", f"csrf_token={csrf(curl(page))}", page + "/download_url"))["url"]
    f = json.loads(curl("-X", "POST", "--data-urlencode", f"csrf_token={csrf(curl(url))}", page + f"/file/{upload}?source=game_download"))["url"]
    z = tmp / f"{slug}.zip"
    subprocess.run(["curl", "-sSfL", "--max-time", "1500", "-o", str(z), f], check=True)
    return z


# thumbkit/actors.js: animation clips (same 65-bone rig as the base characters) and hair rigged to the head bone.
ACTOR_PACKS = [
    ("universal-animation-library", 17958403, "Universal Animation Library[Standard]/", {
        "Unreal-Godot/UAL1_Standard.glb": "UAL1_Standard.glb", "License.txt": "LICENSE_UAL1.txt"}),
    ("universal-animation-library-2", 17958478, "Universal Animation Library 2[Standard]/", {
        "Unreal-Godot/UAL2_Standard.glb": "UAL2_Standard.glb", "License.txt": "LICENSE_UAL2.txt"}),
    ("universal-base-characters", 15861669, "Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/", {
        **{f"{h}.{e}": f"{h}.{e}" for h in ["Hair_Long", "Hair_SimpleParted", "Hair_Buns", "Hair_Buzzed", "Hair_Beard"] for e in ("gltf", "bin")},
        "T_Hair_1_Normal.png": "T_Hair_1_Normal.png", "T_Hair_2_Normal.png": "T_Hair_2_Normal.png"}),
]


def actors():
    """Quaternius Universal Animation Library 1+2 (CC0) and the hairstyles of Universal Base Characters (CC0) → cache/figures/actors.
    Hair glTFs keep only their normal map (the grey base colour is replaced by a tint in actors.js)."""
    import tempfile, zipfile
    dst = CACHE / "figures" / "actors"
    want = [n for *_, files in ACTOR_PACKS for n in files.values()]
    if all((dst / n).exists() for n in want):
        print("✓ actors (이미 있음)"); return
    dst.mkdir(parents=True, exist_ok=True)
    tmp = pathlib.Path(tempfile.mkdtemp())
    for slug, upload, base, files in ACTOR_PACKS:
        if all((dst / n).exists() for n in files.values()):
            continue
        zpath = itch_zip(slug, upload, tmp)
        z = zipfile.ZipFile(zpath)
        for src, out in files.items():
            (dst / out).write_bytes(z.read(base + src))
            if out.endswith(".gltf"):
                g = json.loads((dst / out).read_text())
                g["images"] = [im for im in g.get("images", []) if "Normal" in im["uri"]]
                g["textures"] = [{"source": 0}]
                for m in g.get("materials", []):
                    m.get("pbrMetallicRoughness", {}).pop("baseColorTexture", None)
                    m["normalTexture"] = {"index": 0}
                (dst / out).write_text(json.dumps(g))
        zpath.unlink()
        credit("figure", f"quaternius-{slug}")
    print("✓ actors")


LOCK = HERE / "thumbkit" / "assets.lock.json"


def sha(p):
    import hashlib
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def lock():
    """Record every cached file with its sha256, so another machine can check it got the same bytes."""
    files = {str(p.relative_to(CACHE)): sha(p) for p in sorted(CACHE.rglob("*")) if p.is_file() and p.name != "CREDITS.txt"}
    wanted = set()
    for page in (HERE / "episodes").glob("*/thumbnail/*.html"):
        for m in re.finditer(r"<!--\s*assets:(.*?)-->", page.read_text(encoding="utf-8"), re.S):
            wanted |= {x for x in m.group(1).split() if ":" in x}
    for k in (HERE / "episodes").glob("*/kit3d.json"):   # 영상 3D 장면이 쓰는 자산 (scripts/kit3d.py)
        wanted |= {x for x in json.loads(k.read_text(encoding="utf-8")).get("assets", []) if not x.startswith("figure:")}
    LOCK.write_text(json.dumps({"assets": sorted(wanted | {"figure:quaternius"} | ({"figure:actors"} if (CACHE / "figures" / "actors").exists() else set())), "files": files}, indent=1) + "\n")
    print(f"{len(files)}개 파일 → {LOCK.relative_to(HERE)}")


def restore():
    """Download everything in the lock, then verify."""
    for x in json.loads(LOCK.read_text())["assets"]:
        kind, aid = x.split(":", 1)
        if kind == "figure":
            actors() if aid == "actors" else figures(); continue
        aid, _, res = aid.partition("@")
        get(kind, aid, res or RES)
    verify()


def verify():
    files = json.loads(LOCK.read_text())["files"]
    bad = [f for f, h in files.items() if not (CACHE / f).exists() or sha(CACHE / f) != h]
    if bad:
        print(f"✗ {len(bad)}/{len(files)}개가 잠금과 다름: {bad[:5]}")
        sys.exit(1)
    print(f"✓ 자산 {len(files)}개 모두 잠금(sha256)과 같음")


def main():
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == "search":
        search(a[1])
    elif len(a) >= 3 and a[0] == "get":
        get(a[1], a[2], a[3] if len(a) > 3 else RES)
    elif a == ["lock"]:
        lock()
    elif a == ["restore"]:
        restore()
    elif a == ["verify"]:
        verify()
    elif a == ["figures"]:
        figures()
    elif a == ["actors"]:
        actors()
    elif len(a) == 2 and a[0] == "need":
        need(a[1])
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
