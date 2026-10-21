# Stage 3 round 1：總覽 — epic 0007-gh-pages-range-fixes

審查版本：spec.en.md blob `89513637d841af84fd06d3e2b8ea32bf76b1800d`、traceability.md blob `33bb856412d30f82224fd58b1b080cfb8ba9e45d`，HEAD `7820bb8`（樹與 `origin/main` `3b52e65` 相同）。凍結 prompt `review/prompt.md` blob `5cfa01c61bb10167e51ec36a0b7eac3f7f2a076b`。四個 `harness-reviewer` 各負責一軸，同時執行。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-1-C.md` | 0 | 10 | 17 | 27 |
| 2 可驗證性 | `round-1-V.md` | 0 | 5 | 14 | 19 |
| 3 契約衝突 | `round-1-K.md` | 0 | 3 | 17 | 20 |
| 4 紅隊 | `round-1-R.md` | 0 | 7 | 16 | 23 |
| **合計** | | **0** | **25** | **64** | **89** |

沒有 P0，stage 3 gate 成立。

## 主 session 的查證

| 發現 | 查證方式 | 結果 |
|---|---|---|
| R-1 | 在 scratchpad 的暫存 repo 重現：`_redirects` 有未 stage 變更、另有未追蹤題目，stash 期間重產並 stage 後執行 `git stash pop` | 確認：pop 結束狀態 1，`_redirects` 留下衝突標記（`UU`），stash entry 保留 |
| C-1 | 讀 `.vitepress/theme/i18n/index.ts` 的 `redirectTargetForStoredLocale` 與 `DEFAULT_VISITING_LOCALE` | 確認：沒有偏好的學習者開沒有語系前綴的路徑，會被導到 `/zh-TW/...`；題目沒有繁中頁時那頁不存在。短連結今天也走同一條路，屬既有缺陷 |

## 根因歸群

| 群 | 根因 | 發現 |
|---|---|---|
| G1 | hook 的 stash／還原機制與它的可觀察性（pop 衝突、中斷、沒有 HEAD、既有 stash、commit 中止、`platform/public/` 不存在、index 與 validator 的觀察點） | R-1、C-3、R-8、C-4、R-9、C-19、R-19、C-11、C-13、V-14、C-18、R-23、V-8、V-9、V-3 |
| G2 | hook 產生 `_redirects` 的來源與納入規則（被 ignore 的目錄、工作樹的 scripts、CLI 的 root、guard 的納入規則、只動單一語系、刪除與號碼重發、觸發條件邊緣） | R-4、C-7、R-17、R-5、K-16、C-8、R-16、C-21、K-14 |
| G3 | 不經 hook 或 hook 不觸發的提交路徑（`--only`／`-a`／`--amend`、create 後 `commit -a`、已過期檔案的修復、多分支合併、繞過 hook、無聲覆寫） | R-2、C-5、R-3、C-6、C-12、V-10、C-27、R-10 |
| G4 | 列表裡點網址文字會進題目（整列是 `<a>`）；觸控裝置沒有 hover | V-1、K-1、C-10、R-15、R-14、C-23 |
| G5 | 版面：誰先縮、viewport、截斷是否真的發生、量測狀態、題目頁語系 | R-7、C-9、K-15、V-6、V-7、V-13、C-25 |
| G6 | page URL 的正確性（語系導向 404、origin 與 base 不一致、slug 編碼、base 不可觀察、結尾斜線、OQ-016 措辭過滿、`SITE_ORIGIN` 與號碼的既有說法） | C-1、C-2、V-2、R-13、C-16、V-11、K-4、R-18、K-20、R-11、K-12、K-13 |
| G7 | 測試 seam 的機制（vitest 下沒有常數、T70 要求真實 origin、nav 的 slug 來源、ChallengeLayout、測試替換點、fork:init 錨點） | K-2、V-17、K-17、C-14、V-12、C-22、R-20、R-21、C-24 |
| G8 | `create:challenge` 的失敗狀態與 wxl-create skill 的分支 | R-6、K-3、C-20、V-16 |
| G9 | 文件、sentence map、GLOSSARY 與語言規則 | K-8、C-15、K-9、K-10、K-11、V-18、V-19、K-18、K-19 |
| G10 | stage 8 的 surface（Browser panel 一詞、preview 的 origin、preview 規則的覆寫、stage 8 的 commit、前置條件） | V-4、K-5、V-5、R-12、K-6、C-17、K-7、V-15、R-22、C-26 |

每條發現恰好歸入一群：C-1～C-27、V-1～V-19、K-1～K-20、R-1～R-23 共 89 條。處置記錄於 `disposition.md`（使用者裁決後撰寫）。
