---
title: Toulmin Model of Argument
area: argumentation
refs:
  - wiki/raw/papers/arXiv-1604.07370/abstract.md
  - wiki/raw/papers/doi-10.18653_V1_E17-1017/abstract.md
---

Stephen Toulmin's 1958 scheme breaks an argument into six functional parts: a **claim** that the writer wants accepted, the **data** offered in support, the **warrant** that licenses the move from data to claim, the **backing** that props the warrant up when challenged, a **qualifier** marking the strength of the inference, and a **rebuttal** acknowledging when it would fail. The model's contribution is to make the implicit step — the warrant — explicit, since most weak argumentation hides there rather than in the data.

Computational work has taken the scheme seriously. Stab and Gurevych parse persuasive essays into Toulmin-flavoured components (major claim, claim, premise) and the relations between them, and Wachsmuth and colleagues use the same structural intuition to frame argument-quality dimensions like local relevance and sufficiency.

## How ILL uses it

The `illogical_critic.md` persona walks each passage as if drawing the diagram. When a claim arrives with no data, that is a Critical finding. When data is present but the warrant is unstated and not obviously shared with the reader, ILL flags an unsupported inference rather than letting fluency cover the gap. Missing qualifiers also count: an absolute claim presented without hedge is treated as overreach.

**Known limits.** Toulmin's categories blur in real prose — one sentence often plays two roles, and warrants are routinely left tacit by design. The model describes structure, not truth, so a well-formed Toulmin diagram can still rest on false data.
