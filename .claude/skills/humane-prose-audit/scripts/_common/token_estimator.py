"""tiktoken-based prompt + completion token cost estimator.

Used by the humane-prose-audit orchestrator's token-economy preflight gate.
Before dispatching sub-agents for a phase, the orchestrator estimates the
phase's prompt + completion token cost and compares against
`humane-prose-audit/config.yaml: token_budget` (default 50,000). If the
estimate exceeds budget, the orchestrator reports and halts.

Design notes
------------
* Encoding is pinned to ``cl100k_base`` regardless of model identifier.
  This keeps preflight estimates stable and deterministic across tiktoken
  upgrades (newer encodings like ``o200k_base`` produce slightly different
  counts; the budget gate doesn't need vendor-exact precision).
* Unknown model names never raise — they silently fall back to
  ``cl100k_base`` so callers can pass arbitrary identifiers from config.
"""
from __future__ import annotations

from typing import Any

import tiktoken

DEFAULT_MODEL = "gpt-4o"
FALLBACK_ENCODING = "cl100k_base"


def encoding_for(model: str = DEFAULT_MODEL):
    """Return a tiktoken encoding for the requested model.

    The estimator pins all encodings to :data:`FALLBACK_ENCODING`
    (``cl100k_base``) to guarantee deterministic, stable preflight counts.
    Unknown model names never raise.
    """
    # Honor the pinned-encoding contract: regardless of model, return
    # cl100k_base. This keeps the budget gate deterministic across
    # tiktoken upgrades that change which encoding a model resolves to.
    try:
        return tiktoken.get_encoding(FALLBACK_ENCODING)
    except Exception as exc:  # pragma: no cover — tiktoken bundles cl100k_base
        # Last-ditch: fall back to the model's native encoding, but surface
        # the deviation so callers know the budget-gate determinism guarantee
        # no longer holds.
        import sys as _sys
        print(
            f"token_estimator: WARNING — pinned '{FALLBACK_ENCODING}' unavailable "
            f"({exc}); falling back to encoding_for_model({model!r}). Budget "
            f"determinism may drift across tiktoken upgrades.",
            file=_sys.stderr,
        )
        return tiktoken.encoding_for_model(model)


def estimate_tokens(text: str, model: str = DEFAULT_MODEL) -> int:
    """Return the encoded token count for ``text``.

    Empty string returns 0 without calling tiktoken.
    """
    if not text:
        return 0
    enc = encoding_for(model)
    return len(enc.encode(text))


def estimate_phase_cost(
    prompts: list[str],
    expected_completion_tokens: int = 2048,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """Estimate prompt + completion token cost for a single phase.

    Parameters
    ----------
    prompts:
        Prompt strings that will be sent to sub-agents during the phase.
        Each is encoded independently and summed.
    expected_completion_tokens:
        Per-phase completion-token budget the orchestrator expects to spend
        on model responses.
    model:
        Model identifier (informational only — encoding is pinned, see
        module docstring).

    Returns
    -------
    dict with keys ``prompt_tokens``, ``completion_tokens``, ``total_tokens``,
    ``model``, ``encoding``.
    """
    enc = encoding_for(model)
    prompt_tokens = sum(len(enc.encode(p)) for p in prompts if p)
    completion_tokens = int(expected_completion_tokens)
    return {
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "model": model,
        "encoding": enc.name,
    }


def fits_budget(estimated: dict[str, Any], budget: int) -> bool:
    """Return whether ``estimated['total_tokens'] <= budget``.

    Defensive: a non-positive budget can never fit anything, even a
    zero-token estimate. Callers should treat ``budget <= 0`` as a
    misconfiguration rather than an unlimited allowance.
    """
    if budget <= 0:
        return False
    return int(estimated.get("total_tokens", 0)) <= budget
