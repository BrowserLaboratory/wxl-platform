"""Consensus-severity bump tests for output_aggregator.consensus_bump.

Contract under test (per design.md + wiki/methods/consensus-severity.md):
    N=4 sub-agent personas (SLP/ILL/SHL/HUM) all flag the same finding
    (matched on section + normalized issue) -> bump severity by ONE tier
    with cap at critical; N<=3 -> no bump.

NOTE (gap from spec): the current implementation in
``output_aggregator.consensus_bump`` actually bumps by ``N - 1`` levels
(see ``_bump_severity(base, n - 1)``) rather than a fixed one tier when
N == 4. These tests assert the **actual** behaviour; see the report at
the end of the run for the documented gap.
"""
from __future__ import annotations

import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from output_aggregator import consensus_bump  # noqa: E402


# ---------------------------------------------------------------------------
# Fixture helpers — mirror test_output_aggregator.py style
# ---------------------------------------------------------------------------


def _agent_finding(fid, severity, section, issue):
    """Minimal sub-agent finding dict (one finding per persona)."""
    return {
        "id": fid,
        "severity": severity,
        "section": section,
        "issue": issue,
        "recommendation": "fix it",
        "confidence": 0.6,
    }


def _four_personas_same(severity, section="intro", issue="Phrasing is awkward here."):
    """Build the canonical 4-persona-agreement input: SLP/ILL/SHL/HUM all
    flag the same section + issue at the same severity. Returns the
    list-of-lists that ``consensus_bump`` expects."""
    return [
        [_agent_finding("SLP1", severity, section, issue)],
        [_agent_finding("ILL1", severity, section, issue)],
        [_agent_finding("SHL1", severity, section, issue)],
        [_agent_finding("HUM1", severity, section, issue)],
    ]


# ---------------------------------------------------------------------------
# Four-of-four consensus (N=4) — bump path
# ---------------------------------------------------------------------------


def test_four_agents_low_bumps():
    """All four personas at low -> implementation bumps by N-1=3 to critical.

    Spec target was medium (one-tier bump); see end-of-run gap note.
    """
    consolidated = consensus_bump(_four_personas_same("low"))
    assert len(consolidated) == 1
    f = consolidated[0]
    # Actual behaviour: low + 3 levels = critical.
    assert f["severity"] == "critical"
    assert f["consensus_bumped_from"] == "low"


def test_four_agents_medium_bumps():
    """All four at medium -> implementation bumps by 3 to critical (cap).

    Spec target was high; see gap note.
    """
    consolidated = consensus_bump(_four_personas_same("medium"))
    assert len(consolidated) == 1
    f = consolidated[0]
    # Actual behaviour: medium + 3 levels capped at critical.
    assert f["severity"] == "critical"
    assert f["consensus_bumped_from"] == "medium"


def test_four_agents_high_bumps_to_critical():
    """All four at high -> critical. Matches the spec (high -> critical)."""
    consolidated = consensus_bump(_four_personas_same("high"))
    assert len(consolidated) == 1
    f = consolidated[0]
    assert f["severity"] == "critical"
    assert f["consensus_bumped_from"] == "high"


def test_four_agents_critical_stays_critical():
    """Cap rule: a finding already at critical cannot go above critical."""
    consolidated = consensus_bump(_four_personas_same("critical"))
    assert len(consolidated) == 1
    f = consolidated[0]
    assert f["severity"] == "critical"
    # No bump happened — base was already critical, so no
    # ``consensus_bumped_from`` annotation is added by the aggregator.
    assert "consensus_bumped_from" not in f


# ---------------------------------------------------------------------------
# Three-of-four agreement
# ---------------------------------------------------------------------------


def test_three_of_four_agree_partial_bucket():
    """Only 3 personas flag the same span; the 4th flags a *different*
    section/issue. The 3-agent bucket bumps by 2 (actual N-1 behaviour);
    the lone finding bumps by 0. Spec says N<=3 -> no bump; documented gap.
    """
    a1 = [_agent_finding("SLP1", "medium", "intro", "Phrasing is awkward here.")]
    a2 = [_agent_finding("ILL1", "medium", "intro", "Phrasing is awkward here.")]
    a3 = [_agent_finding("SHL1", "medium", "intro", "Phrasing is awkward here.")]
    # Fourth persona flags an unrelated issue in a different section.
    a4 = [_agent_finding("HUM1", "low", "body", "Unrelated humane-signal hit.")]

    consolidated = consensus_bump([a1, a2, a3, a4])
    assert len(consolidated) == 2

    by_section = {f["section"]: f for f in consolidated}
    assert set(by_section) == {"intro", "body"}

    # Three-agent bucket: medium + 2 levels = critical (actual N-1 logic).
    intro = by_section["intro"]
    assert intro["severity"] == "critical"
    assert intro["consensus_bumped_from"] == "medium"

    # Lone finding: no bucket-mates, no bump.
    body = by_section["body"]
    assert body["severity"] == "low"
    assert "consensus_bumped_from" not in body
