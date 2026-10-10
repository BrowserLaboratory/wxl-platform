#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/lazy_writer_check.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Lazy-writer template phrase check.

Counts occurrences of filler/cliché phrases listed in config.yaml and
flags either a global density violation (Medium) or per-phrase abuse
(Low when a single phrase appears ≥ 3 times) on the target.

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

_YAML_SCALAR_RE = re.compile(r"^\s*[\w-]+:\s*\S")


def load_cfg() -> dict:
    try:
        return yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)


def _strip_metadata_lines(text: str) -> str:
    """Drop lines that look like YAML scalar entries or sit inside fenced code blocks.

    Lazy-writer density should reflect prose, not config/code; otherwise template
    phrases embedded in metadata or fenced examples produce false positives.
    """
    out: list[str] = []
    in_fence = False
    for line in text.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if _YAML_SCALAR_RE.match(line):
            continue
        out.append(line)
    return "\n".join(out)


def compute_findings(text: str, cfg: dict) -> list[dict]:
    lazy_cfg = cfg.get("lazy_writer", {})
    phrases: list[str] = list(lazy_cfg.get("template_phrases", []))
    max_density = float(lazy_cfg.get("max_density_per_kchar", 2))

    text = _strip_metadata_lines(text)

    counts: dict[str, int] = {}
    total_hits = 0
    for phrase in phrases:
        if not phrase:
            continue
        c = text.count(phrase)
        counts[phrase] = c
        total_hits += c

    total_chars = len(text)
    if total_chars == 0:
        return []

    density = total_hits / (total_chars / 1000.0)

    findings: list[dict] = []
    if density > max_density:
        top3 = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
        top3_str = ", ".join(f"{p}×{n}" for p, n in top3 if n > 0)
        findings.append(
            {
                "severity": "Medium",
                "section": "<lazy-writer-density>",
                "issue": (
                    f"Template phrase density {density:.2f}/kchar exceeds "
                    f"threshold {max_density}/kchar"
                ),
                "evidence": f"top phrases: {top3_str}",
            }
        )
        return findings

    for phrase, n in counts.items():
        if n >= 3:
            findings.append(
                {
                    "severity": "Low",
                    "section": "<lazy-writer-phrase>",
                    "issue": f"Template phrase `{phrase}` reused frequently",
                    "evidence": f"count={n}",
                }
            )
    return findings


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Lazy-writer template phrase check")
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

    findings = compute_findings(text, load_cfg())
    print(
        json.dumps(
            {"check": "lazy_writer", "target": str(target), "findings": findings},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
