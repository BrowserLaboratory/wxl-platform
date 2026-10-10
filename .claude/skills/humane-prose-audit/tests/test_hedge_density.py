"""Tests for humane-prose-audit/checks/hedge_density.py.

Each test invokes the CLI via subprocess, parses stdout JSON, and asserts the
shared check-output contract plus per-rule semantics (density thresholds,
word-boundary handling, Chinese substring matching, code-block stripping,
schema conformance via validate_outputs.py).
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


def run_check(*args: str) -> tuple[int, dict, str, str]:
    cmd = [sys.executable, str(CHECKS_DIR / "hedge_density.py"), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    payload: dict = {}
    if proc.stdout.strip():
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            payload = {}
    return proc.returncode, payload, proc.stdout, proc.stderr


@pytest.fixture
def tmp_text(tmp_path: Path):
    def _make(content: str, name: str = "sample.md") -> Path:
        p = tmp_path / name
        p.write_text(content, encoding="utf-8")
        return p

    return _make


def test_hedge_density_smoke():
    target = FIXTURES_DIR / "human-flavored.md"
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("check") == "hedge_density"
    assert "findings" in payload
    assert "target" in payload


def test_hedge_density_high_density_text(tmp_text):
    # 20 hedges spread over ~500 chars → density ~40/kchar → medium
    sentence = "perhaps might may could possibly seems appears somewhat rather fairly quite arguably presumably allegedly reportedly supposedly seemingly evidently perhaps might"
    # Pad to ~500 chars with neutral filler
    padding = "x" * (500 - len(sentence))
    target = tmp_text(sentence + " " + padding)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, "expected at least one finding for high hedge density"
    assert any(f.get("severity") == "medium" for f in findings)


def test_hedge_density_zero_hedges(tmp_text):
    target = tmp_text("The build succeeded. Tests pass. Ship it.")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []
    assert payload.get("metadata", {}).get("density_per_kchar") == 0.0


def test_hedge_density_word_boundary(tmp_text):
    # "maybe" should NOT match "may"
    target = tmp_text("maybe maybe maybe maybe maybe maybe maybe maybe maybe")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []


def test_hedge_density_chinese(tmp_text):
    # Chinese hedges, density should be very high in this short text
    body = "或許這也許可能不對。看起來似乎大概有問題。或許也許可能。"
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, f"expected Chinese hedge findings, got {payload!r}"


def test_hedge_density_case_insensitive(tmp_text):
    target = tmp_text("PERHAPS this MIGHT work")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_hedges", [])
    total = sum(n for _, n in top)
    assert total == 2, f"expected 2 hedges (PERHAPS, MIGHT), got top_hedges={top!r}"


def test_hedge_density_top_hedges_in_metadata(tmp_text):
    target = tmp_text("perhaps perhaps perhaps might might may")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_hedges")
    assert isinstance(top, list)
    assert top, "top_hedges should be non-empty"
    for entry in top:
        assert isinstance(entry, list) and len(entry) == 2
        assert isinstance(entry[0], str) and isinstance(entry[1], int)
    counts = [n for _, n in top]
    assert counts == sorted(counts, reverse=True), f"top_hedges not sorted desc: {top!r}"


def test_hedge_density_schema_conformant(tmp_text):
    target = tmp_text("perhaps this might possibly work somewhat well.")
    rc, _, stdout, _ = run_check(str(target))
    assert rc == 0
    validator = subprocess.run(
        [
            sys.executable,
            str(SCRIPTS_DIR / "validate_outputs.py"),
            "--schema",
            "check-output",
            "--stdin",
        ],
        input=stdout,
        capture_output=True,
        text=True,
    )
    assert validator.returncode == 0, f"schema validation failed: {validator.stderr}"


def test_hedge_density_skips_code(tmp_text):
    body = (
        "Real prose with no hedge.\n"
        "```python\n"
        "# perhaps might may could possibly seems appears\n"
        "# perhaps might may could possibly seems appears\n"
        "# perhaps might may could possibly seems appears\n"
        "```\n"
        "More real prose.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    # Code-block hedges should be excluded, so density stays low.
    assert payload.get("findings") == []
