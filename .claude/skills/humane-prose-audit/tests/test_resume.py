"""Resume/idempotency tests for ``scripts/audit_orchestrator.py``.

The orchestrator's ``--resume`` flag is the contract under test. It must:

* Skip phases recorded in ``manifest.json`` as already complete, leaving
  their preflight outputs byte- and mtime-identical.
* On a partial state (some preflight files present, no manifest /
  ``_summary.json``), re-run Phase 1 so the full 13-check inventory of
  preflight JSON files exists afterwards.

These tests use the shorter ``human-flavored.md`` fixture so the full
preflight runs in roughly a few seconds.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parent.parent
ORCH = SKILL_ROOT / "scripts" / "audit_orchestrator.py"
FIXTURE = SKILL_ROOT / "tests" / "fixtures" / "human-flavored.md"

# 13 checks expected after a clean Phase-1 run (14 in the inventory minus
# citation_format, which is opt-in only when refs are configured).
_REQUIRED = {
    "ai_tells",
    "burstiness",
    "discourse_marker_density",
    "duplicate_sentences",
    "hedge_density",
    "imperative_fog",
    "lazy_writer_check",
    "lexical_diversity",
    "mainland_vocab",
    "placeholder_grep",
    "pronoun_consistency",
    "repetition_fingerprint",
}


def _run(args: list[str], timeout: int = 120) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(ORCH), *args],
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _phase1_args(run_dir: Path, *, resume: bool = False) -> list[str]:
    args = [
        str(FIXTURE),
        "--out",
        str(run_dir),
        "--phase",
        "1",
        "--no-fuzz",
    ]
    if resume:
        args.append("--resume")
    return args


def _real_check_files(run_dir: Path) -> dict[str, int]:
    """Map ``<check>.json`` -> mtime_ns; skip the ``_*.json`` sidecars."""
    pre_dir = run_dir / "preflight"
    return {
        p.name: p.stat().st_mtime_ns
        for p in pre_dir.glob("*.json")
        if not p.name.startswith("_")
    }


# ---------------------------------------------------------------------------
# Test 1: full run, then --resume is a no-op
# ---------------------------------------------------------------------------


def test_full_run_then_resume_is_no_op(tmp_path):
    run_dir = tmp_path / "run-resume-noop"

    first = _run(_phase1_args(run_dir))
    assert first.returncode == 0, (
        f"first run failed:\nstdout:{first.stdout}\nstderr:{first.stderr}"
    )
    mtimes_before = _real_check_files(run_dir)
    assert len(mtimes_before) >= 12, (
        f"expected >=12 preflight check files, got {sorted(mtimes_before)}"
    )
    summary_path = run_dir / "preflight" / "_summary.json"
    summary_before = summary_path.read_bytes()
    manifest_before = (run_dir / "manifest.json").read_bytes()

    # Sleep just past 1s so that any rewrite would bump mtime_ns observably
    # on coarse-grained filesystems.
    time.sleep(1.1)

    second = _run(_phase1_args(run_dir, resume=True))
    assert second.returncode == 0, (
        f"resume run failed:\nstdout:{second.stdout}\nstderr:{second.stderr}"
    )
    # Orchestrator reports the skip on stderr.
    assert (
        "skipping" in second.stderr.lower() or "resume" in second.stderr.lower()
    ), f"expected resume marker on stderr, got: {second.stderr!r}"

    mtimes_after = _real_check_files(run_dir)
    assert mtimes_after == mtimes_before, (
        "preflight JSON mtimes changed on --resume; resume should be a no-op\n"
        f"before: {mtimes_before}\nafter:  {mtimes_after}"
    )
    assert summary_path.read_bytes() == summary_before, (
        "_summary.json was rewritten on --resume"
    )
    # manifest may legitimately stay byte-identical when no new phase ran;
    # we tolerate either equality (preferred) or unchanged phases list.
    manifest_after_doc = json.loads((run_dir / "manifest.json").read_text())
    assert manifest_after_doc["phases_completed"] == json.loads(
        manifest_before
    )["phases_completed"]


# ---------------------------------------------------------------------------
# Test 2: partial preflight state + --resume -> full inventory afterwards
# ---------------------------------------------------------------------------


def test_partial_run_then_resume_completes(tmp_path):
    """Simulate a killed mid-run by seeding one preflight file with no
    ``_summary.json`` / ``manifest.json``. ``--resume`` must finish the
    remaining checks so every expected preflight JSON exists.
    """
    run_dir = tmp_path / "run-resume-partial"
    pre_dir = run_dir / "preflight"
    pre_dir.mkdir(parents=True)

    # Seed a single schema-valid preflight output, no summary, no manifest.
    seeded = {
        "check": "ai_tells",
        "target": str(FIXTURE),
        "findings": [],
    }
    (pre_dir / "ai_tells.json").write_text(json.dumps(seeded), encoding="utf-8")

    result = _run(_phase1_args(run_dir, resume=True))
    assert result.returncode == 0, (
        f"resume run failed:\nstdout:{result.stdout}\nstderr:{result.stderr}"
    )

    # Every expected check must now have a JSON output.
    present = {p.stem for p in pre_dir.glob("*.json") if not p.name.startswith("_")}
    missing = _REQUIRED - present
    assert not missing, (
        f"resume left preflight incomplete; missing checks: {missing}; "
        f"present: {sorted(present)}"
    )

    # Phase-1 summary must exist and report a sane checks_run count.
    summary = json.loads(
        (pre_dir / "_summary.json").read_text(encoding="utf-8")
    )
    assert summary.get("checks_run", 0) >= 12, (
        f"summary.checks_run too low: {summary}"
    )
