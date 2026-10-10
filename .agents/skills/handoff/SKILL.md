---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it as `.proj.handoffs/<YYYY-MM-DD-HHMM>-<slug>.md` at the repository root, creating the directory if it is missing. The directory is gitignored and local to this checkout; to continue on another machine, the user copies the file across.

Open the document with this frontmatter:

```yaml
---
created: 2026-09-27T14:30+08:00  # local time with UTC offset
expires:
  sessions: 1                     # or  at: 2026-10-04T18:00+08:00
sessions_used: 0
---
```

`expires` holds exactly one key: `sessions: N` expires the handoff once N sessions have resumed from it; `at` expires it at that moment. Take the unit and value from the user; when they give none, use `sessions: 1`. A receiving session checks and updates these fields as `docs/agents/runtime.md` describes.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
