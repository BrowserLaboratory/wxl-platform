"""Smoke tests for the 8 Phase-C deterministic preflight checks against the
shared test fixtures (`tests/fixtures/{ai-flavored, human-flavored,
academic-sample}.md`). Each test only asserts the check's JSON output shape
and exit code — finer correctness lives in the per-check test files.

This file exists as the integration point referenced by spec task 8.7: it
should keep importing the three short fixtures without error so that any
fixture-only edits surface here first.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


SKILL_ROOT = Path(__file__).resolve().parent.parent
CHECKS_DIR = SKILL_ROOT / "checks"
FIXTURES_DIR = SKILL_ROOT / "tests" / "fixtures"

FIXTURES = ("ai-flavored.md", "human-flavored.md", "academic-sample.md")
NEW_CHECKS = (
    "ai_tells.py",
    "burstiness.py",
    "hedge_density.py",
    "imperative_fog.py",
    "lexical_diversity.py",
    "pronoun_consistency.py",
    "discourse_marker_density.py",
    "repetition_fingerprint.py",
)


@pytest.mark.parametrize("fixture", FIXTURES)
def test_fixture_exists(fixture):
    assert (FIXTURES_DIR / fixture).is_file(), f"fixture {fixture!r} missing"


@pytest.mark.parametrize("check", NEW_CHECKS)
@pytest.mark.parametrize("fixture", FIXTURES)
def test_check_runs_on_fixture(check, fixture):
    """Each new check must run on every fixture and emit shape-conformant JSON.

    Failure modes detected here: import errors, fixture parsing errors, JSON
    output that omits the `check` / `findings` keys.
    """
    target = FIXTURES_DIR / fixture
    cmd = [sys.executable, str(CHECKS_DIR / check), str(target)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, (
        f"{check} on {fixture} exited {result.returncode}\n"
        f"  stderr: {result.stderr[:400]}"
    )
    try:
        out = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AssertionError(
            f"{check} on {fixture} produced non-JSON stdout: {exc}\n"
            f"  stdout: {result.stdout[:400]}"
        )
    assert "check" in out, f"{check} output missing 'check' key"
    assert "findings" in out, f"{check} output missing 'findings' key"
    assert isinstance(out["findings"], list)
