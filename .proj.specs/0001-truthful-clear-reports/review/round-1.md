# Round 1 adversarial review: 0001-truthful-clear-reports

> Note (2026-10-11): reviewer file references are shown relative to the repository root, and references to untracked local files (installed packages, build output) are given as package@version or described. Everything else is reproduced verbatim.

Date: 2026-10-11. Prompt: `review/prompt.md` (frozen). Reviewer role: `harness-reviewer`.

Version reviewed: HEAD `72327e2`; `spec.en.md` blob `835398603acaa700fce117536dfac17e99e0ed3a`; `traceability.md` blob `5b8222afe593e8bf477e890a656d533fec1b784d`; `CONTEXT.md` blob `bd73872d4d5838465100faac70f61c2e642d65d8`.

Counts as reported: C — P0 1, P1 4, P2 10. V — P0 2, P1 5, P2 9. K — P0 0, P1 6, P2 10. R — P0 1, P1 4, P2 10.

The four reports below are reproduced verbatim from the reviewers (Traditional Chinese, as the role requires). Adjudication follows at the end once the user has ruled.


---

## Axis 1. Completeness（C）

## 對抗式審查 Round 1：軸 1 Completeness（C）

審查版本：HEAD 72327e2，工作樹中的 `spec.en.md`（blob 8353986）、`traceability.md`（blob 5b8222a）與 `CONTEXT.md`（blob bd73872）。我沒有執行任何 Git 指令，blob 也是直接採用 parent 提供的值，讀到的是工作樹檔案。
另外讀過的檔案：`.vitepress/theme/composables/useSessionGate.ts`、`.vitepress/theme/components/SessionGate.vue`、`useChallengePersistence.ts`（deleteDatabase／逾時）、i18n `en.json`／`zh-TW.json`、`tests/unit/components/SessionGate.test.ts`、`tests/unit/composables/useSessionGate.test.ts`、`unconfirmed-clear-outcome.test.ts`、`OPEN-QUESTIONS.md` OQ-003。

---

### C-1｜「未啟動」的 attempt 發生在 delete 階段失敗之後：矩陣沒有這個狀態，套規則也得不到正確結果
- **位置**：traceability.md:36-50（States：只列 P4/P5 之後的 retry）、:64（T9）、:65（T10 只列一種順序）；spec.en.md:44-46（「on any attempt … offers only the full-page reload」）、:57-58（Story 3）、:71-74、:94-95；程式碼 useSessionGate.ts:478-481
- **違反**：完整性要求規則可能產生的每個 {state × field × boundary} 都要對到 AC；也違反 Story 3 與「deletion 可能還在排隊時，不能有原地離開的出口」。
- **證據**
  - 直接讀到的：`clearEverything` 在 `markClearStarted()` 失敗時，會無條件執行 `clearStartedState.value = false`（useSessionGate.ts:479）。前一次 attempt 留在 `sessionStorage` 的紀錄不會被移除。
  - 依 spec 規則推得以下兩條路徑：
  - **路徑 a：P4 → P7 → 再按一次，未啟動。** 結果是 `databaseDeleted`=true、`clearFailurePhase`=null（T9：refused 時設為 null）、error 為 sentinel。依 Dismiss 規則（spec:95），error 存在、databaseDeleted 為真、phase 不是 `'delete'`，所以**顯示 dismiss**，composable 也會接受。但 P7 那次被 blocked 的 delete 仍在排隊（逾時上限不會取消它），Reload 卻因為 phase≠`'delete'` 而消失。這正是 K4 要防的原地出口。
  - **路徑 b：P2/P3 → 再按一次，未啟動。** 結果是 `clearStarted` 被改回 false、`databaseDeleted`=false。依規則會出現以下結果：
    - Body 顯示 `body`（「Nothing is deleted unless you choose to delete it」）。
    - Report 帶出 `clear_not_started_hint`（「Nothing was deleted」）。
    - **Continue 會顯示，且 `keepExistingData` 會接受**，因為兩道 guard 都是 false。
    - 這時第一次的 delete 仍可能在排隊。
  - 如果實作者不把 clearStarted 改回 false（例如因為紀錄本來就在），結果是 Continue、Reload、Dismiss 全部不顯示，只剩一個會一直失敗的 Clear，等於沒有出口。
  - 也就是說，照目前寫法，這個狀態兩種實作都不對。
- **連帶缺口**：P2/P3 之後的其他 retry 順序也不在 States 裡，包括 in flight、delete→delete、delete→sweep。T10 只列了 `'sweep'→'delete'` 一種替換。這幾條依規則推出的結果看起來是對的，但沒有矩陣列能驗收。
- **影響**：實作照 spec 做，會在 deletion 排隊中提供原地出口（dismiss 或 continue），違反 Story 3。
- **可達性**：要讓同一頁上已存在的紀錄 `setItem`／`getItem` 拋錯。這跟 P10 的可達性相同，而 spec 已經把 P10 納入範圍。
- **信心**：中高（程式碼路徑是直接讀到的；規則是我自己套出來的）
- **要求等級**：**P0**。照目前寫法無法正確實作，必須改規則。如果使用者因可達性很低改判 P1，這個理由我接受。
- **建議**：
  - 二擇一：讓 refused attempt 不覆寫前一次的 `clearFailurePhase`；或另外記錄「本頁曾發出、且未確認的 delete」，讓 Reload 和 Dismiss 也讀這個事實。
  - 同時規定：紀錄本來就存在時，refused retry 不把 `clearStarted` 改回 false。
  - 補上 P2/P3 之後的整組 retry 狀態列。

### C-2｜重新載入後的頁面上發起的 attempt 沒有定義；未啟動時會顯示錯誤的「Nothing was deleted」
- **位置**：traceability.md:16（attempt 的定義：first＝從未動過的 gate 發起，retry＝同一頁上的後續 attempt）、:49（P11）、:94/:109（T27/T35 的扣留理由）；spec.en.md:90、:97-99；useSessionGate.ts:149-152
- **違反**：在 P11 頁面（或 reload 出口落地的 root 頁）上發起的 attempt，既不是 first（gate 不是未動過的），也不是 retry（不在同一頁）。整組狀態都沒有列。
- **證據**（依規則推得）：路徑是 P4 → 手動 reload（P11）→ 按 clear，未啟動。
  - 狀態：`databaseDeleted`=false（page-scoped）、clearStarted 被改回 false、phase=null。
  - Report 帶出 `clear_not_started_hint`，因為扣留條件只看 `databaseDeleted`。但資料庫其實在前一頁已經刪掉，「Nothing was deleted」不成立。這正是 T27/T35 要防止的同一句話。
  - Continue 會顯示。
  - 如果在非題目頁（reload 出口會落在 `/`），`shouldPresentGateHere` 會回傳 false，gate 直接消失，而 decision 停在 `undecided`。
- **影響**：spec 自己為 T27 立的真實性理由，跨過 reload 就不成立；gate 也可能無聲消失。
- **信心**：中
- **要求等級**：P1
- **建議**：attempt 的定義改為以「本瀏覽器 session 有沒有 started record」區分；扣留 hint 的條件改讀 `databaseDeleted || clearStarted 紀錄存在`。補上 P11 之後的 attempt 狀態列。

### C-3｜從 P2/P3/P7/P8 走 reload 出口後的狀態沒有列
- **位置**：traceability.md:49（P11 只寫「after P4/P5」）、:96（T28）、:108（T34）
- **證據**：Reload 按鈕只出現在 `'delete'` phase。所以 reload 出口最常見的來源是 P2/P3/P7/P8，但 P11 只定義了「P4/P5 之後手動 reload」。
  - 從 P2 reload 時，資料庫可能還沒刪、deletion 還在排隊。T34 寫的事實（「Database already deleted in the previous page」）在這條路徑不成立。
  - 依推論 `body_unconfirmed` 在這裡仍然成立，但沒有真實性列。
- **信心**：高
- **要求等級**：P2
- **建議**：把 P11 拆成「P4/P5 之後」與「reload 出口（P2/P3/P7/P8）之後」兩個狀態，各自加 T 列。

### C-4｜欄位矩陣沒有 `clearStarted` 列；T27 依賴一個沒寫出來的值
- **位置**：traceability.md:15（glossary：「a clear was started and its record is in `sessionStorage`. Unchanged.」）、:52-65、:94（T27）；spec.en.md:89；useSessionGate.ts:478-481
- **證據**：
  - 在 P10，紀錄仍在 `sessionStorage`（第一次 attempt 寫入的），但程式把 in-memory 的 `clearStarted` 改回 false。
  - Body 規則中 clearStarted 的優先順序排在 databaseDeleted 前面。T27 之所以得到 `body_cleared`，完全靠 clearStarted=false。
  - 如果照 glossary 的定義（紀錄在＝true）實作，T27 會變成 `body_unconfirmed`，跟矩陣矛盾。
- **影響**：實作者對 P10 的 clearStarted 有兩種合理解讀，T27 的結果會因此不同。
- **信心**：高
- **要求等級**：P1
- **建議**：為每個 P 狀態加 `clearStarted` 欄位列，並在 glossary 寫明「refused attempt 會把 in-memory 值設回 false」，或者改掉這個行為（與 C-1 一起決定）。

