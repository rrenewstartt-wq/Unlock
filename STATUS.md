# 현재 상태와 다음 할 일 (2026-11-21 기준)

새 세션·다른 계정에서 이어 갈 때 이 파일부터 읽는다. 설치는 `docs/SETUP.md` (`bash scripts/setup.sh`, 끝에 "결과: 모두 같음 ✓").

## 바로 다음 할 일 (ep02 마쓰바세 제작 중 — 관문 `python3 scripts/gates.py episodes/ep02-matsubase`)
현재: plan ✅ · facts ✅ · script ✅(사람 승인) · **design: 1차 미달 → SPEC v3 로 지적 전부 반영, visual-critic 재검토 대기** · 나머지 대기.
1. **design 다시:** storyboard-director 에게 `episodes/ep02-matsubase/data/review-design-1.md`(visual-critic P0 1·P1 24)대로
   `SPEC.md`·`data/shots.json` 을 고치게 하고 → visual-critic(설계 검토 모드) 재검토 → P0 0 이면
   `gates.py ... pass design --by visual-critic --evidence "..."`. (2026-11-21 storyboard-director 가 고치던 중 사용량 제한으로 멈춤 — SPEC.md 는 일부만 반영된 상태로 커밋됨. 이어서 고칠 때 review-design-1.md 항목마다 반영 여부부터 확인한다.)
2. **archive:** archive-researcher 에게 SPEC 의 요청 R1~R9(판결문·결정문 지면은 실명 줄을 **파일 자체에서** 잘라 냄) + shots.json 핵심 장면 12.
3. **pilot:** 0~137초(hook~calendar) + 판정용 시험 컷 6개. 세트 room·outside·home(+시험 컷: police·vault·knife). 직전에 레퍼런스 수집 재시도
   (`python3 scripts/benchmark.py @unlock_kr --all-storyboards` → `scripts/blind_sheet.py`). 봇 확인이면 사용자에게 다시 묻는다.
4. **내레이션(사람 녹음 받음, 사용자 확인 대기):** 이 환경 CPU 로 생성한다(`docs/voice.md` "Colab 없이").
   - 기준 녹음은 개인 정보라 저장소에 없다. 새 환경에서는 사용자에게 녹음 파일(m4a)을 다시 받아 `python3 scripts/voice_local.py setup` → `ref <파일>`.
     녹음 문장은 `config/voice.json → reference_text`(이미 실제 녹음 문장으로 맞춰 둠).
   - 시험 3줄(콜드 오픈) 생성·받아쓰기 대조 완료, **사용자가 목소리를 들어 보고 확인하는 중**. 괜찮으면 `voice.py pack` → `voice_local.py gen`(314줄, 약 3시간) → `voice.py import`.
5. **음악:** 사용자가 나중에 정함 → 정하기 전까지 sound 는 미달로 남는다.
6. 업로드 직전: facts F204(최고재판소 결과) 다시 확인, F29(이름 읽기)는 확인 못 하면 "미야타 씨"만(대본은 이미 그렇게 씀).
7. ep01 남은 일(급하지 않음): 렌더, 보관소 장면 film 키트로, 담배 인서트, facts.md 를 사실 ID 표로.

## 2026-11-21: ep02 진행 기록
- 사실: `data/facts.md` F01~F224(1차 자료: 재심 판결 2019, 고법 결정 2017, 국가배상 1심 2025·2심 2026 — courts.go.jp), source-verifier 원문 대조 2회(불합격 → 합격).
- 대본: 52장면 314줄 16.2분(읽기 속도), 질문 6개(첫 11%), 자막 근거 연결 314/314. script-critic 3회(수정 → 수정 → 합격), 사람 승인.
  제목 「징역 13년이 확정됐던 일본 남자, 34년 만에 무죄｜마쓰바세 사건」.
- 설계: SHOTS 52장면(3D 49.6%·도식 39.4%·기록 11%), 장면 안 기록 3초 컷 12, 핵심 장면 12(사진 11 예정). 1차 검토 미달.
- 레퍼런스 팩: `data/benchmark/unlock_kr/reference-pack.json` 은 봇 확인으로 프레임 0장(자막 수치만). 블라인드 시트 도구 `scripts/blind_sheet.py` 준비됨.
- 내레이션: `scripts/voice_local.py`(CPU, voxcpm==2.0.3) 추가, 노트북의 `seed` 인자 오류(voxcpm 2.x) 수정. CPU 속도: 복제 모드 한 줄 약 34초.
- 잘 된 것·안 된 것: 관문 장부가 실제로 되돌림을 잡았다(facts 1회, design 1회). 사실 담당 ↔ 대본 담당 ↔ 대본 검수의 3자 대조로 원문보다 센 문장 30곳 이상을 고쳤다.

