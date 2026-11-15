# Tickets: 0010-primary-locale-layout

Stage 4's breakdown of spec 0010 revision 2 (`spec.en.md`, `traceability.md`, both of 2026-11-15,
read in the working tree at `main` `65de8c0`), approved under the user's standing authorization of
2026-11-15. The claim table maps every row id of `traceability.md` (matrix, the A-§4.1 and A-§4.3
tables, and the stage 8 tables) and every acceptance criterion to exactly one ticket. A row that
reaches two ACs (the index's list) is still claimed by one ticket.

## The breakdown

| Ticket | Title | Blocked by | File |
|---|---|---|---|
| T-0076 | Pure modules and the layout-move planner | — | `.proj.tickets/0010-primary-locale-layout/T-0076-pure-modules-and-layout-move-planner.md` |
| T-0077 | The layout switch | T-0076 | `…/T-0077-layout-switch.md` |
| T-0078 | The hook handles a cached-only removal and names an untracked tree | T-0077 | `…/T-0078-hook-cached-removal-and-untracked-tree.md` |
| T-0079 | Every Traditional Chinese list string is right in static HTML and after hydration | T-0077 | `…/T-0079-list-strings-static-and-hydrated.md` |
| T-0080 | The Traditional Chinese reference page and the completeness test | T-0077 | `…/T-0080-zh-tw-reference-page-and-completeness-test.md` |
| T-0081 | The upgrade moves a legacy-layout range | T-0076, T-0077 | `…/T-0081-upgrade-moves-legacy-range.md` |

Amended in epic 0008's folder on 2026-11-15 (all three stay `pending`):

| Ticket | Change |
|---|---|
| T-0058 | Comments entry: scope taken whole by T-0078 (D72, S50); `revisit_when: "When T-0078 lands."` |
| T-0059 | Comments entry: scope taken whole by T-0077 (D72, S51); `revisit_when: "When T-0077 lands."` |
| T-0060 | Comments entry: replaced by T-0079 (D55, D134); `revisit_when` names T-0079 and the `done` step D134 states |

## How the table was made

The row list is generated, not typed: every table line of `traceability.md` whose first cell is a row
id, between `## Matrix` and `## Integration notes` (the matrix and the stage 8 tables, fixtures F-1–F-6
left out because they are fixtures, not rows), plus every `DT` and `SW` line of A-§4.1 and A-§4.3.
The AC column is computed from "Acceptance criteria index" by expanding its ranges. Result: 648 rows,
each reaching at least one AC; 61 ACs. Rows under two ACs (U2, U3, U9, U151, U27, U48, U82, U94,
and DT17–DT40 and DT57–DT80, which reach AC-13 through A14–A17 as the index's note says) show both;
the DT rows are all T-0077's.

Regenerate the row list with:

```sh
awk '/^## Matrix/,/^## Integration notes/' traceability.md \
  | grep -oE '^\| *[A-Z][A-Za-z]*-?[A-Z]?[0-9]+[a-z]? *\|' | tr -d '| ' | grep -v '^F-'
grep -oE '^\| *(DT|SW)[0-9]+ *\|' traceability.md | tr -d '| '
```

Claim rules, applied in this order:

1. **T-0076** claims a row only when every seam it names is a pure function of T2 or T3
   (`readPrimaryLocale`, the locale list module, `readChallengeDeclaration`,
   `validateChallengeDeclaration`, `planLayoutMove`). A row that also names the validation CLI
   (0010-S34), assembly (0010-S33), keygen or the upgrade run (0010-S44) goes to the ticket that brings
   that seam, even when its pure half could be tested in T-0076. One edge: U150's criterion ends with
   "the next build fails with PL-E09 naming both (B31)", a build seam; T-0076 tests U150's planner
   half (the two `move` ops, no `failures`), and the build clause is observed through B31 in T-0077.
2. **T-0078** claims S50 (T-0058, D72) and, as area S's last ticket (T8), V-S1–V-S7.
3. **T-0079** claims T-0060's widened scope (L23–L28, L30–L33, L45, L46; T6), L44 (LH1–LH5, the
   stage 6 confirmation; T-0079 writes LH1's list-title row, T-0077 writes LH1's difficulty-badge
   clause, LH2, LH3 and LH4), and VL1–VL9, which its rows reach (VL1, VL2, VL4, VL9). Area L's last
   ticket is whichever of T-0079 and T-0080 lands second (see the T8 check).
4. **T-0080** claims D51's and D52's rows (L40, L42), D16's link rows (L41, B71, B78), and
   V-B1–V-B7, which its row B71 reaches (V-B3, V-B4). B71's plugin half (no PL-E11 for a same-folder
   link) tests T-0077's link plugin (0010-S6), which exists when T-0080 starts. Area B's last ticket
   is whichever of T-0080 and the holder of B88 and B89 lands second (see the T8 check).
5. **T-0081** claims every area U row not named in rule 1 or 6, the close-out documents B88 and B89,
   and V-U1–V-U5 (T4).
6. **T-0077** claims everything else, including area U's U112–U116, U145, U152 (T1: `ANCHOR_PATHS`,
   `PLATFORM_HOME_RELS`) and U130–U134, U136, U139, U142, U147 (T2, T9).

An AC is closed by the ticket that lands last among the tickets holding its rows (by `blocked_by`;
no AC has rows in two tickets that can land in either order).

## Counts

| Ticket | Rows claimed | ACs closed | Matrix, DT and SW rows | Stage 8 rows (V-*, VA, VL) |
|---|---|---|---|---|
| T-0076 | 39 | 1 | 39 | 0 |
| T-0077 | 476 | 40 | 437 | 39 |
| T-0078 | 8 | 2 | 1 | 7 |
| T-0079 | 22 | 3 | 13 | 9 |
| T-0080 | 12 | 4 | 5 | 7 |
| T-0081 | 91 | 11 | 86 | 5 |
| **Total** | **648** | **61** | **581** | **67** |

## Acceptance criteria

