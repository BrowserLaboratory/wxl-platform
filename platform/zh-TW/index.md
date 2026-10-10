---
layout: home

hero:
  name: "WXL"
  text: "網站滲透實驗室"
  tagline: 完全基於前端 WASM 的 Web 資安挑戰平台 — 無需後端、即開即練
  image:
    light: /wxl-hero-light.svg
    dark: /wxl-hero-dark.svg
    alt: Web eXploitation Laboratory
  actions:
    - theme: brand
      text: 開始挑戰
      link: /zh-TW/challenges/
    - theme: alt
      text: 使用指南
      link: /zh-TW/guide/

features:
  - icon:
      src: /icons/browser.svg
      wrap: true
    title: 瀏覽器模擬器
    details: 內建 iframe sandbox，直接與挑戰應用程式互動
  - icon:
      src: /icons/code.svg
      wrap: true
    title: Code Editor (Pyodide)
    details: Python 攻擊腳本編輯器，支援 requests 模組與自動化攻擊
  - icon:
      src: /icons/repeater.svg
      wrap: true
    title: HTTP Repeater
    details: 攔截並重放 HTTP 請求，自由修改參數測試漏洞
  - icon:
      src: /icons/network.svg
      wrap: true
    title: Network Traffic Log
    details: 完整記錄所有工具面板的 HTTP 請求與回應，含狀態碼與計時
  - icon:
      src: /icons/notes.svg
      wrap: true
    title: 滲透測試筆記
    details: Markdown 筆記系統，自動記錄操作歷程，可匯出完整攻擊記錄
---

<script setup>
import { data } from '../shared/challenges.zh-TW.data.ts'
</script>

<HomeContent :challenges="data" />
