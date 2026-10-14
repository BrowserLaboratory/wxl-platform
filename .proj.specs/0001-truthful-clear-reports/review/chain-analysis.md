# 串連分析：epic 0001（全站清除的回報要說真話）

日期：2026-10-14。依 `docs/agents/review.md` 的「Epic close-out: chain analysis」執行。

## 範圍與方法

- 程式碼基準：`main` = `013dcff`（T-0009 合併後）；分析在分支 `chore/epic-0001-close-out`（`0578a56`，只多一個 Markdown commit）上進行，沒有 pending 或 untracked 的變更。epic 的起點是 `72327e2`。
- 輸入：
  - `review/security-T-0001.md`～`security-T-0009.md` 的全部候選與備註
  - `spec.en.md`（Problem Statement、Solution、Out of Scope）
  - `traceability.md`（P0–P15、選擇規則）
  - `OPEN-QUESTIONS.md` 的 OQ-001～OQ-013
  - ADR-0005、`CONTEXT.md`、`review/round-1.md` 的 R-11
- 分工：
  - 一個 `harness-reviewer` 做分析（唯讀，沒有在瀏覽器重現任何路徑）。
  - 另一個 `harness-challenger` 獨立挑戰鏈 A 的結論（見文末）。
  - 主 session 補上 git 範圍。
- 行號對應 `013dcff`。「讀碼驗證」指逐行讀過程式碼確認；「推論」指沒有直接證據，或依賴瀏覽器的時序。

## 信任邊界

spec 沒有信任邊界的段落（見 N-4），以下由本分析推導：

| 邊界 | 內容 | 判斷 |
|---|---|---|
| B1 | 前一位學習者（A）留下的作品 vs. 下一位坐在鍵盤前的學習者（B） | **是真實邊界，但不保護機密性。** gate 不是 modal（OQ-002，`SessionGate.vue:118`），也不是存取控制（OQ-007 Reason）：B 在作答前就看得到 A 的筆記、程式草稿和 Repeater 請求。B1 保護兩件事：(a) 歸屬與完整性：B 沒選 continue，B 的作業就不會接到 A 的紀錄上（`useAttackSession.ts:101-105`、`:112`、`:141-158`；progress 與清單由 `isProgressAccessAllowed` 擋住）；(b) 殘留移除的說法：B 選了全站清除，A 的殘留就會被移除，畫面的描述也屬實（本 epic 的主題）。惡意的 A 不在威脅模型內，因為 A 能控制整個瀏覽器 profile。 |
| B2 | 同源的其他分頁或文件（含跑舊版程式碼的分頁） vs. 執行清除的頁面 | 真實邊界。gate 的狀態以分頁為單位（`sessionStorage`），資料庫和 `localStorage` 則是整個 origin 共用。 |
| B3 | 平台自己的紀錄（decision marker、start record） vs. 可能拒絕讀寫的瀏覽器儲存空間 | 真實邊界。設計方向是讀不到就當作沒有，然後再問一次（`useSessionGate.ts:243-264`）。 |
| （B0） | 題目 runtime vs. 平台（ADR-0005） | 本 epic 沒有碰 `platform/challenge/*/src/`。 |

## 輸入：九份報告的全部發現

