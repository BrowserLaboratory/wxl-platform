---
id: T-0011
title: Keep upstream-only CI upstream, and guard upstream's identity
epic: 0004-stateless-engine
status: review
blocked_by: [T-0010, T-0015]
---

## Context

A range copies upstream's workflows and tests. Today the release job would run in every range, three component tests hardcode the upstream address, and nothing fails if the engine is ever run on upstream. The upstream repository slug must also stay out of anything rebrand mode's tree-wide swap could redirect.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2.1). Round 1 disposition: `review/disposition.md`.

## Deliverable

The fork-init module exports `UPSTREAM_SLUG` and the list of known old template outputs (initially `0cf52f11…7276`), with a verbatim copy of the template at `72327e2` as a test fixture. A new `upstream-guard.test.ts` holds the guard's classification, the upstream decision and the pristine check (fixture-tested everywhere, real-tree runs upstream only), honours `WXL_EXPECT_UPSTREAM`, and pins the current template's hash (T27). The `release` job and a new cross-OS job in quality-gates carry the `format(...)` `if:`; the `test` job and the new job set `WXL_EXPECT_UPSTREAM`. The three component tests read the real `SITE_ORIGIN`. A rebrand run leaves the upstream-only lines and the engine file untouched.

## Acceptance criteria

- [x] T27: known old outputs and the template-hash pin; the fixture copy hashes to the list's first value (S5)
- [x] T44: `UPSTREAM_SLUG` exported (S1)
- [x] T52: `--author x --rebrand acme --repo me/x` leaves the `if:`/`env` lines, `UPSTREAM_SLUG` imports and the engine file byte-identical (S1)
- [x] T61–T64: guard violations, binary files, letter case (S5)
- [x] T65–T66: upstream decision (S5)
- [x] T67–T68: pristine check and field ids (S5)
- [x] T69: real-tree runs only upstream; `WXL_EXPECT_UPSTREAM` contradiction fails (S5)
- [x] T70: component tests from the imported `SITE_ORIGIN` (S6)
- [x] T71–T72: `if:`, `env`, cross-OS matrix and steps (S4)

## 給使用者（zh-TW）

讓上游專用的 CI 只在上游跑，並守住上游的身分：匯出 `UPSTREAM_SLUG` 與舊範本清單；新增 `upstream-guard.test.ts`（slug guard、上游判定、上游原貌檢查、釘住範本 hash）；release job 與新的跨 OS job 加上 `format()` 形式的 `if:`；三支元件測試改讀真正的 `SITE_ORIGIN`。做完後：靶場不會跑上游的 release；有人在上游誤跑引擎，上游 CI 會變紅。

## Comments

### 2026-10-14 — execution order changed by the user

Order: T-0012 → T-0013 → T-0014 → T-0015 → T-0011 → T-0016, each branched from `main` after the previous one merged. T-0014 therefore introduces the engine's list of known old template outputs (initially `0cf52f11…7276`), which T22 and T24 need; T-0011 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml`, the template-hash pin (T27) and the `UPSTREAM_SLUG` export (T44). `blocked_by` of T-0011 gains T-0015.

### 2026-10-14 — test plan table (approved by the user before the first test)

Approved together with these decisions (user, 2026-10-14): the engine may import the `yaml` package and S2 links the repository's `node_modules` (Q1 A); the deploy template is not changed again in this epic (Q2 A); T-0014 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` and T-0011 only pins it (Q3 A); spec and traceability revision 2.1 (end of file is an end of the line, white space after a form is not; an A8 value followed by `;` does not parse; S5 gains the expectation check); and the interpretations listed in each table's notes, with the claim additions below. Where a note says "needs the user's decision", the user's approval of the list settles it as the note recommends.

