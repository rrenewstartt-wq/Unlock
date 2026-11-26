"""Generate index.html and compositions/*.html from data/script.json (generic; scenes live in scenes.py).

Run: python3 -I data/build_script.py && python3 -I build.py
Scene bodies live in scenes.py (one function per scene id).
"""
import json
import pathlib

import scenes as S
import scenes_kit as K

ROOT = pathlib.Path(__file__).parent
DATA = json.loads((ROOT / "data" / "script.json").read_text(encoding="utf-8"))
TOTAL = DATA["total"]

# Caption skin: scenes.py may set CAPTION_SKIN = "unlock" (the reference: no box, white text with a shadow only, 48 px,
# glyph bottom 55 px above the frame bottom; docs/reference-look.md §1). Default "classic" = the look every episode had.
CAPTION_SKINS = {
    "classic": {"bottom": 74, "span": "font-size: 40px; line-height: 1.25; letter-spacing: -0.01em; color: #F6F3EE; padding: 6px 18px 8px;\n"
                "      text-shadow: 0 0 3px rgba(0,0,0,.95), 0 2px 10px rgba(0,0,0,.85), 0 0 22px rgba(0,0,0,.55);",
                "enter": "{opacity:0,y:8}", "to": "{opacity:1,y:0,duration:0.22,ease:\"power3.out\"}"},
    "unlock": {"bottom": 41, "span": "font-size: 48px; line-height: 1.2; letter-spacing: -0.01em; color: #FFFFFF; padding: 0;\n"
               "      text-shadow: 0 1px 2px rgba(0,0,0,.85), 0 0 8px rgba(0,0,0,.55), 0 0 22px rgba(0,0,0,.35);",
               "enter": "{opacity:0}", "to": "{opacity:1,duration:0.12,ease:\"power1.out\"}"},
}
# vars(S), not getattr: a scenes.py with a module __getattr__ (the template's placeholder fallback) answers every name.
CAPTION_SKIN = vars(S).get("CAPTION_SKIN", "classic")
# CSS film layers over the whole frame (#grain, #vignette). scenes.py may set INDEX_FILM_LAYERS = False when every scene
# is graded by the film kit's `look` (thumbkit/LOOK.md: the grade already adds vignette + grain, so they would be doubled).
INDEX_FILM_LAYERS = vars(S).get("INDEX_FILM_LAYERS", True)


def local_cues(sc):
    return [round(c["start"] - sc["start"], 2) for c in sc["captions"]]


def write_scene(sc):
    sid = sc["id"]
    dur = round(sc["end"] - sc["start"], 2)
    body = getattr(S, sid)(sid, dur, local_cues(sc))
    (ROOT / "compositions" / f"{sid}.html").write_text(body, encoding="utf-8")
    return dur


def captions_comp():
    sk = CAPTION_SKINS[CAPTION_SKIN]
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
                f'tl.fromTo("#cap-{i} span",{sk["enter"]},{sk["to"]},{c["start"]});'
                f'tl.to("#cap-{i} span",{{opacity:0,duration:0.14,ease:"power2.in"}},{round(c["end"] - 0.14, 2)});'
            )
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap {{ position: absolute; left: 0; right: 0; bottom: {sk["bottom"]}px; text-align: center; }}
    .cap span {{
      display: inline-block; font-family: "Gothic A1", sans-serif; font-weight: 500;
      {sk["span"]}
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


def cards_comp():
    """Title cards that must outlive a scene cut: scenes.py may define title_cards(DATA) -> [dict(at=<absolute s>, title=...,
    sub=..., hold=..., sub_at=<absolute s>, cursor=...)]. Same card as scenes_kit.title_card, on its own layer above every
    scene. Returns None when the episode has none (the default: index.html is unchanged)."""
    cards = vars(S)["title_cards"](DATA) if "title_cards" in vars(S) else []
    if not cards:
        return None
    markup, css, tweens = [], "", []
    for n, c in enumerate(cards):
        m, cs, tw = K.title_card("cards", c.pop("at"), c.pop("title"), n=n, **c)
        markup.append(m)
        css = cs
        tweens.append(tw)
    return f"""<template>
  <style>
{K.FONTS}
    #root {{ position: absolute; inset: 0; pointer-events: none; font-family: "Gothic A1", sans-serif; }}
{css}
  </style>
  <div id="root" data-composition-id="cards" data-width="1920" data-height="1080">
{chr(10).join(markup)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tweens)}
    window.__timelines["cards"] = tl;
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


def index(durs, cards=False):
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
{CARDS_HOST if cards else ""}      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{TOTAL}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:60"></div>
{sfx_tags()}
{voice_tags()}
{FILM_LAYERS if INDEX_FILM_LAYERS else ""}    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
{grain_tween() if INDEX_FILM_LAYERS else ""}      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


FILM_LAYERS = ('      <div id="grain-wrap" data-layout-ignore style="position:absolute;inset:0;overflow:hidden;z-index:50;pointer-events:none"><div id="grain"></div></div>\n'
               '      <div id="vignette" data-layout-ignore></div>\n')


def grain_tween():
    n = int(TOTAL * 12)
    return (f'      tl.fromTo("#grain", {{ backgroundPosition: "0px 0px" }}, {{ backgroundPosition: "-{n * 137}px {n * 89}px", '
            f'duration: {TOTAL}, ease: "steps({n})" }}, 0);\n')


CARDS_HOST = (f'      <div id="cards" data-composition-id="cards" data-composition-src="compositions/cards.html" data-start="0" '
              f'data-duration="{TOTAL}" data-track-index="10" data-track-kind="graphics" data-width="1920" data-height="1080" '
              f'style="z-index:55"></div>\n')


def main():
    (ROOT / "compositions").mkdir(exist_ok=True)
    durs = {sc["id"]: write_scene(sc) for sc in DATA["scenes"]}
    (ROOT / "compositions" / "captions.html").write_text(captions_comp(), encoding="utf-8")
    cards = cards_comp()
    if cards:
        (ROOT / "compositions" / "cards.html").write_text(cards, encoding="utf-8")
    (ROOT / "index.html").write_text(index(durs, cards=bool(cards)), encoding="utf-8")
    print("built", len(durs), "scenes,", TOTAL, "s")


if __name__ == "__main__":
    main()
