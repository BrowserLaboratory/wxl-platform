---
id: T-0022
title: Setup questions and applying them with the engine
epic: 0005-create-wxl
status: done
blocked_by: [T-0021]
---

## Context

Without `--no-setup`, create-wxl asks the teacher the setup questions S1–S5 in the terminal (or takes
them from flags), shows the summary S6, and applies the answers to the new range with the platform's
fork-init engine (`parseForkInitArgs` then `runForkInit`, seam 0004-S1). This ticket covers steps 3
(interactive directory question), 4's re-ask, 5 and 11.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Setup questions",
"Step order" 3–5 and 11.

## Deliverable

A teacher can create a configured range interactively or with flags: invalid answers are asked again,
an engine rejection or `n` at the summary starts a second pass with every question, and the engine
applies exactly the last accepted parse. Non-interactive runs fail with CW-E05/E06 and write nothing;
an engine failure after the move is CW-E12 with finishing commands.

## Acceptance criteria

- [ ] C04: no directory → asks with default `wxl-range` (interactive) / CW-E03 (non-interactive) (AC-3)
- [ ] C08: all flags, non-interactive, values with spaces → no question; argv exactly the ordered `--flag=value` items, verbatim (AC-5)
- [ ] C09: a required flag missing per host → CW-E05 naming each; `--host CLOUDFLARE-PAGES` without `--origin` → no CW-E05, engine rejection CW-E06 (AC-5)
- [ ] C10: interactive, no flags → S1–S5 in order, Enter takes the default, trimmed answers, S3 `2` → `--host=cloudflare-pages` (AC-6)
- [ ] C11: S2 `bad`, and `--repo bad` as a flag → engine message, second pass with current answers as defaults, corrected S2 accepted, no download before the summary is accepted (AC-6)
- [ ] C12: non-interactive engine rejection → CW-E06, nothing written (AC-5)
- [ ] C13: summary `n` → every question again with current answers as defaults (AC-6)
- [ ] C32: valid answers → `runForkInit` once with `{ projectRoot: target }` and the parsed args; 0004's A1, A6–A8 and the host's workflow (AC-14)
- [ ] C33: `runForkInit` returns `exitCode` 1, or throws → CW-E12 with message and finishing commands, range and `range.json` stay, no git step, exit 1 (AC-14)
- [ ] C34: engine warnings printed after the apply (AC-14)
- [ ] C51: EOF while a question is open → CW-E15, nothing written (AC-6)
- [ ] C52: S1 empty; S3 `3` then `CLOUDFLARE-PAGES`; summary `maybe` then ` Y `; directory `~/x` → asked again as the row states (AC-6)
- [ ] C63: summary shows the derived origin for `alice/alice.github.io` and `Alice/r`, and the parsed origin for S4 `https://Example.COM` (AC-6)
- [ ] C64: interactive, the asked directory is non-empty → CW-E04 text, asked again, a valid answer proceeds (AC-4)
- [ ] C66: first pass S3 `2`, S4 address; `n`; second pass S3 `1`, S4 `-` → no `--origin`, summary shows the derived address (AC-6)
- [ ] C68: `n`, S5 `a<b` rejected, then `S8` → `runForkInit` receives exactly the last parse's object (AC-14)

## 給使用者（zh-TW）

