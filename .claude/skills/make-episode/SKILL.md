---
name: make-episode
description: 해외 실화 미제사건 한 편을 레퍼런스(@unlock_kr) 동급으로 만든다. 제작 팀(사실·대본·연출·실제 자료·3D·도식·편집·소리·썸네일·메타·판정)을 관문마다 돌리고 관문 장부(scripts/gates.py)에 기록한다. 파일럿(콜드 오픈~첫 질문)이 블라인드 비교에서 동급이어야 전체를 짓는다. "에피소드 만들어줘", "다음 편", 사건 이름을 주며 제작을 요청할 때 사용.
---

# /make-episode [사건 slug | 길이(예: 12분, 시험편 3분)]

팀 구성과 인계 규칙은 `docs/teams.md`. 메인 세션은 **제작 책임자(쇼러너)**다. 단계를 돌리고, 관문 장부를 쓰고, 사람 결정을 모아 묻는다. 직접 만들거나 검수하지 않는다(작은 고침만 예외).
목표는 `docs/quality-bar.md`. 각 단계는 **만드는 팀원 → 검수 팀원 → 관문 기록**이고, `gates.py` 가 거부하면 다음 단계로 가지 않는다.
기준 문서: `docs/quality-bar.md`, `docs/script-formula.md`, `docs/visual-style.md`, `docs/originality.md`, `/hyperframes` 스킬(렌더 계약). 회고: `docs/retros/2026-11-21-teams-gates.md`.
기본 길이 **16~20분**. 시험편(3분)이면 `meta.json` 에 `"test": true`, 검사는 `--test`.

```bash
python3 scripts/gates.py episodes/<ep>                      # 언제든: 어디까지 왔고 다음 관문이 무엇인지
python3 scripts/gates.py episodes/<ep> pass <관문> --by <검수 담당> --evidence "<보고 요약·파일>"
```

| 관문 | 만드는 팀원 | 검수 | 통과 조건(자동 확인은 gates.py 가 함) |
|---|---|---|---|
| `plan` | `/scout` → `/plan`(episode-planner) | source-verifier, risk-reviewer | **사람이 기획안 승인**(`--by 사람`) |
| `facts` | `fact-checker` | `source-verifier`(표본 10개 원문 대조) | 사실 ID 표 40행+(자동), 대조 합격 |
| `script` | `script-writer` | `script-critic` + fact-checker(fact_map) | parity 대본·사실 영역 ❌ 0(자동, ⚠️ 는 judge 까지), critic 합격, **사람 승인** |
| `design` | `storyboard-director` | `visual-critic`(설계 검토) | P0 0, 배분·연속·12초·파일럿 범위 표시 |
| `archive` | `archive-researcher` | `risk-reviewer`(인물 사진) | SOURCES.md 라이선스 근거, shots.json 핵심 장면마다 사진 또는 이유 |
| `pilot` | set-builder·diagram-builder → `editor` | `visual-critic` + `reference-analyst` 시트 + `parity-judge`(파일럿) | 파일럿 렌더 리듬 ✅(자동), P0 0, **블라인드 비교 포함 화면·대본·사실 동급** |
| `scenes` | set-builder(세트마다 병렬)·diagram-builder → `editor` | `visual-critic`(장면 검수) | check 오류 0, P0 0 |
| `sound` | `sound-designer` | `editor` | 내레이션 반영, 큐 시트, 음악 LICENSE.md |
| `qa_facts` | — | `fact-checker`(렌더 직전 최종 검수) | 화면 글자·그림 전체 ❌ 0 (⚠️ 는 judge 까지 0) |
| `render` | 제작 책임자 | `editor`(실측) + `visual-critic`(렌더 검수) | parity 렌더 영역 ❌ 0(자동), 장면마다 프레임 확인 |
| `thumbnail` | `/thumbnail` 팀 | thumb-critic, thumb-copy-critic | 통과안 2~3개 |
| `meta` | `meta-writer` | `thumb-copy-critic`(메타 검수) | parity 메타 ✅ |
| `judge` | `reference-analyst`(팩·시트) | `parity-judge`(블라인드 비교 먼저) | parity ❌ 0(자동, 사람 예외 제외), 전 영역 "동급" |

대본(script.txt)을 고치면 `script` 이후 관문이 "다시 필요"가 된다. 다시 검수받고 다시 기록한다.
사람이 알고 남긴 예외는 `gates.py <ep> waive "<항목>" --by 사람 --reason "..."` → `data/exceptions.json`(parity 가 "⚪ 예외"로 표시, 판정은 최고 "근접").

## 사람 결정은 앞에서 모은다
동급 판정에 반드시 필요한 사람 결정은 **대본 승인과 같은 때** 묻는다(늦게 물으면 마지막에 소리 영역이 미달로 남고, 내레이션 길이에 화면을 다시 맞춰야 한다):
1. 내레이션: `python3 scripts/voice.py pack episodes/<ep>` → 사용자가 Colab 에서 본인 목소리로 생성(`docs/voice.md`). 그동안 화면 작업은 계속한다.
2. 음악 출처(본인 소유 곡 / 허가가 명확한 라이브러리), 3. 썸네일 이미지 방향(유료 생성 이미지 여부).

## 0. 사건 (`plan`)
기획안 `data/topics/plans/<slug>.md` 에서 시작. 없으면 `/scout` → `/plan`. 사용자가 승인하면:
```bash
python3 scripts/new_episode.py ep0N-<slug> "<제목>"
python3 scripts/gates.py episodes/ep0N-<slug> pass plan --by 사람 --evidence "기획안 승인 <날짜>"
```