Changed at approval: T-0014 adds the frozen copy; this ticket pins it (T27) and adds the expectation check to S5 (T69).

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S1 | fork-init 模組匯出 `UPSTREAM_SLUG`，值等於上游 repository slug | `tests/unit/scripts/fork-init.test.ts`，新增 `describe('UPSTREAM_SLUG')`（這支檔在 keep list 上，可以直接寫字面值） | T44 / AC-G1 | 完全相等 `BrowserLaboratory/wxl-platform`，大小寫也要一致 |
| 0004-S1 | `--author x --rebrand acme --repo me/x` 跑在帶有上游專用 CI 的 fixture 上，那幾行和引擎檔都不能動 | `fork-init.test.ts` 的 B mode describe 新增一個 it。fixture 是 `writeFixture` 再放進：真正的 `release.yml`、`quality-gates.yml`、`tests/unit/scripts/upstream-guard.test.ts` 和 `scripts/fork-init.ts` 的複本，只在這個測試裡加 | T52 / AC-B3 | `exitCode` 0；兩個 `if:` 行、兩個 `WXL_EXPECT_UPSTREAM` 行、`import { UPSTREAM_SLUG …` 行前後 byte-identical；引擎檔整檔 byte-identical；正向對照：同一份 `release.yml` 裡的 `wxl-${` 確實被改名，證明 walk 有讀到這個檔 |
| 0004-S5 | guard：上游 slug 出現在兩份清單都沒有的文字檔 → 回報違規（file、line） | `tests/unit/scripts/upstream-guard.test.ts`（新檔），`{ path → content }` fixture map，內容用 `UPSTREAM_SLUG` 組出來 | T61 / AC-G1 | it.each 的路徑：`docs/x.md`、`.github/workflows/x.yml`、`tests/unit/scripts/upstream-guard.test.ts`（不在 keep list）、`.claude/skills/wxl-create/SKILL.md`、`.proj.specs-old/a.md`、`docs/.proj.specs/a.md`、`scripts/fork-init.ts.bak`；行號從 1 起算；同一個檔有好幾處就每處各報一筆 |
| 0004-S5 | guard：rewrite list 上的檔案，slug 出現在它的 anchor form 之外 → 回報違規 | 同上 | T62 / AC-G1 | manifest 的 `description` 或 `name` 含 slug（回報那一行）；README 寫 `https://github.com/<slug>/issues`（不是 A2/A3）；A3 form 後面還接了別的字；CONTRIBUTE 的 A4 後面還接了別的字、A5 少了括號；同一行一個 A2 form 加一個裸 slug；A4 form 出現在 README（A4 只屬於 CONTRIBUTE） |
| 0004-S5 | guard：slug 只出現在 rewrite list 的 anchor 裡和 keep list 的檔案裡，以及含 slug 的 binary 檔 → 不回報 | 同上 | T63 / AC-G1 | 徽章行有兩個 A2；A3/A4 在 CRLF 行尾；A4 前面有縮排；manifest 的三個 A1 URL 欄位；keep list 每一項：`CHANGELOG.md`、`scripts/fork-init.ts`、`tests/unit/scripts/fork-init.test.ts`、兩棵 `wxl-fork-init/SKILL.md`，以及 `.proj.specs/`、`.proj.tickets/` 底下的深層路徑；前 8000 bytes 內有 NUL → 當 binary 不報；NUL 在第 8001 byte 之後 → 當文字照報 |
| 0004-S5 | guard：只差在字母大小寫的 slug 也當成上游 slug | 同上 | T64 / AC-G1 | 全小寫、全大寫、大小寫混合出現在不在清單上的檔 → 違規；大小寫不同的 slug 在 A2 form 裡或 keep list 檔裡 → 不報 |
| 0004-S5 | 上游判定：`GITHUB_REPOSITORY` 有設而且不是空字串時，只看它 | 判定函式，傳入環境值、manifest 和 work-tree flag | T65 / AC-G2 | 等於 `UPSTREAM_SLUG` → 上游；大小寫不同、別的 slug、前後多了空白 → 不是上游；這時 manifest 和 work tree 不影響結果（它是別人的 slug，就算 manifest 是上游、又是 work tree → 不是上游；反過來 → 上游） |
| 0004-S5 | 上游判定：`GITHUB_REPOSITORY` 沒設或是空字串時，看 manifest 和 work tree | 同上 | T66 / AC-G2 | 沒設與 `''` 各測一次；`repository.url` 完全等於上游的而且是 work tree → 上游；不是 work tree → 不是上游；url 大小寫不同、少了 `.git`、`repository` 是字串或不存在 → 不是上游 |
| 0004-S5 | 上游原貌檢查：每個欄位都是上游值 → 沒有 mismatch | 原貌檢查函式，fixture map 用 `UPSTREAM_SLUG` 和 T67 列出的值組成 | T67 / AC-G3 | A7 用 `"WXL"`（有引號，跟真實檔案一樣）；A6 只換引號、值相同 → 仍然沒有 mismatch（比的是值，見 Notes 6）；`version` `3.0.0`；沒有 `deploy.yml` |
| 0004-S5 | 原貌檢查：一次只改一個欄位 → 剛好回報那一個 field id | 同上，it.each 跑 19 個 field id | T68 / AC-G3 | `A6`、`A7:platform/index.md`、`A7:platform/zh-TW/index.md`、`A8`、`A9`（非上游形式；也測兩行）、`base`（沒有這行；也測字面值 `base:`）、`A2:README.md`、`A2:README.en.md`（徽章行兩個 form 只改其中一個）、`A3:README.md`、`A3:README.en.md`、`A4`、`A5`、`repository.url`、`bugs.url`、`homepage`、`license`（`ECL-2.0`）、`author`、`version`（`0.1.0` 要報，`0.1.1` 不報）、`deploy.yml`（存在，內容是 current template output 也要報） |
| 0004-S5 | 範本 hash 釘選：current template 做 LF 正規化後的 SHA-256 等於測試釘住的值，而且不在引擎的清單裡；`deploy-template-72327e2.yml` 的 hash 等於清單的第一個值 | `upstream-guard.test.ts` 中只在上游跑的 describe；真實的 `scripts/templates/deploy.yml.template` 加上新 fixture | T27 / AC-H3 | 清單第一個值是 `0cf52f116082bed48b19462d02b6827123a26cf882a428f841cd6646f73f7276`；把 fixture 轉成 CRLF 再算，hash 不變；失敗訊息或註解要寫明：範本變了，就把釘住的值移進引擎清單，再釘新的值 |
| 0004-S5 | 真實 tree 的 guard：`git ls-files -z` 列出的 tracked 檔案 → 違規清單是空的 | 真實 tree，`describe.runIf(上游判定)` | T69 / AC-G3 | 只有判定為上游才跑；路徑一律用 `/`；binary 依 NUL 規則跳過 |
| 0004-S5 | 真實 tree 的原貌檢查 → 沒有 mismatch | 真實 tree，`describe.runIf(上游判定)` | T69 / AC-G3 | 只有判定為上游才跑 |
| 0004-S5 | `WXL_EXPECT_UPSTREAM` 一致性斷言：有設時，判定結果必須等於 (`WXL_EXPECT_UPSTREAM` 是 `true`) | 真實 tree 的判定；這個 it 放在 runIf 外面 | T69 / AC-G3 | 沒設 → skip；`true`、`false` 兩種；其他值（`TRUE`、`1`）都算「不是 `true`」 |
| 0004-S5 | 命令紀錄：判定與預期矛盾時會失敗，靶場會跳過 | 真實 tree；指令和輸出記在 ticket 裡 | T69 / AC-G3 | 在上游執行 `WXL_EXPECT_UPSTREAM=false pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → exit ≠ 0；`GITHUB_REPOSITORY=someone/else` → 真實 tree 的測試 skip，exit 0；`GITHUB_REPOSITORY=someone/else WXL_EXPECT_UPSTREAM=true` → exit ≠ 0；`GITHUB_REPOSITORY=<上游 slug> WXL_EXPECT_UPSTREAM=true` → exit 0 |
| 0004-S6 | ShortLinkShare 的預期值改由 import 進來的 `SITE_ORIGIN` 組出來（覆寫既有測試，清單見 Notes 1） | `tests/unit/components/ShortLinkShare.test.ts`，四個既有 it 只換預期字串 | T70 / AC-C1 | en 與 zh-TW（`/zh/c/`）；編號 1、42、1234；顯示值 = `SITE_ORIGIN` 去掉 `https://`；複製值 = `SITE_ORIGIN` 加上路徑；預期值用字串運算組，不呼叫 `shortLinkDisplay` 或 `shortLinkUrl`，避免同義反覆 |
| 0004-S6 | `SITE_ORIGIN` 符合 origin grammar | `ShortLinkShare.test.ts` 新增一個 it | T70 / AC-C1 | `https://`；至少兩個 label；label 字元集合；最後一個 label 不是全數字；不帶 userinfo、port、query、fragment，結尾沒有 `/` |
| 0004-S6 | MergedNav 的短連結預期值由 `SITE_ORIGIN` 組出來 | `tests/unit/components/MergedNav.test.ts`，兩個既有 it 只換預期字串 | T70 / AC-C1 | en；跟著頁面 locale 走的 zh-TW |
| 0004-S6 | ChallengeList 的短連結預期值由 `SITE_ORIGIN` 組出來 | `tests/unit/components/ChallengeList.test.ts`，兩個既有 it 只換預期字串 | T70 / AC-C1 | 001 與 003 的顯示值；001 的複製 URL |
| 0004-S4 | `release.yml` 的 `release` job，以及 `quality-gates.yml` 新的 cross-OS job，`if:` 完全等於 T71 的字串 | 新檔 `tests/unit/workflows/upstream-only-jobs.test.ts`，用 `yaml` 解析 | T71 / AC-C2 | 比對解析後的字串，完全相等；預期值用 `UPSTREAM_SLUG.split('/')` 組，或寫 `'BrowserLaboratory', 'wxl-platform'` 兩段，原始碼裡不出現完整的 slug 字面值 |
| 0004-S4 | `test` job 和新 job 的 job-level `env.WXL_EXPECT_UPSTREAM` 完全等於 T71 的字串 | 同上 | T71 / AC-C2 | 包含 `${{ … }}` 外框，完全相等 |
| 0004-S4 | 新 job 在 `quality-gates.yml` 裡，matrix 剛好是四組 | 同上 | T72 / AC-C3 | `strategy.matrix.include` 以集合比對，等於 windows-latest/24、macos-latest/24、ubuntu-latest/24、ubuntu-latest/22，不多不少；`runs-on` 和 setup-node 的 `node-version` 都取自 matrix（從「matrix 要有作用」推導出來的條件）；「triggers 不變」由既有的 trigger-branches 測試涵蓋 |
| 0004-S4 | 新 job 的 steps：跑指定的兩支測試，不含 Rust、cache、install-action、binaryen | 同上 | T72 / AC-C3 | 有一個 step 的 `run` 完全等於 `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts`；沒有 step 用 `dtolnay/rust-toolchain`、`Swatinem/rust-cache`、`taiki-e/install-action`、`./.github/actions/install-binaryen`；用到 `dtolnay` 與 `Swatinem` 的 job 集合，仍等於既有的五個 job（install-action 和 binaryen 的集合已由 toolchain-parity 釘住） |

