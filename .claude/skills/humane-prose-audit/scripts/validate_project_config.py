#!/usr/bin/env python3
"""Validate a `.humane-prose-audit.yaml` (or profile template) against
`schemas/project-config.schema.json`.

Usage:
    python validate_project_config.py <path-to.yaml>

Exit codes:
    0 — file parses as YAML and validates against the schema
    2 — file violates the schema (locations printed to stderr; user values
        intentionally redacted to avoid leaking secrets through CI logs)
    3 — infrastructure error (file missing, malformed YAML, schema missing,
        top-level is not a YAML mapping)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml
from jsonschema import Draft7Validator


SKILL_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = SKILL_ROOT / "schemas" / "project-config.schema.json"


def _safe_error_summary(err) -> str:
    """Return a CI-log-safe summary of a jsonschema ValidationError.

    The default ``err.message`` echoes the offending instance value verbatim,
    which can leak secrets if a user pastes an api key into their config and
    the schema rejects the field. We surface the validator name and the
    schema constraint instead, never the instance value.
    """
    validator = err.validator or "?"
    expected = err.validator_value
    return f"failed `{validator}` constraint (expected: {expected!r})"


def validate(path: Path) -> int:
    if not path.is_file():
        print(f"error: {path} does not exist", file=sys.stderr)
        return 3
    if not SCHEMA_PATH.is_file():
        print(f"error: schema missing at {SCHEMA_PATH}", file=sys.stderr)
        return 3
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(f"error: {path}: malformed YAML: {exc}", file=sys.stderr)
        return 3
    # Treat empty / null / non-mapping top-level explicitly. `safe_load()`
    # returns None for empty or `null` documents; the schema is keyed for a
    # mapping, so anything else is an infrastructure error not a user-value
    # violation.
    if doc is None:
        doc = {}
    if not isinstance(doc, dict):
        print(
            f"error: {path}: top-level must be a YAML mapping, got "
            f"{type(doc).__name__}",
            file=sys.stderr,
        )
        return 3
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path))
    if not errors:
        print(f"OK: {path} conforms to project-config.schema.json")
        return 0
    for err in errors:
        loc = ".".join(str(p) for p in err.absolute_path) or "<root>"
        print(f"[FAIL] {path}: {loc}: {_safe_error_summary(err)}", file=sys.stderr)
    return 2


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a project-config YAML against the bundled schema",
        allow_abbrev=False,
    )
    parser.add_argument("path", type=Path, help="Path to the YAML file to validate")
    args = parser.parse_args()
    return validate(args.path)


if __name__ == "__main__":
    raise SystemExit(main())
