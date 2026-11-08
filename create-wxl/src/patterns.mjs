// Shared patterns (moved unchanged from run.mjs): the package source record's version and
// commit shapes, reused by the upgrade path (traceability.md "Command grammar", "Base from
// range.json").

export const VERSION_RE = /^\d+\.\d+\.\d+$/
export const COMMIT_RE = /^[0-9a-f]{40}$/
