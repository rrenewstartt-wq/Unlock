"""Scaffold a new episode from the shared engine in episodes/ep01-somerton.

    python3 scripts/new_episode.py ep02-<slug> "에피소드 제목"

Copies the engine (fonts, sound effects, grain, Three.js kit, build scripts, scene kit) and writes
templates for the script, facts, SPEC and a placeholder scene per @scene in data/script.txt, so
`python3 data/build_script.py && python3 build.py && npx hyperframes check` works right away.
Case-specific 3D sets (beach.js, station.js) are not copied: build new ones with the film kit
(thumbkit/film.js, copied by scripts/kit3d.py; see beach.js).
"""
import json
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
REF = HERE / "episodes" / "ep01-somerton"
ENGINE = [
    "assets/fonts", "assets/sfx", "assets/grain.png",
    "assets/lib/three.module.min.js", "assets/lib/three.core.min.js", "assets/lib/Three-LICENSE.txt", "assets/lib/world.js",
    "build.py", "scenes_kit.py", "data/build_script.py", "package.json", "hyperframes.json",
    "CLAUDE.md", "AGENTS.md", ".gitignore", "thumbnail/make_thumb.py",
]

SCRIPT_TPL = """# 장면은 @id 로 시작하고, 그 아래 한 줄이 자막 하나다(22자 안팎).
# 공식(docs/script-formula.md): 도입(일시·장소) → 이상한 점 → 떡밥(무려 N년) → 되감기 → 수사 → 반전·신원 → 남은 질문·소품 회수
@opening
19XX년 X월 X일 오전 X시
(장소)에서 (무엇)이 발견됩니다
@anomaly
그런데 이상한 점이 있었습니다
@teaser
이 사건이 풀리는 데
무려 N년이 걸렸습니다
@ending
(도입의 소품을 다시 꺼내는 마지막 한 줄)
"""

FACTS_TPL = """# 사실 근거 — {name}

담당 fact-checker, 검수 source-verifier. ✅ = 원문 확인, ⚠️ = 요약·2차 자료에서만 확인 또는 자료끼리 다름(업로드 전 0), ❌ = 틀린 통념(쓰지 않음).
자막과 사실의 연결은 data/fact_map.json {{"captions": {{"<자막>": ["F01"]}}}} — parity_check "자막 근거 연결".

## 출처
| # | 자료 | 종류(1차/주요 언론/2차) | 위치(URL, 쪽) | 열람일 |
|---|---|---|---|---|

## 사실
| ID | 사실(자막이 될 단위, 한 줄) | 출처(#·쪽·원문 짧은 인용) | 상태 |
|---|---|---|---|

## 일부러 쓰지 않은 것
- 확정되지 않은 사인·범인, 생존자·유족 실명, 라이선스 미확인 사진
"""

SCENES_TPL = (pathlib.Path(__file__).resolve().parent / "scenes_template.py").read_text(encoding="utf-8")


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    slug, name = sys.argv[1], sys.argv[2]
    dst = HERE / "episodes" / slug
    if dst.exists():
        raise SystemExit(f"이미 있습니다: {dst}")
    for rel in ENGINE:
        src, out = REF / rel, dst / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        (shutil.copytree if src.is_dir() else shutil.copy2)(src, out)
    (dst / "compositions").mkdir(exist_ok=True)
    (dst / "meta.json").write_text(json.dumps({"id": slug, "name": name}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (dst / "data" / "script.txt").write_text(SCRIPT_TPL, encoding="utf-8")
    (dst / "data" / "facts.md").write_text(FACTS_TPL.format(name=name), encoding="utf-8")
    (dst / "scenes.py").write_text(SCENES_TPL.replace("__NAME__", name), encoding="utf-8")
    spec = (REF / "SPEC.md").read_text(encoding="utf-8")
    spec = spec.split("\n## ", 1)
    (dst / "SPEC.md").write_text(
        f"# SPEC — {slug} 「{name}」\n\nGOAL / OUTPUT / TIME / LOOK / OBJECTS / MOTION / SHOTS / BANNED / QA 를 ep01 SPEC.md 처럼 채운다.\n"
        "룩·도식 원칙은 ../../docs/visual-style.md 를 따른다.\n", encoding="utf-8")
    (dst / "data" / "shots.json").write_text(json.dumps({"key_scenes": [], "_doc": "핵심 장면마다 {scene, why, want, photo, no_photo_reason} — docs/quality-bar.md 핵심 장면"}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (dst / "data" / "fact_map.json").write_text(json.dumps({"captions": {}}, ensure_ascii=False) + "\n", encoding="utf-8")
    (dst / "data" / "gates.json").write_text(json.dumps({"stages": {}, "waivers": [], "log": []}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (dst / "kit3d.json").write_text(json.dumps({"assets": ["figure:quaternius"]}) + "\n", encoding="utf-8")
    import subprocess
    subprocess.run([sys.executable, str(HERE / "scripts" / "kit3d.py"), str(dst)], check=True)
    for d, readme in [("assets/archive", "# 실제 자료 출처 대장\n\n| 파일 | 무엇 | 출처 URL | 라이선스(근거) | 표기 문구 | 쓸 장면 | 주의 |\n|---|---|---|---|---|---|---|\n"),
                      ("assets/music", "# 음악 라이선스\n\n| 파일 | 곡 | 출처 | 허가 근거 |\n|---|---|---|---|\n")]:
        (dst / d).mkdir(parents=True, exist_ok=True)
        (dst / d / ("SOURCES.md" if "archive" in d else "LICENSE.md")).write_text(readme, encoding="utf-8")
    print(f"만들었습니다: {dst}\n다음: python3 scripts/gates.py {dst.relative_to(HERE)} — 관문 장부(/make-episode, 기준 docs/quality-bar.md)")


if __name__ == "__main__":
    main()
