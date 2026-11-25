# 화면 글자·도식 부품 (레퍼런스 문법) — motion-designer

기준: `docs/reference-look.md` 1절(숫자)·2절 6~9번. 시험장: `episodes/lab-look/`(scenes.py, assets/lib/overlay_road.js).
기존 부품(이름표, `archive_insert`, 기록 띠, 기본 자막)은 그대로다. 아래는 **새 함수·새 옵션**이고, 쓰지 않으면 아무것도 바뀌지 않는다.

## 1. 제목 카드 — `scenes_kit.title_card`
```python
m, css, tw = title_card(sid, at, "1999년 9월 9일 목요일", "어느 해안 마을", hold=dur - 0.3, sub_at=q[1] + 0.2, cursor=0.6)
return scene3d(sid, dur, "set", "createSet", opts, overlay=m, tweens=tw, css=css)
```
- 왼쪽 아래, 한 글자씩 타자(`cps` 0.065 s/자), 끝에 ▌ 커서(20×40 px, 타자 뒤 `cursor` 초 깜빡이고 꺼짐), 제목 뒤 1px 선이 왼쪽부터 그어지고(461 px), 보조 줄이 `sub_at`에 타자.
- 인물 카드도 같은 함수: `title_card(sid, q[0] + 0.35, "민지", "스무 살", cursor=4.0)`.
- 한 장면(clip 하나) 안에서는 카메라 컷(`cam_shots`)이 바뀌어도 남는다. **장면 경계를 넘는 카드**는 scenes.py 에
  `def title_cards(DATA): return [dict(at=<절대 초>, title=..., sub=..., sub_at=<절대 초>, hold=...)]` → build.py 가 `compositions/cards.html`(모든 장면 위 층)을 만든다.
- 글자: 제목 Gothic A1 Bold 41px(글자 높이 38px), 보조 Gothic A1 Medium 28px(#E4E2DF). 숫자는 `TITLE_CARD` 에 있다(레퍼런스 측정값에 맞춘 상자 값).

## 2. 자막 스킨 — `CAPTION_SKIN`
scenes.py 에 `CAPTION_SKIN = "unlock"` → 상자 없는 흰 글자(그림자만) 48px, 가운데, 글자 아래 끝이 바닥에서 54px, 0.12 s 페이드.
없으면 `"classic"`(지금까지의 자막, 그대로).

## 3. 3D 공간 도식 — `thumbkit/overlay3d.js` (film 키트와 함께 `python3 scripts/kit3d.py episodes/<ep>` 로 복사)
```js
import { film } from "../kit3d/film.js";
import { measure, route, label3d, pin, play, setAccent } from "../kit3d/overlay3d.js";
// setAccent("#F0A23B");                       // 강조색은 ACCENT 하나(기본 빨강 #E0352B, 앰버/빨강은 사람 결정 대기)
const m = await measure(f, [0, 0, 8], [0, 0, -22], { label: "30m", start: 0.6, dur: 1.5, labelSize: 2.2, labelHeight: 2.2 });
const p = await pin(f, [0, 0, -22], { start: 2.0, height: 2.2 });
const r = await route(f, [[-1.6, 0, 14], [-1, 0, -6], [2.2, 0, -26]], { start: 3.4, dur: 2.0, dash: [1.2, 0.8] });
const marks = play(m, p, r);
return (t) => { f.shot(opts.camera, t); marks(t); };   // 카메라 먼저(라벨이 카메라를 본다)
```
| 함수 | 하는 일 | 주요 옵션 |
|---|---|---|
| `measure(f, a, b, o)` | 바닥 위 빛나는 선이 a→b 로 그려지며 늘어남 + 양끝 눈금 + 큰 숫자 | `start` `dur` `label` `labelSize`(글자 높이 m) `labelHeight` `labelAt` `width` `glow` `ticks` `until` `onTop` |
| `route(f, pts, o)` | 점들을 잇는(부드럽게) 경로가 그려짐, 점선 가능 | `start` `dur` `smooth` `dash:[on,off]` `width` `until` |
| `label3d(f, pos, text, o)` | 장면 안에 선 큰 흰 글자(기본 카메라를 봄, 지붕에 안 가려짐) | `size` `face:"camera"\|"up"\|[rx,ry,rz]` `start` `until` `onTop`(기본 true) |
| `pin(f, pos, o)` | 서는 핀(가는 기둥+빛나는 머리) + 바닥 고리 한 번 | `start` `height` `head` `label` `until` |
| `play(...marks)` | 표시들을 한 번에 `t`로 맞추는 갱신 함수 | |
모두 `await` 로 만들고(글꼴 로드), `.at(t)` 는 t 의 순수 함수다(결정적). 선·핀은 톤매핑·안개를 받지 않아 어두운 장면에서도 같은 색으로 빛난다.

## 4. 실제 사진 룩 — `archive_scene(..., look="unlock")`
```python
archive_scene(sid, dur, q, [{"src": "assets/archive/x.jpg", "at": 0, "size": (1920, 1440),
    "crop": (0.06, 0.28, 0.94, 0.94), "push": (1.0, 1.07), "credit": "사진: … , CC0"}], look="unlock")
```
전체 화면(cover), `UNLOCK_GRADE`(HyperFrames media treatment: 채도 −0.7, 차가운 쪽, 그레인 0.38, 비네트 0.42), 느린 밀기, 테두리·꼬리표·설명 줄 없음,
출처 한 줄만 오른쪽 위 22px. `crop` = 화면을 채울 원본 부분(필름 테두리·손글씨 잘라 내기). 샷마다 `grade` 로 바꿀 수 있다.
기본 `look="board"` 는 지금까지와 같다.

## 5. 위성 지도 줌 — bake-basemap
```bash
cd <hyperframes 스킬>/scripts && NODE_PATH=<npx>/node_modules CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  NAME=<이름> STYLE=satellite CENTER="lng,lat" ZSTART=11 ZEND=16 DUR=3 HOLD=0.6 OUT=<ep>/assets/maps node bake-basemap.mjs
```
3초 90프레임 ≈ 1분, 1920×1080 all-intra MP4 25MB(커밋하지 않는다). 우주에서 내려오기는 `PROJECTION=globe FROM=… ZSTART=1.85`.
장면에서는 `<video muted>` 로 깔고 같은 `UNLOCK_GRADE` 를 `data-color-grading` 으로, 핀·라벨은 `-coords.json` 좌표로 SVG 에 그린다.
화면에 "Esri, Maxar, Earthstar Geographics" 표기(작게, `data-layout-ignore`).
