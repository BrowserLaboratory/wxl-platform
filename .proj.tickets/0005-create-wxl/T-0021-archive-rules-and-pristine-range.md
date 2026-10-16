---
id: T-0021
title: Strict archive rules and the pristine range
epic: 0005-create-wxl
status: done
blocked_by: [T-0020]
---

## Context

create-wxl writes files from a downloaded archive, so the archive is a trust boundary (spec, trust
boundaries). This ticket pins the strict parse and entry rules 1–5, every pristine-processing rule
P1–P4 including its failures, and the `range.json` schema. It also sets upstream's `.gitattributes`
(U1) so that upstream's own `git archive HEAD` passes the same rules. Epic 0006 builds base and target
pristine ranges with the same functions.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seams 0005-S1 and 0005-S3;
"Archive entry rules", "Pristine processing", U1.

## Deliverable

A hostile or malformed archive is rejected with CW-E08 before anything is written; a P-rule failure is
CW-E10 with the target unchanged; a valid archive yields exactly the pristine range and `range.json` the
spec lists; `git archive HEAD` of upstream passes the rules.

## Acceptance criteria

- [x] C17: symlink, hardlink, FIFO, char and block device, GNU sparse → CW-E08 naming path and rule 1, nothing written (AC-9)
- [x] C18: each rule-3 path of the row → CW-E08 (AC-9)
- [x] C19: two first components; pax `comment` absent or another commit → CW-E08 (AC-9)
- [x] C20: each rule-4/5 case of the row → CW-E08 naming the later entry, or rule 5 (AC-9)
- [x] C21: pax global header with the right `comment`, GNU long-name header, ordinary entries → accepted, headers not written (AC-9)
- [x] C23: `CHANGELOG.md` with versions after the marker, and with CRLF → truncated after the marker, LF lines (AC-11)
- [x] C24: each missing file or marker of P1/P2 → CW-E10 naming file and rule, target unchanged, temporary directory removed (AC-11)
- [x] C25: `OPEN-QUESTIONS.md` with format section, trailing `---`, entries → format section only (AC-11)
- [x] C26: `package.json` `3.0.0` or without `version` → `0.1.0` (added last), other keys kept, fork-init serialisation (AC-11)
- [x] C27: `package.json` missing, BOM, not JSON, array → CW-E10 (AC-11)
- [x] C28: archive with or without its own `range.json` → `range.json` byte-equal to the schema (AC-12)
- [x] C44: `.gitattributes` exactly U1; `git archive HEAD` passes rules 1–5, holds `.proj.specs/` and its `OPEN-QUESTIONS.md` only under `.proj.specs/`, nothing under `.proj.tickets/` or `create-wxl/`, no NFC/case collision (AC-20)
- [x] C55: truncated gzip; an HTML body with status 200 → CW-E08 (AC-9)

## 給使用者（zh-TW）