不加 `--no-setup` 時，create-wxl 在終端機問老師作者、repository、主機、網址、網站名稱，顯示摘要確認，再用平台自己的 fork-init 引擎套用到新靶場。答錯會重問；引擎拒絕或摘要回 `n` 會整輪重問；非互動模式缺值或被拒就以代碼結束、什麼都不寫。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Drafted by a workflow (one drafting agent, one independent checker that corrected 16 problems) and approved by the user on 2026-10-16 together with T-0020–T-0025 and decisions D1–D12, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S1 | 互動模式沒給資料夾時，step 3 會問資料夾：按 Enter 採用預設 `wxl-range`，輸入名稱就用那個名稱 | `create-wxl/test/setup-questions.test.ts` describe「step 3：資料夾問題」；`it.each` 兩案；`--no-setup`（排除 setup 問題）、`io.interactive: true`、逐題輸入驅動器、T-0020 的 fixture archive；`deps.cwd` 是空的暫存資料夾 | C04 / AC-3 | 答 Enter → 靶場在 `<cwd>/wxl-range`，exit 0；答 `my-dir` → 靶場在 `<cwd>/my-dir`，沒有 `<cwd>/wxl-range`。`question` checkpoint 恰好 1 次；`fetchArchive` 只呼叫 1 次，而且在回答之後。紅燈（以 T-0020 為基準）：沒有 positional 時不提問，`question` checkpoint 0 次，`<cwd>/wxl-range` 不存在 |
| 0005-S1 | 非互動模式沒給資料夾 → CW-E03，什麼都不寫；這一步先於 setup 旗標的檢查 | 同檔 describe「step 3：資料夾問題」；`io.interactive: false`，stdin 是已結束的空串流；`it.each` 三案：`--no-setup`；只給完整 setup 旗標（`--author Ada --repo alice/r --host github-pages`）；什麼旗標都不給、也不加 `--no-setup` | C04 / AC-3 | 三案都有一則以 `CW-E03` 開頭、含 `create-wxl <directory>` 的訊息，exit 1；第三案沒有 CW-E05（step 3 先於 step 5）；暫存根目錄的快照前後相同（沒有目標，也沒有 `.create-wxl-*`）；`fetchArchive`、`parseForkInitArgs` 都 0 次，`question` checkpoint 0 次。紅燈（實作到前一列為止）：非互動也提問，碰到 EOF 而 timeout，或者沒有 CW-E03。如果 T-0020 已經會印 CW-E03，這一列可能直接綠燈，照實記錄 |
| 0005-S1 | 互動式回答的資料夾以 `~` 開頭時，拒絕並再問一次 | 同檔 describe「step 3：資料夾問題」；`--no-setup`、互動；`deps.env.HOME` 指向另一個暫存資料夾 | C52 / AC-6 | 先答 `~/x` 再答 `d` → 資料夾問題問 2 次，重問之前印出原因；靶場在 `<cwd>/d`，exit 0；`<cwd>/~` 不存在，HOME 底下沒有 `x`。紅燈：第一個回答就被接受，建立了 `<cwd>/~/x`，問題只問 1 次 |
| 0005-S1 | 互動式回答的資料夾不是空的 → 印出 CW-E04 文字再問一次，回答有效的資料夾就繼續；資料夾來自 positional 時，即使是互動模式也照舊是 CW-E04 結束 | 同檔 describe「step 4：互動重問」；`--no-setup`、互動；cwd 預先建立 `full/keep.txt`；`it.each` 兩案（回答／positional） | C64 / AC-4 | (a) 沒有 positional，先答 `full` 再答 `fresh` → 輸出含 `CW-E04`、解析後 `<cwd>/full` 的 JSON 字串字面值，以及「非空資料夾」這個條件；資料夾問題問 2 次；exit 0；靶場在 `<cwd>/fresh`；`full/keep.txt` 的 byte 與 mtime 都不變；`fetchArchive` 只呼叫 1 次，而且在第二次回答之後。(b) 互動加 positional `full` → CW-E04，exit 1，`question` checkpoint 0 次，`fetchArchive` 0 次，什麼都不寫。紅燈：(a) 第一次回答後就以 CW-E04、exit 1 結束 |
| 0005-S1 | 非互動模式給齊旗標時不提問，`parseForkInitArgs` 收到依固定順序排列的 `--flag=value`，值原樣保留 | 同檔 describe「非互動：旗標」；stdin 是已結束的空串流；engine 是包住真實 `scripts/fork-init.ts` 的 spy；engine-ready fixture；`it.each` 兩案 | C08 / AC-5 | (a) `d --site-name ' S8 ' --host cloudflare-pages --origin https://r.pages.dev --repo alice/r --author ' Ada '` → argv 剛好是 `['--author= Ada ', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev', '--site-name= S8 ']`（前後空白保留，順序與命令列不同）；(b) `d --author=Ada --repo=alice/r --host=github-pages` → 剛好是 `['--author=Ada', '--repo=alice/r', '--host=github-pages']`（沒給的旗標不出現）。兩案的 `question` checkpoint 都 0 次，`parseForkInitArgs` 1 次，exit 0。紅燈（以 T-0020 為基準）：`parseForkInitArgs` spy 0 次 |
| 0005-S1 | 非互動模式下 engine 拒絕 → CW-E06 帶 engine 訊息，什麼都不寫 | 同檔 describe「非互動：CW-E06」；`it.each`：`d --author Ada --repo bad --host github-pages`；`d --author Ada --repo alice/r --host cloudflare-pages --origin http://r.pages.dev` | C12 / AC-5 | 有一則以 `CW-E06` 開頭的訊息，含 spy 抓到的 `ForkInitArgError.message` 的 JSON 字串字面值；exit 1；暫存根目錄快照不變；`fetchArchive`、`runForkInit` 都 0 次；`question` checkpoint 0 次（非互動不進第二輪）。紅燈（實作到 C08 為止）：`ForkInitArgError` 沒被接住，`run` reject，或者沒有 CW-E06 |
| 0005-S1 | 非互動模式少了該主機必填的旗標 → CW-E05，逐一列出缺的旗標；`github-pages` 不需要 `--origin` | 同檔 describe「非互動：CW-E05」；`it.each` 五個缺漏案例加一個對照案例 | C09 / AC-5 | `d` 沒有任何 setup 旗標 → 列出 `--author`、`--repo`、`--host`；`d --repo alice/r --host github-pages` → 只列 `--author`；`d --author Ada --host github-pages` → 只列 `--repo`；`d --author Ada --repo alice/r` → 只列 `--host`；`d --author Ada --repo alice/r --host cloudflare-pages` → 只列 `--origin`。每案都含 `--no-setup` 和 npm 要在旗標前加 `--` 那一句（照訊息表 id 比對），已給的旗標不在缺漏清單裡；exit 1；什麼都不寫；`parseForkInitArgs`、`fetchArchive` 都 0 次。對照：`d --author Ada --repo alice/r --host github-pages` → 沒有 CW-E05，argv 沒有 `--origin`，exit 0。紅燈（實作到 C12 為止）：缺漏的旗標交給 engine，出現 CW-E06 而不是 CW-E05 |
| 0005-S1 | 只有剛好等於 `cloudflare-pages` 的值會讓 `--origin` 變成必填；`CLOUDFLARE-PAGES` 原樣交給 engine，被拒絕時是 CW-E06 | 同檔 describe「非互動：CW-E05」；`d --author Ada --repo alice/r --host CLOUDFLARE-PAGES`；spy 記錄 engine 丟出的 `ForkInitArgError` | C09 / AC-5 | 沒有 CW-E05；`parseForkInitArgs` 收到 `['--author=Ada', '--repo=alice/r', '--host=CLOUDFLARE-PAGES']`（大小寫原樣，沒有 `--origin`）；有一則以 `CW-E06` 開頭的訊息，含 engine 訊息（`--host must be "github-pages" or "cloudflare-pages", got: "CLOUDFLARE-PAGES"`）的 JSON 字串字面值；exit 1；什麼都不寫；`fetchArchive` 0 次。預期可能沒有紅燈：C09 第一列的實作若是精確比較就已經成立；這一列用來防止日後改成不分大小寫（那樣會出現列出 `--origin` 的 CW-E05） |
| 0005-S1 | 互動、沒給旗標時，第一輪依序問 S1–S5：回答會先 trim，Enter 採用預設，S3 答 `2` 對應到 `cloudflare-pages` | 同檔 describe「互動：第一輪」；`d`、互動、沒有 setup 旗標；逐題輸入驅動器；合併的事件紀錄；`it.each` 兩案 | C10 / AC-6 | (a) S1 `  Ada Lovelace  `、S2 ` alice/r `、S3 ` 2 `、S4 ` https://r.pages.dev `、S5 Enter、S6 `y` → argv 剛好是 `['--author=Ada Lovelace', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev']`；(b) S1 `Ada`、S2 `alice/r`、S3 Enter（預設 1）、S4 Enter、S5 ` S8 `、S6 `y` → 剛好是 `['--author=Ada', '--repo=alice/r', '--host=github-pages', '--site-name=S8']`。提示依 S1、S2、S3、S4、S5、S6 的順序出現（照訊息表 id 比對），`question` checkpoint 6 次，exit 0。紅燈（實作到 C09 為止）：互動模式也照非互動規則處理，出現 CW-E05、沒有提問 |
| 0005-S1 | 無效回答會說明原因並重問同一題：S1 空白、S3 `3`、Cloudflare 的 S4 空白、摘要回 `maybe`；`CLOUDFLARE-PAGES` 與 ` Y ` 被接受 | 同檔 describe「互動：無效回答」；`d`、互動、沒有旗標；單次執行，一個測試涵蓋全部斷言 | C52 / AC-6（S4 空白依 Fixed list「Setup questions」的 S4 列） | 輸入依序是 S1 空白、`Ada`；S2 `alice/r`；S3 `3`、`CLOUDFLARE-PAGES`；S4 空白、`https://r.pages.dev`；S5 Enter；S6 `maybe`、` Y `。S1、S3、S4、S6 各連續出現 2 次，每次重問之前都印出原因；S2、S5 各 1 次；`parseForkInitArgs` 只呼叫 1 次，argv 含 `--host=cloudflare-pages`；回答 ` Y ` 之後才呼叫 `fetchArchive`；exit 0。紅燈（實作到 C10 為止）：無效回答被接受（engine 拒絕空白的 `--author`，或者 argv 出現 `--host=3`），沒有重問 |
| 0005-S1 | 互動時 S2 答 `bad` 被 engine 拒絕：印出 engine 訊息，不顯示摘要，直接進入第二輪重問 S1–S5，以目前答案當預設，改正後的 S2 被接受；摘要接受之前不下載 | 同檔 describe「互動：第二輪」；`d`、互動、沒有旗標；engine spy；每個 `question` checkpoint 記錄當下 `fetchArchive` 的呼叫次數 | C11 / AC-6 | 第一輪 S1 `Ada`、S2 `bad`、S3 `1`、S4 Enter、S5 `S8` → engine 拒絕，輸出含 engine 訊息的 JSON 字串字面值；第一個 S6 之前，S1–S5 各恰好出現 2 次，拒絕之後到第二輪 S1 之間沒有 S6；第二輪 S2 答 `alice/r`，其他 4 題按 Enter；S6 `y`。`parseForkInitArgs` 2 次，第二次的 argv 剛好是 `['--author=Ada', '--repo=alice/r', '--host=github-pages', '--site-name=S8']`（證明預設就是目前答案）；每個 `question` checkpoint 當下的 `fetchArchive` 都是 0 次，結束時 1 次；exit 0。紅燈（實作到 C52 為止）：互動模式下 engine 拒絕仍以 CW-E06 結束 |
| 0005-S1 | 互動時 `--repo bad` 由旗標給出：第一輪只問沒給旗標的題目；被拒絕後第二輪問全部 S1–S5，以旗標值當預設 | 同檔 describe「互動：第二輪」；`d --author Ada --repo bad --host github-pages`、互動 | C11 / AC-6 | 第一輪只問 S4、S5（都按 Enter），沒有問 S1–S3；engine 拒絕並印出訊息；第二輪依序問 S1–S5，S2 答 `alice/r`，其他按 Enter；S6 `y` → 第二次 argv 剛好是 `['--author=Ada', '--repo=alice/r', '--host=github-pages']`；摘要接受之前 `fetchArchive` 0 次；exit 0。紅燈（實作到上一列為止）：第二輪照第一輪的規則跳過有旗標的題目，沒有問 S1、S3，答案錯位，最後 EOF 或 timeout |
| 0005-S1 | 摘要回 `n` → 每一題重問一次，以目前答案當預設；互動且旗標全給時，第一輪不提問而直接顯示摘要 | 同檔 describe「互動：摘要 `n`」；`it.each` 兩案 | C13 / AC-6（加上 Fixed list「Interactive with every flag given」） | (a) `d`、沒有旗標：第一輪 S1 `Ada`、S2 `alice/r`、S3 `2`、S4 `https://r.pages.dev`、S5 `S8`，S6 `n`，第二輪 5 題都按 Enter，S6 `y`；(b) `d --author Ada --repo alice/r --host cloudflare-pages --origin https://r.pages.dev --site-name S8`、互動：S6 是第一個問題，回 `n` 之後依序問 S1–S5，都按 Enter，S6 `y`。兩案的 `parseForkInitArgs` 都 2 次，兩次 argv 相同，都是 `['--author=Ada', '--repo=alice/r', '--host=cloudflare-pages', '--origin=https://r.pages.dev', '--site-name=S8']`；`fetchArchive` 在第二個 S6 之後才呼叫，只有 1 次；exit 0。紅燈（實作到 C11 為止）：`n` 被當成無效回答，重問 S6 |
| 0005-S1 | 問題開著時 stdin 結束（EOF）→ CW-E15，什麼都不寫 | 同檔 describe「互動：EOF」；驅動器在第 N 個 `question` checkpoint 改成 `stdin.end()`；`it.each` 四案 | C51 / AC-6 | EOF 發生在 (a) 資料夾問題（沒有 positional，`--no-setup`）、(b) S1、(c) 第二輪的 S3（S6 回 `n` 之後）、(d) S6 → 每案都有一則以 `CW-E15` 開頭的訊息，exit 1；暫存根目錄快照不變；`fetchArchive`、`runForkInit` 都 0 次。紅燈（實作到 C13 為止）：`readline` 的 question 一直沒有 resolve，測試 timeout；或者把 EOF 當成空回答而採用預設 |
| 0005-S1 | 摘要 S6 顯示 engine 會寫入的短網址 origin：GitHub Pages 用 `deriveGithubPagesOrigin` 推導，有回答 S4 就用解析後的 origin | 同檔 describe「互動：摘要的 origin」；`it.each` 三案；S1 `Ada`、S5 Enter；用訊息表 id 找出摘要裡 origin 那一行 | C63 / AC-6 | S2 `alice/alice.github.io`、S3 `1`、S4 Enter → origin 行是 `https://alice.github.io`，摘要裡沒有 `https://alice.github.io/alice.github.io`；S2 `Alice/r`、S3 `1`、S4 Enter → origin 行是 `https://alice.github.io/r`；S2 `alice/r`、S3 `1`、S4 `https://Example.COM` → origin 行是解析後的 `https://example.com`（engine 會把 hostname 轉小寫）。注意：摘要也會列出 S4 的原始答案，所以不對整段摘要斷言沒有 `https://Example.COM`。紅燈（實作到 C51 為止）：摘要沒有 origin 那一行，或者那一行是原始答案 |
| 0005-S1 | 第二輪把 S3 從 2 改成 1、S4 答 `-` 清除目前答案 → argv 沒有 `--origin`，摘要顯示推導出的網址；S5 答 `-` 也會清除 | 同檔 describe「互動：第二輪」；`d`、互動、沒有旗標；單次執行 | C66 / AC-6（S5 的 `-` 依 Fixed list「Setup questions」） | 第一輪 S1 `Ada`、S2 `alice/r`、S3 `2`、S4 `https://a.pages.dev`、S5 `S8`，S6 `n`；第二輪 S1 Enter、S2 Enter、S3 `1`、S4 `-`、S5 `-`，S6 `y`。第一次 argv 含 `--origin=https://a.pages.dev` 和 `--site-name=S8`；第二次剛好是 `['--author=Ada', '--repo=alice/r', '--host=github-pages']`；第二個摘要的 origin 行是 `https://alice.github.io/r`，摘要裡沒有 `https://a.pages.dev`；exit 0。紅燈（實作到 C63 為止）：`-` 被當成字面值，argv 出現 `--origin=-`，engine 拒絕後又進一次第二輪，答案用完時驅動器結束 stdin，結果是 CW-E15、exit 1 |
| 0005-S1 | 答案有效時，靶場就定位後呼叫 `runForkInit` 一次，參數是解析結果和 `{ projectRoot: target }`；靶場的 A1、A6–A8 與依主機決定的 workflow 符合 0004 | `create-wxl/test/engine-apply.test.ts` describe「step 11：套用」；非互動、旗標給齊；engine-ready fixture；spy 在呼叫當下檢查 `target/range.json` 是否存在；`it.each` 兩種主機 | C32 / AC-14 | (a) `d --author Ada --repo alice/r --host github-pages --site-name 'S8 GH'`；(b) `d --author Ada --repo alice/r --host cloudflare-pages --origin https://r.pages.dev --site-name 'S8 CF'`。`runForkInit` 剛好 1 次：第一個參數 `toBe` parse 的回傳值，第二個參數 deep-equal `{ projectRoot: resolve(cwd, 'd') }`；呼叫當下 `range.json` 已經存在。A1：`author` 是 `Ada`，`repository` 是 `{ type: 'git', url: 'git+https://github.com/alice/r.git' }`，`bugs.url` 是 `https://github.com/alice/r/issues`，`homepage` 是 `https://github.com/alice/r#readme`，`version` 是 `0.1.0`，`license` 是 `ECL-2.0`。A6：用 engine 匯出的 `A6_VALUE_RE` 和 `evalJsStringLiteral` 解出的標題等於 site name。A7：兩個首頁用 `findA7Candidates` 和 `parseA7ScalarValue` 解出的值等於 site name。A8：(a) 是 `https://alice.github.io/r`，(b) 是 `https://r.pages.dev`。workflow：(a) `.github/workflows/deploy.yml` 的 byte 等於 fixture 的 template（LF），(b) 沒有這個檔。exit 0。紅燈（實作到 C66 為止）：`runForkInit` 0 次，`package.json` 的 `repository.url` 仍是上游的 |
| 0005-S1 | `runForkInit` 收到的剛好是最後一次成功的 `parseForkInitArgs` 回傳的那個物件（同一個參考） | 同檔 describe「step 11：套用最後一次解析」；`d`、互動、沒有旗標；engine-ready fixture；spy 記錄每次 parse 的回傳值與丟出的錯誤 | C68 / AC-14 | 第一輪 S1 `Ada`、S2 `alice/r`、S3 `1`、S4 Enter、S5 `First`，S6 `n`；第二輪 S1–S4 按 Enter、S5 `a<b` → engine 拒絕（不顯示摘要）；再一次第二輪，S1–S4 按 Enter、S5 `S8`，S6 `y`。`parseForkInitArgs` 3 次（第 2 次丟出 `ForkInitArgError`）；`runForkInit` 1 次，第一個參數 `toBe` 第 3 次的回傳值，其 `siteName === 'S8'`，而且 `not.toBe` 第 1 次的回傳值。預期可能沒有紅燈：C32 的最小實作已經傳入最後一次的解析結果；這一列用來釘住「最後一次」的語意，防止日後改成用答案重組參數或沿用第一次的結果 |
| 0005-S1 | `runForkInit` 回傳 `exitCode` 1 或丟出例外 → CW-E12 帶 engine 訊息與收尾指令；靶場與 `range.json` 留著，不跑 git，exit 1 | 同檔 describe「step 11：CW-E12」；`it.each`：(a) fixture 的 `.vitepress/config.mts` 沒有 A9 那一行，用真實 engine；(b) `runForkInit` 換成丟出 `new Error('boom')` 的 stub；旗標 `d --author Ada --repo alice/r --host github-pages --site-name 'S8 GH'`；`runGit` 是會記錄呼叫的 stub | C33 / AC-14 | 有一則以 `CW-E12` 開頭（不是 CW-E14）的訊息，含 engine 訊息的 JSON 字串字面值（(a) 取 spy 抓到的 `result.message`，(b) 是 `boom`），之後依序是 `cd d`、`pnpm install`、`pnpm fork:init --author=Ada --repo=alice/r --host=github-pages '--site-name=S8 GH'`、`git init`、`git symbolic-ref HEAD refs/heads/main`、`git add -A`、`git commit -m "Create range from WXL 3.0.0"`（V 取自測試的 source record）。`<cwd>/d` 還在，`range.json` 的 byte 等於 schema；沒有 `.create-wxl-*`；`runGit` 0 次；exit 1。紅燈（實作到 C68 為止）：`exitCode` 被忽略，exit 0，沒有 CW-E12；(b) 是 `run` reject |
| 0005-S1 | engine 的 warnings 在套用之後照原樣（英文）印出 | 同檔 describe「step 11：warnings」；`d --author Ada --repo alice/r --host github-pages`；engine-ready fixture 不放 `README.md`、`README.en.md`、`CONTRIBUTE.md`；spy 記錄 `runForkInit` 回傳的 `result.warnings`；合併的事件紀錄 | C34 / AC-14 | 前提斷言：`result.warnings.length > 0`（GitHub Pages 安裝 workflow 時一定有 tag rule 的 warning，再加上 A2–A5 的 `… is missing`）。每一則 warning 的 JSON 字串字面值都出現在輸出中，而且在事件紀錄裡排在 `runForkInit` 呼叫之後；exit 0（warnings 不影響 exit code）。紅燈（實作到 C33 為止）：輸出裡找不到任何一則 warning |

