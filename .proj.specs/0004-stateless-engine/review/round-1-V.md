# Stage 3 round 1：軸 2「可驗證性」（V）— epic 0004

審查版本：spec.en.md blob `0972dc4de1a875a86be737c62b9abb89e81eea7d`、traceability.md blob `ce8bb855b29b3bbcf5b94047f33aea837c565ede`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md` blob `b460b2d112e2e394c4f628fc3fdfc29864dc8fc2`。reviewer：`harness-reviewer`（只讀檔案，沒有 shell；blob hash 由 parent 以 `git hash-object` 驗證）。以下為 reviewer 報告原文，只把本機絕對路徑改成 repo 相對路徑。

---

# 驗證性軸（Verifiability）審查報告：epic 0004-stateless-engine

審查範圍：`.proj.specs/0004-stateless-engine/spec.en.md`（blob 0972dc4）與 `traceability.md`（blob ce8bb85），讀的是 working tree 的檔案。程式碼對照的是 HEAD c0f7edf。我這邊只能讀檔，不能執行 shell，所以 Git 歷史、SHA-256 值、Node 執行期行為都沒有實際跑過；凡屬推論的地方都會標明。

---

## P1

**V-1**
- 位置：spec.en.md:261（AC-B3）、traceability.md:198（T52）
- 違反的要求：驗收標準必須能不經詮釋就判定通過或失敗。
- 證據（直接讀到）：AC-B3 指定的指令是 `--rebrand acme --repo me/x`，沒有帶 `--author`。可是 spec.en.md:85 寫明 `--author` 和 `--repo` 都必填，T47 也規定缺 `--author` 是參數錯誤；check order（traceability.md:139）裡 T47 排在 T50 之前。
- 影響：照字面執行，`parseForkInitArgs` 會先丟出錯誤，`runForkInit` 根本沒有跑，「byte-identical afterwards」不論實作對錯都會成立，等於永遠通過。
- 信心：高
- 要求等級：P1
- 建議：把指令改成完整參數，例如 `--author x --rebrand acme --repo me/x`，並另外斷言 `exitCode` 0。

**V-2**
- 位置：traceability.md:173（T27）、:215（T69）；spec.en.md:151-154、:228（AC-H3）；程式碼 `.github/workflows/quality-gates.yml:21-22`、`:63-64`，`.github/workflows/release.yml:18-19`
- 違反的要求：每條驗收標準都必須能在 spec 指名的 seam 上觀察到。
- 證據（直接讀到）：`test` 和 `release` 兩個 job 的 `actions/checkout` 都沒有設 `fetch-depth`，預設是 1；只有 `prose-audit`（:124-126）設了 `fetch-depth: 0`。T72 只限制新的跨 OS job「不加 install-action 或 binaryen step」，沒有要求完整歷史。
- 推論：shallow clone 裡只看得到 HEAD 那一版 template。「Every earlier version's … SHA-256 is in the list」就會因為集合是空的而必然成立：在上游 CI 綠燈，卻什麼都沒驗到。
- 影響：AC-H3 的歷史那一半在它唯一會執行的地方（上游 CI）是空驗證。之後有人改了 template 卻沒把前一版加進清單，CI 也抓不到。
- 信心：高
- 要求等級：P1
- 建議：T72 和 `test` job 規定 `fetch-depth: 0`；或者讓 T27 在偵測到 shallow repository（`git rev-parse --is-shallow-repository`）時直接失敗，並斷言至少找到 1 個 earlier version。

**V-3**
- 位置：traceability.md:173（T27）；spec.en.md:151-154、:341-342
- 違反的要求：判定依據不得需要詮釋。
- 證據：「the template's Git history」沒有說明是哪個 ref、要不要只看 first-parent、要不要 `--follow`。推論：PR CI 跑的是 `refs/pull/N/merge`，它的歷史包含 ticket branch 上每一個 red→green commit；squash merge 之後，main 上又看不到那些 commit。
- 影響：
  - 如果同一個 epic 有多個 commit 或多張 ticket 改到 template，PR CI 會要求把從來沒發佈過的中間版本也加進清單，結果又和 spec.en.md:341-342 寫的「starts with exactly one value」互相衝突。
  - 同一個 test 在 PR 上和 main 上可能得出不同結論。
- 信心：中
- 要求等級：P1
- 建議：把歷史定義成「main 的 first-parent 歷史」或「`git log --first-parent <default-branch> -- <path>`」，並把「清單只有一個值」改成「清單等於該集合」。

**V-4**
- 位置：traceability.md:136-141（argument check order）、:195（T49）；spec.en.md:255（AC-P3）
- 違反的要求：AC-P3「the argument check order decides the message」必須判定得出來。
- 證據（直接讀到）：
  - value checks 那一組只列了 T21、T33、T34、T41、T42、T45、T46，漏了 T40（site name 空值、超長、拒絕字元），也漏了現有的 `--rebrand` 值檢查（`scripts/fork-init.ts:106-113`）。
  - 組內順序沒有定義；T42 本身是「接受」的條件，不是失敗條件。
  - 各檢查的錯誤訊息都沒有規定可區分的必要字串。例如 T16 和 T17 都會提到 `--host`，T33 和 T35 都會提到 `--origin`。
- 影響：多個 value check 同時失敗時，該出現哪一則訊息沒有定義。即使順序有定義，也沒有辦法從訊息判斷是哪一條檢查先觸發。
- 信心：高
- 要求等級：P1
- 建議：把 value checks 列成完整且有順序的清單（含 T40 和 `--rebrand`），並幫每條檢查規定一個唯一的必要子字串，或在 `ForkInitArgError` 上加 code。

**V-5**
- 位置：spec.en.md:218（AC-A4）、traceability.md:153（T7）、:171（T25）
- 違反的要求：AC 和它所派生的矩陣列必須一致。
- 證據：
  - AC-A4 寫「repeats only the warnings T7 lists」，只要求是子集合；T7 寫「warnings are exactly those whose condition still holds」，要求完全相等。
  - T7 括號裡列的是（T2、T22 left、T23 left、T25 different、T26），漏了 T25「template missing → warning naming the template」。可是第二次執行時這個條件仍然成立。
  - 「T22 left」沒說是指 T22 兩種 other 的哪一種，或兩種都算。
- 影響：template 不存在時，第二次執行該不該重複這則 warning，「規則」和「清單」給出相反的答案。
- 信心：高
- 要求等級：P1
- 建議：T7 改成明確列舉所有會重複的 warning（補上 T25 template-missing、T22 的兩種 other），AC-A4 改成「exactly」。

**V-6**
- 位置：spec.en.md:96-99、:265（AC-E1）；traceability.md:201（T55）、:11（S1）
- 違反的要求：驗收標準必須能在 S1 觀察到。spec.en.md:291 又寫明「Nothing is mocked」。
- 證據：S1 能觀察的只有檔案內容、mtime 和 result。「written to `<file>.fork-init-tmp` beside it, then renamed」在執行結束後不留下任何可觀察的痕跡；直接 `writeFileSync` 的實作照樣能通過「none remains」。
- 影響：AC-E1 裡「透過 tmp 寫入」這一半判定不了，原子性的保證沒有東西在驗。
- 信心：高
- 要求等級：P1
- 建議：指定一個不需要 mock 的觀察方式。例如先替目標檔建一個 hard link，執行後該 link 仍保有舊內容，代表做的是 rename 而不是原地寫入；或者比較執行前後的 `statSync().ino`。

**V-7**
- 位置：spec.en.md:96-98、:265-266（AC-E1、AC-E2）、:216（AC-A2）；traceability.md:149（T3）、:200-202（T54–T56）
- 違反的要求：新加的保證不得和既有規則互斥。
- 證據：
  - 「a leftover … is removed at the start of the next one (listed in `changedFiles`)」和以下三條同時存在：(a) T54「Any argument or tree error → Nothing written」；(b) T56「`--dry-run` → Nothing written」；(c) T3「Files other than A1–A9 files and the workflow → Byte-identical」。
  - 刪除 leftover 是否算「寫入」沒有定義。「at the start」又早於 tree error 的偵測，所以「tree error 之前已經刪了 leftover」和「tree error 不寫任何東西」互相矛盾。
  - leftover 的範圍也沒定義：是只限引擎可能寫入的檔案旁邊，還是整棵樹裡的任何 `*.fork-init-tmp`。
- 影響：只要測試 fixture 裡放了 leftover，T54、T56、T3 的結果就取決於怎麼解讀。
- 信心：高
- 要求等級：P1
- 建議：明確規定 leftover 的清除時機（例如所有檢查通過之後，和其他寫入同一批）、dry-run 只把它列進 `changedFiles` 而不刪除，以及 leftover 的路徑範圍。

**V-8**
- 位置：spec.en.md:227（AC-H2）、:228（AC-H3）；traceability.md:164（T18）、:170（T24）、:181（T35）
- 違反的要求：判定不得需要詮釋。
- 證據：
  - 「saying to bring the base definition, the `base` line and the three hrefs over from upstream」和「saying to bring it over from upstream」都是散文描述，沒有必要字串。
  - T35 的「asking for `--origin`」也一樣。
  - 對照之下，T22、T23、T26 都用「warning containing X」的格式，判定得出來。
- 影響：訊息寫成什麼樣才算「saying to bring … over」，每位驗證者的標準會不同。
- 信心：高
- 要求等級：P1
- 建議：列出必要子字串，例如 `A9`、`.vitepress/config.mts`、`const siteBase`、`base: siteBase`、`head`、`upstream`；T24 要有 template 路徑；T35 要有 `--origin` 和 `cloudflare-pages`。

**V-9**
- 位置：spec.en.md:217（AC-A3）、traceability.md:152（T6）、spec.en.md:295-296
- 違反的要求：全稱量詞要能落成有限的測試。
- 證據：
  - 「arguments X」沒有指定，等於對所有參數組合都要成立。
  - 「any subset」沒說是要窮舉全部子集，還是取樣。
  - 「wrote」不包含 `--host cloudflare-pages` 刪除 workflow 這種動作，也不包含被中斷時留下 `.fork-init-tmp` 的狀態，而後者正是真實中斷會產生的狀態。
- 影響：測試計畫表只能自己挑 X 和子集，挑法不同，AC-A3 是否通過就不同。
- 信心：高
- 要求等級：P1
- 建議：把 X 固定下來（例如 S7 的 GH、CF 兩組參數，再加一組 `--base`），要求窮舉該 X 會寫入的檔案的所有子集，並把「已刪除的 workflow」和「留有 tmp」兩種狀態納入半套用狀態。

**V-10**
- 位置：traceability.md:17（S7）、:219（T73）；程式碼 `playwright.site.config.ts:50-55`；`docs/agents/platform-notes.md:22-24`
- 違反的要求：stage 8 指名的 surface 必須真的被操作到。
- 證據（直接讀到）：
  - `reuseExistingServer: !process.env.CI`，所以在本機執行時，只要 4173 port 上已經有 server，Playwright 就會直接沿用。
  - platform-notes 明寫 site-smoke 可能在 4173 留下 preview server。
  - S7 依序做兩個 export，卻沒要求每次 smoke 之前清掉 4173。
- 影響：CF export 的 `pnpm test:smoke` 可能打到 GH export（或上游）的 server。T73 的 exit 0 不能證明測到的是該 export 的 build。
- 信心：中高
- 要求等級：P1
- 建議：S7 加一條規定：每次 `pnpm test:smoke` 之前，確認 4173 沒有 LISTEN（引用 platform-notes 的清除指令），或改用 `CI=1` 執行。

**V-11**
- 位置：traceability.md:17（S7）、:220-221（T74、T75）；spec.en.md:278（AC-X1）
- 違反的要求：觀察點必須明確。
- 證據：
  - S7 的指令序列在 GH export 最後跑 `SITE_BASE=/x/ pnpm build`，會覆寫 `.vitepress/dist`。
  - 可是 S7 的「Observable output」沒有說 T74（favicon hrefs at `/`）要在第一次 `pnpm build` 之後、第二次 build 之前讀取。
- 影響：照字面「先跑完所有指令再讀輸出」，GH export 的 favicon 會是 `/x/`，T74 就會失敗。同一份實作，判定結果取決於什麼時候讀。
- 信心：中
- 要求等級：P1
- 建議：在 S7 的序列中明確插入「在此讀取 T74」，或把 `/x/` build 輸出到另一個目錄。

**V-12**
- 位置：spec.en.md:119-125；traceability.md:112-116（Overridden contracts 中屬於註解的各列）
- 違反的要求：每條規範都要能走到一條驗收標準（矩陣是唯一的真相來源）。
- 證據：
  - 以下改寫要求沒有任何矩陣列或 AC 涵蓋：fork-init 模組註解（含 `ForkInitArgs.base` 型別註解）、VitePress config 註解（`config.mts:12-21`、`:69-75`）、short-link 模組註解（`shortLink.ts:22-23`）、LocaleSwitcher 和它測試裡的註解（`LocaleSwitcher.vue:66`、`locale-switcher.test.ts:144`）、parity 與 toolchain-parity 的 header 註解。
  - AC-E4 只涵蓋測試；只有 T28 對 template header 定了禁止字串。
- 影響：舊規則（例如「`fork:init --base` rewrites this line to a plain literal」）留在註解裡，stage 6 也沒有判定依據可以讓它失敗。
- 信心：高
- 要求等級：P1
- 建議：為每個註解位置加上必要和禁止字串（比照 T28），並增設一條 AC。

---

## P2

**V-13**
- 位置：spec.en.md:230（AC-H5）、:260（AC-B2）、:267（AC-E3）；traceability.md:82、:167、:171、:204
- 證據：「today / as today / today's」出現了 8 處，都沒有錨定到某個 commit。T58 的「stdout as today」沒有說比的是格式還是逐字內容。
- 影響：epic 合併後「today」的指涉會漂移；stdout 怎麼比對也需要詮釋。
- 信心：高
- 要求等級：P2
- 建議：統一定義「today = c0f7edf 的行為」；T58 改成列出 stdout 的結構規則。

**V-14**
- 位置：traceability.md:75、:171（T25）
- 證據：Workflow states 規定「compared after normalising CRLF to LF」，但 T25 說「a different one left with today's warning」，而現行程式的判斷是 `existing !== deployContent`（`fork-init.ts:335`），沒有做正規化。
- 影響：不帶 `--host` 時，一個 CRLF 版、內容和 template 相同的 workflow 要不要發出 warning，兩條規則給出相反答案。
- 信心：中
- 要求等級：P2

**V-15**
- 位置：spec.en.md:216（AC-A2）、:220（AC-A6）；traceability.md:150（T4）
- 證據：AC-A2 說「the manifest changes only in A1 fields」，比較的是 bytes；T4 說「every other field's value unchanged」，比較的是值。重新序列化會改動非兩空格縮排的 manifest 在 A1 欄位以外的 bytes。「existing line-ending style」對混合換行、或沒有結尾換行的檔案也沒有定義。
- 影響：同一份輸出，用 bytes 比和用值比的判定結果不同。
- 信心：中
- 要求等級：P2

**V-16**
- 位置：spec.en.md:230（AC-H5）
- 證據：AC-H5 前半寫「in both modes」，後半的 T26 warning 沒有標明適用於哪個模式。T26 標的是 anchor 模式，但 T51「complete list of differences」裡也沒有 T26。
- 影響：rebrand 模式下該不該發出這則 warning，從 AC 的字面讀不出來。
- 信心：中
- 要求等級：P2

**V-17**
- 位置：spec.en.md:229（AC-H4）對照 traceability.md:169（T23）
- 證據：AC-H4 對 removed warning 只要求含 `removed`；T23 要求含 `removed` 和路徑。
- 影響：AC 比它派生的矩陣列寬鬆。
- 信心：高
- 要求等級：P2

**V-18**
- 位置：spec.en.md:92-95、:265（AC-E1）；traceability.md:203（T57）
- 證據：tree error 的訊息只規定「naming the anchor … and the file」，沒說要用 anchor id（`A6`）還是描述性名稱；T57 的 `/` 路徑規則涵蓋 warning，但不涵蓋 `message`。
- 影響：Windows 上 message 裡的路徑分隔符號沒有定義，跨 OS 的斷言寫法會不一致。
- 信心：中
- 要求等級：P2

**V-19**
- 位置：traceability.md:174（T28）、spec.en.md:231（AC-H6）
- 證據：「the header」沒有定義，template 本身是由 `───` 包住的一段註解區塊；「the build step」也沒有說要用什麼方式辨識。前例是 parity test 用 `s.run === 'pnpm build'`（`fork-template-parity.test.ts:132`）。
- 影響：header 的範圍和 build step 的辨識方式要靠驗證者自己決定。
- 信心：中
- 要求等級：P2

**V-20**
- 位置：traceability.md:214（T68）、spec.en.md:249（AC-G3）
- 證據：pristine check 回報的欄位識別字沒有規定（例如兩個 A7 檔要怎麼區分）。
- 影響：「Exactly that field reported」沒有可以比對的值。
- 信心：中
- 要求等級：P2

**V-21**
- 位置：traceability.md:223-226（T77–T80 的 seam 都是「—」）、:223；spec.en.md:283（AC-D1）
- 證據：
  - 文件類 AC 沒有指名 seam，不知道該用 vitest 測試還是人工 grep。
  - 「rewritten as a whole」「the sections name upstream's config by path」「the Cloudflare section has no sub-path `SITE_BASE` step」都是散文描述，不在必要和禁止字串清單裡。
  - 「upstream repository URL」沒說是否包含 `wxl.browserlab.online`。
  - 「section」的範圍沒有定義（到下一個 `###` 為止？）。
