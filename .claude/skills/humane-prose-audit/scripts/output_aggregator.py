#!/usr/bin/env python3
"""Consolidate humane-prose-audit phase outputs into a single audit-report.json.

Reads ``<run_dir>/preflight/*.json`` (required), ``<run_dir>/agents/*.json``
(optional sub-agent JSON sidecars), and ``<run_dir>/fuzz/fuzz-report.json``
(optional) and emits a single JSON document conforming to
``humane-prose-audit/schemas/audit-report.schema.json``.

Phase 4 (humane-signal scoring) and consensus severity bump are computed
in-process, so the aggregator alone covers everything between the
deterministic preflight phase and the final consolidated report.

CLI:
    python output_aggregator.py <run-dir> [--config PATH] [--validate]

Library:
    from output_aggregator import aggregate, compute_humane_score, \\
        consensus_bump, compute_verdict
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable

import yaml
from jsonschema import Draft7Validator

SKILL_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = SKILL_ROOT / "schemas"
DEFAULT_CONFIG_PATH = SKILL_ROOT / "config.yaml"

SEVERITY_ORDER: tuple[str, ...] = ("low", "medium", "high", "critical")
SEVERITY_RANK: dict[str, int] = {s: i for i, s in enumerate(SEVERITY_ORDER)}

DEFAULT_WEIGHTS: dict[str, float] = {
    "burstiness": 0.3,
    "ai_tells": 0.2,
    "imperative_fog": 0.2,
    "lexical_diversity": 0.15,
    "boilerplate_stamp": 0.15,
}
DEFAULT_THRESHOLD: int = 60


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalize_severity(value: Any) -> str:
    """Return lowercase severity; fall back to ``low`` on anything unknown."""
    if not isinstance(value, str):
        return "low"
    s = value.strip().lower()
    return s if s in SEVERITY_RANK else "low"


def _bump_severity(base: str, levels: int) -> str:
    """Increment ``base`` severity by ``levels``, capped at ``critical``."""
    idx = SEVERITY_RANK.get(base, 0) + max(0, levels)
    idx = min(idx, len(SEVERITY_ORDER) - 1)
    return SEVERITY_ORDER[idx]


def _normalized_fingerprint(section: str, issue: str) -> tuple[str, str]:
    """Section + full normalized issue (lowercased, whitespace-collapsed).

    Phase E audit Lens 1 [High] caught a bucket collision when two genuinely
    different findings shared a long boilerplate prefix in the first 80 chars
    of their issue text. Using the full normalized string instead of a fixed
    prefix removes the false-merge surface without measurably hurting real
    consensus (agents writing about the same finding still phrase it
    similarly enough to collide via the lowercased + whitespace-collapsed
    rule, but novel prose differences past char 80 now disambiguate).
    """
    norm_issue = " ".join((issue or "").lower().split())
    return (section or "", norm_issue)


def _load_default_config() -> dict:
    text = DEFAULT_CONFIG_PATH.read_text(encoding="utf-8")
    return yaml.safe_load(text) or {}


def _load_json_files(directory: Path) -> tuple[list[dict], list[dict]]:
    """Load every ``*.json`` in ``directory``; return (payloads, errors)."""
    payloads: list[dict] = []
    errors: list[dict] = []
    if not directory.is_dir():
        return payloads, errors
    for path in sorted(directory.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append({"source": str(path), "reason": f"unreadable: {exc}"})
            continue
        if not isinstance(data, dict):
            errors.append({"source": str(path), "reason": "not a JSON object"})
            continue
        payloads.append(data)
    return payloads, errors


# ---------------------------------------------------------------------------
# Humane-signal scoring
# ---------------------------------------------------------------------------


def _normalize_burstiness(value: float) -> float:
    return max(0.0, min(1.0, value / 0.45))


def _normalize_ai_tells(value: float) -> float:
    return max(0.0, min(1.0, 1.0 - value / 8.0))


def _normalize_imperative_fog(value: float) -> float:
    return max(0.0, min(1.0, 1.0 - value / 6.0))


def _normalize_lexical_diversity(value: float) -> float:
    return max(0.0, min(1.0, value / 60.0))


def _normalize_boilerplate(value: float) -> float:
    return max(0.0, min(1.0, 1.0 - value / 8.0))


_COMPONENT_RULES: tuple[tuple[str, str, str, callable], ...] = (
    ("burstiness", "burstiness", "burstiness", _normalize_burstiness),
    ("ai_tells", "ai_tells", "vocab_density_per_kchar", _normalize_ai_tells),
    ("imperative_fog", "imperative_fog", "density_per_kchar", _normalize_imperative_fog),
    ("lexical_diversity", "lexical_diversity", "mtld", _normalize_lexical_diversity),
    (
        "boilerplate_stamp",
        "discourse_marker_density",
        "density_per_kchar",
        _normalize_boilerplate,
    ),
)


def _band_for_score(score: int) -> str:
    if score < 40:
        return "low"
    if score < 70:
        return "mid"
    return "high"


def _resolve_weights(config: dict) -> tuple[dict[str, float], bool]:
    """Pull weights from ``config['humane_signal']['weights']``; normalize if needed.

    Returns (weights, normalized_flag).
    """
    raw = (config.get("humane_signal", {}) or {}).get("weights") or {}
    weights = dict(DEFAULT_WEIGHTS)
    for k in weights:
        if k in raw:
            try:
                weights[k] = float(raw[k])
            except (TypeError, ValueError):
                pass
    total = sum(weights.values())
    if total <= 0:
        # Pathological case: fall back to defaults.
        return dict(DEFAULT_WEIGHTS), False
    normalized = False
    if abs(total - 1.0) > 0.001:
        weights = {k: v / total for k, v in weights.items()}
        normalized = True
    return weights, normalized


def _resolve_threshold(config: dict) -> int:
    raw = (config.get("humane_signal", {}) or {}).get("threshold")
    if isinstance(raw, (int, float)) and 0 <= raw <= 100:
        return int(raw)
    return DEFAULT_THRESHOLD


def compute_humane_score(preflight: list[dict], config: dict) -> dict:
    """Compute the humane-score breakdown for a preflight set.

    See task 5.3 contract for the normalization rules. Missing checks
    contribute a neutral raw=0.5 with source_check 'missing:<name>'.
    """
    weights, normalized_flag = _resolve_weights(config)
    threshold = _resolve_threshold(config)

    by_check: dict[str, dict] = {}
    for entry in preflight:
        name = entry.get("check")
        if isinstance(name, str):
            by_check[name] = entry

    components: dict[str, dict] = {}
    total = 0.0
    for component_name, check_name, metadata_key, normalizer in _COMPONENT_RULES:
        entry = by_check.get(check_name)
        weight = float(weights.get(component_name, 0.0))
        if entry is None:
            raw = 0.5
            source = f"missing:{check_name}"
        else:
            metadata = entry.get("metadata") or {}
            value = metadata.get(metadata_key)
            if isinstance(value, (int, float)):
                raw = float(normalizer(float(value)))
                source = check_name
            else:
                raw = 0.5
                source = f"missing:{check_name}"
        contribution = weight * raw
        total += contribution
        components[component_name] = {
            "weight": round(weight, 6),
            "raw": round(raw, 6),
            "contribution": round(contribution, 6),
            "source_check": source,
        }

    score = int(round(100 * total))
    score = max(0, min(100, score))
    band = _band_for_score(score)
    if band == "low":
        annotation = (
            f"WARN: low humane signal (score={score}, threshold={threshold})"
        )
    else:
        annotation = ""

    payload: dict[str, Any] = {
        "score": score,
        "band": band,
        "threshold": int(threshold),
        "components": components,
        "annotation": annotation,
    }
    if normalized_flag:
        # Stash a note on the burstiness component since the schema only
        # allows known component keys at the top level. source_check is the
        # one free-form string we own per component.
        payload["components"]["burstiness"]["source_check"] = (
            payload["components"]["burstiness"]["source_check"]
            + ";weights_normalized=true"
        )
    return payload


# ---------------------------------------------------------------------------
# Consensus severity bump
# ---------------------------------------------------------------------------


def consensus_bump(agent_findings: list[list[dict]]) -> list[dict]:
    """Consolidate per-agent findings; bump severity by N-1 levels."""
    # bucket[(section, normalized_issue)] = list of (agent_idx, finding)
    buckets: dict[tuple[str, str], list[tuple[int, dict]]] = {}
    for agent_idx, findings in enumerate(agent_findings):
        for f in findings or []:
            section = str(f.get("section", "") or "")
            issue = str(f.get("issue", "") or "")
            key = _normalized_fingerprint(section, issue)
            buckets.setdefault(key, []).append((agent_idx, f))

    consolidated: list[dict] = []
    for (section, _norm), members in buckets.items():
        n = len(members)
        # Lowest-common severity = the minimum rank across members.
        severities = [_normalize_severity(m[1].get("severity")) for m in members]
        base_idx = min(SEVERITY_RANK[s] for s in severities)
        base = SEVERITY_ORDER[base_idx]
        bumped = _bump_severity(base, n - 1)
        first_finding = members[0][1]
        # Build source from agent metadata if available; fall back to id.
        agent_name = first_finding.get("_agent")
        fid = first_finding.get("id", "")
        if agent_name:
            source = f"agent:{agent_name}:{fid}" if fid else f"agent:{agent_name}"
        else:
            source = f"agent:{fid}" if fid else "agent:unknown"
        wiki_refs: list[str] = []
        seen: set[str] = set()
        for _idx, m in members:
            for ref in m.get("wiki_refs", []) or []:
                if isinstance(ref, str) and ref not in seen:
                    seen.add(ref)
                    wiki_refs.append(ref)

        entry: dict[str, Any] = {
            "severity": bumped,
            "section": section,
            "issue": str(first_finding.get("issue", "")),
            "source": source,
        }
        recommendation = first_finding.get("recommendation")
        if isinstance(recommendation, str) and recommendation:
            entry["recommendation"] = recommendation
        evidence = first_finding.get("evidence")
        if isinstance(evidence, str) and evidence:
            entry["evidence"] = evidence
        if wiki_refs:
            entry["wiki_refs"] = wiki_refs
        if bumped != base:
            entry["consensus_bumped_from"] = base
        consolidated.append(entry)

    # Stable order: by descending severity then section name.
    consolidated.sort(
        key=lambda f: (-SEVERITY_RANK[f["severity"]], f["section"], f["issue"])
    )
    return consolidated


# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------


def compute_verdict(consolidated_findings: list[dict]) -> str:
    """Strict severity-count rule (see spec.md > Requirement: Consolidated …)."""
    has_critical = False
    has_high = False
    for f in consolidated_findings:
        sev = _normalize_severity(f.get("severity"))
        if sev == "critical":
            has_critical = True
        elif sev == "high":
            has_high = True
    if has_critical:
        return "FAIL"
    if has_high:
        return "WARN"
    return "PASS"


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _check_findings_to_consolidated(entry: dict) -> list[dict]:
    """Lift each check finding into a consolidated_finding shape."""
    out: list[dict] = []
    check_name = entry.get("check", "unknown")
    for f in entry.get("findings", []) or []:
        if not isinstance(f, dict):
            continue
        sev = _normalize_severity(f.get("severity"))
        section = str(f.get("section", "") or "")
        issue = str(f.get("issue", "") or "")
        if not issue:
            # Schema requires minLength 1; skip silently — check author's fault.
            continue
        item: dict[str, Any] = {
            "severity": sev,
            "section": section,
            "issue": issue,
            "source": f"check:{check_name}",
        }
        evidence = f.get("evidence")
        if isinstance(evidence, str) and evidence:
            item["evidence"] = evidence
        wiki_refs = f.get("wiki_refs") or []
        if isinstance(wiki_refs, list) and wiki_refs:
            item["wiki_refs"] = [str(r) for r in wiki_refs if isinstance(r, str)]
        out.append(item)
    return out


def _agent_findings_for_bump(agents: list[dict]) -> list[list[dict]]:
    """Flatten each agent payload into a list-of-finding-lists for bumping."""
    grouped: list[list[dict]] = []
    for agent in agents:
        name = agent.get("agent", "unknown")
        items: list[dict] = []
        for f in agent.get("findings", []) or []:
            if not isinstance(f, dict):
                continue
            sev = _normalize_severity(f.get("severity"))
            item = dict(f)
            item["severity"] = sev
            item["_agent"] = name
            items.append(item)
        grouped.append(items)
    return grouped


def _summary(findings: list[dict]) -> dict[str, int]:
    summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        sev = _normalize_severity(f.get("severity"))
        summary[sev] = summary.get(sev, 0) + 1
    return summary


def aggregate(run_dir: Path, config: dict | None = None) -> dict:
    """Assemble an audit-report.json-shaped dict from a run directory."""
    run_dir = Path(run_dir)
    if config is None:
        config = _load_default_config()

    errored: list[dict] = []

    preflight, pre_errors = _load_json_files(run_dir / "preflight")
    errored.extend(pre_errors)

    agents, agent_errors = _load_json_files(run_dir / "agents")
    errored.extend(agent_errors)

    fuzz_path = run_dir / "fuzz" / "fuzz-report.json"
    fuzz_payload: dict[str, Any] = {}
    if fuzz_path.is_file():
        try:
            loaded = json.loads(fuzz_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                fuzz_payload = loaded
            else:
                errored.append({"source": str(fuzz_path), "reason": "not a JSON object"})
        except (OSError, json.JSONDecodeError) as exc:
            errored.append({"source": str(fuzz_path), "reason": f"unreadable: {exc}"})

    # Lift preflight findings into consolidated shape.
    consolidated: list[dict] = []
    for entry in preflight:
        consolidated.extend(_check_findings_to_consolidated(entry))

    # Apply consensus bump on agent findings.
    bumped = consensus_bump(_agent_findings_for_bump(agents))
    consolidated.extend(bumped)

    # Stable order: by descending severity then section then issue.
    consolidated.sort(
        key=lambda f: (-SEVERITY_RANK[_normalize_severity(f["severity"])], f["section"], f["issue"])
    )

    # Humane-signal scoring.
    score_block = compute_humane_score(preflight, config)

    verdict = compute_verdict(consolidated)
    summary = _summary(consolidated)

    phases: dict[str, Any] = {
        "preflight": {
            "checks": [c.get("check", "unknown") for c in preflight],
            "finding_count": sum(len(c.get("findings", []) or []) for c in preflight),
        },
        "agents": {
            "agents": [a.get("agent", "unknown") for a in agents],
            "finding_count": sum(len(a.get("findings", []) or []) for a in agents),
        },
        "fuzz": fuzz_payload or {"present": False},
        "humane_scoring": score_block,
    }

    report: dict[str, Any] = {
        "verdict": verdict,
        "humane_score": score_block["score"],
        "humane_band": score_block["band"],
        "summary": summary,
        "findings": consolidated,
        "phases": phases,
    }
    if errored:
        report["errored_outputs"] = errored

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _validate_report(report: dict) -> list[str]:
    schema = json.loads((SCHEMA_DIR / "audit-report.schema.json").read_text())
    validator = Draft7Validator(schema)
    return [
        f"{'/'.join(str(p) for p in err.absolute_path) or '<root>'}: {err.message}"
        for err in sorted(validator.iter_errors(report), key=lambda e: list(e.absolute_path))
    ]


def _load_config_file(path: Path | None) -> dict:
    if path is None:
        return _load_default_config()
    text = Path(path).read_text(encoding="utf-8")
    return yaml.safe_load(text) or {}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Aggregate humane-prose-audit phase outputs into audit-report.json"
    )
    parser.add_argument("run_dir", type=Path, help="Directory containing preflight/, agents/, fuzz/.")
    parser.add_argument(
        "--config",
        type=Path,
        default=None,
        help="Override config file (default = skill config.yaml).",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Run the result through audit-report.schema.json before printing.",
    )
    args = parser.parse_args(argv)

    config = _load_config_file(args.config)
    report = aggregate(args.run_dir, config=config)
    if args.validate:
        errors = _validate_report(report)
        if errors:
            for line in errors:
                print(line, file=sys.stderr)
            return 1
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
