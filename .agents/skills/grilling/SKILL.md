---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** contains decisions whose prerequisites are settled. Ask a manageable group of independent questions, numbered with a recommendation for each; retain the rest for later rounds. Use the user's preferred pace. Wait for answers before work that depends on them.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job. Read known files directly; delegate a bounded investigation when it can run independently alongside useful local work. A running investigation is an unsettled prerequisite: ask unrelated questions while it runs, and hold questions that depend on its result. The _decisions_ are the user's: put unresolved material choices to them and wait. Reuse facts and approvals already established unless new evidence changes them.

The session is done when the agreed scope, constraints, acceptance criteria and material trade-offs are settled; record explicitly deferred branches rather than inventing requirements for them. Summarize the shared understanding for the user's confirmation before implementation. Once they confirm it and authorize the work, proceed without repeating that confirmation.
