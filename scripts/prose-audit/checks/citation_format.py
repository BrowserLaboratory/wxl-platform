#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/citation_format.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Citation format check (opt-in).

Greps typst-style `cite(<key>)` calls in the target and, when a references
YAML is supplied via --refs, flags any cite key absent from its top-level
keys as a dangling-citation finding (severity High).

Phase C task 3.11 made this check opt-in. It only emits findings when one
of these is true:
  * the project's `.humane-prose-audit.yaml` (walk-up resolved) sets
    ``references.format`` to ``typst`` or ``bibtex``, OR
  * the caller passes ``--refs <path>`` explicitly (back-compat opt-in;
    supplying refs is itself an intent signal).

When neither condition holds, the check returns ``findings: []`` and a
``metadata.note = "opt-out"`` annotation, so the orchestrator can include
it in the audit report without raising findings.

See: wiki/concepts/readability-and-style/editorial-style-frameworks.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent

CITATION_OPT_IN_FORMATS = {"typst", "bibtex"}


def _resolve_config_resolver():
    """Lazy import of scripts._common.config_resolver to avoid mutating the
    module-level sys.path at import time (which leaks into any host process
    that imports this module instead of subprocess-running it)."""
    scripts_dir = SKILL_ROOT / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    from _common.config_resolver import ConfigError, find_project_config  # noqa: E402

    return find_project_config, ConfigError


def load_cfg() -> dict:
    try:
        return yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        print(json.dumps({"error": f"cannot load config: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)


def load_refs_keys(refs_path: Path) -> set[str]:
    data = yaml.safe_load(refs_path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        return set()
    return {str(k) for k in data.keys()}


def find_section(line: str, current: str) -> str:
    section_pat = re.compile(r"^\s*(?:=+|##+|#align\(center\)\[)")
    stripped = line.strip()
    if section_pat.match(stripped):
        return stripped[:80]
    return current


def find_citations(text: str, cite_regex: str, refs_keys: set[str] | None) -> list[dict]:
    findings: list[dict] = []
    try:
        pat = re.compile(cite_regex)
    except re.error as exc:
        print(json.dumps({"error": f"cite_regex invalid: {exc}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)
    malformed_pat = re.compile(r"cite\(\s*\)")
    section = "<file head>"
    for lineno, line in enumerate(text.splitlines(), start=1):
        section = find_section(line, section)
        for m in malformed_pat.finditer(line):
            findings.append(
                {
                    "severity": "High",
                    "section": section,
                    "issue": "Malformed cite() call — empty key",
                    "evidence": f"line {lineno}: {line.strip()[:200]}",
                }
            )
        if refs_keys is None:
            continue
        for m in pat.finditer(line):
            key = m.group(1)
            if key not in refs_keys:
                findings.append(
                    {
                        "severity": "High",
                        "section": section,
                        "issue": f"Dangling citation: `{key}` not present in references",
                        "evidence": f"line {lineno}: {line.strip()[:200]}",
                    }
                )
    return findings


def _project_opt_in(target: Path) -> tuple[bool, str | None]:
    """Resolve project-config opt-in.

    Returns ``(opted_in, error_msg)``. ``error_msg`` is non-None only when
    the project YAML exists but fails to parse — distinct from "no config"
    so the orchestrator can surface a config-error annotation instead of
    silently treating a typo as opt-out.
    """
    find_project_config, ConfigError = _resolve_config_resolver()
    try:
        cfg_path = find_project_config(target.parent if target.is_file() else target)
    except (OSError, ConfigError):
        return False, None
    if cfg_path is None:
        return False, None
    try:
        data = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    except OSError:
        return False, None
    except yaml.YAMLError as exc:
        return False, f"project config at {cfg_path} failed YAML parse: {exc}"
    references = data.get("references") if isinstance(data, dict) else None
    if not isinstance(references, dict):
        return False, None
    return references.get("format") in CITATION_OPT_IN_FORMATS, None


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Citation format check")
    parser.add_argument("target", help="Path to file to scan")
    parser.add_argument("--refs", help="Path to references YAML", default=None)
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 2

    # Opt-in gate: only run when project config opts in OR caller supplies refs.
    if not args.refs:
        opted_in, err_msg = _project_opt_in(target)
        if not opted_in:
            note = err_msg if err_msg else "opt-out"
            print(
                json.dumps(
                    {
                        "check": "citation_format",
                        "target": str(target),
                        "findings": [],
                        "metadata": {"note": note},
                    },
                    ensure_ascii=False,
                )
            )
            return 0

    refs_keys: set[str] | None = None
    if args.refs:
        refs_path = Path(args.refs)
        if not refs_path.exists() or not refs_path.is_file():
            print(json.dumps({"error": f"refs not found: {refs_path}"}, ensure_ascii=False), file=sys.stderr)
            return 2
        try:
            refs_keys = load_refs_keys(refs_path)
        except yaml.YAMLError as exc:
            print(json.dumps({"error": f"cannot parse refs: {exc}"}, ensure_ascii=False), file=sys.stderr)
            return 2

    cfg = load_cfg()
    cite_regex = cfg.get("citation", {}).get("cite_regex", r"cite\(<?([A-Za-z0-9_-]+)>?\)")
    findings = find_citations(text, cite_regex, refs_keys)
    print(
        json.dumps(
            {"check": "citation_format", "target": str(target), "findings": findings},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
