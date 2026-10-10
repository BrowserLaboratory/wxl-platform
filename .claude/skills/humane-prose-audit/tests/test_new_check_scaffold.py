"""Tests for humane-prose-audit/scripts/new_check_scaffold.py.

The scaffold tool generates a Python check module, a rationale markdown
stub, and a pytest stub from a snake_case name. Tests verify:

  * `--dry-run` prints the three planned paths to stdout without writing.
  * Without `--dry-run` the three files are materialised at the override
    directories (so the real `humane-prose-audit/{checks,rationales,tests}/`
    is never polluted).
  * Invalid names (uppercase, hyphen, etc.) are rejected with non-zero rc
    and a helpful stderr message referencing the regex constraint.
  * Existing target files are not overwritten without `--force`; the tool
    exits non-zero and identifies the conflicting path on stderr.
  * The generated check stub actually runs end-to-end against the known
    clean fixture and emits a schema-valid `findings == []` payload.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
FIXTURES_DIR = SKILL_ROOT / "tests" / "fixtures"
SCAFFOLD = SCRIPTS_DIR / "new_check_scaffold.py"


def _run_scaffold(*args: str) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, str(SCAFFOLD), *args]
    return subprocess.run(cmd, capture_output=True, text=True)


def _make_tmp_tree(tmp_path: Path) -> tuple[Path, Path, Path]:
    checks_dir = tmp_path / "checks"
    rationales_dir = tmp_path / "rationales"
    tests_dir = tmp_path / "tests"
    checks_dir.mkdir()
    rationales_dir.mkdir()
    tests_dir.mkdir()
    return checks_dir, rationales_dir, tests_dir


def test_scaffold_dry_run_prints_three_paths():
    proc = _run_scaffold("--name", "probe_check", "--dry-run")
    assert proc.returncode == 0, proc.stderr
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    assert len(lines) >= 3, f"expected >=3 lines, got {lines!r}"

    joined = "\n".join(lines)
    assert "checks/probe_check.py" in joined
    assert "rationales/probe_check.md" in joined
    assert "tests/test_probe_check.py" in joined

    for ln in lines[:3]:
        assert ln.endswith(".py") or ln.endswith(".md"), f"unexpected line: {ln!r}"


def test_scaffold_writes_three_files_when_not_dry_run(tmp_path: Path):
    checks_dir, rationales_dir, tests_dir = _make_tmp_tree(tmp_path)
    proc = _run_scaffold(
        "--name", "probe_check",
        "--checks-dir", str(checks_dir),
        "--rationales-dir", str(rationales_dir),
        "--tests-dir", str(tests_dir),
    )
    assert proc.returncode == 0, proc.stderr
    assert (checks_dir / "probe_check.py").is_file()
    assert (rationales_dir / "probe_check.md").is_file()
    assert (tests_dir / "test_probe_check.py").is_file()


def test_scaffold_rejects_invalid_name():
    proc = _run_scaffold("--name", "Invalid-Name", "--dry-run")
    assert proc.returncode != 0
    # stderr should mention the regex / snake_case constraint.
    assert "[a-z" in proc.stderr or "snake_case" in proc.stderr.lower() or "lowercase" in proc.stderr.lower()


def test_scaffold_does_not_overwrite_existing(tmp_path: Path):
    checks_dir, rationales_dir, tests_dir = _make_tmp_tree(tmp_path)
    target = checks_dir / "probe_check.py"
    target.write_text("# existing content do not touch\n", encoding="utf-8")

    proc = _run_scaffold(
        "--name", "probe_check",
        "--checks-dir", str(checks_dir),
        "--rationales-dir", str(rationales_dir),
        "--tests-dir", str(tests_dir),
    )
    assert proc.returncode != 0
    assert "probe_check.py" in proc.stderr
    # original file untouched
    assert target.read_text(encoding="utf-8") == "# existing content do not touch\n"
    # No partial scaffold should land on the other two paths either.
    assert not (rationales_dir / "probe_check.md").exists()
    assert not (tests_dir / "test_probe_check.py").exists()


def test_scaffold_generated_check_runs_smoke(tmp_path: Path):
    checks_dir, rationales_dir, tests_dir = _make_tmp_tree(tmp_path)
    name = "smoke_probe"
    proc = _run_scaffold(
        "--name", name,
        "--checks-dir", str(checks_dir),
        "--rationales-dir", str(rationales_dir),
        "--tests-dir", str(tests_dir),
    )
    assert proc.returncode == 0, proc.stderr

    generated = checks_dir / f"{name}.py"
    assert generated.is_file()

    fixture = FIXTURES_DIR / "human-flavored.md"
    run = subprocess.run(
        [sys.executable, str(generated), str(fixture)],
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, f"generated check failed: {run.stderr}"
    payload = json.loads(run.stdout)
    assert payload["check"] == name
    assert payload["findings"] == []


@pytest.mark.xfail(reason="TODO: implement real assertions for scaffold-generated checks")
def test_scaffold_generated_check_real_semantics():
    # Placeholder for follow-up: once a real check is implemented,
    # replace this with semantic assertions on the produced findings.
    raise AssertionError("not yet implemented")
