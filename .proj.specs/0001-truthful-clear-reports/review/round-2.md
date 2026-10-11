# Round 2 adversarial review: 0001-truthful-clear-reports

> Note (2026-10-11): reviewer file references are shown relative to the repository root, and references to untracked local files (installed packages, build output) are given as package@version or described. Everything else is reproduced verbatim.

Date: 2026-10-11. Prompt: `review/prompt.md`, replayed verbatim from round 1. Reviewer role: `harness-reviewer`.

Version reviewed: HEAD `72327e2`; `spec.en.md` blob `b5fb0f60db4a4eeae0ce1e99da9a36600e9b7066`; `traceability.md` blob `d8b127e23b7654e7f210c437a26a5a21fee25a46`; `CONTEXT.md` blob `a2616018cf4b80b55359a8f593b20d174cb8da88`.

Counts as reported: C — P0 0, P1 2, P2 9. V — P0 0, P1 3, P2 12. K — P0 0, P1 3, P2 12. R — P0 0, P1 2, P2 10.

**Stage 3 gate: zero P0. Passed.** P1 findings are carried into tickets (`docs/agents/review.md`, grading).

The four reports below are reproduced verbatim from the reviewers.


---

## Axis 1. Completeness（C）

## 對抗式審查 Round 2：軸 1 Completeness（C）

**審查範圍**
- 版本：HEAD 72327e2，加上工作樹中的 `spec.en.md`（blob b5fb0f6）、`traceability.md`（blob d8b127e）、`CONTEXT.md`（blob a261601）。
- 我沒有執行 Git，blob 值直接沿用 parent 提供的，讀的是工作樹檔案。
- 依凍結 prompt（`review/prompt.md`）審查。

**讀過的材料**
- 規格與審查紀錄：`review/round-1.md`（含裁決 A1–A3）、`CONTEXT.md`、`.proj.specs/OPEN-QUESTIONS.md`（OQ-001、OQ-003）
- 程式碼：`useSessionGate.ts`、`SessionGate.vue`、`useChallengePersistence.ts`（`deleteDatabase`）、`localStorageKeys.ts:299-306`、`.vitepress/theme/index.ts`（evaluate 呼叫點）、en／zh-TW 的 `session_gate` 字串
- 測試：`SessionGate.test.ts`、`useSessionGate.test.ts`、`unconfirmed-clear-outcome.test.ts`、`theme-locale-wiring.test.ts`

---

### C-1｜T40 要寫進 OPEN-QUESTIONS 的「已由真實性測試釘住」，大半在真實性矩陣裡沒有對應
- **位置**：traceability.md:182（T40）對照 :160-167（T30–T35）；spec.en.md:112-114、AC-13（:180）
- **違反**：每個 {state × field × boundary} 都要有 AC 能驗收；T40 宣稱的覆蓋必須真的存在。
- **證據**（直接讀到）：
  - T40 宣稱 `body_unconfirmed` 在 P6–P8、P10b、P10c、P11r 的路由，以及 `clear_not_started` 在 P10–P11r 的路由，「are now pinned by truth tests」。
  - 實際的真實性列：
    - 只有 T32（P7）斷言 `body_unconfirmed` 的字面字串。
    - T33（P3、P8）只斷言 hint。
    - T35（P10、P10c、P11r）只斷言 retry hint，以及沒有 `clear_not_started_hint`。`clear_not_started` 標題本身與 `body_unconfirmed` 都沒有斷言。
    - P6 與 P10b 完全沒有真實性列。
- **影響**：照 T40 實作，會在 `OPEN-QUESTIONS.md` 寫下一句不成立的覆蓋聲明。本 epic 修的正是「不成立的報告」，這等於在證據鏈裡重演同一種錯。AC-13 也會照這句驗收通過。
- **信心**：高
- **要求等級**：P1
- **建議**：二擇一。
  - 補真實性列：P6、P10b，並讓 T33、T35 也斷言 `body_unconfirmed`、`clear_not_started` 的字面字串；
  - 或把 T40 的宣稱收窄到 T30–T35 實際斷言的字串與狀態。

### C-2｜T39 漏列會保留「已退役說法」的原始碼註解
- **位置**：traceability.md:181（T39）、spec.en.md AC-12（:178-179）
- **證據**（直接讀到）：
  - **`useSessionGate.ts:294-301`**：這是被改名欄位本身的 docstring：「Whether the learner's stored work has already been deleted … an offer about work that no longer exists」。
    - 這正是 T39 第一類退役說法（flag 代表學習者的作品已經沒了）。
    - T39 只列了 306-309（`clearStarted` 的 docstring）。
  - **`SessionGate.vue:122-130`**：
    - 「Three bodies … stops being true in a different way once the delete has resolved」，在新規則下不成立：P7 的 delete 已在前一次 run resolve，畫面卻是 `body_unconfirmed`。
    - :128-129 還引用了舊版 `body_cleared` 的文案。
    - T39 只列 132-135。
  - **`useSessionGate.ts:44-48`**（信心低）：`dismissed` 的定義是「a clear that stopped after the delete had its report acknowledged」。P10 被 dismiss 時，畫面上確認的其實是 not-started 報告。
- **影響**：AC-12 通過後，被改名欄位的宣告處仍寫著「學習者的作品已被刪」。
- **信心**：高（:294-301）；中（SessionGate.vue:122-130）；低（:44-48）
- **要求等級**：P1（與 round 1 C-7 同類、同等級）
- **建議**：把上述範圍加進 T39。

### C-3｜T38 的測試位置有錯置與遺漏
- **位置**：traceability.md:180（T38）、AC-11（spec.en.md:177）
- **錯置**（直接讀到）：
  - T38 列了 `useSessionGate.test.ts` 的 14 與 43，但這兩行是 `mockCountAll` 的 `})` 和 sessionStorage double 的 `setItem:`，跟舊行為無關。
  - 推論：這兩個行號原本應該指 `SessionGate.test.ts:14`（`const storedWorkGone = ref(false)`）與 :43（mock 的 `shouldPresentGateHere`）。其中 `SessionGate.test.ts:14` 沒有被列進去。
- **遺漏**（直接讀到）：
  - `SessionGate.test.ts:72-82`：`beforeEach` 的重設段。mock 新增 `clearFailurePhase` 之後這裡也要重設，否則狀態會在測試之間外洩。
  - `SessionGate.test.ts:152-156`：「the delete has resolved, so the work is gone」。T38 只寫了「151」，不清楚是否涵蓋這段註解。
  - `SessionGate.test.ts:301-305`：「here the stored work is already gone」。
  - `SessionGate.test.ts:323-325`：「Past the resolve of the database delete there is none」。T38 只列 326-327。
  - `useSessionGate.test.ts:454-458`：「no stored work left for "continue with this work" to mean」。
  - `useSessionGate.test.ts:612-618`：「the work really is gone, so `storedWorkGone` alone …」，以及舊的「two guards」理由。
- **影響**：AC-11 通過時，測試註解仍保留退役說法；mock 新欄位的重設也可能漏掉。
- **信心**：高
- **要求等級**：P2
- **建議**：修正行號並補上上述位置。

### C-4｜P5、P14 的設定寫法下，F1 根本不會觸發
- **位置**：traceability.md:66（P5）、:79（P14）、:161（T31）；`localStorageKeys.ts:299-306`
- **證據**：
  - 直接讀到：sweep 只對當下存在、而且屬於 clearable 的 key 呼叫 `removeItem`。
  - P5 只寫「Learner rows in the database; F1」。P14 是 P2 之後的 retry，而 P2 的學習者證據可能只在資料庫裡。
  - 推論：照字面設定時，localStorage 沒有 clearable key，`removeItem` 不會被呼叫，run 會成功（P15），到不了 P5、P14。T31 的前置條件也沒有要求 localStorage 裡要有 key。
- **信心**：中高
- **要求等級**：P2
- **建議**：P5、P14 的設定與 T31 的前置條件都加上「至少有一個 clearable 的 localStorage key」。

### C-5｜run 順序的封閉性：多條可達序列沒有狀態列，也沒有「同值即同列」的規則
- **位置**：traceability.md:58-80（States）、:101-114（T1、T5–T10）
- **證據**：以下序列依選擇規則可以推出結果，但矩陣沒有列（依規則推得）：
  - P4/P5 之後 retry 遇到 *other* rejection（F5）。T6x 只列 P3x。
  - P7/P8 之後的任何結果：delete 又失敗、sweep 失敗、in flight、成功。
  - P9、P14、P10 的後續 run。
  - P3x 之後 retry。P13 只寫「after P2/P3」。
  - P2/P3/P3x 之後的 in-flight run。
  - P11a/P11b 上發起的 run：in flight、delete 失敗、sweep 失敗，可能落在 site root。
  - 從 P10b/P10c/P11r 走 reload 出口。P11b 只列 P2/P3/P3x/P7/P8 為來源。
  - 從 P4/P5 以外的狀態手動 reload。
  - P2 之後的 run 開始時，phase 由 `'delete'` 變成 `null`：T8 只列 P1（本來就是 null）與 P6（`'sweep'`→null）。這個轉換只能從 exposed 欄位觀察到，所以只有 AC-2 能抓。
  - T1 沒有列 P15，也沒有列 P11 之後成功 resolve 的 run。
