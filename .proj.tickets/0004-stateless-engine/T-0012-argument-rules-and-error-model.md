---
id: T-0012
title: Argument rules and the error model (prefactor)
epic: 0004-stateless-engine
status: review
blocked_by: []
---

## Context

Before the engine changes what it writes, its inputs and failure reporting must be the ones every later ticket builds on. Today unknown flags throw a raw Node error, the CLI cannot run under type stripping (a parameter property), every non-argument failure is an uncaught exception, and result paths use the OS separator.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2.1). Round 1 disposition: `review/disposition.md`.

## Deliverable

`parseForkInitArgs` applies the argument check order for the existing flags (Node parser errors, positional and repeated flags as `ForkInitArgError`; missing or blank `--author`/`--repo`; `--repo` and `--author` value rules), quoting rejected values with `JSON.stringify`. Tree errors return `exitCode` 1 with a message naming the field and file; the CLI prints `✗ ` and the message on stderr. The CLI runs under `node --experimental-strip-types` without `tsx`. A missing, BOM-prefixed, unparsable or non-object manifest is a tree error, and a non-object `repository`/`bugs` becomes an object, in both modes. Every path in the result uses `/`. Every existing rebrand test passes unchanged.

## Acceptance criteria

- [x] T12–T13: manifest errors and object forms, both modes (S1)
- [x] T45–T48: `--repo`, `--author`, missing, Node parser errors, positional, repeated (S1)
- [x] T51: rebrand differences for arguments, errors, paths and the manifest (S1)
- [x] T53–T54: tree errors and nothing written (S1, S2)
- [x] T57: `/` paths in every result field and message (S1) (cannot go red on macOS; the cross-OS job of T-0011 exercises Windows)
- [x] T58–T59: CLI under type stripping, stdout order and `✗ ` stderr (S2)
- [x] T83: fork-init.ts exit-code and mode comments (S9)

## 給使用者（zh-TW）

先重構引擎的輸入與錯誤：參數檢查順序、空值、重複旗標、positional 參數一律變成 `ForkInitArgError`；非參數錯誤改為回傳 exit 1，CLI 在 stderr 印 `✗`；CLI 能用 `node --experimental-strip-types` 直接跑；manifest 壞掉或格式不對時報錯或補成物件；所有路徑用 `/`。既有 rebrand 測試全部照舊通過。

## Comments

### 2026-10-14 — test plan table (approved by the user before the first test)

