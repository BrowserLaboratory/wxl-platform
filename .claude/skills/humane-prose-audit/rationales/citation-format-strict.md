# citation-format-strict

## What

本指標偵測「dangling citation」——body 中出現之 cite key 在 references.yml（或 .bib）無對應 entry。

實作上以 `config.yaml` 之 `citation.cite_regex`（`cite\(<?([A-Za-z0-9_-]+)>?\)`）抽出 body 中所有 cite keys，與 reference file YAML 之 top-level keys 取差集。

差集分兩類報告：

- **dangling**：body 有但 ref 無——必為 Critical（rendering bug）。
- **unused**：ref 有但 body 從未引用——僅 Medium warning。

## Threshold

**Zero tolerance for dangling** — body cite key 之 ref miss rate 必須為 0。

對應 `config.yaml` 之 `severity.critical.dangling_citation`，severity 預設 Critical（無法救援之 rendering bug）。

Unused citation 為 warning（Medium），不阻 PASS verdict——保留未引用之 entry 不會破壞 PDF，但提醒 author 清掃。

## Why

Typst / LaTeX 之 unresolved citation 渲染為 `??` 或 `[?]`，對讀者為明顯瑕疵且通常無法在不重 compile 之情況下修復。

`spectra-audit` archived spec 與 hw02 tutorial audit 均將 dangling cite 列為 Critical。本 rule 屬「機器規則可 100% 偵測」之類型——人類審稿通常因 cite key 數量大而漏看，自動化檢出率為 reviewer 不可取代之優勢。

本 metric 與 cite-probe skill 互補：cite-probe 驗 cite 是否 verifiable（cross-Semantic Scholar），本 rule 僅驗 cite 是否 resolvable（cross-local-ref）。兩者一起跑可同時擋住「字典裡沒有」與「字典裡寫錯」兩種錯誤。

## Limitations

False positive：對含字串 `cite(` 之 code block / pseudo-code 段落（如教 student 如何寫 cite 語法）會誤抓，需 pre-strip code block。

False negative：未走 `cite()` 函式之 manual citation（如 inline footnote 或 (Author, Year) plain text）目前不偵測；author 若混用引用風格，需另設 rule 補強。

對 `.bib` format 之 ref file 需額外 parser（目前僅支援 YAML format，`config.yaml` `citation.refs_format: yaml`）；BibTeX 支援列為未來工作。
