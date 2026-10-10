"""Tests for humane_score scoring inside humane-prose-audit/scripts/output_aggregator.py.

Per task 5.3 of humane-prose-audit-refactor: scoring must be bounded,
reproducible, and the threshold annotation MUST NOT affect PASS/FAIL.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from output_aggregator import (  # noqa: E402 - sys.path manipulated above
    aggregate,
    compute_humane_score,
)


DEFAULT_CONFIG = {
    "humane_signal": {
        "threshold": 60,
        "weights": {
            "burstiness": 0.3,
            "ai_tells": 0.2,
            "imperative_fog": 0.2,
            "lexical_diversity": 0.15,
            "boilerplate_stamp": 0.15,
        },
    },
}


def _check(name: str, metadata: dict | None = None, findings: list | None = None) -> dict:
    return {
        "check": name,
        "target": "/tmp/x.md",
        "findings": findings or [],
        "metadata": metadata or {},
    }


# ---------------------------------------------------------------------------
# 1. bounded
# ---------------------------------------------------------------------------


def test_humane_score_bounded():
    """Extreme metadata values still produce score in [0, 100]."""
    preflight_extreme_low = [
        _check("burstiness", {"burstiness": 0.0}),
        _check("ai_tells", {"vocab_density_per_kchar": 999.0}),
        _check("imperative_fog", {"density_per_kchar": 999.0}),
        _check("lexical_diversity", {"mtld": 0.0}),
        _check("discourse_marker_density", {"density_per_kchar": 999.0}),
    ]
    score = compute_humane_score(preflight_extreme_low, DEFAULT_CONFIG)
    assert isinstance(score["score"], int)
    assert 0 <= score["score"] <= 100

    preflight_extreme_high = [
        _check("burstiness", {"burstiness": 99.0}),
        _check("ai_tells", {"vocab_density_per_kchar": 0.0}),
        _check("imperative_fog", {"density_per_kchar": 0.0}),
        _check("lexical_diversity", {"mtld": 9999.0}),
        _check("discourse_marker_density", {"density_per_kchar": 0.0}),
    ]
    score2 = compute_humane_score(preflight_extreme_high, DEFAULT_CONFIG)
    assert isinstance(score2["score"], int)
    assert 0 <= score2["score"] <= 100


# ---------------------------------------------------------------------------
# 2. reproducible
# ---------------------------------------------------------------------------


def test_humane_score_reproducible():
    preflight = [
        _check("burstiness", {"burstiness": 0.45}),
        _check("ai_tells", {"vocab_density_per_kchar": 4.0}),
        _check("imperative_fog", {"density_per_kchar": 3.0}),
        _check("lexical_diversity", {"mtld": 30.0}),
        _check("discourse_marker_density", {"density_per_kchar": 4.0}),
    ]
    a = compute_humane_score(preflight, DEFAULT_CONFIG)
    b = compute_humane_score(preflight, DEFAULT_CONFIG)
    c = compute_humane_score(preflight, DEFAULT_CONFIG)
    assert a == b == c
    assert a["score"] == b["score"]


# ---------------------------------------------------------------------------
# 3. threshold annotation does not affect PASS verdict
# ---------------------------------------------------------------------------


def test_threshold_annotation_does_not_affect_verdict(tmp_path):
    """Verdict is PASS even when humane_score < threshold."""
    run_dir = tmp_path / "run"
    pre = run_dir / "preflight"
    agents = run_dir / "agents"
    pre.mkdir(parents=True)
    agents.mkdir(parents=True)

    # Build preflight whose metadata yields a low humane_score (well below 60)
    # but zero findings. All 5 components emit unfavorable raw values.
    (pre / "burstiness.json").write_text(json.dumps(_check("burstiness", {"burstiness": 0.0})))
    (pre / "ai_tells.json").write_text(json.dumps(_check("ai_tells", {"vocab_density_per_kchar": 99.0})))
    (pre / "imperative_fog.json").write_text(json.dumps(_check("imperative_fog", {"density_per_kchar": 99.0})))
    (pre / "lexical_diversity.json").write_text(json.dumps(_check("lexical_diversity", {"mtld": 0.0})))
    (pre / "discourse_marker_density.json").write_text(
        json.dumps(_check("discourse_marker_density", {"density_per_kchar": 99.0}))
    )

    # Agents: one with severity 'medium' (PASS-allowed) so verdict stays PASS.
    (agents / "sloppy.json").write_text(
        json.dumps(
            {
                "agent": "sloppy",
                "target": "/tmp/x.md",
                "findings": [
                    {
                        "id": "SLP1",
                        "severity": "medium",
                        "section": "intro",
                        "issue": "Minor wording.",
                        "recommendation": "Tighten.",
                        "confidence": 0.5,
                    }
                ],
            }
        )
    )

    report = aggregate(run_dir, config=DEFAULT_CONFIG)
    assert report["verdict"] == "PASS"
    assert report["humane_score"] < 60
    score_block = report["phases"]["humane_scoring"]
    annotation = score_block["annotation"]
    assert annotation
    assert "WARN: low humane signal" in annotation
    # Annotation should mention the score and threshold values.
    assert f"score={report['humane_score']}" in annotation
    assert "threshold=60" in annotation


# ---------------------------------------------------------------------------
# 4. component breakdown
# ---------------------------------------------------------------------------


def test_humane_score_component_breakdown():
    preflight = [
        _check("burstiness", {"burstiness": 0.45}),
        _check("ai_tells", {"vocab_density_per_kchar": 4.0}),
        _check("imperative_fog", {"density_per_kchar": 3.0}),
        _check("lexical_diversity", {"mtld": 30.0}),
        _check("discourse_marker_density", {"density_per_kchar": 4.0}),
    ]
    score = compute_humane_score(preflight, DEFAULT_CONFIG)
    comps = score["components"]
    for name in ("burstiness", "ai_tells", "imperative_fog", "lexical_diversity", "boilerplate_stamp"):
        assert name in comps, f"missing component {name}"
        c = comps[name]
        assert isinstance(c["weight"], (int, float))
        assert isinstance(c["raw"], (int, float))
        assert isinstance(c["contribution"], (int, float))


# ---------------------------------------------------------------------------
# 5. missing check -> neutral 0.5 + source_check annotated
# ---------------------------------------------------------------------------


def test_humane_score_missing_check_neutral():
    # Drop the burstiness check entirely.
    preflight = [
        _check("ai_tells", {"vocab_density_per_kchar": 4.0}),
        _check("imperative_fog", {"density_per_kchar": 3.0}),
        _check("lexical_diversity", {"mtld": 30.0}),
        _check("discourse_marker_density", {"density_per_kchar": 4.0}),
    ]
    score = compute_humane_score(preflight, DEFAULT_CONFIG)
    bcomp = score["components"]["burstiness"]
    assert bcomp["raw"] == 0.5
    assert "missing:burstiness" in (bcomp.get("source_check") or "")


# ---------------------------------------------------------------------------
# 6 / 7 / 8 — band low / mid / high
# ---------------------------------------------------------------------------


def test_humane_score_band_low():
    # Score should be 0 with these values: burstiness=0, ai_tells very large,
    # imperative_fog very large, mtld=0, discourse very large -> raw=0 all
    # -> score=0.
    preflight = [
        _check("burstiness", {"burstiness": 0.0}),
        _check("ai_tells", {"vocab_density_per_kchar": 99.0}),
        _check("imperative_fog", {"density_per_kchar": 99.0}),
        _check("lexical_diversity", {"mtld": 0.0}),
        _check("discourse_marker_density", {"density_per_kchar": 99.0}),
    ]
    score = compute_humane_score(preflight, DEFAULT_CONFIG)
    assert score["score"] < 40
    assert score["band"] == "low"
    assert score["annotation"].startswith("WARN: low humane signal")


def test_humane_score_band_mid():
    # raw ~ 0.5 on every component -> score=50 -> mid band.
    preflight = [
        _check("burstiness", {"burstiness": 0.225}),  # 0.225/0.45 = 0.5
        _check("ai_tells", {"vocab_density_per_kchar": 4.0}),  # 1 - 4/8 = 0.5
        _check("imperative_fog", {"density_per_kchar": 3.0}),  # 1 - 3/6 = 0.5
        _check("lexical_diversity", {"mtld": 30.0}),  # 30/60 = 0.5
        _check("discourse_marker_density", {"density_per_kchar": 4.0}),  # 1 - 4/8 = 0.5
    ]
    score = compute_humane_score(preflight, DEFAULT_CONFIG)
    assert 40 <= score["score"] <= 69
    assert score["band"] == "mid"
    assert score["annotation"] == ""


def test_humane_score_band_high():
    # raw ~ 1.0 on every component -> score=100 -> high band.
    preflight = [
        _check("burstiness", {"burstiness": 0.9}),
        _check("ai_tells", {"vocab_density_per_kchar": 0.0}),
        _check("imperative_fog", {"density_per_kchar": 0.0}),
        _check("lexical_diversity", {"mtld": 120.0}),
        _check("discourse_marker_density", {"density_per_kchar": 0.0}),
    ]
    score = compute_humane_score(preflight, DEFAULT_CONFIG)
    assert score["score"] >= 70
    assert score["band"] == "high"
    assert score["annotation"] == ""
