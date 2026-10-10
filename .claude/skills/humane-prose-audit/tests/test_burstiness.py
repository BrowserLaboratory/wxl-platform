"""Pytest suite for humane-prose-audit/checks/burstiness.py.

Runs the CLI via subprocess and validates the JSON contract plus the
algorithm's edge cases (flat text, varied text, below-minimum sentence
count, code-fence stripping, schema conformance).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
CHECK_SCRIPT = SKILL_ROOT / "checks" / "burstiness.py"
FIXTURE_HUMAN = SKILL_ROOT / "tests" / "fixtures" / "human-flavored.md"
VALIDATOR = SKILL_ROOT / "scripts" / "validate_outputs.py"


def run_check(*args: str) -> tuple[int, dict, str, str]:
    cmd = [sys.executable, str(CHECK_SCRIPT), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    payload: dict = {}
    if proc.stdout.strip():
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            payload = {}
    return proc.returncode, payload, proc.stdout, proc.stderr


def test_burstiness_smoke():
    rc, payload, _, stderr = run_check(str(FIXTURE_HUMAN))
    assert rc == 0, f"stderr={stderr!r}"
    assert payload.get("check") == "burstiness"
    assert "findings" in payload
    assert "target" in payload


def test_burstiness_metadata_populated():
    rc, payload, _, _ = run_check(str(FIXTURE_HUMAN))
    assert rc == 0
    meta = payload.get("metadata", {})
    assert "burstiness" in meta
    assert "sentence_count" in meta
    assert isinstance(meta["burstiness"], (int, float))
    assert isinstance(meta["sentence_count"], int)


def test_burstiness_flat_text_flags_finding(tmp_path: Path):
    # Ten sentences, all eight words. Identical word counts -> stdev = 0
    # -> burstiness = 0 -> medium-severity finding.
    sentences = [
        f"This is sentence number {n} of ten exactly."
        for n in (
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
            "ten",
        )
    ]
    target = tmp_path / "flat.md"
    target.write_text(" ".join(sentences) + "\n", encoding="utf-8")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, "expected at least one finding on flat text"
    assert any(f.get("severity") in {"low", "medium"} for f in findings)


def test_burstiness_varied_text_no_finding(tmp_path: Path):
    # Mix 1-word sentences with 30-word sentences -> very high variance.
    short_sentences = ["Yes.", "No.", "Maybe.", "Sure.", "Indeed.", "Perhaps."]
    long_sentence = (
        "The quick brown fox jumped over the lazy dog while the curious cat watched "
        "from the windowsill above the garden where roses bloomed bright red today."
    )  # ~30 words
    parts: list[str] = []
    for s in short_sentences:
        parts.append(s)
        parts.append(long_sentence)
    target = tmp_path / "varied.md"
    target.write_text(" ".join(parts) + "\n", encoding="utf-8")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []


def test_burstiness_below_min_sentences(tmp_path: Path):
    target = tmp_path / "tiny.md"
    target.write_text("Only two sentences here. That is all.\n", encoding="utf-8")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []
    meta = payload.get("metadata", {})
    assert meta.get("note") == "below_min_threshold"


def test_burstiness_schema_conformant():
    proc = subprocess.run(
        [sys.executable, str(CHECK_SCRIPT), str(FIXTURE_HUMAN)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0
    validator = subprocess.run(
        [sys.executable, str(VALIDATOR), "--schema", "check-output", "--stdin"],
        input=proc.stdout,
        capture_output=True,
        text=True,
    )
    assert validator.returncode == 0, (
        f"schema violations: {validator.stderr!r}"
    )


def test_burstiness_skips_code_fences(tmp_path: Path):
    prose_sentences = [
        "Alpha sentence runs here.",
        "Beta sentence trails along.",
        "Gamma sentence keeps it short.",
        "Delta sentence remains brief.",
        "Epsilon sentence wraps up the prose.",
    ]
    code_block = "\n".join(
        [
            "```python",
            "int x = 1;",
            "int y = 2;",
            "int z = 3;",
            "int a = 4;",
            "int b = 5;",
            "int c = 6;",
            "int d = 7;",
            "int e = 8;",
            "int f = 9;",
            "int g = 10;",
            "```",
        ]
    )
    body = "\n\n".join(prose_sentences) + "\n\n" + code_block + "\n"
    target = tmp_path / "fenced.md"
    target.write_text(body, encoding="utf-8")
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    meta = payload.get("metadata", {})
    # Five prose sentences should be counted; code-fence lines must not
    # inflate the count above that.
    assert meta.get("sentence_count") == 5, (
        f"sentence_count={meta.get('sentence_count')} (expected 5); "
        f"code-fence stripping failed"
    )
