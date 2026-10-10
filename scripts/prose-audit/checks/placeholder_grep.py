#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/placeholder_grep.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Placeholder text check.

Greps for placeholder patterns (TBD/TODO/FIXME/XXX/TKTK/待補/Lorem ipsum)
listed in config.yaml. Findings get severity `High` because placeholder
patterns indicate unfinished prose that must be filled before submission.

See: wiki/concepts/readability-and-style/editorial-style-frameworks.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent


def load_patterns() -> list[str]:
    try:
        cfg = yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)
    return list(cfg.get("placeholder_patterns", []))


def find_placeholders(text: str, patterns: list[str]) -> list[dict]:
    findings: list[dict] = []
    if not patterns:
        return findings
    combined = "|".join(re.escape(p) for p in patterns)
    pat = re.compile(combined, re.IGNORECASE)
    section = "<file head>"
    section_pat = re.compile(r"^\s*(?:=+|##+|#align\(center\)\[)")
    for lineno, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if section_pat.match(stripped):
            section = stripped[:80]
        if pat.search(line):
            findings.append(
                {
                    "severity": "High",
                    "section": section,
                    "issue": "Placeholder pattern detected — finish or remove before submission",
                    "evidence": f"line {lineno}: {line.strip()[:200]}",
                }
            )
    return findings


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Placeholder grep check")
    parser.add_argument("target", help="Path to file to scan")
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    findings = find_placeholders(text, load_patterns())
    out = {
        "check": "placeholder_grep",
        "target": str(target),
        "findings": findings,
    }
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
