#!/usr/bin/env python3
"""Maintain the refactor progress manifest at humane-prose-audit/.refactor-progress.yaml.

Atomic writes (write-to-temp + rename) protect the manifest from partial writes
on abort. ``--validate`` cross-checks that the phases in the manifest match the
phase headers in openspec/changes/humane-prose-audit-refactor/tasks.md.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Sequence

import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROGRESS = SKILL_ROOT / ".refactor-progress.yaml"
DEFAULT_TASKS = (
    SKILL_ROOT.parent
    / "openspec"
    / "changes"
    / "humane-prose-audit-refactor"
    / "tasks.md"
)
VALID_STATUSES = ("pending", "in_progress", "completed")
PHASE_HEADER_RE = re.compile(r"^##\s+\d+\.\s+Phase\s+([A-Z])\b", re.MULTILINE)


def _load_progress(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"progress file not found: {path}")
    doc = yaml.safe_load(path.read_text()) or {}
    if not isinstance(doc, dict) or "phases" not in doc:
        raise ValueError(f"{path}: missing 'phases' mapping")
    return doc


def _atomic_write_yaml(path: Path, doc: dict) -> None:
    parent = path.parent
    parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        prefix=path.name + ".",
        suffix=".tmp",
        dir=parent,
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w") as fh:
            yaml.safe_dump(doc, fh, sort_keys=False)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def _set_status(progress_path: Path, phase: str, status: str) -> None:
    if status not in VALID_STATUSES:
        raise ValueError(f"unknown status '{status}' (allowed: {VALID_STATUSES})")
    doc = _load_progress(progress_path)
    phases = doc["phases"]
    if phase not in phases:
        raise KeyError(f"phase '{phase}' not present in {progress_path}")
    if not isinstance(phases[phase], dict):
        phases[phase] = {}
    phases[phase]["status"] = status
    _atomic_write_yaml(progress_path, doc)


def cmd_status(progress_path: Path) -> int:
    doc = _load_progress(progress_path)
    for phase, info in doc["phases"].items():
        status = info.get("status", "pending") if isinstance(info, dict) else "pending"
        print(f"{phase}: {status}")
    return 0


def cmd_mark_start(progress_path: Path, phase: str) -> int:
    _set_status(progress_path, phase, "in_progress")
    return 0


def cmd_mark_done(progress_path: Path, phase: str) -> int:
    _set_status(progress_path, phase, "completed")
    return 0


def cmd_validate(progress_path: Path, tasks_path: Path) -> int:
    errors: list[str] = []
    try:
        doc = _load_progress(progress_path)
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    progress_phases = set(doc["phases"].keys())
    if not tasks_path.is_file():
        print(f"tasks file not found: {tasks_path}", file=sys.stderr)
        return 1
    tasks_phases = set(PHASE_HEADER_RE.findall(tasks_path.read_text()))
    extra = progress_phases - tasks_phases
    missing = progress_phases.symmetric_difference(tasks_phases) - extra
    if extra:
        errors.append(
            f"phases in progress file but not in tasks.md: {sorted(extra)}"
        )
    if missing:
        errors.append(
            f"phases in tasks.md but not in progress file: {sorted(missing)}"
        )
    if errors:
        for line in errors:
            print(line, file=sys.stderr)
        return 1
    return 0


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--progress",
        type=Path,
        default=DEFAULT_PROGRESS,
        help=f"Path to progress YAML (default: {DEFAULT_PROGRESS}).",
    )
    parser.add_argument(
        "--tasks",
        type=Path,
        default=DEFAULT_TASKS,
        help=f"Path to tasks.md (default: {DEFAULT_TASKS}). Used by --validate.",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Cross-check progress phases against tasks.md headers.",
    )
    parser.add_argument(
        "command",
        nargs="?",
        choices=("status", "mark-start", "mark-done"),
        help="Subcommand (omit when using --validate).",
    )
    parser.add_argument(
        "phase",
        nargs="?",
        help="Phase identifier (e.g. 'A') for mark-start / mark-done.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    if args.validate:
        return cmd_validate(args.progress, args.tasks)
    if args.command == "status":
        return cmd_status(args.progress)
    if args.command in ("mark-start", "mark-done"):
        if not args.phase:
            print(f"{args.command} requires a phase argument", file=sys.stderr)
            return 2
        try:
            if args.command == "mark-start":
                cmd_mark_start(args.progress, args.phase)
            else:
                cmd_mark_done(args.progress, args.phase)
            return 0
        except (KeyError, ValueError) as exc:
            print(str(exc), file=sys.stderr)
            return 1
    print("usage: progress_tracker.py [--validate | status | mark-start <phase> | mark-done <phase>]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
