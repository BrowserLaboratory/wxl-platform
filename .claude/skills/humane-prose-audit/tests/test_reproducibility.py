"""Seed-based reproducibility test for the Phase-1 preflight pipeline.

The contract under test: running ``audit_orchestrator.py`` twice with the same
fixture and the same ``--seed`` must produce byte-identical preflight outputs,
once non-deterministic provenance fields (timestamps, durations, session ids)
have been stripped.

This guards the determinism guarantee promised by the
``humane-prose-audit-refactor`` change — Phase 1 is pure / seed-controlled, and
regressing that would silently invalidate every downstream verdict that depends
on stable preflight findings.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


SKILL_ROOT = Path(__file__).resolve().parent.parent
ORCHESTRATOR = SKILL_ROOT / "scripts" / "audit_orchestrator.py"
FIXTURE = SKILL_ROOT / "tests" / "fixtures" / "academic-sample.md"

# Keys whose values can legitimately differ between two otherwise-identical
# runs (wall-clock based). Strip before comparing.
_VOLATILE_FINDING_KEYS = frozenset(
    {"timestamp", "ts", "duration_ms", "session_id", "start_ts", "end_ts"}
)
_VOLATILE_TOPLEVEL_KEYS = frozenset(
    {"target", "meta", "timestamp", "ts", "duration_ms", "session_id",
     "start_ts", "end_ts"}
)


def _run_preflight(out_dir: Path, seed: int) -> None:
    """Run Phase 1 preflight with the given seed; raise on non-zero exit."""
    cmd = [
        sys.executable,
        str(ORCHESTRATOR),
        str(FIXTURE),
        "--phase",
        "1",
        "--no-fuzz",
        "--out",
        str(out_dir),
        "--seed",
        str(seed),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise AssertionError(
            f"audit_orchestrator failed (seed={seed}, out={out_dir}):\n"
            f"  stdout: {result.stdout[:500]}\n"
            f"  stderr: {result.stderr[:500]}"
        )


def _strip_volatile(obj):
    """Recursively drop volatile keys from a JSON-decoded structure."""
    if isinstance(obj, dict):
        return {
            k: _strip_volatile(v)
            for k, v in obj.items()
            if k not in _VOLATILE_FINDING_KEYS
        }
    if isinstance(obj, list):
        return [_strip_volatile(v) for v in obj]
    return obj


def _normalise(doc: dict) -> str:
    """Drop top-level volatile fields, recurse, and serialise canonically."""
    cleaned = {
        k: _strip_volatile(v)
        for k, v in doc.items()
        if k not in _VOLATILE_TOPLEVEL_KEYS
    }
    return json.dumps(cleaned, sort_keys=True, ensure_ascii=False, indent=2)


def _preflight_files(run_dir: Path) -> list[Path]:
    pre_dir = run_dir / "preflight"
    assert pre_dir.is_dir(), f"missing preflight dir: {pre_dir}"
    return sorted(
        p for p in pre_dir.glob("*.json") if p.name != "_summary.json"
    )


@pytest.fixture(scope="module")
def two_runs(tmp_path_factory) -> tuple[Path, Path]:
    """Execute two seeded preflight runs and return their out-dirs."""
    base = tmp_path_factory.mktemp("repro")
    run1 = base / "run1"
    run2 = base / "run2"
    _run_preflight(run1, seed=0)
    _run_preflight(run2, seed=0)
    return run1, run2


class TestSeedReproducibility:
    """Same fixture + same seed -> byte-identical (normalised) preflight."""

    def test_both_runs_produce_preflight_dirs(self, two_runs):
        run1, run2 = two_runs
        assert (run1 / "preflight").is_dir()
        assert (run2 / "preflight").is_dir()

    def test_same_check_set_in_both_runs(self, two_runs):
        run1, run2 = two_runs
        names1 = [p.name for p in _preflight_files(run1)]
        names2 = [p.name for p in _preflight_files(run2)]
        assert names1 == names2, (
            f"preflight check filenames diverge:\n  run1: {names1}\n  run2: {names2}"
        )
        # Sanity: refactor spec promises 13 preflight checks.
        assert len(names1) == 13, f"expected 13 preflight files, got {len(names1)}"

    def test_each_preflight_json_is_byte_identical(self, two_runs):
        run1, run2 = two_runs
        files1 = _preflight_files(run1)
        files2 = _preflight_files(run2)
        mismatches: list[str] = []
        for p1, p2 in zip(files1, files2):
            assert p1.name == p2.name
            doc1 = json.loads(p1.read_text(encoding="utf-8"))
            doc2 = json.loads(p2.read_text(encoding="utf-8"))
            norm1 = _normalise(doc1)
            norm2 = _normalise(doc2)
            if norm1 != norm2:
                mismatches.append(p1.name)
        assert not mismatches, (
            "non-deterministic preflight output(s) for same seed: "
            f"{mismatches}"
        )