Approved together with these decisions (user, 2026-10-14): the engine may import the `yaml` package and S2 links the repository's `node_modules` (Q1 A); the deploy template is not changed again in this epic (Q2 A); T-0014 adds the verbatim copy `tests/unit/workflows/fixtures/deploy-template-72327e2.yml` and T-0011 only pins it (Q3 A); spec and traceability revision 2.1 (end of file is an end of the line, white space after a form is not; an A8 value followed by `;` does not parse; S5 gains the expectation check); and the interpretations listed in each table's notes, with the claim additions below. Where a note says "needs the user's decision", the user's approval of the list settles it as the note recommends.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S1 | Node 參數解析器拋出的任何錯誤都要轉成 `ForkInitArgError`（`exitCode` 1），訊息要帶出出錯的旗標（`it.each` × 兩種 mode：有和沒有 `--rebrand acme`） | `parseForkInitArgs`；`fork-init.test.ts` 新增 `describe('parseForkInitArgs — argument rules')`，放在既有 `parseForkInitArgs` describe 之後 | T48 / AC-P3 | 未知旗標 `--bogus`、`-x`、`--no-dry-run`；旗標沒有值：`--author` 放在最後、`--repo --author me`；boolean 旗標帶值：`--dry-run=yes` |
| 0004-S1 | positional 參數也要轉成 `ForkInitArgError`，訊息含 `positional` 和 `JSON.stringify(arg)`（兩種 mode） | `parseForkInitArgs` | T48 / AC-P3 | `extra`、`a"b`（JSON 跳脫）、`--` 之後的 `x` |
| 0004-S1 | 同一旗標給兩次要轉成 `ForkInitArgError`，訊息帶出該旗標（兩種 mode） | `parseForkInitArgs` | T48 / AC-P3 | `--author` ×2、`--repo=o/n --repo o/n`（同值、inline 寫法）、`--dry-run` ×2、`--base` ×2、`--rebrand` ×2、`--name` ×2、`--description` ×2 |
| 0004-S1 | `--author`、`--repo` 沒給，或 trim 後是空的，要拋參數錯誤並帶出該旗標（兩種 mode）；既有兩個 parse 測試照舊 | `parseForkInitArgs` | T47 / AC-P2 | 沒給、`''`、`'   '`、`'\u3000'`；`--author` 和 `--repo` 各一組 |
| 0004-S1 | 合法的 `--repo` 要接受，回傳值要和輸入逐字相同（不 trim）（兩種 mode） | `parseForkInitArgs` | T45 / AC-P1 | owner：`a`、39 字元、`a-b`、`a--b`；name：`x`、100 字元、`.x`、`...`、`a_b`、`git`、`x.gitx` |
| 0004-S1 | 不合法的 `--repo` 要拋參數錯誤，訊息含 `--repo` 和 `JSON.stringify(value)`（兩種 mode） | `parseForkInitArgs` | T45 / AC-P1 | owner：40 字元、`-a`、`a-`、`a_b`、`a.b`、空字串；name：101 字元、`.`、`..`、`x.git`、`x.GIT`、`.git`、`a b`、`ü`；整體：沒有 `/`、`a/b/c`、`/b`、`a/`、` a/b`（前導空白：T47 trim 後非空，但 T45 不 trim，所以拒絕） |
| 0004-S1 | 合法的 `--author` 要接受，回傳 trim 後的值（兩種 mode） | `parseForkInitArgs` | T46 / AC-P2 | 1 個 code point；100 個 code point；100 個 `😀`（200 個 UTF-16 單位，算 100）；`林老師`；`a\u200Db`、`a\u200Cb`；U+FDCF、U+FDF0（nonchar 區段的外側鄰接）、U+FFFD；`'  Test Teacher  '`、`'\u3000林\u3000'`、前導 U+FEFF（會被 trim 掉） |
| 0004-S1 | 不合法的 `--author` 要拋參數錯誤，訊息含 `--author` 和 JSON 引號包住的值（兩種 mode） | `parseForkInitArgs` | T46 / AC-P2 | 101 個 code point；只有 `\u200C`、只有 `\u200D\u200C`；Cc：U+0007、U+007F、U+0085；Cs：`\uD800`；Zl：U+2028；Zp：U+2029；Cf：U+200B、U+00AD、U+202E、`a\uFEFFb`；noncharacter：U+FDD0、U+FDEF、U+FFFE、U+FFFF、U+1FFFE、U+10FFFF |
| 0004-S1 | 現有旗標之間的檢查順序：同時有多個錯誤時，丟出的是順序上第一個 | `parseForkInitArgs` | T49（部分，只含現有旗標）/ AC-P3 | positional 加上沒給 `--author`，丟 positional；`--repo` 重複加上沒給 `--author`，丟重複；兩個都沒給，丟 `--author`；`--author ''` 加上 `--repo bad`，丟 `--author`；`--repo bad` 加上 101 字元的 author，丟 `--repo`；不合法的 author 加上 `--rebrand 2x`，丟 `--author`；`--rebrand 2x` 加上 `--base "/a'/"`，丟 `--rebrand` |
| 0004-S1 | 每個被拒絕的值都用 `JSON.stringify` 加引號，包括今天還是裸印的 `--base` 和 `--repo` 訊息 | `parseForkInitArgs` | 固定清單「Argument check order and messages」/ T51 | `--base "/a'/"`、`--repo 'a b'`；`--rebrand` 已經是 JSON 引號，維持不變 |
| 0004-S1 | trim 後的 `--author` 要寫進 manifest（兩種 mode） | `runForkInit`，用 `writeFixture` 的暫存樹；新增 `describe('runForkInit — arguments reach the manifest')` | T46 / AC-P2；T51 | `'  Test Teacher  '` 寫成 `author` = `Test Teacher`；anchor 和 rebrand 各一次 |
| 0004-S1 | manifest 是 tree error 時要回 `exitCode` 1，`message` 含 `A1` 和 `package.json`，而且什麼都不寫（`it.each`：manifest 狀態 × 兩種 mode） | `runForkInit`；新增 `describe('runForkInit — manifest (T12–T13)')` | T12 / AC-A7；T53、T54 / AC-E1；T51 | 不存在、BOM 開頭、無法解析（`{`、空檔）、不是物件（`[]`、`null`、`"x"`、`42`、`true`）。T54 快照：先把每個檔案的 mtime 設成固定的過去時間，比對所有檔案的路徑清單、位元組和 `mtimeMs`；`deploy.yml` 不能被建立（今天遇到不存在的 manifest 會繼續走 walk 並建立它，`[]` 會照寫） |
| 0004-S1 | `repository`、`bugs` 不是 plain object 時，要換成物件形式（兩種 mode） | `runForkInit` | T13 / AC-A7；T51 | `repository` 和 `bugs` 各試：字串、不存在、`null`、`[]`、`1`、`true`。`repository` 要 `toEqual({ type: 'git', url })`，`bugs` 要 `toEqual({ url })`，不能多出索引 key（今天 spread 字串或陣列會產生 `0`、`1`…） |
| 0004-S1 | `repository`、`bugs` 是 plain object 時，保留其他 key（兩種 mode） | `runForkInit` | T13 / AC-A7；T51 | `repository: { type: 'svn', url: <old>, directory: 'packages/site' }` 變成 `type` `git`、新的 `url`、`directory` 保留；`bugs: { url: <old>, email: 'a@b.example' }` 保留 `email` |
| 0004-S1 | 結果的每個路徑欄位和訊息都用 `/`，而且不含 `\` | `runForkInit`；新增 `describe('runForkInit — result paths use /')` | T57 / AC-E2；T51 | anchor（`A_ARGS`）：`changedFiles` 含 `.github/workflows/deploy.yml`、`.vitepress/config.mts`；rebrand（`B_ARGS`）：`sensitiveKeys[].files` 含 `.vitepress/theme/i18n/index.ts`、`.github/workflows/release.yml`，`residualFiles` 和 `residualHits[].file` 含 `.vitepress/theme/useWxlsh.ts`；`--dry-run` 的 `changedFiles`；warning：tag-rule 和「already exists with different content」這兩則都含 `.github/workflows/deploy.yml`；tree error 的 `message` 含 `package.json` |
| 0004-S1 | 既有 rebrand 測試全部照舊通過，本體不改 | `fork-init.test.ts` 既有的 B mode、dry-run、parse describe | T51 / AC-B2；T60 / AC-E4 | 不改寫任何既有測試（overridden-contracts 表的每一列都屬於 T-0013 或 T-0014） |
| 0004-S1 | 其餘既有 fork-init 測試（A mode、skill）全部本體不改照舊通過 | `fork-init.test.ts` 整檔 | T60 / AC-E4 | 共用 fixture `writeFixture` 本身不改 |
| 0004-S2 | 有效 fixture、anchor mode：結束碼 0；stderr 除了 ExperimentalWarning 以外是空的；stdout 依序是 message、`Changed files:`、每個路徑各占一行、每則 warning 一行並以 `[i] ` 開頭 | CLI 複本；新增 `describe('fork-init CLI under type stripping')`，放在同一個 `fork-init.test.ts` | T58 / AC-E3 | `--author 'Test Teacher' --repo test-owner/web-range`；`process.execPath --experimental-strip-types`；fixture 放在 `realpathSync(tmpdir())` 底下，manifest 有 `"type": "module"`，沒有 `node_modules`，子行程 env 移除 `NODE_OPTIONS`。今天的紅燈：parameter property 讓 Node 拒絕執行 |
| 0004-S2 | 有效 fixture、rebrand mode：stdout 和今天相同 | CLI 複本，另一棵相同的 fixture 在 S1 跑出結果作為對照 | T58 / AC-E3；T51 | `B_ARGS`；區塊順序依序是 message、`Changed files:`、`[!] Runtime-sensitive keys renamed` 加上 `  <key> -> in <files>`、`[!] N file(s) still contain…`、`git grep -in wxl` 提示行、`[i] ` warning |
| 0004-S2 | 參數無效：結束碼 1；stdout 是空的；stderr（濾掉 ExperimentalWarning 後）剛好是 `✗ ` 加上 S1 對同一 argv 拋出的 message；樹完全沒變 | CLI 複本 | T59 / AC-E3；T54 / AC-E1 | `--bogus`、positional `extra`、`--author` 重複（今天前兩個是未捕捉的 stack trace，第三個今天會被接受）、沒給 `--author`、`--repo not-a-slug`；T54 快照同上 |
| 0004-S2 | tree error：結束碼 1；stdout 是空的（成功時會印的 rebrand 摘要 warning 等內容都不印）；stderr 只有 `✗ ` 加 message，message 含 `A1` 和 `package.json`；樹完全沒變 | CLI 複本 | T53、T54 / AC-E1 | manifest 是 BOM 開頭（內容仍是 `"type": "module"`）或不存在；兩種 mode 各跑一次 |
| 0004-S9 | `grep -F` 記錄 fork-init.ts 的 exit-code 和 mode 註解 | `scripts/fork-init.ts`，記錄寫在 ticket 的 Comments | T83 / AC-D4（本 ticket 的字串） | 禁止：`minimal fork: identity fields, base, upstream-slug swap`、`A + deterministic rename`、`1  user input error (missing/invalid flag)`（兩個空白）；必須有：`1  user input error or tree error` |

**Notes**

- **既有測試**：本 ticket 不改寫任何既有測試。overridden-contracts 表裡的 8 個測試和 1 個標題分別屬於 T-0013（3 個 scan 相關）和 T-0014（5 個 base 相關，加上 `--base none marks base for removal…` 這個標題）。其他既有測試的本體都不改；收尾時跑完整的 `pnpm test --run`。
- **新測試檔**：沒有。全部新增測試都放在 `tests/unit/scripts/fork-init.test.ts`，理由有兩個：
  - 這個檔在 keep list 上，可以出現 upstream slug 字面值；另開新檔就會變成 guard violation。
  - T72 的跨 OS job 只跑這個檔和 `upstream-guard.test.ts`。
- **fixture 變更**：`writeFixture` 本身不改，T60 要加的 A9、A2/A5、首頁、short-link module、會 derive SITE_BASE 的 template，都屬於 T-0013 到 T-0015。新增的 helper：
  - `snapshotTree(root)`：記下每個檔案的相對路徑、位元組和 `mtimeMs`；跑之前先用 `utimesSync` 把 mtime 設成固定的過去時間，避開檔案系統時間精度的問題。
  - `writeManifest(root, raw)`：寫入各種 manifest 狀態。
  - `writeCliFixture()`：在 `realpathSync(tmpdir())` 底下建 fixture，`writeFixture` 之外再加上 `"type": "module"`，並用真正的 `scripts/fork-init.ts` 蓋掉 fixture 裡的 stub。
- **S2 的限制（我在 scratchpad 用 Node 24.13 實測過）**：Node 決定 module type 時讀的就是同一份 manifest。
  - 無法解析的 manifest，以及 `[]`、`null`、`"x"`，Node 在 `getNearestParentPackageJSONType` 就崩潰，CLI 根本沒機會執行。所以這幾種只能在 S1 測。
  - 不存在和 BOM 開頭這兩種 CLI 能跑，所以 T53 的 S2 列只用這兩種。
  - 「不存在」偏離了 S2「manifest 有 `"type": "module"`」的定義，而且依賴 Node 的 module syntax detection（Node 22.7 起預設開啟）。
  - Node 22 是否接受 BOM 開頭的 manifest，我沒有驗證；跨 OS job 有一個 ubuntu/22 entry，這是風險。
  - 這兩點需要使用者確認。
- **T57 在本機紅不起來**：macOS 和 Linux 的 `join` 本來就產生 `/`，紅燈只會出現在 Windows。跨 OS job 由 T-0011 加入，而它排在第五個，所以在那之前 T57 從一開始就是綠的。實作要注意：路徑改用 `/` 之後，`SELF_EXCLUDE` 和 `EXCLUDED_PATH_FRAGMENTS` 也要跟著用同一種形式比對，不然 rebrand mode 在 Windows 上會改寫引擎自己的原始碼。
- **T49 範圍不一致**：Deliverable 寫「現有旗標套用檢查順序」，但 T49 掛在 T-0015。本表的順序列標成「部分」，只涵蓋 T48 → T47 → T45 → T46 → rebrand → T21（今天的 base 檢查）。
- **T51 範圍**：本 ticket 涵蓋的 rebrand 差異只有 T12、T13、T45–T48、T53、T54、T57。T50 要等 `--host`、`--origin`、`--site-name` 這些旗標存在才能測（T-0014、T-0015），T44 屬於 T-0011，base 相關差異（T11、T18、T20、T21、T26）屬於 T-0014。
- **T53 範圍**：現在唯一存在的 tree error 是 T12。T9、T18、T24、T55 由各自的 ticket 在 S1 驗證 `exitCode` 和 message，但這些 ticket 都沒有認領 T53，也就沒有 S2 的 `✗ ` 驗證；好在 CLI 的錯誤輸出路徑是共用的。「錯誤前收集的 warning 不印」在本 ticket 只能用「stdout 是空的」來觀察，而 rebrand mode 成功時一定會有 warning，這可以當佐證。
- **message 要含 `A1` 是我的解讀**：T12 只寫「naming the manifest」。我是從 T53 的「anchor id」加上 disposition V-18 的「Messages name anchors by id」推出來的，需要確認。
- **T13 測試要能撐過 T-0013**：anchor mode 的 T13 測試只斷言 `repository` 和 `bugs`，不碰 `version`、`license`、`name`。T-0013 會改寫 anchor mode 的 manifest 規則（T4、T15），這樣寫才不會被打破。
- **T83 範圍**：mode 註解的新契約（anchor mode 只改 anchor）要到 T-0013 才成立。本 ticket 只能拿掉禁止字串，同時讓註解如實描述目前仍在跑的 walk，T-0013 會再改寫一次。其餘禁止字串的歸屬：`A + B on every active text file` 是 T-0013，`clobbers a customized deploy.yml`、`collapse the whole line to a`、`null = remove (--base none)` 是 T-0014。
- **實作提醒**：
  - Node 的 positional 錯誤訊息用單引號包住參數（`Unexpected argument 'x'`），要用 `JSON.stringify` 重組。
  - 重複旗標 Node 會默默取最後一個值（已實測），所以要開 `tokens: true` 自己偵測。
  - `fork:init` 的 package script 可以繼續用 `tsx`，S2 不經過它。
- **T46 用字**：測試字元都取自 Unicode 6 以前，在 Node 22 和 24 之間類別不變。另外依 spec，`String.prototype.trim` 會吃掉前導 U+FEFF，所以「前導 U+FEFF 接受、夾在中間拒絕」是 spec 的直接結果，不是實作選擇。
- **S2 其他風險**：
  - Node 22 的 type stripping 會在 stderr 印兩行（ExperimentalWarning 和 `(Use \`node --trace-warnings …\`)`），兩行都要濾掉；Node 24.13 實測沒有 warning。
  - 子行程要用 `spawnSync` 並設 timeout，cwd 設為 fixture 根目錄。

### 2026-10-14 — addendum to the approved test plan (annotation, not a rewrite)

This note is appended after the approved test plan table above; none of the approved text (the
table or its "Notes" section) is edited.

The S2 row above for the valid-fixture, anchor-mode case (the one giving the CLI invocation
`--author 'Test Teacher' --repo test-owner/web-range`) describes the CLI fixture as having "沒有
`node_modules`" ("no `node_modules`"). That wording is superseded by decision Q1 A (approved
together with the test plan) and spec/traceability revision 2.1: the engine may import the `yaml`
package, and the S2 fixture links the repository's own `node_modules` instead of omitting it (see
`writeCliFixture()` in `tests/unit/scripts/fork-init.test.ts`). The approved table text is left as
written; this note records the supersession for anyone reading the table later.

