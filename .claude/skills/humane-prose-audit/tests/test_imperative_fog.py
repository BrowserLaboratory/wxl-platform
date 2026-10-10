"""Pytest suite for the imperative_fog check.

Verifies the CLI contract: detects vague imperative verbs ("consider",
"leverage", "facilitate"...) at sentence-initial / "we must" positions,
emits density metadata, and conforms to the check-output schema.
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
SCRIPTS_DIR = SKILL_ROOT / "scripts"
SCRIPT = CHECKS_DIR / "imperative_fog.py"
VALIDATOR = SCRIPTS_DIR / "validate_outputs.py"


def run_check(target: Path) -> tuple[int, dict, str]:
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), str(target)],
        capture_output=True,
        text=True,
    )
    payload: dict = {}
    if proc.stdout.strip():
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            payload = {}
    return proc.returncode, payload, proc.stderr


@pytest.fixture
def tmp_text(tmp_path: Path):
    def _make(content: str, name: str = "sample.md") -> Path:
        p = tmp_path / name
        p.write_text(content, encoding="utf-8")
        return p

    return _make


def test_imperative_fog_smoke():
    target = FIXTURES_DIR / "human-flavored.md"
    rc, payload, stderr = run_check(target)
    assert rc == 0, stderr
    assert payload.get("check") == "imperative_fog"
    assert payload.get("target") == str(target.resolve())
    assert "findings" in payload


def test_imperative_fog_flags_ai_fixture():
    target = FIXTURES_DIR / "ai-flavored.md"
    rc, payload, stderr = run_check(target)
    assert rc == 0, stderr
    findings = payload.get("findings", [])
    assert findings, "expected at least one imperative-fog finding on ai-flavored.md"
    sevs = {f.get("severity") for f in findings}
    assert sevs & {"low", "medium"}, f"expected low or medium severity, got {sevs!r}"


def test_imperative_fog_concrete_imperatives_clean(tmp_text):
    target = tmp_text(
        "Run the tests. Deploy. Roll back if red. Bump the patch version. Push.\n"
    )
    rc, payload, stderr = run_check(target)
    assert rc == 0, stderr
    assert payload.get("findings") == []


def test_imperative_fog_position_matters(tmp_text):
    # Mid-sentence "leverage" used as a noun should NOT count as imperative fog.
    mid = tmp_text(
        "This is leverage when used right. The team uses leverage carefully.\n"
        "Real leverage matters in negotiations.\n",
        name="mid.md",
    )
    rc_mid, payload_mid, stderr_mid = run_check(mid)
    assert rc_mid == 0, stderr_mid
    density_mid = payload_mid.get("metadata", {}).get("density_per_kchar", 0)

    # Sentence-initial repeated imperatives SHOULD count.
    initial = tmp_text(
        "Leverage our tools. Leverage the platform. Leverage the network.\n"
        "Leverage the synergies. Leverage every option. Leverage carefully.\n"
        "Leverage now. Leverage often.\n",
        name="initial.md",
    )
    rc_init, payload_init, stderr_init = run_check(initial)
    assert rc_init == 0, stderr_init
    density_init = payload_init.get("metadata", {}).get("density_per_kchar", 0)

    assert density_init > density_mid, (
        f"initial-position density ({density_init}) should exceed "
        f"mid-sentence noun density ({density_mid})"
    )
    assert payload_init.get("findings"), "expected findings for repeated initial imperatives"


def test_imperative_fog_we_must_pattern(tmp_text):
    target = tmp_text(
        "We must leverage our resources. You should consider the implications.\n"
    )
    rc, payload, stderr = run_check(target)
    assert rc == 0, stderr
    top = dict(payload.get("metadata", {}).get("top_verbs", []))
    total = sum(top.values())
    assert total >= 2, f"expected ≥2 imperative-fog verbs counted, got {top!r}"


def test_imperative_fog_top_verbs_in_metadata():
    target = FIXTURES_DIR / "ai-flavored.md"
    rc, payload, stderr = run_check(target)
    assert rc == 0, stderr
    meta = payload.get("metadata", {})
    assert "top_verbs" in meta
    top_verbs = meta["top_verbs"]
    assert isinstance(top_verbs, list)
    for entry in top_verbs:
        assert isinstance(entry, list) and len(entry) == 2
        assert isinstance(entry[0], str)
        assert isinstance(entry[1], int)


def test_imperative_fog_schema_conformant():
    target = FIXTURES_DIR / "ai-flavored.md"
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), str(target)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
    validate = subprocess.run(
        [
            sys.executable,
            str(VALIDATOR),
            "--schema",
            "check-output",
            "--stdin",
        ],
        input=proc.stdout,
        capture_output=True,
        text=True,
    )
    assert validate.returncode == 0, validate.stderr


def test_imperative_fog_skips_code_fences(tmp_text):
    target = tmp_text(
        "Some prose here that says nothing imperative.\n\n"
        "```python\n"
        "consider = 1\n"
        "leverage = 2\n"
        "facilitate = 3\n"
        "optimize = 4\n"
        "streamline = 5\n"
        "embrace = 6\n"
        "foster = 7\n"
        "drive = 8\n"
        "enable = 9\n"
        "empower = 10\n"
        "```\n"
    )
    rc, payload, stderr = run_check(target)
    assert rc == 0, stderr
    assert payload.get("findings") == [], (
        f"fenced code block should be skipped, got {payload.get('findings')!r}"
    )
