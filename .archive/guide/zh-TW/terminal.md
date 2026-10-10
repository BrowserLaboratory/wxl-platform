# Terminal 終端機工具

## Terminal 介面說明

Terminal 面板提供一個在瀏覽器內執行的指令列環境，使用平台自訂的 **wxlsh** shell。wxlsh 內建了資安測試常用的工具指令，包含編碼轉換、雜湊、文字處理與 HTTP 請求。

介面區域說明：

| 區域 | 說明 |
|---|---|
| 輸出區 | 顯示指令執行結果與系統訊息，並保留 scrollback 緩衝區，可往上捲動回看先前的輸出 |
| 輸入列 | 輸入指令的區域，支援歷史紀錄瀏覽 |
| 提示字元 | `hacker@wxlsh:~$ ` 表示 shell 就緒，路徑區段會反映目前的工作目錄 |

Scrollback 緩衝區保留最近 1000 行；更早的輸出會隨著新行進來而被丟棄。執行 `clear`（或按 `Ctrl + L`）會清空它，從空白畫面重新開始。

面板啟動時會先印出一段 banner：

```
wxlsh 1.0 — web exploit shell
type 'help' for available commands
```

## 指令分層

wxlsh 將指令分為數層。第 5 層是預留給滲透測試工具的命名空間，目前尚未實作——詳見下方的第 5 層章節。

Terminal 是逐題授予的：只有當出題者把 `terminal` 列入該挑戰的工具清單時才會出現，因此看不到 Terminal 分頁是預期行為，不是故障。分頁存在時，第 1 到第 4 層全部可用。

這個 shell 沒有檔案系統層，`ls`、`cat`、`head`、`tail`、`cp`、`mv`、`rm` 等指令刻意不提供。執行其中任何一個，都會把指令名稱回印出來並提示可用 `help`：

```
hacker@wxlsh:~$ cat /etc/passwd
wxlsh: command not found: cat
Type 'help' for available commands.
```

> **引號與 flag**：parser 會讓短 flag 吃掉緊接在後的那個 token，因此 `-d ZmxhZ3s…` 會把待解碼的內容存成該 flag 的值，不留下任何 positional 參數。被引號包住的 token 則永遠不會被當成 flag。凡是會受此影響之處，下方語法一律列出實際可行的形式。

### 第 1 層 — Shell

| 指令 | 語法 | 說明 |
|---|---|---|
| `help` | `help [command]` | 列出可用指令，或顯示單一指令的詳細用法 |
| `clear` | `clear` | 清除終端機畫面 |
| `echo` | `echo [text ...]` | 印出參數，以空白分隔 |
| `pwd` | `pwd` | 印出目前的工作目錄 |
| `cd` | `cd [directory]` | 切換目錄；`cd` 與 `cd ~` 都會回到 `/home/hacker` |
| `whoami` | `whoami` | 印出目前的使用者名稱 |
| `id` | `id` | 印出 uid、gid 與所屬群組 |
| `env` | `env` | 以 `KEY=VALUE` 格式印出環境變數 |
| `export` | `export KEY=VALUE [...]` | 設定一個或多個環境變數 |
| `history` | `history` | 印出先前執行過的指令 |
| `date` | `date` | 以 Linux 格式印出目前日期時間 |
| `which` | `which <command>` | 印出指令的路徑，或回報找不到 |

### 第 2 層 — 文字處理

| 指令 | 語法 | 常用 flag |
|---|---|---|
| `grep` | `grep [options] <pattern> <text>` | `-i` 忽略大小寫、`-v` 反向、`-c` 計數、`-n` 加行號 |
| `sed` | `sed <expression> <text>` | 例如 `sed "s/old/new/g"` |
| `awk` | `awk <program> <text>` | 例如 `awk "{print $1}"` |
| `sort` | `sort [options] [text]` | `-r` 反序、`-n` 數值排序、`-u` 去重 |
| `uniq` | `uniq [options] [text]` | `-c` 加上出現次數、`-d` 只印重複行 |
| `cut` | `cut [options] <text>` | `-d <delim>`、`-f <fields>` |
| `tr` | `tr <set1> <set2> <text>` | 逐字元對應，例如 `tr abc ABC`；不支援 `a-z` 這類範圍展開 |
| `tee` | `tee [text]` | 將輸入原樣傳遞到輸出 |
| `xargs` | `xargs [text ...]` | 原樣回傳自己的參數，不會執行任何指令 |
| `diff` | `diff <text1> <text2>` | 逐行比對兩段輸入的差異 |