- **影響**：目前沒有推出不安全的結果。但這些序列的值靠讀者自行歸類，沒有 AC 可以直接驗收。
- **信心**：中
- **要求等級**：P2
- **建議**：二擇一。
  - 加一條封閉規則：狀態由 (`databaseDeleted`, `clearStarted`, phase, error 種類, in flight) 決定，任何序列落到同值的列；
  - 或補上「`'delete'`→null at run start」這類欄位列與上述狀態。

### C-6｜「新文件上讀不到 start record」這個 reload 轉換沒有狀態列
- **位置**：traceability.md:13（earlier state 的定義提到「only when no start record was restored」）、:74-75、:177（AC-8，P0、P12 維持現狀）；`useSessionGate.ts:215-225`（`readClearStarted` 在例外時回傳 false，註解自承這個限制）；spec.en.md:27-30
- **證據**（推論）：
  - spec 自己點名的自然觸發是 Firefox 在頁面開著時關掉 `dom.storage.enabled`。如果 sessionStorage 也跟著失效，P4 或 P7 之後手動 reload，新文件會讀不到 record。
  - 依定義這時落在 P0：顯示 `body`（「Nothing is deleted unless you choose」），continue 可以按、也會被接受。再按刪除會被拒，依定義落在 P12：顯示 `clear_not_started_hint`（「Nothing was deleted」），continue 仍在。
  - 這時資料庫可能在前一頁已經刪掉；如果是 P7 之後，刪除可能還在排隊。AC-8 卻把這兩個畫面釘成「與 72327e2 相同」。
  - Out of Scope 與 OQ 都沒有記錄這個情況。
- **信心**：中低（取決於 sessionStorage 在該觸發下是否一併失效）
- **要求等級**：P2（只需要記錄；程式在這裡沒有第二份儲存可依靠）
- **建議**：在 Out of Scope 或新的 OQ 記下這條路徑；或加一列狀態，明說它歸入 P0/P12，是刻意接受的取捨。

### C-7｜欄位矩陣的缺口
- **位置**：traceability.md:99-114
- **證據**（直接讀到）：
  - **T10a 漏了 P10**（:112）：它列了 P10b、P10c、P11r，但 T9 有 P10。P10 正是 A1「refused run 不改 `clearStarted`」的典型情況。實作若在 P10 把 `clearStarted` 清成 false，畫面上看不出差別，只有 AC-2 能抓，但 AC-2 沒有對應的列。
  - **`clearError` 完全沒有欄位列**：
    - run 開始時設為 null（`useSessionGate.ts:467`）；
    - 失敗時是原始訊息；
    - refused 時改成 sentinel，覆蓋前一次留下的原始訊息。
  - **其他未列的轉換**：
    - `clearStarted`：run 開始時設 true（P1、P6）、新文件還原（P11a/P11b）、成功時清除（P15）；
    - phase：新文件裡為 null、成功時的值；
    - `databaseDeleted`：在 P2、P3、P3x、P10b、P11r、P12、P13 維持 false。
- **信心**：高
- **要求等級**：P2
- **建議**：T10a 加上 P10；補 `clearError` 列，以及上述轉換列。

### C-8｜spec 的散文與矩陣不一致
- **位置**：spec.en.md:93-97 對照 traceability.md:52-53、:136/:141（T18、T23）；spec.en.md:52-53 對照 T26（:144）
- **證據**：
  - **Reload**：散文是「reload appears when a run was started and the latest phase is not `'sweep'`」，漏了「error present」。照散文，P1、P6 會出現 reload，T18、T23 則是沒有。
  - **Dismiss**：散文是「dismiss appears only when the latest phase is `'sweep'`」，同樣漏了「error present」。
  - **Refused run**：散文說 refused run「adds its own report and changes nothing an earlier run left」。但 T26（P10）裡，前一次的 `sweep_failed` 報告與原始錯誤行都消失了，被 sentinel 取代。「adds」與「changes nothing」的字面意思和矩陣不符。
- **信心**：中
- **要求等級**：P2
- **建議**：散文補上 error 條件；refused run 那句改成「replaces the report; leaves `clearFailurePhase` and `clearStarted` as they were」。

### C-9｜AC 欄與操作列的小缺口
- **位置**：traceability.md:141（T23）、:149（T29p）、:123（T13）、:125-126（T16、T16a）
- **證據**：
  - AC-5、AC-6 寫的是「in the same states」，所以適用於 T23、T29p。但這兩列的 AC 欄只寫 AC-4。
  - T13（dismiss 被拒）漏了 P0。
  - T16 沒有列 P0。
  - T16a 只列「P4、P5 then dismiss」，沒有 P9、P10、P14 被 dismiss 之後的情況。
- **信心**：高
- **要求等級**：P2

### C-10｜真實性矩陣與 S3 的狀態／邊界覆蓋
- **位置**：traceability.md:158-174；spec.en.md:27-30
- **證據**：
  - 會顯示「本 epic 改過的字串」、卻沒有真實性列的狀態：
    - P2：顯示新 `clear_unconfirmed_hint` 最常見的狀態；
    - P13；
    - P9、P14：在不同歷史下顯示 `sweep_failed`；
    - P10b：retry hint；
    - P11b：最常見的 reload 落點（AC-8）。
  - 沒有真實性列的邊界：sweep 在列舉 key 時就丟例外（`length`／`key()`）。Problem statement 把它列為自然觸發，而新的 `sweep_failed` 隱含「已經嘗試移除過」。
  - S3：T36 沒有斷言 reload 不存在，T37 沒有斷言 continue 不存在。
- **信心**：中
- **要求等級**：P2

### C-11｜T43 只修了 *site-wide clear* 的詞條，`CONTEXT.md` 其他地方還寫「一切」
- **位置**：traceability.md:185（T43）；`CONTEXT.md:221`
- **證據**（直接讀到）：*challenge-scoped clear* 詞條的 `_Avoid_` 寫「另有全站清除，移除本站在這個瀏覽器裡的一切」。這和修正後 :227 的「介面語言的偏好刻意保留」不一致。
- **信心**：高
- **要求等級**：P2
- **建議**：T43 的範圍擴大到 `CONTEXT.md` 裡所有描述全站清除範圍的句子。

---

**跨軸附記（不計入本軸）**：P11b（從 P7 走 reload 出口、刪除可能仍在排隊）只剩 Clear，沒有其他出口，而 AC-8 把它釘成現狀。是否算「沒有出口的狀態」，留給 R 軸判斷。

**等級統計**：P0 0 件、P1 2 件（C-1、C-2）、P2 9 件（C-3 至 C-11）。

相關檔案：
- .proj.specs/0001-truthful-clear-reports/traceability.md
- .proj.specs/0001-truthful-clear-reports/spec.en.md
- .vitepress/theme/composables/useSessionGate.ts
- .vitepress/theme/components/SessionGate.vue
- .vitepress/theme/composables/localStorageKeys.ts
- tests/unit/components/SessionGate.test.ts
- tests/unit/composables/useSessionGate.test.ts
- CONTEXT.md


---

## Axis 2. Verifiability（V）

## 第 2 輪對抗式審查：軸 2 Verifiability（V）

**審查範圍**：working tree 的 `spec.en.md`、`traceability.md` 和 `CONTEXT.md`。我沒有 Bash，所以沒有自己重算 blob，直接採用你給的 b5fb0f6／d8b127e／a261601。程式碼以 HEAD 72327e2 為準；測試和程式碼在 working tree 裡都沒有改動。

**讀過的檔案**：
- 凍結 prompt、`review/round-1.md`
- `useSessionGate.ts`、`SessionGate.vue`、`useChallengePersistence.ts`（`getDb`／`deleteDatabase`）、`usePentestNotes.ts`
- `en.json`、`zh-TW.json` 的 `session_gate`
- `SessionGate.test.ts`、`useSessionGate.test.ts`、`unconfirmed-clear-outcome.test.ts`、`meaningful-stored-work.test.ts`、`session-gate-scope.spec.ts`
- `playwright.site.config.ts`、`vitest.config.ts`、`.gitignore`
- `OPEN-QUESTIONS.md` 的 OQ-001 與 OQ-003
- `fake-indexeddb@6.2.5/build/esm/FDBFactory.js`、`idb@8.0.3/build/index.js`

---

### V-1｜S2/S3 字面比對沒有規定「相等」還是「包含」，在既有句子後面附加假句子時測試不會變紅
- **位置**：spec.en.md:126-131（「compares the rendered text with literal strings」「CI-1 is checked against the same literals」）、:54-55、:70-71（US6）、AC-7（:171-172）、AC-9／AC-10（:175-176）；traceability.md:35、:160-166、:173-174
- **違反**：US6 要求把句子改假，測試就要變紅；AC-7 必須能機械判定。
- **證據**：
  - 直接讀到：prior art 一律用 `expect(w.text()).toContain(...)`（SessionGate.test.ts:229-239、:275-278、:294-296）。
  - 直接讀到：CI-1 只檢查測試裡的字面字串（traceability.md:35），不檢查 message 檔。也就是說，實際出貨的字串只能靠字面比對這一步擋 CI-1。
  - 推論：照 prior art 用 toContain 時，把 `sweep_failed` 改成「原句＋ Your saved work is gone.」，T30／T31 仍然綠燈，T35c 也綠燈。
  - Playwright 端也有同樣的歧義：`toHaveText` 與 `toContainText` 都可以選。
