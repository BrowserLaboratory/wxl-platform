"""Shared dataclass + JSON marshalling helpers for humane-prose-audit outputs.

Single source of truth for the on-disk JSON schemas in
`humane-prose-audit/schemas/*.schema.json`. Checks, agents, and the
aggregator should all build their outputs through these dataclasses so
that:

* the `to_dict()` shape always matches the matching `*.schema.json`
* the `from_dict()` constructor refuses payloads with missing required
  fields or wrong types
* `validate()` runs the on-disk schema via `jsonschema.Draft7Validator`
  and returns a list of JSON-pointer-style error paths (empty list means
  the dict is valid)

Only `Finding / CheckOutput / AgentFinding / AgentOutput` are modelled in
this revision; `AuditReport`, `ConsolidatedFinding`, `HumaneScore`, and
`ProjectConfig` will land in later refactor phases.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, fields
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal, Mapping

from jsonschema import Draft7Validator


SCHEMA_DIR = Path(__file__).resolve().parents[2] / "schemas"

Severity = Literal["critical", "high", "medium", "low"]
AgentName = Literal["sloppy", "illogical", "shallow", "humanity"]

SEVERITY_VALUES = ("critical", "high", "medium", "low")
AGENT_VALUES = ("sloppy", "illogical", "shallow", "humanity")


def _expect_enum(value: Any, allowed: tuple[str, ...], owner: str, field_name: str) -> None:
    if value not in allowed:
        raise ValueError(
            f"{owner}.from_dict: field '{field_name}' value {value!r} not in {allowed}"
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


@lru_cache(maxsize=None)
def _load_schema(name: str) -> dict[str, Any]:
    """Load and cache the named schema (without the .schema.json suffix)."""
    path = SCHEMA_DIR / f"{name}.schema.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_with(schema_name: str, payload: dict[str, Any]) -> list[str]:
    """Return a list of slash-joined JSON paths describing each error.

    Empty list means the payload is valid.
    """
    validator = Draft7Validator(_load_schema(schema_name))
    errors: list[str] = []
    for err in validator.iter_errors(payload):
        path = "/".join(str(p) for p in err.absolute_path)
        errors.append(f"{path}: {err.message}" if path else err.message)
    return errors


def _require(data: Mapping[str, Any], keys: tuple[str, ...], owner: str) -> None:
    missing = [k for k in keys if k not in data]
    if missing:
        raise ValueError(
            f"{owner}.from_dict: missing required field(s): {', '.join(missing)}"
        )


def _expect_type(value: Any, expected: type | tuple[type, ...], owner: str, field_name: str) -> None:
    if not isinstance(value, expected):
        names = expected.__name__ if isinstance(expected, type) else "/".join(t.__name__ for t in expected)
        raise ValueError(
            f"{owner}.from_dict: field '{field_name}' expected {names}, got {type(value).__name__}"
        )


# ---------------------------------------------------------------------------
# Finding / CheckOutput
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Finding:
    severity: Severity
    section: str
    issue: str
    evidence: str
    wiki_refs: tuple[str, ...] = ()
    metadata: Mapping[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "severity": self.severity,
            "section": self.section,
            "issue": self.issue,
            "evidence": self.evidence,
        }
        if self.wiki_refs:
            out["wiki_refs"] = list(self.wiki_refs)
        if self.metadata is not None:
            out["metadata"] = dict(self.metadata)
        return out

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Finding":
        _require(data, ("severity", "section", "issue", "evidence"), cls.__name__)
        _expect_type(data["severity"], str, cls.__name__, "severity")
        _expect_enum(data["severity"], SEVERITY_VALUES, cls.__name__, "severity")
        _expect_type(data["section"], str, cls.__name__, "section")
        _expect_type(data["issue"], str, cls.__name__, "issue")
        _expect_type(data["evidence"], str, cls.__name__, "evidence")
        wiki_refs = data.get("wiki_refs", ())
        if wiki_refs:
            _expect_type(wiki_refs, (list, tuple), cls.__name__, "wiki_refs")
        metadata = data.get("metadata")
        if metadata is not None:
            _expect_type(metadata, dict, cls.__name__, "metadata")
        return cls(
            severity=data["severity"],  # type: ignore[arg-type]
            section=data["section"],
            issue=data["issue"],
            evidence=data["evidence"],
            wiki_refs=tuple(wiki_refs) if wiki_refs else (),
            metadata=dict(metadata) if metadata is not None else None,
        )


@dataclass(frozen=True)
class CheckOutput:
    check: str
    target: str
    findings: tuple[Finding, ...] = ()
    metadata: Mapping[str, Any] | None = None
    nondeterministic: bool = False

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "check": self.check,
            "target": self.target,
            "findings": [f.to_dict() for f in self.findings],
        }
        if self.metadata is not None:
            out["metadata"] = dict(self.metadata)
        if self.nondeterministic:
            out["nondeterministic"] = True
        return out

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "CheckOutput":
        _require(data, ("check", "target"), cls.__name__)
        _expect_type(data["check"], str, cls.__name__, "check")
        _expect_type(data["target"], str, cls.__name__, "target")
        raw_findings = data.get("findings", [])
        _expect_type(raw_findings, (list, tuple), cls.__name__, "findings")
        findings = tuple(Finding.from_dict(f) for f in raw_findings)
        metadata = data.get("metadata")
        if metadata is not None:
            _expect_type(metadata, dict, cls.__name__, "metadata")
        nondeterministic = data.get("nondeterministic", False)
        _expect_type(nondeterministic, bool, cls.__name__, "nondeterministic")
        return cls(
            check=data["check"],
            target=data["target"],
            findings=findings,
            metadata=dict(metadata) if metadata is not None else None,
            nondeterministic=nondeterministic,
        )

    def validate(self) -> list[str]:
        return _validate_with("check-output", self.to_dict())


# ---------------------------------------------------------------------------
# AgentFinding / AgentOutput
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AgentFinding:
    id: str  # ^(SLP|ILL|SHL|HUM)[0-9]+$
    severity: Severity
    section: str
    issue: str
    recommendation: str
    confidence: float  # 0..1
    evidence: str = ""

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "id": self.id,
            "severity": self.severity,
            "section": self.section,
            "issue": self.issue,
            "recommendation": self.recommendation,
            "confidence": self.confidence,
        }
        if self.evidence:
            out["evidence"] = self.evidence
        return out

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "AgentFinding":
        _require(
            data,
            ("id", "severity", "section", "issue", "recommendation", "confidence"),
            cls.__name__,
        )
        _expect_type(data["id"], str, cls.__name__, "id")
        _expect_type(data["severity"], str, cls.__name__, "severity")
        _expect_enum(data["severity"], SEVERITY_VALUES, cls.__name__, "severity")
        _expect_type(data["section"], str, cls.__name__, "section")
        _expect_type(data["issue"], str, cls.__name__, "issue")
        _expect_type(data["recommendation"], str, cls.__name__, "recommendation")
        _expect_type(data["confidence"], (int, float), cls.__name__, "confidence")
        evidence = data.get("evidence", "")
        _expect_type(evidence, str, cls.__name__, "evidence")
        return cls(
            id=data["id"],
            severity=data["severity"],  # type: ignore[arg-type]
            section=data["section"],
            issue=data["issue"],
            recommendation=data["recommendation"],
            confidence=float(data["confidence"]),
            evidence=evidence,
        )


@dataclass(frozen=True)
class AgentOutput:
    agent: AgentName
    target: str
    findings: tuple[AgentFinding, ...] = ()
    model: str | None = None
    seed: int | None = None
    nondeterministic: bool = False
    metadata: Mapping[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "agent": self.agent,
            "target": self.target,
            "findings": [f.to_dict() for f in self.findings],
        }
        if self.model is not None:
            out["model"] = self.model
        if self.seed is not None:
            out["seed"] = self.seed
        if self.nondeterministic:
            out["nondeterministic"] = True
        if self.metadata is not None:
            out["metadata"] = dict(self.metadata)
        return out

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "AgentOutput":
        _require(data, ("agent", "target"), cls.__name__)
        _expect_type(data["agent"], str, cls.__name__, "agent")
        _expect_enum(data["agent"], AGENT_VALUES, cls.__name__, "agent")
        _expect_type(data["target"], str, cls.__name__, "target")
        raw_findings = data.get("findings", [])
        _expect_type(raw_findings, (list, tuple), cls.__name__, "findings")
        findings = tuple(AgentFinding.from_dict(f) for f in raw_findings)
        model = data.get("model")
        if model is not None:
            _expect_type(model, str, cls.__name__, "model")
        seed = data.get("seed")
        if seed is not None:
            _expect_type(seed, int, cls.__name__, "seed")
        nondeterministic = data.get("nondeterministic", False)
        _expect_type(nondeterministic, bool, cls.__name__, "nondeterministic")
        metadata = data.get("metadata")
        if metadata is not None:
            _expect_type(metadata, dict, cls.__name__, "metadata")
        return cls(
            agent=data["agent"],  # type: ignore[arg-type]
            target=data["target"],
            findings=findings,
            model=model,
            seed=seed,
            nondeterministic=nondeterministic,
            metadata=dict(metadata) if metadata is not None else None,
        )

    def validate(self) -> list[str]:
        return _validate_with("agent-output", self.to_dict())


__all__ = [
    "SCHEMA_DIR",
    "Severity",
    "AgentName",
    "Finding",
    "CheckOutput",
    "AgentFinding",
    "AgentOutput",
]
