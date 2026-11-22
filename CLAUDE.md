# mystery-unlock-style 하네스 — Claude 운영 지침

이 폴더는 **해외 실화 미제사건 롱폼(16:9) 채널**을 만드는 하네스다. 벤치마크는 @unlock_kr 이고,
**형식만 가져오고 표현은 직접 만든다**(`docs/originality.md`). 영상은 HyperFrames(HTML → MP4)로 만든다.
**목표 품질은 레퍼런스 동급이다:** `docs/quality-bar.md` 의 숫자 기준, `scripts/parity_check.py` 로 측정, `parity-judge` 가 판정.

## 파이프라인

```
[1 벤치마크]  scripts/benchmark.py @handle  → data/benchmark/<handle>/summary.json, docs/benchmark-report.md   (/benchmark)
[2 소재]     기획·소재 발굴 팀: case-scout → source-verifier + risk-reviewer → data/topics/backlog.json   (/scout)
[2.5 기획]   episode-planner → data/topics/plans/<slug>.md (관점·제목·7단계·장면 계획)                    (/plan)
[2.7 사실]   fact-checker → source-verifier: episodes/<ep>/data/facts.md (사실 ID 표, ✅/⚠️) + data/fact_map.json (자막 → 사실 ID)
[3 대본]     script-writer → script-critic → 사람 승인: data/script.txt (7단계, 기본 16~20분)              (/make-episode)
             ↳ 이때 사람 결정(내레이션 녹음 시작, 음악 출처)을 함께 묻는다
[3.5 설계]   storyboard-director → visual-critic(설계 검토): SPEC.md SHOTS 표 + PILOT 범위 / archive-researcher → assets/archive/
[4 파일럿]   콜드 오픈~첫 질문 직후만 최종 품질로 → renders/pilot.mp4 → reference-analyst 블라인드 시트 → parity-judge. 동급이어야 다음
[4.5 장면]   set-builder(film 키트 3D, 세트마다 병렬) + diagram-builder(도식) → editor(리듬·싱크) → visual-critic(P0/P1)   (/review)
[6 소리]     sound-designer(voice.py pack → Colab 내 목소리 → import, 음악 큐) → editor 교차 검수 (docs/voice.md)
[7 렌더]     npx hyperframes render → renders/ (17분 약 3시간, 4코어) → editor 실측 + visual-critic 렌더 검수 → 미리보기본
[8 썸네일·메타] 썸네일 팀(/thumbnail) + meta-writer → upload.json (검수 thumb-copy-critic)
[8.5 사실]   fact-checker(렌더 직전 화면 글자·그림 전체 대조, qa_facts 관문)
[9 판정]     reference-analyst(레퍼런스 팩·블라인드 시트) → parity_check --strict → parity-judge: 블라인드 비교 먼저, 전 영역 동급이어야 "완성"
[10 회고]    업로드 2주 뒤 performance-analyst → /retro → 기준 문서 수정(사람 승인)
```
관문 장부: `python3 scripts/gates.py episodes/<ep>` — 단계마다 `pass <관문> --by <검수> --evidence <근거>`. 앞 관문이 없거나 자동 확인이 실패하면 거부,
대본이 바뀌면 이후 관문은 "다시 필요". 메인 세션은 제작 책임자(돌리고·기록하고·묻는다), 만들거나 검수하지 않는다. 회고: `docs/retros/`.

슬래시 스킬: `/benchmark` `/scout` `/plan` `/make-episode` `/review` `/thumbnail` `/retro`. **팀 7개, 팀원 23명 — `docs/teams.md`**(메인 세션이 쇼러너):
전략(performance-analyst, reference-analyst) / 리서치(case-scout, source-verifier, risk-reviewer, archive-researcher) / 작가(episode-planner, script-writer, script-critic) /
아트(storyboard-director, set-builder, diagram-builder) / 포스트(editor, sound-designer) / 썸네일·메타(thumb-copywriter, thumb-copy-critic, thumb-director, thumb-builder, thumb-critic, meta-writer) /
QA(fact-checker, visual-critic, parity-judge). HyperFrames 작업 전에는 `/hyperframes` 스킬을 먼저 읽는다(렌더 계약).

## 에피소드 폴더 계약 (`episodes/<ep>/`)
- `data/script.txt` → `python3 data/build_script.py` → `data/script.json`(장면·자막 시각). **대본은 여기만 고친다.**
  음성을 가져왔으면(`data/voice.json`) 시각은 음성 길이로, 아니면 읽기 속도로 계산된다.
- `scenes.py` — 장면 id 마다 `def <id>(sid, dur, q)`. 공통 도우미는 `scenes_kit.py`(wrap, clip, scene3d), 효과음은 `sfx_events(DATA)`.
- `python3 build.py` → `index.html`, `compositions/*.html`, 효과음 배치. **생성 파일(index.html, compositions/)은 손으로 고치지 않는다.**
- `assets/lib/<세트>.js` — 사건별 3D 세트, film 키트(`assets/kit3d/film.js`, `python3 ../../scripts/kit3d.py .` 로 복사, 자산 목록 `kit3d.json`)로 짓는다.
  `world.js` 의 기본 도형 마네킹은 옛 방식이라 새 장면에 쓰지 않는다.