| ID | Ticket | 等級（原報告） | 機制摘要 | 處置 |
|---|---|---|---|---|
| S-1 | T-0001 | Low（違規，不是缺陷） | 審查報告含本機絕對路徑 | 使用者裁決；OQ-010 |
| S-2 | T-0001 | Low → 誤報 | 改名不留別名；沒有型別檢查時，自訂 gate 的 fork 會靜默拿到 `undefined`，composable 的防護照常生效 | release note；OQ-011 |
| S-3 | T-0001 | Info | 其他註解仍寫「作品已刪」 | T-0008 |
| O-1 | T-0002 | Info | `data-session-gate-*` 出現在正式版 DOM；前提是 iframe 沒有 `allow-same-origin` | 不處理 |
| O-2 | T-0002 | Info | raw-error 標出原始錯誤字串 | 不處理 |
| O-3 | T-0002 | 非安全問題 | 測試 helper 在實例上留下自有屬性 | 補註解 |
| C1 | T-0003 | Info | 先前失敗後被拒的按壓清掉 `clearStarted`，P10b 的 continue 因此被接受 | T-0007 已修 |
| C2 | T-0003 | Low/Info | `clearInFlight` 註解不精確 | T-0008 |
| C3 | T-0003 | Info | 新文件的 phase 為 null，`clearStarted` 則會還原 | 刻意設計 |
| C4 | T-0003 | Info | composable 的 dismiss 沒檢查 phase | T-0006 已修 |
| C5 | T-0003 | Info | `String(err)` 遇到特殊值會拋錯 | 走不到 |
| F1 | T-0004 | Low | 掃除失敗後下一次刪除被擋，畫面仍說資料庫已刪 | T-0005／T-0006 已修 |
| F2 | T-0004 | Info/Low | 另一個分頁記憶體中的 attack session 寫回，推翻「救不回來」 | OQ-007 |
| F3 | T-0004 | Low/Info | 「其他項目」沒說殘留可能是前一位學習者的 | 文案由 spec 固定 |
| F4 | T-0004 | Info | hint 用字與按鈕標籤不逐字對應 | 不處理 |
| 備註 | T-0004 | P2 | 成功清除並重新載入後，另一個分頁把 session 寫回 | OQ-007 推論段 |
| F-1 | T-0005 | Low | P10c 報告「沒開始、什麼都沒刪」，dismiss 仍在 | T-0006／T-0007 已修 |
| F-2 | T-0005 | Low/Info | P7、P8 的提示說重新載入，出口卻只有 dismiss | T-0006 已修 |
| F-3 | T-0005 | Info | P10b 的 continue 被接受 | T-0007 已修 |
| F-4 | T-0005 | Info | 站台根目錄上被拒的按壓讓 gate 消失 | T-0007 已修 |
| F-5 | T-0005 | Info | 提示寫「另一個分頁」，在 P3x 可能誤導 | spec 定案 |
| I-1 | T-0006 | Info | reload 後語系導向等待；過時註解 | T-0008；OQ-012 |
| I-2 | T-0006 | Info | gate 不是 modal；save 不檢查 gate；排隊中的刪除完成後資料庫被重建 | 留給收尾 |
| I-3 | T-0006 | Info | dismiss 說明「nothing pending」在跨分頁時說得太滿 | 已修措辭 |
| I-4 | T-0006 | Info | 刪除依序處理只在 Chromium 實測 | 留給收尾 |
| F-1 | T-0007 | Low | `sessionStorage` 中途不可讀，reload 後新文件讀不到 start record，於是提供 continue | spec Out of Scope |
| F-2 | T-0007 | Low | 建議「改用一般視窗」 | 文案屬 spec |
| F-3 | T-0007 | Info | 被拒時還原成先前的值，而不是強制為 true | 走不到 |
| F-4 | T-0007 | Info（UX） | 連續被拒時不會重新朗讀 | 收尾記錄 |
| F-5 | T-0007 | Info | 寫入成功、讀回失敗，留下孤立的 start record | spec Out of Scope |
| C1 | T-0008 | Low | `evaluate` guard 的註解宣稱一個不存在的保護 | 已修 |
| C2 | T-0008 | Low/Info | `shouldPresentGateHere` 的說明少了條件 | 已修 |
| C3 | T-0008 | Info | 語系導向延後的理由沒有記錄 | OQ-012 |
| C4 | T-0008 | Info | `GateDecision` 說明不精確 | 已修 |
| C5 | T-0008 | Info | 刪除失敗的理由沒有涵蓋被 error 拒絕的情況 | 已修 |
| C6 | T-0008 | Low | 兩個防護條件沒有任何測試碰到 | OQ-013 |
| C1 | T-0009 | Low → 誤報 | OQ-007 公開「save 不檢查 gate」 | 補威脅模型句 |
| C2 | T-0009 | Low（條目不完整） | 筆記與程式草稿在掛載時讀入記憶體、不看 gate；掃除失敗並 dismiss 後，一次編輯就把 A 的內容寫回 | OQ-007 擴大 |
| C3 | T-0009 | Low | 「已在等待 `getDb()`」的時間點描述 | 已修 |
| C4 | T-0009 | Info | 沒說寫回的是誰的資料 | 已修 |
| C5–C8, C10 | T-0009 | 誤報 | OQ-013、OQ-012、OQ-008、P11a 測試、OQ-003 | 不處理 |
| C9 | T-0009 | Info | P11a 只驗出口字串，沒有呼叫 handler | 不處理 |

