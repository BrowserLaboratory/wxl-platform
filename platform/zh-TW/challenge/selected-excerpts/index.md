---
title: 精選節錄
number: 10
layout: challenge
difficulty: medium
category: web
backend: flask
app: app.py
packages: [ flask ]
tools: [ browser, network, repeater, code ]
source_visible: true
source_files: [ /templates/base.html, /templates/workbench.html, /templates/article.html, /templates/preview.html, /templates/course-pack.html, /templates/missing.html, /static/app.css ]
date: 2026-09-13T13:28:46.765Z
tags: [ idor, access-control, ssti, template-injection, jinja2, flask ]
description: 針對 Kestrel Press 教材選文編輯台的白箱滲透測試委託；投稿者在此編寫教材，課程編輯再將已選用的節錄組成講義。
wasmModule: /challenge/selected-excerpts/runtime.wasm
---

# 精選節錄

**客戶：** 獨立教育出版社 Kestrel Press。
**委託：** 對投稿者編輯台，以及由已選用節錄組成的講義預覽進行白箱評估。

## 測試範圍

範圍內：此來源所提供的教材選文編輯台、它公開的每一個 HTTP 端點，以及隨應用程式掛載的原始碼檔案。

你以一般投稿者 **Leah Navarro** 的身分進入。你可以編輯她的草稿，也可以查看課程團隊已選用的教材；你沒有編輯核可權，不能更改講義選文清單或出版社的頁面模板。

範圍外：本練習之外的 Kestrel Press 發布系統、其他投稿者的帳號，以及阻斷服務。

## 交戰規則

這是針對 Kestrel Press 控制系統的授權練習。取得需要說明問題的證據後便停止；不要更改選文清單，也不要破壞教材內容。

Kestrel Press 已公開本次評估所需的應用程式原始碼與頁面模板。請把它們和正在運作的編輯台一起閱讀。

## 委託目標

Kestrel Press 聲稱，只有課程編輯選用的內容才會影響講義預覽，而且投稿者撰寫的內容在整個過程中都只是一般稿件文字。

驗證這個承諾。確認投稿者是否能影響已選用的節錄，以及 Kestrel Press 組裝講義時，這個影響是否仍只是文字。Kestrel Press 接受的證據是 `/flag.txt` 的內容；正常頁面與原始碼檔案都不會提供它。

## 交付項目

`/flag.txt` 的內容、產生它的請求，以及到達它所需兩個獨立缺陷的說明。