- 影響：這幾條的通過與否要靠詮釋。
- 信心：高
- 要求等級：P2

**V-22**
- 位置：traceability.md:225-226（T79、T80）、spec.en.md:284-285
- 證據：「say that a range made before the setup record exists has none」「records that `--host` decides the workflow」都需要詮釋。GLOSSARY.md:75-79、:354、:363-364 目前還沒有這些變更。
- 影響：AC-D2、AC-D3 只能靠閱讀判斷。
- 信心：高
- 要求等級：P2
- 建議：改為必要子字串。

**V-23**
- 位置：traceability.md:220（T74）、:17
- 證據：
  - 「hero name」在靜態 HTML 裡的定位方式沒有指定（例如 VPHero 的 `.name`）。
  - 「every `[data-short-link]`」沒有最低數量要求，若改成 ClientOnly 會因為一個都沒有而照樣通過。目前有 4 題帶 `number:`。
  - 只檢查根語系的 `challenges.html`。
  - 「favicon hrefs at `/`」的寫法要求的是相等還是前綴，不清楚。
  - 「every file … read as static HTML with entities decoded」也套用到 JS 和 wasm 檔，語意不清。
- 信心：中
- 要求等級：P2

**V-24**
- 位置：spec.en.md:278、traceability.md:17
- 證據：AC-X1 需要整個 epic 的功能都已完成，但沒有說由哪一張 ticket 的 stage 8 執行，也沒有說在哪個 HEAD 上執行。
- 影響：在功能還沒到齊的 ticket 上做 `git archive HEAD` 必然失敗。
- 信心：中
- 要求等級：P2