### C-5｜第三種 delete rejection（既不是 blocked 也不是 timed out）沒有列
- **位置**：traceability.md:11（「Resolves, or rejects as *blocked* … or *timed out*」）、:60-61（T5/T6）；spec.en.md:72；tests/unit/composables/unconfirmed-clear-outcome.test.ts:105-117（`mockRejectedValue(new Error('InvalidStateError'))`）
- **證據**：既有測試已經把「delete request 直接 rejected」這條路徑釘住。`deleteDB` 本身也可能 reject（例如 request onerror，或 `indexedDB` 無法使用）。
  - Spec 的 phase 規則寫成「rejects, blocked or timed out」，可能被讀成只有兩類。
  - 矩陣沒有這個 boundary，也沒有真實性列。這條路徑上 `body_unconfirmed` 的「may still be in progress」與 hint 是否成立，也沒有驗收。
- **信心**：中
- **要求等級**：P2
- **建議**：glossary 和 T5/T6 改成「任何 rejection → `'delete'`」，另加一列 other-rejection。

### C-6｜CI-1 宣稱涵蓋「every state」，但真實性列只涵蓋部分狀態，也跟未改的字串衝突
- **位置**：traceability.md:30-32（CI-1）、:100-111（T30–T37）、:84/:96（T17/T29 的 `body`）；spec.en.md:104-105、:174-176（AC-7）、:177（AC-8）
- **證據**：
  - CI-1 寫的是「In every state below, no sentence … asserts that a learner's work existed」。但 P0/P12 依 AC-8 會繼續顯示 `body`（「This browser already holds saved work …」），`body_unconfirmed` 也寫著「A deletion of the saved work was started」。
  - 真實性列只涵蓋 P3、P4、P5、P7、P8、P10、P11。P0、P1、P2、P6、P9、P12 沒有任何真實性列。
  - Spec 宣稱 `body_unconfirmed` 在 P6–P8 成立（spec:105），但只有 P7（T32）有測，P6 沒有。
- **影響**：AC-7「no state shows a sentence that violates CI-1」照字面讀時跟 AC-8 互斥；照窄義讀時，範圍又沒有寫出來。
- **信心**：中
- **要求等級**：P1
- **建議**：把 CI-1 的範圍限定在 P2–P11（或「clear 開始之後的狀態」）；補上 P2、P6、P9 的真實性列。

### C-7｜T39 的邊界漏掉新規則會推翻的 comment
- **位置**：traceability.md:118（T39）；spec.en.md:107-109、:182-183（AC-12）
- **證據**（直接讀到）：以下 comment 不屬於 T39 的兩類 claim（「flag＝work gone」、「retry throws at the sweep」），AC-12 也抓不到：
  - **優先順序反轉**：SessionGate.vue:132-135、useSessionGate.ts:307-309 都說「`storedWorkGone` … outranks `clearStarted`」。新的 body 規則在 phase=null 時讓 clearStarted 優先（P6 改成 `body_unconfirmed`）。
  - **Dismiss 寫成兩個條件**：SessionGate.vue:205-211、useSessionGate.ts:428-433 說「on the delete-failed path … continue is still on screen and still honoured」。新規則有三個條件，而且 P7 是 delete 失敗、continue 卻不顯示。
  - SessionGate.vue:185-189：「retrying the half that failed is truthful」，與新的 hint「redoes the whole deletion」矛盾。
  - SessionGate.vue:156-158：「branch is on whether the database is gone」。Spec 的 prose（:108）有點名這條，但 T39 的邊界沒有收進去，prose 和矩陣不一致。
  - useSessionGate.ts:497-501：「the failed-delete path above leaves everything intact」，在 P7 不成立。
- **信心**：高
- **要求等級**：P1
- **建議**：T39 改為逐一列出上述檔案與行號，或改成「任何陳述 body／report／exit 選擇規則的 comment，都要與新規則一致」。

### C-8｜T38 漏掉需要改寫的既有測試
- **位置**：traceability.md:117（T38）；spec.en.md:135-137；tests/unit/components/SessionGate.test.ts:36-55、:118、:129-140、:151、:165、:286、:306、:327、:456
- **證據**：
  - 這個測試檔的 mock 沒有 `clearFailurePhase`。凡是設了 `storedWorkGone`＋error 卻沒設 phase 的 case（:118、:165、:306、:327、:456），在新規則下都會落到 report 規則沒有定義的分支（見 C-9）。
  - :129-140 斷言 delete 失敗時 continue 存在，這跟真實 composable 的狀態不符，也跟新的 reload 規則衝突。
  - :286 的測試名稱「a completed deletion outranks a started clear」陳述的優先順序已被反轉。
  - T38 只點名一個 case 和一段描述。
- **信心**：高
- **要求等級**：P2（測試會紅，實作者一定會發現，但矩陣沒有列）
- **建議**：T38 逐一列出這些 case，並註明 mock 要新增 `clearFailurePhase`。

### C-9｜Report 規則缺少 fallthrough 分支
- **位置**：spec.en.md:90
- **證據**：規則依序是無 error、`'sweep'`、`'delete'`、not started。「error 存在、phase=null、而且不是 sentinel」這個組合沒有定義。真實 composable 走不到，但 mock 元件測試走得到（C-8）；spec 又說「the template only mirrors」。
- **信心**：中
- **要求等級**：P2
- **建議**：明訂這個組合不可達，或指定一個 fallback。

### C-10｜矩陣沒有語系維度與頁面種類維度
- **位置**：traceability.md:82-96（T17–T29）、:110-111（T36/T37）；spec.en.md:169-173、:130-134
- **證據**：
  - 只有 S2 真實性測試（T30–T35）寫了 en 與 zh-TW；AC-4–6 和 S3 的兩個 Playwright case 沒寫語系，也沒寫是在題目頁、root 還是 zh-TW mirror。
  - 這次改名會碰到 `shouldPresentGateHere`／`hasGateDecision`（useSessionGate.ts:149-152、:282-284），但矩陣沒有「是否呈現 gate」的列。P10 在非題目頁能否繼續顯示，完全靠 `databaseDeleted`。
- **信心**：中
- **要求等級**：P2
- **建議**：加上 {isChallengePage × P4–P11} 的呈現列，S3 也要指定語系與頁面。

### C-11｜成功路徑和 in-flight 再按一次都沒有列
- **位置**：traceability.md:16（attempt＝「One call」）、:36-50；useSessionGate.ts:466
- **證據**：
  - 首次成功、P4/P5 之後 retry 成功、P2 之後 retry 成功，這些都沒有列；成功時 `clearFailurePhase` 的值也沒寫。
  - 在 P1/P6 期間再按一次 clear 時，會被 `clearInFlight` guard 擋下直接 return。依 glossary 這仍算一次「call」，也就是一次 attempt，但它是否要重設 phase 沒有定義。
- **信心**：中
- **要求等級**：P2
- **建議**：補列，或在 glossary 寫明被 guard 擋下的 press 不算 attempt。

### C-12｜「沒有 `blocked` event 的逾時」其實有兩種子情況
- **位置**：traceability.md:41、:46（P3/P8）、:107（T33）；useChallengePersistence.ts:220-225、:539-557
- **證據**：
  - 程式碼註解記錄了 Chrome 的實測：只有排在 version-change 佇列最前面的 request 會收到 `blocked`。所以在 P2/P7 之後再 retry、前一個 request 還在排隊時，會出現「timed out」，但其實另一個分頁開著。
  - T33 只描述「No other connection exists」。新 hint 依推論兩種情況都成立，但「另一個分頁開著、卻以逾時結束」這個子情況沒有列。
  - 跨軸附記（V）：S2 規定只注入兩種 fault（spec:125-126），用這兩種 fault 似乎組不出 T33 的「無連線但逾時」狀態。
- **信心**：中
- **要求等級**：P2

### C-13｜T40 與 spec 的 prose 不一致
- **位置**：spec.en.md:156-157（「resolved for the four changed strings and the newly routed unchanged ones」）；traceability.md:119（T40 只寫「the messages this epic changes」）
- **證據**：「newly routed unchanged ones」具體是哪些字串（`body_unconfirmed` 在 P6–P8？`clear_not_started` 在 P10？），矩陣沒有列出。
- **信心**：高
- **要求等級**：P2

### C-14｜P10 的「如何到達」描述不準確
- **位置**：traceability.md:48
- **證據**：「The start record cannot be made durable on retry」。但能走到 P4/P5，表示第一次 attempt 的紀錄已經寫入成功；`markClearStarted` 讀回時會讀到既有的值（useSessionGate.ts:240-241）。所以 P10 實際上只能靠 `setItem`／`getItem` 拋錯（或測試替身讓讀回失敗）才到得了。
- **信心**：中
- **要求等級**：P2
- **建議**：寫明觸發方式，S2 也照這個方式注入。

### C-15｜Operations 矩陣有未改動行為的空缺
- **位置**：traceability.md:71-76
- **證據**：
  - P0/P12 的 continue 被接受，沒有列。
  - Dismiss 在 P1、P6、P11、P12 被拒，沒有列（T14 只列 P2、P3）。
  - Progress access 在 P1–P3、P11、以及 dismissed 之後被拒，沒有列（T16 只列 P4–P10）。
  - Reload 操作本身（落在 `/`、紀錄保留）沒有任何操作列。
