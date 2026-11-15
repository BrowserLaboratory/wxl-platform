# 紅隊軸（R）審查報告：epic 0010-primary-locale-layout，round 1

審查版本：spec.en.md blob f45f0780…、traceability.md blob 5d3c16ce…、working-tree GLOSSARY.md blob b3073350…；HEAD 65de8c0。我讀的是 working tree 裡的這兩份檔案和 frozen prompt。traceability.md 有 444KB，我照紅隊需要分段讀了這些部分：Decisions D1–D121、U-§1/§4/§5、Y-§2.1–2.5、S-§4.4–4.7、Trust boundaries 全節、S36–S51/S73/S74、A14–A18、S59–S61，以及 Stage 8 的 F-1/F-2 與 V-S 列。程式碼部分查了 `scripts/pre-commit.sh`、`.gitignore`、`package.json`、`scripts/templates/deploy.yml.template`、`create-wxl/src/text.mjs`。

---

### R-1｜S61 開放重新導向閘門列的惡意路徑不完整
- 位置：traceability.md:2101（S61）、:162（D118）、:1703（TB-S1）；spec.en.md:346（TB5）、:709–715（AC-58）
- 違反的要求：TB5／TB-S1 把 `/zh-TW/*  /:splat  302` 的同源安全全部押在 S61 這一道閘門上，而它是「唯一會擋 ticket 的閘門」。
- 證據（直接讀到）：S61 只測五個輸入：`//evil.example`、`//evil.example/x`、`%2F%2Fevil.example`、`%5Cevil.example`、raw `\evil.example`。（推論）漏測的有：
  - `/zh-TW/%09/evil.example`、`%0D`／`%0A`：WHATWG URL parser 會刪掉 tab 和換行，如果 Cloudflare 把 splat 解碼後寫進 `Location`，`/\t/evil.example` 會變成 `//evil.example`。
  - 單一編碼加一個斜線：`/zh-TW/%2F/evil.example`，解碼後是 `///evil.example`，special scheme 下也會離站。
  - 小寫 `%2f%2f`、`%5C%5C`，以及混合形式 `/%5C/`、`/\/`。
  - 雙重編碼 `%252F%252F`。
- 影響：Cloudflare 對這些輸入的正規化行為若和已測的五個不同，S61 會通過，但線上仍存在 protocol-relative 離站導向，等於在教師網域上開了 phishing 跳板。每個 zh-TW 主語系的 Cloudflare 靶場都會帶這條規則。
- 信心：中
- 等級：P1
- 建議：S61 的輸入補上上列各式，驗證方法維持 `new URL(location, previewOrigin).origin` 不變。

### R-2｜S61 只在 stage 8 驗一次，之後沒有回歸偵測
- 位置：traceability.md:2101、:104（D60）；spec.en.md:346
- 違反的要求：TB5 寫的是「Cloudflare's own behaviour beyond what S60 and S61 observe」不在模型內。但這條規則會無限期留在 upstream 和所有後續靶場的 `_redirects` 裡。
- 證據：S61 是 stage 8 的單次觀察；沒有任何列要求之後重測，也沒有任何列要求在 README 記下這個依賴。
- 影響：Cloudflare 日後改了路徑正規化，開放重新導向會悄悄出現，而且沒人會發現。
- 信心：中
- 等級：P2
- 建議：把「依賴 Cloudflare 正規化」寫進 README 或 OQ，或排一個定期重驗的項目。

### R-3｜沒有舊網址的新 zh-TW 主語系靶場也被寫入 splat 規則
- 位置：traceability.md:104（D60）、:1126（K3）；spec.en.md:292–294
- 違反的要求：R22 的目的是處理 upstream 已經發出去的 `/zh-TW/…` 舊網址。
- 證據：D60 的條件只看 `P = zh-TW`。從這個 release 到 epic 0011 之前，create-wxl 建的每個新靶場都預設 zh-TW，而且 `pnpm build` 一定會跑 `redirects:generate`（package.json:30）。所以這些從來沒有 `/zh-TW/` 舊網址的靶場，部署到 Cloudflare 時也會帶上這條規則。
- 影響：攻擊面擴散到沒有需要的靶場（推論：這是意外，不是設計目的）。
- 信心：高
- 等級：P2
- 建議：記錄成已接受的意外後果，或只在 upstream／從舊版面升級上來的靶場產生這條規則（這要改 D60，請使用者裁示）。

