"""Tests for scripts._common.output_schema dataclasses + schema round-trip.

Covers the contract for Task 2.3 of humane-prose-audit-refactor:
- to_dict drops None-valued optionals and turns tuples into lists
- from_dict raises ValueError on missing required keys
- validate() runs against the on-disk Draft7 schemas and returns
  a list of error paths
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from _common.output_schema import (  # noqa: E402
    AgentFinding,
    AgentOutput,
    CheckOutput,
    Finding,
    SCHEMA_DIR,
)


# ---------------------------------------------------------------------------
# CheckOutput / Finding
# ---------------------------------------------------------------------------


def _make_finding(**overrides) -> Finding:
    kwargs = dict(
        severity="high",
        section="L12",
        issue="ai_tell hit",
        evidence="It is important to note that…",
        wiki_refs=("wiki/concepts/style/ai_tells.md",),
    )
    kwargs.update(overrides)
    return Finding(**kwargs)


def _make_check_output(**overrides) -> CheckOutput:
    kwargs = dict(
        check="ai_tells",
        target="/abs/path/to/file.md",
        findings=(_make_finding(),),
    )
    kwargs.update(overrides)
    return CheckOutput(**kwargs)


def test_check_output_roundtrip():
    co = _make_check_output(metadata={"score": 0.42})
    data = co.to_dict()
    assert co.validate() == []
    restored = CheckOutput.from_dict(data)
    assert restored == co


def test_check_output_drops_none_optionals():
    co = _make_check_output()  # metadata defaults to None
    data = co.to_dict()
    assert "metadata" not in data
    # findings list must still be present (required)
    assert "findings" in data
    # wiki_refs round-trips as list
    assert data["findings"][0]["wiki_refs"] == [
        "wiki/concepts/style/ai_tells.md"
    ]


def test_check_output_validates_against_real_schema():
    co = _make_check_output(metadata={"locale": "zh-TW"})
    schema_path = SCHEMA_DIR / "check-output.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    errors = list(validator.iter_errors(co.to_dict()))
    assert errors == [], [e.message for e in errors]


def test_check_output_rejects_missing_required():
    with pytest.raises(ValueError) as excinfo:
        CheckOutput.from_dict({"check": "foo"})
    assert "target" in str(excinfo.value)


# ---------------------------------------------------------------------------
# AgentOutput / AgentFinding
# ---------------------------------------------------------------------------


def _make_agent_finding(**overrides) -> AgentFinding:
    kwargs = dict(
        id="SLP1",
        severity="medium",
        section="L20-L25",
        issue="repetitive phrasing",
        recommendation="vary sentence openings",
        confidence=0.8,
        evidence="The text repeats…",
    )
    kwargs.update(overrides)
    return AgentFinding(**kwargs)


def _make_agent_output(**overrides) -> AgentOutput:
    kwargs = dict(
        agent="sloppy",
        target="/abs/path/to/file.md",
        findings=(_make_agent_finding(),),
        model="claude-opus-4",
        seed=42,
    )
    kwargs.update(overrides)
    return AgentOutput(**kwargs)


def test_agent_output_roundtrip():
    ao = _make_agent_output(metadata={"latency_ms": 1234})
    data = ao.to_dict()
    assert ao.validate() == []
    restored = AgentOutput.from_dict(data)
    assert restored == ao


def test_agent_finding_id_pattern_enforced():
    bad = _make_agent_output(
        findings=(_make_agent_finding(id="XYZ1"),)
    )
    errors = bad.validate()
    assert errors, "expected schema regex to reject invalid id prefix"


def test_agent_output_validates_against_real_schema():
    ao = _make_agent_output()
    schema_path = SCHEMA_DIR / "agent-output.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    errors = list(validator.iter_errors(ao.to_dict()))
    assert errors == [], [e.message for e in errors]


# ---------------------------------------------------------------------------
# Severity enum
# ---------------------------------------------------------------------------


def test_severity_enum_enforced():
    good = _make_check_output(findings=(_make_finding(severity="critical"),))
    assert good.validate() == []

    bad = _make_check_output(
        findings=(_make_finding(severity="bogus"),)  # type: ignore[arg-type]
    )
    errors = bad.validate()
    assert errors, "expected schema enum to reject bogus severity"


# ---------------------------------------------------------------------------
# Schema drift meta-tests — populate every field so additionalProperties:false
# in the schema cannot silently mask a stale dataclass.
# ---------------------------------------------------------------------------


def test_check_output_all_fields_populated_validates():
    """Construct CheckOutput with every optional field set; validate() must
    pass. Catches drift where a new field is added to the dataclass without
    a matching schema update."""
    co = CheckOutput(
        check="ai_tells",
        target="/abs/path/x.md",
        findings=(
            Finding(
                severity="high",
                section="Intro",
                issue="too many em-dashes",
                evidence="—— ——",
                wiki_refs=("wiki/concepts/ai-tells/em-dash-overuse.md",),
                metadata={"count": 7},
            ),
        ),
        metadata={"thresholds": {"max_em_dashes": 3}, "locale": "en"},
        nondeterministic=False,
    )
    assert co.validate() == [], co.validate()


def test_agent_output_all_fields_populated_validates():
    """Same drift check for AgentOutput / AgentFinding."""
    ao = AgentOutput(
        agent="humanity",
        target="/abs/path/x.md",
        findings=(
            AgentFinding(
                id="HUM3",
                severity="medium",
                section="Body",
                issue="AI-flat rhythm",
                recommendation="vary sentence length",
                confidence=0.82,
                evidence="every sentence has 17 words.",
            ),
        ),
        model="claude-opus-4-7",
        seed=1234,
        nondeterministic=False,
        metadata={"prompt_token_count": 1024, "completion_token_count": 512},
    )
    assert ao.validate() == [], ao.validate()


# ---------------------------------------------------------------------------
# from_dict severity / agent enum defense-in-depth
# ---------------------------------------------------------------------------


def test_finding_from_dict_rejects_bogus_severity():
    with pytest.raises(ValueError, match="severity"):
        Finding.from_dict(
            {
                "severity": "banana",
                "section": "S",
                "issue": "I",
                "evidence": "E",
            }
        )


def test_agent_finding_from_dict_rejects_bogus_severity():
    with pytest.raises(ValueError, match="severity"):
        AgentFinding.from_dict(
            {
                "id": "HUM1",
                "severity": "banana",
                "section": "S",
                "issue": "I",
                "recommendation": "R",
                "confidence": 0.5,
            }
        )


def test_agent_output_from_dict_rejects_unknown_agent():
    with pytest.raises(ValueError, match="agent"):
        AgentOutput.from_dict({"agent": "unknown", "target": "/abs/x.md"})
