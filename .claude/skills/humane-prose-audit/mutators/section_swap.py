#!/usr/bin/env python3
"""Section-swap mutator.

Splits the target Markdown on top-level section boundaries (``^# `` and
``^## ``) and emits K variants whose top-level sections are randomly
permuted while every section's body (sentences, code fences, etc.) is
preserved verbatim. The preamble — any content before the first H1/H2 —
always stays first.

Deterministic given the same ``--seed``. The seed used (whether supplied
or derived from ``os.urandom``) is printed to stderr at startup so tests
can reproduce a particular run.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
from pathlib import Path

MUTATOR_ID = "section_swap"

# Top-level section heading: a line starting with `# ` or `## ` (one or two `#`
# followed by a space). Deeper headings (H3+) stay inside their parent section.
# A heading inside a fenced code block (``` or ~~~) is NOT a section boundary —
# it is illustrative content. _heading_positions walks lines tracking fence
# state to honor that distinction.
_HEADING_RE = re.compile(r"^#{1,2} ")
_FENCE_RE = re.compile(r"^(?:```|~~~)")


def _heading_positions(text: str) -> list[int]:
    """Return byte offsets of top-level H1/H2 headings, skipping any that
    appear inside fenced code blocks. Honors both ``` and ~~~ fence styles."""
    positions: list[int] = []
    in_fence = False
    offset = 0
    for line in text.splitlines(keepends=True):
        stripped = line.lstrip()
        if _FENCE_RE.match(stripped):
            in_fence = not in_fence
        elif not in_fence and _HEADING_RE.match(line):
            positions.append(offset)
        offset += len(line)
    return positions


def _split_sections(text: str) -> tuple[str, list[str]]:
    """Split ``text`` into (preamble, sections).

    ``preamble`` is everything before the first H1/H2 heading (may be empty).
    ``sections`` is a list of strings, each starting with its heading line and
    continuing up to (but not including) the next H1/H2 heading.
    """
    positions = _heading_positions(text)
    if not positions:
        return text, []
    preamble = text[: positions[0]]
    sections: list[str] = []
    for idx, start in enumerate(positions):
        end = positions[idx + 1] if idx + 1 < len(positions) else len(text)
        sections.append(text[start:end])
    return preamble, sections


def _swap_sections(text: str, rng: random.Random) -> str:
    preamble, sections = _split_sections(text)
    if len(sections) <= 1:
        return text
    indices = list(range(len(sections)))
    rng.shuffle(indices)
    reordered = [sections[i] for i in indices]
    return preamble + "".join(reordered)


def _resolve_seed(arg_seed: int | None) -> int:
    if arg_seed is not None:
        return arg_seed
    return int.from_bytes(os.urandom(8), "big")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Section-swap mutator")
    parser.add_argument("target", help="Path to Markdown file to mutate")
    parser.add_argument("--k", type=int, required=True, help="Number of variants")
    parser.add_argument("--out", required=True, help="Output directory for variants")
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="RNG seed; if omitted, derived from os.urandom and echoed to stderr",
    )
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False), file=sys.stderr)
        return 2
    if args.k <= 0:
        print(json.dumps({"error": f"--k must be positive, got {args.k}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    seed = _resolve_seed(args.seed)
    print(f"section_swap: seed={seed}", file=sys.stderr)

    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    variants: list[str] = []
    base_rng = random.Random(seed)
    for k in range(1, args.k + 1):
        sub_seed = base_rng.randrange(0, 2**32)
        rng = random.Random(sub_seed)
        mutated = _swap_sections(text, rng)
        variant_path = out_dir / f"section_swap_{k}.md"
        variant_path.write_text(mutated, encoding="utf-8")
        variants.append(str(variant_path.resolve()))

    manifest = {
        "mutator": MUTATOR_ID,
        "k": args.k,
        "seed": seed,
        "variants": variants,
    }
    print(json.dumps(manifest, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
