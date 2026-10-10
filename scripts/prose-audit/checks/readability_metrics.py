#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/readability_metrics.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Readability metrics check.

Extracts English-language paragraphs (heuristic: ≥80% ASCII letters/spaces)
and computes the mean Flesch reading ease via textstat. Emits a single
Medium finding when the aggregate falls outside the configured band.

See: wiki/concepts/readability-and-style/flesch-reading-ease.md
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import textstat
import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent


def load_cfg() -> dict:
    try:
        return yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)


def split_paragraphs(text: str) -> list[str]:
    return [p.strip() for p in text.split("\n\n") if p.strip()]


def is_english_paragraph(paragraph: str, ratio: float = 0.8) -> bool:
    if not paragraph:
        return False
    counted = [c for c in paragraph if not c.isspace()]
    if not counted:
        return False
    ascii_letters_or_space = sum(
        1 for c in paragraph if (c.isascii() and (c.isalpha() or c == " "))
    )
    total = len(paragraph)
    return (ascii_letters_or_space / total) >= ratio


def compute_findings(text: str, cfg: dict) -> list[dict]:
    read_cfg = cfg.get("readability", {})
    flesch_min = float(read_cfg.get("flesch_min", 0))
    flesch_max = float(read_cfg.get("flesch_max", 40))

    english_paragraphs = [p for p in split_paragraphs(text) if is_english_paragraph(p)]
    if not english_paragraphs:
        return []

    scores: list[float] = []
    for paragraph in english_paragraphs:
        try:
            scores.append(float(textstat.flesch_reading_ease(paragraph)))
        except Exception:
            continue
    if not scores:
        return []

    mean_score = sum(scores) / len(scores)

    if mean_score < flesch_min:
        direction = "too hard"
        issue = (
            f"Aggregate Flesch {mean_score:.2f} below threshold {flesch_min} "
            f"({direction}) — prose may be impenetrable"
        )
        return [
            {
                "severity": "Medium",
                "section": "<readability-aggregate>",
                "issue": issue,
                "evidence": f"mean_flesch={mean_score:.2f} over {len(scores)} paragraph(s)",
            }
        ]
    if mean_score > flesch_max:
        direction = "too easy"
        issue = (
            f"Aggregate Flesch {mean_score:.2f} above threshold {flesch_max} "
            f"({direction}) — prose may be too colloquial for PhD-tier audience"
        )
        return [
            {
                "severity": "Medium",
                "section": "<readability-aggregate>",
                "issue": issue,
                "evidence": f"mean_flesch={mean_score:.2f} over {len(scores)} paragraph(s)",
            }
        ]
    return []


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Readability metrics check")
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
            {"check": "readability_metrics", "target": str(target), "findings": findings},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
