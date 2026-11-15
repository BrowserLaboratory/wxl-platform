---
id: T-0081
title: The upgrade moves a legacy-layout range
epic: 0010-primary-locale-layout
status: todo
blocked_by: [T-0076, T-0077, T-0080]
---

## Context

After T-0077 upstream is in the new layout, and a range still in the legacy layout cannot build. A
teacher who upgrades with `pnpm range:upgrade` gets the layout move done by the upgrade (T4): it
decides by content whether the teacher's range and the base are in the legacy layout (D91, D92,
D100), transforms the base physically into B′ at the end of step 7 (D93), plans the teacher's move
in 8a (U-§4 discovery, D125, D139, D142; range checks RC1–RC6), runs 0006's three-way merge on B′, o′
and T (D94), applies moves with deletions then writes (D101–D103), records `primaryLocale: "en"` only
when all three of D105's conditions hold: the run is crossing (from a legacy-layout upstream
version), it moves the teacher's range (the range was still on the legacy layout), and the range's
`range.json` has no own `primaryLocale` key yet (U90–U94, U140; U135), reports the moves in report R6 and
introduced declaration mismatches as UP-A16 (D104, D106, D120), and stops before writing with
UP-E14 on every condition D96–D100 names. The restore commands and signals keep 0006's AC-11. It
uses T-0076's `planLayoutMove` and the new-layout targets T-0077's tree produces.

It also carries what describes the move: U135's two GLOSSARY sentences (設定紀錄 and 搬家, N17; B90
leaves them to this ticket, K-9) and the READMEs' upgrade section (U137). As the epic's last ticket
by id it carries the close-out documents B88 (OQ-024 closed) and B89 (the release-note input), as
0008's T-0057 carried its close-out; if another ticket of the epic lands after it, those two move to
that ticket with a Comments entry. They are area B rows, so the ticket holding them when it lands is
area B's last ticket if it lands after T-0080 (T8): it then runs the V-B table, V-B1–V-B7, in full
as T-0080's Stage 8 lists them. No V-B row reaches B88 or B89; V-U5 cites B89 (and T-0077's B84)
and runs here.

Stage 8 is area U's: a range made by the published `create-wxl@3.0.0` with a teacher's own challenge,
upgraded with the tarball packed from this ticket's pushed head A (`CREATE_WXL_COMMIT=<A>`), and
forks without `range.json` (D111). The surfaces override the preview-deployment rule as 0006 did
(0010-S51, 0010-S52): the result of an upgrade is a local tree. Publishing create-wxl is not part of
this epic (R31).

