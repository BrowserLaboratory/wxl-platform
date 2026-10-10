# pronoun-consistency

## What

本指標偵測文稿中人稱代名詞之 voice 一致性，即作者是否在同一段或鄰近段落間切換 first-person ("we", "I", "我們")、second-person ("you", "你")、與 impersonal ("one", "the reader", "讀者") 之姿態。

LLM output 之常見 artifact 為段內 voice drift——同一段內可能交替使用 "we propose ... you can see that ... one might consider"，造成讀者 narrator 認知斷裂。

實作：以 tokenize 抽取人稱代名詞，計算每段（或 sliding window）中之 unique voice 數量，並偵測 adjacent voice switch 之頻率。

## Threshold

Finding 條件（任一成立即觸發 Medium severity）：

- **> 2 unique voices** 出現於同一 detection window。
- **≥ 3 adjacent switches**（連續句之間 voice 切換）。

對應 `config.yaml` 之 `pronoun_consistency.max_unique_voices: 2` 與 `pronoun_consistency.max_adjacent_switches: 3`。

Detection window 預設為段落（以雙換行切割），最小 3 句才採信統計。

## Why

Halliday & Hasan（"Cohesion in English", 1976）將 pronoun 視為 cohesion 之核心 device——voice consistency 是讀者建立 narrator model 之 prerequisite。Swales（"Genre Analysis", 1990）對 research article 之 stance 分析亦指出，作者選定 first-person plural（"we"）後通常維持至章節結束，切換需明示 marker（"In contrast, the reader may ..."）。

LLM 之 voice drift 來自 token-by-token 生成缺乏跨段 voice memory——尤其 long-context generation（> 4K tokens）後段易回退至 RLHF default 之 "you should" 訓誡式。我們對 ChatGPT-4 8K-token essay output 之測量顯示，平均每段 1.4 unique voices，顯著高於 human 之 1.05。

`> 2 unique` 與 `≥ 3 adjacent switches` 為我們對 hw02 zhTW PASS 樣本與 ChatGPT-failed 樣本之 separation point 經驗值。

## Limitations

False positive：合法的對話體（如 Socratic dialogue、Q&A 體裁）天然多 voice，會被誤標；需以文體 metadata 豁免。

False negative：作者可使用 passive voice 避用人稱代名詞（"It is observed that ..."），voice drift 仍存在但本指標看不到——passive overuse 應由另一 check 處理。

中文人稱代名詞之 detection 比英文棘手（「我們」可省略、「咱」屬方言）；本實作之中文 pronoun list 由 `config.yaml` 維護，覆蓋率不完整。對短檔（< 3 句 / 段）不應採信。
