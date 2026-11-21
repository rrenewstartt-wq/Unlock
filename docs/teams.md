# 팀 구성 (2026-11-21)

목표는 하나다: **@unlock_kr 롱폼과 나란히 놓아도 빠지지 않는 한 편**(`docs/quality-bar.md`).
팀은 7개, 팀원은 `.claude/agents/` 의 에이전트다. **메인 세션이 쇼러너**다: 팀을 순서대로 부르고, 팀 사이에 파일을 넘기고, 관문을 지키고, 사람에게 결정을 올린다.

## 원칙
1. **만드는 사람과 검수하는 사람은 다르다.** 모든 산출물은 다른 팀원이 검수한다.
2. **넘기는 것은 파일이다.** 대화로 넘기지 않는다. 아래 표의 "넘기는 것"이 그 팀의 완료 기준이다.
3. **관문을 못 넘으면 다음 팀으로 가지 않는다.** 같은 문제를 3번 고쳐도 안 되면 멈추고 사람에게 올린다. 기준을 낮추지 않는다.
4. **사람만 정할 수 있는 것은 사람에게.** 사건 선택, 대본 승인, 목소리 녹음, 음악 출처, 유료 생성 이미지, 업로드. 사람이 알고 남긴 예외는 `episodes/<ep>/data/exceptions.json` 에 적는다.
5. **"완성"은 QA팀의 parity-judge 가 전 영역 "동급"이라고 할 때만.**

## 팀
| 팀 | 팀원 | 넘겨받는 것 | 넘기는 것(완료 기준) | 관문 |
|---|---|---|---|---|
| **1 전략팀** | `performance-analyst` + `/benchmark`, `scripts/competitors.py` | 레퍼런스·경쟁 채널 공개 데이터, 업로드 후 YouTube Studio 내보내기(사람이 줌) | `docs/benchmark-report.md`, `docs/competitor-report.md`, 편별 성과 보고 `data/performance/<ep>.md`, 기준 수정 제안 | 숫자에 출처, 상관과 인과 구분 |
| **2 리서치팀** | `case-scout`, `source-verifier`, `risk-reviewer`, `archive-researcher` | 지역·테마 요청 / 선정된 사건 / SHOTS 의 자료 요청 | `data/topics/backlog.json`(검증됨), `episodes/<ep>/data/facts.md`, `assets/archive/` + `SOURCES.md`, `data/shots.json` 의 사진 | 1차 자료, 라이선스 근거, 위험 판정 |
| **3 작가팀** | `episode-planner`, `script-writer`, `script-critic` | 검증된 사건, facts.md | `data/topics/plans/<slug>.md`, `data/script.txt`(콜드 오픈 + 7단계, 16~20분) | parity 대본 영역 ✅ + critic 합격 + **사람 승인** |
| **4 아트팀** | `storyboard-director`, `set-builder`, `diagram-builder` | 승인된 대본, `data/script.json`, 자료 | `SPEC.md` SHOTS 표, `assets/lib/<세트>.js`(film 키트), `scenes.py` 의 장면(3D·도식·기록) | 장면마다 스냅샷 확인, `npx hyperframes check` 오류 0 |
| **5 포스트팀** | `editor`, `sound-designer` | 장면이 다 지어진 에피소드 | 컷 리듬·실제 사진 3초 컷 배치·전환·효과음 정리, 내레이션 반영, 음악 큐 시트, 렌더와 미리보기본 | parity 화면·소리·렌더 실측 ✅ |
| **6 썸네일팀** | `thumb-copywriter`, `thumb-copy-critic`, `thumb-director`, `thumb-builder`, `thumb-critic` (`/thumbnail`) | 기획안, facts.md, 기록 사진 | `thumbnail/out/` 통과안 2~3개, `upload.json` 제목 짝 | 168px 가독성, 사실, 제목과 겹침 0 |
| **7 QA팀** | `fact-checker`, `visual-critic`, `parity-judge` | 렌더 전 빌드 / 렌더 후 영상 | 사실 보고(0건이어야), 화면 P0/P1 표, 동급 판정표 | fact-checker 0건, P0 0개, `parity_check --strict` 통과, parity-judge 전 영역 "동급" |

## 한 편의 흐름 (`/make-episode`)
```
전략팀(기준) → 리서치팀(사건·사실·위험) → 작가팀(기획·대본) ─사람 승인─→ 아트팀(설계 → 자료 요청 → 3D·도식·기록 장면)
   → 포스트팀(편집 리듬 → 소리) → QA팀(사실 → 화면 → 렌더 → 판정) → 썸네일팀 → QA팀(최종 판정) → 사람(업로드)
업로드 2주 뒤: 전략팀(성과 분석) → /retro(회고) → 기준 문서 수정
```
- 동시에 할 수 있는 것: 리서치팀의 `source-verifier` 와 `risk-reviewer`, 아트팀의 세트별 `set-builder` 와 `diagram-builder`, 썸네일팀과 포스트팀.
- 같은 파일을 두 팀원이 동시에 고치지 않는다(백로그·scenes.py). 동시에 일할 때는 결과를 따로 저장하고 쇼러너가 합친다.

## 역할이 겹칠 때
| 질문 | 누가 |
|---|---|
| 이 사실을 써도 되나 | 사건 단위 `source-verifier`, 대본 단위 `script-critic`, 화면 전체(렌더 직전) `fact-checker` |
| 이 사진을 써도 되나 | 라이선스 `archive-researcher`, 인물·시신 사진 `risk-reviewer` |
| 이 장면이 레퍼런스만큼 좋은가 | 장면 `visual-critic`, 편 전체 `parity-judge` |
| 컷이 너무 길다·사진이 어디에 들어가나 | `editor` |
| 기준 자체를 바꿔야 하나 | `performance-analyst` 제안 → `/retro` → 사람 승인 |
