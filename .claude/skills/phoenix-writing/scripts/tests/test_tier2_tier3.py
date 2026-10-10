#!/usr/bin/env python3
"""Tests for Tier 2 heuristic rules and Tier 3 LLM hint rules."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
_VALIDATOR = _SCRIPTS_DIR / "validate_article.py"
_FIXTURES = Path(__file__).resolve().parent / "fixtures"


def run_validator(*files: Path) -> dict:
    result = subprocess.run(
        [sys.executable, str(_VALIDATOR)] + [str(f) for f in files],
        capture_output=True,
        text=True,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError(f"Validator crashed: {result.stderr}")
    return json.loads(result.stdout)


def get_by_rule(report: dict, rule_id: str) -> list[dict]:
    return [v for v in report["violations"] if v["rule"] == rule_id]


def get_hints_by_rule(report: dict, rule_id: str) -> list[dict]:
    return [h for h in report["llm_review_hints"] if h["rule"] == rule_id]


# ---- Tier 2: P-1 ----

def test_p1_violation():
    report = run_validator(_FIXTURES / "p1_violation.md")
    violations = get_by_rule(report, "P-1")
    # ——因為 (#1), ——它會 (#3 definition), ——但 (#5 default) = 3 violations
    # ——結果 (#4 dramatic) = kept
    assert len(violations) >= 2, f"Expected >=2 P-1 violations, got {len(violations)}: {[v['desc'] for v in violations]}"
    print("  PASS: P-1 violation detection")


def test_p1_clean():
    report = run_validator(_FIXTURES / "p1_clean.md")
    violations = get_by_rule(report, "P-1")
    # Only 1 dramatic dash, no ratio warning since <= 30%
    causal_or_def = [v for v in violations if "因果" in v["desc"] or "定義" in v["desc"] or "問句" in v["desc"]]
    assert len(causal_or_def) == 0, f"Expected 0 causal/def P-1 violations in clean, got {len(causal_or_def)}"
    print("  PASS: P-1 clean file")


# ---- Tier 2: K-1 ----

def test_k1_sparse():
    report = run_validator(_FIXTURES / "k1_sparse.md")
    violations = get_by_rule(report, "K-1")
    assert len(violations) >= 1, f"Expected >=1 K-1 violation for sparse file, got {len(violations)}"
    assert any("過低" in v["desc"] for v in violations)
    print("  PASS: K-1 sparse detection")


# ---- Tier 2: S-3 ----

def test_s3_violation():
    report = run_validator(_FIXTURES / "s3_violation.md")
    violations = get_by_rule(report, "S-3")
    assert len(violations) >= 1, f"Expected >=1 S-3 violation, got {len(violations)}"
    print("  PASS: S-3 violation detection")


# ---- Tier 2: C-1 ----

def test_c1_violation():
    report = run_validator(_FIXTURES / "c1_violation.md")
    violations = get_by_rule(report, "C-1")
    # First code block has no lead-in after heading, second does.
    assert len(violations) >= 1, f"Expected >=1 C-1 violation, got {len(violations)}"
    print("  PASS: C-1 violation detection")


def test_c1_no_false_positive():
    report = run_validator(_FIXTURES / "c1_violation.md")
    violations = get_by_rule(report, "C-1")
    # Second code block has a lead-in, should not be flagged.
    assert len(violations) <= 1, f"Expected <=1 C-1 violation (no false positive on second block), got {len(violations)}"
    print("  PASS: C-1 no false positive")


# ---- Tier 2: W-1 ----

def test_w1_violation():
    report = run_validator(_FIXTURES / "w1_violation.md")
    violations = get_by_rule(report, "W-1")
    # print("Hi") is not in code (code has print("Hello")), so should flag.
    assert len(violations) >= 1, f"Expected >=1 W-1 violation, got {len(violations)}"
    print("  PASS: W-1 violation detection")


# ---- Tier 3: T-1 ----

def test_t1_hint():
    report = run_validator(_FIXTURES / "t1_hint.md")
    hints = get_hints_by_rule(report, "T-1")
    assert len(hints) >= 1, f"Expected >=1 T-1 hint, got {len(hints)}"
    assert all(h["requires_llm_review"] for h in hints)
    print("  PASS: T-1 hint generation")


# ---- Tier 3: S-1 ----

def test_s1_hint():
    report = run_validator(_FIXTURES / "s1_hint.md")
    hints = get_hints_by_rule(report, "S-1")
    assert len(hints) >= 2, f"Expected >=2 S-1 hints, got {len(hints)}"
    print("  PASS: S-1 hint generation")


# ---- Tier 3: S-2 ----

def test_s2_hint():
    report = run_validator(_FIXTURES / "s2_hint.md")
    hints = get_hints_by_rule(report, "S-2")
    assert len(hints) >= 1, f"Expected >=1 S-2 hint, got {len(hints)}"
    print("  PASS: S-2 hint generation")


# ---- Tier 3: M-1 ----

def test_m1_hint():
    report = run_validator(_FIXTURES / "m1_hint.md")
    hints = get_hints_by_rule(report, "M-1")
    assert len(hints) >= 1, f"Expected >=1 M-1 hint, got {len(hints)}"
    print("  PASS: M-1 hint generation")


# ---- Tier 3: O-1 ----

def test_o1_hint():
    report = run_validator(_FIXTURES / "o1_hint.md")
    hints = get_hints_by_rule(report, "O-1")
    assert len(hints) == 1, f"Expected exactly 1 O-1 hint, got {len(hints)}"
    print("  PASS: O-1 hint generation")


# ---- Tier 3: E-1 ----

def test_e1_no_warning():
    """Code block without nearby WARNING should produce E-1 hint."""
    report = run_validator(_FIXTURES / "e1_no_warning.md")
    hints = get_hints_by_rule(report, "E-1")
    assert len(hints) >= 1, f"Expected >=1 E-1 hint (no WARNING), got {len(hints)}"
    print("  PASS: E-1 hint (no WARNING)")


def test_e1_with_warning():
    """Code block with nearby WARNING should NOT produce E-1 hint."""
    report = run_validator(_FIXTURES / "e1_with_warning.md")
    hints = get_hints_by_rule(report, "E-1")
    assert len(hints) == 0, f"Expected 0 E-1 hints (WARNING present), got {len(hints)}"
    print("  PASS: E-1 no hint (WARNING present)")


# ---- Integration ----

def test_all_rules_loaded():
    """Verify all 15 rules are checked."""
    report = run_validator(_FIXTURES / "t2_clean.md")
    checked = report["meta"]["rules_checked"]
    assert len(checked) == 15, f"Expected 15 rules checked, got {len(checked)}: {checked}"
    assert "T-2" in checked  # Tier 1
    assert "P-1" in checked  # Tier 2
    assert "T-1" in checked  # Tier 3
    skipped = report["meta"]["rules_skipped"]
    tier_skips = [s for s in skipped if "tier module" in s]
    assert len(tier_skips) == 0, f"No tier modules should be skipped, got {tier_skips}"
    print("  PASS: All 15 rules loaded (4 T1 + 5 T2 + 6 T3)")


def test_e2e_all_rules_trigger():
    """E2E fixture triggers all 15 rules."""
    report = run_validator(_FIXTURES / "e2e_full.md")
    triggered = set(report["stats"]["by_rule"].keys())
    expected = {"T-2", "V-1", "F-1", "T-3", "P-1", "K-1", "S-3", "C-1", "W-1",
                "T-1", "S-1", "S-2", "E-1", "M-1", "O-1"}
    missing = expected - triggered
    assert len(missing) == 0, f"E2E fixture did not trigger: {missing}"
    print("  PASS: E2E triggers all 15 rules")


def test_density_metrics_present():
    """Density metrics are present in stats."""
    report = run_validator(_FIXTURES / "e2e_full.md")
    dm = report["stats"]["density_metrics"]
    assert "dash_total" in dm, "Missing dash_total"
    assert "dash_dramatic_count" in dm, "Missing dash_dramatic_count"
    assert "dash_dramatic_ratio" in dm, "Missing dash_dramatic_ratio"
    assert "total_prose_lines" in dm, "Missing total_prose_lines"
    assert "kaomoji_count" in dm, "Missing kaomoji_count"
    assert "kaomoji_density" in dm, "Missing kaomoji_density"
    assert dm["total_prose_lines"] >= 30, f"Expected >= 30 prose lines, got {dm['total_prose_lines']}"
    print("  PASS: Density metrics present and complete")


if __name__ == "__main__":
    tests = [
        test_p1_violation,
        test_p1_clean,
        test_k1_sparse,
        test_s3_violation,
        test_c1_violation,
        test_c1_no_false_positive,
        test_w1_violation,
        test_t1_hint,
        test_s1_hint,
        test_s2_hint,
        test_m1_hint,
        test_o1_hint,
        test_e1_no_warning,
        test_e1_with_warning,
        test_all_rules_loaded,
        test_e2e_all_rules_trigger,
        test_density_metrics_present,
    ]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  FAIL: {test.__name__}: {e}")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed, {passed + failed} total")
    sys.exit(1 if failed else 0)
