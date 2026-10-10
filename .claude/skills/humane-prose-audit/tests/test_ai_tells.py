"""Pytest suite for the ai_tells deterministic check.

Drives ``humane-prose-audit/checks/ai_tells.py`` via subprocess, parses its
stdout JSON, and verifies both fixture-level behaviour and schema conformance
through ``scripts/validate_outputs.py --schema check-output --stdin``.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
CHECKS_DIR = SKILL_ROOT / "checks"
SCRIPTS_DIR = SKILL_ROOT / "scripts"
FIXTURES_DIR = SKILL_ROOT / "tests" / "fixtures"
SCRIPT = CHECKS_DIR / "ai_tells.py"
VALIDATOR = SCRIPTS_DIR / "validate_outputs.py"


def run_check(*args: str) -> tuple[int, dict, str, str]:
    cmd = [sys.executable, str(SCRIPT), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    payload: dict = {}
    if proc.stdout.strip():
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            payload = {}
    return proc.returncode, payload, proc.stdout, proc.stderr


def test_ai_tells_smoke():
    rc, payload, _, _ = run_check(str(FIXTURES_DIR / "human-flavored.md"))
    assert rc == 0
    assert payload.get("check") == "ai_tells"
    assert "target" in payload
    assert isinstance(payload.get("findings"), list)


def test_ai_tells_flags_ai_fixture():
    rc, payload, _, _ = run_check(str(FIXTURES_DIR / "ai-flavored.md"))
    assert rc == 0
    findings = payload.get("findings", [])
    assert len(findings) >= 1, f"expected at least one finding, got {findings!r}"
    for f in findings:
        assert f["severity"] in {"high", "medium", "low"}


def test_ai_tells_human_fixture_clean():
    rc, payload, _, _ = run_check(str(FIXTURES_DIR / "human-flavored.md"))
    assert rc == 0
    findings = payload.get("findings", [])
    # Human fixture has zero canonical tells; allow at most a 'low' finding.
    assert all(f["severity"] == "low" for f in findings), findings
    # And tolerate a small list (the fixture is short and clean).
    assert len(findings) <= 2


def test_ai_tells_academic_fixture_minimal():
    rc, payload, _, _ = run_check(str(FIXTURES_DIR / "academic-sample.md"))
    assert rc == 0
    findings = payload.get("findings", [])
    assert len(findings) <= 1, f"expected ≤1 finding on academic sample, got {findings!r}"


def test_ai_tells_em_dash_finding(tmp_path: Path):
    # Generate prose with very high em-dash density (>> 5/kchar).
    snippet = "a — b — c — d — e — f — g — h\n"
    body = "# Heading\n\n" + (snippet * 30)
    target = tmp_path / "em_heavy.md"
    target.write_text(body, encoding="utf-8")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    em_findings = [
        f for f in findings if "em-dash" in f.get("section", "") or "em-dash" in f.get("issue", "").lower()
    ]
    assert em_findings, f"expected an em-dash finding, got {findings!r}"
    assert em_findings[0]["severity"] == "medium"


def test_ai_tells_schema_conformant():
    rc, _, stdout, _ = run_check(str(FIXTURES_DIR / "ai-flavored.md"))
    assert rc == 0
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR), "--schema", "check-output", "--stdin"],
        input=stdout,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, f"schema validation failed: stderr={proc.stderr!r}"


def test_ai_tells_returncode_on_missing():
    rc, _, _, stderr = run_check("/nonexistent/path/does/not/exist.md")
    assert rc != 0
    assert "error" in stderr.lower() or "not found" in stderr.lower()


def test_ai_tells_empty_findings_on_blank(tmp_path: Path):
    target = tmp_path / "blank.md"
    target.write_text("# Heading\n", encoding="utf-8")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []
