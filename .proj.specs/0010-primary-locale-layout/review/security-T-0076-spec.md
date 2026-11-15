# Stage 7 安全審查：T-0076（純模組與版面搬移規劃器）

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0076/pure-modules-and-layout-move-planner`
- base（`main`）：`65de8c04562043e77bd498216cc41368e9a5eda5`；merge-base 相同
- HEAD：`a2ac5b66af2cf129d3092852a213618914593681`
- committed 層（`65de8c0..a2ac5b6`）：1 個 commit（`a2ac5b6 📝 docs: epic 0010 的 spec、追溯矩陣、對抗式審查紀錄與 ticket，GLOSSARY 補上主語系版面的詞條`），21 個檔（17 個新增、4 個修改），+7279 / -14，全部是 `.md`
- staged 層：空的
- unstaged 層：3 個 `.md`（`spec.zh-TW.md`、`traceability.md`、T-0076 ticket），+182 / -8
- untracked：沒有（不含 gitignored 的 `.proj.handoffs/`、`.proj.research/` 與建置產物）
- 排除：`.claude/worktrees/reverent-shirley-22e781/`（另一個 worktree，分支是 T-0068）
- 擷取後的 drift 檢查：寫報告前重跑 `git rev-parse HEAD`（`a2ac5b6`）、`git status --porcelain=v1 -uall`（仍是那三個 ` M`），`git diff --` 與 `git diff 65de8c0 a2ac5b6 --` 的 SHA-256 也都和 manifest 相符（`9a76ec4e…dc62f`、`4ef12f2c…6959b4`）

**最重要的涵蓋事實：這個分支在任何一層都沒有實作。** ticket 預計要落地的模組（`.vitepress/locales.ts`、`layout-error.ts`、`primary-locale.ts`、`source-layout.ts`、`.vitepress/challenge/declaration.ts`、`.vitepress/challenge/config.ts` 的修改、`create-wxl/src/layout-move.mjs`），以及測試檔和 fixture，都還沒有 commit、staged、unstaged 或 untracked 的版本。所以這次審查的是 spec、traceability 和 ticket 的規範文字：照文字實作會產生什麼缺陷，測試計畫又漏掉哪些安全性質。另外也讀了 `main` 上的既有程式碼和 `yaml` 2.9.0 的原始碼作佐證。

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md` 進行，以 spec 0010 的 TB1–TB11 和 traceability 的 B-T1、B1–B5 為信任邊界。ADR-0005：本 epic 的 TB 段落已寫明沒有任何刻意保留的弱點，所以全部候選都依一般缺陷分級。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位 reviewer（只能讀檔，Git 資訊由 parent 的 manifest 提供） | 列出 19 個候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 每個候選各一位獨立的 reviewer，共 19 位 | 追蹤攻擊者控制的資料到可觀察影響，對照方法論的排除條款 |

由 workflow 腳本執行。所有結論都是讀規格和程式碼推論出來的，沒有執行任何重現或測試。

## 結論

**19 個候選中，1 個成立（C1），18 個判定不是安全漏洞。** C1 是規格層的缺陷，不是程式碼缺陷：程式碼還不存在，照 D110／SC3 的字面寫出來才會有問題。

C1 的嚴重度是 Low、信心 0.75，低於上游方法論的回報門檻（HIGH／MEDIUM、信心 ≥ 0.8）。仍列為成立，有兩個理由：traceability 的 B5 明文把「終端機輸出經 `jsonValue` 跳脫」列為保護項目；SKILL.md 也規定文件與 log 類問題不能自動排除，要看專案自己的信任邊界。要不要依上游門檻改列為紀錄項目，由使用者決定。

## 成立的發現

### F-1（C1）：搬移規劃器以預設選項呼叫 `yaml.parse`，warning 會把說明頁的原始行印到老師的終端機