**Notes**

- 要改的既有測試（覆寫，須經核准）：預期沒有。T-0019 的 `fork-init.test.ts` 與 `upstream-guard.test.ts` 不動。T-0020／T-0021 的測試照它們的 Deliverable 應該都帶 `--no-setup`，或者在 step 2 之前就結束。如果有哪一個沒帶 `--no-setup`、也沒給 setup 旗標，卻預期會走到下載或之後的步驟（例如 C14 的下載失敗、T-0021 的 CW-E08／CW-E10），本 ticket 之後它會先遇到 CW-E05 或開始提問。替它補上 `--no-setup` 就算覆寫，要先列給使用者核准。T-0020 若為「沒有 positional」或「尚未實作 setup」寫過暫時性的斷言（例如沒有 positional 一律報錯），同樣要列出來，核准後才改。
- 要建的 fixture（都在 `create-wxl/test/` 內，都不寫出上游 repository slug，一律 import `UPSTREAM_SLUG`）：(1) engine-ready archive：用 T-0020／T-0021 的 archive builder 在測試中建 tar.gz（pax `comment` 等於要下載的 commit，單一前綴，通過 T-0021 的 entry rules 和 P1–P4）。內容：`package.json`（`version` `3.0.0`；`repository` 是 `{ type: 'git', url: 'git+https://github.com/${UPSTREAM_SLUG}.git' }`，讓 engine 判定為 first conversion，因而寫入 `license`；另有 `bugs`、`homepage`、`author`）；`.vitepress/config.mts`（A9 上游形式 `A9_UPSTREAM_LINE`、`  base: siteBase,`，以及剛好一行 A6 的 `  title: '…',`）；`platform/index.md` 與 `platform/zh-TW/index.md`（`hero:` 底下剛好一行 `  name: "WXL"`）；`.vitepress/challenge/shortLink.ts`（剛好一行 `export const SITE_ORIGIN = '…'`）；`scripts/templates/deploy.yml.template`（LF、會推導 SITE_BASE、不在 `KNOWN_OLD_DEPLOY_SHA256` 裡，比照 `fork-init.test.ts` 的 `CURRENT_TEMPLATE_LF`）；含 `## [Unreleased]` 的 `CHANGELOG.md`；含格式段與一個 `## OQ-001 ` 標題的 `.proj.specs/OPEN-QUESTIONS.md`。不放 `.github/workflows/deploy.yml`（上游 repository 裡沒有這個檔）。變體：`config.mts` 沒有 A9 那一行（C33）；拿掉 README.md、README.en.md、CONTRIBUTE.md（C34）。(2) 逐題輸入驅動器：每次 `checkpoint('question')` 之後用 `setImmediate` 寫入下一行；指定第 N 題時改為 `stdin.end()`（C51）；腳本答案用完時一律 `stdin.end()`，所以 C51 實作之後，錯位的紅燈會是 CW-E15 而不是 hang；每個測試都設短的 timeout，C51 之前的紅燈可能就是 timeout。(3) engine spy：包住真實 `scripts/fork-init.ts`，記錄 `parseForkInitArgs` 的 argv、回傳值和丟出的錯誤，以及 `runForkInit` 的參數和回傳值；`ForkInitArgError`、`deriveGithubPagesOrigin`、`UPSTREAM_SLUG` 原樣傳入真實的值，讓 `instanceof engine.ForkInitArgError` 成立；另外有一個 `runForkInit` 會丟出 `new Error('boom')` 的變體。(4) 合併的事件紀錄：stdout、stderr 的寫入，以及 checkpoint、engine、`fetchArchive`、`runGit` 的呼叫，依序記在同一個陣列。(5) `runGit` stub：記錄每次呼叫，並以 `code: 'ENOENT'` 拒絕。(6)「什麼都不寫」的快照 helper：比對暫存根目錄前後的檔案清單與內容。(7) `deps.env` 固定為 `{ LANG: 'en_US.UTF-8', HOME: <暫存資料夾> }`，讓訊息是 en。
- 對前面 ticket 的假設：T-0020 提供 `run(argv, io, deps)`、測試用的 deps factory（含 `source` 與 `engineSha256` 的算法，讓真實 engine 模組也通過 step 2）、archive builder、`--no-setup` 路徑的 step 1–4、6–10、13，以及 en／zh-TW 兩份以 id 匯出的訊息表。假設 CW 訊息照 T-0020 的慣例寫到 stderr；如果 T-0020 的慣例不同，就照它的慣例斷言。問題提示與 engine warnings 該寫到哪個串流，spec 沒有規定，所以測試讀合併的事件紀錄。T-0021 提供嚴格解析、entry rules 和 P1–P4，fixture 必須通過這些規則。本 ticket 新增的訊息 id（S1–S6 的提示、每題無效答案的原因、摘要的 origin 行、CW-E05、CW-E06、CW-E12、CW-E15）要同時加進 en 和 zh-TW 兩份表；T-0020 如果有兩份表 id 一致的測試，要保持綠燈（正式的 C41 屬於 T-0024）。本 ticket 不假設 T-0023、T-0024 的任何東西。
- 和其他 ticket 的界線：外來值以 JSON 字串字面值印出、`pnpm fork:init` 收尾命令用 POSIX 引號，是 AC-14 和本 ticket 需要的最小實作；本 ticket 用到的 engine 訊息都是 ASCII，所以只斷言 `JSON.stringify` 的形式。DEL、C1 的 `\uXXXX` 跳脫，`./` 前綴，以及含控制字元時不印命令，都屬於 T-0024 的 C60。`parseForkInitArgs` 丟出一般 `Error` 時的 CW-E14（C57）、在問題時按 Ctrl-C（C56）、step 11 的訊號（C56）也屬於 T-0024，本 ticket 不測。T-0023 加上 git 步驟後，成功執行會呼叫 `runGit`，stub 以 ENOENT 拒絕時會印 CW-W01，exit 仍是 0；所以本 ticket 的成功案例只斷言 exit 0，不斷言 next steps（C40 屬於 T-0023），也不斷言 git 的輸出。
- 解讀上的假設（不是新需求）：`cd <directory>` 用使用者給的資料夾字串（positional 或回答），不用解析後的絕對路徑，與 C60 的 `cd ./-x` 一致。`pnpm fork:init` 後面接同一組 `--flag=value` 項目，各自照 POSIX 規則加引號（只含 `._-/@%+=:,`、字母和數字的項目照原樣印出，其他的用單引號整個包起來）。G1、G2、G4 照 Fixed list「Git steps」的印出形式，G4 的 V 取自 source record 的 `version`。`runForkInit` 用 engine 自己的同步 `node:fs` 寫入目標，不經過 `deps.fs`；所以 C33／C34 的檔案斷言直接讀磁碟，C69 的 fs recorder 屬於 T-0024。
- skip 與隔離：本 ticket 沒有把上層資料夾設成唯讀的測試，也不檢查檔案權限，所以不需要 Windows／root 的 skip。也不跑真實 git，所以不需要隔離 PATH 和 XDG_CONFIG_HOME；只把 HOME 指到暫存資料夾，用來確認 `~/x` 沒有被展開（C52）。
- Stage 8 的驗證面：本 ticket 改的是 create-wxl 的 `run`，但 `bin`、`dist/` 和 `prepareDist` 要到 T-0025 才有，現在沒有能打包、能在終端機實跑的套件。暫定的做法：本 ticket 的 stage 8 記錄為 `pnpm --dir create-wxl test` 的執行紀錄（0005-S1，Node 行程內，不經瀏覽器也不經終端機）；互動與旗標的真實終端機執行（run I、Ib、II）由 T-0025 依 0005-S4 驗證。這一點列在 open question。

**Decisions applying to this ticket (approved 2026-10-16)**

- D1: stage 8 is the create-wxl vitest run record (0005-S1, in-process); the terminal surface (0005-S4) runs in T-0025.
- D3: CW-E and CW-W messages go to `stderr`; next-step lines go to `stdout`; tests pin the stream.

### 2026-10-16 — increment plan confirmed

The executor's increment plan was checked by an independent reviewer (approve with corrections). Confirmed with these corrections: engine warnings, engine rejection messages (CW-E06, the line printed before the second pass) and CW-E12's `result.message` or thrown message are printed as JSON string literals, with message ids in both tables; every test that runs setup uses `ENGINE_READY_FIXTURE` from row 5 on, built to pass T-0021's entry rules and P1–P4 (parent directory entries in order, pax `comment` equal to `source.commit`, prefix and `repository.url` from `UPSTREAM_SLUG`); row 9 includes S6 with a minimal "`y` continues"; S6 accepts Enter as continue and compares trimmed, case-insensitively, `n` turning into the second pass only at row 13; S3 answers are trimmed and case-insensitive while flag values pass to the engine unchanged (`--origin` required only for exactly `cloudflare-pages`); row 6 catches only `instanceof deps.engine.ForkInitArgError` and rethrows the rest (CW-E14 is T-0024's C57), while row 19 catches every step 11 error as CW-E12; `deps.engine.ForkInitArgError` is checked to be the real class; new message ids (directory prompt, the `~` reason, S1–S6 prompts, per-question reasons, the origin line, the re-ask line, CW-E05, CW-E06, CW-E12, CW-E15) go into en and zh-TW, read against `GLOSSARY.md`; CW messages go to stderr (D3); `deps.env` is `{ LANG: 'en_US.UTF-8', HOME: <temporary folder> }` with short timeouts; CW-E12's `cd` uses the user's string and G4's V `deps.source.version`, POSIX quoting only as far as `'--site-name=S8 GH'` needs (the rest is C60, T-0024); row 2's check sits in step 3, after step 2's checks; no `checkpoint('step-5')` or `checkpoint('step-11')`; readline is created when a question is asked and closed before `run` returns, an already ended stdin is CW-E15; one pass flag, not two loops, for row 12; tests implement the approved table's Boundary column literally. Step 13 is left alone: with setup it still prints N8 until T-0023's C40.