- `assets/archive/` — 실제 자료(기록 사진·지도·문서) + `SOURCES.md`. `assets/music/` — 음악 + `LICENSE.md`. `upload.json` — 제목·설명·태그.
- `data/facts.md` — 모든 자막의 근거. `SPEC.md` — 그 에피소드의 룩·장면 설계.
- `renders/`, `.hyperframes/`, `assets/kit3d/cache/` 는 커밋하지 않는다(용량 큼, 다시 만들 수 있음).

## 반드시 지킬 것
1. **복제 금지:** 벤치마크 채널의 대본 문장·썸네일·그래픽·채널명·빨간 단색을 쓰지 않는다. 벤치마크 원본 자료는 `raw/` 에만, 커밋 금지.
2. **사실 확인:** 자막의 모든 사실은 `facts.md` 에 출처와 함께. 요약·2차 자료에서만 본 것은 ⚠️ 로 표시하고 업로드 전에 1차 자료로 확인.
   사인·범인이 확정되지 않았으면 단정하지 않는다. 미확정 관련자·생존자·유족 실명은 쓰지 않는다. 원문에 없는 세부를 그림으로 만들지 않는다.
3. **도식 원칙:** `docs/visual-style.md` 의 7개 원칙. 검수에서 어긴 장면은 고친다.
4. **YouTube 봇 확인:** 사용자 지시(2026-11-22)로 yt-dlp 표준 옵션으로 다시 시도한다 — JS 실행기(deno)와 다른 플레이어 클라이언트
   (`YTDLP_ARGS="--js-runtimes deno:<경로> --extractor-args youtube:player_client=web_safari" python3 scripts/benchmark.py ...`).
   쿠키·남의 계정·신원을 속이는 프록시는 쓰지 않는다. 그래도 막히면 `--offline` 으로 기존 자료를 쓴다. 받은 원본은 `raw/` 에만(커밋 금지).
5. **check 를 통과시키려고 기준을 낮추지 않는다.** 경고도 읽고, 남기는 경고는 이유를 보고한다.
6. **목소리는 본인 것만**(`config/voice.json → consent: own`). 녹음·생성 음성은 커밋하지 않는다.
7. **업로드는 사람이 결정한다.** 이 하네스에는 업로드 단계가 없다. 결과물 파일과 썸네일까지만 만든다.
8. **"완성"은 parity-judge 가 전 영역 동급이라고 판정했을 때만 쓴다.** 아니면 판정표와 남은 일을 보고한다.
9. 렌더 결과는 직접 확인한다: 장면마다 프레임 1장 이상(ffmpeg 로 뽑아 Read), 음량 측정(`ffmpeg -af loudnorm=print_format=summary`).
   소리는 측정만 했다면 "들어보지 않았다"고 보고한다.

## 자주 쓰는 명령
```bash
bash scripts/setup.sh                                   # 새 환경: 설치·자산 복원·재현 확인 (docs/SETUP.md). 이어서 할 일은 STATUS.md
python3 scripts/benchmark.py @unlock_kr                 # 벤치마크 수집(봇 확인 시 --offline)
python3 scripts/topics.py list --top 10                 # 소재 후보 순위 (add / check / set / show)
python3 scripts/new_episode.py ep02-<slug> "제목"        # 새 에피소드 (film 키트·자료·음악 폴더 포함)
python3 scripts/gates.py episodes/<ep>                  # 관문 장부: 어디까지 왔나, 다음 관문 (pass/fail/waive)
python3 scripts/parity_check.py episodes/<ep>           # 레퍼런스 동급 검사 (--strict 관문, --test 시험편, --render renders/pilot.mp4)
python3 scripts/kit3d.py episodes/<ep>                  # film 키트 코드 + kit3d.json 자산 복사
python3 scripts/voice.py pack episodes/<ep>              # 내레이션 줄 내보내기 → Colab → voice.py import
cd episodes/<ep>
python3 data/build_script.py && python3 build.py        # 대본·장면 → 컴포지션
npx hyperframes check                                   # 린트·레이아웃·대비·타이밍
npx hyperframes snapshot --at 1,10,20                   # 프레임 확인
npx hyperframes render --start 0 --end 150 -o renders/pilot.mp4   # 파일럿 렌더(콜드 오픈~첫 질문)
npx hyperframes render -o renders/<ep>.mp4              # 렌더
bash ../../scripts/thumbnail.sh . c1 c2                 # 썸네일 컨셉 촬영·보정·검수 (thumbnail/c*.html)
ffmpeg -i renders/<ep>.mp4 -c:v libx264 -crf 25 -maxrate 9M -bufsize 18M -c:a copy -movflags +faststart renders/<ep>-preview.mp4
```
