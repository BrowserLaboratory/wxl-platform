"""Pytest suite for humane-prose-audit append-only journal module.

Covers the public API of `scripts._common.journal` plus the CLI `--validate`
mode. All disk writes target the pytest `tmp_path` fixture; the production
journal at `humane-prose-audit/.audit-journal.jsonl` MUST NOT be touched.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
JOURNAL_PY = SCRIPTS_DIR / "_common" / "journal.py"

# Make `scripts._common.journal` importable.
sys.path.insert(0, str(SKILL_ROOT))

from scripts._common import journal  # noqa: E402


REQUIRED_KW = dict(
    session_id="sess-1",
    model="claude-opus-4-7",
    action="check.cliches",
    target="docs/example.md",
    exit_code=0,
    duration_ms=42,
)


def _write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("".join(lines), encoding="utf-8")


def test_validate_empty_file_is_ok(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    p.write_text("", encoding="utf-8")
    assert journal.validate_file(p) == []


def test_validate_missing_file_is_ok(tmp_path: Path) -> None:
    p = tmp_path / "does-not-exist.jsonl"
    assert journal.validate_file(p) == []


def test_append_creates_single_line(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    journal.append(p, **REQUIRED_KW)
    raw = p.read_text(encoding="utf-8")
    assert raw.endswith("\n")
    lines = raw.splitlines()
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert isinstance(record, dict)
    for field in journal.REQUIRED_FIELDS:
        assert field in record, f"missing {field!r} in record"


def test_append_is_append_only(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    journal.append(p, ts="2026-05-12T00:00:00+00:00", **REQUIRED_KW)
    first_line = p.read_text(encoding="utf-8").splitlines()[0]
    journal.append(p, ts="2026-05-12T00:00:01+00:00", **REQUIRED_KW)
    lines = p.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    assert lines[0] == first_line


def test_append_includes_extra_fields(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    journal.append(p, sha256_after="abc123", extra_note="hello", **REQUIRED_KW)
    record = json.loads(p.read_text(encoding="utf-8").splitlines()[0])
    assert record["sha256_after"] == "abc123"
    assert record["extra_note"] == "hello"


def test_append_auto_ts(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    journal.append(p, **REQUIRED_KW)
    record = json.loads(p.read_text(encoding="utf-8").splitlines()[0])
    assert "ts" in record
    # Should be a parseable ISO8601 timestamp.
    parsed = datetime.fromisoformat(record["ts"])
    assert parsed is not None


def test_validate_catches_malformed_json(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    _write_lines(p, ["not json\n"])
    errors = journal.validate_file(p)
    assert errors, "expected at least one error"
    assert any("line 1" in e for e in errors)


def test_validate_catches_missing_required(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    _write_lines(p, [json.dumps({"action": "x"}) + "\n"])
    errors = journal.validate_file(p)
    assert errors
    joined = "\n".join(errors)
    # at least these missing required fields are reported
    for fname in ("ts", "session_id", "model", "target", "exit_code", "duration_ms"):
        assert fname in joined, f"expected mention of missing {fname!r}: {joined}"


def test_validate_catches_wrong_types(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    bad = dict(
        ts="2026-05-12T00:00:00+00:00",
        session_id="s",
        model="m",
        action="a",
        target="t",
        exit_code="0",  # wrong type: string instead of int
        duration_ms=10,
    )
    _write_lines(p, [json.dumps(bad) + "\n"])
    errors = journal.validate_file(p)
    assert errors
    assert any("exit_code" in e for e in errors)


def test_cli_validate_exits_zero_on_empty(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    p.write_text("", encoding="utf-8")
    proc = subprocess.run(
        [sys.executable, str(JOURNAL_PY), "--validate", str(p)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr


def test_cli_validate_exits_nonzero_on_malformed(tmp_path: Path) -> None:
    p = tmp_path / "journal.jsonl"
    _write_lines(p, ["not json\n"])
    proc = subprocess.run(
        [sys.executable, str(JOURNAL_PY), "--validate", str(p)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode != 0
    assert proc.stderr.strip() != ""
