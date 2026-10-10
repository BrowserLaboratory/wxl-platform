# Attack log export format, version 2

An export contains `schemaVersion`, `policy`, `meta`, `challenge`, `session`, `traces`, and `integrity`. JSON is UTF-8. Markdown contains the identical logical package as a fenced JSON block, with an escaped title and a brief summary. A JSON export can be imported back from the page of the challenge it belongs to; Markdown cannot.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Integer `1` or `2`; reject other versions. Version 1 has no `traces` field, which is not the same as an empty one: it can say nothing about activity rather than reporting none |
| `policy.mode` | `full` or `thinned` |
| `policy.omittedResponseBodies`, `policy.omittedPanelViews` | Nonnegative integer counts of omissions; both zero for full |
| `meta.timezone`, `meta.exportedAt` | IANA timezone and export date with UTC offset |
| `meta.systemPrompt` | Present only for solved sessions, including a solved timestamp of zero |
| `meta.identity` | Optional `name` and `className`; no authentication meaning |
| `challenge` | Slug, title and available challenge description/difficulty/category/backend |
| `session` | `sessionId`, `startedAt`, nullable `solvedAt`, ordered `events`, nullable `draft` |
| `session.draft` | Unexecuted stored code with `code` and `updatedAt`, or null if absent/unreadable |
| `traces` | Version 2 only. Activity recorded for this challenge **before** this export, each entry carrying `id`, `challengeSlug`, `at` and a `kind` of `exported`, `imported` or `removed` with that kind's own fields. Never the content of what was exported, imported or removed |
| `integrity.algorithm` | `SHA-256` |
| `integrity.eventHashes` | One lowercase hex digest per exported event, in order |
| `integrity.checksum` | Lowercase hex digest covering the entire package except this field |

## Content policy

Full preserves every event. Thinned removes `responseBody` from recognizable HTTP events and removes recognizable panel-view events. Requests, headers, code, notes, flag attempts and drafts remain. Unknown or malformed carried events remain unchanged, including a response body when the HTTP shape is unrecognized. Counts describe actual omissions, not the number of all HTTP or panel events. The database is not changed.

A recognizable `http_request` has numeric `timestamp`, `id`, `status`, `duration`; `source` is `browser`, `repeater` or `code`; `method`, `url`, `responseBody` are strings; `requestBody` is string or null; `requestHeaders` and `responseHeaders` are arrays of two-string pairs. Additional fields are preserved. A recognizable `panel_view` has numeric `timestamp` and string `panel`. This export policy does not introduce panel-view recording.

Identity removes C0/C1 controls and Unicode directional controls U+202A–U+202E and U+2066–U+2069, trims whitespace, and takes the first forty Unicode code points. Empty fields are omitted. Identity is transient: it is not written to the database. Filename components replace path separators, platform-reserved characters and controls; identity is optional. The filename ends in the export time, mode, and `.json` or `.md`.

## Integrity algorithm

1. Snapshot the source before asynchronous hashing and apply the selected content policy.
2. Canonicalize JSON recursively: object keys sort lexicographically by UTF-16 code units; arrays keep their order; strings, booleans, null and finite numbers use JavaScript `JSON.stringify` encoding. There is no whitespace between tokens. Undefined and non-JSON values are invalid.
3. Let `H(value)` be SHA-256 of the UTF-8 bytes of that canonical JSON, encoded as lowercase hexadecimal. Start `previousHash` at sixty-four ASCII `0` characters.
4. For each exported event at zero-based `index`, calculate `H({index, previousHash, event})`, append it to `eventHashes`, and use it as the next `previousHash`. An empty timeline has an empty hash array.
5. Set `integrity.algorithm` and `integrity.eventHashes`. Compute the checksum over the complete package without `integrity.checksum`. Every other field, including identity and omission counts, is covered.

The canonical form of `{"z":[2,1],"a":"台灣"}` is `{"a":"台灣","z":[2,1]}`. Implementations must use the specified JSON number and string encoding; arbitrary language-specific JSON serializers may differ. The repository's `attackLogExport.test.ts` compares Web Crypto hashes with Node's independent SHA-256 implementation.

Verification first validates the version, required shape and policy, recomputes the event chain, and then recomputes the checksum. A failed check rejects the package. A successful check means internal consistency only: anyone who edits the file can recompute all hashes. These hashes cannot prove authorship, uninterrupted recording, or the authenticity of an imported record. `traces` is covered by the checksum but not by the event chain, which describes events.

A package never contains the trace describing the export that produced it: that trace is written after the package is built, because a package cannot contain a record of itself and still match its own checksum. An empty or absent `traces` list is therefore not evidence that nothing happened — clearing all stored work on a device removes its traces, and version 1 packages have no such field. For Markdown, extract the fenced JSON and verify that logical package; changing the surrounding Markdown is outside checksum coverage.