Decided under "follow the recommendations" (2026-10-16): (A) T-0022 starts after T-0021 landed, on its own branch from `main`; (B) the step 3 directory answer is trimmed like every other answer; (C) in the second pass, Enter on a default that came from a flag passes the flag's raw value to the engine; (D) S4 answered `-` for Cloudflare Pages clears the answer and, S4 being required there, asks again; (E) test files are `setup-questions.test.mjs` and `engine-apply.test.mjs` (`.mjs`, as T-0020), a deviation from the approved table's `.test.ts`, which vitest's include would not collect.

### 2026-10-16 — red → green log

**Process note (reported to the user).** Each test was written and run before its production code. Rows 5–8 were written as one batch against one red (no step 5 at all), and after row 9's red the executor wrote the interactive question machine (`collectInteractiveAnswers`, `askField`, the summary) in one change, because a partial machine could not pass any path. Rows 10, 11, 12, 13, 15, 16, 18 and 20 were then green at once against that machine and are recorded as "no red", as are row 4 (b) and row 19 (b); row 8 had no red of its own outside the batch. The first failures of rows 11, 14 (d) and 16 were mistakes in the tests' own scripts or assertions, fixed in the tests without touching production code; they are not reds. The order is therefore coarser than /tdd's one test, one change, but no red was manufactured by reverting code.

