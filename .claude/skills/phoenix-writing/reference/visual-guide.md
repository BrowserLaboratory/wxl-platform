# Visual Guide — 視覺內容系統參考指南

本檔案提供 SKILL.md Section 9 視覺內容系統的完整範例、風格前綴庫、prompt 撰寫指引、以及視覺類型選擇指南。

---

## 1. Markdown Format — Complete Worked Example

以下是一篇文章節錄，展示 3 張圖片的完整視覺規格格式。

### 風格前綴定義

```markdown
<!-- VISUAL-STYLE-PREFIX: flat vector illustration, bold outlines, limited color palette of teal and coral, manga-influenced, humorous tone, Traditional Chinese text elements -->
```

### 文章正文（節錄）

```markdown
## 什麼是社交工程？

你有沒有接過一通電話，對方自稱是「XX銀行客服」，然後用超級專業的語氣問你：「先生/小姐，我們偵測到您的帳戶有異常交易，需要確認您的身分...」？

![圖1：假冒銀行客服打電話給受害者的四格漫畫，受害者從懷疑到慌張到交出資料（AI 製圖）](fig01.png "[風格前綴], 4-panel comic strip, fake bank customer service calling a victim, panel 1: phone rings with suspicious caller, panel 2: victim looking doubtful, panel 3: scammer using urgent professional tone, panel 4: victim nervously typing personal info on keyboard with sweat drops")

如圖 1 所示，社交工程的核心不是技術漏洞，而是人性漏洞。

「老師，這跟駭客有什麼關係？駭客不是應該在電腦前面瘋狂打字嗎？」

好問題 ʅ（´◔౪◔）ʃ 其實，社交工程是許多重大資安事件的第一步。讓我們來看看它的運作原理。

![圖2：社交工程攻擊鏈流程圖，從資訊蒐集到建立信任到誘騙到利用（AI 製圖）](fig02.png "[風格前綴], flowchart diagram showing social engineering attack chain, 4 connected nodes: information gathering with magnifying glass icon, building trust with handshake icon, deception with mask icon, exploitation with key icon, arrows connecting left to right, clean professional layout")

從圖 2 可以看到，社交工程其實是一個有系統的過程，不是隨便亂打電話就行的。

還記得小時候，你媽叫你不要跟陌生人說話嗎？這其實就是最基本的反社交工程訓練（笑）。

![圖3：小孩被媽媽警告「不要跟陌生人說話」的情境插圖，旁邊的陌生人拿著糖果（AI 製圖）](fig03.png "[風格前綴], illustration of a mother warning her child not to talk to strangers, child looking up innocently, suspicious stranger offering candy with a sneaky grin, park setting with warm sunlight, relatable daily-life scene")

（如果你到現在還是會跟陌生人說話... 嗯，那你可能比較適合當社交工程的目標 ╮(╯_╰)╭ ）

---
## Image Specification Appendix

### 圖 1
- **類型**：四格漫畫（Hook）
- **意圖**：以搞笑方式呈現電話詐騙的典型流程，吸引讀者進入社交工程主題
- **完整 Prompt**：flat vector illustration, bold outlines, limited color palette of teal and coral, manga-influenced, humorous tone, Traditional Chinese text elements, 4-panel comic strip, fake bank customer service calling a victim, panel 1: phone rings with suspicious caller, panel 2: victim looking doubtful, panel 3: scammer using urgent professional tone, panel 4: victim nervously typing personal info on keyboard with sweat drops
- **備註**：四格分鏡需有明確敘事弧線（起→疑→急→上當）

### 圖 2
- **類型**：流程圖（Deep-dive）
- **意圖**：以視覺化方式呈現社交工程的四階段攻擊鏈，幫助讀者建立系統性理解
- **完整 Prompt**：flat vector illustration, bold outlines, limited color palette of teal and coral, manga-influenced, humorous tone, Traditional Chinese text elements, flowchart diagram showing social engineering attack chain, 4 connected nodes: information gathering with magnifying glass icon, building trust with handshake icon, deception with mask icon, exploitation with key icon, arrows connecting left to right, clean professional layout
- **備註**：保持專業清晰風格，此處不適合搞笑元素

### 圖 3
- **類型**：情境插圖（Analogy）
- **意圖**：用童年經驗類比社交工程防禦，拉近讀者與技術概念的距離
- **完整 Prompt**：flat vector illustration, bold outlines, limited color palette of teal and coral, manga-influenced, humorous tone, Traditional Chinese text elements, illustration of a mother warning her child not to talk to strangers, child looking up innocently, suspicious stranger offering candy with a sneaky grin, park setting with warm sunlight, relatable daily-life scene
- **備註**：溫馨但帶點幽默，陌生人的表情要略顯可疑但不恐怖
```