把下載的 archive 當成不可信的輸入：符號連結、路徑穿越、大小寫碰撞等一律拒絕，什麼都不寫；原廠處理 P1–P4 的每條規則與失敗都有測試；上游的 `.gitattributes` 改好，讓上游自己的 `git archive` 也通過同一套規則。0006 會重用這些函式。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Drafted by a workflow (one drafting agent, one independent checker that corrected 19 problems) and approved by the user on 2026-10-16 together with T-0020–T-0025 and decisions D1–D12, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S1 | 規則 1：只接受一般檔案（`0`、NUL、`7`）與目錄（`5`），其他型別一律拒絕；整份清單在 step 8 之前驗完，什麼都不寫 | `create-wxl/test/archive-rules.test.js`（檔名依 T-0020 慣例），`describe('entry rules')` 的 `it.each`，每種型別一個 case。Fixture 由 entry 清單建出：先放有效的 prefix 目錄與 P1–P3 檔案，**最後**才放違規 entry。違規 entry 用 tar 的 `Header` 寫原始 header：symlink `2` 與 hardlink `1` 帶 `linkpath`（缺 linkpath 會先被 strict parse 拒絕）；char `3`、block `4` 帶 devmajor／devminor；FIFO `6`；GNU sparse `S`；unknown typeflag `Z`。pax global `comment` 設為 `deps.source.commit`，最後 `zlib.gzipSync`。`fetchArchive` stub 回 `{ status: 200, body }`；`deps.fs.mkdtemp` 包一層 spy；argv 為 `[target, '--no-setup']`，target 不存在 | C17 / AC-9 | matrix 的六種（symlink、hardlink、FIFO、char device、block device、GNU sparse），加上 Fixed list 規則 1 的 unknown（`Z`），各自都是：exit 1；stderr 以 `CW-E08` 開頭，帶規則 1 與該 entry 的 path（path 的形式見 open question 1）；target 仍不存在；parent 裡沒有 `.create-wxl-*`；`mkdtemp` 一次都沒呼叫，證明前面的有效 entry 也沒寫。預期紅燈：T-0020 的 happy-path parser 不檢查型別，link 與 device 不是被略過就是被寫出，結果 exit 0，或落在 CW-E09／CW-E14；`S` 與 `Z` 會被 node-tar 以 `ignoredEntry` 默默丟掉，結果 exit 0。若某個 case 一跑就綠，照 T-0019 的格式記成「一跑即綠：既有行為」 |
| 0005-S1 | 規則 3：拿掉第一個 component 後，路徑形狀不合法就拒絕 | 同一檔案，`describe('entry rules')` 的 `it.each`。Entry 路徑一律寫成 `${PREFIX}/${case}`；PREFIX 是 `UPSTREAM_SLUG.split('/')[1]` 加上 `-<commit>`，測試不拼出 slug。用 `Header` 寫原始 header，型別 `0`（`a/` 那個 case 也是型別 `0`）。「路徑為空的檔案」那個 case 的 header 路徑恰好是 `${PREFIX}`，型別 `0`、沒有結尾 `/`。其餘 fixture 與 spy 同上 | C18 / AC-9 | matrix 的十二種：`/abs`（即 `${PREFIX}//abs`）、`../x`、`a/../x`、`a//b`、`./x`、`a\b`、`.git/x`、`.GIT/x`、`a/x.`、`a/x `（尾端空白）、型別 `0` 的檔案 `a/`、含 ESC 的名稱 `a\u001bb`。再加上 Fixed list 規則 3 的三種：DEL `a\u007fb`、C1 `a\u0085b`、路徑為空的檔案。每一種都是：exit 1；`CW-E08` 加規則 3，指名該 entry；什麼都不寫；`mkdtemp` 未呼叫。控制字元怎麼跳脫輸出由 T-0024 的 C60 驗證，這裡只斷言代碼、規則編號，以及訊息裡有指名 entry。預期紅燈：T-0020 沒有路徑規則，結果 exit 0，或寫入時才失敗變成 CW-E09。陷阱：node-tar 會把型別 `0`、結尾 `/` 的 header 改判成目錄；在 win32 還會把 `ReadEntry.path` 的 `\` 換成 `/`。實作必須讀原始 typeflag 與 `entry.header.path`，否則 `a/` 會保持紅燈，`a\b` 在 Windows CI 上會被放過 |
| 0005-S1 | 規則 2：所有路徑的第一個 component 必須相同，而且 pax global `comment` 必須等於要求的 commit | 同一檔案，`describe('entry rules')`，三個 case：有效 fixture 之後多一個 `other/b`（不帶 `other/` 目錄 entry）；不寫 pax global header；寫了 pax global header，但 `comment` 是另一個 40 位小寫 hex。commit 取自 `deps.source.commit`，不設 `CREATE_WXL_COMMIT` | C19 / AC-9 | 兩個不同的第一 component → `CW-E08`、規則 2、指名 `other/b`。沒有 `comment` → `CW-E08`、規則 2、指名 `pax comment`。`comment` 是別的 commit → 同上。三種都是 exit 1、什麼都不寫、`mkdtemp` 未呼叫。預期紅燈：T-0020 既不比對 `comment`，也不比對第一 component，所以 exit 0，多出的 `other/b` 不是被寫成 `b` 就是被丟掉 |
| 0005-S1 | 規則 4–5：不能有重複、大小寫或 NFC 碰撞、檔案在檔案底下的路徑（不論先後順序），而且至少要有一個檔案；碰撞時指名後出現的 entry | 同一檔案，`describe('entry rules')` 的 `it.each`，每個 case 一份 fixture。Fixture 只含 matrix 列出的 entry，加上 prefix 目錄與 P1–P3 檔案，**不替 `a` 補父目錄 entry**：補了會讓目錄 `a/` 先變成碰撞的那一個。spy 同上 | C20 / AC-9 | 檔案 `a` 再 `a/b` → 指名 `a/b`。`a/b` 再檔案 `a` → 指名 `a`。目錄 `a/` 再檔案 `a` → 指名 `a`。同一路徑 `x.txt` 出現兩次 → 指名 `x.txt`（兩個 entry 的路徑相同，訊息分不出是哪一個）。`Readme.md` 再 `README.md` → 指名 `README.md`。Fixed list 規則 4 的 NFC 碰撞：`café.md` 再 `café.md` → 指名後者。以上都是 `CW-E08` 加規則 4。只有 prefix 目錄 → `CW-E08`、規則 5。全部 exit 1、什麼都不寫、`mkdtemp` 未呼叫。預期紅燈：碰撞要到檔案系統層的 `wx` 寫入或 mkdir 才失敗，變成 CW-E09；在大小寫有別的檔案系統（Linux）上，大小寫與 NFC 的 case 會 exit 0；只有 prefix 的 case 會變成 CW-E10（缺 `CHANGELOG.md`），而不是規則 5 |
| 0005-S1 | pax global／extended header 與 GNU long-name header 都是 metadata，不是 entry；一般檔案與目錄照常接受 | 同一檔案，`describe('metadata headers')`，一份 fixture，內容如下：pax global header（`comment` 正確，用 tar 的 `Pax` 以 global 模式 encode）；一個 pax extended `x` header 帶 `path`（約 110 bytes），後面接一般檔案 header；一個 GNU `L`（`././@LongLink`）header 帶約 120 bytes 的路徑，後面接名稱截短的一般 header；兩個長路徑的每一層父目錄 entry 都照順序放齊。為了 Windows 的 MAX_PATH，相對路徑不超過 130 bytes。檔案 entry 的 typeflag `0`、NUL、`7` 各一個，目錄用 `5`，再加上 P1–P3 檔案。不放 GNU `K` header：一般檔案前面放 `K`，node-tar strict 會以 linkpath forbidden 拒絕 | C21 / AC-9 | exit 0；target 遞迴列出的路徑集合，剛好等於 fixture 的檔案與目錄（拿掉 prefix）加上 `range.json`；沒有 `pax_global_header`、`PaxHeader`、`././@LongLink` 這類檔案；兩個長路徑檔案都存在，內容 byte-equal；`0`／NUL／`7` 三個檔案都寫出來。預期紅燈：T-0020 若把 `g`／`x`／`L` 當成 entry，會多寫出檔案；或者剛加上的規則 1 誤判 metadata，回 CW-E08。若 T-0020 已處理好，記成一跑即綠 |
| 0005-S1 | strict parse：gzip 截斷、200 回應其實是 HTML、header 損壞、tar 截斷，一律以 CW-E08 帶 parse error 結束 | 同一檔案，`describe('strict parse')` 的 `it.each`：`gzipSync(有效 tar)` 只取前一半 bytes；`fetchArchive` 回 `{ status: 200, body: <UTF-8 的 '<!DOCTYPE html><html>…'> }`；Fixed list 的兩種補充：其中一個 header 的 checksum 刻意弄壞（不重算），以及 gzip 完整、但裡面的 tar 在某個 entry 內容中途截斷。spy 同上 | C55 / AC-9 | 四種都是 exit 1；stderr 以 `CW-E08` 開頭，帶 parse error 的訊息（不比對整句）；什麼都不寫；`mkdtemp` 未呼叫。預期紅燈：非 strict 的解析會把錯誤當 warning 吞掉（TAR_ENTRY_INVALID、TAR_BAD_ARCHIVE），得到空的或不完整的 entry 清單，結果是 CW-E10（缺檔）或 exit 0 但靶場殘缺，而不是 CW-E08 |
| 0005-S1 | P1：`CHANGELOG.md` 保留到第一行 `## [Unreleased]`（含）為止，其後全部截掉，保留的每一行都以 LF 結尾 | `create-wxl/test/pristine.test.js`，`describe('P1')`，三個 case：在有效 fixture 裡替換 `CHANGELOG.md` 的內容，跑 `--no-setup`，讀 target 的 bytes | C23 / AC-11 | (1) `# Changelog\n\nintro\n\n## [Unreleased]\n\n## [3.0.0] - 2026-10-16\n- x\n` → 剛好是 `# Changelog\n\nintro\n\n## [Unreleased]\n`。(2) CRLF：`# Changelog\r\n\r\n## [Unreleased]\r\n\r\n## [3.0.0]\r\n` → 剛好是 `# Changelog\n\n## [Unreleased]\n`（marker 去掉尾端 `\r` 後才比對）。(3) Fixed list「到此以一個 LF 結尾」：marker 是最後一行且沒有換行（`# C\n## [Unreleased]`）→ `# C\n## [Unreleased]\n`。預期紅燈：T-0020 的 happy path 沒處理 CRLF，marker 比對不到而變成 CW-E10，或保留了 `\r`；(1) 很可能一跑即綠（T-0020 已實作 P1 的 happy path） |
| 0005-S1 | P1／P2 缺檔、缺 marker、P2 結果為空：CW-E10 指名檔案與規則，target 保持原狀，暫存目錄刪掉 | `pristine.test.js`，`describe('P1/P2 failures')` 的 `it.each`：從有效 fixture 拿掉 `CHANGELOG.md`；改成沒有 marker 的 `CHANGELOG.md`；拿掉 `.proj.specs/OPEN-QUESTIONS.md`；改成沒有 `^## OQ-\d{3} ` 標題的 `OPEN-QUESTIONS.md`；AC-11 與 P2 明寫的「結果為空」：`OPEN-QUESTIONS.md` = `---\n\n## OQ-001 — x\n`。target 不存在；跑完列出 parent 的內容 | C24 / AC-11 | 五種各自：exit 1；`CW-E10` 帶 `CHANGELOG.md` 加 P1，或 `.proj.specs/OPEN-QUESTIONS.md` 加 P2；target 仍不存在；parent 沒有 `.create-wxl-*`。預期紅燈：T-0020 在 step 9 失敗時沒清掉暫存目錄（殘留 `.create-wxl-*`）；缺 marker 或結果為空的檔案原樣通過，或寫成只剩一個 LF 的檔案，結果 exit 0 |
| 0005-S1 | P2：`OPEN-QUESTIONS.md` 只留第一個 `## OQ-ddd ` 標題之前的格式說明，尾端的空白行與 `---` 行全部丟掉，最後只有一個 LF；CRLF 檔也一樣 | `pristine.test.js`，`describe('P2')`，兩個 case。fixture 仿照真實檔案：格式說明區塊裡含 `---` 與範本行 `## OQ-NNN — <the question>`（不是 marker），接著 `---`，再接 `## OQ-001 — q?` 與 `## OQ-002 — r?` 兩個條目。第二個 case 是同一份內容的 CRLF 版本 | C25 / AC-11 | LF 版：輸出剛好等於格式說明區塊（含 `## OQ-NNN` 範本行與區塊內部的 `---`），尾端的 `\n\n---\n\n` 去掉，以單一 LF 結尾，不含 `OQ-001`、`OQ-002`。CRLF 版：marker 照樣比對到，輸出與 LF 版 byte-equal（全部 LF）。預期紅燈：T-0020 若只截到標題之前、沒去掉尾端，會多出 `---` 或空白行；regex 太寬會在 `## OQ-NNN` 就截斷；CRLF 版會保留 `\r`，或尾端的 `---\r` 去不掉 |
| 0005-S1 | P3：`package.json` 的 `version` 設成 `0.1.0`（原本沒有就加在最後），其他 key 與順序不變，以 fork-init 的 manifest 序列化格式（0004 T4）寫出 | `pristine.test.js`，`describe('P3')`，三個 case：輸入刻意用四格縮排，含巢狀物件，`version: '3.0.0'` 放在中間；單行輸入且沒有 `version`；第一個換行是 CRLF 的 manifest（含 `version`） | C26 / AC-11 | LF 的兩個 case：target 的 `package.json` bytes 等於 `JSON.stringify(expected, null, 2) + '\n'`。`3.0.0` 的 case：`version` 留在原位，值是 `0.1.0`。沒有 `version` 的 case：`version: '0.1.0'` 是最後一個 key。其他 key 的值與順序不變。CRLF 的 case 照 T4（scripts/fork-init.ts:534-537、1235-1239）：bytes 等於 `(JSON.stringify(expected, null, 2) + '\n').replace(/\n/g, '\r\n')`。預期紅燈：T-0020 若保留原本格式、把 `version` 插到最前面，或一律寫 LF，byte 比對就會失敗；LF 的兩個 case 可能一跑即綠 |
| 0005-S1 | P3 失敗：manifest 缺檔、帶 BOM、不是 JSON、不是物件，都是 CW-E10，target 保持原狀 | `pristine.test.js`，`describe('P3 failures')` 的 `it.each`：拿掉 `package.json`；`﻿{"name":"x"}`；`{not json`；`[]`；Fixed list「不是物件」的 `null` | C27 / AC-11 | 五種各自：exit 1；`CW-E10` 帶 `package.json` 與 P3；target 仍不存在；parent 沒有 `.create-wxl-*`。預期紅燈：BOM 與非 JSON 讓 `JSON.parse` 丟錯，落到 CW-E14 或 CW-E09；`[]` 加上 `version` 後被序列化成 `[]`，結果 exit 0；`null` 設屬性時丟 TypeError，結果是 CW-E14 |
| 0005-S1 | P4：不論 archive 自己有沒有帶 `range.json`，target 的 `range.json` 都 byte-equal 於 schema | `pristine.test.js`，`describe('P4')`，兩個 case：fixture 沒有 `range.json`；fixture 帶一份不同內容的 `range.json`（別的 repository、CRLF）。期望值用字面範本組出：`{\n  "upstream": {\n    "repository": ${JSON.stringify(UPSTREAM_SLUG)},\n    "version": ${JSON.stringify(source.version)},\n    "commit": ${JSON.stringify(source.commit)}\n  }\n}\n`，`UPSTREAM_SLUG` 從 `scripts/fork-init.ts` import，version 與 commit 取自 `deps.source` | C28 / AC-12 | 兩種都是 exit 0，`range.json` 的 bytes 剛好等於範本（兩格縮排、key 順序、一個尾端 LF），archive 自帶的內容完全被取代。override 的 commit 已由 T-0020 的 C15 驗證，這裡不重複。預期紅燈：archive 自帶的 `range.json` 被保留，或 `wx` 寫入撞上 EEXIST 變成 CW-E09；沒帶 `range.json` 的 case 可能一跑即綠 |
| 0005-S3 | 上游的 `.gitattributes` 剛好等於 U1 | `create-wxl/test/upstream-archive.test.js`，`describe('U1')`：讀 repository 根目錄的真實 `.gitattributes`，根目錄用 `fileURLToPath(new URL('../../', import.meta.url))` 取得（ESM 沒有 `__dirname`） | C44 / AC-20 | 內容剛好是 U1 的六行，以單一 LF 結尾：第 1 行註解 `# Keep template text and recorded upstream checksums stable across checkouts; keep upstream's own records out of ranges.`、`* text=auto eol=lf`、`/.proj.specs/** export-ignore`、`/.proj.specs/OPEN-QUESTIONS.md -export-ignore`、`/.proj.tickets export-ignore`、`/create-wxl export-ignore`。預期紅燈：目前的檔案只有兩行，第 1 行的註解結尾是 `across checkouts.` |
| 0005-S3 | 上游自己的 `git archive HEAD` 能通過規則 1–5；`.proj.specs/` 底下只留目錄 entry 與 `OPEN-QUESTIONS.md`；`.proj.tickets/` 與 `create-wxl/` 完全不在；沒有 NFC 或大小寫碰撞 | 同一檔案，`describe('git archive HEAD')`。用 `spawnSync('git', ['archive', '--format=tar.gz', `--prefix=${name}-${head}/`, '-o', <暫存檔>, 'HEAD'])` 產生 archive，再讀檔取得 bytes。不用 stdout，因為目前的 archive 約 13.8 MB，超過 spawnSync 預設的 1 MiB maxBuffer。`name` 由 `UPSTREAM_SLUG` 推出，`head` 取自 `git rev-parse HEAD`。git 的 env 只有 `HOME`、`XDG_CONFIG_HOME`（都指向暫存目錄）與 `PATH`，另加 `GIT_CONFIG_NOSYSTEM=1`、`GIT_ATTR_NOSYSTEM=1`。把 bytes 交給 `run([tmpTarget, '--no-setup'], …)` 的 `fetchArchive`，`deps.source.commit = head`；另外用 tar 的 list 取出路徑清單。這個 `it` 的 timeout 設 120 秒 | C44 / AC-20 | `run` exit 0、沒有 CW-E08。P1–P4 也在真實檔案上跑；若出現 CW-E10，代表上游的 `CHANGELOG.md` 或 `OPEN-QUESTIONS.md` 不合 X7 的要求，一樣算失敗。清單裡 `.proj.specs/` 底下的路徑剛好是 `{.proj.specs/, .proj.specs/OPEN-QUESTIONS.md}`；沒有任何路徑以 `.proj.tickets/` 或 `create-wxl/` 開頭；所有路徑做 NFC 加 `toLowerCase()` 之後都不重複。預期紅燈：U1 生效前，清單裡有 `.proj.specs/` 底下的所有檔案、`.proj.tickets/`，以及 T-0020 已 commit 的 `create-wxl/`。`git archive` 讀的是 HEAD 已 commit 的 `.gitattributes`，見 open question 2 |