**Notes**

1. **要覆寫的既有測試**（只換預期字串，標題和其他斷言都不動）：
   - ShortLinkShare：「shows the host and path without the scheme」、「copies the absolute URL, scheme included」、「shows and copies the localised path in Traditional Chinese」、「pads the number to three digits and leaves a wider one alone」。
   - MergedNav：「shows the challenge short link beside the title」、「follows the page locale, not the runtime locale」。
   - ChallengeList：「shows each row its own short link」、「does not navigate when the copy control is activated」。

   **其他既有測試全部維持不變**：T-0012～T-0015 之後的 `fork-init.test.ts`、toolchain-parity（含「installs the toolchain in exactly the expected artifact-building jobs」）、trigger-branches、fork-template-parity、challenge-verify-timeout，以及上面三支元件測試的其餘 it。
2. **Ticket 範圍可能不一致**：Deliverable 說本 ticket「exports … the list of known old template outputs」，Comments 卻說清單由 T-0014 引入。T27 需要從測試讀這份清單；如果 T-0014 沒有 export，就由本 ticket 加上 `export`。開分支時要先確認。
3. **在 S5 測不到「no git installed」**：判定函式吃的是 work-tree flag，產生 flag 的 git 探測不屬於 S5 的三個函式。需要使用者決定：接受不測，或讓探測函式可以傳入 git 指令名稱、用不存在的執行檔測出 false。後者等於把 S5 擴大，需要核可。
4. **`WXL_EXPECT_UPSTREAM` 矛盾時「會失敗」**：在 S5 若不加第四個函式，或在 vitest 裡再開 vitest 子行程（慢、會遞迴，不建議），fixture 測不到這條。本計畫改用命令紀錄那一列來驗證。
5. **T70 有兩點不是 S6 斷言看得到的**：
   - 「測試裡不含上游 hostname」是原始碼的性質。建議第 6 階段記錄 `grep -c wxl.browserlab.online` 在三支檔案都是 0。
   - 「換任何 origin 都成立」在 S6 只會跑上游的值，帶 path 的 origin 要到靶場才真正跑到（T73，T-0016 的 S7）。
6. **原貌檢查需要確認的解讀**：
   - A7 的上游原文是 `"WXL"`，所以必須比對值、不能比 bytes；本計畫對 A6 也比值。
   - A2～A5「every form holds」在 form 數為 0 時算 vacuous true 還是 mismatch，spec 沒寫，要請使用者決定。
   - A2～A5 的 slug 比對，本計畫用大小寫敏感（跟 guard 不同），也要請使用者確認。
7. **guard 怎麼對到 manifest 的行**：spec 沒定義。本計畫用兩格縮排的 JSON fixture：slug 出現在不是那三個 A1 URL 欄位的行，就是違規。壓成一行的 manifest 不在範圍內。
8. **避免規則重複實作**：原貌檢查的 A6～A9 辨識規則、T70 的 origin grammar、T27 的 LF 正規化 SHA-256，最好直接 import T-0013～T-0015 export 出來的引擎函式。在測試裡另寫一份，會跟引擎各自漂移。
9. **新 job 的 id 與 required check**：spec 沒有給新 job 的 id，本計畫建議 `fork-init-cross-os`，測試靠 id 找這個 job。matrix 會產生四個 check，要不要加進 branch protection 由使用者決定。
10. **風險：cross-OS job 第一次跑 Windows、macOS 和 Node 22**：這是 T-0012～T-0015 的程式（路徑分隔、S2 的 CLI spawn、realpath、chmod skip）第一次在這些環境執行，失敗會出現在本 ticket 的 PR 上。在這裡修會擴大範圍，屆時要記錄下來再決定。驗證這個 job 真的會綠，只看得到 PR 的 CI；本機在 macOS 上只涵蓋一個 OS。
11. **`upstream-guard.test.ts` 自己的限制**：這支檔不在 keep list 上，所以原始碼不能出現 slug 字面值。fixture 用 `UPSTREAM_SLUG`、`.toLowerCase()`、`.toUpperCase()` 組，否則真實 tree 的 guard 會抓到它自己。T52 用的是它的真實複本，所以也不要在裡面放四個 rebrand key（`wxl-locale`、`WXL_VERIFY_RUNTIME`、`tmp/wxl-verify`、`wxl-${`）。
12. **需要的 fixture 變更**：
   - 新增 `tests/unit/workflows/fixtures/deploy-template-72327e2.yml`，內容是 `git show 72327e2:scripts/templates/deploy.yml.template`。2026-10-14 用 `| shasum -a 256` 算過，結果是 `0cf52f…7276`。
   - `.gitattributes` 的 `* text=auto eol=lf` 會讓 Windows checkout 也維持 LF。
   - 共用的 fork-init fixture 不改，T52 在自己的測試裡擴充，維持 T60「其他測試本體不變」。
13. **釘住的 hash 等實作時再算**：T27 要釘的 current template hash，在 T-0015 合入後的 main 上計算，現在不算，因為 T-0014 可能還會改範本的 header。
14. **T69「在本 epic 結束後的上游 HEAD 上通過」**：T-0016 在本 ticket 之後才落地，會改寫 README（A2/A3 所在）和兩份 skill。它的 CI `test` job 會再跑一次 guard 和原貌檢查，但 T-0016 的 AC 沒有宣告 T69，要記得在那裡再確認一次。
15. **判定為上游但不是 work tree 的情況**：如果有人在 export 出來的目錄手動設 `GITHUB_REPOSITORY` 成上游 slug，真實 tree 的 guard 跑 `git ls-files` 會失敗。這會明確報錯，不會悄悄跳過，可以接受。

### 2026-10-15 — open notes settled before implementation

- Note 2: neither `UPSTREAM_SLUG` nor the known-old-output list is exported on `main` after T-0015 (`1f4096a`), so this ticket adds both exports.
- Note 3: settled by the approval rule above as the option that does not widen S5: the "no git installed" case is not tested in S5.
- Note 6, letter case: the A2–A5 slug comparison is case-sensitive, as the plan states.
- Note 6, zero forms: put to the user on 2026-10-15. The user's answer, quoted verbatim: "A" (option A: a file holding none of its A2–A5 forms is a mismatch, reported under that field id, e.g. `A2:README.md`).
- Note 9: the new job's id is `fork-init-cross-os`; adding its checks to branch protection is the user's repository setting and is not part of this ticket.

### 2026-10-15 — red → green log

Implemented on branch `tickets/T-0011/upstream-only-ci-and-guards`, from `main` `1f4096a`. New
files: `tests/unit/scripts/upstream-guard.test.ts`, `tests/unit/workflows/upstream-only-jobs.test.ts`.
Changed: `scripts/fork-init.ts` (exports only — see Deviations for the one regex change),
`tests/unit/scripts/fork-init.test.ts`, `.github/workflows/release.yml`,
`.github/workflows/quality-gates.yml`, `tests/unit/components/{ShortLinkShare,MergedNav,ChallengeList}.test.ts`.

