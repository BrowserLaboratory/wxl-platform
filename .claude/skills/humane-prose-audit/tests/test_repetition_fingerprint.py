"""Tests for humane-prose-audit/checks/repetition_fingerprint.py.

Each test invokes the CLI via subprocess, parses stdout JSON, and asserts the
shared check-output contract plus per-rule semantics (n-gram repetition detection,
case normalization, code-fence stripping, sub-window de-duplication, minimum
word threshold, and schema conformance via validate_outputs.py).
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
    cmd = [sys.executable, str(CHECKS_DIR / "repetition_fingerprint.py"), *args]
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


def test_repetition_smoke():
    target = FIXTURES_DIR / "human-flavored.md"
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("check") == "repetition_fingerprint"
    assert "findings" in payload
    assert "target" in payload


def test_repetition_obvious_fingerprint(tmp_text):
    # Same 6-word sentence repeated 4 times, separated by filler.
    repeated = "the build broke again now somehow"
    filler_a = "alpha beta gamma delta epsilon zeta eta theta iota kappa"
    filler_b = "lambda mu nu xi omicron pi rho sigma tau upsilon"
    filler_c = "phi chi psi omega red green blue yellow orange purple"
    body = " ".join(
        [
            repeated,
            filler_a,
            repeated,
            filler_b,
            repeated,
            filler_c,
            repeated,
        ]
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, f"expected repetition findings, got {payload!r}"


def test_repetition_no_fingerprint_clean(tmp_text):
    # 100 distinct words → no 5-gram can repeat.
    words = [f"word{i}" for i in range(100)]
    target = tmp_text(" ".join(words))
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []


def test_repetition_below_min_words(tmp_text):
    # 20 words, below the 50-word threshold.
    target = tmp_text(" ".join(["alpha"] * 20))
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []
    assert payload.get("metadata", {}).get("note") == "below_min_threshold"


def test_repetition_top_in_metadata(tmp_text):
    repeated = "the build broke again now"
    other = "another phrase that repeats three times"
    filler = " ".join(f"unique{i}" for i in range(60))
    body = " ".join(
        [repeated, filler, repeated, filler, repeated, other, filler, other, filler, other]
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_repetitions")
    assert isinstance(top, list)
    assert top, "top_repetitions should be non-empty"
    for entry in top:
        assert isinstance(entry, list) and len(entry) == 2
        assert isinstance(entry[0], str) and isinstance(entry[1], int)
    counts = [n for _, n in top]
    assert counts == sorted(counts, reverse=True), f"top_repetitions not sorted desc: {top!r}"


def test_repetition_skips_code_fences(tmp_text):
    filler = " ".join(f"unique{i}" for i in range(60))
    body = (
        filler
        + "\n```python\n"
        + "print(x); print(x); print(x); print(x);\n"
        + "print(x); print(x); print(x); print(x);\n"
        + "print(x); print(x); print(x); print(x);\n"
        + "```\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == [], f"code fence should be stripped, got {payload!r}"


def test_repetition_case_normalized(tmp_text):
    repeated_upper = "The Build Broke Again Now"
    repeated_lower = "the build broke again now"
    repeated_mixed = "THE build BROKE again NOW"
    repeated_again = "the BUILD broke AGAIN now"
    filler = " ".join(f"unique{i}" for i in range(60))
    body = " ".join(
        [
            repeated_upper,
            filler,
            repeated_lower,
            filler,
            repeated_mixed,
            filler,
            repeated_again,
        ]
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    top = payload.get("metadata", {}).get("top_repetitions", [])
    assert top, f"expected case-normalized repetition, got {payload!r}"
    phrase, count = top[0]
    assert phrase == "the build broke again now"
    assert count >= 3


def test_repetition_schema_conformant(tmp_text):
    repeated = "the build broke again now"
    filler = " ".join(f"unique{i}" for i in range(60))
    body = " ".join([repeated, filler, repeated, filler, repeated])
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