**Notes**

- 要改 body 的既有測試（override，需核准）：根目錄的測試套件沒有任何既有測試要改。`git grep` 在 `tests/`、`scripts/`、`.github/` 都找不到 `.gitattributes`、`export-ignore` 或 `git archive`。兩份 `archify/test/checkout-line-endings.test.mjs` 的 `repoRoot` 是 `new URL('../../', import.meta.url)`，也就是 `.claude/skills/`（或 `.agents/skills/`），讀的是不存在的 `skills/.gitattributes`，不是根目錄那份；它們是 `node:test` 檔，不在根目錄 vitest 的 include（`tests/**/*.test.ts`）裡，所以不受 U1 影響。真正可能需要 override 的是 T-0020 自己的 create-wxl 測試：只要共用的 fixture archive 沒寫 pax global `comment`、少了父目錄 entry，或含有規則 3／4 會拒絕的路徑，規則 2–4 一生效，T-0020 的 C15、C22、C29、C39 等測試就會變紅。C15 的 fixture `comment` 必須等於 override 的 commit，不是 `source.commit`。只改共用 fixture builder 的預設值（預設帶正確的 `comment`、父目錄照順序放齊）算 fixture 調整；如果必須動到某個測試的 body，就逐項列出，請使用者核准後再改。
- 要建的 fixture：擴充 T-0020 的 archive builder。entry 清單是 `{ path, type, mode, content, linkpath }`，另加可選的 pax global `comment`。tar 的 writer 會拒絕的 entry（link、device、FIFO、sparse、unknown、`..`、`\\`、控制字元、型別 `0` 結尾 `/`、`//`、空路徑），改用 tar 的 `Header` 寫 512-byte 原始 header，內容補齊到 512 的倍數，結尾加兩個零區塊，再 `zlib.gzipSync`。直接改原始 bytes（例如 NUL typeflag）之後要重算 header checksum，只有 C55 的損壞 case 刻意不重算。pax global 與 extended header 用 tar 的 `Pax` encode。GNU long-name 是一個 `L` header（`././@LongLink`，內容為長路徑加 NUL），後面接名稱截短的一般 header。截斷的 gzip 取 `gzipSync(有效 tar)` 的前一半；截斷的 tar 是把有效 tar 切在某個 entry 內容中途再 gzip。HTML body 用 UTF-8 bytes。所有會被接受的 fixture，都要照順序帶齊父目錄 entry（step 8 建目錄時不用 `recursive`），也要帶 P1–P3 需要的 `CHANGELOG.md`、`.proj.specs/OPEN-QUESTIONS.md`、`package.json`。只有 C20 的碰撞 case 例外，不補父目錄。prefix 由 `UPSTREAM_SLUG.split('/')[1]` 加 `-<commit>` 組成；測試與 fixture 都不拼出上游 slug。
- 對前序 ticket 的假設：T-0020 已交付以下內容：`create-wxl/` 套件骨架（含 tar、yaml、vitest，用 `pnpm --dir create-wxl test` 執行）；`run(argv, io, deps)` 的 `--no-setup` 路徑（steps 1–4、6–10、13）；建 `deps` 的測試 helper（合法的 source record 與 engineSha256、`fetchArchive` stub、可逐個替換的 `fs`）；archive parse、解壓、P1–P4 的 happy path；以及這些路徑用到的 en／zh-TW 訊息。T-0021 要補的是：strict parse、規則 1–5、P1–P3 的每一種失敗、step 9 遇到 CW-E10 時刪除自己的暫存目錄（C24、C27 需要）。如果 T-0020 的訊息表還沒有 CW-E08、CW-E10，T-0021 在兩份表各加一筆，id 一致；語言規則本身由 T-0024 的 C41 驗證。CW-E09、訊號、CW-E11 的清理留給 T-0024（C30、C31、C54、C56、C65）。某一列若一跑就綠，照 T-0019 的格式記成「一跑即綠：既有行為」。U1 只動 `.gitattributes`；`create-wxl/` 在 T-0020 合併後已在 HEAD。
- 斷言方式：stderr／stdout 只比對訊息代碼與具名的值（規則編號、P 編號、檔名、entry 路徑），不比對整句。entry 路徑的比對集中在一個 helper `expectE08(stderr, rule, path)`，形式依 open question 1 的答案決定。語言固定為 en：`deps.env` 只放 `LANG=en_US`，`deps.locale` 設 `en-US`。「什麼都不寫」由三件事證明：target 狀態不變、parent 沒有 `.create-wxl-*`、`deps.fs.mkdtemp` 的 spy 沒被呼叫。這些測試都不設 parent 唯讀、也不檢查 mode，所以不必在 Windows 或 root 下 skip。C44 的 git 呼叫隔離 `HOME`、`PATH`、`XDG_CONFIG_HOME`，另加 `GIT_CONFIG_NOSYSTEM=1`、`GIT_ATTR_NOSYSTEM=1`，免得使用者自己的 `core.attributesFile` 多加 export-ignore（prior art：archify 的 checkout 測試）。repository 本身的 `.git/info/attributes` 無法用 env 隔離，是已知限制。`create-wxl/test/` 只存在於上游（U1 會排除），所以 0005-S3 不需要 upstream skip。
- Fixed list 的補充邊界（不在 matrix 列的字面裡，但屬於本 ticket 獨佔的 AC-9／AC-11）：C17 的 unknown typeflag `Z`；C18 的 DEL、C1、路徑為空的檔案；C20 的 NFC 碰撞；C21 的 pax extended `x`；C55 的 header checksum 損壞與 tar 截斷；C23 的「marker 是最後一行、沒有換行」；C24 的 P2 結果為空；C25 的 CRLF；C26 的 CRLF（依 0004 T4）；C27 的 `null`。依 /tdd 的最小實作原則，沒有測試就不會有實作，所以全部納入。是否回填到 matrix，見 open question 3。
- 實作陷阱（不是新需求，已對照 node-tar 7.5.11 的 dist/esm 確認）：(1) `Header` 解碼時會把 NUL typeflag 正規化成 `0`，也會把型別 `0`、路徑結尾 `/` 的 header 改判成 `5`（header.js 約第 61–67 行）。node-tar 解析時不保留原始 header block（`Header.block` 只在 encode 時設定），所以 C18 的「檔案 `a/`」要從解壓後的 bytes 自行讀取第 156 byte。(2) GNU sparse `S` 與 unknown 型別在 `ReadEntry` 會被設成 `ignore = true`，發出的是 `ignoredEntry`，不會出現在 `entry` 事件；實作必須把它們當成規則 1 違規。(3) win32 上的 `normalizeWindowsPath` 會把 `ReadEntry.path` 的 `\\` 換成 `/`；規則檢查要用 `entry.header.path`，否則 U3（T-0025）上線後，windows-latest 的 cross-OS job 會放過 `a\\b`。(4) parser 要用 `strict: true`，C55 的四種情況才不會被當成 warning 吞掉；strict 下，一般檔案帶 linkpath（例如前面接了 GNU `K`）會以 linkpath forbidden 失敗，這符合規則 1 的意圖。
- 第 8 階段的驗證面：create-wxl 的行為跑在 terminal，不在瀏覽器。本 ticket 的紀錄是在 terminal 執行 `pnpm --dir create-wxl test` 的結果（0005-S1 與 0005-S3），外加在推上去的 branch HEAD 上執行一次 `git archive HEAD | tar -tzf -`，留下 `.proj.specs/`、`.proj.tickets/`、`create-wxl/` 底下的路徑清單。完整的 0005-S4（打包後在 terminal 執行）在 epic 最後一張改 create-wxl 的 ticket T-0025 進行。這樣做是否可行，見 open question 4。
- CI：U3 的步驟在 T-0025 才加上，所以 T-0021 的 create-wxl 測試在那之前只會在本機（macOS）執行。上面陷阱 (3) 的 Windows 行為，要到 T-0025 之後的 cross-OS job 才真正驗得到。C44 在 CI 的 shallow checkout 下也能跑（`git archive HEAD` 不需要歷史）。

