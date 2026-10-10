#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/lexical_diversity.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Lexical diversity check via MTLD (McCarthy & Jarvis 2010).

Measure of Textual Lexical Diversity walks word-by-word in both directions,
counting how many sliding sub-sequences decay below a TTR threshold (0.72).
Low MTLD = repetitive vocabulary, a common AI tell that LLMs tend to recycle
the same lexical anchors across paragraphs.

Output contract (schema check-output):
    {
        "check": "lexical_diversity",
        "target": "<abs>",
        "findings": [...],
        "metadata": {"mtld": <float>, "word_count": <int>, "type_count": <int>}
    }

See: wiki/concepts/readability-and-style/lexical-diversity-mtld.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent

# MTLD parameters per McCarthy & Jarvis (2010).
TTR_THRESHOLD = 0.72
MIN_WORDS = 50

# Severity thresholds.
LOW_BAND = 60.0       # MTLD >= 60 → no finding
MEDIUM_BAND = 40.0    # MTLD < 40 → medium; 40 <= MTLD < 60 → low

_WORD_RE = re.compile(r"\b[\w']+\b", re.UNICODE)
_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)


def strip_code_fences(text: str) -> str:
    """Remove fenced code blocks so repeated identifiers don't deflate MTLD."""
    return _FENCE_RE.sub("", text)


def tokenize(text: str) -> list[str]:
    """Lower-case + regex word tokenization."""
    return _WORD_RE.findall(text.lower())


def _one_direction(seq: list[str], threshold: float = TTR_THRESHOLD) -> float:
    """Compute MTLD factor count for a single walk direction.

    Returns ``len(seq) / factors`` where ``factors`` is the number of full
    sub-sequences whose TTR decayed to or below the threshold, plus a
    fractional residual for the trailing partial sub-sequence.
    """
    factors = 0.0
    token_count = 0
    type_set: set[str] = set()
    ttr = 1.0
    for w in seq:
        token_count += 1
        type_set.add(w)
        ttr = len(type_set) / token_count
        if ttr <= threshold:
            factors += 1
            token_count = 0
            type_set = set()
            ttr = 1.0
    # Residual partial run.
    if token_count > 0 and ttr < 1.0:
        factors += (1 - ttr) / (1 - threshold)
    if factors <= 0:
        # Either empty seq or perfectly diverse run that never decayed; fall
        # back to seq length as the MTLD estimate (matches the reference
        # behaviour for "lexically perfect" runs).
        return float(len(seq))
    return len(seq) / factors


def mtld(words: list[str], threshold: float = TTR_THRESHOLD) -> float | None:
    """Bidirectional MTLD; returns ``None`` when below the min-word threshold."""
    if len(words) < MIN_WORDS:
        return None
    forward = _one_direction(words, threshold)
    reverse = _one_direction(list(reversed(words)), threshold)
    return (forward + reverse) / 2.0


def compute_findings(text: str) -> tuple[list[dict], dict]:
    stripped = strip_code_fences(text)
    words = tokenize(stripped)
    word_count = len(words)
    type_count = len(set(words))

    if word_count < MIN_WORDS:
        return [], {
            "mtld": None,
            "word_count": word_count,
            "type_count": type_count,
            "note": "below_min_threshold",
        }

    score = mtld(words)
    metadata = {
        "mtld": round(score, 2) if score is not None else None,
        "word_count": word_count,
        "type_count": type_count,
    }

    if score is None:
        return [], metadata

    findings: list[dict] = []
    if score < MEDIUM_BAND:
        findings.append(
            {
                "severity": "medium",
                "section": "<lexical-diversity>",
                "issue": (
                    f"Lexical diversity (MTLD={score:.0f}) below {MEDIUM_BAND:.0f}; "
                    "vocabulary is repetitive"
                ),
                "evidence": f"mtld={score:.2f}, word_count={word_count}, type_count={type_count}",
            }
        )
    elif score < LOW_BAND:
        findings.append(
            {
                "severity": "low",
                "section": "<lexical-diversity>",
                "issue": (
                    f"Lexical diversity (MTLD={score:.0f}) below {LOW_BAND:.0f}; "
                    "consider varying vocabulary"
                ),
                "evidence": f"mtld={score:.2f}, word_count={word_count}, type_count={type_count}",
            }
        )
    return findings, metadata


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Lexical diversity (MTLD) check")
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

    findings, metadata = compute_findings(text)
    print(
        json.dumps(
            {
                "check": "lexical_diversity",
                "target": str(target),
                "findings": findings,
                "metadata": metadata,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
