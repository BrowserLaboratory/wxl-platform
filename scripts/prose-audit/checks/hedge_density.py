#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/hedge_density.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Hedge density check.

Counts hedge / softening modifiers per 1000 characters of prose. Code
fences and YAML scalar metadata lines are stripped first so configuration
or example snippets do not inflate the score.

Thresholds (per kchar):
  > 12      → medium ("voice reads evasive")
  > 8, ≤ 12 → low
  ≤ 8       → no finding

English matches are case-insensitive and whole-word (`\\bword\\b`) so e.g.
`maybe` does not register as `may`. Chinese hedges are substring-matched
because written Chinese has no word delimiter.

See: wiki/concepts/argumentation/argument-quality.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent

_YAML_SCALAR_RE = re.compile(r"^\s*[\w-]+:\s*\S")

# Hedge seed lists. Could be overridden via config.yaml later.
ENGLISH_HEDGES: tuple[str, ...] = (
    "perhaps",
    "might",
    "may",
    "could",
    "possibly",
    "seems",
    "appears",
    "tends to",
    "somewhat",
    "rather",
    "fairly",
    "quite",
    "arguably",
    "presumably",
    "allegedly",
    "reportedly",
    "supposedly",
    "seemingly",
    "evidently",
)

CHINESE_HEDGES: tuple[str, ...] = (
    "或許",
    "也許",
    "可能",
    "似乎",
    "大概",
    "看起來",
    "在某種程度上",
    "某種程度上",
)

MEDIUM_THRESHOLD = 12.0
LOW_THRESHOLD = 8.0


def _strip_metadata_lines(text: str) -> str:
    """Drop fenced code blocks and YAML scalar metadata lines.

    Same semantics as lazy_writer_check._strip_metadata_lines so the two
    density checks agree on what counts as prose.
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


def _build_english_patterns() -> dict[str, re.Pattern[str]]:
    return {
        word: re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
        for word in ENGLISH_HEDGES
    }


_EN_PATTERNS = _build_english_patterns()


def compute(text: str) -> tuple[list[dict], dict]:
    stripped = _strip_metadata_lines(text)
    total_chars = len(stripped)

    counts: dict[str, int] = {}
    for word, pat in _EN_PATTERNS.items():
        n = len(pat.findall(stripped))
        if n:
            counts[word] = n
    for word in CHINESE_HEDGES:
        n = stripped.count(word)
        if n:
            counts[word] = n

    total_hits = sum(counts.values())
    if total_chars == 0:
        density = 0.0
    else:
        density = total_hits / (total_chars / 1000.0)

    top_hedges = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    top_hedges_serializable = [[w, n] for w, n in top_hedges]

    findings: list[dict] = []
    if density > MEDIUM_THRESHOLD:
        top3 = ", ".join(f"{w}×{n}" for w, n in top_hedges[:3])
        findings.append(
            {
                "severity": "medium",
                "section": "<hedge-density>",
                "issue": (
                    f"Hedge density {density:.1f}/kchar > {MEDIUM_THRESHOLD:g}; "
                    f"voice reads evasive"
                ),
                "evidence": f"top hedges: {top3}" if top3 else f"hits={total_hits}",
            }
        )
    elif density > LOW_THRESHOLD:
        top3 = ", ".join(f"{w}×{n}" for w, n in top_hedges[:3])
        findings.append(
            {
                "severity": "low",
                "section": "<hedge-density>",
                "issue": (
                    f"Hedge density {density:.1f}/kchar > {LOW_THRESHOLD:g}; "
                    f"consider trimming softeners"
                ),
                "evidence": f"top hedges: {top3}" if top3 else f"hits={total_hits}",
            }
        )

    metadata = {
        "density_per_kchar": round(density, 2),
        "top_hedges": top_hedges_serializable,
    }
    return findings, metadata


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Hedge density check")
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
        print(
            json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 2

    findings, metadata = compute(text)
    print(
        json.dumps(
            {
                "check": "hedge_density",
                "target": str(target.resolve()),
                "findings": findings,
                "metadata": metadata,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