Reproduce a row with `pnpm --dir create-wxl exec vitest run test/<file> -t="<pattern>"`.

| Row | Test file › pattern | Red | Green | Selected |
|---|---|---|---|---|
| 1 C04 | `setup-questions.test.mjs` › `step 3: directory question` | `TypeError: The "paths[1]" argument must be of type string. Received undefined` (`resolvePath(deps.cwd, directory)`) | 2 passed | 2 |
| 2 C04 | same file (whole) | the same `TypeError` | 5 passed | 5 |
| 3 C52 | same file (whole) | `expected 1 to be +0`: the first answer `~/x` accepted | 6 passed | 6 |
| 4 C64 | same file (whole) | (a) `expected 1 to be +0`: CW-E04 exits without asking again; (b) no red: existing behaviour | 8 passed | 8 |
| 5 C08 | › `non-interactive` | `expected "vi.fn()" to be called 1 times, but got 0 times` (`parseForkInitArgs`) | rows 5–8 together: 19 passed | 19 |
| 6 C12 | › `non-interactive` | `expected +0 to be 1`: `ForkInitArgError` not caught | (batch) | 19 |
| 7 C09 | › `non-interactive` | the engine received the incomplete argv instead of CW-E05 | (batch) | 19 |
| 8 C09 | › `non-interactive` | red only within the batch; no code beyond row 7's exact comparison | (batch) | 19 |
| 9 C10 | › `interactive: first pass` | `expected -1 to be greater than or equal to 0`: no prompt at all | 2 passed | 2 |
| 10 C52 | › `reprompts on invalid` | no red: row 9's machine | 1 passed | 1 |
| 11 C11 | › `interactive: second pass` | no red: row 9's machine (first failure was a miscounted test script) | 2 passed | 2 |
| 12 C11 | › `interactive: second pass` | no red: as row 11 | (with row 11) | 2 |
| 13 C13 | › `interactive: summary n` | no red: row 9's machine | 2 passed | 2 |
| 14 C51 | › `interactive: EOF` | (a), (c) `QuestionEofError: input ended while a question was open` escaped `run` (only step 5 caught it); (d) first failure was a typo in the test | 4 passed | 4 |
| 15 C63 | › `interactive: summary origin` | no red: row 9's machine | 3 passed | 3 |
| 16 C66 | › `clear with -` | no red: row 9's machine (first failure was the test's assertion) | 1 passed | 1 |
| 17 C32 | `engine-apply.test.mjs` › `step 11: apply` | `expected "vi.fn()" to be called 1 times, but got 0 times` (`runForkInit`) | 2 passed | 2 |
| 18 C68 | › `last parse` | no red: row 17 passes the last accepted parse | 1 passed | 1 |
| 19 C33 | › `step 11: CW-E12` | (a) G4 printed with POSIX single quotes, not the Fixed list's `git commit -m "Create range from WXL 3.0.0"`; (b) no red | 2 passed | 2 |
| 20 C34 | › `step 11: warnings` | no red: row 17's warnings loop | 1 passed | 1 |