## 2026-11-21: 회고와 팀 재구성 (`docs/retrospective-2026-11-21.md`)
- 회고 핵심: 동급 롱폼이 아직 한 편도 없다(R1), 레퍼런스 증거가 얇고(R2) 검수가 자기 채점이다(R3), 사실·도식·편집·메타 담당이 비어 있었다(R4·R5·R9),
  자막↔근거와 관문이 기록되지 않았다(R6·R7), 소리 결정이 마지막에 있었다(R8).
- **새 팀원 5명(17 → 22):** fact-checker(사실), diagram-builder(2D 도식), editor(리듬·싱크·소리 교차 검수), reference-analyst(레퍼런스 팩·블라인드 시트), meta-writer(upload.json).
- **새 관문:** `scripts/gates.py`(관문 장부: 순서 강제, 자동 확인, 대본이 바뀌면 다시 필요, 사람 예외 기록), 파일럿 관문, 블라인드 비교(3장 중 2장에서 우리 칸이 "더 싸 보임"이면 동급 아님).
- **새 검사:** parity "자막 근거 연결"(facts.md 사실 ID + `data/fact_map.json`), `--render <파일>`(파일럿 실측, 결과 `data/parity-<파일>.json`).
- 메인 세션은 제작 책임자: 단계를 돌리고 장부를 쓰고 사람 결정을 묻는다. 만들거나 검수하지 않는다.

## 2026-11-20: 레퍼런스 동급을 목표로 팀 개선
- **기준:** `docs/quality-bar.md`(대본·화면·소리·사실·썸네일·메타의 숫자 기준) + `scripts/parity_check.py`(자동 측정, `--strict` 관문).
- **새 팀원 8명:** script-writer, script-critic, storyboard-director, set-builder, archive-researcher, sound-designer, visual-critic, parity-judge.
  `/make-episode` 는 단계마다 "만드는 팀원 → 검수 팀원 → 관문", 마지막에 parity-judge 가 전 영역 동급일 때만 "완성".
- **3D 엔진:** 영상 3D 를 기본 도형 마네킹에서 **film 키트**(`thumbkit/film.js`: 사실적 인물 남녀 + Poly Haven 실사 질감·하늘·소품 모델)로 바꿨다.
  `python3 scripts/kit3d.py episodes/<ep>`. ep01 해변 세트 3장면(beach, dusk, ending)을 이 키트로 다시 지었다.
- **ep01 동급 검사(롱폼 기준, 2026-11-21):** 통과 13 · 실패 12 · 보류 2. 실패: 길이(3분 시험편), 첫 질문 21%(사람 결정으로 유지), 자막 4줄 28자 초과, 소품 회수,
  장면 수, 보관소 장면이 아직 마네킹, 핵심 장면 수·중간 사진 컷 수(롱폼 기준), 내레이션·음악 없음, ⚠️ 사실 2개, upload.json 없음.
- **ep01 남은 화면 문제:** 담배가 흰 셔츠에 묻혀 안 보인다 → 담배만 찍는 인서트 컷이 필요. 해변 아침 조명이 평평하다.

## 2026-11-21: 실제 사진 — 처음 후킹 + 중간 하이라이트, 한 컷 약 3초
- 규칙: `docs/script-formula.md` 0단계(콜드 오픈), `docs/quality-bar.md` "핵심 장면", 도구 `scenes_kit.archive_scene` / `archive_insert`, 목록 `data/shots.json`.
- ep01 적용: 콜드 오픈 `hook`(1948 발견 지점 X 사진 → 1949 경찰 포스터 흉상 → 암호 사진, 9.9초) + 중간 3초 컷 2개(가방 1949, 암호).
  사진 10장과 대장 `episodes/ep01-somerton/assets/archive/SOURCES.md`(퍼블릭 도메인·CC BY 근거).
- 못 쓴 것: 'Tamám Shud' 종이 조각 사진(언론사 Getty 크레디트뿐) → 재현 유지. 사후 얼굴 사진은 위험 검토 전까지 본편에 쓰지 않음.
- 사람 결정(2026-11-21): 콜드 오픈 때문에 첫 질문 위치가 21%(기준 8~20%)지만 **그대로 둔다.** parity_check 의 이 ❌ 는 알고 남긴 예외다.

## 2026-11-20: 경쟁 채널 27곳 분석 (`docs/competitor-report.md`)
- 16~30분 단일 사건 영상이 8~12분보다 잘 된다(7개 채널 모두) → 기본 길이 16~20분으로 바꿈.
- 제목: "N년 만에" 히트율 44%로 최강, "~한 이유"·제목 물음은 효과 없음 → 공식 순위 조정.
- 같은 형식(얼굴 없는 AI·3D)에서 잘 되는 채널은 그림이 사진처럼 보인다 → 사진 같은 생성 이미지 사용 여부(결정 대기 2번)가 중요해짐.
- 단일 편이 4편 이상 쌓이면 "몰아보기" 모음 편을 만든다(모음 lift 1.53).