**Decisions applying to this ticket (approved 2026-10-16)**

- D1: stage 8 is the create-wxl vitest run record (0005-S1, in-process); the terminal surface (0005-S4) runs in T-0025.
- D3: CW-E and CW-W messages go to `stderr`; next-step lines go to `stdout`; tests pin the stream.
- D4: CW-E08 prints the entry path exactly as it appears in the archive, including the first component.
- D5: C44 runs `git archive HEAD` literally; it turns green once U1 is committed, and the red→green log says so.
- D6: the boundaries the Fixed lists state beyond the matrix rows are tested and recorded in this ticket only; no traceability revision.

### 2026-10-16 — increment plan confirmed

The executor's increment plan was checked by an independent reviewer (approve with corrections). Confirmed with these corrections: rule 1 reads the raw typeflag byte from the decompressed tar (a type `0` file named `a/` is otherwise indistinguishable from a directory) for gzip and plain tar alike; each catch accepts only its own error class (`ArchiveRuleError`, the parse rejection, `PristineError`) and rethrows the rest; CW-E10 names `.proj.specs/OPEN-QUESTIONS.md` in full and rules as `P1`/`P2`/`P3`; row 4 has the approved seven cases; row 5's fixture carries every approved boundary; row 14 isolates git and asserts the archive list; stderr anchors use `startsWith`; path assertions use production `jsonValue`; entries are checked in archive order with every rule per entry, the prefix directory accepted. Decided under "follow the recommendations" (2026-10-16): T-0021 starts after T-0020 landed, on its own branch; rule 4's proper-prefix check follows the spec literally (no case folding) — on a case-insensitive file system a file `A` with `a/b` surfaces as CW-E09, a known limit.

