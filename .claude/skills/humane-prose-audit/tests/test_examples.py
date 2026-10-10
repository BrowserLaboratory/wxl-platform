"""End-to-end test for examples/*.md against the deterministic audit subset.

Each example exercises the Phase-1 preflight pipeline plus Phase-4 humane
scoring, but deliberately skips Phase-2 sub-agents (LLM-dependent and
nondeterministic) and Phase-3 fuzz mutators. The score is the agreed contract
in the spec scenario for task 8.6; the verdict is asserted from the
preflight findings shape directly.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


SKILL_ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_DIR = SKILL_ROOT / "examples"
ORCHESTRATOR = SKILL_ROOT / "scripts" / "audit_orchestrator.py"

REQUIRED_EXAMPLES = (
    "academic-pass.md",
    "blog-warn.md",
    "ai-flavored-fail.md",
    "humane-rewrite-pass.md",
)

DEFAULT_CONFIG = {
    "humane_signal": {
        "threshold": 60,
        "weights": {
            "burstiness": 0.30,
            "ai_tells": 0.20,
            "imperative_fog": 0.20,
            "lexical_diversity": 0.15,
            "boilerplate_stamp": 0.15,
        },
    }
}


def _import_aggregator():
    """Import output_aggregator without polluting sys.path globally."""
    if str(SKILL_ROOT / "scripts") not in sys.path:
        sys.path.insert(0, str(SKILL_ROOT / "scripts"))
    sys.modules.pop("output_aggregator", None)
    import output_aggregator  # noqa: WPS433
    return output_aggregator


def _run_preflight(target: Path, out_dir: Path) -> None:
    """Run Phase 1 preflight via subprocess. Raises if it fails."""
    cmd = [
        sys.executable,
        str(ORCHESTRATOR),
        str(target),
        "--phase",
        "1",
        "--no-fuzz",
        "--out",
        str(out_dir),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise AssertionError(
            f"audit_orchestrator failed on {target}:\n"
            f"  stdout: {result.stdout[:500]}\n"
            f"  stderr: {result.stderr[:500]}"
        )


def _load_preflight(run_dir: Path) -> list[dict]:
    pre_dir = run_dir / "preflight"
    out: list[dict] = []
    for p in sorted(pre_dir.glob("*.json")):
        if p.name.startswith("_"):
            continue
        out.append(json.loads(p.read_text(encoding="utf-8")))
    return out


def _score_for(example_name: str, tmp_path: Path) -> dict:
    target = EXAMPLES_DIR / example_name
    run_dir = tmp_path / example_name.replace(".md", "")
    _run_preflight(target, run_dir)
    preflight = _load_preflight(run_dir)
    agg = _import_aggregator()
    return agg.compute_humane_score(preflight, DEFAULT_CONFIG)


# ---------------------------------------------------------------------------
# Existence


@pytest.mark.parametrize("name", REQUIRED_EXAMPLES)
def test_example_file_exists(name):
    assert (EXAMPLES_DIR / name).is_file(), f"{name} missing"


# ---------------------------------------------------------------------------
# humane_score thresholds (spec task 8.6)


def test_academic_pass_humane_score_at_or_above_60(tmp_path):
    score = _score_for("academic-pass.md", tmp_path)
    assert score["score"] >= 60, (
        f"academic-pass.md expected humane_score>=60, got {score['score']} "
        f"(band={score['band']})"
    )


def test_ai_flavored_fail_humane_score_below_50(tmp_path):
    score = _score_for("ai-flavored-fail.md", tmp_path)
    assert score["score"] < 50, (
        f"ai-flavored-fail.md expected humane_score<50, got {score['score']} "
        f"(band={score['band']})"
    )


# ---------------------------------------------------------------------------
# Verdict — derived purely from preflight critical-count (no LLM)


def _preflight_critical_count(run_dir_or_preflight) -> int:
    if isinstance(run_dir_or_preflight, Path):
        preflight = _load_preflight(run_dir_or_preflight)
    else:
        preflight = run_dir_or_preflight
    count = 0
    for check_out in preflight:
        for f in check_out.get("findings", []) or []:
            if f.get("severity") == "critical":
                count += 1
    return count


def test_academic_pass_has_no_critical_findings(tmp_path):
    # PASS verdict requires zero critical findings in preflight.
    target = EXAMPLES_DIR / "academic-pass.md"
    run_dir = tmp_path / "academic-pass"
    _run_preflight(target, run_dir)
    assert _preflight_critical_count(run_dir) == 0


def test_ai_flavored_fail_has_warn_or_fail_signals(tmp_path):
    # The ai-flavored example must produce *some* preflight signal — at least
    # one finding above the LOW severity, otherwise the score-based verdict
    # would not justify WARN/FAIL.
    target = EXAMPLES_DIR / "ai-flavored-fail.md"
    run_dir = tmp_path / "ai-flavored-fail"
    _run_preflight(target, run_dir)
    preflight = _load_preflight(run_dir)
    high_or_worse = 0
    for check_out in preflight:
        for f in check_out.get("findings", []) or []:
            if f.get("severity") in {"critical", "high", "medium"}:
                high_or_worse += 1
    assert high_or_worse >= 1, (
        "ai-flavored-fail.md should produce at least one medium-or-worse "
        "finding from the deterministic preflight checks"
    )
