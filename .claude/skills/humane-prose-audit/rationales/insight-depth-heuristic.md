# insight-depth-heuristic

## What

本指標量度文稿之「洞察密度」（insight density）——在量化規則無法直接觸及之 surface-only 風險上提供啟發式判讀依據，作為 Shallow Author sub-agent persona 之輔助裁判訊號。

實作上以三個 sub-signal 之加權求和定義單篇 score：

1. **non-trivial claim ratio**：論點句（含「因此」、「由 ... 可得」、「we argue」、「the key insight」等 thesis 標記）/ 全句總數。
2. **causal-link depth**：因果鏈在 H1 / H2 章節內之連續層數平均（A → B → C 連結為 depth 3）。
3. **trade-off coverage**：含明示 trade-off / risk / limitation 句之段落比例。

三 sub-signal 經 z-score 正規化後加總，輸出落於 0–10 之 ordinal scale；low / mid / high band 由 config.yaml `insight_depth_band` 控制。本指標僅作為 advisory，**不**單獨升 severity，由 Shallow Author agent 在 persona prompt 中明示「若本指標 < band.low 才考慮升 Medium → High」。

## Threshold

預設 band：

- **Low ≤ 3.0**：surface-only 風險高，Shallow agent 應重點檢視該章節是否僅描述「做了什麼」而未交代「為什麼這樣做才合理」。
- **Mid (3.0, 6.0]**：典型工程報告之 acceptable band；不主動 fire finding。
- **High > 6.0**：洞察密度足；若同時 readability-flesch 過低需平衡讀者負擔。

threshold 校準依據為 hw02 tutorial.zhTW.md post-fix（PASS baseline）之觀測值——該文 score 落於 5.8–6.4 區間。

## Why

prose-audit-skill v1.0 之 quantitative checks（mainland_vocab / placeholder / duplicate / citation / readability / lazy-writer）對 surface-only 風險覆蓋不足——一段話可以無大陸用語、無 placeholder、readability 達 textbook grade，但仍只是把演算法步驟複述一次而未交代設計理由。

archived spec（`openspec/specs/prose-audit-skill/spec.md`）已聲明 Shallow Author 為三 persona 之一，但缺少可機械化檢核之 metric。本指標補上該空缺：以三個 sub-signal 之 ordinal score 為 Shallow agent 提供 anchor，使其判讀有可重現基準，不流於純主觀。

此外，design.md 之「Findings schema 採 (ID, Severity, Section, Issue, Recommendation, Confidence) 六欄」決策要求每個 metric 有可追溯依據——本檔即為 insight-depth 之 audit trail。

## Limitations

**信號粗糙**：三 sub-signal 為 substring count + 句切分啟發式，對 markdown / typst 之 `cite()` 函式呼叫、math block、code block 之含意無語義理解；論文 method 章節之純技術描述會偏低 score，需在 prompt 中允許 Shallow agent 對 `# method` / `# 演算法設計` 章節適度放寬。

**對短文無意義**：< 500 字之段落 sub-signal 抽樣誤差大，建議僅對 H1 章節整體計算，不對單段落計算。

**非 deterministic check**：不同於 `mainland_vocab.py` 之嚴格 grep 規則，本指標僅作 advisory，Shallow agent 仍須自行讀文判斷；本檔之存在是為了讓 persona prompt 有 anchor，而非取代 agent 判讀。

**未實作為 standalone CLI**：v1.0 範圍內本指標僅為 rationale 文件供 Shallow agent prompt 引用，未實作為 `checks/insight_depth.py` script——若 v1.1 要將其加入 pre-flight 規則，需補實作並於 `prompts/shallow_agent.md` 明示「以本指標為 anchor」之語句。