### 2026-10-14 — red → green log

Environment: Node v24.13.0. For each row: add the test, run its reproduce command to see red, make
the smallest implementation change, rerun the same command to see green. Every row below carries
its own reproduce command, each selecting only that row's test(s) by the test's exact `it` title
(special regex characters escaped, since vitest's `-t` is a RegExp) — verified in this revision by
running every command once and fixing any that selected zero tests, selected tests outside the row,
or errored (rows 1, 12, 16, 18 and 21 needed a fix; see each row below).

1. **Node's own argument-parser errors become `ForkInitArgError`**: red (`parseArgs`'s native
   `TypeError` was not wrapped; `toBeInstanceOf(ForkInitArgError)` failed) → changed
   `parseForkInitArgs` to call `parseArgs` with `tokens: true, allowPositionals: true`, catching the
   result in a `try`/`catch`. This describes the current code, as later revised by the stage-6
   rewrite recorded in row 23 below: the `catch` block wraps into a `ForkInitArgError` only an
   error whose `code` starts with `ERR_PARSE_ARGS_`, rethrowing every other caught error unchanged;
   the wrapped error's message is this code's own text per error kind (`rewrapParseArgsError`,
   `flagFromParseArgsMessage`), not Node's message forwarded verbatim → green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "wraps any error Node's argument parser raises into a ForkInitArgError naming the flag"`
   (fixed in this revision: the original command, `-t "argument rules"`, selected the whole
   `argument rules` describe — 23 tests (15 `it`/`it.each` blocks), not this row's 2 — once later
   rows added more tests to that describe.)