---

## 2. DOCX Format — Complete Worked Example

以下展示 DOCX 格式中 2 張圖片的視覺規格呈現方式。

### 視覺風格定義表（放在文件開頭）

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 視覺風格定義                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 風格前綴：watercolor digital painting, soft edges, pastel        │
│ palette of lavender and mint, whimsical, educational tone,      │
│ gentle character designs                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 文章正文圖片預留區範例

**圖 1：**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📷 圖片預留區                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 圖 1：DNA 雙螺旋被拉鏈拉開的概念圖，展示基因轉錄過程（AI 製圖）      │
│ 類型：概念圖（Explanation） ｜ 風格：簡潔/資訊性                      │
├─────────────────────────────────────────────────────────────────┤
│ Prompt: watercolor digital painting, soft edges, pastel palette │
│ of lavender and mint, whimsical, educational tone, gentle       │
│ character designs, DNA double helix being unzipped like a       │
│ zipper, showing gene transcription process, RNA polymerase as   │
│ a cute character pulling the zipper, nucleotides floating       │
│ nearby, clean educational layout                                │
└─────────────────────────────────────────────────────────────────┘
```

**圖 2：**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📷 圖片預留區                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 圖 2：小廚師按照食譜做菜的插圖，類比蛋白質合成過程（AI 製圖）         │
│ 類型：情境插圖（Analogy） ｜ 風格：親切/生活化                       │
├─────────────────────────────────────────────────────────────────┤
│ Prompt: watercolor digital painting, soft edges, pastel palette │
│ of lavender and mint, whimsical, educational tone, gentle       │
│ character designs, cute chef character following a recipe book,  │
│ ingredients labeled as amino acids, recipe book labeled as mRNA,│
│ finished dish labeled as protein, kitchen setting, warm and     │
│ inviting atmosphere                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Style Prefix Library (風格前綴庫)

### 輕鬆搞笑（Lighthearted / Humorous）

```
flat vector illustration, bold outlines, limited color palette, manga-influenced, humorous tone, exaggerated expressions, chibi-style characters, Traditional Chinese text elements
```

**適用場景：** 資安入門、駭客文化介紹、日常生活類比重的文章。適合大量使用 Hook 和 Analogy 視覺類型的章節。

### 嚴肅專業（Serious / Professional）

```
clean technical illustration, minimal color palette of navy and white, precise linework, blueprint-style layout, professional infographic aesthetic, no decorative elements
```

**適用場景：** 密碼學原理、網路協議分析、系統架構深入探討。適合 Deep-dive 和 Tutorial 視覺類型為主的章節。

### 復古敘事（Retro / Narrative）

```
retro-styled digital illustration, muted earth tones with sepia accents, vintage texture overlay, hand-drawn feel, nostalgic atmosphere, period-appropriate details
```

**適用場景：** 歷史回溯（如駭客文化起源、密碼學歷史）、「時光機」段落。適合 Narrative 視覺類型為主的章節。

### 教育友善（Educational / Friendly）

```
watercolor digital painting, soft edges, pastel palette, whimsical, educational tone, gentle character designs, approachable and warm
```

**適用場景：** 給完全初學者的入門文章、科學原理解說、較少技術細節的概念性章節。適合 Explanation 和 Recap 視覺類型為主的章節。

---

## 4. Prompt Writing Guide (Prompt 撰寫指南)

### Prompt 結構

一個好的 text-to-image prompt 應包含以下要素（按順序）：

```
[風格前綴], [主體描述], [情境/背景], [情緒/氛圍], [技術規格（可選）]
```

1. **主體（Subject）**— 圖片中的主要物件或角色
2. **情境（Context）**— 場景、背景、環境設定
3. **風格（Style）**— 由風格前綴統一處理
4. **情緒（Mood）**— 整體氛圍和情感基調
5. **技術規格（Technical）**— 構圖、視角、佈局等（需要時才加）

### Good Prompt 範例

**範例 1 — Hook 類型（四格漫畫）：**
```
[風格前綴], 4-panel comic strip, office worker accidentally sending confidential email to entire company, panel 1: typing email casually, panel 2: clicking send with confident smile, panel 3: noticing "To: All" with wide eyes, panel 4: diving under desk in panic with papers flying
```
- 有明確的敘事弧線（起承轉合）
- 每格描述具體動作和表情
- 情緒變化清晰

**範例 2 — Deep-dive 類型（架構圖）：**
```
[風格前綴], network architecture diagram showing three-tier web application security, client layer with browser icon, application layer with server and WAF shield, database layer with lock icon, arrows showing request flow, labeled zones: DMZ and internal network, clean technical layout
```
- 明確描述每個元素及其圖示
- 指定元素間的關係（箭頭、流向）
- 要求 clean layout 確保可讀性

**範例 3 — Analogy 類型（情境插圖）：**
```
[風格前綴], illustration comparing password security to house locks, left side: flimsy padlock on a mansion gate labeled "password123", right side: high-tech vault door on same mansion labeled "Kj#9xM!2pQ", humorous contrast, warm neighborhood background
```
- 類比關係清晰（密碼 = 鎖）
- 對比元素明確
- 幽默元素自然融入

### Bad Prompt 範例

**Bad 1：太模糊**
```
a picture about cybersecurity
```
- 問題：沒有具體主體、沒有情境、沒有風格
- 改進：`[風格前綴], illustration of a hacker sitting in a dark room illuminated only by multiple monitor screens showing code, wearing a hoodie, surrounded by empty coffee cups, focused expression`

**Bad 2：太冗長且矛盾**
```
a beautiful stunning amazing incredible gorgeous illustration of a very cute adorable kawaii chibi character who is a serious professional cybersecurity expert in a dark moody atmosphere but also bright and cheerful
```
- 問題：形容詞堆疊、風格矛盾（cute + serious、dark + cheerful）
- 改進：`[風格前綴], chibi-style cybersecurity analyst at workstation, concentrated expression with slight smile, dim monitor glow lighting, cozy atmosphere`

**Bad 3：缺乏視覺可執行性**
```
the concept of zero trust security architecture and its implications for modern enterprise infrastructure
```
- 問題：描述的是抽象概念，不是視覺畫面
- 改進：`[風格前綴], diagram of zero trust architecture, castle with multiple checkpoints instead of single moat, each door requiring badge scan, guards at every room entrance, contrasted with traditional castle with only outer wall, split-view comparison layout`

---

## 5. Visual Type Selection Flowchart (視覺類型選擇指南)

根據當前段落的寫作功能，選擇正確的視覺類型：

```
你正在寫什麼？
│
├─ 章節開場 / 吸引注意
│   └─→ Hook（四格漫畫、迷因圖、地獄梗插圖）
│
├─ 解釋一個概念或原理
│   ├─ 用生活場景類比？
│   │   └─→ Analogy（情境插圖、生活場景圖）
│   └─ 用圖表直接解說？
│       └─→ Explanation（概念圖、對比圖、示意圖）
│
├─ 講述歷史或背景故事
│   └─→ Narrative（歷史場景圖、時間線圖）
│
├─ 深入技術細節
│   └─→ Deep-dive（架構圖、流程圖、序列圖）
│
├─ 警告讀者注意風險
│   └─→ Warning（警示情境圖）
│       ⚠️ 此處禁用搞笑風格！
│
├─ 教讀者一步步操作
│   └─→ Tutorial（操作截圖、步驟標註圖）
│
└─ 總結回顧 / 章末整理
    └─→ Recap（資訊圖表、摘要圖）
```

**決策原則：**
- 以段落的**功能**（而非內容主題）決定視覺類型
- 同一 H2 section 內盡量使用**不同**視覺類型（避免連續 3 次相同）
- 搞笑元素只在 Hook 和 Analogy 中使用
- 如果一個段落同時可歸類為兩種，選擇**更具體**的那個（例如：用生活類比解釋概念 → 選 Analogy 而非 Explanation）