- **影響**：真實性測試只擋得住「替換」式的修改，擋不住「附加」式的修改，所以 OQ-003 要補的缺口只補了一半。
- **信心**：中高
- **等級**：P1
- **建議**：明訂每個句子要對它所在的元素做 trim 後的完全相等（S3 用 `toHaveText` 搭配字串，並註明不可用 `toContainText`），必要時加上 data 屬性當定位點。

### V-2｜「reopening the database's stores」這種讀法會建立資料庫；F2 還在時會卡住；而且分辨不出 T32、T35 要讀的事實
- **位置**：spec.en.md:127-128（前置條件只能透過 localStorage、sessionStorage、reopening the database's stores、test's own connection handle 讀取）；traceability.md:162（T32「after the test closes it, the database is gone」）、:166（T35「the database unchanged since before the press」）、:160（T30）
- **違反**：真實性測試必須在指定 seam 讀得到它聲稱讀取的機器狀態。
- **證據**（直接讀到）：
  1. 不存在的資料庫一 open 就會被建立（FDBFactory.js:270-275）。所以「已刪除」和「沒刪除但是空的」，重開後看到的都是空的 store，T32 的「database is gone」用重開讀不出來。
  2. 在 P10 和 P11r，資料庫在 P4 已經刪掉。測試在按下前做快照時，重開本身就會把資料庫建回來；如果按下後錯誤地發出了 delete，再重開還是同一個空庫，所以「unchanged」驗不出錯誤。
  3. open 和 delete 共用 connection queue（FDBFactory.js:12-19、:301）。被擋住的 delete 會一直持有這個 queue，直到連線關閉為止（:20-30）。所以在 P10c（從 P7 進入，F2 仍然開著）時，任何重開都會一直等下去。
  4. T30 為了驗前置條件而重開，留下的連線如果沒有關，會擋住後面的 run。
  - 另外，`indexedDB.databases()` 是存在的（FDBFactory.js:382-401），但不在 spec 列出的讀法裡。
- **影響**：T32、T35 的前置條件不是做不出來，就是做出來也測不到東西，AC-7 的「asserts its preconditions」只能各自解讀。
- **信心**：高（機制）
- **等級**：P1
- **建議**：
  - 把 `indexedDB.databases()` 列為允許的讀法。
  - T35 的「unchanged」定義成三件事：`databases()` 的清單不變；測試持有的 native handle 沒有收到新的 `versionchange`；F3／F5 的 stub 沒有被呼叫。
  - 規定讀完就關閉測試自己開的連線，並且不得在 F2 還持有時重開。

### V-3｜F3 的替身如果不是 `IDBRequest`，idb 會立刻丟 TypeError；P3／P8 會悄悄變成 P3x，T33 照樣通過
- **位置**：traceability.md:88（F3）、:90（F5）、:163（T33：「the replaced delete fired nothing」）；程式碼 idb index.js:140-144、:196-204；useChallengePersistence.ts:550-554
- **違反**：T33 聲稱讀的是「逾時」這個狀態，但它的前置條件讀的是 stub 本身，不是 gate 的結果。
- **證據**：
  - 直接讀到：`deleteDB` 會呼叫 `wrap(request).then(...)`，而 `wrap` 只有在 `request instanceof IDBRequest` 時才會 promisify。
  - 推論：替身如果是普通的 EventTarget，`.then` 不存在，會同步丟出 TypeError，`deleteDatabase` 立刻 reject，結果是 other rejection 而不是 timeout。
  - P3 與 P3x 的期望字串完全相同（T20、T33、T33x），而 T33 沒有斷言原始錯誤行。
- **影響**：逾時路徑（P3、P8，以及 T25 的 P8）實際上可能從來沒被測過，測試卻是綠的。
- **信心**：中
- **等級**：P1
- **建議**：
  - 規定 F3 和 F5 的替身必須是全域 `IDBRequest` 的實例（例如 fake-indexeddb 的 `IDBOpenDBRequest`）。
  - T33 的前置條件加一條：原始錯誤行包含 "time limit"（或者時間推進超過 bound 之前 gate 仍然在進行中）。
  - T32 同理，加斷言原始錯誤行包含 "another tab still has it open"，證明 `blocked` 事件真的觸發過。

### V-4｜有些前置條件是套套邏輯，或者分辨不出要驗的事實
- **位置**：traceability.md:162（T32「native blocking connection is open」）、:163（「No native connection is held」）、:160（T30）
- **證據**：
  - `IDBDatabase` 沒有公開的「是否開著」狀態，而且連線是測試自己開、自己沒關的，所以這兩條斷言說不出任何新事實。
  - T30 是 P4，依構造本來就「沒有 learner rows」。所以「重開後沒有 learner rows」不論 delete 有沒有發生都成立，建立不了 `body_cleared` 所宣稱的「資料庫已刪除」（只有 T31 建立得了）。
- **信心**：中
- **等級**：P2
- **建議**：
  - T32 改成斷言測試的 handle 收到了 `versionchange`。
  - T30 先放一筆 initialization-only 的 row，事後斷言它不見了，或改用 `databases()`。

### V-5｜T38 的行號指向無關的行
- **位置**：traceability.md:180；tests/unit/composables/useSessionGate.test.ts:14、:43、:456-458
- **證據**（直接讀到）：
  - `useSessionGate.test.ts:14` 是 `})`（mockCountAll 的結尾）。
  - `:43` 是 sessionStorage 替身的 `setItem:`。
  - 兩行都沒有任何舊行為。推測是誤植了 `SessionGate.test.ts:14`、`:43`，那兩行確實是 `storedWorkGone`。
  - 真正陳述舊主張的註解在 456-458（「there is no stored work left」），T38 卻列 459-470 的 helper 本體。
- **影響**：AC-11 在這幾個位置沒辦法判定。
- **信心**：高
- **等級**：P2
- **建議**：更正行號。

### V-6｜T39 漏掉最直接陳述退役主張 1 的 docstring
- **位置**：traceability.md:181；useSessionGate.ts:294-301；SessionGate.vue:122-130
- **證據**（直接讀到）：
  - 對外匯出的 `storedWorkGone` docstring 寫著：「Whether the learner's stored work has already been deleted … an offer about work that no longer exists」，這正是退役主張 1。T39 列了 306-309（那是 `clearStarted` 的 docstring），卻沒有列 294-301。
  - SessionGate.vue:128-129 還引用了舊的 `body_cleared` 原句。
- **影響**：AC-12 判定通過時，改名後的公開欄位文件仍然寫著這個主張。
- **信心**：高
- **等級**：P2（與 C、K 軸交叉）
- **建議**：把這兩處加進 T39。

### V-7｜AC-11 與 AC-12 的正向判準需要詮釋
- **位置**：spec.en.md:106-107（「brought in line」）、AC-11（:177）、AC-12（:178-179）；traceability.md:180-181
- **證據**：
  - 「asserts or states the new behaviour」「states the rule this spec sets」都沒有逐一指名每個位置要陳述哪一條規則。
  - 案例刪除算不算通過也沒有說明。例如 SessionGate.test.ts:129-140 pin 的 mock 狀態，在真實 composable 下根本到不了。
  - 退役主張 1 的措辭是「the flag means…」。像 useSessionGate.ts:497-499 的「the learner's stored work is gone」不是在講旗標，算不算違反要靠詮釋。
- **信心**：中
- **等級**：P2
- **建議**：
  - 每個位置對應到一條選擇規則或一個 T 列。
  - 明定「狀態不可達的案例可以刪除」。
  - 退役主張 1 改寫成「任何說學習者的（已存）作品已經消失或刪除的句子」。

### V-8｜AC-1／T4「`.vitepress/` 底下沒有出現」的判定，取決於用哪種 grep
- **位置**：spec.en.md:162-163；traceability.md:104
- **證據**（直接讀到）：
  - gitignored 的本機建置產物（`.vitepress/dist/assets/chunks/` 下一個雜湊命名的 theme chunk）目前有 2 處 `storedWorkGone`（`.gitignore:10-11` 忽略 dist 與 cache）。
  - 檔案系統 grep 和 `git grep`／rg 會得到相反的結果，重新 build 之前也一樣。
- **信心**：高
- **等級**：P2
- **建議**：改成「tracked files（`git grep`）」。

### V-9｜T11 在 P12 的「marker written」取決於 F4 的生命週期，而 spec 沒有規定
- **位置**：traceability.md:120（T11）、:89（F4）；useSessionGate.ts:257-264
- **證據**：
  - 只有 F1 寫了要在 finally 還原。
  - F4 若在按 continue 時還在，`writeMarker` 會吞掉例外，marker 就寫不進去。
  - 這時行為其實正確（與 72327e2 相同），T11 卻會判定失敗。