2. **Positional argument**: batch-implemented with row 1 — went green in the same change (scanned
   `tokens` for the first `kind === 'positional'`; message contains `positional` and
   `JSON.stringify(value)`).
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects a positional argument"`
   Mutation check (performed in this revision, to substantiate the historical claim): commented out
   the positional-token check in `parseForkInitArgs` → reran the same command → both `it.each` cases
   (`anchor`, `rebrand`) failed with `expected undefined to be an instance of ForkInitArgError` →
   confirmed red. Restored the code → reran → both cases green again. Command used for both the red
   and the green confirmation: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects a positional argument"`
3. **Repeated flag**: batch-implemented with row 1 — went green in the same change (a `Set` records
   every `token.name` seen; a repeat throws `ForkInitArgError`).
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects a flag given twice"`
   Mutation check: commented out the duplicate-flag `Set`/loop in `parseForkInitArgs` → reran → both
   `it.each` cases failed the same way (`expected undefined to be an instance of ForkInitArgError`)
   → confirmed red. Restored → reran → green again.
4. **`--author`/`--repo` missing or empty after trim**: the old code only checked "not given"; `'   '`
   and `'\u3000'` were not caught → red (treated as given) → changed the guard to
   `=== undefined || value.trim() === ''` → green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects a missing or blank"`
