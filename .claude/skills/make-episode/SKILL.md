---
name: make-episode
description: 해외 실화 미제사건 한 편을 레퍼런스(@unlock_kr) 동급으로 만든다. 제작 팀(대본·연출·3D 세트·실제 자료·소리·검수·판정)을 관문마다 돌려 사건 선정 → 사실 조사 → 대본 → 화면 설계 → 3D·도식 장면 → 검수 → 음성·음악 → 렌더 → 썸네일 → 최종 판정까지. "에피소드 만들어줘", "다음 편", 사건 이름을 주며 제작을 요청할 때 사용.
---

# /make-episode [사건 slug | 길이(예: 12분, 시험편 3분)]

목표는 `docs/quality-bar.md` 다. 각 단계는 **만드는 팀원 → 검수 팀원 → 관문** 순서이고, 관문을 못 넘으면 다음 단계로 가지 않는다.
기준 문서: `docs/quality-bar.md`, `docs/script-formula.md`, `docs/visual-style.md`, `docs/originality.md`, HyperFrames `/hyperframes` 스킬(렌더 계약).
참고 구현: `episodes/ep01-somerton`(3분 시험편, 해변 세트는 film 키트).
기본 길이는 **16~20분**(`docs/competitor-report.md`). 사용자가 시험편을 원하면 3분, 그때는 검사에 `--test`.

팀 구성과 인계 규칙은 `docs/teams.md`. 메인 세션이 쇼러너(팀 호출·파일 인계·관문·사람 결정).

| 단계 | 팀 | 만드는 팀원 | 검수 | 관문 |
|---|---|---|---|---|
| 0 사건 | 리서치·작가 | `/scout` → `/plan` (`episode-planner`) | `source-verifier`, `risk-reviewer` | **사람이 기획안 승인** |
| 1 사실 | 리서치 | 쇼러너 + `source-verifier` | `source-verifier` | facts.md 에 자막이 될 사실마다 출처·상태 |
| 2 대본 | 작가 | `script-writer` | `script-critic` | parity 대본 영역 ✅ + critic 합격 + **사람 승인** |
| 3 설계 | 아트 | `storyboard-director` | 쇼러너 | SPEC.md SHOTS(3D/도식/기록 배분, 자막마다 컷, 기록 3초 위치), `data/shots.json` |
| 4 자료 | 리서치 | `archive-researcher` | `risk-reviewer`(인물·시신 사진) | SOURCES.md 라이선스 근거, 핵심 장면마다 사진 또는 못 쓴 이유 |
| 5 장면 | 아트 | `set-builder`(3D, 세트마다 동시에) + `diagram-builder`(도식) + 쇼러너(기록 장면) | `visual-critic` | check 오류 0 + P0 0개 |
| 6 편집 | 포스트 | `editor` | parity 화면 영역 | 정지 12초 초과 0, 기록 3초 컷 2~3분마다 |
| 7 소리 | 포스트 | `sound-designer` | 쇼러너 | 내레이션 반영(**사람 녹음**), 큐 시트, 음악 출처(**사람 결정**) |
| 8 사실 | QA | — | `fact-checker` | ❌ 0, ⚠️ 0 (렌더 전) |
| 9 렌더 | 포스트 | 쇼러너 | `sound-designer`(측정), `visual-critic`(완성본 프레임) | parity 렌더 실측 ✅ |
| 10 썸네일 | 썸네일 | `/thumbnail` 팀 | `thumb-critic`, `thumb-copy-critic` | 통과안 2~3개, upload.json |
| 11 판정 | QA | — | `parity_check --strict` + `parity-judge` | **전 영역 "동급"이어야 "완성"** |
| 12 회고 | 전략 | `performance-analyst`(업로드 2주 뒤) | `/retro` | 고칠 것에 담당·기한 |

## 0. 사건
기획안(`data/topics/plans/<slug>.md`)이 있으면 그것에서 시작한다. 없으면 `/scout` → `/plan`. 이미 만든 편과 벤치마크 채널이 다룬 사건은 피한다.

## 1. 뼈대 + 사실
```bash
python3 scripts/new_episode.py ep0N-<slug> "<제목>"
```
`data/facts.md` 에 1차 자료(판결문, 공식 발표, 당시 보도, 기관 기록)로 사실을 모은다. 16~20분은 단서 8~12개 분량이 필요하다: 사실이 모자라면 길이를 줄이자고 사용자에게 말한다(지어내지 않는다).

## 2. 대본
`script-writer` 에게 slug·기획안·길이를 넘긴다 → `script-critic` 에게 검수 → 수정 반복(최대 3회).
```bash
cd episodes/<ep> && python3 data/build_script.py && python3 ../../scripts/parity_check.py .
```
대본 영역이 모두 ✅(분당 글자는 내레이션 전 보류)이고 critic 이 합격이면 **대본과 제목 후보를 사용자에게 보여 주고 승인받는다.**