- **信心**：中高
- **等級**：P2
- **建議**：規定每個 fault 在觸發它的那一次按下之後立刻在 finally 還原。

### V-10｜T15 的 localStorage 條款沒有鑑別力，seam 也不一致
- **位置**：traceability.md:124；spec.en.md:122-123（S1 沿用 mock persistence 的 prior art）
- **證據**：
  - F1 在的時候 `removeItem` 一律丟例外，所以「note draft 還在」不論 sweep 有沒有跑都成立。真正能鑑別的只有 phase `'delete'`。
  - T15 屬於 S1（AC-3），但 F2 需要真實的 persistence 加上 fake-indexeddb，跟 S1 的 prior art（mock persistence）互斥。
- **信心**：中
- **等級**：P2
- **建議**：
  - 第二次 run 時撤掉 F1，讓留下來的 draft 能證明 sweep 沒跑。
  - 把 T15 移到 S2，或者為 S1 定義對應的 mock rejection。

### V-11｜T29p 的欄位留白
- **位置**：traceability.md:149
- **證據**：
  - Raw error 到 Dismiss 這幾欄都是空的。圖例只定義「—」代表不存在，空白沒有定義。
  - 「as T27, T28r」只放在 Report 欄，Body 欄則寫著「presented」。
- **信心**：中
- **等級**：P2
- **建議**：每一欄都填上值，或註明「其餘各欄同 T27／T28r」。

### V-12｜T40 要求記錄「已由真實性測試 pin 住」，但真實性矩陣做不到
- **位置**：traceability.md:182 對照 :158-167；spec.en.md:124-131
- **證據**：
  - 真實性列只在 P7（T32）和 P11a（T34）斷言 `body_unconfirmed` 的字面字串。P6、P8、P10b、P10c、P11r 沒有斷言 body；`clear_not_started` 在任何真實性列都沒有斷言。
  - 「Each test」的範圍是否包含 AC-4～AC-6 的 S2 測試（必須用字面字串、不得從 message 檔匯入），寫得不清楚。
- **影響**：AC-13 只看條目有沒有寫，條目裡的主張可能是假的也會通過。
- **信心**：中
- **等級**：P2
- **建議**：補上真實性列，或者明定 T17～T29s 的 S2 測試同樣要用字面字串，並且算作 truth test。

### V-13｜T41 與 T42 的內容沒有判準
- **位置**：traceability.md:183-184
- **證據**：
  - 「evidence quoted inline」沒有指定是哪一份證據。
  - 「records the re-check and its result」沒有指定要重查什麼（K5／K6？），也沒說 status 要不要變。
  - 任何文字都會通過。
- **信心**：中
- **等級**：P2
- **建議**：指名要引用的 file:line，以及要重查的問題。

### V-14｜S3 的 F1 不能照「instance」的寫法搬到 Chromium
- **位置**：traceability.md:86、:173
- **證據**（推論，沒有實測）：Storage 是帶 named setter 的 legacy platform object。在 instance 上用賦值或 `defineProperty`，會變成存入一個名叫 `removeItem` 的項目，而不是遮蔽原本的方法。所以必須 patch `Storage.prototype`，並加上 `this === localStorage` 的判斷。這樣寫失敗時會走到成功路徑，測試會明顯失敗，不會靜默通過。
- **信心**：低中
- **等級**：P2
- **建議**：S3 明訂注入方式。

### V-15｜T10a 沒有列 P10，P10 的 `clearStarted` 沒有被 pin 住
- **位置**：traceability.md:112
- **證據**（推論）：在 P10，body 與 reload 由 phase `'sweep'` 決定，continue 與呈現由 `databaseDeleted` 決定。所以就算實作在這條路徑上保留舊的第 479 行重設，畫面完全一樣，每一條 AC 都會通過。
- **信心**：低中
- **等級**：P2（與 C 軸交叉）
- **建議**：把 P10 加進 T10a。

---

**查過、沒有發現問題的項目**：
- AC 文字中沒有 appropriately、reasonably、as needed、where possible 這類詞。
- 選擇規則逐列代入 T17～T28r，結果與矩陣一致。
- AC-8 的六個狀態在 72327e2 的實際畫面與矩陣一致。
- 五個新字串在 en 與 zh-TW 下，不論採子字串或整字比對、分不分大小寫，都不含禁用詞，CI-1 的比對規則歧義不影響結果。
- F4（throw）在既有 start record 之下確實能做出 P10。
- happy-dom 的 instance `defineProperty` 可以用（prior art 已證明）。
- `databases()` 在 fake-indexeddb 6.2.5 可用。
- AC-14 在 `CONTEXT.md:227` 已經成立。
- S3 的 init script 不會讓啟動流程因 `removeItem` 而中斷（codeDraftSnapshot.ts:12 有 try/catch；usePentestNotes.ts:66 只在 addNote 時呼叫）。

**等級統計**：P0 0 件、P1 3 件（V-1～V-3）、P2 12 件（V-4～V-15）

相關檔案：
- .proj.specs/0001-truthful-clear-reports/spec.en.md
- .proj.specs/0001-truthful-clear-reports/traceability.md
- .vitepress/theme/composables/useSessionGate.ts
- .vitepress/theme/components/SessionGate.vue
- .vitepress/theme/composables/useChallengePersistence.ts
- tests/unit/components/SessionGate.test.ts
- tests/unit/composables/useSessionGate.test.ts
- fake-indexeddb@6.2.5 (installed package): build/esm/FDBFactory.js
- idb@8.0.3 (installed package): build/index.js
- local build output (gitignored): a hashed theme chunk under .vitepress/dist/assets/chunks/


---

## Axis 3. Contract conflict（K）

## 第 2 輪對抗式審查：第 3 軸「契約衝突」（K）

**審查範圍**：HEAD `72327e2`；工作樹中的 `spec.en.md`（blob b5fb0f6…）、`traceability.md`（blob d8b127e…）、`CONTEXT.md`（blob a261601…）。我沒有 Bash，blob hash 沒有自己重算，直接採用 parent 提供的值，讀的是工作樹檔案。

**讀過的材料**：
- 凍結 prompt、`review.md`、`runtime.md`、`language.md`、`workflow.md`、`platform-notes.md`、ADR-0003、`round-1.md`、`OPEN-QUESTIONS.md`
- `useSessionGate.ts`（全檔）、`SessionGate.vue`（全檔）、`useChallengePersistence.ts`（`deleteDatabase`、`hasAnyStoredData`、兩個逾時常數）、`index.ts`（gate 接線）
- `en.json`、`zh-TW.json` 的 `session_gate`
- 測試：`SessionGate.test.ts`（全檔）、`useSessionGate.test.ts`（1-80、440-779）、`unconfirmed-clear-outcome.test.ts`（全檔）、`session-gate-scope.spec.ts`、`messages-shape.test.ts`、`context-glossary.test.ts`

---

### K-1：新繁中文案把「全站清除」寫進介面字串，`CONTEXT.md` 的 `_新造詞_` 宣告因此變成假的，既有詞彙表測試會轉紅
- **位置**
  - `traceability.md:29-30`：`sweep_failed_hint`、`clear_unconfirmed_hint` 的 zh-TW 新文案都含「全站清除」。
  - `spec.en.md:103-104`：要求新字串在指稱這個動作時使用 全站清除。
  - `CONTEXT.md:226-228`：*site-wide clear（全站清除）* 標了 `_新造詞_`。
  - T43（`traceability.md:185`）與 AC-14 只要求改定義。
- **違反的契約**
  - `tests/unit/site/context-glossary.test.ts:318-331`：宣告為新造詞的詞，只要已經出現在語料裡，測試就失敗（"breaks the corpus rule from the other side … Remove the declaration"）。
  - 語料包含 `zh-TW.json`（同檔 `:176`）。
  - `CONTEXT.md:18`：`_新造詞_` 的意思是「不在語料範圍內出現過」。
- **證據**
  - 直接讀到的：目前 Grep「全站清除」只出現在 `CONTEXT.md` 與 spec 檔，不在語料裡，所以這條測試現在是綠的。
  - 推論：照 copy table 寫入 `zh-TW.json` 之後，`site-wide clear does not declare itself new while already in use` 會失敗。
  - spec 和 T43 都沒提到要拿掉這個宣告，也沒提到要改寫「此前稱法不一…」這句。
- **影響**：照 spec 實作，CI 會有一個 spec 沒預見的紅燈；`CONTEXT.md` 的這個詞條也要做 spec 範圍外的修改。
- **信心**：高（測試邏輯與語料範圍都是直接讀到的）
- **請求等級**：P1
- **建議**：T43 補一句：拿掉 `CONTEXT.md:228` 的 `_新造詞_`，或把它改寫成「本 epic 起首次出現在介面字串」之類的出處說明；AC-14 也要涵蓋這一點。

