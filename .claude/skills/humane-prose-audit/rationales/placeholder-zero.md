# placeholder-zero

## What

本指標計算文稿中之未完成標記 token 數。

pattern 表為 `config.yaml` 之 `placeholder_patterns`：`TBD` / `TODO` / `FIXME` / `XXX` / `TKTK` / `待補` / `未完成` / `暫定` / `Lorem ipsum`（case-insensitive）。

配對為 word-boundary regex 以避開實字（如 `TODOlist` 之 TODO 不算）。

## Threshold

**Zero tolerance** — count 必須為 0。

任一命中即 Critical finding（依 D1 分層：lazy writer 規則檢查直接 fire Critical 即停手）。

Pre-flight phase 偵測到 ≥ 1 placeholder 即立即中斷 audit workflow（避免浪費 sub-agent 算力）。

對應 `config.yaml` 之 `severity.critical.factual_error`（廣義）——shipping 文稿出現 placeholder 視同事實錯誤層級的編輯失效。

## Why

Placeholder pattern 等同「作者自己標記為未完成」之自首；committed prose 不允許 shipping 任何 placeholder，否則 PDF 出現 `TBD` 字樣即 obvious editorial failure。

tutorial sharp-edges audit（2026-05-10 archived）首輪即抓出 3 個 `TBD`，驗證此規則檢出率與 fire-rate 之必要性。

此 rule 屬「規則層可 100% 覆蓋」之 lazy writer 類型，故 archived design D1 決定不交給 sub-agent，由 Python pre-flight 直接 fire。Sub-agent dispatch 對此類 sharp edge 是 token 浪費——regex 已足夠。

## Limitations

False positive：技術討論段落引用 `TODO` 字面（如「Git 註解中常見的 TODO comment」）會誤判，需 escape 機制（如反引號內豁免）。

False negative：作者自創之 placeholder（如 `???`、`@@`、`<填這裡>`）未在 pattern 表內會漏，建議搭配 `<` / `>` 等 sentinel char 偵測補強。

對 code block 內之合法 TODO comment（如 source code snippet）目前一視同仁，需 pre-strip code block 或在 finding 階段人工 review。
