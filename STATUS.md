# 현재 상태와 다음 할 일 (2026-11-21 기준)

새 세션·다른 계정에서 이어 갈 때 이 파일부터 읽는다. 설치는 `docs/SETUP.md` (`bash scripts/setup.sh`, 끝에 "결과: 모두 같음 ✓").

## 바로 다음 할 일
1. **2편 기획안 승인** — 마쓰바세 사건 선정·기획 완료(`data/topics/plans/matsubase-kumamoto-1985.md`, 상태 `기획됨`).
   제목 후보 5개(추천 「징역 13년이 확정됐던 일본 남자, 34년 만에 무죄｜마쓰바세 사건」), 썸네일 2안(셔츠 왼소매 / 고타츠 위의 귤), 약 17분·46장면·새 3D 세트 6개.
   안협소 58만 영상은 아시카가 사건(태그 기준)이라 같은 사건 아님. 승인되면:
   `python3 scripts/new_episode.py ep02-matsubase "<제목>"` → `python3 scripts/gates.py episodes/ep02-matsubase pass plan --by 사람 --evidence "기획안 승인"` → `/make-episode`.
2. **사람 결정을 앞당긴다(대본 승인 때 함께):** 내레이션 녹음(본인 목소리, Colab)과 음악 출처. 이것 없이는 소리 영역이 동급이 될 수 없다(회고 R8).
3. 2편은 **파일럿 관문**(콜드 오픈~첫 질문, 약 2분 30초)이 블라인드 비교에서 동급이어야 나머지 장면을 짓는다.
4. ep01 남은 일(시험편이라 급하지 않음): 렌더 안 함, 보관소 장면 film 키트로, 담배 인서트 컷, facts.md 를 사실 ID 표로.

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
3. 2편 기획안 승인(위 "바로 다음 할 일" 1번).
4. 1978 일본 해변 연인(북한 납치)을 이 채널에서 다룰지, 사후 얼굴 사진(서머턴 맨)을 본편에 쓸지.

## 다음 순서 (사건이 정해지면)
`/make-episode`(관문: plan → facts → script → design → archive → **pilot** → scenes → sound → render → thumbnail·meta → judge, `scripts/gates.py`) → 사람이 업로드.

## 알아 둘 것
- 클라우드 세션은 재시작되면 커밋하지 않은 파일이 사라진다. 결과물은 만들 때마다 커밋한다. 캐시는 `bash scripts/setup.sh` 로 복구된다.
- 유튜브 개별 영상 페이지는 봇 확인이 뜬다(우회하지 않음). 채널 목록·썸네일 이미지는 공개 경로로 받는다(`scripts/fetch_benchmark.py`).