### 2026-10-16 — red → green log

**Process deviation (reported to the user).** The executor wrote the whole implementation first, because rules 1–5 and P1–P4 share one `checkEntryRules`, one raw tar reader and one try/catch frame in `run`, and then reproduced each row's red by temporarily removing that row's code and running the row's tests, restoring it afterwards. Every red below was measured on the code with that row's piece missing; the order is not /tdd's write-a-test-first order. Not redone: redoing it would change the order, not the code or the tests.

Reproduce a row with `pnpm --dir create-wxl exec vitest run test/<file> -t="<pattern>"`.

| Row | Test file › pattern | Red (with the row's piece removed) | Green | Selected |
|---|---|---|---|---|
| 1 C17 | `archive-rules.test.mjs` › `rule 1` | `classify()` always `'file'`: all 7 cases fail | 7 passed | 7 |
| 2 C18 | › `rule 3` (and the type `0` `a/` case) | with node-tar's reclassified `entry.type` instead of the raw typeflag byte, the `a/` case exits 0 | 15 passed | 1 / 15 |
| 3 C19 | › `rule 2` | comment and first-component checks removed: 3/3 exit 0 | 3 passed | 3 |
| 4 C20 | › `rules 4-5` | collision and has-file checks removed: 7/7 exit 0 or reach `mkdtemp` | 7 passed | 7 |
| 5 C21 | › `metadata headers` | none: existing behaviour once rows 1–4 were in | 1 passed | 1 |
| 6 C55 | › `strict parse` | parse catch removed: 4/4 unhandled rejections (`TAR_BAD_ARCHIVE`, `TAR_ENTRY_INVALID`, `unexpected end of file`) | 4 passed | 4 |
| 7 C23 | `pristine.test.mjs` › `^P1 ` | none: T-0020's CR stripping already met it | 3 passed | 3 |
| 8 C24 | › `P1/P2 failures` | step 9 catch and removal of the temporary directory removed: 5/5 unhandled `PristineError` | 5 passed | 5 |
| 9 C25 | › `^P2 ` | none: existing behaviour | 2 passed | 2 |
| 10 C26 | › `^P3 ` | line-ending preservation removed: the CRLF case's bytes differ | 3 passed | 1 / 3 |
| 11 C27 | › `P3 failures` | none: row 8's catch covers it | 5 passed | 5 |
| 12 C28 | › `^P4 ` | none: existing behaviour | 2 passed | 2 |
| 13 C44 (U1) | `upstream-archive.test.mjs` › `U1` | `.gitattributes` still the two old lines | 1 passed | 1 |
| 14 C44 (archive) | › `git archive HEAD` | red until this change is committed (D5): HEAD's `.gitattributes` is the old one, so `.proj.specs/*` and `.proj.tickets/*` are in the archive | after commit: 1 passed | 1 |

Checks before commit: `pnpm --dir create-wxl test` → `1 failed | 165 passed (166)` (row 14 only, as D5 expects); root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; after staging, `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `97 passed | 1 skipped`.

Not implemented, recorded as known limits (low-confidence points of the plan check): a meta header above the parser's size limit is reported as rule 1 rather than a parse error; with several pax global headers the last `comment` wins, and a comment mismatch and an entry violation in one archive report in rule order 2 → 1 → 3 → 4 → 5.

### 2026-10-16 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S1 | `archive-rules.test.mjs` (51 after stage 6/7), `pristine.test.mjs` (21 after stage 6/7) | not measured: no coverage provider is installed in create-wxl | C17–C21, C23–C28, C55 | the two known limits above; file-system errors during P1–P4 (C54, T-0024); a case-insensitive file system with a file `A` and `a/b` (rule 4's prefix check is literal, recorded decision) |
| 0005-S3 | `upstream-archive.test.mjs` (2) | not measured | C44 | runs against this checkout's HEAD; codeload applies the same `export-ignore` (spec fact, not re-run here) |

**Stage 8 verification surface (D1).** create-wxl vitest runs, in-process; row 14 runs real `git archive` on the committed tree.

### 2026-10-16 — stages 6 and 7 disposition

One review workflow on the staged change: Standards (25 findings, S-01–S-25, none high), Spec (16, P-01–P-16, one high), security candidates (12, C-01–C-12) with an independent false-positive filter (no candidate met the threshold). Findings and their full evidence were kept with the run; ids below are that run's.

**Process note.** For the fixes below the executor wrote each failing test first and ran it; it reports each red message as measured by temporarily reverting that one fix (marked, restored, and grepped clean afterwards). The red messages are real, but this round is not evidence of strict write-the-test-first order either, any more than the first round (see the deviation in the red → green log). Accepted under the user's "follow the recommendations" (2026-10-16) and recorded rather than redone (S-01, P-16).

Fixed (pre-authorisation 2 and "follow the recommendations"), each behaviour fix with a red then a green:

- P-01 (high, Spec): the raw typeflag walker and node-tar could fall out of step (a directory header with a non-zero size hiding a symlink header, balanced by a pax `size`), letting a symlink, hard link or device past rule 1 and be written as an empty file. The walker now follows node-tar's size rules, and each entry's path and size are cross-checked against node-tar's header, with equal counts at the end; any mismatch is a parse error (CW-E08). Red on the old code: exit 0 with the link written. Also closes C-02 and S-21.
- C-01, C-11: step 8 writes from the checker's validated `rest` and kind, not from node-tar's `entry.path`/`entry.type` (on win32 those normalise `\` to `/`); the first component must be non-empty, not `.`/`..`, and free of `\` and control characters.
- S-02, P-08, C-08: tar and zlib failures are wrapped in their own `ArchiveParseError`; `run` reports only that class as CW-E08 and rethrows the rest.
- S-03, P-03: rules 1–4 run per entry in one pass, so CW-E08 names the first breaking entry in archive order (red: a later rule-3 entry was named over an earlier collision).
- S-04: rule 5 is checked after rule 2's comment check.
- P-04: a type-5 directory without a trailing `/` is accepted.
- P-10, C-12: the pax global `comment` is read from ignored entries too.
- P-11, C-07: the run path requires the gzip magic bytes and disables zstd detection; the walker alone still reads plain tar (for T-0025's X7), now with its own test (S-17).
- P-12, C-06: decompression is capped at node-tar's 1000× ratio.
- C-05: `jsonValue` escapes U+007F–U+009F after `JSON.stringify`; the tests assert the literal `\u007f` and `\u0085`. This is the escaping part of C60 that this ticket's new output point (the CW-E08 entry path) needed; the rest of C60 stays with T-0024.
- P-09, C-10: in P1–P3 only `ENOENT` means a missing file; other read errors propagate (CW-E09 is T-0024's C54).
- S-14, P-15: zh-TW wording uses 壓縮檔 for the archive and 原廠靶場處理規則 for P1–P4 (the glossary's 原廠靶場; 封存 clashes with an _Avoid_ entry).
- S-25: rule 2's marker prints as `(pax comment)`, not as a quoted entry path.
- Tests raised to the approved plan: "nothing written" checks the target with `lstat` and the parent tree before and after (S-05, P-05); the strict-parse cases assert a parse error and not a rule (S-06, P-02; with `strict: false` one of the four turns red); the metadata case lists directories too (S-07, P-06); `range.json` is compared with a literal template (S-08, P-07); `git rev-parse` uses the isolated environment (S-09).
- Cleanup: unused import (S-10), names (S-11, S-20), comments (S-12, P-13, S-13, S-19), `rule` as the one name for the rule number and `bom` as its own P reason (S-15).

Recorded, not changed:

- S-16 (partly done: one shared `withoutRootMtime`) and S-18 (the copied 0004 T4 serialisation, locked by the CRLF test): technical debt.
- S-22, P-14: T-0020's landing record is in this ticket's change by the workflow's rule (the landing record is written on the next ticket's branch); it is committed separately so the history keeps them apart.
- S-23: no coverage provider in create-wxl; the table says so.
- S-24: the Notes' implementation pitfalls were first checked against node-tar 7.5.11; the stage 7 filter re-read the installed 7.5.22 (C-02, C-03 cite its lines) and the pitfalls still hold.
- C-04: Windows and HFS+ aliases of `.git` (`::$INDEX_ALLOCATION`, `:` streams, ignorable code points, reserved device names) are not in rule 3 as specified: a spec gap, input to the epic close-out chain analysis with G1/G2.
- C-09: cleanup after an unexpected step 8–9 error (for example a `range.json` directory) is T-0024's C54.
- C-03: false positive (pax cannot set the type).

Stage 7 report: `.proj.specs/0005-create-wxl/review/security-T-0021.md`.

Checks after the fixes: `pnpm --dir create-wxl test` → `Test Files 1 failed | 6 passed (7) / Tests 1 failed | 180 passed (181)` (row 14 only, until commit, D5); root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; after staging, `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `97 passed | 1 skipped`.

After commit (D5): `pnpm --dir create-wxl exec vitest run test/upstream-archive.test.mjs -t="git archive HEAD"` → `1 passed | 1 skipped`; `pnpm --dir create-wxl test` → `Test Files 7 passed (7) / Tests 181 passed (181)`. `git archive HEAD` lists, under `.proj.specs/`, `.proj.tickets/` and `create-wxl/`, only `.proj.specs/` and `.proj.specs/OPEN-QUESTIONS.md`. C44 ticked.

### 2026-10-16 — landed

Squash-merged into `main` as `6fbb1c2` (PR #27) under pre-authorisation 4 after all ten checks passed (Cloudflare Pages preview deployed). Status set to `done`.