### K-2：T39 漏列改名旗標本身的公開 docstring，而它正是 AC-12 要清掉的已退役說法
- **位置**：T39（`traceability.md:181`）列了 `useSessionGate.ts` 的 96-106、141-144、306-309…，但沒有列 294-301。另見 `spec.en.md:106-107`（「The list is fixed at `72327e2`」）、AC-12。
- **違反的契約**：spec 自己的規則，即 T39 的「none says the flag means the learner's work is gone」。
- **證據**（直接讀到）：`useSessionGate.ts:295` 寫「Whether the learner's stored work has already been deleted.」，`:298-300` 寫「an offer about work that no longer exists」。這段就是 S1 seam 上對外說明這個旗標的 docstring。T4 的改名只會碰到 `:302` 的識別字。
- **影響**：清單是封閉的，所以 AC-12 可以判定通過，同時 seam 上最醒目的那句舊語意留下來。
- **信心**：高
- **請求等級**：P1
- **建議**：T39 補上 `useSessionGate.ts:294-301`。

### K-3：CI-2 的取捨理由跟現有程式碼註解寫明的規則相反
- **位置**：`traceability.md:37-39`（CI-2：「The gate asks only when detection found learner evidence (`useSessionGate.ts:365`)」）。這條是 round-1 裁決 A2 的前提。
- **衝突的既有規則**（直接讀到）
  - `useSessionGate.ts:335-341`：「An unfinished clear needs a recovery action even when deletion left no learner data.」只要還原出 start record，就不經偵測直接詢問。
  - `useSessionGate.ts:366-374`：偵測丟例外時，「Unreadable is unknown, not empty … the answer to an open question here is to ask」，在沒有找到任何證據的情況下詢問。這時 P0 的 `body` 會說「This browser already holds saved work」。
  - spec 自己的 T34（`traceability.md:165`）把前置條件寫成「the database has no learner rows」，但同一列要畫面顯示 `body_unconfirmed`（「A deletion of the saved work was started」）。
- **影響**：A2 把「未改字串預設有作品」判成可接受的取捨，理由是「一定偵測到過」。實際上有兩條路徑不成立，使用者裁決時的前提有缺口。
- **信心**：程式碼衝突為高；對裁決的影響為中
- **請求等級**：P1
- **建議**：CI-2 改寫理由，明列這兩條例外路徑（還原的 start record、讀取失敗），並說明在這兩條路徑上仍接受這個取捨；或把它們交給使用者重新裁決。

### K-4：T39 另外漏列幾處陳述舊規則的註解
- **位置**：T39（`traceability.md:181`）
- **證據**（直接讀到）
  - `SessionGate.vue:122-130`：「Three bodies … stops being true in a different way once the delete has resolved」，並引用舊 `body_cleared`「The saved work has already been deleted」。新規則下，P7 時 delete 已 resolve，body 卻是 `body_unconfirmed`。T39 只列了緊接著的 132-135。
  - `useSessionGate.ts:378-383`：說旗標就是「After a delete that succeeded and a sweep that did not, the object stores really are empty」。這跟已列入的 141-144 屬同一種說法；在 P7、P8，資料庫可能已被別的分頁重建，這句不成立。
  - `useSessionGate.ts:418-419`（`dismissClearFailure` 第一句）與 `:45-48`（`GateDecision` 的 `dismissed`）：把 dismiss 定義成「acknowledge the report of a clear that stopped after the delete」。新規則下 dismiss 讀的是 phase，不再讀 `databaseDeleted`，而且在 P10 接受的是 not-started 報告。
- **影響**：AC-12 可以判定通過，但這些註解仍陳述舊規則。
- **信心**：前兩項高；第三項中
- **請求等級**：P2
- **建議**：補進 T39。

### K-5：T38 的行號有誤指，也漏列幾段
- **位置**：T38（`traceability.md:180`）
- **證據**（直接讀到）
  - **誤指**：`useSessionGate.test.ts` 的「14, 43」是 `mockCountAll` 的 `})` 與 storage double 的 `setItem`，跟旗標無關。推論是從 `SessionGate.test.ts:14`、`:43` 抄錯檔名；`SessionGate.test.ts:14` 本身也不在列出的範圍內。
  - **漏列（SessionGate.test.ts）**
    - `:301-305`：「here the stored work is already gone, no tab is holding anything」，落在列出的 306-321 之外。
    - `:323-325`：「Past the resolve of the database delete there is none」，落在 326-327 之外。
    - `:152-156`：「the work is gone」，T38 只寫了單行 151。
  - **漏列（useSessionGate.test.ts）**
    - `:456-458`：「no stored work left」。
    - `:612-618`：「the work really is gone, so `storedWorkGone` alone would let this through」，以及兩道 guard 的舊規則。
  - **漏列（unconfirmed-clear-outcome.test.ts）**：`:171` 的測試名稱「keeps continue offered」把它寫成通則，T38 只列了 183-184。
- **影響**：AC-11 用清單判定，所以會通過，但測試裡仍有違反 T39 判準的陳述。
- **信心**：高
- **請求等級**：P2

### K-6：`CONTEXT.md` 改了全站清除的定義之後，其他地方仍說它移除「一切」
- **位置**
  - `CONTEXT.md:221`：*challenge-scoped clear* 的 `_Avoid_` 仍寫「另有全站清除，移除本站在這個瀏覽器裡的一切」。
  - 對照 `CONTEXT.md:227`：T43 改過的定義已排除介面語言偏好。
  - 程式碼註解：`useSessionGate.ts:49`（「`cleared` — everything local was deleted」）、`:487-490`（「the locale gone」）。後者正好位於 spec 要加 `clearFailurePhase = 'delete'` 的 catch 區塊旁邊。
- **證據**：直接讀到。T43 只要求改 *site-wide clear* 那一條。
- **影響**：詞彙表內部前後不一致，程式碼註解也跟修正後的定義衝突。
- **信心**：高
- **請求等級**：P2
- **建議**：T43 擴大到 `CONTEXT.md:221`；T39 補上 `useSessionGate.ts:49`、`:487-490`。

### K-7：T43 把「哪些鍵豁免」這個實作事實寫進詞彙表定義
- **位置**：T43；`CONTEXT.md:227`（「介面語言的偏好刻意保留，不在移除之列」）
- **違反的契約**
  - `CONTEXT.md:41-42`：詞彙表不該列舉本機鍵，「連想涵蓋都不該涵蓋」。
  - `CONTEXT.md:33`：上游格式不放實作細節。
  - `context-glossary.test.ts:13-15`：要防的第一種腐化，就是把實作事實寫進定義。
- **證據**：豁免是在 `localStorageKeys.ts` 逐鍵宣告的（`useSessionGate.ts:517-521` 說「declared per key beside the key」）。之後新增一個豁免鍵，這條定義就會默默變假。
- **信心**：中低（「偏好」算概念還是算鍵，屬詮釋問題）
- **請求等級**：P2
- **建議**：改成概念層的說法，例如「宣告為保留的偏好不在移除之列」，不要點名是哪一項。

### K-8：新字串 `clear_retry_not_started_hint` 的繁中版裸用「刪除」指稱這個動作
- **位置**：`traceability.md:31`（「不讓本站記下刪除已經開始」）；`spec.en.md:103-104`（新字串指稱動作時要用 全站清除）
- **違反的契約**：`CONTEXT.md:231` 的 `_Avoid_`「裸用「清除」或「刪除」…指稱一定要帶範圍」。
- **證據**：直接讀到。英文版「record that the deletion began」也是同一個指稱。這個字串是 round 1 裁決 A3 新加的，K-11 的修正沒有涵蓋到它。
- **信心**：中
- **請求等級**：P2

### K-9：新 `clear_unconfirmed_hint` 叫人「reload this page」，但畫面上的 reload 出口載入的是站台根目錄
- **位置**：`traceability.md:30`（「then reload this page」／「再重新載入這一頁」）
- **衝突的既有規則**
  - `SessionGate.vue:51-57`：`goToRoot` 是「The site root, not the current URL」。
  - `SessionGate.vue:63-77`：`onReload` 就是呼叫 `goToRoot()`。
  - spec 自己的 P11b（`traceability.md:75`）也寫 reload 出口「lands on the site root」。
- **影響**：hint 描述的動作跟同一畫面上的按鈕（「Reload and start over」）做的事不一樣。手動按 F5 也能脫困（P11a），所以不會造成損害，只是不一致。
- **信心**：中
- **請求等級**：P2
- **建議**：改成「then reload」，或寫成「then use the reload button」。

### K-10：CI-2 的豁免清單漏了 `title`
- **位置**：`traceability.md:37`（CI-2 只列 `body`、`body_unconfirmed`、`clear_not_started_hint`）
- **證據**：`session_gate.title` 是「Is this your work?」／「這些紀錄是你的嗎？」。它含有 CI-1 的禁用詞（`your`、`work`、`紀錄`、`你的`），而且出現在新字串會出現的每個狀態，例如 P4 上方，P4 的資料庫可能根本沒有學習者資料列。
- **違反的契約**：`CONTEXT.md:233` 的 `_Avoid_`（不可把全站清除讀成「作品確實存在過」）；CI-2 自稱列出了預設作品存在的未改字串。
- **信心**：中
- **請求等級**：P2
- **建議**：把 `title` 加進 CI-2 明示的取捨清單。