| AC | Closed by | Rows per ticket |
|---|---|---|
| AC-1 | T-0077 | T-0076: B1–B13; T-0077: B14–B16, B95 |
| AC-2 | T-0077 | T-0076: B17; T-0077: B18–B19 |
| AC-3 | T-0077 | T-0077: B20–B38, B91 |
| AC-4 | T-0077 | T-0077: B39–B49 |
| AC-5 | T-0077 | T-0077: B50–B52 |
| AC-6 | T-0077 | T-0077: B56–B61 |
| AC-7 | T-0077 | T-0077: B62–B70, B92, B94 |
| AC-8 | T-0080 | T-0077: B72–B77, B79; T-0080: B71, B78 |
| AC-9 | T-0077 | T-0077: B80–B83 |
| AC-10 | T-0081 | T-0077: B84–B87, B90; T-0081: B88–B89 |
| AC-11 | T-0077 | T-0077: A1–A10, DT01–DT80 |
| AC-12 | T-0077 | T-0077: A11–A13 |
| AC-13 | T-0077 | T-0077: A14–A20, A39, DT17–DT40, DT57–DT80 |
| AC-14 | T-0077 | T-0077: A21–A24, SW01–SW16 |
| AC-15 | T-0077 | T-0077: A25 |
| AC-16 | T-0077 | T-0077: A26–A29 |
| AC-17 | T-0077 | T-0077: A30–A32 |
| AC-18 | T-0077 | T-0077: A33 |
| AC-19 | T-0077 | T-0077: A34–A37 |
| AC-20 | T-0077 | T-0077: L1–L18 |
| AC-21 | T-0077 | T-0077: L19–L22 |
| AC-22 | T-0079 | T-0079: L23–L28, L30–L33, L45–L46 |
| AC-23 | T-0077 | T-0077: L34–L39, L47 |
| AC-24 | T-0080 | T-0080: L40–L42 |
| AC-25 | T-0077 | T-0077: L43 |
| AC-26 | T-0079 | T-0079: L44 |
| AC-27 | T-0077 | T-0077: S1–S11 |
| AC-28 | T-0077 | T-0077: S12–S21, S75 |
| AC-29 | T-0077 | T-0077: S22–S27 |
| AC-30 | T-0077 | T-0077: S28–S35 |
| AC-31 | T-0077 | T-0077: S36–S49, S73–S74, S76–S80 |
| AC-32 | T-0078 | T-0077: S51; T-0078: S50 |
| AC-33 | T-0077 | T-0077: S52–S56 |
| AC-34 | T-0077 | T-0077: S64–S72 |
| AC-35 | T-0077 | T-0076: Y7–Y8, Y10–Y11, Y15–Y18; T-0077: Y1–Y6, Y9, Y12–Y14, Y19–Y21, Y104, Y112 |
| AC-36 | T-0077 | T-0077: Y22–Y37, Y103 |
| AC-37 | T-0077 | T-0077: Y38–Y48, Y106, Y113 |
| AC-38 | T-0077 | T-0077: Y49–Y51 |
| AC-39 | T-0077 | T-0077: Y52–Y61, Y107 |
| AC-40 | T-0077 | T-0077: Y62–Y69, Y108 |
| AC-41 | T-0077 | T-0077: Y70–Y85, Y105 |
| AC-42 | T-0077 | T-0077: Y86–Y93, Y109–Y111 |
| AC-43 | T-0077 | T-0077: Y94–Y101 |
| AC-44 | T-0081 | T-0076: U11; T-0081: U1–U9, U151 |
| AC-45 | T-0076 | T-0076: U20–U24, U26–U27, U30–U31, U146, U150 |
| AC-46 | T-0081 | T-0076: U47; T-0081: U40–U46, U48–U49 |
| AC-47 | T-0081 | T-0076: U12, U25, U27–U29; T-0081: U10, U50–U63, U144, U148, U153–U154 |
| AC-48 | T-0081 | T-0081: U32, U70–U85, U149 |
| AC-49 | T-0081 | T-0081: U2–U3, U9, U90–U94, U140, U143, U151 |
| AC-50 | T-0081 | T-0081: U48, U64, U100–U108, U138 |
| AC-51 | T-0081 | T-0077: U112–U116, U145, U152; T-0081: U13, U110–U111 |
| AC-52 | T-0081 | T-0081: U82, U94, U120–U124 |
| AC-53 | T-0077 | T-0077: U130–U134, U136, U139, U142, U147 |
| AC-54 | T-0081 | T-0081: U135, U137 |
| AC-55 | T-0080 | T-0080: V-B1–V-B6 |
| AC-56 | T-0077 | T-0077: VA1a–VA1m, VA2a–VA2l, VA3a–VA3e, VA4 |
| AC-57 | T-0079 | T-0079: VL1–VL9 |
| AC-58 | T-0078 | T-0077: S57–S63; T-0078: V-S1–V-S7 |
| AC-59 | T-0077 | T-0077: V-Y1–V-Y8 |
| AC-60 | T-0081 | T-0081: V-U1–V-U5 |
| AC-61 | T-0080 | T-0077: B93; T-0080: V-B7 |

## Rows

### Area B — build and routing

| Row | AC | Ticket |
|---|---|---|
| B1 | AC-1 | T-0076 |
| B2 | AC-1 | T-0076 |
| B3 | AC-1 | T-0076 |
| B4 | AC-1 | T-0076 |
| B5 | AC-1 | T-0076 |
| B6 | AC-1 | T-0076 |
| B7 | AC-1 | T-0076 |
| B8 | AC-1 | T-0076 |
| B9 | AC-1 | T-0076 |
| B10 | AC-1 | T-0076 |
| B11 | AC-1 | T-0076 |
| B12 | AC-1 | T-0076 |
| B13 | AC-1 | T-0076 |
| B14 | AC-1 | T-0077 |
| B15 | AC-1 | T-0077 |
| B16 | AC-1 | T-0077 |
| B17 | AC-2 | T-0076 |
| B18 | AC-2 | T-0077 |
| B19 | AC-2 | T-0077 |
| B20 | AC-3 | T-0077 |
| B21 | AC-3 | T-0077 |
| B22 | AC-3 | T-0077 |
| B23 | AC-3 | T-0077 |
| B24 | AC-3 | T-0077 |
| B25 | AC-3 | T-0077 |
| B26 | AC-3 | T-0077 |
| B27 | AC-3 | T-0077 |
| B28 | AC-3 | T-0077 |
| B29 | AC-3 | T-0077 |
| B30 | AC-3 | T-0077 |
| B31 | AC-3 | T-0077 |
| B32 | AC-3 | T-0077 |
| B33 | AC-3 | T-0077 |
| B34 | AC-3 | T-0077 |
| B35 | AC-3 | T-0077 |
| B36 | AC-3 | T-0077 |
| B37 | AC-3 | T-0077 |
| B38 | AC-3 | T-0077 |
| B39 | AC-4 | T-0077 |
| B40 | AC-4 | T-0077 |
| B41 | AC-4 | T-0077 |
| B42 | AC-4 | T-0077 |
| B43 | AC-4 | T-0077 |
| B44 | AC-4 | T-0077 |
| B45 | AC-4 | T-0077 |
| B46 | AC-4 | T-0077 |
| B47 | AC-4 | T-0077 |
| B48 | AC-4 | T-0077 |
| B49 | AC-4 | T-0077 |
| B50 | AC-5 | T-0077 |
| B51 | AC-5 | T-0077 |
| B52 | AC-5 | T-0077 |
| B56 | AC-6 | T-0077 |
| B57 | AC-6 | T-0077 |
| B58 | AC-6 | T-0077 |
| B59 | AC-6 | T-0077 |
| B60 | AC-6 | T-0077 |
| B61 | AC-6 | T-0077 |
| B62 | AC-7 | T-0077 |
| B63 | AC-7 | T-0077 |
| B64 | AC-7 | T-0077 |
| B65 | AC-7 | T-0077 |
| B66 | AC-7 | T-0077 |
| B67 | AC-7 | T-0077 |
| B68 | AC-7 | T-0077 |
| B69 | AC-7 | T-0077 |
| B70 | AC-7 | T-0077 |
| B71 | AC-8 | T-0080 |
| B72 | AC-8 | T-0077 |
| B73 | AC-8 | T-0077 |
| B74 | AC-8 | T-0077 |
| B75 | AC-8 | T-0077 |
| B76 | AC-8 | T-0077 |
| B77 | AC-8 | T-0077 |
| B78 | AC-8 | T-0080 |
| B79 | AC-8 | T-0077 |
| B80 | AC-9 | T-0077 |
| B81 | AC-9 | T-0077 |
| B82 | AC-9 | T-0077 |
| B83 | AC-9 | T-0077 |
| B84 | AC-10 | T-0077 |
| B85 | AC-10 | T-0077 |
| B86 | AC-10 | T-0077 |
| B87 | AC-10 | T-0077 |
| B88 | AC-10 | T-0081 |
| B89 | AC-10 | T-0081 |
| B90 | AC-10 | T-0077 |
| B91 | AC-3 | T-0077 |
| B92 | AC-7 | T-0077 |
| B93 | AC-61 | T-0077 |
| B94 | AC-7 | T-0077 |
| B95 | AC-1 | T-0077 |

