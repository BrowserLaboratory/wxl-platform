#!/usr/bin/env python3
"""Sentence-reorder mutator.

Splits the target into paragraphs (double-newline boundary), then splits each
paragraph into sentences using a CJK-aware terminator regex. Within each
paragraph the sentences are shuffled with a seeded RNG. Paragraphs themselves
remain in document order. Produces K deterministic variants.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
from pathlib import Path

MUTATOR_ID = "sentence_reorder"
DEFAULT_SEED = 0

# CJK + ASCII sentence terminators. The capture group keeps the punctuation
# attached to the preceding clause so that reordering does not lose terminators.
_TERMINATOR = re.compile(r"([。！？!?]+)")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")


def _split_sentences(paragraph: str) -> list[str]:
    if not paragraph:
        return []
    chunks = _TERMINATOR.split(paragraph)
    sentences: list[str] = []
    buf = ""
    for chunk in chunks:
        if _TERMINATOR.fullmatch(chunk):
            buf += chunk
            sentences.append(buf)
            buf = ""
        else:
            buf += chunk
    if buf.strip():
        sentences.append(buf)
    return [s for s in sentences if s.strip()]


def _shuffle_paragraph(paragraph: str, rng: random.Random) -> str:
    sentences = _split_sentences(paragraph)
    if len(sentences) <= 1:
        return paragraph
    indices = list(range(len(sentences)))
    rng.shuffle(indices)
    # Preserve leading whitespace on individual sentences but join without extra glue.
    reordered = [sentences[i].strip() for i in indices]
    return " ".join(reordered)


def _mutate_text(text: str, rng: random.Random) -> str:
    # Preserve exact paragraph separators by walking explicit splits.
    parts: list[str] = []
    last = 0
    for match in _PARAGRAPH_SPLIT.finditer(text):
        parts.append(text[last:match.start()])
        parts.append(match.group(0))
        last = match.end()
    parts.append(text[last:])
    out: list[str] = []
    for chunk in parts:
        if _PARAGRAPH_SPLIT.fullmatch(chunk):
            out.append(chunk)
        else:
            out.append(_shuffle_paragraph(chunk, rng))
    return "".join(out)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Sentence-reorder mutator")
    parser.add_argument("target", help="Path to file to mutate")
    parser.add_argument("--k", type=int, required=True, help="Number of variants")
    parser.add_argument("--out", required=True, help="Output directory for variants")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="RNG seed")
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False), file=sys.stderr)
        return 2
    if args.k <= 0:
        print(json.dumps({"error": f"--k must be positive, got {args.k}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    ext = target.suffix or ".txt"
    variants: list[str] = []
    base_rng = random.Random(args.seed)
    for k in range(1, args.k + 1):
        sub_seed = base_rng.randrange(0, 2**32)
        rng = random.Random(sub_seed)
        mutated = _mutate_text(text, rng)
        variant_path = out_dir / f"variant_{k:03d}{ext}"
        variant_path.write_text(mutated, encoding="utf-8")
        variants.append(str(variant_path.resolve()))

    manifest = {
        "mutator": MUTATOR_ID,
        "k": args.k,
        "seed": args.seed,
        "variants": variants,
    }
    print(json.dumps(manifest, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