### K-11：spec 散文對 reload／dismiss 的摘要跟 traceability 的選擇規則不一致
- **位置**
  - `spec.en.md:95-96`：「reload appears when a run was started and the latest phase is not `'sweep'`; dismiss appears only when the latest phase is `'sweep'`」。
  - 對照 `traceability.md:52-53`：兩條都還要求「error present」。
- **違反的契約**：`traceability.md:3-4` 說散文由矩陣派生。
- **證據**：照散文讀，P1、P6、P11a、P11b（已開始、phase 為 null、沒有 error）會顯示 reload，跟 T18、T23、T28 矛盾。
- **信心**：中（spec 有標明是「In short」）
- **請求等級**：P2

### K-12：Further Notes 用「Browser panel」指重現環境，跟 repo 既有的專有用法撞名
- **位置**：`spec.en.md:155-156`
- **違反的契約**：`platform-notes.md:5-10` 與 AGENTS.md hard rule 4 的「Browser panel」，指題目頁工具面板裡的 `srcdoc` iframe（另見 `CONTEXT.md:164-170` 的 tool panel）。session gate 是平台對話框，不會畫在那個 iframe 裡。
- **影響**：讀者無法判斷重現是在哪個 surface 上做的，而 hard rule 4 要求說明驗證涵蓋哪個 surface。
- **信心**：中低
- **請求等級**：P2

### K-13：T42 沒說明 OQ-001 裡的行號引用要不要更新
- **位置**：T42（`traceability.md:184`）
- **證據**：直接讀到。OQ-001 的 Evidence 引用 `useSessionGate.ts:238`、`:486`、`:157`（`OPEN-QUESTIONS.md:46-48`）；本 epic 加入 `clearFailurePhase` 之後，這些行號會移動。`OPEN-QUESTIONS.md:21-22` 要求證據帶 `path:line`。另外 OQ-001 的 `:56` 提到 `storedWorkGone`，這在 T4 的範圍之外。
- **信心**：中
- **請求等級**：P2

### K-14：spec 用詞跟 `CONTEXT.md` 的 `_Avoid_` 有輕微衝突
- **位置與證據**
  - 「note draft」（`spec.en.md:15`；`traceability.md` 的 P4、T15、T30、T36）：對照 `CONTEXT.md:273`，「note」是實作的事件型別名稱，概念層要寫 pentest notes。不過既有的程式註解與 smoke spec 也用「note draft」。
  - 「in-memory session」（`spec.en.md:65`，User Story 3）：對照 `CONTEXT.md:190` 的「單獨寫 session」。T41 已正確寫成 attack session。
- **影響**：之後翻成 `spec.zh-TW.md` 時，容易譯成裸用的「筆記」或「session」。
- **信心**：低
- **請求等級**：P2

### K-15：規範性的繁中文案與選擇規則只住在 `traceability.md`，`spec.zh-TW.md` 的同步機制涵蓋不到
- **位置**：`spec.en.md:3-4`（規則的來源是 traceability）
- **違反的契約**
  - `language.md:11-12`：`spec.en.md` 是實作的真相來源；使用者用 `spec.zh-TW.md` 稽核。
  - `language.md:41-54`：同步檢查只看 `spec.en.md` 的 blob。
- **影響**：使用者稽核繁中版時，看不到要上線的繁中文案本身；`traceability.md` 之後改了，`synced_from_sha` 也偵測不到。
- **信心**：低（比較接近流程問題）
- **請求等級**：P2

---

**查過、沒有發現衝突的項目**：
- ADR-0001、0003、0004、0005：新 seam S2 屬正常延伸。
- `clearStarted` 的 docstring（`useSessionGate.ts:110-123`「Cleared only when a clear confirms success」）：新的「refused run 不改 `clearStarted`」反而跟它一致。spec 也已在 `spec.en.md:82-85` 明說這是對 `:479` 的刻意改變。
- `deleteDatabase` 的 docstring（`useChallengePersistence.ts:523-526`）：與新 hint 一致。
- F1 與 F4 的注入方式：符合 `unconfirmed-clear-outcome.test.ts:36-58` 對 happy-dom storage 必須在 `finally` 復原的既有規則。
- `messages-shape.test.ts`：key parity 沒問題；新字串沒有 `{`、`@`、`|`，不會觸發 vue-i18n 編譯錯誤。
- `theme-locale-wiring.test.ts` 的 mock：沒有 `storedWorkGone`，不受 T4 影響。
- *clear run* 的定義（round-1 K-1）與 *second tab* 的繁中用法：與 `CONTEXT.md` 一致。
- OQ-003 維持 open：與 `OPEN-QUESTIONS.md:17` 的狀態集合一致。
- stage 8 用 Cloudflare Pages preview：與 `workflow.md:135` 一致。

**依等級計數**：P0 0 筆，P1 3 筆（K-1、K-2、K-3），P2 12 筆（K-4 至 K-15）。

相關檔案：
- .proj.specs/0001-truthful-clear-reports/spec.en.md
- .proj.specs/0001-truthful-clear-reports/traceability.md
- CONTEXT.md
- tests/unit/site/context-glossary.test.ts
- .vitepress/theme/composables/useSessionGate.ts
- .vitepress/theme/components/SessionGate.vue
- tests/unit/components/SessionGate.test.ts
- tests/unit/composables/useSessionGate.test.ts
- tests/unit/composables/unconfirmed-clear-outcome.test.ts
- .proj.specs/OPEN-QUESTIONS.md
- docs/agents/language.md
- docs/agents/platform-notes.md


---

## Axis 4. Red team（R）

# 第 2 輪對抗式審查：Axis 4 紅隊（R），epic 0001-truthful-clear-reports

**審查版本**
- 規格與追溯檔：工作樹中的 `spec.en.md`（blob b5fb0f6）、`traceability.md`（blob d8b127e）、`CONTEXT.md`（blob a261601）。
- 程式碼：HEAD 72327e2。
- 我沒有 Bash，blob 雜湊沒有自行重算，直接採用 parent 提供的值，讀的是工作樹檔案。

**讀過的檔案**
- 凍結 prompt 與 `review/round-1.md`（含 A1–A3 裁決）
- `useSessionGate.ts` 全檔、`SessionGate.vue` 全檔
- `useChallengePersistence.ts`：`getDb`、`blocking`、`deleteDatabase`、`DELETE_TIMEOUT_MS`
- `.vitepress/theme/index.ts`：gate 與 locale redirect 段落
- `useAttackSession.ts`：init 段落
- `usePentestNotes.ts`：`removeItem` 呼叫點
- `en.json`／`zh-TW.json` 的 `session_gate`
- `tests/site-smoke/session-gate-scope.spec.ts`
- `CONTEXT.md` 的 *site-wide clear*、*challenge-scoped clear*、*session gate* 條目
- `BrowserPanel.vue` 的 sandbox 設定

我沒有執行任何測試，也沒有修改任何檔案。

---

### R-1｜「被拒的 run 疊加自己的報告、不動前一次留下的東西」與選擇規則互相矛盾：`clearError` 會被覆寫
- **位置**：
  - spec.en.md:52-53（Solution：「adds its own report and changes nothing an earlier run left」）
  - spec.en.md:94-95（「the not-started report taking precedence」）
  - traceability.md:14、18-19（只說 phase 與 `clearStarted` 不變）、:48-49（Report／Raw error 規則）、:144-147（T26、T27、T28r）
  - 程式碼：`useSessionGate.ts:467`（run 一開始就 `clearErrorState.value = null`）、:480（改寫成 sentinel）；`SessionGate.vue:178`
- **違反的要求**：規格自己的 Solution 敘述，以及 A1 裁決的「changes nothing the previous attempt left」。
- **證據**：
  - 直接讀到：error 狀態只有一個值。被拒的 run 會把它換成 `CLEAR_NOT_STARTED`。
  - 直接讀到：Report 規則讓 sentinel 優先，Raw error 規則把 not-started 報告的原始錯誤行藏起來。
  - 推論：因此前一次 run 的報告與原始錯誤（例如 P7 的「another tab still has it open」）會被「取代」，不是被「疊加」。
  - 實際上「不動前一次留下的東西」只對 `clearFailurePhase` 與 `clearStarted` 成立，對 `clearError` 不成立。glossary 與 T9、T10a 沒有一列提到 error 被覆寫。
- **影響**：
  - Solution 的敘述與矩陣不一致。實作者照 Solution 做（保留前一次的報告，再附上 not-started），就會跟 T26、T27 衝突。
  - 照矩陣做，就會產生 R-2、R-3 那兩種資訊遺失，而規格沒有把這當成有意的結果寫出來。
- **信心**：高（文字矛盾是直接讀到的）
- **要求等級**：P1
- **建議**：二擇一，並寫明是刻意的。
  - (a) Solution 改成「replaces the report with its own」，並在 glossary 的 refused run 加上「`clearError` 被換成 sentinel」。
  - (b) 被拒時保留前一次的報告，把 not-started 句子附在後面。

