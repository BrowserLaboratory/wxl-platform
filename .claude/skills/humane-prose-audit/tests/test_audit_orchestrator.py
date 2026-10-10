"""End-to-end pytest suite for ``scripts/audit_orchestrator.py``.

The orchestrator stitches together five phases:

  1. Preflight checks (subprocess per check)
  2. Sub-agent dispatch (writes `_inputs.json`; LLM-side runs externally)
  3. Fuzz analysis (subprocess to `mutators/run_fuzz.py`)
  4. Humane-signal scoring (via `output_aggregator.compute_humane_score`)
  5. Consolidated findings (via `output_aggregator.aggregate`)

Tests use ``--no-fuzz`` whenever possible so CI completes quickly.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
SCHEMA_DIR = SKILL_ROOT / "schemas"
FIXTURE = SKILL_ROOT / "tests" / "fixtures" / "academic-sample.md"
ORCH = SCRIPTS_DIR / "audit_orchestrator.py"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _run_orch(args: list[str], cwd: Path | None = None, timeout: int = 60):
    cmd = [sys.executable, str(ORCH), *args]
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=str(cwd) if cwd else None,
    )


def _load_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / f"{name}.schema.json").read_text())


def _validate(doc: dict, schema_name: str) -> list[str]:
    validator = Draft7Validator(_load_schema(schema_name))
    return [
        f"{'/'.join(str(p) for p in err.absolute_path) or '<root>'}: {err.message}"
        for err in validator.iter_errors(doc)
    ]


# ---------------------------------------------------------------------------
# Phase 5 end-to-end
# ---------------------------------------------------------------------------


def test_orchestrator_e2e_produces_valid_audit_report(tmp_path):
    """The primary verification target: full run -> audit-report.json -> schema OK."""
    run_dir = tmp_path / "run1"
    result = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz"],
        timeout=120,
    )
    assert result.returncode == 0, (
        f"orchestrator exited {result.returncode}\n"
        f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    )
    report_path = run_dir / "audit-report.json"
    assert report_path.is_file(), "audit-report.json was not written"
    report = json.loads(report_path.read_text())
    errors = _validate(report, "audit-report")
    assert errors == [], f"audit-report violates schema: {errors}"


def test_orchestrator_writes_preflight_outputs(tmp_path):
    """Phase 1 should produce one preflight/<check>.json per check that succeeds.

    Per task contract, only the 8 Phase-C checks are guaranteed schema-conformant.
    Legacy checks may be quarantined to _errored.json.
    """
    run_dir = tmp_path / "run-pre"
    result = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz"],
        timeout=120,
    )
    assert result.returncode == 0, result.stderr

    pre_dir = run_dir / "preflight"
    assert pre_dir.is_dir()

    phase_c = {
        "ai_tells",
        "burstiness",
        "hedge_density",
        "imperative_fog",
        "lexical_diversity",
        "pronoun_consistency",
        "discourse_marker_density",
        "repetition_fingerprint",
    }
    present = {p.stem for p in pre_dir.glob("*.json")}
    missing = phase_c - present
    assert not missing, (
        f"missing preflight outputs for new checks: {missing}; present={present}"
    )

    summary_path = pre_dir / "_summary.json"
    assert summary_path.is_file(), "preflight/_summary.json missing"
    summary = json.loads(summary_path.read_text())
    assert "checks_run" in summary
    assert "critical_count" in summary
    assert "errored_checks" in summary


def test_orchestrator_no_fuzz_skips_phase_3(tmp_path):
    run_dir = tmp_path / "run-nofuzz"
    result = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz"],
        timeout=120,
    )
    assert result.returncode == 0
    fuzz_dir = run_dir / "fuzz"
    # The directory may or may not exist, but fuzz-report.json must not.
    assert not (fuzz_dir / "fuzz-report.json").exists()


def test_orchestrator_phase_limit(tmp_path):
    """`--phase 1` runs only Preflight; later phase outputs must be absent."""
    run_dir = tmp_path / "run-p1"
    result = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--phase", "1", "--no-fuzz"],
        timeout=120,
    )
    assert result.returncode == 0, result.stderr

    # Preflight artifacts exist...
    assert (run_dir / "preflight" / "_summary.json").is_file()
    # ...but later phases do not.
    assert not (run_dir / "agents" / "_inputs.json").exists()
    assert not (run_dir / "fuzz" / "fuzz-report.json").exists()
    assert not (run_dir / "humane_score.json").exists()
    assert not (run_dir / "audit-report.json").exists()


def test_orchestrator_critical_short_circuit(tmp_path):
    """Seed a critical preflight finding via --resume; phases 2 & 3 must skip."""
    run_dir = tmp_path / "run-crit"
    pre_dir = run_dir / "preflight"
    pre_dir.mkdir(parents=True)

    # Pre-seed a valid preflight check output with one critical finding.
    seeded = {
        "check": "placeholder_grep",
        "target": str(FIXTURE),
        "findings": [
            {
                "severity": "critical",
                "section": "abstract",
                "issue": "synthetic critical for short-circuit test",
                "evidence": "line 1: TBD",
            }
        ],
    }
    (pre_dir / "placeholder_grep.json").write_text(json.dumps(seeded))
    # Seed _summary.json so Phase 1 short-circuits cleanly under --resume.
    (pre_dir / "_summary.json").write_text(
        json.dumps(
            {"checks_run": 1, "critical_count": 1, "errored_checks": []}
        )
    )
    # Pre-seed manifest with phase 1 complete so --resume knows.
    (run_dir / "manifest.json").write_text(
        json.dumps(
            {
                "target": str(FIXTURE),
                "seed": 0,
                "started_at": "1970-01-01T00:00:00+00:00",
                "config_snapshot": {},
                "phases_completed": [1],
            }
        )
    )

    result = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz", "--resume"],
        timeout=120,
    )
    assert result.returncode == 0, result.stderr

    # Phase 2 short-circuit marker
    skipped_path = run_dir / "agents" / "_skipped.json"
    assert skipped_path.is_file(), "agents/_skipped.json missing"
    skipped = json.loads(skipped_path.read_text())
    assert skipped["reason"] == "preflight_critical"

    # Phase 2 inputs MUST NOT be written.
    assert not (run_dir / "agents" / "_inputs.json").exists()
    # Phase 3 must be empty.
    assert not (run_dir / "fuzz" / "fuzz-report.json").exists()

    # Phases 4 & 5 still ran.
    assert (run_dir / "humane_score.json").is_file()
    report = json.loads((run_dir / "audit-report.json").read_text())
    assert report["verdict"] == "FAIL"


def test_init_config_creates_stub(tmp_path):
    result = _run_orch(["init-config"], cwd=tmp_path, timeout=15)
    assert result.returncode == 0, result.stderr
    cfg_path = tmp_path / ".humane-prose-audit.yaml"
    assert cfg_path.is_file(), "stub config not created"
    data = yaml.safe_load(cfg_path.read_text())
    assert isinstance(data, dict)
    errors = _validate(data, "project-config")
    assert errors == [], f"stub config violates project-config schema: {errors}"


def test_init_config_refuses_overwrite(tmp_path):
    cfg_path = tmp_path / ".humane-prose-audit.yaml"
    cfg_path.write_text("profile: general\n")
    result = _run_orch(["init-config"], cwd=tmp_path, timeout=15)
    assert result.returncode != 0
    assert ".humane-prose-audit.yaml" in (result.stderr + result.stdout)


def test_resume_skips_completed_phases(tmp_path):
    run_dir = tmp_path / "run-resume"
    first = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz"],
        timeout=120,
    )
    assert first.returncode == 0, first.stderr

    manifest = json.loads((run_dir / "manifest.json").read_text())
    assert manifest["phases_completed"] == [1, 2, 4, 5]

    second = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz", "--resume"],
        timeout=120,
    )
    assert second.returncode == 0, second.stderr
    # Resume marker should mention skipped phases on stderr.
    assert "resume" in second.stderr.lower() or "skipping" in second.stderr.lower()


def test_validate_outputs_passes_against_e2e_report(tmp_path):
    """End-to-end report should also pass the bundled validate_outputs.py."""
    run_dir = tmp_path / "run-validate"
    result = _run_orch(
        [str(FIXTURE), "--out", str(run_dir), "--no-fuzz"],
        timeout=120,
    )
    assert result.returncode == 0, result.stderr

    validator = SCRIPTS_DIR / "validate_outputs.py"
    proc = subprocess.run(
        [
            sys.executable,
            str(validator),
            "--schema",
            "audit-report",
            str(run_dir / "audit-report.json"),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert proc.returncode == 0, (
        f"validate_outputs.py rejected report:\n"
        f"stdout: {proc.stdout}\nstderr: {proc.stderr}"
    )