- **信心**：高
- **要求等級**：P2

---

**等級統計**：P0 1 件（C-1）、P1 4 件（C-2、C-4、C-6、C-7）、P2 10 件，共 15 件。


---

## Axis 2. Verifiability（V）

# 第 1 輪對抗式審查：Verifiability（軸 2）

我讀了這些檔案：prompt.md、working tree 的 spec.en.md 與 traceability.md、HEAD 72327e2 的 useSessionGate.ts、SessionGate.vue、useChallengePersistence.ts（getDb / deleteDatabase）、en.json 與 zh-TW.json 的 session_gate 區塊、SessionGate.test.ts、useSessionGate.test.ts、unconfirmed-clear-outcome.test.ts、meaningful-stored-work.test.ts、session-gate-scope.spec.ts、vitest.config.ts、playwright.site.config.ts、fake-indexeddb 的 FDBFactory.js 與 scheduling.js，以及 OQ-003。我沒有讀 CONTEXT.md 的 diff，因為那屬於其他軸。

---

**V-1｜P0｜信心：高**
- **位置**：spec.en.md:123-129（S2「Inject only two faults」與「Covers T17–T35」）；traceability.md:41、46、48、50、107、109（P3、P8、P10、P12、T33、T35）
- **違反**：每條 AC 都要能在指定 seam 觀察到它聲稱讀取的機器狀態。
- **證據**：
  - 直接讀到：`deleteDatabase` 只有在 idb 的 `blocked` callback 觸發時才把錯誤標成 blocked（useChallengePersistence.ts:539-553）。fake-indexeddb 只要還有沒關閉的 connection，就一定觸發 `blocked`（FDBFactory.js:78-88、138-141）。所以在只允許「第二條連線」這個 fault 的條件下，S2 只做得出 P2/P7，做不出「沒有 blocked 事件的 timeout」（P3/P8）。T33 還要求「No other connection exists」，用排隊在前一個 delete 後面的方式也達不到。
  - 直接讀到：P10/P12 要靠 `markClearStarted` 失敗（useSessionGate.ts:237-245），這需要 sessionStorage fault，等於第三個 fault。
  - 推論：P10 是接在 P4 之後，那時 sessionStorage 已經有 `wxl-clear-started`。prior art 的 `withSessionStorageThatKeepsNothing`（unconfirmed-clear-outcome.test.ts:45-58）讓 setItem 什麼都不寫，但 getItem 仍會讀到舊紀錄並回傳 true，所以這次 attempt 會照常開始，到不了 P10。
- **影響**：T20、T25、T27、T29、T33、T35 在 S2 依 spec 原文做不出來，AC-4～AC-7 有一部分無法依原文實作。
- **建議**：逐一列出每個 state 允許的 fault。例如 P3/P8 用一個永不 settle 的 `indexedDB.deleteDatabase` stub；P10/P12 用會 throw 的 `sessionStorage.setItem`。另一個做法是把這些 state 移到 S1 或 mock seam，並刪掉「only two faults」這句。

**V-2｜P1｜信心：高**
- **位置**：spec.en.md:126-128、174-176（AC-7）；User Story 5（spec.en.md:61-62）；OQ-003（OPEN-QUESTIONS.md:100-106）
- **違反**：AC-7 要求「把句子改成假的，測試就要變紅」，這必須能機械判定。
- **證據**：
  - spec 沒有要求期望值寫成獨立於 messages JSON 的字面字串。
  - 直接讀到：prior art 是 `import en from .../en.json` 再比對 `en.session_gate.X`（SessionGate.test.ts:5-6、230-239）。照這樣寫，直接改 JSON 測試仍然是綠的，這正是 OQ-003 記錄的缺口。
  - 未改字串（`body_unconfirmed`、`clear_unconfirmed`、`clear_not_started`）連 copy table 都沒有，只能從 JSON 取值。
- **影響**：AC-7 可以「通過」，但 US5 與 OQ-003 其實沒有被解決。
- **建議**：規定 S2/S3 對 T30～T37 的每個句子都用 en 與 zh-TW 的字面字串斷言，不得從 messages 檔匯入。

**V-3｜P0｜信心：中**
- **位置**：traceability.md:30-32（CI-1「In every state below」）；spec.en.md:176（AC-7「no state shows a sentence that violates CI-1」）、177（AC-8）
- **違反**：AC 之間不能互斥，判定也不能需要詮釋。
- **證據**：
  - 直接讀到：CI-1 的範圍是 P0～P12 全部。P0 與 P12 顯示未改的 `body`：「This browser already holds saved work…」。P12 的 `clear_not_started_hint` 寫著「could later tell you your work was safe」。這兩句都在斷言有工作存在，但 AC-8 要求它們維持不變。
  - 推論：`body_unconfirmed`「A deletion of the saved work was started…」出現在 P3、P6～P8、P11，它是預設「saved work」存在的語句。這算不算「asserts」，要看審閱者怎麼詮釋（預設 vs. 斷言）。T34 也只寫「true on this path」，這是判斷，不是判準。
- **影響**：照字面讀，AC-7 與 AC-8 無法同時成立；就算收窄範圍，CI-1 的判定也會因人而異。
- **建議**：把 CI-1 限縮到明列的 state 與句子集合。或者改成機械判準，例如每個 locale 一份禁用片語清單，逐句比對。

**V-4｜P1｜信心：中**
- **位置**：spec.en.md:125（「a second open connection」）、132-133（S3「a second page in the same context holds a connection」）；traceability.md:111
- **違反**：truth test 必須真的能做出它要讀的 state（P7）。
- **證據**：
  - 直接讀到：站內自己的連線有 `blocking()`，收到 versionchange 就 close 並 forgetDb（useChallengePersistence.ts:375-383）。
  - 推論：照最自然的讀法，在第二個分頁開一個站內頁面、或在 S2 再載入一份 persistence module，這條連線會自動讓開，delete 不會停在 blocked，retry 會直接 resolve，做不出 P7。
- **影響**：S3 的 K4 case（AC-10）與 S2 的 T32 可能做不出目標 state，或測到別的路徑。
- **建議**：明訂用沒有 onversionchange 的原生 `indexedDB.open('challenge-tools')`（例如在第二頁用 `page.evaluate` 開），並先斷言 blocked 這個前置條件。

**V-5｜P1｜信心：中**
- **位置**：traceability.md:106（T32「the retry's delete is pending」）、107（T33「No other connection exists」）、109（T35「nothing new started」）；spec.en.md:126（「first reads the machine state」）、116-118（不得斷言 private helpers 或 call order）
- **違反**：observed fact 必須能在指定 seam 讀到。
- **證據**（推論）：IndexedDB 沒有公開 API 能讀「pending delete request」或「connection 數量」。T35 的「沒有新的 attempt 開始」若要靠 spy deleteDatabase 來證明，又會違反 spec.en.md:117 不得斷言 call order 的規則。「read it」怎樣算通過沒有定義。
- **影響**：AC-7 的前置讀取步驟沒有通過或失敗的判準，各實作者會各寫各的。
- **建議**：每列寫出具體的前置斷言。例如 T32：`indexedDB.databases()` 仍列出 `challenge-tools`，關掉另一條連線後它就消失。T35：`wxl-clear-started` 與資料庫清單都沒有變。

**V-6｜P1｜信心：中**
- **位置**：traceability.md:15（clearStarted：「a clear was started and its record is in sessionStorage」）、48（P10）、94（T27 body 是 `body_cleared`）；spec.en.md:89（body rule）
- **違反**：期望值必須能只從 spec 推導出來。
- **證據**：
  - P10 時 phase 是 null，body rule 接著看 `clearStarted`。照 glossary 的定義，P10 時 P4 留下的紀錄還在 sessionStorage，所以 clearStarted 應該是 true，結果會是 `body_unconfirmed`，和 T27 矛盾。
  - 直接讀到：實際程式在 markClearStarted 失敗時會把 `clearStartedState` 設成 false（useSessionGate.ts:478-481），所以 T27 只有在讀過程式碼之後才成立。
- **影響**：AC-4 在 P10 的判定要看程式碼才能決定，spec 本身無法判定。
- **建議**：在 state 表或 T 列明寫 P10 的 `clearStarted = false`，並說明它與 glossary 定義的差異。

**V-7｜P1｜信心：高**
- **位置**：spec.en.md:107-109（Comments）、182-183（AC-12）；traceability.md:118（T39）
- **違反**：AC 必須涵蓋 spec 自己要求的修改，而且要能不靠詮釋判定。
- **證據**：直接讀到的 comment，以及新規則下它們的問題：
  - SessionGate.vue:156-158「The branch is on whether the database is gone」：spec prose 點名要改，但 AC-12 與 T39 都沒有涵蓋。
  - SessionGate.vue:132-135、useSessionGate.ts:306-309「storedWorkGone … outranks / decides between the two reports」：在新規則下為假，不屬於 AC-12 的兩個類別。
  - useSessionGate.ts:141-144「the same state one step later — the delete returned and the sweep threw」：P7 時為假。
  - useSessionGate.ts:428-433「on the delete-failed path … continue is still on screen」與「Two guards」：P7/P8 時為假。
  - SessionGate.vue:206-211、218-223：描述舊的 dismiss 與 reload 條件。
  - 另外，「describes the flag as the learner's work being gone」本身需要詮釋，例如 useSessionGate.ts:398-399 與 497-499 算不算。測試標題算不算「comment」也沒有定義：SessionGate.test.ts:118、327；useSessionGate.test.ts:472、484、529。
