#!/usr/bin/env bash
# One-shot setup on a new machine / account / cloud session — then checks that it reproduces the committed results.
#   bash scripts/setup.sh            # from the mystery-unlock-style folder (Linux, macOS, Windows: Git Bash or WSL)
# Safe to run again: it only fetches what is missing.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n== %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ '$1' 이 없습니다 — docs/SETUP.md 의 설치 표를 보세요"; exit 1; }; }

say "1/6 도구 확인"
need python3; need node; need npm; need ffmpeg; need curl
python3 - <<'PY'
import sys
assert sys.version_info >= (3, 10), "Python 3.10 이상이 필요합니다"
PY
node -e 'const v=+process.versions.node.split(".")[0]; if (v<18) { console.error("Node 18 이상이 필요합니다"); process.exit(1) }'
command -v yt-dlp >/dev/null 2>&1 || echo "  (선택) yt-dlp 없음 — 벤치마크 재수집(scripts/benchmark.py)에만 필요"
echo "  python $(python3 -c 'import platform;print(platform.python_version())') · node $(node -v) · $(ffmpeg -version | head -1 | cut -d' ' -f1-3)"

say "2/6 Python 패키지 (requirements.txt, 버전 고정 — 결과 파일이 바이트까지 같으려면 같은 버전이어야 함)"
python3 -m pip install -q -r requirements.txt 2>/dev/null || python3 -m pip install -q --user -r requirements.txt \
  || python3 -m pip install -q --break-system-packages -r requirements.txt

say "3/6 Playwright + Chromium (썸네일 3D 촬영)"
if NODE_PATH="$(npm root -g)" node -e "require('playwright')" 2>/dev/null; then
  echo "  playwright $(NODE_PATH="$(npm root -g)" node -e "console.log(require('playwright/package.json').version)") 있음"
else
  npm install -g playwright@1.63.0
  npx --yes playwright@1.63.0 install chromium
fi

say "4/6 썸네일 3D 자산 (Poly Haven CC0 + Quaternius CC0) — thumbkit/assets.lock.json 대로 받고 sha256 검증"
python3 scripts/thumb_assets.py restore

say "5/6 벤치마크 썸네일 (분석용, 커밋 안 함)"
python3 scripts/fetch_benchmark.py

say "6/6 재현 확인"
(cd episodes/ep01-somerton && python3 data/build_script.py >/dev/null && python3 build.py)
python3 scripts/verify_repro.py

cat <<'TXT'

준비 끝. 다음:
  - 현재 상태와 다음 할 일: STATUS.md
  - 영상: cd episodes/ep01-somerton && npx --yes hyperframes@0.9.59 check   (렌더: npm run render)
  - 썸네일 3D 컨셉까지 같은지: python3 scripts/verify_repro.py --3d
TXT
