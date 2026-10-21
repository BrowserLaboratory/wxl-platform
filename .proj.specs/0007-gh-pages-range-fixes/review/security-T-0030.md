# 第 7 階段資安審查：T-0030（create:challenge 重新產生 `_redirects`）

## 範圍

- 分支：`tickets/T-0030/create-challenge-regenerates-redirects`
- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`
- base：`a54e917`；HEAD：`a54e917`（審查時變更都還沒 commit）
- 審查的待 commit 檔案：
  - `scripts/create-challenge.ts`（修改）
  - `tests/unit/scripts/create-challenge-run.test.ts`（新增）
  - `.proj.tickets/0007-gh-pages-range-fixes/T-0030-create-challenge-regenerates-redirects.md`（修改）
- 需求依據：`.proj.specs/0007-gh-pages-range-fixes/spec.en.md` 第 3 版，信任邊界見「Trust Boundaries」表，本 ticket 對應 B5（`create:challenge` → 教師的 working tree，spec.en.md:178）。
- 方法：專案 `security-review` skill，由 review workflow 執行。先做候選審查，再由三位獨立 skeptic 逐項試著推翻；至少兩位認定成立才算確認。依 ADR-0005，題目的刻意弱點不算 finding；本 ticket 沒有碰任何題目的刻意弱點（spec.en.md:180）。
- 下面的行號都指審查時的 working tree（尚未 commit）。

## 結果

**本次變更引入、經 skeptic 確認的資安缺陷：0 項。** 候選 8 項，每一項三位 skeptic 都判定不成立（0/3）。這不代表專案沒有資安問題，只代表以下列出的範圍內沒有找到達到門檻的缺陷。

| # | 候選 | 位置 | 判定 | 處置 |
|---|---|---|---|---|
| S1 | `runKeygenCli` 以 `shell: true` 執行內插 slug 的命令字串 | `scripts/create-challenge.ts:398` | 0/3，不成立 | 不修改；可選的 hardening 見下 |
| S2 | `writeRedirects` 跟隨 symlink，多一條寫到 repository 外的路徑 | `scripts/generate-redirects.ts:153-156`，呼叫點 `scripts/create-challenge.ts:371` | 0/3，不成立 | 不修改；spec 明文排除 |
| S3 | 沒有提示就覆寫教師手改、未 commit 的 `_redirects` | `scripts/create-challenge.ts:371` | 0/3，不成立 | 不修改；這是 AC-10／C08 要求的行為 |
| S4 | 從整個 working tree 產生，`_redirects` 會含未追蹤草稿的 slug | `scripts/create-challenge.ts:371` | 0/3，不成立 | 不修改；spec 明文要求涵蓋整個 working tree |
| S5 | 產生器錯誤訊息與 keygen 輸出原樣寫到終端機（terminal escape injection） | `scripts/create-challenge.ts:357, 366, 377` | 0/3，不成立 | 不修改 |
| S6 | 碰撞檢查只看 `index.md`，既有 `src/` 檔案會被覆寫 | `scripts/create-challenge.ts:127-143, 326-336` | 0/3，不成立（既有行為） | 不修改；可另開 follow-up |
| S7 | 骨架寫入失敗時 process 以狀態 1 結束，和「狀態 1 代表什麼都沒寫」矛盾 | `scripts/create-challenge.ts:326-336, 412` | 0/3，不成立（既有行為，ticket open point 5 已交給使用者） | 不修改 |
| S8 | 要 commit 的 ticket 紀錄含本機絕對路徑與使用者名稱 | ticket 第 171 行 | 0/3，不成立 | 不修改 |

## 逐項說明

### S1 — `shell: true` 執行內插 slug 的命令字串

- 位置：`scripts/create-challenge.ts:398`（`spawnSync(\`pnpm challenge:keygen ${slug}\`, { cwd: root, encoding: 'utf-8', shell: true })`）
- 類別：command injection（defense in depth）
- 嚴重度：low；信心：low（候選本身也寫「目前不成立」）
- 攻擊者前提：能控制 `--name` 的值，並且繞過 `validateArgs`。
- 資料流：`argv` → `parseArgs` → `validateArgs`（`SLUG_RE`，第 39 行，`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`，第 307 行呼叫）→ 第 349 行 `runKeygen(slug, root)` → 第 398 行 shell 字串。
- 影響：照目前的程式碼沒有。能通過 `SLUG_RE` 的字串沒有 shell metacharacter、空白或開頭的 `-`。`runKeygenCli` 沒有 export，唯一的呼叫點是第 412 行的 CLI guard，一定先經過 `validateArgs`。
- 證據（skeptic）：base 的程式碼原本就是 `execSync(\`pnpm challenge:keygen ${slug}\`)`，execSync 一樣走 `/bin/sh`，所以這次變更沒有新增 shell 面。能提供 `--name` 的是教師本人或替教師組參數的 agent，就算注入成功，也只是以教師自己的權限執行，沒有跨過信任邊界。spec 的實作註記也指定 CLI runner 用 `spawnSync` 搭配命令字串。另外，Windows 上的 `pnpm` 是 `pnpm.cmd`，不經 shell 會跑不起來（未實測）。
- 修正建議（可選）：改傳參數陣列，或在 `runKeygenCli` 裡再檢查一次 `SLUG_RE`。若採用，要顧到 Windows 上 `.cmd` 的取捨。
- 處置：三位 skeptic 都駁回（0/3），不修改。

### S2 — `writeRedirects` 跟隨 symlink

- 位置：`scripts/generate-redirects.ts:153-156`（本次未修改），呼叫點 `scripts/create-challenge.ts:371`
- 類別：arbitrary file write（symlink following）
- 嚴重度：low；信心：low
- 攻擊者前提：教師 pull 到惡意或遭入侵的 upstream 或 fork，裡面把 `platform/public/_redirects` 換成指向 repository 外的 symlink。
- 資料流：repository 內容（symlink）→ `writeRedirects(root)` → `writeFileSync(target)` 寫到 symlink 指向的檔案。
- 影響：覆寫教師帳號可寫的某個檔案，內容大多固定。
- 證據（skeptic）：spec.en.md:348 的 Out of Scope 明文寫著不拒絕 `platform/` 底下的 symlink（「which the hook and `create:challenge` follow as `pnpm build` does」），B2 也把「Symbolic links are followed」列在 Does not protect 欄。`writeRedirects` 不在這次 diff 裡（`git diff a54e917 --stat -- scripts/generate-redirects.ts` 是空的），`pnpm dev`、`pnpm build` 早就走同一條寫入路徑。能 commit symlink 的攻擊者，本來就能改 `package.json` 的 scripts 或 `scripts/*.ts`，教師一跑 pnpm 指令就會執行任意程式碼，symlink 寫入只是這個能力的子集。
- 修正建議（可選）：如果要防，另開 epic 在 `writeRedirects` 先用 `lstat` 檢查；不屬於本 ticket。
- 處置：三位 skeptic 都駁回（0/3），不修改。跨 ticket 的串接（symlink 寫入搭配 T-0032 hook）留給 epic 收尾的 chain analysis。

### S3 — 覆寫教師手改的 `_redirects`

- 位置：`scripts/create-challenge.ts:371`
- 類別：data loss（非攻擊情境）
- 嚴重度：low；信心：low
- 攻擊者前提：沒有（候選自己寫「攻擊前提：沒有」）。
- 資料流：教師手改的 `_redirects` → `writeRedirects(root)` 整份覆寫。
- 影響：未 commit 的手改內容消失。
- 證據（skeptic）：AC-10（spec.en.md:215）明文要求「This holds even when the file's bytes differed from the generated content」，C08 與 B5 的 Does not protect 欄（spec.en.md:178）都把取代列為預期行為，這是 round 1 C-20 處置後加進 spec 的。檔頭寫著「GENERATED FILE — DO NOT EDIT BY HAND」，`pnpm dev`／`pnpm build` 也會用同樣方式覆寫。
- 修正建議：若要覆寫前提示，屬於 spec 以外的新需求，要先改 spec。
- 處置：三位 skeptic 都駁回（0/3），不修改。

### S4 — `_redirects` 會含未追蹤草稿的 slug

- 位置：`scripts/create-challenge.ts:371`
- 類別：information disclosure
- 嚴重度：low；信心：low
- 攻擊者前提：教師的 working tree 裡有未追蹤的草稿題目，且教師把 working tree 版本的 `_redirects` commit 出去，repository 又是公開的。
- 資料流：未追蹤草稿目錄 → `writeRedirects(root)`（不帶 `includeSlug`）→ working tree 的 `_redirects` → 若被 commit，進到 git 歷史。
- 影響：草稿的 slug 可能出現在 git 歷史；部署出去的網站不會有。
- 證據（skeptic）：spec.en.md:110-111 明文要求「over the whole working tree, as `pnpm dev` and `pnpm build` do」，spec.en.md:371 也把未追蹤草稿會被納入列為已知結果。部署範本跑 `pnpm build`，會在 CI 的乾淨 checkout 上重新產生 `_redirects`，所以學生抓不到草稿 slug。含草稿規則的 commit 也會被 B3 的 guard test 擋下。`pnpm dev` 本來就會產生同一份內容，這次變更沒有讓它變得新可達。
- 修正建議（可選）：W1 或成功訊息提醒教師 commit 前確認內容，可在 epic 收尾時參考。
- 處置：三位 skeptic 都駁回（0/3），不修改。

### S5 — 原樣輸出到終端機

- 位置：`scripts/create-challenge.ts:357`（W2 帶 keygen 輸出）、`:366`（成功時的 keygen 輸出）、`:377`（W1 帶產生器或寫入錯誤）
- 類別：terminal escape injection
- 嚴重度：low；信心：low
- 攻擊者前提：能在教師的 tree 放進含控制字元名稱的目錄（例如惡意 upstream）。
- 資料流：目錄名稱 → `challenge-numbers.ts` 組出的錯誤訊息 → `writeRedirects` 丟出 → W1 原樣寫到 stderr。keygen 輸出 → W2 或 stdout。
- 影響：改寫終端機顯示，或在支援的終端機用 OSC 52 寫剪貼簿。
- 證據（skeptic）：產生器同一段訊息早就由 `pnpm redirects:generate`（`generate-redirects.ts:177`）原樣印出，而 `pnpm dev`／`pnpm build` 每次都會跑它。base 的 keygen 輸出也是原樣寫出。能把目錄推進教師 tree 的 upstream，本來就能改 scripts 執行任意程式碼。B5 不保證終端機輸出經過過濾。W1、W2 中由 `run()` 自己組的部分只有 slug，已通過 `SLUG_RE`。
- 修正建議（可選）：另開 ticket，把產生器、`challenge:validate` 與 `create-challenge` 的輸出一起跳脫 C0／C1 控制字元。
- 處置：三位 skeptic 都駁回（0/3），不修改。

### S6 — 碰撞檢查只看 `index.md`

- 位置：`scripts/create-challenge.ts:127-143`（`checkCollision`）、`:326-336`（寫骨架）
- 類別：data loss（既有行為）
- 嚴重度：low；信心：low
- 攻擊者前提：沒有。只在教師先手動建了 `<slug>/src/`、還沒寫 `index.md` 時發生。
- 資料流：`checkCollision` 沒看到 `index.md` → `mkdirSync(recursive)` → `writeFileSync` 覆寫 `src/` 底下的檔案。
- 影響：覆寫教師未 commit 的檔案，結束狀態為 0。
- 證據（skeptic）：這兩段在 diff 裡只把常數 `CHALLENGES` 換成 `challengesDir`，邏輯與觸發條件和 a54e917 相同。檔頭第 15 行說的是「回傳 1 時什麼都沒寫」，這個情境不會回傳 1，所以不矛盾。B5 的「Besides its existing files」指的就是這三個骨架檔。slug 已過 `SLUG_RE`，不能 path traversal。本 ticket 的 test plan 也要求 `checkCollision` 保持原行為。
- 修正建議（可選）：另開 follow-up，把「`<slug>/` 目錄已存在」視為碰撞，或寫入時用 `flag: 'wx'`；要先在 spec 定義什麼算碰撞並更新 C05。
- 處置：三位 skeptic 都駁回（0/3），不修改。

### S7 — 骨架寫入失敗時以狀態 1 結束

- 位置：`scripts/create-challenge.ts:326-336`（沒有包 try 的寫入）、`:412`（CLI guard）
- 類別：error handling／一致性（既有行為）
- 嚴重度：low；信心：low
- 攻擊者前提：沒有。觸發條件是教師本機的 `EACCES`、`ENOSPC` 等檔案系統狀況。
- 資料流：`mkdirSync`／`writeFileSync` 丟出例外 → 未被捕捉 → node 以狀態 1 結束並印出 stack trace。
- 影響：可能已寫了一部分骨架，但狀態是 1；wxl-create 若因此重問名稱（T-0031 的範圍），可能留下骨架殘留。
- 證據（skeptic）：base 的 `main().catch((e) => { console.error(e); process.exit(1) })` 同樣是部分寫入後以 1 結束，`console.error(e)` 也會印 stack trace，所以狀態碼和輸出都沒有變。stack trace 只印到教師自己的終端機，沒有跨信任邊界。spec 沒有任何矩陣列涵蓋這種失敗。ticket 的 open point 5 已記錄這和 D13「Status 1 then always means nothing was written」的矛盾，並列為交給使用者決定的 follow-up。
- 修正建議：由使用者決定狀態碼，或另開 ticket。
- 處置：三位 skeptic 都駁回（0/3），不修改；維持 open point 5 的 follow-up。

### S8 — ticket 紀錄含本機絕對路徑

- 位置：`.proj.tickets/0007-gh-pages-range-fixes/T-0030-create-challenge-regenerates-redirects.md:171`
- 類別：information disclosure（文件整潔）
- 嚴重度：low；信心：low
- 攻擊者前提：能讀到 repository。
- 資料流：ticket 紀錄 → commit → 公開的 repository。
- 影響：曝露本機帳號名稱與目錄結構，不含任何憑證。
- 證據（skeptic）：repository 沒有禁止本機路徑的成文規範，這個問題列在 `.proj.specs/OPEN-QUESTIONS.md` 的 OQ-010（open）。同一個 epic 已 commit 的 `review/round-2-V.md:4` 也有同樣的字串，所以沒有新增資訊。前例 `.proj.specs/0001-truthful-clear-reports/review/security-T-0001.md` 的 S-1 判定同類問題不是資安缺陷。
- 修正建議（可選）：改寫成「in the repository root」。
- 處置：三位 skeptic 都駁回（0/3），不修改。

## 審查者自述的涵蓋限制

- 依設定只做候選審查，沒有自行判定 false positive，也沒有實際重現；結論都來自讀程式碼推論。
- 沒有自己執行 Git 指令，base／HEAD 與 diff 以 packet 為準；ADR-0005 與 upstream-security-review.md 沒有全文細讀，只依 SKILL.md 摘要的方法套用。
- 排除的面向：
  - 相依套件掃描（yaml、node 版本）。
  - 可用性與資源限制：spawnSync 預設 maxBuffer 1 MiB，keygen 輸出超過時會得到 ENOBUFS，被誤判成狀態 3。舊版的 execSync 也有同樣限制，屬於可用性問題。
  - 低嚴重度 hardening 以外的效能議題。
- 其他沒有展開的範圍：
  - challenge-keygen.ts 本身的安全性：沒有改動，只看了輸出點。輸出裡的 wasm-mutate seed 沒有判定為機密，未列為 finding。
  - T-0032 的 pre-commit hook 與 B2：屬於別張 ticket。
  - wxl-create skills 如何解讀結束狀態（T-0031）。
  - Windows 平台的 shell 行為：沒有實測。
  - --title、--flag 寫進 index.md 與 flag.txt 的注入：這是既有程式碼，而且只有教師本人能提供這些值，沒有展開分析。
- 跨 ticket 的串接分析（例如 symlink 寫入搭配 T-0032 hook）留給 epic 收尾的 chain analysis。

## 第 6 階段修正後的確認

第 6 階段只改了測試檔（抽出共用 helper）與 ticket 紀錄，`scripts/create-challenge.ts` 沒有再改動，所以上面的行號與判斷仍然適用。可用下列命令重現（在 repository 根目錄）：

- `cmp scripts/create-challenge.ts <第 6 階段開始前的備份>` → 相同。備份放在 workflow 的 scratchpad，不進 repository，所以這一項只能在當次 session 重現。
- `pnpm test --run` → `Test Files  128 passed (128)`、`Tests  4222 passed | 1 skipped (4223)`
- `pnpm -s challenge:validate; echo $?` → `All checks passed.`、`0`