5. **Valid `--repo` accepted verbatim**: went green on the first run once row 6's implementation
   landed (batch-implemented with row 6) — no separate behaviour change; the old `REPO_RE` was
   replaced with `validateRepoValue` validating owner and name separately, and the set of accepted
   values did not change.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "accepts a valid --repo verbatim"`
   Mutation check: changed `validateRepoValue`'s guard from `if (!ok)` to `if (!ok || true)`, forcing
   every repo value to be rejected → reran → both `it.each` cases failed
   (`ForkInitArgError: --repo must be in owner/repo form, got: "a/x"`) → confirmed red. Restored →
   reran → green again.
6. **Invalid `--repo` message contains `--repo` and `JSON.stringify(value)`**: red (the old message
   was not quoted, and the old `REPO_RE` was too permissive for owner/name boundaries — e.g. it
   accepted `a_b` and a `.git`-suffixed name) → added `REPO_OWNER_RE`/`REPO_NAME_RE` and
   `validateRepoValue`, message rebuilt with `JSON.stringify` → green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects an invalid --repo"`
7. **Valid `--author` accepted after trim**: red before the character-rule function existed (the
   test rejected values the implementation should accept, because trimmed length/category were not
   yet handled) → green together with row 8's implementation.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "accepts a valid --author, trimmed"`
8. **Invalid `--author` message contains `--author` and the JSON-quoted value**: red (the old code
   did not validate `--author`'s content at all) → added `isNoncharacter` and
   `validateCharacterRuleValue` (Cc/Cs/Zl/Zp/Cf except U+200C/U+200D, the 66 noncharacters, 1–100
   code points, at least one code point that is not ZWNJ/ZWJ) → green.
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects an invalid --author"`
   Deviation (see also the "Deviations" note below): a lone U+2028 or U+2029 as the *entire*
   `--author` value is stripped to the empty string by `String.prototype.trim()` (both are
   LineTerminator code points), so it lands on row 4's "empty after trim" branch, not this row's
   character-rejection branch. Both are still a `ForkInitArgError` naming `--author` (satisfies
   AC-P2); the message differs in shape, not in whether it echoes the value — the empty-after-trim
   message also carries `got: ${JSON.stringify(value)}` (corrected in this revision: an earlier
   version of this note wrongly claimed that message does not echo the value). The *embedded* cases
   (`'a\u2028b'`, `'a\u2029b'`) still exercise this row's character-level rejection and are
   unchanged.
9. **Argument check order** (positional/repeated → `--author`/`--repo` missing → `--repo` format →
   `--author` format → `--rebrand` → `--base`): rows 1–8's implementation already followed this
   order, so this row's test went green on the first run (batch-implemented with rows 1–8; it only
   verifies the order, no code changed for this row specifically).
   Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "decides which message is thrown"`
   Mutation check: swapped the order of the `--repo` and `--author` format checks in
   `parseForkInitArgs` (author validated before repo) → reran → the case
   `{ argv: ['--repo', 'bad', '--author', 'a'.repeat(101)], expect: /--repo/ }` failed
   (`expected '--author rejected (too long)...' to match /--repo/`) → confirmed red. Restored →
   reran → green again.
10. **`--base`/`--repo` rejected values quoted with `JSON.stringify`**: red (the old `--base` message
    used `got: ${values.base}`, unquoted) → changed to `JSON.stringify(baseRaw)` (`--repo` was
    already fixed in row 6) → green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "quotes every rejected value"`