### 第 3 層 — 編碼與雜湊

| 指令 | 語法 | 說明 |
|---|---|---|
| `base64` | `base64 <text>` / `base64 "-d" <encoded>` | Base64 編碼，加上帶引號的 `"-d"` 為解碼 |
| `hex` | `hex <text>` / `hex "-d" <hex-string>` | 十六進位編碼為空白分隔的位元組，加上帶引號的 `"-d"` 為解碼 |
| `encode` | `encode <base64\|url\|hex> <value>` | 以指定格式編碼；只給一個參數時預設為 base64 |
| `decode` | `decode <base64\|url\|hex> <value>` | 以指定格式解碼；只給一個參數時預設為 base64 |
| `urlencode` | `urlencode <text>` | 將文字做 URL percent-encoding |
| `urldecode` | `urldecode <text>` | 將 percent-encoded 文字解碼 |
| `xxd` | `xxd <text>` | Hex dump，含位移量與 ASCII 欄 |
| `md5sum` | `md5sum <text>` | 計算 MD5 雜湊 |
| `sha256sum` | `sha256sum <text>` | 計算 SHA-256 雜湊 |

若只需要純 hex 而不要 dump 格式，請改用 `hex` 或 `encode hex`，不要用 `xxd`。

### 第 4 層 — 網路

| 指令 | 語法 | 常用 flag |
|---|---|---|
| `curl` | `curl [options] <url>` | `-X <method>`、`-d <data>`、`-H <header>`、`-i`、`-s`、`-L`、`-v`、`-o <file>` |
| `wget` | `wget [options] <url>` | `-O <file>`、`-q` |

### 第 5 層 — 預留但尚未實作

`dirb`、`dirsearch`、`sqlmap`、`jwt`、`hydra`、`nmap` 是預留的指令名稱。它們背後的執行路徑仍是 stub，因此在任何挑戰中都還不能使用。執行後會回報：

```
wxlsh: 'sqlmap' is not available for this challenge.
This command is controlled by the challenge author.
```

需要用到這類工具的題目，請改以第 1 到第 4 層的指令、Code Editor 與 Repeater 完成。

## 指令詳解

### help

依分類列出 wxlsh help registry 中的指令，或顯示單一指令的詳細用法。該 registry 涵蓋第 1 到第 4 層，但漏了 `hex`——因此 `help` 不會列出它，`which hex` 也會回報找不到，儘管該指令實際可以執行。

**語法**

```
help
help <command>
```

**範例**

```
hacker@wxlsh:~$ help
Available commands:

  Shell:
    cd          change directory
    clear       clear the terminal screen
    ...

Type 'help <command>' for detailed usage.
```

---

### clear

清除終端機上既有的輸出，回到空白畫面。`Ctrl + L` 效果相同。

**語法**

```
clear
```

---

### base64

將文字做 Base64 編碼，或傳入帶引號的 `"-d"` 解碼。

**語法**

```
base64 <text>
base64 "-d" <encoded>
```

**範例**

```
hacker@wxlsh:~$ base64 admin:password
YWRtaW46cGFzc3dvcmQ=

hacker@wxlsh:~$ base64 "-d" ZmxhZ3tzZWNyZXR9
flag{secret}
```

> **`-d` 要加引號**：若不加引號，parser 會把待解碼的文字當成該 flag 的值吃掉，指令因此收不到任何輸入，只會印出 usage 而不會解碼。內建 `help` 顯示的是不加引號的形式；上面帶引號的形式才是可用的。另一個不必加引號的替代寫法是 `decode base64 <encoded>`。

---

### hex

將文字做十六進位編碼，或傳入帶引號的 `"-d"` 將 hex 字串解碼。編碼輸出為空白分隔的位元組；解碼時輸入可含或不含空白。

**語法**

```
hex <text>
hex "-d" <hex-string>
```

**範例**

```
hacker@wxlsh:~$ hex hello
68 65 6c 6c 6f

hacker@wxlsh:~$ hex "-d" 666c61677b7368656c6c7d
flag{shell}
```

> 這裡的 `"-d"` 需要加引號，原因與 `base64` 相同。`decode hex <hex-string>` 同樣可行，且不必加引號。

---

### encode

以指定格式編碼：`base64`、`url` 或 `hex`。只給一個參數時格式預設為 base64——要做 percent-encoding 必須明確指定 `url`。

**語法**

```
encode <base64|url|hex> <value>
```

**範例**

