// D2 (10): the oldest base version this tool upgrades (traceability.md "Decisions", "Step order"
// row 6). `MINIMUM_BASE_VERSION` is the numeric form `upgrade.mjs`'s own comparison uses;
// `MINIMUM_BASE_VERSION_TEXT` is the one string both message tables print for UP-E10 (S-10: one
// source with the actual check, not a literal "3.0.0" repeated in both tables) -- mirroring
// `git-version.mjs`'s `MINIMUM_GIT_VERSION`/`messages.mjs`'s own `MINIMUM_GIT_VERSION_TEXT` pair.
// Lives in its own module, not in `upgrade.mjs`, so `messages.mjs` (which `upgrade.mjs` already
// imports `upgradeMergeNotImplemented` from) can import this constant without a cycle.

export const MINIMUM_BASE_VERSION = [3, 0, 0]
export const MINIMUM_BASE_VERSION_TEXT = MINIMUM_BASE_VERSION.join('.')
