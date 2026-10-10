---
title: 知的必要
number: 1
layout: challenge
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-04-02T08:54:17.674Z
tags: [ idor, access-control, fastapi, sqlite ]
description: 針對 FileHub 的黑箱滲透測試委託。這家檔案分享服務在產品頁上保證，某個帳號上傳的檔案只有該帳號讀得到。
wasmModule: /challenge/door-is-open/runtime.wasm
---

# 知的必要

**委託單位：** FileHub，一家提供小型團隊使用的檔案分享服務。
**委託項目：** FileHub 網頁應用程式的黑箱滲透測試。

## 測試範圍

範圍內：本次來源（origin）底下的 FileHub 應用程式，以及它對外開放的每一個 HTTP 端點。

FileHub 為本次委託配發給你一組帳號——帳號 `guest`，密碼 `guest`。這是一個沒有任何
額外權限的普通帳號，也是你手上唯一的憑證。

範圍外：承載平台、其他委託案，以及阻斷服務。

## 交戰規則

這是一次獲得授權的演練，標的系統由 FileHub 自行掌控。達成目標後即停手——
FileHub 買的是「確實造成影響」的證明，不是破壞。請保持既有資料完整，並待在上述範圍內。

本次委託 FileHub 沒有提供應用程式的原始碼。請以系統實際的回應為依據。

## 委託目標

FileHub 在產品頁上保證，某個帳號上傳的檔案只有該帳號讀得到。FileHub 自家的
工程師已經不相信這句話。

請推翻這項保證：取得一份不屬於你的帳號的檔案內容。管理者把一份憑證存放在他的
私人檔案裡，取回那份內容就是 FileHub 認可的影響證明。請在下方送出，結案。

## 交付項目

FileHub 要的不只是結果，還有你怎麼走到那一步的紀錄。請把每一個推進測試的請求
記在筆記面板裡，結束時匯出整份 session。