## 候選串連

### 鏈 A：同一分頁，掃除失敗 → dismiss → 把記憶體中 A 的內容寫回（跨越 B1）

組成：T-0009 C2、T-0006 I-2、T-0004 F2、T-0003 C4，以及 OQ-007。

| 步驟 | 事件與位置 | 控制者 |
|---|---|---|
| 0 | A 在題目 X 留下筆記與程式草稿 | A（無意間） |
| 1 | B 開新分頁進入 X，gate 偵測到證據後詢問（`useSessionGate.ts:425`、`:453`）。版面不看 gate 就把 A 的筆記（`ChallengeLayout.vue:777-788` → `usePentestNotes.ts:44-50`）和程式草稿（`CodeEditorPanel.vue:178`）讀進記憶體，Repeater 也讀入已存的請求（`RepeatPanel.vue:21`、`:49`）。attack session 則是 B 新開的（`useAttackSession.ts:112`、`:149-158`）。 | 平台 |
| 2 | B 按刪除。資料庫刪除 resolve；sweep 的 `removeItem` 拋錯，phase 設為 `'sweep'` 後 return，**頁面不重新載入**（`useSessionGate.ts:622-624`）。 | 瀏覽器或擴充功能（spec Problem Statement 說只有特定實作會拋錯） |
| 3 | 畫面顯示 `body_cleared`、掃除失敗的報告與 dismiss。 | 平台 |
| 4 | B 按 dismiss：gate 關閉，不寫 marker，頁面留在原地（`useSessionGate.ts:508-513`）。 | B |
| 5 | B 照常作答。程式草稿改動 500 ms 後執行 `saveCodeDraft`，`getDb()` 以 upgrade 重建所有 store（`useChallengePersistence.ts:267-384`），寫入「A 的草稿加上 B 的修改」（`:629-631`）。編輯 A 的筆記時，`saveNote` 會把它寫回（`:647-649`）。 | B 的一般操作 |
| 6 | 結果：B 選了全站清除，畫面也說資料救不回來，A 的內容卻回到資料庫，和 B 的混在一起；`code-drafts` 以 slug 為 key，沒有擁有者欄位。 | — |
| 7 | 後果的上限：這個分頁的 progress 仍被擋；下一次冷載入（P11a）或新分頁都會再問，而且問句屬實；之後清除成功會再刪掉。 | — |

- 嚴重度 Low（觸發條件罕見）。
- 信心：機制 0.75（讀碼驗證，未重現）；跨越 B1 0.6；「epic 的報告或出口失真」0.55。

### 鏈 B：其他分頁，成功清除後舊分頁寫回 → 執行清除的分頁靜默接續 A 的 attempt

- 經過：A 的分頁沒關 → B 在另一個視窗清除成功並寫 marker → 有人在 A 的分頁操作，`saveAttackSession` 寫回 A 的 session → B 的分頁因為 marker 已存在而不再詢問，進入 X 時接續 A 未解出的 session（`useAttackSession.ts:112-143`）。
- 步驟 2 的前提是有人在 A 留下的分頁裡操作，依 gate 的設計，那就算是「同一個人」。P15 沒有任何文字，本 epic 也沒有改它。
- 判定：epic 沒有失真。信心 0.45（推論）。

### 鏈 C：刪除進行中的寫入 → 清除成功 → A 的程式草稿留存

