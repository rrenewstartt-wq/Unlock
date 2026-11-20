---
name: scout
description: 기획·소재 발굴 팀을 돌려 다음 편 사건 후보를 찾고 검증·위험 검토·점수화해 상위 후보표를 낸다. "소재 찾아줘", "다음 편 뭐 하지", "주제 바꿔서", 지역·테마를 주며 후보를 요청할 때 사용.
---

# /scout [지역·테마·개수]  예) /scout, /scout 일본, /scout DNA로 신원 찾은 사건 8

팀: `case-scout` → `source-verifier` → `risk-reviewer` (`.claude/agents/`). 기준: `docs/topic-criteria.md`.

1. **발굴:** `case-scout` 에게 요청(지역·테마·개수 전달). 결과 `data/topics/inbox-YYYYMMDD-scout.json`.
   ```bash
   python3 scripts/topics.py add data/topics/inbox-YYYYMMDD-scout.json
   python3 scripts/topics.py list --top 10
   ```
   이미 다룬 사건은 `add` 가 거른다(`data/topics/covered.json`).
2. **검증 + 위험 (동시에):** 상위 5~6개 slug 를 `source-verifier` 와 `risk-reviewer` 에게 나눠 준다.
   둘의 결과를 반영한다(`topics.py set`, 필요하면 후보 JSON 을 고쳐 다시 `add` 대신 `show`→수정→`rescore`).
3. **보고:** 표로 — 순위 | 사건 | N년 | 한 줄 | 결말의 성격(판결/신원 확인/…) | 위험과 회피 | 제목 후보 1개.
   "사람 판단 필요"로 올라온 위험은 따로 적는다.
4. 사용자가 고르면 `python3 scripts/topics.py set <slug> 선정` → `/plan <slug>`.
   "알아서"면 위험이 2 이하인 것 중 1위.

지킬 것: 후보의 사실은 출처에 있는 그대로. 유튜브·사이트가 막히면 우회하지 않고 막혔다고 보고한다.