- **影響**：AC-12 通過之後，仍可能留下與新規則矛盾的 comment。
- **建議**：逐一列出要改的檔案與行號，或定義以 grep 為準的判定。

**V-8｜P2｜信心：高**
- **位置**：traceability.md:117（T38）；spec.en.md:135-137、181（AC-11）
- **證據**：
  - T38 用單數「description」，但 useSessionGate.test.ts 有 472、484、529 三個候選標題。
  - 「case pinning the K4 screen」沒有指名。推論是 SessionGate.test.ts:286-299。
  - 同一檔其他 mock `storedWorkGone` 的 case 因 T4 也必須改，例如 14、43、48、118-163、306-338、456-463，T38 沒有列出。
- **影響**：判定 AC-11 要用猜的。
- **建議**：列出 test 名稱或行號。

**V-9｜P2｜信心：中**
- **位置**：traceability.md:75（T15「runs the database delete again before the sweep」）；spec.en.md:117（不得斷言 call order）
- **證據**：T15 本身就是一個順序主張，和測試原則衝突。
- **建議**：改寫成可以從外部觀察的形式。例如 retry 時 sweep 會成功、delete 會被 block，斷言 localStorage key 仍在。

**V-10｜P2｜信心：中**
- **位置**：spec.en.md:123-134
- **證據**（直接讀到）：
  - blocked 的 rejection 要等 `DELETE_TIMEOUT_MS = 5000` 的真實時間才會到（useChallengePersistence.ts:237、541-546）。
  - vitest.config.ts 沒有覆寫 testTimeout，預設就是 5000ms。
  - fake-indexeddb 在呼叫當下使用 `globalThis.setImmediate`（scheduling.js:37）。推論：若用 fake timers 的預設設定連 setImmediate 一起假掉，fake-indexeddb 會卡住。
  - S3 的「Each case waits out the delete bound」對 K2 也語意不明，因為 K2 的 delete 會 resolve，沒有 bound 可等。
- **影響**：S2 測試可能因 timeout 不穩，或實作者選到會卡住的做法。
- **建議**：明訂計時策略，例如只假 `setTimeout`，或設定每個測試的 timeout。

**V-11｜P2｜信心：中**
- **位置**：spec.en.md:178-180（AC-9、AC-10）對照 traceability.md:110-111（T36「as T30」、T37「as T32」）
- **證據**：
  - AC-9 只要求「new sweep-failure copy + dismiss」。T36 等同 T30，要求 `body_cleared`、en 與 zh-TW 兩個 locale，以及前置的 observed fact。
  - 直接讀到：S3 的設定檔把 locale 釘在 en（playwright.site.config.ts:36-42）。
- **影響**：依 AC 判定和依 T 列判定，結果不一樣。
- **建議**：統一 S3 的斷言範圍與 locale。

**V-12｜P2｜信心：低**
- **位置**：spec.en.md:177（AC-8「what they show today」）
- **證據**：「today」是相對時間。
- **建議**：改成以 T17、T18、T28、T29 為準，或以 HEAD 72327e2 為準。

**V-13｜P2｜信心：中**
- **位置**：spec.en.md:156-159、184-185（AC-13）；traceability.md:119-120
- **證據**：
  - 「the newly routed unchanged ones」沒有列出是哪些 key，也沒有列出是哪些 state。
  - 新 entry 要附的「evidence」內容沒有定義。
- **影響**：AC-13 是否通過，各人判斷不同。

**V-14｜P2｜信心：低**
- **位置**：spec.en.md:111-112
- **證據**：「Spec, tests and comments use it（site-wide clear）」這個要求沒有對應任何 AC 或 T 列。
- **影響**：無法驗收。

**V-15｜P2｜信心：低**
- **位置**：spec.en.md:68-70、164-165（AC-1）
- **證據**：「every caller and test moves to the new name」沒有說清楚，內部的 `storedWorkGoneState`（useSessionGate.ts:108）以及提到 `storedWorkGone` 的 comment（例如 143、307）是否也要改名。也就是說，grep `storedWorkGone` 是否必須為零，判準不明。

**V-16｜P2｜信心：低**
- **位置**：traceability.md:110（T36 observed fact「the database was deleted」）
- **證據**（推論，未驗證）：delete 之後 `forgetDb`，頁面上任何 persistence 呼叫都會透過 `getDb` 重新建立資料庫。如果真實頁面在斷言之前有元件呼叫 persistence，用 `indexedDB.databases()` 讀這個前置條件時結果可能不穩。
- **建議**：規定讀取的時間點，或改讀 object store 的內容。

---

總計：P0 2 件（V-1、V-3）、P1 5 件（V-2、V-4、V-5、V-6、V-7）、P2 9 件（V-8～V-16）。

相關檔案：
- .proj.specs/0001-truthful-clear-reports/spec.en.md
- .proj.specs/0001-truthful-clear-reports/traceability.md
- .vitepress/theme/composables/useSessionGate.ts
- .vitepress/theme/components/SessionGate.vue
- .vitepress/theme/composables/useChallengePersistence.ts
- tests/unit/components/SessionGate.test.ts
- tests/unit/composables/useSessionGate.test.ts
- tests/unit/composables/unconfirmed-clear-outcome.test.ts
- fake-indexeddb (installed package): build/esm/FDBFactory.js
- fake-indexeddb (installed package): build/esm/lib/scheduling.js


---

## Axis 3. Contract conflict（K）

## 第 1 輪對抗式審查：第 3 軸「契約衝突」（Contract conflict）

**審查範圍**：工作區（working tree）中的 `spec.en.md`（blob 8353986…）、`traceability.md`（blob 5b8222a…）與 `CONTEXT.md`（blob bd73872…），程式碼以 HEAD 72327e2 為準。我沒有 Bash，無法自己重算 blob hash，所以直接讀工作區檔案，並以你提供的 hash 為準。

**讀過的材料**：
- 凍結 prompt、`CONTEXT.md`、`docs/adr/0001`、`0003`、`0004`（0002、0005 只用 grep 搜過關鍵字）、`docs/agents/review.md`、`language.md`、`workflow.md`、`.proj.specs/OPEN-QUESTIONS.md`
- `.vitepress/theme/composables/useSessionGate.ts`、`.vitepress/theme/components/SessionGate.vue`
- `useChallengePersistence.ts` 的 `deleteDatabase`、`localStorageKeys.ts`、`en.json` 與 `zh-TW.json`
- 測試：`tests/unit/components/SessionGate.test.ts`、`tests/unit/composables/useSessionGate.test.ts`、`unconfirmed-clear-outcome.test.ts`、`meaningful-stored-work.test.ts`、`tests/site-smoke/session-gate-scope.spec.ts`
- `platform/` 底下的使用者指南（用 grep 檢查有沒有引用到要改的字串）

**共通背景**：spec 對「舊註解／舊測試」的處置只寫了三類，見 `spec.en.md:107-109`、T38、T39 與 AC-11、AC-12。其中 AC-12 的判準只抓兩種說法：
1. 把旗標描述成「學習者的作品沒了」；
2. 說 retry 會在 sweep 那一行丟例外。

下面好幾筆都是這兩種判準抓不到的既有規則陳述。

---

### K-1：traceability 重新定義了 `CONTEXT.md` 已經在用的詞 *attempt*
- **位置**：`traceability.md:16`（glossary 把 `attempt` 定義成「One call of the site-wide clear」）；`spec.en.md:71-74`、`:39`、`:44` 與 T8–T10 的整套 attempt／retry 語彙。
- **違反的契約**：`CONTEXT.md:194-200`。*attempt（一次嘗試）* 已登記為「學習者在同一道題目上的一段獨立作業……攻擊紀錄的計量單位」。程式碼也是這個意思：`useChallengePersistence.ts:79-87`（「One per attempt」）、`recordAttempt`、`flag_attempt`。
- **證據**：直接讀到。spec 沒有任何地方說它要覆寫或另立這個詞。
- **影響**：spec 要求「Spec, tests and comments」沿用 spec 的語彙（`spec.en.md:111-112`），所以「latest attempt」「each attempt replaces…」很可能寫進 `useSessionGate.ts` 的註解和測試名稱。到時同一個 repo 的 attempt 會同時指「一趟解題」與「一次全站清除呼叫」，正好是 `CONTEXT.md` 存在要防止的同詞異指。之後翻成 `spec.zh-TW.md` 時，也會跟「一次嘗試」正式用語相撞。
- **信心**：高
- **請求等級**：P1
- **建議**：改用 *clear attempt* 或 *clear run*，並在 glossary 註明它不是 `CONTEXT.md` 的 attempt；或者在 `CONTEXT.md` 該詞條的 `_Avoid_` 補一條這個用法。