### Area A — learner arrival

| Row | AC | Ticket |
|---|---|---|
| A1 | AC-11 | T-0077 |
| A2 | AC-11 | T-0077 |
| A3 | AC-11 | T-0077 |
| A4 | AC-11 | T-0077 |
| A5 | AC-11 | T-0077 |
| A6 | AC-11 | T-0077 |
| A7 | AC-11 | T-0077 |
| A8 | AC-11 | T-0077 |
| A9 | AC-11 | T-0077 |
| A10 | AC-11 | T-0077 |
| A11 | AC-12 | T-0077 |
| A12 | AC-12 | T-0077 |
| A13 | AC-12 | T-0077 |
| A14 | AC-13 | T-0077 |
| A15 | AC-13 | T-0077 |
| A16 | AC-13 | T-0077 |
| A17 | AC-13 | T-0077 |
| A18 | AC-13 | T-0077 |
| A19 | AC-13 | T-0077 |
| A20 | AC-13 | T-0077 |
| A21 | AC-14 | T-0077 |
| A22 | AC-14 | T-0077 |
| A23 | AC-14 | T-0077 |
| A24 | AC-14 | T-0077 |
| A25 | AC-15 | T-0077 |
| A26 | AC-16 | T-0077 |
| A27 | AC-16 | T-0077 |
| A28 | AC-16 | T-0077 |
| A29 | AC-16 | T-0077 |
| A30 | AC-17 | T-0077 |
| A31 | AC-17 | T-0077 |
| A32 | AC-17 | T-0077 |
| A33 | AC-18 | T-0077 |
| A34 | AC-19 | T-0077 |
| A35 | AC-19 | T-0077 |
| A36 | AC-19 | T-0077 |
| A37 | AC-19 | T-0077 |
| A39 | AC-13 | T-0077 |

### Area A — learner arrival (A-§4.1 DT, A-§4.3 SW)

| Row | AC | Ticket |
|---|---|---|
| DT01 | AC-11 | T-0077 |
| DT02 | AC-11 | T-0077 |
| DT03 | AC-11 | T-0077 |
| DT04 | AC-11 | T-0077 |
| DT05 | AC-11 | T-0077 |
| DT06 | AC-11 | T-0077 |
| DT07 | AC-11 | T-0077 |
| DT08 | AC-11 | T-0077 |
| DT09 | AC-11 | T-0077 |
| DT10 | AC-11 | T-0077 |
| DT11 | AC-11 | T-0077 |
| DT12 | AC-11 | T-0077 |
| DT13 | AC-11 | T-0077 |
| DT14 | AC-11 | T-0077 |
| DT15 | AC-11 | T-0077 |
| DT16 | AC-11 | T-0077 |
| DT17 | AC-11, AC-13 | T-0077 |
| DT18 | AC-11, AC-13 | T-0077 |
| DT19 | AC-11, AC-13 | T-0077 |
| DT20 | AC-11, AC-13 | T-0077 |
| DT21 | AC-11, AC-13 | T-0077 |
| DT22 | AC-11, AC-13 | T-0077 |
| DT23 | AC-11, AC-13 | T-0077 |
| DT24 | AC-11, AC-13 | T-0077 |
| DT25 | AC-11, AC-13 | T-0077 |
| DT26 | AC-11, AC-13 | T-0077 |
| DT27 | AC-11, AC-13 | T-0077 |
| DT28 | AC-11, AC-13 | T-0077 |
| DT29 | AC-11, AC-13 | T-0077 |
| DT30 | AC-11, AC-13 | T-0077 |
| DT31 | AC-11, AC-13 | T-0077 |
| DT32 | AC-11, AC-13 | T-0077 |
| DT33 | AC-11, AC-13 | T-0077 |
| DT34 | AC-11, AC-13 | T-0077 |
| DT35 | AC-11, AC-13 | T-0077 |
| DT36 | AC-11, AC-13 | T-0077 |
| DT37 | AC-11, AC-13 | T-0077 |
| DT38 | AC-11, AC-13 | T-0077 |
| DT39 | AC-11, AC-13 | T-0077 |
| DT40 | AC-11, AC-13 | T-0077 |
| DT41 | AC-11 | T-0077 |
| DT42 | AC-11 | T-0077 |
| DT43 | AC-11 | T-0077 |
| DT44 | AC-11 | T-0077 |
| DT45 | AC-11 | T-0077 |
| DT46 | AC-11 | T-0077 |
| DT47 | AC-11 | T-0077 |
| DT48 | AC-11 | T-0077 |
| DT49 | AC-11 | T-0077 |
| DT50 | AC-11 | T-0077 |
| DT51 | AC-11 | T-0077 |
| DT52 | AC-11 | T-0077 |
| DT53 | AC-11 | T-0077 |
| DT54 | AC-11 | T-0077 |
| DT55 | AC-11 | T-0077 |
| DT56 | AC-11 | T-0077 |
| DT57 | AC-11, AC-13 | T-0077 |
| DT58 | AC-11, AC-13 | T-0077 |
| DT59 | AC-11, AC-13 | T-0077 |
| DT60 | AC-11, AC-13 | T-0077 |
| DT61 | AC-11, AC-13 | T-0077 |
| DT62 | AC-11, AC-13 | T-0077 |
| DT63 | AC-11, AC-13 | T-0077 |
| DT64 | AC-11, AC-13 | T-0077 |
| DT65 | AC-11, AC-13 | T-0077 |
| DT66 | AC-11, AC-13 | T-0077 |
| DT67 | AC-11, AC-13 | T-0077 |
| DT68 | AC-11, AC-13 | T-0077 |
| DT69 | AC-11, AC-13 | T-0077 |
| DT70 | AC-11, AC-13 | T-0077 |
| DT71 | AC-11, AC-13 | T-0077 |
| DT72 | AC-11, AC-13 | T-0077 |
| DT73 | AC-11, AC-13 | T-0077 |
| DT74 | AC-11, AC-13 | T-0077 |
| DT75 | AC-11, AC-13 | T-0077 |
| DT76 | AC-11, AC-13 | T-0077 |
| DT77 | AC-11, AC-13 | T-0077 |
| DT78 | AC-11, AC-13 | T-0077 |
| DT79 | AC-11, AC-13 | T-0077 |
| DT80 | AC-11, AC-13 | T-0077 |
| SW01 | AC-14 | T-0077 |
| SW02 | AC-14 | T-0077 |
| SW03 | AC-14 | T-0077 |
| SW04 | AC-14 | T-0077 |
| SW05 | AC-14 | T-0077 |
| SW06 | AC-14 | T-0077 |
| SW07 | AC-14 | T-0077 |
| SW08 | AC-14 | T-0077 |
| SW09 | AC-14 | T-0077 |
| SW10 | AC-14 | T-0077 |
| SW11 | AC-14 | T-0077 |
| SW12 | AC-14 | T-0077 |
| SW13 | AC-14 | T-0077 |
| SW14 | AC-14 | T-0077 |
| SW15 | AC-14 | T-0077 |
| SW16 | AC-14 | T-0077 |

