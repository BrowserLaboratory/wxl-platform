#!/usr/bin/env python3
"""Typo-injection mutator.

Produces K variant files of the target by applying 1–3 random character
mutations (insert / delete / substitute) per variant. Deterministic given
the same `--seed`. Skips any line that falls inside an `#align(center)[...]`
block (warning emitted to stderr) so that locked title/byline blocks remain
intact.
"""
from __future__ import annotations

import argparse
import json
import random
import string
import sys
from pathlib import Path

MUTATOR_ID = "typo_inject"
DEFAULT_SEED = 0
ALIGN_OPEN = "#align(center)["

# Char palette for insert/substitute. Mix ASCII letters with a small CJK pool so
# that mutations stay readable across mixed-language prose.
_INSERT_POOL = list(string.ascii_letters + string.digits + " ,.；。一二三四五六七八九十的是不在了有")


def _detect_align_lines(lines: list[str]) -> set[int]:
    """Return the set of 1-indexed line numbers that fall inside #align(center)[ ... ] blocks."""
    locked: set[int] = set()
    depth = 0
    inside = False
    for idx, line in enumerate(lines, start=1):
        i = 0
        while i < len(line):
            if not inside:
                pos = line.find(ALIGN_OPEN, i)
                if pos == -1:
                    break
                inside = True
                depth = 1
                i = pos + len(ALIGN_OPEN)
                locked.add(idx)
            else:
                ch = line[i]
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        inside = False
                        i += 1
                        continue
                i += 1
        if inside:
            locked.add(idx)
    return locked


def _mutate_text(text: str, rng: random.Random, locked_lines: set[int]) -> str:
    lines = text.splitlines(keepends=True)
    mutable_indices = [i for i in range(len(lines)) if (i + 1) not in locked_lines and lines[i].strip()]
    if not mutable_indices:
        return text
    n_muts = rng.randint(1, 3)
    for _ in range(n_muts):
        li = rng.choice(mutable_indices)
        line = lines[li]
        # Preserve trailing newline if present.
        nl = ""
        body = line
        if body.endswith("\r\n"):
            nl = "\r\n"
            body = body[:-2]
        elif body.endswith("\n"):
            nl = "\n"
            body = body[:-1]
        if not body:
            continue
        op = rng.choice(("insert", "delete", "substitute"))
        pos = rng.randint(0, len(body) - 1)
        if op == "insert":
            ch = rng.choice(_INSERT_POOL)
            body = body[:pos] + ch + body[pos:]
        elif op == "delete" and len(body) > 1:
            body = body[:pos] + body[pos + 1:]
        else:  # substitute (or fall-back when delete impossible)
            ch = rng.choice(_INSERT_POOL)
            body = body[:pos] + ch + body[pos + 1:]
        lines[li] = body + nl
    return "".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Typo-injection mutator")
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

    lines = text.splitlines(keepends=True)
    locked = _detect_align_lines(lines)
    if locked:
        print(
            f"warning: detected #align(center)[...] block on lines {sorted(locked)}; skipping during mutation",
            file=sys.stderr,
        )

    ext = target.suffix or ".txt"
    variants: list[str] = []
    base_rng = random.Random(args.seed)
    for k in range(1, args.k + 1):
        sub_seed = base_rng.randrange(0, 2**32)
        rng = random.Random(sub_seed)
        mutated = _mutate_text(text, rng, locked)
        # Guarantee the variant differs from the input by re-mutating if necessary.
        guard = 0
        while mutated == text and guard < 8:
            mutated = _mutate_text(text, rng, locked)
            guard += 1
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