Checks: `pnpm --dir create-wxl test` → `Test Files 9 passed (9) / Tests 221 passed (221)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; after staging, `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `97 passed | 1 skipped`. The en and zh-TW tables hold the same 35 ids. No existing test body changed.

### 2026-10-16 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S1 | `setup-questions.test.mjs` (34), `engine-apply.test.mjs` (6) | not measured: no coverage provider is installed in create-wxl | C04, C08–C13, C32–C34, C51, C52, C63, C64, C66, C68 | decision D (S4 `-` for Cloudflare Pages asks again) is implemented but no approved row tests it; CW-E14 for a non-`ForkInitArgError` (C57), signals during questions or step 11 (C56), DEL/C1 escaping and `./` prefixes (C60) are T-0024; next steps with setup (N8 still printed until T-0023's C40) |

**Stage 8 verification surface (D1).** create-wxl vitest runs, in-process; no terminal run of the questions until T-0025 (0005-S4).

### 2026-10-17 — stages 6 and 7 disposition

One review workflow on the staged change: Standards (18 findings, S-01–S-18, none high), Spec (27, P-01–P-27, none high), security candidates (6, C-01–C-06) with an independent false-positive filter (no candidate met the threshold). Findings and their full evidence were kept with the run; ids below are that run's.

Fixed (pre-authorisation 2 and "follow the recommendations"), each behaviour fix with a test written and run first:

