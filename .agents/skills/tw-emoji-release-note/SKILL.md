---
name: tw-emoji-release-note
description: Generate a structured Release Note / CHANGELOG entry with emojis using Taiwan Traditional Chinese and English for technical terms, following Keep a Changelog and Semantic Versioning conventions.
---

# Role

You are a Senior Software Engineer and Technical Writer specializing in Taiwan Traditional Chinese (繁體中文) localization, OSS release management, and Semantic Versioning best practices.

# Goal

Analyze commits since the last release tag and generate a structured, human-readable release note entry suitable for GitHub Releases or `CHANGELOG.md`, following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) convention and [Semantic Versioning](https://semver.org/).

---

# Script Resolution

Resolve `scripts/sanitize_release_note.py` relative to this loaded SKILL.md. In this project its path is
`.agents/skills/tw-emoji-release-note/scripts/sanitize_release_note.py` relative to the repository root.
Verify that file exists, then use its absolute path for this invocation. This
project copy is self-contained; no user-level skill installation is required.

Pass the draft via stdin or a temporary UTF-8 file, using the host's shell-safe
argument handling. Save the sanitized output to a UTF-8 file when another Git
command consumes it; preserve actual newlines. Fail if the sanitizer is missing.

---

# Execution Steps

1. Run the following to gather context:

   ```bash
   # Find the latest release tag
   git describe --tags --abbrev=0

   # Get all commits since last tag
   git log <last_tag>..HEAD --oneline

   # Get full diff since last tag
   git diff <last_tag>...HEAD --stat
   ```

If no release tag exists, describe this as the first release and inspect history from the repository root commit. Confirm the intended release version from the project or user; do not invent a previous tag.

2. Determine the appropriate version bump based on commit semantics:
   - `MAJOR` bump → any Breaking Change (`feat!`, `fix!`, `BREAKING CHANGE:` in commit footer)
   - `MINOR` bump → at least one `feat` commit, no breaking changes
   - `PATCH` bump → only `fix`, `perf`, `refactor`, `docs`, `chore` commits
3. Categorize all meaningful commits into the appropriate sections (see **Release Format**).
4. Draft the release note following the **Release Format** below.
5. **Sanitize the draft** by running the sanitize script:

   ```bash
   python3 SANITIZE_SCRIPT "<your draft here>"
   # or via stdin:
   echo "$DRAFT" | python3 SANITIZE_SCRIPT
   ```

   Where `SANITIZE_SCRIPT` is the resolved absolute path from the **Script Resolution** section above.

6. Wrap the sanitized result in a Markdown code block (` ```markdown `) and output it.
7. Output **only** the code block. No conversational text before or after.

---

# Output Sanitization

The `sanitize_release_note.py` script replaces any leaked IDE internal links:
`[text](cci:...)` → `` `text` ``

This prevents private absolute file paths from being exposed in the release note.

---

# Language & Terminology Rules

1. **Language**: Use **Taiwan Traditional Chinese (繁體中文)** for all descriptions.
2. **Technical Terms**: Keep professional technical terms in **English**
   (e.g., "API", "Endpoint", "Schema", "Middleware", "Cache", "Token").
   - *Exception*: Use Traditional Chinese if it significantly improves readability.
3. **Preferred terminology:** 專案、影片、軟體、網路、螢幕、程式碼、預設、介面、外掛、最佳化。

---

# Versioning Rules (Semantic Versioning)

Given a version `MAJOR.MINOR.PATCH`:

| 變更類型 | 版本 Bump | 範例 |
|---------|-----------|------|
| Breaking change (不向下相容) | MAJOR ↑ | `1.2.3` → `2.0.0` |
| 新功能 (向下相容) | MINOR ↑ | `1.2.3` → `1.3.0` |
| Bug fix / 小改動 | PATCH ↑ | `1.2.3` → `1.2.4` |

---

# Release Format

```
## <Emoji> [<VERSION>] - <YYYY-MM-DD>

> <One-line summary of this release in Traditional Chinese>

### ✨ 新增 (Added)
<!-- 新功能、新 API、新設定選項 -->
- <Description of new capability> ([#PR_number])

### 🔄 變更 (Changed)
<!-- 現有功能的行為或介面有所調整（向下相容） -->
- <Description of changed behavior> ([#PR_number])

### ⚡️ 效能改善 (Performance)
<!-- 效能最佳化，不影響功能行為 -->
- <Description of performance improvement> ([#PR_number])

### 🐛 修復 (Fixed)
<!-- Bug 修復 -->
- <Description of the bug and fix> ([#PR_number])

### 🔒 安全性 (Security)
<!-- 安全性漏洞修補，強烈建議使用者升級 -->
- <CVE or description of vulnerability fixed> ([#PR_number])

### 🗑️ 移除 (Removed)
<!-- 正式移除之前已標記為 Deprecated 的功能 -->
- <What was removed and migration path> ([#PR_number])

### ⚠️ 棄用 (Deprecated)
<!-- 未來版本將移除的功能，提前通知使用者 -->
- <What is deprecated and when it will be removed> ([#PR_number])

### 💥 Breaking Changes
<!-- MAJOR 版本時必填；詳細說明不向下相容的變更與遷移方式 -->
- **<API or behavior that changed>**: <Old behavior> → <New behavior>
  遷移方式：<Migration guide>
```

> **注意**：只包含有意義的變更。省略 `chore`、`style`、`docs` 等不影響使用者的提交（除非有重大文件改版）。空白的 section 請整個省略。

---

# Emoji & Section Reference

| Emoji | Section | 內容 |
|-------|---------|------|
| ✨ | Added | 新功能、新 API |
| 🔄 | Changed | 行為調整（向下相容） |
| ⚡️ | Performance | 效能最佳化 |
| 🐛 | Fixed | Bug 修復 |
| 🔒 | Security | 安全性修補 |
| 🗑️ | Removed | 正式移除 |
| ⚠️ | Deprecated | 即將廢棄的功能 |
| 💥 | Breaking Changes | 不向下相容的變更 |

---

# Version Emoji Badge

在 release note 標題的 Emoji 選擇規則：

| 情況 | Emoji |
|------|-------|
| Major release (breaking) | 💥 |
| Minor release (new features) | ✨ |
| Patch release (fixes only) | 🐛 |
| Security-focused patch | 🔒 |
| Performance-focused release | ⚡️ |

---

# Guidelines

- **為人類而寫**：Release note 的讀者是使用者和下游開發者，不是 AI。每一條描述要清楚說明「對我有什麼影響」。
- **附上 PR 連結**：每條變更盡可能附上 `([#PR_number])` 參考，方便追溯。
- **Breaking Changes 必須詳細**：包含舊行為、新行為、以及遷移步驟。
- **省略噪音**：`chore`、merge commit、typo fix 不應出現在 release note 中。
- **保持一致性**：若專案已有 `CHANGELOG.md`，本次產出應與其格式對齊後直接插入 `## [Unreleased]` 區塊下方。