**Decisions to confirm before implementing:** D96, D100, D102, D105 (narrowed in the self-check to a
crossing run that moves the teacher's range), D106, D109, D120, D125, D139, D142; and the base-side
UP-E14 lines without the token's sentence (U-§4, from the self-check).

Spec: `spec.en.md` revision 2, AC-44, AC-46–AC-52, AC-54, AC-60, and AC-10's close-out rows;
`traceability.md` revision 2, D91–D112, D120, D125, D139, D142, constraint T4, U-§1, U-§4 (step
order, discovery, split and range checks, codes, canonical sentences, report, `range.json`),
"Overridden contracts › Area U", "Trust boundaries › Area U", "Stage 8 plan › Area U"; 0006's
traceability for the rows it amends.

## Deliverable

`pnpm range:upgrade` on a legacy-layout range moves every legacy page into the English locale
folder, splits each English brief into its brief and `challenge.yaml`, strips the declaration keys
from translation briefs, merges upstream's changes at the new paths, writes `primaryLocale: "en"`
when the run is crossing, moves the teacher's range and finds no own `primaryLocale` key in its
`range.json`, lists every move in report R6 and every introduced mismatch as UP-A16, exits 0, and is
undone exactly by the restore commands; every stop happens before anything is written.

## Acceptance criteria

- [ ] U1–U10, U13, U151: when the move happens, for each layout of the teacher's range, B and T;
  UP-I01 and the version stops before any move; `target-layout` (AC-44, AC-47, AC-49, AC-51; U11 is
  T-0076's)
- [ ] U32: moved and declared files' modes (AC-48)
- [ ] U40–U46, U48, U49: UP-A16 exactly for introduced mismatches, sorted and escaped (AC-46,
  AC-50; U47 is T-0076's)
- [ ] U50–U63, U144, U148, U153, U154: every UP-E14 stop of the range and base sides, UP-E11 and
  CW-E14 instead where a read or git command fails, excluded areas untouched (AC-47; U12, U25,
  U27–U29 are T-0076's)
- [ ] U70–U85, U149: P-2 and 0006 M5–M12 at the destinations, 0006 U17's branches unchanged (AC-48)
- [ ] U90–U94, U140, U143: `range.json` after a crossing and a non-crossing run (AC-49)
- [ ] U64, U100–U108, U138: report R6, report R2 without moves, the R4 crossing lines, both
  languages, `UP_ARGS` (AC-50)
- [ ] U110, U111: UP-A12 in a crossing run, none from the old home page (AC-51, which this ticket
  closes; U112–U116, U145, U152 are T-0077's)
- [ ] U120–U124: the restore commands and signals after a moved run (AC-52)
- [ ] U135, U137: the GLOSSARY's 設定紀錄 and 搬家 state D105's three conditions; the READMEs'
  upgrade section (AC-54)
- [ ] B88, B89: OQ-024 closed and the release-note input, at the epic's close-out (AC-10, which this
  ticket closes; B84–B87 and B90 are T-0077's)
- [ ] V-U1–V-U5 (AC-60), as below
- [ ] "Overridden contracts › Area U", except the `ANCHOR_PATHS` and `PLATFORM_HOME_RELS` rows
  (T-0077's), change only as stated; every existing `upgrade-*.test.mjs` case passes unchanged
  except the fixtures of 0006 U21, 0006 U24 and 0006 U69 that the table names

## Stage 8

Area U's V table in full, V-U1–V-U5, with A the pushed head of this ticket's branch (codeload serves
`CREATE_WXL_COMMIT=<A>`) and the tarball from `npm pack` at A: V-U1, V-U2, V-U4 and V-U5 in the
terminal (0010-S51) on F-4 `rel` and F-5 `fork` and `fork0`; V-U3 in the Browser panel on F-4 built
and served locally (0010-S52), challenge pages with the panel open. Before: `v3.0.0^{commit}` and
`v3.1.1^{commit}` recorded. Not run (R31): `pnpm range:upgrade` through the registry. V-U1–V-U5
also observe T-0077's S51, S52, A12, A16 and B84, which T-0077 cannot run before this ticket's move
(tickets.md, T8 check). If this ticket lands after T-0080 while it holds B88 and B89, it also runs
V-B1–V-B7 in full (Context). Pushing the
branch needs the user's approval first; the temporary ranges are deleted afterwards.

## 給使用者（zh-TW）

T-0077 之後上游已是新版面，還在舊版面的靶場建置不起來。這張票讓 `pnpm range:upgrade` 替老師搬家（T4）：看檔案判斷老師的靶場與上游舊版是不是舊版面；把上游舊版先搬成新版面再做三方合併；把老師的英文頁面移進 `platform/en/`、從英文說明頁抽出題目宣告寫成 `challenge.yaml`、刪掉翻譯說明頁裡的宣告欄位；只有三個條件都成立時才在設定紀錄記下主語系 `en`：從舊版面的上游版本升級、老師的靶場還在舊版面而真的搬了家、而且設定紀錄還沒記主語系；報告多一段 R6 列出所有搬家，翻譯與英文宣告不一致時列 UP-A16；遇到無法安全搬家的情況，在寫入任何檔案之前以 UP-E14 停下。還原指令與訊號處理維持 0006 的保證。GLOSSARY 的設定紀錄與搬家兩句、README 的升級段落也在這張票改；它是這個 epic 票號最大的一張票，所以也帶 epic 收尾的 OQ-024 結案與 release note 素材；如果有別張票比它晚合併，這兩列就移到那張票。帶著這兩列的票如果比 T-0080 晚合併，它就是建置區最後一張票，第 8 階段要再把 V-B1–V-B7 全部跑一次。第 8 階段用已發布的 `create-wxl@3.0.0` 建一個帶老師自己題目的靶場，再用這張票推上去的 commit 打包升級，另外測兩個沒有 `range.json` 的 fork；推分支前會先問你。要確認的決策：D96、D100、D102、D105、D106、D109、D120、D125、D139、D142。

## Comments
