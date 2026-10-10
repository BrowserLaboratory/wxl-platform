"""Pytest suite for humane-prose-audit/scripts/_common/config_resolver.py.

Covers the three required scenarios from the
``humane-prose-audit-execution-protocol`` spec plus two helper tests:

1. Walk-up discovery — project config is found above the audit target.
2. Stop at Git root — no project config exists, fall back to skill defaults.
3. Schema violation — invalid project config triggers ``ConfigError``
   and a non-zero CLI exit with the offending path in stderr.
4. ``deep_merge`` preserves untouched nested keys.
5. ``find_project_config`` returns ``None`` when nothing is found.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent
CONFIG_RESOLVER_PY = SKILL_ROOT / "scripts" / "_common" / "config_resolver.py"
SKILL_DEFAULTS_PATH = SKILL_ROOT / "config.yaml"

# Make the resolver importable as a module without polluting sys.path globally.
sys.path.insert(0, str(SKILL_ROOT))

from scripts._common import config_resolver  # noqa: E402
from scripts._common.config_resolver import (  # noqa: E402
    ConfigError,
    deep_merge,
    find_project_config,
    resolve_config,
)


def _git_init(repo: Path) -> None:
    """Minimal git init so resolver's `git rev-parse --show-toplevel` works."""
    subprocess.run(
        ["git", "init", str(repo)],
        check=True,
        capture_output=True,
    )


@pytest.fixture
def fake_repo(tmp_path: Path):
    repo = tmp_path / "repo"
    (repo / "docs").mkdir(parents=True)
    _git_init(repo)
    target = repo / "docs" / "post.md"
    target.write_text("# Post\n", encoding="utf-8")
    return repo, target


def test_walk_up_discovery(fake_repo):
    repo, target = fake_repo
    project_cfg = {
        "profile": "blog",
        "humane_signal": {"threshold": 70},
    }
    (repo / ".humane-prose-audit.yaml").write_text(
        yaml.safe_dump(project_cfg), encoding="utf-8"
    )

    merged = resolve_config(target)

    # Project keys win.
    assert merged["profile"] == "blog"
    assert merged["humane_signal"]["threshold"] == 70

    # Skill defaults survive where the project did not override them.
    skill_defaults = yaml.safe_load(SKILL_DEFAULTS_PATH.read_text(encoding="utf-8"))
    assert merged["agents_n"] == skill_defaults["agents_n"]
    assert merged["severity"] == skill_defaults["severity"]
    assert merged["fuzz"]["k"] == skill_defaults["fuzz"]["k"]


def test_stop_at_git_root(fake_repo):
    repo, target = fake_repo
    # Intentionally do NOT create .humane-prose-audit.yaml.
    # Also plant one OUTSIDE the git root to make sure we don't escape upward.
    outside = repo.parent / ".humane-prose-audit.yaml"
    outside.write_text(yaml.safe_dump({"profile": "academic"}), encoding="utf-8")

    merged = resolve_config(target)
    skill_defaults = yaml.safe_load(SKILL_DEFAULTS_PATH.read_text(encoding="utf-8"))

    assert merged == skill_defaults
    assert "profile" not in merged  # nothing leaked in from outside


def test_schema_violation_exits_nonzero(fake_repo):
    repo, target = fake_repo
    # threshold of 200 violates `maximum: 100` on humane_signal.threshold.
    bad_cfg = {"humane_signal": {"threshold": 200}}
    (repo / ".humane-prose-audit.yaml").write_text(
        yaml.safe_dump(bad_cfg), encoding="utf-8"
    )

    with pytest.raises(ConfigError) as excinfo:
        resolve_config(target)
    assert "humane_signal" in excinfo.value.path
    assert "threshold" in excinfo.value.path

    proc = subprocess.run(
        [sys.executable, str(CONFIG_RESOLVER_PY), str(target)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode != 0
    assert "humane_signal" in proc.stderr
    assert "threshold" in proc.stderr


def test_deep_merge_preserves_nested():
    base = {"a": {"b": 1, "c": 2}}
    override = {"a": {"b": 99}}
    merged = deep_merge(base, override)
    assert merged == {"a": {"b": 99, "c": 2}}
    # No mutation of inputs.
    assert base == {"a": {"b": 1, "c": 2}}
    assert override == {"a": {"b": 99}}


def test_find_project_config_returns_none_when_absent(tmp_path: Path):
    nested = tmp_path / "a" / "b" / "c"
    nested.mkdir(parents=True)
    # No git init, no config file anywhere.
    assert find_project_config(nested) is None


def test_cli_prints_merged_yaml(fake_repo, capsys):
    repo, target = fake_repo
    (repo / ".humane-prose-audit.yaml").write_text(
        yaml.safe_dump({"profile": "blog"}), encoding="utf-8"
    )

    proc = subprocess.run(
        [sys.executable, str(CONFIG_RESOLVER_PY), str(target)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
    loaded = yaml.safe_load(proc.stdout)
    assert loaded["profile"] == "blog"
    skill_defaults = yaml.safe_load(SKILL_DEFAULTS_PATH.read_text(encoding="utf-8"))
    assert loaded["agents_n"] == skill_defaults["agents_n"]


# Reference the resolver module so static checkers see the import as live.
_ = config_resolver
