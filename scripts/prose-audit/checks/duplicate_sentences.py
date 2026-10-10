#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/duplicate_sentences.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Duplicate-sentence check.

Splits prose into sentences (CJK punctuation aware), normalises whitespace,
and emits a finding when any sentence appears more than once above the
similarity threshold in config.yaml. Short sentences (table cells, code
fragments) are filtered out by `min_sentence_chars` to keep noise low.

See: wiki/concepts/readability-and-style/editorial-style-frameworks.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent

# Combined sentence terminator regex: CJK 。！？ ASCII .!? plus line breaks
_SENTENCE_SPLIT = re.compile(r"[。！？!?．\.;；]+\s*|\n+")
_WS = re.compile(r"\s+")


def load_cfg() -> dict:
    try:
        return yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)


def normalise(sent: str) -> str:
    return _WS.sub("", sent).strip()


def split_sentences(text: str) -> list[str]:
    parts = [normalise(p) for p in _SENTENCE_SPLIT.split(text)]
    return [p for p in parts if p]


def find_duplicates(text: str, cfg: dict) -> list[dict]:
    dup_cfg = cfg.get("duplicate_sentences", {})
    min_chars = int(dup_cfg.get("min_sentence_chars", 12))
    # Floor at 3 chars to prevent single-particle / punctuation-only spam when
    # config sets a typo value like 0.
    min_chars = max(min_chars, 3)
    sentences = [s for s in split_sentences(text) if len(s) >= min_chars]
    counts = Counter(sentences)
    findings: list[dict] = []
    for sentence, n in counts.items():
        if n >= 2:
            findings.append(
                {
                    "severity": "Medium",
                    "section": "<duplicate-sentence-scan>",
                    "issue": f"Sentence repeats {n} times — verify intentional vs editorial drift",
                    "evidence": sentence[:200],
                }
            )
    return findings


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Duplicate sentence check")
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

    findings = find_duplicates(text, load_cfg())
    print(json.dumps({"check": "duplicate_sentences", "target": str(target), "findings": findings}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