## 지금까지 정해진 것
| 항목 | 결정 | 근거 문서 |
|---|---|---|
| 채널 | 해외 실화 미제사건 롱폼 16:9, 벤치마크 @unlock_kr 의 형식만(표현은 직접) | `docs/originality.md` |
| 대표색 | 앰버 하나(빨간 단색은 벤치마크의 것) | `docs/visual-style.md` |
| 화면 | 도식은 2D(검은 보드), 재연은 film 키트 3D(사실적 인물·실사 질감), **핵심 장면은 실제 기록 사진이 먼저**(처음 후킹 + 중간 하이라이트, 한 컷 약 3초) | `docs/visual-style.md`, `docs/quality-bar.md` |
| 내레이션 | 본인 목소리 복제(VoxCPM2, Colab) — 나중에. 음악도 나중 | `docs/voice.md` |
| 썸네일 | **장르 히트작 분석으로 개정:** 공개 기록 사진(실제 얼굴 허용, 조건부) 또는 사진 같은 이미지를 크게 + 두 줄 큰 글자(위 흰 줄 + 아래 앰버 명사구). CC0 3D 썸네일은 약해서 보조 | `docs/thumbnail-benchmark.md`, `docs/thumbnail-copy.md` |
| 제목 | "N년 만에"(숫자+결과) > 최상급, 끝에 `｜사건명`. "~한 이유"는 보조, 물음 제목·비교·경고형 안 씀 | `docs/script-formula.md`, `docs/competitor-report.md` |
| 길이 | 기본 16~20분 | `docs/competitor-report.md` |
| 팀 | 22명: 기준 1, 기획·소재 4, 사실 1, 대본 2, 연출·화면 4, 편집·소리 2, 검수·판정 2, 썸네일·메타 6. 관문 장부 `scripts/gates.py` | `.claude/agents/`, `CLAUDE.md`, `docs/retrospective-2026-11-21.md` |

## ep01 서머턴 맨 (기준 잡기용 시험편, 3분)
- 영상: `episodes/ep01-somerton` — 빌드됨(렌더는 `npm run render`, 약 35분). 내레이션·음악 없음, 효과음만.
- 썸네일 최신: 1948 경찰 사진(퍼블릭 도메인) + 문구 검수 상위 3안 `thumbnail/out/copy-1~3.jpg`
  1. "상표가 전부 잘린 옷 속엔 / ‘끝났다’ 쪽지 한 장" (본안) · 2. "모자도 지갑도 신분증도 없이 / 옷 상표까지 잘린 남자" · 3. "병리학자 “자연사일 리 없다” / 독극물도 안 나온 시신"
  — 근거·채점은 `thumbnail/copy.md`, `thumbnail/copy-review.md`.
- 남은 지적: 제목 「73년 만에 이름을 찾은 해변의 남자」는 신원이 경찰 공식 확인 전이라 단정처럼 읽힐 수 있다(대안 T3 「여행가방에 이름까지 남아 있었는데 73년 동안 신원을 몰랐던 이유」).

## 사용자 결정을 기다리는 것
0. **동급에 꼭 필요한 사람 결정:** 내레이션 녹음(본인 목소리, Colab), 음악 출처(본인 소유 곡 또는 사용 허가가 명확한 라이브러리).
1. ep01 썸네일 문구 3안 중 선택(또는 A/B 테스트).
2. 사진이 없는 사건의 썸네일 이미지: AI 생성 이미지(HeyGen, 유료 크레딧) 사용 여부.
3. (완료) 2편 기획안·대본 승인.
4. 1978 일본 해변 연인(북한 납치)을 이 채널에서 다룰지, 사후 얼굴 사진(서머턴 맨)을 본편에 쓸지.

## 다음 순서 (사건이 정해지면)
`/make-episode`(관문: plan → facts → script → design → archive → **pilot** → scenes → sound → render → thumbnail·meta → judge, `scripts/gates.py`) → 사람이 업로드.

## 알아 둘 것
- 클라우드 세션은 재시작되면 커밋하지 않은 파일이 사라진다. 결과물은 만들 때마다 커밋한다. 캐시는 `bash scripts/setup.sh` 로 복구된다.
- 유튜브 개별 영상 페이지는 봇 확인이 뜬다(우회하지 않음). 채널 목록·썸네일 이미지는 공개 경로로 받는다(`scripts/fetch_benchmark.py`).