Execution order departs from the table's row order; see Deviations for why. Each row below names
its table row id(s), whether its first test was seen failing for the expected reason (true red) or
passed on first run against an already-general implementation (needs a mutation check, recorded
separately), the reproduce command, and the exact `Tests` summary line.

| Row(s) | Red seen | Reproduce command | Tests summary |
|---|---|---|---|
| T44 | true red (`UPSTREAM_SLUG` not exported → `undefined`) | `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t 'is exported and equals the upstream repository slug exactly, case included'` | `Tests  1 passed | 1882 skipped (1883)` |
| T61 | true red (`DOC_ANCHORS is not iterable` — not exported) | `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t 'upstream guard'` | `Tests  23 passed | 42 skipped (65)` |
| T62–T64 | passed on first run (same `guardViolations`); mutation checks below | same command as T61 | same summary as T61 |
| T65 (first case) | true red (`isUpstreamDecision is not defined`, confirmed by temporarily renaming the function) | `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t 'upstream decision'` | `Tests  14 passed | 51 skipped (65)` |
| T65 (remaining cases), T66 | passed on first run (same `isUpstreamDecision`); mutation check below | same command as T65 | same summary as T65 |
| T67 (first case) | **import failure, not a behavioural red** (`A6_CANDIDATE_RE` etc. not exported, which fails the whole module import, not this row's own logic; then two self-made bugs in the test's own slug-extraction regex, fixed before the engine was touched further — see the `docAnchorRegex` capture-group change under Deviations). A genuine behavioural mutation for this row is recorded separately below (2026-10-15 disposition, mutation check 10) | `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t 'upstream pristine check'` | `Tests  24 passed | 41 skipped (65)` |
| T68 | passed on first run (same `pristineMismatches`) once T67's own bugs were fixed; mutation check below | same command as T67 | same summary as T67 |
| T27 | **import failure, not a behavioural red** (`normalizeLf`/`sha256Hex` not exported, which fails the whole module import, not this row's own logic; then a wrong fixture path). A genuine behavioural mutation for this row is recorded separately below (2026-10-15 disposition, mutation check 11) | `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t 'deploy template hash pin'` | `Tests  2 passed | 63 skipped (65)` |
| T69 (3 its) | **import failure, not a behavioural red** (ran together with T27's export fix; all three its were failing because the whole module failed to import — a missing export — not because any of the three row's own branching logic was exercised and found wrong). A genuine behavioural mutation for the `WXL_EXPECT_UPSTREAM` gate is recorded separately below (2026-10-15 disposition, mutation check 12) | `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t 'real tree \(upstream only\)|WXL_EXPECT_UPSTREAM, when set'` | `Tests  3 passed | 62 skipped (65)` |
| T70 (ShortLinkShare: origin-grammar it) | true red (`matchesOriginGrammar is not a function`, confirmed by temporarily renaming the export) | `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts -t 'SITE_ORIGIN matches the origin grammar'` | `Tests  1 passed | 10 skipped (11)` |
| T70 (ShortLinkShare: 4 overridden its) | passed on first run (component behaviour unchanged); mutation check below | `pnpm vitest run tests/unit/components/ShortLinkShare.test.ts -t 'shows the host and path without the scheme|copies the absolute URL, scheme included|shows and copies the localised path in Traditional Chinese|pads the number to three digits and leaves a wider one alone|SITE_ORIGIN matches the origin grammar'` | `Tests  5 passed | 6 skipped (11)` |
| T70 (MergedNav: 2 overridden its) | passed on first run; mutation check below | `pnpm vitest run tests/unit/components/MergedNav.test.ts -t 'shows the challenge short link beside the title|follows the page locale, not the runtime locale'` | `Tests  2 passed | 45 skipped (47)` |
| T70 (ChallengeList: 2 overridden its) | passed on first run; mutation check below | `pnpm vitest run tests/unit/components/ChallengeList.test.ts -t 'shows each row its own short link|does not navigate when the copy control is activated'` | `Tests  2 passed | 38 skipped (40)` |
| T71, T72 | true red (9 of 10 failed: the job and its `if:`/`env`/matrix/steps did not exist yet) | `pnpm vitest run tests/unit/workflows/upstream-only-jobs.test.ts` | `Tests  10 passed (10)` |
| T52 | passed on first run (confinement already held after T44/T61/T71's work); mutation check below | `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t 'leaves the upstream-only if:/env lines, the UPSTREAM_SLUG import and the engine file byte-identical'` | `Tests  1 passed | 1882 skipped (1883)` |

**Mutation checks** (for every row recorded above as "passed on first run"). Each pair was applied,
confirmed to fail for the targeted reason, reverted, confirmed byte-identical to the pre-mutation
copy with `cmp`, and re-run to confirm green again.

Re-run and updated on 2026-10-15 (stage 6/7 disposition): checks 1-3 target code this disposition
rewrote (`manifestA1UrlLines`/`exemptLines` replaces `MANIFEST_URL_LINE_RE`; `isBinary` now decodes
`latin1`, not `utf8`; the per-line regex rebuilding was hoisted into the single `SLUG_MATCH_ALL_RE`),
so their commands and byte counts changed; checks 4, 5 and 9 target code this disposition did not
touch, so their commands are unchanged — only the whole-file re-run counts grew (more tests were
added elsewhere in the same files). Checks 6-8 were updated only for the `DISPLAY_HOST` →
`DISPLAY_ORIGIN` rename (item 12 of the disposition); their own counts are unchanged.

1. **T62** (manifest A1-URL-line exemption), in `tests/unit/scripts/upstream-guard.test.ts`:
   - apply: `perl -0pi -e "s/if \(!exemptLines\.has\(i\)\) \{/if (exemptLines.has(i)) {/" tests/unit/scripts/upstream-guard.test.ts`
   - inverse: `perl -0pi -e "s/if \(exemptLines\.has\(i\)\) \{/if (!exemptLines.has(i)) {/" tests/unit/scripts/upstream-guard.test.ts`
   - caught: `reports the manifest description or name field holding the slug` failed (`line: 6` instead of `line: 3`); `cmp` after inverse: identical; re-run: `Tests  92 passed | 1 skipped (93)`.
2. **T63** (8000-byte binary boundary), same file:
   - apply: `perl -0pi -e "s/function isBinary\(content: string\): boolean \{\n  return Buffer\.from\(content, 'latin1'\)\.subarray\(0, 8000\)\.includes\(0\)\n\}/function isBinary(content: string): boolean {\n  return false\n}/" tests/unit/scripts/upstream-guard.test.ts`
   - inverse: `perl -0pi -e "s/function isBinary\(content: string\): boolean \{\n  return false\n\}/function isBinary(content: string): boolean {\n  return Buffer.from(content, 'latin1').subarray(0, 8000).includes(0)\n}/" tests/unit/scripts/upstream-guard.test.ts`
   - caught: 3 its failed, including the new real-tree-reading-path high-bit-byte test (reported a violation instead of none); `cmp` identical after inverse; re-run: `Tests  92 passed | 1 skipped (93)`.
3. **T64** (case-insensitive occurrence search), same file:
   - apply: `perl -0pi -e "s/const SLUG_MATCH_ALL_RE = new RegExp\(escapeRe\(UPSTREAM_SLUG\), 'gi'\)/const SLUG_MATCH_ALL_RE = new RegExp(escapeRe(UPSTREAM_SLUG), 'g')/" tests/unit/scripts/upstream-guard.test.ts`
   - inverse: `perl -0pi -e "s/const SLUG_MATCH_ALL_RE = new RegExp\(escapeRe\(UPSTREAM_SLUG\), 'g'\)/const SLUG_MATCH_ALL_RE = new RegExp(escapeRe(UPSTREAM_SLUG), 'gi')/" tests/unit/scripts/upstream-guard.test.ts`
   - caught: all three letter-case its failed (lowercase/uppercase/mixed case no longer reported); `cmp` identical after inverse; re-run: `Tests  92 passed | 1 skipped (93)`.
4. **T66** (work-tree requirement in the manifest fallback), same file:
   - apply: `perl -0pi -e "s/return url === \`git\+https:\/\/github\.com\/\\\${UPSTREAM_SLUG}\.git\` && isWorkTree/return url === \`git+https:\/\/github.com\/\\\${UPSTREAM_SLUG}.git\`/" tests/unit/scripts/upstream-guard.test.ts`
   - inverse: `perl -0pi -e "s/return url === \`git\+https:\/\/github\.com\/\\\${UPSTREAM_SLUG}\.git\`\n\}/return url === \`git+https:\/\/github.com\/\\\${UPSTREAM_SLUG}.git\` && isWorkTree\n}/" tests/unit/scripts/upstream-guard.test.ts`
   - caught: `falls back to the manifest and work tree when GITHUB_REPOSITORY is unset/empty string` both failed (the non-work-tree half returned `true`); `cmp` identical after inverse; re-run: `Tests  92 passed | 1 skipped (93)`.
5. **T68** (the `version` field id), same file:
   - apply: `perl -0pi -e "s/if \(pkg\.version === '0\.1\.0'\) mismatches\.push\('version'\)/if (pkg.version === '0.1.1') mismatches.push('version')/" tests/unit/scripts/upstream-guard.test.ts`
   - inverse: `perl -0pi -e "s/if \(pkg\.version === '0\.1\.1'\) mismatches\.push\('version'\)/if (pkg.version === '0.1.0') mismatches.push('version')/" tests/unit/scripts/upstream-guard.test.ts`
   - caught: `reports exactly version when only it changes` and `does not report version 0.1.1` both failed; `cmp` identical after inverse; re-run: `Tests  92 passed | 1 skipped (93)`.
6. **T70 (ShortLinkShare)** — `DISPLAY_ORIGIN` must strip the scheme, not just alias `SITE_ORIGIN`:
   - apply: `perl -0pi -e "s/SITE_ORIGIN\.replace\(\/\^https:\\\\\/\\\\\/\/, ''\)/SITE_ORIGIN/" tests/unit/components/ShortLinkShare.test.ts`
   - inverse: `perl -0pi -e "s/const DISPLAY_ORIGIN = SITE_ORIGIN\$/const DISPLAY_ORIGIN = SITE_ORIGIN.replace(\/\^https:\\\\\/\\\\\/\/, '')/m" tests/unit/components/ShortLinkShare.test.ts`
   - caught: 3 its failed (the scheme was no longer stripped, e.g. expected `wxl.browserlab.online/zh/c/001`, got `https://wxl.browserlab.online/zh/c/001`); `cmp` identical after inverse; re-run: `Tests  11 passed (11)`.
7. **T70 (MergedNav)**: the same apply/inverse pair, on `tests/unit/components/MergedNav.test.ts` — caught: both overridden its failed the same way; `cmp` identical after inverse; re-run: `Tests  47 passed (47)`.
8. **T70 (ChallengeList)**: the same apply/inverse pair, on `tests/unit/components/ChallengeList.test.ts` — caught: `shows each row its own short link` failed; `cmp` identical after inverse; re-run: `Tests  40 passed (40)`.
9. **T52** (`SELF_EXCLUDE` must keep excluding the engine file from the rebrand walk), in `scripts/fork-init.ts`:
   - apply: `perl -0pi -e "s/const SELF_EXCLUDE = new Set\(\['scripts\/fork-init\.ts', 'tests\/unit\/scripts\/fork-init\.test\.ts'\]\)/const SELF_EXCLUDE = new Set(['tests\/unit\/scripts\/fork-init.test.ts'])/" scripts/fork-init.ts`
   - inverse: `perl -0pi -e "s/const SELF_EXCLUDE = new Set\(\['tests\/unit\/scripts\/fork-init\.test\.ts'\]\)/const SELF_EXCLUDE = new Set(['scripts\/fork-init.ts', 'tests\/unit\/scripts\/fork-init.test.ts'])/" scripts/fork-init.ts`
   - caught: the T52 test's `expect(engineFileAfter).toBe(engineFileBefore)` failed (the walk rewrote the fixture's engine-file copy, swapping `wxl`-locale/`WXL_VERIFY_RUNTIME`/slug tokens inside it); `cmp` identical after inverse; re-run (whole file): `Tests  1892 passed (1892)`.

Mutation checks 10-12 (new behavioural mutations for the T67, T27 and T69 rows, added by the
2026-10-15 stage 6/7 disposition) are recorded in that section below, not here, since they did not
exist at the original red→green time.

**T69 command record** (traceability.md's own table; all four run from the repo root, upstream's
own manifest/work-tree, no mocking). **Re-run on 2026-10-15** (stage 6/7 disposition) after the
file's test count grew from 65 to 93; the four rows' exit codes are unchanged, only the counts:

| # | Command | Exit code | `Tests` summary |
|---|---|---|---|
| 1 | `WXL_EXPECT_UPSTREAM=false pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` | 1 | `Tests  1 failed | 92 passed (93)` |
| 2 | `GITHUB_REPOSITORY=someone/else pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` | 0 | `Tests  86 passed | 7 skipped (93)` |
| 3 | `GITHUB_REPOSITORY=someone/else WXL_EXPECT_UPSTREAM=true pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` | 1 | `Tests  1 failed | 86 passed | 6 skipped (93)` |
| 4 | `GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` | 0 | `Tests  93 passed (93)` |

Row 4's `GITHUB_REPOSITORY` value is a literal typed at an interactive shell prompt to exercise the
decision function, not a source-file literal; it does not touch the confinement rule (which
governs tracked files, checked by the guard itself — row 4's own run confirms zero violations).

**Affected-file run** (every file touched or added, together; re-run 2026-10-15):

```
pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts \
  tests/unit/components/ShortLinkShare.test.ts tests/unit/components/MergedNav.test.ts \
  tests/unit/components/ChallengeList.test.ts tests/unit/workflows/
```
Result: `Test Files  10 passed (10)` / `Tests  2127 passed | 1 skipped (2128)`.

**Full suite**: `pnpm test --run` → `Test Files  127 passed (127)` / `Tests  4175 passed | 1 skipped (4176)`
(2026-10-15 re-run; exit code 0).
An `ECONNREFUSED ::1:3000` / `127.0.0.1:3000` `AggregateError` is printed to stderr after the
summary on every run of this suite. Re-checked on 2026-10-15 without touching this branch's working
tree (the first write-up here had said "confirmed with `git stash`", which this disposition retracts
as a method this branch's instructions forbid): `git archive 1f4096a` was exported to a scratch
directory, its `node_modules` symlinked to this repository's own, and `pnpm test --run` run there —
the same `ECONNREFUSED` `AggregateError` appeared on `main` at `1f4096a` too, after its own summary
line. (That scratch run also showed 110 unrelated failures from `wasm_fs_init` being undefined — the
archived tree has no `pnpm wasm:build`/`pnpm challenge:keygen` run against it; that is an artefact of
the scratch export, not evidence about `main`, and is not what this check was for.) So: observed on
this branch and on `main` before this ticket's change; not shown to come from this ticket's change —
consistent with a pre-existing, unrelated async leak (a test leaves a client socket retrying after
the run ends), not newly introduced and not affecting either run's reported pass counts or exit code.
Reproduce: `git archive 1f4096a | tar -x -C <scratch-dir>`, `ln -s <this-repo>/node_modules
<scratch-dir>/node_modules`, `cd <scratch-dir> && pnpm test --run` (the full suite; a single test
file's run did not reproduce it), then `grep ECONNREFUSED` the output. The 110 unrelated failures
mentioned above come from the scratch tree never having run `pnpm wasm:build`/`pnpm challenge:keygen`
— skip them; they are not part of what this check verifies.

### Deviations

1. **Execution order departs from the approved table's row order.** The table lists T44, T52,
   T61–T64, T65–T66, T67–T68, T27, T69, T70, T71–T72 in that sequence. T52's own fixture copies the
   *real, current* `release.yml`, `quality-gates.yml` and `upstream-guard.test.ts` into the B-mode
   tree and asserts specific lines in them survive a rebrand run byte-identical — lines that do not
   exist until T71/T72 add the `if:`/`env` lines and until T61 onward creates
   `upstream-guard.test.ts` with its `UPSTREAM_SLUG` import. Implementing T52 first, as the table
   orders it, would make its first run red for the wrong reason (those lines are simply absent),
   not for a confinement defect — the kind of guessing the method asks an executor to avoid rather
   than paper over. The implemented order is T44 → T61–T64 → T65–T66 → T67–T68 → T27 → T69 → T70 →
   T71–T72 → T52 (last, once every file it reads has its final shape). Within that order, every row
   still got its own failing test seen for the right reason, or — where the already-general
   function covered a later row for free — a recorded mutation check; no row's implementation was
   written before its own test existed, and no two rows' implementations were batched ahead of their
   tests.
2. **`docAnchorRegex` gained a capture group** (`scripts/fork-init.ts`): the A2–A5 slug now sits in
   `m[1]` instead of being embedded, unretrievable, in the whole match. `runForkInit` itself only
   ever uses this regex via `.match()` (count) and `.replace()` with a replacer function (which
   ignores capture groups), so this does not change `runForkInit`'s observable behaviour — the
   existing 1883-test `fork-init.test.ts` suite, every one of them byte-identical in body to HEAD,
   stayed green throughout. Checked with `git diff -U0 1f4096a -- tests/unit/scripts/fork-init.test.ts`:
   the only removed line across the whole file is the `import { join, dirname } from 'node:path'`
   line gaining `resolve` (an import this ticket's own T52 test needs); every other line is a pure
   addition (new `describe`/`it` blocks), none of the file's pre-existing test bodies changed.
   It is a genuine (if small) modification to a shared function rather than
   a pure addition, which is why it is called out here rather than folded silently into "exports."
   The alternative (re-deriving the slug's start/end from the matched text with a second,
   boundary-unaware regex) was tried first and produced wrong extractions at an A3/A4 suffix
   (`.git` swallowed into the name) and at A2's shared `github.com/` prefix (`com/BrowserLaboratory`
   misread as the slug) — both logged as genuine red runs before this fix.
3. **The manifest's A1-URL-line heuristic** (guard and pristine check, `upstream-guard.test.ts`):
   traceability.md's Note 7 leaves "how the guard maps to a manifest line" to the implementer for a
   2-space-indented fixture. Implemented as: a line matching `^\s*"(?:url|homepage)"\s*:` is exempt
   (the manifest's `repository.url`, `bugs.url`, `homepage`); every other line (`description`,
   `name`, ...) is not. A manifest compressed onto one line is explicitly out of scope per the same
   note and is not handled.
4. **Cross-OS coverage is local to macOS (Darwin) only**, per Note 10: this session ran on
   `Darwin … arm64`, Node `v24.13.0` — one of the four matrix cells
   (`macos-latest`/24). Windows, Ubuntu and Node 22 are unverified until the PR's own
   `fork-init-cross-os` job runs. Not verified beyond macOS/Node 24 locally; the PR's CI covers the
   other three matrix cells (`windows-latest`/24, `ubuntu-latest`/24, `ubuntu-latest`/22).
5. **`UPSTREAM_SLUG` and the known-old-output list**: both were unexported on `main` after T-0015
   (confirmed on `1f4096a`); this ticket adds `export` to both, per the settled Note 2.

### 2026-10-15 — coverage report table

Coverage is **not measured: no coverage provider is installed** in this project; "Measured
coverage" below names which reproduce command exercises the seam instead.

Counts below are the 2026-10-15 stage 6/7 disposition's re-count (`--reporter=verbose`, grouped by
`describe`); the original 2026-10-15 implementation's counts are superseded (the original "upstream
decision" row had said 14 its — it was always 13; the 14 in that day's red→green log row instead
counted the module-scope `WXL_EXPECT_UPSTREAM` it together with the 13, which does not belong to
the "upstream decision" describe at all — a mislabel this disposition corrects, not a changed count).

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S1 (`UPSTREAM_SLUG` export, T52 confinement) | `fork-init.test.ts` — `UPSTREAM_SLUG` describe (1 it) + the new B-mode T52 it (1 it) + `matchesOriginGrammar` describe (9 its, disposition item 10) | not measured: no coverage provider is installed | T44, T52 / AC-G1, AC-B3 | — |
| S5 (guard classification) | `upstream-guard.test.ts` — "upstream guard — confinement" describe (29 its) | not measured: no coverage provider is installed | T61–T64 / AC-G1 | The "no git installed" case is explicitly out of scope (Note 3, settled) |
| S5 (upstream decision) | `upstream-guard.test.ts` — "upstream decision" describe (13 its) | not measured: no coverage provider is installed | T65–T66 / AC-G2 | Same as above: the work-tree flag's own git-detection probe is not exercised with a missing `git` binary |
| S5 (pristine check) | `upstream-guard.test.ts` — "upstream pristine check" describe (34 its) | not measured: no coverage provider is installed | T67–T68 / AC-G3 | — |
| S5 (template-hash pin) | `upstream-guard.test.ts` — "deploy template hash pin" describe (2 its, upstream only) | not measured: no coverage provider is installed | T27 / AC-H3 | Runs only when the upstream decision is true (by design — an upstream-only test) |
| S5 (real tree + expectation check) | `upstream-guard.test.ts` — "real tree" describe (4 its, upstream only) + "expectation check (WXL_EXPECT_UPSTREAM)" describe (10 its, disposition item 1) + the standalone `WXL_EXPECT_UPSTREAM` it (1 it, `it.runIf`-gated) + the T69 command-record table above | not measured: no coverage provider is installed | T69 / AC-G3 | — |
| S6 (component tests) | `ShortLinkShare.test.ts` (5 its incl. the origin-grammar it), `MergedNav.test.ts` (2 its), `ChallengeList.test.ts` (2 its) | not measured: no coverage provider is installed | T70 / AC-C1 | "換任何 origin 都成立" only reaches a real alternate origin at T-0016's S7 (Note 5), not in this ticket's S6 scope |
| S4 (upstream-only `if:`/`env`, cross-OS job) | `upstream-only-jobs.test.ts` (11 its, including the disposition item 2 dtolnay/Swatinem job-set describe) | not measured: no coverage provider is installed | T71–T72 / AC-C2, AC-C3 | The job's actual behaviour on Windows/macOS/Ubuntu/Node 22 runners is unverified locally (Deviation 4); only its YAML shape is checked here |

### 2026-10-15 — stage 6 and 7 disposition

Applied directly (behaviour-preserving, within this ticket's own test plan, traceability.md
revision 2.1 and recorded Notes/settled notes), per the user's prior authorisation for this class of
fix. Each item below: what the finding was, what was done, the evidence.

1. **S5's expectation check was an inline `if`/`return`, not a callable function.** Extracted
   `expectationHolds(decision, raw)` (`tests/unit/scripts/upstream-guard.test.ts:809`), returning
   `'skip' | 'pass' | 'fail'` so "unset" is distinguishable from a vacuous pass. Added a 10-case
   `it.each` (`:814`) over unset/`'true'`/`'false'`/`'TRUE'`/`'1'` × decision true/false. The
   real-environment it now uses `it.runIf(process.env.WXL_EXPECT_UPSTREAM !== undefined)` (`:836`)
   and asserts `expectationHolds(REAL_DECISION, ...)` equals `'pass'`, so an unset env var renders as
   **skipped**, not a silently-passing empty assertion. `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `Tests  92 passed | 1 skipped (93)`.
2. **T72's "the set of jobs using `dtolnay/rust-toolchain@`/`Swatinem/rust-cache@` is unchanged" had
   no test.** Added `describe('dtolnay/rust-toolchain and Swatinem/rust-cache job sets (T72)', ...)`
   (`tests/unit/workflows/upstream-only-jobs.test.ts:99`), asserting both action prefixes are used in
   exactly the five jobs confirmed against `git show 1f4096a:.github/workflows/quality-gates.yml` /
   `release.yml` (quality-gates.yml: `build`, `challenge-verify`, `site-smoke`, `test`; release.yml:
   `release`). `pnpm vitest run tests/unit/workflows/upstream-only-jobs.test.ts` → `Tests  11 passed (11)`.
3. **The pristine check's A7 decoding used a hand-rolled regex and the JS-string-literal rule,
   not the engine's own YAML-scalar rule.** Exported `A7_CANDIDATE_RE` (`scripts/fork-init.ts:1003`)
   and extracted `parseA7ScalarValue(line): string | null` from `isA7ScalarValue`'s body
   (`scripts/fork-init.ts:1040`; `isA7ScalarValue` now calls it and returns `!== null` — behaviour
   unchanged, confirmed by the full `fork-init.test.ts` suite staying green). The guard test now
   calls it directly (`tests/unit/scripts/upstream-guard.test.ts:483`) and compares the decoded value
   to `'WXL'`. Added a case: an unquoted plain scalar `name: WXL` is not a mismatch.
4. **`isBinary` re-encoded fixture content as `utf8` before checking the first 8000 bytes, while
   `realTreeFiles` reads with `latin1`.** Fixed to decode with `latin1` throughout
   (`tests/unit/scripts/upstream-guard.test.ts:69`). Added exact-boundary fixture cases (NUL at
   index 7999 → binary, at 8000 → text) and a real-tree-reading-path case: a synthetic file with
   high-bit bytes and a NUL at byte 7999, read through the same `readTreeFile` function
   `realTreeFiles` itself uses (`:708`, `:716`), confirming the fix against actual bytes on disk, not
   only a fixture string.
5. **`trackedFiles` ignored `git ls-files`'s own exit status; `isGitWorkTree` had a dead
   `try`/`catch` (`spawnSync` does not throw).** `trackedFiles` (`:692`) now throws when
   `res.error` or a non-zero `res.status` is seen; `isGitWorkTree` (`:735`) checks the same two
   fields directly, no `try`/`catch`. Added an assertion that the real tree has at least one tracked
   file.
6. **Non-regular tracked paths were skipped with `existsSync`, and the comment's own explanation
   (submodule directories skipped via `existsSync`) does not match what actually happens there
   (`EISDIR`).** `realTreeFiles` (`:716`) now `statSync`s each path and skips anything that throws
   or is not `isFile()`; the comment states the real reason.
7. **The manifest's URL-line exemption matched any `"url"`/`"homepage"` key by name, at any
   nesting.** Replaced with `manifestA1UrlLines` (`:80`), a small structural walk that only exempts
   `repository.url`, `bugs.url` and `homepage` at their actual nesting. Added a case: a
   `funding.url` field holding the slug is reported.
8. **A line's second (and later) occurrence of the slug broke out of the loop instead of being
   reported.** The `break` is gone (`:140`); every occurrence now pushes its own violation. Added
   two T61 cases: two occurrences on one line, and two occurrences on different lines of the same
   file.
9. **T68 was missing several cases the approved table lists.** Added: an A2 badge line with only
   one of its two forms rewritten (`:633`); a case-only A2 change (uppercase slug, still a mismatch
   per Note 6); `base:` replaced with the literal `'/x/'`; A3/A4/A5 cases where the slug becomes
   `me/x` rather than being deleted; a `deploy.yml` whose content is the tree's own current template
   output (read from `scripts/templates/deploy.yml.template`), still reported since T67 requires the
   file be absent. `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t 'reports exactly'`
   confirms all of these pass.
10. **`matchesOriginGrammar`'s `catch` swallowed every exception, not only `ForkInitArgError`.**
    Changed to re-throw anything that is not a `ForkInitArgError` (`scripts/fork-init.ts:170`).
    `validateOriginValue` (the only function it calls) never throws anything else for a `string`
    argument, so this is behaviour-preserving for every caller; it is listed as an engine change
    because the catch clause's shape changed, not because any input now behaves differently. Added a
    `describe('matchesOriginGrammar', ...)` in `fork-init.test.ts` with the requested counter-examples
    (`http://`, single label, port, query, fragment, trailing slash, userinfo → `false`; a path,
    an uppercase label → `true`).
11. **T52's import-line comparison only checked the `UPSTREAM_SLUG,` specifier line.** Replaced
    `UPSTREAM_SLUG_IMPORT_LINE_RE` with `UPSTREAM_SLUG_IMPORT_RE`
    (`tests/unit/scripts/fork-init.test.ts:4204`), matching the whole `import { ... } from
    '…/scripts/fork-init'` statement.
12. **Naming and small cleanups**: the `upstream-only-jobs.test.ts` test title now says "has a step
    running exactly …" (`:78`), not "runs exactly … nothing else" (it does not check for the absence
    of other steps); the triggers-only test there is removed (covered by `trigger-branches.test.ts`,
    per the approved plan's own note); the manifest test now also covers a `name` field case, not
    only `description`; `DocAnchor_Id` is gone, replaced by `DocAnchor['id']` imported as a type
    (`:439`); the three component tests' new `DISPLAY_HOST` constant is renamed `DISPLAY_ORIGIN`
    (`tests/unit/components/{ShortLinkShare,MergedNav,ChallengeList}.test.ts`); the per-line
    `new RegExp(slugRe.source, ...)` reconstruction is gone, replaced by the single module-scope
    `SLUG_MATCH_ALL_RE` (`:140`).

   **Not adopted, with reasons**: `escapeRe` is not extracted into a shared helper — the test file
   already carries its own small, self-contained copy (consistent with the rest of the file, which
   intentionally avoids depending on more of the engine than the specific regexes/functions named by
   Note 8). `DOC_ANCHORS`'s shared, stateful global regex objects are not changed — the engine itself
   only ever calls `.match()` or `.replace()` on them (which do not read or depend on `lastIndex`),
   and every test use here is `matchAll()` (which clones the regex internally, per the language
   specification, rather than mutating the shared instance's `lastIndex`); neither caller is affected
   by the regex objects being shared.
13. **Three code comments cited the wrong source, or described behaviour inaccurately.** The
    `trackedFiles` comment now cites "T-0011 ticket, approved test plan, T69 row" instead of
    `traceability.md`, in English, with no literal Chinese (`:692`). `quality-gates.yml`'s `test` job
    comment now says the decision is computed by `upstream-guard.test.ts` itself, not by "the
    engine's own upstream decision" (the engine computes no such decision). The cross-OS job's
    comment now says "every OS/Node a teacher may run `pnpm fork:init` on", not "a fork's own CI will
    run on" (a teacher runs `fork:init` locally, once, before any CI exists for that fork).
    `docAnchorRegex`'s trailing `//` comment, which said the function itself was "exported" (it is
    not — `DOC_ANCHORS`, which carries its output, is), is folded into the function's own JSDoc with
    the correction.
14. **Ticket record quality** (this file):
    - The red→green log's T69/T27/T67 rows now say "import failure, not a behavioural red", with a
      pointer to the new mutation checks 10-12 (above) that give each row its own genuine behavioural
      coverage.
    - The "confirmed with `git stash`" sentence is gone — see the rewritten "Full suite" paragraph
      above: re-confirmed via `git archive 1f4096a` into a scratch directory with a symlinked
      `node_modules`, not by touching this branch's working tree.
    - Deviation 2 now cites the actual `git diff -U0 1f4096a -- tests/unit/scripts/fork-init.test.ts`
      check and its result (one line changed: the `resolve` import addition; everything else a pure
      addition).
    - Deviation 4's "No portability concern" is replaced with the plain fact: not verified beyond
      macOS/Node 24 locally; the PR's CI covers the other three matrix cells.
    - The coverage table's "upstream decision describe (14 its)" is corrected to 13; the 14 the
      original red→green log counted included the module-scope `WXL_EXPECT_UPSTREAM` it, which is
      not part of that `describe` block at all.
    - Context's "traceability.md (revision 2)" is corrected to "revision 2.1".
**Mutation checks 10-12** (the genuine behavioural coverage item 14 above adds for the T67, T27 and
T69 rows the red→green log had mislabelled as "true red"; same apply/confirm-fail/revert/`cmp`/re-run
method as checks 1-9):

10. **T67** (`pristineMismatches` must actually compare A6 against upstream's value, not always
    report it), in `tests/unit/scripts/upstream-guard.test.ts`:
    - apply: `perl -0pi -e "s/if \(a6Value !== 'Web eXploitation Laboratory'\) mismatches\.push\('A6'\)/mismatches.push('A6')/" tests/unit/scripts/upstream-guard.test.ts`
    - inverse: `perl -0pi -e "s/mismatches\.push\('A6'\)\n\n  \/\/ A7/if (a6Value !== 'Web eXploitation Laboratory') mismatches.push('A6')\n\n  \/\/ A7/" tests/unit/scripts/upstream-guard.test.ts`
    - caught: `reports no mismatch for a fixture holding every upstream value` failed (`['A6']` instead
      of `[]`); `cmp` after inverse: identical; re-run: `Tests  92 passed | 1 skipped (93)`.
11. **T27** (the pinned current-template hash must actually match the real template, not any
    string), same file:
    - apply: `perl -0pi -e "s/2a6b8a55d5738429388056c4342e766d1282d23f20b9d4c77e565d479c92635d/2a6b8a55d5738429388056c4342e766d1282d23f20b9d4c77e565d479c92635e/" tests/unit/scripts/upstream-guard.test.ts`
    - inverse: `perl -0pi -e "s/2a6b8a55d5738429388056c4342e766d1282d23f20b9d4c77e565d479c92635e/2a6b8a55d5738429388056c4342e766d1282d23f20b9d4c77e565d479c92635d/" tests/unit/scripts/upstream-guard.test.ts`
    - caught: `the current template's LF-normalised SHA-256 is pinned …` failed (mismatched hash,
      `1 failed | 91 passed | 1 skipped (93)`); `cmp` after inverse: identical; re-run:
      `Tests  92 passed | 1 skipped (93)`.
12. **T69** (the `WXL_EXPECT_UPSTREAM` gate must actually be gated — removing it must surface a
    real failure when the env var is unset), same file:
    - apply: `perl -0pi -e "s/it\.runIf\(process\.env\.WXL_EXPECT_UPSTREAM !== undefined\)\(\n  'WXL_EXPECT_UPSTREAM, when set, matches the upstream decision',/it(\n  'WXL_EXPECT_UPSTREAM, when set, matches the upstream decision',/" tests/unit/scripts/upstream-guard.test.ts`
    - inverse: `perl -0pi -e "s/it\(\n  'WXL_EXPECT_UPSTREAM, when set, matches the upstream decision',/it.runIf(process.env.WXL_EXPECT_UPSTREAM !== undefined)(\n  'WXL_EXPECT_UPSTREAM, when set, matches the upstream decision',/" tests/unit/scripts/upstream-guard.test.ts`
    - caught (run as `GITHUB_REPOSITORY=someone/else pnpm vitest run tests/unit/scripts/upstream-guard.test.ts`,
      `WXL_EXPECT_UPSTREAM` left unset): `WXL_EXPECT_UPSTREAM, when set, matches the upstream decision`
      failed (`expected 'skip' to be 'pass'` — the gate no longer skipped it, and without the env var
      `expectationHolds` correctly returns `'skip'`, not `'pass'`); `cmp` after inverse: identical;
      re-run (same env): `Tests  86 passed | 7 skipped (93)`.

15. **Final verification** (after every item above): `pnpm vitest run tests/unit/scripts/
    tests/unit/workflows/ tests/unit/components/` → `Test Files  53 passed (53)` /
    `Tests  2755 passed | 1 skipped (2756)`; `pnpm test --run` → `Test Files  127 passed (127)` /
    `Tests  4175 passed | 1 skipped (4176)`, exit 0 (the pre-existing `ECONNREFUSED` leak noted
    above prints to stderr but does not change the exit code or counts). `git diff -U0 1f4096a --
    tests/unit/scripts/fork-init.test.ts` confirms the file's pre-existing test bodies are all
    untouched (one import line changed; the rest is addition). No literal Chinese, no local
    filesystem path, no simplified-Chinese character and no review-round id (`S-0N`/`F#`/`C#`) was
    found in `tests/unit/scripts/upstream-guard.test.ts` or `tests/unit/workflows/
    upstream-only-jobs.test.ts`; neither file contains the upstream slug as a literal, nor any of the
    four rebrand keys (Note 11), confirmed by `grep`.

### 2026-10-15 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0011.md`. Seventeen candidates, independently filtered: no exploitable defect. Eight real non-security items were fixed in the stage 6 and 7 disposition above; one (a range whose work tree sits inside another repository) is recorded there as a known limit.
