---
id: T-0011
title: Keep upstream-only CI upstream, and guard upstream's identity
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0010, T-0015]
---

## Context

A range copies upstream's workflows and tests. Today the release job would run in every range, three component tests hardcode the upstream address, and nothing fails if the engine is ever run on upstream. The upstream repository slug must also stay out of anything rebrand mode's tree-wide swap could redirect.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

The fork-init module exports `UPSTREAM_SLUG` and the list of known old template outputs (initially `0cf52f11…7276`), with a verbatim copy of the template at `72327e2` as a test fixture. A new `upstream-guard.test.ts` holds the guard's classification, the upstream decision and the pristine check (fixture-tested everywhere, real-tree runs upstream only), honours `WXL_EXPECT_UPSTREAM`, and pins the current template's hash (T27). The `release` job and a new cross-OS job in quality-gates carry the `format(...)` `if:`; the `test` job and the new job set `WXL_EXPECT_UPSTREAM`. The three component tests read the real `SITE_ORIGIN`. A rebrand run leaves the upstream-only lines and the engine file untouched.

## Acceptance criteria

- [ ] T27: known old outputs and the template-hash pin; the fixture copy hashes to the list's first value (S5)
- [ ] T44: `UPSTREAM_SLUG` exported (S1)
- [ ] T52: `--author x --rebrand acme --repo me/x` leaves the `if:`/`env` lines, `UPSTREAM_SLUG` imports and the engine file byte-identical (S1)
- [ ] T61–T64: guard violations, binary files, letter case (S5)
- [ ] T65–T66: upstream decision (S5)
- [ ] T67–T68: pristine check and field ids (S5)
- [ ] T69: real-tree runs only upstream; `WXL_EXPECT_UPSTREAM` contradiction fails (S5)
- [ ] T70: component tests from the imported `SITE_ORIGIN` (S6)
- [ ] T71–T72: `if:`, `env`, cross-OS matrix and steps (S4)

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
