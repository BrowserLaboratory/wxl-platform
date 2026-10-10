---
title: 只是預覽而已
number: 8
layout: challenge
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: true
source_files: [ /templates/layout.html, /templates/index.html, /templates/detail.html, /templates/preview.html, /templates/_editor.html, /templates/missing.html, /static/app.css ]
date: 2026-09-06T09:23:32.337Z
tags: [ ssti, template-injection, jinja2, fastapi ]
description: 針對 Corvid Labs 內部 prompt 樣板庫的白箱滲透測試委託。樣板編輯器告訴撰寫者，算繪預覽是在一個受限的環境裡進行的。
wasmModule: /challenge/just-a-preview/runtime.wasm
---

# 只是預覽而已

**客戶：** Corvid Labs。他們的客服中心把第一線回覆交給語言模型處理。
**委託：** 針對內部 prompt 樣板庫、以及隨它一起出貨的頁面樣板做白箱評估。

## 測試範圍

範圍內：架在這個來源上的 Prompt Library、它對外開放的每一個 HTTP 端點，
以及掛進應用程式映像檔裡的樣板檔案。

這套樣板庫走的是 Corvid Labs 為這次委託開給你的內部網路。它自己沒有登入機制——
客服自動化輪值的所有人共用同一套，任何連得進來的人都能草擬樣板並算繪預覽。

範圍外：代管平台、接收成品 prompt 的那個語言模型、其他委託案，以及阻斷服務。

## 交戰規則

這是一場針對 Corvid Labs 自有系統、經過授權的演練。達成目標就停手——
Corvid Labs 付錢買的是影響力的證明，不是破壞。請待在上述範圍內。

Corvid Labs 為這次委託公開了應用程式原始碼與頁面樣板。請去讀它們。

## 委託目標

樣板編輯器告訴撰寫者，算繪預覽是在一個受限的環境裡進行的。Corvid Labs
就是憑這一句話，把語言模型擺到了客戶面前；平台團隊寧可從你這裡、
而不是從客戶那裡，聽到這句話到底成不成立。

請反證它：讓預覽把一個樣板庫根本不該讀得到的檔案內容交出來。`/flag.txt`
就放在應用程式的檔案系統上，而且沒有任何路由會提供它——
透過預覽把它取出來，就是 Corvid Labs 認可的影響力證明。
取得後在下方送出，以結束這次委託。

## 交付項目

Corvid Labs 要的不只是結果，還有你怎麼走到那一步的紀錄。請把每一個推進測試的請求
記在筆記面板裡，結束時匯出整份 session。
