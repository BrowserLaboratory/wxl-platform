#!/usr/bin/env python3
"""Tests for Tier 1 format rules."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
_VALIDATOR = _SCRIPTS_DIR / "validate_article.py"
_FIXTURES = Path(__file__).resolve().parent / "fixtures"


def run_validator(*files: Path) -> dict:
    """Run the validator on given files and return parsed JSON output."""
    result = subprocess.run(
        [sys.executable, str(_VALIDATOR)] + [str(f) for f in files],
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def get_violations_by_rule(report: dict, rule_id: str) -> list[dict]:
    return [v for v in report["violations"] if v["rule"] == rule_id]


def test_t2_violation():
    report = run_validator(_FIXTURES / "t2_violation.md")
    violations = get_violations_by_rule(report, "T-2")
    assert len(violations) == 3, f"Expected 3 T-2 violations, got {len(violations)}"
    assert all(v["severity"] == "error" for v in violations)
    print("  PASS: T-2 violation detection")


def test_t2_clean():
    report = run_validator(_FIXTURES / "t2_clean.md")
    violations = get_violations_by_rule(report, "T-2")
    assert len(violations) == 0, f"Expected 0 T-2 violations, got {len(violations)}"
    print("  PASS: T-2 clean file")


def test_v1_violation():
    report = run_validator(_FIXTURES / "v1_violation.md")
    violations = get_violations_by_rule(report, "V-1")
    assert len(violations) == 2, f"Expected 2 V-1 violations, got {len(violations)}"
    assert all(v["auto_fixable"] for v in violations)
    print("  PASS: V-1 violation detection")


def test_v1_clean():
    report = run_validator(_FIXTURES / "v1_clean.md")
    violations = get_violations_by_rule(report, "V-1")
    assert len(violations) == 0, f"Expected 0 V-1 violations, got {len(violations)}"
    print("  PASS: V-1 clean file")


def test_f1_violation():
    report = run_validator(_FIXTURES / "f1_violation.md")
    violations = get_violations_by_rule(report, "F-1")
    assert len(violations) == 1, f"Expected 1 F-1 violation, got {len(violations)}"
    print("  PASS: F-1 violation detection")


def test_f1_clean():
    report = run_validator(_FIXTURES / "f1_clean.md")
    violations = get_violations_by_rule(report, "F-1")
    assert len(violations) == 0, f"Expected 0 F-1 violations, got {len(violations)}"
    print("  PASS: F-1 clean file")


def test_t3_violation():
    report = run_validator(_FIXTURES / "t3_violation.md")
    violations = get_violations_by_rule(report, "T-3")
    assert len(violations) == 2, f"Expected 2 T-3 violations, got {len(violations)}"
    assert all(v["severity"] == "error" for v in violations)
    print("  PASS: T-3 violation detection")


def test_t3_clean():
    report = run_validator(_FIXTURES / "t3_clean.md")
    violations = get_violations_by_rule(report, "T-3")
    assert len(violations) == 0, f"Expected 0 T-3 violations, got {len(violations)}"
    print("  PASS: T-3 clean file")


def test_config_disabled_rules():
    """When vitepress_mode/image_format_check are disabled, those rules should be skipped."""
    import os
    import tempfile

    config_path = _SCRIPTS_DIR / "config.json"
    backup_path = config_path.with_suffix(".json.bak")

    # Atomic backup: rename original, write test config, restore when done.
    os.replace(str(config_path), str(backup_path))
    try:
        # Write test config with both conditional rules disabled.
        tmp_fd, tmp_path = tempfile.mkstemp(dir=str(_SCRIPTS_DIR), suffix=".json")
        try:
            os.write(tmp_fd, json.dumps(
                {"vitepress_mode": False, "image_format_check": False}
            ).encode("utf-8"))
            os.close(tmp_fd)
            os.replace(tmp_path, str(config_path))
        except BaseException:
            os.close(tmp_fd)
            os.unlink(tmp_path)
            raise

        report = run_validator(_FIXTURES / "v1_violation.md")
        v1 = get_violations_by_rule(report, "V-1")
        assert len(v1) == 0, "V-1 should be skipped when vitepress_mode is false"
        assert "V-1" in report["meta"]["rules_skipped"]

        report2 = run_validator(_FIXTURES / "f1_violation.md")
        f1 = get_violations_by_rule(report2, "F-1")
        assert len(f1) == 0, "F-1 should be skipped when image_format_check is false"
        assert "F-1" in report2["meta"]["rules_skipped"]
        print("  PASS: Config-disabled rules are skipped")
    finally:
        # Atomic restore.
        os.replace(str(backup_path), str(config_path))


def test_multiple_files():
    """Multiple files should produce a combined report."""
    report = run_validator(
        _FIXTURES / "t2_violation.md",
        _FIXTURES / "v1_violation.md",
    )
    t2 = get_violations_by_rule(report, "T-2")
    v1 = get_violations_by_rule(report, "V-1")
    assert len(t2) == 3
    assert len(v1) == 2
    assert len(report["meta"]["targets"]) == 2
    print("  PASS: Multiple files combined report")


def test_clean_file_passes():
    """A clean file should have no Tier 1 violations."""
    report = run_validator(_FIXTURES / "t2_clean.md")
    tier1_rules = {"T-2", "V-1", "F-1", "T-3"}
    tier1_violations = [v for v in report["violations"] if v["rule"] in tier1_rules]
    assert len(tier1_violations) == 0, f"Expected 0 Tier 1 violations, got {len(tier1_violations)}"
    print("  PASS: Clean file has no Tier 1 violations")


if __name__ == "__main__":
    tests = [
        test_t2_violation,
        test_t2_clean,
        test_v1_violation,
        test_v1_clean,
        test_f1_violation,
        test_f1_clean,
        test_t3_violation,
        test_t3_clean,
        test_config_disabled_rules,
        test_multiple_files,
        test_clean_file_passes,
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
