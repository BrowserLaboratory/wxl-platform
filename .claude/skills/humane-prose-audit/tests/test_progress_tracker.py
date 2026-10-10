"""TDD test suite for scripts/progress_tracker.py.

Covers status / mark-start / mark-done / --validate modes plus atomic-write
semantics. Tests never touch the production .refactor-progress.yaml or
openspec/changes/.../tasks.md — they synthesize fixtures under tmp_path.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent
TRACKER_PY = SKILL_ROOT / "scripts" / "progress_tracker.py"
REAL_PROGRESS = SKILL_ROOT / ".refactor-progress.yaml"
REAL_TASKS = SKILL_ROOT.parent / "openspec" / "changes" / "humane-prose-audit-refactor" / "tasks.md"


def _write_progress(path: Path, phases: dict[str, str]) -> None:
    doc = {"schema_version": 0, "phases": {k: {"status": v} for k, v in phases.items()}}
    path.write_text(yaml.safe_dump(doc, sort_keys=False))


def _write_tasks(path: Path, phase_ids: list[str]) -> None:
    lines = []
    for n, pid in enumerate(phase_ids, start=1):
        lines.append(f"## {n}. Phase {pid} — synthesized fixture phase\n")
        lines.append(f"\n- [ ] {n}.1 dummy task\n\n")
    path.write_text("".join(lines))


def _run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(TRACKER_PY), *args],
        capture_output=True,
        text=True,
    )


def test_status_prints_each_phase(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    _write_progress(progress, {"A": "completed", "B": "pending"})
    proc = _run("status", "--progress", str(progress))
    assert proc.returncode == 0, proc.stderr
    assert "A" in proc.stdout and "completed" in proc.stdout
    assert "B" in proc.stdout and "pending" in proc.stdout
    # The Phase A GATE verification requires `grep -q "A.*completed"` matches:
    assert any("A" in line and "completed" in line for line in proc.stdout.splitlines())


def test_mark_start_sets_in_progress(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    _write_progress(progress, {"A": "pending"})
    proc = _run("mark-start", "A", "--progress", str(progress))
    assert proc.returncode == 0, proc.stderr
    doc = yaml.safe_load(progress.read_text())
    assert doc["phases"]["A"]["status"] == "in_progress"


def test_mark_done_sets_completed(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    _write_progress(progress, {"A": "in_progress"})
    proc = _run("mark-done", "A", "--progress", str(progress))
    assert proc.returncode == 0, proc.stderr
    doc = yaml.safe_load(progress.read_text())
    assert doc["phases"]["A"]["status"] == "completed"


def test_mark_unknown_phase_fails(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    _write_progress(progress, {"A": "pending"})
    proc = _run("mark-done", "Z", "--progress", str(progress))
    assert proc.returncode != 0
    assert "Z" in proc.stderr


def test_atomic_write_leaves_no_tmp(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    _write_progress(progress, {"A": "pending"})
    proc = _run("mark-done", "A", "--progress", str(progress))
    assert proc.returncode == 0
    # No partial / temp files should linger in the directory:
    leftovers = [p.name for p in tmp_path.iterdir() if p.name != "progress.yaml"]
    assert leftovers == [], f"unexpected leftover files: {leftovers}"


def test_validate_matches_tasks_md(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    tasks = tmp_path / "tasks.md"
    _write_progress(progress, {"A": "pending", "B": "pending"})
    _write_tasks(tasks, ["A", "B"])
    proc = _run("--validate", "--progress", str(progress), "--tasks", str(tasks))
    assert proc.returncode == 0, proc.stderr


def test_validate_detects_extra_phase_in_progress(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    tasks = tmp_path / "tasks.md"
    _write_progress(progress, {"A": "pending", "Z": "pending"})  # Z not in tasks.md
    _write_tasks(tasks, ["A"])
    proc = _run("--validate", "--progress", str(progress), "--tasks", str(tasks))
    assert proc.returncode != 0
    assert "Z" in proc.stderr


def test_validate_detects_missing_phase_in_progress(tmp_path: Path) -> None:
    progress = tmp_path / "progress.yaml"
    tasks = tmp_path / "tasks.md"
    _write_progress(progress, {"A": "pending"})
    _write_tasks(tasks, ["A", "B"])  # B in tasks.md but not progress
    proc = _run("--validate", "--progress", str(progress), "--tasks", str(tasks))
    assert proc.returncode != 0
    assert "B" in proc.stderr


def test_validate_progress_file_missing(tmp_path: Path) -> None:
    proc = _run("--validate", "--progress", str(tmp_path / "nope.yaml"))
    assert proc.returncode != 0


def test_validate_against_real_state() -> None:
    """The production .refactor-progress.yaml + tasks.md must agree."""
    proc = _run("--validate")  # defaults to real files
    assert proc.returncode == 0, (
        f"production --validate failed:\nstdout={proc.stdout}\nstderr={proc.stderr}"
    )
