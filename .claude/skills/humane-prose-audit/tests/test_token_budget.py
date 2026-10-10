"""Token-budget preflight contract test.

Verifies that the tiktoken-based estimator (`scripts._common.token_estimator`)
does not exceed the configured `token_budget` (from `humane-prose-audit/
config.yaml`, default 50,000) when run against the three standard fixtures
in `tests/fixtures/`.

The estimate models a worst-case dispatch: each of the four Phase 2 personas
(SLP / ILL / SHL / HUM) is sent the persona prompt concatenated with the
fixture as the audit target; Phase 3 (consensus / aggregation) re-encodes
the fixture once more with a configurable completion budget. Total tokens
across both phases must fit within `token_budget`.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

SKILL_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL_ROOT))

from scripts._common.token_estimator import (  # noqa: E402
    estimate_phase_cost,
    estimate_tokens,
    fits_budget,
)

FIXTURES_DIR = SKILL_ROOT / "tests" / "fixtures"
PROMPTS_DIR = SKILL_ROOT / "prompts"
CONFIG_PATH = SKILL_ROOT / "config.yaml"

# Phase 2 personas dispatched by the orchestrator (default agents_n: 4).
PHASE2_PERSONAS = (
    "sloppy_agent.md",
    "illogical_agent.md",
    "shallow_agent.md",
    "humanity_auditor.md",
)

# Per-phase completion-token allowances mirroring the orchestrator's
# preflight defaults. Phase 2 spends more on findings; Phase 3 aggregates.
PHASE2_COMPLETION_TOKENS = 2048
PHASE3_COMPLETION_TOKENS = 2048

DEFAULT_TOKEN_BUDGET = 50_000


def _load_token_budget() -> int:
    """Return `token_budget` from config.yaml, or DEFAULT_TOKEN_BUDGET."""
    if not CONFIG_PATH.is_file():
        return DEFAULT_TOKEN_BUDGET
    with CONFIG_PATH.open("r", encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}
    value = cfg.get("token_budget", DEFAULT_TOKEN_BUDGET)
    try:
        return int(value)
    except (TypeError, ValueError):
        return DEFAULT_TOKEN_BUDGET


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _phase_costs_for_fixture(fixture_name: str) -> tuple[int, int]:
    """Return (phase2_total, phase3_total) token estimates for a fixture."""
    target_text = _read(FIXTURES_DIR / fixture_name)

    persona_prompts = [
        _read(PROMPTS_DIR / persona) + "\n\n---\n\n" + target_text
        for persona in PHASE2_PERSONAS
    ]
    phase2 = estimate_phase_cost(
        persona_prompts,
        expected_completion_tokens=PHASE2_COMPLETION_TOKENS,
    )
    phase3 = estimate_phase_cost(
        [target_text],
        expected_completion_tokens=PHASE3_COMPLETION_TOKENS,
    )
    return phase2["total_tokens"], phase3["total_tokens"]


@pytest.fixture(scope="module")
def token_budget() -> int:
    return _load_token_budget()


@pytest.mark.parametrize(
    "fixture",
    ["ai-flavored.md", "human-flavored.md", "academic-sample.md"],
)
def test_phase2_plus_phase3_within_budget(fixture: str, token_budget: int):
    """Phase 2 + Phase 3 estimated cost must not exceed token_budget."""
    fixture_path = FIXTURES_DIR / fixture
    assert fixture_path.is_file(), f"missing fixture: {fixture_path}"

    p2_total, p3_total = _phase_costs_for_fixture(fixture)
    grand_total = p2_total + p3_total

    assert grand_total > 0, "estimator returned non-positive total"
    assert fits_budget(
        {"total_tokens": grand_total}, token_budget
    ), (
        f"{fixture}: phase2={p2_total} + phase3={p3_total} = {grand_total} "
        f"exceeds token_budget={token_budget}"
    )


def test_estimator_smoke_positive_int():
    """Smoke: estimator returns a positive int for non-empty fixture text."""
    sample = _read(FIXTURES_DIR / "ai-flavored.md")
    n = estimate_tokens(sample)
    assert isinstance(n, int)
    assert n > 0


def test_token_budget_is_positive(token_budget: int):
    """The resolved budget must be a positive int — guards against
    misconfiguration where a non-positive value would silently fail all
    `fits_budget` checks."""
    assert isinstance(token_budget, int)
    assert token_budget > 0