### K-2：CI-1 跟 spec 自己要求保留的句子互相衝突
- **位置**：`traceability.md:30-32`（CI-1：「In every state below, no sentence on screen asserts that a learner's work existed…」）；AC-8（`spec.en.md:177`，P0、P12 維持現狀）；T17、T29（`body`）；T18、T23–T25、T28、T34（`body_unconfirmed`，T34 寫「true on this path」）。
- **違反的契約**：spec 內部契約，外加 `CONTEXT.md:233` 對全站清除的 `_Avoid_`（不可讀成「作品確實存在過」）。
- **證據**：直接讀 `en.json:124`、`:131`、`:136`。
  - `body`：「This browser already holds saved work…」，P0、P12 依 AC-8 要照原樣顯示，但這句明確斷言作品存在。
  - `body_unconfirmed`：「A deletion of the saved work was started…」，預設了 saved work 存在。它會出現在 P6–P8、P11，其中包括 P4 衍生出來、資料庫裡沒有學習者紀錄的路徑。
  - `clear_not_started_hint`（P12）：「could later tell you your work was safe」。
- **影響**：如果照字面把 CI-1 套到「every state below」，AC-7 與 AC-8 無法同時成立；如果 CI-1 只適用 T30–T35，`body_unconfirmed` 在 P7、P8、P11 是否違反 CI-1 就要靠詮釋判定。
- **信心**：中。關鍵在「預設存在」算不算 assert。
- **請求等級**：P1。若照字面讀 CI-1，會接近 P0。
- **建議**：把 CI-1 的範圍明確限定為「本 epic 變更的四個字串」或「T30–T35 的狀態」，並明說 `body` 屬偵測證據支撐的例外。也可以把 `body_unconfirmed` 的處理寫成 spec 明示的取捨。

### K-3：body 規則把 `databaseDeleted` 與 `clearStarted` 的既有優先序反過來了，spec 沒有明說
- **位置**：`spec.en.md:89`（phase 為 null 時，`clearStarted` 優先於 `databaseDeleted`）；T23（P6 → `body_unconfirmed`）。
- **衝突的既有規則**：
  - `useSessionGate.ts:307-309`：「`storedWorkGone` still decides between the two reports and outranks this one when both are true」。
  - `SessionGate.vue:132-135`：「`storedWorkGone` is tested first and outranks `clearStarted`」。
  - `SessionGate.test.ts:286-299`：測試名稱「a completed deletion outranks a started clear when both are true」。
  - `SessionGate.test.ts:11-13`：mock 註解說這個旗標「decides which sentences about the machine are still true」。
- **證據**：直接讀到。現行程式在 P6（兩者皆 true、沒有錯誤）會顯示 `body_cleared`，spec 改成 `body_unconfirmed`。`spec.en.md:105` 只寫了「`body_unconfirmed` is now also shown on P6–P8」，沒有提到要推翻這條優先序規則。T39 與 `spec.en.md:107-109` 也沒點名這幾處。
- **影響**：AC-12 的兩個判準都抓不到這些註解，實作完成後它們會留下來，陳述一條已經不成立的規則。日後有人依註解「修正」回舊優先序時，只有 T23 會擋。
- **信心**：高
- **請求等級**：P1
- **建議**：在 spec 明說優先序改變（報告由 phase 決定；body 在 phase 為 null 時由 `clearStarted` 優先），並把上列 4 處加進 T38、T39。

### K-4：dismiss 從「兩個條件的交集」變成三個條件，既有註解與測試都把「恰好兩個」寫成規則
- **位置**：`spec.en.md:78-79`、`:95`；T12、T13。
- **衝突的既有規則**：
  - `useSessionGate.ts:421-433`：「The one state with no other way out」「Two guards, because the trapped state is the conjunction of two facts」「on the delete-failed path … continue is still on screen and still honoured」。
  - `SessionGate.vue:206-211`：「Rendered on exactly the state that has no other exit… The condition is the conjunction the handler guards on」。
  - `SessionGate.test.ts:113-116`：「The condition is the conjunction of the two facts, and the three tests below pin each corner」。
  - `useSessionGate.test.ts:570-573`：「the reason there are two guards rather than one. A blocked delete destroyed nothing: continue is on screen」。
  - `SessionGate.vue:14-19` 標頭也屬同一類。
- **證據**：P7 是「delete 失敗，但 continue 不在畫面上」，跟上述「delete 失敗等於 continue 仍在」的前提互斥；P7 也有 reload 這個出口，所以「no other exit」不成立。
- **影響**：這些都是規則陳述，不是對旗標的描述，AC-12 抓不到。第三個 guard 沒有對應的註解理由，正好留下 `SessionGate.test.ts:113-116` 想防的「單一條件判斷」回歸風險。
- **信心**：高
- **請求等級**：P1
- **建議**：T39 明列這幾處，並要求改寫成「錯誤存在 ∧ 資料庫已刪 ∧ 最新 phase 不是 delete」的三條件理由，同時引用 reload 註解（`SessionGate.vue:217-222`）的「deletion may still be queued」。

### K-5：P10 推翻了「not started 是唯一保留 continue 的失敗」這條既有規則
- **位置**：T11、T27、T35（P10：continue 撤下、`body_cleared`、hint 被扣住）；`spec.en.md:97-99`。
- **衝突的既有規則**：
  - `useSessionGate.ts:473-477`：「Not issuing it keeps the two facts in step: nothing was requested, so nothing is pending, so continuing really is still true and the offer stays」。
  - `SessionGate.vue:80-85`：「no deletion is queued, the stored work really is untouched, and continuing with it is still exactly true」。
  - `SessionGate.test.ts:267-270`：「this is the one failure that keeps the offer」。
  - `unconfirmed-clear-outcome.test.ts:183-184`：「This is the one clear failure that does not withdraw the offer」。
- **證據**：直接讀到。spec 只處理了 hint 中「Nothing was deleted」這一句，這四處規則陳述沒有列入 T38、T39。
- **推論（未實測）**：`useSessionGate.ts:479` 在 P10 會把 `clearStartedState` 設回 false。但先前那次清除的 `sessionStorage` 紀錄可能還在，所以重新載入後 `clearStarted` 又會變回 true。這和註解說的「two facts in step」不一致。
- **信心**：高（註解衝突）；中（`clearStarted` 的推論）
- **請求等級**：P1
- **建議**：把這四處加進 T39；spec 也要明說 P10 時 `clearStarted` 的值。

### K-6：`SessionGate.test.ts` 不只是「routing」，而且它的 mock 沒有 `clearFailurePhase`；T38 只點名一個案例
- **位置**：`spec.en.md:135-137`（「The existing routing test file for the gate component stays for routing; the case that pins the K4 screen … rewritten」）；T38（`traceability.md:117`）；AC-11。
- **衝突的既有測試**：`SessionGate.test.ts:36-55` 是 mock 出來的 composable，沒有 `clearFailurePhase`。以下案例全是「狀態對文案／控制項」的契約：
  - `:221-240` 與 `:251-265`：只設 `clearStarted` 與 error，就斷言 `clear_unconfirmed` 和 reload；
  - `:286-299`：斷言 `sweep_failed`、`body_cleared`；
  - `:306-321`：只設 `storedWorkGone` 與 error，就斷言 `sweep_failed`。
- **推論**：依新規則，phase 不存在時這些案例不會產生它們斷言的報告，必須改寫或在 mock 補上 phase。另外沒有任何現存案例真正對應 K4 畫面（兩個旗標皆 true、錯誤是 another tab），最接近的是 `:286`，但它其實是「P2 之後 retry、sweep 又失敗」那條路徑。所以 T38 指的到底是哪個案例並不明確。
- **另外，測試名稱把旗標等同於作品被毀**：
  - `SessionGate.test.ts:118`「once the delete has destroyed the work」、`:129`「a delete that destroyed nothing」、`:327`「once the stored work has been deleted」；
  - `useSessionGate.test.ts:472`、`:484`、`:529`「stored work is gone」。
  - AC-12 只管註解，T38 只寫了單數的「description」，這些都不在範圍內。
- **影響**：AC-11 判定通過時，這個檔案裡仍會有與新契約矛盾的斷言或名稱。
- **信心**：高
- **請求等級**：P1
- **建議**：T38 改成逐一列出案例；或改成「該檔所有讀取已改名旗標或錯誤報告的案例」，並明說 mock 要加 `clearFailurePhase`；同時把測試名稱納入 AC-12。

### K-7：「retry 只重做失敗的那一半」的既有註解跟 T15 與新 hint 相反
- **位置**：T15（`traceability.md:75`）；新的 `sweep_failed_hint`（`traceability.md:24`）。
- **衝突的既有規則**：
  - `SessionGate.vue:188-189`：「Clear stays, because it is the same action already begun and retrying the half that failed is truthful」。
  - `SessionGate.test.ts:326`：「Clear stays: retrying the half that failed is a real action」。
- **證據**：直接讀到。這不是「retry 在 sweep 丟例外」，所以 T39 與 AC-12 的判準都抓不到。
- **影響**：註解和畫面上的新文案（「redoes the whole deletion, starting with the database」）直接矛盾，會留在程式裡。
- **信心**：高
- **請求等級**：P2
- **建議**：T39 的 boundary 加入「retry 只重做失敗那一半」。

