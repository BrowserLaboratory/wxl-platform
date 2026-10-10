# Vendored from ~/.claude/skills/humane-prose-audit/scripts/_common/config_resolver.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Project-level configuration resolver for humane-prose-audit.

Public surface
--------------
* ``find_project_config(start_path)`` — walk up from ``start_path`` to the
  containing Git root (or filesystem root when not in a Git checkout) and
  return the first ``.humane-prose-audit.yaml`` found.
* ``deep_merge(base, override)`` — recursive non-mutating dict merge; later
  wins for non-dict leaves.
* ``resolve_config(target)`` — load skill defaults, discover the project
  config, validate it against ``project-config.schema.json`` and return the
  merged dict.
* ``ConfigError`` — raised on schema violation; carries ``path`` and
  ``message`` attributes pointing at the first offending field.

CLI
---
``python config_resolver.py <target>`` prints the merged YAML to stdout.
On ``ConfigError`` it writes ``ERROR <path>: <message>`` to stderr and
exits with status 1.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parents[2]
SKILL_DEFAULTS_PATH = SKILL_ROOT / "config.yaml"
SCHEMA_PATH = SKILL_ROOT / "schemas" / "project-config.schema.json"
PROJECT_CONFIG_NAME = ".humane-prose-audit.yaml"


class ConfigError(Exception):
    """Raised when the discovered project config violates the schema."""

    def __init__(self, path: str, message: str) -> None:
        super().__init__(f"{path}: {message}")
        self.path = path
        self.message = message


def _git_toplevel(directory: Path) -> Path | None:
    """Return the Git root containing ``directory``, or ``None`` if absent."""
    try:
        result = subprocess.run(
            ["git", "-C", str(directory), "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=False,
        )
    except (FileNotFoundError, OSError):
        return None
    if result.returncode != 0:
        return None
    top = result.stdout.strip()
    if not top:
        return None
    return Path(top).resolve()


def find_project_config(start_path: Path) -> Path | None:
    """Walk up from ``start_path`` searching for ``.humane-prose-audit.yaml``.

    Stop at the Git root (output of ``git rev-parse --show-toplevel``) so we
    never escape the project boundary. When ``start_path`` is not inside a
    Git repository, walk up to the filesystem root instead.
    """
    start = Path(start_path).resolve()
    if start.is_file():
        start = start.parent
    if not start.exists():
        return None

    git_root = _git_toplevel(start)

    current = start
    while True:
        candidate = current / PROJECT_CONFIG_NAME
        if candidate.is_file():
            return candidate

        # Stop conditions.
        if git_root is not None and current == git_root:
            return None
        if current.parent == current:  # filesystem root
            return None
        # When inside a Git repo, never ascend above the root.
        if git_root is not None and git_root not in current.parents:
            # ``current`` is at or above git_root; the equality check above
            # handles == git_root. This branch guards against symlinks or
            # other oddities that put us outside the repo.
            return None

        current = current.parent


def deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge ``override`` on top of ``base`` without mutation.

    For matching keys whose values are both dicts, recurse. Otherwise the
    ``override`` value replaces the ``base`` value wholesale (lists are not
    concatenated).
    """
    if not isinstance(base, dict) or not isinstance(override, dict):
        raise TypeError("deep_merge requires dict inputs")

    result: dict[Any, Any] = {}
    for key, value in base.items():
        if isinstance(value, dict):
            result[key] = deep_merge(value, {})  # deep copy nested dicts
        else:
            result[key] = value

    for key, ovr_value in override.items():
        if (
            key in result
            and isinstance(result[key], dict)
            and isinstance(ovr_value, dict)
        ):
            result[key] = deep_merge(result[key], ovr_value)
        elif isinstance(ovr_value, dict):
            result[key] = deep_merge({}, ovr_value)
        else:
            result[key] = ovr_value
    return result


def _format_pointer(path_parts) -> str:
    """Render a JSON-Pointer-like string from a deque of path components."""
    if not path_parts:
        return "<root>"
    return ".".join(str(part) for part in path_parts)


def _validate_project_config(data: Any, source: Path) -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path))
    if not errors:
        return
    first = errors[0]
    pointer = _format_pointer(first.absolute_path)
    raise ConfigError(pointer, f"{first.message} (in {source})")


def resolve_config(target: Path) -> dict:
    """Resolve the effective merged config for an audit target.

    Steps:

    1. Load skill defaults from ``SKILL_DEFAULTS_PATH`` (required).
    2. Walk up from ``target`` for ``.humane-prose-audit.yaml``.
    3. If found, validate against ``project-config.schema.json``.
    4. Deep-merge the project config on top of the skill defaults.
    """
    if not SKILL_DEFAULTS_PATH.is_file():
        raise FileNotFoundError(
            f"skill defaults not found at {SKILL_DEFAULTS_PATH}"
        )

    skill_defaults = yaml.safe_load(SKILL_DEFAULTS_PATH.read_text(encoding="utf-8"))
    if not isinstance(skill_defaults, dict):
        raise ValueError(
            f"skill defaults at {SKILL_DEFAULTS_PATH} did not parse as a mapping"
        )

    target = Path(target)
    search_start = target.parent if target.is_file() else target
    project_path = find_project_config(search_start)

    if project_path is None:
        return deep_merge(skill_defaults, {})

    raw = yaml.safe_load(project_path.read_text(encoding="utf-8"))
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise ConfigError(
            "<root>",
            f"project config at {project_path} must be a YAML mapping",
        )

    _validate_project_config(raw, project_path)
    return deep_merge(skill_defaults, raw)


def _main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(
            "usage: config_resolver.py <target-path>",
            file=sys.stderr,
        )
        return 2
    target = Path(argv[1])
    try:
        merged = resolve_config(target)
    except ConfigError as exc:
        print(f"ERROR {exc.path}: {exc.message}", file=sys.stderr)
        return 1
    yaml.safe_dump(merged, sys.stdout, sort_keys=False, allow_unicode=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))
