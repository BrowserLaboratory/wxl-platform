# mainland-vocab-zero

## What

本指標計算文稿中出現之中國大陸用語 token 數。

對照表為 `config.yaml` 之 `mainland_vocab` mapping（PRC term → TW term），目前收錄 25 個常見對：軟件 / 硬件 / 網絡 / 數據 / 程序 / 視頻 / 質量 / 信息 / 用戶 / 默認 / 登錄 / 菜單 / 打印 / 屏幕 / 鼠標 / 硬盤 / 內存 / 文件夾 / 通過 / 克隆 / 函數 / 代碼 / 運行 / 支持 / 優化。

實作以 substring search 配 word-boundary heuristic，每命中一筆計一個 finding。

## Threshold

**Zero tolerance** — count 必須為 0，任一命中即為 finding。

severity 預設為 Medium（依 `config.yaml` `severity.medium.mainland_vocab` 條目）。

若連續同檔 ≥ 5 個命中，audit orchestrator 可升 High——視為系統性語感污染而非偶發 typo。

## Why

`~/.claude/CLAUDE.md` 全域 instruction 明文要求「一律使用台灣慣用繁體中文用語」、「嚴格禁止使用任何中國大陸用語」。`/Users/phoenix/dev/phd-courses/11402-courses/ai-concept/CLAUDE.md` 之 LLM Exposure 章節亦再次強調 report 必須用台灣繁中。

本 zero-tolerance 是專案層級之 hard rule 而非品味偏好：違反即等同未遵守 user instructions。

對照表可在 `config.yaml` `mainland_vocab` 自行擴增（floor 為現行 25 詞）。25 詞為高頻 PRC 用語覆蓋率約 80% 之經驗下限，更全面之檢測可導入 `mainland_blacklist_extras` 鏈接擴充表。

## Limitations

False positive：少數詞在台灣語境亦合法（「通過」於「通過考試」、「程序」於「法律程序」），目前以 substring match 會誤判。需後續導入詞性 tagging（spaCy）作 disambiguation。

False negative：未收錄之 PRC 詞彙（如「比特」「字節」之計量單位）會漏；簡繁混用之夾雜句目前需另由 Unicode block 偵測補強。

對 quote 引用之歷史文本（如引用大陸學者原文）目前無豁免機制，需手動標註或加 sentinel comment 排除。
