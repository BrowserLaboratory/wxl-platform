"""Modular rule loading for the article validator.

Each tier module (e.g. tier1_format) exports a RULES list.
Each rule entry is a dict with:
  - rule_id: str        (e.g. "T-2")
  - check: callable     (lines: list[str], config: dict) -> list[dict]
  - condition: str|None  (config key that must be truthy to enable this rule)
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

# Tier modules to attempt loading, in order.
_TIER_MODULES = [
    "tier1_format",
    "tier2_heuristic",
    "tier3_llm_hints",
]


def load_rules() -> tuple[list[dict[str, Any]], list[str]]:
    """Load all available rule modules and return (rules, skipped_tiers).

    Returns:
        rules: Combined RULES list from all successfully loaded tier modules.
        skipped_tiers: Names of tier modules that could not be imported.
    """
    rules: list[dict[str, Any]] = []
    skipped: list[str] = []
    package_dir = Path(__file__).resolve().parent

    for module_name in _TIER_MODULES:
        module_path = package_dir / f"{module_name}.py"
        if not module_path.exists():
            skipped.append(module_name)
            continue
        try:
            mod = importlib.import_module(f".{module_name}", package=__package__)
            rules.extend(getattr(mod, "RULES", []))
        except Exception as exc:
            print(
                f"Warning: failed to load tier module '{module_name}': "
                f"{type(exc).__name__}: {exc}",
                file=sys.stderr,
            )
            skipped.append(module_name)

    return rules, skipped
