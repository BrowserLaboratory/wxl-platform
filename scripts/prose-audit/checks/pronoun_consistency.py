#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/pronoun_consistency.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Pronoun-consistency check.

Detects awkward pronoun-voice switches between paragraphs — a common AI tell
where a piece swings from I → we → you → they across adjacent paragraphs.

Algorithm:
  1. Strip fenced code blocks (``` ... ```).
  2. Split into paragraphs (blank-line separated).
  3. Classify each paragraph's dominant voice from pronoun counts
     (first_singular / first_plural / second / third / none).
     English uses whole-word match; Chinese uses substring match.
  4. Count adjacent-paragraph voice switches, skipping `none` paragraphs.
  5. Emit findings:
       - >2 unique voices used → low severity.
       - 3+ adjacent switches  → medium severity.

See: wiki/concepts/coherence/centering-theory.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Voice categories in tie-break priority order.
VOICES = ("first_singular", "first_plural", "second", "third")

# English pronouns require word boundaries; Chinese pronouns are substring.
_EN_PATTERNS: dict[str, re.Pattern[str]] = {
    "first_singular": re.compile(r"\b(?:I|me|my|mine|myself)\b"),
    "first_plural": re.compile(r"\b(?:we|us|our|ours|ourselves)\b", re.IGNORECASE),
    "second": re.compile(r"\b(?:you|your|yours|yourself|yourselves)\b", re.IGNORECASE),
    "third": re.compile(
        r"\b(?:they|them|their|theirs|themselves|he|she|him|his|her|hers)\b",
        re.IGNORECASE,
    ),
}

_ZH_PATTERNS: dict[str, tuple[str, ...]] = {
    # Order matters: longer tokens first so "我們" doesn't double-count as "我".
    "first_plural": ("我們",),
    "first_singular": ("我",),
    "second": ("你", "您"),
    # Order matters: plural before singular for the same reason as above.
    "third": ("他們", "她們", "他", "她"),
}


def _strip_code_fences(text: str) -> str:
    """Drop fenced code blocks (``` ... ```)."""
    out: list[str] = []
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        out.append(line)
    return "\n".join(out)


def _split_paragraphs(text: str) -> list[str]:
    """Split text on blank lines; drop empty paragraphs."""
    parts = re.split(r"\n\s*\n+", text)
    return [p.strip() for p in parts if p.strip()]


def _count_voice(paragraph: str, voice: str) -> int:
    """Count pronoun occurrences for one voice category in a single paragraph."""
    en = _EN_PATTERNS[voice]
    n = len(en.findall(paragraph))
    # Chinese substring scan: consume matches left-to-right so a single
    # "我們" is counted once for first_plural and not again for first_singular.
    remaining = paragraph
    for token in _ZH_PATTERNS.get(voice, ()):
        n += remaining.count(token)
        remaining = remaining.replace(token, " " * len(token))
    return n


def _classify_paragraph(paragraph: str) -> str:
    """Return dominant voice for paragraph, or 'none' if no pronouns hit.

    To prevent Chinese plural/singular double counting, we scan in tie-break
    order (first_singular > first_plural > second > third) but mask longer
    Chinese tokens first.
    """
    # Mask longer Chinese tokens so they don't leak into shorter categories.
    work = paragraph
    counts: dict[str, int] = {}
    # English counts can be computed independently.
    en_counts = {v: len(_EN_PATTERNS[v].findall(paragraph)) for v in VOICES}
    # Chinese counts: scan plural-first to avoid double counting.
    zh_order = ("first_plural", "third", "first_singular", "second")
    zh_counts: dict[str, int] = {v: 0 for v in VOICES}
    for voice in zh_order:
        for token in _ZH_PATTERNS.get(voice, ()):
            zh_counts[voice] += work.count(token)
            work = work.replace(token, " " * len(token))

    for v in VOICES:
        counts[v] = en_counts[v] + zh_counts[v]

    if not any(counts.values()):
        return "none"

    # Tie-break: VOICES order (first_singular > first_plural > second > third).
    best = "none"
    best_n = 0
    for v in VOICES:
        if counts[v] > best_n:
            best_n = counts[v]
            best = v
    return best


def compute(text: str) -> dict:
    text = _strip_code_fences(text)
    paragraphs = _split_paragraphs(text)
    voices = [_classify_paragraph(p) for p in paragraphs]

    non_none = [v for v in voices if v != "none"]
    unique_voices: list[str] = []
    for v in non_none:
        if v not in unique_voices:
            unique_voices.append(v)

    adjacent_switches = 0
    prev: str | None = None
    for v in non_none:
        if prev is not None and v != prev:
            adjacent_switches += 1
        prev = v

    findings: list[dict] = []
    if len(unique_voices) > 2:
        findings.append(
            {
                "severity": "low",
                "section": "<pronoun-voices>",
                "issue": (
                    f"Document mixes {len(unique_voices)} voices "
                    f"({', '.join(unique_voices)}): consider unifying"
                ),
                "evidence": f"voices_used={unique_voices}",
            }
        )
    if adjacent_switches >= 3:
        findings.append(
            {
                "severity": "medium",
                "section": "<pronoun-switches>",
                "issue": (
                    f"{adjacent_switches} adjacent pronoun-voice switches "
                    "indicate inconsistent narrator"
                ),
                "evidence": f"sequence={non_none}",
            }
        )

    return {
        "findings": findings,
        "metadata": {
            "voices_used": unique_voices,
            "paragraph_count": len(paragraphs),
            "adjacent_switches": adjacent_switches,
        },
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Pronoun-consistency check")
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

    result = compute(text)
    payload = {
        "check": "pronoun_consistency",
        "target": str(target),
        "findings": result["findings"],
        "metadata": result["metadata"],
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
