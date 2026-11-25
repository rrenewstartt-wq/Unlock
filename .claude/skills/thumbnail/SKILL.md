---
name: thumbnail
description: 썸네일 팀(thumb-director → thumb-builder → thumb-critic)을 돌려 한 편의 썸네일 2~3안을 만들고 검수해 고르게 한다. @unlock_kr 썸네일 원리(글자 없음·색 하나·튀는 것 하나·상징물 클로즈업·암시·필름 질감)를 앰버로 적용. "썸네일 만들어줘", "썸네일 다시", 기획안 승인 뒤나 렌더 뒤에 사용.
---

# /thumbnail <ep 폴더 또는 slug>   예) /thumbnail episodes/ep02-gaston

기준서: `docs/thumbnail-formula.md`. 도구: `thumbkit/thumbkit.js`, `scripts/thumbnail.sh`, `thumb_grade.py`, `thumb_review.py`, `thumb_assets.py`.

0. **문구(먼저):** `thumb-copywriter` → `thumbnail/copy.md`(공식은 `docs/thumbnail-copy.md`), `thumb-copy-critic` 이 상위 3개를 고른다. 문구가 이미지보다 클릭에 크게 작용한다(`docs/thumbnail-benchmark.md`).
1. **컨셉:** `thumb-director` 에게 ep 폴더(없으면 `data/topics/plans/<slug>.md`)를 준다 → `thumbnail/concepts.md` (3~4안, spot·flood 섞기).
   사용자에게 컨셉 표를 보이고, 고르라고 하지 않았으면 추천 2~3안으로 진행.
2. **제작:** `thumb-builder` 에게 컨셉 번호들을 준다 → `thumbnail/cN.html` + `thumbnail/out/thumb-cN.jpg`, `textboard-cN.jpg`.
   컨셉끼리는 서로 독립이라 builder 를 여러 명 동시에 돌려도 된다(같은 cN 을 두 명에게 주지 않는다).
3. **검수:** `thumb-critic` → 판정표. "수정"은 builder 에게 고칠 점을 넘겨 한 번 더, "불합격"은 버린다.
4. **보고:** `review.png` 와 합격안 `thumb-cN.jpg` 를 사용자에게 보내고(SendUserFile), 표(안 | 상징물 | 모드 | 168px 가독 | 제목 조합 | 추천).
   사용자가 고른 안을 `thumbnail/thumb-final.jpg` 로 복사.

지킬 것: 벤치마크 썸네일 원본은 비교용으로만(커밋·합성·트레이싱 금지). 구도·색(빨간 단색 포함)은 레퍼런스와 같아도 된다. 기록에 없는 것은 그리지 않는다.
업로드·A/B 테스트 설정은 사람이 한다.