### Area L — lists, home page, smoke fixtures

| Row | AC | Ticket |
|---|---|---|
| L1 | AC-20 | T-0077 |
| L2 | AC-20 | T-0077 |
| L3 | AC-20 | T-0077 |
| L4 | AC-20 | T-0077 |
| L5 | AC-20 | T-0077 |
| L6 | AC-20 | T-0077 |
| L7 | AC-20 | T-0077 |
| L8 | AC-20 | T-0077 |
| L9 | AC-20 | T-0077 |
| L10 | AC-20 | T-0077 |
| L11 | AC-20 | T-0077 |
| L12 | AC-20 | T-0077 |
| L13 | AC-20 | T-0077 |
| L14 | AC-20 | T-0077 |
| L15 | AC-20 | T-0077 |
| L16 | AC-20 | T-0077 |
| L17 | AC-20 | T-0077 |
| L18 | AC-20 | T-0077 |
| L19 | AC-21 | T-0077 |
| L20 | AC-21 | T-0077 |
| L21 | AC-21 | T-0077 |
| L22 | AC-21 | T-0077 |
| L23 | AC-22 | T-0079 |
| L24 | AC-22 | T-0079 |
| L25 | AC-22 | T-0079 |
| L26 | AC-22 | T-0079 |
| L27 | AC-22 | T-0079 |
| L28 | AC-22 | T-0079 |
| L30 | AC-22 | T-0079 |
| L31 | AC-22 | T-0079 |
| L32 | AC-22 | T-0079 |
| L33 | AC-22 | T-0079 |
| L34 | AC-23 | T-0077 |
| L35 | AC-23 | T-0077 |
| L36 | AC-23 | T-0077 |
| L37 | AC-23 | T-0077 |
| L38 | AC-23 | T-0077 |
| L39 | AC-23 | T-0077 |
| L40 | AC-24 | T-0080 |
| L41 | AC-24 | T-0080 |
| L42 | AC-24 | T-0080 |
| L43 | AC-25 | T-0077 |
| L44 | AC-26 | T-0079 |
| L45 | AC-22 | T-0079 |
| L46 | AC-22 | T-0079 |
| L47 | AC-23 | T-0077 |

### Area S — short links, numbers, the hook

| Row | AC | Ticket |
|---|---|---|
| S1 | AC-27 | T-0077 |
| S2 | AC-27 | T-0077 |
| S3 | AC-27 | T-0077 |
| S4 | AC-27 | T-0077 |
| S5 | AC-27 | T-0077 |
| S6 | AC-27 | T-0077 |
| S7 | AC-27 | T-0077 |
| S8 | AC-27 | T-0077 |
| S9 | AC-27 | T-0077 |
| S10 | AC-27 | T-0077 |
| S11 | AC-27 | T-0077 |
| S12 | AC-28 | T-0077 |
| S13 | AC-28 | T-0077 |
| S14 | AC-28 | T-0077 |
| S15 | AC-28 | T-0077 |
| S16 | AC-28 | T-0077 |
| S17 | AC-28 | T-0077 |
| S18 | AC-28 | T-0077 |
| S19 | AC-28 | T-0077 |
| S20 | AC-28 | T-0077 |
| S21 | AC-28 | T-0077 |
| S22 | AC-29 | T-0077 |
| S23 | AC-29 | T-0077 |
| S24 | AC-29 | T-0077 |
| S25 | AC-29 | T-0077 |
| S26 | AC-29 | T-0077 |
| S27 | AC-29 | T-0077 |
| S28 | AC-30 | T-0077 |
| S29 | AC-30 | T-0077 |
| S30 | AC-30 | T-0077 |
| S31 | AC-30 | T-0077 |
| S32 | AC-30 | T-0077 |
| S33 | AC-30 | T-0077 |
| S34 | AC-30 | T-0077 |
| S35 | AC-30 | T-0077 |
| S36 | AC-31 | T-0077 |
| S37 | AC-31 | T-0077 |
| S38 | AC-31 | T-0077 |
| S39 | AC-31 | T-0077 |
| S40 | AC-31 | T-0077 |
| S41 | AC-31 | T-0077 |
| S42 | AC-31 | T-0077 |
| S43 | AC-31 | T-0077 |
| S44 | AC-31 | T-0077 |
| S45 | AC-31 | T-0077 |
| S46 | AC-31 | T-0077 |
| S47 | AC-31 | T-0077 |
| S48 | AC-31 | T-0077 |
| S49 | AC-31 | T-0077 |
| S50 | AC-32 | T-0078 |
| S51 | AC-32 | T-0077 |
| S52 | AC-33 | T-0077 |
| S53 | AC-33 | T-0077 |
| S54 | AC-33 | T-0077 |
| S55 | AC-33 | T-0077 |
| S56 | AC-33 | T-0077 |
| S57 | AC-58 | T-0077 |
| S58 | AC-58 | T-0077 |
| S59 | AC-58 | T-0077 |
| S60 | AC-58 | T-0077 |
| S61 | AC-58 | T-0077 |
| S62 | AC-58 | T-0077 |
| S63 | AC-58 | T-0077 |
| S64 | AC-34 | T-0077 |
| S65 | AC-34 | T-0077 |
| S66 | AC-34 | T-0077 |
| S67 | AC-34 | T-0077 |
| S68 | AC-34 | T-0077 |
| S69 | AC-34 | T-0077 |
| S70 | AC-34 | T-0077 |
| S71 | AC-34 | T-0077 |
| S72 | AC-34 | T-0077 |
| S73 | AC-31 | T-0077 |
| S74 | AC-31 | T-0077 |
| S75 | AC-28 | T-0077 |
| S76 | AC-31 | T-0077 |
| S77 | AC-31 | T-0077 |
| S78 | AC-31 | T-0077 |
| S79 | AC-31 | T-0077 |
| S80 | AC-31 | T-0077 |