### R-2｜P10 的畫面不再告訴學習者還有殘留值，同時又提供「原地繼續」
- **位置**：
  - traceability.md:27（新的 `body_cleared` 拿掉了舊句「What is left is whatever this browser would not let go of」）
  - traceability.md:144（T26：`body_cleared` + `clear_not_started` + retry hint，dismiss 顯示）
  - 對照 72327e2：`SessionGate.vue:166-169`。舊 template 以 `storedWorkGone` 為第一分支，所以 P10 在舊版仍顯示 `sweep_failed` 與它的 hint。
- **違反的要求**：本 epic 的「每個句子在它出現的狀態裡都成立」。另外，紅隊要求區分刻意的結果與附帶的結果：這是兩項修改疊在一起造成的附帶結果。
- **證據**：
  - 直接讀到：舊版在 P10 會說「Some of this site's stored values could not be removed」，舊 `body_cleared` 也提到殘留。
  - 推論：新版的 P10 只說資料庫已刪、這次什麼都沒刪，接著提供「Close this report and carry on」。畫面上已沒有任何一句說 sweep 沒做完。
  - K2 的情境正是殘留的 note draft，也就是上一位學習者唯一的作品。學習者按 dismiss 後，會在不知情的情況下跟它並存，甚至接著編輯它。
- **影響**：揭露比 72327e2 還少，而這個退步只發生在新改的路徑上。T35 只檢查 retry hint，抓不到這件事。
- **信心**：中高
- **要求等級**：P1
- **建議**：任選其一。
  - P10 的報告改成同時呈現 sweep 結果與 not-started 報告（併入 R-1 的 b 案）。
  - retry hint 加一句：前一次沒刪掉的值還在。
  - `body_cleared` 恢復提及殘留。注意：要確認這句在 P14 與 P9 同樣成立。

### R-3｜P10b／P10c 把「關掉其他分頁」這個唯一有效的補救拿掉了，換成一個對排隊中的刪除沒有幫助的補救
- **位置**：traceability.md:31（retry hint：「Free up this browser's storage … or use a normal window, then try again」）、:145（T27）、:49（Raw error 規則）
- **證據**（推論）：
  - P10c 是在 P7 之後被拒。這時還有一筆刪除被另一個分頁擋著、仍在排隊。
  - 畫面只剩 `body_unconfirmed`、not-started 報告、retry hint 和 reload 按鈕。`clear_unconfirmed_hint` 與原始錯誤「another tab still has it open」都消失了。
  - 學習者照 hint 清出儲存空間再試，新的 delete 會排在舊的後面，繼續被擋或逾時，等於繞回 P7／P8。
- **影響**：沒有任何一句是假的，但畫面不再指出真正卡住的原因。這跟 User Story 2「remedy it suggests is one that can work」的方向相反。
- **信心**：中
- **要求等級**：P2
- **建議**：phase 為 `'delete'` 時，retry hint 加上「and close any other tabs of this site」。或者依 R-1 的 b 案，保留前一次的報告。

### R-4｜沒改的標題「The deletion was not started.」被新路由放到「A deletion … was started」旁邊
- **位置**：
  - traceability.md:145、147（T27、T28r：`body_unconfirmed` + `clear_not_started`）、:144（T26：`body_cleared` + `clear_not_started`）
  - `en.json:131`、`:135`；`zh-TW.json:131`、`:135`
- **證據**：
  - 直接讀到：`body_unconfirmed` 是「A deletion of the saved work was started and could not be confirmed」／「已存紀錄的刪除已經開始」；`clear_not_started` 是「The deletion was not started.」／「刪除沒有開始。」。
  - 推論：A1 改變了路由（舊版這幾個狀態會把 `clearStarted` 清成 false，顯示的是 `body`），所以「已開始」與「沒有開始」同框，是本 epic 新造成的組合。
  - retry hint 用「this time」／「這次」區分兩者，但標題本身仍用定冠詞指稱同一次刪除。
  - T35 只斷言 retry hint，沒有檢查這個標題在 P10b、P10c、P11r 的真偽。
  - P10 的同一問題就是 round 1 的 R-6，A3 只補了 hint；P10b、P10c、P11r 的組合是新出現的。
- **影響**：畫面字面上自相矛盾，而本 epic 的主題正是畫面要說真話。
- **信心**：中
- **要求等級**：P2
- **建議**：
  - 有前一次狀態時，改用新的標題 key，例如「This retry was not started.」／「這次重試沒有開始。」。
  - 或者在 Out of Scope 明說：標題的矛盾已知，由 hint 消解。

### R-5｜儲存持續拒絕時，P10b／P10c／P11r 經 reload 會繞回同一個 gate，這個迴圈沒有記錄
- **位置**：traceability.md:72-76（P10b、P10c、P11b、P11r）、:52（Reload 規則）；spec.en.md:145-146（Out of Scope 只記錄「other rejection」的 reload 迴圈）
- **證據**（推論）：
  - 觸發條件：`sessionStorage.setItem` 一直拋錯，但 `getItem` 正常（例如 quota）。
  - 迴圈：P11r → reload → P11（restored）→ 按 Clear 被拒 → P11r → ……
  - 只要沒有 `'sweep'`，就不會出現 dismiss。在這個分頁裡，gate 永遠關不掉，progress 也永遠被拒。唯一的出路是關掉分頁，而 record 也會跟著分頁消失（這點是既有限制）。
  - A1 之前，這條路徑會提供 continue（不安全），所以 A1 的取捨是對的。但「在這個分頁裡永遠被困住」是 A1 的新後果，Out of Scope 沒有記錄。
- **影響**：違反紅隊「no state without an exit」的檢查項目（reload 的確是出口，但只會回到同一個 gate）。
- **信心**：中（機制）；低（自然觸發）
- **要求等級**：P2
- **建議**：在 Out of Scope 與 OQ 補一條「repeated refusal loops through reload」，跟 other rejection 那條並列。

### R-6｜新 `clear_unconfirmed_hint` 說「reload this page」，但 reload 出口會導到網站根目錄
- **位置**：
  - traceability.md:30（「Close any other tabs, then reload this page.」／「再重新載入這一頁」）、:75（P11b「lands on the site root」）
  - `SessionGate.vue:51-57`、`:75-77`（`goToRoot`）
- **證據**：
  - 直接讀到：按鈕是 `window.location.assign(withBase('/'))`，不是重新載入目前這一頁。
  - 推論：學習者若照字面在題目頁按 F5，會落在「從 P2、P3、P7、P8 手動重新載入、停在題目頁」的狀態。這個狀態沒有編號，表現與 P11b 相同。
  - 規格的 catch-all（spec.en.md:96-97：error 存在、phase 為 null、不是 sentinel）只有 mock 走得到。那裡如果 `clearStarted` 也是 false，hint 會叫人去 reload，畫面上卻沒有 reload 按鈕。
- **影響**：被改寫的句子跟它旁邊按鈕的實際行為不一致。這不會造成危險，但不精確。
- **信心**：中
- **要求等級**：P2
- **建議**：改成「then reload」／「再重新載入」，或「then use the reload button below」。

### R-7｜P9／P14 的 dismiss 是否安全，取決於一個規格沒寫出來的不變式
- **位置**：traceability.md:122（T12 含 P9、P14）、:140（T22）、:53（Dismiss 規則）；spec.en.md:94-96
- **證據**（推論）：
  - P2 → P14：P2 的 delete request 被擋，逾時之後仍在排隊。後一次 run 的 delete 之所以 resolve，是因為同名資料庫的 connection queue 依序處理，所以排在前面的刪除一定已經完成。
  - 「phase `'sweep'` 就代表本頁沒有排隊中的 delete」這件事，完全靠 IndexedDB 的佇列順序（`useChallengePersistence.ts:220-225` 也記錄了 Chrome 的佇列行為）。規格沒有寫出這個推論，T22 與 T12 也沒有任何前置條件去斷言它。
- **影響**：日後如果有人改了刪除方式（例如逐一清空 store，或改資料庫名稱），dismiss 規則會在沒有任何測試變紅的情況下，重新提供「刪除排隊中卻能原地繼續」的出口。
- **信心**：低中
- **要求等級**：P2
- **建議**：在 glossary 或 Dismiss 規則旁寫一句理由。或者在 P14 的 S2 測試前置條件斷言：P2 那筆 request 已經完成（資料庫已不存在）。

### R-8｜真實性測試「重新開啟資料庫」讀前置條件時，會改變它要讀的狀態
- **位置**：spec.en.md:126-128（「reopening the database's stores, and the test's own connection handle」）；traceability.md:160、161、165（T30、T31、T34）
- **證據**（推論）：
  - 資料庫刪除之後，不帶 version 呼叫 `indexedDB.open` 會建立一個沒有 store 的 v1 資料庫。
  - 那條連線如果沒有關，它本身就等於 F2：同一個測試接下來從 P4 走到 P7（T32）時，delete 會被測試自己擋住。它也會讓站內 `getDb` 升級到 v7 時被擋，持續到 OPEN_TIMEOUT。
  - 反過來，帶 version 開啟則會觸發升級、建立 store。