- 經過：在刪除請求送出之後才呼叫的 `getDb()`，會排在刪除後面，刪除完成後重建資料庫並寫入草稿 → 清除成功後 reload，B 的分頁不再詢問，編輯器載入 A 的草稿。
- 判定：epic 沒有失真。信心 0.4。

### 鏈 D：start record 無法持久 → reload → continue（跨越 B3，不跨 B1）

- 後果落在 B 自己身上：排隊中的刪除之後仍會完成，`body` 卻說不選刪除就不會刪。
- spec Out of Scope 已明確記錄。信心 0.6。

### 鏈 E～I：組不成串連

| 鏈 | 內容 | 判定 | 信心 |
|---|---|---|---|
| E | 過渡期各項（T-0003 C1/C4、T-0004 F1、T-0005 F-1～F-4、T-0006 I-3） | 讀碼確認都已關閉 | 0.85 |
| F | OQ-013 的兩個防護 | 目前休眠 | 0.8 |
| G | fork 改名 | composable 的防護照常生效，沒有跨越 B1 | 0.85 |
| H | 刪除依序處理 | 只有在瀏覽器違反 IndexedDB 規格時才成立，後果也只落在 B 自己 | 0.8 |
| I | DOM 屬性與 iframe sandbox | 問題在 sandbox 本身，屬 ADR-0005 第 2 類 | 0.9 |

## 分析結論

| 鏈 | 跨越邊界 | epic 的報告或出口失真 | 答案 | 信心 |
|---|---|---|---|---|
| A | B1 | `body_cleared`「救不回來」；dismiss 是唯一出口，而且頁面留在原地 | 是 | 0.55 |
| B | B2 → B1 | 否 | 否 | 0.45 |
| C | B1 | 否 | 否 | 0.4 |
| D | B3 | 否（spec 已明記） | 否 | 0.6 |
| E–I | 無 | — | 否 | 0.8–0.9 |

分析者為鏈 A 建議的最小 ticket：

- **做法**：同一份文件裡，資料庫刪除已經 resolve 之後，`getDb()` 直接 reject，不再重新開啟資料庫。失敗經由 `persistenceError` 告知學習者，文案需要 spec 定案。
- **排除的替代方案**：
  - dismiss 改成 reload：會回到 dismiss 原本要解決的鎖死門。
  - 只改文案：能修正說法，但沒有關閉這條跨越。

## 新增的觀察

| ID | 位置 | 內容 | 信心 |
|---|---|---|---|
| N-1 | `OPEN-QUESTIONS.md` OQ-007 | 只列了 IndexedDB 的寫入，漏了 `localStorage` 的寫回（`codeDraftSnapshot.ts:9`、`RepeatPanel.vue:45`、`:63-64`） | 0.7 |
| N-2 | `traceability.md` 的 R-11 處置 | R-11（`round-1.md:636-640`）同時指出「寫回可能已重建資料庫」，處置只回應了另一半 | 0.6 |
| N-3 | `useSessionGate.ts:489-500`、`SessionGate.vue:232-245` | dismiss 的安全理由沒有提到記憶體中 A 的筆記與草稿 | 0.6 |
| N-4 | `spec.en.md` | 沒有信任邊界段落，串連分析只能自行推導 | 0.8 |

## 涵蓋範圍限制

- 沒有在任何瀏覽器重現；所有時序判斷（IndexedDB 的佇列順序、put 是否在卸載前完成）都是推論。
- 沒有評估依賴套件弱點、可用性，以及題目 runtime 的內容。

## 獨立挑戰（`harness-challenger`，針對鏈 A）

挑戰者讀過鏈 A 的論述與引用來源，結論是**不開 ticket**，信心 0.6。理由如下：