### R-4｜hook 內的驗證和產生器讀的是不同的 `range.json`
- 位置：traceability.md:111（D67）、:165（D121）、:2067（S42）；spec.en.md:298–302、:552–562（AC-31）
- 違反的要求：D121 和 AC-31 規定「這次 commit 自己 stage 的 fault 由驗證以 0007 O3 擋下，不出 W6 行」，S42 規定 `range.json` 只有 unstaged 修改時「Index wins」並以 0007 O2 結束。
- 證據：產生器的 `--staged` 讀 index 的 `range.json`（D67）。hook 的 stash 只涵蓋 `platform/`，`range.json` 不在裡面。驗證走 `challenge-lint-staged` → `validateChallenge`，經 `readPrimaryLocale` 讀的是 working tree 的檔案（D113、Y37）。spec 沒有任何一處規定 hook 裡的驗證改讀 index 的 `range.json`（我 grep 過，沒有符合的段落）。
- 影響（推論）：
  - index 是 en、working tree 是 zh-TW，且 staged 的題目只有英文說明頁：驗證以 VM10 誤擋，結果是 O3，和 S42 預期的 O2 矛盾。
  - 反過來，index 是 zh-TW、working tree 是 en：驗證放行，改由產生器以 W6a 擋，違反 AC-31「staged fault 只出驗證訊息、不出 W6」。
- 信心：中高
- 等級：P1
- 建議：規定 hook 傳給驗證的 `P` 來自 index（例如由 hook 讀出後以參數傳入），並在 S42 補上 staged 題目缺某一邊說明頁的情況。

### R-5｜`/<P>/<T>/x`、`/<P>/<P>/x` 在 Cloudflare 和 GitHub Pages 結果不同，而且 Cloudflare 那邊會寫入偏好
- 位置：traceability.md:72（D28）、:73（D29）、:1906（A17）；spec.en.md:251–259
- 違反的要求：D28 和 A17 規定這兩種雙重前綴「find nothing」，最後到 not-found 頁；D29 只把 `/<P>/X` 列為可接受的主機差異。
- 證據（推論）：在 Cloudflare 上 splat 先回應：`/zh-TW/en/x` → 302 `/en/x`，冷載入已發布的翻譯頁 → 寫入 `en`（D26）；`/zh-TW/zh-TW/x` → `/zh-TW/x` → `/x`。GitHub Pages 則顯示 not-found 頁。
- 影響：同一條連結在兩種主機上的落點和偏好寫入都不同，spec 沒有記載。（權限上沒有擴大，因為直接連 `/en/x` 本來就會寫入。）
- 信心：高
- 等級：P2
- 建議：在 D29 加註這兩種輸入的差異並明示接受，或在 S60 記錄 Cloudflare 的觀察結果。

### R-6｜hook 的 glob 比「每個語系資料夾」範圍更大
- 位置：traceability.md:109（D65）、:1583、:2060（S36）；spec.en.md:301、:552（AC-31「and on nothing else」）；scripts/pre-commit.sh:90、:402；.gitignore:76
- 違反的要求：AC-31 規定 hook 只對語系資料夾的題目路徑、`_redirects`、`range.json` 觸發，其他一律不觸發。
- 證據：
  - `:(glob)platform/*/challenge/**` 也會符合 `platform/public/challenge/**`，那是 `runtime.wasm` 所在的目錄。
  - S36 自己寫的是「any `platform/<x>/challenge/`」，和 AC-31 互相矛盾。
  - D65 讓未追蹤目錄清單也用同一個 glob。W4b 以 `LOCALE_ENGLISH_NAMES[L]` 填 `<L-name>`，當 `L` 是 `public`，或是 `constructor` 這類原型鍵時，結果會是 `undefined` 或函式字串（推論）。
  - 實際影響有限：`**/*.wasm` 已被 ignore（.gitignore:76）。但教師在 `platform/public/challenge/<slug>/` 放其他檔案時仍會觸發。
- 影響：多出不該有的觸發，W4 文字也可能錯誤；已在 index 裡的 brief fault 會連帶擋下不相關的 commit。
- 信心：中
- 等級：P2
- 建議：pathspec 改成依語系清單展開，或由 Node 端過濾 `L ∈ LOCALES`；同時讓 S36 和 AC-31 的寫法一致。

### R-7｜transform 讀已追蹤的 symlink 頁面時，讀取發生在 RC1 拒絕之前
- 位置：traceability.md:1258–1261（`files` 的來源）、:1356（8a 順序）、:1362、:1390（RC1）
- 違反的要求：TB11 規定搬家「never through a symbolic link」，而且停止時什麼都不寫。
- 證據：Discovery 會把「`git ls-files` 裡是 page 的條目」都算進去，包括 mode 120000 的 `.md`。8a 先「run 0010-S45 on the teacher's files (read from disk by path)」，之後才跑 RC1。依路徑讀檔會跟隨 symlink。
- 影響（推論）：經由 merge 進來的 PR，可以放一個 `platform/guide/x.md -> /dev/zero`（或指向 FIFO、大檔）的 symlink，讓 `range:upgrade` 卡住或耗盡記憶體；也可能把 repo 外的檔案讀進記憶體（最後雖然被 RC1 擋下，不會寫出）。
- 信心：中
- 等級：P2
- 建議：規定在讀取前以 `lstat`／index mode 排除非一般檔案，或直接從 index（`git cat-file`）讀內容，並補一列 symlink 頁面的測試。

