# actors.js — 옷 입고 걷는 인물 (film 키트)

레퍼런스(reference-look.md 2절 5번)처럼 옷·머리카락이 있고 실제로 걷는 인물. 기존 `f.figure()`(정지 포즈)는 그대로 두고 새로 더한 것이다.
자산: Quaternius Universal Base Characters(몸·머리카락) + Universal Animation Library 1·2(동작), 모두 CC0 — `ASSETS.md`.
준비: `python3 scripts/thumb_assets.py actors` → `python3 scripts/kit3d.py episodes/<ep>` (kit3d.json 에 `figure:quaternius` 가 있으면 함께 복사됨).

## API
```js
import { actor, faceBlur, KINDS, CLIPS } from "../kit3d/actors.js";
const a = await actor(f, kind, opts);   // f = film() 의 Film 객체. 장면에 추가된 인물을 돌려준다
a.pose(t);                              // 매 프레임: 동작·위치를 t 의 순수 함수로 정한다 (action.time + mixer.update(0), 시계 없음)
a.at(t)      → { pos, yaw, s }          // 경로 위 위치(포즈 없이) — 카메라 계산용
a.follow(t, { back, height, side, ahead, lookY }) → { pos, look }   // 뒤에서 따라가는 카메라 값
a.faceScreen(cam, w, h) → { x, y, r, facing }                       // 얼굴 화면 위치
const blur = faceBlur(f, [a, b], { px: 7 });  blur(t);              // 얼굴 흐림(CSS backdrop blur 원판), 카메라 설정 뒤 매 프레임
a.root / a.bone("Head") / a.meshes / a.stride / a.speed
```
opts
- 위치: `pos: [x,y,z]` + `yaw`(라디안, 0 = +z 를 봄) 또는 `lookAt: [x,z]` · 앉기: `seat: [x, 좌판윗면y, z]`(좌판 0.42~0.47 m 에 맞춤)
- 걷기: `path: [[x,z], ...]`(캣멀롬 곡선), `at`(출발 시각), `speed`(1 = 자연 속도 약 0.8~0.95 m/s), `ramp`(가감속 초, 0.6), `walkClip`
  → 보폭은 걷기 동작에서 디딘 발이 뒤로 가는 속도를 재서 맞춘다(디딘 발 미끄러짐 2~3 cm 이하/한 걸음).
- 동작: `clip: "idle"` 또는 `clips: [[t, "clip", 페이드초], ...]`(크로스페이드), `rate`, `offset`(여러 명 엇박)
- 덧동작: `look: [{ t, yaw, pitch?, dur? }]` 돌아보기(상체+목+머리 나눠 돎, yaw + = 인물의 왼쪽), `shake: [[t0, t1, amp?]]` 고개 젓기(앉아서도 됨)
- 얼굴: `face: "plain"`(이목구비 없는 매끈한 얼굴, 기본) · `"dark"`(얼굴 어둡게) · `"blur"`(plain + `faceBlur()` 로 흐림)
- 생김새: `colors: { skin, hair, top, bottom, skirt, legwear, shoes, belt, shirt, tie }`, `hair: "bob"|"long"|"buns"|"parted"|"short"`, `scale`, `slim`(어깨 폭 비율)

## 인물 종류 (KINDS)
| kind | 몸 | 옷 | 머리 |
|---|---|---|---|
| `schoolgirl` | 여 0.9 | 흰 긴소매 블라우스(칼라) + 남색 주름 무릎 치마 + 남색 무릎 양말 + 로퍼 | 단발(bob) |
| `woman` | 여 | 블라우스 + 종아리 치마 | 긴 머리 |
| `woman_sweater` | 여 | 스웨터(밑단·소매 립) + 바지 | 올림 머리 |
| `man_shirt` | 남 | 셔츠(칼라, 바지 안으로) + 바지 + 벨트 | 가르마 |
| `man_sweater` | 남 | 크루넥 스웨터(밖으로) + 바지 | 가르마 |
| `man_jacket` | 남 | 짧은 재킷 + 셔츠 V·넥타이(셰이더) + 바지 | 짧은 머리 — **기초 수준**: 가까이서는 V 가 그림처럼 보임 |

## 동작 (CLIPS)
`idle` 서기(숨쉬기) · `walk` 걷기 · `walkFormal` · `talk` 서서 말하기 · `sit` 앉기(숨쉬기) · `sitTalk` 앉아 말하기 · `sitDown` 앉는 동작 · `standUp` ·
`no` 고개 젓기(서서) · `yes` 끄덕이기 · `foldArms` 팔짱 · `phone` 통화 · `interact` 손 뻗기(문·스위치) · `pickUp` · `kneel` · `crouch` · `carry` 상자 들고 걷기 · `lean` 난간 기대기.
덧동작: `look`(돌아보기), `shake`(고개 젓기, 어느 동작 위에나).

## 예: 걸어가는 여학생 뒷모습 따라가기 (lab-look `assets/lib/actor_walk.js`)
```js
import { film, THREE } from "../kit3d/film.js";
import { actor } from "../kit3d/actors.js";
export function createWalk(stage, opts) {
  return film(stage, "walk", { exposure: 1 }, async (f) => {
    // ... 바닥·벽·빛 ...
    const girl = await actor(f, "schoolgirl", { path: [[0.2, 0.5], [0.3, -3.5], [0.4, -6.8]], at: 0.5,
      look: [{ t: 3.0, yaw: 1.1, dur: 0.7 }] });            // 3초에 뒤를 돌아본다
    return (t) => {
      girl.pose(t);
      const c = girl.follow(t, { back: 3.4, height: 1.5, side: 0.2, lookY: 0.55 });
      f.cam.position.set(...c.pos); f.cam.lookAt(...c.look);
    };
  });
}
```
회의실(앉은 둘 + 선 하나, 얼굴 흐림): `assets/lib/actor_meeting.js`.

## 알아둘 것
- 옷은 몸 메시에서 잘라 묶음 포즈(T자)에서 재단한다(소매·바짓가랑이는 매끈한 관, 몸통은 가슴에서 늘어뜨림, 밑단 띠, 셔츠 칼라는 목 구멍을 따라 생성).
  옷 밑 피부는 지우므로 어떤 동작에서도 살이 옷을 뚫고 나오지 않는다. 치마는 골반+허벅지에 묶인 고리 메시다.
- 남은 한계: 무릎을 높이 드는 순간 치마 앞단에 무릎이 살짝 비친다 · 밑단 가장자리가 가까이서 약간 들쭉날쭉 · 남자 몸은 여전히 건장한 편 ·
  손가락은 동작 그대로 · 얼굴은 이목구비가 없으니 가까운 정면은 `blur`/`dark` 나 뒷모습으로.
- 비용(SwiftShader CPU, 1920×1080, 4코어, 다른 작업과 함께 측정): 인물 1명 장면 프레임당 약 0.3~0.6초, 3명 회의실 약 0.6~0.9초.
  인물을 숨긴 같은 장면과 차이가 측정 잡음 안에 있었다(비용은 대부분 화면 채우기·그림자). 짓기(로드·재단) 인물당 약 1초.
