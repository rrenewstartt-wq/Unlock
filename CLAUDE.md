# mystery-unlock-style 하네스 — Claude 운영 지침

이 폴더는 **해외 실화 미제사건 롱폼(16:9) 채널**을 만드는 하네스다. 벤치마크는 @unlock_kr 이고,
**형식만 가져오고 표현은 직접 만든다**(`docs/originality.md`). 영상은 HyperFrames(HTML → MP4)로 만든다.

## 파이프라인

```
[1 벤치마크]  scripts/benchmark.py @handle  → data/benchmark/<handle>/summary.json, docs/benchmark-report.md   (/benchmark)
[2 소재]     기획·소재 발굴 팀: case-scout → source-verifier + risk-reviewer → data/topics/backlog.json   (/scout)
[2.5 기획]   episode-planner → data/topics/plans/<slug>.md (관점·제목·7단계·장면 계획)                    (/plan)
[2.7 사실]   1차 자료 조사 → episodes/<ep>/data/facts.md (자막별 근거, ✅/⚠️)
[3 대본]     episodes/<ep>/data/script.txt (@장면 + 자막 한 줄씩, docs/script-formula.md 7단계)
[4 장면]     scripts/new_episode.py → scenes.py(장면 함수), assets/lib/*.js(3D 세트) → build.py
[5 검수]     npx hyperframes check + snapshot 리뷰 (docs/visual-style.md 도식 원칙)                      (/review)
[6 음성]     scripts/voice.py pack → Colab notebooks/voxcpm2_voice.ipynb(내 목소리 복제) → voice.py import → 음성 길이로 재계산 (docs/voice.md, 나중 단계)
[7 렌더]     npx hyperframes render → renders/ (약 35분/3분, 4코어 기준) → 미리보기본(ffmpeg CRF 25)
[8 썸네일]   썸네일 팀: thumb-director → thumb-builder(thumbkit 3D 정지 장면) → thumb-critic → thumbnail/out/   (/thumbnail, docs/thumbnail-benchmark.md → thumbnail-formula.md)
```

슬래시 스킬: `/benchmark` `/scout` `/plan` `/make-episode` `/review` `/thumbnail`. 팀 에이전트: `.claude/agents/`(기획·소재: case-scout, source-verifier, risk-reviewer, episode-planner / 썸네일: thumb-copywriter, thumb-copy-critic, thumb-director, thumb-builder, thumb-critic). HyperFrames 작업 전에는 `/hyperframes` 스킬을 먼저 읽는다(렌더 계약).

## 에피소드 폴더 계약 (`episodes/<ep>/`)
- `data/script.txt` → `python3 data/build_script.py` → `data/script.json`(장면·자막 시각). **대본은 여기만 고친다.**
  음성을 가져왔으면(`data/voice.json`) 시각은 음성 길이로, 아니면 읽기 속도로 계산된다.
- `scenes.py` — 장면 id 마다 `def <id>(sid, dur, q)`. 공통 도우미는 `scenes_kit.py`(wrap, clip, scene3d), 효과음은 `sfx_events(DATA)`.
- `python3 build.py` → `index.html`, `compositions/*.html`, 효과음 배치. **생성 파일(index.html, compositions/)은 손으로 고치지 않는다.**
- `assets/lib/world.js` — 마네킹·카메라 키 공용 3D 도구. 사건별 세트는 같은 폴더에 새 파일로.
- `data/facts.md` — 모든 자막의 근거. `SPEC.md` — 그 에피소드의 룩·장면 설계.
- `renders/`, `.hyperframes/` 는 커밋하지 않는다(용량 큼, 다시 만들 수 있음).

## 반드시 지킬 것
1. **복제 금지:** 벤치마크 채널의 대본 문장·썸네일·그래픽·채널명·빨간 단색을 쓰지 않는다. 벤치마크 원본 자료는 `raw/` 에만, 커밋 금지.
2. **사실 확인:** 자막의 모든 사실은 `facts.md` 에 출처와 함께. 요약·2차 자료에서만 본 것은 ⚠️ 로 표시하고 업로드 전에 1차 자료로 확인.
   사인·범인이 확정되지 않았으면 단정하지 않는다. 미확정 관련자·생존자·유족 실명은 쓰지 않는다. 원문에 없는 세부를 그림으로 만들지 않는다.
3. **도식 원칙:** `docs/visual-style.md` 의 7개 원칙. 검수에서 어긴 장면은 고친다.
4. **접근 제한 우회 금지:** YouTube 봇 확인이 뜨면 우회하지 말고 `--offline` 으로 기존 자료를 쓰거나 나중에 다시 수집.
5. **check 를 통과시키려고 기준을 낮추지 않는다.** 경고도 읽고, 남기는 경고는 이유를 보고한다.
6. **목소리는 본인 것만**(`config/voice.json → consent: own`). 녹음·생성 음성은 커밋하지 않는다.
7. **업로드는 사람이 결정한다.** 이 하네스에는 업로드 단계가 없다. 결과물 파일과 썸네일까지만 만든다.
8. 렌더 결과는 직접 확인한다: 장면마다 프레임 1장 이상(ffmpeg 로 뽑아 Read), 음량 측정(`ffmpeg -af loudnorm=print_format=summary`).
   소리는 측정만 했다면 "들어보지 않았다"고 보고한다.

## 자주 쓰는 명령
```bash
bash scripts/setup.sh                                   # 새 환경: 설치·자산 복원·재현 확인 (docs/SETUP.md). 이어서 할 일은 STATUS.md
python3 scripts/benchmark.py @unlock_kr                 # 벤치마크 수집(봇 확인 시 --offline)
python3 scripts/topics.py list --top 10                 # 소재 후보 순위 (add / check / set / show)
python3 scripts/new_episode.py ep02-<slug> "제목"        # 새 에피소드
python3 scripts/voice.py pack episodes/<ep>              # 내레이션 줄 내보내기 → Colab → voice.py import
cd episodes/<ep>
python3 data/build_script.py && python3 build.py        # 대본·장면 → 컴포지션
npx hyperframes check                                   # 린트·레이아웃·대비·타이밍
npx hyperframes snapshot --at 1,10,20                   # 프레임 확인
npx hyperframes render -o renders/<ep>.mp4              # 렌더
bash ../../scripts/thumbnail.sh . c1 c2                 # 썸네일 컨셉 촬영·보정·검수 (thumbnail/c*.html)
ffmpeg -i renders/<ep>.mp4 -c:v libx264 -crf 25 -maxrate 9M -bufsize 18M -c:a copy -movflags +faststart renders/<ep>-preview.mp4
```
