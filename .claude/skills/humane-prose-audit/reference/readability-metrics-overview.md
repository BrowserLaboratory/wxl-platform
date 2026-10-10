# Readability Metrics Overview

本 skill 的 `readability_metrics.py`、`lexical_diversity.py`、以及 humane_signal scoring 之 lexical 維度，都建立在古典 readability 公式與當代 lexical diversity metric 上。本文整理本 skill 用到的指標、其依據、以及為什麼不用更新的工具。

## 古典 readability 公式

### Flesch Reading Ease（Flesch 1948）

```
FRE = 206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
```

值域 0–100，越高越易讀；70 以上是大眾文，30 以下是學術。本 skill 在 `readability_metrics.py` 中以 textstat 套件實作；profile 提供不同 acceptance band：

- academic：0–60（學術正常，但不要過深）
- blog：50–80
- technical-doc：40–70
- marketing：60–90
- general：30–80（最寬）

### Flesch-Kincaid Grade Level

```
FKGL = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59
```

對應美式教育年級。本 skill 在 `humanity_auditor` rubric 中用 FKGL 偵測 "grade-level whiplash"（同一文章內段落 FKGL 跳動過大，是 AI 拼接症狀之一）。

## Lexical diversity（MTLD，McCarthy & Jarvis 2010）

Measure of Textual Lexical Diversity。傳統 type-token ratio（TTR）受文長影響嚴重；MTLD 改用「文本中 TTR 衰減到閾值（0.72）所需的 token 數」的平均值，文長不敏感。

本 skill 在 `lexical_diversity.py` 實作 MTLD；humane_signal 中佔 0.15 權重。低 MTLD 對應 vocabulary 貧乏，是 LLM-generated 文本與機械翻譯的常見特徵。

## 為什麼不用更新的工具

### 不用 Coh-Metrix 全套

Coh-Metrix 提供 100+ 指標，但部署成本高（需要 stand-alone server 或 Web 版 API）且大量指標 redundant。本 skill 抽取其中 4 個最 robust 的指標納入 deterministic check，其餘留給 wiki concept page 作為背景知識。

### 不用 BERT-based readability classifier

近年（2020+）出現的 deep-learning readability classifier 在英文表現超越古典公式，但：

- cross-language（特別是中文）覆蓋差
- 不可解釋（作者收到 finding 不知道改哪裡）
- model-specific，違反本 skill cross-model 一致性承諾

### 不依賴 commercial readability tool

GPTZero / Originality.ai 等商業 detector 是 black box，無法 audit。本 skill 走 fully open、deterministic、可解釋路線。

## 本 skill 用到的指標總表

| 指標                  | 實作                            | humane_signal 權重 | 適用語言   |
| --------------------- | ------------------------------- | ------------------- | ---------- |
| Flesch Reading Ease   | `checks/readability_metrics.py` | 不直接進 score      | 英文       |
| Flesch-Kincaid Grade  | `checks/readability_metrics.py` | 不直接進 score      | 英文       |
| MTLD                  | `checks/lexical_diversity.py`   | 0.15                | 英中混排   |
| Burstiness            | `checks/burstiness.py`          | 0.30                | 全語系     |
| AI-tells density      | `checks/ai_tells.py`            | 0.20                | 英中混排   |
| Imperative-fog        | `checks/imperative_fog.py`      | 0.20                | 英中混排   |
| Boilerplate stamp     | `checks/lazy_writer_check.py`   | 0.15                | 英中混排   |
| Hedge density         | `checks/hedge_density.py`       | 不直接進 score      | 英中混排   |
| Discourse markers     | `checks/discourse_marker_density.py` | 不直接進 score | 英中混排   |
| Pronoun consistency   | `checks/pronoun_consistency.py` | 不直接進 score      | 英中混排   |
| Repetition fingerprint| `checks/repetition_fingerprint.py` | 不直接進 score   | 全語系     |

詳見 `wiki/concepts/readability-and-style/` 四個概念頁。