```
hacker@wxlsh:~$ encode url "' OR 1=1 --"
%27%20OR%201%3D1%20--

hacker@wxlsh:~$ encode hex admin
61646d696e
```

---

### decode

以指定格式解碼：`base64`、`url` 或 `hex`。與 `encode` 相同，只給一個參數時視為 base64。

**語法**

```
decode <base64|url|hex> <value>
```

**範例**

```
hacker@wxlsh:~$ decode url %66%6c%61%67%7b%74%65%73%74%7d
flag{test}

hacker@wxlsh:~$ decode base64 ZmxhZ3tzZWNyZXR9
flag{secret}
```

---

### curl

對指定 URL 發送 HTTP 請求並印出回應內容。適合用來檢視 API 回應，或探測某個 endpoint 是否存在。

**語法**

```
curl <url>
curl -X <METHOD> <url>
curl -d <body> <url>
curl -H "Header-Name: value" <url>
curl -i <url>
```

支援的 flag 為 `-X`、`-d`、`-H`、`-i`（一併輸出回應標頭）、`-s`（安靜模式）、`-L`（跟隨轉向）、`-v`（verbose）與 `-o <file>`。並沒有 `-I`；要看回應標頭請用 `-i`。

由於這個 shell 沒有檔案系統，`-o`（以及 `wget` 的 `-O`）只會印出一行 `saved to <file>` 並把回應本體丟棄——它的作用是抑制輸出，而不是真的寫出你之後讀得回來的檔案。

**範例**

```
hacker@wxlsh:~$ curl http://target.local/api/status
{
  "status": "ok",
  "version": "1.0"
}

hacker@wxlsh:~$ curl -H "X-Admin: true" http://target.local/admin
403 Forbidden
```

回應的 `content-type` 若為 JSON，內容會先重新排版再印出；其他 content type 則原樣輸出。

---

### md5sum 與 sha256sum

計算指定文字的雜湊值。兩個指令都仿照 coreutils 的輸出格式，因此雜湊值後面會接兩個空白與一個代表檔名的 `-`。要拿雜湊值去比對目標值時，記得先把這段後綴去掉。

**語法**

```
md5sum <text>
sha256sum <text>
```

**範例**

```
hacker@wxlsh:~$ md5sum secret
5ebe2294ecd0e0f08eab7690d2a6ee69  -

hacker@wxlsh:~$ sha256sum secret
2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b  -
```

## Pipe 串接

wxlsh 支援 `|` 運算子，因此編碼、解碼、雜湊等步驟可以串成一行完成。

上游的輸出會被插入為下游指令的**第一個 positional 參數**，而不是接在你輸入的參數後面。因此 pipe 適合用在「第一個參數就是資料本身」的指令上（`md5sum`、`sha256sum`、`base64`、`decode`、`urlencode`、`xxd`、`tee`）。像 `grep <pattern> <text>`、`tr <set1> <set2> <text>` 這種第一個參數是操作元的指令，串接進來的文字會落在操作元的位置而非資料的位置，所以請改用一般參數傳入，不要走 pipe。

**範例**

```
hacker@wxlsh:~$ echo secret | md5sum
5ebe2294ecd0e0f08eab7690d2a6ee69  -

hacker@wxlsh:~$ echo admin | base64 | decode
admin
```

## 指令歷史紀錄

wxlsh 會記錄你執行過的每一個指令，可用方向鍵瀏覽並重複使用。

| 按鍵 | 動作 |
|---|---|
| `↑`（上） | 叫出歷史中的前一個指令 |
| `↓`（下） | 前往歷史中的後一個指令（較新的方向） |

歷史紀錄是寫入 IndexedDB 而非只存在記憶體中，因此重新整理頁面後仍會保留——終端機啟動時會載入最近 200 筆。這份儲存是全站共用而非逐題分開，因此在其他挑戰輸入過的指令，一樣可以用方向鍵叫回來。

連續重複的指令只有在寫入持久化儲存時才會合併。在目前這個 session 內，方向鍵與 `history` 仍會顯示每一次重複，因此連續執行三次的指令會出現三次，直到重新整理為止。

## 鍵盤快速鍵

| 快速鍵 | 動作 |
|---|---|
| `Ctrl + A` | 游標移到輸入列開頭 |
| `Ctrl + E` | 游標移到輸入列結尾 |
| `Ctrl + L` | 清除畫面（等同執行 `clear`） |
| `Ctrl + C` | 中斷目前輸入，清空輸入列並換行 |
