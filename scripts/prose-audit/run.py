#!/usr/bin/env python3
"""Phase-1 deterministic prose-audit wrapper for CI and local use.

Invokes the 14 vendored deterministic checkers (``checks/<rule>.py``) directly,
one subprocess per checker per file. The orchestrator from the upstream
``humane-prose-audit`` skill is deliberately NOT vendored or invoked — this
wrapper owns the gate policy.

Gate policy is a **rule-allowlist**: the run fails only when a checker in the
blocking set ({mainland_vocab, placeholder_grep, citation_format} by default)
reports one or more findings, regardless of the finding's severity label. The
other eleven (advisory) checkers are recorded but never block.

Exit codes:
  0  no blocking-set findings (or no files to audit)
  1  at least one blocking-set checker reported a finding
  2  internal error (a checker crashed, timed out, returned non-zero, or its
     stdout was not parseable JSON) — distinct from a blocking finding
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHECKS_DIR = HERE / "checks"
CHECK_TIMEOUT_SECONDS = 60

DEFAULT_BLOCK_RULES = ("mainland_vocab", "placeholder_grep", "citation_format")
# Outward-facing surface per the prose-audit-outward-docs capability.
DEFAULT_SURFACE = (
    "README.md",
    "CONTRIBUTE.md",
    "CLAUDE.md",
    "AGENTS.md",
    "docs/agents/guide.md",
    "platform/**/*.md",
)


def all_checks() -> list[str]:
    return sorted(p.stem for p in CHECKS_DIR.glob("*.py") if p.stem != "__init__")


def _glob_to_regex(glob: str) -> re.Pattern[str]:
    """Translate a path glob to a regex. Supports ``**`` (any depth, incl. none),
    ``*`` (within a path segment), and ``?`` (single non-separator char)."""
    out: list[str] = []
    i, n = 0, len(glob)
    while i < n:
        if glob[i : i + 3] == "**/":
            out.append("(?:.*/)?")
            i += 3
        elif glob[i : i + 2] == "**":
            out.append(".*")
            i += 2
        elif glob[i] == "*":
            out.append("[^/]*")
            i += 1
        elif glob[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(glob[i]))
            i += 1
    return re.compile("^" + "".join(out) + "$")


def in_surface(path: str, surface_globs: list[str]) -> bool:
    candidate = path.lstrip("./")
    return any(_glob_to_regex(g).match(candidate) for g in surface_globs)


def _slug(path: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "__", path.strip("/")) or "_root"


def run_checker(rule: str, target: str) -> tuple[int, str, str]:
    proc = subprocess.run(
        [sys.executable, str(CHECKS_DIR / f"{rule}.py"), target],
        capture_output=True,
        text=True,
        timeout=CHECK_TIMEOUT_SECONDS,
    )
    return proc.returncode, proc.stdout, proc.stderr


def audit_file(target: str, checks: list[str], block_rules: set[str]) -> dict:
    """Run every checker against one file. Returns a per-file result dict."""
    findings: list[dict] = []
    errors: list[dict] = []
    by_rule: dict[str, int] = {}
    blocking_count = 0
    advisory_count = 0

    if not Path(target).is_file():
        errors.append({"rule": "<input>", "reason": f"file not found: {target}"})

    for rule in checks:
        if errors and errors[0]["rule"] == "<input>":
            break  # no point running checkers on a missing file
        try:
            rc, out, err = run_checker(rule, target)
        except subprocess.TimeoutExpired:
            errors.append({"rule": rule, "reason": "timeout"})
            continue
        if rc != 0:
            errors.append({"rule": rule, "reason": f"exit {rc}", "stderr": (err or "")[:300]})
            continue
        try:
            payload = json.loads(out) if out.strip() else {"findings": []}
        except json.JSONDecodeError as exc:
            errors.append({"rule": rule, "reason": f"invalid JSON: {exc}"})
            continue
        rule_findings = payload.get("findings", []) or []
        is_blocking = rule in block_rules
        for f in rule_findings:
            findings.append({"rule": rule, "blocking": is_blocking, **f})
        if rule_findings:
            by_rule[rule] = len(rule_findings)
            if is_blocking:
                blocking_count += len(rule_findings)
            else:
                advisory_count += len(rule_findings)

    return {
        "path": target,
        "blocking_findings": blocking_count,
        "advisory_findings": advisory_count,
        "by_rule": by_rule,
        "findings": findings,
        "errors": errors,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Phase-1 deterministic prose audit (rule-allowlist gate).",
    )
    parser.add_argument("files", nargs="*", help="Markdown files to audit (repo-relative).")
    parser.add_argument(
        "--out",
        default="audit-runs/prose-phase1-ci/",
        help="Directory for per-file findings.json (default: audit-runs/prose-phase1-ci/).",
    )
    parser.add_argument(
        "--json-summary",
        default=None,
        help="Path to write the merged summary JSON.",
    )
    parser.add_argument(
        "--surface",
        action="append",
        default=None,
        help="Glob(s) for the outward-facing surface; repeatable. "
        "Default: the prose-audit-outward-docs surface.",
    )
    parser.add_argument(
        "--block-rules",
        default=",".join(DEFAULT_BLOCK_RULES),
        help="Comma-separated rules that block on any finding "
        f"(default: {','.join(DEFAULT_BLOCK_RULES)}).",
    )
    args = parser.parse_args(argv)

    surface = args.surface if args.surface else list(DEFAULT_SURFACE)
    block_rules = {r.strip() for r in args.block_rules.split(",") if r.strip()}
    checks = all_checks()

    selected = [f for f in args.files if in_surface(f, surface)]
    if not selected:
        print("No markdown files to audit; skipping.", file=sys.stderr)
        if args.json_summary:
            _write_json(Path(args.json_summary), {"files": [], "overall_exit": 0})
        return 0

    out_dir = Path(args.out)
    file_summaries: list[dict] = []
    any_blocking = False
    any_error = False

    for target in selected:
        result = audit_file(target, checks, block_rules)
        if result["errors"]:
            any_error = True
        if result["blocking_findings"] > 0:
            any_blocking = True
        _write_json(out_dir / _slug(target) / "findings.json", result)
        file_summaries.append(
            {
                "path": result["path"],
                "blocking_findings": result["blocking_findings"],
                "advisory_findings": result["advisory_findings"],
                "by_rule": result["by_rule"],
                "errors": [e["rule"] for e in result["errors"]],
            }
        )

    overall_exit = 2 if any_error else (1 if any_blocking else 0)

    if args.json_summary:
        _write_json(Path(args.json_summary), {"files": file_summaries, "overall_exit": overall_exit})

    _print_human_summary(file_summaries, overall_exit)
    return overall_exit


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _print_human_summary(file_summaries: list[dict], overall_exit: int) -> None:
    print(f"{len(file_summaries)} files scanned")
    for fs in file_summaries:
        flag = "BLOCK" if fs["blocking_findings"] else ("ERROR" if fs["errors"] else "ok")
        print(
            f"  [{flag}] {fs['path']}: "
            f"{fs['blocking_findings']} blocking, {fs['advisory_findings']} advisory"
            + (f", errored: {','.join(fs['errors'])}" if fs["errors"] else "")
        )
    verdict = {0: "PASS", 1: "BLOCKED (blocking-rule findings)", 2: "ERROR (checker failure)"}[overall_exit]
    print(f"verdict: {verdict} (exit {overall_exit})")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
