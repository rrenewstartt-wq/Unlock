"""Generate the narration on this machine (CPU is fine, ~4x real time) instead of Colab.

    python3 scripts/voice_local.py setup                       # venv + voxcpm (CPU torch) in .venv-voice/ (not committed)
    python3 scripts/voice_local.py ref <내 녹음.wav|m4a|mp3>    # → voice/my_voice_ref.wav (+ .txt = config reference_text)
    python3 scripts/voice_local.py gen episodes/<ep> [--limit N]  # pack.json → voice/cache/<key>.wav → episodes/<ep>/voice/out/<id>.wav
    python3 scripts/voice.py import episodes/<ep> episodes/<ep>/voice/out

Same rules as the notebook (docs/voice.md): consent must be "own", the reference text must match the recording,
lines already generated (same text) are skipped, nothing here is committed (voice/ is git-ignored).
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent.parent
VENV = HERE / ".venv-voice"
VPY = VENV / "bin" / "python"
CONFIG = json.loads((HERE / "config" / "voice.json").read_text(encoding="utf-8"))
REF = HERE / "voice" / "my_voice_ref.wav"
CACHE = HERE / "voice" / "cache"
VOXCPM = "voxcpm==2.0.3"


def setup():
    if not VPY.exists():
        subprocess.run([sys.executable, "-m", "venv", str(VENV)], check=True)
    pip = [str(VPY), "-m", "pip", "install", "-q"]
    subprocess.run(pip + ["--upgrade", "pip"], check=True)
    subprocess.run(pip + ["torch", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cpu"], check=True)
    subprocess.run(pip + [VOXCPM, "soundfile"], check=True)
    print("준비 끝:", VPY)


def ref(src):
    if CONFIG.get("consent") != "own":
        raise SystemExit("config/voice.json 의 consent 가 own 이 아닙니다 — 본인 목소리만 사용합니다")
    REF.parent.mkdir(parents=True, exist_ok=True)
    trim = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af", trim, "-ac", "1", "-ar", "24000", str(REF)], check=True)
    REF.with_suffix(".txt").write_text(CONFIG["reference_text"], encoding="utf-8")
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(REF)],
                       capture_output=True, text=True).stdout.strip()
    print(f"등록: {REF} ({float(d):.1f}초). 녹음 문장이 config/voice.json reference_text 와 같아야 합니다:\n  {CONFIG['reference_text']}")


def gen(ep, limit=None):
    if not VPY.exists():
        raise SystemExit("먼저: python3 scripts/voice_local.py setup")
    if os.environ.get("VOICE_LOCAL_CHILD") != "1":  # re-run inside the venv
        os.execve(str(VPY), [str(VPY), "-I", __file__, "gen", str(ep)] + (["--limit", str(limit)] if limit else []),
                  {**os.environ, "VOICE_LOCAL_CHILD": "1"})
    import soundfile as sf
    import torch
    from voxcpm import VoxCPM
    pack = json.loads((ep / "voice" / "pack.json").read_text(encoding="utf-8"))
    V = pack["voice"]
    assert V.get("consent") == "own", "consent 가 own 이 아닙니다 — 본인 목소리만 사용합니다"
    if not REF.exists():
        raise SystemExit("먼저 목소리 등록: python3 scripts/voice_local.py ref <녹음 파일>")
    ref_text = REF.with_suffix(".txt").read_text(encoding="utf-8").strip()
    if ref_text != V.get("reference_text", "").strip():
        print("⚠️ 녹음 문장과 config/voice.json 의 reference_text 가 다릅니다. 둘을 같게 맞추세요.")
    CACHE.mkdir(parents=True, exist_ok=True)
    out = ep / "voice" / "out"
    out.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
    sr = model.tts_model.sample_rate
    todo = [c for c in pack["chunks"] if not (CACHE / f"{c['key']}.wav").exists()]
    if limit:
        todo = todo[:limit]
    print(f"남은 줄 {len(todo)}/{len(pack['chunks'])}", flush=True)
    t0 = time.time()
    for i, c in enumerate(todo, 1):
        kw = dict(text=c["text"], reference_wav_path=str(REF), cfg_value=V.get("cfg_value", 2.0),
                  inference_timesteps=V.get("inference_timesteps", 10))
        if V.get("mode") == "ultimate_clone":
            kw.update(prompt_wav_path=str(REF), prompt_text=ref_text, text=re.sub(r"^\([^)]*\)", "", c["text"]))
        torch.manual_seed(V.get("seed", 42))  # voxcpm 2.x has no seed argument
        wav = model.generate(**kw)
        tmp = CACHE / f"{c['key']}.part.wav"
        sf.write(str(tmp), wav, sr)
        os.replace(tmp, CACHE / f"{c['key']}.wav")
        print(f"  {i}/{len(todo)} {c['id']} {c['caption']}  ({time.time() - t0:.0f}s)", flush=True)
    done = 0
    for c in pack["chunks"]:
        src = CACHE / f"{c['key']}.wav"
        if src.exists():
            shutil.copy2(src, out / f"{c['id']}.wav")
            done += 1
    print(f"{done}/{len(pack['chunks'])} 줄 → {out}\n다음: python3 scripts/voice.py import {ep.relative_to(HERE)} {out.relative_to(HERE)}")


def main():
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    if a[0] == "setup":
        return setup()
    if a[0] == "ref" and len(a) == 2:
        return ref(pathlib.Path(a[1]).resolve())
    if a[0] == "gen" and len(a) >= 2:
        lim = int(a[a.index("--limit") + 1]) if "--limit" in a else None
        return gen(pathlib.Path(a[1]).resolve(), lim)
    raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