### Area Y — the challenge declaration

| Row | AC | Ticket |
|---|---|---|
| Y1 | AC-35 | T-0077 |
| Y2 | AC-35 | T-0077 |
| Y3 | AC-35 | T-0077 |
| Y4 | AC-35 | T-0077 |
| Y5 | AC-35 | T-0077 |
| Y6 | AC-35 | T-0077 |
| Y7 | AC-35 | T-0076 |
| Y8 | AC-35 | T-0076 |
| Y9 | AC-35 | T-0077 |
| Y10 | AC-35 | T-0076 |
| Y11 | AC-35 | T-0076 |
| Y12 | AC-35 | T-0077 |
| Y13 | AC-35 | T-0077 |
| Y14 | AC-35 | T-0077 |
| Y15 | AC-35 | T-0076 |
| Y16 | AC-35 | T-0076 |
| Y17 | AC-35 | T-0076 |
| Y18 | AC-35 | T-0076 |
| Y19 | AC-35 | T-0077 |
| Y20 | AC-35 | T-0077 |
| Y21 | AC-35 | T-0077 |
| Y22 | AC-36 | T-0077 |
| Y23 | AC-36 | T-0077 |
| Y24 | AC-36 | T-0077 |
| Y25 | AC-36 | T-0077 |
| Y26 | AC-36 | T-0077 |
| Y27 | AC-36 | T-0077 |
| Y28 | AC-36 | T-0077 |
| Y29 | AC-36 | T-0077 |
| Y30 | AC-36 | T-0077 |
| Y31 | AC-36 | T-0077 |
| Y32 | AC-36 | T-0077 |
| Y33 | AC-36 | T-0077 |
| Y34 | AC-36 | T-0077 |
| Y35 | AC-36 | T-0077 |
| Y36 | AC-36 | T-0077 |
| Y37 | AC-36 | T-0077 |
| Y38 | AC-37 | T-0077 |
| Y39 | AC-37 | T-0077 |
| Y40 | AC-37 | T-0077 |
| Y41 | AC-37 | T-0077 |
| Y42 | AC-37 | T-0077 |
| Y43 | AC-37 | T-0077 |
| Y44 | AC-37 | T-0077 |
| Y45 | AC-37 | T-0077 |
| Y46 | AC-37 | T-0077 |
| Y47 | AC-37 | T-0077 |
| Y48 | AC-37 | T-0077 |
| Y49 | AC-38 | T-0077 |
| Y50 | AC-38 | T-0077 |
| Y51 | AC-38 | T-0077 |
| Y52 | AC-39 | T-0077 |
| Y53 | AC-39 | T-0077 |
| Y54 | AC-39 | T-0077 |
| Y55 | AC-39 | T-0077 |
| Y56 | AC-39 | T-0077 |
| Y57 | AC-39 | T-0077 |
| Y58 | AC-39 | T-0077 |
| Y59 | AC-39 | T-0077 |
| Y60 | AC-39 | T-0077 |
| Y61 | AC-39 | T-0077 |
| Y62 | AC-40 | T-0077 |
| Y63 | AC-40 | T-0077 |
| Y64 | AC-40 | T-0077 |
| Y65 | AC-40 | T-0077 |
| Y66 | AC-40 | T-0077 |
| Y67 | AC-40 | T-0077 |
| Y68 | AC-40 | T-0077 |
| Y69 | AC-40 | T-0077 |
| Y70 | AC-41 | T-0077 |
| Y71 | AC-41 | T-0077 |
| Y72 | AC-41 | T-0077 |
| Y73 | AC-41 | T-0077 |
| Y74 | AC-41 | T-0077 |
| Y75 | AC-41 | T-0077 |
| Y76 | AC-41 | T-0077 |
| Y77 | AC-41 | T-0077 |
| Y78 | AC-41 | T-0077 |
| Y79 | AC-41 | T-0077 |
| Y80 | AC-41 | T-0077 |
| Y81 | AC-41 | T-0077 |
| Y82 | AC-41 | T-0077 |
| Y83 | AC-41 | T-0077 |
| Y84 | AC-41 | T-0077 |
| Y85 | AC-41 | T-0077 |
| Y86 | AC-42 | T-0077 |
| Y87 | AC-42 | T-0077 |
| Y88 | AC-42 | T-0077 |
| Y89 | AC-42 | T-0077 |
| Y90 | AC-42 | T-0077 |
| Y91 | AC-42 | T-0077 |
| Y92 | AC-42 | T-0077 |
| Y93 | AC-42 | T-0077 |
| Y94 | AC-43 | T-0077 |
| Y95 | AC-43 | T-0077 |
| Y96 | AC-43 | T-0077 |
| Y97 | AC-43 | T-0077 |
| Y98 | AC-43 | T-0077 |
| Y99 | AC-43 | T-0077 |
| Y100 | AC-43 | T-0077 |
| Y101 | AC-43 | T-0077 |
| Y103 | AC-36 | T-0077 |
| Y104 | AC-35 | T-0077 |
| Y105 | AC-41 | T-0077 |
| Y106 | AC-37 | T-0077 |
| Y107 | AC-39 | T-0077 |
| Y108 | AC-40 | T-0077 |
| Y109 | AC-42 | T-0077 |
| Y110 | AC-42 | T-0077 |
| Y111 | AC-42 | T-0077 |
| Y112 | AC-35 | T-0077 |
| Y113 | AC-37 | T-0077 |

