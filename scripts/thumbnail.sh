#!/usr/bin/env bash
# Thumbnails for an episode (docs/thumbnail-formula.md).
#   bash scripts/thumbnail.sh episodes/<ep>            # every concept page thumbnail/c*.html
#   bash scripts/thumbnail.sh episodes/<ep> c2 c3      # only these
# Each concept page is a thumbkit still. It declares, in HTML comments:
#   <!-- assets: model:cigarette_pack texture:old_wood_floor hdri:evening_road_01_puresky -->
#   <!-- grade: --mode spot --glow 0.3 -->
#   <!-- text: "73년" "이름 없던 남자" -->        (optional A/B text board)
# Output: thumbnail/out/{beauty,mask,thumb}-<c>.png|jpg, thumb-<c>-text.jpg, review.png/json.
# Legacy (ep01): no c*.html → shoot thumbnail/thumb.html and run thumbnail/make_thumb.py "$@".
set -euo pipefail
EP="$(cd "$1" && pwd)"; shift
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PORT="${PORT:-8765}"
REL="${EP#$ROOT/}"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
export NODE_PATH="$(npm root -g)"

shopt -s nullglob
pages=("$EP"/thumbnail/c*.html)
if [ ${#pages[@]} -eq 0 ]; then
  node "$HERE/shoot_thumb.cjs" "http://127.0.0.1:$PORT/$REL/thumbnail/thumb.html" "$EP/thumbnail/raw.png"
  (cd "$EP" && python3 thumbnail/make_thumb.py "$@")
  exit 0
fi

python3 "$HERE/thumb_assets.py" need "$EP/thumbnail"
OUT="$EP/thumbnail/out"; mkdir -p "$OUT"
for page in "${pages[@]}"; do
  c="$(basename "$page" .html)"
  if [ $# -gt 0 ] && [[ " $* " != *" $c "* ]]; then continue; fi
  echo "== $c"
  node "$HERE/shoot_thumb.cjs" "http://127.0.0.1:$PORT/$REL/thumbnail/$c.html" "$OUT/beauty-$c.png" "$OUT/mask-$c.png"
  grade="$(python3 - "$page" grade <<'PY'
import re, sys
m = re.search(r"<!--\s*" + sys.argv[2] + r":(.*?)-->", open(sys.argv[1], encoding="utf-8").read(), re.S)
print(m.group(1).strip() if m else "")
PY
)"
  # shellcheck disable=SC2086
  python3 "$HERE/thumb_grade.py" "$OUT/beauty-$c.png" "$OUT/mask-$c.png" "$OUT/thumb-$c.jpg" $grade
  text="$(python3 - "$page" text <<'PY'
import re, sys
m = re.search(r"<!--\s*" + sys.argv[2] + r":(.*?)-->", open(sys.argv[1], encoding="utf-8").read(), re.S)
print(m.group(1).strip() if m else "")
PY
)"
  if [ -n "$text" ]; then
    eval "tx=($text)"
    python3 "$HERE/thumb_grade.py" "$OUT/beauty-$c.png" "$OUT/mask-$c.png" "$OUT/textboard-$c.jpg" $grade --text "${tx[0]}" --sub "${tx[1]:-}"
  fi
done
python3 "$HERE/thumb_review.py" "$OUT"
