#!/usr/bin/env python3
"""Thin orchestrator around the cite-probe + wiki-* skill ecosystem.

This script wires the ``humane-prose-audit`` knowledge-base lifecycle onto
the standard skill bundle (``cite-probe``, ``wiki-init``, ``wiki-ingest``,
``wiki-validator``). It deliberately stays a *thin* wrapper: each sub-command
maps to one external skill invocation and only inspects exit codes — never
parsing the called skill's stdout shape. Phase F/G of the
``humane-prose-audit-refactor`` will plug in the real subprocess calls; this
commit ships the dry-run + idempotency scaffolding plus Gate 0.

Gate 0
======
Before any sub-command other than ``bootstrap`` runs, the orchestrator
verifies that ``.cite-probe.env`` exists at the project root (the ancestor of
the skill directory). When the file is absent the orchestrator halts with a
non-zero exit and an actionable error pointing at the path that needs to
exist. This mirrors the cite-probe skill's own Gate 0 contract.

Idempotency
===========
- ``bootstrap``: short-circuits when ``wiki/.wiki-init.manifest.yaml`` already
  exists (status ``noop``).
- ``fetch``: arXiv IDs that already have a directory in
  ``wiki/raw/papers/<id>`` are reported as ``skipped_count`` rather than
  re-downloaded.
- ``verify`` / ``ingest`` / ``validate``: the underlying skills are expected
  to be re-runnable; this wrapper does not enforce additional state.

Environment overrides (test sandboxing)
=======================================
- ``HUMANE_WIKI_PROJECT_ROOT_OVERRIDE``: override the project root used for
  Gate 0 and ``.cite-probe.env`` discovery.
- ``HUMANE_WIKI_DIR_OVERRIDE``: override the wiki target directory.

These two escape hatches let tests sandbox the orchestrator without copying
the entire skill tree into ``tmp_path``.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any


SKILL_ROOT = Path(__file__).resolve().parent.parent


def _project_root() -> Path:
    """Return the project root (ancestor of skill).

    Honors ``HUMANE_WIKI_PROJECT_ROOT_OVERRIDE`` for test sandboxing.
    """
    override = os.environ.get("HUMANE_WIKI_PROJECT_ROOT_OVERRIDE")
    if override:
        return Path(override)
    return SKILL_ROOT.parent


def _wiki_dir() -> Path:
    """Return the wiki target directory (``<skill>/wiki``).

    Honors ``HUMANE_WIKI_DIR_OVERRIDE`` for test sandboxing.
    """
    override = os.environ.get("HUMANE_WIKI_DIR_OVERRIDE")
    if override:
        return Path(override)
    return SKILL_ROOT / "wiki"


# Module-level paths kept as documented API. They are functions-of-env vars
# *re-evaluated on import*; tests that need to override them should set the
# env vars BEFORE importing this module (see test_wiki_orchestrator.py).
WIKI_DIR = _wiki_dir()
PROJECT_ROOT = _project_root()
CITE_PROBE_ENV = PROJECT_ROOT / ".cite-probe.env"


# ---------------------------------------------------------------------------
# Gate 0
# ---------------------------------------------------------------------------


def gate_0() -> tuple[bool, str | None]:
    """Verify that ``.cite-probe.env`` exists at the project root.

    Returns ``(True, None)`` when present, otherwise ``(False, <error>)``.
    The error message names the expected absolute path and points the user
    at the cite-probe skill's bootstrap instructions.
    """
    env_path = _project_root() / ".cite-probe.env"
    if env_path.is_file():
        return True, None
    msg = (
        f"Gate 0 failed: .cite-probe.env not found at {env_path}.\n"
        "The cite-probe skill requires this file at the project root to "
        "operate (Semantic Scholar API key + FJU campus proxy credentials).\n"
        "Create it with the keys documented in the cite-probe skill's "
        "SKILL.md, then retry."
    )
    return False, msg


# ---------------------------------------------------------------------------
# Sub-command implementations
# ---------------------------------------------------------------------------


def cmd_bootstrap(dry_run: bool = False) -> dict[str, Any]:
    """Invoke ``wiki-init`` against the wiki dir (research profile).

    Idempotent: if ``<wiki>/.wiki-init.manifest.yaml`` already exists, the
    function returns ``{'status': 'noop', 'note': 'already initialized'}``
    without invoking ``wiki-init``.

    Bootstrap does NOT require Gate 0 — initializing the wiki skeleton is a
    purely local filesystem operation that does not contact cite-probe.
    """
    wiki = _wiki_dir()
    manifest = wiki / ".wiki-init.manifest.yaml"
    if manifest.is_file():
        return {
            "status": "noop",
            "note": "already initialized",
            "manifest": str(manifest),
        }

    planned_cmd = [
        "wiki-init",
        "--profile",
        "research",
        "--target",
        str(wiki),
    ]
    if dry_run:
        return {
            "status": "planned",
            "command": planned_cmd,
            "target": str(wiki),
            "note": "dry-run: wiki-init not invoked",
        }

    # TODO(Phase F): wire real subprocess call to ``wiki-init``. For now this
    # branch is unreachable in tests because tests always pass ``dry_run``.
    raise NotImplementedError(
        "Phase F will wire the real wiki-init subprocess call. "
        "Use --dry-run for now."
    )


def cmd_fetch(topic: str, dry_run: bool = False) -> dict[str, Any]:
    """Invoke ``cite-probe`` to fetch papers for ``topic`` into the wiki.

    Idempotent: existing ``wiki/raw/papers/<arxiv_id>/`` directories are
    counted as ``skipped_count`` and not re-fetched.

    Gate 0 is enforced before the planned command is reported, so a missing
    ``.cite-probe.env`` causes the function to raise before any subprocess
    work would happen.
    """
    ok, err = gate_0()
    if not ok:
        raise RuntimeError(err)

    wiki = _wiki_dir()
    papers_dir = wiki / "raw" / "papers"
    papers_dir.mkdir(parents=True, exist_ok=True)

    # Idempotency tally — how many arXiv IDs are already present.
    existing = [p for p in papers_dir.iterdir() if p.is_dir()] if papers_dir.is_dir() else []
    skipped = len(existing)

    planned_cmd = [
        "cite-probe",
        "lit-fetcher",
        "fetch",
        "--topic",
        topic,
        "--out",
        str(papers_dir),
    ]
    if dry_run:
        return {
            "status": "planned",
            "topic": topic,
            "command": planned_cmd,
            "fetched_count": 0,
            "skipped_count": skipped,
            "note": "dry-run: cite-probe not invoked",
        }

    # TODO(Phase F): wire real subprocess call to ``cite-probe``.
    raise NotImplementedError(
        "Phase F will wire the real cite-probe subprocess call. "
        "Use --dry-run for now."
    )


def cmd_verify(dry_run: bool = False) -> dict[str, Any]:
    """Invoke ``cite-probe lit-fetcher verify`` against the wiki papers.

    Verifies each downloaded paper against the ``venues.yaml`` whitelist.
    Gate 0 is enforced.
    """
    ok, err = gate_0()
    if not ok:
        raise RuntimeError(err)

    wiki = _wiki_dir()
    papers_dir = wiki / "raw" / "papers"
    venues_file = wiki / "venues.yaml"

    planned_cmd = [
        "cite-probe",
        "lit-fetcher",
        "verify",
        "--references-dir",
        str(papers_dir),
        "--venues-file",
        str(venues_file),
    ]
    if dry_run:
        return {
            "status": "planned",
            "command": planned_cmd,
            "references_dir": str(papers_dir),
            "venues_file": str(venues_file),
            "violations": [],
            "note": "dry-run: cite-probe not invoked",
        }

    # TODO(Phase F): wire real subprocess call to ``cite-probe verify``.
    raise NotImplementedError(
        "Phase F will wire the real cite-probe verify subprocess call. "
        "Use --dry-run for now."
    )


def cmd_ingest(dry_run: bool = False) -> dict[str, Any]:
    """Invoke ``wiki-ingest`` to fold raw papers into the wiki concepts tree.

    Gate 0 is enforced because the ingest pipeline may pull additional
    metadata via cite-probe before publishing to ``wiki/concepts/``.
    """
    ok, err = gate_0()
    if not ok:
        raise RuntimeError(err)

    wiki = _wiki_dir()
    planned_cmd = [
        "wiki-ingest",
        "--target",
        str(wiki),
        "--source",
        str(wiki / "raw" / "papers"),
    ]
    if dry_run:
        return {
            "status": "planned",
            "command": planned_cmd,
            "target": str(wiki),
            "ingested_count": 0,
            "note": "dry-run: wiki-ingest not invoked",
        }

    # TODO(Phase F): wire real subprocess call to ``wiki-ingest``.
    raise NotImplementedError(
        "Phase F will wire the real wiki-ingest subprocess call. "
        "Use --dry-run for now."
    )


def cmd_validate(dry_run: bool = False) -> dict[str, Any]:
    """Invoke ``wiki-validator`` (or local ``scripts/wiki_integrity.py``) on the wiki.

    No Gate 0: the validator is a pure-local integrity check.
    """
    wiki = _wiki_dir()
    local_integrity = SKILL_ROOT / "scripts" / "wiki_integrity.py"
    if local_integrity.is_file():
        planned_cmd = [sys.executable, str(local_integrity), "--wiki", str(wiki)]
    else:
        planned_cmd = ["wiki-validator", "--target", str(wiki)]

    if dry_run:
        return {
            "status": "planned",
            "command": planned_cmd,
            "target": str(wiki),
            "errors": [],
            "note": "dry-run: validator not invoked",
        }

    # TODO(Phase F): wire real subprocess call to wiki-validator / wiki_integrity.
    raise NotImplementedError(
        "Phase F will wire the real wiki-validator subprocess call. "
        "Use --dry-run for now."
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="wiki_orchestrator.py",
        description=(
            "Thin orchestrator around cite-probe + wiki-* skills for the "
            "humane-prose-audit knowledge base."
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_boot = sub.add_parser(
        "bootstrap",
        help="Initialize wiki/ via wiki-init research profile (idempotent).",
    )
    p_boot.add_argument("--dry-run", action="store_true")

    p_fetch = sub.add_parser(
        "fetch", help="Fetch papers for a topic via cite-probe (Gate 0 required)."
    )
    p_fetch.add_argument("topic", help="Research topic to fetch papers for.")
    p_fetch.add_argument("--dry-run", action="store_true")

    p_verify = sub.add_parser(
        "verify",
        help="Verify fetched papers against venues.yaml (Gate 0 required).",
    )
    p_verify.add_argument("--dry-run", action="store_true")

    p_ingest = sub.add_parser(
        "ingest",
        help="Ingest raw papers into wiki concepts via wiki-ingest (Gate 0 required).",
    )
    p_ingest.add_argument("--dry-run", action="store_true")

    p_validate = sub.add_parser(
        "validate",
        help="Validate wiki integrity via wiki-validator (no Gate 0 needed).",
    )
    p_validate.add_argument("--dry-run", action="store_true")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "bootstrap":
            result = cmd_bootstrap(dry_run=args.dry_run)
        elif args.command == "fetch":
            result = cmd_fetch(topic=args.topic, dry_run=args.dry_run)
        elif args.command == "verify":
            result = cmd_verify(dry_run=args.dry_run)
        elif args.command == "ingest":
            result = cmd_ingest(dry_run=args.dry_run)
        elif args.command == "validate":
            result = cmd_validate(dry_run=args.dry_run)
        else:  # pragma: no cover — argparse already rejects this
            parser.error(f"unknown command: {args.command}")
            return 2
    except RuntimeError as exc:
        # Gate 0 failures land here.
        print(str(exc), file=sys.stderr)
        return 1
    except NotImplementedError as exc:
        # Real subprocess wiring not yet present (Phase F).
        print(str(exc), file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2, sort_keys=True))
    status = result.get("status", "error")
    return 0 if status in {"ok", "noop", "planned"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