| 項目 | 內容 |
|---|---|
| 位置 | `.proj.specs/0010-primary-locale-layout/traceability.md:169`（D110）、`:1506`（SC3）、`:1507`（SC4）、`:1508`（SC5）、`:281`（0010-S45「no I/O」）、`:1855`（B5）；`.proj.tickets/0010-primary-locale-layout/T-0076-pure-modules-and-layout-move-planner.md:35-37`（0010-S45 交付項）、`:144`（U25） |
| 嚴重度 | Low（候選原判 Medium，獨立審查下修）。若以規格品質分級，屬 P1：與 0010-S45 的 no-I/O 契約、B5 的承諾、D129 的解析方式三方互相矛盾 |
| 類別 | terminal_escape_injection；違反純函式的 no-I/O 契約 |
| 信心 | 0.75（函式庫機制 0.95；照 D110 字面實作就會發生 0.75；依上游標準算可利用漏洞約 0.6） |
| 攻擊者前提 | 二選一：（a）range 側：能把說明頁的前置資料放進老師的靶場，例如 co-teacher 或被合併的 PR（B-T1、ADR-0009 那群人）；（b）base 側：老師被誘導用 `--from <commit>` 指向攻擊者的 legacy commit（B1、TB10）。之後由老師在自己的終端機執行 `range:upgrade` |
| 資料流 | 說明頁前置資料，例如 `k: !foo <ESC>]52;c;…<BEL>` → `planLayoutMove` 照 D110 以預設選項呼叫 `yaml` 的 `parse`，SC3 解析整份、SC4 每個 group 各解析一次、SC5 解析合併後的 group → 未知 tag 只產生 warning → `parse()` 對每個 warning 呼叫 `log.warn` → `process.emitWarning` → Node 預設的 warning handler 原樣寫到 stderr |
| 影響 | warning 訊息附上攻擊者那一行的原文（最多 80 字元，pointer 在行首時還會加上前一行），控制字元沒有跳脫，繞過 B5 承諾的 `jsonValue` 跳脫。80 字元足以放進 OSC 52（看終端機設定：kitty、Alacritty、Windows Terminal 預設允許寫剪貼簿，iTerm2、xterm 預設關閉）、OSC 8 偽造連結、改視窗標題，或用 CSI 上移游標、清行，蓋掉 UP-E14 或報告的內容。同一行會印 3 次以上。warning 在 `parse()` 丟出錯誤之前就印出，所以 B1 承諾的「stop」攔不住。range 側的攻擊者本來就能改 `package.json` 的 scripts，這條路多出來的主要是隱蔽性；base 側則是真正新增的路徑。不會執行程式碼 |
| 證據（讀碼） | `create-wxl/node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/`：`compose/compose-scalar.js:69`（未知 tag 以 warning 旗標呼叫 `onError`）、`compose/composer.js:65-68`（進 `warnings`，不進 `errors`）、`doc/Document.js:37`（`logLevel` 預設 `'warn'`）、`public-api.js:12-13, 54-56`（`prettyErrors` 預設開啟，warning 也套 `prettifyError`）、`errors.js:29-55`（附上原始行）、`public-api.js:71`（`doc.warnings.forEach(warning => log.warn(...))`）、`log.js:10-12`（呼叫 `process.emitWarning`）。`create-wxl/bin/create-wxl.mjs` 沒有註冊 `warning` listener，也沒有 `--no-warnings`。網站端的 D129（`traceability.md:188`）已經改用 `parseDocument(...)`，並把 `doc.warnings` 算成 `invalid-yaml`；create-wxl 端的 D110／SC3 沒有跟上。U25 沒有未知 tag 的案例 |
| 推論、未實測 | Node 預設 warning handler 不跳脫控制字元（依記憶，這次沒有讀 `lib/internal/process/warning.js`）；ESC 是合法 UTF-8，過得了 SC1 |
| 補救（提案，沒有改任何檔案） | 1. 把 D110、SC3、SC4、SC5 改成和 D129 一致：用 `parseDocument`（只呼叫 `parseDocument` 不會觸發 `log.warn`），自己檢查 `doc.errors`、`doc.warnings` 與 `toJS({ maxAliasCount: 100 })` 丟出的例外，任何一項都轉成 `frontmatter` failure。2. U25 加上未知 tag 的案例：值裡放 ESC，tag 分別放在 `tags` 的值上和鍵上；斷言結果是 `frontmatter` failure，並用 spy 確認 `process.emitWarning`、`console.warn` 與 stderr 都沒有被呼叫。3. 在 B5 或 B1 補一句：yaml 函式庫不得自己寫 stderr。**不要用 `logLevel: 'silent'`**：`public-api.js:73-76` 在 silent 下會清空 `doc.errors`、不再丟錯，重複鍵就不算錯，SC3 直接失效；`:49` 在 silent 下 `parseDocument` 也不會加上 `MULTIPLE_DOCS`。`logLevel: 'error'` 保留丟錯行為，但會悄悄吞掉 warning，下面的功能缺陷依然存在 |

附帶的功能缺陷（同一根因，Medium 等級的規格衝突，信心 0.8）：未知 tag 在 SC3 只是 warning，`parse` 照常回傳字串，所以 SC3 到 SC6 都過得了。搬移會把帶 `!foo` 的那一行寫進 `challenge.yaml`，下一次 build 的 `readChallengeDeclaration`（D129）會判成 `invalid-yaml`。也就是說，搬移產出的宣告會被下一次 build 拒絕。上面的補救 1 會一併修掉。

## 處置

2026-11-15，parent 依使用者 2026-11-15 的授權採納補救 1 與 2：新增 D144（traceability revision 2.1），D110、SC3–SC5
改為 `parseDocument` 並把 warning 當成解析失敗；U25 加上未知 tag 的案例（值裡放 ESC，tag 在 `tags` 的值上與鍵上），
並斷言 `process.emitWarning`、`console.warn` 與 stderr 都沒有被呼叫。不採用 `logLevel: 'silent'`。

這份報告審的是程式碼寫出來之前的規格（那一次 workflow 的實作步驟沒有執行），所以它不是 T-0076 的第 7 階段報告；
T-0076 實作完成後的第 7 階段另有報告 `security-T-0076.md`。
