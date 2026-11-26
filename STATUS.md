# 현재 상태와 다음 할 일 (2026-11-26 기준)

새 세션·다른 계정에서 이어 갈 때 이 파일부터 읽는다. 설치는 `docs/SETUP.md` (`bash scripts/setup.sh`, 끝에 "결과: 모두 같음 ✓").

> **ep02 는 한 세션에서만 만든다(사람 결정 2026-11-21).** 다른 세션은 ep02 파일을 고치지 않는다 — 공용 도구만 고치고 main 에 합칠 때 ep02 는 최신 진행 쪽을 유지한다.

## 바로 다음 할 일 (ep02 마쓰바세 제작 중 — 관문 `python3 scripts/gates.py episodes/ep02-matsubase`)
최신 회고: `docs/retros/2026-11-25-harness.md`(파일럿 1차 미달 뒤 사흘, 다시 판정 0번). 그 전: `2026-11-21-harness.md`, `2026-11-21-teams-gates.md`. 팀 `docs/teams.md`.

현재: plan·facts·script·design·archive ✅ · **pilot 미달(11-22 1차)** → 지적(P0 4·P1 21, `data/review-pilot-1.md`·`judge-pilot-1.md`) 수정 대부분 커밋됨,
기록 장면 `feb5_change` 를 record_insert 로 바꾸는 중(174fe8b). 레퍼런스 프레임은 11-22 에 받음(464장, `reference-pack.json`) — 블라인드 비교 가능.
장면 파일은 담당별: `scenes_archive.py`(기록), `scenes_<세트>.py`(3D), `scenes_diagram.py`(도식) → `scenes.py` 끝에서 import.
새 환경은 먼저 `bash scripts/setup.sh`(자산 캐시 없으면 check·렌더가 missing asset 으로 실패).
1. **파일럿 지적 등록:** 25개를 `gates.py episodes/ep02-matsubase todo pilot P0|P1 "<항목>" --owner <담당> --src data/review-pilot-1.md` 로 넣고,
   이미 고친 것은 visual-critic 이 확인한 뒤 `done`. 중간 저장 커밋에는 열린 todo 번호를 적는다.
2. **파일럿 2차:** 0~137초 + 시험 컷 6개 다시 렌더(`render_chunks.py episodes/ep02-matsubase range pilot2 ...`, 구간 check 는 `render_chunks.py ... check`)
   → visual-critic 렌더 검수 → `scripts/blind_sheet.py` → parity-judge. 동급이면 `pass pilot`, 아니면 `fail pilot` + todo.
3. scenes 전: archive-researcher 가 Commons 장소 사진 재조회, 없으면 `shots.json` `no_photo_reason` 확정. film 키트에 옷 입은 인물 기본 자산.
4. **내레이션 — 사람 결정(2026-11-21): 맨 마지막 작업.** 그때까지 시각은 읽기 속도 기준.
   마지막에: 녹음(m4a) → `voice_local.py setup` → `ref <파일>` → `voice.py pack` → `voice_local.py gen`(314줄, CPU 약 3시간)
   → `voice.py import` → `build_script.py`·`build.py` → **editor 가 싱크·판 교체 간격 다시 확인** → 렌더. 그때까지 소리 영역은 "미달(사람 결정 대기)".
5. **음악:** 사용자가 나중에 정함.
6. 업로드 직전: facts F204(최고재판소 결과) 다시 확인, F29(이름 읽기)는 확인 못 하면 "미야타 씨"만.
7. ep01 남은 일(급하지 않음): 렌더, 보관소 장면 film 키트로, 담배 인서트, facts.md 를 사실 ID 표로.