### R-8｜`challenge.yaml` 的開放側讓 VitePress 頁面鍵生效於所有語系頁
- 位置：traceability.md:118（D74）、:449（Y-§2.2「any other key … passed through into the assembled frontmatter」）、:1715；spec.en.md:343（TB2）
- 違反的要求：D74 封閉 brief 側的理由正是排除 `outline`、`head` 這類頁面鍵。TB2 只寫了「ships the declaration once per locale page」。
- 證據：未知鍵會原樣併進 frontmatter，所以 `head`（注入 `<script>`）、`navbar`、`sidebar`、`pageClass` 等鍵會在每個語系的題目頁上被 VitePress 執行。Y106 只檢查值是否等於 flag。
- 影響：一個看起來像「資料」的宣告檔，可以對所有語系注入頁面行為。信任族群和以前相同（能 commit 的人），但影響範圍從單一語系變成全部語系，而且 TB2 沒有記載。
- 信心：中
- 等級：P2
- 建議：在 TB2 明列這一點，或在 build 端對 VitePress 頁面鍵設 denylist、出 PL 錯誤（需檢查和 D74 的相容性）。

### R-9｜組裝 frontmatter 時，`__proto__`／`constructor` 鍵的處理沒有釘死
- 位置：traceability.md:122（D78「brief ∪ declaration」）；spec.en.md:368–370（AC-1 只對 `range.json` 釘了 `__proto__`）
- 違反的要求：TB2 的「frontmatter 原樣出貨」。
- 證據（推論）：`yaml` 會把 `__proto__` 存成 own property。如果組裝用 `Object.assign`，就會改掉結果物件的原型，導致 SSR 讀到繼承值而 `JSON.stringify` 出貨時丟掉，造成 hydration 不一致。loader 的欄位合併也有同樣問題。
- 信心：低
- 等級：P2
- 建議：在 Y38–Y48 加一列：`challenge.yaml` 帶 `__proto__` 時，組裝結果是 own property 而且原型不變。

### R-10｜D105 可能讓手動搬好的 zh-TW 靶場根語言被翻成 en
- 位置：traceability.md:149（D105「changes no root language it serves」）、:142（D98／U146）；spec.en.md:330–331、:654–659（AC-49）
- 違反的要求：D105 的目的是「so its root does not change language」。
- 證據（推論）：情境是一個 B 為舊版面的靶場，教師已經依 README 手動搬家，但刻意不寫 key，靠預設值 zh-TW 部署。之後因為失誤或 merge 進來的 PR，多了一個舊版面頁面，於是建置失敗。下一次跨版升級時，這個靶場「被搬」，`en` 會被寫入，根語言就從上次部署的 zh-TW 變成 en。D105 說它「changes no root language」，只成立在建置失敗的那一刻。
- 影響：根語言被悄悄翻轉。R6 會印一行提示，但沒有警示。
- 信心：中
- 等級：P2
- 建議：限定在「teacher 的樹沒有任何 `platform/<L>/` 語系頁」時才寫 `en`；或對這種情況加一個 attention code。

### R-11｜訊息跳脫標準不一致：`JSON.stringify` 沒有跳脫 DEL、C1、bidi 字元
- 位置：spec.en.md:342–343（TB1、TB2「JSON-quoted」）；traceability.md:636、:1666（B-T1）、:1141（W6d 和 PL-E08 共用 builder）；create-wxl/src/text.mjs:41–56
- 違反的要求：TB1／TB2 宣稱名稱「reach only error messages, quoted」，隱含已經跳脫。
- 證據（直接讀到）：create-wxl 的 `jsonValue` 和 `escapeChar` 會另外跳脫 `JSON.stringify` 留下的 DEL 和 C1 字元；站台端 PL-E07–PL-E09 的路徑清單，以及 W6d，用的只是 `JSON.stringify`。
- 影響：PR 帶進來的目錄名稱可以把 U+009B（CSI）或 bidi override 字元送進教師終端機或 CI log，造成顯示偽造或終端控制序列。
- 信心：中
- 等級：P2
- 建議：站台端共用一個等同 `jsonValue` 的跳脫函式。