**V-25**
- 位置：traceability.md:56-57、:61-64（A6、A7 的辨識與「unparsable」）
- 證據：一行看起來像 anchor 但值無法解析時（例如 `  title: X,`、`  name: WXL # c`），算不算一個 match 沒有定義。如果同一個檔案還有另一行合法的 anchor，結果可能是成功（1 個 match），也可能是錯誤（2 個 match 或無法解析）。
- 影響：判定結果取決於解讀。這種情況在 YAML 裡等於重複 key，所以影響小。
- 信心：低
- 要求等級：P2

**V-26**
- 位置：traceability.md:192-193（T46、T47）
- 證據：`--author ""` 這種空字串算「missing」（T47）還是「invalid」（T46），沒有定義。現行程式用的是 `!values.author`（`fork-init.ts:94`），會把它當成 missing。
- 影響：在多項失敗時，這會影響 check order 決定的訊息。
- 信心：中
- 要求等級：P2

**V-27**
- 位置：traceability.md:119-126（Character rules）
- 證據（推論）：general category 的判定依賴執行期 ICU 的 Unicode 版本，Node 22 和 Node 24 可能不同。新指派的 Cf 字元在兩個版本上會有不同結果，而 T72 的 matrix 同時跑 22 和 24。
- 影響：同一個輸入在不同 Node 版本上判定可能不一致。
- 信心：低
- 要求等級：P2
- 建議：註明以執行期的 `\p{gc=…}` 為準，或測試只用穩定的字元。