### K-8：`SessionGate.vue:148-155` 的報告註解有兩句跟 T33 與 P7 互斥，spec 只點名了第三句
- **位置**：`spec.en.md:108`（只點名「the template comment that says the report branches on whether the database is gone」，也就是 `:156-158`）。
- **衝突**：
  - `SessionGate.vue:149-151`：「a delete that did not complete deleted nothing and really is another tab's doing」。這和 user story 4、T33（逾時而且沒有其他分頁）相反，也和 `SessionGate.vue:217-222`、`useSessionGate.ts:113-118`（請求排隊中，可能稍後完成）相反。
  - 同段的「no tab is holding anything」在 P7 也不成立。
- **信心**：高
- **請求等級**：P2
- **建議**：T39 改成整段改寫。

### K-9：旗標 docstring 說「browser session」，spec 說「page」，又宣稱 semantics unchanged
- **位置**：`spec.en.md:68-70`、T3。
- **衝突**：`useSessionGate.ts:96`「Whether `deleteDatabase()` has resolved during this browser session」。實際上它是 module-level ref，會隨文件一起消失；`useSessionGate.ts:29-31` 自己也這麼說。
- **另一處**：`useSessionGate.ts:143-144`「`storedWorkGone` is the same state one step later — the delete returned and the sweep threw」。在 P7、P8 時旗標為 true，但最新的失敗是 delete。
- **影響**：spec 說語意不變，但程式碼對這個語意的陳述本來就跟 spec 不同，AC-12 也不會要求修正。
- **信心**：高（`:96`）；中（`:143`）
- **請求等級**：P2
- **建議**：納入 T39。

### K-10：`CONTEXT.md` 的 *site-wide clear*（「一切」）跟 sweep 的實際範圍不符
- **位置**：`CONTEXT.md:227`（「把本站存在這個瀏覽器裡的一切移除的動作」，屬本次待提交的修改）、`:221`；對照 `traceability.md:10`、`:12`（sweep 只移除「clearable」的鍵）。
- **證據**：直接讀到。
  - `useSessionGate.ts:517-521` 與 `localStorageKeys.ts:286-306` 明文排除 locale 鍵；
  - `useSessionGate.ts:533-534` 會寫入 `sessionStorage` 標記；
  - 新的 `sweep_failed`「Not every other value this site stored in this browser could be removed」暗示目標是所有值，但 locale 鍵本來就不會被嘗試刪除。
- **影響**：詞彙表定義和 spec 的 glossary、程式碼的宣告式豁免不一致。之後若有人依 `CONTEXT.md` 寫「全站清除會移除語系偏好」的文件，就會出錯。
- **信心**：中
- **請求等級**：P2
- **建議**：`CONTEXT.md` 改成「除宣告豁免的鍵外」；或在 spec 明說詞彙表的「一切」是概念層、容許宣告豁免。

### K-11：新的繁中文案裸用「刪除」指稱全站清除
- **位置**：`traceability.md:24`（「會從資料庫開始重做整個刪除」）、`:25`（「刪除無法完成」）。
- **違反的契約**：`CONTEXT.md:221`、`:231` 的 `_Avoid_`「裸用「清除」或「刪除」……指稱一定要帶範圍」；`CONTEXT.md:10` 說中文正式用語是對外文件與介面該用的字。
- **證據**：直接讀到。spec 只要求「Spec, tests and comments」使用 site-wide clear（`spec.en.md:111-112`），沒有說明介面字串為什麼豁免。
- **影響**：本 epic 新寫的介面字串直接違反詞彙表。不過在對話框內歧義不大，所以只影響一致性。
- **信心**：中
- **請求等級**：P2
- **建議**：例如改成「重做整個全站清除」；或在 spec 明說在對話框語境內豁免、理由是什麼。

### K-12：glossary 說 delete 只有 blocked 和 timed out 兩種拒絕，但既有測試與程式有第三種
- **位置**：`traceability.md:11`；`spec.en.md:44-46`（hint「true whether the delete was blocked or timed out」）。
- **衝突**：
  - `unconfirmed-clear-outcome.test.ts:105-117`：「refuses continue after the delete request is rejected」，用 `InvalidStateError` 立即拒絕；
  - `useChallengePersistence.ts:550-554`：`deleteDB` 本身的拒絕會原樣往上丟。
- **影響**：`'delete'` 這個 phase 涵蓋所有拒絕，但 glossary 把它寫成只有兩種。新 hint 的真偽論證沒有涵蓋第三種。
- **信心**：中
- **請求等級**：P2
- **建議**：glossary 改成「rejects (blocked, timed out, or any other error)」，並說明 hint 在第三種情況下的真偽。

### K-13：OQ-003 的「部分解決」不是 `OPEN-QUESTIONS.md` 允許的狀態
- **位置**：T40（`traceability.md:119`）、AC-13、`spec.en.md:156-158`。
- **違反的契約**：`OPEN-QUESTIONS.md:17`「**Status:** open | resolved」，以及 `:7-8` 要求已解決的條目保留在原處、附上解決方式。
- **影響**：AC-13 要求的「partial resolution」沒有合法的狀態值可用，實作者只能自行決定標成 open 或 resolved。
- **信心**：高
- **請求等級**：P2
- **建議**：明定 OQ-003 維持 open、在條目內記錄本 epic 解決了哪些；或把剩餘部分拆成新的 OQ，原條目標 resolved。

### K-14：本 epic 會觸發 OQ-001 的重新檢視條件，spec 沒提
- **位置**：`OPEN-QUESTIONS.md:60-61`，OQ-001 的「Revisit when. A change touches `clearEverything` in `useSessionGate.ts`」。spec 會在 `clearEverything` 裡設定與重設 `clearFailurePhase`（`spec.en.md:71-74`）。
- **證據**：直接讀到。spec 只處理 OQ-002（明列 Out of Scope）與 OQ-003。
- **信心**：高
- **請求等級**：P2
- **建議**：在 Further Notes 記一句「OQ-001 已重新檢視，結論不變」，或加一列 T 對應 AC-13。

### K-15：「learner records」這個詞跟詞彙表中被佔用的「紀錄」相撞
- **位置**：`traceability.md:42-43`（P4、P5「learner records」）、T31。
- **衝突**：`CONTEXT.md:238` 指出「紀錄」在本 repo 已被攻擊紀錄佔用；`CONTEXT.md:181-191` 也是同一件事。日後翻成 `spec.zh-TW.md` 時很可能譯成「學習者紀錄」。
- **信心**：低
- **請求等級**：P2
- **建議**：英文改用「learner rows in the object stores」，或對齊程式碼的 learner evidence 說法。

### K-16：「backlog clusters C09, C11, C15」的出處不在 commit 過的證據鏈
- **位置**：`spec.en.md:142`。
- **契約**：`AGENTS.md` 說 `.proj.specs/` 是 commit 進版控的證據鏈。用 Grep（會略過 gitignored 檔案）找不到 C09 的定義。
- **推論**：它可能在 gitignored 的 `.proj.research/`，這點我沒有驗證。
- **信心**：低
- **請求等級**：P2
- **建議**：新的 OQ 條目附上這幾個 cluster 的實際證據，或改寫成可追溯的引用。

---

**查過、沒有發現衝突的項目**：
- ADR-0001、0003、0004 與新 seam S2：repo 本來就有 seam，新增 S2 屬正常延伸，沒有衝突。
- ADR-0005：與本 spec 無關。
- `language.md`：`spec.zh-TW.md` 本來就排在審查通過後才產出，沒有衝突。
- `workflow.md` stage 8：spec 寫的 Cloudflare Pages preview 與它一致。
- `deleteDatabase` 的 docstring（`useChallengePersistence.ts:523-526`，「The learner is told to close the other tabs」）：跟新的 hint 一致。
- reload 註解（`SessionGate.vue:217-222`）：與 T13、T19 一致。
- OQ-002：spec 有明說列為 Out of Scope。
- `platform/` 底下的使用者指南：只轉述、沒有引用要改的字串，`zh-TW/guide/workshop.md:8` 的意思在新 hint 下仍然成立。
- `CONTEXT.md` 的 *second tab* 與新文案「本站還有其他分頁」：一致。

**統計**：P0 0 筆、P1 6 筆（K-1 至 K-6）、P2 10 筆（K-7 至 K-16）


---

## Axis 4. Red team（R）

# 第 1 輪對抗式審查：Axis 4 紅隊（R），epic 0001-truthful-clear-reports

審查範圍：working tree 的 `spec.en.md`（blob 8353986）、`traceability.md`（blob 5b8222a）、`CONTEXT.md`（blob bd73872）；程式碼以 HEAD 72327e2 為準。我直接讀過的檔案有：`useSessionGate.ts`、`SessionGate.vue`、`useChallengePersistence.ts`（`deleteDatabase` 與 `getDb` 的 `blocking`）、`.vitepress/theme/index.ts`、`useAttackSession.ts`（gate 判斷段）、`en.json` 和 `zh-TW.json` 的 `session_gate`、`tests/unit/components/SessionGate.test.ts`、`tests/unit/composables/useSessionGate.test.ts`（部分），以及 `OPEN-QUESTIONS.md` 的 OQ-003。我沒有執行任何測試，也沒有修改任何檔案。

---