- **逐張審查已經判斷過同一個機制。** T-0004 F2（`security-T-0004.md:26`，信心 0.85）、T-0006 I-2（`security-T-0006.md:27`，信心 0.9）、T-0009 C2（`security-T-0009.md:26`，信心 0.9）都判定「不跨信任邊界，是既有行為」。鏈 A 實質上是 T-0009 C2 的重述，沒有提出任何逐張審查在各自 diff 範圍內看不到的組合效應。
- **B1 不是程式強制的邊界。** gate 已定性為「告知與選擇，不是存取控制」（OQ-007 Reason、T-0009 C1）。資料庫是每個瀏覽器一份的共用 store，`pentest-notes`、`code-drafts` 以 slug 或 id 為 key，沒有擁有者欄位；只有 `recordAttempt` 會檢查 `isProgressAccessAllowed`（`useChallengePersistence.ts:599`）。B 在做出選擇之前就看得到 A 的內容，也能複製，寫回並沒有給任何人原本做不到的能力。
- **畫面在顯示的當下為真。** 新文案描述的是已經完成的刪除（`traceability.md:29`），OQ-007 Not blocked 也明說報告描述的是顯示當下的狀態。事後回到資料庫的是頁面記憶體中的副本，不是被救回的資料。挑戰者也承認這裡有張力：內容相同的字串確實又回到了資料庫。
- **本 epic 沒有引入它，反而收窄了。** dismiss 出口在 epic 之前就存在，本 epic 把它收窄為只在 phase 為 `'sweep'` 時提供（`security-T-0006.md:20`）。寫回已明列為 spec Out of Scope（T41），由 OQ-007 追蹤。
- **鏈 A 對 attack session 的歸屬不精確。** 在執行清除的分頁裡，attack session 是 B 新開的（`useAttackSession.ts:112`、`:150-158`）。單一分頁內會寫回的只有筆記與程式草稿。
- **有比分析者提案更小的修法。** 分析者提案讓 `getDb()` 全面 reject，但這會連讀取一起擋掉；而 `databaseDeleted` 在文件存續期間不會重置，`persistenceError` 會一直亮著。替代方案有兩個：
  1. 只在那 5 條沒有 gate 檢查的寫入路徑加檢查，比照 `recordAttempt`。
  2. dismiss 時清掉記憶體中的筆記與草稿。
  
  挑戰者另外確認，`deleteDatabase` 不經過 `getDb`（`useChallengePersistence.ts:528-558`），所以 P9 的重試不受任何一種修法影響。「dismiss 改成 reload」被否決的理由成立。
- **若要處理，應另開 epic，不宜放進 0001。** OQ-007 列出的選項是跨多個 composable 的讀寫路徑設計，而 spec v3 已經不再重新審查。

主 session 的查證：`git show 72327e2:.vitepress/theme/composables/useSessionGate.ts` 確認 epic 起點已有 `dismissClearFailure`，條件是有錯誤且 `storedWorkGone` 為真；掃除失敗時記錄錯誤後就 return，不重新載入。舊的 `body_cleared` 也寫著「The saved work has already been deleted and cannot be brought back」。所以鏈 A 在 epic 之前就存在，本 epic 收窄了出口，也把文案的範圍縮小到資料庫本身。

## 使用者裁決（2026-10-14）

使用者在三個選項中選 **A**：

- **不開 ticket**，epic 0001 照常收尾。
- 鏈 A 不構成需要開 ticket的跨邊界串連。理由是 gate 已定性為非存取控制、畫面在顯示當下為真，而且這是既有行為、本 epic 反而收窄了出口。
- OQ-007 補上以下內容：
  - 鏈 B、鏈 C 的後果
  - `localStorage` 的寫回（N-1）
  - dismiss 註解沒有提到記憶體中的筆記與草稿（N-3）
  - 挑戰者提出的更小修法
- 回顧時，把「清除後的寫回」列為下一個 epic 的優先候選。

沒有選的選項：

- **B**：在 epic 0001 內開 T-0010。需要修訂 spec，新的規範內容未經 stage 3，也趕不上 10/14。
- **C**：現在就開 epic 0002。OQ-007 已經是這類待決問題的指定紀錄位置。

N-2（round-1 R-11 只處置了一半）與 N-4（spec 沒有信任邊界段落）交給回顧處理。
