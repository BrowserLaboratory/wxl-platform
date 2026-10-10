#!/usr/bin/env python3
"""Citation-strip mutator.

Finds typst-style citation calls of the form ``cite(<key>)`` or ``cite(<<key>>)``
and removes a small random subset (``min(2, count // 3 + 1)``) per variant.
If the target contains fewer citations the mutator still emits K variants with
whatever stripping is possible. Deterministic given the same ``--seed``.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
from pathlib import Path

MUTATOR_ID = "citation_strip"
DEFAULT_SEED = 0

CITE_REGEX = re.compile(r"cite\(<?([A-Za-z0-9_-]+)>?\)")


def _strip_citations(text: str, rng: random.Random) -> str:
    matches = list(CITE_REGEX.finditer(text))
    count = len(matches)
    if count == 0:
        return text
    strip_n = min(2, count // 3 + 1)
    strip_n = min(strip_n, count)
    if strip_n <= 0:
        return text
    victims = set(rng.sample(range(count), strip_n))
    out: list[str] = []
    last = 0
    for idx, match in enumerate(matches):
        out.append(text[last:match.start()])
        if idx not in victims:
            out.append(match.group(0))
        last = match.end()
    out.append(text[last:])
    return "".join(out)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Citation-strip mutator")
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
        mutated = _strip_citations(text, rng)
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
