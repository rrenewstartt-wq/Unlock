---
name: plan
description: 선정된 사건 하나를 기획안(관점, 제목·썸네일, 7단계 구성, 장면 계획, 앰버 초점, 작업량)으로 만든다. "기획해줘", "이걸로 하자", /scout 다음 단계. 기획안이 승인되면 /make-episode 로 넘긴다.
---

# /plan <slug>

1. 상태가 `검증됨`·`선정` 이 아니면 먼저 `source-verifier` 로 검증한다.
2. `episode-planner` 에게 slug 를 넘긴다 → `data/topics/plans/<slug>.md`.
3. 기획안을 직접 읽고 확인한다:
   - 모든 사실에 출처 번호가 있나, ⚠️ 가 표시됐나
   - 위험 회피(`risk_notes`)가 장면·자막 계획에 반영됐나
   - 첫 질문이 8~20% 지점, 장면당 앰버 초점 하나, 3D/도식/실제 자료 배분(`docs/quality-bar.md` 2절)
   - 길이가 롱폼(11~13분)을 채울 단서가 있는가
4. 사용자에게 보고: 제목 후보, 썸네일 2안, 7단계 요약, 장면 수와 새로 만들 세트, 길이·작업량.
5. 승인되면 `/make-episode` 로 넘긴다(에피소드 이름 `epNN-<slug>`, 기획안을 SPEC.md·script.txt 의 출발점으로).