### Area U — the upgrade's move

| Row | AC | Ticket |
|---|---|---|
| U1 | AC-44 | T-0081 |
| U2 | AC-44, AC-49 | T-0081 |
| U3 | AC-44, AC-49 | T-0081 |
| U4 | AC-44 | T-0081 |
| U5 | AC-44 | T-0081 |
| U6 | AC-44 | T-0081 |
| U7 | AC-44 | T-0081 |
| U8 | AC-44 | T-0081 |
| U9 | AC-44, AC-49 | T-0081 |
| U10 | AC-47 | T-0081 |
| U11 | AC-44 | T-0076 |
| U12 | AC-47 | T-0076 |
| U13 | AC-51 | T-0081 |
| U20 | AC-45 | T-0076 |
| U21 | AC-45 | T-0076 |
| U22 | AC-45 | T-0076 |
| U23 | AC-45 | T-0076 |
| U24 | AC-45 | T-0076 |
| U25 | AC-47 | T-0076 |
| U26 | AC-45 | T-0076 |
| U27 | AC-45, AC-47 | T-0076 |
| U28 | AC-47 | T-0076 |
| U29 | AC-47 | T-0076 |
| U30 | AC-45 | T-0076 |
| U31 | AC-45 | T-0076 |
| U32 | AC-48 | T-0081 |
| U40 | AC-46 | T-0081 |
| U41 | AC-46 | T-0081 |
| U42 | AC-46 | T-0081 |
| U43 | AC-46 | T-0081 |
| U44 | AC-46 | T-0081 |
| U45 | AC-46 | T-0081 |
| U46 | AC-46 | T-0081 |
| U47 | AC-46 | T-0076 |
| U48 | AC-46, AC-50 | T-0081 |
| U49 | AC-46 | T-0081 |
| U50 | AC-47 | T-0081 |
| U51 | AC-47 | T-0081 |
| U52 | AC-47 | T-0081 |
| U53 | AC-47 | T-0081 |
| U54 | AC-47 | T-0081 |
| U55 | AC-47 | T-0081 |
| U56 | AC-47 | T-0081 |
| U57 | AC-47 | T-0081 |
| U58 | AC-47 | T-0081 |
| U59 | AC-47 | T-0081 |
| U60 | AC-47 | T-0081 |
| U61 | AC-47 | T-0081 |
| U62 | AC-47 | T-0081 |
| U63 | AC-47 | T-0081 |
| U64 | AC-50 | T-0081 |
| U70 | AC-48 | T-0081 |
| U71 | AC-48 | T-0081 |
| U72 | AC-48 | T-0081 |
| U73 | AC-48 | T-0081 |
| U74 | AC-48 | T-0081 |
| U75 | AC-48 | T-0081 |
| U76 | AC-48 | T-0081 |
| U77 | AC-48 | T-0081 |
| U78 | AC-48 | T-0081 |
| U79 | AC-48 | T-0081 |
| U80 | AC-48 | T-0081 |
| U81 | AC-48 | T-0081 |
| U82 | AC-48, AC-52 | T-0081 |
| U83 | AC-48 | T-0081 |
| U84 | AC-48 | T-0081 |
| U85 | AC-48 | T-0081 |
| U90 | AC-49 | T-0081 |
| U91 | AC-49 | T-0081 |
| U92 | AC-49 | T-0081 |
| U93 | AC-49 | T-0081 |
| U94 | AC-49, AC-52 | T-0081 |
| U100 | AC-50 | T-0081 |
| U101 | AC-50 | T-0081 |
| U102 | AC-50 | T-0081 |
| U103 | AC-50 | T-0081 |
| U104 | AC-50 | T-0081 |
| U105 | AC-50 | T-0081 |
| U106 | AC-50 | T-0081 |
| U107 | AC-50 | T-0081 |
| U108 | AC-50 | T-0081 |
| U110 | AC-51 | T-0081 |
| U111 | AC-51 | T-0081 |
| U112 | AC-51 | T-0077 |
| U113 | AC-51 | T-0077 |
| U114 | AC-51 | T-0077 |
| U115 | AC-51 | T-0077 |
| U116 | AC-51 | T-0077 |
| U120 | AC-52 | T-0081 |
| U121 | AC-52 | T-0081 |
| U122 | AC-52 | T-0081 |
| U123 | AC-52 | T-0081 |
| U124 | AC-52 | T-0081 |
| U130 | AC-53 | T-0077 |
| U131 | AC-53 | T-0077 |
| U132 | AC-53 | T-0077 |
| U133 | AC-53 | T-0077 |
| U134 | AC-53 | T-0077 |
| U135 | AC-54 | T-0081 |
| U136 | AC-53 | T-0077 |
| U137 | AC-54 | T-0081 |
| U138 | AC-50 | T-0081 |
| U139 | AC-53 | T-0077 |
| U140 | AC-49 | T-0081 |
| U142 | AC-53 | T-0077 |
| U143 | AC-49 | T-0081 |
| U144 | AC-47 | T-0081 |
| U145 | AC-51 | T-0077 |
| U146 | AC-45 | T-0076 |
| U147 | AC-53 | T-0077 |
| U148 | AC-47 | T-0081 |
| U149 | AC-48 | T-0081 |
| U150 | AC-45 | T-0076 |
| U151 | AC-44, AC-49 | T-0081 |
| U152 | AC-51 | T-0077 |
| U153 | AC-47 | T-0081 |
| U154 | AC-47 | T-0081 |

### Stage 8 plan › Area B

| Row | AC | Ticket |
|---|---|---|
| V-B1 | AC-55 | T-0080 |
| V-B2 | AC-55 | T-0080 |
| V-B3 | AC-55 | T-0080 |
| V-B4 | AC-55 | T-0080 |
| V-B5 | AC-55 | T-0080 |
| V-B6 | AC-55 | T-0080 |
| V-B7 | AC-61 | T-0080 |

### Stage 8 plan › Area A

