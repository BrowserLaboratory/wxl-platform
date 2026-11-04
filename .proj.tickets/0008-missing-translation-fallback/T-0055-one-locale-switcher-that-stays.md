---
id: T-0055
title: One locale switcher on every page, which stays on the page when the chosen locale has no version
epic: 0008-missing-translation-fallback
status: todo
blocked_by: [T-0054]
---

## Context

Default-theme pages use VitePress's built-in translation menus, which link straight to the
counterpart without asking whether it exists; on the production reference page, choosing 繁體中文
gives a 404. There are three of them, one per width range. The challenge pages' `LocaleSwitcher`
navigates unconditionally too. This ticket makes `LocaleSwitcher` the only menu on every page and
makes it stay, with the line, when the chosen locale has no version (U3, U10).

Spec: `spec.en.md` revision 3, "Locale routing" (the switcher bullet), "One locale switcher",
"Writing the preference"; `traceability.md` revision 3, decisions D7, D14, D17, rows B1–B7, W1, W6,
and the overridden contracts for the switcher's menu, its runtime-locale change and the flag. Blocked
by T-0054, which changes the same routing module and the preference writes this ticket builds on.

## Deliverable

`USE_CUSTOM_LOCALE_SWITCHER` is on and all three built-in translation menus are hidden by CSS that
works without scripts. Choosing a locale always writes it (in memory for the tab when storage cannot
be written); the switcher navigates only to a counterpart that is a published page, and otherwise
stays, adds no history entry, keeps the URL and interface locale, and shows the line at once in the
chosen locale. While the line shows, the menu also offers the page's own locale as the way back. On
the not-found page it navigates to an existing counterpart or only writes the choice.

## Acceptance criteria

> Note: D7 itself — `LocaleSwitcher` on every page, the flag removed, the three built-in menus hidden without a script — landed with T-0053 (U14, 2026-11-05). What remains here is the switcher's behaviour below.

- [ ] B1–B7: navigate or stay; no history entry; interface locale unchanged; the line at once, also before the gate decides; menu title and one or two options; the way back; storage that cannot be written; the not-found page; `MergedNav` and the default-theme nav bar; both bases (AC-3)
- [ ] W1, W6: every choice writes; storage that cannot be written never throws and the choice holds for the tab (AC-11)
- [ ] L1 exercised for switcher choices (AC-5)
- [ ] H1b (this ticket's part): `LocaleSwitcher`'s menu and runtime-locale comments, the `USE_CUSTOM_LOCALE_SWITCHER` comment and the hiding rule's comment state D7 and B5 (AC-9)
- [ ] H3 (this ticket's part): troubleshooting's passages on switching locale and the traffic log, on the switcher navigating to the other locale's URL; the guide index's sentence on the Network log; `guide/network.md`'s sentence; both languages (AC-9)
- [ ] H7 (AC-9)
- [ ] Overridden contracts touched here (the switcher's menu, `select` and its early return, its runtime-locale change, the flag comment, the hiding rule) change only as the traceability table states
- [ ] Stage 8 (T4): V3 at 1280, 1024 and 375 wide, including the static HTML with scripts disabled, and V1l with the Browser panel open, on the Cloudflare preview of `stage8/T-0055` (AC-10)

## 給使用者（zh-TW）

讓每一頁都只剩下自訂的語系選單，VitePress 內建的三個翻譯選單（寬螢幕、中等寬度的「…」選單、手機選單）全部隱藏，連 JavaScript 還沒載入時也看不到。選了某個語系，如果這一頁有那個語系的版本就過去；沒有就留在原頁，顯示提示那一行，並記住選擇。提示顯示時，選單會多一個「回到頁面本身語系」的選項。瀏覽器不能存資料時，選擇記在這個分頁裡。

## Comments
