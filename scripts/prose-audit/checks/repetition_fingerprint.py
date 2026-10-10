#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/repetition_fingerprint.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Repetition fingerprint check.

Detects repeated n-gram patterns ("boilerplate stamps" — a common AI tell)
using a rolling hash over word tokens. Fenced code blocks are stripped first
so example snippets do not contribute. Tokens are lowercased so the same
phrase in mixed case still collides.

Algorithm:
  1. Strip fenced code blocks; lowercase; tokenize into words (regex
     ``\\b[\\w']+\\b``).
  2. Slide an n=5 window across the token list. Compute a stable hash
     (``hash(tuple(window))``) for each 5-gram.
  3. Count occurrences per hash. Anything appearing ≥ 3 times is a
     candidate fingerprint.
  4. De-duplicate near-misses: if a candidate's first occurrence sits at
     index i+1 and the previous-token candidate's first occurrence sits at
     i (i.e. a shifted sub-window of a longer repeated phrase), drop the
     shifted one. Only report distinct phrases.
  5. Below 50 tokens: no findings, ``metadata.note = "below_min_threshold"``.

Severity:
  ≥ 3 distinct fingerprints reused ≥ 3 times each → medium
  1–2 such fingerprints                           → low
  0                                               → no finding

See: wiki/concepts/coherence/halliday-hasan-cohesion.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

NGRAM_N = 5
MIN_REPEAT = 3
MIN_TOKENS = 50

_WORD_RE = re.compile(r"\b[\w']+\b", re.UNICODE)


def _strip_code_fences(text: str) -> str:
    """Drop fenced code blocks (```...```) entirely.

    Same convention as hedge_density / lazy_writer: example code shouldn't
    influence prose repetition signals.
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
        out.append(line)
    return "\n".join(out)


def _tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def _collect_ngrams(tokens: list[str], n: int) -> dict[int, dict]:
    """Walk a sliding window and group occurrence indices by 5-gram hash.

    Returns: hash -> {"tuple": (...), "indices": [i, ...]}.
    """
    buckets: dict[int, dict] = {}
    if len(tokens) < n:
        return buckets
    for i in range(len(tokens) - n + 1):
        window = tuple(tokens[i : i + n])
        h = hash(window)
        bucket = buckets.get(h)
        if bucket is None:
            buckets[h] = {"tuple": window, "indices": [i]}
        else:
            bucket["indices"].append(i)
    return buckets


def _filter_subwindows(repeats: list[dict]) -> list[dict]:
    """Drop 5-grams whose first index is one greater than another repeat's
    first index — i.e. shifted sub-windows of the same longer phrase.

    Heuristic per spec: "when a 5-gram appears at indices i and i+1, skip
    the i+1". We compare first-occurrence indices across the set of
    qualifying repeats.
    """
    first_indices = {r["indices"][0] for r in repeats}
    kept: list[dict] = []
    for r in repeats:
        first = r["indices"][0]
        if (first - 1) in first_indices:
            continue
        kept.append(r)
    return kept


def compute(text: str) -> tuple[list[dict], dict]:
    stripped = _strip_code_fences(text)
    tokens = _tokenize(stripped)
    word_count = len(tokens)

    metadata: dict = {
        "word_count": word_count,
        "ngram_n": NGRAM_N,
        "top_repetitions": [],
    }

    if word_count < MIN_TOKENS:
        metadata["note"] = "below_min_threshold"
        return [], metadata

    buckets = _collect_ngrams(tokens, NGRAM_N)
    repeats = [b for b in buckets.values() if len(b["indices"]) >= MIN_REPEAT]
    repeats = _filter_subwindows(repeats)

    # Sort by count desc, then by first index asc for stable output.
    repeats.sort(key=lambda b: (-len(b["indices"]), b["indices"][0]))

    top_repetitions = [[" ".join(r["tuple"]), len(r["indices"])] for r in repeats]
    metadata["top_repetitions"] = top_repetitions

    findings: list[dict] = []
    distinct = len(repeats)
    if distinct >= 3:
        top3 = ", ".join(f'"{p}"×{n}' for p, n in top_repetitions[:3])
        findings.append(
            {
                "severity": "medium",
                "section": "<repetition-fingerprint>",
                "issue": (
                    f"Repetition fingerprint: {distinct} distinct 5-grams "
                    f"reused ≥3 times each"
                ),
                "evidence": f"top: {top3}",
            }
        )
    elif distinct >= 1:
        top_str = ", ".join(f'"{p}"×{n}' for p, n in top_repetitions[:distinct])
        findings.append(
            {
                "severity": "low",
                "section": "<repetition-fingerprint>",
                "issue": (
                    f"Repetition fingerprint: {distinct} distinct 5-gram "
                    f"reused ≥3 times"
                ),
                "evidence": f"top: {top_str}",
            }
        )

    return findings, metadata


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Repetition fingerprint check")
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
                "check": "repetition_fingerprint",
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
