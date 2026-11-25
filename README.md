# mystery-unlock-style

해외 실화 미제사건 롱폼(16:9) 채널 하네스. 벤치마크 [@unlock_kr](https://www.youtube.com/@unlock_kr) 의
**형식**(제목 공식, 대본 7단계, 3D 재연 + 인포그래픽 + 하단 자막, 단색·그레인 썸네일)을 분석해 가져오고,
대본·그림·대표색(앰버)은 직접 만든다. 실행: `cd Unlock && claude`

**다른 PC·계정에서 그대로 재현:** `bash scripts/setup.sh` (설치 → 자산 복원 → 결과 비교, `docs/SETUP.md`).
**이어서 작업:** `STATUS.md` (정해진 것, 결정 대기, 다음 순서).

## 구성
```
CLAUDE.md                운영 지침 (파이프라인, 지킬 것)
.claude/skills/          /benchmark  /scout  /plan  /make-episode  /review  /thumbnail
.claude/agents/          기획·소재 발굴 팀: case-scout, source-verifier, risk-reviewer, episode-planner
                         썸네일 팀: thumb-copywriter, thumb-copy-critic(문구) / thumb-director, thumb-builder, thumb-critic(이미지)
docs/
  benchmark-report.md    @unlock_kr 분석 (제목·대본·화면·썸네일)
  script-formula.md      대본 7단계, 문장 규칙, 제목 공식
  visual-style.md        룩, 3D 재연 도구, 도식 원칙 7개, 썸네일, 소리
  thumbnail-formula.md   썸네일 팀 기준서: 벤치마크 원리 6개, spot/flood, 검수 기준
  thumbnail-benchmark.md 장르 히트작 썸네일 76장 분석(채널 13곳) — 썸네일 규칙의 근거, formula 보다 우선
  originality.md         똑같이 맞추는 것(스타일·공식·포맷) / 안 하는 것(문장·파일 그대로)
  voice.md               내 목소리 복제 내레이션(VoxCPM2) 흐름
  topic-criteria.md      소재 기준·점수·제외 기준·후보 형식
scripts/
  benchmark.py           yt-dlp 로 공개 메타데이터·자막 수집 → summary.json (원본은 raw/, 커밋 안 함)
  new_episode.py         ep01 엔진을 복사해 새 에피소드 뼈대 생성 (바로 build·check 통과)
  thumbnail.sh           썸네일 컨셉 페이지(c*.html) 촬영 → 보정 → 검수표
  thumb_grade.py         spot(어둠 속 앰버) / flood(앰버 속 다른 색) 보정, 그레인, 글자판
  thumb_photo.py         공개 기록 사진을 크게 배치(앰버/흑백 톤, 가장자리 페이드, 그레인) → thumb_text.py 로 글자
  thumb_text.py          장르식 두 줄 큰 글자판(흰 줄 + 앰버 줄, 외곽선) + 동그라미·화살표
  thumb_review.py        크기별(360/246/168px) 미리보기 + 대비·크기·벤치마크 거리 숫자
  thumb_assets.py        Poly Haven CC0 모델·질감·HDRI 찾기/받기 + restore/lock/verify (thumbkit/assets.lock.json sha256)
  setup.sh               새 환경 한 번에: 도구 확인·패키지·Chromium·자산 복원·재현 확인
  verify_repro.py        커밋된 결과와 같은지 확인(사진·글자 썸네일 바이트 비교, --3d 3D 재촬영)
  fetch_benchmark.py     커밋하지 않는 벤치마크 썸네일 다시 받기
  voice.py               내레이션 pack(대본 → 줄 단위) / import(WAV → 자막·장면 재계산)
  topics.py              소재 백로그: add(중복·이미 다룬 사건 거름) / list / check / set / show / rescore
notebooks/voxcpm2_voice.ipynb  Colab: 내 목소리 등록 → 에피소드 줄 생성 → zip
thumbkit/                썸네일 3D 정지 장면 도구(thumbkit.js: CC0 모델·질감·HDRI, 종이, 조명, 초점 마스크) + three.js
config/voice.json        목소리 설정(consent: own, ultimate_clone, 레퍼런스 문장)
config/topics.json       소재 점수 가중치·제외 기준
data/topics/             backlog.json(후보), covered.json(이미 다룬 사건), plans/(기획안)
data/benchmark/          벤치마크 요약
episodes/
  ep01-somerton/         시험편 「73년 만에 이름을 찾은 해변의 남자」 (v3, 3:03)
```

## ep01-somerton
1948년 호주 서머턴 해변의 신원 미상 남성, 2022년 DNA 계보 분석으로 이름이 밝혀진 사건.
장면 10개(3D 재연 4: 새벽 해변·전날 저녁·기차역 보관소·엔딩 / 도식 6: 유류품·73년 장부·검안 소견·시계 주머니·책 뒤표지 암호·DNA 계보),
하단 자막 + 효과음. 내레이션은 본인 목소리 복제로 나중에 넣는다(음성 자리는 준비됨), 음악도 나중. 사실 근거는 `episodes/ep01-somerton/data/facts.md`.

다시 만들기:
```bash
cd episodes/ep01-somerton
python3 data/build_script.py && python3 build.py
npx hyperframes check
npx hyperframes render -o renders/ep01.mp4
```

필요한 것: Python 3(Pillow, numpy), Node + `npx hyperframes`(package.json 에 버전 고정), ffmpeg, yt-dlp(벤치마크), Playwright Chromium(썸네일).
