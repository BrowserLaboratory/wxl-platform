---
title: 僅限員工
number: 2
layout: challenge
difficulty: easy
category: web
backend: flask
app: app.py
packages: [ flask ]
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-08-17T16:21:14.557Z
tags: [ sql, injection, flask, sqlite ]
description: 針對 Corkboard 的黑箱滲透測試委託。這套內部公佈欄系統宣稱，管理後台只有帶著管理者旗標的帳號打得開。
wasmModule: /challenge/staff-only/runtime.wasm
---

# 僅限員工

**委託單位：** Corkboard，一間中型企業自行架設給全體員工使用的內部公佈欄系統。
**委託項目：** Corkboard 網頁應用程式的黑箱滲透測試。

## 測試範圍

範圍內：本次來源（origin）底下的 Corkboard 應用程式，以及它對外開放的每一個
HTTP 端點。

Corkboard 為本次委託配發給你一組員工帳號——員工代號 `j.kerr`，密碼
`Aut2026!`。這是一個沒有任何額外權限的普通帳號，也是你手上唯一的憑證。

範圍外：承載平台、其他委託案，以及阻斷服務。

## 交戰規則

這是一次獲得授權的演練，標的系統由 Corkboard 自行掌控。達成目標後即停手——
Corkboard 買的是「確實造成影響」的證明，不是破壞。你所做的任何更動，請限縮在
達成目標所必需的範圍內，並待在上述範圍中。

本次委託 Corkboard 沒有提供應用程式的原始碼。請以系統實際的回應為依據。

## 限制條件

Corkboard 買的不是密碼強度稽核。猜測、噴灑或暴力破解憑證都在範圍外，以此為
基礎的成果不予採認。他們要的那個發現，是應用程式自己交到你手上的。

## 委託目標

Corkboard 對員工宣稱兩件事。同事的資料只屬於同事自己——個人資料編輯頁打開的
永遠是你本人的那一筆，不會是別人的。以及，管理後台只對帶著管理者旗標的帳號
開放，所以配發給你的這個帳號永遠碰不到它。

這兩句話都是承重牆，而 Corkboard 自家團隊已經不敢為第一句話背書。

請推翻它們：從上面那個普通員工帳號出發，進到管理後台，取回它保管的部署復原
金鑰。那把金鑰就是 Corkboard 認可的影響證明。請在下方送出，結案。

## 交付項目

Corkboard 要的不只是結果，還有你怎麼走到那一步的紀錄。請把每一個推進測試的
請求記在筆記面板裡，結束時匯出整份 session。
