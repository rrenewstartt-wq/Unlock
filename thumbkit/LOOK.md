# 레퍼런스 룩 키트 (film 키트 `look`)

기준: `docs/reference-look.md`(숫자·문법). 코드: `thumbkit/look.js`(+ `film.js` 연결). 에피소드로 복사: `python3 scripts/kit3d.py episodes/<ep>`.
`look` 을 안 쓰는 세트는 예전과 똑같이 그려진다(ep02 그대로).

## API (3절 "도구" 칸)
| 도구 | 쓰는 법 |
|---|---|
| `look` 프리셋 | `film(stage, key, { look: "unlock-day" \| "unlock-night" \| "unlock-interior", dof?, grade?, accent? }, build)` — 톤 매핑·노출·환경광·안개·배경·그레이드를 한 번에. 직접 준 옵션이 이긴다. 환경광은 HDRI 평균을 잰 반구광(`ambient`)으로 깐다(IBL 을 화소마다 돌리면 SwiftShader 에서 프레임당 +1.4초). HDRI 는 `f.envTex` 로 남아 금속·유리 반사에만 쓴다(`material.envMap = f.envTex`). `ambient: null` 이면 예전 IBL |
| 해 + 잎 그림자 | `f.sun({ azimuth, elevation, target, size, intensity?, color?, leaves: {…} \| false })` → 멀리 둔 스포트 "해"(+ 고보) |
| `f.leafShadows()` | `f.leafShadows({ sun: 스포트|[x,y,z], target, size, density, leaf, soft, sway, seed, bias, lit })` — 시드 고정 절차 잎 텍스처를 `SpotLight.map` 으로. `size`=해가 드는 원 지름(m, 컷 전체가 이 안에), `density` 1~2(그늘 속 햇빛 반점), `leaf` 잎 길이(m, 근접 0.34·부감 0.46), `lit` 주인공을 햇빛 구멍에 |
| 그레이드(후처리) | 자동(`look` 을 쓰면 켜짐). 장면 → HDR 버퍼 → [심도] → 한 패스: ACES → 채도(주인공만 더) → 그림자 푸른 기 → 감마 → 하이라이트 어깨(knee→ceiling, 0.58) → 비네트 → 그레인(프레임 번호 시드). `grade: { saturation, heroSaturation, shadowTint, tint, gamma, knee, ceiling, vignette, grain, black }` 로 덮어쓰기. **결정적**: 같은 t → 같은 바이트(같은 프레임 두 번 찍어 md5 같음 확인) |
| 주인공 소재 | `f.hero(obj, …)` — 그 재질만 색을 지킨다(heroSaturation). 나무문·황동 손잡이처럼 컷마다 하나 |
| 클레이 재질 | `await f.clay("wall" \| "block" \| "ground" \| "#hex", { tex: "clay_plaster" })` — 텍스처는 요철만, 색은 `CLAY` 팔레트 |
| 심도 | `film(..., { dof: true })` + 카메라 키 `{ focus: m, aperture: f값 }`. 24 mm 센서 얇은 렌즈 식, 반 해상도 40탭 모음, 최대 반경 26 px. aperture 0 이면 그 프레임은 심도 패스를 건너뛴다 |
| 카메라 프리셋 | `cam.aerialDescend / approach / macroPush / followBack / lateralDrift({ target, t0, t1, … })` → 키 배열. `f.shot()` 에 키 대신 `{ preset: "approach", … }` 또는 그 목록(컷 사이 하드 컷)을 넘겨도 된다 → scenes_kit 에서 JSON 으로 바로 씀. 모두 t0~t1 내내 움직이고 끝에서 부드럽게 감속(`ease: "glide"`) |
| 강조색 | `ACCENT` = 빨강 `#D8382E`(사람 결정 2026-11-25). 앰버는 `ACCENT_AMBER` `#F0A23B` 로 남김. 필름별로 `accent` 옵션 → `f.accent`. look 을 안 쓰는 film() 은 영향 없음. ※ `overlay3d.js` 는 자기 `ACCENT` `#E0352B` 를 따로 가진다 — 한 값으로 맞출지 정해야 한다 |
| 검사 | `python3 scripts/look_check.py <png|mp4>` |

카메라 프리셋 인자(각도는 도, azimuth 0 = 대상의 +z 쪽에서 −z 를 봄):
- `aerialDescend({ target, azimuth, orbit, height:[시작,끝], dist:[시작,끝], fov:[…], lookLift })` 부감에서 내려오며 밀고 조금 돈다
- `approach({ target, azimuth, from, to, height, drift, lookHeight, fov, aperture? })` 서서 다가가기
- `macroPush({ target, azimuth, elevation, from, to, arc, fov, aperture=4 })` 접사 밀기, 초점은 대상에 고정
- `followBack({ from, to, back, side, height, lookAhead, lookHeight, fov })` 걷는 사람 어깨 너머(사람도 같은 t0·t1, 등속)
- `lateralDrift({ target, azimuth, dist, travel, height, lead, rise, fov })` 벽·창 앞 옆으로 흐르기

## 예제
```js
import { film, THREE, CLAY } from "../kit3d/film.js";
export function createStreet(stage, opts) {
  return film(stage, `street-${stage.id}`, { look: "unlock-day", dof: true }, async (f) => {
    const wall = await f.clay("wall", { tex: "clay_plaster" });
    // … 세트 …
    f.hero(door, knob);
    f.sun({ azimuth: -52, elevation: 24, target: [1.2, 1.4, -0.8], size: 14,
      leaves: { density: 1.7, leaf: 0.34, lit: [[1.87, 0.95, -0.89, 0.6]] } });
    return (t) => f.shot(opts.camera, t);
  });
}
// scenes.py: scene3d(sid, dur, "street", "createStreet",
//   '{"camera": {"preset": "macroPush", "target": [1.87, 0.95, -0.89], "t0": 0, "t1": 4, "azimuth": -34, "aperture": 4.5}}')
```
시험 세트: `episodes/lab-look/assets/lib/look_street.js`(컷 `aerial|approach|macro|follow|window`).
`python3 scripts/set_preview.py episodes/lab-look look_street createLookStreet '{"cut":"macro"}' episodes/lab-look/renders/look/macro.png 0,2,4`

## 주의
- 그레이드가 비네트·그레인을 이미 넣는다. index 의 CSS 그레인·비네트 겹(ep02 `#grain`, `#vignette`)과 같이 쓰면 두 번 들어간다 → `look` 장면에서는 그 겹을 끄거나 그레이드 쪽 `vignette`/`grain` 을 낮춘다.
- 잎 그림자 원(`size`) 밖은 해가 안 든다. 부감은 크게(24 m), 근접은 작게(14 m: 잎 가장자리가 더 또렷).
- 환경광은 일부러 낮다. 그늘이 남색으로 가라앉는 게 룩이다. 실내는 창빛 하나를 따로 둔다.
- `unlock-interior` 는 숫자만 정해 두었고 시험 세트로 찍어 보지 않았다(회의실 세트가 생기면 먼저 잰다).
- 같은 t 는 같은 바이트다(macro t=0 을 두 번 따로 찍어 md5 같음). 그레인은 `round(t·30)` 시드, 잎 흔들림은 t 의 사인.
- 나무 모델(tree_small_02, 206만 삼각형)은 그림자를 안 드리우게 했다(그림자는 고보가 맡는다). 그래도 무겁다.

## 렌더 비용 (SwiftShader, 4코어, 1920×1080, HyperFrames 0.9.59, 3초 = 90프레임)
RENDER_COST_TABLE
