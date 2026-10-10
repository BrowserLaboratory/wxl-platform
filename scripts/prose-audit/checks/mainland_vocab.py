#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/mainland_vocab.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Mainland-Chinese vocabulary check.

Scans a target file for PRC-specific terms listed in config.yaml's
`mainland_vocab` mapping. Emits a JSON object on stdout with the standard
`{check, target, findings}` shape. Exits 0 on success (findings may be empty)
and non-zero when the input cannot be read or the config is missing.

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


def load_vocab() -> dict[str, str]:
    try:
        cfg = yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)
    return dict(cfg.get("mainland_vocab", {}))


def find_matches(text: str, vocab: dict[str, str]) -> list[dict]:
    findings: list[dict] = []
    lines = text.splitlines()
    section = "<file head>"
    section_pat = re.compile(r"^\s*(?:=+|##+|#align\(center\)\[)")
    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        if section_pat.match(stripped):
            section = stripped[:80]
        for prc, tw in vocab.items():
            # substring match — keys treated as literal strings, not regex
            if prc in line:
                findings.append(
                    {
                        "severity": "Medium",
                        "section": section,
                        "issue": f"PRC vocabulary `{prc}` detected — replace with `{tw}`",
                        "evidence": f"line {lineno}: {line.strip()[:200]}",
                    }
                )
    return findings


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Mainland vocab check")
    parser.add_argument("target", help="Path to file to scan")
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(
            json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 2

    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    vocab = load_vocab()
    findings = find_matches(text, vocab)
    out = {
        "check": "mainland_vocab",
        "target": str(target),
        "findings": findings,
    }
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