| Row | AC | Ticket |
|---|---|---|
| VA1a | AC-56 | T-0077 |
| VA1b | AC-56 | T-0077 |
| VA1c | AC-56 | T-0077 |
| VA1d | AC-56 | T-0077 |
| VA1e | AC-56 | T-0077 |
| VA1f | AC-56 | T-0077 |
| VA1g | AC-56 | T-0077 |
| VA1h | AC-56 | T-0077 |
| VA1i | AC-56 | T-0077 |
| VA1j | AC-56 | T-0077 |
| VA1k | AC-56 | T-0077 |
| VA1l | AC-56 | T-0077 |
| VA1m | AC-56 | T-0077 |
| VA2a | AC-56 | T-0077 |
| VA2b | AC-56 | T-0077 |
| VA2c | AC-56 | T-0077 |
| VA2d | AC-56 | T-0077 |
| VA2e | AC-56 | T-0077 |
| VA2f | AC-56 | T-0077 |
| VA2g | AC-56 | T-0077 |
| VA2h | AC-56 | T-0077 |
| VA2i | AC-56 | T-0077 |
| VA2j | AC-56 | T-0077 |
| VA2k | AC-56 | T-0077 |
| VA2l | AC-56 | T-0077 |
| VA3a | AC-56 | T-0077 |
| VA3b | AC-56 | T-0077 |
| VA3c | AC-56 | T-0077 |
| VA3d | AC-56 | T-0077 |
| VA3e | AC-56 | T-0077 |
| VA4 | AC-56 | T-0077 |

### Stage 8 plan › Area L

| Row | AC | Ticket |
|---|---|---|
| VL1 | AC-57 | T-0079 |
| VL2 | AC-57 | T-0079 |
| VL3 | AC-57 | T-0079 |
| VL4 | AC-57 | T-0079 |
| VL5 | AC-57 | T-0079 |
| VL6 | AC-57 | T-0079 |
| VL7 | AC-57 | T-0079 |
| VL8 | AC-57 | T-0079 |
| VL9 | AC-57 | T-0079 |

### Stage 8 plan › Area S

| Row | AC | Ticket |
|---|---|---|
| V-S1 | AC-58 | T-0078 |
| V-S2 | AC-58 | T-0078 |
| V-S3 | AC-58 | T-0078 |
| V-S4 | AC-58 | T-0078 |
| V-S5 | AC-58 | T-0078 |
| V-S6 | AC-58 | T-0078 |
| V-S7 | AC-58 | T-0078 |

### Stage 8 plan › Area Y

| Row | AC | Ticket |
|---|---|---|
| V-Y1 | AC-59 | T-0077 |
| V-Y2 | AC-59 | T-0077 |
| V-Y3 | AC-59 | T-0077 |
| V-Y4 | AC-59 | T-0077 |
| V-Y5 | AC-59 | T-0077 |
| V-Y6 | AC-59 | T-0077 |
| V-Y7 | AC-59 | T-0077 |
| V-Y8 | AC-59 | T-0077 |

### Stage 8 plan › Area U

| Row | AC | Ticket |
|---|---|---|
| V-U1 | AC-60 | T-0081 |
| V-U2 | AC-60 | T-0081 |
| V-U3 | AC-60 | T-0081 |
| V-U4 | AC-60 | T-0081 |
| V-U5 | AC-60 | T-0081 |

### Not rows

- **Removed in integration** (they reach no AC; `traceability.md` "Integration notes"): B53, B54, B55
  (N3), A38 (N6), L29 (N7), Y102 (N20).
- **Never numbered:** area U numbers its rows in blocks per subsection, so U14–U19, U33–U39,
  U65–U69, U86–U89, U95–U99, U109, U117–U119 and U125–U129 never existed; U141 "is not used"
  ("Checks on revision 1").
- **Fixtures, not rows:** F-1–F-6 ("Stage 8 plan › Fixtures and surfaces"). Each ticket's Stage 8
  section names the fixtures it builds.

## Checks against the constraints

