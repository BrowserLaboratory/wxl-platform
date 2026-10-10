#!/usr/bin/env python3
"""Fuzz analysis orchestrator.

Invokes the three file-level mutators on a target, runs every available
pre-flight check against each variant, then classifies (mutator, check)
pairs as robust or fragile based on the maximum observed finding-count
change ratio compared to the baseline scan on the unmutated target.

Thresholds come from ``config.yaml`` (``fuzz.robust_threshold_pct`` and
``fuzz.fragile_threshold_pct``). Missing check scripts are silently
skipped — the matrix shrinks but the run still succeeds.
"""
from __future__ import annotations

import argparse
import json
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent
CHECKS_DIR = SKILL_ROOT / "checks"
MUTATORS_DIR = SKILL_ROOT / "mutators"

# Mutators always live next to this script. Phase D task 4.6 added
# section_swap (top-level H1/H2 reordering, intra-section content
# preserved) as a coherence-robustness signal.
MUTATORS = ("typo_inject", "sentence_reorder", "citation_strip", "section_swap")

# Checks the orchestrator knows about. citation_format only meaningful when
# refs are available; the rest run unconditionally if their script exists.
CHECK_SCRIPTS = (
    "mainland_vocab",
    "placeholder_grep",
    "duplicate_sentences",
    "citation_format",
    "readability_metrics",
    "lazy_writer_check",
)


def _load_cfg() -> dict:
    try:
        return yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)


def _run_check(check_id: str, target: Path, refs: Path | None = None) -> int | None:
    """Invoke a check script via subprocess; return finding count or None if unavailable."""
    script = CHECKS_DIR / f"{check_id}.py"
    if not script.exists():
        return None
    cmd = [sys.executable, str(script), str(target)]
    if refs is not None and check_id == "citation_format":
        cmd.extend(["--refs", str(refs)])
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except (subprocess.TimeoutExpired, OSError):
        return None
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None
    findings = payload.get("findings", [])
    return len(findings) if isinstance(findings, list) else 0


def _run_mutator(mutator_id: str, target: Path, k: int, out_dir: Path, seed: int) -> list[Path]:
    script = MUTATORS_DIR / f"{mutator_id}.py"
    cmd = [
        sys.executable,
        str(script),
        str(target),
        "--k",
        str(k),
        "--out",
        str(out_dir),
        "--seed",
        str(seed),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"mutator {mutator_id} failed: {proc.stderr.strip()}")
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        snippet = proc.stdout[:200].replace("\n", " ")
        raise RuntimeError(
            f"mutator {mutator_id} produced invalid JSON: {exc}; stdout[:200]={snippet!r}"
        ) from exc
    return [Path(p) for p in payload.get("variants", [])]


def _change_ratio(baseline: int, observed: int) -> float:
    if baseline == 0:
        return 0.0 if observed == 0 else 1.0
    return abs(observed - baseline) / baseline


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fuzz analysis orchestrator")
    parser.add_argument("target", help="Path to file to fuzz")
    parser.add_argument("--k", type=int, default=None, help="Variants per mutator (defaults to config fuzz.k)")
    parser.add_argument("--seed", type=int, default=0, help="RNG seed for mutator invocations")
    parser.add_argument("--refs", default=None, help="Optional references YAML for citation_format check")
    parser.add_argument(
        "--timeout",
        type=float,
        default=600.0,
        help="Wall-clock timeout in seconds for the whole fuzz run (default 600)",
    )
    args = parser.parse_args(argv)
    start_time = time.time()

    def _check_timeout() -> None:
        if time.time() - start_time > args.timeout:
            print(
                json.dumps(
                    {"error": f"fuzz run exceeded timeout of {args.timeout}s"},
                    ensure_ascii=False,
                ),
                file=sys.stderr,
            )
            sys.exit(2)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    cfg = _load_cfg()
    fuzz_cfg = cfg.get("fuzz", {})
    k = int(args.k if args.k is not None else fuzz_cfg.get("k", 5))
    if k <= 0:
        print(
            json.dumps({"error": f"fuzz.k must be > 0, got {k}"}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 2
    robust_pct = float(fuzz_cfg.get("robust_threshold_pct", 5))
    fragile_pct = float(fuzz_cfg.get("fragile_threshold_pct", 30))

    refs_path: Path | None = None
    if args.refs:
        refs_candidate = Path(args.refs)
        if refs_candidate.exists():
            refs_path = refs_candidate

    # Baseline scan on the untouched target.
    baseline: dict[str, int | None] = {}
    for check_id in CHECK_SCRIPTS:
        _check_timeout()
        baseline[check_id] = _run_check(check_id, target, refs=refs_path)

    details: dict[str, dict] = {}
    robust_metrics: list[str] = []
    fragile_metrics: list[str] = []

    with tempfile.TemporaryDirectory(prefix="prose-audit-fuzz-") as tmpdir:
        tmp_root = Path(tmpdir)
        for mutator_id in MUTATORS:
            _check_timeout()
            mutator_out = tmp_root / mutator_id
            mutator_out.mkdir(parents=True, exist_ok=True)
            try:
                variants = _run_mutator(mutator_id, target, k, mutator_out, args.seed)
            except (RuntimeError, json.JSONDecodeError) as exc:
                details[mutator_id] = {"error": str(exc)}
                continue
            for check_id in CHECK_SCRIPTS:
                baseline_count = baseline.get(check_id)
                if baseline_count is None:
                    continue
                observed: list[int] = []
                for variant in variants:
                    _check_timeout()
                    count = _run_check(check_id, variant, refs=refs_path)
                    if count is None:
                        continue
                    observed.append(count)
                if not observed:
                    continue
                mean = statistics.fmean(observed)
                variance = statistics.pvariance(observed) if len(observed) > 1 else 0.0
                max_ratio = max(_change_ratio(baseline_count, c) for c in observed)
                key = f"{check_id}:{mutator_id}"
                details[key] = {
                    "baseline": baseline_count,
                    "mean": mean,
                    "variance": variance,
                    "max_change_ratio": max_ratio,
                    "observations": observed,
                }
                pct = max_ratio * 100.0
                if pct < robust_pct:
                    robust_metrics.append(key)
                elif pct > fragile_pct:
                    fragile_metrics.append(key)

    out = {
        "target": str(target),
        "k": k,
        "seed": args.seed,
        "robust_metrics": sorted(robust_metrics),
        "fragile_metrics": sorted(fragile_metrics),
        "details": details,
    }
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
