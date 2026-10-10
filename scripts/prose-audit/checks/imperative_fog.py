#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/imperative_fog.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Imperative-fog density check.

Counts vague imperative verbs ("consider", "leverage", "facilitate"...) that
AI prose tends to substitute for concrete actions, but only when they appear
in an imperative-style position: at the start of a sentence (after a leading
boundary, period+space, colon+space, or newline) or following a "we must /
should / need to" / "you should / must / need to" / "us must / need to"
construction.

Output contract (single JSON object on stdout):

    {
      "check": "imperative_fog",
      "target": "<absolute path>",
      "findings": [...],
      "metadata": {
        "density_per_kchar": 7.5,
        "top_verbs": [["leverage", 4], ["consider", 3]]
      }
    }

Severity rubric (lowercase per check-output schema):
    density > 6 / kchar  → medium
    3 < density ≤ 6      → low
    density ≤ 3          → no finding

See: wiki/concepts/ai-tells/imperative-fog.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Vague imperative seed list. Order is preserved only for tie-breaking
# stability in metadata.top_verbs; matching itself is case-insensitive.
VAGUE_IMPERATIVES: tuple[str, ...] = (
    "consider",
    "explore",
    "leverage",
    "facilitate",
    "engage with",
    "navigate",
    "harness",
    "optimize",
    "streamline",
    "embrace",
    "foster",
    "drive",
    "enable",
    "empower",
    "unlock",
    "unleash",
    "ensure",
    "ascertain",
    "address",
    "tackle",
)

# Sort longer phrases first so "engage with" wins over a hypothetical "engage".
_VERB_ALTERNATION = "|".join(
    re.escape(v) for v in sorted(VAGUE_IMPERATIVES, key=len, reverse=True)
)

# Imperative position: start of input, start of line, after ". " or ": ".
_INITIAL_RE = re.compile(
    rf"(?:^|\n|\.\s+|:\s+)({_VERB_ALTERNATION})\b",
    re.IGNORECASE,
)

# "we/you/us" + modal + verb. Counts the verb regardless of position.
_MODAL_RE = re.compile(
    rf"\b(?:we|you|us)\s+(?:should|must|need\s+to)\s+({_VERB_ALTERNATION})\b",
    re.IGNORECASE,
)

# Threshold rubric — kept module-level so tests / agents can introspect.
DENSITY_MEDIUM = 6.0
DENSITY_LOW = 3.0


def _strip_code_and_metadata(text: str) -> str:
    """Drop fenced code blocks (```...```).

    Imperative-fog density should reflect prose, not code samples that happen
    to use words like ``consider`` or ``leverage`` as identifiers.
    """
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


def _canonical_verb(match: str) -> str:
    """Normalize matched verb back to its lowercase seed-list form."""
    lowered = match.lower()
    # Collapse runs of whitespace inside multi-word phrases.
    return re.sub(r"\s+", " ", lowered)


def _count_hits(text: str) -> dict[str, int]:
    counts: dict[str, int] = {v: 0 for v in VAGUE_IMPERATIVES}
    for m in _INITIAL_RE.finditer(text):
        counts[_canonical_verb(m.group(1))] = counts.get(_canonical_verb(m.group(1)), 0) + 1
    for m in _MODAL_RE.finditer(text):
        counts[_canonical_verb(m.group(1))] = counts.get(_canonical_verb(m.group(1)), 0) + 1
    return counts


def compute_payload(text: str, target: Path) -> dict:
    stripped = _strip_code_and_metadata(text)
    total_chars = len(stripped)

    counts = _count_hits(stripped)
    total_hits = sum(counts.values())

    density = 0.0
    if total_chars > 0:
        density = total_hits / (total_chars / 1000.0)

    top_verbs = sorted(
        ((v, n) for v, n in counts.items() if n > 0),
        key=lambda kv: (-kv[1], kv[0]),
    )[:10]

    findings: list[dict] = []
    if density > DENSITY_MEDIUM:
        severity = "medium"
    elif density > DENSITY_LOW:
        severity = "low"
    else:
        severity = None

    if severity is not None:
        evidence_top = ", ".join(f"{v}×{n}" for v, n in top_verbs) or "no verbs"
        findings.append(
            {
                "severity": severity,
                "section": "<imperative-fog>",
                "issue": (
                    f"Vague imperative density {density:.2f}/kchar exceeds "
                    f"threshold ({DENSITY_LOW}/{DENSITY_MEDIUM})"
                ),
                "evidence": f"top verbs: {evidence_top}",
            }
        )

    return {
        "check": "imperative_fog",
        "target": str(target.resolve()),
        "findings": findings,
        "metadata": {
            "density_per_kchar": round(density, 4),
            "top_verbs": [[v, n] for v, n in top_verbs],
        },
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Imperative-fog density check")
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

    payload = compute_payload(text, target)
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
