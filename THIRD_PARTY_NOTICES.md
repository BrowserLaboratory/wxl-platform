# Third-party notices

This repository's own code and content are licensed under the root ECL-2.0
`LICENSE`. The agent workflow — `docs/agents/`, `docs/adr/0001`–`0003`,
`docs/security/`, `scripts/verify-project.py`, `.claude/agents/`, `.codex/`, and the
skills listed below — comes from [harness-agile](https://github.com/CXPhoenix/harness-agile)
(v0.2.1) under the MIT License reproduced at the end of this file. That grant does
not replace third-party copyright, font, artwork, or trademark terms. Preserve
applicable notices when copying a skill.

## Matt Pocock skills — MIT

Copyright (c) 2026 Matt Pocock. Each of the following project skill directories
contains the complete upstream MIT text in its own LICENSE so an individually
copied skill retains the notice:

- [code-review](.agents/skills/code-review/LICENSE)
- [codebase-design](.agents/skills/codebase-design/LICENSE)
- [diagnosing-bugs](.agents/skills/diagnosing-bugs/LICENSE)
- [domain-modeling](.agents/skills/domain-modeling/LICENSE)
- [grill-me](.agents/skills/grill-me/LICENSE)
- [grill-with-docs](.agents/skills/grill-with-docs/LICENSE)
- [grilling](.agents/skills/grilling/LICENSE)
- [handoff](.agents/skills/handoff/LICENSE)
- [implement](.agents/skills/implement/LICENSE)
- [improve-codebase-architecture](.agents/skills/improve-codebase-architecture/LICENSE)
- [prototype](.agents/skills/prototype/LICENSE)
- [research](.agents/skills/research/LICENSE)
- [resolving-merge-conflicts](.agents/skills/resolving-merge-conflicts/LICENSE)
- [setup-matt-pocock-skills](.agents/skills/setup-matt-pocock-skills/LICENSE)
- [tdd](.agents/skills/tdd/LICENSE)
- [teach](.agents/skills/teach/LICENSE)
- [to-questionnaire](.agents/skills/to-questionnaire/LICENSE)
- [to-spec](.agents/skills/to-spec/LICENSE)
- [to-tickets](.agents/skills/to-tickets/LICENSE)
- [wait-what](.agents/skills/wait-what/LICENSE)
- [wayfinder](.agents/skills/wayfinder/LICENSE)
- [wizard](.agents/skills/wizard/LICENSE)
- [writing-for-agents](.agents/skills/writing-for-agents/LICENSE)

Source: https://github.com/mattpocock/skills . The installer hashes remain in
skills-lock.json; the license verification revision and SHA-256 are recorded in
docs/agents/skill-sources.json. Verification revisions do not imply that locally
adapted skill instructions match upstream HEAD byte for byte.

## agent-browser — Apache-2.0

Source: https://github.com/vercel-labs/agent-browser . The bundled discovery
guidance is an adapted upstream skill, not the browser executable. The full
[Apache-2.0 license](.agents/skills/agent-browser/LICENSE) is included; the modified
SKILL.md carries a change notice. No root NOTICE file was present at the verified
upstream revision. Installing the external CLI separately also subjects that
installation to its own distribution notices.

## i-have-adhd — MIT

Copyright (c) 2026 Ayoub Ghriss. Source: https://github.com/ayghri/i-have-adhd .
The complete [MIT license](.agents/skills/i-have-adhd/LICENSE) is included.
The project retains its existing metadata and instruction differences.

## Archify and security-review

- [Archify MIT license](.agents/skills/archify/LICENSE): Copyright (c) 2026 tt-a1i
  (Archify); Copyright (c) 2025 Cocoon AI.
- [Archify third-party notices](.agents/skills/archify/THIRD_PARTY_NOTICES.md)
  cover brand marks and their individual conditions; they are not all MIT.
  [JetBrains Mono OFL](.agents/skills/archify/assets/JetBrainsMono-OFL.txt) is retained.
- [security-review MIT license](.agents/skills/security-review/LICENSE):
  Copyright (c) 2025 Anthropic; source and pinned revision are in skill-sources.json.

## evidence-report — project adaptation with design-source attribution

Created by the maintainer using Claude Code and copied into this template.
The original session records maintainer approval to embed concise design
principles from local phoenix-design, which identifies
[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) as its source.
Design-source attribution: Copyright (c) 2026 alchaincyf (花叔 · 花生).
The complete upstream [MIT notice](.agents/skills/evidence-report/LICENSE) is
preserved with the skill. Project-authored additions are covered by the harness-agile MIT license.

The session also invoked artifact-design; invocation alone is not recorded as
proof of copying an independently identified external package. No unrelated
same-name repository is attributed as the direct source. Source verification
revisions identify the license checked, not the original local installation.

## Project-authored skills — MIT

On 2026-09-13 the maintainer confirmed that tw-emoji-commit, tw-emoji-pr-note,
tw-emoji-release-note, and init-template were authored by the maintainer using
Claude Code. They are recorded as harness-agile material under its MIT
license. This provenance record is based on the maintainer's explicit confirmation.

## Skills kept from this repository's earlier setup

- [canvas-design](.agents/skills/canvas-design/LICENSE.txt): Apache-2.0, from
  https://github.com/anthropics/skills ; the full license is included with the skill.
- graphify: from https://github.com/graphify-labs/graphify ; installer hash in
  skills-lock.json.
- eli5, and the `wxl-*` challenge skills: authored for this repository.

## harness-agile — MIT License

```
MIT License

Copyright (c) 2026 CXPhoenix

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