### R-1：重試在 P7/P8 之後被拒（not started）時，依規格會出現 dismiss，也就是在刪除可能還排隊時提供留在原頁的出口
- **位置**：spec.en.md:71-74（attempt 開始即把 phase 設為 `null`，被拒的 attempt 也維持 `null`）、spec.en.md:77-79 與 :95（Dismiss 規則）；traceability.md:48（P10 只定義「P4/P5 之後」）、:64（T9）、:72（T12）。程式碼：`useSessionGate.ts:478-481`（被拒時 `clearStartedState.value = false`）、:442-447。
- **違反**：凍結 prompt 的紅隊規則「刪除可能還在排隊時，不得提供留在原頁的出口」；以及規格自己的 User Story 3（spec.en.md:57-58）。
- **證據**（從規則推導）：P4 → 重試被擋（P7，phase=`'delete'`，被擋的 deleteDB request 仍在瀏覽器佇列裡，bound 不會取消它）→ 再按刪除，這時 `markClearStarted()` 失敗 → phase 依 T9 機制變成 `null`、`clearError = CLEAR_NOT_STARTED`、`databaseDeleted` 仍是 true、記憶體中的 `clearStarted` 被 :479 清成 false。代入規格的規則：Dismiss 需要 error 存在、`databaseDeleted` 為 true、phase 不是 `'delete'`，三項都成立，所以**顯示 dismiss 並且被 composable 接受**。Reload 需要 phase 是 `'delete'`，這時不成立，**reload 消失**。Body 規則落到 `databaseDeleted` → `body_cleared`（「資料庫已經刪除」），但 P7 被擋的前提是另一個分頁已經把資料庫重新建起來，而且有一筆刪除正在排隊，所以這句話也不成立。原始錯誤行和 hint 都被隱藏，「可能還在排隊」這件事從畫面上完全消失。
- **影響**：照字面實作就會出現 K4 同類的缺陷：learner 按「關掉這則說明，繼續使用」後留在原頁，closure 裡的 attack session 可能被寫回，而排隊中的刪除隨時會完成。
- **信心**：機制為 high；自然觸發的可行性為 low（需要 sessionStorage 在 P7 之後才開始丟例外，注入故障就能重現）。
- **請求等級**：**P0**。理由是規格明文規則直接推出違反 User Story 3 的行為，照寫無法正確實作。修法本身很局部；使用者若判定可在 ticket 內解決，可降為 P1。
- **建議**：Dismiss 與 reload 不能只讀「最近一次」的 phase，還要讀「本頁是否有任何一次 delete 沒完成」。例如另記一個從不重設的事實 `deleteMayBeQueued`，或在 not-started 時保留前一次的 `'delete'`。另外在 States 補上「P7/P8 之後被拒」這一列。

### R-2：P2/P3 之後重試被拒，continue 會被重新提供並被接受，而這時刪除仍在排隊
- **位置**：traceability.md:48、:50（只列出 P10「P4/P5 之後」與 P12「第一次」）；spec.en.md:77（「Continue is refused while … clearStarted（unchanged）」）。程式碼：`useSessionGate.ts:479`、:397-416、:155-159。
- **違反**：同 R-1 的規則；也與 K4 的修補意圖（不在刪除可能排隊時讓人留在原頁繼續）衝突。
- **證據**：P2（第一次就被擋，request 排隊中）→ 再按刪除被拒 → `clearStartedState` 被 :479 清成 false，`databaseDeleted` 為 false，phase 為 `null`。依規格：continue 出現（兩個條件都是 false），body 變成 `body`（「除非你選擇刪除，否則不會刪掉任何東西」），hint 顯示 `clear_not_started_hint`（「目前沒有刪掉任何東西」）。但排隊中的刪除在其他分頁關掉後就會完成。`keepExistingData` 這時會接受。如果 sessionStorage 確實在丟例外（這正是 not-started 的成因），`isProgressAccessAllowed` 裡的 `readClearStarted()` 回傳 false，再加上 decision 為 `kept`，**progress 存取會被允許**。
- **影響**：既有缺陷，規格沒有列舉也沒有宣告排除，而且和本 epic 處理的是同一類問題。
- **信心**：機制 high；可行性 low。
- **請求等級**：P1。
- **建議**：被拒時，若 `sessionStorage` 原本就有 started 紀錄，或本頁曾 issue 過 delete，就不要清 `clearStartedState`。至少要在 Out of Scope 明確寫出這條路徑。

### R-3：在非題目頁上重試被拒時，若 `databaseDeleted` 為 false，整個 gate 會從畫面消失，not-started 報告根本不會出現
- **位置**：traceability.md:48-50（沒有涵蓋 P2/P3/P11 → 被拒）。程式碼：`useSessionGate.ts:149-152`（`shouldPresentGateHere` 讀的是記憶體中的 `clearStartedState`）、:479；`SessionGate.vue:49`、:111。
- **違反**：凍結 prompt 的「不得有沒有出口的狀態」，以及報告必須上螢幕。
- **證據**：reload 出口與清除成功都會導到站台根目錄（非題目頁）。在根目錄時 gate 只靠 `clearStarted || storedWorkGone` 顯示。P11（或從 P2 reload 後）在根目錄按刪除被拒 → :479 把 `clearStartedState` 設為 false → `present` 變成 false → gate 和 `CLEAR_NOT_STARTED` 報告一起消失，decision 停在 `undecided`。之後走到題目頁時 gate 會重新出現，而且 continue 可按（接著就是 R-2）。
- **影響**：learner 看不到失敗報告，看起來像什麼都沒發生；若是從 P2 來的，還會落入 R-2。
- **信心**：機制 high；可行性 low。
- **請求等級**：P1。
- **建議**：跟 R-2 一起修（被拒時不清 `clearStartedState`），或讓 `shouldPresentGateHere` 在有 `clearError` 時也顯示。

### R-4：新的 `clear_unconfirmed_hint` 保留了「Reload to see what is left」，但 reload 後的頁面明說看不出還剩什麼
- **位置**：traceability.md:25（新 en/zh-TW 字串）、:108（T34）；spec.en.md:101-105。程式碼：`useSessionGate.ts:333-341`（reload 後只要有 clearStarted 紀錄就直接 return，不做任何資料檢查）。
- **違反**：本 epic 的核心目標「每個被改動的句子在它出現的狀態裡都要成立」（Solution、User Story 5），以及 T33 的精神。
- **證據**：reload 後落在 P11 類狀態，畫面是 `body_unconfirmed`：「…there is no way to tell from here whether anything is left」/「所以從這裡無從得知還剩下什麼」，只剩一個 Clear 按鈕，沒有任何東西會顯示剩下什麼。新 hint 卻說「Reload to see what is left」/「重新載入可以看看還剩下什麼」。兩句在相鄰的兩個畫面上互相矛盾。舊字串也有這個問題，但這次是重寫這句，規格等於重新背書。
- **影響**：被改動的句子含有一個不成立的承諾，正好是 OQ-003 要防的那一類；而 T33 和 T32 只要求「exact copy」，不會抓到這個問題。
- **信心**：high。
- **請求等級**：P1。
- **建議**：改成例如「Reloading starts this page over; the deletion may finish once the other tabs are closed.」，並在 truth 矩陣補一列「reload 後的畫面與 hint 承諾一致」。

### R-5：新的 `sweep_failed_hint`「Pressing delete again redoes the whole deletion」在規格自己引用的自然觸發條件下不成立
- **位置**：traceability.md:24；spec.en.md:25-28（以 Firefox `dom.storage.enabled` 在頁面開著時被關掉作為自然觸發）。程式碼：`useSessionGate.ts:237-245`。
- **違反**：同 R-4（被改動的句子要在它的狀態裡成立）。
- **證據**（推論，未實測）：`dom.storage.enabled` 管的是整個 DOM storage，sessionStorage 很可能也會一起失效。這樣一來 P4 之後的重試在 `markClearStarted()` 就會被拒（P10），根本不會「redo the whole deletion, starting with the database」。也就是在規格點名的那條自然路徑上，重試一定是 P10，不會是 P9，畫面還會出現 R-6 的矛盾組合。
- **影響**：learner 照 hint 再按一次，得到的是「刪除沒有開始」。
- **信心**：medium-low（取決於 Firefox 實際行為）。
- **請求等級**：P1。
- **建議**：把措辭改成條件式，例如「Pressing delete again tries the whole deletion again, starting with the database.」，或在 stage 8 以該觸發條件實測。

### R-6：P10 畫面同時出現「資料庫已經刪除」與「刪除沒有開始」，而且原因和補救方法都被拿掉
- **位置**：traceability.md:94（T27）、:109（T35）；spec.en.md:90-91、:97-99。
- **證據**：T27 的組合是 `body_cleared` 加 `clear_not_started`（「The deletion was not started.」/「刪除沒有開始。」），沒有 hint，也沒有原始錯誤行。讀起來像自相矛盾，因為「The deletion」沒有指出是哪一次。hint 被拿掉是因為「Nothing was deleted」不成立（這是規格有意的），但同一段裡唯一可操作的補救（「清出儲存空間或改用一般視窗」）也一起不見了（這是附帶的）。
- **影響**：learner 不知道原因，也不知道怎麼處理，只能按 dismiss。
- **信心**：medium。
- **請求等級**：P2。
- **建議**：P10 改用專屬的 heading/hint，例如「This new attempt was not started」加上補救句，不帶「Nothing was deleted」。

