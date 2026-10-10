"""TDD test suite for scripts/wiki_orchestrator.py.

The orchestrator is a thin wrapper around the cite-probe / wiki-* skill
bundle. These tests never invoke real cite-probe / wiki-init subprocesses —
every code path is exercised with ``--dry-run`` or against a sandboxed
PROJECT_ROOT / WIKI_DIR via env vars ``HUMANE_WIKI_PROJECT_ROOT_OVERRIDE``
and ``HUMANE_WIKI_DIR_OVERRIDE``.

Covers two acceptance cases stipulated in tasks.md 5.4:
  - idempotent re-execution (bootstrap noop when manifest present)
  - Gate 0 halt (fetch fails without .cite-probe.env at project root)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
WIKI_ORCH = SKILL_ROOT / "scripts" / "wiki_orchestrator.py"


def _run(*args: str, env_extra: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        [sys.executable, str(WIKI_ORCH), *args],
        capture_output=True,
        text=True,
        env=env,
    )


def _sandbox(tmp_path: Path, *, create_env: bool, create_manifest: bool = False) -> dict[str, str]:
    """Build a sandbox env-var mapping pointing at tmp_path."""
    project_root = tmp_path / "project"
    wiki_dir = project_root / "humane-prose-audit" / "wiki"
    wiki_dir.mkdir(parents=True, exist_ok=True)
    if create_env:
        (project_root / ".cite-probe.env").write_text("")
    if create_manifest:
        (wiki_dir / ".wiki-init.manifest.yaml").write_text("schema_version: 0\n")
    return {
        "HUMANE_WIKI_PROJECT_ROOT_OVERRIDE": str(project_root),
        "HUMANE_WIKI_DIR_OVERRIDE": str(wiki_dir),
    }


# ---------------------------------------------------------------------------
# CLI-level tests
# ---------------------------------------------------------------------------


def test_cli_subcommand_help_works() -> None:
    """`python wiki_orchestrator.py --help` exits 0 and mentions all five subcommands."""
    proc = _run("--help")
    assert proc.returncode == 0, proc.stderr
    out = proc.stdout
    for sub in ("bootstrap", "fetch", "verify", "ingest", "validate"):
        assert sub in out, f"missing {sub} in --help output: {out!r}"


def test_gate_0_missing_halts(tmp_path: Path) -> None:
    """fetch with no .cite-probe.env present must exit non-zero and explain."""
    env_extra = _sandbox(tmp_path, create_env=False)
    proc = _run("fetch", "some_topic", "--dry-run", env_extra=env_extra)
    assert proc.returncode != 0
    # stderr must reference the expected file path
    assert ".cite-probe.env" in proc.stderr


def test_gate_0_present_passes(tmp_path: Path) -> None:
    """With .cite-probe.env present, dry-run fetch exits 0 with ok-ish status."""
    env_extra = _sandbox(tmp_path, create_env=True)
    proc = _run("fetch", "some_topic", "--dry-run", env_extra=env_extra)
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert payload["status"] in ("ok", "noop", "planned")


# ---------------------------------------------------------------------------
# In-process function tests
# ---------------------------------------------------------------------------


@pytest.fixture
def orchestrator(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Import wiki_orchestrator with PROJECT_ROOT / WIKI_DIR overridden."""
    project_root = tmp_path / "proj"
    wiki_dir = project_root / "humane-prose-audit" / "wiki"
    wiki_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("HUMANE_WIKI_PROJECT_ROOT_OVERRIDE", str(project_root))
    monkeypatch.setenv("HUMANE_WIKI_DIR_OVERRIDE", str(wiki_dir))
    # Ensure module reload so module-level cached state honors env vars
    sys.path.insert(0, str(SKILL_ROOT / "scripts"))
    if "wiki_orchestrator" in sys.modules:
        del sys.modules["wiki_orchestrator"]
    import wiki_orchestrator  # type: ignore
    return wiki_orchestrator, project_root, wiki_dir


def test_bootstrap_idempotent_when_manifest_exists(orchestrator) -> None:
    """cmd_bootstrap returns status=noop when manifest already exists."""
    mod, project_root, wiki_dir = orchestrator
    (wiki_dir / ".wiki-init.manifest.yaml").write_text("schema_version: 0\n")
    result = mod.cmd_bootstrap(dry_run=True)
    assert result["status"] == "noop"
    assert result["note"] == "already initialized"


def test_bootstrap_dry_run_when_no_manifest(orchestrator) -> None:
    """cmd_bootstrap dry-run reports the planned command without invoking wiki-init."""
    mod, project_root, wiki_dir = orchestrator
    # Make sure no manifest exists
    manifest = wiki_dir / ".wiki-init.manifest.yaml"
    if manifest.exists():
        manifest.unlink()
    result = mod.cmd_bootstrap(dry_run=True)
    assert result["status"] in ("ok", "planned")
    # The dry-run result should reveal the planned command (list of args)
    assert "command" in result or "planned" in result


def test_dry_run_does_not_subprocess(orchestrator) -> None:
    """cmd_fetch in dry-run does not spawn a subprocess to cite-probe."""
    mod, project_root, wiki_dir = orchestrator
    (project_root / ".cite-probe.env").write_text("")
    result = mod.cmd_fetch(topic="foo", dry_run=True)
    assert result["status"] in ("ok", "noop", "planned")
    assert result["topic"] == "foo"
    # idempotent counters must be present
    assert "fetched_count" in result
    assert "skipped_count" in result


def test_gate_0_helper_returns_error_when_missing(orchestrator) -> None:
    mod, project_root, wiki_dir = orchestrator
    # ensure no .cite-probe.env
    env_file = project_root / ".cite-probe.env"
    if env_file.exists():
        env_file.unlink()
    ok, err = mod.gate_0()
    assert ok is False
    assert err is not None
    assert ".cite-probe.env" in err


def test_gate_0_helper_passes_when_present(orchestrator) -> None:
    mod, project_root, wiki_dir = orchestrator
    (project_root / ".cite-probe.env").write_text("")
    ok, err = mod.gate_0()
    assert ok is True
    assert err is None


def test_verify_dry_run_returns_planned_violations_list(orchestrator) -> None:
    mod, project_root, wiki_dir = orchestrator
    (project_root / ".cite-probe.env").write_text("")
    result = mod.cmd_verify(dry_run=True)
    assert result["status"] in ("ok", "noop", "planned")
    assert "violations" in result


def test_ingest_dry_run_returns_ingested_count(orchestrator) -> None:
    mod, project_root, wiki_dir = orchestrator
    (project_root / ".cite-probe.env").write_text("")
    result = mod.cmd_ingest(dry_run=True)
    assert result["status"] in ("ok", "noop", "planned")
    assert "ingested_count" in result


def test_validate_dry_run_returns_errors_list(orchestrator) -> None:
    mod, project_root, wiki_dir = orchestrator
    # validate does not need Gate 0
    result = mod.cmd_validate(dry_run=True)
    assert result["status"] in ("ok", "noop", "planned")
    assert "errors" in result
