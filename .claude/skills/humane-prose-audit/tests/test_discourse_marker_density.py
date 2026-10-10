"""Tests for humane-prose-audit/checks/discourse_marker_density.py.

Each test invokes the CLI via subprocess, parses stdout JSON, and asserts the
shared check-output contract plus per-rule semantics (density thresholds,
sentence-initial position handling, Chinese marker matching, code-block
stripping, schema conformance via validate_outputs.py).
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
    cmd = [sys.executable, str(CHECKS_DIR / "discourse_marker_density.py"), *args]
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


def test_discourse_smoke():
    target = FIXTURES_DIR / "human-flavored.md"
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("check") == "discourse_marker_density"
    assert "findings" in payload
    assert "target" in payload


def test_discourse_flags_ai_fixture():
    target = FIXTURES_DIR / "ai-flavored.md"
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, f"expected discourse marker findings on ai fixture, got {payload!r}"


def test_discourse_zero_markers_clean(tmp_text):
    target = tmp_text("The build succeeded. Tests pass. Ship it.")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []


def test_discourse_position_matters(tmp_text):
    # "however" mid-sentence should NOT count.
    target_mid = tmp_text("Yesterday I went however to the store.")
    rc, payload, _, _ = run_check(str(target_mid))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_markers", [])
    total = sum(n for _, n in top)
    assert total == 0, f"mid-sentence 'however' should not match, got top_markers={top!r}"

    # Sentence-initial "However," SHOULD count.
    target_initial = tmp_text("However, I went to the store.")
    rc, payload, _, _ = run_check(str(target_initial))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_markers", [])
    total = sum(n for _, n in top)
    assert total >= 1, f"sentence-initial 'However' should match, got top_markers={top!r}"


def test_discourse_chinese(tmp_text):
    target = tmp_text("然而，這不對。因此，我們離開。")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_markers", [])
    total = sum(n for _, n in top)
    assert total >= 2, f"expected ≥2 Chinese marker hits, got top_markers={top!r}"


def test_discourse_top_markers_in_metadata(tmp_text):
    body = (
        "However, this is a sentence. Moreover, here is another. "
        "Moreover, yet another. Furthermore, one more. However, again."
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_markers")
    assert isinstance(top, list)
    assert top, "top_markers should be non-empty"
    for entry in top:
        assert isinstance(entry, list) and len(entry) == 2
        assert isinstance(entry[0], str) and isinstance(entry[1], int)
    counts = [n for _, n in top]
    assert counts == sorted(counts, reverse=True), f"top_markers not sorted desc: {top!r}"


def test_discourse_skips_code_fences(tmp_text):
    body = (
        "Real prose with no marker.\n"
        "```python\n"
        "# However, this is in code.\n"
        "# Moreover, this too.\n"
        "# Furthermore, and this.\n"
        "# In addition, also this.\n"
        "# In conclusion, finally this.\n"
        "```\n"
        "More real prose.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_markers", [])
    total = sum(n for _, n in top)
    assert total == 0, f"markers inside code fences should not count, got top_markers={top!r}"


def test_discourse_schema_conformant(tmp_text):
    body = (
        "However, this might work. Moreover, perhaps it could. "
        "Furthermore, in addition. In conclusion, done."
    )
    target = tmp_text(body)
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