**V-28**
- 位置：traceability.md:12（S2）、:204-205（T58、T59）；程式碼 `scripts/fork-init.ts:477`
- 證據（推論，未實際執行）：macOS 的 `os.tmpdir()` 在 `/var` 底下，而 `/var` 是指向 `/private/var` 的 symlink。ESM 主模組的 `import.meta.url` 會解析成 realpath，`process.argv[1]` 卻不會，所以 `resolve(process.argv[1]) === __filename` 可能不成立，`main()` 就不會被呼叫：exit 0、沒有任何輸出。
- 影響：T58 會因此失敗，所以問題抓得到；但 S2 的 fixture 要放在哪個路徑，spec 沒有說明。
- 信心：低
- 要求等級：P2

**V-29**
- 位置：traceability.md:222（T76）、:18（S8）
- 證據（推論）：「every script `src` and stylesheet or modulepreload `href` … starts with `/assets/`」可能被 VitePress 放在根目錄的資源推翻，例如 `/vp-icons.css`。這個 config 沒有 `socialLinks`，所以目前不太可能出現。
- 影響：若出現這類資源，AC-X2 會在 base 正確的情況下失敗。
- 信心：低
- 要求等級：P2
- 建議：改成「不以 `/x/` 這類非根 base 開頭」，或「與 production 的集合同形」。

