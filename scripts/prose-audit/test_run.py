#!/usr/bin/env python3
"""Behavior tests for run.py (the Phase-1 deterministic prose-audit wrapper).

Standalone — run with `python scripts/prose-audit/test_run.py` (no pytest needed).
Exits 0 if every assertion holds, 1 otherwise. Encodes the rule-allowlist gate
contract: blocking-set findings -> exit 1, advisory-only/empty -> exit 0, checker
failure -> exit 2, and surface filtering.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUN = HERE / "run.py"

CLEAN = (
    "# Guide\n\n"
    "This document explains the build pipeline in plain language. "
    "Each contributor runs the checks locally before opening a request, "
    "and the maintainers review the result with care.\n"
)
MAINLAND = CLEAN + "\n這裡用了中國大陸用語「視頻」應該被擋下。\n"
PLACEHOLDER = CLEAN + "\nThis paragraph is still TODO and must be finished.\n"

results: list[tuple[bool, str]] = []


def check(cond: bool, label: str) -> None:
    results.append((bool(cond), label))
    print(f"  {'PASS' if cond else 'FAIL'}  {label}")


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(RUN), *args],
        capture_output=True,
        text=True,
    )


def write(d: Path, name: str, body: str) -> str:
    p = d / name
    p.write_text(body, encoding="utf-8")
    return str(p)


def main() -> int:
    with tempfile.TemporaryDirectory() as td:
        d = Path(td)
        out = d / "out"
        clean = write(d, "clean.md", CLEAN)
        mainland = write(d, "mainland.md", MAINLAND)
        placeholder = write(d, "placeholder.md", PLACEHOLDER)

        # Gate tests use --surface '**' so surface filtering never masks the gate.
        any_surface = ["--surface", "**"]

        r = run([clean, *any_surface, "--out", str(out / "clean")])
        check(r.returncode == 0, f"clean file -> exit 0 (got {r.returncode}; stderr={r.stderr[:120]})")

        r = run([mainland, *any_surface, "--out", str(out / "mainland")])
        check(r.returncode == 1, f"mainland_vocab finding -> exit 1 (got {r.returncode})")

        r = run([placeholder, *any_surface, "--out", str(out / "placeholder")])
        check(r.returncode == 1, f"placeholder finding -> exit 1 (got {r.returncode})")

        # Internal error: a checker invoked on a nonexistent file exits non-zero.
        missing = str(d / "does-not-exist.md")
        r = run([missing, *any_surface, "--out", str(out / "missing")])
        check(r.returncode == 2, f"checker failure (missing input) -> exit 2 (got {r.returncode})")

        # Empty input -> exit 0 + skip message.
        r = run(["--out", str(out / "empty")])
        check(r.returncode == 0, f"no files -> exit 0 (got {r.returncode})")
        check("skip" in (r.stderr + r.stdout).lower(), "no files -> skip message emitted")

        # Surface filtering: a non-surface .md with a blocking term is skipped -> exit 0.
        nonsurface = write(d, "internal.md", MAINLAND)
        r = run([nonsurface, "--surface", "platform/**/*.md", "--out", str(out / "ns")])
        check(r.returncode == 0, f"non-surface file skipped despite 視頻 -> exit 0 (got {r.returncode})")

        # Summary JSON shape + per-file findings.json.
        summ = out / "summary.json"
        r = run([mainland, clean, *any_surface, "--out", str(out / "multi"),
                 "--json-summary", str(summ)])
        check(r.returncode == 1, f"batch with one blocking file -> exit 1 (got {r.returncode})")
        if summ.exists():
            data = json.loads(summ.read_text(encoding="utf-8"))
            check(data.get("overall_exit") == 1, "summary.overall_exit == 1")
            check(len(data.get("files", [])) == 2, f"summary lists 2 files (got {len(data.get('files', []))})")
            ff = out / "multi"
            check(any((p / "findings.json").exists() for p in ff.iterdir() if p.is_dir()),
                  "per-file findings.json written under --out")
        else:
            check(False, "summary.json written")

    passed = sum(1 for ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
