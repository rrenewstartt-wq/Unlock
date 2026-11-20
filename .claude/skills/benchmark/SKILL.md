---
name: benchmark
description: 벤치마크 채널(기본 @unlock_kr)의 공개 데이터를 다시 수집해 제목·대본·화면·썸네일 형식 분석을 갱신한다. "벤치마크 다시", "채널 분석 업데이트", 다른 채널을 벤치마크로 바꿀 때 사용.
---

경쟁 채널 전체(제목·길이·조회수 배수)는 `python3 scripts/competitors.py` → `docs/competitor-report.md` 를 갱신한다(채널 목록 `config/competitors.json`).

# /benchmark [@handle]

1. 수집 + 요약:
   ```bash
   python3 scripts/benchmark.py @unlock_kr        # 인자 없으면 @unlock_kr
   ```
   YouTube 가 봇 확인을 요구하면 우회하지 않는다. `--offline` 으로 `raw/` 의 기존 자료만 요약하고, 수집이 막혔다고 보고한다.
2. 읽는다: `data/benchmark/<handle>/summary.json`, `raw/thumbs-sheet.jpg`, `raw/<id>.sb*.webp`(스토리보드),
   조회수 상위 영상의 `raw/<id>.txt` 앞 600자·끝 400자.
3. `docs/benchmark-report.md` 의 수치·패턴과 비교해 달라진 점을 찾는다:
   - 새 영상, 조회수 분포, 영상 길이, 분당 글자 수, 어미 비율
   - 제목 패턴(`title_pattern_counts`)과 새로 보이는 제목 형식
   - 도입·되감기·소품 회수 같은 대본 장치가 유지되는지
   - 스토리보드·썸네일에서 화면 문법(3D·도식·자막·색)이 바뀌었는지
4. 달라진 점이 있으면 `docs/benchmark-report.md` 를 갱신하고, 대본·화면 규칙(`script-formula.md`, `visual-style.md`)
   수정안은 사용자에게 제안만 한다(바로 바꾸지 않는다).

원본 자료는 분석용이다. 문장·이미지를 에피소드에 옮기지 않는다(`docs/originality.md`).
