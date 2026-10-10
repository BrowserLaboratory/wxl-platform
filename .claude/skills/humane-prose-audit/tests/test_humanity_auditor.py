"""Contract tests for prompts/humanity_auditor.md (Phase D task 4.1).

Verifies the new humanity_auditor persona matches the cross-persona table
contract (same columns as Sloppy / Illogical / Shallow), declares the HUM
prefix consistently, and includes the spec-mandated Output Contract +
Determinism Note headings.
"""
from __future__ import annotations

import re
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
PROMPT_PATH = SKILL_ROOT / "prompts" / "humanity_auditor.md"


def _text() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def test_humanity_auditor_file_exists():
    assert PROMPT_PATH.is_file(), f"missing {PROMPT_PATH}"


def test_humanity_auditor_has_required_table_columns():
    text = _text()
    for kw in ("ID", "Severity", "Section", "Issue", "Recommendation", "Confidence"):
        assert kw in text, f"missing column keyword {kw!r}"


def test_humanity_auditor_hum_prefix_declared():
    text = _text()
    # The task verification target is `grep -E "^prefix:|HUM[1-9]" ...`.
    # The prefix can be declared either as a literal `prefix:` line OR by
    # mentioning HUM1..HUM9 in the contract; both must satisfy the regex.
    pattern = re.compile(r"^prefix:|HUM[1-9]", re.MULTILINE)
    assert pattern.search(text), "HUM prefix not declared (expected `prefix:` line or HUM[1-9] mention)"


def test_humanity_auditor_six_categories():
    """Spec: 6 humane-signal categories. Verify all 6 are named in the prompt."""
    text = _text().lower()
    expected = [
        "ai-flat rhythm",
        "imperative fog",
        "hedge over-clustering",
        "voice break",
        "boilerplate stamp",
        "manufactured-logic chains",
    ]
    missing = [cat for cat in expected if cat not in text]
    assert not missing, f"humanity_auditor missing categories: {missing}"


def test_humanity_auditor_has_output_contract_heading():
    """Spec requires exact heading `## Output Contract` (capital C)."""
    text = _text()
    assert re.search(r"^##\s+Output Contract\b", text, re.MULTILINE), (
        "humanity_auditor.md must declare `## Output Contract` heading"
    )


def test_humanity_auditor_has_determinism_note_heading():
    """Spec requires exact heading `## Determinism Note`."""
    text = _text()
    assert re.search(r"^##\s+Determinism Note\b", text, re.MULTILINE), (
        "humanity_auditor.md must declare `## Determinism Note` heading"
    )


def test_humanity_auditor_references_agent_output_schema():
    """The Output Contract section should reference the JSON sidecar schema
    so future orchestrator code can wire up validation."""
    text = _text()
    assert "agent-output.schema.json" in text, (
        "humanity_auditor.md should reference schemas/agent-output.schema.json"
    )


def test_humanity_auditor_sentinel_split_token():
    """The split-token AGENT_DONE sentinel reference must be present."""
    text = _text()
    has_split = "AGENT_" in text and "DONE -->" in text
    has_literal = "AGENT_DONE" in text
    assert has_split or has_literal, "AGENT_DONE sentinel reference missing"


def test_humanity_auditor_no_provider_specific_tags():
    """Spec: prompts SHALL be free of provider-specific tags. Confirm there
    is no live `<thinking>` tag (mentioned only in the avoid-list is fine)."""
    text = _text()
    # Allow the tag to appear as part of an "avoid" rule, but not as a live
    # instruction to use it. Heuristic: the tag should appear at most as a
    # quoted/forbidden example, never as an instruction like "use <thinking>".
    lower = text.lower()
    assert "use <thinking>" not in lower, "humanity_auditor.md instructs use of <thinking>"
    assert "use <reflection>" not in lower, "humanity_auditor.md instructs use of <reflection>"