## 2026-11-26: 레퍼런스 룩 키트 완성 — 룩 테스트 95.2점 통과
- 사용자가 준 레퍼런스 화면 녹화 3개로 기준을 만들었다(`docs/reference-look.md`, `scripts/look_check.py`). 아트팀에 cinematographer·character-animator·motion-designer 를 더했다(26명).
- 키트: `thumbkit/look.js`(룩 프리셋·잎 그림자·그레이드·심도·카메라 프리셋, `LOOK.md`), `thumbkit/actors.js`(옷 입고 걷는 인물 6종·동작 20여 개, `ACTORS.md`),
  `thumbkit/overlay3d.js`·`scenes_kit.title_card`(타자 제목 카드·상자 없는 자막·3D 거리 선·사진 unlock 룩, `OVERLAY.md`). 실험장은 `episodes/lab-look`.
- 사용자 결정: 썸네일은 글자 없음 + 빨간 단색, 강조색 빨강, 새 편은 3D `재현` 꼬리표 없음(11-25). 블라인드 비교는 100점 점수제, 90점 이상 통과(11-26, `scripts/blind_score.py`).
- 블라인드 비교: 1차 1승 3패 → 2차 2승 2패 → 3차 점수제 **95.2점 통과**(`episodes/lab-look/data/blind-1~3.md`).
- 남은 약점·과제: 인물 옷·머리카락(88점), 화분, look.js 볕 구멍 잔가지, 렌더 시간(CPU 로 영상 1초에 약 2분 → 본편은 GPU 컴퓨터 렌더가 사실상 필요).

## 2026-11-25: 벤치마킹 범위 변경 + 회고
- 사용자 지시: 대본·썸네일·그래픽의 스타일·공식·포맷을 레퍼런스와 똑같이(CLAUDE.md 규칙 1, `docs/originality.md`). 글자 그대로 옮긴 문장·원본 파일·채널명만 금지. 빨강 허용, 썸네일 `bench_hash` 6 미만만 "베낌".
- 회고(`docs/retros/2026-11-25-harness.md`): 관문 장부에 고칠 것 목록(`gates.py todo/done`, 열린 P0 면 pass 거부, 미달 뒤 날수 경고),
  구간 check(`render_chunks.py check`), set-builder 파일럿 점검표. 사람에게 물을 것: 대표색(제안: ep02 앰버 유지, ep03 부터 결정), 팀원 동시 실행 수.

## 2026-11-21: ep02 진행 기록
- 사실: `data/facts.md` F01~F224(1차 자료: 재심 판결 2019, 고법 결정 2017, 국가배상 1심 2025·2심 2026 — courts.go.jp), source-verifier 원문 대조 2회(불합격 → 합격).
- 대본: 52장면 314줄 16.2분(읽기 속도), 질문 6개(첫 11%), 자막 근거 연결 314/314. script-critic 3회(수정 → 수정 → 합격), 사람 승인.
  제목 「징역 13년이 확정됐던 일본 남자, 34년 만에 무죄｜마쓰바세 사건」.
- 설계: SHOTS 52장면(3D 49.6%·도식 39.4%·기록 11%), 장면 안 기록 3초 컷 12, 핵심 장면 12(사진 11 예정). 1차 검토 미달.
- 레퍼런스 팩: `data/benchmark/unlock_kr/reference-pack.json` 은 봇 확인으로 프레임 0장(자막 수치만). 블라인드 시트 도구 `scripts/blind_sheet.py` 준비됨.
- 내레이션: `scripts/voice_local.py`(CPU, voxcpm==2.0.3) 추가, 노트북의 `seed` 인자 오류(voxcpm 2.x) 수정. CPU 속도: 복제 모드 한 줄 약 34초.
- 잘 된 것·안 된 것: 관문 장부가 실제로 되돌림을 잡았다(facts 1회, design 1회). 사실 담당 ↔ 대본 담당 ↔ 대본 검수의 3자 대조로 원문보다 센 문장 30곳 이상을 고쳤다.