### R-12｜搬家會讓 `platform/smoke-fixtures/` 底下的教師頁面在正式站悄悄消失
- 位置：traceability.md:93（D49「a teacher's page placed there is never published」）、:1219（destination 規則）、:1454（R6）
- 違反的要求：User Story 7「nothing I wrote is stranded or silently lost」。
- 證據（推論）：舊版面的 `platform/smoke-fixtures/x.md` 會被搬到 `platform/en/smoke-fixtures/x.md`，正式建置把它排除；R6 只列出搬移，不會警告。
- 信心：低（這種情境很少見）
- 等級：P2
- 建議：搬家時目的地落在保留資料夾，就出一個 attention code，或在 README 的搬家段落點名這件事。

### R-13｜Cloudflare 上 splat 可能遮蔽 `/zh-TW/` 底下的靜態檔
- 位置：traceability.md:104、:2100（S60）；spec.en.md:346
- 證據（推論，未驗證）：如果 Cloudflare Pages 的 redirect 優先於靜態檔，`platform/public/zh-TW/…` 這類檔案在 zh-TW 主語系靶場上會被 302 導走。S60 沒有測任何資產路徑。
- 信心：低
- 等級：P2
- 建議：在 S60 加測一個 `public/zh-TW/` 資產，記錄結果。

### R-14｜首頁連結對 protocol-relative `//host` 的分類沒有定義
- 位置：traceability.md:57（D13「a scheme such as `https:` or `mailto:`」）；spec.en.md:343（TB2「build adds no open-redirect-like link」）
- 證據（推論）：`//evil.example` 沒有 scheme。實作如果沿用 VitePress 的 `EXTERNAL_URL_RE`，會把它當外部連結、不檢查；如果把它當站內絕對路徑，就會檢查並出 PL-E12。spec 兩種都沒排除。
- 影響：TB2 的保證取決於實作怎麼選。（`https://` 外部連結本來就允許，所以危害有限。）
- 信心：低
- 等級：P2
- 建議：明定 `//` 開頭的連結出 PL-E12。

### R-15｜`/zh/c/:slug`、`/<L>/c/:slug` 會遮蔽主語系資料夾裡 `zh/c/` 底下的頁面
- 位置：traceability.md:114（D70）、:653（PL-E09 只看語系清單）；spec.en.md:787（B-O8 只涵蓋語系資料夾的 `c/`）
- 證據（推論）：在 P = zh-TW 時，`platform/zh-TW/zh/c/x.md` 的網址是 `/zh/c/x`，會被 slug 規則攔走。`zh` 不在語系清單上，PL-E09 不會觸發。
- 信心：中
- 等級：P2
- 建議：把 B-O8 擴大到 `zh/`，或讓 PL-E09 把 `zh` 一併視為保留名稱。

### R-16｜PL-E07 沒有涵蓋 `src` 目錄本身和 `public/` 底下的 symlink
- 位置：spec.en.md:385–388（AC-3）、:342（TB1「a symbolic link is not followed」）；traceability.md:1212（excluded areas）
- 證據（推論）：`src/**` 和 `public/**` 都屬於 excluded area。如果 `platform/challenge/<slug>/src` 本身就是指向 repo 外的 symlink，keygen 會把對方內容打包進公開的 `runtime.wasm`；Vite 複製 `public/` 時也可能跟隨 symlink。這是既有行為，不是本 epic 新增的，但 TB1 的措辭可能被理解成已經涵蓋。
- 信心：低
- 等級：P2
- 建議：在 TB 表的 Does-not-protect 欄寫明這一點，或讓 PL-E07 也檢查 `src` 和 `public` 這兩個入口本身。

---

### 檢查過、判定為預期後果、不列為 finding 的項目
- TB7／TA2：在 P = zh-TW 時，任何連結都能設定 `en`，GitHub Pages 同一個 owner 底下的靶場共用偏好（OQ-018），`--rebrand` 會改 key。
- D29：舊網址在兩種主機上的落點不同。
- D30：`/<P>/c/NNN` 會依偏好導向。
- TB9：`WXL_SMOKE_PAGES` 的完整性風險。
- TB10／B1：惡意的 `--from <commit>` base。
- B3：錯誤的 `upstream` 或 `--from` 會影響是否寫入 `en`。
- A18 的客戶端前綴剝除和 crafted 路徑拒絕。
- RC1–RC6 涵蓋大小寫不分檔案系統下的 `platform/EN` 祖先別名、ignored 檔案、gitlink、目的地已存在；SC1–SC6 涵蓋跨 group 的 anchor 和 alias。
- `range.json` 的 FIFO、symlink、index mode 120000／160000 處理（D114、S43）。
- `__WXL_PRIMARY_LOCALE__` 只在通過清單驗證後才 define。
- `range.json` 的 `__proto__` 和 append 寫入。
- `primaryLocale` 改變時的 W6a 拒絕（S74）。

Count：P0 0、P1 2（R-1、R-4）、P2 14。
