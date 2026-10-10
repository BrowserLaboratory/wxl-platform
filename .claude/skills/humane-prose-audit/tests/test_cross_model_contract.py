"""Cross-model contract test for humane-prose-audit aggregator.

The aggregator reads agent-output JSON sidecars from ``<run_dir>/agents/``.
Those sidecars conform to ``schemas/agent-output.schema.json`` — the
``cross-model machine contract``. This test synthesises three mock
agent-output payloads simulating three different LLM binding styles
(Claude-flavoured, OpenAI-flavoured, Gemini-flavoured) and asserts:

1. Each style validates against the schema.
2. The aggregator consumes each style and emits a structurally identical
   audit-report (modulo run-specific noise).
3. The aggregator's observable behaviour (verdict / summary / findings
   shape) is identical across the three styles — this is the actual
   cross-model contract assertion.

No real LLM is called; all "model styles" are synthetic JSON shapes.
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest
from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
SCHEMA_DIR = SKILL_ROOT / "schemas"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from output_aggregator import aggregate  # noqa: E402


# ---------------------------------------------------------------------------
# Schema fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def agent_schema() -> dict:
    return json.loads((SCHEMA_DIR / "agent-output.schema.json").read_text())


@pytest.fixture(scope="module")
def agent_validator(agent_schema: dict) -> Draft7Validator:
    return Draft7Validator(agent_schema)


# ---------------------------------------------------------------------------
# Mock binding-style outputs
# ---------------------------------------------------------------------------
#
# All three payloads describe the SAME logical finding (the sloppy persona
# spotted a high-severity awkward phrasing in the intro). They differ ONLY
# in stylistic surface that a real binding might introduce:
#   - Claude-style: full optional metadata block, evidence quoted verbatim.
#   - OpenAI-style: optional metadata omitted entirely; minimal payload.
#   - Gemini-style: includes ``seed`` + ``nondeterministic`` flags plus the
#     ``model`` identifier the harness might inject.
#
# All three must satisfy agent-output.schema.json.


def _claude_style_payload() -> dict:
    return {
        "agent": "sloppy",
        "target": "/tmp/doc.md",
        "model": "claude-style-binding",
        "findings": [
            {
                "id": "SLP1",
                "severity": "high",
                "section": "intro",
                "issue": "Opening sentence is awkward.",
                "recommendation": "Rewrite the opener for clarity.",
                "confidence": 0.82,
                "evidence": "\"It is the case that...\"",
            }
        ],
        "metadata": {"binding_style": "claude", "thinking_used": True},
    }


def _openai_style_payload() -> dict:
    return {
        "agent": "sloppy",
        "target": "/tmp/doc.md",
        "findings": [
            {
                "id": "SLP1",
                "severity": "high",
                "section": "intro",
                "issue": "Opening sentence is awkward.",
                "recommendation": "Rewrite the opener for clarity.",
                "confidence": 0.82,
            }
        ],
    }


def _gemini_style_payload() -> dict:
    return {
        "agent": "sloppy",
        "target": "/tmp/doc.md",
        "model": "gemini-style-binding",
        "seed": 42,
        "nondeterministic": False,
        "findings": [
            {
                "id": "SLP1",
                "severity": "high",
                "section": "intro",
                "issue": "Opening sentence is awkward.",
                "recommendation": "Rewrite the opener for clarity.",
                "confidence": 0.82,
                "evidence": "It is the case that...",
            }
        ],
        "metadata": {"binding_style": "gemini"},
    }


BINDING_STYLES: dict[str, callable] = {
    "claude": _claude_style_payload,
    "openai": _openai_style_payload,
    "gemini": _gemini_style_payload,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _materialize_run(tmp_path: Path, agent_payload: dict) -> Path:
    """Build a minimal run_dir with one preflight check + one agent sidecar."""
    run_dir = tmp_path / "run"
    pre = run_dir / "preflight"
    pre.mkdir(parents=True)
    # Minimal preflight so humane_score has at least one real metric.
    (pre / "burstiness.json").write_text(
        json.dumps(
            {
                "check": "burstiness",
                "target": "/tmp/doc.md",
                "findings": [],
                "metadata": {"burstiness": 0.5},
            }
        )
    )
    agents_dir = run_dir / "agents"
    agents_dir.mkdir(parents=True)
    (agents_dir / f"{agent_payload['agent']}.json").write_text(
        json.dumps(agent_payload)
    )
    return run_dir


def _strip_volatile(report: dict) -> dict:
    """Drop fields a real run might vary on but the contract doesn't pin.

    The aggregator output above is already deterministic given the same
    inputs, but we strip ``phases.humane_scoring.annotation`` defensively
    in case threshold messaging is reworded — the contract is about the
    findings/verdict/summary shape, not the warning string.
    """
    snapshot = copy.deepcopy(report)
    scoring = snapshot.get("phases", {}).get("humane_scoring")
    if isinstance(scoring, dict):
        scoring.pop("annotation", None)
    return snapshot


# ---------------------------------------------------------------------------
# Tests: per-binding schema conformance
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("style", sorted(BINDING_STYLES))
def test_binding_payload_validates_against_schema(style, agent_validator):
    payload = BINDING_STYLES[style]()
    errors = sorted(agent_validator.iter_errors(payload), key=lambda e: list(e.absolute_path))
    assert not errors, [e.message for e in errors]


# ---------------------------------------------------------------------------
# Tests: per-binding aggregator behaviour
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("style", sorted(BINDING_STYLES))
def test_aggregator_consumes_binding_style(style, tmp_path):
    payload = BINDING_STYLES[style]()
    run_dir = _materialize_run(tmp_path, payload)
    report = aggregate(run_dir)

    # Verdict: one high finding -> WARN.
    assert report["verdict"] == "WARN", f"{style}: {report['verdict']}"

    # Summary shape always present, exactly 1 high finding.
    assert report["summary"]["high"] == 1, f"{style}: {report['summary']}"
    assert report["summary"]["critical"] == 0

    # Exactly one consolidated finding from the one agent.
    findings = report["findings"]
    assert len(findings) == 1, f"{style}: {findings}"
    f = findings[0]
    assert f["section"] == "intro"
    assert f["severity"] == "high"
    assert f["source"].startswith("agent:sloppy")

    # phases.agents reflects the persona that fired.
    assert report["phases"]["agents"]["agents"] == ["sloppy"]
    assert report["phases"]["agents"]["finding_count"] == 1


# ---------------------------------------------------------------------------
# The actual cross-model contract: identical output across styles
# ---------------------------------------------------------------------------


def test_cross_model_contract_identical_reports(tmp_path):
    """Same logical finding via 3 binding styles -> identical aggregator reports."""
    reports: dict[str, dict] = {}
    for style, factory in BINDING_STYLES.items():
        run_dir = _materialize_run(tmp_path / style, factory())
        reports[style] = _strip_volatile(aggregate(run_dir))

    claude_report = reports["claude"]
    openai_report = reports["openai"]
    gemini_report = reports["gemini"]

    # Verdict + summary + humane_score + humane_band must all match.
    for key in ("verdict", "summary", "humane_score", "humane_band"):
        assert claude_report[key] == openai_report[key] == gemini_report[key], (
            f"divergence at {key}: claude={claude_report[key]} "
            f"openai={openai_report[key]} gemini={gemini_report[key]}"
        )

    # The consolidated findings must be structurally identical: same count,
    # same (severity, section, issue, source) tuples in the same order.
    def _fingerprints(rep: dict) -> list[tuple]:
        return [
            (f["severity"], f["section"], f["issue"], f["source"])
            for f in rep["findings"]
        ]

    claude_fp = _fingerprints(claude_report)
    openai_fp = _fingerprints(openai_report)
    gemini_fp = _fingerprints(gemini_report)
    assert claude_fp == openai_fp == gemini_fp, {
        "claude": claude_fp,
        "openai": openai_fp,
        "gemini": gemini_fp,
    }

    # phases.agents (persona roster + count) must match — that's the
    # consumer-visible cross-model handle.
    assert (
        claude_report["phases"]["agents"]
        == openai_report["phases"]["agents"]
        == gemini_report["phases"]["agents"]
    )
