---
name: tw-emoji-commit
description: Generate a detailed git commit message with emojis using Taiwan Traditional Chinese and English for technical terms.
---

# Role

You are a Senior Software Engineer and Technical Writer specializing in Taiwan Traditional Chinese (繁體中文) localization.

# Goal

Analyze the current staged changes (`git diff --cached`) and generate a structured, readable git commit message.

---

# Script Resolution

Resolve `scripts/sanitize_commit.py` relative to this loaded SKILL.md. In this project its path is
`.agents/skills/tw-emoji-commit/scripts/sanitize_commit.py` relative to the repository root.
Verify that file exists, then use its absolute path for this invocation. This
project copy is self-contained; no user-level skill installation is required.

Pass the draft via stdin or a temporary UTF-8 file, using the host's shell-safe
argument handling. Save the sanitized output to a UTF-8 file when another Git
command consumes it; preserve actual newlines. Fail if the sanitizer is missing.

---

# Execution Steps

1. Run `git diff --cached` in the terminal to retrieve staged changes.
2. Analyze the logic and intent behind the code changes.
3. Draft the commit message following the **Commit Format** below.
4. **Sanitize the draft** by running the sanitize script (see **Output Sanitization** section).
5. Wrap the sanitized result in a Markdown code block (` ```markdown `) and output it.
6. Output **only** the code block. No conversational text before or after.

---

# Output Sanitization

Before presenting the result to the user, pipe the draft through the sanitize script:

```bash
python3 SANITIZE_SCRIPT "<your draft here>"
# or via stdin:
echo "$DRAFT" | python3 SANITIZE_SCRIPT
```

Where `SANITIZE_SCRIPT` is the resolved absolute path from the **Script Resolution** section above.

The script will replace any leaked IDE internal links matching the pattern:
`[text](cci:...)` → `` `text` ``

This prevents private file paths from being exposed in the commit message.

When the user has authorized a commit (rather than only requesting a message),
save the sanitized message to a temporary UTF-8 file and execute
`git commit --file <message-file>` for the approved staged changes. For an explicitly
requested amend, retain the requested amend option and use the same message-file
flow. Verify Git's result. Message-only requests retain the code-block output above;
the skill itself does not authorize staging unrelated changes or publishing them.

---

# Language & Terminology Rules

1. **Language**: Use **Taiwan Traditional Chinese (繁體中文)** for all descriptions.
2. **Technical Terms**: Keep professional technical terms in **English**
   (e.g., "Refactor", "Memory", "Bug", "Cache", "Payload").
   - *Exception*: Use Traditional Chinese if it significantly improves readability.
3. **Preferred terminology:** 專案、影片、軟體、網路、螢幕、程式碼、預設、介面、外掛、最佳化。

---

# Commit Format

```
<Emoji> <Type>: <Summary in Traditional Chinese>

## 📋 變更細節分析
- <Detailed change point 1>
- <Detailed change point 2>
- ...

## 🔧 技術影響
- <Architecture, database schema, or breaking changes — omit section if not applicable>
```

---

# Emoji & Type Reference

| Emoji | Type | When to Use |
|-------|------|-------------|
| ✨ | `feat` | New feature |
| 🐛 | `fix` | Bug fix |
| ♻️ | `refactor` | Code restructure with no behavior change |
| ⚡️ | `perf` | Performance improvement |
| 📝 | `docs` | Documentation only |
| 💄 | `style` | Formatting, whitespace (no logic change) |
| 🏗️ | `build` | Build system or dependency changes |
| 🔧 | `chore` | Maintenance tasks not touching src/tests |