| Id | Check | Result |
|---|---|---|
| T1 | One switch ticket with everything T1 lists | Met. T-0077 holds the move, the build, routing and `pageLocaleOf` in the four components, the loader and merge, the smoke fixtures and their CI switch, every reader and writer of the declaration and brief paths (skills included), the generator, numbers, brief check and hook, `ANCHOR_PATHS` and `PLATFORM_HOME_RELS`, and every document T1 names (B84, A34–A37, Y97–Y100, S69, S70, B90 except U135's sentences), with the area's other document rows (B85–B87, Y94–Y96, Y101, S64–S68, S71, S72) and the L44 passages the switch makes false (LH1's difficulty-badge clause, LH2, LH3, LH4; the row L44 is T-0079's). Its Context names the D31 client module as the first step and the rule on tests changed only to set `P`. Green after each ticket: T-0076 adds unused modules; T-0077 keeps `docs:build` green under both primaries by removing the Traditional Chinese notes page's export-format link and naming the page in plain text until T-0080 (see "Open items", 1); T-0078–T-0081 each start from a green `main`. |
| T2 | `planLayoutMove` and U20–U31, U47, U146 no later than the switch; the switch adds U130–U134, U136, U139, U142, U147 | Met. Those unit rows are T-0076's (with U11, U12 and U150, also unit rows of 0010-S45); T-0077 is blocked by T-0076, runs the transform on upstream's tree (D108) and claims the eight equality rows. |
| T3 | Pure modules may land before the switch, unused | Met. T-0076 lands the locale list module, `parsePrimaryLocale`/`readPrimaryLocale`, `classifySourcePath`, `validateChallengeDeclaration`, `validateChallengeBrief` and `readChallengeDeclaration`, imported only by tests (its AC checks this). `classifySourcePath` claims no row of its own (see "Open items", 4). |
| T4 | The upgrade's move after the switch, with U135's GLOSSARY sentences | Met. T-0081 is blocked by T-0076 and T-0077 and holds steps 7–10, report R6, UP-E14, UP-A16, `range.json`'s `primaryLocale`, U135 and area U's stage 8, which needs A on GitHub with the new layout. |
| T5 | The reference page and the completeness test in or after the switch | Met. T-0080 is blocked by T-0077. |
| T6 | T-0060's widened scope in or after the switch | Met. T-0079 is blocked by T-0077 (the `lists` prop, D40). D55 named L18–L33; L18–L22 are the loader and merge, which T1 puts in T-0077, so T-0079 carries L23–L33 as T6 states, plus L45 and L46 (AC-22). Of T6's VL1–VL4, T-0079's rows reach VL1, VL2 and VL4 (and VL9); VL3 reaches T-0077's S53, S63 and area A rows. T-0079 claims the whole VL table (AC-57). |
| T7 | S50 and S51 claimed only if T-0058 / T-0059 are taken | Both taken (D72): S51 in T-0077 (T-0059 whole), S50 in T-0078 (T-0058 whole, after the hook ticket). Neither is declined, so neither is re-opened; both stay `pending` with `revisit_when` naming the ticket that takes them. |
| T8 | Each ticket runs the V rows its rows reach; each area's V table in full at its last ticket | Met, with two ordering cases and one stated departure. Last ticket per area: A and Y → T-0077 (VA and V-Y in full there); S → T-0078; U → T-0081. **L** → whichever of T-0079 and T-0080 lands second (T-0080 holds L40–L42, which no VL row reaches): T-0079 claims VL1–VL9 and runs them in full; if T-0080 lands after it, T-0080 runs them in full again. **B** → whichever of T-0080 and the holder of B88 and B89 (T-0081, or the ticket they move to, "Open items", 2) lands second: no V-B row reaches B88 or B89 (V-U5 cites B89 and runs in T-0081), so T-0080 claims V-B1–V-B7 and runs them in full; if the holder of B88 and B89 lands after T-0080, it runs them in full again. **Departure:** V-U1–V-U5 also reach T-0077's S51, S52, A12, A16 and B84, but need T-0081's move, so T-0077 cannot run them; they run at T-0081, area U's last ticket, after T-0077 has landed, which T8's second sentence covers but its first does not ("Open items", 6). T-0077, the first ticket that touches deployment (workflow stage 4), runs every V-B, VA, V-S and V-Y row and VL3, VL5–VL8; T-0076 reaches none. |
| T9 | The ticket adding 0010-S49 gives `test`, `fork-init-cross-os` and `release` a checkout with tags | Met. T-0077 adds U130–U132, U134, U147 and claims U142, and its Context and AC name the three jobs and `fetch-depth: 0`. |

Other stage 4 checks (`docs/agents/workflow.md`):

- **Every row claimed:** 648 of 648; every AC closed by one ticket (61 of 61).
- **First ticket touching deployment runs on a real temporary host:** T-0077 (Cloudflare Pages
  previews F-1, F-2 and the temporary GitHub Pages range F-3).
- **Tickets that change the same file in turn:** every ticket that edits a file T-0076 or T-0077
  changes is blocked by it (`pre-commit.sh` T-0078; `ChallengeList.vue`, `HomeContent.vue`,
  troubleshooting T-0079; `notes.md` T-0080; `merge-plan.mjs`, `layout-move.mjs`, the READMEs and
  `GLOSSARY.md` T-0081). T-0078–T-0081 can run in parallel, so their files are kept apart: T-0079's
  built-site checks (L33, L46) go in the new `tests/site-smoke/list-strings.spec.ts` and T-0080's
  (B71, L41) in `tests/site-smoke/site-smoke.spec.ts`; T-0077 writes LH3 (GLOSSARY 語系標記) with
  B90, so T-0081 is the only later ticket that edits `GLOSSARY.md`; B88 and B89 (OPEN-QUESTIONS, the
  release-note input) stay with one ticket. T-0079 and T-0080 each say in Context to stop and ask the
  user to order them if stage 5 finds a shared file ("Open items", 5).
- **Decisions to confirm before implementing** (workflow "Standing authorization", "Items for the
  user"): each ticket's Context lists its new or changed D-numbers; together they cover every new
  decision of the spec and the self-check (D134 is confirmed with this breakdown and applied when
  T-0079 lands).

## Open items for the user

1. **The interim notes text (T-0077).** Under `P = zh-TW` today's
   `platform/zh-TW/guide/notes.md` link `../../reference/attack-log-export-format.md` is a dead link
   and fails the build (B74), and D16's same-folder form names a page that exists only from T-0080.
   No markdown link to the English page builds under both primaries: the cross-folder form
   `../../en/reference/attack-log-export-format.md` passes under `P = zh-TW` (B73) but under `P = en`
   names the primary folder and fails with PL-E11 (B72, D12's own example), and T-0077 must build
   with `P = en` (F-2, F-3's second deploy, V-B2, V-B7, VA2i–VA2l, VA3a–VA3e). T-0077 therefore
   removes the link and names the reference page in plain text; T-0080 writes D16's form. Not a spec
   decision; T-0077 lists it with its decisions to confirm. The alternative, moving D51 and D16 (L40,
   L41, B71, B78) into T-0077, is allowed by T5 but changes the approved breakdown, so it is the
   user's choice.
2. **Close-out rows in T-0081.** B88 (OQ-024 closed) and B89 (release-note input) are epic close-out
   documents. T-0081, the epic's last ticket by id, carries them, as 0008's T-0057 did; if another
   ticket lands after it, they move there with a Comments entry. They are area B rows: the ticket
   holding them is area B's last ticket when it lands after T-0080, and then runs V-B1–V-B7 in full
   (T8 check). B89 is also cited by V-U5, which T-0081 runs.
3. **L44 spans two tickets' documents.** LH2, LH4 and LH1's difficulty-badge clause become false at
   the switch, and LH3 (GLOSSARY 語系標記: the mark appears only in lists of a locale other than the
   primary) is true from it; T-0077 writes all four. LH1's list-title row becomes false only at
   T-0079, which writes it. The row, a stage 6 confirmation of LH1–LH5, is claimed by T-0079; LH5 is
   release-note input collected with B89.
4. **`classifySourcePath` has no row in T-0076.** Its rows reach it through `checkSourceLayout`
   (B20–B28, T-0077) and U136, which T2 gives the switch. T-0076 may test it over U11's and B21–B28's
   paths as working tests that claim no row.
5. **Files T-0079 and T-0080 could share.** Workflow stage 4 requires tickets that change the same
   file to be merged or ordered. The breakdown leaves them unordered, so the tickets keep their files
   apart: T-0079's smoke checks go in the new `list-strings.spec.ts`, T-0080's in
   `site-smoke.spec.ts`, and each ticket lists the other's files it must not edit. If stage 5 still
   finds a shared file, the ticket stops and the user orders them (T-0080 blocked by T-0079 would
   also settle area L's last-ticket case in T8); that changes the approved edges, so it is the
   user's choice.
6. **V-U rows reach T-0077's rows (T8).** V-U1–V-U5 cite T-0077's S51, S52, A12, A16 and B84, but
   they need T-0081's move, so T-0077 cannot run them and they run at T-0081 after T-0077 has landed.
   T8's second sentence covers this; its first ("each ticket runs the V rows its own rows reach")
   does not. Kept as a stated departure; the user confirms it with the breakdown.

## Decisions on the open items (2026-11-15, approved under the user's standing authorization)

- Open item 1: the interim plain-text mention in `platform/zh-TW/guide/notes.md` stays in T-0077; T-0080 restores the link in D16's same-folder form.
- Open item 5: ordered. T-0080 is blocked by T-0079 (one area L last ticket, and the two never edit the site-smoke files concurrently), and T-0081 is blocked by T-0080, so T-0081 is the last ticket for areas B and U and carries B88 and B89 as planned. The conditional reruns in T-0079 and T-0080 therefore reduce to: T-0080 reruns VL1–VL9 as area L's last ticket.
- Open item 6: the V-U departure from T8 is accepted: V-U1–V-U5 run at T-0081, which is after every ticket whose rows they reach.
