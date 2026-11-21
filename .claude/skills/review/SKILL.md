---
name: review
description: 에피소드를 레퍼런스 동급 기준(대본·화면·소리·사실)으로 검수하고 고친다. 자동 검사(parity_check) + script-critic + visual-critic 을 돌리고 P0 부터 고친다. "검수해줘", "어색한 장면 찾아줘", "도식 개선", "레퍼런스랑 비교해줘", 렌더 전에 사용.
---

# /review [ep]

인자가 없으면 가장 최근에 수정한 `episodes/*`. 기준은 `docs/quality-bar.md`.

## 1. 기술 검사 + 숫자
```bash
cd episodes/<ep> && python3 data/build_script.py && python3 build.py && npx hyperframes check --json
python3 ../../scripts/parity_check.py .        # 3분 시험편이면 --test
```
check 오류 0. 경고는 하나씩 읽는다(첫 프레임에 숨김이 안 먹는 `tl.set` 은 CSS `opacity: 0` 으로, 읽기 시간 부족은 노출 연장).
parity 의 ❌ 를 목록으로 만든다.

## 2. 검수 팀 (동시에)
- `script-critic`: 대본 사실·형식·몰입 (대본을 바꿨을 때만)
- `visual-critic`: 스냅샷 리뷰 시트로 P0/P1
- `editor`: 정지 구간·기록 3초 컷 배치(화면 리듬)
- `fact-checker`: 화면 글자 전체 사실 대조(렌더 전이면 반드시)

## 3. 고치기
P0 → parity ❌ → P1 순서. 3D 세트 문제는 `set-builder` 에게, 도식은 `diagram-builder` 에게, 리듬은 `editor` 에게, 대본은 `script-writer` 에게.
고친 장면만 다시 스냅샷. 같은 장면을 3번 고쳐도 안 되면 멈추고 남은 문제를 보고한다. **기준을 낮춰서 통과시키지 않는다.**

## 4. 보고
표: 장면 | 문제(P0/P1/parity) | 고친 방법 | 남음. 남긴 경고와 이유, ⚠️ 사실 목록, parity 통과/실패 수.
