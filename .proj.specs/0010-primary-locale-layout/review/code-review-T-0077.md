# Code review: T-0077 (stage 6)

Review surface: committed layer, base and merge-base `040a5ec6930e9ae98c00fe0b633e6085c23bb6de`, HEAD
`654a370b8398c4475c2ff0abe4ff5b09d79fc6ff`, branch `tickets/T-0077/layout-switch`; 177 changed paths in five
groups, one captured diff per path. The ticket file is excluded (it is the record, not reviewed code).
Reviewers: `harness-reviewer`, read-only, one axis each. Each axis was split by scope because of the size of
the diff: Standards by file group (G1–G5), Spec by requirement area (B, A, L, S, Y, U). Findings are verbatim;
they are not merged or re-ranked across axes. Dispositions are in the ticket's "Stage 6 review" section.

## Standards

### Standards · G1 (45 findings: 0 high, 7 medium, 38 low)

Coverage: 已完整閱讀的 G1-site diff 檔：.vitepress/challenge/config.ts、declaration.ts、plugin.ts、shortLink.ts、slug.ts；.vitepress/config.mts、home-links.ts、locales-config.ts、pageList.ts、primary-folder-links.ts、primary-locale.ts、source-layout.ts；theme/Layout.vue（刪除）、ChallengeList.vue、HomeContent.vue、LocaleSwitcher.vue、MergedNav.vue、MissingTranslationLine.vue、ShortLinkShare.vue、localeSwitcherLabels.ts、useArrivals.ts、i18n/arrival.ts、i18n/index.ts、i18n/lookup.ts、messages/en.json、messages/zh-TW.json、i18n/pages.ts、i18n/primaryLocale.ts、theme/index.ts、layouts/ChallengeLayout.vue；platform/challenge/*/challenge.yaml（四份）、platform/challenges.md、en/challenges.md、zh-TW/challenges.md、四份 en 說明頁、四份 zh-TW 說明頁、en/guide/browser.md、en/guide/index.md、en/guide/notes.md、en/guide/workshop.md、en/index.md、en/reference/attack-log-export-format.md、兩份 smoke fixture、public/_redirects、shared/challenges.data.ts、shared/challenges.zh-TW.data.ts（刪除）、shared/mergeChallenges.ts、zh-TW/guide/index.md、notes.md、python.md、troubleshooting.md、zh-TW/index.md、playwright.site.config.ts、vitest.config.ts。
只抽查的：platform/en/guide/network.md、en/guide/python.md、en/guide/troubleshooting.md（這三份是整檔搬移後顯示為新檔；我以 grep 查語系、宣告、frontmatter 相關句子，並讀了 troubleshooting 第 200-229 行，沒有逐行讀完）。
另外為了判斷上下文，讀了以下 live 檔：config.ts、plugin.ts 前 90 行、declaration.ts 前 25 行、primary-locale.ts 前 66 行、source-layout.ts 前 40 行、locales.ts、i18n/index.ts 前 40 行、ChallengeLayout.vue 第 440-489 行，以及 spec.en.md 的相關段落與 ticket 第 44-59、500-519 行。
沒有讀到的：G2～G5 群組（不屬於本軸分配範圍）。

Missing context: MANIFEST 沒有列出舊路徑的刪除（例如 platform/index.md、platform/guide/*.md、platform/challenge/<slug>/index.md、platform/reference/attack-log-export-format.md、platform/smoke-fixtures/*），en/ 底下的頁面又都以 new file 呈現、沒有 rename 偵測。因此英文頁面搬移時內容有沒有被改（連結改寫、句子修訂）我無法從 diff 判斷；需要 `git diff -M` 的 rename 對照，或舊路徑刪除的 diff 檔。; .vitepress/wasm/virtual-fs/virtual_fs.js 是建置產物，checkout 裡沒有，所以 STD-G1-18（wasm_fs_list 檢查永遠為假）是依 wasm-bindgen glue 的一般產出推論，沒有直接驗證。; deferred-p2-by-segment.json 沒有讀；部分發現（例如 STD-G1-30、STD-G1-31、STD-G1-34）可能已在 stage 5 延後清單中，要請 parent 對照去重。; 沒有找到明文禁止在出貨程式碼註解中寫 ticket、計畫或波次用語的 repository 規則，所以 STD-G1-07～STD-G1-11 歸為 smell，不是 standard-breach。若有這條規則，請提供其所在檔案。

#### STD-G1-01 · medium · confidence high · smell

- Where: `.vitepress/challenge/declaration.ts:68`
- Requirement: 同檔 declaration.ts:11 的契約註解「`reason` is `'absent'` (ENOENT)」；審查重點：吞掉錯誤的錯誤處理
- Summary: readFileSync 的 catch 不分錯誤碼一律回傳 reason 'absent'，EACCES、EISDIR、EMFILE 等讀取失敗都會被報成「沒有 challenge.yaml」
- Evidence:   try {
    src = readFileSync(path, 'utf8')
  } catch {
    return { ok: false, reason: 'absent', path }
  }
對照 .vitepress/primary-locale.ts:53 只有 `code === 'ENOENT'` 才當作不存在，其餘拋 PL-E02
- Impact: 權限錯誤或把 challenge.yaml 誤建成資料夾時，建置會報 PL-E13「no platform/challenge/<slug>/challenge.yaml for this brief」，把老師引向錯誤的修法；真正的錯誤碼也就此遺失
- Suggested fix: 只在 err.code === 'ENOENT' 時回傳 'absent'，其他錯誤改回傳 'invalid-yaml' 以外的新 reason，或直接拋出帶錯誤碼的 SiteLayoutError（比照 primary-locale.ts 的 pl02）

#### STD-G1-02 · medium · confidence high · smell

- Where: `platform/shared/challenges.data.ts:50`
- Requirement: 審查重點：YAML 解析錯誤被當成 {} 回傳（吞掉錯誤）
- Summary: frontmatterOf 遇到 YAML 解析例外或非 mapping 的前置資料一律回傳 {}，清單 loader 因此把壞掉的說明頁靜默顯示成預設標題
- Evidence:   try {
    const value: unknown = parse(match[1], { schema: 'core' })
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
- Impact: 說明頁前置資料寫壞時，題目清單與首頁顯示 default_title（「網站攻防挑戰」）而不報錯；pnpm dev 下 HMR 重新載入清單時更不會有任何訊息。錯誤要等頁面建置的其他路徑才可能浮現，與 declaration 讀取失敗會拋 PL-E13/PL-E14 的行為不一致
- Suggested fix: 解析失敗時拋出帶說明頁路徑的錯誤（可沿用 SiteLayoutError），或至少回傳可辨識的失敗結果讓 mergeLocaleChallenges 決定報錯

#### STD-G1-03 · medium · confidence medium · standard-breach

- Where: `.vitepress/theme/i18n/index.ts:16`
- Requirement: .vitepress/locales.ts:1-3「The locale list module (D4, D115): the one, import-free enumeration of locales」；審查重點：locales.ts 以外的語系列舉、寫死 zh-TW/en
- Summary: otherLocale 仍以寫死的 'zh-TW'/'en' 二選一實作，註解還寫著「The primary-locale epic replaces this with a locale list」，而本 change 就是那個 epic，卻反而把它擴散到更多呼叫點
- Evidence: /** The other of the two locales. The primary-locale epic replaces this with a locale list. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'zh-TW' ? 'en' : 'zh-TW'
}
新增呼叫：useArrivals.ts:102、:193（persistLocale(otherLocale(P))）、arrival.ts requestedLocaleForPageArrival、lookup.ts:41、index.ts detectLocaleFromPath/localizePath/pageLocaleOf
- Impact: LocaleSwitcher 已依 D34 改成走 LOCALES，但路由判斷仍依賴二元假設；語系清單一旦加入第三個語系，到站判斷、冷載入寫入的語系偏好會靜默算錯，且過期的註解讓讀者以為已處理
- Suggested fix: 若 spec 刻意保留二元實作，至少把註解改成現況並指向後續 ticket；否則改為從 LOCALES 推導，並讓非二元情況明確失敗

#### STD-G1-12 · medium · confidence high · smell

- Where: `.vitepress/challenge/config.ts:15`
- Requirement: 審查重點：版面切換留下的死碼
- Summary: `fs` 已加進 LEGACY_FIELDS（第 3 行），ChallengeLayout 也不再讀 fm.fs，但 ChallengeDeclaration 仍宣告 `fs?` 並在 validateChallengeDeclaration 回傳它
- Evidence: config.ts:3 `export const LEGACY_FIELDS = ['fs', 'fs_key', ...]`
config.ts:14-15 `/** @deprecated Use src/ auto-scan instead. Kept for backward compatibility during migration. */ fs?: Record<string, string>`
config.ts:145 `fs: obj.fs as Record<string, string> | undefined,`
- Impact: 同一欄位一邊被列為「應移除的舊欄位」，一邊仍是宣告型別的正式成員；「Kept for backward compatibility during migration」與 ChallengeLayout 已移除 fallback 相矛盾
- Suggested fix: 從 ChallengeDeclaration 與回傳物件移除 fs，並更新 @deprecated 註解

#### STD-G1-18 · medium · confidence medium · smell

- Where: `.vitepress/theme/layouts/ChallengeLayout.vue:481`
- Requirement: 審查重點：版面切換留下的死碼；註解須與行為相符
- Summary: 新增的 `typeof wasm_fs_list !== 'function'` 檢查看的是共用 JS glue `virtual_fs.js` 的 export，不是該題的 runtime.wasm；只要 glue 由現行 crate 建出，這個條件永遠為假，無法偵測「過期的題目模組」
- Evidence:   const { default: initWasm, wasm_fs_init, wasm_fs_read, wasm_fs_list, wasm_verify_flag } = await import(
    '../../wasm/virtual-fs/virtual_fs.js'
  )
  // ... A module without it is stale — ... the page
  // shows its runtime-error state instead of silently reading it.
  if (typeof wasm_fs_list !== 'function') {
- Impact: 註解宣稱的防護（過期模組顯示錯誤）實際上不存在；讀者會以為舊模組已被擋下。本檢查也不讀 wasmBytes，判斷依據與題目無關
- Suggested fix: 確認 wasm-bindgen glue 的 export 是否可能缺少；若不可能，刪除這段死碼與相關註解；若要偵測過期題目模組，需檢查該題 payload 本身（例如 custom section 版本）

#### STD-G1-30 · medium · confidence high · standard-breach

- Where: `platform/en/reference/attack-log-export-format.md:1`
- Requirement: GLOSSARY.md:400 主語系詞條「上游的每一頁在每個語系都有版本」；ADR-0008 第 8 行與 2026-11-15 註記（第 16-18 行）「holds … for upstream's own pages」；spec AC-8「the Traditional Chinese notes page links to `../reference/attack-log-export-format.md`」
- Summary: 上游的匯出格式參考頁只有英文版，沒有主語系（繁中）版本；本分支的詞彙表與 ADR 卻已宣告上游每頁都有每個語系的版本
- Evidence: platform/{en,zh-TW}/**/*.md 中只有 platform/en/reference/attack-log-export-format.md，沒有 platform/zh-TW/reference/。ticket 第 46-58 行記載這要等 T-0080 處理，第 3053 行也已標成 stage 6 要交使用者裁示的事項
- Impact: 在 T-0080 落地前，main 上的詞彙表與 ADR 描述了尚不存在的狀態；繁中學習者在上游沒有可連到的參考頁
- Suggested fix: 由使用者裁示：在 T-0080 前暫時修改 GLOSSARY 該句（例如加上例外），或把 T-0080 的繁中參考頁併進本 ticket

#### STD-G1-33 · medium · confidence medium · incorrect

- Where: `platform/zh-TW/guide/troubleshooting.md:206`
- Requirement: 審查重點：應依主語系處，寫死 zh-TW；GLOSSARY.md:400（上游主語系為繁中、放在根網址）
- Summary: 中英文疑難排解都寫「連結把你帶到 `/zh-TW/` 底下的頁面之後，重新整理那一頁就會記成繁體中文」，但上游主語系是繁中，繁中頁面在根網址，/zh-TW/… 只會被 `/zh-TW/* /:splat` 302 導走，沒有頁面在 /zh-TW/ 底下
- Evidence: zh-TW:206 「所以連結把你帶到 `/zh-TW/` 底下的頁面之後，重新整理那一頁就會記成繁體中文。」
en/guide/troubleshooting.md:206 「So after a link has taken you to a page under `/zh-TW/`, reloading that page sets Traditional Chinese.」
platform/public/_redirects:90 `/zh-TW/*        /:splat                           302`
- Impact: 在上游（與所有預設主語系的靶場）這個例子描述的情境不存在；只有主語系為英文的靶場才成立。學習者照做不會得到描述的結果
- Suggested fix: 改成不依主語系的寫法，例如「被連結帶到網址以語系代碼開頭的頁面後，重新整理那一頁就會記成那個語系」

#### STD-G1-04 · low · confidence high · smell

- Where: `.vitepress/theme/i18n/primaryLocale.ts:14`
- Requirement: 審查重點：應讀主語系預設值之處寫死 'zh-TW'；locales.ts:9 已定義 DEFAULT_PRIMARY_LOCALE
- Summary: 前端 primaryLocale() 的後備值寫死字面量 'zh-TW'，沒有使用 locales.ts 的 DEFAULT_PRIMARY_LOCALE
- Evidence: return typeof __WXL_PRIMARY_LOCALE__ !== 'undefined' ? __WXL_PRIMARY_LOCALE__ : 'zh-TW'
- Impact: Duplicated Code：同一個「沒有設定時的主語系」知識有兩份，日後改預設值只改一處會讓建置端與前端後備值分歧
- Suggested fix: import { DEFAULT_PRIMARY_LOCALE } from '../../locales' 並以它作為後備值

#### STD-G1-05 · low · confidence medium · smell

- Where: `.vitepress/locales-config.ts:22`
- Requirement: Smell baseline：Shotgun Surgery；審查重點：locales.ts 以外的語系列舉
- Summary: 新增一個語系需要同時改多處各自以 en/'zh-TW' 為 key 的表：locales-config.ts LOCALE_CONTENT、localeSwitcherLabels.ts LOCALE_SWITCHER_LABEL_KEYS、mergeChallenges.ts TABLES、i18n/index.ts messages、locales.ts LOCALE_ENGLISH_NAMES
- Evidence: locales-config.ts:22 `const LOCALE_CONTENT: Record<Locale, LocaleContent> = { en: {...}, 'zh-TW': {...} }`
localeSwitcherLabels.ts:9 `en: 'locale_switcher.english_label', 'zh-TW': 'locale_switcher.tw_label'`
mergeChallenges.ts:19 `const TABLES: Record<Locale, ...> = { en, 'zh-TW': zhTW }`
- Impact: Record<Locale,…> 型別雖能讓編譯器抓漏，但語系相關知識散在五個模組，增加語系時改動面大
- Suggested fix: 考慮把每個語系的 label、lang、字串表、選單文案集中到一個 per-locale 描述模組，其他模組由它取用

#### STD-G1-06 · low · confidence high · smell

- Where: `.vitepress/theme/components/localeSwitcherLabels.ts:15`
- Requirement: Smell baseline：Speculative Generality（無法到達的防禦程式碼）
- Summary: LOCALE_SWITCHER_LABEL_KEYS 型別為 Record<Locale, string>，缺項時 TypeScript 已在編譯期報錯，runtime 的 throw 分支到不了
- Evidence: export const LOCALE_SWITCHER_LABEL_KEYS: Record<Locale, string> = {...}
...
  if (!key) {
    throw new Error(`LocaleSwitcher: LOCALES carries "${locale}" with no label key ...`)
- Impact: 註解宣稱「Growing the locale list without adding its entry here is a loud failure (throws)」，實際攔下它的是型別檢查；多出的分支與說法會誤導維護者
- Suggested fix: 刪除 runtime 檢查並把註解改成依賴型別檢查，或若要保留就說明它防的是哪種繞過型別的情況

#### STD-G1-07 · low · confidence high · smell

- Where: `.vitepress/challenge/declaration.ts:10`
- Requirement: 審查重點：出貨程式碼註解中的流程用語（ticket、段落、波次）
- Summary: 出貨模組的註解以 ticket 編號敘述行為來源
- Evidence: // T-0077 (Y2-Y6, Y112): a read or parse failure returns `{ ok: false, reason, path }` instead of
// throwing.
- Impact: 「instead of throwing」是相對於舊版的變更敘述，ticket 落地後就變成歷史資訊；讀者需要翻 ticket 才懂，且 ticket 結案後註解仍留著流程脈絡
- Suggested fix: 改寫成描述現在行為的句子（例如「A read or parse failure returns …」），拿掉 T-0077 與「instead of throwing」

#### STD-G1-08 · low · confidence high · smell

- Where: `.vitepress/challenge/plugin.ts:115`
- Requirement: 審查重點：出貨程式碼註解中的流程用語
- Summary: assembleChallengeFrontmatter 的 doc comment 提到「the plan left open」，把實作計畫的過程寫進出貨程式碼
- Evidence:  * confirmed against both plain objects and the `yaml` parser's own `toJS()` output before
 * choosing this over the alternative the plan left open.
- Impact: 「the plan」指的是本次 ticket 的實作計畫，程式碼讀者無從查找；屬於過程紀錄而非設計理由
- Suggested fix: 保留「spread 不會觸發 __proto__ setter」的技術理由，刪掉「before choosing this over the alternative the plan left open」

#### STD-G1-09 · low · confidence high · smell

- Where: `.vitepress/source-layout.ts:1`
- Requirement: 審查重點：出貨程式碼註解中的流程用語
- Summary: 檔頭註解寫「`checkSourceLayout` is T-0077's」，以 ticket 歸屬描述函式，且 checkSourceLayout 已在同檔實作
- Evidence: // The layout check's page predicate (seam 0010-S2; D116). `checkSourceLayout` is T-0077's;
// `classifySourcePath` is the predicate it is built on, exported here.
- Impact: 這是 T-0076 階段留下的預告句，現在已過期；讀者會以為 checkSourceLayout 在別處
- Suggested fix: 改成描述兩個 export 的關係，例如「`checkSourceLayout` (below) is built on `classifySourcePath`」

#### STD-G1-10 · low · confidence medium · smell

- Where: `playwright.site.config.ts:21`
- Requirement: 審查重點：出貨設定中的流程用語
- Summary: site smoke 設定的註解以「After D108's layout switch」敘述，屬過程脈絡
- Evidence: // Pin the locale. After D108's layout switch, English moved off the root to `/en/`
- Impact: 版面切換落地後「After … switch」成為歷史敘述；可直接寫現況（主語系在根、英文在 /en/）
- Suggested fix: 改寫成現況描述，D 編號可保留作出處

#### STD-G1-11 · low · confidence medium · smell

- Where: `.vitepress/challenge/slug.ts:1`
- Requirement: 審查重點：版面切換留下的過時敘述
- Summary: slug.ts 檔頭用「now」「this once also accepted is gone with the old layout」敘述歷史，且舉的 `challenge/<slug>/index.md` 例子是舊版面路徑
- Evidence: // The challenge page's slug (seam 0010-S42; Y49). Every brief now lives per-folder —
// `challenge/<slug>/index.md` or, under the locale folders, `<L>/challenge/<slug>/index.md`
// — so the slug is always the parent directory's name. The flat `<slug>.md` form this once
// also accepted is gone with the old layout
- Impact: 新版面下說明頁都在語系資料夾裡（rewrite 後主語系為 `challenge/<slug>/index.md`），註解混入舊版面敘述，讀者難判斷哪個是現況
- Suggested fix: 改寫為「relativePath 是 rewrite 後的路徑：主語系為 challenge/<slug>/index.md，其他語系為 <L>/challenge/<slug>/index.md」，拿掉歷史敘述；ChallengeLayout.vue:49 的「the helper no longer has a flat fallback」同理

#### STD-G1-13 · low · confidence high · smell

- Where: `.vitepress/challenge/config.ts:32`
- Requirement: 審查重點：死碼；D74 title/description/layout 是說明頁的鍵
- Summary: ChallengeDeclaration 保留 description 欄位並回傳 obj.description，但同一函式第 92-96 行在 description 出現時就會拋錯，這個欄位永遠是 undefined
- Evidence:   description?: string   // line 32
  ...
  const briefKeysPresent = Object.keys(obj).filter((key) => BRIEF_ONLY_KEYS.includes(...))
  if (briefKeysPresent.length > 0) { throw ... }
  ...
    description: obj.description as string | undefined,   // line 154
- Impact: 型別暗示題目宣告可以帶 description，與 D74 和 GLOSSARY「說明頁」詞條相反，會誤導呼叫端從 declaration 取 description
- Suggested fix: 從 ChallengeDeclaration 與回傳值移除 description

#### STD-G1-14 · low · confidence high · smell

- Where: `.vitepress/challenge/config.ts:9`
- Requirement: Smell baseline：Mysterious Name／Middle Man
- Summary: BRIEF_ONLY_KEYS 只是 BRIEF_KEYS 的別名，同一個集合有兩個名字，plugin.ts 用 BRIEF_KEYS、config.ts 內部用 BRIEF_ONLY_KEYS
- Evidence: export const BRIEF_KEYS = ['title', 'description', 'layout'] as const
const BRIEF_ONLY_KEYS = BRIEF_KEYS
- Impact: 讀者會以為兩者語意不同（「only」暗示子集合），增加理解成本
- Suggested fix: 刪除別名，統一用 BRIEF_KEYS

#### STD-G1-15 · low · confidence high · smell

- Where: `.vitepress/challenge/plugin.ts:38`
- Requirement: 審查重點：版面切換留下的死碼
- Summary: processChallengeFrontmatter 與 detectLegacyFields 在正式程式碼中沒有任何呼叫端，只剩測試在用；config.mts 已改走 assembleChallengeFrontmatter
- Evidence: grep 結果：processChallengeFrontmatter 只出現在 tests/unit/challenge/plugin.test.ts、plugin-obfuscation.test.ts；detectLegacyFields 只出現在 plugin-obfuscation.test.ts。本 change 仍為 processChallengeFrontmatter 新增 brief/declaration 投影邏輯（plugin.ts:39-55）
- Impact: 維護兩條組裝路徑（舊的 processChallengeFrontmatter 與新的 assembleChallengeFrontmatter），測試綠燈守的是沒有正式呼叫端的函式；ProcessedChallenge 型別也可能與頁面實際拿到的 frontmatter 脫節
- Suggested fix: 若 spec 未要求保留，移除這兩個函式與其測試；若要保留，請在註解說明它目前的正式用途

#### STD-G1-16 · low · confidence medium · standard-breach

- Where: `.vitepress/challenge/config.ts:72`
- Requirement: GLOSSARY.md:178「challenge declaration（題目宣告）」_Avoid_: 設定／config／metadata
- Summary: 題目宣告驗證器的錯誤訊息稱它為「challenge config」；plugin.ts:40 新增的同一句也一樣
- Evidence: config.ts:72 `throw new Error('challenge config must be an object')`
plugin.ts:40 `throw new Error('challenge config must be an object')`
- Impact: 作者看到的錯誤訊息使用詞彙表明列要避免的名稱；GLOSSARY 說明「config 太弱：這組宣告決定學習者拿得到哪些攻擊工具……是授權面不是外觀設定」
- Suggested fix: 改為「challenge declaration must be a YAML mapping」或「challenge.yaml must hold a mapping」

#### STD-G1-17 · low · confidence medium · standard-breach

- Where: `.vitepress/challenge/plugin.ts:79`
- Requirement: GLOSSARY.md:177「frontmatter——舊版面承載這組宣告的位置，不是這個概念的名字。自 epic 0010 起宣告不寫在說明頁的前置資料裡」
- Summary: detectLegacyFields 的警告訊息仍寫「found in frontmatter」，而舊欄位現在要檢查的位置是 challenge.yaml
- Evidence: warnings.push(`deprecated field '${field}' found in frontmatter — this field is ignored and should be removed`)
- Impact: 作者會去說明頁的前置資料找欄位，但它在題目宣告裡
- Suggested fix: 改成「found in challenge.yaml」或中性的「found in the challenge declaration」；若函式為死碼（見 STD-G1-15）則一併移除

#### STD-G1-19 · low · confidence high · smell

- Where: `.vitepress/home-links.ts:12`
- Requirement: Smell baseline：Duplicated Code
- Summary: withPrefix 在 home-links.ts:12 與 locales-config.ts:61 各寫一份，firstSegment 在 home-links.ts:16 與 primary-folder-links.ts:18 各寫一份
- Evidence: home-links.ts:12 `function withPrefix(path: string, locale: Locale): string { return path === '/' ? `/${locale}/` : `/${locale}${path}` }`
locales-config.ts:61 `function withPrefix(path: string, code: Locale): string { return path === '/' ? `/${code}/` : `/${code}${path}` }`
home-links.ts:16 / primary-folder-links.ts:18 `return path.slice(1).split('/')[0] || undefined`
- Impact: 同一條 URL 前綴規則有多份實作，且 i18n/index.ts 的 localizePath 還有第三種寫法；任一處改了規則（例如處理 '' 或 query）其他處不會跟著改
- Suggested fix: 抽成共用的 path helper（例如放在 locales.ts 旁的純模組），三個建置模組共用

#### STD-G1-20 · low · confidence high · smell

- Where: `platform/shared/challenges.data.ts:70`
- Requirement: Smell baseline：Duplicated Code
- Summary: 說明頁路徑的解析（<L>/challenge/<slug>/index.md）在 loader 用 regex 寫一次，在 plugin.ts briefSlug 用 split 再寫一次；前置資料的切割 regex 也與 plugin.ts extractMarkdownBody 不同
- Evidence: challenges.data.ts:70 `const brief = /^([^/]+)\/challenge\/([^/]+)\/index\.md$/.exec(rel)`
plugin.ts briefSlug: `segments.length !== 4 … segments[1] !== 'challenge' … segments[3] !== 'index.md'`
challenges.data.ts:44 `/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/` vs plugin.ts:9 `/^---[\s\S]*?---\n?/`
- Impact: 頁面建置與清單 loader 對「哪個檔案是說明頁」「前置資料在哪結束」可能判斷不一致（例如 CRLF），造成清單有題目但頁面組裝不同
- Suggested fix: 共用一個 briefSlug／前置資料解析 helper

#### STD-G1-21 · low · confidence medium · smell

- Where: `.vitepress/pageList.ts:17`
- Requirement: Smell baseline：Duplicated Code；同檔註解「`pageListFromDir` applies the same exclusions」
- Summary: 「題目 src/ 不是頁面」的排除規則寫了三份：config.mts srcExclude 'challenge/*/src/**'、pageList.ts CHALLENGE_SRC_RE、source-layout.ts isExcluded 的 regex
- Evidence: pageList.ts:17 `const CHALLENGE_SRC_RE = /^challenge\/[^/]+\/src$/`
source-layout.ts:14 `if (/^challenge\/[^/]+\/src\//.test(sourcePath)) return true`
config.mts:56 `srcExclude: ['challenge/*/src/**', 'public/**', 'shared/**', ...]`
- Impact: 三者只靠註解保持一致，任一處調整會讓頁面清單、版面檢查與 VitePress 實際建置的頁面集合分歧
- Suggested fix: 讓 pageList 與 source-layout 共用同一個 isExcluded 謂詞，並由它導出 srcExclude

#### STD-G1-22 · low · confidence high · smell

- Where: `.vitepress/source-layout.ts:54`
- Requirement: 註解須與行為相符
- Summary: mdFilesBeneath 的註解說會略過「the same excluded areas `checkSourceLayout`'s main walk does」，實作卻只略過點開頭、node_modules、dist，沒有套用 isExcluded（public/、shared/、challenge/*/src/）
- Evidence: /** ... skipping the
 *  same excluded areas `checkSourceLayout`'s main walk does. ... */
...
    if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue
- Impact: Duplicated Code 加上規則不一致；註解與行為不符會誤導維護者
- Suggested fix: 改用 isExcludedDir(childRel)，或把註解改成實際的略過清單

#### STD-G1-23 · low · confidence high · smell

- Where: `.vitepress/source-layout.ts:79`
- Requirement: Smell baseline：Speculative Generality（未使用的參數）
- Summary: walkSourceTree 的 srcDir 與 primary 參數在函式內只被往下傳遞，從未使用
- Evidence: function walkSourceTree(srcDir: string, dir: string, rel: string, primary: Locale, v: Violations): void {
  ...
      walkSourceTree(srcDir, join(dir, item.name), childRel, primary, v)
- Impact: 讀者會以為版面檢查的結果依主語系而定，實際上不會
- Suggested fix: 移除這兩個參數

#### STD-G1-24 · low · confidence medium · smell

- Where: `.vitepress/source-layout.ts:117`
- Requirement: 審查重點：吞掉錯誤的錯誤處理
- Summary: hasPrimaryHome 的 catch 把任何 lstat 失敗都當作「首頁不存在」
- Evidence: function hasPrimaryHome(srcDir: string, primary: Locale): boolean {
  try {
    return lstatSync(join(srcDir, primary, 'index.md')).isFile()
  } catch {
    return false
  }
}
- Impact: 權限錯誤會被報成 PL-E10「the primary locale … has no home page」，原因被遮蔽
- Suggested fix: 只在 ENOENT 時回傳 false，其他錯誤拋出

#### STD-G1-25 · low · confidence high · smell

- Where: `.vitepress/primary-locale.ts:34`
- Requirement: 審查重點：吞掉錯誤的錯誤處理
- Summary: readIndexPrimaryLocale 讀 `git show :range.json` 失敗時以 pl02(undefined) 拋錯，訊息固定為「(unknown)」，丟掉 git 的錯誤原因
- Evidence:   try {
    text = execFileSync('git', ['show', ':range.json'], { ..., stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    throw pl02(undefined)
  }
- Impact: pre-commit hook 失敗時老師只看到「range.json could not be read (unknown)」，stderr 也被 'ignore' 吞掉，無從除錯
- Suggested fix: 把捕捉到的錯誤傳給 pl02，或把 git 的 stderr 內容放進訊息

#### STD-G1-26 · low · confidence medium · smell

- Where: `.vitepress/primary-locale.ts:5`
- Requirement: Smell baseline：Divergent Change
- Summary: 網站建置設定載入的 primary-locale.ts 新增 child_process 與 git index 讀取，但只有 pre-commit 相關腳本（challenge-lint-staged.ts、generate-redirects.ts）使用
- Evidence: import { execFileSync } from 'node:child_process'
...
export function readIndexPrimaryLocale(root: string): Locale {
- Impact: 建置模組因 hook 的需求而改動；config.mts 載入此模組時也帶進 child_process 相依
- Suggested fix: 把 readIndexPrimaryLocale 移到 scripts/ 的 hook 模組，只共用 parsePrimaryLocale

#### STD-G1-27 · low · confidence medium · smell

- Where: `.vitepress/config.mts:145`
- Requirement: Smell baseline（效能／職責）
- Summary: transformPageData 對每一頁都 readFileSync 讀原始檔，但只有說明頁會用到 raw（extractMarkdownBody）
- Evidence:     const sourcePath = pageData.filePath
    const raw = readFileSync(resolve(ctx.siteConfig.srcDir, sourcePath), 'utf-8')
    const readDeclaration = ...
    const assembled = assembleChallengeFrontmatter(sourcePath, pageData.frontmatter, raw, readDeclaration, LOCALES)
- Impact: 每頁多一次同步讀檔；舊版只在 layout === 'challenge' 時才讀
- Suggested fix: 讓 assembleChallengeFrontmatter 接受 lazy 讀取函式，或先判斷是否為說明頁再讀

#### STD-G1-28 · low · confidence medium · smell

- Where: `.vitepress/config.mts:146`
- Requirement: Smell baseline：Duplicated Code
- Summary: repository root 在同檔已定義 REPO_ROOT（第 36 行），transformPageData 又用 resolve(ctx.siteConfig.srcDir, '..') 重算；challenges.data.ts:65、:95 也各自 resolve(srcDir, '..') 並另外讀一次 range.json
- Evidence: config.mts:36 `const REPO_ROOT = resolve(__dirname, '..')`
config.mts:146 `readChallengeDeclaration(resolve(ctx.siteConfig.srcDir, '..'), slug)`
challenges.data.ts:95 `primary: readPrimaryLocale(resolve(srcDir, '..', 'range.json'))`
- Impact: 主語系在同一次建置被讀兩次（config 與 loader），兩處推導 root 的方式不同，未來改 srcDir 結構時可能不一致
- Suggested fix: transformPageData 改用 REPO_ROOT；loader 是否能沿用 config 讀到的主語系可再評估

#### STD-G1-29 · low · confidence high · smell

- Where: `.vitepress/config.mts:66`
- Requirement: 審查重點：版面切換後過時的註解
- Summary: cleanUrls 的註解仍以「`/zh-TW/challenges` answers 200」為例，但上游主語系改為繁中後，/zh-TW/… 已由 _redirects 的 `/zh-TW/* /:splat 302` 導回根目錄
- Evidence:   // Cloudflare Pages serves this site's pages without the extension:
  // `/zh-TW/challenges` answers 200, while `/zh-TW/challenges.html` and
  // `/zh-TW/challenges/` both 308 to it.
- Impact: 註解描述的 URL 在上游已不再是頁面，讀者會誤解目前的網址結構
- Suggested fix: 改用不受主語系影響的例子（例如 `/en/challenges` 或泛稱 `<page>`）

#### STD-G1-31 · low · confidence high · standard-breach

- Where: `platform/zh-TW/guide/notes.md:158`
- Requirement: docs/agents/language.md（雙語文件同步）；spec AC-8
- Summary: 繁中筆記頁拿掉了指向公開匯出格式的連結，改成純文字；英文版同一句（en/guide/notes.md:158）仍是可點的連結，兩語系內容不再對等
- Evidence: zh-TW:158 「詳細演算法見「公開匯出格式」參考頁。」（無連結）
en:158 「See the [public export format](../reference/attack-log-export-format.md).」
- Impact: 繁中讀者找不到參考頁；ticket 第 55-57 行記載這是 T-0080 前的暫時做法
- Suggested fix: 已知暫行做法；在 T-0080 補上繁中參考頁與同資料夾連結，或暫時加一句說明參考頁目前只有英文

#### STD-G1-32 · low · confidence medium · standard-breach

- Where: `platform/zh-TW/guide/troubleshooting.md:202`
- Requirement: docs/agents/language.md（雙語文件須同步）
- Summary: 繁中「為什麼」段把英文版分開列的兩種情況（跟著連結進到只有另一語系的頁面／網站記住另一語系時直接打開這種頁面）用「，而」合併成一個複合條件，與 en/guide/troubleshooting.md:202 語意不同
- Evidence: zh：「也會發生在你跟著連結進到只有另一個語系的頁面，而你直接打開這種頁面、網站記住的是另一個語系時」
en：「when a link takes you to a page that is only in the other language, when you open such a page directly while the site remembers the other language」
- Impact: 繁中讀者會以為兩個條件要同時成立才會出現那一行字，與英文版和實際行為不符
- Suggested fix: 改成兩個並列條件，例如「……也會發生在你跟著連結進到只有另一個語系的頁面時、在網站記住另一個語系時直接打開這種頁面時，以及……」

#### STD-G1-34 · low · confidence high · standard-breach

- Where: `.vitepress/theme/i18n/messages/zh-TW.json:50`
- Requirement: GLOSSARY.md:71「挑戰——待改的介面字串，不是可接受的別名」
- Summary: 字串表新增鍵 challenge_list.default_title，值為「網站攻防挑戰」，用到詞彙表要避免的「挑戰」
- Evidence: "default_title": "網站攻防挑戰",
- Impact: 介面字串沿用待改用語；traceability D42 與 spec Out of Scope（L-O3）已記錄這是從 DEFAULTS 原值搬來、延後處理
- Suggested fix: 已知延後項（L-O3）；在處理「挑戰」用語的 ticket 一併改成「網站攻防題目」之類的寫法

#### STD-G1-35 · low · confidence high · standard-breach

- Where: `.vitepress/locales-config.ts:46`
- Requirement: GLOSSARY.md:71（挑戰為待改字串）、GLOSSARY.md:274（pentest notes 繁中正式用語為「滲透筆記」）
- Summary: 新檔 locales-config.ts 把繁中導覽列「挑戰」與繁中側欄的英文「Pentest Notes」原樣搬進來
- Evidence: locales-config.ts:46 `{ text: '挑戰', link: '/challenges/' },`
locales-config.ts:55 `{ text: 'Pentest Notes', link: '/guide/notes' },`（位於 'zh-TW' 區塊）
- Impact: 沿用舊字串，不是本 change 新引入，但已移到新檔，仍是詞彙表點名待改的介面文字
- Suggested fix: 列入後續處理「挑戰」用語的 ticket；繁中側欄可改為「滲透筆記」

#### STD-G1-36 · low · confidence medium · smell

- Where: `platform/shared/mergeChallenges.ts:39`
- Requirement: Smell baseline：Middle Man／Mysterious Name
- Summary: DeclarationRead 只是 DeclarationResult 的別名；同類情況還有 shortLink.ts 的 `ShortLinkLocale = Locale`、i18n/index.ts:12 只轉呼叫 isKnownLocaleOnList 的 isKnownLocale
- Evidence: mergeChallenges.ts:39 `export type DeclarationRead = DeclarationResult`
shortLink.ts `export type ShortLinkLocale = Locale`
i18n/index.ts:12-14 `export function isKnownLocale(value: unknown): value is Locale { return isKnownLocaleOnList(value) }`
- Impact: 同一概念多個名字，讀者要追別名才知道是同一型別
- Suggested fix: 直接使用原型別／函式（re-export 即可），刪除轉手層

#### STD-G1-37 · low · confidence medium · smell

- Where: `platform/shared/mergeChallenges.ts:24`
- Requirement: 註解須與行為相符
- Summary: defaultOf 的註解說「a locale with no string table works when none is needed」，但 TABLES 的型別是 Record<Locale, …>，每個語系都必須有字串表，否則編譯失敗
- Evidence: const TABLES: Record<Locale, { challenge_list: {...} }> = { en, 'zh-TW': zhTW }
/** Read only when a field needs its default, so a locale with no string table works when none is needed. */
- Impact: 註解描述的情況在型別上不可能發生（Speculative Generality），會誤導維護者
- Suggested fix: 刪除該句，或把 TABLES 改成 Partial 並處理缺表

#### STD-G1-38 · low · confidence low · smell

- Where: `platform/shared/challenges.data.ts:29`
- Requirement: Smell baseline：Primitive Obsession
- Summary: ChallengeData.difficulty 從 'easy' | 'medium' | 'hard' | 'mystery' 聯集放寬為 string
- Evidence: -  difficulty?: 'easy' | 'medium' | 'hard' | 'mystery'
+  difficulty: string
- Impact: 元件端（DIFFICULTY_ORDER、徽章）失去型別保護，難度值打錯也不會被編譯器發現
- Suggested fix: 若宣告可能有任意字串，考慮 `Difficulty | (string & {})` 或在 loader 正規化

#### STD-G1-39 · low · confidence medium · smell

- Where: `.vitepress/theme/components/HomeContent.vue:17`
- Requirement: Smell baseline：Duplicated Code（spec D32 要求元件只經 pageLocaleOf 推導，屬經認可的重複）
- Summary: `computed(() => pageLocaleOf(localeIndex.value, primaryLocale()))` 在 HomeContent、ChallengeList、MergedNav、LocaleSwitcher 各寫一次
- Evidence: HomeContent.vue:17、ChallengeList.vue:24、MergedNav.vue:63、LocaleSwitcher.vue:33 皆為 `pageLocaleOf(localeIndex.value, primaryLocale())`
- Impact: 四處相同的組合，日後若改推導方式需同步四處
- Suggested fix: 抽成 usePageLocale() composable，內部仍呼叫 pageLocaleOf，符合 D32

#### STD-G1-40 · low · confidence medium · smell

- Where: `.vitepress/challenge/declaration.ts:71`
- Requirement: Smell baseline：Duplicated Code（重複工作）
- Summary: readChallengeDeclaration 先用 parseAllDocuments 解析整份來源判斷多文件，再用 parseDocument 重新解析一次
- Evidence:   const docs = parseAllDocuments(src, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })
  if (docs.length > 1) { ... }
  const doc = parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })
- Impact: 相同選項寫兩次，任一處改選項會讓多文件判斷與實際解析不一致；也多解析一次
- Suggested fix: 選項抽成常數；或在 docs.length === 1 時直接使用 docs[0]

#### STD-G1-41 · low · confidence medium · smell

- Where: `.vitepress/theme/i18n/arrival.ts:83`
- Requirement: 審查重點：錯誤處理；Smell baseline：Duplicated Code
- Summary: notFoundRedirect 不加 try/catch 直接 decodeURIComponent，正確性仰賴 lookupNotFound 內部先成功解碼過同一字串；解碼邏輯也與 lookupNotFound 重複
- Evidence:   // No try/catch here: `entry` is non-null
  // only when `lookupNotFound` itself decoded this exact same string successfully ...
  const local = decodeURIComponent(withoutBasePath)
- Impact: 兩個函式之間有隱性耦合，日後 lookupNotFound 改寫解碼方式時這裡可能在 runtime 拋 URIError
- Suggested fix: 讓 lookupNotFound 回傳已解碼的路徑或要求的語系，避免重複解碼與隱性前提

#### STD-G1-42 · low · confidence low · smell

- Where: `.vitepress/theme/i18n/index.ts:23`
- Requirement: 審查重點：應讀主語系處寫死 'en'（本 change 未修改的行）
- Summary: createI18n 的 locale 與 fallbackLocale 仍寫死 'en'；上游主語系已改為繁中
- Evidence: export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
- Impact: 元件已透過 tp 以頁面語系翻譯，影響有限；但 HomeContent 註解說的「runtime instance is `en` until hydration」在主語系為繁中時，未經 tp 的字串在 SSR 會以英文輸出
- Suggested fix: 確認是否有未經 tp 的 t() 呼叫；若有，考慮以建置時的主語系作為初始 locale

#### STD-G1-43 · low · confidence low · smell

- Where: `.vitepress/theme/components/ChallengeList.vue:244`
- Requirement: 審查重點：locales.ts 以外的語系列舉（本 change 未修改的行；日期屬 T-0079）
- Summary: ChallengeList.vue:244 與 HomeContent.vue:57 的日期格式化以二元三元運算子寫死 'zh-TW'／'en-US'，與 locales-config.ts 的 lang 欄位重複
- Evidence: return new Date(d).toLocaleDateString(locale.value === 'zh-TW' ? 'zh-TW' : 'en-US', { ... })
- Impact: 加入第三個語系時日期會錯用 en-US；ticket 第 46-48 行記載日期屬 T-0079
- Suggested fix: 在 T-0079 改為從每個語系的 lang 設定取 BCP 47 標籤

#### STD-G1-44 · low · confidence medium · smell

- Where: `vitest.config.ts:57`
- Requirement: 註解須與行為相符
- Summary: 註解說「this allowlists exactly that directory, not the filesystem root」，實際允許的是整個 os.tmpdir()，不是各測試建立的那個 fixture 目錄
- Evidence:   // ... this allowlists exactly that directory, not
  // the filesystem root.
  server: { fs: { allow: ['.', tmpdir(), realpathSync(tmpdir())] } },
- Impact: 只影響測試設定；但註解高估了限制範圍
- Suggested fix: 把註解改成「allowlists the OS temp directory」

#### STD-G1-45 · low · confidence low · smell

- Where: `.vitepress/pageList.ts:39`
- Requirement: Smell baseline：Speculative Generality
- Summary: rewrittenPath 接受 `primary: Locale | undefined`，pageListFromDir 的 primary 也是可選；正式呼叫端（config.mts:46、:59、challenges.data.ts）永遠會傳入主語系
- Evidence: export function rewrittenPath(source: string, primary: Locale | undefined): string {
  if (primary === undefined) return source
...
export function pageListFromDir(srcDir: string, primary?: Locale, options?: { smokePages?: boolean }): string[] {
- Impact: 多一條「不 rewrite」的分支只為舊呼叫方式或測試保留，型別無法強制建置端一定帶主語系
- Suggested fix: 若沒有正式呼叫端需要省略，改為必填

### Standards · G2 (34 findings: 0 high, 2 medium, 32 low)

Coverage: G2-scripts-ci 的 16 個 diff 檔全部完整讀過：.github/workflows/quality-gates.yml、.github/workflows/release.yml、package.json、pnpm-lock.yaml、scripts/challenge-analyze.ts、scripts/challenge-keygen.ts、scripts/challenge-lint-staged.ts、scripts/challenge-numbers.ts、scripts/challenge-retype.ts、scripts/challenge-validate.ts、scripts/challenge-verify.ts、scripts/create-challenge.ts、scripts/fork-init.ts、scripts/generate-redirects.ts（711 行，一次讀完）、scripts/pre-commit.sh、scripts/wxl-solver/build-player-package.ts。對照用的 live 檔案：scripts/pre-commit.sh 全檔、.github/workflows/quality-gates.yml 全檔、release.yml 前 60 行、generate-redirects.ts 第 520 行到結尾、challenge-lint-staged.ts 第 118 行到結尾、challenge-validate.ts 第 380 行到結尾、challenge-analyze.ts 第 370 行到結尾、challenge-keygen.ts 第 580-680 行、fork-init.ts 的 import 段與 A7 段（1420-1450）、.vitepress/locales.ts、.vitepress/source-layout.ts、.vitepress/challenge/slug.ts、.vitepress/challenge/plugin.ts 第 35-167 行，以及 smell-baseline.md、docs/agents/language.md 前 40 行。標準文件只用 grep 查相關段落（GLOSSARY.md 的 brief／declaration／primary locale 等詞條、platform-notes.md、CONTRIBUTE.md、README 的 hook 段落），沒有整份讀完。沒有讀 G1、G3、G4、G5 的 diff（不在本軸範圍），也沒有讀 spec 0010 本文與票的紀錄檔，所以凡是牽涉 D 編號的判斷（D19、D64、D127、D150 的範圍）都標為中或低信心。pre-commit.sh 的 bash 3.2 相容性是靠閱讀判斷，沒有實際執行。

Missing context: spec 0010 的 D19、D64、D127、D150 原文：要確認 challenge:analyze 是否應該做 layout check、W6d 是否刻意只涵蓋 platform/challenge/、D150 訊息是否規定原文、create:challenge 是否應在寫檔前擋下 D150; T-0077 票的 test plan／U142 原文：確認 fetch-depth: 0 的理由與預期涵蓋的 job，判斷是否應寫進工作流程註解; CI 的 bash 版本與 macOS 本機 bash 3.2 的實際執行結果：本審查沒有執行 pre-commit.sh，空 TREES 與 --describe-untracked 失敗路徑只靠閱讀推論

#### STD-G2-02 · medium · confidence high · smell

- Where: `scripts/generate-redirects.ts:206`
- Requirement: smell-baseline: Duplicated Code；task 重點「duplicated logic between the tools (slug grammar, declaration reading ...)」
- Summary: 「說明頁 = 資料夾裡有一般檔案 index.md（D127）」至少有四種實作，語意彼此不同。
- Evidence: generate-redirects.ts:206 `statSync(join(dir, d.name, 'index.md')).isFile()`（跟隨 symlink）；challenge-validate.ts:376 `existsSync(join(root, 'platform', locale, 'challenge', name, 'index.md'))`（目錄或 symlink 也算）；pre-commit.sh:440 `[ -f "$1index.md" ] && [ ! -L "$1index.md" ]`（排除 symlink）；challenge-lint-staged.ts:60 與 .vitepress/challenge/plugin.ts:91 只看路徑形狀。
- Impact: 同一個邊界（index.md 是 symlink 或目錄）在 validate、generator、hook 的 W4 與建置之間判斷不一致，一個工具接受、另一個拒絕；日後改 D127 要同時改五處（Shotgun Surgery）。
- Suggested fix: 在 .vitepress 下抽出單一 `isBriefFolder(dir)`／`briefSlugs(root, locale)`，各 TS 工具共用；bash 端只保留 Node 無法取代的部分並在註解指向同一條規則。

#### STD-G2-03 · medium · confidence medium · smell

- Where: `scripts/challenge-analyze.ts:118`
- Requirement: smell-baseline: Duplicated Code；commit ceb7f8d「改為單一 declaration 驗證」；D129 宣告讀取選項
- Summary: challenge-analyze 自己另寫一個 challenge.yaml 讀取器（預設 parseDocument 選項），沒有用 readChallengeDeclaration（D129 的嚴格讀取）。
- Evidence: challenge-analyze.ts:110-122 `function readDeclaration(...)` … `const doc = parseDocument(raw)` … `return { value: doc.toJS() }`；對照 .vitepress/challenge/declaration.ts:71-84 用 `{ schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false }`、非純量 key 檢查與 `maxAliasCount: 100`。
- Impact: 非純量 key、已知 tag 解析等情況 analyze 會放行，但 validate／建置會拒絕；lint-staged 同時跑兩者時，同一份檔案可能出現兩套不同的錯誤訊息（analyze 的 'No challenge.yaml found' 對上 validate 的 'platform/challenge/<slug>/challenge.yaml not found'）。
- Suggested fix: analyze 的 validateChallenge／analyzeChallenge 改用 readChallengeDeclaration，失敗訊息共用 challenge-validate 的 declarationFailureMessage。

#### STD-G2-01 · low · confidence high · incorrect

- Where: `scripts/generate-redirects.ts:487`
- Requirement: 介面字串須正確（AGENTS.md Language；hook 訊息 W6b/W6c 是使用者會讀到的介面字串）
- Summary: W6b/W6c 訊息以 `is a ${names[...]} brief` 組句，語系為 en 時會印出文法錯誤的「is a English brief」。
- Evidence: generate-redirects.ts:487 `✗ ${dir} is a ${names[localeOfBrief(fault.present)]} brief, but the index holds no challenge declaration ...`；:494 同樣句型；.vitepress/locales.ts:16 `en: 'English'`。
- Impact: 主語系為 zh-TW 時，只有英文說明頁的題目（W6b）或缺宣告的英文說明頁（W6c）會讓老師看到「a English brief」；舊版只有 Traditional Chinese 所以沒有這個問題，是這次改成依語系清單產生字串才出現的。
- Suggested fix: 改成不需要冠詞的句型（例如 `is the English brief` 或 `is a brief in English`），或依名稱首字母選 a/an，並補一個 en 的 W6b 測試。

#### STD-G2-04 · low · confidence medium · smell

- Where: `scripts/challenge-retype.ts:274`
- Requirement: smell-baseline: Duplicated Code；D129 宣告讀取選項
- Summary: retype 以預設選項 parseDocument 讀 challenge.yaml，是另一個與 readChallengeDeclaration 分歧的宣告讀取器，且沒有檢查 doc.errors。
- Evidence: challenge-retype.ts:274 `const doc = parseDocument(readFileSync(declarationPath, 'utf8'))`，之後直接 `doc.set(...)` 與 `writeFileSync(declarationPath, doc.toString({ lineWidth: 0 }), 'utf8')`。
- Impact: challenge.yaml 有 YAML 錯誤時 `doc.toString()` 會丟例外，CLI 以未捕捉例外加 stack 結束，而不是 RetypeResult 的 exitCode 1 訊息；建置會拒絕的宣告 retype 可能照樣改寫。
- Suggested fix: 先用 readChallengeDeclaration 判定可讀，再用相同選項的 parseDocument 取得可編輯文件；doc.errors 非空時回傳 exitCode 1。

#### STD-G2-05 · low · confidence high · smell

- Where: `scripts/challenge-keygen.ts:603`
- Requirement: smell-baseline: Duplicated Code
- Summary: keygen 先以 readChallengeDeclaration 讀並解析一次，又 readFileSync 與預設選項 parseDocument 再讀一次。
- Evidence: challenge-keygen.ts:599 `const declaration = readChallengeDeclaration(root, slug)`；:603-604 `const raw = readFileSync(declarationPath, 'utf-8')` / `const doc = parseDocument(raw)`。
- Impact: 兩次讀取之間檔案若被改動，判斷用的值（fm）與寫回用的 doc 不是同一份；兩套解析選項不同，寫回時可能保留嚴格讀取器會拒絕的結構。
- Suggested fix: 讓 declaration.ts 一併回傳原始文字或可編輯的 Document（同一套選項），keygen 只讀一次。

#### STD-G2-06 · low · confidence high · smell

- Where: `scripts/challenge-validate.ts:72`
- Requirement: smell-baseline: Duplicated Code（同一組 D129 選項有多個來源）
- Summary: YAML_OPTIONS 複製了 declaration.ts 內兩處的行內選項，D129 選項現在有三個來源。
- Evidence: challenge-validate.ts:72 `const YAML_OPTIONS = { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false } as const`；declaration.ts:71 與 :75 各自行內寫同一組物件。
- Impact: 日後調整 D129 選項時容易只改一處，validate 的錯誤細節就會跟實際讀取結果不一致。
- Suggested fix: 在 declaration.ts 匯出單一 `DECLARATION_YAML_OPTIONS` 常數（以及 maxAliasCount），validate 與 reader 共用。

#### STD-G2-07 · low · confidence medium · incorrect

- Where: `scripts/challenge-validate.ts:101`
- Requirement: 錯誤訊息須如實描述原因（smell: Duplicated Code 加上錯誤的預設值）
- Summary: declarationFailureMessage 在 invalid-yaml 時重讀重解析檔案；重讀失敗或沒找到問題時，退回固定字串「a mapping key is not a scalar」，可能不是真正的原因。
- Evidence: challenge-validate.ts:101-120 `let detail = NON_SCALAR_KEY_TEXT; try { const outcome = parseYamlStrict(readFileSync(path, 'utf-8')); if (!outcome.ok && outcome.message !== '') detail = outcome.message } catch { // ... keep the fixed text }`。
- Impact: 像多文件以外的別種解析錯誤（例如 alias 超量時 toJS 拋出的訊息與 reader 的分類不同步），或讀檔失敗時，老師會看到與實際無關的「mapping key 不是純量」訊息。
- Suggested fix: 讓 readChallengeDeclaration 直接在結果裡帶第一個問題的文字，validate 不再自行重讀；沒有細節時就說「invalid YAML」而不猜原因。

#### STD-G2-08 · low · confidence high · smell

- Where: `scripts/challenge-keygen.ts:588`
- Requirement: smell-baseline: Duplicated Code
- Summary: 「platform/challenge/ 底下含 challenge.yaml 的資料夾」的列舉在三個工具各寫一次。
- Evidence: challenge-keygen.ts:588-596 `keygenSlugs`（readdirSync + existsSync(challenge.yaml)）；challenge-analyze.ts:88 `discoverChallenges(root, primary, …)` 同樣過濾；challenge-numbers.ts `slugsUnder(dir, 'challenge.yaml')`。
- Impact: 三處的排序、symlink 與 target 過濾細節日後容易分歧；keygen 處理的題目集合可能跟 numbers／analyze 看到的不一樣。
- Suggested fix: 共用 challenge-numbers.ts 的 slugsUnder（匯出）或在 declaration.ts 提供 `declaredSlugs(root)`。

#### STD-G2-09 · low · confidence high · smell

- Where: `scripts/challenge-validate.ts:371`
- Requirement: smell-baseline: Mysterious Name
- Summary: challenge-validate 與 challenge-analyze 都匯出 `discoverChallenges`，但簽章、語意與回傳型別都不同；lint-staged 只好改名成 fullDiscover 來區分。
- Evidence: challenge-validate.ts `export function discoverChallenges(root: string, target?: string): string[]`（含沒有 challenge.yaml 的資料夾與只有說明頁的 slug）；challenge-analyze.ts:88 `export function discoverChallenges(root: string, primary: Locale, targetSlug?: string): ChallengeFile[]`（只有含 challenge.yaml 的資料夾）；challenge-lint-staged.ts 以 `discoverChallenges as fullDiscover` 匯入。
- Impact: 讀者難以分辨哪一個包含孤兒說明頁；lint-staged 的 :120 用 fullDiscover 判斷「整題已刪除」，:137 又用 analyze 的版本，容易拿錯。
- Suggested fix: 改成能看出意圖的名稱，例如 `allChallengeSlugs`（validate）與 `declaredChallenges`（analyze）。

#### STD-G2-10 · low · confidence high · smell

- Where: `scripts/pre-commit.sh:435`
- Requirement: smell-baseline: Duplicated Code；task 重點「message text with more than one source」
- Summary: 未追蹤資料夾的 W4 分類拆在 bash（untracked_tree_child）與 TS（untrackedLines）兩邊，各自檢查一部分條件。
- Evidence: pre-commit.sh:435-443 依斜線數與 `[ -f "$1index.md" ] && [ ! -L ... ]` 篩選；generate-redirects.ts:504-523 `untrackedLines` 再以 `parts.length === 3/4`、`parts[2] === 'challenge'` 與 LOCALES 篩一次，但不檢查 index.md。
- Impact: 規則改動（例如 D127 的說明頁定義）要同時改兩種語言；直接呼叫 `--describe-untracked` 的人會對沒有 index.md 的資料夾印出 W4b，跟 hook 的行為不同。
- Suggested fix: bash 只負責把 `git ls-files --directory` 的結果原樣寫檔，形狀與 index.md 的判斷全部移到 untrackedLines。

#### STD-G2-11 · low · confidence medium · smell

- Where: `scripts/pre-commit.sh:527`
- Requirement: pre-commit.sh 檔頭第 5、6 點（只有驗證與產生失敗才擋 commit）；task 重點「set -e paths that leave state half-written」
- Summary: 只負責印 W4 說明的 `--describe-untracked` 在 `set -e` 下、`git add` 之後執行；它失敗時整個 commit 會被擋，且 index 的 _redirects 已經換掉。
- Evidence: pre-commit.sh:516-517 `git add -- "$REDIRECTS"` / `STAGED=true`；:526-528 `node --experimental-strip-types scripts/generate-redirects.ts --describe-untracked "$WORK/untracked-list" --root "$TOP" >&2`（沒有 `|| true`）。
- Impact: 純提示性的步驟（例如 index 的 range.json 讀取發生暫時性錯誤）會讓本來成功的 commit 失敗，而且留下已暫存的 _redirects，老師得自己判斷狀態。
- Suggested fix: 改成 `... >&2 || echo "[pre-commit] (could not describe untracked folders)" >&2`，讓提示失敗不影響 exit status；或把這一步移到 `git add` 之前。

#### STD-G2-12 · low · confidence medium · smell

- Where: `scripts/pre-commit.sh:119`
- Requirement: bash 3.2 相容性（pre-commit.sh:490-494 自己的註解：bash 3.2 在 set -u 下拒絕展開空陣列）
- Summary: `"${TREES[@]}"` 在 :119、:430、:495 未加保護就展開；安全只靠 generator 一定至少印一行。
- Evidence: pre-commit.sh:114-119 `TREE_LIST=$(node ... --challenge-trees)` … `WATCHED=("${TREES[@]}" "$REDIRECTS" range.json)`；:430 `git ls-files ... -- "${TREES[@]}"`；:495 `git diff --cached ... -- "${TREES[@]}"`。同檔 :493-494 註明「bash 3.2 under `set -u` rejects the expansion of an empty array」。
- Impact: 若 `--challenge-trees` 以 exit 0 印出空白（例如之後被改成先檢查別的條件），macOS 內建 bash 3.2 會以 unbound variable 中止 hook，訊息看不出原因；:430 與 :495 發生在 EXIT trap 已裝好之後。
- Suggested fix: 讀完後加 `[ ${#TREES[@]} -gt 0 ] || { echo '[pre-commit] ✗ generate-redirects --challenge-trees printed no tree' >&2; exit 1; }`。

#### STD-G2-13 · low · confidence medium · smell

- Where: `scripts/pre-commit.sh:29`
- Requirement: 註解須描述程式碼實際行為（task 重點「comments that describe behaviour the code no longer has」）
- Summary: 檔頭第 3 點說 hook 會擋「a page left outside the locale folders」，但 --staged 的 W6d 只看 platform/challenge/ 底下的舊版面路徑。
- Evidence: pre-commit.sh:29-31 `a brief with no primary-locale brief, a brief with no declaration, a challenge declared with no brief, a page left outside the locale folders (W6a-W6d, then W6r once). Each such fault would fail CI`；generate-redirects.ts:395-400 `indexTrees` 只在 `parts[1] === 'challenge'` 時收進 legacyPaths。
- Impact: 讀者會以為 hook 擋得下任何 PL-E08（例如 platform/guide/x.md），實際上這種頁面會通過 hook，到 CI 才失敗。
- Suggested fix: 把註解改成「a page left in the declaration tree platform/challenge/ (outside the locale folders)」，或在註解註明其他 PL-E08 只有 CI／建置會擋。

#### STD-G2-14 · low · confidence medium · smell

- Where: `scripts/pre-commit.sh:38`
- Requirement: pre-commit.sh:7「The bash here knows no locale name」；註解須與程式碼一致
- Summary: 第 4 點寫死「four rules: /en/c/ and /zh-TW/c/ … /c/ and /zh/c/」，但規則數由 FORMS（依 LOCALES 產生）決定。
- Evidence: pre-commit.sh:38-41 `Every challenge with a primary-locale brief gets four rules: /en/c/ and /zh-TW/c/, ... and /c/ and /zh/c/`；generate-redirects.ts FORMS = `/c/` + 每個 LOCALES 的 `/<L>/c/`（zh-TW 前加 `/zh/c/`）。
- Impact: 語系清單一擴充（例如 ja），這段註解就會過時，跟同檔「bash 不知道語系名稱」的原則矛盾。
- Suggested fix: 改寫成「one rule per short-link form (see FORMS in generate-redirects.ts)」，不在 bash 註解列語系。

#### STD-G2-15 · low · confidence high · smell

- Where: `scripts/challenge-lint-staged.ts:13`
- Requirement: 註解須描述程式碼實際行為
- Summary: 這次改寫的檔頭仍說「Called by lint-staged」「Usage (via lint-staged)」，但 repo 沒有 lint-staged，呼叫者是 scripts/pre-commit.sh。
- Evidence: challenge-lint-staged.ts:13 `Called by lint-staged with a list of staged file paths.`；:20 `Usage (via lint-staged), from the repository root:`；package.json 沒有 lint-staged，只有 :502 的 pre-commit.sh 呼叫它。
- Impact: 誤導維護者去找不存在的 lint-staged 設定，也看不出它實際收到的是 pre-commit.sh 經 TREES 篩過的 ACMRD 路徑。
- Suggested fix: 改成「Called by scripts/pre-commit.sh with the staged ACMRD paths under the challenge trees」。

#### STD-G2-16 · low · confidence medium · standard-breach

- Where: `.github/workflows/quality-gates.yml:116`
- Requirement: GLOSSARY.md:177（challenge declaration 的 _Avoid_: frontmatter——舊版面承載宣告的位置，不是這個概念的名字）
- Summary: build job 的步驟名稱仍是「Validate challenge frontmatter」，但 challenge:validate 現在驗的是題目宣告 challenge.yaml 與說明頁。
- Evidence: quality-gates.yml:116-117 `- name: Validate challenge frontmatter` / `run: pnpm challenge:validate`；challenge-validate.ts 檔頭「validates each challenge's declaration, briefs and directory」。
- Impact: CI 介面上的名稱沿用 GLOSSARY 已列為避免的舊說法；這一行雖然沒改，是這次變更讓它變成錯的。
- Suggested fix: 改名為「Validate challenge declarations and briefs」。

#### STD-G2-17 · low · confidence medium · smell

- Where: `.github/workflows/quality-gates.yml:28`
- Requirement: 工作流程既有慣例：非顯而易見的設定都附理由註解（同檔 :19-21、:37-39、:122、:236 等）
- Summary: 新增的三處 `fetch-depth: 0` 都沒有說明理由（U142：上游要 checkout tags）。
- Evidence: quality-gates.yml:28-29 與 :333-334、release.yml:33-34 只有 `with:` / `fetch-depth: 0`；同檔其他非顯而易見的設定都有註解，例如 :236 `# The smoke suite needs the two fixture pages ...`。
- Impact: 日後有人為了縮短 clone 時間（尤其 fork-init-cross-os 的 Windows／macOS 矩陣）拿掉它，只能靠 checkout-tags.test.ts 失敗才發現原因；檔案本身看不出需要 tags。
- Suggested fix: 在每個 `with:` 上方加一行註解，例如「# Full history and tags: the upstream-equality tests read release tags (U142, checkout-tags.test.ts).」。

#### STD-G2-18 · low · confidence high · smell

- Where: `scripts/generate-redirects.ts:175`
- Requirement: smell-baseline: Speculative Generality
- Summary: 匯出的 `IncludeTree` 型別沒有任何地方使用；includeSlug 的參數型別還是 `tree: string`。
- Evidence: generate-redirects.ts:175 `export type IncludeTree = 'declaration' | Locale`；:195 `includeSlug?: (slug: string, tree: string) => boolean`；全 repo grep 只找得到定義本身。
- Impact: 死碼；`string` 讓呼叫端可以傳任意樹名，失去型別保護。
- Suggested fix: 把 includeSlug 的第二個參數型別改成 IncludeTree，或刪掉這個型別。

#### STD-G2-19 · low · confidence high · smell

- Where: `scripts/generate-redirects.ts:568`
- Requirement: smell-baseline: Mysterious Name
- Summary: --staged 的 includeSlug callback 把第二個參數取名為 `locale`，但它也會收到 'declaration'。
- Evidence: generate-redirects.ts:568 `includeSlug: (slug, locale) => trees.slugs.get(locale)?.has(slug) ?? false`；numericRules 以 `include(e.slug, 'declaration')` 呼叫。
- Impact: 讀者會以為宣告檔不受這個篩選影響。
- Suggested fix: 改名為 `tree`。

#### STD-G2-20 · low · confidence medium · smell

- Where: `scripts/generate-redirects.ts:398`
- Requirement: smell-baseline: Mysterious Name（傳入與實際不符的參數）
- Summary: indexTrees 分類舊版面路徑時傳的是 DEFAULT_PRIMARY_LOCALE，不是 index 的主語系。
- Evidence: generate-redirects.ts:398 `classifySourcePath(parts.slice(1).join('/'), DEFAULT_PRIMARY_LOCALE) === 'outside'`；source-layout.ts:32-35 註明 `_primary` 保留給未來的呼叫者讀取。
- Impact: 現在 classifySourcePath 不讀 primary，所以沒有影響；但如果之後真的讀它，主語系為 en 的靶場在 --staged 會用錯的主語系分類。
- Suggested fix: 讓 indexTrees 接收 primary 參數並傳入實際值。

#### STD-G2-21 · low · confidence high · smell

- Where: `scripts/generate-redirects.ts:270`
- Requirement: smell-baseline: Duplicated Code
- Summary: numericRules 行內組出說明頁與宣告路徑，同檔稍後已有 briefPath/declarationPath helper。
- Evidence: numericRules 內 `const brief = ['platform', locale, 'challenge', slug, 'index.md'].join('/')` / `const declaration = ['platform', 'challenge', slug, 'challenge.yaml'].join('/')`；:430-431 `const briefPath = (locale, slug) => ...` / `const declarationPath = ...`。
- Impact: 同一路徑格式在同一檔案有兩個來源，日後改版面時容易漏改。
- Suggested fix: 把 helper 移到檔案前段，numericRules 改用它們。

#### STD-G2-22 · low · confidence medium · smell

- Where: `scripts/generate-redirects.ts:272`
- Requirement: task 重點「message text with more than one source」
- Summary: 「說明頁沒有宣告」這個錯誤有兩種措辭：完整模式是 number fault，--staged 是 W6c。
- Evidence: generate-redirects.ts:272 `${slug} (${brief}) has no declaration ${declaration}, so no number`；:487 W6c `... is a ... brief, but the index holds no challenge declaration ${fault.missing}, so CI would fail this commit.`。
- Impact: pnpm redirects:generate、create:challenge 的 W1 跟 hook 對同一種錯說法不同，老師比對時較難對應。
- Suggested fix: 讓兩種模式共用 briefFaults 的偵測，只在輸出前綴上有差別。

#### STD-G2-23 · low · confidence low · smell

- Where: `scripts/generate-redirects.ts:229`
- Requirement: 錯誤訊息須指出衝突的對象
- Summary: D150 的訊息算出了佔用該編號的題目（holder），卻沒有把它印出來。
- Evidence: generate-redirects.ts:226-230 `const holder = padded.get(name); if (holder !== undefined && holder !== name) { faults.push(`redirects: challenge slug ${jsonStringifyEscaped(name)} equals challenge ${name}'s padded number`) }`。
- Impact: 老師得自己去找哪一題的編號是 name；「challenge 001's」也可能被讀成 slug 為 001 的題目本身。
- Suggested fix: 在訊息加上 holder，例如 `equals the padded number of challenge ${holder}`（若 spec 規定了原文，請先對照 D150）。

#### STD-G2-24 · low · confidence high · smell

- Where: `scripts/challenge-validate.ts:140`
- Requirement: task 重點「message text with more than one source」；BRIEF_KEYS 是允許鍵的唯一來源
- Summary: 「說明頁只能有 title、description、layout」寫死在兩處訊息，沒有從 BRIEF_KEYS 產生。
- Evidence: challenge-validate.ts:140 `a brief holds only title, description and layout`；.vitepress/challenge/plugin.ts:150 `a brief may carry only title, description and layout`；config.ts:8 `export const BRIEF_KEYS = ['title', 'description', 'layout'] as const`。
- Impact: BRIEF_KEYS 一改，兩則訊息就會跟實際檢查不一致。
- Suggested fix: 兩處都改用 `BRIEF_KEYS.join(', ')` 組字串。

#### STD-G2-25 · low · confidence high · smell

- Where: `scripts/create-challenge.ts:123`
- Requirement: task 重點「slug grammar ... message text with more than one source」
- Summary: slug 文法已統一成 SLUG_GRAMMAR，但說明文法的訊息仍有兩個來源。
- Evidence: create-challenge.ts:123 `Must be kebab-case (lowercase alphanumeric and hyphens only).`；generate-redirects.ts slugFaults `is outside ${SLUG_GRAMMAR.source}`。
- Impact: 兩個工具對同一條規則的說法不同；文法調整時散文版容易沒跟上。
- Suggested fix: 在 shortLink.ts 旁匯出一句 `SLUG_GRAMMAR_TEXT`，兩邊共用。

#### STD-G2-26 · low · confidence low · partial-behaviour

- Where: `scripts/create-challenge.ts:376`
- Requirement: create-challenge.ts 檔頭 exit status：「1 invalid argument ... nothing was written」；D150
- Summary: create:challenge 只用 SLUG_GRAMMAR 檢查 --name，不檢查 D150（slug 等於別題補零後的編號），會先寫出 scaffold，到 _redirects 才失敗（exit 2）。
- Evidence: create-challenge.ts:118-125 只有 `SLUG_GRAMMAR.test(slug)`；generate-redirects.ts slugFaults 才檢查 `/^[0-9]+$/` 與 padded number；writeRedirects 在 scaffold 與 keygen 之後才呼叫。
- Impact: `pnpm create:challenge --name 001` 在已有 1 號題目時會寫出整套檔案並跑完 keygen，再以 W1 失敗，老師得手動清理；同一條 slug 規則被切成兩個工具分別執行。
- Suggested fix: 在 collision 檢查後、寫檔前呼叫與 slugFaults 相同的檢查，失敗時 exit 1。

#### STD-G2-27 · low · confidence medium · smell

- Where: `scripts/create-challenge.ts:376`
- Requirement: CLI exit code 與未捕捉例外（task 重點）
- Summary: nextChallengeNumber 從參數驗證的 try 裡移出來，它丟出的例外現在變成未捕捉例外。
- Evidence: 舊版 `opts = { ...validateArgs(values as RawArgs), number: nextChallengeNumber(root) }` 在 try 內，失敗時 return 1；新版 :374-377 `const opts: ScaffoldOptions = { ...args, title: ..., number: nextChallengeNumber(root) }` 在任何 try 之外。challenge-numbers.ts 的 readLegacyRetiredNumber 呼叫 readFileSync 時沒有 try。
- Impact: .archive/challenge/<slug>/index.md 不可讀（權限、或是目錄）時，CLI 以 stack trace 結束，不是檔頭說的狀態碼與訊息。
- Suggested fix: 把 nextChallengeNumber 包進 try，失敗時印 `Error: ...` 並 return 1（此時尚未寫檔）。

#### STD-G2-28 · low · confidence low · smell

- Where: `scripts/challenge-validate.ts:338`
- Requirement: CLI exit code 與未捕捉例外（task 重點）
- Summary: Check 9 用 existsSync 判斷說明頁存在，接著 checkBrief 直接 readFileSync；index.md 是目錄時會丟 EISDIR，整個 validate 中止。
- Evidence: challenge-validate.ts:338 `if (existsSync(briefPath)) { checks.push(checkBrief(briefPath, locale, slug)) }`；checkBrief 內 `parseMd(readFileSync(briefPath, 'utf-8'))` 沒有 try。
- Impact: 單一題目的異常結構讓整個 `pnpm challenge:validate` 以 stack trace 結束，不會列出其他題目的檢查結果。
- Suggested fix: 改用與 D127 一致的「一般檔案」判斷，或在 checkBrief 捕捉讀檔錯誤並回傳失敗的 CheckResult。

#### STD-G2-29 · low · confidence high · smell

- Where: `scripts/challenge-validate.ts:431`
- Requirement: smell-baseline: Duplicated Code（重複讀取）
- Summary: main 已讀過主語系，但 validateChallenge(root, slug) 沒傳入，每一題都重讀 range.json 一次。
- Evidence: challenge-validate.ts:411 `const primary = readPrimaryLocale(join(root, 'range.json'))`（作用域只在 try 內）；:431 `const result = validateChallenge(root, slug)`；validateChallenge 內 `const primary = primaryLocale ?? readPrimaryLocale(join(root, 'range.json'))`。
- Impact: 多餘的 I/O；更重要的是 range.json 在第一次讀取後才出錯時，錯誤會從 validateChallenge 丟出未捕捉的 SiteLayoutError（main 的 catch 只包第一次讀取），不再是純 PL 行。
- Suggested fix: 把 primary 提到 try 外，傳給 validateChallenge(root, slug, primary)。

#### STD-G2-30 · low · confidence low · partial-behaviour

- Where: `scripts/challenge-analyze.ts:384`
- Requirement: D19（先讀 range.json 再做 layout check）；validate、keygen、create:challenge、redirects:generate 都依這個順序
- Summary: challenge:analyze 只讀主語系，不做 checkSourceLayout，是唯一沒有 layout check 的 CLI。
- Evidence: challenge-analyze.ts:381-391 只有 `primary = readPrimaryLocale(join(root, 'range.json'))`；對照 challenge-validate.ts:411-413、challenge-keygen.ts main、create-challenge.ts run 都接著呼叫 `checkSourceLayout(join(root, 'platform'), primary)`。
- Impact: 舊版面的靶場跑 analyze 時，會得到「No challenge files found」之類的間接訊息，而不是 PL-E08 的搬家指引。是否屬於 D19 的範圍需對照 spec。
- Suggested fix: 若 D19 涵蓋 analyze，就在讀完主語系後加上 checkSourceLayout；不涵蓋的話在檔頭註明原因。

#### STD-G2-31 · low · confidence medium · smell

- Where: `scripts/fork-init.ts:854`
- Requirement: smell-baseline: Duplicated Code（語系清單 .vitepress/locales.ts 是唯一來源，D4/D115）
- Summary: fork-init 把首頁路徑的語系寫死成 en 與 zh-TW。
- Evidence: fork-init.ts:854 `const PLATFORM_HOME_RELS = ['platform/en/index.md', 'platform/zh-TW/index.md'] as const`；:1434-1436 每個都必須存在，否則 `A7: ${file} is missing`。
- Impact: 語系清單擴充時不會跟著變；拿掉某個翻譯首頁的靶場（GLOSSARY.md:409 允許只用主語系）跑 `--site-name` 會被拒絕。若 fork-init 刻意不 import .vitepress，至少應有註解說明。
- Suggested fix: 從 LOCALES 推導（如果 fork-init 可以 import locales.ts，它本身沒有任何 import），或改成只要求主語系首頁、其他存在才改。

#### STD-G2-32 · low · confidence high · smell

- Where: `scripts/challenge-keygen.ts:624`
- Requirement: smell-baseline（移除分支後留下無意義的結構）
- Summary: 拿掉舊版面分支後，留下一個沒有條件的 `{ ... }` 區塊。
- Evidence: challenge-keygen.ts:624 `{` … :658 `}`，前一行是 `let flagContent: string`；舊版是 `if (isPerFolder && srcDir && existsSync(srcDir)) { ... } else { ...legacy... }`。
- Impact: 讀者會以為這裡少了條件或是刻意限制作用域，增加閱讀成本。
- Suggested fix: 拿掉大括號，內容往外縮排一層。

#### STD-G2-33 · low · confidence medium · smell

- Where: `scripts/wxl-solver/build-player-package.ts:9`
- Requirement: 註解不應複製常數（DEFAULT_PRIMARY_LOCALE 是唯一來源）
- Summary: 檔頭註解寫死「absent means zh-TW」。
- Evidence: build-player-package.ts:8-9 `(the primary locale is read from range.json; absent means zh-TW)`；.vitepress/locales.ts:9 `DEFAULT_PRIMARY_LOCALE: Locale = 'zh-TW'`。
- Impact: 預設值一改，註解就會過時。
- Suggested fix: 改寫成「absent means DEFAULT_PRIMARY_LOCALE」。

#### STD-G2-34 · low · confidence medium · smell

- Where: `scripts/create-challenge.ts:7`
- Requirement: 註解不應複製常數（DEFAULT_PRIMARY_LOCALE 是唯一來源）
- Summary: 檔頭註解寫死「zh-TW when it says nothing」。
- Evidence: create-challenge.ts:7 `` `P` comes from range.json (zh-TW when it says nothing). ``
- Impact: 預設主語系一改，註解就會過時。
- Suggested fix: 改寫成「DEFAULT_PRIMARY_LOCALE when it says nothing」。

### Standards · G3 (31 findings: 0 high, 3 medium, 28 low)

Coverage: 全文讀過的 G3 diff 檔（20 個）：AGENTS.md、README.md、README.en.md、GLOSSARY.md、CONTRIBUTE.md、.claude/skills/wxl-create/SKILL.md、.agents/skills/wxl-create/SKILL.md、.claude/skills/wxl-create/SKILL.zhTW.md、.claude/skills/wxl-create/reference/agent-tools.md、.claude/skills/wxl-mutate/SKILL.md、.claude/skills/wxl-verify/SKILL.md、.proj.specs/0010-primary-locale-layout/traceability.md、docs/adr/0008-…、docs/agents/challenge-pipeline.md、env.d.ts、create-wxl/src/merge-plan.mjs，以及 create-wxl/test 的 engine-apply、helpers/fixtures、layout-move、upgrade-report、fixtures/page-predicate.json。

沒有開啟 diff、只靠 blob id 比對的檔案（4 個）：.agents/skills/wxl-create/SKILL.zhTW.md、.agents/skills/wxl-create/reference/agent-tools.md、.agents/skills/wxl-mutate/SKILL.md、.agents/skills/wxl-verify/SKILL.md。它們 diff 的 index 行（fee7b0d..9ec8f55、b56d0b1..b3f9e69、379d584..4458088、af8fe3d..c2181f7）跟 .claude 對應檔完全相同，所以兩棵 skill 樹這次改的內容逐位元組一致。.agents/skills/wxl-create/SKILL.md 有實際開來讀，內容也跟 .claude 版相同。

AGENTS.md 只有兩個 hunk（Repository layout 的兩行，以及 pnpm test:smoke 那一行），跟票 3059-3074 行核准的內容逐字相符，這部分沒有發現問題。traceability.md 改到的地方包括：Orphan 列、create:challenge 列、Y-q1（1733）列，這三處都核准過；1742 與 1745 兩列沒找到核准（STD-G3-28）；另外有修訂 2.3 一節，票 3924-3927 行有核准。

讀過的 checkout 檔案與範圍：docs/agents/language.md（全文）、docs/agents/challenge-pipeline.md（全文）、docs/agents/platform-notes.md（40-70 行）、README.md 85-124 行、GLOSSARY.md 1-30 與 113-124 行、smell-baseline.md、platform/challenge/door-is-open/challenge.yaml、platform/zh-TW/challenge/door-is-open/index.md 開頭幾行、create-wxl/src/pristine.mjs 95-105 行、create-wxl/src/merge-apply.mjs 30-120 行、scripts/generate-redirects.ts 460-510 行、scripts/challenge-keygen.ts 595-620 行。票 T-0077 讀了 1-196、1000-1019、2751-2812、3034-3248、3905-3929 行；traceability.md 讀了 1893 行與 2000-2006 行（B84-B90），其餘用 grep 抽查。

另外用 grep 掃過 docs/、所有 wxl-* skill、README 與 CONTRIBUTE 裡過時的 frontmatter／index.md／zh-TW 路徑。沒有通讀的有：traceability.md 其餘部分、spec.en.md、docs/agents/review.md 與 runtime.md（這兩份沒有讀，嚴重度是照任務給的 high／medium／low 判斷），以及 G1、G2、G4、G5 各組。.vitepress/theme/index.ts:246 的註解還寫著 platform/challenges.md，這個檔案屬於 G1，所以沒有列成 finding。

Missing context: traceability.md B90 引用的 GLOSSARY 工作樹 blob `a2ac5b6:GLOSSARY.md`／`b307335`：這裡無法執行 git show，所以沒辦法確認 brief page（說明頁）這個英文詞頭與 446-449 行，是不是逐字照 stage 1 的 blob 寫的（STD-G3-27、STD-G3-01 到 03）。; spec.en.md 的 K-9、D52 與 B84-B87 原文：只透過 traceability.md 的 B 列和 spec.zh-TW.md:128 間接讀到，沒有讀規格本文。; 票中「19 個 Deferred to stage 6 區塊」的完整清單：只讀了 8a、8b、5f、5g 與第 9 段的部分；其他段延後到 stage 6 的 G3 項目，可能已經有人記錄過。; pre-commit hook 實際印到終端機的 W6a 訊息：只讀了 scripts/generate-redirects.ts 的 briefFaultLine，沒有讀 scripts/pre-commit.sh 有沒有另外加前綴代碼（STD-G3-08）。

#### STD-G3-01 · medium · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:446`
- Requirement: traceability.md:2006 B90「so `main` never describes behaviour it does not have (AGENTS.md's same-change rule, K-9)」；票 Context「The upgrade's move is T-0081's (T4)」
- Summary: 搬家詞條的定義句把「升級時先替老師搬家」寫成現有行為，但升級搬家要到 T-0081 才落地。
- Evidence: GLOSSARY.md:446「升級時看到舊版面就先替老師搬家再合併；不經升級的靶場由老師照文件自己搬。」；create-wxl/src 裡沒有任何程式讀寫 primaryLocale 或在升級時呼叫 planLayoutMove（只有 layout-move.mjs 的純函式與測試）；8a 段已把這一點列為 stage 6 的 P2（票 3050、3054 行）。
- Impact: T-0077 合併後到 T-0081 落地前，main 上的詞彙表描述了 main 沒有的行為。老師依詞彙表以為升級會替他搬家，實際上升級後建置會停在 PL-E08。
- Suggested fix: 把這一句移到 T-0081 再寫（像 U135 兩句一樣），或先改成「搬家目前由老師照 README 自己做」，等 T-0081 再補上升級的部分。

#### STD-G3-04 · medium · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:400`
- Requirement: traceability.md:2006 B90 的 K-9（main 不描述沒有的行為）與 B90 要求的「upstream has every page in every locale」互相衝突；票 Context 說 T-0080 才補繁中參考頁
- Summary: 主語系定義寫「上游的每一頁在每個語系都有版本」，但這個 branch 上 platform/zh-TW/reference/ 沒有 attack-log-export-format 的翻譯，T-0080 才補。
- Evidence: GLOSSARY.md:400「上游的每一頁在每個語系都有版本」；Glob platform/*/reference/*.md 只找到 platform/en/reference/attack-log-export-format.md。票 3053 行已記錄，並說這是規格問題。
- Impact: T-0077 合併後到 T-0080 之前，詞彙表的定義與上游實況不符，而且這正是 K-9 想避免的狀況。
- Suggested fix: 請使用者裁決：把這半句延到 T-0080，或在 T-0077 先寫「上游的頁面在每個語系都有版本（匯出格式參考頁的繁中版由後續補上）」。

#### STD-G3-06 · medium · confidence high · deferred-p2-regraded

- Where: `README.md:251`
- Requirement: K-9（traceability.md:2006）；票 Context「The upgrade's move is T-0081's (T4)」；docs/agents/language.md:16（README.en.md 是英文對照版，同一段兩份）
- Summary: 「搬到語系資料夾」開頭說沒有用 pnpm range:upgrade 升級過的靶場才可能還是舊版面，暗示升級會替靶場搬家；這要到 T-0081 才成立。README.en.md:260 同一段也一樣。
- Evidence: README.md:251「不是用 `npm create wxl` 建立、也沒有用 `pnpm range:upgrade` 升級的靶場（例如直接 fork 的靶場），頁面可能還在舊版面」；README.en.md:260「has not been upgraded with `pnpm range:upgrade`」。B84 的規格文字是「a range that does not use the upgrade (a fork without `range.json`)」。
- Impact: T-0081 之前，用 npm create wxl 建立的舊版靶場跑 range:upgrade 不會被搬家，但 README 讓老師以為不必自己搬。
- Suggested fix: 在 T-0081 之前改成照 B84 的寫法（不經升級、沒有 range.json 的 fork），或補一句「升級自動搬家由後續版本提供」。

#### STD-G3-02 · low · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:448`
- Requirement: traceability.md:2006 B90 / K-9（main 不描述沒有的行為）
- Summary: 搬家詞條的【易混】行描述「升級報告裡搬過的路徑另外列出」，這是 T-0081 的升級報告行為。
- Evidence: GLOSSARY.md:448「把升級報告裡搬過的路徑讀成被刪掉的檔案——舊路徑不見了，是因為內容換到了新路徑；報告把它們另外列出，不算進刪除的檔案。」票 3054 行已記錄同一點。
- Impact: 現行 upgrade 報告沒有「搬過的路徑」這一類，讀者會找不到詞彙表描述的報告區段。
- Suggested fix: 移到 T-0081 一起寫，或在 T-0077 先刪除這一行。

#### STD-G3-03 · low · confidence medium · standard-breach

- Where: `GLOSSARY.md:449`
- Requirement: traceability.md:2006 B90 / K-9
- Summary: 搬家詞條另一行【易混】說「其他差異由升級的三方合併處理」，前提也是升級會先搬家，同樣是 T-0081 的行為；這一行不在先前延後的 P2 清單裡。
- Evidence: GLOSSARY.md:449「搬家只換路徑、抽出題目宣告，其他差異（例如頁面之間的相對連結）由升級的三方合併處理。」
- Impact: 跟 STD-G3-01 同一類：main 在 T-0081 之前就描述升級搬家之後的合併流程。
- Suggested fix: 跟 446、448 行一起延到 T-0081，或改寫成不提到升級的說法。

#### STD-G3-05 · low · confidence high · spec-inconsistency

- Where: `docs/adr/0008-locale-folders-primary-chosen-at-build.md:16`
- Requirement: traceability.md:2003 B87（「holds … for upstream (D52)」）與 traceability.md:2006 B90 的 K-9 互相衝突
- Summary: ADR-0008 新加的註記說「每一頁必須存在」對上游自己的頁面成立，這在 T-0080 之前同樣不成立；這一點不在先前延後的 P2 清單裡。
- Evidence: ADR-0008:16-17「holds for challenge briefs (…) and for upstream's own pages.」；上游的 platform/zh-TW/reference/ 目前沒有任何頁面。
- Impact: ADR 的註記在 T-0077 到 T-0080 之間與實況不符，跟 GLOSSARY:400 是同一個缺口。
- Suggested fix: 跟 STD-G3-04 一起裁決：延到 T-0080，或加註「T-0080 之後」。

#### STD-G3-07 · low · confidence high · deferred-p2-regraded

- Where: `README.md:264`
- Requirement: K-9（traceability.md:2006）；B84（traceability.md:2000）要求這句，所以是規格內部的衝突
- Summary: smoke-fixtures 保留名稱那一句寫「手動搬或升級搬都一樣」，把升級搬家寫成現有行為。README.en.md:273「by hand or by the upgrade」也一樣。
- Evidence: README.md:264「（手動搬或升級搬都一樣）」；README.en.md:273「by hand or by the upgrade」。
- Impact: 在 T-0081 之前，升級不會搬頁面，這半句描述了不存在的路徑。
- Suggested fix: T-0077 先拿掉「或升級搬」，T-0081 再補回；或請使用者確認接受 B84 的原文。

#### STD-G3-08 · low · confidence high · incorrect

- Where: `README.md:245`
- Requirement: B85（traceability.md:2001）要求寫「refused by the hook with W6a naming it」；但老師實際看得到的 hook 訊息要能對得上 README
- Summary: README 告訴老師 hook 會「以 W6a 擋下 commit」，但 hook 印出的那一行沒有 W6a 這個代碼。W6a 是規格內部的訊息編號，跟 PL-E 系列不同，不會出現在輸出裡。README.en.md:254 也一樣。
- Evidence: README.md:245「hook 會以 W6a 擋下 commit 並指出是哪一題」；scripts/generate-redirects.ts:481-495 `briefFaultLine` 輸出「✗ … is a … brief, but the index holds no …, so CI would fail this commit.」，沒有任何代碼。
- Impact: 老師拿 W6a 去對照終端機訊息會找不到；用代碼搜尋 README 的使用者也對不上。
- Suggested fix: README 改成描述訊息內容（例如「hook 會指出缺主語系說明頁的那一題並擋下 commit」）；或讓 hook 的訊息帶上代碼。前者要回頭修 B85 的文字。

#### STD-G3-09 · low · confidence high · deferred-p2-regraded

- Where: `README.en.md:336`
- Requirement: AGENTS.md「Domain vocabulary lives in GLOSSARY.md … use its terms」；GLOSSARY.md:406-407 locale list（語系清單）指平台可用的語系組
- Summary: 英文版短連結段寫「carry the locale list's code」，誤用 GLOSSARY 的「locale list」一詞；原意是複製按鈕所在題目清單的語系代碼。繁中版寫的是「帶清單的語系代碼」，沒有這個問題，所以兩語不對等。
- Evidence: README.en.md:336「Copied short links carry the locale list's code on either primary locale」；README.md:327「兩種主語系下都帶清單的語系代碼」。
- Impact: 讀者會以為短連結帶的是平台語系清單上的某個代碼，跟 GLOSSARY 的定義衝突。
- Suggested fix: 改成「carry the locale code of the list or page they are copied from」。

#### STD-G3-10 · low · confidence high · deferred-p2-regraded

- Where: `README.md:262`
- Requirement: traceability.md:2000 B84「without it `pnpm range:upgrade` stops with UP-E06 `upstream` until epic 0011」
- Summary: B84 的結尾句少了「直到 epic 0011」與 `upstream` 原因。README.en.md:271 也一樣。
- Evidence: README.md:262「否則會停在 UP-E06。」；README.en.md:271「without it `pnpm range:upgrade` stops with UP-E06.」
- Impact: 讀者不知道這是暫時的限制，也不知道 UP-E06 這時的原因是 `upstream`。
- Suggested fix: 補上「（原因是 `upstream`，epic 0011 之前）」，兩種語言都要補。

#### STD-G3-11 · low · confidence high · deferred-p2-regraded

- Where: `README.md:98`
- Requirement: 票 Context「every document the switch makes false」；Y97（README 題目格式）
- Summary: 架構圖仍寫「Challenge pages (Markdown + YAML frontmatter)」，但題目宣告已經搬到 challenge.yaml，說明頁只剩三個 key。README.en.md:98 也一樣。
- Evidence: README.md:98「│   ├── Challenge pages (Markdown + YAML frontmatter)」，同一份檔案 120 行卻說設定寫在 challenge.yaml。
- Impact: 同一份 README 前後說法不一，新讀者會以為題目設定還寫在 frontmatter。
- Suggested fix: 改成「Challenge pages (per-locale Markdown briefs + challenge.yaml declaration)」，兩份 README 都要改。

#### STD-G3-12 · low · confidence high · standard-breach

- Where: `README.md:262`
- Requirement: docs/agents/language.md:20-24（繁體中文採台灣慣用寫法）；GLOSSARY.md:419 自己就寫「整棵繁中頁面樹」
- Summary: 「這個樹」的量詞不對，台灣慣用的是「這棵樹」。
- Evidence: README.md:262「根目錄有了 `range.json`，這個樹就算靶場」
- Impact: 讀起來不通順，也跟 GLOSSARY 的用法不一致。
- Suggested fix: 改成「這棵樹」或「這份工作目錄」。

#### STD-G3-13 · low · confidence medium · incorrect

- Where: `README.md:138`
- Requirement: GLOSSARY.md:423-424 說明頁：「一道題目一定有主語系的說明頁，其他語系的說明頁是翻譯」；GLOSSARY.md:400
- Summary: 「每個語系各有一份說明頁」讀起來像每個語系都必須有說明頁，但規則是只有主語系那一份必備。README.en.md:138「Each locale has its own brief」也一樣。
- Evidence: README.md:138「每個語系各有一份說明頁 `platform/<語系代碼>/challenge/<slug>/index.md`」
- Impact: 老師可能以為每道題目都要先翻譯好才能建置或 commit。
- Suggested fix: 改成「說明頁依語系放在 `platform/<語系代碼>/challenge/<slug>/index.md`；主語系那一份必備，其他語系是翻譯、可以沒有」。

#### STD-G3-14 · low · confidence medium · smell

- Where: `README.md:231`
- Requirement: smell-baseline.md「Duplicated Code」（文件版）
- Summary: Duplicated Code：PL-E01 到 PL-E06 在同一份 README 寫了兩次，一次在「設定紀錄與主語系」的條列（231），一次在 PL 代碼清單（274-279），用字不同。README.en.md:240 與 283-288 也一樣。
- Evidence: README.md:231「PL-E01 `range.json` 不是一般檔案（目錄、符號連結等…）；PL-E02 讀不到檔案…」；README.md:274 以後又逐條列出 PL-E01…PL-E06 的原因與修法。
- Impact: 之後改錯誤訊息時要同步改四個地方（兩種語言各兩處），容易漂移。B84 與 B86 都要求列出，所以是規格造成的重複。
- Suggested fix: 設定紀錄那一節只寫「讀不了或值不對時建置會以 PL-E01–PL-E06 中止，見下方代碼清單」，再連到清單。

#### STD-G3-15 · low · confidence medium · smell

- Where: `README.md:232`
- Requirement: smell-baseline.md「Mysterious Name」；docs/agents/language.md:16（README 是給使用者的文件）
- Summary: Mysterious Name：給老師看的 README 寫了內部規劃編號「epic 0011」，老師沒辦法知道它是什麼、什麼時候會來。README.en.md:241 也一樣。
- Evidence: README.md:232「在 epic 0011 之前沒有工具代勞」；README.en.md:241「Until epic 0011 no tool does this for you」。B86 要求這麼寫。
- Impact: 讀者看不懂時間點；fork 出去的靶場也沒有 .proj.specs 可以查。
- Suggested fix: 改成「目前沒有工具代勞」或「之後的版本才會提供工具」；B86 的文字要跟著調整。

#### STD-G3-16 · low · confidence high · deferred-p2-regraded

- Where: `CONTRIBUTE.md:163`
- Requirement: 文件內部一致（同一段前後兩句）
- Summary: 同一段先說不要手改 challenge.yaml，接著又說 challenge.yaml「被 retype 或手動」改過時要重啟 pnpm dev。
- Evidence: CONTRIBUTE.md:163「do **not** edit `challenge.yaml` … by hand」以及同段「If `pnpm dev` is running when `challenge.yaml` changes (by a retype or by hand), restart `pnpm dev`」。
- Impact: 讀者分不清到底能不能手改 challenge.yaml。
- Suggested fix: 把禁止範圍寫清楚，例如「do not edit the four retype-owned keys by hand」，跟 wxl-mutate 一致。

#### STD-G3-17 · low · confidence medium · smell

- Where: `CONTRIBUTE.md:163`
- Requirement: smell-baseline.md「Duplicated Code」（同一條規則分散寫在幾個地方，而且已經不一致）
- Summary: 「哪些東西不能手改」在三處的說法不同：CONTRIBUTE 禁止手改整份 challenge.yaml；wxl-mutate 只禁止四個 retype 管的 key；wxl-create Step 4 叫 agent 直接 Edit challenge.yaml 的 tags、source_visible、packages，其中 tags 是 retype 管的 key。
- Evidence: CONTRIBUTE.md:163「do **not** edit `challenge.yaml`」；.claude/skills/wxl-mutate/SKILL.md:46「did not edit the four retype-owned keys of `challenge.yaml` directly」；.claude/skills/wxl-create/SKILL.md:134「Edit it to set `tags` …, `source_visible: false`, and `packages`」。
- Impact: 人跟 agent 看到互相矛盾的規則。這個不一致在舊版（frontmatter）就有，這次搬到 challenge.yaml 後沒有收斂。
- Suggested fix: 選一個地方當正式來源（例如 CONTRIBUTE），寫明「四個 retype key 只能透過 retype 改；scaffold 剛建好時 wxl-create 可以填 tags」，另外兩處改成引用它。

#### STD-G3-18 · low · confidence medium · deferred-p2-regraded

- Where: `.claude/skills/wxl-create/SKILL.md:175`
- Requirement: docs/agents/language.md:10（SKILL.md 給 agent 讀，用語要讓 agent 不會誤讀）
- Summary: Step 6 用 `pnpm docs:dev` 檢查伺服器能不能連，但新加的句子要求改 challenge.yaml 後重啟 `pnpm dev`。兩個指令名不同，而且這句緊接在「此步勿動 challenge.yaml」之後，讀起來像矛盾。SKILL.zhTW.md:154 與 .agents 的兩份對應檔也一樣。
- Evidence: 「If `pnpm docs:dev` is not reachable … Do NOT touch the spec file, the brief, `challenge.yaml`, or `flag.txt` in this step. After any edit to `challenge.yaml`, restart `pnpm dev`.」
- Impact: agent 可能重啟錯伺服器，或以為這一步也要改 challenge.yaml。
- Suggested fix: 把重啟句移到 Step 4 結尾，指令名統一用 Step 6 探測的 `pnpm docs:dev`（或說明兩者的關係）。

#### STD-G3-19 · low · confidence medium · partial-behaviour

- Where: `.claude/skills/wxl-create/SKILL.md:103`
- Requirement: Y94（skill 依新版面找到說明頁）；同一段「do not work out the primary locale folder yourself」
- Summary: 只有 exit 0 的分支說明說明頁路徑要從 `✓ Scaffold created:` 之後那一行取。exit 2 會繼續 Step 3，exit 3 之後可能在新 session 從 Step 3 接續，這兩種情況都沒交代 Step 4 需要的說明頁路徑從哪裡來，同時又禁止 agent 自己推算主語系資料夾。zhTW 版與 .agents 對應檔也一樣。
- Evidence: SKILL.md:103「Exit status 0: … The brief's path is the first line `create:challenge` prints after `✓ Scaffold created:`」；104-106 exit 2/3 只說「Keep `platform/challenge/<slug>/`」，沒有提到說明頁路徑。scripts/create-challenge.ts:399-403 的 scaffold 行在 keygen 之前就印出了。
- Impact: 從 exit 3 接續時，agent 拿不到說明頁路徑，又被禁止推算，可能卡住或違反規則。
- Suggested fix: 把取路徑那句移到三種分支共用的位置；exit 3 接續時，指示從 `range.json` 讀主語系，或重新查看先前的輸出。

#### STD-G3-20 · low · confidence medium · standard-breach

- Where: `.claude/skills/wxl-create/SKILL.zhTW.md:120`
- Requirement: AGENTS.md「Read [GLOSSARY.md] before naming anything in a spec, an interface string, or a document」；GLOSSARY.md:423 brief page（說明頁）
- Summary: 繁中 skill 的新段落在中文句子裡用英文「brief」指檔案，沒有用 GLOSSARY 的正式用語「說明頁」。同一段又用「委託書」，讀者分不清兩者的差別。.agents 的 SKILL.zhTW.md 是同一個 blob。
- Evidence: SKILL.zhTW.md:120「### Step 4：更新 brief 與 `challenge.yaml` 並撰寫委託書」；124「讀 brief（`platform/<P>/challenge/<slug>/index.md`）」；142「brief 的 frontmatter 含 `description`」。
- Impact: 跟這次新增的 GLOSSARY 詞條不一致，也讓說明頁（檔案）和委託書（體裁）混在一起。
- Suggested fix: 把指檔案的「brief」改成「說明頁」，兩個 skill 樹要同步改（PAT6）。

#### STD-G3-21 · low · confidence medium · smell

- Where: `.claude/skills/wxl-create/SKILL.md:130`
- Requirement: smell-baseline.md「Mysterious Name」；GLOSSARY.md:115 engagement brief 與 GLOSSARY.md:423 brief page 是兩個不同的概念
- Summary: Mysterious Name：Step 4 的標題同時用「brief」（檔案）和「engagement brief」（體裁），而 GLOSSARY 給檔案的英文用語是「brief page」。
- Evidence: SKILL.md:130「### Step 4: Update the brief and `challenge.yaml`, and write the engagement brief」
- Impact: agent 可能把「更新 brief」和「寫 engagement brief」當成同一件事，或當成兩個不同的檔案。
- Suggested fix: 指檔案時寫「brief page」，或在 skill 開頭定義「brief = brief page」。

#### STD-G3-22 · low · confidence medium · standard-breach

- Where: `docs/agents/challenge-pipeline.md:13`
- Requirement: AGENTS.md GLOSSARY 用語規則；GLOSSARY.md:115-117（engagement brief 是題目正文的體裁）與 GLOSSARY.md:423（brief page 是一道題目在某個語系的那一頁）
- Summary: 路徑表把 `platform/<locale>/challenge/<slug>/` 的檔案叫「the engagement brief for that locale」，把體裁名拿來當檔案名；GLOSSARY 這次剛新增 brief page（說明頁）來指這個檔案。
- Evidence: challenge-pipeline.md:13「| `platform/<locale>/challenge/<slug>/` | the engagement brief for that locale (`index.md`); the primary locale's brief is required |」
- Impact: 跟新詞條不一致；同一份文件第 5 行又把 engagement brief 列為 GLOSSARY 定義的詞彙。
- Suggested fix: 改成「the brief page for that locale (`index.md`), whose body is the engagement brief」。

#### STD-G3-23 · low · confidence medium · partial-behaviour

- Where: `docs/agents/challenge-pipeline.md:31`
- Requirement: 票 Context「every document the switch makes false」；Y99
- Summary: stage 4 那一列仍寫「先做題目本身，再做它的繁中說明頁」。切換後上游的主語系是繁中，必備的是繁中說明頁，英文反而是翻譯，所以這句已經不成立。Y99 只改了 12-13 行。
- Evidence: challenge-pipeline.md:31「| 4 | Tickets | `/to-tickets`; usually the challenge itself, then its Traditional Chinese brief |」
- Impact: 拆票的 agent 可能把繁中說明頁當成可以晚點做的翻譯，結果第一張票的 commit 會被 hook 用 W6a 擋下（缺主語系說明頁）。
- Suggested fix: 改成「usually the challenge with its primary-locale brief, then its translations」。

#### STD-G3-24 · low · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:407`
- Requirement: traceability.md:2006 B90「語系清單's … becomes 「清單以外的資料夾裡不能有頁面」」
- Summary: 語系清單詞條多了一個「也」字，跟 B90 指定的句子不完全相同。
- Evidence: GLOSSARY.md:407「清單以外的資料夾裡也不能有頁面」，B90 指定的是「清單以外的資料夾裡不能有頁面」。
- Impact: 意思相同，但不是逐字照規格；之後如果有測試比對子字串，會對不上。
- Suggested fix: 刪掉「也」，跟 B90 逐字一致。

#### STD-G3-25 · low · confidence medium · deferred-p2-regraded

- Where: `GLOSSARY.md:98`
- Requirement: GLOSSARY 詞條內部一致；S71、D30、D58
- Summary: 短連結定義前半說「那個語系沒有這道題目的頁面時，它開主語系那一頁」，後半又說「帶翻譯語系代碼的短連結一律開那個翻譯」，「一律」讀起來跟前面的退回規則衝突。
- Evidence: GLOSSARY.md:98「那個語系沒有這道題目的頁面時，它開主語系那一頁；…帶翻譯語系代碼的短連結一律開那個翻譯。」
- Impact: 讀者會以為翻譯不存在時也會開翻譯頁。
- Suggested fix: 改成「那個翻譯存在時，一律開它，不跟著語系偏好走」。

#### STD-G3-26 · low · confidence medium · spec-inconsistency

- Where: `GLOSSARY.md:384`
- Requirement: GLOSSARY 詞條內部一致；D148（traceability.md 修訂 2.3）要求逐字保留「建立靶場的指令與升級都會寫入它」
- Summary: 設定紀錄詞條前面說它也記老師選的設定值（目前是主語系），後面又說建立指令與升級寫入它時「而且只記從哪一版上游建立」，讀起來像這份紀錄只記版本。
- Evidence: GLOSSARY.md:384「靶場記下自己從哪一版上游建立、以及老師選定的設定值的紀錄；設定值目前只記主語系」與同段「建立靶場的指令與升級都會寫入它，而且只記從哪一版上游建立；主語系目前由老師自己記進去。」
- Impact: 「只記」的主詞不清楚，可能讓人以為 primaryLocale 不該寫在 range.json。這個保留句是 D148 為了 U10 測試特意留下的。
- Suggested fix: 在保留句不變的前提下，把後半改成「它們寫入時只記從哪一版上游建立」；或請使用者確認接受。

#### STD-G3-27 · low · confidence low · standard-breach

- Where: `GLOSSARY.md:423`
- Requirement: GLOSSARY.md:10「詞條同時給程式碼與規格裡的英文用語」
- Summary: 說明頁詞條的英文用語是「brief page」，但程式碼（briefFaults、brief path）、規格、README.en、CONTRIBUTE 與 skill 一律用「brief」。
- Evidence: GLOSSARY.md:423「**brief page（說明頁）**」；scripts/generate-redirects.ts:473「A brief path」、README.en.md:138「its own brief」。
- Impact: 詞彙表的英文用語跟實際用法不一致，搜尋時對不上。
- Suggested fix: 確認 B90 的原始 blob（b307335）是不是就寫 brief page；如果不是，改成「brief（說明頁）」；如果是，在 _Avoid_ 或說明裡註明程式碼簡寫成 brief。

#### STD-G3-28 · low · confidence medium · standard-breach

- Where: `.proj.specs/0010-primary-locale-layout/traceability.md:1742`
- Requirement: traceability.md「Overridden contracts」開頭「Each changes only as stated; stage 6 checks the diff changes nothing else」；票 AC 第 156 行；本次審查的範圍說明（只能改票 Comments 核准過的列）
- Summary: 1742 行（verify L1/L2）與 1745 行（L4 package）的「Now」欄被 segment 5f 的 executor 自行加上註記。票 Comments 裡只有 executor 的自述（「traceability rows 1742 and 1745 annotated」，票 2766 行），找不到 parent 的核准紀錄；1733、1741 與 Orphan 列都有 parent 或計畫的核准。
- Evidence: diff 中 1742 行加上「(stage 5, segment 5f, 2026-11-17: L1 and L2 read `challenge.yaml` (VF1) and range.json first (Y109); …)」，1745 行加上「(stage 5, segment 5f, 2026-11-17: the builder reads the primary locale's brief, PP1 …)」。
- Impact: 內容只是狀態註記，沒有改契約，但這是規格資料夾裡未經核准的編輯，削弱了「只改核准過的列」這條證據鏈。
- Suggested fix: 由使用者追認這兩處註記，或移除，讓這兩列回到 base 的內容。

#### STD-G3-29 · low · confidence medium · smell

- Where: `env.d.ts:21`
- Requirement: smell-baseline.md「Shotgun Surgery」；B18（traceability.md:1893）的精神是不在別處列舉語系（PAT1 只掃 .vitepress 與 platform/shared，掃不到 env.d.ts）
- Summary: Shotgun Surgery：`__WXL_PRIMARY_LOCALE__` 的型別寫死成 `'en' | 'zh-TW'`，跟 `.vitepress/locales.ts:5` 的 LOCALES 重複，而且沒有任何測試釘住兩者相等。
- Evidence: env.d.ts:21「declare const __WXL_PRIMARY_LOCALE__: 'en' | 'zh-TW' | undefined」；註解說明這是因為 env.d.ts 不能 import。
- Impact: 下一個 epic 加 ja 時，這裡沒改也不會有測試失敗，型別會悄悄排除新的語系。
- Suggested fix: 加一個測試（類似 create-wxl 的 U133）比對這個聯集與 LOCALES，或把 PAT1 的掃描範圍擴大到 env.d.ts。

#### STD-G3-30 · low · confidence medium · deferred-p2-regraded

- Where: `docs/adr/0008-locale-folders-primary-chosen-at-build.md:50`
- Requirement: B87（traceability.md:2003）的位置要求已經滿足；這裡只看 Markdown 的呈現
- Summary: 第二則註記是插在 Consequences 清單第 2 項與第 3 項之間的 blockquote，Markdown 呈現時會把清單斷成兩段。
- Evidence: diff 顯示註記插在「A dead link fails the build rather than shipping.」之後、「- A file's path and its URL differ by one segment」之前，前後各有空行。
- Impact: 純外觀問題，清單編號或縮排可能斷開。
- Suggested fix: 縮排成第 2 項的子段落（加兩個空白的 `>`），或維持現狀並記錄為接受。

#### STD-G3-31 · low · confidence low · smell

- Where: `create-wxl/test/layout-move.test.mjs:21`
- Requirement: smell-baseline.md「Feature Envy」；AGENTS.md 說 create-wxl 是有自己 lockfile 的獨立套件
- Summary: Feature Envy：create-wxl 的 U133 測試用正規表示式讀 repo 根目錄的 `.vitepress/locales.ts`，套件測試因此依賴上游 repo 的檔案格式（單行、單引號、`as const`）。
- Evidence: 「readFileSync(new URL('../../.vitepress/locales.ts', import.meta.url), 'utf8')」與「/export const LOCALES = \[([^\]]*)\] as const/」
- Impact: locales.ts 改成多行或雙引號時，這個測試會失敗，但失敗原因跟 create-wxl 本身無關。upgrade-report.test.mjs 已經有 import ../../scripts/fork-init.ts 的前例，所以影響有限。
- Suggested fix: 改用動態 import 讀 LOCALES 的值（Node 22.13 以上可以 strip types），不再解析原始碼字串。

### Standards · G4 (64 findings: 3 high, 13 medium, 48 low)

Coverage: 完整讀過 G4-tests-site 全部 44 個 diff 檔（長檔分段讀完）：tests/site-smoke/{localePath.ts, missing-translation.spec.ts, session-gate-clear-report.spec.ts, site-smoke.spec.ts}；tests/unit/challenge/{config, declaration, plugin-obfuscation, plugin, shortLink, slug}.test.ts；tests/unit/components/{ChallengeList, HomeContent, MergedNav, MissingTranslationLine, ShortLinkShare.mode-default, ShortLinkShare}.test.ts；tests/unit/i18n/{arrival, initial-locale-redirect, locale-switcher, locales, localize-path, messages-shape, not-found-wiring, page-list, page-locale-of, primary-locale-client, route-locale-sync, theme-locale-wiring}.test.ts；tests/unit/layouts/ChallengeLayout-legacy-module.test.ts；tests/unit/site/{challenge-data-loaders, config-base, home-links, layout-error, locales-config, merge-challenges, primary-folder-links, primary-locale, range-collection, redirects-generated, redirects, source-layout, upstream-equality}.test.ts；tests/unit/theme/{challenge-rwd, client-graph-no-smoke-fixtures}.test.ts。manifest 的 G4 沒有 tests/challenges/ 的檔案，所以沒有審到 exploit spec。另外抽讀了幾個 live 檔案取得上下文（config-base、declaration、route-locale-sync、missing-translation、site-smoke 的部分範圍），並查對了 upstreamDecision.ts、smell-baseline、language.md、GLOSSARY（題目宣告、語系與翻譯各詞條）、platform-notes、spec.en.md 的 AC-61 與 Testing Decisions、traceability 的 Overridden contracts（Area B/A/L/S/Y/U）以及 B14/B47/B60/B61/Y38/S56 各列，還有 T-0077 ticket 測試計畫的 B14/B47/Y38 列。沒有逐列核對每一個被修改的既有測試是否都列在 Overridden contracts 表上：只抽查了 config.test、declaration.test、missing-translation、initial-locale-redirect、not-found-wiring、challenge-data-loaders、merge-challenges、redirects*。也沒有實際執行任何測試；凡是「在靶場會失敗」的推論，都是從程式碼與 create:challenge 只寫主語系說明頁推得，沒有在 F-2 上跑過。

Missing context: T-0077 的完整 stage 5 測試計畫表與 Comments（我只讀到 B14/B47/Y38 等幾列），無法確認 Y39、B61、B79 單元版本、door-is-open 案例是否另有使用者核准的豁免; spec 0010 的 D124 完整定義與 disposition 之外，是否有後續修訂把 B60、B61、Y39 列入 upstream-only；目前只看到 disposition.md 行 17 的清單; V-B7（在 F-2 scratch clone 執行 pnpm test --run 與 smoke）的實際結果；若已執行且通過，STD-G4-01/02/05 的「會失敗」推論需要重新對照當時的 range.json 內容; AC-33 對 S-q4 原始碼掃描測試的確切要求（用來判斷 STD-G4-34 是否其實是規格要求）; vitest.config.ts 是否另有 restoreMocks/unstubGlobals 設定（G1 的 diff 不在本組範圍，我只用 grep 確認了沒有 stubGlobal 相關字樣）

#### STD-G4-01 · high · confidence high · standard-breach

- Where: `tests/unit/site/config-base.test.ts:212`
- Requirement: spec.en.md AC-61（行 810–816）與 D124：B14 屬 upstream-only 列，須透過 tests/__helpers__/upstreamDecision.ts 的 upstreamOnlySkipReason 宣告；ticket 測試計畫 B14 列（T-0077 行 3267）：「The real-tree half goes through the helper (D124)」
- Summary: B14 的真實樹那一半（16 組環境變數）沒有經由 upstreamOnlySkipReason 宣告，在靶場裡會直接失敗
- Evidence: describe('the shipped primary locale (B14, B47)', ...) 沒有 skipIf；it.each(COMBOS)('B14: real tree gives "zh-TW" regardless of env ...') 斷言 expect(define?.__WXL_PRIMARY_LOCALE__).toBe('"zh-TW"')
- Impact: P = en 的靶場（F-2，root range.json 記 en）跑 pnpm test --run 時這 16 個案例全部紅燈，違反 AC-61「在 F-2 的 scratch clone 上 pnpm test --run 通過」；也繞過了 stage 6 對 helper 的 grep 檢查
- Suggested fix: 把 B14 真實樹的 it.each 包進 describe.skipIf(upstreamOnlySkipReason(...))，fixture-root 那一半維持無條件執行

#### STD-G4-02 · high · confidence high · standard-breach

- Where: `tests/unit/site/config-base.test.ts:239`
- Requirement: traceability.md B47 列（行 1936）：「On the real tree it is "\"zh-TW\"" (upstream-only, D124)」；ticket 測試計畫 B47 列（行 3299）「Real tree: ... (helper, D124)」；AC-61
- Summary: B47 的真實樹斷言沒有經由 D124 helper 宣告
- Evidence: it('B47: the real tree\'s value is a JSON string, not a bare identifier', ...) → expect(define?.__WXL_PRIMARY_LOCALE__).toBe(JSON.stringify('zh-TW'))，所在 describe 沒有 skipIf
- Impact: 任何 range.json 記 en 的靶場或 fork 都會失敗；與 traceability 及已核准的測試計畫明文不符
- Suggested fix: 將這一案移到 upstreamOnlySkipReason 宣告的 describe.skipIf 之下，或改為由 readPrimaryLocale 推導期望值

#### STD-G4-05 · high · confidence high · standard-breach

- Where: `tests/unit/challenge/plugin.test.ts:244`
- Requirement: AC-61（讀真實樹的測試須由主語系與樹推導期望值）；ticket 測試計畫 Y38 列（行 3606）「slugs and briefs enumerated from the tree」；GLOSSARY 說明頁：題目一定有主語系的說明頁，其他語系是翻譯
- Summary: Y38 對每個題目要求「每個 LOCALES 語系都有說明頁」，不是從樹上列舉，靶場一新增題目就會紅
- Evidence: for (const locale of REAL_LOCALES) { ... expect(existsSync(briefPath)).toBe(true) ...}；同檔註解卻寫「Not upstream-only (AC-61): slugs and the expectation are both derived from the tree」；scripts/create-challenge.ts:382 只寫 platform/${primary}/challenge/<slug>/index.md
- Impact: 老師執行 pnpm create:challenge 後（只有主語系說明頁），unit suite 與靶場 CI 立即失敗；只保留主語系的靶場也全部失敗
- Suggested fix: 只對樹上實際存在的說明頁迭代（existsSync 篩選），並另外斷言主語系說明頁存在

#### STD-G4-03 · medium · confidence high · partial-behaviour

- Where: `tests/unit/site/config-base.test.ts:229`
- Requirement: ticket 測試計畫 B14 列（行 3267）：Fixture root 那一半「"en" in each env」（16 組環境變數各跑一次）
- Summary: B14 的 fixture-root 那一半只在單一環境跑一次，沒有涵蓋計畫列出的 16 組環境變數
- Evidence: it('B14, B14, B47: a fixture root with {"primaryLocale":"en"} gives the JSON string "en"') 只呼叫一次 importFixtureConfig(root)，沒有使用 COMBOS
- Impact: 「primary locale 只來自 root range.json、不受 WXL_PRIMARY_LOCALE 等環境變數影響」在 en 那一側沒有被證明；一個在 P = en 時才讀環境變數的實作不會被抓到
- Suggested fix: 把 fixture-root 案例也改成 it.each(COMBOS)，每組都斷言 "en"

#### STD-G4-04 · medium · confidence medium · spec-inconsistency

- Where: `tests/unit/site/config-base.test.ts:390`
- Requirement: AC-61「every other test that reads the real tree derives its expectation from the primary locale and the tree」對照 traceability B60 列（行 1956）要求字面相等
- Summary: B60 斷言真實設定的 title 等於上游字串，但 fork:init 的 A6 會改寫 title，B60 又不在 D124 upstream-only 清單
- Evidence: expect(mod.default.title).toBe('Web eXploitation Laboratory')；scripts/fork-init.ts:989 A6_CANDIDATE_RE 會改寫 `  title: ...,` 這一行
- Impact: 做過 --rebrand 的 fork／靶場跑 unit suite 會失敗；這是規格 B60 與 D124/AC-61 之間的矛盾，不只是實作問題
- Suggested fix: 請使用者裁決：把 B60 的 title/description 字面斷言列入 D124（經 helper 宣告），或改成只斷言 A6 那一行存在且唯一

#### STD-G4-06 · medium · confidence high · standard-breach

- Where: `tests/unit/site/challenge-data-loaders.test.ts:140`
- Requirement: AC-61；GLOSSARY 語系清單「一個靶場可以只用其中的主語系，不必每個語系都有翻譯」
- Summary: B79 單元測試假設每個 LOCALES 語系資料夾都有 index.md 與 challenges.md
- Evidence: const PAGES = LOCALES.flatMap((code) => [`${code}/index.md`, `${code}/challenges.md`])；it.each(PAGES) 直接 readFileSync(join(PLATFORM, page))
- Impact: 拿掉翻譯首頁或清單頁的靶場會因 ENOENT 失敗；D124 只把 B79 的 smoke 部分列為 upstream-only，這個單元版本卻讀上游自身內容
- Suggested fix: 只檢查實際存在的首頁／清單頁（並斷言主語系那兩頁存在），或經 helper 宣告為 upstream-only

#### STD-G4-07 · medium · confidence high · standard-breach

- Where: `tests/unit/site/redirects.test.ts:532`
- Requirement: D124／AC-61：斷言上游自身內容的測試須經 helper 宣告
- Summary: 「would report a missing primary brief」寫死上游的 door-is-open 題目，卻沒有宣告為 upstream-only
- Evidence: const without = `platform/${P}/challenge/door-is-open/index.md`; expect(paths).toContain(without)
- Impact: 刪掉示範題目的靶場跑 unit suite 會失敗；同檔 001 那一案已用 helper，這一案漏了
- Suggested fix: 改取 indexTrees 中任一個已宣告且有主語系說明頁的 slug，或加上 upstreamOnlySkipReason

#### STD-G4-08 · medium · confidence medium · standard-breach

- Where: `tests/site-smoke/site-smoke.spec.ts:291`
- Requirement: AC-61（smoke suite 在 P = en 的靶場必須通過）；GLOSSARY 翻譯「一頁可以沒有翻譯」
- Summary: Y39 要求樹上至少有一題同時有兩個語系的說明頁
- Evidence: test('there is at least one challenge with a brief in two locale folders', () => { expect(TRANSLATED_SLUGS.length).toBeGreaterThan(0) })
- Impact: 沒有任何翻譯的靶場（合法狀態）跑 smoke suite 會失敗
- Suggested fix: 沒有翻譯題目時以 test.skip 說明原因，或把這個存在性斷言改為 upstream-only（經 helper）

#### STD-G4-09 · medium · confidence medium · standard-breach

- Where: `tests/site-smoke/site-smoke.spec.ts:187`
- Requirement: AC-61；traceability B61 列（行 1957）的期望寫的是「Upstream build」
- Summary: B61 對每個 LOCALES 讀 dist 的 guide/notes 頁，假設每個語系都有這篇上游文章
- Evidence: for (const locale of LOCALES) { expect(navTitleHref(distFile(`${localePath(locale, 'guide/notes').slice(1)}.html`))).toBe(localePath(locale)) }
- Impact: 刪除或未翻譯 guide/notes 的靶場 smoke 會因 ENOENT 失敗；B61 不在 D124 清單中
- Suggested fix: 從 dist 中挑選實際存在的頁面，或經 upstreamOnlySkipReason 宣告

#### STD-G4-18 · medium · confidence medium · partial-behaviour

- Where: `tests/site-smoke/missing-translation.spec.ts:362`
- Requirement: traceability Overridden contracts Area A（行 1654）：「a cold load of an English-only article stays put, with the line, stored none」改為「now no line」；spec Testing Decisions「Every rule that depends on the primary locale runs under both primaries」
- Summary: COLD_LOADS 只對 EN_ONLY 保留 stored zh-TW 一案，原本 stored none / en 的案例被刪除而非翻轉
- Evidence: COLD_LOADS 有三筆 ZH_ONLY（en/null/zh-TW）、一筆 EN_ONLY（zh-TW）；舊的 stored none 與「English-only article with en stored shows no line」測試已移除
- Impact: P = en 時主語系頁的 A1/A2（無偏好、偏好等於 P）以及 P = zh-TW 時翻譯頁無偏好的 A5，在建置後網站上都沒有覆蓋
- Suggested fix: 讓 COLD_LOADS 對兩個 fixture 都跑 null、en、zh-TW 三種 stored

#### STD-G4-23 · medium · confidence high · standard-breach

- Where: `tests/unit/site/source-layout.test.ts:221`
- Requirement: AGENTS.md hard rule 2 與 /tdd：測試必須能失敗；docs/agents/platform-notes.md 行 24–26（macOS 不分大小寫）
- Summary: B22 的 zh-tw／EN 兩案在不分大小寫的檔案系統上直接 return，回報為通過而非 skipped
- Evidence: if (isCaseInsensitiveFs()) { // zh-tw/ and zh-TW/ would collide ... return }（行 221、240）
- Impact: 在開發者的 macOS 上這兩案永遠綠燈、什麼都沒檢查，報表看不出來
- Suggested fix: 改成 it.skipIf(isCaseInsensitiveFs())(...) 讓略過可見

#### STD-G4-24 · medium · confidence high · smell

- Where: `tests/unit/i18n/not-found-wiring.test.ts:1142`
- Requirement: 審查重點：mock 只在成功路徑還原；本檔 initial-locale-redirect 註解記載 happy-dom storage 上的 spy 外洩會汙染後續案例
- Summary: SW06/SW12 的 localStorage.setItem spy 只在斷言成功後才 mockRestore
- Evidence: const setSpy = row.id === 'SW06' || row.id === 'SW12' ? vi.spyOn(window.localStorage, 'setItem') : null ... if (setSpy) { expect(setSpy).toHaveBeenCalledWith(...); setSpy.mockRestore() }
- Impact: 斷言失敗時 spy 外洩，同檔後續案例的寫入判斷會連鎖失真
- Suggested fix: 以 try/finally 包住

#### STD-G4-25 · medium · confidence high · smell

- Where: `tests/unit/i18n/not-found-wiring.test.ts:1199`
- Requirement: 審查重點：mock 只在成功路徑還原
- Summary: 「stay; removes a shown line」案例的 setItem spy 也只在成功路徑還原
- Evidence: const setSpy = vi.spyOn(window.localStorage, 'setItem') ... expect(setSpy).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, own); setSpy.mockRestore()
- Impact: 同上，失敗時連鎖汙染
- Suggested fix: 以 try/finally 包住

#### STD-G4-28 · medium · confidence high · standard-breach

- Where: `tests/unit/challenge/config.test.ts:291`
- Requirement: AGENTS.md hard rule 2／tdd：測試必須能失敗
- Summary: 「does not crash the backend check first」不可能失敗
- Evidence: expect(() => validateChallengeDeclaration({ backend: 'flask', app: 3 })).not.toThrow(/backend must be one of/)；backend 是合法值，不可能產生該訊息，且上一案已用 ^…$ 鎖定 VM12 全文
- Impact: 多一個永遠綠燈的案例，製造覆蓋假象
- Suggested fix: 刪除，或改成 backend 非法且 app 非字串時斷言實際先報哪一個

#### STD-G4-35 · medium · confidence medium · standard-breach

- Where: `tests/unit/i18n/messages-shape.test.ts:192`
- Requirement: tdd／hard rule 2：測試必須能因產品程式碼的變動而失敗
- Summary: GD1 測試驗的是本檔自己定義的 assertTwoLocaleGuard，不是任何產品程式碼
- Evidence: function assertTwoLocaleGuard(...) 定義於測試檔行 179；it('fails with GD1\'s exact message once the list grows past two') 斷言該函式丟出自己寫的字串；註解 S2-m 也承認 production 沒有這個守衛
- Impact: 「GD1 訊息字面相等」實際上是自我比對（tautology），無法偵測任何回歸
- Suggested fix: 若 GD1 需要存在，應放在產品模組並測它；否則只保留「LOCALES.length === 2」的第一案

#### STD-G4-41 · medium · confidence medium · standard-breach

- Where: `tests/unit/site/redirects-generated.test.ts:445`
- Requirement: spec.en.md Testing Decisions 行 826–832：每個依主語系的規則明確設定 P，透過函式參數或 fixture 樹自己的 range.json 選擇 P
- Summary: S23、S24、K5 標題寫 P = zh-TW，卻沒寫 range.json，依賴「沒有 range.json 時預設 zh-TW」
- Evidence: it('S23 the slug rules of P = zh-TW ...', () => { challenge(root, 'first', 1, ['zh-TW']) ... })（行 445、457、522 都沒有 setPrimary）
- Impact: 預設值若改變，這三案會改測另一種主語系而不是失敗在正確原因；預設值本身已由 S10 測過
- Suggested fix: 三案都先 setPrimary(root, 'zh-TW')

#### STD-G4-10 · low · confidence medium · standard-breach

- Where: `tests/site-smoke/site-smoke.spec.ts:1036`
- Requirement: tests/__helpers__/upstreamDecision.ts 行 67–71：D124 的「one declaration point」upstreamOnlySkipReason
- Summary: S08 直接用 realUpstreamDecision 自寫 skip 理由，沒用統一 helper，理由文字在 fork 上也是錯的
- Evidence: test.skip(!realUpstreamDecision(process.cwd()), 'not upstream: S08 depends on upstream\'s own origin (the upstream decision says this tree is a range)')
- Impact: fork 會看到「this tree is a range」的錯誤理由；stage 6 grep helper 時會漏掉這一列。另外 P 改為 zh-TW 後繁中網址已無 /zh-TW/ 段，S08「375 寬會被截斷」的前提是否仍成立值得確認
- Suggested fix: 改用 upstreamOnlySkipReason(UPSTREAM_DECISION_INPUTS...)，並重新確認 S08 前提

#### STD-G4-11 · low · confidence high · smell

- Where: `tests/site-smoke/site-smoke.spec.ts:274`
- Requirement: 審查重點：該迭代 LOCALES 的地方寫死語系對（B18/D4 精神）
- Summary: Primitive Obsession：號碼控制項文字以寫死的 (en|zh-TW) 正規表示式移除語系段
- Evidence: const numberControl = (await text('[data-short-link]'))?.replace(/\/(en|zh-TW)\//, '/') ?? null
- Impact: 語系清單新增第三個語系時，這個比較會悄悄失準
- Suggested fix: 由 LOCALES 組出正規表示式

#### STD-G4-12 · low · confidence high · smell

- Where: `tests/site-smoke/site-smoke.spec.ts:265`
- Requirement: 審查重點：該迭代 LOCALES 的地方寫死語系對
- Summary: declaredView 的參數型別寫死 'en' | 'zh-TW'，同檔已 import Locale
- Evidence: async function declaredView(page: Page, locale: 'en' | 'zh-TW', slug: string)
- Impact: 型別與 LOCALES 脫鉤，增加語系時要散彈式修改
- Suggested fix: 改用 Locale 型別

#### STD-G4-13 · low · confidence high · smell

- Where: `tests/site-smoke/site-smoke.spec.ts:299`
- Requirement: 審查重點：資源只在成功路徑釋放
- Summary: Y39 每輪建立兩個 browser context，從未關閉
- Evidence: const primaryView = await declaredView(await (await browser.newContext()).newPage(), PRIMARY, slug)
- Impact: 題目數增加時累積未關閉的 context，造成記憶體與 flakiness
- Suggested fix: 保存 context 並在 finally 中 close()

#### STD-G4-14 · low · confidence high · smell

- Where: `tests/site-smoke/site-smoke.spec.ts:152`
- Requirement: 審查重點：過時的註解與標題
- Summary: 註解描述的是開發中途狀態（wave 3 尚未完成、問題「記在 ticket Comments、這裡不修」），已不成立
- Evidence: 「All depend on `pnpm docs:build` succeeding on the real, moved tree (wave 3's `./shared/challenges.data.ts` import path, B79) — recorded in the ticket's Comments, not fixed here」；行 15「Every row this wave adds (B48, B59, B70 smoke half, both B81 cases)」漏了 B79
- Impact: 讀者會以為建置仍有已知缺陷
- Suggested fix: 刪除過程性敘述，只保留現行規則

#### STD-G4-15 · low · confidence high · smell

- Where: `tests/site-smoke/site-smoke.spec.ts:36`
- Requirement: smell-baseline: Mysterious Name
- Summary: heroActionsHtml 中把整份文件命名為 main，與上方 mainContent（真正的 <main>）混淆
- Evidence: const main = html
- Impact: 閱讀時誤以為已限定在 <main> 內
- Suggested fix: 直接使用 html 或改名 doc

#### STD-G4-16 · low · confidence medium · smell

- Where: `tests/site-smoke/site-smoke.spec.ts:224`
- Requirement: docs/agents/platform-notes.md 測試穩定性；Playwright 不建議以 networkidle 判斷
- Summary: B81 以 networkidle 取樣網址，屬時序依賴
- Evidence: await page.waitForLoadState('networkidle')
- Impact: 有背景請求（WASM、service worker）時可能 flaky 或過早取樣
- Suggested fix: 改用 expect.poll 觀察 pathname 在一段時間內不變

#### STD-G4-17 · low · confidence high · smell

- Where: `tests/site-smoke/missing-translation.spec.ts:8`
- Requirement: 審查重點：過時的註解
- Summary: 檔頭仍說在「production bundle（pnpm docs:build）」上執行，但本檔現在必須用 WXL_SMOKE_PAGES=1 的測試建置
- Evidence: // Spec 0008 on the production bundle (`pnpm docs:build`, served by `vitepress preview`)… 與下方 beforeAll 要求 `WXL_SMOKE_PAGES=1 pnpm docs:build`
- Impact: 前後矛盾，誤導執行方式
- Suggested fix: 改寫為「on a test build」

#### STD-G4-19 · low · confidence high · smell

- Where: `tests/site-smoke/missing-translation.spec.ts:70`
- Requirement: 審查重點：寫死語系對、未迭代 LOCALES
- Summary: X() 以「另一個語系」為唯一對應，隱含只有兩個語系
- Evidence: return localePath(LOCALES.find((code) => code !== own)!, rest)
- Impact: 第三個語系加入時 X() 會挑錯對應語系
- Suggested fix: 明確傳入目標語系，或加上兩語系守衛

#### STD-G4-20 · low · confidence high · smell

- Where: `tests/site-smoke/missing-translation.spec.ts:288`
- Requirement: 審查重點：寫死語系對
- Summary: 以三元運算子把語系對應到 lang 前綴
- Evidence: toMatch(own === 'en' ? /^en/ : /^zh/)
- Impact: Repeated Switches；新增語系需改測試
- Suggested fix: 從 locales-config 的 lang 取值

#### STD-G4-21 · low · confidence high · smell

- Where: `tests/site-smoke/missing-translation.spec.ts:298`
- Requirement: 審查重點：資源只在成功路徑釋放
- Summary: 寬度矩陣測試的 context.close() 只在斷言全部通過後執行
- Evidence: const context = await browser.newContext(...) ... await context.close() 位於測試結尾（行 238、248、298、312）
- Impact: 斷言失敗時留下未關閉的 context
- Suggested fix: 使用 try/finally 或 Playwright fixture

#### STD-G4-22 · low · confidence medium · standard-breach

- Where: `tests/site-smoke/missing-translation.spec.ts:414`
- Requirement: AC-61（讀真實樹的 smoke 測試在靶場也須通過）
- Summary: 新的 A15／A3 案例依賴 guide/python 在主語系與翻譯語系都存在（上游內容）
- Evidence: page.goto(`/${PRIMARY}/guide/python`)；page.goto(`${localePath(PRIMARY, 'guide/python')}?q=1#h`) 並期待 localePath(T, 'guide/python')
- Impact: 刪除或未翻譯 guide/python 的靶場 smoke 會失敗
- Suggested fix: 改用 smoke fixture 或從 dist 挑出兩語系都存在的頁面

#### STD-G4-26 · low · confidence high · smell

- Where: `tests/unit/components/HomeContent.test.ts:209`
- Requirement: 審查重點：mock 只在成功路徑還原
- Summary: L22 測試結尾才把 mockWithBase.prefix 重設為空字串，其他 describe 的 beforeEach 不會重設
- Evidence: mockWithBase.prefix = '' 位於 it.each 主體最後一行
- Impact: 斷言失敗時 '/repo' base 留給後續測試，造成誤導性的連鎖失敗
- Suggested fix: 在全域 beforeEach/afterEach 重設 mockWithBase.prefix

#### STD-G4-27 · low · confidence high · smell

- Where: `tests/unit/components/HomeContent.test.ts:203`
- Requirement: 審查重點：寫死語系對
- Summary: 以型別斷言把 'en' 塞進宣告為 'root' | 'zh-TW' 的 mock
- Evidence: mockLocaleIndex.value = (page === P ? 'root' : page) as 'root' | 'zh-TW'（行 11 型別仍為 'root' | 'zh-TW'）
- Impact: 型別說謊；其他元件測試已改為 'root' | 'zh-TW' | 'en'，這裡沒同步
- Suggested fix: 把 mockLocaleIndex 型別擴充為含 'en'，移除 as

#### STD-G4-29 · low · confidence high · standard-breach

- Where: `tests/unit/challenge/config.test.ts:15`
- Requirement: GLOSSARY.md 題目宣告（行 178）：_Avoid_ 設定／config／metadata
- Summary: describe 已改名 ChallengeDeclaration，但測試標題、變數與註解仍稱宣告為 config
- Evidence: it('accepts a valid config with all required fields')（行 15）、it('accepts config with no tools ...')（行 166）、// flag is an existing optional concept in challenge configs（行 225）、const config = validateChallengeDeclaration(...)
- Impact: 與詞彙表衝突，削弱「宣告是授權面不是設定」的意涵
- Suggested fix: 改為 declaration

#### STD-G4-30 · low · confidence high · smell

- Where: `tests/unit/challenge/declaration.test.ts:229`
- Requirement: 審查重點：過時的標題
- Summary: D145 describe 標題仍寫「throws」，但案例現在斷言回傳 invalid-yaml
- Evidence: describe('D145: a mapping key that is not a scalar throws (working test, claims no row)', ...) 內部改為 expect(result.ok).toBe(false); expect(result.reason).toBe('invalid-yaml')
- Impact: 失敗報告的標題與行為相反
- Suggested fix: 改為「is invalid-yaml」

#### STD-G4-31 · low · confidence high · smell

- Where: `tests/unit/challenge/plugin.test.ts:224`
- Requirement: 審查重點：過時的註解；commit f3444c6 已讓 keygen CLI 測試改在暫存複本執行
- Summary: 註解仍說 challenge-keygen.test.ts 會在真實樹放暫時題目
- Evidence: // such as challenge-keygen.test.ts's transient real-tree probes
- Impact: 誤導讀者以為仍有測試寫入 live tree
- Suggested fix: 刪除該例子

#### STD-G4-32 · low · confidence high · smell

- Where: `tests/unit/challenge/plugin.test.ts:84`
- Requirement: smell-baseline: Mysterious Name；審查重點：標題
- Summary: Y44 標題寫「P %s」，但參數其實是說明頁所在資料夾，assembleChallengeFrontmatter 不接受 P
- Evidence: it.each(['en', 'zh-TW'])('Y44 (P %s): a brief path without layout: challenge throws PL-E17', (locale) => ...)
- Impact: 讓人誤以為這案涵蓋了兩種主語系
- Suggested fix: 標題改為 locale folder %s

#### STD-G4-33 · low · confidence high · smell

- Where: `tests/unit/challenge/slug.test.ts:14`
- Requirement: tdd：每個斷言要有獨立的失敗理由
- Summary: 多餘的 not.toBe 斷言被下一行 toBeUndefined 完全涵蓋
- Evidence: expect(slugFromRelativePath('door-is-open.md')).not.toBe('door-is-open'); expect(slugFromRelativePath('door-is-open.md')).toBeUndefined()
- Impact: 雜訊
- Suggested fix: 刪除第一行

#### STD-G4-34 · low · confidence low · smell

- Where: `tests/unit/challenge/shortLink.test.ts:164`
- Requirement: spec.en.md Testing Decisions（行 820–825）：測 seam 的外部行為，不對內部狀態斷言
- Summary: S-q4 以正規表示式掃 generate-redirects.ts 原始碼（import 與呼叫字樣）
- Evidence: expect(src).toMatch(/import\s*\{[^}]*\bchallengePagePath\b.../); expect(code).not.toMatch(/\/challenge\/(\$\{|:slug)/)
- Impact: 結構性測試容易因重構誤報，也可能被別名 import 繞過；若 AC-33 明定要這樣驗，可忽略
- Suggested fix: 以 generateRedirects 的輸出對 challengePagePath 的結果做行為比對

#### STD-G4-36 · low · confidence medium · smell

- Where: `tests/unit/i18n/locale-switcher.test.ts:495`
- Requirement: tdd：測試應驗證產品行為
- Summary: 「throws naming the table」驗的是測試檔內的 assertLabelsPresent，不是產品程式碼
- Evidence: function assertLabelsPresent(...)（行 464，test-only）；it('throws naming the table when a label key is missing from a string table') 呼叫它
- Impact: 只證明測試輔助函式本身正確，對產品沒有保護力
- Suggested fix: 保留作為輔助函式的自我驗證時，在標題標明；或把守衛移到產品模組

#### STD-G4-37 · low · confidence medium · standard-breach

- Where: `tests/unit/i18n/locales.test.ts:57`
- Requirement: tdd：測試不得在錯誤時默默通過
- Summary: B18 command 2 沒檢查 bash／git grep 的結束碼，指令出錯時 stdout 為空、測試通過
- Evidence: const res = spawnSync('bash', ['-c', script], ...); const lines = res.stdout.split('\n')... 沒有 res.status 判斷（command 1 同樣只看 stdout）
- Impact: regex 寫錯或 git 失敗（exit 128）時檢查形同未做
- Suggested fix: 斷言 res.status 屬於 {0, 1}（git grep 無命中為 1）

#### STD-G4-38 · low · confidence medium · smell

- Where: `tests/unit/i18n/theme-locale-wiring.test.ts:803`
- Requirement: 一致性：locales.test.ts 對 git grep 以 skipIf(!IS_GIT_CHECKOUT) 保護
- Summary: B80 直接執行 git grep，非 git 工作樹時（exit 128）會被重新丟出而失敗
- Evidence: if ((err as { status?: number }).status !== 1) throw err
- Impact: 在解壓的 tarball 或尚未 git init 的靶場執行 unit suite 會失敗，與 locales.test.ts 的處理不一致
- Suggested fix: 比照 locales.test.ts 加上 skipIf 或改走檔案系統掃描

#### STD-G4-39 · low · confidence high · smell

- Where: `tests/unit/i18n/theme-locale-wiring.test.ts:222`
- Requirement: smell-baseline: Speculative Generality
- Summary: 新增的 P = zh-TW it.each 兩列 stored 都是 'zh-TW'，if (stored) 永遠成立
- Evidence: ['stored matches the path', 'zh-TW', '/challenges/'], ['the path is explicitly prefixed', 'zh-TW', '/en/guide/'] ... if (stored) window.localStorage.setItem(...)
- Impact: 死條件，暗示有「無偏好」案例但其實沒有
- Suggested fix: 移除條件或補上無偏好的列

#### STD-G4-40 · low · confidence medium · smell

- Where: `tests/unit/site/redirects-generated.test.ts:31`
- Requirement: GLOSSARY 題目宣告／說明頁：title 屬於說明頁，宣告帶 title 會被擋（VM5、PL-E16）
- Summary: fixture 的 writeDeclaration 把 title 寫進 challenge.yaml
- Evidence: const lines = [`title: x`] 後寫入 platform/challenge/<slug>/challenge.yaml（redirects.test.ts 行 375、659 同樣寫 'title: x'）
- Impact: fixture 本身是不合法的宣告，若產生器日後改用完整驗證，這些測試會因無關理由失敗
- Suggested fix: 移除 title 行

#### STD-G4-42 · low · confidence high · smell

- Where: `tests/unit/site/redirects.test.ts:31`
- Requirement: 審查重點：過時的註解
- Summary: 檔頭 CAUGHT 清單仍列「a challenge directory left without an index.md」，但新的 targetDirectoryFaults 依 D127 把沒有 index.md 的資料夾視為「不是 slug」而忽略
- Evidence: //     a challenge directory left without an `index.md`；同檔測試 'ignores a folder with no index.md: it is no slug (D127)'
- Impact: 註解宣稱的保護與實際行為相反
- Suggested fix: 刪除該行或改寫為 D127 的語意

#### STD-G4-43 · low · confidence high · smell

- Where: `tests/unit/site/redirects.test.ts:291`
- Requirement: spec Testing Decisions：明確設定 P，不依賴預設
- Summary: 測試輔助函式 targetDirectoryFaults 的 primary 參數預設為 'zh-TW'
- Evidence: function targetDirectoryFaults(rules: Rule[], docs: string = DOCS, primary: Locale = 'zh-TW')
- Impact: 日後漏傳 P 的呼叫會默默套用上游預設
- Suggested fix: 移除預設值，強制呼叫端傳入

#### STD-G4-44 · low · confidence low · smell

- Where: `tests/unit/site/redirects.test.ts:427`
- Requirement: 審查重點：過時的註解
- Summary: 註解說「其他測試檔會在真實樹放暫時題目」，keygen 測試已改用暫存複本，此說法可能已過時
- Evidence: // From git's per-tree index, not a directory listing: other test files scaffold throwaway challenges into the real tree while this one runs.
- Impact: 若已不成立，會誤導讀者；若仍成立，則代表仍有測試寫入 live tree，應另行追查
- Suggested fix: 確認是否還有測試寫入 platform/，據此改寫或刪除

#### STD-G4-45 · low · confidence medium · smell

- Where: `tests/unit/i18n/page-list.test.ts:298`
- Requirement: spec Testing Decisions：P 明確由參數給定
- Summary: 新的 B24 案例呼叫 pageListFromDir(root) 不帶 primary，走的是產品不會用到的「primary undefined、不改寫」分支，且 fixture 是舊版面
- Evidence: expect(pageListFromDir(root)).toEqual(['/', '/challenge/door-is-open/'])，fixture 為 'challenge/door-is-open/index.md'
- Impact: B24 在新版面與實際 P 下的行為只由 config-base 的 srcExclude 間接涵蓋
- Suggested fix: 改用新版面 fixture 並對兩個 P 執行

#### STD-G4-46 · low · confidence high · smell

- Where: `tests/unit/site/merge-challenges.test.ts:15`
- Requirement: smell-baseline: Speculative Generality（未使用的程式碼）
- Summary: TABLES 宣告後從未使用
- Evidence: const TABLES = { en, 'zh-TW': zhTW } as const（全檔僅此一處）
- Impact: 死碼
- Suggested fix: 刪除

#### STD-G4-47 · low · confidence high · smell

- Where: `tests/unit/site/merge-challenges.test.ts:170`
- Requirement: tdd：斷言要能失敗
- Summary: L12 的附加斷言永遠成立（undefined 不可能等於 id）
- Evidence: if (expected === undefined) expect(lists[locale][0].number).not.toBe(lists[locale][0].id)
- Impact: 註解宣稱的「never derived from the position」沒有被這行證明
- Suggested fix: 刪除，或把 id 與可能的 position 值設計成可區分

#### STD-G4-48 · low · confidence high · smell

- Where: `tests/unit/site/upstream-equality.test.ts:291`
- Requirement: tdd／hard rule 2：不應有回報通過卻什麼都沒斷言的案例
- Summary: 例外表中的路徑在 it.each 內直接 return，被計為通過
- Evidence: it.each([...outputs.keys()])('%s equals the transform output', (path) => { if (path in EXCEPTIONS) return ...（行 291、336 同樣）
- Impact: 報表把 14 個例外路徑顯示為「通過」，混淆實際比對的數量
- Suggested fix: 在 it.each 前先 filter 掉例外路徑

#### STD-G4-49 · low · confidence low · smell

- Where: `tests/unit/site/upstream-equality.test.ts:63`
- Requirement: docs/agents/platform-notes.md 行 29–33：fixture 內 git commit 可能觸發背景 maintenance
- Summary: tempRepo 在暫存目錄 commit 時沒有關閉 maintenance.auto／gc.auto
- Evidence: run(['-c', 'user.name=t', ..., 'commit', '--allow-empty', ...])，gitIsolated 的 env 沒有 GIT_CONFIG_COUNT 設定
- Impact: afterEach 的 rmSync 有機會與背景 maintenance 競爭，偶發 flaky
- Suggested fix: 比照 create-wxl 的 verifyGit 加上 maintenance.auto=false、gc.auto=0

#### STD-G4-50 · low · confidence high · smell

- Where: `tests/unit/site/range-collection.test.ts:45`
- Requirement: 審查重點：過時的標題
- Summary: 標題說「both files」，實際跑三個檔案
- Evidence: it('both files pass, and their upstream-only suites report skipped', ...)；UPSTREAM_ONLY_FILES 有三項
- Impact: 標題與內容不符
- Suggested fix: 改為「every upstream-only file passes」

#### STD-G4-51 · low · confidence high · smell

- Where: `tests/unit/components/ChallengeList.test.ts:787`
- Requirement: 審查重點：過時的註解
- Summary: 註解說「page-mode URL D68 still hard-codes」，但 D68 已以 challengePagePath 實作
- Evidence: // NOT the page-mode URL D68 still hard-codes) is `/zh-TW/c/005`
- Impact: 誤導讀者以為 page mode 網址仍寫死
- Suggested fix: 刪除「still hard-codes」

#### STD-G4-52 · low · confidence medium · smell

- Where: `tests/unit/i18n/initial-locale-redirect.test.ts:59`
- Requirement: traceability Overridden contracts Area A（行 1653）：此翻轉的依據是 D25、A1
- Summary: 註解把行為翻轉歸因於 D31（D31 是「client 從單一模組讀 P」）
- Evidence: // Flipped by D31/wave 2 (ticket Comments, cross-area note 1; DT01/02/07/08)
- Impact: 追溯時會找錯決策
- Suggested fix: 改為 D25

#### STD-G4-53 · low · confidence medium · smell

- Where: `tests/unit/i18n/not-found-wiring.test.ts:621`
- Requirement: traceability Overridden contracts Area A（行 1654–1655）：依據為 D25、A1
- Summary: 三處註解同樣把翻轉歸因於 D31
- Evidence: // Flipped by D31/wave 2 ...（行 621、699、804）
- Impact: 同上
- Suggested fix: 改為 D25

#### STD-G4-54 · low · confidence high · smell

- Where: `tests/unit/i18n/not-found-wiring.test.ts:196`
- Requirement: 審查重點：註解正確性
- Summary: 註解中的 slug 打錯
- Evidence: // `/challenge/v05-php-case/`'s zh-TW counterpart does not exist（應為 v05-php-check）
- Impact: 讀者找不到對應 fixture
- Suggested fix: 修正為 v05-php-check

#### STD-G4-55 · low · confidence medium · smell

- Where: `tests/unit/i18n/not-found-wiring.test.ts:1076`
- Requirement: AGENTS.md：.proj.handoffs/ 不進版本；註解應可自行驗證
- Summary: 測試註解大量引用審查輪次代號（B3-4、B4-1e、S2-b、wave 2 item 1b）與 handoff 內容
- Evidence: // the full matrix the handoff's literal text asked for；// B4-1g: ties the transcribed scenario ...；// Segment 2z (wave 2 item 1b)
- Impact: handoff 是 gitignored 的本機檔，代號在 ticket 外無意義，註解會快速過時
- Suggested fix: 改寫為規格 row id（SW、DT、A 列）與行為本身

#### STD-G4-56 · low · confidence high · smell

- Where: `tests/unit/components/MergedNav.test.ts:8`
- Requirement: 審查重點：過時的註解（Overridden contracts Area A 行 1660：'root' 改指主語系）
- Summary: mock 旁的註解仍說 'root' 代表英文
- Evidence: // already correct during SSR. `'root'` is what it reports for English.
- Impact: 與 P = zh-TW 的新案例矛盾
- Suggested fix: 改為「'root' is what it reports for the primary locale」

#### STD-G4-57 · low · confidence medium · smell

- Where: `tests/unit/layouts/ChallengeLayout-legacy-module.test.ts:122`
- Requirement: 審查重點：mock／stub 未還原
- Summary: beforeEach 以 vi.stubGlobal 取代 fetch，沒有任何 unstubAllGlobals，vitest.config.ts 也未設 unstubGlobals
- Evidence: vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
- Impact: 影響限於本檔（vitest 預設檔案隔離），但若日後同檔增案會互相干擾
- Suggested fix: 加上 afterEach(() => vi.unstubAllGlobals())

#### STD-G4-58 · low · confidence medium · smell

- Where: `tests/unit/layouts/ChallengeLayout-legacy-module.test.ts:28`
- Requirement: GLOSSARY 舊版面：說明頁位於語系資料夾內
- Summary: useData mock 的 relativePath 用的是舊版面路徑
- Evidence: page: { value: { relativePath: 'challenge/probe/index.md' } }
- Impact: slug 推導在新版面（en/challenge/probe/index.md）的情況沒被這個 fixture 走到
- Suggested fix: 改為新版面路徑

#### STD-G4-59 · low · confidence medium · smell

- Where: `tests/unit/site/config-base.test.ts:34`
- Requirement: 一致性：challenge-keygen 與 range-collection 的複本都排除 .vitepress/dist 與 cache
- Summary: buildFixtureRoot 整份複製 .vitepress，包含已建置的 dist 與 cache
- Evidence: cpSync(resolve(REPO_ROOT, '.vitepress'), join(root, '.vitepress'), { recursive: true })
- Impact: 建置過後每個 fixture 都複製大量檔案，拖慢測試；ticket 記錄的 B14/B40 不穩定失敗可能與此有關
- Suggested fix: 加上排除 cache|dist 的 filter

#### STD-G4-60 · low · confidence high · smell

- Where: `tests/unit/i18n/arrival.test.ts:64`
- Requirement: smell-baseline: Duplicated Code；審查重點：寫死語系對
- Summary: 多個測試檔各自重寫 `T = P === 'en' ? 'zh-TW' : 'en'` 的兩語系換算
- Evidence: arrival.test.ts 行 64、168、185；not-found-wiring.test.ts ROWS_BY_P；ChallengeList.test.ts、HomeContent.test.ts L22；merge-challenges.test.ts `other()`；challenge-data-loaders.test.ts `other()`；redirects.test.ts `O`
- Impact: 兩語系假設散落各處，新增語系時需散彈式修改
- Suggested fix: 抽到 tests/__helpers__/localeTables.ts 的單一輔助函式（或使用產品的 otherLocale）

#### STD-G4-61 · low · confidence medium · smell

- Where: `tests/unit/i18n/messages-shape.test.ts:18`
- Requirement: 同檔 B19 註解：「no literal pair of imports」
- Summary: 經由 LOCALES 讀入後又立刻還原成字面的 en／zhTW 兩個變數
- Evidence: const en = MESSAGES.en; const zhTW = MESSAGES['zh-TW']；L18 測試用 Record<'en' | 'zh-TW', ...>
- Impact: B19 想避免的字面語系對以另一種形式回來
- Suggested fix: 形狀比較改為對 LOCALES 兩兩比對

#### STD-G4-62 · low · confidence low · smell

- Where: `tests/unit/site/primary-folder-links.test.ts:80`
- Requirement: tdd：斷言要能區分對錯
- Summary: B72 第二組只斷言回傳值是字串
- Evidence: expect(html).toBeTypeOf('string')（'../../enroll/x.md' 與 '/zh-TWx/y' 兩案）
- Impact: 只要沒丟例外就通過，沒驗證連結是否被正確保留
- Suggested fix: 比照 /english/x 案例斷言 href 內容

#### STD-G4-63 · low · confidence low · smell

- Where: `tests/unit/i18n/page-list.test.ts:148`
- Requirement: AC-61：讀真實樹的測試由樹推導期望值
- Summary: 斷言真實樹恰好有 2 個 smoke fixture
- Evidence: expect(shipped.filter((entry) => entry.includes('smoke-fixtures'))).toHaveLength(2)
- Impact: oracle 相等已涵蓋；這個常數在靶場增刪 fixture 時多餘地失敗
- Suggested fix: 刪除，或改由 oracle 計數

#### STD-G4-64 · low · confidence medium · smell

- Where: `tests/unit/components/ChallengeList.test.ts:259`
- Requirement: 審查重點：mock 未還原
- Summary: 新增案例以 Object.defineProperty 改寫 navigator.clipboard，沒有還原（MergedNav、ShortLinkShare.mode-default 新案例同樣）
- Evidence: Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true, writable: true })
- Impact: 既有模式的延續；後續案例會看到前一案的 writeText mock
- Suggested fix: 在 afterEach 還原原本的 clipboard 描述子

### Standards · G5 (38 findings: 0 high, 10 medium, 28 low)

Coverage: G5-tests-scripts 群組的 25 個 diff 檔全部完整讀過：tests/__helpers__/localeTables.ts、preCommitRepo.ts、upstreamDecision.ts；tests/challenge-analyze.test.ts（779 行，分兩段）、challenge-lint-staged.test.ts、challenge-validate.test.ts（1486 行，分三段）、pre-commit-sh.test.ts（1691 行，分四段）；tests/unit/scripts/ 下的 challenge-keygen（753 行，分兩段）、challenge-numbers、四個 challenge-retype-*、challenge-verify-L1、L2、blind-cleanup、blind-orchestration、create-challenge-run、create-challenge、fork-init、upstream-guard、wxl-solver/build-player-package；tests/unit/workflows/ 下的 checkout-tags 與 smoke-fixture-switch。另外查閱了 live 檔案作為脈絡：preCommitRepo.ts 的 initRepo、isolatedEnv、snapshot、cloneFixture、COPIED_FILES；pre-commit-sh.test.ts 的 H13（998 行）與 expectH02H14（476 行）；challenge-keygen.test.ts 1218–1287 行；package.json 的 scripts；scripts/pre-commit.sh 中呼叫 node 的那幾行；hook 腳本 import 閉包的 grep（確認 COPIED_FILES 已涵蓋完整閉包，因此沒有列為問題）；以及 workflow 的 node-version。對照的標準文件：AGENTS.md、GLOSSARY.md 全文、docs/agents/platform-notes.md 全文、smell-baseline.md，language.md 與 CONTRIBUTE.md 只用 grep 抽查相關段落。沒有讀的部分：G1–G4 群組（不在本軸範圍）、spec 0010 本文與 traceability.md、ticket 記錄、deferred-p2-by-segment.json，以及 docs/adr。

Missing context: spec 0010 的 S37、S44、S48、S80 與 S-§4.5 原文：無法確認 H02/H14 是否本來就要求斷言 validator 收到 zh-TW 說明頁，也無法確認 S80 的「generator 不執行」指的只是 --staged，還是包括列舉模式。; 規格是否明定 CLI 入口的 stderr 第一行必須是 PL 行，以及 CI 與老師環境的 Node 版本是否會對 --experimental-strip-types 輸出 ExperimentalWarning：這會影響 STD-G5-03 到 STD-G5-06 的實際嚴重度（fork-init 測試另寫了 filterExperimentalWarnings，顯示這個警告曾經出現過）。; T-0077 已核准的 test plan table：無法核對被刪掉、改名的案例（H23 移到 S46、K-17 與 H41 改成「先 --no-verify commit 錯誤，再 stage 無關變更」）是否都在計畫內。; deferred-p2-by-segment.json 的內容：無法排除上面某些 low 等級的發現已經在 stage 5 登錄為延後的 P2。

#### STD-G5-01 · medium · confidence medium · partial-behaviour

- Where: `tests/pre-commit-sh.test.ts:476`
- Requirement: 審查重點：斷言應反轉而非刪除；spec 0010 S37（staged 的說明頁會送進 validator）
- Summary: expectH02H14 刪掉了「validator 從未執行」的斷言，卻沒有反轉成「validator 收到這份 zh-TW 說明頁路徑」
- Evidence: 刪除：`-  const log = validatorLog()` 與 `-  expect(readRecord(log)).toEqual([])`；測試名稱同時拿掉 "and the validator never runs"，換成 `expect(rulesOf(expected)).toHaveLength(head.length)`。新的 S37 測試只驗證 en 說明頁（`platform/en/challenge/door/index.md`）。
- Impact: 在新版面下，staged 的 zh-TW 說明頁應該送進 validator，但 H02/H14（以及 H45 用 /bin/bash 重跑的那一份）都不再檢查 validator 的 argv。如果 hook 的 ACMRD 清單漏掉翻譯語系資料夾，這兩個案例依然會是綠的。
- Suggested fix: 在 expectH02H14 裡保留 validatorLog()，並斷言 `readRecord(log).flatMap(r => r.argv)` 等於 `['platform/zh-TW/challenge/test-chall/index.md']`，也就是把原本的斷言反轉。

#### STD-G5-02 · medium · confidence high · incorrect

- Where: `tests/pre-commit-sh.test.ts:998`
- Requirement: 測試名稱必須和斷言一致（審查重點：斷言是否被弱化）
- Summary: H13 的測試名稱說會出現「validator 的訊息」，但測試本體沒有任何斷言檢查這段訊息
- Evidence: `it('H13, S48: a brief whose frontmatter carries `number` ends in O3 with the validator’s message, ...` 本體只有 `expect(run.status, run.stderr).toBe(1)`、`not.toContain('carries different numbers ...')`、沒有 --staged 呼叫，以及 expectNothingChanged。同一份檔案後面的 S48 測試則有斷言 `carries key(s) number that a brief may not carry`。
- Impact: 任何原因造成 exit 1（例如別的錯誤、W6）都會讓 H13 通過。這個測試既沒有守住它宣稱的 O3 原因，又和後面的 S48 案例重複。
- Suggested fix: 補上 `expect(run.stderr).toContain('platform/zh-TW/challenge/test-chall/index.md carries key(s) number that a brief may not carry')`；或者刪掉 H13，改由 S48 的參數化案例涵蓋 P=en。

#### STD-G5-03 · medium · confidence medium · smell

- Where: `tests/challenge-lint-staged.test.ts:375`
- Requirement: 審查重點：CLI 測試設了 NODE_NO_WARNINGS=1，同時又斷言 stderr；AGENTS.md hard rule 4（要在實際執行行為的那個表面上驗證）
- Summary: lint-staged 的 command 測試設定 NODE_NO_WARNINGS=1 後，對 stderr 做完全相等與第一行的斷言，但 hook 實際呼叫時沒有設這個變數
- Evidence: `const env = { ...gitEnv(), NODE_NO_WARNINGS: '1' }`；`expect(r.stderr).toBe('[pre-commit] ✓ s\n')`、`expect(r.stderr.split('\n')[0]).toBe('PL-E03: ...')`。scripts/pre-commit.sh:502 是 `node --experimental-strip-types scripts/challenge-lint-staged.ts "${VALIDATE[@]}"`，沒有 NODE_NO_WARNINGS。
- Impact: 如果 Node 對 --experimental-strip-types 輸出 ExperimentalWarning，老師在 commit 時看到的 stderr 第一行會是警告而不是 PL 行，測試卻是綠的。tests/unit/scripts/fork-init.test.ts 用的是 filterExperimentalWarnings，兩種做法不一致。
- Suggested fix: 拿掉 NODE_NO_WARNINGS，改用和 fork-init 測試相同的 filterExperimentalWarnings（抽成共用 helper）；或者在規格層明定入口一律帶 NODE_NO_WARNINGS，並同步修改 pre-commit.sh 與 package.json。

#### STD-G5-04 · medium · confidence medium · smell

- Where: `tests/challenge-validate.test.ts:887`
- Requirement: 審查重點：CLI 測試設了 NODE_NO_WARNINGS=1，同時斷言 stderr 第一行
- Summary: challenge:validate 的 CLI 測試在 NODE_NO_WARNINGS=1 下斷言 firstErrLine 是 PL 行，但 package.json 的 challenge:validate 沒有設這個變數
- Evidence: `env: { ...process.env, NODE_NO_WARNINGS: '1' }`、`firstErrLine: res.stderr.split('\n')[0]`；Y36 與 B38 用 `expect(res.firstErrLine).toBe(firstLine)` 和 `res.stderr.split('\n').slice(0, 3)` 斷言。package.json:33 是 `"challenge:validate": "node --experimental-strip-types scripts/challenge-validate.ts"`。
- Impact: 如果執行環境會輸出型別剝除的 ExperimentalWarning，老師執行 `pnpm challenge:validate` 時第一行不是 PL 行，測試卻遮住了這個差異。
- Suggested fix: 不要設 NODE_NO_WARNINGS，改成先濾掉 ExperimentalWarning 行再比較第一行；或者讓 package.json 的入口也帶上同樣的設定。

#### STD-G5-05 · medium · confidence medium · smell

- Where: `tests/challenge-analyze.test.ts:597`
- Requirement: 審查重點：CLI 測試設了 NODE_NO_WARNINGS=1，同時斷言 stderr 第一行
- Summary: challenge-analyze 的 CLI 測試在 NODE_NO_WARNINGS=1 下斷言 stderr 第一行
- Evidence: `env: { ...process.env, NODE_NO_WARNINGS: '1' }`；expectStopped 裡是 `expect(r.stderr.split('\n')[0]).toBe(line)`。package.json:35 的 challenge:analyze 沒有設這個變數。
- Impact: 和 STD-G5-04 相同：測試所驗證的第一行，和老師在終端機看到的第一行可能不一樣。
- Suggested fix: 同 STD-G5-04。

#### STD-G5-06 · medium · confidence medium · smell

- Where: `tests/unit/scripts/challenge-keygen.test.ts:1360`
- Requirement: 審查重點：CLI 測試設了 NODE_NO_WARNINGS=1，同時斷言 stderr 第一行
- Summary: keygen 的 fixture-tree CLI 測試在 NODE_NO_WARNINGS=1 下斷言 stderr 第一行（Y107 (c)、B38）
- Evidence: `env: { ...process.env, NODE_NO_WARNINGS: '1' }`；`expect(r.stderr.split('\n')[0]).toBe(firstLine)`、`expect(r.stderr.split('\n').slice(0, 3)).toEqual([PL_E08_FIRST_LINE, ...])`。package.json:31 的 challenge:keygen 沒有設這個變數。
- Impact: 同 STD-G5-04。
- Suggested fix: 同 STD-G5-04。

#### STD-G5-07 · medium · confidence medium · standard-breach

- Where: `tests/__helpers__/preCommitRepo.ts:201`
- Requirement: docs/agents/platform-notes.md:29-33（自己 spawn git 之後又對 .git 做快照的 helper，需要 maintenance.auto=false 與 gc.auto=0）
- Summary: fixture 的 gitconfig 沒有關掉 git 的自動維護，cloneFixture 卻用 cpSync 複製整個 .git；這次又多了一份 zh-TW fixture，複製的次數也變多
- Evidence: `writeFileSync(join(home, 'gitconfig'), '[user]\n\tname = Test\n...[init]\n\tdefaultBranch = main\n')`，沒有 `maintenance.auto`/`gc.auto`；第 268 行 `cpSync(fixture.base, base, { recursive: true, verbatimSymlinks: true })`。這次的變更新增 `fixtureZh = buildFixture('zh-TW')`，useFixture 也會反覆 clone 它。
- Impact: git commit 可能在背景啟動維護，產生忽隱忽現的 `.git/objects/maintenance.lock`，讓 cpSync 偶發 ENOENT（PR #76 在 macos-latest 上的症狀），pre-commit 測試因此變得不穩。
- Suggested fix: 在 initRepo 寫入的 gitconfig 加上 `[maintenance]\n\tauto = false\n[gc]\n\tauto = 0\n`，或在 isolatedEnv 裡用 GIT_CONFIG_COUNT 帶入，比照 create-wxl/test/helpers/real-git.mjs 的 verifyGit。

#### STD-G5-08 · medium · confidence medium · smell

- Where: `tests/__helpers__/preCommitRepo.ts:414`
- Requirement: 審查重點：會遮蔽缺陷的 fixture
- Summary: 所有錄製 stub 都把 --challenge-trees 與 --describe-untracked 直接轉給真腳本、不留紀錄，因此沒有任何測試能斷言 hook 有沒有、以什麼參數呼叫這兩個模式
- Evidence: `if (args.includes('--challenge-trees') || args.includes('--describe-untracked')) { const listing = spawnSync(...); process.exit(listing.status ?? 1) }`，註解寫著 "every stub passes them straight to the real script, unrecorded"。S80 測試的名稱是 "neither the validator nor the generator runs"，但 scripts/pre-commit.sh:114 一開始就會執行 `generate-redirects.ts --challenge-trees`。
- Impact: S80 的「generator 不執行」其實只說明 --staged 沒有執行。如果 hook 在 O1 路徑上多呼叫或錯呼叫列舉模式（例如參數錯了、或在不該觸發時呼叫 --describe-untracked），測試看不到。
- Suggested fix: 讓 stub 把列舉模式也寫進紀錄（例如加上 `mode` 欄位），在需要的案例裡用 `filter(r => r.argv.includes('--staged'))` 過濾；S80 改斷言「只有 --challenge-trees 一次」。

#### STD-G5-24 · medium · confidence high · smell

- Where: `tests/challenge-analyze.test.ts:640`
- Requirement: 審查重點：fixture 跨檔複製；smell baseline：Duplicated Code
- Summary: range.json 的 PL-E01～E06 錯誤表（含逐字訊息）至少複製了八份
- Evidence: challenge-analyze.test.ts:640、challenge-keygen.test.ts:1621、challenge-verify-L1.test.ts:27、challenge-verify-L2.test.ts:28、wxl-solver/build-player-package.test.ts:128、create-challenge-run.test.ts:284、challenge-validate.test.ts:951、pre-commit-sh.test.ts:1445，再加上 lint-staged 的 cells。好幾份的註解自己寫著 "Messages as in 5a's Y36 table"。
- Impact: PL 訊息一改，就要同步八個以上的檔案；漏改的那份會讓某個入口的測試失敗，或繼續斷言舊字串。
- Suggested fix: 把 RANGE_FAULTS（make、code、第一行）放進 tests/__helpers__/，各檔匯入；訊息直接引用 .vitepress/primary-locale.ts 匯出的常數，或保留一份手打的 oracle。

#### STD-G5-26 · medium · confidence high · smell

- Where: `tests/challenge-validate.test.ts:41`
- Requirement: 審查重點：fixture 跨檔複製；smell baseline：Duplicated Code
- Summary: 新版面的題目 fixture 寫入器在多個檔案各寫一份，預設值也互不相同
- Evidence: challenge-validate.test.ts:37/41 `brief()`、`writeTree`（預設只寫 zh-TW 說明頁）；challenge-lint-staged.test.ts:29/46 `brief()`、`writeChallenge`（預設 zh-TW）；challenge-analyze.test.ts:40 `createChallenge`（預設兩個語系，而且沒有 `layout: challenge`）；preCommitRepo.ts `writeChallenge`（預設 `repo.primary ?? 'en'`）；`OTHER` 對照表在 pre-commit-sh.test.ts:157 與 challenge-validate.test.ts:550 各寫一份。
- Impact: 說明頁或宣告的格式一變，要分頭修改；預設值不一致也讓「合法題目」在不同測試裡指的不是同一件事（例如 analyze 的說明頁照 VM8 是不合法的）。
- Suggested fix: 在 tests/__helpers__/ 建立共用的 `writeDeclaration`／`writeBrief`／`OTHER_LOCALE`，預設值對齊規格（說明頁帶 layout: challenge、預設主語系 zh-TW）。

#### STD-G5-09 · low · confidence high · smell

- Where: `tests/__helpers__/preCommitRepo.ts:640`
- Requirement: smell baseline：Duplicated Code
- Summary: 列舉模式的轉送邏輯在 wrapScript 與 blockingGenerator 各寫了一份
- Evidence: 第 414 行 `if (args.includes('--challenge-trees') || args.includes('--describe-untracked')) {...}`；第 640 行 `if (process.argv.includes('--challenge-trees') || process.argv.includes('--describe-untracked')) {...}`。
- Impact: generator 以後再加一種非生成模式時，兩處都要改；漏改的那一個 stub 會把列舉當成生成來處理。
- Suggested fix: 抽成一段共用的 stub 前導字串（例如 `PASSTHROUGH_PRELUDE`），兩處都引用它。

#### STD-G5-10 · low · confidence high · smell

- Where: `tests/__helpers__/preCommitRepo.ts:434`
- Requirement: smell baseline：Mysterious Name（位置型布林旗標）
- Summary: recordScript 接兩個位置型布林參數；recordStdout 為 true 時，recordStash 會被默默忽略
- Evidence: `export function recordScript(repo, script, log, recordStash = false, recordStdout = false)`；`if (recordStdout) { wrapScript(..., true); return }`。呼叫端寫成 `recordScript(repo, 'generate-redirects.ts', log, false, true)`。
- Impact: 從呼叫端看不出 `false, true` 是什麼意思；如果有人同時要 stash 與 stdout，stash 會悄悄不被記錄，而測試看不出來。
- Suggested fix: 改成 options 物件 `{ stash?: boolean; stdoutBytes?: boolean }`，兩者都要時一併記錄，或明確丟出錯誤。

#### STD-G5-11 · low · confidence low · smell

- Where: `tests/__helpers__/preCommitRepo.ts:400`
- Requirement: 審查重點：會遮蔽缺陷的 fixture
- Summary: captureStdout 讓 generator 的 stdout 先用 spawnSync 的 pipe 緩衝、再轉寫出去，改變了所有 generatorLog() 案例中受測系統的 I/O
- Evidence: `{ stdio: ['inherit', '${captureStdout ? 'pipe' : 'inherit'}', 'inherit'] }` 與 `if (r.stdout) process.stdout.write(r.stdout)`；generatorLog() 現在固定是 `recordScript(..., false, true)`。
- Impact: 所有 W6 與 range.json 案例跑的都不是 hook 實際的 I/O 路徑（直接重導向到 "$WORK/expected"）。輸出超過 spawnSync 預設 maxBuffer 時行為會不同，串流或部分寫入的缺陷也看不到。
- Suggested fix: 只在需要 stdoutBytes 的案例才開 captureStdout，或改用 `tee` 一類保留串流的方式量測位元組數。

#### STD-G5-12 · low · confidence medium · smell

- Where: `tests/__helpers__/preCommitRepo.ts:67`
- Requirement: smell baseline：Mysterious Name
- Summary: 常數 HOME 指的是主語系首頁的 markdown 內容，和同一檔案裡的環境變數 HOME、home 目錄撞名
- Evidence: `const HOME = '---\ntitle: Home\n---\n'`；同一檔案有 `env.HOME = home`、`const home = join(base, 'home')`。
- Impact: 讀的人容易把它當成家目錄或環境變數，維護時可能用錯。
- Suggested fix: 改名為 `HOME_PAGE` 或 `PRIMARY_HOME_PAGE`。

#### STD-G5-13 · low · confidence medium · standard-breach

- Where: `tests/__helpers__/preCommitRepo.ts:187`
- Requirement: GLOSSARY.md:400（primary locale：沒有記在設定紀錄的靶場，主語系是繁體中文）
- Summary: writeChallenge 在 repo.primary 未設定時，預設把說明頁寫進 en，和領域預設的 zh-TW 相反
- Evidence: `for (const locale of options.briefs ?? [repo.primary ?? 'en']) writeBrief(...)`；Repo.primary 的型別是 `primary?: Locale`。
- Impact: 沒有設定 primary、也沒有 range.json 的 Repo，會拿到一個主語系說明頁放錯位置的題目，這和產品預設（zh-TW）相反，可能讓測試在錯的前提下通過或失敗。
- Suggested fix: 預設改用 `DEFAULT_PRIMARY_LOCALE`（.vitepress/locales），或把 Repo.primary 改成必填。

#### STD-G5-14 · low · confidence high · smell

- Where: `tests/pre-commit-sh.test.ts:2512`
- Requirement: 審查重點：寫死的 tree 清單
- Summary: TREES 把三個 challenge tree 寫死成字串，而同一檔案的 stageChallenge 是從 LOCALES 推導
- Evidence: `const TREES = 'platform/challenge/ platform/en/challenge/ platform/zh-TW/challenge/'`；第 150 行附近是 `['platform/challenge', ...LOCALES.map((l) => `platform/${l}/challenge`)]`。
- Impact: 語系清單一變動（例如加入 ja），O5 的 git wrapper pathspec 就對不上，測試會因為 wrapper 沒有比對到而失敗，或測錯對象。同一份檔案裡兩種做法並存。
- Suggested fix: 改成 `['platform/challenge/', ...LOCALES.map(l => `platform/${l}/challenge/`)].join(' ')`。如果刻意當成 oracle 寫死，就加註說明為什麼不從 LOCALES 推導。

#### STD-G5-15 · low · confidence high · smell

- Where: `tests/pre-commit-sh.test.ts:188`
- Requirement: smell baseline：Mysterious Name（註解與簽章不一致）
- Summary: fourRules 的 doc comment 說 "or at the `L` page when `L` is given"，但參數其實是 `at: { en, zh }`，沒有 L
- Evidence: `/** A challenge's four rules, `/<form>/<NNN>` at `/challenge/<slug>/` (or at the `L` page when `L` is given); ... */ function fourRules(number: string, slug: string, at: { en: string; zh: string })`
- Impact: 註解誤導讀者如何呼叫這個 helper。
- Suggested fix: 把註解改成描述 `at.en`／`at.zh` 分別是 /en/c/ 與 /zh/c/、/zh-TW/c/ 規則的目標。

#### STD-G5-16 · low · confidence medium · smell

- Where: `tests/pre-commit-sh.test.ts:160`
- Requirement: smell baseline：Duplicated Code／Mysterious Name
- Summary: ZH_TEST_CHALL_RULES、ZH_DOOR_RULES、ZH_DOOR_RULES_AT_PRIMARY 手寫重複，旁邊明明有 fourRules helper；命名也和既有的 DOOR_RULES_AT_ENGLISH 不一致
- Evidence: `const ZH_DOOR_RULES = ['/c/002 /challenge/door/', '/en/c/002 /en/challenge/door/', ...]` 與 `function fourRules(...)` 並存；en 側叫 `DOOR_RULES_AT_ENGLISH`，zh 側叫 `ZH_DOOR_RULES_AT_PRIMARY`。前綴 ZH 也容易和舊的 /zh/ 短連結前綴混淆。
- Impact: 兩組規則表的改法不一致，日後調整規則形狀時要改好幾處。
- Suggested fix: 用 fourRules 生成，命名統一成 `RULES[P].doorAtPrimary` 這類依 P 索引的結構。

#### STD-G5-17 · low · confidence medium · smell

- Where: `tests/pre-commit-sh.test.ts:1586`
- Requirement: 審查重點：斷言弱化
- Summary: S41／S78(a) 只斷言最後一條是 `/zh-TW/* /:splat`，以及「和 FIXTURE_RULES 不同」，沒有釘住 P=zh-TW 下的完整規則
- Evidence: `expect(rulesOf(expected).at(-1)).toBe('/zh-TW/* /:splat')`、`expect(rulesOf(expected)).not.toEqual(FIXTURE_RULES)`；S78(a) 只有 `.at(-1)`。
- Impact: expected 來自 generateRedirects 這個 oracle 本身；如果 generator 在切換主語系時產生錯的規則（例如 /en/c/ 指錯頁），這兩個案例仍會通過。
- Suggested fix: 比照其他案例，斷言 `toEqual([...ZH 版本的完整規則])`。

#### STD-G5-18 · low · confidence low · smell

- Where: `tests/pre-commit-sh.test.ts:455`
- Requirement: 審查重點：會遮蔽缺陷的 fixture
- Summary: range.json 的 upstream 鍵在 pre-commit 測試裡寫成字串，在 create-challenge-run 測試裡是物件，兩份 fixture 形狀不一致
- Evidence: pre-commit-sh：`'{"primaryLocale":"en","upstream":"example/range"}'`；create-challenge-run.test.ts Y71：`'{ "upstream": { "repo": "browserlab/wxl-platform", "version": "3.1.0" } }'`。
- Impact: 如果 hook 或 generator 以後會檢查 upstream 的形狀，字串版 fixture 可能讓錯誤的分支被當成合法，或者正好避開真實格式下的缺陷。
- Suggested fix: 統一使用設定紀錄實際寫入的物件格式。

#### STD-G5-19 · low · confidence low · standard-breach

- Where: `tests/pre-commit-sh.test.ts:958`
- Requirement: GLOSSARY.md:411-415（locale folder 語系資料夾）、:419（避免用暗示整棵逐頁對應的鏡像說法）；AGENTS.md「命名前讀 GLOSSARY」
- Summary: 測試名稱與註解用 "translation tree"，不是詞彙表的 locale folder
- Evidence: `'H10, translation tree (P = %s): an untracked translation brief beside a tracked page ...'`、`// rather than the whole translation tree.`
- Impact: "tree" 是舊版面「繁中題目樹」的講法，和詞彙表的語系資料夾概念不一致，會讓舊詞義繼續流通。
- Suggested fix: 改成 "translation locale folder" 或 "the T locale folder"。

#### STD-G5-20 · low · confidence high · smell

- Where: `tests/unit/scripts/challenge-keygen.test.ts:1255`
- Requirement: smell baseline（無用的程式碼與過時註解）；測試執行成本
- Summary: afterEach 仍會跑一次完整的 `pnpm challenge:keygen --force` 來「還原」，但對象已經是馬上要刪掉的暫存複本，註解也還在講作者的 live tree
- Evidence: `// Re-key the challenge with a real run so the local tree is left exactly as a normal keygen leaves it. ... a silent failure here would leave the author's door-is-open unloadable` 之後是 `spawnSync('pnpm', ['challenge:keygen', '--force', slug], { cwd: repoRoot })`，接著馬上 `rmSync(repoRoot, ...)`。
- Impact: 每個案例多花一次完整 keygen 的時間（timeout 是 120 秒級），換來的只是一個對已刪除複本的斷言；註解描述的風險已經不存在，會誤導維護者。
- Suggested fix: 刪掉 afterEach 的還原執行與它的 expect，只保留 rmSync(shimDir)、rmSync(repoRoot)，並更新上方描述 template.wasm 的註解。

#### STD-G5-21 · low · confidence low · smell

- Where: `tests/unit/scripts/challenge-keygen.test.ts:1222`
- Requirement: 審查重點：暫存目錄未清除
- Summary: beforeEach 先建立 repoRoot 複本，之後的 expect 或 shim 建立如果失敗，afterEach 會在 rmSync(shimDir) 時因為 shimDir 是 undefined 而丟例外，repoRoot 不會被刪
- Evidence: beforeEach：`repoRoot = copyRepoForKeygen()` → `if (!existsSync(wasmPath)) { ...; expect(r.status).toBe(0) }` → `shimDir = ...`；afterEach 的第一行是 `rmSync(shimDir, ...)`。
- Impact: fresh clone 上 keygen 失敗時，會在 os.tmpdir() 留下整份 repo 複本（含 platform/）。
- Suggested fix: afterEach 先 rmSync(repoRoot) 並對每個路徑做 undefined 防護，或用 try/finally 包住。

#### STD-G5-22 · low · confidence medium · smell

- Where: `tests/unit/scripts/challenge-keygen.test.ts:864`
- Requirement: 審查重點：fixture 跨檔或跨區塊複製；Y-q2（每個案例自己寫需要的 tree）
- Summary: source_files 區塊用 copyRepoForKeygen 複製 live 的 platform/ 與 range.json，但它只用到自己寫的 probe 題目
- Evidence: `repoRoot = copyRepoForKeygen()`；copyRepoForKeygen 會複製 `['package.json', 'scripts', '.vitepress', 'platform', 'range.json']`，同一檔案另有只複製工具程式的 copyToolingForKeygen。
- Impact: 這個區塊的結果會受上游內容影響（例如 live 的 range.json 決定說明頁寫到哪），在靶場或 fork 上可能有不同結果；也多複製了 platform/public 等大檔。
- Suggested fix: 改用 copyToolingForKeygen，自己寫 range.json 與首頁。

#### STD-G5-23 · low · confidence high · smell

- Where: `tests/challenge-analyze.test.ts:565`
- Requirement: 審查重點：fixture 跨檔複製；smell baseline：Duplicated Code
- Summary: 「把工具程式複製到 tmpdir 並 symlink node_modules」的邏輯有四份幾乎一樣的實作
- Evidence: challenge-analyze.test.ts:565 `copyToolingForAnalyze`、challenge-keygen.test.ts:846 `copyRepoForKeygen`、:1307 `copyToolingForKeygen`、challenge-validate.test.ts:860 的 beforeAll（排除 dist/cache 的 filter 寫法還不一樣：`relative(...).split(sep)[0]` 對上 `src.startsWith(`${d}/`)`）。
- Impact: 排除清單或複製範圍要改時得改四處，漏改的那份會讓某個 CLI 測試讀到不同的 tree；`${d}/` 寫法在 Windows 路徑分隔符下也不成立。
- Suggested fix: 抽到 tests/__helpers__/（例如 `copyToolingToTemp(options)`），統一 filter 的實作。

#### STD-G5-25 · low · confidence high · smell

- Where: `tests/unit/scripts/wxl-solver/build-player-package.test.ts:127`
- Requirement: smell baseline：Mysterious Name（註解與內容不符）
- Summary: 註解寫 "Messages as in 5a's Y36 table"，但這份表的第三欄只有錯誤代碼，不是訊息
- Evidence: `// Messages as in 5a's Y36 table ...` 底下是 `['PL-E01 range.json is a folder', (p) => mkdirSync(p), 'PL-E01']`。
- Impact: 誤導讀者，讓人以為這裡有比對訊息全文。
- Suggested fix: 把註解改成 "Codes as in ..."，或改用共用表並斷言 message 的第一行。

#### STD-G5-27 · low · confidence medium · smell

- Where: `tests/challenge-analyze.test.ts:98`
- Requirement: 審查重點：會遮蔽缺陷的 fixture
- Summary: createChallenge 預設的說明頁沒有 `layout: challenge`，照 VM8 是 validator 會拒絕的說明頁
- Evidence: `const briefs = opts.briefs ?? { 'zh-TW': `---\ntitle: "${slug} Challenge"\n---\n`, en: ... }`
- Impact: analyze 的測試建立在一份實際 tree 裡不可能通過驗證的說明頁上；如果 analyze 以後依賴 layout 或其他鍵，這個 fixture 會掩蓋差異。
- Suggested fix: 預設說明頁加上 `layout: challenge`。

#### STD-G5-28 · low · confidence medium · smell

- Where: `tests/unit/scripts/challenge-verify-blind-orchestration.test.ts:7`
- Requirement: smell baseline：Mysterious Name
- Summary: blind 測試仍把常數叫 INDEX，現在它其實是寫進 zh-TW 的說明頁；而且沒有 challenge.yaml，說明頁也沒有 layout
- Evidence: `const INDEX = ['---', 'title: Door Is Open', '---', ...]`，寫入位置改成 `platform/zh-TW/challenge/door-is-open/index.md`；L1、L2 測試同一個概念則叫 BRIEF。blind-cleanup.test.ts:7 也一樣。
- Impact: 命名不一致；fixture 也不是一道完整的題目（沒有宣告），只有在 blind 不讀宣告時才成立。
- Suggested fix: 改名為 BRIEF，並視需要補上 challenge.yaml 與 layout: challenge。

#### STD-G5-29 · low · confidence medium · smell

- Where: `tests/challenge-lint-staged.test.ts:68`
- Requirement: docs/agents/platform-notes.md:29-33 的精神（自己 spawn git 的 helper 要隔離設定）；和 preCommitRepo.isolatedEnv 的一致性
- Summary: makeRepo 只拿掉 GIT_* 變數就 `git init`，沒有隔離 HOME 與全域 git 設定
- Evidence: `function gitEnv() { ... if (!k.startsWith('GIT_')) env[k] = v }`、`git(root, 'init', '-q')`；preCommitRepo.isolatedEnv 則有設 `HOME`、`GIT_CONFIG_GLOBAL`、`GIT_CONFIG_NOSYSTEM`。
- Impact: 開發者的全域設定（init.templateDir、core.hooksPath、safecrlf 等）可能影響 fixture，讓測試只在某些機器上失敗或通過。
- Suggested fix: 直接使用 preCommitRepo 的 isolatedEnv，或者同樣設定一個暫存 HOME 與 GIT_CONFIG_NOSYSTEM。

#### STD-G5-30 · low · confidence medium · smell

- Where: `tests/challenge-lint-staged.test.ts:205`
- Requirement: 審查重點：斷言弱化
- Summary: invalid tools 的案例用 OR 條件斷言，兩種前綴任一個都算通過
- Evidence: `expect(result.errors[0].messages.some((m) => m.startsWith('declaration:') || m.startsWith('tools:'))).toBe(true)`
- Impact: 錯誤被歸到哪個 check 並沒有被釘住；如果 tools 驗證跑到錯的層級，測試看不出來。
- Suggested fix: 照目前的實作斷言確切的訊息（同一個檔案的 bad-ext 案例也可比照）。

#### STD-G5-31 · low · confidence low · standard-breach

- Where: `tests/__helpers__/upstreamDecision.ts:24`
- Requirement: GLOSSARY.md:348（range 的 _Avoid_：fork——在 GitHub 上分叉只是建立靶場的一種方式，不等於靶場本身）
- Summary: skip reason 把「沒有 range.json 的非上游 tree」叫做 a fork，「有 range.json」的叫做 a range，等於把 fork 當成和 range 並列的類別
- Evidence: `? 'not upstream: this tree has its own range.json (a range)' : 'not upstream: this tree is not the upstream repository (a fork)'`
- Impact: 詞彙表裡 fork 或 clone 而來的靶場仍然是靶場；這段字串會出現在測試報告中，把舊說法帶回流通。
- Suggested fix: 改成例如 "a range without a setup record" 或 "not the upstream repository"。

#### STD-G5-32 · low · confidence high · smell

- Where: `tests/unit/scripts/upstream-guard.test.ts:626`
- Requirement: 審查重點：斷言弱化
- Summary: upstreamOnlySkipReason 的 range 與 fork 案例只斷言回傳的是非空字串，沒有區分兩種原因
- Evidence: `expect(typeof reason).toBe('string')`、`expect(reason).toBeTruthy()`（range 與 fork 兩個案例完全相同）
- Impact: 把兩個分支對調、或傳回錯的原因，測試都不會失敗。
- Suggested fix: 斷言 range 案例包含 'range.json'、fork 案例不包含，或直接比對完整字串。

#### STD-G5-33 · low · confidence medium · smell

- Where: `tests/unit/scripts/challenge-keygen.test.ts:1759`
- Requirement: tests/__helpers__/upstreamDecision.ts 的 doc（這個 helper 用來提供 skip reason）；和 challenge-validate.test.ts:306 的一致性
- Summary: keygen 把 upstreamOnlySkipReason 的回傳值直接當 skipIf 的條件，跳過時看不到原因；validate 則把原因附在 describe 名稱上
- Evidence: `describe.skipIf(upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, ...))('challenge-keygen --force over upstream's four challenges (Y55, upstream only)', ...)`；validate 是 `` `Y1 (validate half)${upstreamSkip ? ` [skipped: ${upstreamSkip}]` : ''}` ``。
- Impact: 在靶場上跑時，報告看不出為什麼跳過；同一個 helper 有兩種用法。
- Suggested fix: 比照 validate，把 reason 放進 describe 名稱。

#### STD-G5-34 · low · confidence high · smell

- Where: `tests/unit/scripts/create-challenge.test.ts:132`
- Requirement: smell baseline：Mysterious Name（過時的測試名稱）
- Summary: 測試名稱還在講 md 檔："does not throw when neither md nor directory exists"
- Evidence: `it('does not throw when neither md nor directory exists', () => { expect(() => checkCollision('new-challenge', rootWith([]))).not.toThrow() })`；Y82 已經說明 flat .md 不算碰撞。
- Impact: 名稱描述的是舊版面的語意，和 Y82 互相矛盾。
- Suggested fix: 改成 "does not throw when no challenge or brief folder exists"。

#### STD-G5-35 · low · confidence low · smell

- Where: `tests/unit/scripts/create-challenge-run.test.ts:498`
- Requirement: 審查重點：oracle 不應取自受測程式碼
- Summary: Y105 的預期拒絕訊息是呼叫 checkSourceLayout（受測程式碼的一部分）算出來的
- Evidence: `try { checkSourceLayout(join(root, 'platform'), 'zh-TW') } catch (e) { refusal = (e as Error).message }` 之後 `expect(h.err().split('\n').slice(0, 2)).toEqual(refusal.split('\n').slice(0, 2))`
- Impact: PL-E08 第一行的完整文字沒有被獨立釘住（只檢查 `^PL-E08:` 前綴），checkSourceLayout 的訊息退化時這個案例不會發現；其他檔案則是手打 PL_E08_FIRST_LINE。
- Suggested fix: 改用手打的 PL_E08_FIRST_LINE（最好放進共用 helper）做比對。

#### STD-G5-36 · low · confidence medium · smell

- Where: `tests/unit/scripts/challenge-numbers.test.ts:26`
- Requirement: 審查重點：會遮蔽缺陷的 fixture
- Summary: writeDeclaration 寫進 challenge.yaml 的是 `slug:` 鍵，不是宣告欄位；沒有 backend 與 app
- Evidence: `const lines = [`slug: ${slug}`]; if (number !== undefined) lines.push(`number: ${number}`)`；writeRetiredDeclaration 也一樣。
- Impact: fixture 不是合法的宣告，讓人誤以為 slug 是宣告的一部分；如果 collectChallengeNumbers 以後會先驗證宣告，這些案例會因為錯誤的理由失敗或通過。
- Suggested fix: 改寫成 `number`、`backend`、`app` 的最小合法宣告。

#### STD-G5-37 · low · confidence low · smell

- Where: `tests/__helpers__/localeTables.ts:25`
- Requirement: smell baseline：Shotgun Surgery／一致性
- Summary: Locale 型別從 '../../.vitepress/theme/i18n' 匯入，而其他新的測試 helper 從 '.vitepress/locales' 匯入
- Evidence: `import type { Locale } from '../../.vitepress/theme/i18n'`；preCommitRepo.ts 是 `import type { Locale } from '../../.vitepress/locales'`。
- Impact: 同一個領域型別有兩個匯入來源，如果兩者分歧，型別檢查不會發現 helper 之間的不一致。
- Suggested fix: 統一從 .vitepress/locales 匯入。

#### STD-G5-38 · low · confidence low · smell

- Where: `tests/unit/workflows/checkout-tags.test.ts:36`
- Requirement: 審查重點：寫死的清單
- Summary: 「跑 root suite 的 job 都要 fetch-depth: 0」這條規則，只對三個寫死的 job 檢查
- Evidence: `it.each([['quality-gates.yml', 'test'], ['quality-gates.yml', 'fork-init-cross-os'], ['release.yml', 'release']])`
- Impact: 新增另一個跑 `pnpm test` 的 job 時，這個測試不會提醒，那個 job 在上游會因為缺少 tag 而失敗。
- Suggested fix: 掃描所有 steps 中 run 含 `pnpm test`（或 vitest）的 job，再檢查它的 checkout。

## Spec

### Spec · B (46 findings: 1 high, 5 medium, 40 low)

Coverage: 完整讀過的 diff 檔：.vitepress/config.mts、.vitepress/source-layout.ts、.vitepress/pageList.ts、.vitepress/theme/i18n/pages.ts、tests/unit/site/config-base.test.ts、tests/unit/i18n/page-list.test.ts、tests/unit/i18n/locales.test.ts、tests/unit/site/locales-config.test.ts、tests/unit/i18n/messages-shape.test.ts、tests/unit/site/home-links.test.ts、README.en.md、GLOSSARY.md、docs/adr/0008-*.md、AGENTS.md、playwright.site.config.ts、platform/en/index.md、platform/zh-TW/index.md、platform/zh-TW/guide/notes.md、tests/__helpers__/upstreamDecision.ts。

完整讀過的 HEAD 檔（新檔或本次改動的檔，HEAD 內容等同 diff 結果）：.vitepress/home-links.ts、primary-folder-links.ts、locales-config.ts、primary-locale.ts、layout-error.ts、locales.ts、theme/i18n/primaryLocale.ts、tests/unit/site/primary-folder-links.test.ts、layout-error.test.ts、range-collection.test.ts、source-layout.test.ts（第 111–470 行）。

抽樣讀過：tests/site-smoke/site-smoke.spec.ts 第 1–330 行、missing-translation.spec.ts 第 90–170 行、theme-locale-wiring.test.ts（只看 B80 案例）、.vitepress/theme/i18n/index.ts 第 1–60 行、primary-locale.test.ts 第 230–280 行。README.md、CONTRIBUTE.md、兩份 troubleshooting.md 只用 grep 抽查與核對 deferred 項目。另外讀了 VitePress 原始碼中 realPath、markdown.config 呼叫順序相關段落，作為 SPEC-B-03 的佐證。

spec 與追溯：spec.en.md 的 Implementation Decisions 和 AC-1–AC-10；traceability 的 B1–B95 全列、D4–D22、D49、D113–D141、Build error codes、Schema: locales config、Source path → URL、Home-page links、Overridden contracts Area B、U135、A34；tickets.md 全文；ticket 的 Context、AC、Test plan 區域 B、Coverage report、segment 9，以及 2026-11-16 的 wave 1(e)、(f) 段落。

Deferred P2：8a（6 筆）、8b（13 筆）、9（4 筆），以及 file 為 config.mts 或 pageList.ts 的 2 筆，全部重新判定；完全重複的已合併並在 summary 註明。primary-locale.ts 的 2 筆（屬區域 S，不在「config／source-layout／home links／page list」的指定範圍內）和 range-collection.test.ts 的 1 筆（segment 7）沒有重新判定。

沒有讀到的：G2（scripts、CI）全部、G5 除 upstreamDecision.ts 以外的全部、G3 的 skills、create-wxl、CONTRIBUTE.md diff、challenge-pipeline.md、env.d.ts、vitest.config.ts diff、README.md diff 全文（只有 grep）、G4 中區域 A、L、S、Y 的測試檔，以及 G1 的元件、composables 與 platform 其他頁面的 diff。B38（各工具先呼叫 checkSourceLayout）只用 grep 確認了呼叫點，沒有讀測試。

Missing context: SPEC-B-03 的絕對路徑結論是讀 VitePress 原始碼推得的（chunk-CCYAX98b.js:37321/37353/41759），沒有實際跑過一次觸發 PL-E11 的 build 來觀察輸出；stage 8 V-B1 才會實測。; B90 的比較基準是 stage 1 的 GLOSSARY working-tree blob（b307335 / a2ac5b6:GLOSSARY.md），packet 和 checkout 都拿不到這份內容，所以無法逐條比對「除了 U135 以外原樣落地」。; B56 要求等於 `65de8c0` 的 config.mts locales 字面值；我只拿 diff 移除的那段（base 040a5ec）比對，兩者相同，但沒有直接讀取 65de8c0。; packet 只有 Committed 層；沒有 diff 指令可用，無法驗證 ADR-0008 除了兩則 note 以外是否逐位元組不變，只能從 diff 檔看出只有兩段新增。

#### SPEC-B-01 · high · confidence high · incorrect

- Where: `tests/unit/site/config-base.test.ts:212`
- Requirement: traceability B14（real-tree part is upstream-only, D124）、B47（On the real tree it is "\"zh-TW\"" (upstream-only, D124)）、B93、D124、D54；ticket test plan B14 列「The real-tree half goes through the helper (D124)」
- Summary: B14 的 16 種環境 real-tree 案例與 B47 的 real-tree 案例沒有透過 upstreamOnlySkipReason 宣告為 upstream-only，在 range 裡會直接失敗。
- Evidence: config-base.test.ts:183 `describe('the shipped primary locale (B14, B47)', () => {` 沒有 skipIf；:212 `it.each(COMBOS)(...)` 斷言 `expect(define?.__WXL_PRIMARY_LOCALE__).toBe('"zh-TW"')`；:239 `it('B47: the real tree\'s value is a JSON string...')` 斷言 `JSON.stringify('zh-TW')`。同檔 B40（:305 `describe.skipIf(upstreamOnlySkipReason(...))`）有加，B14/B47 沒加。range-collection.test.ts:13 只在模擬 range 裡跑 source-layout、upstream-equality、layout-error 三個檔，抓不到這個問題。
- Impact: 任何 `range.json` 寫 `{"primaryLocale":"en"}` 的靶場（包括 T-0081 升級後記成 en 的靶場、README 第 7 步要老師手動加的 fork），CI 的 `test` job 會有 17 個失敗案例。這違反 Deliverable「an en range passes the same suites」，也違反 D54。
- Suggested fix: 把 `describe('the shipped primary locale (B14, B47)')` 裡的 real-tree 案例（COMBOS 與 B47 real tree）移到 `describe.skipIf(upstreamOnlySkipReason(...))` 底下；fixture-root 案例維持無條件執行。另外把 config-base.test.ts 加進 range-collection.test.ts 的 UPSTREAM_ONLY_FILES。

#### SPEC-B-02 · medium · confidence high · partial-behaviour

- Where: `tests/unit/site/config-base.test.ts:229`
- Requirement: traceability B14：fixture tree（root 為 en、platform/ 與 .vitepress/ 為 zh-TW）「the shipped value is "en" in each environment」；AC-1「in each of B14's 16 environments」；ticket test plan B14 列「Fixture root ...: "en" in each env.」
- Summary: B14 的 fixture-root 部分只在當下的環境跑一次，沒有逐一跑 16 種 SITE_BASE × CF_PAGES × WXL_SMOKE_PAGES × WXL_PRIMARY_LOCALE 組合。
- Evidence: :229 `it('B14, B47: a fixture root with {"primaryLocale":"en"} gives the JSON string "en"', ...)` 是單一案例，沒有 `it.each(COMBOS)`，也沒有設定環境變數。
- Impact: 如果 build 在某個環境下（例如 WXL_PRIMARY_LOCALE=en 搭配 fixture）改讀別的來源，只有 real-tree 那一半會抓到；但 real-tree 那一半在 range 裡應該 skip（SPEC-B-01），所以修好 SPEC-B-01 之後，range 裡的 B14 就完全沒有環境矩陣覆蓋。
- Suggested fix: 讓 fixture-root 案例也跑 `it.each(COMBOS)`，每個組合都 importFixtureConfig 並斷言 `"en"`。

#### SPEC-B-03 · medium · confidence high · incorrect

- Where: `.vitepress/primary-folder-links.ts:34`
- Requirement: traceability「Build error codes」PL-E11：`<page>` the source path quoted（relative to `platform/`）；D140；B72「throws PL-E11 naming the page」
- Summary: 實際建置時 PL-E11 的 `<page>` 會是頁面的絕對檔案路徑，不是相對於 platform/ 的 source path。
- Evidence: `const page = String(env.realPath ?? env.relativePath ?? '')`。VitePress（node_modules/vitepress/dist/node/chunk-CCYAX98b.js:37321、:37353）設定 `realPath: fileOrig`，`fileOrig` 是 vite transform 的 `id`（:41759 `markdownToVue(code, id, ...)`），也就是絕對路徑。同一檔 :36191 也把 realPath 當絕對路徑來用（`path.resolve(path.dirname(realPath ?? _path), filepath)`）。
- Impact: 老師看到的錯誤會是 `PL-E11: "/home/runner/work/.../platform/zh-TW/guide/notes.md" links to ...`，和 spec、README 的格式不一致，也把 CI 機器或本機的絕對路徑印進 log。要等 stage 8 V-B1 才會第一次看到真正的輸出。
- Suggested fix: 用 `path.relative(siteConfig.srcDir, env.realPath)` 換算成 posix 相對路徑（srcDir 可以在 config.mts 呼叫時傳給 plugin），或在 plugin 參數裡帶入 srcDir 再做 relative。

#### SPEC-B-04 · medium · confidence high · partial-behaviour

- Where: `tests/unit/site/primary-folder-links.test.ts:21`
- Requirement: traceability B72（PL-E11 naming the page）；ticket test plan B72「env is set as VitePress sets it: relativePath (rewritten) and realPath」
- Summary: 單元測試把 env.realPath 設成相對路徑，和 VitePress 實際傳入的絕對路徑不同，所以 SPEC-B-03 的錯誤不可能讓這個測試失敗。
- Evidence: :21 `const env = { relativePath, realPath, cleanUrls: true }`，呼叫端傳的是 `'zh-TW/guide/notes.md'`、`'en/foo.md'` 這類相對路徑；:40 斷言 `toContain(JSON.stringify('zh-TW/guide/notes.md'))`。
- Impact: 測試計畫寫明要照 VitePress 的方式設定 env，實際上沒有照做；`<page>` 在 production 是錯的，測試卻是綠的。
- Suggested fix: 把 realPath 設成 `join(srcDir, source)` 的絕對路徑（照 VitePress 的做法），並斷言 message 只含相對的 source path、不含 srcDir。

#### SPEC-B-05 · medium · confidence high · incorrect

- Where: `.vitepress/home-links.ts:50`
- Requirement: traceability「Build error codes」PL-E12 First line (exact)：`<reason>` 為 `is a relative link; write it from the locale's home page, such as "/guide/"` 等（ASCII 撇號 U+0027）；D141 的 reason 原文
- Summary: PL-E12 三個 reason 的「locale’s」用的是 U+2019 右單引號，不是 spec 逐字規定的 ASCII 撇號。
- Evidence: home-links.ts:44 `'is a protocol-relative link; write a site link from the locale’s home page, ...'`、:50 `'... from the locale’s home page, such as "/guide/"'`、:53 `'... from the locale’s home page, the build adds the prefix'`。在 repo 裡 grep `from the locale's home page`（ASCII）只命中 traceability.md（:200、:764），程式碼裡沒有；grep `locale’s` 命中 home-links.ts 三處與 home-links.test.ts:73。
- Impact: 「First line (exact)」的契約沒有逐字成立：依 spec 字串比對或 grep 錯誤訊息的工具、文件和老師都對不上；PL-E11 用的是 ASCII（`primary locale's folder`），同一族錯誤訊息的標點因此不一致。
- Suggested fix: 三處都改成 ASCII `'`，並讓測試直接比對 spec 表格裡的原句。

#### SPEC-B-13 · medium · confidence high · partial-behaviour

- Where: `tests/unit/site/source-layout.test.ts:169`
- Requirement: traceability B95「no character of a first line or path list line of PL-E05–PL-E12 is below U+0020 or in U+007F–U+009F」；ticket test plan B95 列「asserted on a control-char input per code: PL-E05/E06 in primary-locale, E07–E10 in source-layout ..., E11 in primary-folder-links, E12 in home-links」
- Summary: 控制字元不外洩的斷言只有 PL-E06 有（primary-locale.test.ts:271），PL-E05、E07–E10、E11、E12 都沒有對應的測試。
- Evidence: 在 tests/unit/site 裡 grep `x1b|u001b|\u009b|B95|control` 只命中 layout-error.test.ts、primary-locale.test.ts:253–254（PL-E06），以及 config-base 的 'control:' 字樣；source-layout.test.ts、home-links.test.ts、primary-folder-links.test.ts 都沒有用含 ESC 或 C1 字元的路徑或值做測試。
- Impact: 如果某條路徑清單或 PL-E12 的 `<json>` 改成不經 jsonStringifyEscaped，終端機注入的防護（TB2、D140）就會退化，而沒有測試會變紅。
- Suggested fix: 依 test plan 補上：在 fixture 裡建立含 `\u001b` 的檔名，跑 PL-E07–E09（檔案系統不允許時 skip 並寫明原因）；PL-E10 用 primary 路徑；PL-E11 用含 ESC 的 href；PL-E12 用含 `\u009b` 的 link；PL-E05 用含控制字元的值。逐一確認首行與路徑行沒有 <U+0020 或 U+007F–U+009F 的字元。

#### SPEC-B-06 · low · confidence high · partial-behaviour

- Where: `tests/unit/site/home-links.test.ts:73`
- Requirement: traceability B65「Throws with `<field>` naming the index」，並以「Build error codes」的 exact first line 為準；ticket test plan B65「The exact first line from the "Build error codes" table」
- Summary: B65 測試把 U+2019 版本寫死成期望值，所以不可能抓到 SPEC-B-05 和 spec 原句的差異。
- Evidence: home-links.test.ts:73 期望值是 `...which is a relative link; write it from the locale’s home page, such as "/guide/".`（U+2019）。B66、B67、B94 只用 `toContain` 比對 reason 的片段。
- Impact: 測試計畫要求比對 spec 表格的 exact first line，實際比對的是實作自己的字串。
- Suggested fix: 期望值逐字照抄 traceability 的 PL-E12 原句（ASCII 撇號）；B66、B94 也改成完整首行比對。

#### SPEC-B-07 · low · confidence high · incorrect

- Where: `.vitepress/home-links.ts:87`
- Requirement: traceability「Build error codes」PL-E12：`<page>` is the quoted source path；D13（只看 `layout: home` 頁）
- Summary: PL-E12 的 `<page>` 寫死成 `<pageLocale>/index.md`，但只要是 layout: home 的頁面都會跑到 localizeHomeLinks，不一定是語系首頁。
- Evidence: `const page = `${pageLocale}/index.md``；config.mts:149–152 對所有語系資料夾裡的頁面呼叫 `localizeHomeLinks(...)`，函式只檢查 `frontmatter.layout !== 'home'`。檔頭註解自己說「This function runs only on a locale's home page」，但呼叫端並沒有這個限制。
- Impact: 靶場裡如果有一頁 `platform/en/landing.md` 設了 `layout: home`，連結錯了時 PL-E12 會指名 `"en/index.md"`，老師會去改錯檔案。
- Suggested fix: 由 config.mts 把 `sourcePath`（pageData.filePath）傳進 localizeHomeLinks，當作 `<page>` 使用。

#### SPEC-B-08 · low · confidence medium · incorrect

- Where: `.vitepress/home-links.ts:20`
- Requirement: D13、traceability B66：「carries a listed locale's prefix」→ PL-E12（a whole first segment, C-11）
- Summary: 檢查前綴時取的第一段沒有先去掉 query 和 hash，所以主語系首頁上的 `/zh-TW#x`、`/zh-TW?x` 會漏過 prefix 檢查，而且通過頁面檢查。
- Evidence: `firstSegment(path)` 對 `/zh-TW#x` 回傳 `'zh-TW#x'`，不在 LOCALES 裡；P=en 的 en 首頁上 `localized` 不變，`forLookup` 去掉 hash 後變成 `/zh-TW`，`pathCandidates` 會配到 `/zh-TW/`，結果是原樣通過。
- Impact: 已經帶語系前綴的首頁連結在這種寫法下不會被擋，和 D13「寫在語系自己首頁、由 build 加前綴」的規則不一致。只影響刻意加了 query 或 hash 的連結。
- Suggested fix: 在 hasListedPrefix 之前先用 `link.replace(/[?#].*$/, '')` 取得路徑部分再取第一段。

#### SPEC-B-09 · low · confidence high · incorrect

- Where: `.vitepress/source-layout.ts:63`
- Requirement: D6（PL-E07 → PL-E08 → PL-E09 → PL-E10，報第一個有違規的規則）、B33（searched area 裡的 symbolic link → PL-E07）
- Summary: 語系資料夾底下命名成語系代碼的資料夾，會改由 mdFilesBeneath 走訪；這個函式直接跳過 symbolic link，裡面的 link 不會被記成 PL-E07。
- Evidence: mdFilesBeneath :63 `if (item.isSymbolicLink()) continue`；walkSourceTree :94–103 遇到 `en/zh-TW/` 這種資料夾時改呼叫 mdFilesBeneath 再 `continue`，不再進主 walk。例如 `platform/en/zh-TW/a.md` 是 symlink，會得到 PL-E09 `"platform/en/zh-TW/"`，而不是 PL-E07。
- Impact: 規則順序（One build reports one code）在這個邊界不成立；老師依 PL-E09 改名之後，才會再看到 PL-E07。
- Suggested fix: mdFilesBeneath 遇到 symlink 時推進 v.e07，或在主 walk 裡先完整收集 e07，再處理 e09。

#### SPEC-B-10 · low · confidence high · partial-behaviour

- Where: `.vitepress/config.mts:66`
- Requirement: traceability Overridden contracts BC15：SRC_DIR 註解、cleanUrls 註解的 `/zh-TW/challenges` 例子、`__WXL_PAGES__` 註解要「State the rewrite ... the example uses a non-primary prefix in general terms」；ticket 實作波次 :3825「plus the BC15 comments」
- Summary: BC15 指定的三段註解只改了 `__WXL_PAGES__`；SRC_DIR 和 cleanUrls 兩段沒改，cleanUrls 的例子在上游已經不成立。
- Evidence: config.mts:32 仍是 `// The source directory, relative to the repository root. The page list below reads it too.`；:66–67 仍寫 `` `/zh-TW/challenges` answers 200, while `/zh-TW/challenges.html` and `/zh-TW/challenges/` both 308 to it``。上游 P=zh-TW 之後，`/zh-TW/challenges` 會先被 R22 的 `/zh-TW/*  /:splat  302` 轉走。
- Impact: 註解描述的是切換前的網址，之後的維護者讀到會誤解 cleanUrls 的理由；Overridden contracts 的「changes only as stated」也沒有完全做到。
- Suggested fix: SRC_DIR 註解補一句「the page list maps sources through the rewrite」；cleanUrls 例子改成非主語系前綴的一般寫法（例如 `/<code>/challenges`）。

#### SPEC-B-11 · low · confidence medium · partial-behaviour

- Where: `.vitepress/theme/i18n/pages.ts:69`
- Requirement: Overridden contracts BC3：pages.ts 的 module doc spelling examples、pathCandidates 的「identified by its source file」、pageList.ts 的 `NOT_PAGES_AT_TOP` 與其註解 → 改名 entryForRelativePath、input is the rewritten path、exclusions are srcExclude's
- Summary: BC3 列出的幾處註解或常數沒有照「Now」欄改。
- Evidence: pages.ts:69 仍是 `A page the router DID render is identified by its source file instead (`entryForRelativePath`)`，但函式吃的是 rewritten path；pages.ts:6 的 spelling 例子仍用 `/zh-TW/`，這個網址在上游已經不是頁面；pageList.ts:10–14 的 `NOT_PAGES_AT_TOP` 和「public/ is copied verbatim and never rendered」註解原樣保留，排除規則仍是 pageList 自己一份，沒有改由 srcExclude 決定。
- Impact: 註解和實作意義不一致；排除規則有兩份來源（config 的 srcExclude 字面值，以及 pageList 自己的集合與 regex），以後改一邊容易漏改另一邊。
- Suggested fix: 更新 pages.ts 這兩處註解；把 srcExclude 的三個 glob 抽成 pageList.ts 的匯出常數，兩邊共用。

#### SPEC-B-12 · low · confidence medium · smell

- Where: `.vitepress/source-layout.ts:79`
- Requirement: D116「One page predicate ... defined once」；spec「One predicate decides what a page is, for the build, the tools and the upgrade (D116)」
- Summary: checkSourceLayout 和 pageListFromDir 各自實作一套「哪些是頁面、哪些要排除」的判斷，都沒有呼叫已匯出的 classifySourcePath/isPage。
- Evidence: source-layout.ts:79–111 用 `isExcludedDir` 加上 `item.name.endsWith('.md')`，mdFilesBeneath（:58–71）又另寫一套排除邏輯；pageList.ts:7、:14、:17、:59 是第三套（NEVER_PAGES、NOT_PAGES_AT_TOP、CHALLENGE_SRC_RE、dot 前綴）。
- Impact: 目前三套結果一致，但 D116 要的是單一定義。SPEC-B-09 就是兩套之間行為已經分歧的例子。
- Suggested fix: 走訪時對每個 .md 呼叫 `classifySourcePath(rel, primary)` 來分類，目錄剪枝也改用同一個 isExcluded；pageListFromDir 只收 `locale-page`。

#### SPEC-B-14 · low · confidence high · partial-behaviour

- Where: `tests/unit/site/layout-error.test.ts:45`
- Requirement: traceability B95：the function writes a tab as "\u0009", CR as "\u000d", LF as "\n", ESC as "\u001b", lone surrogate "\ud800", DEL "\u007f"（one backslash each, lowercase hex），and returns undefined for undefined and for a function
- Summary: B95 測試只比較 site 版和 create-wxl 版的輸出是否相同，沒有斷言 spec 列出的逐字期望值；而且整組在 range 裡會 skip。
- Evidence: :45–47 `expect(jsonStringifyEscaped(value)).toBe(jsonStringifyEscapedCreateWxl(value))`；:31 `describe.skipIf(B95_SKIP !== undefined)`。B95 不在 D124 的 upstream-only 清單上。
- Impact: 兩邊如果一起錯（例如都寫成大寫 hex），測試仍然是綠的；在 range 裡 site 端的轉義行為完全沒有測試（只剩 PL-E06 的兩個值）。
- Suggested fix: 另外加一組不依賴 create-wxl、不 skip 的測試，直接比對 B95 列出的字面期望值；等值比較維持 upstream-only。

#### SPEC-B-15 · low · confidence high · partial-behaviour

- Where: `tests/unit/site/source-layout.test.ts:221`
- Requirement: traceability B22：case variants 各自放在只有另一個語系主資料夾的 fixture tree；只有「when the temporary directory is case-insensitive and the variant would collide anyway」才 skip，而且要「skipped with the reason, as U55 does」
- Summary: `zh-tw/index.md` 和 `EN/index.md` 兩個案例在不分大小寫的檔案系統上直接 `return`，結果是回報通過，而不是帶原因的 skip；而且這兩個 fixture 本來就不會撞名，這個 skip 其實不需要。
- Evidence: :221–224 `if (isCaseInsensitiveFs()) { // ... return }`；:240–242 同樣寫法。fixture 已經排除 `zh-TW/`（或 `en/`），在 APFS 上不會碰撞。
- Impact: 在 darwin（開發機）上這兩個 B22 案例永遠沒有斷言，卻顯示為通過；只有 Linux CI 真的有跑。
- Suggested fix: 拿掉這個判斷，或改成 `it.skipIf(cond)` 並寫明原因；只在 fixture 真的同時有兩種大小寫時才 skip。

#### SPEC-B-16 · low · confidence medium · partial-behaviour

- Where: `tests/unit/i18n/locales.test.ts:41`
- Requirement: traceability B18 / PAT1：a test running the first two commands over tracked files
- Summary: PAT1 的兩個指令沒有檢查 exit status；git 或 bash 本身失敗時 stdout 是空的，測試仍然通過。
- Evidence: :28–32 只斷言 `res.stdout.trim()).toBe('')`；:41–45 只對 stdout 的每一行斷言 prefix。git grep 正常找不到時 exit 1，出錯時 exit 2，兩者沒有區分；`res.error`（例如找不到 bash）也沒檢查。
- Impact: 執行環境有問題時，B18 會無聲地變成沒在檢查。
- Suggested fix: 斷言 `res.error` 為 undefined，且 `res.status` 屬於 {0, 1}。

#### SPEC-B-17 · low · confidence medium · partial-behaviour

- Where: `tests/unit/i18n/page-list.test.ts:134`
- Requirement: traceability B43：the oracle「reads range.json itself (absent or keyless → zh-TW)」，an independent oracle
- Summary: B43 的 oracle 取得主語系時呼叫的是受測程式碼的 readPrimaryLocale，不是自己讀 range.json。
- Evidence: :134 與 :143 `const primary = readPrimaryLocale(resolve(REPO_ROOT, 'range.json'))`（從 .vitepress/primary-locale 匯入）。
- Impact: 如果 readPrimaryLocale 讀錯主語系，config 和 oracle 會用同一個錯誤值，B43 的獨立性就不見了（B14 的 fixture 部分只能補一部分）。
- Suggested fix: oracle 自己 `JSON.parse(readFileSync(range.json))`，檔案不存在或沒有 key 時用 'zh-TW'。

#### SPEC-B-18 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/page-list.test.ts:319`
- Requirement: traceability B36「No error; the page is in the page list as `/zh-TW/guide/only`」；ticket test plan B36 範圍包含 page-list.test.ts
- Summary: B36 在頁面清單這一半沒有斷言 `/zh-TW/guide/only` 這個 entry；translation-only fixture 只拿來檢查有沒有重複（B41）。
- Evidence: :319–323 只做 `expect(new Set(list).size).toBe(list.length)`。source-layout.test.ts:451–456 只檢查不 throw。
- Impact: pageListFromDir 如果漏列 translation-only 頁，B36 測不到。
- Suggested fix: 在 P=en 下斷言 `pageListFromDir(root,'en')` 包含 `/zh-TW/guide/only`。

#### SPEC-B-19 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/page-list.test.ts:304`
- Requirement: traceability B41「on the fixture trees of B20–B36 that pass, `new Set(list).size === list.length`」；B28/B26「give no error and no entry」（test plan 範圍含 page-list.test.ts）
- Summary: B41 只跑了三棵 fixture tree，沒有涵蓋 B20–B36 所有會通過的樹（例如 B20 空資料夾或缺資料夾的變體、B24–B28、B30）。B28 的 `README.MD` 和 B26 的 `platform/en/.x/a.md`、`platform/node_modules/p/README.md`，在 page-list 這一半也沒有「no entry」的斷言。
- Evidence: :304–324 只有 VALID_FILES、加上 `zh-TW/ja/a.md`、`en/guide/zh-TW/a.md`，以及加上 `zh-TW/guide/only.md` 三棵樹；page-list.test.ts 裡 grep 不到 `README.MD`。
- Impact: 覆蓋比 row 要求的少；目前實作看起來正確，風險低。
- Suggested fix: 把 source-layout.test.ts 裡會通過的 fixture 抽成共用表，在 page-list.test.ts 逐一跑重複檢查與 no-entry 斷言。

#### SPEC-B-20 · low · confidence high · partial-behaviour

- Where: `tests/unit/site/home-links.test.ts:84`
- Requirement: traceability B66「for both primaries and both page locales; with fixture pages platform/<L>/english/index.md ... present in the page's locale the three links pass」；test plan「Parameterised: 2 P × 2 page locales × 6 links」
- Summary: B66 的 code-like segment（`/english/`、`/enroll/`、`/zh-TWx/`）只測了 P=en、頁面語系為 en 這一種組合。
- Evidence: :84–96 只呼叫 `localizeHomeLinks(fm, 'en', 'en', pages)`；:98–104 的反例也只測 en/en。
- Impact: 翻譯首頁加前綴之後，`/en/english/` 這類情況沒有被測到。
- Suggested fix: 改成 2 P × 2 頁面語系的參數化測試，pages 依各組合放入加好前綴的 entry。

#### SPEC-B-21 · low · confidence medium · partial-behaviour

- Where: `tests/site-smoke/missing-translation.spec.ts:116`
- Requirement: traceability B44（the dist HTML set equals the source set mapped by the same independent rule）、D54（every other test derives what it expects from P and the tree it runs on, so a range's CI passes）、B24（challenge/<slug>/src/** 不是頁面）
- Summary: B44 的 source 端 oracle 沒有排除 `challenge/*/src/**`，靶場題目的 src 裡只要有 .md，這個 smoke 就會誤判失敗。
- Evidence: :116 只排除最上層的 `public`、`shared`；walk 沒有 `challenge/<slug>/src` 的判斷，而 build 的 srcExclude 有 `challenge/*/src/**`。上游目前 src 裡沒有 .md（glob 結果為空），所以現在是綠的。
- Impact: 老師在題目的應用程式裡放 README.md 之類的檔案，靶場的 site-smoke 就會紅，但 build 本身沒有問題。
- Suggested fix: oracle 的 walk 加上 `/^challenge\/[^/]+\/src$/` 的剪枝（自己寫，不從受測模組借）。

#### SPEC-B-22 · low · confidence medium · partial-behaviour

- Where: `.vitepress/theme/i18n/index.ts:17`
- Requirement: D4（取代 `.vitepress/` 內所有兩語系列舉）、D132、B18 的 stage 6 讀取（an enumeration PAT1 cannot see）、BC7（otherLocale 是 runtime 區要換掉的列舉之一）
- Summary: `otherLocale` 仍是寫死兩個語系代碼的三元運算，註解還寫著「The primary-locale epic replaces this with a locale list」，但這次 epic 就是那個 epic，卻沒有換掉。
- Evidence: :16 `/** The other of the two locales. The primary-locale epic replaces this with a locale list. */`、:18 `return locale === 'zh-TW' ? 'en' : 'zh-TW'`。messages-shape.test.ts 的 A31 守衛註解自己承認「Production's own two-locale assumption is otherLocale's hard-coded two-branch ternary ... would just compute the wrong "other" locale once a third is ever added, silently」。這個寫法 PAT1 command 2 抓不到。
- Impact: 加入第三個語系時，這裡不會出現型別錯誤，會無聲地算錯；過時的註解也會誤導讀者。是否算 D132 定義的列舉要由使用者裁定（它不是 union、陣列或 || 鏈，但同時列出了兩個代碼）。
- Suggested fix: 改成由 LOCALES 推導（例如 `LOCALES.find((c) => c !== locale)`），並在 LOCALES.length !== 2 時 throw；或至少更新註解，指向 D33 和 ja epic。

#### SPEC-B-23 · low · confidence medium · smell

- Where: `.vitepress/theme/i18n/primaryLocale.ts:14`
- Requirement: D4（`DEFAULT_PRIMARY_LOCALE` 由 locale list 模組提供，是唯一來源）
- Summary: client 模組的 fallback 另外寫了一份 'zh-TW' 字面值，沒有用 DEFAULT_PRIMARY_LOCALE。
- Evidence: `return typeof __WXL_PRIMARY_LOCALE__ !== 'undefined' ? __WXL_PRIMARY_LOCALE__ : 'zh-TW'`；檔頭只匯入了型別 `import type { Locale } from '../../locales'`。
- Impact: 預設主語系有兩個來源；以後改預設值時容易漏改這裡。
- Suggested fix: `import { DEFAULT_PRIMARY_LOCALE } from '../../locales'`（locales.ts 不匯入其他模組，進 client bundle 沒問題）。

#### SPEC-B-24 · low · confidence medium · unrequested-scope

- Where: `.vitepress/config.mts:145`
- Requirement: D10（transformPageData 經由 filePath 讀 challenge 頁的 source）、B52（其他 layout 不加 body）
- Summary: transformPageData 現在對每一頁都同步讀整個 .md 檔，不只是 challenge 頁；原本非 challenge 頁會直接 return。
- Evidence: :144–145 `const sourcePath = pageData.filePath` / `const raw = readFileSync(resolve(ctx.siteConfig.srcDir, sourcePath), 'utf-8')`，在 assemble 前無條件執行。base 版本是 `if (pageData.frontmatter.layout !== 'challenge') return`，之後才讀檔。
- Impact: 每頁多一次同步讀檔（dev server 每次 transform 都會讀）。行為上沒有錯，只是沒有 row 要求這樣改。
- Suggested fix: 只在 assembleChallengeFrontmatter 需要的時候（brief 路徑或 layout 是 challenge）才讀檔，或改成 lazy 傳入讀檔函式。

#### SPEC-B-25 · low · confidence medium · smell

- Where: `.vitepress/pageList.ts:53`
- Requirement: D9「pageListFromDir takes the primary locale as a second argument」；AC-4「pageListFromDir(srcDir, primary)」
- Summary: pageListFromDir 和 rewrittenPath 的 primary 參數都可以省略或傳 undefined，省略時不做 rewrite，等於回到舊行為。
- Evidence: pageList.ts:39 `rewrittenPath(source: string, primary: Locale | undefined)`、:40 `if (primary === undefined) return source`；:53 `pageListFromDir(srcDir: string, primary?: Locale, ...)`。page-list.test.ts:242 等舊測試仍不帶 primary。
- Impact: 以後的呼叫端如果漏傳 primary，會無聲地得到沒去掉主語系前綴的清單，型別檢查擋不下來。
- Suggested fix: 把 primary 改成必填；舊測試明確傳入 primary，或改測新版面。

#### SPEC-B-26 · low · confidence high · partial-behaviour

- Where: `README.en.md:273`
- Requirement: traceability B84：names `smoke-fixtures/` as reserved and says that a page moved there, by hand or by the upgrade（a legacy `platform/smoke-fixtures/x.md` becomes `platform/en/smoke-fixtures/x.md`），is not published by a production build
- Summary: 兩份 README 的 smoke-fixtures 段落都沒有寫 B84 指定的例子：舊版面的 `platform/smoke-fixtures/x.md` 搬家後會變成 `platform/en/smoke-fixtures/x.md`。
- Evidence: README.en.md:273「A page moved into a folder such as `platform/en/smoke-fixtures/`, by hand or by the upgrade, is not published by a production build.」；README.md:264 是同樣的內容，也沒有這個例子。
- Impact: 舊版面靶場如果剛好有頂層的 `smoke-fixtures/` 資料夾，老師不會知道搬家之後那些頁面會從正式站上消失。
- Suggested fix: 兩種語言都補上這個例子。

#### SPEC-B-27 · low · confidence medium · incorrect

- Where: `platform/en/guide/troubleshooting.md:206`
- Requirement: traceability A34（區域 A，此處僅記錄發現）：「true under either P」；D26（cold load 主語系頁面不寫入任何值）；D28/S-§4.1（P=zh-TW 時 `/zh-TW/…` 會轉址回根網址）
- Summary: 中英兩版「網站記住哪個語系」段落的結尾都寫：連結把你帶到 `/zh-TW/` 底下的頁面後重新整理，就會記成繁體中文。上游 P=zh-TW 時，`/zh-TW/` 底下已經沒有頁面。
- Evidence: en:206 `... under `/zh-TW/`, reloading that page sets Traditional Chinese.`；zh-TW:206「所以連結把你帶到 `/zh-TW/` 底下的頁面之後，重新整理那一頁就會記成繁體中文。」上游沒有 range.json，主語系是 zh-TW，`/zh-TW/x` 會被 R22 規則或 not-found 的 strip 轉到 `/x`（主語系頁面，D26 規定不寫入）。
- Impact: 上游學習者照著文件做會得到相反的結果；這句只有在 P=en 時成立，違反 A34「不得假設固定根語系」。屬於區域 A，交由該軸複核。
- Suggested fix: 改成不綁定代碼的說法，例如「連結把你帶到網址以語系代碼開頭的頁面之後，重新整理那一頁就會記成那個語系」。

#### SPEC-B-28 · low · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:446`
- Requirement: traceability B90（lands with the switch ticket ... so main never describes behaviour it does not have, K-9）對照 D91–D93（升級搬家是 T-0081/T4 的範圍）
- Summary: 【合併 8a 兩筆重複（原 :451 與 :448）】still present：搬家詞條寫「升級時看到舊版面就先替老師搬家再合併」，加上【易混】那行升級報告的說明，描述的都是 T-0081 才會有的行為。
- Evidence: GLOSSARY.md:446「…升級時看到舊版面就先替老師搬家再合併；不經升級的靶場由老師照文件自己搬。」B90 只排除 U135 的兩句。
- Impact: T-0077 合併後、T-0081 落地前，main 的詞彙表描述了還不存在的升級行為。依 memory，下一個 release tag 要等其他票，對外發布的影響有限。這是 spec 內部的不一致：B90 的理由與 B90 的內容互相衝突。
- Suggested fix: 交由使用者決定：把這兩句一起延到 T-0081，或接受並在 B90 補一句說明。

#### SPEC-B-29 · low · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:407`
- Requirement: traceability B90：語系清單 becomes 「清單以外的資料夾裡不能有頁面」
- Summary: 【8a】still present：多了一個「也」字（「清單以外的資料夾裡也不能有頁面」），語意不變。
- Evidence: GLOSSARY.md:407「靶場的主語系必須在語系清單上，清單以外的資料夾裡也不能有頁面，否則網站建置不起來。」
- Impact: 只是沒有逐字照 spec；沒有測試比對這句，對讀者也沒有影響。
- Suggested fix: 可以不改；要逐字一致就刪掉「也」。

#### SPEC-B-30 · low · confidence medium · deferred-p2-regraded

- Where: `GLOSSARY.md:98`
- Requirement: S71、K-11、D30、D58
- Summary: 【合併 8a 兩筆（原兩筆 :98）】still present：「帶翻譯語系代碼的短連結一律開那個翻譯」和前一句「那個語系沒有這道題目的頁面時，它開主語系那一頁」字面上互相衝突；「開它唯一存在的那一頁」也比 D58 的「清單上第一個有說明頁的語系」窄。
- Evidence: GLOSSARY.md:98 全句。在只有兩個語系時，「唯一存在」和「第一個有說明頁」結果相同。
- Impact: 只是措辭問題，行為沒有錯；到了 ja epic，「唯一」這個說法就不成立了。
- Suggested fix: 改成「帶翻譯語系代碼的短連結，在那個翻譯存在時一律開它」；「唯一存在的那一頁」可以等 ja epic 再改。

#### SPEC-B-31 · low · confidence high · deferred-p2-regraded

- Where: `GLOSSARY.md:400`
- Requirement: traceability B90（主語系 says upstream has every page in every locale）對照 K-9 同一變更規則；D51/L40 由 T-0080 負責
- Summary: 【8a】still present：主語系詞條寫「上游的每一頁在每個語系都有版本」，但 HEAD 沒有 `platform/zh-TW/reference/attack-log-export-format.md`（要等 T-0080），所以這句目前不成立。
- Evidence: GLOSSARY.md:400；Glob `platform/zh-TW/reference/*` 沒有結果。
- Impact: 在 T-0080 落地之前，main 的詞彙表有一句不成立的敘述；屬於 spec 內部不一致（B90 要求 T-0077 寫入，K-9 則要求 main 不描述它還沒有的狀態）。
- Suggested fix: 交由使用者決定：接受（T-0080 會在同一個 epic、release 之前補上），或把這半句延到 T-0080。

#### SPEC-B-32 · low · confidence medium · deferred-p2-regraded

- Where: `platform/zh-TW/guide/troubleshooting.md:202`
- Requirement: A34（true under either P、不得假設固定根語系）、VM10
- Summary: 【8b】still present：繁中「為什麼」段的例子「某個只有英文版的題目的繁中連結」，在 P=zh-TW 時不可能出現（每道題都有主語系說明頁），英文版用的是不綁語系的說法。
- Evidence: zh-TW:202「例如某個只有英文版的題目的繁中連結、手改過的網址、舊連結」；en:202「a link in your language to a page that has none」。
- Impact: 在上游（P=zh-TW）讀起來是錯的例子；兩種語言的內容也不一致。
- Suggested fix: 改成和英文版對應的通用說法，例如「某一頁在你的語系沒有版本時的連結」。

#### SPEC-B-33 · low · confidence high · deferred-p2-regraded

- Where: `README.md:262`
- Requirement: traceability B84：without it `pnpm range:upgrade` stops with UP-E06 `upstream` until epic 0011 (R25, U143)
- Summary: 【8b】still present：兩份 README 都沒寫「until epic 0011」，也沒有點明缺的是 `upstream`。
- Evidence: README.md:262「否則會停在 UP-E06。」；README.en.md:271「without it `pnpm range:upgrade` stops with UP-E06.」
- Impact: 老師會以為這是永久限制；B84 列出的內容少了一項。
- Suggested fix: 兩種語言都補上「直到 epic 0011」，以及 UP-E06 對應的 `upstream`。

#### SPEC-B-34 · low · confidence high · deferred-p2-regraded

- Where: `README.en.md:336`
- Requirement: S69（Copied links carry the list's locale code on both primaries）、GLOSSARY locale list（語系清單）
- Summary: 【8b】still present：「carry the locale list's code」把 GLOSSARY 的 locale list（平台可用的語系組）誤用成「題目清單所在語系的代碼」。
- Evidence: README.en.md:336「Copied short links carry the locale list's code on either primary locale」。
- Impact: 英文讀者可能讀成「帶語系清單的代碼」，意思不通；繁中版沒有這個問題。
- Suggested fix: 改成「carry the locale code of the page or list they were copied from」。

#### SPEC-B-35 · low · confidence medium · deferred-p2-regraded

- Where: `README.md:162`
- Requirement: S70、D63（Retiring = move platform/challenge/<slug>/ to .archive and delete every brief of the slug in the same commit）
- Summary: 【8b】still present：補救說明只寫了「補說明頁」或「整道移到 .archive」兩種做法。「說明頁缺 challenge.yaml」這種情況沒提到要補 challenge.yaml，也沒說下架時要在同一個 commit 刪掉所有說明頁。
- Evidence: README.md:162 與 README.en.md:162 都只寫「write the brief under platform/<locale code>/challenge/<slug>/, or retire the whole challenge to .archive/challenge/<slug>/」。
- Impact: 遇到缺 challenge.yaml 的情況，老師照著文件找不到正確的修法；S70 列文字本身沒有被違反。
- Suggested fix: 補上「或補上 platform/challenge/<slug>/challenge.yaml」，下架那句加上「並在同一個 commit 刪掉各語系的說明頁」。

#### SPEC-B-36 · low · confidence high · deferred-p2-regraded

- Where: `README.md:264`
- Requirement: B84（spec 指定的內容）對照 K-9
- Summary: 【8b】still present：README 的「搬到語系資料夾」開頭（:249）和 smoke-fixtures 句（:264「手動搬或升級搬都一樣」）都把升級搬家寫成已經存在的行為；README.en.md:273 也一樣。和 SPEC-B-28 是同一類問題，但在不同檔案。
- Evidence: README.md:264；README.en.md:273「by hand or by the upgrade」。
- Impact: T-0081 落地之前，文件描述了還不存在的升級行為；不過這段文字是 spec B84 指定的。
- Suggested fix: 和 SPEC-B-28 一起交由使用者裁定。

#### SPEC-B-37 · low · confidence high · deferred-p2-regraded

- Where: `CONTRIBUTE.md:163`
- Requirement: Y94–Y101（文件一致性）、D87
- Summary: 【合併 8b 兩筆重複】still present：同一段先說不要手動改 challenge.yaml，後面又寫「by a retype or by hand」，前後矛盾。
- Evidence: CONTRIBUTE.md:163 同時有 `do **not** edit` 和 `by a retype or by hand`。
- Impact: 只是措辭打架，不影響行為。
- Suggested fix: 把後一句改成「If `pnpm dev` is running when `challenge.yaml` changes」。

#### SPEC-B-38 · low · confidence high · deferred-p2-regraded

- Where: `docs/adr/0008-locale-folders-primary-chosen-at-build.md:50`
- Requirement: B87（note under consequence 2；其他行逐位元組不變）
- Summary: 【合併 8b 兩筆重複】still present，不算 spec 缺陷：blockquote 插在 Consequences 清單中間，Markdown 會把清單渲染成兩段。
- Evidence: ADR:46–48 是第 2 項，:50–55 是 note，:57 是第 3 項。B87 的位置要求和逐位元組要求都符合。
- Impact: 只影響排版。
- Suggested fix: 可以不改；要改的話把 note 縮排成清單項目底下的段落。

#### SPEC-B-39 · low · confidence high · deferred-p2-regraded

- Where: `README.md:98`
- Requirement: BC17（README architecture 段）、Y97
- Summary: 【合併 8b 兩筆重複】still present：兩份 README 的架構樹仍寫「Challenge pages (Markdown + YAML frontmatter)」，沒有反映 challenge.yaml。
- Evidence: README.md:98、README.en.md:98 `│   ├── Challenge pages (Markdown + YAML frontmatter)`。
- Impact: 內容過時、不完整，但不能算錯（說明頁仍然有 frontmatter）。BC17 把 README architecture 列為會被這次切換影響的地方。
- Suggested fix: 改成「Challenge briefs (Markdown) + challenge.yaml declarations」。

#### SPEC-B-40 · low · confidence medium · deferred-p2-regraded

- Where: `platform/en/guide/troubleshooting.md:206`
- Requirement: A34 expected（with nothing remembered ... no line appears）對照 A12/AC-12（except a not-found redirect's line）
- Summary: 【8b】still present，並升級判斷為 spec-inconsistency：「While the site remembers no language ... the line does not appear」在 not-found 轉址時不成立（AC-12 明訂這是例外），和同一條目 :202 的第一種情境互相衝突。
- Evidence: en:206「While the site remembers no language, a page is shown in the language of the address you opened, and the line does not appear.」；en:202「when you open an address for a translation that does not exist ... the address bar changes」；AC-12「no page arrival shows the line except a not-found redirect's」。zh-TW:206 也一樣。
- Impact: 文件照 A34 的期望欄寫成全稱句，但 A34 和 AC-12 本身就不一致；讀者可能誤以為打開不存在的翻譯網址時不會出現提示。
- Suggested fix: 在 A34 與文件中加上限定，例如「打開一個存在的頁面時」。

#### SPEC-B-41 · low · confidence high · deferred-p2-regraded

- Where: `README.md:160`
- Requirement: 範圍說明（S70 以外的 README「修復過期的 _redirects」與 CONTRIBUTE L1 列）
- Summary: 【8b】not a defect：README.md:160、README.en.md:160 把 frontmatter 改成 challenge.yaml，CONTRIBUTE.md:184 的 L1 列也改了，超出原本的列範圍，但內容正確，而且和 scripts/challenge-numbers.ts 的訊息一致。
- Evidence: README.en.md:160「has no `number` in its `challenge.yaml`」。
- Impact: 沒有負面影響；不改反而會讓文件變成錯的。
- Suggested fix: 不需修正，在 disposition 記成「接受的範圍外修正」。

#### SPEC-B-42 · low · confidence high · deferred-p2-regraded

- Where: `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:3201`
- Requirement: hard rule 2（coverage report table）、ticket AC 清單（A30–A32 → AC-17）
- Summary: 【9】still present：coverage 表「A10, A12, A32, 0010-S16」這一列的 AC 欄只寫 AC-11、AC-12，少了 AC-17。
- Evidence: :3201 `| A10, A12, A32, 0010-S16 (comment and removal rows) | ... | AC-11, AC-12 | ...`；ticket :115 把 A30–A32 歸在 AC-17。
- Impact: 這是紀錄問題，追溯時可能誤判 AC-17 沒有覆蓋。
- Suggested fix: AC 欄補上 AC-17。

#### SPEC-B-43 · low · confidence high · deferred-p2-regraded

- Where: `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:3192`
- Requirement: hard rule 2
- Summary: 【9】still present：0010-S9 那一列的 Uncovered 欄沒列 B37；B74 的寫法也可能被讀成 W9-2 已經涵蓋了 B74 的觀察。實際上兩者都在 :3232 的 stage 8 清單裡，沒有遺漏。
- Evidence: :3192「B15 and B49 are stage 8 (V-B6); B74 under `P = zh-TW` is W9-2」。
- Impact: 只是措辭容易誤導，沒有實際缺漏。
- Suggested fix: 改成「B15、B37、B49、B74 的部署觀察都是 stage 8（V-B1、V-B6）；W9-2 只證明 interim 文字在 P=zh-TW 下可以建置」。

#### SPEC-B-44 · low · confidence high · deferred-p2-regraded

- Where: `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:3231`
- Requirement: hard rule 2
- Summary: 【9】still present：coverage 表的 AC 欄沒有標 AC-56（VA 列）和 AC-59（V-Y 列），只在「Not covered」清單裡列出 row id。
- Evidence: :3232 只列 row id；整張表找不到 AC-56、AC-59 的標籤。
- Impact: 紀錄不完整；那些列本來就是 stage 8 的工作，覆蓋沒有遺漏。
- Suggested fix: 在「Not covered」清單的 row id 旁補上 AC 標籤。

#### SPEC-B-45 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/scripts/upstream-guard.test.ts:1045`
- Requirement: B93、D124（WXL_EXPECT_UPSTREAM 的期望檢查）
- Summary: 【9】not a defect：:3239 記錄的最後一次全套執行設了 `WXL_EXPECT_UPSTREAM=true`，結果是 6976 passed、0 skipped，所以這個案例有跑到。不過 coverage report 的開頭（:3187）仍寫著前一次執行的「6975 passed, 1 skipped」，紀錄前後不一致。
- Evidence: :3239「Env: GITHUB_REPOSITORY=BrowserLaboratory/wxl-platform WXL_EXPECT_UPSTREAM=true CI=true ... 6976 passed, 0 failed, 0 skipped」；:3187「root `pnpm test --run` (154 files, 6975 passed, 1 skipped)」。
- Impact: 測試沒有缺陷；只是 coverage 紀錄裡有兩組不同的數字。
- Suggested fix: 更新 :3187 的數字，或註明以 :3239 為準。

#### SPEC-B-46 · low · confidence high · deferred-p2-regraded

- Where: `.vitepress/config.mts:56`
- Requirement: D49（srcExclude 加上 `<code>/smoke-fixtures/**`；pageListFromDir 用 isSmokeFixturePage）
- Summary: 【合併 3a/3b 兩筆重複（config.mts:56 與 pageList.ts:31）】not a defect：D49 本身就規定 srcExclude 用 glob，pageListFromDir 用謂詞；「used by both」是 spec 措辭不夠精確，不是實作偏離。兩邊目前仍是 glob 和謂詞各一份（still present），L34 與 L35 從外部各自驗證了一致性。
- Evidence: config.mts:56 `...(smokePages ? [] : SMOKE_FIXTURE_GLOBS)`；pageList.ts:25–31 是謂詞，SMOKE_FIXTURE_GLOBS 也由 LOCALES 推導。
- Impact: 沒有使用者可見的缺陷；兩種寫法以後可能漂移，這個風險由 L34 和 L35 的測試把關。
- Suggested fix: 不需修正；可以在 spec 的 D49 補一句「srcExclude 用由同一模組匯出的 glob」。

### Spec · A (51 findings: 0 high, 5 medium, 46 low)

Coverage: 全部讀完的部分（diff 檔或 HEAD 的 live 檔全文）：
- diff 全文：.vitepress/theme/composables/useArrivals.ts、.vitepress/theme/i18n/arrival.ts、.vitepress/theme/i18n/index.ts、.vitepress/theme/index.ts、tests/unit/i18n/initial-locale-redirect.test.ts、platform/zh-TW/guide/troubleshooting.md、tests/site-smoke/session-gate-clear-report.spec.ts、tests/site-smoke/localePath.ts。
- live 檔全文：.vitepress/theme/i18n/{arrival,lookup,pages,primaryLocale,index}.ts、composables/useArrivals.ts、components/{LocaleSwitcher.vue,MergedNav.vue,MissingTranslationLine.vue,localeSwitcherLabels.ts}、tests/__helpers__/localeTables.ts、tests/unit/components/MissingTranslationLine.test.ts、tests/unit/i18n/{page-locale-of,primary-locale-client,route-locale-sync}.test.ts、playwright.site.config.ts、tests/unit/i18n/not-found-wiring.test.ts（1–1246 行，幾乎全檔）、tests/site-smoke/missing-translation.spec.ts（1–459 行）。

抽樣的部分：
- .vitepress/theme/index.ts：live 60–259 行。
- theme-locale-wiring.test.ts：1–160、530–810 行，加上 describe/it 清單。
- arrival.test.ts：55–375 行。
- locale-switcher.test.ts：1–25、444–500 行。
- messages-shape.test.ts：A31 區段。
- MergedNav.test.ts：1–50 行與 grep。
- ChallengeList.test.ts、HomeContent.test.ts：只用 grep 看 A28/A32。
- platform/en/guide/troubleshooting.md：只讀 live 196–207 行；234 行的 diff 沒有讀完。
- README.md、README.en.md、GLOSSARY.md：只 grep 偏好句與 主語系 詞條。
- localStorageKeys.ts、useSessionGate.ts、SessionGate.vue：只讀相關註解片段。
- spec.en.md：1–540 行。
- traceability：A 列 2013–2056、DT／SW 表 882–1004、Overridden contracts Area A 1646–1666、GD1、Revision 2.3。
- 票：開頭 1–200、Area A 測試計畫 3351–3428、Coverage report 3154–3247、wave 2 與 B1 comments 1160–1409。
- deferred JSON：2z、3c 兩段全讀；其他段只略過。

沒有讀到的部分：
- G1 中區域 A 以外的檔案（challenge/config、shortLink、source-layout、locales-config、home-links、清單元件等）。
- G2、G3（GLOSSARY 與 README 除外）、G5 全部。
- G4 中 localize-path.test.ts、locales.test.ts、page-list.test.ts、site-smoke.spec.ts，以及 ChallengeList／HomeContent／MergedNav 測試的大部分。
- lookup.ts、pages.ts 的 diff 本身（改讀 live 檔）。
- 票中 2026-11-16 B2–B4 段（1410–1855 行）只透過測試內的引用間接得知。

所有判斷都是讀程式碼得出的；沒有執行任何測試、build 或 git 指令。

Missing context: A22 與 A31 都要求 stage 6「暫時加入第三個語系代碼（不 commit）」，示範測試會失敗並記錄輸出；我是唯讀審查者，無法執行，需要由 parent 或 executor 補做並記錄。; SPEC-A-30（base /repo/ 下 runtime 語系錯誤）的依據，是讀 node_modules/vitepress/dist/client/app/router.js:35-46 推論 route.path 含 base，沒有在真實瀏覽器上驗證；需要在 stage 8 的 F-3（GitHub Pages）觀察 /<repo>/en/… 頁面上 FlagSubmit／SessionGate 的字串語言來確認。; code-panel-platform.spec.ts:90 是否仍然不穩定（SPEC-A-48），需要重複執行 smoke（例如 --repeat-each=5）才能判定；我無法執行。; 票中 2026-11-16 wave 2 B2–B4 段（約 1410–1855 行）沒有全讀；如果其中有 parent 決定縮減「真實 Layout 上的 not-found DT 表」（SPEC-A-01）或 A16／A39 真實 Layout 案例的範圍，相關 finding 應改判為 spec-inconsistency 或撤回。

#### SPEC-A-01 · medium · confidence high · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:4`
- Requirement: T-0077 Test plan（Area A）第 2 列（ticket:3358）：DT17–DT40、DT57–DT80 要在 0010-S13 真實 Layout 上以「新的 describe.each(P) 表」逐列跑，rows from localeTables.ts；AC-11、AC-13
- Summary: not-found 的 DT 表（NT/NP/NU 共 48 列）只在純函式 notFoundRedirect（arrival.test.ts）逐列跑過；真實 Layout 這一半沒有建表，只有零散幾個手寫案例。票的 AC 勾選框「A1–A10, DT01–DT80」卻已打勾。
- Evidence: not-found-wiring.test.ts 第 4 行只 import `SW, BASES`，沒有 import `DT_NOT_FOUND`；檔內真實 Layout 的表只有第 781–820 行的「decision table A1–A5, A7」（只含 PP/TP 列）。測試計畫明寫「not-found-wiring.test.ts (new describe.each(P) table beside 'the real Layout: a not-found arrival')」，AC 欄要求每一列在真實 Layout 上驗證 landing line、不寫入、stored value 不影響結果。
- Impact: NP、NU 與 missing 各列在真實 Layout 上的 go 次數、landing 行、wxl-locale 不變，沒有逐列、逐 stored value、逐 base 驗證；之後只要 useArrivals 的接線（carry、record、release）改錯，純函式測試仍會全綠。
- Suggested fix: 照計畫在 not-found-wiring.test.ts 新增 describe.each(P)×BASES，逐列跑 DT_NOT_FOUND：每列各試 stored 值、確認 go 的呼叫、landing 行的 lang 與 wxl-locale；或在票中記錄縮減範圍的決定，並取消勾選該 AC。

#### SPEC-A-02 · medium · confidence high · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:163`
- Requirement: traceability A16（DT33…DT79）：0010-S13 landing line `lang = P`；ticket 測試計畫 A16 列（ticket:3375）「not-found-wiring.test.ts landing line」
- Summary: NU（主語系路徑找不到，`/<T>/X` 有發布）在真實 Layout 上完全沒有測試：沒有任何案例確認落地頁顯示 P 語系的提示行。
- Evidence: 在 not-found-wiring.test.ts 搜尋 A16、`only-in-english` 等 NU 情境，只出現在 SW 與 A5 表中，沒有「not-found 的主語系路徑 → replace 到 /<T>/X → 提示行 lang=P」的案例。純函式 arrival.test.ts 只驗證 requested=P。
- Impact: 如果 carry 沒有把 P 帶到落地頁（例如 record 改成忽略 carried），落地頁就不會出現提示行，測試抓不到。這正是 VA2g 在 stage 8 要看的行為。
- Suggested fix: 兩種 P 各加一個真實 Layout 案例：arrive 一個 NU not-found 路徑，確認只呼叫一次 go(…, {replace:true})，再 arrive 落地頁，確認 `[data-missing-translation]` 的 lang 是 P，而且 wxl-locale 沒有變。

#### SPEC-A-03 · medium · confidence high · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:163`
- Requirement: traceability A39：0010-S13「one go with replace, landing line lang = P, wxl-locale unchanged」；ticket 測試計畫 A39 列（ticket:3397）
- Summary: D28 的 fall-through（`/<P>/X` 沒有發布、`/<T>/X` 有發布）只在純函式層測過，真實 Layout 上沒有任何案例。
- Evidence: arrival.test.ts:178-187 只驗證 notFoundRedirect 的回傳值；not-found-wiring.test.ts 找不到 A39 或 `/<P>/<P>-only` 之類的落地案例。
- Impact: A39 落地頁應該出現 P 語系的提示行、不寫入、之後也不再做 cold-load 轉址，這些在接線層都沒有防護；VA2h 是唯一的驗證點。
- Suggested fix: 兩種 P、兩種 base 各加一個真實 Layout 案例，分別確認 go、落地頁提示行的 lang、wxl-locale，以及 stored T 時沒有第二次 go。

#### SPEC-A-13 · medium · confidence high · incorrect

- Where: `.vitepress/theme/i18n/index.ts:243`
- Requirement: traceability「Overridden contracts › Area A」第一列：「redirectTargetForStoredLocale's "No preference is not 'no opinion'…" comment and its ?? DEFAULT_VISITING_LOCALE」→ D25、A1；A36 / AC-19
- Summary: 程式碼已改成 `?? P`，但註解還寫「沒有偏好就是預設值存在的理由」，和 D25（沒有偏好就不轉址、不換語系）正好相反。
- Evidence: 第 243–246 行：`// No preference is not "no opinion about where to send them" — it is the case the default exists for. …` 下一行就是 `const wanted = readStoredLocale() ?? P`。契約表點名要改的正是這段註解。
- Impact: 讀程式的人會以為沒有偏好的學習者會被送往某個預設語系，跟 A1 和 D25 的規則衝突；AC-19 要求註解在兩種主語系下都為真，這一條不成立。
- Suggested fix: 改寫成：沒有偏好（包括讀不到的值或無效值）時，requested 就是 P，主語系頁面因此不轉址（D25、A1）。

#### SPEC-A-30 · medium · confidence medium · incorrect

- Where: `.vitepress/theme/index.ts:53`
- Requirement: traceability A29：介面（vue-i18n runtime）語系由 detectLocaleFromPath 決定，在 bootstrap 與每次換路由時套用；A7（base /<repo>/）；AC-16
- Summary: route watcher 與 detectInitialLocale 都把含 base 的路徑（route.path／location.pathname）直接傳給 detectLocaleFromPath；在 base `/repo/` 下，所有翻譯頁都會被判成 P，runtime 語系因此錯誤。
- Evidence: index.ts:53 `detectLocaleFromPath(newPath, primaryLocale())`，newPath 來自 `route.path`；VitePress router.js:46 `route.path = inBrowser ? pendingPath : …`，pendingPath 是完整的 pathname（含 base）。i18n/index.ts:156 用的是 `window.location.pathname`。`'/repo/en/guide/'` 不以 `/en/` 開頭，所以回傳 P。theme-locale-wiring 的 A29 案例都沒有設定 base。
- Impact: 上游預設（P=zh-TW）部署到 GitHub Pages（base /<repo>/）時，`/repo/en/…` 頁面上使用 runtime `t` 的元件（FlagSubmit、SessionGate、NotesModal 等 17 個檔案）會顯示繁中。這個問題在 0008 就存在（當時是 P=en 的 /repo/zh-TW/ 頁顯示英文），這次切換讓它出現在上游的預設設定上；VA2 沒有檢查這些字串。
- Suggested fix: 先用 withoutBase(path, site.base) 去掉 base，再交給 detectLocaleFromPath；並在 theme-locale-wiring 加上 base `/repo/` 的 A29 案例。如果認定這是 0008 的既有缺陷，應另開票處理。

#### SPEC-A-04 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:190`
- Requirement: traceability A15：0010-S13「one go with replace, no [data-missing-translation] on the landing, wxl-locale unchanged, and no cold-load redirect afterwards even with a stored T (D29)」
- Summary: 兩個 D29 案例只檢查 go 的呼叫，沒有檢查落地頁不出現提示行，也沒有檢查 wxl-locale 不變。
- Evidence: 第 190–226 行只有 `expect(mockGo).toHaveBeenCalledTimes(1)` / `toHaveBeenCalledWith('/guide/python', { replace: true })` 與之後的 `not.toHaveBeenCalled()`，沒有讀 `[data-missing-translation]`，也沒有讀 localStorage。
- Impact: 如果 NP 的 requested 被錯算成 T（arrival.ts 註解說過曾經發生），落地頁就會出現提示行，這兩個案例抓不到；只剩 smoke（只跑 P=zh-TW）擋得住。
- Suggested fix: 在兩個 D29 案例最後補上 `layout.find('[data-missing-translation]').exists() === false`，以及 `localStorage.getItem(LOCALE_STORAGE_KEY)` 仍是原本存的值。

#### SPEC-A-05 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:163`
- Requirement: traceability A7：「0010-S10 and 0010-S13 cases of A1–A5 and A14–A17 run under / and /repo/」
- Summary: 真實 Layout 上的 not-found 案例（A14–A17）全部只在 base `/` 下跑，`/repo/` 只出現在 PP/TP 表與 SW 表。
- Evidence: 檔內 `mockBase.value =` 只出現在第 145（`/`）、791（A1–A5 表）、906（B3 switcher）、1116 與 1180（SW 表）行；第 163–528 行的 not-found 各 describe 都沒有設定 `/repo/`。
- Impact: base 底下的 not-found 轉址目標（targetPath 綁 carry、withoutBase）在接線層沒有驗證；VA2 在 GitHub Pages 上是唯一驗證點。
- Suggested fix: 把 A14–A17 的真實 Layout 案例參數化到 BASES（SPEC-A-01 的表可以一併涵蓋）。

#### SPEC-A-06 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/theme-locale-wiring.test.ts:537`
- Requirement: traceability A33：0010-S13「"does not redirect when the learner chooses to clear" passes under both P」；ticket 測試計畫 A33 列（ticket:3392）
- Summary: A33 的「選擇清除就不轉址」只有 P=en 版本，沒有 P=zh-TW 的對應案例。
- Evidence: 第 537–555 行只有 P=en（stored 'zh-TW'）；第 666–741 行的「under P = zh-TW」鏡像只有五個會轉址的案例，沒有 clear 案例。第 559–585 行新增的是 root 的 A3/A1 冷載入案例，不是 clear 本身。
- Impact: P=zh-TW、stored en 時，cleared 之後持有的轉址是否確實被丟棄，沒有測試；stage 8 VA1j 才會看到。
- Suggested fix: 加一個「under P = zh-TW, does not redirect when the learner chooses to clear (A33)」案例：stored 'en'，decision 設為 'cleared'，確認 go 沒有被呼叫。

#### SPEC-A-07 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/theme-locale-wiring.test.ts:503`
- Requirement: traceability A6：0010-S13「the existing session-gate cases … pass with P set to each value and a stored T」
- Summary: session gate 的「保留轉址」案例只在 P=en 下跑：「does not redirect while the choice is unanswered」（503 行）和「holds the redirect on any page while a clear is unconfirmed」（639 行）都沒有 P=zh-TW 的鏡像。
- Evidence: 第 666–669 行的註解說只鏡像「assertion names a locale-specific redirect target」的五個案例；但 A6 的 AC 寫的是 existing session-gate cases 全部要在兩種 P 下通過。
- Impact: P=zh-TW 下閘門還在詢問時，轉址是否確實被保留，只能靠程式碼共用推論，沒有直接證據。
- Suggested fix: 把 503、639 行（以及 537 行，見 SPEC-A-06）各鏡像一份到 P=zh-TW、stored 'en'。

#### SPEC-A-08 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/theme-locale-wiring.test.ts:752`
- Requirement: traceability「Overridden contracts › Area A」〈The cold-load redirect leaves only the unprefixed tree〉列：「…: the deferred redirect does not outlive the layout (… each also runs under P = zh-TW with stored en)」
- Summary: 「the deferred redirect does not outlive the layout」的三個案例只有 P=en，契約表要求的 P=zh-TW、stored en 版本沒有加。
- Evidence: 第 752–801 行三個案例都用 `setItem(LOCALE_STORAGE_KEY, 'zh-TW')`，沒有設定 `mockPrimaryLocale.value = 'zh-TW'`。
- Impact: 契約列寫明的對應關係沒有落實；Area A 的開頭也說 stage 6 要檢查契約表裡的每一項都照表改了。
- Suggested fix: 三個案例各加一份 P=zh-TW、stored 'en' 的版本。

#### SPEC-A-09 · low · confidence high · partial-behaviour

- Where: `tests/unit/components/MergedNav.test.ts:441`
- Requirement: traceability A28 / AC-16：MergedNav、LocaleSwitcher「derive the page locale only through pageLocaleOf, in SSR output and after mount」；測試計畫 A28 列（ticket:3387）「renderToString and mount」
- Summary: MergedNav 和 LocaleSwitcher 在 P=zh-TW 下只用 mount 測過，沒有 renderToString（SSR）的案例；ChallengeList 和 HomeContent 有。
- Evidence: 在 MergedNav.test.ts 與 locale-switcher.test.ts 搜尋 `renderToString|server-renderer|createSSRApp`，沒有任何結果；ChallengeList.test.ts:442、HomeContent.test.ts:167 有。
- Impact: A28 寫明靜態 HTML 也要正確（主語系 zh-TW 時 nav 連結是 /challenges、標籤是繁中）。SSR 和 mount 走的是同一個 computed，所以出錯的機率不高，但 AC 指定的 seam 沒有測到。
- Suggested fix: 兩個檔案各加一個 P=zh-TW、localeIndex 'root' 的 renderToString 案例，確認 href 與標籤。

#### SPEC-A-10 · low · confidence medium · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:668`
- Requirement: traceability A11 / AC-12：「with stored P, onto a translation page without a P version, the line in P」（the reverse）
- Summary: A11 的第三種情況（存的是 P，之後經連結到一個沒有 P 版本的翻譯頁，要顯示 P 語系的提示行）在真實 Layout 上沒有案例。
- Evidence: 第 670–695 行只測 stored T → 主語系頁；第 365、431 行測的是沒有偏好的情況。檔內找不到「stored P、later navigation → 翻譯專屬頁 → lang=P」的案例。
- Impact: AC-12 的「and the reverse」沒有證據；如果 requestedLocaleForPageArrival 對已加前綴的頁面一律回傳 T，就抓不到。
- Suggested fix: 兩種 P 各加一個案例：先存 P，冷載入一頁之後 arrive 到翻譯專屬頁，確認提示行的 lang 是 P。

#### SPEC-A-11 · low · confidence medium · partial-behaviour

- Where: `tests/unit/i18n/not-found-wiring.test.ts:776`
- Requirement: traceability A9：0010-S13「the same cases as A1–A5, plus the orphan's landing writing T」；測試計畫 A9 列（ticket:3368）邊界「primary-coded /<P>/c/NNN landing (writes nothing), /<T>/c/NNN landing (writes T)」
- Summary: A9 沒有專屬案例，只能靠 A1–A5 表裡的「A5 article, no counterpart」間接涵蓋 orphan；測試計畫列出的「new cases under both P」沒有加。
- Evidence: 在 tests/unit/i18n 搜尋 orphan、A9、c/NNN，只有 not-found-wiring.test.ts:675 的變數名稱 orphanPath（A11 案例）。
- Impact: 行為上和 A5 等價，所以實際風險低；但計畫寫明的案例沒有做，覆蓋報告也沒有說明。
- Suggested fix: 可以補一個「翻譯專屬題目頁（challenge）冷載入寫入 T」的案例，或在票中記錄 A5 表已經涵蓋 A9。

#### SPEC-A-12 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/arrival.test.ts:266`
- Requirement: traceability A19：「the existing 0008 C5, 0008 C8, 0008 C9 cases pass with P set to each value」
- Summary: 0008 C9 的「one redirect per arrival」只在 P=en 下跑。
- Evidence: 第 266–274 行只呼叫 `notFoundRedirect(…, PAGES, 'en')`，沒有 P=zh-TW 版本；C5、C8 在 not-found-wiring.test.ts 有兩種 P。
- Impact: P=zh-TW 下「不會連續兩次 not-found 轉址」的性質沒有直接驗證；屬於覆蓋缺口，不是行為缺陷。
- Suggested fix: 把該案例用 for (P) 包起來，並換成各自 P 對應的頁面清單。

#### SPEC-A-14 · low · confidence high · incorrect

- Where: `.vitepress/theme/composables/useArrivals.ts:50`
- Requirement: traceability「Comments (A36)」列：`useArrivals header` 要改寫成「a published translation page」；A36 不得出現「stores zh-TW for a /zh-TW/ page」
- Summary: useArrivals 的檔頭註解還寫「a published page under `/zh-TW/`」的冷載入會寫入；P=zh-TW 時翻譯頁是 `/en/`，這句話不成立。
- Evidence: 第 49–51 行：`… and the cold load of a published page under \`/zh-TW/\` — also through a short link's redirect or a reload (W2, D13) — decided …`
- Impact: 上游（P=zh-TW）沒有 /zh-TW/ 頁面，註解描述的寫入條件是錯的。
- Suggested fix: 改成「a published translation page (under `/<T>/`)」。

#### SPEC-A-15 · low · confidence high · incorrect

- Where: `.vitepress/theme/index.ts:114`
- Requirement: traceability「Comments (A36)」列明列：`.vitepress/theme/index.ts`'s "stores zh-TW for a published /zh-TW/ page (W2)"
- Summary: Layout 的 onMounted 註解還寫「stores `zh-TW` for a published `/zh-TW/` page (W2)」，沒有照契約改寫。
- Evidence: 第 113–114 行：`// does not wait: it stores \`zh-TW\` for a published \`/zh-TW/\` page (W2).`；實際程式是 `persistLocale(otherLocale(P))`。
- Impact: P=zh-TW 時寫入的是 en，註解在上游是錯的；A36 明列要改這一處。
- Suggested fix: 改成「it stores T for a published translation page (W2, D26)」。

#### SPEC-A-16 · low · confidence high · incorrect

- Where: `.vitepress/theme/index.ts:245`
- Requirement: traceability「Comments (A36)」列：「its comment naming platform/challenges.md, platform/zh-TW/challenges.md (new source paths platform/en/…)」；D40
- Summary: enhanceApp 裡的註解還寫 ChallengeList 吃 `challenges: ChallengeData[]` prop，並列出舊的來源路徑；HomeContent 的註解也還寫 platform/index.md。
- Evidence: 第 245–250 行：`// ChallengeList requires a \`challenges: ChallengeData[]\` prop; each locale's challenges page (platform/challenges.md, platform/zh-TW/challenges.md) passes it via <ChallengeList :challenges="data" />` 和 `// HomeContent is used in platform/index.md`。（stage 5 的 3a deferred 也記過同一處。）
- Impact: prop 已經改名為 `lists`（D40），路徑也已經搬到 platform/en/；註解誤導讀者。
- Suggested fix: 改成 `lists: ChallengeLists`，路徑改成 platform/<語系>/challenges.md 與 platform/<語系>/index.md。

#### SPEC-A-17 · low · confidence high · incorrect

- Where: `.vitepress/theme/composables/localStorageKeys.ts:29`
- Requirement: traceability「Comments (A36)」列：localStorageKeys.ts 的 module doc 與 OWNED_LOCAL_STORAGE_KEYS 中語系 key 的註解（"Written on every cold load of a published /zh-TW/ page"）要改寫
- Summary: localStorageKeys.ts 有兩處還寫 `wxl-locale` 是在冷載入 `/zh-TW/` 頁面時寫入。
- Evidence: 第 29 行：`written on every cold load of a published \`/zh-TW/\` page — by the Layout as it mounts`；第 126 行：`// Written on every cold load of a published \`/zh-TW/\` page (the Layout, as it mounts),`。這個檔案不在本次 diff 裡。
- Impact: P=zh-TW 時這兩句都不成立；這是 A36 明列的項目，卻完全沒改。
- Suggested fix: 兩處都改成「a published translation page」。

#### SPEC-A-18 · low · confidence high · incorrect

- Where: `.vitepress/theme/composables/useSessionGate.ts:420`
- Requirement: traceability「Comments (A36)」列：「useSessionGate.ts's comment on the locale written "of a published /zh-TW/ page, as the Layout mounts"」
- Summary: useSessionGate 的註解還寫「The platform writes the locale on every cold load of a published `/zh-TW/` page」。
- Evidence: 第 419–420 行原文如上；這個檔案不在本次 diff 裡。
- Impact: 上游已經沒有 /zh-TW/ 頁面，註解不成立；A36 明列這一處。
- Suggested fix: 改成「a published translation page」。

#### SPEC-A-19 · low · confidence medium · incorrect

- Where: `.vitepress/theme/components/MergedNav.vue:76`
- Requirement: traceability「Comments (A36)」列：「MergedNav's "correct /zh-TW/challenges/ href" example」
- Summary: MergedNav 的註解範例還寫「the built zh-TW page emitted … a correct `/zh-TW/challenges/` href」，契約要求改寫的範例沒有改。
- Evidence: 第 74–76 行：`the built zh-TW page emitted an English back-link label beside a correct \`/zh-TW/challenges/\` href.`
- Impact: P=zh-TW 時繁中頁的正確 href 是 /challenges/。這段雖然是歷史敘述，但 A36 明列要處理。
- Suggested fix: 把例子改成不依賴主語系的寫法，例如「a translation page's correct `/<T>/challenges/` href」，或註明這是 epic 0010 之前的狀況。

#### SPEC-A-20 · low · confidence high · incorrect

- Where: `.vitepress/theme/i18n/arrival.ts:62`
- Requirement: traceability「Overridden contracts › Area A」〈requested is "the other locale of the target"〉列 → D27、D28；A36
- Summary: notFoundRedirect 的 doc 還寫「requested 是 the other locale of the target」；NP（D28）的 requested 是 P，落地頁也是 P，doc 和函式內的註解互相矛盾。
- Evidence: 第 59–63 行：`… The requested locale is the one the not-found path named, which is the other locale of the target.`；第 72–76 行的行內註解自己說明 NP 的 landing 也是 P。
- Impact: doc 對 NP 是錯的，契約表點名要改；`git grep "the other locale"` 也會列出這一行，而它沒有引用 D33（違反 A36 的 grep 條件）。
- Suggested fix: 改成「the not-found path's own locale (D27, D28): T for a translation path, P for a primary-code or primary path」。

#### SPEC-A-21 · low · confidence medium · incorrect

- Where: `.vitepress/theme/i18n/lookup.ts:16`
- Requirement: traceability「Overridden contracts › Area A」lookupNotFound and doc → D27、D28；A36（"the other locale" 只能出現在引用 D33 的註解）
- Summary: lookupNotFound 的 doc 第一段說結果是「the same page in the other locale」，還說「仍在路徑自己語系的 counterpart 不算」，和下一段 D28 的 NP 結果（同一語系 P）互相矛盾。
- Evidence: 第 16–19 行：`The list entry of a not-found path's counterpart — the same page in the other locale — … A "counterpart" that is still in the path's own locale … is not one.`；第 21–28 行說明 D28 會回傳 P 自己的頁面。
- Impact: doc 自相矛盾，也不符合 A36 的 grep 條件。
- Suggested fix: 第一段改成三種 not-found 路徑各自的結果（D27/D28），並拿掉「the other locale」。

#### SPEC-A-22 · low · confidence high · standard-breach

- Where: `.vitepress/theme/components/HomeContent.vue:13`
- Requirement: traceability A36：「the phrase "the other locale" appears only in comments that cite D33 … which git grep -n "the other locale" -- .vitepress lists for stage 6」
- Summary: `git grep "the other locale" -- .vitepress` 列出 4 處，沒有一處引用 D33：HomeContent.vue:13、ChallengeList.vue:103（另外兩處見 SPEC-A-20、SPEC-A-21）。
- Evidence: HomeContent.vue:13 `// Spec 0008, S4: a latest-challenge card for a challenge borrowed from the other locale's brief`；ChallengeList.vue:103 `* Spec 0008, S4: an entry borrowed from the other locale's brief`。依 D38，被借用的一定是主語系的說明頁，不是「另一個語系」。
- Impact: A36 的驗收條件（stage 6 的 grep）不成立；在 P=zh-TW 的英文清單上，「the other locale」碰巧是對的，但說法本身依賴兩語系並存。
- Suggested fix: 改成「borrowed from the primary locale's brief (D38)」，或如果確實是兩語系專屬的敘述，就補上 D33 引用。（這兩個元件的清單字串屬於 T-0079，但 A36 的這兩行註解屬於本票。）

#### SPEC-A-23 · low · confidence low · incorrect

- Where: `.vitepress/theme/i18n/arrival.ts:96`
- Requirement: traceability「Overridden contracts › Area A」：switcherDecision's doc ("the menu there offers only the other locale") → D27、D28；D34
- Summary: 契約表點名的 switcherDecision doc 沒有改寫；在兩語系下這句話仍然成立，但沒有改成 D34 的說法（清單扣掉頁面語系）。
- Evidence: 第 95–97 行：`… whatever was chosen: the menu there offers only the other locale, since the line never shows on the not-found page.`（因為跨行，A36 的 grep 抓不到。）
- Impact: 影響很小；只是契約表上的項目沒有交代。
- Suggested fix: 改成「the menu there offers the list minus the page locale (D34), since the line never shows on the not-found page」。

#### SPEC-A-24 · low · confidence medium · incorrect

- Where: `.vitepress/theme/i18n/index.ts:16`
- Requirement: traceability「Overridden contracts › Area A」〈English is the unprefixed tree〉列：`otherLocale` and its comment → A26/A27/A29；D33（參數化留給 ja epic）
- Summary: otherLocale 的註解寫「The primary-locale epic replaces this with a locale list.」，但這張票就是 primary-locale epic，而它沒有換成清單；依 D33，要換的是 Japanese epic。
- Evidence: 第 16 行：`/** The other of the two locales. The primary-locale epic replaces this with a locale list. */`
- Impact: 註解指向錯誤的 epic，讀者會以為本 epic 還欠一項工作。
- Suggested fix: 改成「Two-locale by construction (D33); the Japanese (ja) epic replaces it with the locale list.」

#### SPEC-A-25 · low · confidence low · incorrect

- Where: `.vitepress/theme/i18n/index.ts:196`
- Requirement: traceability「Comments (A36)」列：shouldPersistOnColdLoad 的 doc；D25（預設造訪語系已移除）
- Summary: shouldPersistOnColdLoad 的 doc 還用「would store the default on every cold load」這種說法，「default」在 D25 之後已經沒有對應的概念。
- Evidence: 第 196–198 行：`writing there would store the default on every cold load and wipe the very preference the cold-load redirect exists to honour.`
- Impact: 措辭殘留舊模型，讀者可能誤以為還有預設語系。
- Suggested fix: 改成「would store P on every cold load and wipe …」。

#### SPEC-A-26 · low · confidence low · incorrect

- Where: `.vitepress/theme/composables/useArrivals.ts:33`
- Requirement: A36（useArrivals header）；D25／A1：沒有偏好時不轉址、也不顯示提示行
- Summary: useArrivals 檔頭說冷載入時「a page is sent to its counterpart's list entry only when that counterpart is published, and otherwise stays with the line (A1–A4)」，好像沒有偏好時也會留在原頁並顯示提示行。
- Evidence: 第 33–35 行原文如上；依 D25，沒有偏好或偏好是 P 時，頁面不轉址也不顯示提示行。
- Impact: 敘述把 A1／A2 的情況也說成會顯示提示行。
- Suggested fix: 改成「with a stored T, a page is sent … when published, and otherwise stays with the line in T (A3, A4); with no preference or P stored, it stays with no line (A1, A2)」。

#### SPEC-A-27 · low · confidence medium · incorrect

- Where: `.vitepress/theme/composables/useSessionGate.ts:519`
- Requirement: traceability「Overridden contracts › Area A」〈A cleared reload … "is still in the language that was on screen"〉列：useSessionGate's clear doc → D35、A33
- Summary: 清除用的 doc 說 reload 後落地的頁面「is still in the language that was on screen」；在 D25 之下這不一定成立。
- Evidence: 第 519–521 行原文如上。反例：沒有偏好的學習者經連結進入 `/en/…`（連結不寫入），按清除後重新載入 `/`，看到的是 P（zh-TW），不是畫面上原本的英文。這個檔案不在本次 diff 裡。
- Impact: 契約表點名的敘述沒有修正，A33 的說明會誤導。
- Suggested fix: 改成「the root's cold load then follows the DT rows with the stored value that survived the clear (A33)」。

#### SPEC-A-28 · low · confidence medium · incorrect

- Where: `.vitepress/theme/index.ts:123`
- Requirement: traceability「Overridden contracts › Area A」〈A cleared reload's root "makes its own redirect"〉列 → D35、A33（checked, kept if true）
- Summary: onMounted 的註解說「`cleared` reloads the site root, which makes its own redirect」；在 D25 之下，只有存了 T 而且 `/<T>/` 有發布時才會轉址。
- Evidence: 第 123–124 行原文如上。
- Impact: 「kept if true」的條件不成立，因為這句話是有條件才成立；影響很小。
- Suggested fix: 改成「which applies its own cold-load rules (A33): a redirect only when T is stored」。

#### SPEC-A-29 · low · confidence medium · incorrect

- Where: `tests/unit/components/MergedNav.test.ts:11`
- Requirement: traceability「Overridden contracts › Area A」〈localeIndex 'root' means English〉列：the localeIndex mocks in MergedNav.test.ts → D32
- Summary: 測試檔的註解還寫「`'root'` is what it reports for English」。
- Evidence: 第 10–11 行：`// VitePress resolves this per page … \`'root'\` is what it reports for English.`；第 44–46 行的註解已說明預設 P=en，但這一句沒有改。
- Impact: P=zh-TW 時 'root' 是繁中，註解不成立。
- Suggested fix: 改成「'root' is what it reports for the primary locale P」。

#### SPEC-A-31 · low · confidence high · incorrect

- Where: `platform/en/guide/troubleshooting.md:206`
- Requirement: traceability A34 / AC-19（敘述要在兩種主語系下都成立）；DT17、DT57、AC-12（沒有偏好時，not-found 轉址的落地頁仍會顯示提示行）
- Summary: 「Which language the site remembers」段說「While the site remembers no language, a page is shown in the language of the address you opened, and the line does not appear」，這和同頁「Why」段（打開不存在的翻譯網址時會顯示提示行）以及 DT17 互相矛盾。繁中版第 206 行同樣有這個問題。
- Evidence: en:202 `That happens when you open an address for a translation that does not exist …`；en:206 `While the site remembers no language, … the line does not appear.`；zh-TW:206 `網站還沒記住任何語系時，頁面以你打開的網址的語系顯示，不會出現那一行字。`；DT17：stored none、NT → 轉址到 /X，提示行為 T。
- Impact: 學習者看到的說明前後矛盾；沒有偏好時打開不存在的翻譯網址，實際上會出現提示行，頁面也不是網址上的語系。
- Suggested fix: 兩種語言都補一句例外：「…unless the address names a translation that does not exist, in which case the page that exists is shown with the line」。根本原因見 SPEC-A-34。

#### SPEC-A-32 · low · confidence high · incorrect

- Where: `platform/en/guide/troubleshooting.md:206`
- Requirement: traceability A34：敘述「true under either P」；AC-19
- Summary: 這一段最後的例句「So after a link has taken you to a page under `/zh-TW/`, reloading that page sets Traditional Chinese」只在 P=en 時成立；上游（P=zh-TW）根本沒有 /zh-TW/ 底下的頁面。繁中版第 206 行同樣有這個問題。
- Evidence: en:206 原文如上；zh-TW:206 `所以連結把你帶到 \`/zh-TW/\` 底下的頁面之後，重新整理那一頁就會記成繁體中文。` P=zh-TW 時 `/zh-TW/…` 會被 _redirects 或 not-found 轉回 `/…`，而且什麼都不寫入（D26、D30）。
- Impact: 上游讀者照著做（重新整理 /zh-TW/ 網址）不會得到描述的結果。
- Suggested fix: 例句改用 `/en/`，或改成不依賴語系的寫法：「a page whose address starts with a language code」。

#### SPEC-A-33 · low · confidence low · incorrect

- Where: `platform/zh-TW/guide/troubleshooting.md:202`
- Requirement: docs/agents/language.md 的雙語同步；A34「each statement … present in both languages」
- Summary: 繁中版「為什麼」改寫後，把英文版的兩種情況（跟著連結進到只有另一語系的頁面；記住另一語系時直接打開這種頁面）合成一句，語意變得模糊。
- Evidence: zh-TW:202 `也會發生在你跟著連結進到只有另一個語系的頁面，而你直接打開這種頁面、網站記住的是另一個語系時，…`；en:202 `when a link takes you to a page that is only in the other language, when you open such a page directly while the site remembers the other language, and …`
- Impact: 繁中讀者可能讀成「跟著連結進入，而且直接打開，而且記住另一語系」這樣一個條件。
- Suggested fix: 拆成兩個並列子句：「…也會發生在你跟著連結進到只有另一個語系的頁面時、在網站記住另一個語系而你直接打開這種頁面時，以及…」。

#### SPEC-A-34 · low · confidence high · spec-inconsistency

- Where: `.proj.specs/0010-primary-locale-layout/traceability.md:2052`
- Requirement: traceability A34、A37 的 expected 欄 vs DT17/DT57（traceability:917、957）與 spec AC-12（spec.en.md:494）
- Summary: A34 要求文件寫「with nothing remembered, a page is shown in the language of its address and no line appears」，A37 要求「they see the locale of the address they opened」；但 DT17 和 AC-12 規定沒有偏好時，not-found 轉址的落地頁會顯示提示行，而且是另一個語系的頁面。
- Evidence: A34：`with nothing remembered, a page is shown in the language of its address and no line appears`；AC-12：`With no preference, no page arrival shows the line except a not-found redirect's landing`；DT17：`none | exists | /X (replace) | zh-TW (path's own, carried) | zh-TW`。GLOSSARY.md:403 也照 A37 寫成「他看到的是他打開的那個網址的語系」。
- Impact: 文件照 A34 寫，就會和自己的「Why」段以及實際行為矛盾（見 SPEC-A-31）。
- Suggested fix: 請使用者裁決：A34 和 A37 補上「not-found 轉址除外」的但書，文件同步修改。

#### SPEC-A-35 · low · confidence high · spec-inconsistency

- Where: `.proj.specs/0010-primary-locale-layout/spec.en.md:278`
- Requirement: spec.en.md D30 段落 vs D58（spec.en.md:312-313）
- Summary: spec 的 D30 段寫「a translation-coded link always opens that translation」，D58 卻規定 form 語系 L 沒有說明頁時，指向主語系的頁面。README 兩語與 GLOSSARY 都照抄了這兩句，因此自相矛盾。
- Evidence: spec:277-278 `…while a translation-coded link always opens that translation.`；spec:312-313 `A numbered rule for form locale L targets the challenge's page in L, else in the primary locale…`。README.en.md:336 `when that locale has no version of the challenge, the link opens the primary locale's page` 對上 :338 `A short link coded with a translation always opens that translation`；README.md:327 對 :329；GLOSSARY.md:98 同一段裡兩句都有。
- Impact: 老師讀 README 會得到互相矛盾的短連結行為。
- Suggested fix: D30 改成「a translation-coded link opens that translation when it exists (D58)」，README、GLOSSARY 同步修改（README 段落屬於 A35 的偏好句，其餘屬於短連結區）。

#### SPEC-A-36 · low · confidence high · incorrect

- Where: `README.en.md:338`
- Requirement: traceability A35（README 偏好句改寫成 A34 規則）；同段落的一致性
- Summary: README（兩種語言）短連結段落裡，「翻譯代碼的短連結一律開那個翻譯」和前一段「該語系沒有這道題目的版本時，開的是主語系的頁面」互相矛盾。
- Evidence: README.en.md:338 `A short link coded with a translation always opens that translation.` vs :336；README.md:329 `翻譯代碼的短連結一律開那個翻譯。` vs :327 `該語系沒有這道題目的版本時，開的是主語系的頁面。`
- Impact: 老師與學習者對 `/en/c/NNN` 行為的理解會不一致。
- Suggested fix: 改成「…opens that translation when the challenge has one, and the primary locale's page otherwise」。

#### SPEC-A-37 · low · confidence medium · spec-inconsistency

- Where: `.vitepress/theme/i18n/arrival.ts:113`
- Requirement: traceability A23／SW15（not-found 頁面上的切換「whatever is chosen」導向 lookup 結果、never a line）vs D28（NP 的 lookup 結果和路徑同語系）
- Summary: P=zh-TW 時，在閘門還沒放行的 NP not-found 頁（例如 `/zh-TW/guide/python`）上選「English」，會被帶到繁中的 `/guide/python`；落地頁因為 `/en/guide/python` 存在而不顯示提示行，之後也不做 cold-load 轉址。學習者明確的選擇沒有被履行，畫面上也沒有任何說明。
- Evidence: switcherDecision 對非 page 的 arrival 一律 `lookupNotFound(…)`（arrival.ts:113）；lookupNotFound 的 D28 分支回傳 P 的頁面（lookup.ts:44-56）；落地頁是後續瀏覽，A11 規定 counterpart 存在時不顯示提示行，也不轉址。0008 B7 的前提是「counterpart 一定是另一個語系」，D28 打破了這個前提。
- Impact: 只有 not-found 頁被閘門暫停時才會碰到，情境罕見；但這是規格沒有預期到的組合。
- Suggested fix: 請使用者裁決：NP 時切換是否應改走 `localizePath(lookup 結果, chosen, P)`（如果有發布），或接受現狀並在 A23 註明。

#### SPEC-A-38 · low · confidence high · spec-inconsistency

- Where: `.proj.specs/0010-primary-locale-layout/spec.en.md:3`
- Requirement: spec.en.md 是由 traceability 派生（spec:16-17）；traceability Revision 2.3（D147–D150）
- Summary: spec.en.md 狀態仍寫 revision 2.2、D1–D146，沒有反映 traceability 的 revision 2.3（D148–D150，T-0077 stage 5 新增）。
- Evidence: spec.en.md:3 `Status: revision 2.2 (2026-11-15)`、:19 `the decisions D1–D146`；traceability.md:3419 `## Revision 2.3 (2026-11-16, T-0077 stage 5)`。
- Impact: 兩份規格的版本不同步；雖然沒有行為列改變，但版本追溯會出錯。
- Suggested fix: 更新 spec.en.md 的狀態段落，提及 revision 2.3 與 D147–D150。

#### SPEC-A-39 · low · confidence medium · smell

- Where: `tests/unit/i18n/theme-locale-wiring.test.ts:41`
- Requirement: D54／D31：測試的期望值依 P 推導；not-found-wiring 在 B3-2 已經把 publishedPages mock 改成依 P 而定
- Summary: theme-locale-wiring 的 publishedPages mock 不分 P，同時列出 `/zh-TW/…` 與 `/en/…`；P=zh-TW 時這份清單不可能出現（主語系不會有前綴樹）。
- Evidence: 第 41–44 行：`publishedPages: () => ['/', '/challenges', '/guide/', '/zh-TW/', '/zh-TW/challenges', '/zh-TW/guide/', '/en/', '/en/challenges', '/en/guide/']`
- Impact: 目前沒有發現因此誤判的案例，但不真實的清單可能讓日後的 P=zh-TW 案例碰巧通過。
- Suggested fix: 比照 not-found-wiring:65-74，改成依 mockPrimaryLocale 回傳各自的清單。

#### SPEC-A-40 · low · confidence high · partial-behaviour

- Where: `tests/unit/i18n/messages-shape.test.ts:192`
- Requirement: traceability A31：GD1「reads alike for a shorter and a longer list (RV2-22)」；測試要在長度不是 2 時失敗
- Summary: 兩語系守門測試只試了較長的清單（3 個），沒有試較短的清單（1 個）。另外，守門函式只存在於測試檔，A31 要求 stage 6 暫時加入第三個代碼來驗證，本次審查無法執行。
- Evidence: 第 192–196 行只有 `assertTwoLocaleGuard([...LOCALES, 'ja'])`。
- Impact: 較短清單時的訊息沒有被驗證；影響很小。
- Suggested fix: 補一個 `assertTwoLocaleGuard([LOCALES[0]])` 案例，期待 `has 1 members, not 2` 的完整訊息。

#### SPEC-A-41 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/i18n/not-found-wiring.test.ts:1175`
- Requirement: stage 5 deferred 2z #1 與 #2（重複，合併）：SEED_ROW 沒有斷言種子列和目標列的 page 與 P 相同
- Summary: still present。兩個 checker 回報的是同一件事，這裡合併。SEED_ROW 對照表沒有 `seedRow.page === row.page && seedRow.P === row.P` 的斷言。
- Evidence: 第 1175 行 `const SEED_ROW = { SW03: 'SW02', SW06: 'SW05', SW09: 'SW08', SW12: 'SW11' }`；第 1181–1192 行只檢查 seed 的結果是 stay，以及提示行等於 seedRow.line。照目前的對照，頁型與 P 都正確。
- Impact: 目前正確；只有日後對照改錯時才不會被測試發現。
- Suggested fix: 在 1182 行之後加上 `expect(seedRow.page).toBe(row.page); expect(seedRow.P).toBe(row.P)`。

#### SPEC-A-42 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/i18n/not-found-wiring.test.ts:1193`
- Requirement: stage 5 deferred 2z #3：setItem spy 只在成功路徑上 restore
- Summary: still present。第 1193–1199 行與第 1142–1148 行的 setItem spy，都在斷言之後才 mockRestore；vitest.config 沒有設定 restoreMocks。
- Evidence: `const setSpy = vi.spyOn(window.localStorage, 'setItem')` … `expect(setSpy).toHaveBeenCalledWith(…)` 之後才 `setSpy.mockRestore()`，沒有 try/finally。
- Impact: 只有測試已經失敗時，spy 才會殘留到下一個測試，造成連鎖失敗、增加除錯難度。
- Suggested fix: 改成 try/finally，或在檔案的 afterEach 呼叫 vi.restoreAllMocks()（同檔其他地方用的是 try/finally）。

#### SPEC-A-43 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:389`
- Requirement: stage 5 deferred 3c #1 與 #8（重複，合併）：A8 alias 測試名稱寫「writes nothing」，但無法分辨
- Summary: still present。測試事先存了 T，最後又期待 T，所以抓不到「寫入了 T」這種錯誤；名稱宣稱的比實際驗證的強。
- Evidence: 第 392 行 `await storeLocale(page, T)`；第 400 行 `expect(await storedLocale(page)).toBe(T)`。A8 的 smoke AC 只要求轉址目標，這部分由 398 行的 pathname 驗證。
- Impact: A8 的 AC 本身已滿足；只是測試名稱誤導，「writes nothing」沒有任何可以失敗的斷言。
- Suggested fix: 改名（拿掉「and writes nothing」），或改用 setItem 呼叫紀錄（addInitScript 包一層 localStorage.setItem）來驗證沒有寫入。

#### SPEC-A-44 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:416`
- Requirement: stage 5 deferred 3c #2 與 #9（重複，合併）：A15 的案例裝了 recordNavigations 卻從不讀取
- Summary: still present。A15 的兩個案例呼叫了 `recordNavigations(page)`，但從來沒有呼叫 `navigations(page)`；「沒有第二次轉址」只靠 500ms 後再取樣一次 pathname。
- Evidence: 第 416 行 `await recordNavigations(page)`；第 421–422 行 `await page.waitForTimeout(500)`、`expect(pathnameOf(page)).toBe(landed)`；之後沒有讀取導航紀錄。
- Impact: 轉址到 T 之後又立刻被 replace 回來，或 500ms 之後才發生的轉址，都會被當成通過；單元層的 D29 案例有部分補強（見 SPEC-A-04）。
- Suggested fix: 加上 `expect((await navigations(page)).filter(u => new URL(u, page.url()).pathname !== landed)).toEqual([])`，或拿掉沒用到的 recordNavigations。

#### SPEC-A-45 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:316`
- Requirement: stage 5 deferred 3c #3：B7 not-found 切換案例在綠燈狀態下被改寫，引用的列不精確
- Summary: not a defect。改寫後的案例在兩種 P 下都合理：NO_PAGE = `/<T>/no-such-page`，VitePress 從 relativePath 判定頁面語系為 T，選單只提供 P，所以選 PRIMARY 正是使用者實際能選的選項。強度和原本相同，也符合 D54。
- Evidence: 第 317–327 行：`storeLocale(page, T)`、選 `${PRIMARY}`、期待 `PRIMARY`；NO_PAGE 定義在第 188 行 `localePath(T, 'no-such-page')`。
- Impact: 只是過程紀錄上引用的列（A17 b）不精確，不影響行為與覆蓋。
- Suggested fix: 可以在案例註解中把引用改成 A23 / SW13–SW16 與 D54。

#### SPEC-A-46 · low · confidence high · deferred-p2-regraded

- Where: `playwright.site.config.ts:21`
- Requirement: stage 5 deferred 3c #4：固定語系的註解只描述 P=zh-TW 的上游；D54／D124（range 的 CI 跑同一套測試）
- Summary: still present。註解寫「English moved off the root to `/en/` and Traditional Chinese is the primary locale」，以及不帶語系段的 goto「lands on `/en/...`」，在 P=en 的 range 不成立。
- Evidence: 第 21–29 行原文；grep 確認已經沒有「default visiting」字樣。
- Impact: 只是註解；在 P=en 的 range 會誤導維護者。
- Suggested fix: 改成和 P 無關的說法：「the pinned `en` equals P on an English-primary range and is T otherwise, in which case a cold load of a primary page redirects to `/en/…`」。

#### SPEC-A-47 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/code-panel-platform.spec.ts:28`
- Requirement: stage 5 deferred 3c #5：P=zh-TW 下仍 goto 不帶前綴的主語系頁，依賴 A3 的冷載入轉址；D54
- Summary: still present。code-panel-platform.spec.ts（28、220、268 行）與 session-gate-scope.spec.ts（26–59 行）仍然用字面網址，在固定的 `en` 偏好下靠 A3 轉址抵達英文頁。這兩個檔案都不在本次 diff 中。
- Evidence: `await page.goto(\`/challenge/${CHALLENGE}/\`)`；session-gate-scope 的 `page.goto('/')`、`'/challenges/'`、`'/challenge/door-is-open/'`。
- Impact: 斷言的時機會受轉址影響，可能是 SPEC-A-48 不穩定的原因之一；和 playwright 設定註解說的「English assertions go to an explicit path」也不一致。
- Suggested fix: 改用 `localePath('en', …)`，和 session-gate-clear-report.spec.ts 的改法一致。

#### SPEC-A-48 · low · confidence low · deferred-p2-regraded

- Where: `tests/site-smoke/code-panel-platform.spec.ts:90`
- Requirement: stage 5 deferred 3c #7：'challenge application source is unreachable from the Code panel' 時好時壞
- Summary: 無法判定，可能 still present。這個檔案在 3c 之後沒有變更（不在 diff 中）；segment 9 的 W9-3 全套 smoke 中 code-panel-platform 9/9 通過，但一次通過不能排除不穩定，我也無法執行。
- Evidence: ticket segment 9 W9-3：`code-panel-platform.spec.ts 9`（112 passed）；3c checker 曾在 5 次中觀察到 2 次失敗（Run 按鈕停在 Loading…）；推測原因是 openCodePanel goto 主語系頁、被 A3 轉址時 runtime 正在啟動。
- Impact: 如果仍然不穩定，CI 會偶爾失敗；stage 8 前應確認。
- Suggested fix: 改成直接 goto `localePath('en', …)`（見 SPEC-A-47），並用 `--repeat-each` 多跑幾次確認。

#### SPEC-A-49 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:232`
- Requirement: stage 5 deferred 3c #6 與 #11（重複，合併）：D7 內建選單案例仍用字面 `/guide/python`；D54
- Summary: still present。第 232、245 行仍是 `page.goto('/guide/python')`。在兩種 P 下 `/guide/python` 都是主語系頁，所以行為正確，只是寫法和 D54「每個 URL 都由 P 推導」不一致。
- Evidence: 第 232 行與第 245 行 `await page.goto('/guide/python')`。
- Impact: 沒有行為影響，只是風格不一致。
- Suggested fix: 改成 `localePath(PRIMARY, 'guide/python')`。

#### SPEC-A-50 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:403`
- Requirement: stage 5 deferred 3c #10：'a cold load of a published translation page stores its locale' 只檢查寫入
- Summary: still present。這個案例只斷言寫入，沒有檢查 A5 的「不轉址、不顯示提示行」；這兩欄由 COLD_LOADS 中 EN_ONLY 且 stored zh-TW 的案例涵蓋（第 365、369–386 行）。
- Evidence: 第 403–408 行只有 `expect.poll(() => storedLocale(page)).toBe(T)`。
- Impact: 整體覆蓋已滿足；單一案例比較弱。
- Suggested fix: 可以補上 pathname 不變與 `[data-missing-translation]` 數量為 0 的斷言。

#### SPEC-A-51 · low · confidence high · deferred-p2-regraded

- Where: `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:2101`
- Requirement: stage 5 deferred 3c #12：3c Comments 中兩句陳述不精確
- Summary: still present。「were 2 red of 15」（session-gate-clear-report.spec.ts 只有 2 個案例）與「code-panel-platform … green」（有案例時好時壞）仍留在票中；同一個 entry 的 deferred 區塊（:2121）已經記下這兩點。
- Evidence: ticket:2101 `both K4 cases green now (were 2 red of 15)`；:2105 `code-panel-platform and session-gate-scope are green`。
- Impact: 只影響紀錄的精確度。
- Suggested fix: 在票中加一則更正說明（不要改寫歷史 entry）。

### Spec · L (24 findings: 0 high, 2 medium, 22 low)

Coverage: 完整讀過的 diff 檔：G1-site 的 `.vitepress/pageList.ts`、`.vitepress/theme/components/ChallengeList.vue`、`.vitepress/theme/components/HomeContent.vue`、`.vitepress/theme/i18n/messages/zh-TW.json`、`platform/shared/challenges.data.ts`、`platform/shared/mergeChallenges.ts`、`platform/challenges.md`、`platform/en/challenges.md`、`platform/zh-TW/challenges.md`；G2 的 `.github/workflows/quality-gates.yml`。只讀了部分的 diff 檔：G4 的 `tests/site-smoke/missing-translation.spec.ts`（前 150 行）。另外以 HEAD 的實際檔案完整讀過：platform/shared/mergeChallenges.ts、platform/shared/challenges.data.ts、.vitepress/pageList.ts、.vitepress/challenge/declaration.ts、tests/unit/site/merge-challenges.test.ts、tests/unit/site/challenge-data-loaders.test.ts、tests/unit/theme/client-graph-no-smoke-fixtures.test.ts、tests/unit/workflows/smoke-fixture-switch.test.ts、tests/unit/components/HomeContent.test.ts、tests/site-smoke/localePath.ts、兩個 smoke fixture 頁；tests/site-smoke/missing-translation.spec.ts 讀了第 1-419 行。抽樣讀過：tests/unit/components/ChallengeList.test.ts（第 1-140、355-404 行）、tests/unit/site/config-base.test.ts（第 410-458 行，其餘用 grep）、tests/unit/i18n/page-list.test.ts（grep L35）、tests/site-smoke/site-smoke.spec.ts（第 255-314 行與 grep）、.vitepress/challenge/plugin.ts（第 110-150 行）、.vitepress/config.mts（grep）、.vitepress/theme/index.ts（grep）、ChallengeList.vue 第 14-63 行。沒有讀到的 diff 檔：en.json diff（推定與 zh-TW 對稱，並以 grep 確認值）、challenges.zh-TW.data.ts 的刪除 diff、site-smoke.spec.ts 的完整 diff、session-gate-clear-report.spec.ts、tests/site-smoke/localePath.ts 的 diff（改讀 live 檔）、playwright.site.config.ts、theme/index.ts 的 diff、messages-shape.test.ts、G3 與 G5 的其餘檔案，以及我負責範圍以外的 G1、G2、G4 檔案。規格方面：讀了 traceability 的 L1–L47 列、L-§4.1–L-§4.7、D37–D58、PAT3/PAT4、錯誤碼表、Overridden contracts（Area L 與 A36 列）、rev 2.3；spec.en.md 的 area L 摘要與 AC-20–AC-26；票的 AC、area L 測試計畫、segment 3a/3b 與 segment 9 的 Comments，以及 coverage report。延後的 P2 已重新評定 3a 全部 14 則與 3b 全部 8 則，重複的已合併（3a#1+#5、3a#4+#9、3a#3+#8+#12 依問題拆成兩則、3b#2+#4、3b#3+#5 依問題拆成兩則、3b#7 拆成兩則）。沒有執行任何測試或 git 指令，所有判斷都是讀檔得來的。

Missing context: tickets.md 沒有逐行讀；T-0079 擁有 L23–L33、L45、L46 這一點，是依票的 Context 段與任務說明判定。; 無法執行 vitest、Playwright 或 PAT4，也無法確認 gray-matter 是否會剝除 BOM（SPEC-L-04 的信心因此標為 low）。; L21、L36 行為面、L43 的 VL8 屬 stage 8，在 checkout 中無法觀察。; SPEC-L-01 牽涉 area Y（Y40）；Y 軸審查員對 PL-E13 路徑格式是否有其他判定，需要由 parent 對照。

#### SPEC-L-01 · medium · confidence medium · incorrect

- Where: `platform/shared/mergeChallenges.ts:83`
- Requirement: traceability.md rev 2.3 錯誤碼表 PL-E13 列（第 765 行）與第 772 行「In PL-E13–PL-E18 `<brief path>` ... are bare repository-relative paths」；Y40（第 2328 行）「output containing `PL-E13: platform/<L>/challenge/<slug>/index.md`」；D56／L6（loader 以 Y 的同一段訊息失敗）
- Summary: loader（以及共用同一個 formatter 的 plugin）在 PL-E13 裡印出的說明頁路徑是相對於 `platform/` 的 `<locale>/challenge/<slug>/index.md`，不是規格要求的 repository-relative `platform/<locale>/challenge/<slug>/index.md`。
- Evidence: mergeChallenges.ts:83 `throw declarationReadError(`${primaryBrief.locale}/challenge/${primaryBrief.slug}/index.md`, ...)`；declaration.ts:50-54 的 doc 明寫 `briefSourcePath` 是「relative to the site's source directory」，訊息為 `PL-E13: ${briefSourcePath}: no platform/challenge/${slug}/challenge.yaml for this brief`。plugin.ts:142 與 config.mts:144-147 也傳 `pageData.filePath`（同樣是 srcDir 相對路徑）。票的 Comments 第 626 行實測輸出為 `PL-E13: zh-TW/challenge/door-is-open/index.md: ...`。L6 的測試（challenge-data-loaders.test.ts:87）拿 production 的同一個 formatter 當期望值，所以無法抓到這個差異；tests/ 底下沒有任何斷言 `PL-E13: platform/` 的案例。
- Impact: 老師看到 `PL-E13: en/challenge/x/index.md` 會在 repository 根目錄找不到這個路徑；同一則訊息後半又用 repository-relative 的 `platform/challenge/<slug>/challenge.yaml`，兩種基準混在一行。Y40 的 `docs:build` 輸出驗收條件在目前實作下會失敗（此列屬 area Y，但 L6／D56 直接繼承同一段文字）。
- Suggested fix: 讓 `declarationReadError` 收 repository-relative 路徑（呼叫端補上 `platform/` 前綴），或在 formatter 內統一加前綴；補一個斷言 `PL-E13: platform/<L>/challenge/<slug>/index.md` 的案例。若團隊決定維持 srcDir 相對路徑，就要回頭修訂規格錯誤碼表與 Y40，並記為 spec 變更。

#### SPEC-L-DR-02 · medium · confidence high · deferred-p2-regraded

- Where: `.vitepress/theme/index.ts:245`
- Requirement: A36 與「Overridden contracts › Area A」的 Comments (A36) 列（traceability 第 1665 行明列 `.vitepress/theme/index.ts` 中提到 `platform/challenges.md, platform/zh-TW/challenges.md` 的註解，要改成新的 `platform/en/…` 路徑）；D40（prop 改名為 `lists`）
- Summary: 仍然存在（3a 第 2 則）。註解還在描述已移除的 `challenges: ChallengeData[]` prop、`:challenges="data"` 用法和舊路徑，第 250 行也還說 HomeContent 用在 `platform/index.md`。這條註解是 A36 在 stage 6 要逐條確認的對象之一，所以目前那一列的 AC 不成立。
- Evidence: 第 245-247 行：`// ChallengeList requires a `challenges: ChallengeData[]` prop; each locale's challenges page (platform/challenges.md, platform/zh-TW/challenges.md) passes it via <ChallengeList :challenges="data" /> after loading its own data file.`；第 250 行：`// HomeContent is used in platform/index.md via <HomeContent />`。
- Impact: 照著註解改頁面的老師會傳 `:challenges`，結果清單是空的，這正是 D40／LW1 要防的情況；而且 A36 的 stage 6 驗收條件明列了這條註解。
- Suggested fix: 改寫成：每個語系資料夾的清單頁與首頁都從 `../shared/challenges.data.ts` import 同一份 `data`，並傳 `:lists="data"`（路徑 `platform/<locale>/challenges.md`、`platform/<locale>/index.md`）。

#### SPEC-L-02 · low · confidence medium · partial-behaviour

- Where: `tests/site-smoke/missing-translation.spec.ts:113`
- Requirement: L39（page-list oracle 在測試建置上通過）；D54（每個讀真實樹的測試都從 P 與它所跑的那棵樹推導期望值，所以靶場的 CI 也會通過）；B24（`challenge/<slug>/src/**` 永遠不是頁面）
- Summary: L39 的 oracle 走訪 `platform/` 時只略過最上層的 `public`、`shared`，不會略過 `challenge/<slug>/src/**`。靶場只要在某題的 `src/` 底下放一個 `.md`（Y34 明確允許 `src/README.md`），這個 smoke 測試就會失敗。
- Evidence: 第 113-127 行的 walk：`if (top && (item.name === 'public' || item.name === 'shared')) continue`，其餘目錄都會遞迴進去，每個 `.md` 都推進 `md`。同一張票裡 `pageListFromDir` 新增了 `CHALLENGE_SRC_RE = /^challenge\/[^/]+\/src$/`（pageList.ts:17、64），srcExclude 也排除 `challenge/*/src/**`，所以 html 那一側永遠不會有這些頁面。upstream 目前沒有這種檔案（glob `platform/challenge/*/src/**/*.md` 沒有結果），所以 CI 是綠的。
- Impact: 一個合法、會通過版面檢查的靶場（例如在 `src/` 裡放 README），跑 `pnpm test:smoke` 時會在 L39 紅掉，違反 D54「靶場的 CI 跑同一組 job 也會通過」。
- Suggested fix: 在 oracle 的 walk 裡用一條獨立寫出的規則略過 `challenge/<slug>/src`（不要借用受測模組），並在註解標明對應 B24。

#### SPEC-L-03 · low · confidence low · smell

- Where: `platform/shared/challenges.data.ts:95`
- Requirement: B15（`pnpm docs:dev` 執行中編輯 `range.json`，要重新啟動後才生效）；D54（以與建置相同的方式讀 P）
- Summary: loader 每次執行 `load` 都重新讀一次 `range.json`，config 則只在啟動時讀一次。dev server 執行中改了 `range.json`、又改了任一份說明頁或宣告時，清單的 URL 會改用新的 P，rewrites 與頁面清單卻還停在舊的 P。
- Evidence: `primary: readPrimaryLocale(resolve(srcDir, '..', 'range.json'))` 寫在 `load()` 裡面；config.mts:45-46 在模組載入時讀 `primary` 一次，再把它交給 `pageListFromDir`／rewrites。
- Impact: 只影響 dev server：重新啟動前，清單連結可能指向不存在的頁面；`range.json` 改到一半語法錯誤時，資料重新載入會丟出 PL-E0x。B15 只承諾「重新啟動後生效」，所以這是不一致，不是違反規格列。
- Suggested fix: 讓 loader 從 VitePress 已解析的 site config 取 P（或在模組載入時讀一次），和 config 共用同一個值。

#### SPEC-L-04 · low · confidence low · incorrect

- Where: `platform/shared/challenges.data.ts:44`
- Requirement: L-§4.2（title 是字串時照原樣）；L11；D79（只用一種 parser 讀 frontmatter）
- Summary: `frontmatterOf` 的正規式要求 `---` 必須出現在檔案第 0 個位元組，不會先去掉 UTF-8 BOM。VitePress（gray-matter）會先去掉 BOM，所以帶 BOM 的說明頁在頁面上有標題，清單上卻會顯示預設標題。
- Evidence: `const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text); if (!match) return {}`；`text` 是 `readFileSync(file, 'utf8')`，沒有移除 `﻿`。
- Impact: 這是邊角情況：Windows 編輯器存檔時帶了 BOM 的說明頁，標題與摘要會悄悄變成 `default_title`／`''`，而且不會有任何訊息。
- Suggested fix: 比對前先 `text.replace(/^﻿/, '')`，並補一個 BOM 說明頁的 loader 測試案例。

#### SPEC-L-05 · low · confidence low · smell

- Where: `platform/shared/mergeChallenges.ts:19`
- Requirement: B18／D132（stage 6 檢查變更檔案裡是否有 PAT1 看不到的語系列舉）；D42（從 `LOCALES` 的字串表讀預設值）
- Summary: `TABLES` 是第二份手寫的字串表清單（`en`、`'zh-TW'` 兩個 import）。它的型別雖然標成 `Record<Locale, …>`，但 CI 沒有跑型別檢查，所以新增語系時漏改這裡也不會被擋下。
- Evidence: mergeChallenges.ts:15-22 `import en ...; import zhTW ...; const TABLES: Record<Locale, ...> = { en, 'zh-TW': zhTW }`；`.vitepress/theme/i18n/index.ts:33` 另有一份同樣的對照表。package.json 只有 `vue-tsc` 這個 devDependency，沒有任何 script 或 workflow 會呼叫它。
- Impact: 將來加入 `ja` 時如果漏改這裡，只有在某個欄位需要預設值的時候，才會在 build 中丟出 `TypeError`（`TABLES[locale]` 為 undefined）。
- Suggested fix: 從一個 Node 可用、不依賴 vue-i18n 的模組匯出這張以語系為 key 的字串表，兩邊共用；或補一個測試，確認 `Object.keys(TABLES)` 等於 `LOCALES`。

#### SPEC-L-DR-01 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/challenge-data-loaders.test.ts:87`
- Requirement: L6（訊息「equals」0010-S32 formatter 的文字）
- Summary: 仍然存在（合併 3a 第 1 與第 5 則，兩則內容相同）：L6 用 `rejects.toThrow(string)` 斷言，這是子字串比對，不是完全相等。
- Evidence: 第 86-87 行：`rejects.toThrow(new RegExp(`^${...}: `))` 只錨定開頭，`rejects.toThrow(declarationReadError(...).message)` 是子字串比對；訊息後面多接文字也會通過。另外期望值本身就是 production 用的同一個 formatter，所以這個案例也抓不到 SPEC-L-01 的路徑格式問題。
- Impact: 目前 production 直接丟出 formatter 的結果，行為正確；只是測試強度低於 AC 的字面要求。
- Suggested fix: 改成 `await expect(loaded).rejects.toMatchObject({ message: declarationReadError(...).message })`。

#### SPEC-L-DR-03 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:299`
- Requirement: （測試衛生；Y39 屬 area Y，但由 3a 分段處理）
- Summary: 仍然存在（合併 3a 第 3 則的前半與第 8 則）：Y39 每個 slug、每個翻譯語系都開兩個 `browser.newContext()`，從來沒有關閉。
- Evidence: 第 299-300 行：`declaredView(await (await browser.newContext()).newPage(), PRIMARY, slug)`，以及翻譯語系的同一寫法；這個 test 裡沒有任何 `context.close()`。
- Impact: context 與 wasm runtime 會一直留到 worker 結束，佔用記憶體，也可能拖慢後面的計時型測試；不影響正確性。
- Suggested fix: 把 context 存成變數，用 try/finally 呼叫 `context.close()`。

#### SPEC-L-DR-04 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:274`
- Requirement: D54（smoke 的期望值從 P／LOCALES 推導，不寫死語系代碼）
- Summary: 仍然存在（合併 3a 第 3 則的後半與第 12 則）：`numberControl` 去掉語系段時用寫死的 `/\/(en|zh-TW)\//`，`declaredView` 的參數型別也寫死成 `'en' | 'zh-TW'`。
- Evidence: 第 274 行 `?.replace(/\/(en|zh-TW)\//, '/')`；第 265 行 `async function declaredView(page: Page, locale: 'en' | 'zh-TW', slug: string)`。
- Impact: 目前兩個語系下結果都正確；加入第三個語系時這裡會悄悄漏掉。
- Suggested fix: 用 `LOCALES` 組正規式，型別改用 `Locale`。

#### SPEC-L-DR-05 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/components/HomeContent.test.ts:209`
- Requirement: （測試衛生，L22）
- Summary: 仍然存在（合併 3a 第 4 與第 9 則）：L22 的 HomeContent 案例只在斷言通過時，才在最後一行把 `mockWithBase.prefix` 重設為 `''`；檔案層級沒有 beforeEach／afterEach 負責重設。
- Evidence: 第 197-200 行的 describe 層 beforeEach 設成 `'/repo'`，第 209 行 `mockWithBase.prefix = ''` 是測試本體的最後一句；ChallengeList.test.ts 則在檔案層的 beforeEach（第 122 行）重設。
- Impact: 目前這個 describe 排在檔案最後，不影響其他案例；之後如果在後面新增測試，又碰上這裡斷言失敗，就會連帶失敗。
- Suggested fix: 改成在 afterEach 重設，或加一個檔案層的 beforeEach。

#### SPEC-L-DR-06 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/merge-challenges.test.ts:214`
- Requirement: L17／D37（`number`、`difficulty` 只能來自宣告，任何情況下都不讀說明頁）
- Summary: 仍然存在（3a 第 6 則）：沒有任何案例能抓到「宣告沒寫時退回說明頁的值」這種錯誤實作。L17 的 fixture 兩邊都有值，L12／L13 的 absent 案例用的說明頁又只有 title。
- Evidence: L17（第 214-223 行）的說明頁有 `number: 99, difficulty: 'hard'`，宣告也有 `number: 1, difficulty: 'easy'`；L12／L13 經由 `declField` → `single({ title: 'T' }, value)`（第 158 行）。改成 `typeof decl.number === 'number' ? decl.number : brief.frontmatter.number` 的實作，所有案例照樣綠燈。
- Impact: 按照 L17 字面上的 fixture，AC 是成立的；D37「neither overrides」的另一半（宣告缺值時）沒有被測到。
- Suggested fix: 加一格：說明頁有 `number: 99`、`difficulty: 'hard'`，宣告兩者都沒寫，期望結果是 `undefined`／`'mystery'`。

#### SPEC-L-DR-07 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/merge-challenges.test.ts:281`
- Requirement: L8（merge 半部，含三語系邊界）
- Summary: 已修正（3a 第 7 則）：三語系下「沒有說明頁的語系借用全部」與「P 沒有說明頁時每張清單都是 []」都已補上案例，位置在 tests/unit/site/merge-challenges.test.ts:264-286。
- Evidence: `it('L8: three locales — the keys are `locales` in order; a locale with no brief borrows every listed challenge'...)`（第 264 行）與 `it('L8: three locales — with no brief in P, every list is empty'...)`（第 281 行），以 P ∈ {en, zh-TW, ja} 各跑一次。
- Impact: 無。
- Suggested fix: 無需處理。

#### SPEC-L-DR-08 · low · confidence medium · deferred-p2-regraded

- Where: `platform/shared/challenges.data.ts:49`
- Requirement: L-§4.2（title 是字串時照原樣）；L11
- Summary: 仍然存在（3a 第 10 則）：`frontmatterOf` 遇到 YAML 解析錯誤時默默回傳 `{}`，清單改用預設標題，不留任何訊息。
- Evidence: 第 46-51 行 `try { ... parse(match[1], { schema: 'core' }) ... } catch { return {} }`。`yaml` 預設 `uniqueKeys: true`，所以重複 key 的說明頁會被它拒絕；VitePress 的 gray-matter 對同一份檔案的處理可能不同。
- Impact: 多數這類說明頁會在頁面 build 時另外失敗，實際影響很小；但只要頁面 build 接受、loader 拒絕，清單就會悄悄顯示錯的標題。
- Suggested fix: 解析失敗時丟出帶說明頁路徑的錯誤，或至少讓 build 失敗，不要默默回傳。

#### SPEC-L-DR-09 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/merge-challenges.test.ts:160`
- Requirement: AGENTS.md hard rule 2／`/tdd`（每個循環一個 seam、一個測試、一個最小實作）
- Summary: 不是程式碼缺陷（3a 第 11 則）：L12–L16 一起寫、一起看 red、一次實作，屬於流程偏差，executor 已經在票裡記錄。
- Evidence: 票的 Comments（segment 3a）：「L12–L16 were written together, run once to see each red, then implemented in one edit」；每一格的 red 都有記錄。
- Impact: 只影響流程紀錄；HEAD 的測試與實作都成立。
- Suggested fix: 無需改程式碼；在 retrospective 記錄即可。

#### SPEC-L-DR-10 · low · confidence medium · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:277`
- Requirement: （測試穩健度，Y39）
- Summary: 仍然存在（3a 第 13 則）：number 是透過非公開的 `#app.__vue_app__` 與 VitePress 的 `$frontmatter` 讀出來的。
- Evidence: 第 276-278 行 `(document.querySelector('#app') as any)?.__vue_app__?.config.globalProperties.$frontmatter?.number ?? null`。
- Impact: Vue 或 VitePress 升版後如果讀不到，值會變成 null，測試會失敗，不會誤判通過；屬於維護成本。
- Suggested fix: 可以接受；或在頁面上提供一個公開的 data 屬性給測試讀取。

#### SPEC-L-DR-11 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:293`
- Requirement: AGENTS.md hard rule 4（說明驗證涵蓋的面）
- Summary: 不是缺陷，已由後續段落解決（3a 第 14 則）：segment 9 的 W9-3 先執行 `WXL_SMOKE_PAGES=1 pnpm build`，再跑 `pnpm test:smoke`，112 個全數通過，dist 對應的是 HEAD 前一個 commit `e2ba837` 的原始碼。
- Evidence: 票第 3163 行 W9-3：`WXL_SMOKE_PAGES=1 pnpm build` exit 0，接著 `pnpm test:smoke` 112 passed。
- Impact: 無。
- Suggested fix: 無需處理。

#### SPEC-L-DR-12 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/theme/client-graph-no-smoke-fixtures.test.ts:51`
- Requirement: L47（client entry 的靜態 import 圖裡不能有任何含 `smoke-fixtures` 的檔案）
- Summary: 仍然存在（3b 第 1 則）：resolver 只接受 `.ts/.mts/.js/.vue`，JSON、CSS（含 `<style>` 的 `@import`）與 `import.meta.glob` 的邊都不會被讀到或走訪。
- Evidence: 第 51 行 `/\.(ts|mts|js|vue)$/.test(candidate)`；theme 有 import `messages/*.json`。目前 `.vitepress` 裡沒有 `import.meta.glob`，也沒有任何 JSON 含這個字串。
- Impact: 將來字串表或 CSS 裡出現這個字串時，L47 抓不到；只能靠 CI 的 PAT4 在真實 production build 上兜底。
- Suggested fix: 讓 resolver 也讀 `.json`／`.css` 的文字，只檢查字串、不追蹤邊；或補一條註解，寫明這部分由 PAT4 負責。

#### SPEC-L-DR-13 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:178`
- Requirement: A30（提示行文字完全相等）；D54
- Summary: 不是缺陷（合併 3b 第 2 與第 4 則）：smoke 改成從 `messages/<locale>.json` 讀期望文字，但 A30 要求的完全相等，已經在 unit 層用字面值釘住了。
- Evidence: 第 178-179 行用 `messages(requested).missing_translation.notice`／`.list_link`；`tests/unit/components/MissingTranslationLine.test.ts` 內含 `這一頁沒有繁體中文版本…` 與 `This page has no English version…` 字面值（grep 結果只有這一個檔案）。
- Impact: 字串表內容寫錯時，unit 測試會抓到；smoke 只負責驗證「畫面顯示的文字等於字串表」，這個分工是合理的。
- Suggested fix: 無需處理。

#### SPEC-L-DR-14 · low · confidence high · deferred-p2-regraded

- Where: `.vitepress/config.mts:56`
- Requirement: D49「one exported function, `isSmokeFixturePage(sourcePath)`, used by both」；L35「`pageListFromDir` and `srcExclude` use `isSmokeFixturePage`」
- Summary: 仍然存在，性質是 spec-inconsistency（合併 3b 第 3 則與第 5 則的前半）：VitePress 的 `srcExclude` 只吃 glob，所以 config 用的是 `SMOKE_FIXTURE_GLOBS`，根本沒有呼叫謂詞；規格字面要求兩邊都用同一個函式，這做不到。
- Evidence: config.mts:56 `...(smokePages ? [] : SMOKE_FIXTURE_GLOBS)`；pageList.ts:25-31 一邊是謂詞，一邊另外 map 出 `${code}/smoke-fixtures/**`。
- Impact: 使用者看得到的行為沒有缺陷；問題在規格的寫法和可實作的做法不一致。
- Suggested fix: 修訂 D49／L35 的字面，改成「同一個模組匯出謂詞與 glob，兩者一致」。

#### SPEC-L-DR-15 · low · confidence medium · deferred-p2-regraded

- Where: `.vitepress/pageList.ts:31`
- Requirement: L35（頁面清單與 VitePress 一致）；D49
- Summary: 仍然存在（3b 第 5 則的後半）：謂詞與 glob 是兩種寫法，沒有任何測試直接比對兩者在同一組輸入上的結果是否一致。
- Evidence: L34（config-base.test.ts:438-456）只檢查 srcExclude 含有 glob；L35（page-list.test.ts:364-407）只檢查謂詞與 `pageListFromDir`。目前靠人工檢視確認兩者一致（巢狀路徑被 `**` 涵蓋；`en/smoke-fixtures.md` 兩邊都是 false）。
- Impact: 日後只改其中一邊時，頁面清單可能列出 VitePress 沒有發布的頁面（或反過來），而且不會有測試抓到。
- Suggested fix: 補一個表格測試：對一組路徑（含巢狀、`xx/`、`challenge/smoke-fixtures/`）比對 `isSmokeFixturePage` 與 `SMOKE_FIXTURE_GLOBS` 的 minimatch 結果。

#### SPEC-L-DR-16 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:70`
- Requirement: L-§4.7（`X(path)` = 換掉語系段）；A31（兩語系守門測試）
- Summary: 仍然存在（3b 第 6 則）：`X()` 用 `LOCALES.find(code => code !== own)` 選「另一個語系」，`T = TRANSLATIONS[0]`，都假設剛好只有兩個語系。
- Evidence: 第 18 行 `const T: Locale = TRANSLATIONS[0]`；第 70 行 `localePath(LOCALES.find((code) => code !== own)!, rest)`。
- Impact: 兩個語系下正確；加入 ja 時 A31 的守門測試會先紅，所以不會悄悄出錯。
- Suggested fix: 在 ja epic 參數化時一起處理；可以加註解指向 A31／GD1。

#### SPEC-L-DR-17 · low · confidence medium · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:378`
- Requirement: L38（L-§4.7 第 5、6 列：冷載入沒有提示行）
- Summary: 仍然存在（3b 第 7 則的前半）：冷載入「沒有提示行」的分支在 `hydrated()` 之後立刻斷言 `toHaveCount(0)`；如果提示行比 networkidle 更晚掛上去，這個負向檢查可能誤判通過。
- Evidence: 第 375-378 行 `await hydrated(page); ... await expect(page.locator('[data-missing-translation]')).toHaveCount(0)`；`hydrated` 只等 `__vue_app__` 加上最多 10 秒的 networkidle（第 352-356 行）。
- Impact: 可能誤判通過，不會造成 flaky 失敗；目前重跑沒有觀察到不穩定。
- Suggested fix: 在負向檢查前等到 session gate 做出決定（例如等一個可觀察的 data 屬性），或比照 B7 案例加一段等待。

#### SPEC-L-DR-18 · low · confidence low · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:211`
- Requirement: L38（L-§4.7 第 3 列，A20 Back）
- Summary: 仍然存在（3b 第 7 則的後半）：Back 案例在 `hydrated()` 之後才讀 `before`；萬一 A3 的 replace 轉址晚於 networkidle，`before` 會是轉址前的路徑。
- Evidence: 第 207-212 行：`goto(localePath(PRIMARY, 'challenges'))` → `hydrated` → `const before = pathnameOf(page)`；正規式 `/\/challenges$/` 對兩個語系的清單都成立，所以擋不住這種時序差。
- Impact: 理論上可能 flaky 或比錯對象；實測沒有發生。
- Suggested fix: stored `en` 時先 `expect.poll` 到 A3 的目標路徑，再記錄 `before`。

#### SPEC-L-DR-19 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/missing-translation.spec.ts:27`
- Requirement: L37「otherwise every test fails with the message naming `WXL_SMOKE_PAGES=1`」對照 D50「fails fast (one `beforeAll`)」
- Summary: 仍然存在，性質是 spec-inconsistency（3b 第 8 則）：Playwright 會把檔案層級 beforeAll 的失敗回報成 1 failed、其餘 did not run，不是每個 test 各自失敗。L37 的字面和 D50 的機制彼此不一致。
- Evidence: 第 27-50 行是檔案層級的 `test.beforeAll`；票的 segment 3b 實測：production build 上 1 failed、25 did not run，訊息有提到 `WXL_SMOKE_PAGES=1`。
- Impact: 整個 run 仍然失敗、沒有任何案例通過，符合規格本意；只是 L37 的字面描述對不上實際行為。
- Suggested fix: 修訂 L37 的字面，改成「the run fails before any case passes, with a message naming `WXL_SMOKE_PAGES=1`」。

### Spec · S (49 findings: 0 high, 1 medium, 48 low)

Coverage: 完整讀過（HEAD 的實際檔案）：scripts/generate-redirects.ts、scripts/challenge-numbers.ts、scripts/pre-commit.sh、.vitepress/challenge/shortLink.ts、.vitepress/theme/components/ShortLinkShare.vue、platform/public/_redirects、tests/unit/site/redirects-generated.test.ts、tests/unit/site/redirects.test.ts、tests/unit/scripts/challenge-numbers.test.ts、tests/__helpers__/preCommitRepo.ts。完整讀過的 diff 檔：.vitepress__challenge__shortLink.ts.diff、.vitepress__theme__components__ShortLinkShare.vue.diff；scripts__pre-commit.sh.diff 只讀了第 100–226 行（觸發後的 W4、validate、D12 搬移部分），以及用 grep 看了被刪除的行。抽樣：tests/pre-commit-sh.test.ts（實際檔案第 330–1760 行，也就是 S36–S51、S73–S80 的區段，加上 2512–2528 行的 O5 表；第 1761 行之後的 commit forms、stash、signal、first commit 各節沒有讀）、tests/unit/challenge/shortLink.test.ts（110–175）、tests/unit/components/ShortLinkShare.test.ts（220–260）、tests/site-smoke/site-smoke.spec.ts（984–1013、1036）、ChallengeList.vue（100–134 與 grep）、MergedNav.vue（grep）、README.en.md（154–163、330–341）、.vitepress/source-layout.ts（classifySourcePath、legacyPageLine）、.vitepress/primary-locale.ts（readIndexPrimaryLocale）。規格：spec.en.md 的 AC-27–AC-34 與第 305–328 行；traceability 的 D19、D53–D74、D111–D130、D148–D150、S-§4.1–S-§4.7、0010-S24–S29 seam、S62–S72 文件列、Overridden contracts › Area S（1696–1724）與 Area Y 的 hook 相關列。ticket：Context／AC、Area S 的 test plan（3477–3566）、2154–2386 與 2793–2930 的 Comments、segment 9 的 coverage report（3154–3247）。deferred JSON 的 4a、4b、4c、4d、6 五段全部重新評等（4b 的 #1/#6、#3/#8、#4/#10 是重複項，已合併）。沒有讀到：tests/unit/components/ShortLinkShare.mode-default.test.ts 的內文、ChallengeList.test.ts（S53、S54 清單那一半）、MergedNav.test.ts（S55）、README.md（中文版的 S69、S70）、GLOSSARY.md（S71）、技能檔與 challenge-pipeline.md（S72）、generate-redirects、challenge-numbers 與各測試檔的 diff 檔本身（改讀 HEAD 的實際檔案）、create-challenge.ts 的其他部分、2026-11-16 那些 parent 條目的全文（只用 grep 掃過，沒有看到 area S 的決策）。沒有執行任何測試，所有判斷都來自閱讀程式碼。

Missing context: 沒有讀 0007 的完整 O1–O7、W3–W5 定義（只 grep 到 W5 =「the generator's message, as today」），所以 O3、O4 的界線只依 0010 的敘述判斷。; SPEC-S-05 判斷「目前已經沒有任何測試寫入 live tree」時，只看了 challenge-keygen.test.ts；其他測試檔（例如 create-challenge-run.test.ts）是否仍然寫入實際的 platform/challenge/，沒有驗證。; S69–S72（README 中文版、GLOSSARY 短連結條目、技能檔的 `_redirects` 句子）可能屬於文件區的 reviewer，本次沒有逐句對照 D30、D58、D71。

#### SPEC-S-D4c-5 · medium · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects.test.ts:533`
- Requirement: D124／D54／B93（讀實際樹的測試要嘛 upstream-only，要嘛由 P 與樹推導）
- Summary: （4c）S33 的 non-vacuity 案例寫死 upstream 的 slug `door-is-open`，又沒有經過 upstreamOnlySkipReason。still present。
- Evidence: RT:532–538：`const without = `platform/${P}/challenge/door-is-open/index.md`` 加上 `expect(paths).toContain(without)`；附近的 001 案例（466–475）就有用 `it.skipIf(upstreamOnlySkipReason(...))`。
- Impact: 老師的靶場如果刪掉了 door-is-open 這道示範題，CI 的 `test` job 會紅，正好違反 D124 的「a range's CI … passes」。這是規格層級的承諾，所以把嚴重度升為 medium。
- Suggested fix: 改成取 index 中第一個同時有宣告與主語系說明頁的 slug，或加上 `it.skipIf(upstreamOnlySkipReason(...))`。

#### SPEC-S-01 · low · confidence high · incorrect

- Where: `scripts/pre-commit.sh:439`
- Requirement: S-§4.5 W4a（對象是未追蹤的資料夾 `platform/challenge/<slug>/`）；S47；AC-31「W4a and W4b equal S-§4.5's texts」
- Summary: hook 列出 W4 候選時，宣告樹這一支沒有檢查路徑是否以 `/` 結尾，所以直接放在 `platform/challenge/` 底下的未追蹤檔案（例如舊版面的單檔頁 `platform/challenge/x.md`，或 `notes.txt`）也會拿到 W4a，訊息還叫老師 `git add` 它。
- Evidence: pre-commit.sh:432–440 的註解寫「True when the path (ending in `/`) is a folder」，但實作是 `local dir=${1%/}` 加上 `platform/challenge/*) [ "${#slashes}" -eq 2 ] ;;`，`platform/challenge/x.md` 剛好也有兩個斜線。generate-redirects.ts:508–512 的 `untrackedLines` 一樣沒檢查結尾斜線：`parts.length === 3 && parts[1] === 'challenge'` 之後就推入 `${dir} is untracked, so _redirects leaves it out. To include it, git add it and commit again.`。舊版 hook 用 `case "$rest" in "$path" | */*/) ;; */) …` 只收以 `/` 結尾的項目（diff 第 117–119 行），所以這是這次改動造成的退化。
- Impact: 只有 W3 觸發時才會印出。老師會看到一行建議把舊版面頁面或零散檔案 `git add`，照做之後下一次 commit 會被 W6d 或 VM13 擋下。訊息誤導，但不會產生錯誤的 `_redirects`。
- Suggested fix: `untracked_tree_child` 的宣告樹分支加上 `case "$1" in */) ;; *) return 1 ;; esac`（也就是要求以 `/` 結尾）；`untrackedLines` 也只處理以 `/` 結尾的項目。再補一個 PC 案例：W3 被強制觸發時，未追蹤的 `platform/challenge/x.md` 不會出現在 W4。

#### SPEC-S-02 · low · confidence medium · spec-inconsistency

- Where: `scripts/generate-redirects.ts:559`
- Requirement: D150「the hook and CI print the same lines」，以及 D150 的「`redirects:generate` (full and `--staged`) stops with one line per offending name」；對照 D64 與 D121（`--staged` 先跑 brief check，在印出任何東西之前）
- Summary: 同一個不合文法的名稱，如果只出現在說明頁資料夾（沒有宣告檔），full mode 會印 D150 那一行，`--staged`（hook）卻印 W6c，完全不出現 D150 那一行。D150 要求兩種模式印出同樣的行，D64 卻要求 `--staged` 先跑 brief check，兩條規格互相衝突。
- Evidence: generate-redirects.ts:559–566 在 `generateFor` 之前就以 `briefFaults` 退出；`slugFaults` 只在 `numericRules`（256–262）裡跑。RG:546–571 的 'the en brief tree only' 案例期望 full mode 輸出 `redirects: challenge slug … is outside …`；PC:1714–1727 則明確釘住 hook 的行為：「is named by W6c first, and the D150 line does not appear (D64)」。
- Impact: 老師在 hook 看到的訊息和 CI 的 guard（RG 'is byte-identical'，full 生成）不一樣。兩邊都會拒絕，所以不會讓錯誤通過，只是 D150 字面上的「same lines」沒有做到。
- Suggested fix: 由使用者裁定：在 D150 補一句，說明 brief fault（D64）優先於 slug 行；或者讓 `--staged` 在 W6 之外也印出 D150 那一行。

#### SPEC-S-03 · low · confidence high · spec-inconsistency

- Where: `scripts/generate-redirects.ts:487`
- Requirement: traceability S-§4.5 W6a／W6c 的範本 `is a <L-name> brief`
- Summary: 規格的範本把 `<L-name>` 代成 `English` 後會變成「is a English brief」，文法錯誤（應為 an English）。實作照抄規格，所以問題出在規格本身。
- Evidence: traceability.md:1246 與 1248 是 `✗ platform/<L>/challenge/<slug>/ is a <L-name> brief, …`；generate-redirects.ts:487 與 494 是 `is a ${names[localeOfBrief(fault.present)]} brief`；PC:1033、1037 的 `W6.a`／`W6.c` 也照同一個範本比對。P = zh-TW、L = en 時，輸出是「is a English brief」。
- Impact: hook 會把文法錯誤的英文訊息印給老師看（S44、S74 這些情況）。不影響行為。
- Suggested fix: 規格改成 `is <L-name>'s brief` 或 `is a brief in <L-name>` 這類不受冠詞影響的寫法，實作與 PC 的 `W6` 一起改；這需要使用者核准規格修訂。

#### SPEC-S-04 · low · confidence high · partial-behaviour

- Where: `scripts/generate-redirects.ts:105`
- Requirement: S64「D57–D61, D64, D67 in the present tense … each listed comment cites the D-number it states」
- Summary: D61（容量句由 F 計算）在 generate-redirects.ts 的所有註解裡都沒有被引用，`redirectsHeader` 的註解只寫 K1–K3。
- Evidence: grep `D6[01]\b|D59|D57` 只找到 67 行（D57）、86 行（D60）、329 行（D59）。105–109 行是「The file's header. The capacity sentences are computed from the form list (K1–K3)…」，沒有 D61。
- Impact: S64 是 stage 6 的文件列，這裡缺了一個 D-number 引用。純註解，不影響行為。
- Suggested fix: 在 `redirectsHeader` 的 JSDoc 加上「(D61)」。

#### SPEC-S-05 · low · confidence medium · smell

- Where: `scripts/generate-redirects.ts:185`
- Requirement: S64（`GenerateOptions.includeSlug` 的註解要寫成現在式且為真）
- Summary: `includeSlug` 註解裡限制 guard 範圍的理由已經不成立：它說「Other test files scaffold a throwaway challenge into the real tree to exercise the keygen CLI」，但 5c-pre（f3444c6）之後，keygen CLI 測試都在暫存複本上跑，不再寫入 live repository。RG:613–618 與 RT:427–428 也有同樣的過時說法。
- Evidence: generate-redirects.ts:185–189；challenge-keygen.test.ts:844「no test below may write into the live repository」、931「runs the CLI on a copy under os.tmpdir(), never in the live repository」。
- Impact: 維護者會誤以為還有平行測試寫入實際樹的競態存在。不影響行為；限制在 index 本身仍然有道理（與 hook 一致）。
- Suggested fix: 把理由改成「與 hook 一樣以 index 為準（D67）」，並確認目前已經沒有任何測試寫入 live tree，再刪掉競態的說法（RG、RT 一起改）。

#### SPEC-S-06 · low · confidence medium · smell

- Where: `scripts/pre-commit.sh:24`
- Requirement: S66（hook header 第 2–4 點要引用它所陳述的 D-number）；D122
- Summary: header 第 2 點描述「commit 時的驗證從 index 的 range.json 讀主語系」，引用的是 D67、D121，可是這條規則是 D122 的（D67 只管 generator 的 `--staged`，D121 只管拒絕的順序）。
- Evidence: pre-commit.sh:23–25「(challenge-lint-staged.ts, which reads the primary locale from the index's range.json, D67, D121)」；traceability D122「Commit-time validation reads the index's primary locale.」。
- Impact: 引用的決策編號不精確，讀者追溯時會找錯條目。純註解。
- Suggested fix: 改成「D122」（可以保留 D121 說明順序）。

#### SPEC-S-07 · low · confidence medium · smell

- Where: `scripts/generate-redirects.ts:129`
- Requirement: D66（range.json 是受監看的路徑，staged 的變更會讓 hook 重新產生 `_redirects`）；S72／S69（每一句關於 `_redirects` 的敘述都要正確）
- Summary: 產出的 `_redirects` 檔頭寫「the pre-commit hook regenerate it when challenges change」，沒提到 range.json 變更也會觸發重新產生。README.en.md:156 的「on every commit that changes a challenge or that file」也漏了 range.json。
- Evidence: generate-redirects.ts:128–130 與 committed `platform/public/_redirects`:15–17；README.en.md:156。（README.en.md:340 在別的地方有寫到 commit range.json 時 hook 會重新產生。）
- Impact: 敘述不完整但不算錯；改 `primaryLocale` 的老師可能不知道 commit 時檔案會被改寫。
- Suggested fix: 檔頭改成「when challenges or range.json change」，並重新產生 `_redirects`。README 的 hook 段落同步補上 range.json（中英兩版）。

#### SPEC-S-08 · low · confidence high · spec-inconsistency

- Where: `scripts/generate-redirects.ts:550`
- Requirement: seam 0010-S28（Generator CLI：full、`--staged --root`、`--describe-untracked`）；ticket 的 open item S-q6「It may stay an internal mode … say so at stage 6」
- Summary: 這次新增了 CLI 模式 `--challenge-trees`（hook 用它取得觸發路徑），但 0010-S28 沒有列出這個模式，S-q6 交代要在 stage 6 說明，目前還沒有任何決策紀錄。
- Evidence: generate-redirects.ts:12–13 的 Usage 寫「--challenge-trees … (internal)」，550–553 是實作；pre-commit.sh:114 會呼叫它。ticket:3565 的 S-q6 仍然是 open。traceability.md:264 的 0010-S28 只列了三個模式。
- Impact: seam 表和實際介面不一致。這個模式只透過 0010-S29（hook）間接觀察到（S36、S80）。
- Suggested fix: 請使用者裁定：把 `--challenge-trees` 記成 0010-S28 的內部模式（traceability 加一句），或在 stage 6 disposition 註明 S-q6 的結論。

#### SPEC-S-09 · low · confidence medium · unrequested-scope

- Where: `scripts/generate-redirects.ts:110`
- Requirement: seam 0010-S24（`generateRedirects`、`writeRedirects`、`indexSlugs`）；segment 4b executor 的 reading (1)「the export is not in the S24 list, parent to record it under the authorization」
- Summary: `redirectsHeader(primary, forms)` 與 `Form` 被 export 出來，供 S26b 注入 5 個 form 測試使用，但不在 0010-S24 的介面內。executor 請 parent 依授權記錄，ticket 裡卻找不到 parent 的決策紀錄。同一個檔案還 export 了 `briefFaultLine`、`untrackedLines`、`indexPaths`、`IncludeTree`、`Slug`，也都不在 seam 表內。
- Evidence: generate-redirects.ts:61、110、175、369、411、481、504；ticket:2209–2211。grep `redirectsHeader` 只找到 executor 的條目（2196、2209、2230），沒有 parent 的條目。
- Impact: seam 的表面在沒有記錄的情況下變大了。不影響行為。
- Suggested fix: 由 parent 在 Comments 補一筆依授權的核准紀錄，或在 traceability 0010-S24 註明這些測試用的 export。

#### SPEC-S-10 · low · confidence medium · partial-behaviour

- Where: `tests/pre-commit-sh.test.ts:759`
- Requirement: AC-31「W4a and W4b equal S-§4.5's texts with `<dir>`, `<L-name>` and `<P-name>` filled, per S47's cases」
- Summary: W4a／W4b 的斷言只逐字比對到第一句（`w4LeftOut` 到「leaves it out.」，`w4Opens` 到「if there is one.」）。後半句「To include it, git add it and commit again.」只靠 `w4()` 檢查同一行有沒有出現 `git add`，所以後半句改寫了也測不出來。
- Evidence: PC:759–775：`w4` 是 `${escaped}[^\n]*git add|git add[^\n]*${escaped}`，`w4LeftOut` 與 `w4Opens` 都沒有包含尾句。H10／S47（930–956）就是組合這三個函式在檢查。
- Impact: S-§4.5 的尾句如果被改成別的說法（只要還含有 git add），測試仍然會通過；AC 要求「equal」，這裡沒有完全釘住。
- Suggested fix: 讓 `w4LeftOut`／`w4Opens` 一路比到行尾：`… To include it, git add it and commit again\.$`（加 m flag）。

#### SPEC-S-11 · low · confidence low · partial-behaviour

- Where: `tests/pre-commit-sh.test.ts:1573`
- Requirement: AC-31「a staged `range.json` change in either direction … each end as their rows state with the staged `_redirects` equal to the oracle」
- Summary: 「兩個方向」裡只有 en→zh-TW 有成功（O2）案例（S41）。zh-TW→en 只有拒絕案例（S77），沒有「兩種說明頁都在時，staged `_redirects` 等於 oracle」的案例。各列（S41、S77）本身都滿足，但 AC 的文字比各列寬。
- Evidence: PC:1574 S41 只用 en fixture；1601 S77 在 zh-TW fixture 上只驗 W6a 拒絕；S78 (a) 是刪除 range.json（en→zh-TW）。全檔找不到 zh-TW fixture 加入 `{"primaryLocale":"en"}` 後 O2 的案例。
- Impact: zh-TW→en 成功路徑上的 `--staged` 生成（例如在 P = en 時 old-address rule 有沒有被移除）沒有 hook 層級的測試，只有 RG 的生成單元測試覆蓋。
- Suggested fix: 在 zh-TW fixture 先補上 test-chall 的 en 說明頁並 commit，再 stage `{"primaryLocale":"en"}`：期望 O2、staged 檔案等於 oracle、沒有 `/zh-TW/*` 規則。

#### SPEC-S-12 · low · confidence high · smell

- Where: `tests/unit/site/redirects-generated.test.ts:333`
- Requirement: S15「malformed YAML」這一格
- Summary: S15 的「malformed YAML」fixture 傳入的是 `'number: [unclosed'`，但 helper 會再加上一個 `number: ` 前綴，實際寫出的是 `number: number: [unclosed`。結果仍然是壞掉的 YAML，所以測試成立，只是 fixture 和原本的意圖不一致。
- Evidence: RG:32 `if (numberYaml !== undefined) lines.push(`number: ${numberYaml}`)`；RG:333 `['malformed YAML', 'number: [unclosed']`。
- Impact: 日後如果 helper 或這個值被修改，這一格測的究竟是哪一種 YAML 錯誤並不清楚。目前沒有缺陷。
- Suggested fix: 改成 `['malformed YAML', '[unclosed']`。

#### SPEC-S-13 · low · confidence high · smell

- Where: `scripts/challenge-numbers.ts:55`
- Requirement: S15（拒絕時要指名檔案）；D62
- Summary: `readChallengeNumber` 遇到無法解析的 YAML 一律回傳 undefined，`checkChallengeNumbers` 就把它報成「has no `number` in its declaration」。一個寫了 number、只是 YAML 壞掉的宣告檔，會被說成「沒有 number」。
- Evidence: challenge-numbers.ts:53–58 是 `catch { return undefined }`；116–118 是 `e.value === undefined ? 'has no `number` in its declaration' : …`。
- Impact: S15 只要求訊息指名 slug 和檔案路徑，這點有做到；但對原因的描述是錯的，老師會去找一個其實存在的 `number`。
- Suggested fix: 讓 `readChallengeNumber` 能區分「解析失敗」和「沒有這個 key」（例如回傳一個 sentinel），訊息改成「is not valid YAML」。

#### SPEC-S-14 · low · confidence high · smell

- Where: `tests/unit/scripts/challenge-numbers.test.ts:13`
- Requirement: D62（number 只寫在 challenge.yaml）
- Summary: CN 的檔頭註解還寫著 number 是「written into frontmatter by hand」，第 91 行也說「what someone would type into frontmatter by mistake」，都還是舊說法。（和 4a 延後項目的 writeRetired docstring 是不同的行。）
- Evidence: CN:13–15「It is written into frontmatter by hand…」；CN:89–91「it is exactly what someone would type into frontmatter by mistake」。
- Impact: 純註解，會誤導讀者。
- Suggested fix: 兩處的「frontmatter」改成「the challenge's declaration (`challenge.yaml`)」。

#### SPEC-S-D4a-1 · low · confidence high · deferred-p2-regraded

- Where: `scripts/create-challenge.ts:31`
- Requirement: Wave 4：shortLink.ts「exports the slug grammar once」
- Summary: （4a）create-challenge.ts 重複定義了 SLUG_RE。fixed at scripts/create-challenge.ts:31、121：現在改 import `SLUG_GRAMMAR`。
- Evidence: `import { SLUG_GRAMMAR } from '../.vitepress/challenge/shortLink.ts'`（31 行）、`if (!SLUG_GRAMMAR.test(slug))`（121 行）；scripts/ 底下已經找不到 SLUG_RE。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-S-D4a-2 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/scripts/challenge-numbers.test.ts:189`
- Requirement: S20 第 5 格；D63「either or both; both count」
- Summary: （4a）S20 的「同一個資料夾有 yaml 3 與 legacy 14 → 15」，用只讀 legacy 的實作也會通過。still present。
- Evidence: CN:189–192：legacy 14 是最大值，所以只讀 index.md 也會得到 15。第 3 格（retired yaml 9 → 10）另外擋住了忽略 yaml 的實作，各列合起來成立。
- Impact: 只是測試強度不足，D63 的「both count」沒有被單一格釘住。
- Suggested fix: 加一格：同一個資料夾裡 yaml 20、legacy 14 → 21。

#### SPEC-S-D4a-3 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/scripts/challenge-numbers.test.ts:42`
- Requirement: 註解正確性
- Summary: （4a）writeRetired 的 docstring「same shape, under the archive tree」已經過時（它寫的是 legacy index.md 的形狀）。still present。
- Evidence: CN:42 `/** Write a retired challenge — same shape, under the archive tree. */`，後面寫的是 frontmatter 形式的 index.md。
- Impact: 純註解。
- Suggested fix: 改成「a legacy retired page, `.archive/challenge/<slug>/index.md` with frontmatter (D63)」。

#### SPEC-S-D4a-4 · low · confidence high · deferred-p2-regraded

- Where: `scripts/challenge-numbers.ts:123`
- Requirement: S19（每個宣告目錄一筆 entry）
- Summary: （4a）`checkChallengeNumbers` 的 bySlug 分組成了死碼，註解「however many entries name it」描述的情況已經不可能發生。still present。
- Evidence: challenge-numbers.ts:123–139 仍然先依 slug 分組，再 `list.find(...)`；`collectChallengeNumbers`（93–100）每個目錄只產生一筆。
- Impact: 多餘的複雜度，註解會誤導讀者。行為正確。
- Suggested fix: 刪掉 bySlug，直接依 entries 建 slugOf。

#### SPEC-S-D4a-5 · low · confidence high · deferred-p2-regraded

- Where: `scripts/challenge-numbers.ts:66`
- Requirement: 出貨程式碼不應帶流程用語
- Summary: （4a）出貨程式碼註解裡的流程用語：部分修正。CHALLENGE_TREES 和「segment 4b removes this」都已移除，但 readLegacyRetiredNumber 還留著「Kept until the retired walk is rewritten.」。
- Evidence: challenge-numbers.ts:63–67。
- Impact: 這句暗示 legacy 讀取是暫時的，但 D63 把它定為常設行為（升級搬家不碰 .archive/），所以這句與規格矛盾。
- Suggested fix: 刪掉那一句，改成「D63: kept because the move leaves .archive/ alone」。

#### SPEC-S-D4a-6 · low · confidence high · deferred-p2-regraded

- Where: `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:2175`
- Requirement: ticket 紀錄正確
- Summary: （4a）fix-round 的 comment 寫「No file added to the index」，與事實不符：fixed，parent 在 ticket:2175–2177 的條目已更正（「Its Comments line … is wrong and is corrected by this entry」）。
- Evidence: ticket:2175–2177。
- Impact: 已更正，不算缺陷。
- Suggested fix: 無。

#### SPEC-S-D4a-7 · low · confidence high · deferred-p2-regraded

- Where: `.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:2175`
- Requirement: 工作樹規則
- Summary: （4a）ticket 檔被 stage 的問題：not a defect，因為 parent 決定由 4a 的 commit 以 pathspec 一起提交，之後 index 與 HEAD 一致；packet 擷取時 git status 是 clean。
- Evidence: ticket:2175–2176「No unstage is needed: 4a's commit step commits the file by pathspec」；MANIFEST 的 git status 為 (clean)。
- Impact: 沒有殘留影響。
- Suggested fix: 無。

#### SPEC-S-D4b-1 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects-generated.test.ts:573`
- Requirement: S51「full: generateRedirects throws, no file」
- Summary: （4b，兩位 checker 的重複項已合併）S51 的兩個 shadow 拒絕案例（'005' vs 5、'1234'）只呼叫 generateRedirects，沒有用 writeRedirects 確認沒寫出檔案。still present。
- Evidence: RG:573–589 只有 `expect(() => generateRedirects(root)).toThrow(new Error(...))`；文法案例在 568–569 有 writeRedirects 與 existsSync 的檢查。writeRedirects 是先生成再寫檔，所以結構上已經保證不會寫出。
- Impact: 只是測試強度不足，實際行為正確。
- Suggested fix: 兩個案例都補上 writeRedirects throw 與 `existsSync(_redirects) === false`。

#### SPEC-S-D4b-2 · low · confidence high · deferred-p2-regraded

- Where: `scripts/generate-redirects.ts:21`
- Requirement: 出貨程式碼不應帶流程用語
- Summary: （4b）generate-redirects.ts 裡的流程用語（「Segments 4c and wave 6 …」「by segment 4c」）：fixed，檔案中已經 grep 不到 segment 或 wave。
- Evidence: 在 generate-redirects.ts、challenge-numbers.ts、pre-commit.sh 裡 grep `[Ss]egment|wave `，只找到與 URL 路徑段（path segment）有關的兩行。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-S-D4b-3 · low · confidence high · deferred-p2-regraded

- Where: `scripts/generate-redirects.ts:568`
- Requirement: D67；0010-S24 indexSlugs 的 key 為 `declaration` 與各語系代碼
- Summary: （4b，兩位 checker 的重複項已合併）wave 之間 `--staged` 的 key 仍是 root/zh-TW，會把所有東西都濾掉：fixed at generate-redirects.ts:380–405（indexTrees 以 'declaration' 和語系代碼為 key）與 559–569（includeSlug 查 `trees.slugs.get(locale)`）。
- Evidence: `generateFor(root, primary, { includeSlug: (slug, locale) => trees.slugs.get(locale)?.has(slug) ?? false })`；PC 的 S38、S39 都用 oracle 比對 `--staged` 的輸出。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-S-D4b-4 · low · confidence high · deferred-p2-regraded

- Where: `scripts/generate-redirects.ts:571`
- Requirement: D123「reads it before the layout check and before any challenge … stderr's first line」
- Summary: （4b，兩位 checker 的重複項已合併）CLI 的 full mode 先檢查 platform/public 存在，才讀 range.json；兩種錯誤同時存在時，stderr 第一行是「platform/public not found」而不是 PL 行。still present。
- Evidence: generate-redirects.ts:571–574 的 `if (!existsSync(join(root, 'platform', 'public'))) { console.error(...); process.exit(1) }` 在 575 行 `writeRedirects(root)` 之前。
- Impact: 只發生在邊角情況（沒有 platform/public 而且 range.json 壞掉）。D123 字面上的順序沒有做到。
- Suggested fix: 先呼叫 `readPrimaryLocale`，再檢查 platform/public；或把這個檢查移進 writeRedirects、放在讀 P 之後。

#### SPEC-S-D4b-5 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects-generated.test.ts:367`
- Requirement: S15「no file written」
- Summary: （4b）'writes no file at all when the tree is inconsistent' 用的是不帶參數的 toThrow()，就算丟出的是 layout 錯誤也會通過。still present。
- Evidence: RG:367 `expect(() => writeRedirects(root)).toThrow()`。
- Impact: 只是測試強度不足；目前 fixture 有 home 頁，丟出的確實是 number fault。
- Suggested fix: 改成 `toThrow('unnumbered (platform/challenge/unnumbered/challenge.yaml)')`。

#### SPEC-S-D4b-7 · low · confidence high · deferred-p2-regraded

- Where: `scripts/generate-redirects.ts:266`
- Requirement: traceability.md:222「D64 (b) vs the generator's full mode refusing a brief without number: same condition, one message source (`checkChallengeNumbers` label `number`)」
- Summary: （4b）generator 自己組 D64(b) 的訊息（「… has no declaration …, so no number」），沒有經過 checkChallengeNumbers 的 `number` label。still present。
- Evidence: generate-redirects.ts:266–275 自行 `failures.push(`${slug} (${brief}) has no declaration ${declaration}, so no number`)`；checkChallengeNumbers 只看宣告 entries。
- Impact: 同一個條件有兩個訊息來源，違反 traceability 的約束；S18 的 AC（指名說明頁與缺少的宣告路徑）有做到。
- Suggested fix: 讓 checkChallengeNumbers 接受「沒有宣告的說明頁」輸入並產生 `number` label 的結果；或由使用者裁定修訂 traceability:222。

#### SPEC-S-D4b-9 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects-generated.test.ts:146`
- Requirement: Test plan S4 的 Boundary 欄「no range.json」
- Summary: （4b）S4 案例明確寫了 `{"primaryLocale":"zh-TW"}`，不是 plan 寫的「no range.json」。still present。
- Evidence: RG:184–188 的 it.each 對每格都呼叫 `setPrimary(root, primary)`；S10（217–234）另外證明了沒有 range.json 時輸出與 zh-TW 逐位元組相同。
- Impact: 合起來的覆蓋仍然成立，只是 S4 單格沒有走到「檔案不存在」這條路徑。
- Suggested fix: 讓 S4 那一格不寫 range.json（例如給它一個 noRange 旗標）。

#### SPEC-S-D4c-1 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects.test.ts:799`
- Requirement: S35／S-§4.7 的排序（slug、kind W6a/W6b/W6c/W6d、present）
- Summary: （4c）同一個 slug 內 missing-declaration 與 old-layout 的先後，以及 present 的 tiebreak，即使被改壞也不會讓測試失敗。still present。
- Evidence: RT:799–816 裡 'B' 有 MP 與 OL、'a' 有 MP 與 MD，所以對調 rank 1 和 2 不會改變任何輸出。present 的 tiebreak 也沒用到：產生順序 en、zh-TW 本來就等於 UTF-16 順序，sort 又是穩定的。
- Impact: 只是測試強度不足；S35 本身的 AC（S-§4.7 範例逐字相等）有做到。
- Suggested fix: 加一個 slug 同時有 MD 和 OL 的案例；再加一個案例讓 present 的產生順序與 UTF-16 順序相反（例如三個語系，或用 legacy 路徑）。

#### SPEC-S-D4c-2 · low · confidence high · deferred-p2-regraded

- Where: `scripts/generate-redirects.ts:26`
- Requirement: D67、D65（`--staged` 讀 index 的 range.json，`--describe-untracked`）
- Summary: （4c）刪掉指向後續 segment 的句子後，`--staged` 的描述讀起來像已經完成，而當時 wave 6 還沒交付：fixed，wave 6 已經交付。
- Evidence: generate-redirects.ts:26–34 的描述與 554–569 的實作都用 `readIndexPrimaryLocale` 和 `--describe-untracked`。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-S-D4c-3 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects.test.ts:442`
- Requirement: S29「numbers read from `challenge.yaml`」，比對 index 的樹
- Summary: （4c）S29 的 slug 取自 git index，number 卻讀 working tree 的 challenge.yaml。still present。
- Evidence: RT:442 `readChallengeNumber(resolve(DOCS, 'challenge', slug, 'challenge.yaml'))`；slug 來自 `indexSlugs(REPO_ROOT)`（429 行）。
- Impact: 如果有未 stage 的 number 修改，期望值會跟著 working tree 走，與 committed 檔案（依 index 產生）不一致，造成誤報紅燈。
- Suggested fix: 改用 `git show :platform/challenge/<slug>/challenge.yaml` 解析，或沿用 RG 的 materialiseIndex。

#### SPEC-S-D4c-4 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/redirects.test.ts:31`
- Requirement: S68（RT header 要改寫成以 page-path mapping 與 briefFaults 為準）
- Summary: （4c）RT header 過時：大部分已由 4d 修正（root-locale、orphanFaults、`platform/<prefix>/<slug>/`、rewrites 段落都已改寫）。殘留的是 CAUGHT 清單中「a challenge directory left without an `index.md`」：D127 之後，沒有 index.md 的資料夾在目標檢查裡會被忽略，只有數字規則指向的頁面消失時才抓得到。第 120 行的 0008 G1–G3 另列 SPEC-S-D4d-5。
- Evidence: RT:29–39 的 CAUGHT 清單；RT:574–579「ignores a folder with no index.md: it is no slug (D127)」。
- Impact: 純註解，部分敘述過強。
- Suggested fix: 改寫成「a numbered rule's target page whose index.md was removed」。

#### SPEC-S-D4c-6 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects.test.ts:411`
- Requirement: 測試穩健度
- Summary: （4c）indexPrimaryLocale() 在 describe 收集階段執行，index 裡的 range.json 一旦壞掉，整個檔案在 collection 階段就失敗。still present。
- Evidence: RT:411、500、520 都是 `const P = indexPrimaryLocale()` 寫在 describe 內，不在 it 或 beforeAll 裡。
- Impact: 失敗時看到的是 suite error，而不是單一測試指出 PL 行；可診斷性較差。
- Suggested fix: 改放到 beforeAll 或各個 it 裡面。

#### SPEC-S-D4d-1 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:986`
- Requirement: 註解位置
- Summary: （4d）S56 的 describe 插在 S06 註解與 S06 describe 之間。still present。
- Evidence: site-smoke.spec.ts:986–987 是 S06 的註解，988–1010 是 S56，S06 的 describe 從 1012 行才開始。
- Impact: 純可讀性。
- Suggested fix: 把 986–987 行移到 1012 行之前。

#### SPEC-S-D4d-2 · low · confidence high · deferred-p2-regraded

- Where: `.vitepress/theme/components/ChallengeList.vue:111`
- Requirement: S67（ChallengeList 的 copy control 註解）
- Summary: （4d）移除 hasCopyControl 之後，它的 JSDoc 沒有接任何宣告。still present。
- Evidence: ChallengeList.vue:111–118 的 JSDoc 後面緊接 120 行另一段 JSDoc（slugOf）。
- Impact: 註解掛錯位置，讀起來像在說明 slugOf。
- Suggested fix: 改成一般的 `//` 註解，放到 470 行 `<ShortLinkShare …>` 附近或 template 註解裡。

#### SPEC-S-D4d-3 · low · confidence medium · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:1005`
- Requirement: S56／AC-33「one page-mode control per numbered challenge」
- Summary: （4d）S56 斷言列數等於有編號的宣告數，等於假設每一道題都有編號、也都有主語系說明頁。still present。
- Evidence: site-smoke.spec.ts:1005 `expect(rows, …).toBe(NUMBERED)`。
- Impact: 樹裡出現沒有編號的題目時（E10），這個測試會誤報。目前 validate 要求 number，所以實際上很少發生。
- Suggested fix: 改成控制項數量等於有編號的列數，列數另外和清單資料比對。

#### SPEC-S-D4d-4 · low · confidence medium · deferred-p2-regraded

- Where: `scripts/generate-redirects.ts:158`
- Requirement: S64（PARAMETERISED 註解要引用 D-number）
- Summary: （4d）PARAMETERISED_SECTION 常數沒有引用 D59 的程式註解（只有 329 行的迴圈註解有）。still present。
- Evidence: generate-redirects.ts:158 的常數前面沒有 JSDoc；D59 只出現在 329 行。
- Impact: S64 列出的 PARAMETERISED 這一項沒有自己的 D 引用；意圖已經由 329 行部分滿足。
- Suggested fix: 在常數前加上 `/** The slug section's comment (D59). */`。

#### SPEC-S-D4d-5 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/redirects.test.ts:120`
- Requirement: S68；D58（取代 0008 G1–G3／G8／G9）
- Summary: （4d）RT header 結尾仍然寫「the four rules spec 0008 gives it (G1–G3)」。still present。
- Evidence: RT:117–120。
- Impact: 引用過時：每道題的規則集合現在由 D58 決定。
- Suggested fix: 改成「the four rules D58 gives it」。

#### SPEC-S-D4d-6 · low · confidence high · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:996`
- Requirement: S56；isChallengeNumber 是決定是否顯示控制項的謂詞
- Summary: （4d）NUMBERED 用的是 `typeof number === 'number'`，沒有用 isChallengeNumber。still present。
- Evidence: site-smoke.spec.ts:994–997。
- Impact: 宣告了 0、1.5 這類無效 number 時，期望的數量會算錯；不過這種樹的 build 本來就會失敗。
- Suggested fix: 改用 isChallengeNumber。

#### SPEC-S-D4d-7 · low · confidence medium · deferred-p2-regraded

- Where: `tests/site-smoke/site-smoke.spec.ts:1036`
- Requirement: D124（upstream-only 的列要經過同一個 helper）；B93
- Summary: （4d）既有的 S08 案例用 realUpstreamDecision 加上自己的 reason 字串跳過，沒有經過 upstreamOnlySkipReason。still present（這部分屬於 area B／B93）。
- Evidence: site-smoke.spec.ts:1036 `test.skip(!realUpstreamDecision(process.cwd()), 'not upstream: …')`。
- Impact: 跳過的理由不是由統一的 helper 產生，與 D124「one helper」不一致。
- Suggested fix: 改用 `test.skip(...upstreamOnlySkipReason(...))`。

#### SPEC-S-D6-1 · low · confidence high · deferred-p2-regraded

- Where: `tests/pre-commit-sh.test.ts:746`
- Requirement: S40「ignored dir not named by W4」
- Summary: （6）H20 與 0008 G3 都沒有強制觸發 W3，所以 `not.toContain('logs')` 這個斷言不可能失敗。still present；同一個行為由 H10／S47（930–955，強制 W3 加上被忽略的 logs）守住。
- Evidence: PC:721–748 只有 expectNoW3W4，沒有手改 _redirects；PC:935 與 955 在 W3 觸發下斷言 not.toContain('logs')。
- Impact: 只是 S40 本格的測試強度不足，行為另有覆蓋。
- Suggested fix: 在 H20 加一個手改 _redirects 的動作來強制 W3。

#### SPEC-S-D6-2 · low · confidence high · deferred-p2-regraded

- Where: `tests/pre-commit-sh.test.ts:340`
- Requirement: S36 Boundary「both fixtures」
- Summary: （6）保留下來的 O1 案例（H06：README.md、platform/public/other.txt）只在 en fixture 上跑。still present。
- Evidence: PC:340–364 沒有 useFixture 或 describe.each；S80（389–410）也只用預設 fixture。
- Impact: O1 在 bash 預篩那一步就結束、不讀 P，所以風險低。
- Suggested fix: 把 H06 包進 `describe.each(['en','zh-TW'])`。

#### SPEC-S-D6-3 · low · confidence high · deferred-p2-regraded

- Where: `tests/pre-commit-sh.test.ts:1489`
- Requirement: S43「O4 with W5」（拒絕的是 generator，不是 validator）
- Summary: （6）S43 沒有斷言 `--staged` 有被呼叫、validator 沒有被呼叫，因此分不出 O4 和 O3。still present。
- Evidence: PC:1489–1500 只檢查 status、PL 行與 expectNothingChanged；S76 (c)（1568）才檢查反方向的「no --staged」。
- Impact: hook 如果改成由 validation 先拒絕，這個測試仍然會通過。
- Suggested fix: 加上 generatorLog，斷言有一次 `--staged`，validator 的 log 為空。

#### SPEC-S-D6-4 · low · confidence medium · deferred-p2-regraded

- Where: `.proj.specs/0010-primary-locale-layout/traceability.md:1722`
- Requirement: Overridden contracts › Area S「Each changes only as stated」
- Summary: （6）幾個「validator never runs」斷言（H02/H14、H41、K-17、H13）被刪除，而不是反轉成相反的斷言。still present；不過 traceability:1722（validator 也會收到各語系的說明頁路徑，Y88–Y90）和 1744（Y90 跟著 hook 一起負責）在概括層級涵蓋了這個改變，只是沒有逐格點名。
- Evidence: PC 的 expectH02H14（476–496）已經沒有 `readRecord(log)` 的斷言；S37（366–387）補上了正向的「說明頁路徑進入 argv」。
- Impact: 文件追溯上的小缺口，覆蓋本身沒有流失。
- Suggested fix: 在 Area S 的 Orphan 列或 validator 列補上這四格的名字。

#### SPEC-S-D6-5 · low · confidence high · deferred-p2-regraded

- Where: `tests/pre-commit-sh.test.ts:1188`
- Requirement: S44（H21-commit-a）
- Summary: （6）H21-commit-a 已經不能證明 brief check 讀的是 git 交給 hook 的 index.lock，只證明了 validator 讀了 lock。still present；這和核准的 S44 做法一致，lock 上的生成由 commit -a/-i/-p 的案例覆蓋。
- Evidence: PC:1192–1206：fault 已經以 --no-verify 進了 HEAD，所以 .git/index 和 lock 裡都有它，只多斷言了 `readRecord(validator)…toContain(path)`。
- Impact: 只是測試強度不足。
- Suggested fix: 另加一個「fault 只存在於 lock」的案例，但依 D121 這種情況會先被 validator 擋下，所以可以接受現狀。

#### SPEC-S-D6-6 · low · confidence high · deferred-p2-regraded

- Where: `tests/pre-commit-sh.test.ts:2512`
- Requirement: D54 風格（由 LOCALES 推導）
- Summary: （6）O5 表把 TREES 寫死成三個路徑，沒有從 LOCALES 推導。still present。
- Evidence: PC:2512 `const TREES = 'platform/challenge/ platform/en/challenge/ platform/zh-TW/challenge/'`。
- Impact: 日後加入新語系時，wrapper 會比對不到而大聲失敗；只是維護成本。
- Suggested fix: 改用 `['platform/challenge/', ...LOCALES.map(l => `platform/${l}/challenge/`)].join(' ')`。

#### SPEC-S-D6-7 · low · confidence high · deferred-p2-regraded

- Where: `tests/pre-commit-sh.test.ts:1272`
- Requirement: 測試標題正確性
- Summary: （6）測試標題還說要防 bash 3.2 `set -u` 下空陣列展開，但相關的 bash 陣列已經刪除。still present。
- Evidence: PC:1272 的標題「(an empty list is not expanded under bash 3.2 set -u)」與 1288 的 `not.toContain('unbound variable')`；pre-commit.sh 已經沒有 EN_SLUGS／ORPHANS（diff 第 179–204 行）。
- Impact: 純標題與理由過時。
- Suggested fix: 刪掉括號裡的說明，或改寫成目前的理由。

#### SPEC-S-D6-8 · low · confidence medium · deferred-p2-regraded

- Where: `scripts/pre-commit.sh:527`
- Requirement: AC-31／0007 O 規則（失敗時 nothing changed）
- Summary: （6）W4 措詞的呼叫（`--describe-untracked`）如果失敗，set -e 會在 _redirects 已經寫入並 stage 之後讓 hook 失敗。still present。
- Evidence: pre-commit.sh:516–517 先 `git add -- "$REDIRECTS"` 再設 `STAGED=true`，527 行才呼叫 node；finish（342–344）只有在 STAGED=false 時才還原 _redirects。
- Impact: 機率低（P 在 `--staged` 已經讀成功過），但這一步只是印訊息，卻可能讓 O2 變成一次失敗的 commit，而且自己的 index 留下新的 _redirects。
- Suggested fix: `node … --describe-untracked … >&2 || true`，或把錯誤吞掉並印一行提示。

### Spec · Y (66 findings: 0 high, 4 medium, 62 low)

Coverage: 完整讀過（HEAD 的實際檔案）：scripts/challenge-keygen.ts（第 1–40、270–330、400–440、580–844 行）、scripts/challenge-validate.ts、scripts/challenge-lint-staged.ts、scripts/challenge-analyze.ts、scripts/challenge-retype.ts、scripts/create-challenge.ts、.vitepress/challenge/{config,declaration,plugin,slug}.ts、scripts/challenge-verify.ts 的 L1／L2 runner（第 265–344 行）、scripts/wxl-solver/build-player-package.ts（第 60–115 行）、.vitepress/primary-locale.ts（第 60–90 行）、tests/unit/challenge/declaration.test.ts、tests/unit/challenge/slug.test.ts、tests/unit/scripts/challenge-keygen.test.ts（第 1180–1760 行）。
完整讀過（diff 檔）：.claude/skills/wxl-create/SKILL.md、SKILL.zhTW.md、reference/agent-tools.md、CONTRIBUTE.md、docs/agents/challenge-pipeline.md、traceability.md 的 diff、platform/challenge/door-is-open／selected-excerpts 的 challenge.yaml。
抽樣：tests/challenge-validate.test.ts（第 200–680、880–890、1045–1051 行）；tests/unit/challenge/config.test.ts（第 266–365 行，以及 describe 清單）；plugin.test.ts（只看列 id）；challenge-retype-metadata.test.ts（第 20–100 行）；create-challenge-run.test.ts 與 create-challenge.test.ts（只 grep 列 id 與延後項的行號）；wxl-mutate／wxl-verify 的 SKILL（兩個 tree 都用 grep，wxl-mutate 讀了第 40–64 行）；.vitepress/config.mts 的 transformPageData。
spec／traceability：讀了 spec.en.md 第 280–399、630–720 行（AC-35–AC-43）；traceability 的 D74–D90、D117、D133、D145–D150、VM／KG／RT 訊息表、Overridden contracts › Area Y（1726–1755）、Y1–Y113 各列（2240–2432）、Y-O1–Y-O12。
票：Acceptance criteria 的 area Y（125–164 行）、test plan 的 Y 列（3580–3630，用 grep）、Comments 2486–2559（5c 的決定與 segment 5c）、3060–3108（使用者當面確認、8b）。
延後 P2：讀了 deferred-p2-by-segment.json 第 1–1043 行，涵蓋 5c-pre、5a、5b、5c、5d、5e、5f、5g 的所有項目，逐項對照 HEAD 重新評等。
沒有讀到：tests/challenge-lint-staged.test.ts、tests/challenge-analyze.test.ts、tests/unit/challenge/plugin.test.ts、challenge-retype-{errors,cross-family,same-family,spec-sync}.test.ts、challenge-verify-{L1,L2,blind-*}.test.ts、build-player-package.test.ts 的內容（只透過延後項的描述和 grep 間接參照）；.agents/skills/wxl-create 的 diff（只 grep 確認 Step 6 那句也在）；README.md／README.en.md（Y97 屬於文件區，沒有細讀）；platform/challenge/just-a-preview、staff-only 的 challenge.yaml diff；pre-commit.sh 與 Y90 的 hook 部分（屬 area S）；GLOSSARY（Y78 的新造詞檢查沒有做）。

Missing context: 沒有 diff 指令可用，所以沒有實際比對 `.claude/skills/wxl-*` 和 `.agents/skills/wxl-*` 兩份之間是否完全相同（Y94–Y96、D135、PAT6 要求一致）；只用 grep 抽樣確認關鍵句兩邊都有。; 沒有執行測試，也無法執行 node：SPEC-Y-14（yaml toString 會把 `tags: [a, b]` 正規化成 `[ a, b ]`）和 SPEC-Y-12（analyze 遇到 unset anchor 時 toJS 會丟例外）是依 yaml v2 的預設行為和 declaration.ts 的註解推論，沒有實際跑過。; Y78 要求 stage 6 確認 zh-TW 的 scaffold body「TODO：在這裡寫說明頁內文。」裡沒有任何詞是 GLOSSARY 標成 `_新造詞_` 的詞；這次沒有讀 GLOSSARY.md，所以沒做這項檢查。

#### SPEC-Y-07 · medium · confidence high · missing-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.claude/skills/wxl-verify/SKILL.md:80`
- Requirement: D87（traceability.md:146）：「Stated in CONTRIBUTE, wxl-create Step 6 and wxl-verify」；AC-43
- Summary: D87 要求 wxl-verify 寫明「改 challenge.yaml 後要重啟 pnpm dev」，但兩個 tree 的 wxl-verify 都沒有這句話。修正迴圈 Step 2 會指示 agent 用 Edit 改 `challenge.yaml`，之後卻沒提醒要重啟。
- Evidence: wxl-verify SKILL.md:80「Missing/invalid declaration keys → add/correct in `challenge.yaml` via Edit」；在 .claude/skills/wxl-verify 與 .agents/skills/wxl-verify 搜尋 `pnpm dev|restart` 都沒有結果；只有 wxl-create SKILL.md:175 有這句。
- Impact: wxl-verify 的修正迴圈改了 challenge.yaml 之後，如果是在執行中的 dev server 上驗證，挑戰頁會繼續用舊的宣告和舊的 runtime.wasm（N18／Y101），造成誤判。
- Suggested fix: 在兩個 tree 的 wxl-verify Step 2（修正 challenge.yaml 那一行）補上：改過 `challenge.yaml` 後要重啟 `pnpm dev`（它會重跑 keygen）。

#### SPEC-Y-R5a-1 · medium · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-validate.ts:168`
- Requirement: D86「validates the declaration once and every brief that exists」；Y24「the declaration check still runs and reports separately」
- Summary: Still present。宣告讀取失敗或 validateChallengeDeclaration 丟錯時（VM2–VM5、VM12、缺必填欄位），validateChallenge 會立刻 return，brief 檢查（VM6–VM10）完全不跑。spec 只有 VM1 這一種（Y2）明定「no other check runs」。
- Evidence: challenge-validate.ts:168–171 `if (!declaration.ok) { checks.push(...); return { slug, checks, allPassed: false } }`；:176–178 也一樣。
- Impact: 老師要先修好宣告，才會看到 brief 的錯誤，要多來回幾次；lint-staged 和 verify L1 都承襲這個行為。和 D86 的字面不一致，所以我把等級從 P2 提高到 medium。
- Suggested fix: VM1 以外的宣告失敗仍繼續跑 brief 與 structure 檢查（其他依賴宣告值的檢查可以跳過），或在 spec 明訂宣告失敗時 brief 不檢查。

#### SPEC-Y-R5c-1 · medium · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:1265`
- Requirement: Y59（abort 時兩個檔案都不變）；5c 延後項（1265 與 1270 兩條重複，已合併）
- Summary: Still present。door-is-open 的宣告已經有 wasmModule 而且沒有 legacy key，所以照 D80 (a) 寫回時位元組相同、不會寫檔。把宣告寫入移到 integrity check 之前，bytes 和 mtime 都不會變，Y59 測不出來。1265–1269 行的註解還聲稱 mtime 比對能抓到這種情況。
- Evidence: test:1265–1269「The challenge.yaml check compares mtimes … a content comparison could not tell "not written" from "written unchanged"」；keygen.ts:762 `if (next !== raw)`；票 2522–2526 行記錄這個 mutation 測不出來。
- Impact: Y59 守的是「寫入要在檢查之後」，正好是 D80 (b) 調整寫入順序時最容易改壞的地方，而這項保護現在失效。因此提高為 medium。
- Suggested fix: 另外加一個寫回時位元組會改變的 fixture（例如帶一個 legacy key，或還沒有 wasmModule），並修正註解。

#### SPEC-Y-R5c-2 · medium · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-keygen.ts:600`
- Requirement: AC-39、Y52–Y61 都沒有定義；對照 D56／Y41（loader 和 build 對同一個輸入以 PL-E14 失敗）、VM2–VM4；5c 延後項（兩條重複，已合併）
- Summary: Still present。readChallengeDeclaration 拒絕的宣告（invalid-yaml、multi-document、not-a-mapping）會被 keygen 以 `[skip] <slug>: declaration unreadable (<reason>)` 跳過，結束碼是 0；legacy 警告迴圈也直接 `continue`。沒有任何列或測試定義這種情況。
- Evidence: keygen.ts:600 `if (!declaration.ok) { console.warn(`[skip] ${slug}: declaration unreadable (${declaration.reason})`); return }`；:827 `if (!declaration.ok) continue`。D56 規定 loader 遇到同樣情況要以 PL-E13／PL-E14 失敗。
- Impact: `pnpm build` 最後還是會在 VitePress 階段以 PL-E14 失敗，但 keygen 回報成功。單獨跑 keygen 或 verify L2 時（L2 只看 keygen 的結束碼和 runtime.wasm 是否存在），如果 analyze 沒先擋下來（例如 `!!timestamp`，見 SPEC-Y-13），既有的舊 runtime.wasm 會讓 L2 判定通過。各工具對同一個壞檔的反應不一致。
- Suggested fix: 讓 keygen 對讀不了的宣告以非 0 結束碼結束，並印出 PL-E14 同款訊息；在 traceability 補一列（keygen × invalid declaration）和對應的測試。

#### SPEC-Y-01 · low · confidence high · spec-inconsistency

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0010-primary-locale-layout/traceability.md:139`
- Requirement: D80 (b)（traceability.md:139）與 D133（:192）；票 Comments 2026-11-17 parent 對 5c 的決定
- Summary: D80 (b) 寫明收斂手段由實作在「write order or the module's mtime」兩者中挑選，但實際採用的手段多了一項：只在 staged template 缺少、比 wasm-pack 輸出舊或 `--force` 時才重新 staging。這項決定和它的已知代價（只升級 wasm-tools／wasm-opt 時不會重做 template）只記在票裡，spec 與 traceability 都沒有修訂。
- Evidence: traceability.md:139 寫「(the implementation picks the means: write order or the module's mtime)」；scripts/challenge-keygen.ts:813 `if (force || isOutputStale(preparedTemplatePath, [templateWasmPath])) { prepareTemplateWasm(...) }`；票 2486–2510 行記錄「Known cost, recorded for stage 6 … after upgrading only `wasm-tools` or `wasm-opt`, the staged template is not redone」。traceability diff 的 Revision 2.3 只新增 D148–D150，沒有收錄這項。
- Impact: spec 是單一真相來源，卻沒記到 keygen 何時重做 template 的規則與代價。之後的 ticket 或 range 維護者看 spec 會以為每次執行都會重新 staging，不知道升級 wasm 工具鏈後要跑 `--force` 或 `pnpm wasm:build`。
- Suggested fix: 在 traceability 新增一個 revision（或補進 D80/D133 的註記），寫下 staged template 的重新 staging 條件、已知代價，以及使用者 2026-11-17 當面確認的紀錄。

#### SPEC-Y-02 · low · confidence medium · spec-inconsistency

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md:2490`
- Requirement: D133（traceability.md:192）：「the ticket stops before Y58's test is written and the user chooses another means or drops (b)」
- Summary: 依 D133，量測顯示單靠 write order 收斂不了時，票要先停下、由使用者選擇手段，之後才能寫 Y58 的測試。實際上是 parent 依常設授權先做決定，segment 5c 接著就寫了 Y58，使用者當面確認排在 Comments 更後面。此外 parent 一方面說這個手段「inside D80 (b)」，一方面又援引 D133，兩種說法互相矛盾。
- Evidence: 票 2490 行：「D133 says the user chooses … so the parent decides as the planner recommends」；2505 行：「Why the parent reads this as inside D80 (b)」；2537 行 segment 5c 寫了 Y58（red → green）；3076–3083 行才記錄使用者「兩件事都同意，繼續」，並說「so D133's "the user chooses" is met in person」。
- Impact: 結果已由使用者追認，所以實質風險低。但 D133 要求的順序（先停、使用者選、再寫測試）沒有照做，而且「屬於 D80 (b) 範圍內」與「需要 D133」不能同時成立，證據鏈不一致。
- Suggested fix: 在票或 traceability 補一句說明：這次屬於 D133 情境，Y58 在使用者當面確認前已依常設授權寫好，事後已追認；同時刪掉或改寫「inside D80 (b)」這種與 D133 衝突的說法。

#### SPEC-Y-03 · low · confidence high · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-keygen.ts:813`
- Requirement: D80 (b)「a keygen run right after a run that rebuilt a challenge … reports [skip] for it」
- Summary: `pnpm challenge:keygen --force <slug>` 只要重建一道題目，也會重新 staging 共用的 template（mtime 更新），結果下一次不帶 --force 的執行會把其他每一道題目都判成 [stale] 並重建。
- Evidence: challenge-keygen.ts:813 `if (force || isOutputStale(...)) prepareTemplateWasm(...)` 不看有沒有指定 slug；prepareTemplateWasm（:420、:424）一律重寫輸出檔；getTrackedInputPaths（:296）把 staged template 列為每道題目的 tracked input。CONTRIBUTE.md 與 Y59 的測試都用 `--force <slug>`。
- Impact: D80 (b) 字面上對「被重建的那一題」成立，但對其他題目會多做一輪完整重建（pnpm dev／build 變慢），和 D80 (b) 要的收斂直覺不同。不影響正確性。
- Suggested fix: `--force <slug>` 時不重新 staging template（或只在 template 確實過期時才做），或在 CONTRIBUTE 註明這個副作用。

#### SPEC-Y-04 · low · confidence medium · missing-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/CONTRIBUTE.md:244`
- Requirement: Y98（keygen skip note）；票 2507 行記下的 known cost
- Summary: CONTRIBUTE 的 keygen skip note 只寫「有 wasmModule 而且 runtime.wasm 存在就 skip」，沒有提到 tracked input 的 mtime 判斷，也沒提到新的 template 重新 staging 條件。只升級 wasm-tools／wasm-opt 時要跑 `--force`（或 `pnpm wasm:build`）這件事，沒有任何文件寫給老師看。
- Evidence: CONTRIBUTE.md diff：「> **Skip behavior**: if `challenge.yaml` already has `wasmModule` and the corresponding `runtime.wasm` file exists, the script skips that challenge. …」；票 2507–2508 行的 Known cost 只寫在票裡。
- Impact: 維護者升級 wasm 工具後跑 `pnpm challenge:keygen`，會得到沿用舊 template 的模組，而且沒有任何提示。
- Suggested fix: 在 CONTRIBUTE 的 skip note 補上：template 只在缺少、比 wasm-pack 輸出舊或 `--force` 時重新 staging；升級 wasm-tools／wasm-opt 後要跑 `--force`。

#### SPEC-Y-05 · low · confidence high · spec-inconsistency

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0010-primary-locale-layout/traceability.md:2359`
- Requirement: Y60 vs D19／B38（traceability.md:78、:1922）與 D81
- Summary: Y60 寫的是旁邊有 flat `platform/challenge/<slug>.md` 時 keygen「ignored / not processed」，但 D19／B38 要求 keygen 先跑 layout check，flat .md 是 legacy-layout 頁面，所以整個執行會以 PL-E08 結束。票的 Y-q4 已發現這個矛盾，測試也照 PL-E08 改寫了，但 traceability 的 Y60 列沒有修訂。
- Evidence: traceability.md:2359 Y60「ignored | not processed; no "legacy flat file structure" warning」；票 3630 行「a flat `.md` is a legacy-layout page, so the run exits PL-E08 first; the case must state which (Y-q4)」；tests/unit/scripts/challenge-keygen.test.ts:1576 測的是 exit 非 0 加 PL-E08。
- Impact: spec 與實作／測試對同一個輸入描述不同結果，下一個讀 Y60 的人會誤以為 keygen 照常處理其他題目。
- Suggested fix: 修訂 Y60：命令層級因 D19 以 PL-E08 結束；「不處理、不警告」只在函式層級（keygenSlugs）成立。

#### SPEC-Y-06 · low · confidence high · spec-inconsistency

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0010-primary-locale-layout/traceability.md:2399`
- Requirement: Y82 vs D82／Y105（traceability.md:141、:2390）
- Summary: Y82 寫的是有 flat `platform/challenge/<slug>.md` 時 create:challenge「proceeds」，但 D82／Y105 規定 create:challenge 先跑 layout check，flat .md 是 legacy-layout 頁面，所以會以 status 1、PL-E08 拒絕。D149 已把 C05 改成 PL-E08，Y82 的文字卻沒有跟著改。
- Evidence: traceability.md:2399「no collision; a flat `platform/challenge/<slug>.md` exists | not a collision | proceeds」；create-challenge.ts:348–356 先 checkSourceLayout；D149 寫「C05 (a flat `legacy.md` stops at PL-E08, D82)」；tests/unit/scripts/create-challenge.test.ts:114 只在函式層級測 checkCollision。
- Impact: Y82 的「proceeds」在命令層級是錯的，與 Y105／C05 互相矛盾。
- Suggested fix: 把 Y82 改成：checkCollision 不把 flat .md 當碰撞；命令本身會因 Y105 以 PL-E08 拒絕。

#### SPEC-Y-08 · low · confidence high · spec-inconsistency

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0010-primary-locale-layout/traceability.md:2426`
- Requirement: D87 vs Y96
- Summary: D87 說 dev-server 重啟規則要寫在 CONTRIBUTE、wxl-create Step 6 和 wxl-verify，但 Y96（wxl-verify 的列）只要求 L1 的用詞與 fix line，沒有要求重啟句。實作跟著 Y96 走，所以 D87 的 wxl-verify 部分沒有任何列能驗收。
- Evidence: traceability.md:146 D87「Stated in CONTRIBUTE, wxl-create Step 6 and wxl-verify」；:2426 Y96 只寫「L1 "declaration / brief / structure lint" … fix line …」。
- Impact: D-number 與追溯列不同步，D87 的一部分永遠驗收不到（這正是 SPEC-Y-07 漏掉的原因）。
- Suggested fix: 在 Y96 補上「states the D87 restart rule」，或修訂 D87 拿掉 wxl-verify。

#### SPEC-Y-09 · low · confidence high · partial-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:597`
- Requirement: traceability.md:2258「Every validate row is checked for P = zh-TW and P = en unless it says one」；Y25（"same as Y24"：primary, then translation）、Y26–Y29
- Summary: Y25–Y29 的 brief 檢查只在 P = zh-TW（沒有 range.json）而且只對主語系 brief 測；P = en 和翻譯 brief 都沒測。只有 Y24 用了 P_CASES 和 primary/translation 兩種位置。票的 test plan（3592–3596 行）也沒有寫「P both」。
- Evidence: challenge-validate.test.ts:601 `writeBothBriefs(undefined, 'zh-TW', briefWith([line]))`；:622、:638、:650、:662、:671 都是 `undefined, 'zh-TW'`；Y24 在 :574 才用 `for (const [pName, rangeJson, primary] of P_CASES)`。
- Impact: brief 檢查的程式碼和語系無關，所以實際風險小。但這幾列只在一個主語系下驗收，不符合 area Y 前言的要求。如果日後 checkBrief 依語系分流（例如 rel 路徑），P = en 或翻譯 brief 的錯誤不會被抓到。
- Suggested fix: 把 Y25–Y29 也改用 P_CASES ×（primary, translation），或在 test plan 與 traceability 明確註記這幾列只測一個 P 的理由。

#### SPEC-Y-10 · low · confidence medium · partial-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:345`
- Requirement: traceability.md:2258（every validate row × both P）；Y3–Y6、Y9、Y12–Y14、Y20、Y103、Y104 的 validate half
- Summary: 宣告檔相關的 validate 列（VM2–VM5、VM12、number、structure、legacy 欄位）都只在預設 P（沒有 range.json）下測，沒有 P = en 的 case。
- Evidence: challenge-validate.test.ts:351、:365、:379、:409、:421、:429、:452、:482、:511、:526 的 writeTree 都沒帶 rangeJson；只有 Y2（:390）和 Y30（:285）有兩種 P。
- Impact: 宣告檢查和 P 無關，所以實際風險低；但字面上沒滿足前言「每列都測兩種 P」的規定。
- Suggested fix: 在 traceability 註明哪些列與 P 無關、可以只測一種 P，或把這些 case 參數化成兩種 P。

#### SPEC-Y-11 · low · confidence medium · partial-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:731`
- Requirement: Y19「no 0010-S34–0010-S41 output mentions them」
- Summary: Y19 要求 S34–S41（validate、analyze、keygen、retype、create、verify、lint-staged、L4）的輸出都不提到未知鍵 `id`／`commands`／`author`，但只有 validate（S34）有測。票的 test plan 3584 行也把範圍縮成 validate。
- Evidence: tests 中 Y19 只出現在 challenge-validate.test.ts:730、config.test.ts:332、plugin.test.ts:177；analyze、keygen、lint-staged、verify、L4 的測試都沒有 Y19 case。
- Impact: 例如 analyze 的 warning 或 L4 package 如果把未知鍵輸出出來，不會有測試發現。
- Suggested fix: 至少補 analyze（formatAnalysis）、keygen 輸出和 L4 package 的 Y19 case，或在 traceability 把 Y19 的驗收範圍正式縮到 S34。

#### SPEC-Y-12 · low · confidence medium · incorrect

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-analyze.ts:118`
- Requirement: Y68「`challenge.yaml` … invalid → `Invalid YAML in challenge.yaml: <message>`」；D129
- Summary: analyze 的 readDeclaration 用預設的 `parseDocument(raw)`，只看 `doc.errors`，接著直接呼叫 `doc.toJS()` 而沒有 try。宣告裡有 anchor 沒定義的 alias（`x: *nowhere`），或 alias 展開超過上限時，toJS 會丟例外，main 只會印出 stack trace，不會回報 Y68 的 `Invalid YAML in challenge.yaml: …`。
- Evidence: challenge-analyze.ts:118–122 `const doc = parseDocument(raw); if (doc.errors.length > 0) {...}; return { value: doc.toJS() }`；declaration.ts:83–89 的註解說明這兩種情況是 toJS 丟出的 ReferenceError，不在 doc.errors 裡；main 在 :445 `catch((err) => { console.error(err); process.exit(1) })`。
- Impact: `pnpm challenge:analyze` 遇到這兩種 D129 輸入時會丟出未處理的例外，不會給出 Y68 規定的訊息；verify 的 L2 runner 也可能因此直接丟例外。
- Suggested fix: 讓 analyze 改用 readChallengeDeclaration（或同一組 options 加上 try/catch），把 invalid-yaml 轉成 Y68 的訊息。

#### SPEC-Y-13 · low · confidence medium · incorrect

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-analyze.ts:118`
- Requirement: D79「One parser」、D129／D146（spec.en.md:332–335：explicit YAML 1.1 tag 是 invalid YAML）
- Summary: analyze 解析 challenge.yaml 時沒有傳 `resolveKnownTags: false`、`uniqueKeys`、`merge: false`，也不檢查 warnings 和非 scalar 的 key，所以 validate／build 判為 invalid 的宣告（例如 `!!timestamp`、`!!set`、非 scalar key），analyze 會當成有效，甚至解出 Date 或 Set。
- Evidence: challenge-analyze.ts:118 `parseDocument(raw)`（預設 options）；同一個 repo 裡 declaration.ts:71–81 與 challenge-validate.ts:72 都用 `{ schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false }` 並檢查 warnings。
- Impact: 兩個工具對同一個檔案判斷不同；verify L2 先跑 analyze，可能對 L1 已拒絕的檔案給出不一致的結果。因為 lint-staged 和 verify 都先跑 validate，影響有限。
- Suggested fix: analyze 改用 readChallengeDeclaration，讓所有工具共用一個 parser。

#### SPEC-Y-14 · low · confidence medium · partial-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:1451`
- Requirement: Y54「every other line unchanged」；D80 (a)、R15
- Summary: keygen 寫回時是 `parseDocument(raw).toString({ lineWidth: 0 })`，所以不是 yaml 標準格式的行會被改寫（例如 `tags: [a, b]` 會變成 `tags: [ a, b ]`）。Y54 的測試刻意先確認 fixture 已經是 fixed point，因此測不到「其他行不變」在一般輸入下會失敗。
- Evidence: keygen.ts:761 `const next = doc.toString({ lineWidth: 0 })`；test:1449–1451 `expect(parseDocument(declaration).toString({ lineWidth: 0 })).toBe(declaration)`（「The fixture must itself be a fixed point」）；D95 的搬家會照原始位元組搬移老師的 frontmatter 行，所以搬完的 challenge.yaml 不一定是標準格式。
- Impact: 老師搬家後第一次 build 時，keygen 可能改寫 challenge.yaml 裡 wasmModule 以外的行，讓工作樹多出非預期的 diff；這不符合 Y54 字面上的「every other line unchanged」。上游四個檔案是標準格式，所以不受影響。
- Suggested fix: 在 Y54 加一個非標準格式行的 case，確認期望行為（接受正規化就修訂 Y54；不接受就改成只插入或修改 wasmModule 那一行）。

#### SPEC-Y-15 · low · confidence high · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.vitepress/challenge/declaration.ts:5`
- Requirement: D146、D149（YAML 1.1 tag 現在是 invalid-yaml）
- Summary: 檔頭註解還寫著 YAML 1.1 tag「resolves to the plain scalar/mapping the core schema would otherwise give it, and a `!!merge` key is kept unmerged」，這是 T-0076 的行為；現在 reader 對這些輸入回傳 invalid-yaml，註解與實作相反。同一段 10–15 行的說明才是正確的。
- Evidence: declaration.ts:5–9「D147: … an explicit YAML 1.1 tag … never resolves to a `Date` … it resolves to the plain scalar/mapping the core schema would otherwise give it」；:76–78 `if (doc.errors.length > 0 || doc.warnings.length > 0) return { ok: false, reason: 'invalid-yaml' }`；declaration.test.ts:297–331 斷言這四種都是 invalid-yaml。
- Impact: 讀程式碼的人會被誤導，以為這些 tag 會被接受。
- Suggested fix: 改寫 5–9 行，說明 D146／D149 之後這些 tag 會讓解析失敗（invalid-yaml）。

#### SPEC-Y-16 · low · confidence high · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/challenge/declaration.test.ts:229`
- Requirement: D149（Overridden contracts：這兩個 describe 改成 invalid-yaml 結果）
- Summary: describe 標題「D145: a mapping key that is not a scalar throws」還寫著 throws，但裡面每個 case 斷言的都是 `{ ok: false, reason: 'invalid-yaml' }`；「D147: the site parser resolves no YAML 1.1 tag」的標題也和現在斷言的 invalid-yaml 不一致。
- Evidence: declaration.test.ts:229 `describe('D145: a mapping key that is not a scalar throws …')`，:238–239 `expect(result.ok).toBe(false) … 'invalid-yaml'`；:276 `describe('D147: the site parser resolves no YAML 1.1 tag …')`。
- Impact: 測試報告的標題描述的是已被推翻的行為。
- Suggested fix: 把標題改成「returns invalid-yaml」之類，與 D149 一致。

#### SPEC-Y-17 · low · confidence high · partial-behaviour

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.vitepress/challenge/slug.ts:9`
- Requirement: Y49「the flat `<slug>.md` branch is gone」
- Summary: slugFromRelativePath 對舊的 flat 路徑 `challenge/<slug>.md` 會回傳 `'challenge'`，不是 undefined。測試只用沒有目錄的 `door-is-open.md`，所以測不到真實的 flat 路徑形狀。
- Evidence: slug.ts:8–9 `const parts = relativePath.replace(/\.md$/, '').split('/'); return parts.length >= 2 ? parts[parts.length - 2] : undefined` → `'challenge/door-is-open.md'` 得到 `'challenge'`；tests/unit/challenge/slug.test.ts:14–15 只測 `'door-is-open.md'`。
- Impact: build 會以 PL-E08／PL-E18 拒絕 flat 頁面，所以實際上很難走到；但函式對 flat 形狀給出錯誤的 slug，檔頭註解「derives no slug」也不成立。
- Suggested fix: 要求最後一段是 `index`，否則回傳 undefined；並在測試加上 `challenge/door-is-open.md` 的 case。

#### SPEC-Y-18 · low · confidence high · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-retype.ts:352`
- Requirement: Y62（named keys change; other lines byte-identical）、D90
- Summary: `retype --tags` 用 `doc.set('tags', args.tags)` 寫回，會把 flow 形式 `tags: [ a, b ]` 改成 block 形式（`tags:` 加上 `- a`），和 create:challenge、上游宣告、keygen 的格式都不一樣。
- Evidence: challenge-retype.ts:352 `doc.set('tags', args.tags)`；tests/unit/scripts/challenge-retype-metadata.test.ts:81 `expect(after).toMatch(/tags:\s*\n\s*-\s*sqli\n\s*-\s*flask/)`。
- Impact: 行為正確，但同一個 repo 的 challenge.yaml 會出現兩種 tags 格式，diff 也比較大。
- Suggested fix: 沿用原節點的 flow 樣式（例如新節點設 `flow = true`），或在 traceability 接受這個格式差異。

#### SPEC-Y-19 · low · confidence high · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/challenge/config.test.ts:291`
- Requirement: Y12「0010-S34 does not crash in the `backend` check」
- Summary: 「does not crash the backend check first」這個 case 用 `.not.toThrow(/backend must be one of/)`，丟出其他錯誤時照樣通過；而且它測的是 S31 函式，不是 Y12 指定的 S34。這一列真正的驗收在 challenge-validate.test.ts:350–355。
- Evidence: config.test.ts:292 `expect(() => validateChallengeDeclaration({ backend: 'flask', app: 3 })).not.toThrow(/backend must be one of/)`。
- Impact: 這個 case 幾乎不可能失敗，標題卻讓人以為它在把關。
- Suggested fix: 刪掉這個 case，或改成斷言丟出的正好是 VM12。

#### SPEC-Y-20 · low · confidence medium · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.vitepress/challenge/plugin.ts:79`
- Requirement: Y-O12（processChallengeFrontmatter 與 detectLegacyFields kept, re-pointed）、D76
- Summary: detectLegacyFields 的訊息還寫著「found in frontmatter」，但 legacy 欄位現在在 challenge.yaml；而且 processChallengeFrontmatter 和 detectLegacyFields 在 .vitepress、scripts、platform 裡都沒有 production 呼叫者，只剩測試在用。
- Evidence: plugin.ts:79 `deprecated field '${field}' found in frontmatter — this field is ignored and should be removed`；在 .vitepress/scripts/platform 搜尋只找到定義本身（plugin.ts:38、:75）。
- Impact: Y-O12 說要保留，所以不算違規；但文案和實際位置不符，兩個函式也是沒人用的程式碼。
- Suggested fix: 把文案改成 challenge.yaml；之後的 ticket 評估是否移除這兩個沒有呼叫者的函式。

#### SPEC-Y-21 · low · confidence medium · smell

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-keygen.ts:762`
- Requirement: Y59（abort 時 challenge.yaml 與 runtime.wasm 都不變）、D80 (b) 的寫入順序
- Summary: 為了收斂，宣告改成在 copyFileSync 之前寫入。integrity check 失敗時兩個檔案都不會動，但如果 mkdirSync 或 copyFileSync 失敗（例如 EACCES、磁碟滿），challenge.yaml 已經改寫，runtime.wasm 卻沒有更新。
- Evidence: keygen.ts:762 `if (next !== raw) writeFileSync(declarationPath, next, 'utf-8')` 之後才 :763 `mkdirSync` 和 :764 `copyFileSync(staged, outputPath)`。
- Impact: 下一次執行會因為 output 不存在或過期而重建，所以能自行修復；但中間這段時間宣告和模組不一致。發生機率低。
- Suggested fix: 可以接受；如果要更嚴謹，先把 runtime.wasm 寫到暫存檔，宣告寫入後再 rename。

#### SPEC-Y-R5a-2 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:1048`
- Requirement: Y34（only `src/README.md`: exit 0）
- Summary: Still present。只有 src/README.md 的情況只用帶 slug 的方式跑，沒跑不帶 slug（會經過全樹編號檢查）的版本。
- Evidence: test:1048–1051 `expect(run('door-is-open').status).toBe(0)`。
- Impact: 這一列已經涵蓋；只是少驗證不帶 slug 時 fixture 也能通過 collectChallengeNumbers。
- Suggested fix: 再加一個 `run()`（不帶 slug）的斷言。

#### SPEC-Y-R5a-3 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:887`
- Requirement: Y36、B38、Y34「first stderr line is the PL line」
- Summary: Still present。CLI case 設了 NODE_NO_WARNINGS=1，所以「stderr 第一行是 PL 行」這個斷言沒有涵蓋真實的 `pnpm challenge:validate`（Node 22 可能先印出 ExperimentalWarning）。lint-staged（challenge-lint-staged.test.ts:355）和 keygen（challenge-keygen.test.ts:1360）是同一個問題，分別在 SPEC-Y-R5b-6、SPEC-Y-R5c-4 列出。
- Evidence: test:887 `env: { ...process.env, NODE_NO_WARNINGS: '1' }`；package.json 的 challenge:validate 沒帶這個變數。
- Impact: 在 CI 的 Node 22 matrix 上，真實的第一行可能不是 PL 行，測試卻顯示通過。
- Suggested fix: 在 package.json 的指令加上 `--no-warnings`，或拿掉測試裡的 NODE_NO_WARNINGS，改成過濾 ExperimentalWarning 後再比對。

#### SPEC-Y-R5a-4 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-validate.ts:59`
- Requirement: VM14（沒有列涵蓋 CRLF）
- Summary: Still present（既有行為）。parseMd 只認 LF，用 CRLF 存檔的 brief 會得到 VM14「no YAML frontmatter found」，但 VitePress 可以正常 build 它。
- Evidence: challenge-validate.ts:59 `content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)`；challenge-analyze.ts:68 也一樣。
- Impact: 在 Windows 編輯的 brief 會被 validate 誤判；現在兩種語系的 brief 都受影響。
- Suggested fix: 正規式改成接受 `\r?\n`。

#### SPEC-Y-R5a-5 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0010-primary-locale-layout/traceability.md:1737`
- Requirement: Overridden contracts › Area Y（stage 6 要確認 diff 改到的每個測試都有列名）
- Summary: Still present。HEAD 的「fails when the number is not an integer greater than zero」測試已刪除，但 Overridden contracts 1737 行沒有列出它（D149 的補充也沒有）。
- Evidence: traceability.md:1737 只列出「fails when frontmatter is missing」「fails when required fields are missing」「fails when the frontmatter carries no number」等；Y13 的 `"7"` case（challenge-validate.test.ts:466）用更嚴格的方式取代了它。
- Impact: 覆蓋率沒有損失，只是記錄不完整。
- Suggested fix: 在 1737 行補上這個測試名稱，並註明由 Y13 取代。

#### SPEC-Y-R5a-6 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:514`
- Requirement: Y20（console.warn 從未帶 `fs` 被呼叫）
- Summary: Still present。warn 過濾用 `/fs/`，有大小寫之分，抓不到 `encryptedFs`、`flag_verifier` 這類訊息。
- Evidence: test:514 `warn.mock.calls.filter((args) => args.some((a) => /fs/.test(String(a))))`。
- Impact: 這一列字面上只要求 `fs`，所以列本身有涵蓋；對其他 legacy key 的 warning 沒有防護。
- Suggested fix: 改用 :504 的 `mentions` 正規式。

#### SPEC-Y-R5a-7 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-validate.ts:131`
- Requirement: VM15（`<path>: invalid YAML: <parser message>`）
- Summary: Still present。frontmatter 解析出來是 scalar 或 sequence 時，回報的是「invalid YAML: the frontmatter is not a mapping」，這不是 parser 的訊息，也沒有任何 VM 列或測試定義這種情況。
- Evidence: challenge-validate.ts:131–133。
- Impact: 結果仍然是失敗；只是訊息沒有 spec 依據。
- Suggested fix: 在 VM 表新增這種情況（或歸到 VM14），並補上測試。

#### SPEC-Y-R5a-8 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-validate.ts:355`
- Requirement: D86 discovery、VM13（dot-name 不列為 stray）
- Summary: Still present。discoverChallenges 會把 `platform/challenge/.tmp/` 這類以點開頭的目錄當成 slug，結果得到 VM1；VM13 卻刻意忽略 dot-name。
- Evidence: challenge-validate.ts:355–359 directoryNames 只過濾 isDirectory；keygen（keygenSlugs）和 analyze 也沒有過濾，但它們要求有 challenge.yaml。
- Impact: `.DS_Store` 是檔案所以不受影響；只有以點開頭的目錄會觸發，例如編輯器的暫存目錄。
- Suggested fix: 過濾以 `.` 開頭的名稱，與 VM13 一致。

#### SPEC-Y-R5a-9 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-validate.test.ts:318`
- Requirement: Y22（測試輸出要看得到列名）
- Summary: Still present。Y22 的 case 放在標題為「Y1 (validate half)」的 describe 裡，測試輸出看不到 Y22 這個列名。
- Evidence: test:306–326。
- Impact: 只影響命名與追溯。
- Suggested fix: 另外包一個 `describe('Y22 …')`，共用同一個 skipIf。

#### SPEC-Y-R5b-1 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-lint-staged.ts:106`
- Requirement: 5b 延後項（兩位 checker 重複回報，已合併）：analysis 步驟還用舊版面的 discover
- Summary: Fixed at scripts/challenge-lint-staged.ts:106。現在呼叫的是 `discoverChallenges(root, primary, slug)`，對應 challenge-analyze.ts:88 的新簽名，只認有 challenge.yaml 的目錄。
- Evidence: lint-staged.ts:106 `const challenges = discoverChallenges(root, primary, slug)`。
- Impact: 已修正；commit 時的分析警告會照常回報。
- Suggested fix: 無。

#### SPEC-Y-R5b-2 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-lint-staged.test.ts:164`
- Requirement: 5b 延後項（兩位 checker 重複回報，已合併）：in-process 的 readIndexPrimaryLocale 用測試行程自己的環境
- Summary: Still present。in-process 的 runLintStaged case 會呼叫 readIndexPrimaryLocale，而 git 是在 vitest 行程的環境下執行；如果繼承了 GIT_DIR 或 GIT_INDEX_FILE，就會讀到別的 index。
- Evidence: .vitepress/primary-locale.ts:77、:84 的 execFileSync 沒有傳 env；測試的 fixture 用 gitEnv()。
- Impact: 只有在 git hook 或 `rebase --exec` 底下跑 vitest 時才會發生；屬於強化建議。
- Suggested fix: in-process case 開始前清掉 process.env 裡的 GIT_* 變數，結束後再還原。

#### SPEC-Y-R5b-3 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.vitepress/primary-locale.ts:77`
- Requirement: D114、D122（只定義 no entry、mode、git show 失敗三種情況）
- Summary: Still present。`git ls-files` 本身失敗時（例如 root 不是 git repo）丟出的是一般 Error；lint-staged 的 main 只攔 SiteLayoutError，所以使用者會看到 stack trace，git 的 stderr 也會直接穿透出來。
- Evidence: primary-locale.ts:77 `execFileSync('git', ['ls-files', ...], { cwd: root, encoding: 'utf8' })` 沒有 try，也沒設 stdio；challenge-lint-staged.ts:136–140 只處理 SiteLayoutError。
- Impact: hook 永遠在 repo root 執行，所以很少發生。
- Suggested fix: 包成 PL-E02 或給一行明確的錯誤訊息。

#### SPEC-Y-R5b-4 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.vitepress/primary-locale.ts:80`
- Requirement: D114、D122
- Summary: Still present。`ls-files -s -- range.json` 也會比對到 `range.json/x`，而且衝突中的 index（stage 1–3）都會落到 PL-E02 "(unknown)"；working tree 的 reader 對同樣形狀給的是 PL-E01。
- Evidence: primary-locale.ts:80 只取第一行的 mode；:84 `git show :range.json` 失敗時丟 pl02(undefined)。
- Impact: 兩種情況仍然會被拒絕，只是錯誤碼不一致；沒有列定義這些情況。
- Suggested fix: 比對 entry 的路徑完全等於 `range.json` 而且 stage 為 0，其他情況各給對應的錯誤碼。

#### SPEC-Y-R5b-5 · low · confidence low · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-lint-staged.test.ts:312`
- Requirement: S43（failing read 以 stub 模擬）
- Summary: Still present。missing-blob 的 PL-E02 cell 依賴 `git update-index --cacheinfo` 接受一個不存在的 sha，只在本機 git 2.54 上確認過。
- Evidence: stageEntry 用 UNKNOWN_SHA 'deadbeef…'。
- Impact: 較舊或較嚴格的 git 可能在 fixture 階段就失敗，看起來像產品的錯誤。
- Suggested fix: 改用 stub，或在 fixture 失敗時明確 skip 並說明原因。

#### SPEC-Y-R5b-6 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/challenge-lint-staged.test.ts:355`
- Requirement: D114、D123（PL 行在 stderr 第一行）
- Summary: Still present。和 SPEC-Y-R5a-3 是同一類問題：命令 case 設了 NODE_NO_WARNINGS=1，但 scripts/pre-commit.sh 實際呼叫時沒帶這個變數。
- Evidence: test:355 `const env = { ...gitEnv(), NODE_NO_WARNINGS: '1' }`。
- Impact: Node 22 上真實 hook 的 stderr 第一行可能是 ExperimentalWarning。
- Suggested fix: 同 SPEC-Y-R5a-3。

#### SPEC-Y-R5c-3 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-keygen.ts:624`
- Requirement: 5c 延後項：拿掉 flat 分支後留下的裸 block
- Summary: Still present。processChallenge 裡還留著原本 `if … else` 拿掉後剩下的 `{ … }` block，現在只是多一層縮排。
- Evidence: keygen.ts:624–658。
- Impact: 只是程式風格。
- Suggested fix: 拿掉這層 block、取消縮排。

#### SPEC-Y-R5c-4 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:1360`
- Requirement: Y107、B38、Y60 (i)（PL 行在 stderr 第一行）
- Summary: Still present。和 SPEC-Y-R5a-3 是同一類問題：fixture-tree 的 CLI case 設了 NODE_NO_WARNINGS=1。
- Evidence: test:1360 `env: { ...process.env, NODE_NO_WARNINGS: '1' }`。
- Impact: 沒有涵蓋 Node 22 上真實的 `pnpm challenge:keygen`。
- Suggested fix: 同 SPEC-Y-R5a-3。

#### SPEC-Y-R5c-5 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:1424`
- Requirement: Y20（KG1 per key）
- Summary: Still present。標題寫「one exact warning」，但斷言只用 `toContain` 檢查那一行有出現，沒檢查只出現一次。
- Evidence: test:1429 `expect(r.output.split('\n')).toContain(...)`。
- Impact: 這一列本身有涵蓋；如果警告印了兩次，測試不會發現。
- Suggested fix: 改成計算符合的行數等於 1，或修改標題。

#### SPEC-Y-R5c-6 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-verify.ts:295`
- Requirement: 5c 延後項：verify L1 用舊的簽名呼叫 validateChallenge
- Summary: Fixed at scripts/challenge-verify.ts:295。L1 現在呼叫 `l1Validate(projectRoot, slug, read.primary)`，而且在 :289–294 先讀 range.json、再檢查 VF1。
- Evidence: challenge-verify.ts:288–298。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-Y-R5cpre-1 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:1257`
- Requirement: 5c-pre 延後項（兩位 checker 重複回報，已合併）
- Summary: Still present。Y59 的 afterEach 註解還寫著重新 key 是為了讓「the local tree」和「the author's door-is-open」保持正常，但重新 key 是在暫存複本上跑，下一行就把複本刪掉了。
- Evidence: test:1257–1261「Re-key the challenge with a real run so the local tree is left exactly as a normal keygen leaves it … leave the author's door-is-open unloadable」，接著是 `rmSync(repoRoot, …)`。
- Impact: 只是註解過時，不影響測試。
- Suggested fix: 改寫註解：在複本上重新 key 只是為了確認正常執行會成功（exit 0）。

#### SPEC-Y-R5cpre-2 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:936`
- Requirement: 5c-pre 延後項：隔離 case 的斷言 (c)
- Summary: Still present。隔離 case 的斷言 (c) 檢查的是 fixture 自己寫的路徑在 LIVE_ROOT 不存在，沒有直接證明 CLI 的寫入只發生在複本裡。
- Evidence: test:936 `expect(existsSync(resolve(LIVE_ROOT, 'platform', 'challenge', slug))).toBe(false)`；(a)(b) 只檢查 repoRoot 這個變數。
- Impact: 實際上 CLI 從自己的位置推出 root，所以隔離是成立的；只是測試力道不足。
- Suggested fix: 在 CLI 執行前後比對 live tree 的 `git status --porcelain --ignored`，或檢查 live runtime.wasm 的 mtime。

#### SPEC-Y-R5cpre-3 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:929`
- Requirement: 5c-pre 延後項：註解位置
- Summary: Still present。「The slug is asserted alongside the path …」這段註解屬於下一個測試，卻放在隔離 case 上方。
- Evidence: test:929–931 這段註解緊接著 `it('runs the CLI on a copy under os.tmpdir(), never in the live repository'`；它描述的是 :939 的 case。
- Impact: 只影響可讀性。
- Suggested fix: 把註解移到 :939 的 case 上方。

#### SPEC-Y-R5cpre-4 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-keygen.test.ts:849`
- Requirement: 5c-pre 延後項：copyRepoForKeygen 手選路徑
- Summary: Still present（強化建議，不算缺陷）。copyRepoForKeygen 只複製 package.json、scripts、.vitepress、platform、range.json，node_modules 用 link；copyToolingForKeygen（:1310）也一樣。
- Evidence: test:849 `for (const rel of ['package.json', 'scripts', '.vitepress', 'platform', 'range.json'])`。
- Impact: keygen 之後如果依賴其他頂層路徑，這些 CLI 測試會以難以理解的方式失敗。
- Suggested fix: 在 helper 加註解說明這份清單要跟著 keygen 的讀取路徑更新，或改成排除式複製。

#### SPEC-Y-R5d-1 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-retype-metadata.test.ts:84`
- Requirement: Y62（key order 不變）
- Summary: Still present。`--tags` 的 case 比對前把兩邊的 tags 行都濾掉，所以 tags 被搬到別的位置時抓不到；過濾式 `^\s+-\s` 也會把其他 block sequence 的行一起濾掉。
- Evidence: test:84–86 的 outsideTags。
- Impact: 另外三個 Y62 case 是整檔逐位元組比對，所以整體仍有涵蓋。
- Suggested fix: 改成整檔比對，期望值直接寫出 block 形式的 tags。

#### SPEC-Y-R5d-2 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-retype-spec-sync.test.ts:40`
- Requirement: /tdd 的 red 證據
- Summary: Not a defect in code（紀錄問題仍在）。Y64 重新指向 fixture 時，red 沒有逐檔記錄；事後的 mutation 證明這些測試能失敗。
- Evidence: 票 segment 5d 的表格第 4、5 列寫著「not individually captured」。
- Impact: 只是流程證據比較薄弱。
- Suggested fix: 無需改程式；必要時在票上補記 mutation 的結果。

#### SPEC-Y-R5d-3 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.claude/skills/wxl-mutate/SKILL.md:56`
- Requirement: Y95
- Summary: Fixed at .claude/skills/wxl-mutate/SKILL.md:56（.agents 那份同一行也已修正）。禁令現在寫的是 `challenge.yaml` 裡的四個 key，:59 的 why 句也寫明 description 在 brief。
- Evidence: SKILL.md:56「Editing `backend`, `difficulty`, `tags`, or `category` in `challenge.yaml`」；:46 寫「four retype-owned keys of `challenge.yaml`」。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-Y-R5d-4 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/challenge-analyze.ts:116`
- Requirement: Y68（只定義 absent 和 invalid 兩種）
- Summary: Still present。readDeclaration 在非 ENOENT 的讀取錯誤時回傳 `Cannot read file: <path>`，這個分支沒有任何測試。
- Evidence: analyze.ts:115–116；tests 裡搜尋 'Cannot read file' 沒有結果。
- Impact: 超出這一列的 AC，只是覆蓋率缺口。
- Suggested fix: 補一個 challenge.yaml 是目錄的 case。

#### SPEC-Y-R5d-5 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-retype-same-family.test.ts:86`
- Requirement: Y64（`backend` 和 `app` 都在 challenge.yaml 裡改變）
- Summary: Still present。flask 和 fastapi 都用 app.py，所以同家族互換時 `app` 本來就不會變，拿掉 `doc.set('app', …)` 測試照樣通過；Y64 的「app changes」在同家族的情境下無法觀察。
- Evidence: challenge-retype.ts:331 `doc.set('app', args.backend === 'php' ? 'index.php' : 'app.py')`；php 屬於跨家族，會以 exit 2 結束。
- Impact: 列文字和可觀察的行為不一致；程式本身沒有錯。
- Suggested fix: 在 traceability 註明同家族時 app 不變，或補一個原本 app 名稱不是 app.py 的 fixture。

#### SPEC-Y-R5e-1 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge-run.test.ts:454`
- Requirement: Y84（W1 保留 0007 的 substring，第一個是 generator 的錯誤訊息）
- Summary: Still present。P = en 的 W1 case 沒有斷言 generator 的錯誤訊息（refusal），zh-TW 的 case（:433）有。
- Evidence: :454 只有 `expectW1(h.err(), 'en')`；:433 有 `expect(h.err()).toContain(refusal)`。
- Impact: 程式路徑和語系無關，只是測試力道不足。
- Suggested fix: P = en 的 case 也補上 `toContain(refusal)`。

#### SPEC-Y-R5e-10 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge.test.ts:132`
- Requirement: D84、Y82
- Summary: Still present。測試標題「does not throw when neither md nor directory exists」還提到 checkCollision 已經不再檢查的 flat .md。
- Evidence: test:132。
- Impact: 只是標題過時。
- Suggested fix: 改成「when no challenge or brief directory exists」。

#### SPEC-Y-R5e-2 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge-run.test.ts:263`
- Requirement: Y71「as Y70」（brief first）；5e 延後項（兩條重複，已合併）
- Summary: Still present。Y71 只檢查四行 scaffold 都有出現，沒有像 Y70 一樣檢查 brief 排在第一行。
- Evidence: Y71 用 `for (const l of lines) expect(h.out()).toContain(l)`。
- Impact: 兩個 P 的輸出走同一段程式，Y70 已能抓到順序錯誤。
- Suggested fix: 讓 Y71 共用 Y70 的順序斷言。

#### SPEC-Y-R5e-3 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge-run.test.ts:318`
- Requirement: Y73「the tree is byte-identical before and after」；5e 延後項（兩條重複，已合併）
- Summary: Still present。PL-E02（mode 000）這一格沒有做整棵樹前後的 snapshot 比對，另外五格都有。
- Evidence: 只檢查 range.json 的 bytes、沒有含 'new-chall' 的路徑、_redirects 的 sentinel。
- Impact: 真實可能出現的錯誤（多出 scaffold 路徑）仍能抓到；字面上沒滿足「整棵樹逐位元組相同」。
- Suggested fix: chmod 之前先拍 snapshot（排除 range.json），之後再比對。

#### SPEC-Y-R5e-4 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge.test.ts:329`
- Requirement: Y79（title 不可為空）
- Summary: Still present。用 `not.toBe('')` 判斷非空，所以回傳 undefined 或非字串時也會通過。
- Evidence: test:329 `expect(SCAFFOLD_TEXT[L].title('a-b')).not.toBe('')`。
- Impact: 型別 Record<Locale,…> 已經在編譯期保證完整性，所以風險低。
- Suggested fix: 改成 `expect(typeof t).toBe('string'); expect(t.length).toBeGreaterThan(0)`。

#### SPEC-Y-R5e-5 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge-run.test.ts:532`
- Requirement: Y75（after keygen wasmModule is the last key）；5e 延後項（兩條重複，已合併）
- Summary: Still present。Y75 的 run 半邊用的是會自己 append wasmModule 的 keygen 替身，沒有驗證真實 keygen 的寫回；真實寫回由 Y54（5c）和 V-Y1（stage 8）負責。
- Evidence: test:532–541 的 keygen double 自己 append `wasmModule: …`。
- Impact: 已揭露的限制；真實行為由其他列涵蓋。
- Suggested fix: 可以接受；或對 generateDeclaration 的輸出跑一次真實的 parseDocument→set→toString，確認 wasmModule 排在最後。

#### SPEC-Y-R5e-6 · low · confidence medium · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/create-challenge.ts:375`
- Requirement: Y76（預設 title 依 P）
- Summary: Still present。沒有任何 run 層級的測試讀取實際寫出的 brief，確認預設 title 跟著 P；Y76 只在 getTitle／generateBrief 層級測。
- Evidence: create-challenge-run.test.ts 裡搜尋「未命名題目|SCAFFOLD_TEXT|getTitle」沒有結果；run 在 :375 呼叫 `getTitle(slug, args.title, primary)`。
- Impact: 如果 run 傳錯 locale，單元測試抓不到，要等 stage 8 的 V-Y1／V-Y2。
- Suggested fix: 在 Y72 case 加上讀取 brief title 的斷言（兩種 P 各一個）。

#### SPEC-Y-R5e-7 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/create-challenge-run.test.ts:240`
- Requirement: C01／Y70（_redirects 的期望值）
- Summary: Still present。C01 的期望頁面路徑來自 challengePagePath，和 production 共用同一個 helper，所以 helper 本身錯了測試也不會發現。
- Evidence: test:240 `const page = (slug) => challengePagePath(slug, 'zh-TW', 'zh-TW')`。
- Impact: S52 的字面值表會釘住 helper，所以覆蓋率沒有損失。
- Suggested fix: 改回字面值 `/challenge/new-chall/`。

#### SPEC-Y-R5e-8 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/scripts/create-challenge.ts:357`
- Requirement: D82（status 1 代表什麼都沒寫）
- Summary: Still present。platform/ 不存在時，checkSourceLayout 的 lstat 會丟出 ENOENT，run 直接 rethrow，結果是未捕捉的例外，不是 status 1。
- Evidence: create-challenge.ts:353–357 `if (e instanceof SiteLayoutError) {...return 1} throw e`。
- Impact: 真實的 repo 一定有 platform/，所以很少發生。
- Suggested fix: 把 ENOENT 包成一行訊息，並回傳 status 1。

#### SPEC-Y-R5e-9 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/challenge/config.test.ts:503`
- Requirement: Y-q1（移除 validateChallengeConfig）
- Summary: Fixed at .vitepress/challenge/config.ts（validateChallengeConfig 已移除），由 tests/unit/challenge/config.test.ts:503–505 釘住；traceability 1733 行也記錄了 segment 5g。
- Evidence: 在 repo（不含 specs／tickets）搜尋 validateChallengeConfig，只找到 config.test.ts:503、:505 的「no longer exports」斷言。
- Impact: 已修正。
- Suggested fix: 無。

#### SPEC-Y-R5f-1 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-verify-L1.test.ts:93`
- Requirement: Y109、D123（range.json 要在任何檢查之前讀）
- Summary: Still present。Y109 的每一格都在 challenge.yaml 存在的情況下測，所以把讀 range.json 和 VF1 檢查的順序對調，測試不會發現。
- Evidence: production challenge-verify.ts:289–293 的順序是對的；測試的 RANGE_FAULTS 都用 beforeEach 的 fixture，而那個 fixture 一定有寫 challenge.yaml。
- Impact: 只是測試力道不足。
- Suggested fix: 補一格「沒有 challenge.yaml 而且 range.json 壞掉」，期望結果是 PL 行而不是 VF1。

#### SPEC-Y-R5f-2 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/challenge-verify-L1.test.ts:27`
- Requirement: 可維護性
- Summary: Still present。RANGE_FAULTS（PL-E01–E06 的 builder 和訊息）在 keygen、verify-L1、verify-L2、build-player-package 的測試裡各有一份。
- Evidence: challenge-verify-L1.test.ts:27、L2:28、build-player-package.test.ts:128，以及 challenge-keygen.test.ts:1621。
- Impact: PL 訊息一改，就要同步修改多處。
- Suggested fix: 抽成 tests/__helpers__ 的共用表。

#### SPEC-Y-R5f-3 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/tests/unit/scripts/wxl-solver/build-player-package.test.ts:223`
- Requirement: Y93
- Summary: Not a defect, because builder 本來就不讀 challenge.yaml，所以這一列只能抓回歸，第一次跑就是 green 是預期中的事；executor 也用 mutation 證明它能變 red。
- Evidence: build-player-package.ts:87–108 只讀 range.json 和主語系 brief。
- Impact: 無。
- Suggested fix: 無。

#### SPEC-Y-R5g-1 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.vitepress/challenge/config.ts:15`
- Requirement: D75、D76（fs 已退役；description 是 brief 的 key）
- Summary: Still present。ChallengeDeclaration 介面還有 `fs?`（標成 @deprecated）和 `description?`，validateChallengeDeclaration 也還回傳 `fs: obj.fs`、`description: obj.description`（後者永遠是 undefined，因為帶 description 會先丟 VM5）。
- Evidence: config.ts:14–15、:32、:145、:154。
- Impact: 只是型別整潔度；沒有程式讀這兩個欄位。
- Suggested fix: 從介面和回傳值裡拿掉 fs 與 description。

#### SPEC-Y-R5g-2 · low · confidence high · deferred-p2-regraded

- Where: `/Users/phoenix/dev/browserlab/wxl-platform/.claude/skills/wxl-create/SKILL.md:175`
- Requirement: Y94（Step 6 restarts `pnpm dev`）、D87；5g 延後項（兩條重複，已合併）
- Summary: Still present。Step 6 檢查的是 `pnpm docs:dev` 能不能連上，新加的句子卻要求重啟 `pnpm dev`；而且這句緊接在「此步不要動 challenge.yaml」後面，讀者不容易看出它指的是 Step 4 做過的修改。兩個 tree 的 SKILL.md、SKILL.zhTW.md 都一樣。
- Evidence: SKILL.md:175「If `pnpm docs:dev` is not reachable … Do NOT touch … `challenge.yaml` … in this step. After any edit to `challenge.yaml`, restart `pnpm dev`.」；SKILL.zhTW.md:154 同義。
- Impact: 文字符合 Y94 的字面要求；但如果 agent 只重啟 docs:dev，就不會重跑 keygen，D87 想避免的「新宣告配舊模組」仍會發生。
- Suggested fix: 把重啟句移到 Step 6 開頭（「開始自測前，如果 Step 4 改過 challenge.yaml，先重啟 `pnpm dev`（會重跑 keygen）」），並把可連線檢查的說法一起統一。

### Spec · U (21 findings: 0 high, 4 medium, 17 low)

Coverage: 完整讀過的 diff 檔：G3 的 create-wxl__src__merge-plan.mjs、create-wxl__test__upgrade-report.test.mjs、create-wxl__test__layout-move.test.mjs、create-wxl__test__engine-apply.test.mjs、create-wxl__test__helpers__fixtures.mjs；G2 的 scripts__fork-init.ts、.github__workflows__quality-gates.yml、.github__workflows__release.yml；G5 的 tests__unit__scripts__upstream-guard.test.ts、tests__unit__scripts__fork-init.test.ts；G1 的 platform__zh-TW__guide__notes.md、platform__zh-TW__index.md、platform__en__index.md、vitest.config.ts。

在 HEAD 讀 live 檔案（等同這些新檔的完整 diff）：tests/unit/site/upstream-equality.test.ts、layout-error.test.ts、range-collection.test.ts、tests/__helpers__/upstreamDecision.ts、tests/unit/workflows/checkout-tags.test.ts、create-wxl/test/fixtures/page-predicate.json、.vitepress/theme/i18n/primaryLocale.ts、tests/unit/i18n/primary-locale-client.test.ts；source-layout.test.ts 讀 1-160 行。

只抽樣的：platform/en|zh-TW/guide/troubleshooting.md（195-229 行）、guide/index.md（grep）、GLOSSARY 語系標記、README／AGENTS 的 LH4 句子、scripts/generate-redirects.ts:205-233、redirects-generated.test.ts:530-668、pre-commit-sh.test.ts:1655-1729（T-0059 準則）、fork-init.test.ts 的 3423-3604 與 4245-4280、ChallengeLayout.test.ts 1430-1479（D31 fallback 依賴）、config-base.test.ts 與 challenge-validate.test.ts 的 D124 宣告處、quality-gates.yml 1-127。

所有 platform/ 的 diff 都只讀了檔頭（new file／modified）來比對 U-§5：本分支在 platform/ 下改動、超出 transform 輸出的頁面，都落在 U-§5 的 14 條路徑內（zh-TW reference 頁尚未建立，屬 T-0080）。其餘頁面與 v3.1.1 transform 是否逐位元組相等，我沒有親自驗證，是依據票上記錄的 segment 9 全套結果（upstream 判定下 0 失敗）。

spec／traceability 讀了：spec 240-399、534-893；traceability 的 D31、D54、D107、D108、D116、D124、D130、D149、B21-B28、B93、B95、U11、U-§5、LH1-LH5、Overridden contracts › Area B 與 Area U、U112-U152 等列；tickets.md 1-75；ticket 的 Context、AC、area U test plan、segment 7／7 fix／8b／9 的 Comments、Coverage report。

沒有讀到的：G1／G4／G5 其餘大部分 diff（area A、L、S、Y 的實作與測試）、G3 的文件與 skills diff、GLOSSARY／README 全文、create-wxl/src/layout-move.mjs（本分支沒有改動，T-0076 交付）。D31 第一步要求「只為設定 P 而改的測試，其 diff 只能是那一處」，這點我沒有逐檔核對。

Missing context: 打包內容沒有舊路徑的刪除 diff（platform/index.md、platform/guide/*.md、platform/reference/*.md、platform/challenge/<slug>/index.md 等）；只看得到 platform/challenges.md 和 platform/shared/challenges.zh-TW.data.ts 的刪除。所以我無法從打包內容比對已搬家的頁面與舊內容是否逐位元組相同，只能依賴 U130 的測試結果。; 我無法執行 git，也讀不到 v3.1.1 tag 的內容；本分支在 U-§5 之外的頁面是否等於 transform 輸出，依據的是票上 segment 9 記錄的全套測試結果（GITHUB_REPOSITORY=upstream，0 失敗）。; 沒有在真正的 range（例如 git archive --worktree-attributes 的產物）跑過完整的 root suite；SPEC-U-03 的執行期失敗是依 fix round 的紀錄加上靜態閱讀判定的。; vitest 對 `it.each([])`（空表）的實際行為（不註冊案例或拋錯）沒有驗證；SPEC-U-D5 的影響是假設它不註冊任何案例。

#### SPEC-U-01 · medium · confidence high · spec-inconsistency

- Where: `tests/unit/site/source-layout.test.ts:81`
- Requirement: D124（traceability.md:183）列舉的 upstream-only 列與 AC-61（spec.en.md:810-816）「Each test D124 lists is upstream-only … every other test that reads the real tree derives its expectation from the primary locale and the tree」；對照 U136（traceability.md:2623）「a JSON table under `create-wxl/test/` … the root suite runs `classifySourcePath` … over it」
- Summary: U136 的 root 半邊被做成 upstream-only，但 D124 的清單沒有 U136；spec 自己把共用表放在 export-ignore 的 `create-wxl/test/` 底下，又要求 root suite 讀它，兩條規則在靶場裡互斥。
- Evidence: source-layout.test.ts:81-94：`const U136_SKIP = upstreamOnlySkipReason(...)`、`PREDICATE_ROWS ... U136_SKIP === undefined ? JSON.parse(readFileSync(PREDICATE_TABLE, 'utf8')) : []`、`describe.skipIf(U136_SKIP !== undefined)('U136: ...')`。.gitattributes:6 `/create-wxl export-ignore`。票的 Comments 2026-11-17（segment 7 plan 決策 1）寫明「This makes U136's root half upstream-only, which D124's list does not name: recorded for stage 6.」
- Impact: AC-61 的二分法（D124 列＝upstream-only，其餘＝依 P 與樹推導）在 U136 上不成立；靶場的 root suite 永遠不比對 `classifySourcePath` 與 `isLegacyPage`。這是 spec 層的矛盾，需要使用者裁決：在 D124 補上 U136 的 root 半邊，或把共用表搬到不會被 export-ignore 的位置。
- Suggested fix: 由使用者裁決後擇一：(a) 在 D124／AC-61 的清單補上「U136 的 root 半邊」，並記入本票 stage 6 處置表；(b) 把 page-predicate 表改放在 range 也會有的路徑（例如 `tests/__fixtures__/`），讓 create-wxl 端改從 repo 相對路徑讀取，root 半邊就不必 upstream-only。

#### SPEC-U-02 · medium · confidence high · spec-inconsistency

- Where: `tests/unit/site/layout-error.test.ts:20`
- Requirement: D124 清單與 AC-61（同上）；對照 B95（traceability.md:2011）「a site test runs the site function and create-wxl's `jsonStringifyEscaped` (read from `create-wxl/src/text.mjs`) over one table of values and requires equal output」
- Summary: B95 的比對測試整個變成 upstream-only，但 D124 沒有列 B95；B95 本身又要求 site 測試去讀 range 裡不存在的 `create-wxl/src/text.mjs`。
- Evidence: layout-error.test.ts:19-31：`const TEXT_MODULE = pathToFileURL(join(ROOT, 'create-wxl/src/text.mjs')).href`、`const B95_SKIP = upstreamOnlySkipReason(...)`、`describe.skipIf(B95_SKIP !== undefined)('jsonStringifyEscaped equals create-wxl’s (B95)', ...)`。Comments 2026-11-17（segment 7 fix round 決策）：「This makes B95's comparison upstream-only, which D124's list does not name: recorded for stage 6 together with U136's root half.」
- Impact: 在 range 裡，B95 這個檔案沒有任何案例會執行；spec 的 D124／AC-61 和 B95 的寫法互相衝突，需要使用者裁決。
- Suggested fix: 由使用者裁決：在 D124／AC-61 補上「B95 的 create-wxl 比對」為 upstream-only，或改寫 B95，讓 site 端另有一份不依賴 create-wxl 的字面值測試（見 SPEC-U-04）。

#### SPEC-U-03 · medium · confidence high · incorrect

- Where: `tests/unit/scripts/fork-init.test.ts:4265`
- Requirement: B93（traceability.md:2009）「every other real-tree test derives from `P` and the tree」；D124「CI's `test` and `site-smoke` jobs run in every range」；AC-61「on a scratch clone of F-2 (`P = en`, a range) `pnpm test --run` … pass」
- Summary: 目前已經沒有 root 測試會在沒有 `create-wxl/` 的 range 裡於 collection 階段失敗；但 fork-init.test.ts 有一個案例會在執行時讀真實樹的 `create-wxl/package.json`，在 range 的 `test` job 一定失敗。這個案例沒有用 D124 helper 宣告，也不是依所在的樹推導期望值。
- Evidence: fork-init.test.ts:4260-4265：`it('--author x --rebrand acme --repo me/x leaves the upstream-only if:/env lines ... and moves create-wxl\'s repository.url ...', () => { const repoRoot = resolve(__dirname, '../../..') ... const createWxlPkgBefore = readFileSync(join(repoRoot, 'create-wxl/package.json'), 'utf8')`。Comments 2026-11-17（segment 7 fix round）：在模擬 range 中「`fork-init.test.ts` has one create-wxl-related failure ... `ENOENT ... <tmp>/create-wxl/package.json` ... Left as is; for stage 6 / V-B7」。以靜態方式檢查：tests/ 底下 import create-wxl 的只剩三個 upstream-only 檔，都改成非字面值的動態 import。
- Impact: 每個 range 的 CI `test` job（D124：在每個 range 都會跑）都會紅燈；V-B7（T-0080）一定會失敗。這個問題在 epic 0009 就已經存在，不是本分支造成的，但 B93 是本票的列，stage 6 必須判定。range-collection.test.ts 只跑三個指定檔，抓不到這一類問題。
- Suggested fix: 把這個案例用 `upstreamOnlySkipReason(...)` 宣告成 upstream-only（並補進 D124 清單，記入處置表），或在 range 裡改用 fixture 的 create-wxl/package.json；另外可以考慮讓 range-collection 在模擬 range 裡跑完整的 root suite。

#### SPEC-U-08 · medium · confidence high · partial-behaviour

- Where: `tests/unit/scripts/fork-init.test.ts:3511`
- Requirement: Overridden contracts › Area U（traceability.md:1780）`PLATFORM_HOME_RELS`：「every listed test reads or writes `platform/en/index.md` instead of `platform/index.md`」（列出的有 fixture、the 0003 A7 cases 等）；U113「nothing else changed」；AC-51
- Summary: 有兩組 fork:init 測試仍然把 A7 首頁寫成舊的 `platform/index.md`。換到新路徑以後，它們驗的是一個 fork:init 根本不碰的檔案，原本要檢查的「A7 不可解析時不被動到」和「首頁在沒有旗標時 byte/mtime 不變」都沒有在真正的 A7 檔案上驗證。
- Evidence: :3502-3527「A6 (unparsable), A7 (two candidate lines) ... all stay untouched」把兩行 candidate 寫進 `platform/index.md`（:3510-3513），只斷言 `platform/index.md` 沒變（:3524）；真正的 A7 檔 `platform/en/index.md` 由 writeFixture 寫入，是合法的單一 candidate，沒有被斷言。:3534-3603 的 T5 dedicated fixture 在 :3540 寫 `platform/index.md`，`untouchedRels`（:3590-3595）列的是 `'platform/index.md'`，不是 `platform/en/index.md`。
- Impact: fork:init 在沒有旗標的執行中如果誤改了 `platform/en/index.md`，或在 A7 不可解析時誤寫入，這兩組測試都抓不到；Overridden contract 宣稱 0003 A7 的案例已全部改成新路徑，實際上只改了一部分。
- Suggested fix: 把 :3511、:3520、:3524、:3540 與 :3592 的 `platform/index.md` 改成 `platform/en/index.md`（:3502 的案例要讓兩行 candidate 落在 `platform/en/index.md`），並確認只改了路徑、斷言不變。

#### SPEC-U-04 · low · confidence medium · partial-behaviour

- Where: `tests/unit/site/layout-error.test.ts:45`
- Requirement: B95（traceability.md:2011）「the function writes a tab as "\u0009", CR as "\u000d", LF as "\n", ESC as "\u001b", the lone surrogate as "\ud800" and DEL as "\u007f" … and returns `undefined` for `undefined` and for a function」
- Summary: B95 列出的字面輸出（tab、CR、DEL、孤立 surrogate、undefined／function 回傳 undefined）只透過「跟 create-wxl 相等」來驗證，沒有任何字面斷言。create-wxl 端也沒有直接測 `jsonStringifyEscaped`；在 range 裡則完全沒有測試。
- Evidence: layout-error.test.ts:45-47 只有 `expect(jsonStringifyEscaped(value)).toBe(jsonStringifyEscapedCreateWxl(value))`。在 tests/ 與 create-wxl/test/ 用 grep 找 `jsonStringifyEscaped`：只有 primary-locale.test.ts:244-255 的 B10 經由 PL-E06 涵蓋 `\n`、`\u001b[31m`、`\u009b[31m`；create-wxl/test 完全沒有 match。
- Impact: 兩份實作如果一起寫錯（例如 tab 寫成 `\t`），這個測試照樣通過；B95 的字面規格沒有一個在測試裡能失敗。
- Suggested fix: 在 layout-error.test.ts 加一個不屬於 upstream-only 的 describe，對 site 函式逐一斷言 B95 列出的字面輸出（range 裡也會跑）。

#### SPEC-U-05 · low · confidence medium · partial-behaviour

- Where: `tests/unit/site/upstream-equality.test.ts:94`
- Requirement: U139（traceability.md:2614）「0010-S49 with the decision's inputs stubbed: reports skipped in both cases, never failed」
- Summary: U139 的單元測試驗的是測試檔自己的 `loadEquality` 的 skip 分支，但真正的 suite 根本不走這條路：它用 `describe.skipIf(REAL_SKIP !== undefined)` 跳過，`loadEquality` 只在 REAL_SKIP 為 undefined 時才被呼叫。所以 U139 的案例沒辦法驗出真實 suite 的 skip 接線壞掉。
- Evidence: upstream-equality.test.ts:79-82 `function loadEquality(cwd, skipReason) { if (skipReason !== undefined) return { skip: skipReason } ... }`；:267-270 `if (REAL_SKIP === undefined) { ... const loaded = loadEquality(ROOT, REAL_SKIP)`（skip 分支在正式路徑上是死碼）；:281 `describe.skipIf(REAL_SKIP !== undefined)(...)`。真實 skip 只有 range-collection.test.ts 覆蓋到「range、無 git、無 tag」這一格；「fork」和「range 但 tag 存在」兩格沒有在真實檔案上驗證。
- Impact: 如果 :281 的 skipIf 被拿掉或寫錯，U139 的 6 個案例仍然全綠；fork 的情境只能等到 stage 8 才觀察得到。
- Suggested fix: 讓真實 suite 的 skip 經由 `loadEquality`（或同一個函式）決定，或在 range-collection 裡加一個 fork 案例（不放 range.json、manifest 指向其他 repo），以及一個 tag 存在的案例。

#### SPEC-U-06 · low · confidence high · spec-inconsistency

- Where: `tests/unit/site/upstream-equality.test.ts:300`
- Requirement: D108（traceability.md:167）「The exception table equals U-§5 at this epic's close-out; a ticket after the epic and before the first new-layout release that edits a moved page adds its own entry naming its ticket」；AC-53「which equals U-§5 at the close-out」；對照 Comments 2026-11-17（segment 7 plan 決策 2）「assert that the table's key set equals the paths parsed from that section」
- Summary: 測試永遠要求例外表等於 traceability.md 的 U-§5，而不是只在 close-out 時相等。epic 結束後，依 D108 自行加條目的 ticket 一定會讓這個斷言失敗，只能回頭改已經結案的 spec。
- Evidence: upstream-equality.test.ts:300-317：從 `.proj.specs/0010-primary-locale-layout/traceability.md` 解析 `### U-§5` 段落，`expect(new Set(Object.keys(EXCEPTIONS))).toEqual(paths)`。
- Impact: epic 之後第一張依 D108 的機制編輯已搬家頁面的 ticket 會被這個斷言擋住，跟 D108 規定的流程衝突；需要使用者決定以 Comments 的決策為準，還是以 D108 為準。
- Suggested fix: 讓使用者裁決：改成「EXCEPTIONS 必須包含 U-§5 的全部路徑，多出來的每一條都要附 ticket id」；或在 D108 註明 epic 後的條目也要同步寫進 U-§5。

#### SPEC-U-07 · low · confidence high · spec-inconsistency

- Where: `tests/unit/site/upstream-equality.test.ts:238`
- Requirement: D130（traceability.md:189）「recorded … together with the row or ticket that edits the path」；U-§5（traceability.md:1600）`platform/zh-TW/guide/notes.md` | D16
- Summary: notes.md 的例外歸給 D16（`../reference/…` 連結），但本票實際做的編輯是暫時的純文字（票上明說「not a spec decision」），D16 的連結要等 T-0080 才寫。例外表標的編輯者和實際編輯對不上。
- Evidence: EXCEPTIONS:238 `'platform/zh-TW/guide/notes.md': 'D16'`；diff 中 notes.md 把 `[公開匯出格式](../../reference/attack-log-export-format.md)` 改成 `「公開匯出格式」參考頁`。票的 Context 寫「The interim plain text is not a spec decision」；test plan :3718 寫「the interim edit sits under that entry, recorded at stage 6」。
- Impact: 從 T-0077 合併到 T-0080 之間，U-§5／EXCEPTIONS 寫的「編輯這個路徑的列」跟事實不符；D130 的處置紀錄也還沒寫。
- Suggested fix: 在本票的 stage 6 處置表記下：暫時純文字掛在 D16 那條例外下，由使用者核准；或把 EXCEPTIONS 的值改成 'D16 (T-0077 interim text)'。

#### SPEC-U-09 · low · confidence medium · partial-behaviour

- Where: `tests/unit/site/upstream-equality.test.ts:327`
- Requirement: U-§5（traceability.md:1589-1592）「Every page other than these … must match」；D108／R15「the first new-layout release equals the transform of the one before」
- Summary: U130 只走訪 transform 的輸出（move／declare／strip），U131 只走訪 compared tree，所以 v3.1.1 裡一個 transform 不碰的頁面（zh-TW 的非 brief 頁，例如 `platform/zh-TW/guide/browser.md`）如果從 compared tree 被刪掉，兩邊都不會失敗。
- Evidence: :287 `outputs` 只收 strip 的 path 與 move／declare 的 to；:329-341 `checked = [...compared.tree.keys()]...`，只檢查 compared tree 裡存在的路徑。沒有任何斷言檢查「base 中未被 touch 的頁面」都還在 compared tree 裡。
- Impact: epic 期間誤刪 zh-TW 頁面，upstream-equality 仍然全綠（T-0080 的完整性測試落地之前，沒有其他防線）；R15 宣稱的「等於 transform」沒有完整驗到。
- Suggested fix: 在 U131 加一組：base tree 裡未被 touch、且 classifySourcePath 不是 excluded 的頁面，都必須出現在 compared tree（例外表裡的除外）。

#### SPEC-U-10 · low · confidence high · incorrect

- Where: `.vitepress/theme/index.ts:245`
- Requirement: D40（prop 改名為 `lists`）、D14（英文頁移到 `platform/en/`）；Overridden contracts BC15 的精神（設定註解要反映新版面）
- Summary: theme 註冊元件處的註解還是切換前的說法：ChallengeList 吃 `challenges` prop、由 `platform/challenges.md` 經 `:challenges="data"` 傳入，HomeContent 用在 `platform/index.md`。這三件事在本分支都已經不成立。
- Evidence: :245-247「ChallengeList requires a `challenges: ChallengeData[]` prop; each locale's challenges page (platform/challenges.md, platform/zh-TW/challenges.md) passes it via <ChallengeList :challenges="data" />」；:250「HomeContent is used in platform/index.md via <HomeContent />」。實際頁面是 `<HomeContent :lists="data" />`，位置在 platform/en/index.md。
- Impact: 誤導後來的維護者繼續用舊的 prop 與路徑（舊 prop 依 D40 只會渲染空清單）。
- Suggested fix: 把註解改成 `lists: Record<Locale, ChallengeData[]>`，路徑改成 `platform/<locale>/challenges.md` 與 `platform/<locale>/index.md`。

#### SPEC-U-11 · low · confidence high · smell

- Where: `tests/unit/site/range-collection.test.ts:45`
- Requirement: Comments 2026-11-17（segment 7 fix round）：range-collection 要在模擬 range 裡跑 upstream-only 的檔案
- Summary: 測試標題寫「both files pass」，實際跑的是三個檔案（UPSTREAM_ONLY_FILES 有三項）；describe 標題只列 D124、U136、U139，沒有列 B95。
- Evidence: :13 `const UPSTREAM_ONLY_FILES = ['tests/unit/site/source-layout.test.ts', 'tests/unit/site/upstream-equality.test.ts', 'tests/unit/site/layout-error.test.ts']`；:45 `it('both files pass, and their upstream-only suites report skipped', ...)`；:44 describe 標題只寫「(D124, U136, U139)」。
- Impact: 報告裡的名稱跟實際涵蓋範圍不一致，讀報告的人會以為 B95 不在這個保護範圍內。
- Suggested fix: 改成「every listed file passes」，並在標題補上 B95。

#### SPEC-U-D1 · low · confidence medium · deferred-p2-regraded

- Where: `create-wxl/test/fixtures/page-predicate.json:1`
- Requirement: U136（traceability.md:2623）「one shared path table (U11's paths and B21–B28's)」
- Summary: 仍然存在：共用表有 32 列，但缺 B22 的 `reference/x.md`、`fr/a.md`、`docs/a.md`，B23 的 `challenge/x/index.md`、`challenge/x/notes.md`，以及 B27 的 `platform/assets/logo.png`。
- Evidence: 在 HEAD 讀 page-predicate.json，32 列中沒有上述路徑；source-layout.test.ts:17-52 的 working test 裡有這些路徑，但那份只測 classifySourcePath，沒有跟 isLegacyPage 對照。核准的 test plan 列（ticket :3713）列出的子集都已經涵蓋。
- Impact: 這幾條路徑和表裡既有的路徑同類，風險低；但 U136 字面上說的是 B21–B28 的路徑，嚴格說只做到一部分。
- Suggested fix: 把缺的六條路徑補進 page-predicate.json（兩邊的 suite 會自動跑到）。

#### SPEC-U-D10 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/range-collection.test.ts:20`
- Requirement: D124「CI's `test` … jobs run in every range」；Comments 2026-11-17（segment 7 fix round）
- Summary: 仍然存在：模擬的 range 是手挑的部分複本，不是 `git archive --worktree-attributes` 產生的，所以只是依建構方式剛好符合 export-ignore；node_modules 是 symlink，內層 vitest 的 cache 會寫進 live tree 被 gitignore 的 node_modules/.vite。另外它只跑三個寫死的檔案，所以抓不到 SPEC-U-03 那種「其他 root 測試在 range 裡失敗」的問題。
- Evidence: :20-35 `buildRangeCopy` 複製固定清單並 `symlinkSync(resolve(REPO_ROOT, 'node_modules'), ...)`；:13 的 UPSTREAM_ONLY_FILES 是寫死的。
- Impact: 之後新增的 upstream-only 檔、或其他會讀到 export-ignore 路徑的測試，都不在保護範圍內；這部分只能靠 stage 8 的 V-B7。
- Suggested fix: 改用 `git archive --worktree-attributes HEAD` 建立複本，並考慮在複本裡跑完整的 root suite（至少讀取 .gitattributes 的 export-ignore 清單）。

#### SPEC-U-D2 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:291`
- Requirement: U130（traceability.md:2609）「one assertion per path naming it」
- Summary: 仍然存在：在例外表裡的路徑會直接 `return`，但測試標題還是「equals the transform output」，報告看起來像 22 個逐位元組相等，其實其中幾個根本沒有斷言。
- Evidence: :290-291 `it.each([...outputs.keys()])('%s equals the transform output', (path) => { if (path in EXCEPTIONS) return`。
- Impact: 只是報告會誤導，判定結果不受影響。
- Suggested fix: 把例外路徑從 it.each 的資料裡濾掉，另外用 `it.skip` 或標題標成 `(excepted: <rows>)`。

#### SPEC-U-D3 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:185`
- Requirement: U131（traceability.md:2610）「every page and `challenge.yaml` of the compared tree」
- Summary: 仍然存在：working tree 的路徑只取自 `git ls-files -s`，從沒 git add 過的新頁面在 U131 看不見，要 stage 之後才會被檢查。
- Evidence: :183-198 `readWorkingTree` 只走訪 `gitBuffer(['ls-files','-s','-z','--','platform/'])`。
- Impact: CI 拿到的是 commit 過的樹，所以實際上影響不到 CI；只有本機在 add 之前跑時會漏掉。
- Suggested fix: 另外合併 `git ls-files -o --exclude-standard -- platform/` 的結果（mode 依 lstat 推定），或在註解寫明這個限制。

#### SPEC-U-D4 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:269`
- Requirement: U132（traceability.md:2611）「the test fails naming the tag」
- Summary: 仍然存在（合併 stage 5 的兩筆重複項目：原 :265 與 :270）：同一個 try/catch 把 readTagTree、readComparedTree、planLayoutMove 的任何錯誤都塞進 baseTagError，再放到「the base tag v3.1.1 is in the checkout」這個標題底下丟出。
- Evidence: :269-276 `try { const loaded = loadEquality(ROOT, REAL_SKIP); baseTree = readTagTree(...); compared = readComparedTree(); ops = planLayoutMove(...).ops } catch (err) { baseTagError = err as Error }`；:282-284 `it(\`the base tag ${BASE_TAG} is in the checkout\`, () => { if (baseTagError) throw baseTagError })`。
- Impact: 原始訊息有保留，所以判定正確；只有標題會讓人誤以為是 tag 不見。
- Suggested fix: 把 tag 檢查和其他收集錯誤分開，各自用正確的標題回報（例如再加一個「the transform runs on the base tree」）。

#### SPEC-U-D5 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:290`
- Requirement: U130（traceability.md:2609）「every 0010-S45 output … equals」
- Summary: 仍然存在（從 stage 5 原 :270 那筆拆出來的第二個問題）：U130 (1) 沒有斷言 `outputs` 非空；transform 如果回傳空的 ops，逐路徑的 it.each 會一個案例都沒有。
- Evidence: :286-290 `const outputs = new Map<string, Op>() ... it.each([...outputs.keys()])`，沒有長度檢查。
- Impact: 實際上 U131 會因為 compared tree 的頁面不是 output 而失敗，所以不算覆蓋缺口；但 U130 本身有可能空轉。
- Suggested fix: 加上 `it('the transform has outputs', () => expect(outputs.size).toBeGreaterThan(0))`。

#### SPEC-U-D6 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:307`
- Requirement: U130 (2)／D130「the exception table equals U-§5」
- Summary: 仍然存在：U-§5 的解析器用下一個 `\n###` 當結尾，但那個標題是 `## Overridden contracts` 之後的 `### Area B`，不是 U-§5 的同層下一個標題。
- Evidence: :307 `const end = text.indexOf('\n###', start + 1)`；traceability.md:1587 是 `### U-§5`，:1611 是 `## Overridden contracts`，:1615 是 `### Area B`。目前兩者之間沒有以 `|` 開頭的表格列，所以結果正確。
- Impact: 以後如果在 Overridden contracts 的開頭加表格，會有路徑被誤算進例外集合。
- Suggested fix: 結尾改成下一個 `\n## ` 或 `\n### `，取先出現的那個。

#### SPEC-U-D7 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:281`
- Requirement: D124（traceability.md:183）「reports skipped, with the decision's reason … a vitest row passes the reason to `it.skipIf` or `describe.skipIf`」
- Summary: 仍然存在：本票新增的三個 upstream-only describe 傳給 `describe.skipIf` 的都只是 boolean，skip 的原因不會出現在輸出裡。
- Evidence: upstream-equality.test.ts:281 `describe.skipIf(REAL_SKIP !== undefined)(...)`；source-layout.test.ts:94 `describe.skipIf(U136_SKIP !== undefined)(...)`；layout-error.test.ts:31 `describe.skipIf(B95_SKIP !== undefined)(...)`。對照 challenge-validate.test.ts:306-307 有把原因寫進標題：`Y1 (validate half)${upstreamSkip ? \` [skipped: ${upstreamSkip}]\` : ''}`，可見做得到。
- Impact: 在 range 或 fork 裡看報告的人分不出是哪一種 skip；不影響判定。
- Suggested fix: 仿照 challenge-validate.test.ts，把 reason 附加到三個 describe 的標題上。

#### SPEC-U-D8 · low · confidence medium · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:279`
- Requirement: U139（traceability.md:2614）「reports skipped in both cases, never failed」
- Summary: 仍然存在：`PRIMARY = readPrimaryLocale(join(ROOT, 'range.json'))` 在模組層級執行，不受 skip 判斷保護；range.json 不合法的 range 會在 collection 階段失敗，而不是 skip。
- Evidence: :279 位於 `if (REAL_SKIP === undefined)` 區塊（:267-277）之外，在 :281 的 describe.skipIf 之前執行。
- Impact: range.json 不合法的 range，本來就會被建置以 PL-E05／06 擋下，所以影響很小；但 U139 的「never failed」在這種情況下不成立。
- Suggested fix: 把 PRIMARY 的計算移進 `REAL_SKIP === undefined` 的區塊。

#### SPEC-U-D9 · low · confidence high · deferred-p2-regraded

- Where: `tests/unit/site/upstream-equality.test.ts:1`
- Requirement: Comments 2026-11-17（segment 7）：新檔交給 parent 提交
- Summary: 已修正，HEAD 上不是缺陷：segment 7 原本 untracked 的 upstream-equality.test.ts、page-predicate.json、checkout-tags.test.ts 都已經在 commit fe8b230 裡。
- Evidence: MANIFEST 的 Committed diff 列有這三個路徑（G4、G3、G5 群組）；擷取時的 git status 是 (clean)。
- Impact: 沒有影響。
- Suggested fix: 不需要處理。

## Counts

| Axis | high | medium | low | total |
|---|---|---|---|---|
| Standards | 3 | 35 | 174 | 212 |
| Spec | 1 | 21 | 235 | 257 |