- S-02, P-01, C-01, C-02: engine warnings are printed as JSON string literals, after `runForkInit` returns (red: the literal was not in the output after the call). This was a correction of the confirmed increment plan the first implementation missed.
- S-01, P-19: zh-TW CW-E12 says 靶場, not 範圍; S-03: zh-TW repository prompt and summary line differ from en beyond punctuation; S-04: zh-TW uses 部署目標 for the host throughout, options shaped as in en; S-05: zh-TW CW-E05 says 參數, not 旗標 (GLOSSARY _Avoid_); S-06: the origin prompt reads naturally and CW-E05 shows the same command fragment in both languages, without backticks. Pinned by a new `messages.test.mjs`.
- S-13, P-17, C-06: a `~` answer in step 4's ask-again loop no longer re-prints the previous answer's CW-E04 (red: CW-E04 twice).
- P-18, C-05: input lines are queued, so lines arriving between questions (type-ahead, a pasted block) are not lost (red: the second question timed out).
- P-26: decision D now has a test (S4 `-` for Cloudflare Pages in the second pass asks again); no red: the code already did it.
- Tests raised to the approved Boundary column (S-09, S-11, P-02–P-15), all green without production changes: a merged event log orders prompts, checkpoints, downloads and engine calls; `fetchArchive` is 0 at every question and called only after the accepting S6; prompt and reason counts; snapshots for "nothing written"; CW-E06 carries the engine message in every case; CW-E05 names exactly the missing flags; A6–A8 read with the engine's own helpers; C33's two paths, finishing command order and `range.json` bytes.
- S-10, P-16: test helpers follow the Notes: `deps.env` is `{ LANG: 'en_US.UTF-8', HOME: <temporary folder> }`, `runGit` rejects with `ENOENT`, non-interactive stdin is ended, short timeouts, the fixture's A9 line imported from the engine. T-0020 and T-0021 test bodies unchanged and green.
- Additions to the approved table, recorded here: the `~`-after-rejection case, the queued-lines case, decision D's case, the zh-TW wording checks.
- Cleanup: one `askDirectory` (S-12); message ids follow the spec (`S1`–`S6`, `S1-EMPTY`, `S6-ORIGIN`, …; S-16, P-20); stale comments (S-15, P-24); imports, `it.each` and table order (S-17); test names describe behaviour, not review ids.

Recorded, not changed:

- S-08, P-25: the TDD granularity is recorded in the red → green log's process note (rows 5–8 in one batch; the question machine in one change after row 9).
- S-14: one field table for the setup questions would be a refactor beyond this ticket: technical debt.
- S-18: the T-0021 landing record and the 0006 deadline notes are committed separately from T-0022.
- P-21 (prompts do not show the current default), P-22 (CW-E12 does not print the engine's warnings), P-27 (a last line without a newline before EOF counts as an answer): the spec is silent; unchanged.
- P-23: with setup, step 13 still prints N8 until T-0023's C40.
- C-03: control characters in the user's directory or answers inside printed commands are T-0024's C60.
- C-04: the step 4 → step 10 window now includes the time spent answering; step 10's re-check is T-0024's C53/C54, to consider a row "target replaced by a symlink while answering" when T-0024 starts.

Stage 7 report: `.proj.specs/0005-create-wxl/review/security-T-0022.md`.

Checks after the fixes: `pnpm --dir create-wxl test` → `Test Files 10 passed (10) / Tests 230 passed (230)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; after staging, `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `97 passed | 1 skipped`; the en and zh-TW tables hold the same 35 ids.

### 2026-10-17 — landed

Squash-merged into `main` as `ae1c677` (PR #28) by GitHub auto-merge (squash) after all ten checks passed. Status set to `done`.