## 3. 화면 설계
`storyboard-director` → `SPEC.md` 의 SHOTS 표. 확인: 3D 35~65%, 도식 25~45%, 실제 자료 3장면 이상, 한 화면 12초 이하, 장면당 앰버 초점 하나.

## 4. 실제 자료
**핵심 장면은 실제 사진이 먼저다**(`docs/quality-bar.md` "핵심 장면"). `archive-researcher` 에게 `data/shots.json` 의 핵심 장면과 SHOTS 의 요청 목록. 결과 `assets/archive/` + `SOURCES.md`. 못 찾은 것은 도식으로 바꾸도록 SHOTS 를 고친다.

## 5. 장면
- 3D: `set-builder` 가 세트별로 film 키트 세트를 짓는다(세트가 여러 개면 세트마다 따로 맡겨 동시에). 기본 도형 마네킹(`world.js makeFigure`) 금지.
- 도식: `diagram-builder` 가 `scenes.py` 에 쓴다(`wrap` + GSAP, 보드 바탕 + 사람 카드, 도식 원칙 7개). 3D 와 동시에 맡긴다(같은 함수를 둘이 고치지 않게 장면을 나눈다).
- 실제 사진: 핵심 장면은 `archive_scene(sid, dur, q, shots)`(scenes_kit) — 기록 룩·느린 밀기·앰버 동그라미·`기록` 표기·출처 한 줄.
- 효과음은 `sfx_events(DATA)` 에 화면 원인 있는 것만.
- `python3 build.py` → `npx hyperframes check` 오류 0 → `visual-critic` → P0 를 고치고 다시(같은 장면 3번 실패면 멈추고 보고).

## 6. 편집
`editor`: 정지 구간 표 → 컷 추가·기록 3초 컷 배치·전환·효과음 → `build.py` → check 오류 0 → parity 화면 영역 재측정. 대본·사실은 바꾸지 않는다.

## 7. 소리
`sound-designer`: 내레이션(사용자가 Colab 에서 본인 목소리 생성 → import → 다시 build), 음악 큐 시트. 음악 곡과 출처는 **사용자가 정한다**.
내레이션이 아직이면 9단계 렌더는 "검토용"으로 하고, 최종 판정은 미달(소리)로 남긴다.

## 8. 사실(렌더 전)
`fact-checker`: 화면에 나오는 모든 글자와 그림 세부를 facts.md·1차 자료로 대조. ❌ 이나 ⚠️ 가 남으면 렌더하지 않고 고친다(작가팀·아트팀으로 돌려보냄).

## 9. 렌더
```bash
npx hyperframes render -o renders/<ep>.mp4          # 백그라운드로 실행, 끝나면 알림
python3 ../../scripts/parity_check.py .              # 렌더 실측: 화면 변화율·컷 길이·음량
ffmpeg -i renders/<ep>.mp4 -c:v libx264 -crf 25 -maxrate 9M -bufsize 18M -c:a copy -movflags +faststart renders/<ep>-preview.mp4
```
완성본에서 장면마다 프레임을 뽑아 직접 본다. 미리보기본을 사용자에게 보낸다.

## 10. 썸네일 + 업로드 정보
`/thumbnail episodes/<ep>`. 그리고 `upload.json`: `{"title": 제목 공식 중 하나, "description": "", "tags": [한국어 + 일본어 8개 이상]}`.

## 11. 판정
```bash
python3 scripts/parity_check.py episodes/<ep> --strict     # ❌ 가 하나라도 있으면 실패(사람 결정 예외는 data/exceptions.json)
```
그다음 `parity-judge` 에게 slug 와 각 검수 보고(script-critic, visual-critic, editor, fact-checker, thumb-critic, sound-designer)를 넘긴다. **전 영역 "동급"일 때만 "완성"이라고 보고한다.** 아니면 판정표(영역 | 판정 | 담당 | 고칠 방법)를 그대로 보고하고 다음 할 일을 제안한다.

## 12. 회고
업로드 2주 뒤 사람이 YouTube Studio 내보내기를 `data/performance/<ep>/` 에 넣으면 `performance-analyst` → `/retro`.

## 보고
길이, 장면 구성(종류별 %), parity 표, visual-critic P0/P1, 측정값(음량은 "측정, 듣지 않음"), ⚠️ 로 남은 사실, 사람 결정 대기, parity-judge 결론.
원본 렌더는 커밋하지 않는다. 만든 파일은 단계마다 커밋한다(클라우드 세션은 재시작되면 커밋하지 않은 파일이 사라진다).
