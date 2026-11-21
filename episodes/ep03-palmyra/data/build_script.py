"""script.txt -> script.json (scene and caption timings).

script.txt: `@scene_id` starts a scene; every following line is one caption (= one narration line).
A line may carry a reading for the voice after `||`:  `오전 6시 30분 || 오전 여섯 시 삼십 분`.
Lines starting with `#` are comments.

Timing:
- No voice yet: reading speed (0.6 s + 0.13 s per character, at least 2.1 s).
- Voice imported (data/voice.json written by scripts/voice.py import, same script hash):
  each caption lasts as long as its WAV plus a short breath, so captions, scene lengths,
  3D camera keys and diagram reveals all follow the narration.
"""
import hashlib
import json
import pathlib

here = pathlib.Path(__file__).parent
GAP = 0.2          # between captions
SCENE_GAP = 0.5    # extra pause at a scene change
VOICE_PAD = 0.12   # breath after each voice line
TAIL = 2.5         # hold after the last caption


def parse():
    scenes, cur = [], None
    for raw in (here / "script.txt").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("@"):
            cur = {"id": line[1:].strip(), "captions": []}
            scenes.append(cur)
            continue
        text, _, say = line.partition("||")
        text = text.strip()
        cur["captions"].append({"text": text, "say": (say.strip() or text)})
    for si, s in enumerate(scenes, 1):
        for ci, c in enumerate(s["captions"], 1):
            c["id"] = f"s{si:02d}_c{ci:02d}"
    return scenes


def script_hash(scenes):
    h = hashlib.sha256()
    for s in scenes:
        for c in s["captions"]:
            h.update(f'{c["id"]}\t{c["say"]}\n'.encode("utf-8"))
    return h.hexdigest()[:12]


def voice_durations(scenes, digest):
    p = here / "voice.json"
    if not p.exists():
        return None
    v = json.loads(p.read_text(encoding="utf-8"))
    if v.get("script_hash") != digest:
        print(f"경고: data/voice.json 이 지금 대본과 맞지 않습니다(대본이 바뀜). 읽기 속도로 계산합니다. "
              f"→ python3 ../../scripts/voice.py pack 후 다시 생성·import")
        return None
    d = v.get("durations", {})
    missing = [c["id"] for s in scenes for c in s["captions"] if c["id"] not in d]
    if missing:
        print(f"경고: 음성이 없는 줄 {len(missing)}개({missing[:3]}…). 읽기 속도로 계산합니다.")
        return None
    return d


def main():
    scenes = parse()
    digest = script_hash(scenes)
    vd = voice_durations(scenes, digest)
    t = 0.4
    for i, s in enumerate(scenes):
        for c in s["captions"]:
            if vd:
                d = round(vd[c["id"]] + VOICE_PAD, 2)
            else:
                n = len(c["text"].replace(" ", ""))
                d = round(max(2.1, 0.6 + 0.13 * n), 2)
            c["start"], c["end"] = round(t, 2), round(t + d, 2)
            t += d + GAP
        t += SCENE_GAP
        s["end"] = round(t, 2)
    scenes[-1]["end"] = round(t + TAIL, 2)
    scenes[0]["start"] = 0.0
    for i in range(1, len(scenes)):
        scenes[i]["start"] = scenes[i - 1]["end"]
    total = scenes[-1]["end"]
    out = {"total": total, "script_hash": digest, "voice": bool(vd), "scenes": scenes}
    (here / "script.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in scenes:
        print(f'{s["id"]:9} {s["start"]:7.2f} {s["end"]:7.2f} {s["end"] - s["start"]:5.1f}s {len(s["captions"])}')
    print("total", total, "| timing:", "voice" if vd else "reading speed", "| hash", digest)


if __name__ == "__main__":
    main()
