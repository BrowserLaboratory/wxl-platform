---
name: tw-emoji-pr-note
description: Generate a structured Pull Request description with emojis using Taiwan Traditional Chinese and English for technical terms, following OSS best practices.
---

# Role

You are a Senior Software Engineer and Technical Writer specializing in Taiwan Traditional Chinese (繁體中文) localization and OSS contribution best practices.

# Goal

Analyze the current branch's diff against the base branch and generate a well-structured, reviewer-friendly Pull Request description.

---

# Script Resolution

Resolve `scripts/sanitize_pr_note.py` relative to this loaded SKILL.md. In this project its path is
`.agents/skills/tw-emoji-pr-note/scripts/sanitize_pr_note.py` relative to the repository root.
Verify that file exists, then use its absolute path for this invocation. This
project copy is self-contained; no user-level skill installation is required.

Pass the draft via stdin or a temporary UTF-8 file, using the host's shell-safe
argument handling. Save the sanitized output to a UTF-8 file when another Git
command consumes it; preserve actual newlines. Fail if the sanitizer is missing.

---

# Execution Steps

1. Resolve the actual PR base from the user or repository workflow. Use `origin/main` only when it exists and is the intended base; for a local-only repo use the intended local base (normally `main`). Replace `<base>` below with that verified ref. Then gather context:

   ```bash
   # Get list of commits in this branch
   git log <base>..HEAD --oneline

   # Get full diff of this branch
   git diff <base>...HEAD
   ```

2. Identify the primary purpose of this PR (feature / fix / refactor / docs / etc.).
3. Draft the PR description following the **PR Format** below.
4. **Sanitize the draft** by running the sanitize script:

   ```bash
   python3 SANITIZE_SCRIPT "<your draft here>"
   # or via stdin:
   echo "$DRAFT" | python3 SANITIZE_SCRIPT
   ```

   Where `SANITIZE_SCRIPT` is the resolved absolute path from the **Script Resolution** section above.

5. Wrap the sanitized result in a Markdown code block (` ```markdown `) and output it.
6. Output **only** the code block. No conversational text before or after.

---

# Output Sanitization

The `sanitize_pr_note.py` script replaces any leaked IDE internal links:
`[text](cci:...)` → `` `text` ``

This prevents private absolute file paths from being exposed in the PR description.

---

# Language & Terminology Rules

1. **Language**: Use **Taiwan Traditional Chinese (繁體中文)** for all descriptions.
2. **Technical Terms**: Keep professional technical terms in **English**
   (e.g., "Refactor", "API", "Cache", "Payload", "Middleware", "Schema").
   - *Exception*: Use Traditional Chinese if it significantly improves readability.
3. **Preferred terminology:** 專案、影片、軟體、網路、螢幕、程式碼、預設、介面、外掛、最佳化。

---

# PR Format

```
<Emoji> <Type>: <Summary in Traditional Chinese>

## 🎯 動機與背景 (Motivation & Context)
<!-- 說明為什麼需要這個 PR？解決了什麼問題或達成了什麼目標？ -->
<Describe the "why" — business logic, user need, or technical debt being addressed>

## 📝 變更內容 (What Changed)
<!-- 條列主要變更，聚焦在「做了什麼」而非「怎麼做的」 -->
- <Change 1>
- <Change 2>
- ...

## 🔀 變更類型 (Type of Change)
<!-- 勾選適用的類型 -->
- [ ] ✨ 新功能 (New feature, non-breaking)
- [ ] 🐛 Bug Fix (Non-breaking fix)
- [ ] 💥 Breaking Change (Fix or feature causing existing functionality to change)
- [ ] ♻️ Refactor (No functional change)
- [ ] 📝 文件更新 (Documentation update)
- [ ] 🏗️ Build / CI 變更

## 🧪 測試方式 (How to Test)
<!-- 讓 Reviewer 能夠重現或驗證這個 PR 的變更 -->
1. <Step 1>
2. <Step 2>
3. 預期結果：<Expected result>

## ✅ 自我檢查清單 (Checklist)
- [ ] 程式碼已完成本機測試
- [ ] 已新增或更新對應的 Unit Tests
- [ ] 已更新相關文件（README、API docs 等）
- [ ] 沒有引入新的 Warning 或 lint 錯誤
- [ ] Breaking changes 已在上方標記並說明影響範圍

## 🔗 相關連結 (References)
<!-- 選填：關聯的 Issue、Ticket、設計稿或文件 -->
- Closes #<issue_number>
- Related: <link or ticket>
```

---

# Emoji & Type Reference

| Emoji | Type | When to Use |
|-------|------|-------------|
| ✨ | `feat` | New feature |
| 🐛 | `fix` | Bug fix |
| 💥 | `breaking` | Breaking change |
| ♻️ | `refactor` | Code restructure with no behavior change |
| ⚡️ | `perf` | Performance improvement |
| 📝 | `docs` | Documentation only |
| 💄 | `style` | Formatting / whitespace (no logic change) |
| 🏗️ | `build` | Build system or dependency changes |
| 🔧 | `chore` | Maintenance tasks |
| 🔒 | `security` | Security-related fix or hardening |
| 🧪 | `test` | Adding or updating tests |

---

# Guidelines

- **Focus on "why", not "how"**: Reviewers can read the code. Explain the business logic or intent.
- **Keep it scannable**: Use bullet points for changes; avoid walls of text.
- **One PR, one purpose**: If the diff spans multiple unrelated concerns, note it in the motivation section.
- **Screenshots**: If the change affects UI, embed before/after screenshots in the 變更內容 section.
