"""Narration with your own cloned voice (VoxCPM2) — pack lines out, bring WAVs back.

    python3 scripts/voice.py pack   episodes/<ep>            # → episodes/<ep>/voice/pack.json (one chunk per caption)
    (Colab: notebooks/voxcpm2_voice.ipynb  →  <ep>_voice.zip with s01_c01.wav …)
    python3 scripts/voice.py import episodes/<ep> <zip|dir>  # → assets/voice/*.wav + data/voice.json
    python3 scripts/voice.py status episodes/<ep>

After import, `python3 data/build_script.py && python3 build.py` re-times every caption and scene to the
voice and places the clips on the voice track. Editing script.txt changes the script hash: the old voice is
then ignored (reading-speed timing) until you pack and generate again — only changed lines need new WAVs,
but the notebook skips lines it already made only when their text is unchanged.
"""
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = pathlib.Path(__file__).resolve().parent.parent
CONFIG = HERE / "config" / "voice.json"


def load_scenes(ep):
    sys.path.insert(0, str(ep / "data"))
    import build_script  # noqa: E402  (the episode's own parser)
    scenes = build_script.parse()
    return scenes, build_script.script_hash(scenes)


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def pack(ep):
    scenes, digest = load_scenes(ep)
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    styles = cfg.get("scene_styles", {})
    chunks = []
    for s in scenes:
        style = styles.get(s["id"], cfg.get("default_style", ""))
        for c in s["captions"]:
            text = c["say"]
            if cfg.get("mode") != "ultimate_clone" and style:
                text = f"({style}){text}"
            chunks.append({"id": c["id"], "scene": s["id"], "caption": c["text"], "text": text,
                           "key": hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]})
    out = ep / "voice"
    out.mkdir(exist_ok=True)
    body = {"project": ep.name, "language": "ko", "script_hash": digest,
            "voice": {k: cfg[k] for k in ("engine", "mode", "consent", "reference_text", "cfg_value", "inference_timesteps", "seed")},
            "chunks": chunks}
    (out / "pack.json").write_text(json.dumps(body, ensure_ascii=False, indent=1), encoding="utf-8")
    chars = sum(len(c["text"]) for c in chunks)
    print(f"{len(chunks)}줄, {chars}자 → {out / 'pack.json'} (hash {digest})")
    print("다음: Colab 에서 notebooks/voxcpm2_voice.ipynb 2단계에 이 pack.json 을 올려 생성")


def do_import(ep, src):
    scenes, digest = load_scenes(ep)
    ids = [c["id"] for s in scenes for c in s["captions"]]
    packf = ep / "voice" / "pack.json"
    if packf.exists() and json.loads(packf.read_text(encoding="utf-8"))["script_hash"] != digest:
        raise SystemExit("pack.json 이후 대본이 바뀌었습니다. pack 부터 다시 하세요.")
    tmp = None
    src = pathlib.Path(src)
    if src.suffix == ".zip":
        tmp = pathlib.Path(tempfile.mkdtemp())
        with zipfile.ZipFile(src) as z:
            for n in z.namelist():
                if re.fullmatch(r"(?:.*/)?s\d{2}_c\d{2}\.wav", n):  # only expected names, no paths outside
                    (tmp / pathlib.Path(n).name).write_bytes(z.read(n))
        src = tmp
    dst = ep / "assets" / "voice"
    dst.mkdir(parents=True, exist_ok=True)
    durations, missing = {}, []
    for i in ids:
        f = src / f"{i}.wav"
        if not f.exists():
            missing.append(i)
            continue
        out = dst / f"{i}.wav"
        # Mono 48 kHz, trimmed edges, one loudness for every line.
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(f), "-af",
                        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,"
                        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,"
                        "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1", str(out)], check=True)
        durations[i] = round(duration(out), 3)
    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    if missing:
        print(f"없는 줄 {len(missing)}개: {missing[:8]}{'…' if len(missing) > 8 else ''} — 생성 후 다시 import")
    (ep / "data" / "voice.json").write_text(json.dumps({"script_hash": digest, "durations": durations}, indent=1), encoding="utf-8")
    total = sum(durations.values())
    print(f"{len(durations)}/{len(ids)}줄 가져옴, 음성 합계 {total / 60:.1f}분 → data/voice.json")
    print("다음: python3 data/build_script.py && python3 build.py && npx hyperframes check")


def status(ep):
    scenes, digest = load_scenes(ep)
    ids = [c["id"] for s in scenes for c in s["captions"]]
    v = ep / "data" / "voice.json"
    have = json.loads(v.read_text())["durations"] if v.exists() else {}
    ok = v.exists() and json.loads(v.read_text()).get("script_hash") == digest
    print(f"대본 hash {digest} | 음성 {'맞음' if ok else '없음 또는 옛 대본'} | {sum(i in have for i in ids)}/{len(ids)}줄")


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("pack", "import", "status"):
        raise SystemExit(__doc__)
    ep = pathlib.Path(sys.argv[2]).resolve()
    if sys.argv[1] == "pack":
        pack(ep)
    elif sys.argv[1] == "import":
        if len(sys.argv) < 4:
            raise SystemExit("import 에는 zip 또는 폴더 경로가 필요합니다")
        do_import(ep, sys.argv[3])
    else:
        status(ep)


if __name__ == "__main__":
    main()
