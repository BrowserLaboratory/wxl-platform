# Code 面板

Code 面板是題目頁內建的 Python 3 編輯器與執行器。它以 Pyodide（編譯成 WebAssembly 的 CPython）在一個 Web Worker 裡執行，與題目應用程式自己那份 Python 是各自獨立的兩份。

## 面板組成

| 區域 | 內容 |
|---|---|
| 編輯區 | 輸入 Python 的地方。面板剛開啟時佔面板高度的 65%。 |
| 分隔線 | 兩區之間的拖曳把手，提示文字為 `Drag to resize`，拖動它可改變上下比例。 |
| 輸出區 | 程式執行時寫出來的文字。 |
| 工具列 | Run 按鈕、Stop 按鈕（只在執行中出現）、`Ctrl+Enter` 提示、開啟編輯器設定的齒輪，以及 History 下拉選單。 |

## Python 環境的載入

Python 環境是在你第一次切到 Code 分頁時才開始下載，不是一開題目頁就下載，所以第一次切過去要等一段時間：Pyodide 每次都從 CDN 取得，且會下載數十 MB，所以只要用到這個面板就需要可用的對外連線——見[疑難排解](./troubleshooting#first-visit-download)。

環境尚不可用時，面板上會蓋一層遮罩：

| 遮罩文字 | 意思 |
|---|---|
| `Loading Python environment…` | Pyodide 還在下載或初始化。 |
| `Python environment failed to load:` 加上原因 | 初始化放棄了，原因接在訊息後面。 |
| `Loading runtime…` | 與 Python 無關。題目 runtime 或 Service Worker 尚未就緒，整個面板被擋住。 |

遮罩涵蓋整個面板，連工具列一起蓋住，而且不讓點擊穿透。遮罩消失之前，齒輪與 History 下拉選單一樣按不動。

## 執行程式

Run 按鈕同時是狀態指示器，它有三種文字：

| 按鈕文字 | 出現時機 | 可否按下 |
|---|---|---|
| `▶ Run` | 執行器已接上、題目工具已就緒，且沒有程式在跑 | 可以 |
| `Running…` | 有程式正在執行 | 不行 |
| `Loading…` | 題目工具尚未就緒、尚未接上 Python 執行器，或按下 Stop 後的重啟還沒完成 | 不行 |

滑鼠移到按鈕上，執行器缺席或題目工具未就緒時提示 `Waiting for runtime to initialize…`，可以執行時提示 `Run (Ctrl+Enter)`。按下 Stop 之後的重啟期間執行器被卸下，所以提示也是等待那一句，與 `Loading…` 的按鈕文字一致。

### 快速鍵

| 平台 | 快速鍵 |
|---|---|
| Windows / Linux | `Ctrl + Enter` |
| macOS | `Cmd + Enter` |

工具列提示與 Run 的滑鼠提示在所有平台上都寫著 `Ctrl+Enter`。但在 macOS 上綁定的按鍵是 `Cmd-Enter`，在那裡按 `Ctrl+Enter` 不會有任何反應。

Run 按鈕旁的 `Ctrl+Enter` 提示只在環境已就緒、且目前沒有程式在跑的時候顯示，執行中會消失。

Run 按鈕在執行中會停用，快速鍵卻沒有同樣的防護。程式還在跑的時候再按一次快速鍵，會清空輸出區、印出 `Error:`，下一行才是 `a run is already running in this panel`，然後把面板打回閒置狀態——Stop 按鈕消失、Run 重新可按——而先前那次執行仍在 worker 裡繼續跑。要中斷執行請用 Stop。

## 中斷執行

Stop 按鈕（`■ Stop`，滑鼠提示 `Stop the running code`）只在程式執行中才會被畫出來。其他時候看不到它，所以它不能拿來清空輸出區。

按下 Stop 是把整個 Python worker 銷毀。這也是為什麼它是跳出無窮迴圈的唯一辦法：卡住的是 worker 的事件迴圈，你自己寫在迴圈裡的取消判斷永遠不會被執行到。

按下 Stop 之後：

1. 輸出區保留先前印出的全部內容，並在結尾多一行 `(stopped)`。這不算錯誤，該次執行在 History 裡不會被標上錯誤記號。
2. Run 變成 `Loading…` 且不能按。舊 worker 被終止、替補的立刻開始建立；要等替補環境載入完成，Run 才會重新可按。
3. 回來的是一個全新的環境。你定義過的變數、import 過的模組、寫進虛擬檔案系統的檔案全部消失，前置步驟要重跑一次。

反過來說，只要沒有按過 Stop，同一個面板內連續多次執行共用同一個全域命名空間，前一次定義的變數在下一次還在。

被中斷的執行與出錯的執行，都一樣會留下一筆 History 紀錄。

Run 遲遲不能按的時候該怎麼辦，寫在[疑難排解](./troubleshooting)。

## 讀輸出

- 輸出是串流的。程式邊跑邊出現，不是跑完才一次顯示，所以按 Stop 之前印出來的行都會留著。
- 每有新的一段輸出，輸出區就捲到最底部。這個動作是無條件的，程式還在跑的時候往上捲回頭看，會立刻被拉回底部。
- 每次執行都會先清空輸出區，只留這一次的結果。
- 程式跑完但什麼都沒印出時，輸出區顯示 `(no output)`。
- 程式拋出例外時，會在既有輸出後面接上 `Error:` 與例外訊息，先前印出的內容不會被清掉。

有兩則訊息來自平台而不是你的程式：

| 訊息 | 成因 |
|---|---|
| `a run is already running in this panel` | 前一次執行還沒結束就又送出一次。 |
| `the runner stopped responding` | 該次執行超過平台的執行上限而被放棄。 |

跑久了不會被砍掉，無窮迴圈也不會讓整個分頁凍住——唯一存在的那個上限、以及迴圈出不來時該怎麼辦，寫在[疑難排解](./troubleshooting#infinite-loop)。

## 編輯器設定

工具列上的齒輪會開啟編輯器設定面板。它只有三個控制項加一個重設：

| 控制項 | 作用 | 預設值 |
|---|---|---|
| 自動完成 | 輸入時提示模組與符號名稱。 | 開 |
| 括號自動閉合 | 自動幫你補上 `(`、`[`、`{` 的右半邊。 | 開 |
| 字型大小 | 編輯器的文字大小，可在 10px 到 24px 之間以 1px 為單位調整。 | 13px |
| 重設為預設值 | 把上面三項一次拉回預設。 | — |

**引號永遠不會自動補上。** 自動閉合只作用在 `(`、`[`、`{` 三個括號字元上。單引號、雙引號、三引號都不會被自動配對，所以你手打的字串不會在背後被改寫。

把「括號自動閉合」關掉也不改變這件事。關掉的只是括號補齊那一部分；讓引號永不配對的規則在開與關兩種狀態下都掛著。

其餘值得知道的行為：

- 把「自動完成」關掉是整個補完擴充被移除，打字時完全不會再跳出清單，而不是跳出來但沒作用。
- 自動完成提示的是平台預先寫好的一份固定模組與符號清單，`requests` 是其中第一個項目。
- 從補完清單選一個函式時，會補上左括號並把游標放進括號裡。右括號由括號自動閉合補上，該設定關掉時就只有左括號。
- 目前字級以「數字加 px」顯示在減號與加號鈕中間。已經到最小值時減號鈕會變灰且按下去毫無作用，最大值時加號鈕同理。
- 改了設定會立刻套用到正在編輯的內容，不必重新開啟面板，游標位置與復原紀錄也不會被清掉。
- 設定存在瀏覽器的 `localStorage`，key 為 `wxl:editor-settings`。重新整理仍在，而且所有題目共用同一份，不是每題各存一份。
- 按 `Escape` 會關閉面板，點面板與齒輪以外的地方也會關閉。

## 草稿與執行紀錄

### 草稿

編輯器內容會自動存成草稿。重新打開同一題時載入的是草稿，而不是起始範例。草稿是每題各存一份，以題目 slug 為鍵，所以換到另一題不會看到上一題的程式碼。

還沒有草稿時，編輯器裡是一段起始範例：兩行註解加上 `print("Hello, wxlsh!")`。

空的編輯器也是一筆草稿。把編輯器清空之後再回來，看到的是空編輯器，不會回到起始範例。

草稿在你停止輸入一小段時間後才寫入；離開頁面時會把還沒寫的那一次立刻補寫，所以剛打完就離開不會掉字。

### History

工具列右側的下拉選單收合時顯示 `History…`，展開後是這一題過去每次執行的紀錄。

| 項目 | 行為 |
|---|---|
| 沒有紀錄時 | 這一題還沒有任何執行紀錄之前，下拉選單是停用的。 |
| 標籤格式 | `時:分:秒 · 程式第一行的摘要`；該次執行有錯誤時前面加上 `⚠ `。 |
| 摘要長度 | 最長 40 個字元，超過的第一行會被截到 39 個字元再接上 `…`。 |
| 排序 | 新的在最上面，不是舊的在上面。 |
| 哪些會被記錄 | 每一次執行都會，包含被中斷的與出錯的。 |

選一筆紀錄會**整份**取代編輯器目前的內容，游標回到第一個字，而且沒有確認對話框。這個取代動作是一次普通的編輯，所以按 `Ctrl+Z` 就能還原回原本的內容。

選完之後下拉選單會自動跳回 `History…`，因此同一筆紀錄可以連續選兩次。

## 可用模組

面板的 Pyodide 帶著 CPython 標準函式庫。自動完成清單列的是平台預期你會用到的模組，而且有一個 site smoke 測試會在面板真正的執行環境裡逐一 import 它們，所以下面這份清單是被拿去對照過環境的：

`requests`、`os`、`json`、`base64`、`urllib`、`re`、`hashlib`、`hmac`、`binascii`、`itertools`、`string`、`time`、`math`、`collections`、`functools`

這份清單不代表兩件事：

- 題目在 frontmatter 宣告的套件只會裝進題目自己的 runtime。Code 面板那份 Pyodide 只安裝 `micropip` 與 `requests`，題目用到的套件在這裡 import 不到。
- 面板的 Pyodide 是第二份獨立實例，有自己的虛擬檔案系統，與題目那一份不共用。在這個面板用 Python 讀檔碰不到題目的資料。

### 自己安裝第三方套件

面板的環境已經載入 `micropip`，需要的純 Python 套件可以自己裝：

```python
import micropip
await micropip.install("some-pure-python-package")
```

含編譯擴充的套件無法用這個方式安裝。

## requests

`requests` 是用 `micropip` 裝進來的原版上游函式庫，不是自己寫的簡化版。平台換掉的是傳輸層的一個函式 `requests.adapters.HTTPAdapter.send`，讓請求改走平台的 dispatch bridge 送到題目應用程式。傳輸層以上的部分——`Session`、`Request`、重導處理、cookie jar 抽取——都還是函式庫自己的程式碼，所以 `get`、`post`、`put`、`delete`、`Session`、auth 輔助函式等等的行為與上游文件一致。

呼叫是同步的。底層的橋接雖然是非同步的，但你不需要 `await`。

從這個面板送出的每一個請求都會被記進流量記錄，可以在 Network 面板和其他面板的流量一起看到。

### 主機名稱會被忽略

只有你傳入的網址的 path 與 query string 會被使用，主機名稱一律被丟掉。不管填哪個網域，請求都會送到本題的應用程式，從這裡連不到真正的外部網站。

```python
import requests

# 下面兩行是同一個請求。
requests.get("http://target.local/api/items?page=2")
requests.get("http://anything-at-all/api/items?page=2")
```

### 送出請求

```python
import requests

# 帶查詢字串的 GET
r = requests.get("http://target.local/api/items", params={"page": "2"})
print(r.status_code)
print(r.url)      # 你傳進去的網址，params 已接上——不是請求實際送達的位址
print(r.text)

# 帶自訂標頭的 GET
r = requests.get("http://target.local/api/profile", headers={"X-Requested-With": "XMLHttpRequest"})
print(r.status_code, len(r.text))

# 表單 POST（application/x-www-form-urlencoded）
r = requests.post("http://target.local/api/session", data={"username": "alice", "password": "hunter2"})
print(r.status_code)

# JSON POST（application/json）
r = requests.post("http://target.local/api/items", json={"name": "widget", "qty": 3})
print(r.json())
```

### 回應物件

| 屬性 | 型態 | 說明 |
|---|---|---|
| `.status_code` | `int` | HTTP 狀態碼 |
| `.text` | `str` | 回應本體，一律以 UTF-8 解碼 |
| `.content` | `bytes` | 回應本體的位元組 |
| `.json()` | `dict` / `list` | 把回應本體解析為 JSON |
| `.headers` | mapping | 回應標頭 |
| `.url` | `str` | 你傳進去的網址（含被忽略的主機名稱），不是請求實際送達的位址 |
| `.request` | request 物件 | 產生這個回應的那個請求 |
| `.raw` | 替身物件 | 存在，但只是最小替身，見下 |

`.raw` 存在的唯一目的是攜帶 `Set-Cookie` 標頭。它的 `read()` 一律回傳空 bytes，而且沒有 `stream()`，所以任何走 raw 或串流的讀法——`stream=True`、`iter_content()`——都會讀到空的。請從 `.text` 或 `.content` 取回應本體。

### 會被收下但不生效的參數

`timeout`、`verify`、`proxies`、`stream`、`cert` 這幾個參數會被呼叫收下，然後完全不使用。設了也沒有任何效果。

### Cookie

回應的 `Set-Cookie` 標頭會被掛到回應物件上，所以用 `requests.Session()` 發請求時，登入 cookie 會進到 session 的 cookie jar，後續請求不必你動手就會自動帶上：

```python
import requests

s = requests.Session()
s.post("http://target.local/api/session", data={"username": "alice", "password": "hunter2"})

# session cookie 已經在 jar 裡，會跟著這個請求送出。
print(s.get("http://target.local/api/profile").text)
```

當一個回應帶了**多個** `Set-Cookie` 標頭時，`response.headers['set-cookie']` 看到的是它們用 `, ` 串成的單一字串。那個字串切不回原本的多個 cookie，因為 cookie 的 `Expires` 屬性本身就含逗號。要逐個處理 cookie，請改讀 `session.cookies` 而不是讀標頭。

Browser 面板有另一份自己的 cookie jar，而它解不開 Python 或 PHP 題目設定 cookie 時所用的搬運格式：存進去的是一段無意義的字串。那段字串照樣會被送出，也看得到在流量記錄的請求標頭裡，但題目那一端認不得它，所以在那裡登入之後狀態不會延續，而且不會有任何錯誤訊息。細節寫在[疑難排解](./troubleshooting)。

### 橋接層的錯誤

| 你會拿到什麼 | 何時 |
|---|---|
| `ConnectionError`，訊息以 `WXL dispatch bridge error:` 開頭 | 橋接本身失敗。這是例外，不是回應。 |
| 狀態碼 `502`、內容 `{"error": "the challenge runtime could not be reached"}` 的回應 | 題目 runtime 完全連不上。這是一個正常的回應物件，`try`／`except` 接不到它。 |
| 狀態碼 `508`、內容 `{"error": "challenge runtime execution exceeded the time limit"}` 的回應 | 題目應用程式處理單一請求超過十秒。這個上限只管題目端，不管你在這個面板裡的程式。 |

若某個過久的請求害得題目 runtime 被重建，面板上方會出現橫幅，說明 runtime 已被重啟、本題的登入狀態與上傳的檔案都不見了。

## 已知限制

第一次遇到會讓人意外的行為——Stop 之後 Run 遲遲不能按、被中斷的執行仍保留輸出、開第二個分頁會讓工具資料庫開不了、第一次造訪要下載 Python 環境——集中寫在一頁：[疑難排解](./troubleshooting)。
