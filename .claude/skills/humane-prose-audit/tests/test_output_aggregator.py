"""Tests for humane-prose-audit/scripts/output_aggregator.py.

Covers task 5.2 verification: verdict three-case + consensus bump
two-case + structural emit-valid-schema and missing-optional-phases.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest
from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
SCHEMA_DIR = SKILL_ROOT / "schemas"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from output_aggregator import (  # noqa: E402
    aggregate,
    consensus_bump,
    compute_verdict,
)

AGGREGATOR_SCRIPT = SCRIPTS_DIR / "output_aggregator.py"
VALIDATOR = SCRIPTS_DIR / "validate_outputs.py"


def _make_run_dir(tmp_path, *, checks=None, agents=None, fuzz=None) -> Path:
    """Materialize a run_dir with the given preflight/agent/fuzz payloads."""
    run_dir = tmp_path / "run"
    pre = run_dir / "preflight"
    pre.mkdir(parents=True)
    if checks:
        for name, payload in checks.items():
            (pre / f"{name}.json").write_text(json.dumps(payload))
    if agents:
        agents_dir = run_dir / "agents"
        agents_dir.mkdir(parents=True)
        for name, payload in agents.items():
            (agents_dir / f"{name}.json").write_text(json.dumps(payload))
    if fuzz is not None:
        fuzz_dir = run_dir / "fuzz"
        fuzz_dir.mkdir(parents=True)
        (fuzz_dir / "fuzz-report.json").write_text(json.dumps(fuzz))
    return run_dir


def _check_payload(name, findings=None, metadata=None):
    return {
        "check": name,
        "target": "/tmp/x.md",
        "findings": findings or [],
        "metadata": metadata or {},
    }


def _agent_payload(name, findings=None, prefix=None):
    return {
        "agent": name,
        "target": "/tmp/x.md",
        "findings": findings or [],
    }


def _finding(severity, section, issue, evidence=""):
    return {
        "severity": severity,
        "section": section,
        "issue": issue,
        "evidence": evidence,
    }


def _agent_finding(fid, severity, section, issue, recommendation="fix it", confidence=0.5):
    return {
        "id": fid,
        "severity": severity,
        "section": section,
        "issue": issue,
        "recommendation": recommendation,
        "confidence": confidence,
    }


# ---------------------------------------------------------------------------
# Verdict three-case
# ---------------------------------------------------------------------------


def test_verdict_pass(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={"burstiness": _check_payload("burstiness", findings=[], metadata={"burstiness": 0.5})},
        agents={
            "sloppy": _agent_payload(
                "sloppy",
                findings=[_agent_finding("SLP1", "medium", "intro", "Minor wording.")],
            )
        },
    )
    report = aggregate(run_dir)
    assert report["verdict"] == "PASS"
    assert report["summary"]["critical"] == 0
    assert report["summary"]["high"] == 0


def test_verdict_warn(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={"burstiness": _check_payload("burstiness")},
        agents={
            "illogical": _agent_payload(
                "illogical",
                findings=[_agent_finding("ILL1", "high", "body", "Logic gap.")],
            )
        },
    )
    report = aggregate(run_dir)
    assert report["verdict"] == "WARN"
    assert report["summary"]["critical"] == 0
    assert report["summary"]["high"] >= 1


def test_verdict_fail(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={
            "ai_tells": _check_payload(
                "ai_tells",
                findings=[_finding("critical", "intro", "Fatal AI tell.")],
            )
        },
    )
    report = aggregate(run_dir)
    assert report["verdict"] == "FAIL"
    assert report["summary"]["critical"] >= 1


# ---------------------------------------------------------------------------
# Consensus bump
# ---------------------------------------------------------------------------


def test_consensus_bump_two_agents_medium_to_high():
    # Same section, both severity medium -> bump to high.
    a1 = [_agent_finding("SLP1", "medium", "intro", "Phrasing is awkward here.")]
    a2 = [_agent_finding("ILL1", "medium", "intro", "Phrasing is awkward here.")]
    consolidated = consensus_bump([a1, a2])
    assert len(consolidated) == 1
    f = consolidated[0]
    assert f["severity"] == "high"
    assert f["consensus_bumped_from"] == "medium"


def test_consensus_bump_four_agents_caps_at_critical():
    a1 = [_agent_finding("SLP1", "medium", "intro", "Phrasing is awkward.")]
    a2 = [_agent_finding("ILL1", "medium", "intro", "Phrasing is awkward.")]
    a3 = [_agent_finding("SHL1", "medium", "intro", "Phrasing is awkward.")]
    a4 = [_agent_finding("HUM1", "medium", "intro", "Phrasing is awkward.")]
    consolidated = consensus_bump([a1, a2, a3, a4])
    assert len(consolidated) == 1
    f = consolidated[0]
    assert f["severity"] == "critical"


# ---------------------------------------------------------------------------
# Structural tests
# ---------------------------------------------------------------------------


def test_aggregate_emits_valid_schema(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={
            "burstiness": _check_payload("burstiness", metadata={"burstiness": 0.5}),
            "ai_tells": _check_payload("ai_tells", metadata={"vocab_density_per_kchar": 2.0}),
            "imperative_fog": _check_payload("imperative_fog", metadata={"density_per_kchar": 2.0}),
            "lexical_diversity": _check_payload("lexical_diversity", metadata={"mtld": 40.0}),
            "discourse_marker_density": _check_payload(
                "discourse_marker_density", metadata={"density_per_kchar": 2.0}
            ),
        },
        agents={
            "sloppy": _agent_payload(
                "sloppy",
                findings=[_agent_finding("SLP1", "low", "intro", "Polish needed.")],
            )
        },
        fuzz={"summary": "robust", "results": []},
    )
    report = aggregate(run_dir)
    schema = json.loads((SCHEMA_DIR / "audit-report.schema.json").read_text())
    errors = sorted(Draft7Validator(schema).iter_errors(report), key=lambda e: list(e.absolute_path))
    assert not errors, [e.message for e in errors]


def test_aggregate_missing_optional_phases(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={"burstiness": _check_payload("burstiness", metadata={"burstiness": 0.5})},
    )
    report = aggregate(run_dir)
    # No agents/ and no fuzz/ — phases must still be present, just empty.
    assert "agents" in report["phases"]
    assert "fuzz" in report["phases"]
    # Default empty placeholder: no findings consolidated from agents.
    schema = json.loads((SCHEMA_DIR / "audit-report.schema.json").read_text())
    errors = list(Draft7Validator(schema).iter_errors(report))
    assert not errors, [e.message for e in errors]


def test_critical_short_circuit_phases(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={
            "ai_tells": _check_payload(
                "ai_tells",
                findings=[_finding("critical", "intro", "Fatal AI tell #1.")],
            ),
            "duplicate_sentences": _check_payload(
                "duplicate_sentences",
                findings=[_finding("critical", "body", "Fatal duplicate.")],
            ),
        },
    )
    report = aggregate(run_dir)
    assert report["verdict"] == "FAIL"
    # All criticals reflected in the report findings.
    crit_findings = [f for f in report["findings"] if f["severity"] == "critical"]
    assert len(crit_findings) >= 2
    # phases.preflight should be present and non-empty.
    assert report["phases"]["preflight"]


# ---------------------------------------------------------------------------
# compute_verdict pure function
# ---------------------------------------------------------------------------


def test_compute_verdict_strict_rule():
    assert compute_verdict([]) == "PASS"
    assert compute_verdict([{"severity": "low", "section": "x", "issue": "y", "source": "s"}]) == "PASS"
    assert (
        compute_verdict([{"severity": "high", "section": "x", "issue": "y", "source": "s"}]) == "WARN"
    )
    assert (
        compute_verdict(
            [
                {"severity": "critical", "section": "x", "issue": "y", "source": "s"},
                {"severity": "high", "section": "x", "issue": "z", "source": "s"},
            ]
        )
        == "FAIL"
    )


# ---------------------------------------------------------------------------
# Case-normalization of existing checks that emit capitalized severity.
# ---------------------------------------------------------------------------


def test_capitalized_severity_normalized(tmp_path):
    # citation_format emits "High" — must be normalized to "high" on ingest.
    run_dir = _make_run_dir(
        tmp_path,
        checks={
            "citation_format": _check_payload(
                "citation_format",
                findings=[_finding("High", "refs", "Dangling citation.")],
            )
        },
    )
    report = aggregate(run_dir)
    assert report["verdict"] == "WARN"
    assert report["summary"]["high"] >= 1


# ---------------------------------------------------------------------------
# CLI smoke
# ---------------------------------------------------------------------------


def test_cli_emits_valid_json(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={"burstiness": _check_payload("burstiness", metadata={"burstiness": 0.5})},
    )
    proc = subprocess.run(
        [sys.executable, str(AGGREGATOR_SCRIPT), str(run_dir)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert "verdict" in payload
    assert "humane_score" in payload


def test_cli_validate_flag(tmp_path):
    run_dir = _make_run_dir(
        tmp_path,
        checks={"burstiness": _check_payload("burstiness", metadata={"burstiness": 0.5})},
    )
    proc = subprocess.run(
        [sys.executable, str(AGGREGATOR_SCRIPT), str(run_dir), "--validate"],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
