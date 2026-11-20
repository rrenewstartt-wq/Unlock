---
name: make-episode
description: 해외 실화 미제사건 한 편을 사건 선정 → 사실 조사 → 대본 → 3D·도식 장면 → 검수 → 렌더 → 썸네일까지 만든다. "에피소드 만들어줘", "다음 편", 사건 이름을 주며 제작을 요청할 때 사용.
---

# /make-episode [사건 이름 | 길이(예: 3분, 12분)]

기준 문서를 먼저 읽는다: `docs/script-formula.md`, `docs/visual-style.md`, `docs/originality.md`, 그리고 `/hyperframes` 스킬.
참고 구현은 `episodes/ep01-somerton`(장면 함수·3D 세트·효과음 배치).

## 1. 사건 고르기
기획안(`data/topics/plans/<slug>.md`)이 있으면 그것에서 시작한다. 없으면 `/scout` → `/plan` 을 먼저 돌린다.
(팀을 쓸 수 없을 때만) 후보 3개를 표로 보여준다(사건, 몇 년 만에 무엇이 밝혀졌나, 생존 관련자·명예훼손 위험, 1차 자료 유무). 사용자가 고른다.
"알아서"면 위험이 가장 낮고 자료가 가장 많은 것. 이미 만든 에피소드와 벤치마크 채널이 다룬 사건은 피한다
(`data/benchmark/*/summary.json` 의 제목).

## 2. 사실 조사 → `data/facts.md`
1차 자료(판결문, 공식 발표, 당시 보도, 기관 기록)를 우선한다. 웹 페이지는 web-fetch 로 읽고, 범위가 넓으면 deep-research.
자막이 될 사실마다 출처와 상태(✅ 원문 확인 / ⚠️ 요약·2차 자료)를 적는다. 확정되지 않은 사인·범인은 "모른다"로 둔다.

## 3. 뼈대 + 대본
```bash
python3 scripts/new_episode.py ep0N-<slug> "<제목>"
```
`data/script.txt` 를 7단계 공식으로 쓴다(장면 id 는 내용으로: beach, evidence, dna …). 제목은 제목 공식에서 고르되
"풀린"은 실제로 풀렸을 때만. `python3 data/build_script.py` 로 길이를 보고 요청 길이(±10%)에 맞춘다.
대본과 제목을 사용자에게 보여준다. 고칠 점을 받으면 반영하고, "진행"이면 다음으로.

## 4. 장면
- `SPEC.md` 를 ep01 처럼 채운다(숫자로: 색, 글자 크기, 장면별 hero 동작과 자막 시각).
- `scenes.py` 에 장면 함수. 3D 재연은 `assets/lib/<세트>.js`(world.js 의 makeFigure·cameraAt 사용) + `scene3d(...)`,
  도식은 `wrap(...)` + GSAP. 요소는 자막 시각 `q[i]` 에 맞춰 등장. 도식 원칙 7개를 지킨다.
- 3D 장면은 `cam_shots` 로 자막마다 컷(3~5초). 도식은 보드 바탕 + 사람 카드(`person_card`).
- 효과음은 `sfx_events(DATA)` 에 화면 원인이 있는 것만.
- `python3 build.py` → `npx hyperframes check` 오류 0.

## 5. 검수 → `/review`
장면마다 프레임을 보고 도식 원칙·사실·글자 크기를 확인, 고친 뒤 다시 check.

## 6. 렌더 + 미리보기
```bash
npx hyperframes render -o renders/<ep>.mp4          # 백그라운드로 실행, 끝나면 알림
ffmpeg -i renders/<ep>.mp4 -c:v libx264 -crf 25 -maxrate 9M -bufsize 18M -c:a copy -movflags +faststart renders/<ep>-preview.mp4
```
완성본에서 장면마다 프레임을 뽑아 확인하고 음량을 측정한다. 미리보기본을 사용자에게 보낸다.

## 6.5 내레이션 (사용자가 원할 때)
`docs/voice.md`: `python3 scripts/voice.py pack episodes/<ep>` → 사용자가 Colab 노트북으로 생성 → `voice.py import` → 다시 build·check·렌더.

## 7. 썸네일
`/thumbnail episodes/<ep>` — 썸네일 팀(thumb-director → thumb-builder → thumb-critic)이 컨셉 3~4개 → 2~3안 제작 → 검수.
기준은 `docs/thumbnail-formula.md`. 글자 없는 기본안과 글자판을 함께 보낸다.

## 보고
길이, 장면 구성, 확인한 것(check, 프레임, 음량 측정값), ⚠️ 로 남은 사실, 남은 어색한 점. 원본 렌더는 커밋하지 않는다.
