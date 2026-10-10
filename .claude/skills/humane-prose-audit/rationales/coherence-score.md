# coherence-score

## What

本指標為 TextDescriptives 之 first-order coherence——連續句對 sentence embedding 之 cosine similarity 平均值，量度「相鄰句子在主題上是否連貫」。

值域 0.0–1.0；越接近 1 表示連續句越貼近同一主題。

實作需 spaCy `zh_core_web_sm` 模型 + `textdescriptives` 套件（兩者皆為選裝依賴）。若任一缺席，audit script 將該 metric 標 SKIPPED 並 stderr 警告，不阻斷 workflow。

## Threshold

- PASS band：≥ 0.6。
- Warning band：0.4–0.6。
- Finding：< 0.4。

本 threshold 為選裝指標——若 spaCy / TextDescriptives 未裝，整 metric 自動標 SKIPPED 不阻斷 audit。`config.yaml` 暫未把本 key 導出，由 rationale 與 audit orchestrator 共同維護常數。

## Why

TextDescriptives 官方驗證資料（Hansen 等，2023）顯示 well-edited Wikipedia articles 之 first-order coherence 落於 0.65–0.78；reddit-quality casual prose 落於 0.45–0.55。

`0.6` 取為 Wikipedia 樣本之下尾，作為「最低可發布品質」之經驗 floor。

低於 0.6 通常代表段落間缺 transition、論述跳躍；極低值（< 0.4）對應 copy-paste 拼湊或話題漂移。

本指標與 Illogical persona 之「self-contradiction」類別互補：coherence 看「鄰句相關性」，邏輯則看「鄰句不矛盾」——兩者偵測之 sharp edge 類型不同但常共現。

## Limitations

False positive：合法的章節切換（如從 method 跳到 results）會壓低 coherence，但這是有意為之；audit 階段需以章節邊界 segment 計算而非整檔平均。

False negative：將段落填滿同主題填充字（如重複 "this method"）可虛假抬高 coherence，本指標看不出此種空轉。

中文 sentence segmentation 對混排英文（typst command、code block）容易誤切，需 pre-strip。對極短文檔（< 5 句）統計噪音過大、不應採信本指標。
