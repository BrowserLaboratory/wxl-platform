"""Append-only operation log for the humane-prose-audit persistent state layer.

Each completed check, mutator, agent, orchestrator, or wiki operation appends
exactly one JSON Lines record to `.audit-journal.jsonl`. This module is also
runnable as a CLI with `--validate <path>` to verify an existing journal.

Public API:
    REQUIRED_FIELDS    — tuple of required field names, in canonical order
    append(...)        — append one JSONL record (mode='a', never truncates)
    iter_entries(...)  — yield parsed JSON objects from the journal
    validate_file(...) — return list of validation errors (empty = valid)

Conventions:
    * `append` opens the file in mode `'a'` only. It never seeks or truncates.
    * Missing journal files are treated as "no entries" (valid) by readers.
    * The spec's "SHALL NOT be modified or deleted" requirement is enforced
      by convention here; physical immutability is the verifier's concern.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

REQUIRED_FIELDS: tuple[str, ...] = (
    "ts",
    "session_id",
    "model",
    "action",
    "target",
    "exit_code",
    "duration_ms",
)


def append(
    journal_path: Path,
    *,
    session_id: str,
    model: str,
    action: str,
    target: str,
    exit_code: int,
    duration_ms: int,
    ts: str | None = None,
    **extra: object,
) -> None:
    """Append exactly one JSONL record to ``journal_path``.

    If ``ts`` is ``None``, the current UTC time is used in ISO 8601 form. The
    file is opened in mode ``'a'``; this function never seeks or truncates.
    Existing lines are not read or modified.
    """
    if ts is None:
        ts = datetime.now(timezone.utc).isoformat()
    record: dict[str, object] = {
        "ts": ts,
        "session_id": session_id,
        "model": model,
        "action": action,
        "target": target,
        "exit_code": exit_code,
        "duration_ms": duration_ms,
    }
    # Preserve caller-provided extras without letting them overwrite required
    # fields silently.
    for key, value in extra.items():
        if key in record:
            continue
        record[key] = value
    line = json.dumps(record, ensure_ascii=False, sort_keys=False)
    journal_path = Path(journal_path)
    with journal_path.open("a", encoding="utf-8") as fh:
        fh.write(line)
        fh.write("\n")
        fh.flush()


def iter_entries(journal_path: Path) -> Iterator[dict]:
    """Yield each parsed JSON object from ``journal_path``.

    Raises ``ValueError`` on a malformed line (non-JSON or non-object).
    A missing file yields no entries.
    """
    journal_path = Path(journal_path)
    if not journal_path.exists():
        return
    with journal_path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            stripped = raw.rstrip("\n")
            if stripped == "":
                continue
            try:
                obj = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"line {lineno}: invalid JSON") from exc
            if not isinstance(obj, dict):
                raise ValueError(f"line {lineno}: not a JSON object")
            yield obj


def validate_file(journal_path: Path) -> list[str]:
    """Return a list of validation error strings for ``journal_path``.

    An empty list means the file is valid. A missing or empty file is
    considered valid (returns ``[]``).
    """
    journal_path = Path(journal_path)
    errors: list[str] = []
    if not journal_path.exists():
        return errors
    with journal_path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            stripped = raw.rstrip("\n")
            if stripped == "":
                continue
            try:
                obj = json.loads(stripped)
            except json.JSONDecodeError:
                errors.append(f"line {lineno}: invalid JSON")
                continue
            if not isinstance(obj, dict):
                errors.append(f"line {lineno}: not a JSON object")
                continue
            for field in REQUIRED_FIELDS:
                if field not in obj:
                    errors.append(
                        f"line {lineno}: missing required field {field!r}"
                    )
            if "exit_code" in obj and not _is_plain_int(obj["exit_code"]):
                errors.append(f"line {lineno}: 'exit_code' must be int")
            if "duration_ms" in obj:
                value = obj["duration_ms"]
                if not _is_plain_int(value):
                    errors.append(
                        f"line {lineno}: 'duration_ms' must be int"
                    )
                elif value < 0:
                    errors.append(
                        f"line {lineno}: 'duration_ms' must be >= 0"
                    )
    return errors


def _is_plain_int(value: object) -> bool:
    """Return True iff ``value`` is an int (and not a bool)."""
    return isinstance(value, int) and not isinstance(value, bool)


def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="journal",
        description="Append-only journal utility for humane-prose-audit.",
    )
    parser.add_argument(
        "--validate",
        metavar="PATH",
        help="Validate the JSONL journal at PATH.",
    )
    args = parser.parse_args(argv)

    if args.validate:
        errors = validate_file(Path(args.validate))
        if errors:
            for err in errors:
                print(err, file=sys.stderr)
            return 1
        return 0

    parser.print_help(sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
