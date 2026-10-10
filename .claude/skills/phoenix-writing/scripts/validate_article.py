#!/usr/bin/env python3
"""Article validator CLI — detects editorial rule violations in markdown files.

Usage:
    python scripts/validate_article.py <file1.md> [file2.md ...]

Outputs a JSON report to stdout.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Resolve script location for cross-directory execution.
_SCRIPT_DIR = Path(__file__).resolve().parent


def _load_config() -> dict:
    """Load configuration from scripts/config.json, falling back to defaults."""
    config_path = _SCRIPT_DIR / "config.json"
    defaults = {
        "vitepress_mode": True,
        "image_format_check": True,
    }
    if config_path.exists():
        try:
            with open(config_path, encoding="utf-8") as f:
                user_config = json.load(f)
            defaults.update(user_config)
        except (json.JSONDecodeError, OSError):
            pass
    return defaults


def _build_report(
    files: list[str],
    violations: list[dict],
    rules_checked: list[str],
    rules_skipped: list[str],
    config: dict,
    density_metrics: dict,
) -> dict:
    """Build the JSON report conforming to the output schema."""
    by_rule: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    for v in violations:
        by_rule[v["rule"]] = by_rule.get(v["rule"], 0) + 1
        by_severity[v["severity"]] = by_severity.get(v["severity"], 0) + 1

    total = len(violations)
    # Only error/warning count toward pass/fail; info-severity hints are advisory.
    actionable = sum(1 for v in violations if v["severity"] in ("error", "warning"))
    return {
        "meta": {
            "targets": files,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "rules_checked": rules_checked,
            "rules_skipped": rules_skipped,
            "config": config,
        },
        "violations": violations,
        "llm_review_hints": [v for v in violations if v.get("requires_llm_review")],
        "stats": {
            "total_violations": total,
            "by_rule": by_rule,
            "by_severity": by_severity,
            "density_metrics": density_metrics,
        },
        "pass": actionable == 0,
    }


def _validate_file(
    filepath: Path,
    rules: list[dict],
    config: dict,
) -> tuple[list[dict], dict]:
    """Run all applicable rules against a single file.

    Returns:
        (violations, density_metrics) — violations list and aggregated metrics dict.
    """
    try:
        lines = filepath.read_text(encoding="utf-8").splitlines()
    except OSError as e:
        return [
            {
                "file": str(filepath),
                "line": 0,
                "line_end": None,
                "rule": "SYSTEM",
                "severity": "error",
                "category": "system",
                "desc": f"Cannot read file: {e}",
                "context": "",
                "fix": "",
                "auto_fixable": False,
                "requires_llm_review": False,
            }
        ], {}

    violations: list[dict] = []
    density_metrics: dict = {}
    for rule in rules:
        condition = rule.get("condition")
        if condition and not config.get(condition, False):
            continue
        found = rule["check"](lines, config)
        for v in found:
            v["file"] = str(filepath)
        violations.extend(found)
        # Collect density metrics if the rule provides a metrics function.
        metrics_fn = rule.get("metrics")
        if metrics_fn is not None:
            density_metrics.update(metrics_fn(lines, config))

    return violations, density_metrics


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate markdown articles against editorial rules.",
    )
    parser.add_argument(
        "files",
        nargs="+",
        help="Markdown file paths to validate",
    )
    args = parser.parse_args(argv)

    config = _load_config()

    # Import rules package relative to script location.
    sys.path.insert(0, str(_SCRIPT_DIR))
    try:
        from rules import load_rules
    finally:
        sys.path.pop(0)

    all_rules, skipped_tiers = load_rules()

    rules_checked = []
    rules_skipped_ids = []
    for r in all_rules:
        condition = r.get("condition")
        if condition and not config.get(condition, False):
            rules_skipped_ids.append(r["rule_id"])
        else:
            rules_checked.append(r["rule_id"])

    # Add skipped tier info.
    for tier in skipped_tiers:
        rules_skipped_ids.append(f"(tier module: {tier})")

    all_violations: list[dict] = []
    all_density_metrics: dict = {}
    resolved_files: list[str] = []
    for file_arg in args.files:
        filepath = Path(file_arg).resolve()
        resolved_files.append(str(filepath))
        applicable_rules = [
            r
            for r in all_rules
            if not r.get("condition") or config.get(r["condition"], False)
        ]
        violations, density_metrics = _validate_file(filepath, applicable_rules, config)
        all_violations.extend(violations)
        all_density_metrics.update(density_metrics)

    report = _build_report(
        resolved_files, all_violations, rules_checked, rules_skipped_ids, config,
        all_density_metrics,
    )
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