## 1. 사실 (`facts`)
`fact-checker` 에게 slug·기획안 → `data/facts.md`(사실 ID 표). `source-verifier` 가 표본 대조. 단서가 모자라면 길이를 줄이자고 사용자에게 말한다(지어내지 않는다).

## 2. 대본 (`script`)
`script-writer`(기획안·facts.md·길이) → `fact-checker` 가 `data/fact_map.json` → `script-critic` → 수정 반복(최대 3회).
```bash
cd episodes/<ep> && python3 data/build_script.py && python3 ../../scripts/parity_check.py .
```
대본 영역 ✅(분당 글자는 내레이션 전 보류) + critic 합격이면 **대본·제목 후보를 사용자에게 보여 주고 승인받는다.** 같은 때 위 "사람 결정"을 묻는다.

## 3. 화면 설계 (`design`)
`storyboard-director` → `SPEC.md` SHOTS 표 + `## PILOT` 범위 + `data/shots.json`. `visual-critic`(설계 검토) P0 0 이면 기록.

## 4. 실제 자료 (`archive`)
`archive-researcher` 에게 shots.json 핵심 장면과 SHOTS 요청 목록. 인물 사진은 `risk-reviewer`. 못 찾은 것은 SHOTS 를 도식으로 바꾼다(storyboard-director).

## 5. 파일럿 (`pilot`) — 전체를 짓기 전에
**파일럿 범위의 장면만** 최종 품질로 짓는다. 이 범위가 레퍼런스와 블라인드 비교에서 동급이 아니면 나머지 장면을 짓지 않는다.
1. 3D: 파일럿에 나오는 세트를 `set-builder` 에게(세트마다 따로, 동시에). 도식: `diagram-builder`. 사진 컷: `archive_scene`/`archive_insert`.
2. `editor` 가 리듬·싱크를 맞춘다. `visual-critic` 장면 검수 → P0 고침.
3. 렌더: `npx hyperframes render --start 0 --end <파일럿 끝 초> -o renders/pilot.mp4` (백그라운드).
4. `reference-analyst` 가 영역별 블라인드 시트(3장 이상) → `parity-judge` 파일럿 판정.
5. 미달이면 담당에게 돌려 고치고 다시. 같은 영역이 3번 미달이면 멈추고 사용자에게 원인(엔진 한계·자료 부족 등)과 선택지를 보고한다.

## 6. 전체 장면 (`scenes`)
파일럿에서 통과한 방식 그대로 나머지 장면. 세트별 `set-builder` 병렬, 도식 `diagram-builder`, 이어서 `editor`, `visual-critic`.
`python3 build.py` → `npx hyperframes check` 오류 0 → P0 0. 같은 장면 3번 실패면 멈추고 보고.

## 7. 소리 (`sound`)
`sound-designer`: 내레이션 import → `build_script.py` → `build.py`(시각이 음성에 맞춰진다) → `editor` 가 싱크 다시 확인. 음악 큐 시트·LICENSE.md.
내레이션이 아직이면 이 관문은 "대기"로 두고, 렌더는 "검토용"으로만 한다(판정은 소리 미달).

## 7.5 렌더 직전 사실 (`qa_facts`)
`fact-checker`(최종 검수 모드): 화면에 나오는 모든 글자(compositions/*.html 의 이름표·카드·숫자·사진 설명·출처)와 그림 세부를 facts.md·1차 자료로 대조. ❌ 이 있으면 렌더하지 않고 담당에게 돌려보낸다.

## 8. 렌더 (`render`)
```bash
npx hyperframes render -o renders/<ep>.mp4          # 백그라운드, 약 3시간(17분, 4코어)
python3 ../../scripts/parity_check.py .
ffmpeg -i renders/<ep>.mp4 -c:v libx264 -crf 25 -maxrate 9M -bufsize 18M -c:a copy -movflags +faststart renders/<ep>-preview.mp4
```
`editor` 실측 + `visual-critic` 렌더 검수(장면마다 프레임). 미리보기본을 사용자에게 보낸다.

## 9. 썸네일·메타 (`thumbnail`, `meta`) — 대본 승인 뒤 언제든 병렬
`/thumbnail episodes/<ep>`. `meta-writer` → `upload.json` → `thumb-copy-critic`.

## 10. 판정 (`judge`)
`reference-analyst` 가 팩 갱신·영역별 블라인드 시트 → `parity-judge`. **전 영역 "동급"일 때만 "완성"이라고 보고한다.**
아니면 판정표(영역 | 판정 | 담당 | 고칠 방법)를 보고하고, 해당 관문을 `fail` 로 기록한 뒤 담당에게 돌린다.

## 11. 회고
업로드 2주 뒤 사람이 YouTube Studio 내보내기를 `data/performance/<ep>/` 에 넣으면 `performance-analyst` → `/retro`.

## 보고 (단계마다)
관문 장부 표(`gates.py`), 이번 단계 검수 보고 요약, 측정값(음량은 "측정, 듣지 않음"), ⚠️ 로 남은 사실, 사람 결정 대기.
원본 렌더는 커밋하지 않는다. **단계마다 커밋·푸시한다**(클라우드 세션은 재시작되면 커밋하지 않은 파일이 사라진다). `data/gates.json` 도 커밋한다.
