"""Tests for humane-prose-audit/checks/pronoun_consistency.py.

Each test invokes the CLI via subprocess, parses stdout JSON, and asserts the
shared check-output contract plus per-rule semantics (voice classification,
adjacent-switch counting, word-boundary handling, Chinese substring matching,
code-block stripping, schema conformance via validate_outputs.py).
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
    cmd = [sys.executable, str(CHECKS_DIR / "pronoun_consistency.py"), *args]
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


def test_pronoun_consistency_smoke():
    target = FIXTURES_DIR / "human-flavored.md"
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("check") == "pronoun_consistency"
    assert "findings" in payload
    assert "target" in payload


def test_pronoun_consistency_single_voice_clean(tmp_text):
    body = (
        "I started writing this last night. I could not sleep.\n\n"
        "I kept thinking about the deploy. I worried I had missed a step.\n\n"
        "I finally got up and checked the logs. I was right.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []


def test_pronoun_consistency_three_voices_finding(tmp_text):
    body = (
        "I started writing this last night. I could not sleep.\n\n"
        "We then deployed the patch. Our team stayed up to monitor it.\n\n"
        "You can reproduce this by running the same command yourself.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, f"expected at least one finding, got {payload!r}"
    assert any("3 voices" in f.get("issue", "") for f in findings), (
        f"expected a finding mentioning 3 voices, got {findings!r}"
    )


def test_pronoun_consistency_adjacent_switches(tmp_text):
    body = (
        "I started writing this last night. I could not sleep.\n\n"
        "We then deployed the patch. Our team monitored it.\n\n"
        "I checked the dashboard again. I noticed a spike.\n\n"
        "We rolled back. Our on-call paged everyone.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    meta = payload.get("metadata", {})
    assert meta.get("adjacent_switches", 0) >= 3
    findings = payload.get("findings", [])
    assert any(f.get("severity") == "medium" for f in findings), (
        f"expected at least one medium-severity finding, got {findings!r}"
    )


def test_pronoun_consistency_chinese(tmp_text):
    body = (
        "我昨晚開始寫這篇。我整夜沒睡。\n\n"
        "我們後來部署了補丁。我們的團隊熬夜監看。\n\n"
        "你可以自己重現這個情況。\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    voices = set(payload.get("metadata", {}).get("voices_used", []))
    # At least two voices should be detected; ideally three.
    assert len(voices) >= 2, f"expected multi-voice detection, got {voices!r}"
    assert payload.get("findings"), f"expected findings for multi-voice doc, got {payload!r}"


def test_pronoun_consistency_word_boundary(tmp_text):
    # "Italian Iraq" — should NOT count "I" as a pronoun.
    body = (
        "Italian cuisine is great. Iraq is a country.\n\n"
        "Italian cuisine is great. Iraq is a country.\n\n"
        "Italian cuisine is great. Iraq is a country.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    voices = payload.get("metadata", {}).get("voices_used", [])
    assert "first_singular" not in voices, (
        f"`I` inside 'Italian'/'Iraq' must not count, got voices_used={voices!r}"
    )


def test_pronoun_consistency_skips_code_fences(tmp_text):
    body = (
        "I started writing this last night. I could not sleep.\n\n"
        "```python\n"
        "# we us our we us our\n"
        "# you your you your\n"
        "# they them their\n"
        "```\n\n"
        "I checked the logs again. I was right.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    voices = payload.get("metadata", {}).get("voices_used", [])
    # Only first_singular paragraphs survive once code is stripped.
    assert voices == ["first_singular"], (
        f"code-fence pronouns must not count, got voices_used={voices!r}"
    )


def test_pronoun_consistency_metadata(tmp_text):
    body = (
        "I started writing this. I could not sleep.\n\n"
        "We then deployed the patch.\n\n"
        "They reviewed the change.\n"
    )
    target = tmp_text(body)
    rc, payload, _, _ = run_check(str(target))
    assert rc == 0
    meta = payload.get("metadata", {})
    assert "voices_used" in meta
    assert "paragraph_count" in meta
    assert "adjacent_switches" in meta
    assert isinstance(meta["voices_used"], list)
    assert isinstance(meta["paragraph_count"], int)
    assert isinstance(meta["adjacent_switches"], int)


def test_pronoun_consistency_schema_conformant(tmp_text):
    body = (
        "I wrote this. I could not sleep.\n\n"
        "We deployed the patch. Our team monitored it.\n\n"
        "You can reproduce this yourself.\n"
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
