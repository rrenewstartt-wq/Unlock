# 내레이션 — 내 목소리 복제 (VoxCPM2)

내레이션은 **본인 목소리**를 [VoxCPM2](https://huggingface.co/openbmb/VoxCPM2)(Apache-2.0)로 복제해 만든다.
VoxCPM2 는 NVIDIA GPU(약 8GB)가 필요해서 Google Colab(무료 T4)에서 돌린다: `notebooks/voxcpm2_voice.ipynb`.
음악은 아직 넣지 않는다(나중 단계).

## 흐름
```
대본 data/script.txt ──pack──► voice/pack.json ──Colab──► <ep>_voice.zip ──import──► assets/voice/*.wav + data/voice.json
                                                                                         └► build_script.py 가 음성 길이로 재계산
```
```bash
python3 scripts/voice.py pack   episodes/<ep>            # 대본 한 줄 = 음성 한 조각 (id: s01_c01 …)
# Colab: 1단계(처음 한 번) 내 목소리 등록 → 2단계 pack.json 올리고 생성 → zip
python3 scripts/voice.py import episodes/<ep> <zip>      # 앞뒤 무음 정리, 음량 통일(-16 LUFS), 길이 기록
python3 scripts/voice.py status episodes/<ep>
cd episodes/<ep> && python3 data/build_script.py && python3 build.py && npx hyperframes check
```
import 뒤에는 **자막·장면 길이·3D 카메라·도식 등장 시점이 모두 음성에 맞춰진다**(전부 자막 시각을 따르므로).

## Colab 없이 이 컴퓨터에서 (CPU)
GPU 가 없어도 된다. CPU 4코어에서 실시간의 약 4배(16분 내레이션 ≈ 1~1.5시간, 2026-11-21 측정, 복제 없는 시험 문장 기준).
```bash
python3 scripts/voice_local.py setup                         # .venv-voice/ 에 CPU torch + voxcpm==2.0.3 (커밋 안 함)
python3 scripts/voice_local.py ref <내 녹음 파일>              # → voice/my_voice_ref.wav (reference_text 를 그대로 읽은 녹음)
python3 scripts/voice.py pack episodes/<ep>
python3 scripts/voice_local.py gen episodes/<ep> --limit 3     # 먼저 3줄만 만들어 들어 본다
python3 scripts/voice_local.py gen episodes/<ep>               # 나머지(이미 만든 줄은 건너뜀)
python3 scripts/voice.py import episodes/<ep> episodes/<ep>/voice/out
```
voxcpm 2.x 의 `generate()` 에는 `seed` 인자가 없다. 노트북과 이 도구는 생성 직전에 `torch.manual_seed` 로 고정한다.

## 대본 쓰는 법 (읽기)
- 한 줄 = 자막 하나 = 음성 한 조각. 한 줄에 숨 한 번으로 읽히는 길이(22자 안팎).
- 숫자·외국어처럼 읽기가 헷갈리는 줄은 `자막 || 읽을 문장` 으로 읽는 법을 적는다:
  `1948년 12월 1일 오전 6시 30분 || 천구백사십팔 년 십이 월 일 일, 오전 여섯 시 삼십 분`
  `넥타이엔 'T. 킨'이라는 이름 || 넥타이엔 티 킨이라는 이름`
- 대본을 고치면 hash 가 바뀌어 옛 음성은 무시된다(읽기 속도 타이밍으로 돌아감). 다시 pack → 생성 → import.
  Colab 은 문장이 같은 줄을 다시 만들지 않으므로 바뀐 줄만 새로 생성된다.

## 내 목소리 등록 (처음 한 번)
- 조용한 방에서 `config/voice.json → reference_text` 문장을 그대로 10~30초 녹음(휴대폰 녹음도 됨).
- `mode: ultimate_clone`(기본): 녹음 문장까지 함께 넣어 음색을 최대한 재현. 문장별 톤 지시는 쓰지 않는다.
  `controllable_clone` 으로 바꾸면 `scene_styles` 의 톤 지시(예: `"dusk": "slow, hushed"`)가 줄 앞에 붙는다.
- 한국어 품질은 시작 전에 [VoxCPM 데모](https://huggingface.co/spaces/OpenBMB/VoxCPM-Demo)에서 짧게 확인한다.

## 지킬 것
- `consent: own` — **본인 목소리만.** 다른 사람·크리에이터 목소리는 복제하지 않는다(노트북이 consent 를 확인).
- 녹음 원본과 생성 음성(`assets/voice/`, `data/voice.json`)은 **커밋하지 않는다**(목소리는 개인 정보).
- 업로드할 때 유튜브의 합성·변형 콘텐츠 표시 대상인지 그 시점의 정책을 확인한다.