### R-7：database delete 的分類漏了「立即失敗」（IndexedDB 不可用，或 error 事件），落入 `'delete'` 後的句子和出口都不成立
- **位置**：traceability.md:11（只列 resolves / blocked / timed out）；spec.en.md:72。程式碼：`useChallengePersistence.ts:550-554`（`deleteDB` 若同步丟例外或 request error 都會 reject）。
- **證據**（推論）：IndexedDB 被封鎖或丟 SecurityError、或 request 發出 error 事件時，phase 會變成 `'delete'` → 畫面顯示 `body_unconfirmed`（「It may still be in progress」），但其實沒有任何東西在排隊，hint 還叫人去關分頁。唯一的出口是 reload，reload 後 clearStarted 依舊 → 再按刪除又立即失敗，形成迴圈，只有關掉分頁才能脫離。這是既有行為。
- **信心**：medium。
- **請求等級**：P2。
- **建議**：在詞彙表承認第三種結果，並在 Out of Scope 或 OQ 記下來。

### R-8：網站自己的連線會在 versionchange 時讓出，所以第二個網站分頁不會擋住刪除；K4 的自然觸發與 S3 測試設計都需要「不合作的連線」
- **位置**：spec.en.md:19-23、:28-29（「needs no injected fault once the sweep has failed」）、:130-134（S3 K4：「a second page in the same context holds a connection」）。程式碼：`useChallengePersistence.ts:375-383`（`blocking()` 會關閉並遺忘連線）。
- **證據**：idb 的 `blocking` 掛在 `versionchange` 上，`deleteDatabase` 也會觸發這個事件，所以跑目前版本的第二個分頁會關閉連線，刪除不會被持續擋住。要真的被擋，需要舊版 build 的分頁，或手動開的 raw connection（推論 production 重現時用的是後者）。
- **影響**：S3 的 K4 若用網站頁面自己的連線，重試會 resolve，接著 sweep 再失敗（P9），測試會因錯誤的理由失敗；而且規格對自然觸發的描述過於樂觀。
- **信心**：medium。
- **請求等級**：P2。
- **建議**：S3 明定第二個頁面用 `page.evaluate` 開一個不處理 versionchange 的 raw `indexedDB.open`；Problem statement 修正觸發條件的描述。

### R-9：選擇規則對「有 error、phase 為 null、但不是 not-started sentinel」等組合沒有定義，template 的預設分支會決定實際顯示什麼
- **位置**：spec.en.md:89-95；traceability.md:117（T38 只列一個 SessionGate 案例）。程式碼：`SessionGate.vue:166-178`；`tests/unit/components/SessionGate.test.ts:118`、:165、:286、:306、:327、:458（mock 只設了 `storedWorkGone` 加 error，沒有 phase）。
- **證據**：用真實 composable 走不到這些組合，但 template 一定要有一個 else，選哪個報告當 fallback（not-started 會隱藏原始錯誤，unconfirmed 會帶 reload）規格沒有說。上面列出的 mock 測試在新規則下的結果取決於這個 fallback，T38 卻沒有列它們。
- **信心**：medium。
- **請求等級**：P2。
- **建議**：規格指定 fallback（建議是不提供 dismiss 的 unconfirmed），並把 T38 擴大到所有用 mock 狀態斷言報告或出口的案例。

### R-10：`clearFailurePhase` 沒有規定是 module-level
- **位置**：spec.en.md:71。程式碼：`useSessionGate.ts:74-84`（其他狀態刻意放在 module-level）；`index.ts:94` 與 `SessionGate.vue:36` 各自呼叫 `useSessionGate()`。
- **證據**（推論）：如果實作成 per-call，而 SessionGate 的實例被重新建立，phase 會回到 `null`，但 module-level 的 `clearError` 還在。在 P7 這會讓 dismiss 規則成立，造成留在原頁的出口。
- **信心**：low。
- **請求等級**：P2。
- **建議**：明定 module-level，和 `clearErrorState` 同一層。

### R-11：新 `body_cleared` 的第一句斷言資料庫存在並被刪除，在兩種情境下讀起來不實
- **位置**：traceability.md:22、:42（P4 包含「Database empty」）。
- **證據**（推論）：資料庫從未建立時（evidence 只在 localStorage，而 gate 的 `||` 會短路掉 `hasAnyStoredData`），`deleteDB` 對不存在的資料庫一樣會 resolve，「has been deleted」說的是一個不存在的東西。此外，刪除之後其他分頁或本頁的寫回可能已經把資料庫重建，現在完成式會被讀成「現在不存在」。
- **信心**：low-medium。
- **請求等級**：P2。

### R-12：CI-1 的適用範圍會把未改動的字串判成違規，而規格又不允許改它們
- **位置**：traceability.md:30-32（「In every state below…」）、:84（P0 `body`）、:96（P12）；spec.en.md:104-105、:144-145。
- **證據**：P0/P12 的 `body` 斷言「This browser already holds saved work」。P6–P8 的 `body_unconfirmed` 說「A deletion of the saved work was started」，但在 P4 路徑上，重試刪的是可能根本沒有那份作品的資料庫（evidence 在 localStorage）。AC-7 要求「no state shows a sentence that violates CI-1」，Out of Scope 卻禁止改這些字串；而 spec.en.md:105 說 `body_unconfirmed`「is true there」，沒有任何 truth 列支撐。
- **信心**：medium。
- **請求等級**：P2。
- **建議**：把 CI-1 限縮到被改動的字串，或補上 P6/P8 的 truth 列。

### R-13：Clear 在 P1/P6 執行中依然顯示，但按下去什麼都不做
- **位置**：spec.en.md:93（「Clear: always」）。程式碼：`useSessionGate.ts:466`。
- **證據**：`clearInFlight` 會直接 return，畫面上的提議沒有兌現（既有行為）。
- **信心**：high。
- **請求等級**：P2。

### R-14：新 `sweep_failed` 的句子不論失敗與否都成立，無法區分狀態
- **位置**：traceability.md:23。
- **證據**：locale key 被刻意排除、從不刪除，所以「Not every other value … could be removed」在成功時也成立。另外，當 `length` 或 `key()` 丟例外時，其實沒有任何一次移除被嘗試過，「could not be removed」隱含已經嘗試過。
- **信心**：low。
- **請求等級**：P2。

### R-15：S3 用 init script 讓 `removeItem` 丟例外，可能波及 sessionStorage 與啟動流程
- **位置**：spec.en.md:131-132。
- **證據**（推論）：patch `Storage.prototype.removeItem` 會同時影響 sessionStorage，以及其他啟動時會呼叫 `removeItem` 的程式碼，可能讓頁面在到達 gate 之前就壞掉。
- **信心**：low。
- **請求等級**：P2。
- **建議**：只 patch `localStorage` 實例，或只針對特定 key 丟例外。

---

**依等級計數**：P0 1 件（R-1），P1 4 件（R-2、R-3、R-4、R-5），P2 10 件（R-6 至 R-15）。

---

## Adjudication (user, 2026-10-11)

| # | Findings | Ruling |
|---|---|---|
| A1 | C-1, R-1 (P0); R-2, R-3, C-2, C-4, V-6, K-5 (P1) | **Option A.** An attempt refused as not started adds its own report and changes nothing the previous attempt left: `clearFailurePhase` keeps its value, and `clearStarted` stays true if it was true. On a first attempt (nothing left before) behaviour is unchanged. The spec states this as a deliberate change to the current reset at `useSessionGate.ts:479`, and the comments stating the old rule are listed for correction. Rejected: B, a separate never-reset "delete issued and unconfirmed" fact (more state to keep in step); C, declaring the paths out of scope (does not resolve a P0). |
| A2 | V-3 (P0); K-2, C-6 (P1); R-12 (P2) — grades disagree | **Graded P0; option A.** CI-1 is narrowed to the four strings this epic changes and made mechanical: in en and zh-TW none of them may contain a term that refers to the learner's work (a fixed banned-term list, checked by test). The unchanged strings that presuppose saved work (`body`, `body_unconfirmed`, `clear_not_started_hint`) are an explicit, stated trade-off: the gate asks only when detection found learner evidence (`useSessionGate.ts:365`), so "saved work" is backed when they appear. Rejected: B, same fix graded P1 (as written the spec cannot satisfy AC-7 and AC-8 together, which is P0 by definition); C, also rewriting `body_unconfirmed` (more copy, collides with AC-8). |
| A3 | R-4, R-5 (P1); K-11, R-6 (P2) | **Option A.** `clear_unconfirmed_hint` drops "reload to see what is left" and names the site-wide clear; `sweep_failed_hint` says pressing delete again *retries* the whole site-wide clear; a new `clear_retry_not_started_hint` replaces the withheld not-started hint whenever an earlier run left state ("nothing was deleted this time" plus the storage remedy). Exact copy in `traceability.md`. Rejected: B, fixing only the P1 strings; C, avoiding the glossary term in the dialog. |

Findings not listed above carry no disagreement and are resolved by the main session in spec v2; each is mapped in `traceability.md` ("Round 1 resolution" section).