## 2026-11-21: 회고와 팀 재구성 (`docs/retros/2026-11-21-teams-gates.md`)
- 회고 핵심: 동급 롱폼이 아직 한 편도 없다(R1), 레퍼런스 증거가 얇고(R2) 검수가 자기 채점이다(R3), 사실·도식·편집·메타 담당이 비어 있었다(R4·R5·R9),
  자막↔근거와 관문이 기록되지 않았다(R6·R7), 소리 결정이 마지막에 있었다(R8).
- **새 팀원 5명(17 → 22, main 쪽 performance-analyst 와 합쳐 23):** fact-checker(사실), diagram-builder(2D 도식), editor(리듬·싱크·소리 교차 검수), reference-analyst(레퍼런스 팩·블라인드 시트), meta-writer(upload.json).
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
| 채널 | 해외 실화 미제사건 롱폼 16:9, 벤치마크 @unlock_kr 의 스타일·공식·포맷을 똑같이(문장·원본 파일만 새로) | `docs/originality.md` |
| 대표색 | **빨강**(2026-11-25 사용자 결정, 레퍼런스와 같게). ep02 만 앰버로 끝냄 | `docs/reference-look.md`, `docs/visual-style.md` |
| 3D 꼬리표 | 새 편은 `재현` 표기 없음(2026-11-25, 레퍼런스와 같게). ep02 는 유지 | `docs/visual-style.md` |
| 화면 | 도식은 2D(검은 보드), 재연은 film 키트 3D(사실적 인물·실사 질감), **핵심 장면은 실제 기록 사진이 먼저**(처음 후킹 + 중간 하이라이트, 한 컷 약 3초) | `docs/visual-style.md`, `docs/quality-bar.md` |
| 내레이션 | 본인 목소리 복제(VoxCPM2, Colab) — 나중에. 음악도 나중 | `docs/voice.md` |
| 썸네일 | **레퍼런스와 같게: 글자 없음 + 빨간 단색 + 상징물 하나**(2026-11-25 사용자 결정). 두 줄 큰 글자판은 A/B 용 | `docs/thumbnail-formula.md`, `docs/thumbnail-copy.md` |
| 제목 | "N년 만에"(숫자+결과) > 최상급, 끝에 `｜사건명`. "~한 이유"는 보조, 물음 제목·비교·경고형 안 씀 | `docs/script-formula.md`, `docs/competitor-report.md` |
| 길이 | 기본 16~20분 | `docs/competitor-report.md` |
| 팀 | 22명: 기준 1, 기획·소재 4, 사실 1, 대본 2, 연출·화면 4, 편집·소리 2, 검수·판정 2, 썸네일·메타 6. 관문 장부 `scripts/gates.py` | `.claude/agents/`, `CLAUDE.md`, `docs/retros/2026-11-21-teams-gates.md` |

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
5. (완료 2026-11-25) 대표색 빨강, 썸네일 글자 없음 + 빨간 단색, 3D `재현` 꼬리표 없음 — 새 편부터. ep02 는 지금 룩으로 끝낸다.
6. (2026-11-25 회고) 세트 담당 등 팀원을 한 번에 2명까지만 돌릴지(사용량 제한으로 5번 멈춤).

## 다음 순서 (사건이 정해지면)
`/make-episode`(관문: plan → facts → script → design → archive → **pilot** → scenes → sound → render → thumbnail·meta → judge, `scripts/gates.py`) → 사람이 업로드.

## 알아 둘 것
- 클라우드 세션은 재시작되면 커밋하지 않은 파일이 사라진다. 결과물은 만들 때마다 커밋한다. 캐시는 `bash scripts/setup.sh` 로 복구된다.
- 유튜브 개별 영상 페이지는 봇 확인이 뜬다 → yt-dlp 표준 옵션(JS 실행기·플레이어 클라이언트, CLAUDE.md 4번)으로 11-22 에 받았다. 쿠키·남의 계정·프록시는 쓰지 않는다. 채널 목록·썸네일 이미지는 공개 경로(`scripts/fetch_benchmark.py`).
