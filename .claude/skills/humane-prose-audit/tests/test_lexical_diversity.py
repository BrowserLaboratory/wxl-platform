"""Pytest suite for checks/lexical_diversity.py (MTLD).

Covers smoke, repetitive vs diverse vocabulary, sub-threshold word counts,
metadata presence, code-fence exclusion, schema conformance, and lower-case
normalization of types.
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
FIXTURES = SKILL_ROOT / "tests" / "fixtures"


def run_check(*args: str) -> tuple[int, dict, str]:
    cmd = [sys.executable, str(CHECKS_DIR / "lexical_diversity.py"), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
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


def test_lexical_diversity_smoke():
    target = FIXTURES / "human-flavored.md"
    rc, payload, stderr = run_check(str(target))
    assert rc == 0, f"non-zero exit; stderr={stderr}"
    assert payload.get("check") == "lexical_diversity"
    assert payload.get("target") == str(target)
    assert "findings" in payload


def test_lexical_diversity_repetitive_text_low_score(tmp_text):
    # 50+ near-identical sentences; very low MTLD expected.
    chunk = "the build broke and then the build broke again because the build broke "
    body = chunk * 60  # ~600 tokens, ~5 unique types
    target = tmp_text(body)
    rc, payload, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, "expected at least one finding for highly repetitive text"
    sev = findings[0].get("severity")
    assert sev in {"low", "medium"}, f"unexpected severity {sev!r}"
    mtld = payload.get("metadata", {}).get("mtld")
    assert isinstance(mtld, (int, float))
    assert mtld < 60


def test_lexical_diversity_diverse_text_high_score(tmp_text):
    # Highly varied vocabulary; each word appears at most twice.
    words = (
        "moonlight drifted through cracked windows above the quiet harbour where rusted "
        "hulls leaned against barnacles encrusted timbers groaning beneath salty winds "
        "whispering ancient lullabies to weary sailors dreaming about distant emerald "
        "isles scattered across forgotten cartographers maps inked under flickering "
        "candle flames burning brightly within damp wooden cabins smelling faintly of "
        "tobacco molasses cinnamon ginger pepper saffron coriander hibiscus chamomile "
        "lavender rosemary basil thyme parsley sage juniper cedar pine spruce maple "
        "oak willow birch hickory walnut chestnut almond hazelnut pistachio cashew "
        "pecan mahogany ebony teak bamboo eucalyptus sandalwood frankincense myrrh"
    )
    target = tmp_text(words)
    rc, payload, _ = run_check(str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings == [], f"expected no findings for diverse text, got {findings!r}"
    mtld = payload.get("metadata", {}).get("mtld")
    assert isinstance(mtld, (int, float))
    assert mtld > 60, f"expected MTLD > 60 for diverse text, got {mtld}"


def test_lexical_diversity_below_min_words(tmp_text):
    target = tmp_text("Only a handful of words appear in this very short note here today.")
    rc, payload, _ = run_check(str(target))
    assert rc == 0
    assert payload.get("findings") == []
    assert payload.get("metadata", {}).get("note") == "below_min_threshold"


def test_lexical_diversity_metadata_populated(tmp_text):
    body = " ".join(
        f"word{i}" for i in range(120)
    )  # 120 unique tokens, all distinct -> MTLD high
    target = tmp_text(body)
    rc, payload, _ = run_check(str(target))
    assert rc == 0
    md = payload.get("metadata", {})
    assert isinstance(md.get("mtld"), (int, float))
    assert isinstance(md.get("word_count"), int)
    assert isinstance(md.get("type_count"), int)
    assert md["word_count"] >= 100
    assert md["type_count"] >= 100


def test_lexical_diversity_skips_code(tmp_text):
    # Prose has diverse vocabulary; fenced code block repeats the same identifiers.
    prose_words = (
        "moonlight drifted through cracked windows above the quiet harbour where rusted "
        "hulls leaned against barnacles encrusted timbers groaning beneath salty winds "
        "whispering ancient lullabies to weary sailors dreaming about distant emerald "
        "isles scattered across forgotten cartographers maps inked under flickering "
        "candle flames burning brightly within damp wooden cabins smelling faintly of "
        "tobacco molasses cinnamon ginger pepper saffron coriander hibiscus chamomile "
        "lavender rosemary basil thyme parsley sage juniper cedar pine spruce maple"
    )
    code_block = "\n".join(["x = 1", "x = 1", "x = 1"] * 80)
    body = prose_words + "\n\n```python\n" + code_block + "\n```\n"
    target = tmp_text(body)
    rc, payload, _ = run_check(str(target))
    assert rc == 0
    mtld = payload.get("metadata", {}).get("mtld")
    assert isinstance(mtld, (int, float))
    # Without code-stripping the repeated `x = 1` would crater MTLD;
    # with stripping it should stay > 60 (diverse prose only).
    assert mtld > 60, f"code fence leaked into MTLD; got {mtld}"


def test_lexical_diversity_schema_conformant(tmp_text):
    body = " ".join(f"word{i}" for i in range(120))
    target = tmp_text(body)
    rc, payload, _ = run_check(str(target))
    assert rc == 0
    # Pipe through validator.
    validator_cmd = [
        sys.executable,
        str(SCRIPTS_DIR / "validate_outputs.py"),
        "--schema",
        "check-output",
        "--stdin",
    ]
    proc = subprocess.run(
        validator_cmd,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, f"schema violation: {proc.stderr}"


def test_lexical_diversity_lower_case_normalization():
    # Direct import-level check: lower-case normalization yields 1 type, 3 tokens.
    sys.path.insert(0, str(CHECKS_DIR))
    try:
        import lexical_diversity as ld
    finally:
        sys.path.pop(0)
    words = ld.tokenize("The THE the")
    assert words == ["the", "the", "the"], words
    assert len(set(words)) == 1
    assert len(words) == 3
