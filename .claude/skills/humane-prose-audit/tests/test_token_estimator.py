"""Pytest suite for humane-prose-audit token-cost estimator.

Covers the public API of `scripts._common.token_estimator`, used by the
orchestrator's token-economy gating against `config.yaml: token_budget`.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent

# Make `scripts._common.token_estimator` importable.
sys.path.insert(0, str(SKILL_ROOT))

from scripts._common import token_estimator  # noqa: E402
from scripts._common.token_estimator import (  # noqa: E402
    DEFAULT_MODEL,
    FALLBACK_ENCODING,
    encoding_for,
    estimate_phase_cost,
    estimate_tokens,
    fits_budget,
)


def test_empty_string_is_zero():
    assert estimate_tokens("") == 0


def test_short_string_positive():
    n = estimate_tokens("hello world")
    assert isinstance(n, int)
    assert 0 < n < 50


def test_deterministic_same_input_same_count():
    a = estimate_tokens("the quick brown fox jumps over the lazy dog")
    b = estimate_tokens("the quick brown fox jumps over the lazy dog")
    assert a == b


def test_unknown_model_falls_back():
    # Should not raise on an unknown model identifier.
    enc = encoding_for("absurdly-fake-model-xyz")
    assert enc.name == FALLBACK_ENCODING == "cl100k_base"


def test_phase_cost_sums_prompts():
    cost = estimate_phase_cost(["hello", "world"], expected_completion_tokens=100)
    expected_prompt = estimate_tokens("hello") + estimate_tokens("world")
    assert cost["prompt_tokens"] == expected_prompt
    assert cost["completion_tokens"] == 100
    assert cost["total_tokens"] == expected_prompt + 100


def test_phase_cost_empty_prompts():
    cost = estimate_phase_cost([], expected_completion_tokens=0)
    assert cost["prompt_tokens"] == 0
    assert cost["completion_tokens"] == 0
    assert cost["total_tokens"] == 0


def test_fits_budget_within():
    assert fits_budget(
        {"total_tokens": 100, "prompt_tokens": 50, "completion_tokens": 50},
        200,
    ) is True


def test_fits_budget_exceeds():
    assert fits_budget(
        {"total_tokens": 300, "prompt_tokens": 200, "completion_tokens": 100},
        200,
    ) is False


def test_fits_budget_nonpositive():
    # Defensive: budget must be > 0 to fit anything.
    assert fits_budget({"total_tokens": 0}, 0) is False
    assert fits_budget({"total_tokens": 0}, -1) is False


def test_phase_cost_includes_encoding_name():
    cost_gpt4o = estimate_phase_cost(["x"], expected_completion_tokens=1, model=DEFAULT_MODEL)
    cost_unknown = estimate_phase_cost(["x"], expected_completion_tokens=1, model="absurdly-fake-model-xyz")
    assert cost_gpt4o["encoding"] == "cl100k_base"
    assert cost_unknown["encoding"] == "cl100k_base"
