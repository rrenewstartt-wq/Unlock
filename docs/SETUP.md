# 다른 PC·계정·클라우드에서 똑같이 재현하기

이 저장소만 받으면 누구든 같은 결과물을 만들 수 있다. 저장소에 없는 것(용량이 크거나 남의 저작물)은
**고정된 목록과 해시**로 다시 받고, 받은 뒤 커밋된 결과와 바이트 단위로 비교한다.

## 1. 받기
```bash
git clone https://github.com/rrenewstartt-wq/Unlock.git
cd Unlock
```

## 2. 설치 + 확인 (한 번)
```bash
bash scripts/setup.sh
```
도구 확인 → Python 패키지(버전 고정) → Playwright Chromium → 썸네일 3D 자산(잠금 sha256 검증) → 벤치마크 썸네일 → 재현 확인.
마지막에 `결과: 모두 같음 ✓` 가 나오면 이 컴퓨터는 이 저장소와 같은 결과를 낸다.

**네트워크 허용(클라우드 세션):** 3D 자산은 `api.polyhaven.com`·`dl.polyhaven.org`(질감·HDRI·모델), `quaternius.itch.io` 와 itch.io 다운로드 서버(인물·머리카락)에서 받는다.
환경의 네트워크 정책이 이 호스트를 막으면 자산 받기가 `✗ 받지 못한 자산` 으로 끝나고, 3D 장면의 check·렌더는 missing asset 으로 실패한다(2026-11-26 실제로 막힘).
환경 설정의 Network access 에서 접근 수준을 넓히거나 이 호스트들을 Allowed domains 에 넣는다.

## 3. Claude 에서 열기
- **Claude 데스크톱 앱(Windows/Mac) / Claude Code:** 받은 `Unlock` 폴더를 작업 폴더로 연다. `CLAUDE.md`, 스킬(`/scout` `/plan` `/thumbnail` …), 에이전트(`.claude/agents/`)가 자동으로 잡힌다.
- **HyperFrames 플러그인**(영상 제작 스킬 `/hyperframes`)은 계정마다 설치해야 한다: Claude Code 플러그인 마켓에서 HyperFrames 를 추가.
  영상 CLI 자체는 `npx --yes hyperframes@0.9.59` 로 버전이 고정돼 있어 플러그인 없이도 렌더된다.
- 이어서 할 일은 `STATUS.md` 에 있다. 새 세션에 "STATUS.md 읽고 이어서 해줘" 라고 하면 된다.
- 최신 상태는 `main` 이다(2026-11-26 병합: 레퍼런스 룩 키트·아트팀 26명·100점 블라인드 기준). ep03 팔미라만 `claude/dreamy-curie-gorgg4` 브랜치에 따로 있다(`STATUS.md` 맨 위). 세션 브랜치에서 일했으면 끝날 때 `main` 에 합친다. 클라우드 세션은 재시작되면 커밋하지 않은 파일이 사라지므로 단계마다 커밋·푸시한다.

## 버전 (2026-11-19 이 저장소의 결과를 만든 환경)
| 도구 | 버전 | 고정 위치 |
|---|---|---|
| Python | 3.13 (3.10 이상) | — |
| numpy / Pillow | 2.5.3 / 12.3.0 | `requirements.txt` (사진·글자 썸네일이 바이트까지 같으려면 필요) |
| Node | 22 (18 이상) | — |
| HyperFrames CLI | 0.9.59 | `episodes/*/package.json` |
| three.js | r185 | 저장소에 포함(`thumbkit/lib`, `episodes/*/assets/lib`) |
| Playwright / Chromium | 1.63.0 | `scripts/setup.sh` |
| ffmpeg | 6.1 | — |
| yt-dlp | 2026.10.26 | `requirements.txt` (벤치마크·경쟁 채널 수집에만) |
| 글꼴 | Black Han Sans, Gothic A1 (OFL) | 저장소에 포함 |

## 저장소에 없는 것과 다시 받는 법
| 무엇 | 왜 커밋 안 함 | 다시 받기 | 같은지 확인 |
|---|---|---|---|
| 썸네일 3D 자산 `thumbkit/cache/` (114MB) | 용량, 재배포 가능한 CC0 원본이 따로 있음 | `python3 scripts/thumb_assets.py restore` | `thumbkit/assets.lock.json` sha256 |
| 벤치마크 썸네일 `data/benchmark/*/raw/` | 다른 채널의 저작물(분석용) | `python3 scripts/fetch_benchmark.py` | 분석 결과(`docs/thumbnail-benchmark.md`, `texts.md`)는 커밋됨. 유튜브가 썸네일을 바꾸면 몇 장 다를 수 있음 |
| 영상 렌더 `episodes/*/renders/` | 용량, 다시 만들 수 있음 | `cd episodes/<ep> && npm run render` | 프레임 비교(ffmpeg) |
| 3D 촬영 원본 `thumbnail/out/beauty-*`, `mask-*` | 용량 | `bash scripts/thumbnail.sh episodes/<ep>` | `python3 scripts/verify_repro.py --3d` |
| 내 목소리 `voice/`(기준 녹음·생성 캐시), `episodes/*/assets/voice/`, `data/voice.json` | 개인 정보 | 기준 녹음 파일을 본인에게 다시 받아 `python3 scripts/voice_local.py setup` → `ref <파일>` → `gen`(CPU) 또는 Colab(`docs/voice.md`) | 받아쓰기로 문장 대조 |
| 영상 3D 자산 `episodes/*/assets/kit3d/cache/` | 용량(thumbkit/cache 의 복사본) | `python3 scripts/kit3d.py --all` (setup.sh 가 자동) | 같은 잠금 파일 |
| 경쟁 채널 목록 원본 `data/benchmark/competitors/raw/` | 다른 채널의 데이터(분석용) | `python3 scripts/competitors.py --refresh` | 분석 결과 `summary.json`·`docs/competitor-report.md` 는 커밋됨. 조회수는 받는 날의 값이라 조금 달라짐 |

**저장소에 들어 있는 것(받기만 하면 됨):** 실제 기록 사진과 출처 대장 `episodes/*/assets/archive/`, 영상 3D 키트 코드 `episodes/*/assets/kit3d/*.js`,
팀 에이전트 22명 `.claude/agents/`, 스킬 `.claude/skills/`, 소재 백로그·검증 결과 `data/topics/`, 기준 문서 `docs/`.

## 재현 확인
```bash
python3 scripts/verify_repro.py        # 자산 잠금 + 사진·글자 썸네일 11장(레시피: episodes/*/thumbnail/recipes.json)
python3 scripts/verify_repro.py --3d   # + 3D 컨셉 페이지 다시 촬영(몇 분)
```
- 사진·글자 썸네일은 같은 numpy/Pillow 에서 **바이트까지 같다**.
- 3D(WebGL, SwiftShader)는 GPU·드라이버에 따라 아주 조금 다를 수 있어 평균 픽셀 차이 3/255 이하를 같은 것으로 본다.

## Windows
`scripts/*.sh` 는 bash 스크립트다. **Git for Windows 의 Git Bash** 또는 **WSL** 에서 실행한다.
Python·Node·ffmpeg 는 각각 설치(ffmpeg 는 `winget install ffmpeg`) 후 PATH 에 있어야 한다.