11. **Trimmed `--author` is written to the manifest**: went green on the first run — no additional
    code change (`parseForkInitArgs` already returned the trimmed value, and `runForkInit` already
    wrote `args.author` directly).
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "writes the trimmed --author to the manifest"`
12. **Manifest tree error (T12)**: red (when `pkgRaw` is `null`/BOM-prefixed/unparsable/non-object,
    the old code either skipped the whole block or threw an uncaught exception; the `exitCode`
    assertion failed or the test itself threw) → added a `treeError()` helper and three early
    returns in `runForkInit` (missing / `JSON.parse` throws / `typeof !== 'object' || null ||
    Array.isArray`), every message naming `A1` and `package.json`; changed `main()` so that
    `result.exitCode !== 0` only prints `✗ ` plus the message to stderr and calls `process.exit` →
    green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "exitCode 1 naming A1/package\.json, nothing written"`
    (fixed in this revision: the original command, `-t "manifest"`, also selected the T13
    repository/bugs describe and the two "writes the trimmed --author" tests — 37 tests, not this
    row's 18.)
13. **Non-plain-object `repository`/`bugs` become object form**: red (`{ ...(pkg.repository ?? {}) }`
    spreads a string/array/number/boolean into stray indexed keys, or the manifest check above never
    let a non-object manifest reach this code at all) → added `asPlainObject()`, which spreads from
    an empty base whenever the value is not a plain object → green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "object form, no stray indexed keys"`
14. **Plain-object `repository`/`bugs` keep their other keys**: batch-implemented with row 13 — went
    green on the first run (`asPlainObject` returns a plain object unchanged, so
    `{ ...obj, type, url }` naturally keeps its other keys).
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "keeps its other keys"`
15. **Every result path uses `/` (T57)**: on this machine (macOS), `path.join` already emits `/`, so
    this row's test went green on the first run without turning red here first. The code was still
    changed, per the ticket's own reminder, to build `EXCLUDED_PATH_FRAGMENTS`, `SELF_EXCLUDE`,
    `CONFIG_REL`, `DEPLOY_TEMPLATE_REL`, `DEPLOY_REL` and the relative paths inside
    `walkTextFiles`/`isExcludedPath` from `/`-joined string literals instead of `join()`/`sep`, so
    that a rebrand run on Windows cannot rewrite the tool's own source. This change cannot be proven
    red on macOS or Linux; it is gated by T-0011's cross-OS job.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "result paths use /"`
    Mutation check (performed in this revision): changed `walkTextFiles`'s relative-path join from the
    `/`-literal template back to `join(rel, entry.name)` → reran → all 5 cases stayed **green**. This
    is the expected result, not a gap: `path.join` on this POSIX machine also produces `/`, so the
    mutation cannot turn this row red here — exactly the limitation the ticket's own "T57 does not
    turn red on this machine" note already recorded. It corroborates that T-0011's cross-OS job, not
    a local mutation test, is the real gate for this row.
16. **Every existing rebrand test still passes unchanged**: verified throughout rows 1–15 by running
    the whole file; no existing test body was rewritten. This row's claimed scope is the existing
    B mode, dry-run and parse describes (the ones that exercise `--rebrand`/B_ARGS), so its
    reproduce command below selects all three, combined with `|` (vitest's `-t` is a RegExp): the
    `parseForkInitArgs (?!—)`-style prefix is not used because `[a-z-]` already disambiguates it
    from the sibling `parseForkInitArgs — argument rules` describe (that describe's text always has
    `—` immediately after the space, which `[a-z-]` does not match).
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "parseForkInitArgs [a-z-]|runForkInit — B mode|runForkInit — dry-run writes nothing"`
    Run once in this revision: 24 tests selected (8 from the original `parseForkInitArgs` describe +
    15 from `runForkInit — B mode` + 1 from `runForkInit — dry-run writes nothing`), all passed.
    (Superseded by this row's own earlier command, `-t "runForkInit — B mode"` — kept working but
    narrower, 15 tests, missing the parse and dry-run describes this row's title also claims; before
    that, the original command, `-t "B mode"`, also selected an unrelated parse test whose title
    happens to contain the words "B mode" — 16 tests, neither the row's 15 nor its true 24.)
17. **Every other existing fork-init test (A mode, skill) still passes unchanged**: same as row 16,
    verified by running the whole file; no existing test body was rewritten. This row's claimed
    scope is the `runForkInit — A mode` describe plus the `wxl-fork-init skill is script-driven`
    describe, combined with `|`.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "runForkInit — A mode|wxl-fork-init skill is script-driven"`
    Run once in this revision: 15 tests selected (13 from `runForkInit — A mode` + 2 from the skill
    describe's `it.each`), all passed. (Superseded by this row's own earlier command, `-t "A mode"`
    — selected only the 13 A-mode tests, correctly scoped but missing the skill describe this row's
    title also claims.)
18. **S2: CLI anchor mode, a valid fixture**: red (`ForkInitArgError`'s constructor parameter
    property made `node --experimental-strip-types` refuse to run the file at all, throwing
    `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; the child process exited non-zero) → rewrote
    `ForkInitArgError` with explicit field assignments, removing the parameter property → green.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "anchor mode: exit 0, no stderr beyond an ExperimentalWarning, stdout matches an equivalent S1 run"`
    (fixed in this revision: the original command, `-t "CLI under type stripping"`, selected the
    whole describe — 5 tests, not this row's 1. The test title itself also dropped a temporary
    identifier naming the round-1 review finding this test was written for, now that this log and
    the "Overridden contracts" table are the record of why it exists.)
19. **S2: CLI rebrand mode**: batch-implemented with row 18 — went green in the same fix (this row
    only checks the stdout block order; no further code change). The test title dropped the same
    kind of temporary review-finding identifier, for the same reason as row 18.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rebrand mode: stdout"`
20. **S2: CLI with invalid arguments**: went green on the first run — `main()` already printed `✗ `
    plus the message to stderr and called `exit(1)` when `parseForkInitArgs` threw, and rows 1–10
    had already brought that message in line with S1.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "invalid arguments: exit 1"`
    Mutation check: in `main()`'s `ForkInitArgError` branch, changed
    `` console.error(`✗ ${err.message}`) `` to `console.error(err.message)` (dropped the `✗ ` prefix)
    → reran → failed (`expected 'unknown flag: "--bogus"' to be '✗ unknown flag: "--bogus"'`) →
    confirmed red. Restored → reran → green again.
21. **S2: CLI tree error (manifest missing / BOM-prefixed)**: went green on the first run — row 12's
    `treeError()` return and `main()`'s `result.exitCode !== 0` branch already handled it. This test
    now uses the top-level `MODES` table for its anchor/rebrand loop instead of its own `[[],
    ['--rebrand', 'acme']]` list, and the test title dropped the same kind of temporary
    review-finding identifier, for the same reason as row 18.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "tree error \(manifest"`
    (fixed in this revision: the original command, `-t "tree error (manifest"`, is an invalid
    RegExp — an unescaped `(` with no matching `)` — and vitest's CLI arg parser errored out instead
    of running any test.)
    Mutation check: in `main()`'s tree-error branch, changed
    `` console.error(`✗ ${result.message}`) `` to `console.error(result.message)` (dropped the `✗ `
    prefix) → reran → both manifest states (`missing`, `BOM-prefixed`) failed the same way →
    confirmed red. Restored → reran → green again.
22. **S9: `grep -F` checks the exit-code/mode comments in `scripts/fork-init.ts`**: edited the
    comments to drop this ticket's three forbidden strings and add the required
    `1  user input error or tree error`, then confirmed with the commands below (no test file
    involved — this row is a manual `grep` check, not a vitest row).

```
grep -F "minimal fork: identity fields, base, upstream-slug swap" scripts/fork-init.ts   # no output (removed)
grep -F "A + deterministic rename" scripts/fork-init.ts                                  # no output (removed)
grep -F "1  user input error (missing/invalid flag)" scripts/fork-init.ts                # no output (removed)
grep -F "1  user input error or tree error" scripts/fork-init.ts                         # one match (added)
```

23. **Stage-6 rewrite of row 1's error wrapping (own messages, explicit rethrow)**: row 1 above, as
    first written, described the pre-stage-6 shape accurately: "wrapped whatever the `catch` block
    received into a `ForkInitArgError` (message forwarded from Node, which already named the
    flag)". Code review (stage 6) changed that shape for two reasons: an error with no
    `ERR_PARSE_ARGS_` code (e.g. a caller bug, not a user-input error) was being mislabelled as a
    `ForkInitArgError` instead of propagating as the real defect it is; and Node's own message text
    carries incidental wording (e.g. a "place it at the end after '--'" positional hint) this CLI's
    own grammar does not have. Changed `parseForkInitArgs`'s `catch` block to rethrow unchanged any
    error whose `code` does not start with `ERR_PARSE_ARGS_`, and added
    `rewrapParseArgsError`/`flagFromParseArgsMessage` to build this code's own message per error
    kind, instead of forwarding Node's. Two tests guard this; substantiated in this revision with a
    mutation check per test, since the original red (against the pre-stage-6 code) was not recorded
    at the time:
    - `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "builds its own exact message for each Node parser error kind, not Node's raw text"`
      — mutation: changed the "needs a value" branch in `rewrapParseArgsError` from
      `` `${flag} needs a value` `` to forwarding Node's raw `message` → reran → failed (`expected
      ... to throw error including '--author needs a value' but got "Option '--author <value>'
      argument missing"`) → confirmed red. Restored → reran → green again.
    - `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rethrows a non-ERR_PARSE_ARGS_ error from Node unwrapped, not as a ForkInitArgError"`
      — mutation: removed the `if (!code || !code.startsWith('ERR_PARSE_ARGS_')) throw err` guard,
      so every caught error reached `rewrapParseArgsError` unconditionally → reran → failed
      (`expected undefined to be 'ERR_INVALID_ARG_TYPE'`) → confirmed red. Restored → reran → green
      again.
24. **Stage-6 addition: an unknown flag containing a control character is JSON-escaped, not printed
    raw (ESC)**: guards the `JSON.stringify(rawName)` call in `rewrapParseArgsError`'s unknown-option
    branch.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "echoes an unknown flag containing a control character JSON-escaped, not raw \(ESC\)"`
    Mutation check: changed `` `unknown flag: ${JSON.stringify(rawName)}` `` to `` `unknown flag:
    ${rawName}` `` (dropped the quoting) → reran → failed (expected `unknown flag: "--bogus\u001b"`,
    received `unknown flag: --bogus` with the raw, unescaped control byte in place of `\u001b`) →
    confirmed red. Restored → reran → green again.
25. **Stage-6 addition: a truly missing flag is distinguished, in the message, from one given empty
    after trim**: guards the exact text of the "missing required flag" vs. "must not be empty"
    branches for `--author`/`--repo`.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "distinguishes a truly missing flag from one given empty after trim, in the message"`
    Mutation check: changed the blank-`--author` message from `--author must not be empty, got:
    ...` to `--author must not be blank, got: ...` → reran → failed (`expected '--author must not be
    blank...' to be '--author must not be empty...'`) → confirmed red. Restored → reran → green
    again.
26. **Stage-6 addition: the `--rebrand` WXL-guard message quotes its rejected value with
    `JSON.stringify`**: this test moved into the `argument rules` describe (see the Overall summary
    below the coverage table for the test-count accounting); guards the quoting in the `--rebrand`
    idempotency-guard branch.
    Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "rejects a --rebrand name whose uppercased form contains WXL, quoting the value with JSON.stringify"`
    Mutation check: changed `` got: ${JSON.stringify(rebrandRaw)} `` to `` got: ${rebrandRaw} ``
    (dropped the quoting) → reran → failed (`expected '...got: fooWXLbar' to contain 'got:
    "fooWXLbar"'`) → confirmed red. Restored → reran → green again.
27. **Defensive hardening, not test-driven**: `flagFromParseArgsMessage` previously asserted its
    regex match with a non-null assertion (`.exec(message)![1]`), which would throw an unrelated
    `TypeError` (reading a property of `null`) if Node's message shape ever did not match; the
    unknown-option branch in `rewrapParseArgsError` silently fell back to echoing the whole,
    unmatched raw Node message as the flag name. Both now throw
    `` new ForkInitArgError(`invalid arguments: ${JSON.stringify(nodeMessage)}`) `` instead, with a
    comment on each noting that every current Node message matches and that the branch exists only
    for a future Node message format this code has not seen. No direct test added: both are
    private, unexported helpers reachable only through `parseArgs`'s own error messages, and every
    Node message this CLI can currently trigger (every flag, on every Node version this code has
    run against) matches the existing regex — there is no argv that drives either regex to fail
    under the installed Node without mocking `node:util`'s `parseArgs`, which is out of this
    ticket's scope.

All mutation checks above were run, confirmed red, then the source was restored to its
pre-mutation state and the same reproduce command was rerun to confirm green again before moving
on; no mutation was left in place.

**Deviations**

- **Lone U+2028/U+2029 as the entire `--author` value** (approved test plan row for "不合法的
  `--author` 要拋參數錯誤，訊息含 `--author` 和 JSON 引號包住的值（兩種 mode）" — the invalid-`--author`
  message row, T46/AC-P2): differs from that row only in which check reports it — these two values
  are reported through the blank-after-trim check (row 4 of the red → green log above), with that
  check's message, `--author must not be empty, got: ${JSON.stringify(value)}`. Asserted with
  `toBe` in `distinguishes a truly missing flag from one given empty after trim, in the message`
  (`tests/unit/scripts/fork-init.test.ts`). The approved row's own boundary-condition list is kept
  as written, but the test code built from it moved these two lone values (U+2028, U+2029) into
  the blank-after-trim test's boundary list instead of the invalid-`--author` rejection test; the
  rejection test keeps only the embedded forms (`a\u2028b`, `a\u2029b`), which still exercise this
  row's character-level rejection unchanged.
- **Inline `--repo=<value>` test construction**: `rejects an invalid --repo, message containing
  --repo and JSON.stringify(value)` builds its argv as `--repo=${value}` (one token) instead of
  `--repo`, `<value>` (two tokens), because several bad values start with `-`, which Node's own
  `parseArgs` would otherwise treat as the start of another flag rather than as `--repo`'s value.
- **File-level `@vitest-environment node` directive kept**: not part of the approved test plan, but
  accepted as-is — checked directly rather than assumed. A throwaway test run under the project's
  default `happy-dom` environment, then deleted, printed `import.meta.url` as a plain `file://`
  URL, but printed `new URL('../../..', import.meta.url).href` — the same join this ticket's S2
  `CLI_REPO_ROOT` performs — as an `http://localhost:.../@fs/...` dev-server URL instead;
  `fileURLToPath` throws on a non-`file:` URL. So the need comes from this ticket's
  `CLI_REPO_ROOT`, not from something the file needed before this ticket. Three other test files
  (`tests/unit/workers/challenge-sw-response.test.ts`,
  `tests/unit/workers/runtimeHost-response.test.ts`,
  `tests/unit/workers/runtime-guard-invariants.test.ts`) already carry the same directive, each for
  its own, different reason: the first because happy-dom's `Response` drops `Set-Cookie` headers
  entirely; the second because happy-dom's `Response` accepts a non-empty body with a null-body
  status that a real engine rejects; the third because its checks are pure source-text regex
  matching with no DOM dependency at all.

Full suite: `pnpm test --run` — see the summary line under the coverage report table below.

### 2026-10-14 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0004-S1 | `parseForkInitArgs — argument rules` (15 `it`/`it.each` blocks, covering T48 native-parser errors — including the exact-message assertion per error kind and the control-character ESC case — the non-`ERR_PARSE_ARGS_` rethrow branch, positional arguments, repeated flags, T47 missing/blank — including the lone U+2028/U+2029 exact-message case — T45 valid and invalid `--repo`, T46 valid and invalid `--author`, the T49 partial check order, JSON quoting for the fixed list, and the `--rebrand` WXL-guard message's JSON-quoted value) | not measured: no coverage provider is installed | AC-P1, AC-P2, AC-P3 | None — covers every flag combination this ticket claims; `--host`/`--origin`/`--site-name` (T50/T16/T17/T35) are out of this ticket's scope |
| 0004-S1 | `runForkInit — arguments reach the manifest` (2 `it`: trimmed author written to the manifest, both modes) | not measured | AC-P2, AC-B2 | None |
| 0004-S1 | `runForkInit — manifest (T12–T13)` (18 `it`: 9 manifest states × 2 modes) | not measured | AC-A7 | None — all 9 T12 boundary states and T53/T54's exitCode/nothing-written are covered |
| 0004-S1 | `runForkInit — manifest repository/bugs become objects (T13)` (14 `it`: 6 non-object values + 1 plain-object case × 2 modes) | not measured | AC-A7 | None |
| 0004-S1 | `runForkInit — result paths use /` (5 `it`: changedFiles, sensitiveKeys/residualFiles/residualHits, --dry-run, warnings, tree-error message) | not measured | AC-E2 | A real backslash cannot be observed on this machine (macOS); enforcement relies on code review and T-0011's cross-OS job. Local tests can only confirm "no `\` and does contain `/`", not that reverting to `path.join` would turn red here — the row's own mutation check above demonstrates exactly this limitation |
| 0004-S2 | `fork-init CLI under type stripping` (4 `it`/`it.each`: anchor-mode valid fixture, rebrand-mode valid fixture, 5 invalid-argument cases, 2 manifest tree-error states × 2 modes) | not measured | AC-E3, AC-E1 (CLI side) | Node 22's behaviour for a BOM-prefixed manifest and its two-line ExperimentalWarning is not verified locally (only Node 24.13.0 is available here); gated by T-0011's cross-OS/cross-version job (including ubuntu-latest/22) — see the ticket's "S2 limits" note |
| 0004-S9 | Manual `grep -F` check (row 22 of the red → green log above) | not measured | AC-D4 (this ticket's subset of T83) | None — the three forbidden strings and the one required string were all checked |

**Overall**: `pnpm test --run` passed the whole project — 125 test files, 2285 tests, exit code 0
(re-run after this revision's edits; +2 tests over the previous 2283 — the `--rebrand` WXL-guard
JSON-quoting test moved into the `argument rules` describe, and the new non-`ERR_PARSE_ARGS_`
rethrow-branch test; see the "argument rules" row of the coverage table above). One
`ECONNREFUSED ::1:3000` connection-error message prints *after* all tests have already passed (not
a test failure; apparently a stray async connection attempt left over by some existing test); it is
noted here for future investigation and is out of this ticket's scope.

### 2026-10-14 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0012.md`. Seven candidates, independently filtered: one kept (Low, P2: the unknown-flag name was echoed unquoted, against spec B1) and fixed in stage 6; nothing blocks landing.
