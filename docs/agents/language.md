# Language

Which language a document is written in follows from who has to accept it.

## The split

| Document | Language | Why |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `docs/agents/*`, `docs/adr/*` | **English** | Read by agents only |
| `.agents/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md` | **English** | Read by agents only |
| `spec.en.md` | **English** | Source of truth for implementation |
| `spec.zh-TW.md` | **Traditional Chinese** | The user audits the spec in this |
| Ticket body | **English** | Drives implementation |
| Ticket `## 給使用者（zh-TW）` section | **Traditional Chinese** | The user audits intent in this |
| Commit messages, PR descriptions, release notes | **Traditional Chinese** | Produced by `/tw-emoji-*` |
| README, user guides and research for the user | **Traditional Chinese** | Setup and evidence; `README.en.md` is the English companion |
| Standalone HTML reports | **Traditional Chinese** | Written for the user |
| Conversation with the user | **Traditional Chinese** | |

## Traditional Chinese means Taiwan usage

Traditional Chinese output uses Taiwan-conventional vocabulary. Rewrite mainland-Chinese terms into
Taiwan equivalents even when the source material uses them, and keep the English term where Taiwan
practice keeps it (commit, PR, deploy, cache, API, log, debug, seam, epic).

High-frequency substitutions: 軟體 · 硬體 · 網路 · 程式 · 程式碼 · 函式 · 影片 · 品質 · 資訊 ·
使用者 · 預設 · 登入 · 選單 · 螢幕 · 滑鼠 · 硬碟 · 記憶體 · 資料夾 · 透過 · 應用程式 · 介面 ·
變數 · 物件 · 資料庫.

This rule outranks any skill's or subagent's default output language. When a skill returns
mainland-Chinese vocabulary, correct it before it reaches the user.

## Keeping the two spec files in sync

English is the source of truth. The translation is generated, and a generated file that drifts is
worse than no file, so the sync is machine-checkable rather than a matter of discipline.

**Produce the translation once, after adversarial review passes.** The spec changes across review
rounds; translating each round is wasted work.

**Record what it was translated from.** `spec.zh-TW.md` carries:

```yaml
---
synced_from: spec.en.md
synced_from_sha: <git blob hash of spec.en.md at translation time>
---
```

Get the hash with `git hash-object .proj.specs/<epic>/spec.en.md`.

**Check before relying on it.** Before reading `spec.zh-TW.md` as authoritative, or before asking the
user to audit it, recompute the hash. A mismatch means the English spec moved: retranslate and update
`synced_from_sha` first.

**Corrections land in English first.** If the user finds an error while auditing the translation,
fix `spec.en.md`, then regenerate the translation. Fixing only the Chinese file creates two specs
that disagree.

## Why tickets are not dual-file

Tickets change status, gain comments, and gain blocking edges continuously. A parallel translated
file would drift within a day. The single embedded `## 給使用者（zh-TW）` section carries what the
user actually audits — what this ticket does and what "done" looks like — and it lives in the same
file, so it is edited in the same pass.
