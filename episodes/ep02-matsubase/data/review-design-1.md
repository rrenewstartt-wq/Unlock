# ep02 설계 검토 1차 (visual-critic, 2026-11-21) — design 관문 미달

storyboard-director 가 이 목록으로 SPEC.md·shots.json 을 고친 뒤 visual-critic 설계 검토를 다시 받는다.
레퍼런스 블라인드 시트는 없었다(reference-pack 프레임 0장) — 문서의 화면 문법 기준.

## P0
- 2D 16장면(calendar, mikan_question, confession_day, first_story, feb5_change, cloth_story, verdict_basis, prison_years, seizure_dates,
  cloth_origin, autopsy_memo, second_wound, cloth_holes, verdict_order, after, open_ledger; 14.4~22.9초)이 한 판에 요소를 더하는 방식이라
  렌더 실측(장면 변화 0.28, 10초 밝기 차 12/255)에서 한 컷 14~23초로 잡힘 → 화면 변화율 74% 미달 위험.
  장면마다 **8초 안에** 확대·재구도 / 판 교체 / 기록·3D 컷 끼우기를 SHOTS 에 명시. calendar 는 c1~c4 / c5~c7 두 판.
  no_blood·not_requested·appeal·counter34(9~11.7초)도 내레이션 뒤 12초를 넘지 않게.

## P1
1. 인물 시간 3% → tv_day(앉은 뒷모습, 경찰 프레임 밖), trial_1986 c3·c5(피고인석 뒷모습 원경), workshop_intro(원경 실루엣/사람 카드, 공구 일반형, no_photo_reason ①).
2. room_morning 귤 19개 = 앰버와 같은 색 → 귤 망 채도 낮춤, 앰버는 껍질 하나.
3. 1/5 밤 고타츠 위 잔 4개(기록 없음) → 흐린 배경·이름표. night 모드에 귤 망·껍질 빼기.
4. night_road c1~c4 경찰서 쪽 밤 원경·이름표, c5 고정 와이드 빈 길(걷는 시점 이동 금지).
5. 벽시계 인서트(기록 없는 시각) → 흐림 또는 조서·스탠드.
6. arrest_wish 와이드 4번 → 2번. 측면은 완전 역광 실루엣/3/4 뒤.
7. 폴리그래프: 금속 PBR 케이스·노브·종이 롤·케이블(상표 없음), 인물과 기기는 다른 컷.
8. police 세트 80초 연속 → mikan_table 은 낮빛 소품 인서트, arrest_wish 는 밤 형광등 한 줄.
9. river_search 장갑 7개·강 모습(기록 없음) → 증거 테이블 꼬리표 컷, 강은 먼 수면 일반형.
10. feb14 맨땅 위 천·흐린 낮 → 모퉁이 컷과 천 컷 분리, 천은 테이블·꼬리표 위, 중립 조명.
11. 왼소매는 「上記シャツと同じ生地柄」([2] 15쪽) → 다섯 조각 같은 천 질감, 차이는 빛으로만. 주름·두께·올.
12. other_rags 때가 피 얼룩처럼 → 균일한 어두운 남색.
13. golf_wear 게이지는 옷 옆 빈 테이블에.
14. shoe_can 창고 문틈 빛·부엌 창 불빛 빼기 → 가로등·월광.
15. vault_open 선반 통로 와이드 빼고 열람 테이블 중심, 인물 역광 원경.
16. 빈 법정 3장면 53초 → 피고인석 뒷모습 원경, 천장등 중성색, 앰버 한 곳.
17. handle_wood 7컷 같은 칼 → 칼 3~4컷, 나머지 인용 판·이름표.
18. hook c2 출처 "후쿠오카고법 결정문(2017) · 조서 요약 부분", 보드 위 인화, 줄 크롭은 종이 띠.
19. 글자 크롭은 항상 보드 위 종이 띠(contain), 지면→줄 순서, 건물·지도 섞기. five_pieces c2→feb14 c5→no_blood c2 몰림 풀기(하나를 tv_day~trial_1986 146초 구간으로).
20. 실명 크롭: [1] 5쪽 아래 이름 줄·6쪽 전체 금지, [2] 1쪽은 주문 줄만, verdict_2019 c6 은 주문 블록(無罪~没収)만. **이미지 파일 자체를 자른다(CSS 크롭·풀백 금지).**
21. place 지도가 도식으로 바뀌면 표기 `도식`.
22. cloth_holes 견본 셋 → 두 견본(옷 구멍 = 상처 입구).
23. after 사망 표현: 점선 대신 0.25 물림 + "세상을 떠남".
24. verdict_order 도장은 잉크색 외곽선(빨간 인주 금지).
25. appeal c5 요소는 기록 컷이 끝난 뒤(editor).
26. SPEC 본문 "25~27 연속" 오표기.

## 파일럿
렌더 범위 0~137초 유지. 판정용 시험 컷 추가: interrogation c1, arrest_wish c5(측면 실루엣), vault_open c1(서 있는 역광 인물),
five_pieces c5(왼소매 매크로), blade_width c6(3D 게이지), feb5_change 판 하나(장부).