- **影響**：前置斷言可能讓測試走到不同的狀態，或因為錯的理由通過或失敗，正是「讀取方式污染被讀的狀態」。
- **信心**：中
- **要求等級**：P2
- **建議**：
  - 規定讀取方式，例如 `indexedDB.databases()`；或開啟後立即 `close()`，並在下一次按下前斷言 handle 已關閉。
  - 寫明「沒有 store」視同「沒有 learner rows」。

### R-9｜S3 的 T37 沒有指定第二個頁面的 URL
- **位置**：traceability.md:174；spec.en.md:132-135
- **證據**（推論）：
  - 第二頁如果停在 `about:blank`，origin 是 opaque，`indexedDB.open` 會拋 SecurityError，根本沒有阻擋的連線。重試會直接 resolve、sweep 又失敗，走到 P9，測試因錯的理由失敗。
  - 第二頁如果載入站內題目頁：既有 prior art 用的是 `context.addInitScript`（`session-gate-scope.spec.ts:20`），會在第二頁再植入一次 evidence 與 `removeItem` 的拋錯。那一頁自己的 gate 與 `getDb` 也會開連線，不過那條連線會讓開。
  - T37 的預期字串在 blocked 與 timed out 兩種情況下都一樣，沒有斷言原始錯誤行，所以分不出到底是哪種失敗。
- **影響**：AC-10 可能測到非預期的路徑。
- **信心**：中
- **要求等級**：P2
- **建議**：
  - 指定第二頁先 `goto('/')`（根目錄不會顯示 gate），再用 `page.evaluate` 開 native 連線。
  - 斷言原始錯誤行包含「another tab still has it open」，作為 P7 的前置證據。

### R-10｜第一次 run 讀回時拋錯：record 其實已寫入，但規格說 refused run「沒有留下任何東西」
- **位置**：traceability.md:14（「write throws or does not read back. Nothing is sent to the database」）、:113（T10b）；`useSessionGate.ts:237-245`
- **證據**（推論）：
  - `setItem` 成功、讀回的 `getItem` 拋錯時，`markClearStarted` 回傳 false，run 被拒，`clearStarted` 設回 false（T10b）。但 `sessionStorage` 裡已經有 `wxl-clear-started`。
  - 下一次載入時，只要 `getItem` 恢復正常，`readClearStarted()` 就會讀到 true。gate 會顯示 `body_unconfirmed`（「A deletion … was started」），這句是假的，因為什麼都沒請求；而且這整個 browser session 都不會再提供 continue。
- **影響**：這是既有行為，規格沒有改，但 refused run 的定義掩蓋了這個殘留。
- **信心**：低
- **要求等級**：P2
- **建議**：沒有前一次狀態時，被拒的 run 嘗試 `removeItem` 自己剛寫入的 record。或者在 Out of Scope 記一筆。

### R-11｜zh-TW `sweep_failed` 的「數值」低估了殘留內容
- **位置**：traceability.md:28（「本站在這個瀏覽器存的其他數值，沒能全部刪掉。」）
- **證據**：
  - 台灣慣用語中，「數值」指數字型的值。
  - K2 的殘留是 note draft，也就是一段文字，而且是學習者唯一的作品。
  - 英文「value」沒有這個問題；舊字串也用「數值」，但這次是重寫這句。
- **影響**：zh-TW 讀者可能以為剩下的只是一些設定數字，不是筆記內容，削弱了 dismiss 前的揭露。
- **信心**：低中
- **要求等級**：P2
- **建議**：改成「其他項目」或「其他資料」。改完要重跑 CI-1 的檢查。

### R-12｜改名不留 alias，會讓自訂過 gate 元件的 fork 在合併上游時壞掉
- **位置**：spec.en.md:77-79（「No alias; the old identifier disappears」）；AGENTS.md 章程「stay forkable」
- **證據**（推論）：教師 fork 如果自訂過 `SessionGate.vue`，或任何讀 `storedWorkGone` 的元件，合併後會在建置或型別檢查時失敗。它會明確報錯，不會靜默出錯。
- **影響**：這是刻意的後果，只是沒有對 fork 使用者說明。
- **信心**：低
- **要求等級**：P2
- **建議**：在 release note 或 PR 描述註明改名。

---

### 軸外附記（不在本軸評級，供 parent 轉給對應軸）
- **K 軸**：`CONTEXT.md:221`（*challenge-scoped clear* 條目）仍寫全站清除「移除本站在這個瀏覽器裡的一切」，跟 :227 修正後的定義（保留介面語言）不一致。T43 只針對 *site-wide clear* 那一條。
- **K 軸**：retry hint 用「the deletion」／裸用「刪除」指稱這個動作，對照 spec.en.md:103-104（「use site-wide clear where they name the action」）與 `CONTEXT.md:231` 的 `_Avoid_`。
- **C 軸**：T10a（traceability.md:112）沒有列 P10，但 P10 的 `clearStarted` 同樣維持 true。T35 沒有涵蓋 P10b。

### 查過、沒有發現問題的項目
- **刪除可能還在排隊時，是否出現原地出口**：逐一套規則檢查 P2–P14、P10–P11r，沒有任何狀態在刪除可能排隊時提供 continue 或 dismiss。round 1 的 R-1 至 R-3 已由 A1 解決。
- **Continue 與 Dismiss 的 composable guard 跟 template mirror**：在所有可達狀態下等價。Reload 只有 template 這一層，但誤按只會整頁載入，沒有危害。
- **非題目頁的呈現**：P10b、P10c、P11r 因為 `clearStarted` 保持 true，仍會呈現；round 1 的 R-3 已解決。
- **in-flight 按壓**：`clearInFlight` guard 在 `clearError` 重設之前，T10c 成立。
- **沒有出口的狀態**：P1／P6 期間只剩 Clear（按了也被忽略），但最長約 10 秒（OPEN_TIMEOUT 加 DELETE_TIMEOUT）就會結束。
- **CI-1**：五個新字串在 en 與 zh-TW 都不含禁用詞（逐字比對過）。
- **S3 的 `removeItem` 拋錯**：只有 `usePentestNotes.ts:66`（新增筆記時）沒有 try 保護，載入流程不會呼叫，所以不會在到達 gate 之前把頁面弄壞。
- **Browser panel iframe**：沒有 `allow-same-origin`，題目程式碼不能開啟平台的 IndexedDB，也就不會讓「another tab」的說法失真。
- **既有限制，不在本 epic 範圍**：新文件裡 `sessionStorage.getItem` 拋錯時，record 會被讀成不存在，gate 可能在刪除排隊中提供 continue。`readClearStarted` 的註解已記錄這個限制，本 epic 沒有改變它。

**等級統計**：P0 0 件、P1 2 件（R-1、R-2）、P2 10 件（R-3 至 R-12）。

相關檔案：
- .proj.specs/0001-truthful-clear-reports/spec.en.md
- .proj.specs/0001-truthful-clear-reports/traceability.md
- .vitepress/theme/composables/useSessionGate.ts
- .vitepress/theme/components/SessionGate.vue
- .vitepress/theme/composables/useChallengePersistence.ts
- .vitepress/theme/i18n/messages/en.json
- .vitepress/theme/i18n/messages/zh-TW.json
- tests/site-smoke/session-gate-scope.spec.ts
- CONTEXT.md

---

## Adjudication (user, 2026-10-11)

| # | Findings | Ruling |
|---|---|---|
| A4 | R-1, R-2 (P1); R-3, R-4 (P2) | **Option A.** A refused run *adds* its notice and leaves the earlier report in place, as A1 states: the earlier report's heading, hint and raw error stay on screen, and `clear_retry_not_started_hint` is shown beneath them. When the refused run had earlier state, the `clear_not_started` heading is not shown. This needs a refusal notice kept apart from the earlier error. The matrix rows that replaced the report (T26, T27, T28r) are corrected to this. Rejected: B, keep replacing and extend the retry hint per earlier phase. |
| A5 | K-3 (P1); K-10 (P2) | **Option A.** The CI-2 trade-off stands, with its premise corrected: besides detected evidence, the gate also asks when a start record is restored (`useSessionGate.ts:335-341`) and when detection throws (`:366-374`); on those paths the unchanged sentences' presupposition of saved work is not backed by detection. They are existing behaviour at `72327e2`, outside this epic. `title` joins the CI-2 list. A new open question tracks the gate's fixed sentences presupposing saved work. Rejected: B, rewriting `title`, `body` and `body_unconfirmed` in this epic. |

Spec v3 folds in A4, A5 and the round-2 P1 findings (C-1, C-2, V-1, V-2, V-3, K-1, K-2), plus cheap P2 fixes listed in `traceability.md` ("Round 2 resolution"). v3 is not re-reviewed: two rounds is the ceiling. Remaining P2 findings travel with the tickets.

**Translation approved.** The user approved `spec.zh-TW.md` (synced from `spec.en.md` blob `fc04a4ea1664b8af67da2a21f7fe78ccd9005b4b`) on 2026-10-11, including the three P2 copy edits (K-9, K-8, R-11).
