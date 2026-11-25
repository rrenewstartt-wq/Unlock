# thumbkit 자산 출처·라이선스

자산 파일은 `thumbkit/cache/` 에 받고(커밋 안 함), `thumbkit/assets.lock.json` 에 sha256 으로 잠근다.
새 PC: `python3 scripts/thumb_assets.py restore`. 받은 기록: `thumbkit/cache/CREDITS.txt`.

| 자산 | 출처 (로그인 없이 받음) | 라이선스 | 받는 명령 | 캐시 위치 |
|---|---|---|---|---|
| HDRI·PBR 텍스처·모델 | https://polyhaven.com (API) | CC0 | `thumb_assets.py get <kind> <id>` | `cache/hdris`, `textures`, `models` |
| 인물 몸 (Superhero_Male/Female_FullBody) | https://quaternius.itch.io/universal-base-characters — Universal Base Characters [Standard] | CC0 1.0 (`figures/LICENSE_Quaternius.txt`) | `thumb_assets.py figures` | `cache/figures/` |
| 머리카락 (Hair_Long·SimpleParted·Buns·Buzzed·Beard, 머리 뼈에 리깅된 glTF + 노멀맵 T_Hair_1/2_Normal) | 같은 팩(Universal Base Characters [Standard]) `Hairstyles/Rigged to Head Bone/` | CC0 1.0 | `thumb_assets.py actors` | `cache/figures/actors/` |
| 동작 1 (UAL1_Standard.glb: 걷기·서기·앉기·말하기·손 뻗기 등 43개) | https://quaternius.itch.io/universal-animation-library — Universal Animation Library [Standard] | CC0 1.0 (`actors/LICENSE_UAL1.txt`) | `thumb_assets.py actors` | `cache/figures/actors/` |
| 동작 2 (UAL2_Standard.glb: 고개 젓기·끄덕이기·팔짱·통화 등 43개) | https://quaternius.itch.io/universal-animation-library-2 — Universal Animation Library 2 [Standard] | CC0 1.0 (`actors/LICENSE_UAL2.txt`) | `thumb_assets.py actors` | `cache/figures/actors/` |

- Quaternius 팩은 itch.io 의 "Name your own price" 무료 내려받기(로그인 없음)로 받는다. 유료 [Source]/[Pro] 판은 쓰지 않는다.
- 머리카락 glTF 는 노멀맵만 남기고 회색 기본색 텍스처를 뺀다(색은 `actors.js` 가 입힌다). 몸 glTF 는 텍스처를 모두 뺀다.
- 옷은 자산이 아니다: `thumbkit/actors.js` 가 몸 메시에서 잘라 재단한다(코드로 만든 것, 외부 출처 없음).

## 받지 않은 후보 (기록만)
- Quaternius *Modular Character Outfits – Fantasy* [Standard] (CC0, 같은 리그): 받아서 살펴봤으나 무료판은 농부(Peasant)·레인저 2종뿐이고
  중세 옷(끈 달린 셔츠·감싼 장화)이라 현대 사건 재연에 맞지 않아 키트에 넣지 않았다.
- Mixamo(로그인 필요), Sketchfab CC-BY 인물(내려받기에 로그인 필요), three.js 예제의 Soldier/Michelle(원 출처가 Mixamo라 라이선스 불명확)은 쓰지 않는다.
- MakeHuman 시스템 옷(CC0)은 Blender/MakeHuman 실행이 필요해 이번에는 시도하지 않았다(후보).
