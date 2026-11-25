"""Generate index.html and compositions/*.html from data/script.json (generic; scenes live in scenes.py).

Run: python3 -I data/build_script.py && python3 -I build.py
Scene bodies live in scenes.py (one function per scene id).
"""
import json
import pathlib

import scenes as S

ROOT = pathlib.Path(__file__).parent
DATA = json.loads((ROOT / "data" / "script.json").read_text(encoding="utf-8"))
TOTAL = DATA["total"]


def local_cues(sc):
    return [round(c["start"] - sc["start"], 2) for c in sc["captions"]]


def write_scene(sc):
    sid = sc["id"]
    dur = round(sc["end"] - sc["start"], 2)
    body = getattr(S, sid)(sid, dur, local_cues(sc))
    (ROOT / "compositions" / f"{sid}.html").write_text(body, encoding="utf-8")
    return dur


def captions_comp():
    groups = []
    tweens = []
    for sc in DATA["scenes"]:
        for c in sc["captions"]:
            i = len(groups)
            groups.append(
                f'<div id="cap-{i}" class="cap clip" data-start="{c["start"]}" '
                f'data-duration="{round(c["end"] - c["start"], 2)}"><span>{c["text"]}</span></div>'
            )
            tweens.append(
                f'tl.fromTo("#cap-{i} span",{{opacity:0,y:8}},{{opacity:1,y:0,duration:0.22,ease:"power3.out"}},{c["start"]});'
                f'tl.to("#cap-{i} span",{{opacity:0,duration:0.14,ease:"power2.in"}},{round(c["end"] - 0.14, 2)});'
            )
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap {{ position: absolute; left: 0; right: 0; bottom: 74px; text-align: center; }}
    .cap span {{
      display: inline-block; font-family: "Gothic A1", sans-serif; font-weight: 500;
      font-size: 40px; line-height: 1.25; letter-spacing: -0.01em; color: #F6F3EE; padding: 6px 18px 8px;
      text-shadow: 0 0 3px rgba(0,0,0,.95), 0 2px 10px rgba(0,0,0,.85), 0 0 22px rgba(0,0,0,.55);
    }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
    {"".join(groups)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {"".join(tweens)}
    window.__timelines["captions"] = tl;
  </script>
</template>
"""


DUR = {"whoosh-cinematic": 5.54, "whoosh": 0.57, "whoosh-short": 0.57, "impact-bass-1": 2.12, "impact-bass-2": 2.59, "pop": 0.72, "click-soft": 0.37, "click": 0.37, "key-press": 0.4}
PEAK = {"whoosh-cinematic": 2.5, "whoosh": 0.16, "whoosh-short": 0.16, "impact-bass-1": 0.07,
        "impact-bass-2": 1.99, "pop": 0.12, "click-soft": 0.07, "click": 0.07, "key-press": 0.08}


def sfx_tags():
    tags, lanes = [], {}  # lane -> end time (Studio lanes only; the render mixes everything)
    events = S.sfx_events(DATA) if hasattr(S, "sfx_events") else []
    for n, (f, hit, vol) in enumerate(sorted(events, key=lambda e: e[1])):
        start = round(max(0.0, hit - PEAK[f]), 2)
        dur = round(min(DUR[f], TOTAL - start), 2)
        lane = next(l for l in [3, 5, 6, 7, 8, 9] if lanes.get(l, -1) <= start)
        lanes[lane] = start + dur
        tags.append(
            f'      <audio id="sfx-{n}" class="clip" src="assets/sfx/{f}.mp3" data-start="{start}" '
            f'data-duration="{dur}" data-track-index="{lane}" data-volume="{vol}"></audio>'
        )
    return "\n".join(tags)


def voice_tags():
    """One <audio> per narrated caption, when data/script.json was timed to an imported voice."""
    if not DATA.get("voice"):
        return ""
    durs = json.loads((ROOT / "data" / "voice.json").read_text(encoding="utf-8"))["durations"]
    tags = []
    for sc in DATA["scenes"]:
        for c in sc["captions"]:
            f = ROOT / "assets" / "voice" / f'{c["id"]}.wav'
            if f.exists() and c["id"] in durs:
                tags.append(f'      <audio id="vo-{c["id"]}" class="clip" src="assets/voice/{c["id"]}.wav" data-start="{c["start"]}" '
                            f'data-duration="{durs[c["id"]]}" data-track-index="4" data-volume="1"></audio>')
    return "\n".join(tags)


def index(durs):
    hosts = []
    for sc in DATA["scenes"]:
        sid = sc["id"]
        hosts.append(
            f'      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" '
            f'data-start="{sc["start"]}" data-duration="{durs[sid]}" data-track-index="1" data-track-kind="graphics" '
            f'data-width="1920" data-height="1080"></div>'
        )
    hosts = "\n".join(hosts)
    return f"""<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      @font-face {{ font-family: "Gothic A1"; font-weight: 500; src: url("assets/fonts/GothicA1-Medium.ttf"); }}
      @font-face {{ font-family: "Black Han Sans"; font-weight: 400; src: url("assets/fonts/BlackHanSans-Regular.ttf"); }}
      :root {{ --ground: #1E2125; --ink: #E9E5DD; --amber: #F0A23B; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }}
      #root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; }}
      #grain {{ position: absolute; inset: -200px; z-index: 50; pointer-events: none; opacity: 0.07;
        background-image: url("assets/grain.png"); background-size: 512px 512px; mix-blend-mode: overlay; }}
      #vignette {{ position: absolute; inset: 0; z-index: 51; pointer-events: none;
        background: radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1920" data-height="1080">
{hosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{TOTAL}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:60"></div>
{sfx_tags()}
{voice_tags()}
      <div id="grain-wrap" data-layout-ignore style="position:absolute;inset:0;overflow:hidden;z-index:50;pointer-events:none"><div id="grain"></div></div>
      <div id="vignette" data-layout-ignore></div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      tl.fromTo("#grain", {{ backgroundPosition: "0px 0px" }}, {{ backgroundPosition: "-{int(TOTAL * 12) * 137}px {int(TOTAL * 12) * 89}px", duration: {TOTAL}, ease: "steps({int(TOTAL * 12)})" }}, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


def main():
    (ROOT / "compositions").mkdir(exist_ok=True)
    durs = {sc["id"]: write_scene(sc) for sc in DATA["scenes"]}
    (ROOT / "compositions" / "captions.html").write_text(captions_comp(), encoding="utf-8")
    (ROOT / "index.html").write_text(index(durs), encoding="utf-8")
    print("built", len(durs), "scenes,", TOTAL, "s")


if __name__ == "__main__":
    main()
