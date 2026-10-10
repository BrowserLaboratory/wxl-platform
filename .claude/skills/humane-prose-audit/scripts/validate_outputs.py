#!/usr/bin/env python3
"""Cross-model JSON validator for humane-prose-audit outputs.

Validates check/agent/report/score/config JSON documents against the
five draft-07 schemas under ``humane-prose-audit/schemas/``. Exits non-zero
on any violation and writes every violating field path to stderr.

CLI shapes:
  validate_outputs.py --self-check
  validate_outputs.py --schema <name> --stdin
  validate_outputs.py --schema <name> <file.json>
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = SKILL_ROOT / "schemas"
KNOWN_SCHEMAS = (
    "check-output",
    "agent-output",
    "audit-report",
    "humane-score",
    "project-config",
)


def _load_schema(name: str) -> dict:
    if name not in KNOWN_SCHEMAS:
        raise SystemExit(f"unknown schema '{name}' (allowed: {', '.join(KNOWN_SCHEMAS)})")
    path = SCHEMA_DIR / f"{name}.schema.json"
    if not path.is_file():
        raise SystemExit(f"unknown schema '{name}' (no file at {path})")
    return json.loads(path.read_text())


def self_check() -> int:
    """Verify every schema in SCHEMA_DIR is well-formed draft-07 JSON Schema."""
    failures: list[str] = []
    files = sorted(SCHEMA_DIR.glob("*.schema.json"))
    if not files:
        print(f"no schemas found under {SCHEMA_DIR}", file=sys.stderr)
        return 1
    for path in files:
        try:
            doc = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            failures.append(f"{path.name}: invalid JSON ({exc})")
            continue
        meta = doc.get("$schema", "")
        if "draft-07" not in meta:
            failures.append(f"{path.name}: $schema is not draft-07 ({meta!r})")
            continue
        try:
            Draft7Validator.check_schema(doc)
        except Exception as exc:
            failures.append(f"{path.name}: meta-schema violation: {exc}")
    if failures:
        for line in failures:
            print(line, file=sys.stderr)
        return 1
    return 0


def validate_document(schema_name: str, doc: object) -> list[str]:
    schema = _load_schema(schema_name)
    validator = Draft7Validator(schema)
    errors = []
    for err in sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path)):
        path = "/".join(str(p) for p in err.absolute_path) or "<root>"
        errors.append(f"{path}: {err.message}")
    return errors


REQUIRED_PROMPT_HEADINGS = ("## Output Contract", "## Determinism Note")
FORBIDDEN_PROVIDER_TAGS = ("<thinking>", "<reflection>", "<scratchpad>")


def validate_prompts(prompts_dir: Path) -> list[str]:
    """Verify each `<prompts_dir>/*.md` declares the spec-required headings
    and is free of provider-specific tags used as live instructions.

    A forbidden tag is considered safe if it appears ONLY inside backtick
    inline code (so prompts can name the tags in an avoid-list without
    triggering the validator).
    """
    if not prompts_dir.is_dir():
        return [f"{prompts_dir}: not a directory"]
    errors: list[str] = []
    md_files = sorted(prompts_dir.glob("*.md"))
    if not md_files:
        return [f"{prompts_dir}: no *.md prompts found"]
    for path in md_files:
        if path.name.startswith("_"):
            # Skip top-level docs (_README.md, _glossary.md, ...).
            continue
        text = path.read_text(encoding="utf-8")
        for heading in REQUIRED_PROMPT_HEADINGS:
            if heading not in text:
                errors.append(f"{path.name}: missing required heading {heading!r}")
        for tag in FORBIDDEN_PROVIDER_TAGS:
            if tag not in text:
                continue
            # Allowed iff every occurrence is wrapped in backticks (inline code).
            backticked = text.count(f"`{tag}`")
            total = text.count(tag)
            if backticked < total:
                errors.append(
                    f"{path.name}: provider-specific tag {tag!r} used outside inline code"
                )
    return errors


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--self-check",
        action="store_true",
        help="Verify every schema in schemas/ is well-formed draft-07.",
    )
    parser.add_argument(
        "--schema",
        choices=KNOWN_SCHEMAS,
        help="Schema name to validate against (file or stdin).",
    )
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read JSON document from stdin instead of a file.",
    )
    parser.add_argument(
        "--validate-prompts",
        type=Path,
        metavar="DIR",
        help="Validate every prompt *.md in DIR has Output Contract / Determinism Note headings and no live provider-specific tags.",
    )
    parser.add_argument(
        "file",
        nargs="?",
        type=Path,
        help="Path to JSON document to validate.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    if args.self_check:
        return self_check()
    if args.validate_prompts is not None:
        errors = validate_prompts(args.validate_prompts)
        if errors:
            for line in errors:
                print(line, file=sys.stderr)
            return 1
        return 0
    if not args.schema:
        print("--schema is required when not running --self-check", file=sys.stderr)
        return 2
    if args.stdin and args.file:
        print("--stdin and a file argument are mutually exclusive", file=sys.stderr)
        return 2
    if args.stdin:
        raw = sys.stdin.read()
    elif args.file:
        raw = args.file.read_text()
    else:
        print("either --stdin or a file argument is required", file=sys.stderr)
        return 2
    try:
        doc = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"input is not valid JSON: {exc}", file=sys.stderr)
        return 1
    errors = validate_document(args.schema, doc)
    if errors:
        for line in errors:
            print(line, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
