---
profile: research
profile_version: "1.0.0"
schema_version: "1.0.0"
wiki_path: wiki
raw_path: raw
index_path: wiki/index.md
log_path: wiki/log.md
---

## Schema

Project: `wiki`. Wiki follows the shipped `research` profile (v1.0.0) defined by the wiki-schema capability suite.

- Sources live under `raw/` and are immutable.
- Wiki pages live under `wiki/` and are agent-maintained.
- Source pages MUST declare `source_url`, `ingested_at`, `source_type` (one of `paper`, `article`, `book`, `podcast`).
- `wiki/synthesis.md` accumulates cross-source synthesis.
- `wiki/log.md` uses strict format `## [YYYY-MM-DD] <op> | <title>`.

## Ingest

When a new source is dropped into `raw/`, the agent reads it, summarizes the key takeaways, files a source page under `wiki/pages/`, updates `wiki/index.md`, refreshes related entity and concept pages, refines `wiki/synthesis.md`, and appends a strict-format entry to `wiki/log.md`.

## Query

The agent reads `wiki/index.md` first, then drills into relevant pages and `wiki/synthesis.md` to compose answers. Citations link back to source pages.

## Lint

Periodic lint passes detect contradictions across pages, stale claims, orphan pages, missing cross-references, and synthesis gaps.
