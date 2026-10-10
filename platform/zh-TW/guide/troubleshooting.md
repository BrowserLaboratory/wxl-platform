# 疑難排解

這一頁是本平台已知限制的完整清單。其他頁面遇到這些狀況時只會連過來，不會重寫一次。

| 你看到的狀況 | 章節 |
|---|---|
| 按過 Stop 之後 Run 一直是 `Loading…` 且按不動 | [Stop 之後 Run 維持不可用](#run-loading-after-stop) |
| 按 Stop 之後輸出還在，結尾多一行 `(stopped)` | [Stop 之前印出的行會保留](#output-kept-after-stop) |
| 迴圈停不下來，畫面上只剩 Stop 可按 | [停不下來的執行不會鎖死分頁](#infinite-loop) |
| 整個 Code 面板被蓋住，齒輪與 History 按不動 | [面板被遮罩蓋住，工具列點不到](#overlay-blocks-toolbar) |
| 在 Mac 上按 `Ctrl+Enter` 沒有反應 | [macOS 上 Ctrl+Enter 不會執行](#mac-shortcut) |
| 正確的 flag 被判成 `Incorrect flag. Try again.` | [執行環境還沒好，正確的 flag 也會被判錯](#flag-rejected-while-loading) |
| 重新載入之後成功訊息與下載按鈕都不見了 | [重新載入後成功訊息會消失](#solved-banner-gone) |
| 匯出的攻擊紀錄裡沒有解題那一次的內容 | [回訪已解出的題目會建立新的攻擊紀錄](#attack-log-overwritten) |
| 出現橘色警告說這次作業沒有被記錄 | [同站開第二個分頁會擋住工具資料庫](#second-tab-blocks-database) |
| 用 `requests` 登入之後 cookie 到底有沒有帶上 | [`requests` 的 cookie 與 `Set-Cookie`](#requests-cookies) |
| Network 面板一直顯示 `No requests recorded yet` | [Network 面板一直是空的](#empty-network-panel) |
| 輸出區顯示 `(no output)` | [程式什麼都沒印出來](#no-output) |
| 第一次點 Code 分頁要等很久；離線完全不能用 | [首次造訪要下載 Python 執行環境](#first-visit-download) |
| 出現橫幅說題目執行環境被重啟 | [題目執行環境被重啟](#runtime-restarted) |
| 回到題目頁時所有東西都重來一遍 | [離開題目頁會關掉執行環境](#leaving-the-page) |
| Repeater 與 Network 面板顯示的標頭不一樣 | [Repeater 看起來與 Network 對不上](#repeater-vs-network) |
| 介面切成中文，面板文字仍是英文 | [面板文字與分頁名稱維持英文](#hardcoded-english) |

## Code 面板

### Stop 之後 Run 維持不可用 {#run-loading-after-stop}

**你會看到**：按下 `■ Stop` 後 Stop 按鈕消失，Run 變成 `Loading…` 且不能按。把滑鼠移上去，提示是 `Waiting for runtime to initialize…`——與環境從未載入時看到的提示相同。

**為什麼**：Stop 的做法是把整個 Python worker 終止，然後立刻建一份替補的。Stop 背後那個呼叫要等替補 worker 暖機完成才結束，這整段期間 Run 都被壓在停用狀態。

**該怎麼辦**：

1. 等按鈕變回 `▶ Run`。
2. 把腳本裡建立環境的那一段重跑一次。替補的是全新環境：先前定義的變數、import 進來的模組、寫進虛擬檔案系統的檔案全部消失。

反過來說，只要沒有按過 Stop，同一個面板內連續多次執行共用同一個全域命名空間，上一次定義的變數在下一次執行仍然可用。

### Stop 之前印出的行會保留 {#output-kept-after-stop}

**你會看到**：按下 Stop 之前印出的每一行都還在輸出區，結尾多一行 `(stopped)`。這一次執行不會被當成錯誤，它的 History 紀錄前面不會有 `⚠` 記號。

**為什麼**：輸出是串流的。每一段標準輸出一產生就接到輸出區，不是等程式跑完才一次顯示。

**該怎麼辦**：

- 要清掉輸出就按 Run，每一次執行都會先清空輸出區。Stop 不能拿來做這件事，因為它只在執行中才出現。
- 被中斷的執行一樣會留下一筆 History 紀錄。中斷的、出錯的、正常結束的，三者都會被記下來。
- 輸出還在增加的期間沒辦法往回捲：每一段新輸出都會把捲軸拉回最底部。要看前面的內容請等執行結束。

### 停不下來的執行不會鎖死分頁 {#infinite-loop}

**你會看到**：沒有出口的迴圈會讓 Run 一直停在 `Running…`、`■ Stop` 一直在，但頁面本身照常反應——你還是可以切換工具分頁、在 Browser 面板瀏覽、編輯筆記。

**為什麼**：Python 直譯器跑在獨立的 Web Worker 裡，不在頁面主執行緒上，所以卡住的是 worker 的事件迴圈，不是頁面的。同一個隔離也造成另一件事：任何取消旗標都不可能傳進你的迴圈，因為 worker 裡沒有任何東西有機會去讀它。

**該怎麼辦**：按 `■ Stop`。終止 worker 是結束一次進行中執行的唯一方法。接著就是 [Stop 之後 Run 維持不可用](#run-loading-after-stop) 描述的等待。

平台不會因為你的程式碼跑太久就把它切掉——列舉與暴力嘗試被視為正常的解題路徑，執行會一直持續到你按下 Stop。唯一的例外是從按下 Run 起算的六小時上限。它是牆鐘不是閒置計時器，所以一路印進度的迴圈同樣在六小時被放棄，輸出區會顯示 `the runner stopped responding`。

### 面板被遮罩蓋住，工具列點不到 {#overlay-blocks-toolbar}

**你會看到**：一層半透明遮罩蓋住整個 Code 面板，連工具列一起蓋住，於是齒輪（編輯器設定）與 History 下拉選單都按不動。

**為什麼**：遮罩覆蓋整個面板而且不讓點擊穿透。有三種情況會拉起它，遮罩上的文字告訴你是哪一種：

| 遮罩文字 | 還沒就緒的是什麼 |
|---|---|
| `Loading runtime…` | 題目執行環境或 Service Worker。與 Python 無關，是題目那一端還沒起來。 |
| `Loading Python environment…` | 這個面板的 Pyodide 還在下載或初始化。 |
| `Python environment failed to load:` 後面接一段原因 | 初始化失敗，冒號後面就是原因。 |

**該怎麼辦**：前兩種等它自己消失，遮罩一收工具列就能用。第三種請重新載入頁面；初始化若在 60 秒內沒完成就會被判定為失敗，不會無限期轉圈，所以看到失敗訊息表示這一次已經結束，不是還在進行。

### macOS 上 Ctrl+Enter 不會執行 {#mac-shortcut}

**你會看到**：Run 旁邊的工具列提示寫著 `Ctrl+Enter`、Run 的滑鼠提示寫著 `Run (Ctrl+Enter)`，但在 Mac 上按 `Ctrl+Enter` 沒有任何反應。

**為什麼**：編輯器在 macOS 上綁的是 `Cmd-Enter`。那兩段提示是寫死的英文字串，不會隨作業系統改變。

**該怎麼辦**：改按 `Cmd+Enter`，或直接點 Run。

這個快捷鍵還少了一道防護：Run 按鈕在執行中會停用，快捷鍵不會。執行中再按一次會清空輸出區、印出 `Error: a run is already running in this panel`，接著 Stop 按鈕消失、Run 重新可按——而前一次執行仍在 worker 裡繼續跑。請只在按鈕顯示 `▶ Run` 時使用快捷鍵；若已經因此弄丟 Stop 按鈕，重新載入頁面。

### 程式什麼都沒印出來 {#no-output}

**你會看到**：執行結束後輸出區顯示 `(no output)`。

**為什麼**：這一次執行結束時完全沒有寫出任何標準輸出。失敗不是沉默的：例外會在既有輸出後面接上 `Error:` 與訊息，先前印出的行也不會被清掉。

**該怎麼辦**：把想看的值用 `print()` 印出來。只計算而不列印的腳本沒有東西可顯示。

## flag 提交

### 執行環境還沒就緒時無法驗證 {#flag-rejected-while-loading}

「目前無法驗證旗標」與答錯是不同結果。等執行環境狀態燈轉綠再試；等待沿用／清除決策及正在提交時，交旗欄位會停用。

### 重新載入後成功訊息會消失 {#solved-banner-gone}

交旗成功訊息屬於當次頁面。已儲存的解題進度另外保存，沿用後會顯示完成標記。讀取失敗會提供重試；標記與當次成功訊息不是同一個狀態。

### 回訪已解出的題目會建立新的攻擊紀錄 {#attack-log-overwritten}

舊紀錄保留，不會被新的那份覆蓋。題目頁列出這一題的每一筆紀錄，選取其中一筆之後，匯出下載的就是那一筆；未選取時下載的是目前作答中的那一筆。一次匯出寫的是一筆紀錄，不是歷次紀錄的集合。未解出的最新紀錄符合接續條件時才會接續。

## 儲存

### 舊分頁可能阻擋資料庫升級 {#second-tab-blocks-database}

另一個分頁仍使用舊版資料庫時，可能阻擋升級。開啟資料庫逾時會顯示儲存警告；舊頁面也可能因資料庫已升級而寫入失敗。

先下載可取得的攻擊紀錄，另存尚未儲存的文字，再關閉本站的其他分頁並重新載入。下載成功不代表資料庫已恢復，也不能取回原本就無法讀取的草稿。不要直接清除本站資料來排錯。

若只有解題進度顯示「無法讀取」，先按「重新讀取」。這不代表零完成，也不代表資料已刪除。公用電腦的操作順序見[研習指引](./workshop)。

## Python 的 `requests`

### `requests` 的 cookie 與 `Set-Cookie` {#requests-cookies}

**你會看到**：`requests.Session()` 確實會延續登入狀態——登入回應的 `Set-Cookie` 會存進 session 的 cookie jar，後續請求自動帶上。真正不能用的是從回應標頭去讀它們：一個回應設了多個 cookie 時，`response.headers['set-cookie']` 只是一個用 `, ` 串起來的字串，而 cookie 自己的 `Expires` 屬性裡就含逗號，所以這個字串切不回原本的那幾個 cookie。

**該怎麼辦**：要逐個處理 cookie 時去讀 `session.cookies`，不要去解析那個串起來的標頭。

因為每一個請求都走橋接層，`requests` 底下的傳輸層是被換掉的。由此帶來四個後果：

| 你寫的 | 實際發生的事 |
|---|---|
| `stream=True`、`iter_content()`、`resp.raw.read()` | 讀到空的。`resp.raw` 是一個替身，它的 `read()` 一律回傳空 bytes，也沒有 `stream()`。內容請從 `.content` 或 `.text` 取。 |
| `timeout`、`verify`、`proxies`、`stream`、`cert` | 收下之後完全不使用，設了沒有任何效果。 |
| 指向外部網站的網址 | 主機名稱被丟棄，只有 path 與 query string 會被使用，請求一律送到本題的應用程式。你連不到真正的外部網站。 |
| 橋接層無法完成的呼叫 | 拋出 `ConnectionError`，訊息以 `WXL dispatch bridge error:` 開頭。題目執行環境完全連不上是另一回事，見 [題目執行環境被重啟](#runtime-restarted)。 |

回應物件帶有 `status_code`、`headers`、`content`／`text`、`url`、`request`、`raw` 這些屬性，`.text` 一律以 UTF-8 解碼。呼叫是同步的，不需要 `await`。

**在 Browser 面板登入是另一件事**：Browser 面板自己維護一份 cookie jar，而它並不認得平台目前用來搬運 `Set-Cookie` 的格式。進到那份 jar 的是從載體切出來的一段無意義字串，而面板真的會把它送出去——你可以在 Network 面板的請求標頭裡看到它。題目那一端認不得它，所以 Python 與 PHP 題目在 Browser 面板登入之後狀態不會延續，而且全程沒有任何錯誤訊息。需要登入延續時，請改用 Code 面板搭配 `requests.Session()`。

## 流量與 Network

### Network 面板一直是空的 {#empty-network-panel}

**你會看到**：面板中央顯示 `No requests recorded yet`。

**依序值得檢查的原因**：

- Network 面板不受就緒閘門管轄。題目其他部分還在載入時它就能點開，所以這個階段的空白只代表還沒有任何請求送出去。
- Code 面板裡 `requests` 送出的請求會被記錄，Browser 面板的導覽也會。
- Browser 面板的上一頁／下一頁只是把存下來的畫面搬回來顯示，不會發出請求，所以不會多出任何一列。
- 記錄只活在目前這個題目頁面上。換頁——包含切換語系——會整份清空，見 [離開題目頁會關掉執行環境](#leaving-the-page)。
- 按 `Clear` 會清空記錄並讓編號從 1 重新開始，所以編號 `#1` 那一列不一定是這次造訪的第一個請求。

### Repeater 看起來與 Network 對不上 {#repeater-vs-network}

**你會看到**：兩件看起來像故障、實際上不是的事：

- 同一筆交換，在 Network 面板的 Response 分頁看到的是還原好的 `Set-Cookie`，在 Repeater 的回應區卻是全小寫的標頭名稱加上一個 `x-wxlsh-set-cookie`、值是逗號分隔的 base64 字串。那是同一個回應被兩種檢視方式畫出來的結果。
- 對同一列連按兩次 **Send to Repeater**，分頁會切過去但編輯區的內容不動，看起來像按鈕失效。原因是注入的值與已經在裡面的那一份完全相同，只有值改變時編輯區才會被覆寫。

**該怎麼辦**：要看 `Set-Cookie` 就去 Network 面板的 Response 分頁。若你在 Repeater 裡改過某一列的請求、想把原始請求叫回來，先送另一列進去，再送你要的那一列。

## 執行環境的生命週期

### 首次造訪要下載 Python 執行環境 {#first-visit-download}

**你會看到**：第一次點開 Code 分頁時，面板被 `Loading Python environment…` 蓋住一段時間。開啟題目頁本身很快，等待是從點 Code 分頁那一刻才開始。

**為什麼**：Python 環境是 Pyodide v0.29.3，從公開的 jsDelivr CDN（`https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js`）下載，數十 MB。它刻意不在開啟題目頁時下載，而是等你第一次點 Code 分頁才開始。另外，每一個題目頁都會下載該題自己的 `runtime.wasm`，題目的程式碼與檔案都封在裡面。

**離線用不了**：Pyodide 來自外部 CDN，因此完全沒有網路時 Python 題目跑不起來。舊版文件宣稱本平台可以離線使用，那是錯的。負責攔截題目網址的 Service Worker 也沒有做任何離線快取。

**該怎麼辦**：解 Python 題目時全程都要連得上網路。平台與它的 Service Worker 都不會留一份給離線使用，之後那一次能不能從你瀏覽器自己的 HTTP cache 取得並不確定，不要依賴它。初始化沒有完成時是由遮罩告訴你——見 [面板被遮罩蓋住，工具列點不到](#overlay-blocks-toolbar)。

### 題目執行環境被重啟 {#runtime-restarted}

**你會看到**：題目頁上方出現一條可關閉的英文橫幅：

```
The challenge runtime was restarted after a request ran too long.
Any login or uploaded files from this challenge are gone.
```

**為什麼**：題目應用程式處理單一 HTTP 請求的上限是十秒。超過的請求會拿到狀態碼 `508`，內容是 `{"error": "challenge runtime execution exceeded the time limit"}`，接著執行環境被重建。這個上限只管題目那一端，不限制你在 Code 面板裡自己的程式碼。

**該怎麼辦**：重新登入，並把題目需要的檔案重新上傳。寫腳本時把 `508` 讀成「題目應用程式卡住了」，不是你的腳本失敗。另一個症狀是狀態碼 `502`、內容 `{"error": "the challenge runtime could not be reached"}`，那表示題目執行環境完全連不上；它是以一般回應的形式回來，不是例外，所以要自己檢查 `status_code`，不能指望 `requests` 幫你拋錯。

### 離開題目頁會關掉執行環境 {#leaving-the-page}

**你會看到**：離開一題再回來，所有東西從頭來過：執行環境重新載入、Browser 面板的登入狀態不見、Network 面板是空的。

**為什麼**：離開題目頁會直接關掉題目的執行環境，而流量記錄只活在那一個頁面實體上。切換語系也算離開：語系切換是導向另一個語系的同一頁網址，等於整頁換過去。

**該怎麼辦**：盡量在一次造訪內把一題做完，離開之前先匯出攻擊紀錄。已儲存的筆記與 Code 草稿存在資料庫裡，回來時還在；流量記錄與題目本身的狀態不會。已經打好但還沒儲存的筆記文字，會在筆記面板關閉時消失。

## 介面語言

### 面板文字與分頁名稱維持英文 {#hardcoded-english}

**你會看到**：介面切成中文之後，題目頁有很大一部分仍然是英文。

| 位置 | 維持英文的文字 |
|---|---|
| 題目頁的工具分頁 | `Browser`、`Network`、`Repeater`、`Code` |
| 題目清單頁標題 | `Challenges`、`Choose a challenge to begin` |
| 難度下拉選單 | `Easy`、`Medium`、`Hard`、`Mystery` |
| 難度徽章 | frontmatter 的原始字串 `easy`、`medium`、`hard`、`mystery` |
| Network 面板 | 整個面板，從 `Network Traffic` 開始 |
| Code 面板 | `▶ Run`、`Running…`、`Loading…`、`■ Stop`、`History…`、`(stopped)`、`(no output)` |

**為什麼**：這些字串寫死在元件裡，不在翻譯檔內。交旗與儲存回饋另有中英文翻譯。

**該怎麼辦**：沒有辦法，切換語系不會改變其中任何一項。

另外兩個中英差異值得知道：

- 中文與英文的題目清單讀的是各自獨立的內容目錄，兩份清單收錄的題目可能不同。
- 題目前面的 `#NNN` 是它在載入順序裡的位置，不是出題者指定的識別碼。兩份清單各自編號，而且新增題目或改題目資料夾名稱都會讓編號整批位移。
