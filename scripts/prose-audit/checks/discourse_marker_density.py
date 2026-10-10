#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/discourse_marker_density.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Discourse marker density check.

Counts explicit discourse markers ("However", "Therefore", "Moreover",
"Furthermore", "In addition", ...) per 1000 characters of prose. AI prose
tends to over-signpost — a paragraph hopping from "Moreover" to "Furthermore"
to "In conclusion" rarely reads like a human draft.

Thresholds (per kchar):
  > 8     → medium ("prose over-signposted")
  > 5, ≤ 8 → low
  ≤ 5     → no finding

English markers are case-sensitive at sentence-initial position (or after a
paragraph break / period+space), because mid-sentence "however" is a legitimate
adverb. Chinese markers are substring-matched because written Chinese has no
word delimiter and these markers conventionally open clauses.

Code fences and YAML scalar metadata lines are stripped first so configuration
or example snippets do not inflate the score.

See: wiki/concepts/coherence/rst-rhetorical-structure-theory.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent

_YAML_SCALAR_RE = re.compile(r"^\s*[\w-]+:\s*\S")

# Discourse marker seed lists. Hardcoded inline per task contract.
ENGLISH_MARKERS: tuple[str, ...] = (
    "However",
    "Therefore",
    "Moreover",
    "Furthermore",
    "In addition",
    "Additionally",
    "Nevertheless",
    "Nonetheless",
    "Consequently",
    "Thus",
    "Hence",
    "Indeed",
    "Importantly",
    "Notably",
    "Crucially",
    "Significantly",
    "Specifically",
    "Particularly",
    "In conclusion",
    "In summary",
    "To summarize",
)

CHINESE_MARKERS: tuple[str, ...] = (
    "然而",
    "因此",
    "此外",
    "並且",
    "而且",
    "再者",
    "不過",
    "然則",
    "總而言之",
    "綜上所述",
    "換言之",
    "換句話說",
    "具體而言",
)

MEDIUM_THRESHOLD = 8.0
LOW_THRESHOLD = 5.0


def _strip_metadata_lines(text: str) -> str:
    """Drop fenced code blocks and YAML scalar metadata lines.

    Same semantics as hedge_density / lazy_writer_check so the density checks
    agree on what counts as prose.
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
    """Build sentence-initial-position regexes for each English marker.

    A marker counts only when preceded by the document start, a paragraph
    break (blank line), or a period-then-whitespace. The trailing character
    must be whitespace or a comma so e.g. "Howeverness" never matches.
    """
    patterns: dict[str, re.Pattern[str]] = {}
    for marker in ENGLISH_MARKERS:
        # (?:^|\n\n|\.\s+) — boundary before marker
        # [\s,]              — boundary after marker (comma or whitespace)
        pat = re.compile(
            r"(?:^|\n\n|\.\s+)(" + re.escape(marker) + r")[\s,]"
        )
        patterns[marker] = pat
    return patterns


_EN_PATTERNS = _build_english_patterns()


def compute(text: str) -> tuple[list[dict], dict]:
    stripped = _strip_metadata_lines(text)
    total_chars = len(stripped)

    counts: dict[str, int] = {}
    for marker, pat in _EN_PATTERNS.items():
        n = len(pat.findall(stripped))
        if n:
            counts[marker] = n
    for marker in CHINESE_MARKERS:
        n = stripped.count(marker)
        if n:
            counts[marker] = n

    total_hits = sum(counts.values())
    if total_chars == 0:
        density = 0.0
    else:
        density = total_hits / (total_chars / 1000.0)

    top_markers = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    top_markers_serializable = [[m, n] for m, n in top_markers]

    findings: list[dict] = []
    if density > MEDIUM_THRESHOLD:
        top3 = ", ".join(f"{m}×{n}" for m, n in top_markers[:3])
        findings.append(
            {
                "severity": "medium",
                "section": "<discourse-marker-density>",
                "issue": (
                    f"Discourse markers {density:.1f}/kchar > {MEDIUM_THRESHOLD:g}; "
                    f"prose over-signposted"
                ),
                "evidence": f"top markers: {top3}" if top3 else f"hits={total_hits}",
            }
        )
    elif density > LOW_THRESHOLD:
        top3 = ", ".join(f"{m}×{n}" for m, n in top_markers[:3])
        findings.append(
            {
                "severity": "low",
                "section": "<discourse-marker-density>",
                "issue": (
                    f"Discourse markers {density:.1f}/kchar > {LOW_THRESHOLD:g}; "
                    f"consider trimming signposts"
                ),
                "evidence": f"top markers: {top3}" if top3 else f"hits={total_hits}",
            }
        )

    metadata = {
        "density_per_kchar": round(density, 2),
        "top_markers": top_markers_serializable,
    }
    return findings, metadata


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Discourse marker density check")
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
                "check": "discourse_marker_density",
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
