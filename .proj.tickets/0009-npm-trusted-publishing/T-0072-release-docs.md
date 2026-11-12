---
id: T-0072
title: Release document and the other specs' notes
epic: 0009-npm-trusted-publishing
status: todo
blocked_by: [T-0069, T-0070, T-0071]
---

## Context

Spec 0009 writes the release procedure down (D7, U5) and records its changes in the specs and
documents it touches (DS1–DS3). The documents describe the landed code, so this ticket follows the
three code tickets. It adds a test under `create-wxl/test/`, so it is a code ticket and runs RP0.

## Deliverable

- `docs/agents/release.md` meeting R2's line and string checks (RP0–RP7, MN1–MN7, F1–F7), with its
  test in `create-wxl/test/` (0009-S5).
- Lines linking it in `AGENTS.md`'s Reference and `CONTRIBUTE.md`'s Maintainer Setup.
- 0005 revision 2.4 (DS1): spec and traceability, ids prefixed "0009's".
- DS2: 0004's note, both `wxl-fork-init` skills (byte-identical), both READMEs' fork section,
  ADR-0009, 0006's B2, OQ-021, GLOSSARY's 設定紀錄.
- DS3: OQ-027 (created, filled by T-0073) and OQ-028.

## Acceptance criteria

Spec 0009 revision 3.

- [ ] Rows D01, D02 (D02 judged at stage 6 by reading).
- [ ] AC reached: AC-6.
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` prints MR1's object;
  `node scripts/check-publish.mjs` exits 1 with a named check; the PR's CI passes.

## 給使用者（zh-TW）

把發布流程寫成 `docs/agents/release.md`：RP0～RP7、你要做的 MN1～MN7、失敗表 F1～F7，並用測試確認該有的行與字串都在。

同一張票也同步其他文件：
- 0005 改為第 2.4 版；
- 0004、0006、ADR-0009、兩份 fork-init skill、兩份 README、GLOSSARY、OQ-021 加上註記；
- 新增 OQ-027、OQ-028。

## Comments