**V-30**
- 位置：traceability.md:91-94（keep list）、:200（T54）
- 證據：
  - 「both trees' `wxl-fork-init` skill」沒說是指整個目錄還是只有 `SKILL.md`。
  - guard 會不會掃描二進位的 tracked file 沒有定義。
  - T54 的「Nothing written」沒說要比 bytes、mtime 還是檔案集合（新檔、刪檔）。
- 影響：guard 的掃描範圍和 T54 的判定基準要靠驗證者自己定。
- 信心：中
- 要求等級：P2

---

## 檢查過且沒有發現問題的部分

- 用 `grep` 搜尋「appropriately / reasonably / as needed / where possible」等字眼，spec 和 traceability 裡一處都沒有。
- 以下各條都能判定，只是偶爾有上面已列出的小問題：AC-A1、A5–A8；AC-H1、H6、H7；AC-O1、O2；AC-N1–N3；AC-G1、G2；AC-P1、P2；AC-B1、B2；AC-E2–E4；AC-C1–C3。
- 上游 slug 的分布和 spec.en.md:337 的說法一致：README 第 7、55 行；CONTRIBUTE 第 60、299 行；CHANGELOG；package.json；兩份 skill；fork-init 的原始碼和測試。
- 有幾條宣稱我沒辦法執行指令驗證：template 在 `72327e2` 的 SHA-256 值、Git 歷史只有一個版本、`actions/configure-pages` 的 `base_path` 行為。

---

統計：P0 有 0 項，P1 有 12 項，P2 有 18 項。