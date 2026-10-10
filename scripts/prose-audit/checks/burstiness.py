#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/burstiness.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Burstiness check — sentence-length variance as a perplexity proxy.

Low burstiness (coefficient of variation across sentence lengths) reads as
the flat, AI-rhythm cadence we want humans to revise. This deterministic
check tokenizes prose into sentences (stripping fenced code blocks first),
computes the coefficient of variation, and emits a single finding when the
rhythm falls under the configured thresholds.

Algorithm
---------
1.  Strip fenced code blocks (lines between triple-backtick fences).
2.  Split remaining text on ``[.!?。！？]\\s+`` to recover sentences.
3.  Drop sentences with fewer than three tokens of signal.
4.  Length is **words** for English sentences and **chars** for sentences
    that are >50% CJK (locale_detect.ratio_cjk > 0.5).
5.  ``burstiness = stdev(lengths) / mean(lengths)``.

Severity ladder
---------------
- ``< 0.30``         → ``medium``  ("reads as AI-rhythm")
- ``[0.30, 0.45)``   → ``low``     (still flat, less alarming)
- ``≥ 0.45``         → no finding
- ``len(sentences) < 5`` → no findings (insufficient data) + metadata note

See: wiki/concepts/perplexity-and-burstiness/burstiness-definition.md
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

# Allow ``ratio_cjk`` reuse without forcing a package install.
SKILL_ROOT = Path(__file__).resolve().parent.parent
if str(SKILL_ROOT) not in sys.path:
    sys.path.insert(0, str(SKILL_ROOT))

from scripts._common.locale_detect import ratio_cjk  # noqa: E402

# Sentence boundary across English + CJK terminators followed by whitespace.
# Also splits on EOL after a terminator so single-line-per-sentence prose works.
_SENT_SPLIT_RE = re.compile(r"(?<=[.!?。！？])\s+")
_MIN_SENT_TOKENS = 3
_MIN_SENTENCES = 5

_FLAT_THRESHOLD = 0.30
_LOW_THRESHOLD = 0.45


def strip_code_fences(text: str) -> str:
    """Drop lines that sit inside ``` ... ``` fences (and the fence lines)."""
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


def tokenize_sentences(text: str) -> list[str]:
    """Split prose into sentences and drop the trivially short ones."""
    raw = _SENT_SPLIT_RE.split(text)
    sentences: list[str] = []
    for chunk in raw:
        s = chunk.strip()
        if not s:
            continue
        # Use the larger of word-count vs char-count as the "size" gate so
        # both English and CJK short fragments are filtered out consistently.
        word_count = len(s.split())
        char_count = sum(1 for c in s if not c.isspace())
        if max(word_count, char_count) < _MIN_SENT_TOKENS:
            continue
        sentences.append(s)
    return sentences


def sentence_length(sentence: str) -> int:
    """Length in 'tokens' — words for English, chars for CJK-heavy text."""
    if ratio_cjk(sentence) > 0.5:
        # Char count excluding whitespace gives a cleaner CJK token proxy.
        return sum(1 for c in sentence if not c.isspace())
    return len(sentence.split())


def compute_findings(text: str) -> tuple[list[dict], dict]:
    cleaned = strip_code_fences(text)
    sentences = tokenize_sentences(cleaned)

    metadata: dict = {"sentence_count": len(sentences)}

    if len(sentences) < _MIN_SENTENCES:
        metadata["note"] = "below_min_threshold"
        return [], metadata

    lengths = [sentence_length(s) for s in sentences]
    mean_len = statistics.fmean(lengths)
    if mean_len <= 0:
        metadata["note"] = "zero_mean_length"
        return [], metadata

    # ``stdev`` requires ≥2 data points — guaranteed by _MIN_SENTENCES=5.
    stdev_len = statistics.stdev(lengths)
    burstiness = stdev_len / mean_len

    metadata["burstiness"] = round(burstiness, 3)
    metadata["mean_length"] = round(mean_len, 3)

    findings: list[dict] = []
    if burstiness < _FLAT_THRESHOLD:
        findings.append(
            {
                "severity": "medium",
                "section": "<burstiness>",
                "issue": (
                    f"Sentence-length variance is flat "
                    f"(burstiness={burstiness:.2f} < {_FLAT_THRESHOLD:.2f}); "
                    f"reads as AI-rhythm"
                ),
                "evidence": (
                    f"sentence_count={len(sentences)}, "
                    f"mean_length={mean_len:.2f}, "
                    f"stdev={stdev_len:.2f}"
                ),
            }
        )
    elif burstiness < _LOW_THRESHOLD:
        findings.append(
            {
                "severity": "low",
                "section": "<burstiness>",
                "issue": (
                    f"Sentence-length variance is moderately flat "
                    f"(burstiness={burstiness:.2f} < {_LOW_THRESHOLD:.2f}); "
                    f"rhythm could use more contrast"
                ),
                "evidence": (
                    f"sentence_count={len(sentences)}, "
                    f"mean_length={mean_len:.2f}, "
                    f"stdev={stdev_len:.2f}"
                ),
            }
        )
    return findings, metadata


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Burstiness check (sentence-length variance)")
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

    payload = {
        "check": "burstiness",
        "target": str(target.resolve()),
        "findings": findings,
        "metadata": metadata,
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
