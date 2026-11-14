# 串連分析：epic 0009（npm trusted publishing）

日期：2026-11-13。依 `docs/agents/review.md` 的「Epic close-out: chain analysis」執行。

## 範圍與方法

- **程式碼基準**：`main` = `df0e042`（T-0073 的落地紀錄合併後）。create-wxl 3.1.1 已由 CI 透過 trusted publishing stage，並經上游 2FA 核准（tag `v3.1.1` → `2d85c1c`）。
- **epic 起點**：`af4e1ac`（#81，3.1.0 的發布紀錄）。
- **合併順序**：

  | Ticket | 合併 commit | 紀錄 PR |
  |---|---|---|
  | T-0069 | `08c2b14`（#82） | `079818f`（#83） |
  | T-0070 | `6417cfd`（#84） | `7474cca`（#85） |
  | T-0071 | `78b9963`（#86） | `42a0cba`（#87） |
  | T-0072 | `6374a14`（#88） | `70a3610`（#89） |
  | T-0073 | `2d85c1c`（#90） | `df0e042`（#91） |

- **輸入**：
  - `review/security-T-0069.md`～`security-T-0073.md` 的全部 55 個候選，不分等級，含「留給 epic close-out 的觀察」與「涵蓋範圍與限制」。
  - 第 8 階段實際發布的觀察（T-0073 的 Comments）：MN7、MN2、MN1、MN3 的回報，RP5 的回報，以及 agent 與使用者共用同一個 macOS 帳號。
  - spec 0009 的 Trust Boundaries and Threat Model（B1–B3）、Out of Scope、Further Notes、D1–D14；traceability 的 X9、W1–W12、RP0–RP7、MN1–MN7、F1–F7、S8。
  - 最終程式與文件：`create-wxl/src/publish.mjs`、`publish-io.mjs`、`scripts/check-publish.mjs`、`scripts/prepare-dist.mjs`、`create-wxl/package.json`、`create-wxl/src/upgrade.mjs`、`.github/workflows/publish-npm.yml`、`release.yml`、`docs/agents/release.md`、`CHANGELOG.md` 3.1.1、`CONTRIBUTE.md`、ADR-0009、OQ-027、OQ-028。
- **分工**：全部唯讀，以 Agent 工具分派。
  - 第一關：兩位 `harness-reviewer` 找候選串連。一位逐一走信任邊界（by-boundary，BB-1～BB-7），一位從攻擊者的位置出發（by-attacker，BA-1～BA-9）。
  - 第二關：parent 把重疊的候選合併成 G1～G6，每組交給一位獨立的 `harness-challenger` 嘗試反駁，共 6 位。
  - 第三關：一位 `harness-reviewer` 做完整性檢查，提出漏掉的輸入（I-1～I-10）、新串連（PC-1～PC-8）與對第二關的更正（R-1～R-6）。
- **標記方式**：**讀碼驗證**附 `檔案:行號`；**推論**是沒有直接觀察的 GitHub、npm 或 git 行為；**親自查證**是 parent 實際執行過的，見下一節。

## 親自查證

| # | 查證內容 | 結果 |
|---|---|---|
| V-1 | 遠端與本機的 ref（`git ls-remote origin`、`git for-each-ref`） | 遠端 tag 只有 `v3.0.0`、`v3.1.0`、`v3.1.1`；沒有任何非 `v*` tag，沒有 `origin/*` 或以 hex 命名的 ref |
| V-2 | `gh pr view 90 --json mergeCommit` | `2d85c1c4372d95bbb5df5f60bf95b339d6876da2`，等於 `v3.1.1` peel 後的 commit，也等於使用者在 RP2 讀到的 40 碼 |
| V-3 | GitHub 頁面上 commit 的顯示（內建瀏覽器，未登入） | Actions run 43432514515 與 PR #90 的可見文字都只有 7 碼 `2d85c1c`；40 碼只在連結的 href 裡。登入後的顯示沒有查證 |
| V-4 | 拋棄式 repo：遠端有 `refs/tags/origin/main` → X 時 | 既有 clone 執行一般的 `git fetch` 會自動跟隨這個 tag（`[新標籤] origin/main`）；`git log origin/main` 解析到 X，只在 stderr 印出「refname 'origin/main' is ambiguous」；`git merge-base --is-ancestor X origin/main` 回 0；`git rev-parse refs/remotes/origin/main` 仍是真正的 main |
| V-5 | 拋棄式 repo：tag 名稱等於某 commit 的 7 碼前綴 | `git rev-parse <7 碼>`、`git show <7 碼>` 都解析到 tag 指向的另一個 commit，並印出 ambiguous 警告；用 40 碼解析不受影響 |
| V-6 | 能寫入 repository ref 的身分 | collaborator 只有 `CXPhoenix`（admin）；沒有 deploy key、沒有 team；org 安裝了兩個 GitHub App，`chatgpt-codex-connector` 與 `cloudflare-workers-and-pages`，兩者的 `contents` 權限都是 `write`、範圍都是 all |
| V-7 | 「Protect main」ruleset | 要求 PR 與 required status checks，`required_approving_review_count` 為 0 |
| V-8 | agent 的 shell 執行 `npm whoami`（2026-11-13，T-0073 落地後） | 回 `cxphoenix`：使用者為 MN1 的 collaborator 檢查登入後留下的 session，在 agent 能用的 `~/.npmrc` 裡仍然有效。agent 沒有使用它，已請使用者 `npm logout` |

V-1、V-2 表示 3.1.1 沒有受到下列任何串連影響：使用者讀的是 40 碼，遠端沒有遮蔽用的 ref。

## 信任邊界與攻擊者模型

沿用 spec 的 B1–B3，並補上分析中出現、但 spec 沒有編號的邊界。

| 邊界 | 保護什麼 | 不保護什麼 |
|---|---|---|
| B1 npm ↔ 上游的 Actions job（OIDC） | 只有上游 `publish-npm.yml`、environment `npm`、上游建立的 `v*` tag 能 stage；核准前上游比對 commit 並以 2FA 核准（`spec.en.md:181-194`） | 持有上游 push 憑證的人，agent 包括在內，可以在任何 commit 推 tag，spec 說靠 RP5 的 commit 比對抓到；job 裡的任何程式都能請求 OIDC |
| B2 上游的電腦 ↔ npm | `npm publish` 最晚停在 X9（`spec.en.md:195-200`） | X9 不是 control；`--ignore-scripts`、`npm stage publish`、`npm publish <tarball>` 都能跳過 |
| B3 上游 ↔ fork／靶場 | job 在上游以外跳過；trusted publisher 只認上游（`spec.en.md:201-205`） | 第 8 階段沒有實際在 fork 跑過 |
| B4（隱含）agent ↔ 使用者 | D13：SHA 由使用者自己讀；RP7：agent 不登入 npm、不核准 | agent 與使用者是同一個 macOS 帳號，共用 checkout、`~/.npmrc` 與 `gh` 的 admin 認證（V-6、V-8） |
| B5（隱含）GitHub 設定 ↔ 寫 ref 的人與程式 | MN7 管 `v*` 的建立、更新與刪除；MN2 讓 `npm` 只從 `v*` 部署 | 非 `v*` 的 ref 完全沒管；能寫 ref 的有 admin、兩個 GitHub App（V-6），以及 `release.yml` 的 GITHUB_TOKEN（`release.yml:10-11`） |
| B6（隱含）上游 tag ↔ 升級的 base（ADR-0009） | base 一定是上游 tag 過的 commit | 被退回的 tag 依 F3、D11 永久留下，仍算上游發布過的版本 |
| B7（隱含）release notes／provenance ↔ 老師 | provenance 寫明 repository、workflow、tag、commit | 不證明該 commit 在 `main` 上、核准前比對過，或 commit 裡的程式沒有惡意 |

攻擊者位置：被入侵的 agent（prompt injection；B1 明文列為對手，而且實際持有 admin，見 R-3）；能寫非 `v*` ref 的身分（目前是兩個 GitHub App，模型也允許 write 協作者）；`release.yml` job 裡被攻破的相依；發 PR 的外部貢獻者；fork 擁有者；能改 `range.json` 的人；`npm create wxl` 的使用者（受害者）。

## 結論

**有串連跨越信任邊界，依 review.md 要先開票，epic 才能結案。** 跨越的串連集中在兩個根因：

1. **RP2 與 RP5 讀 SHA、比對 SHA 的方式不夠嚴格**：GitHub 頁面只顯示 7 碼，RP5 (c) 只要求「至少一欄」，而使用者在 terminal 讀的 `origin/main` 是有歧義的名稱。結果是 D13 想要的「使用者獨立確認的 SHA」可以被遮蔽或被前綴碰撞替換（S-1、S-2）。
2. **agent 與使用者沒有隔離**：同一個 macOS 帳號下，「不要在 agent 能用的 shell 登入 npm」沒有任何 shell 做得到；V-8 證實第一次發布後就留下了 agent 讀得到的有效 npm session（S-3）。

這次的 3.1.1 沒有受影響（V-1、V-2）。開票範圍見最後一節，交使用者決定。

## 成立的串連

| # | 串連 | 組成 | 跨越 | 判定 |
|---|---|---|---|---|
| S-1 | **D13 的兩條讀取路徑在 agent 是對手時都不獨立**。被入侵的 agent 在惡意 commit 上推 `v<V>`：若使用者從 PR 頁讀 SHA，agent 磨出前 7 碼相同的 commit（約 2^28 次 SHA-1，推論數分鐘），RP5 (b) 在 run 頁看到的 7 碼相同（V-3），RP5 (c) 只要比對 repository、workflow、ref、shasum 任一欄就達標，而這些欄位對惡意 commit 全都吻合（`release.md:75,79-86`）；若使用者從 terminal 讀，agent 在共用 checkout 改 `refs/remotes/origin/main`，連磨都不用（`release.md:56-58`）。RP6 (b) 會看到完整的錯誤 commit，但在核准之後，而且由 agent 執行回報 | BB-2、BA-1（G1）；BB-1（G2 變體 b）；完整性檢查 PC-1、I-4、R-2 | B4 → B1 → B7 | **成立**，medium／0.6。B1 明文說「commit comparison against the confirmed SHA is what catches this」（`spec.en.md:187-189`），這條串連讓這個比對在正常操作下失效。第一次發布時，RP5 (b) 的 run commit 比對實際上是 agent 做的，使用者只回報「已核准」（T-0073 Comments，I-4） |
| S-2 | **`origin/main` 與短 SHA 可以被同名 ref 遮蔽**。能寫非 `v*` ref 的身分推一個普通分支上的 commit X（manifest 是 `<V>`、訊息仿 squash），再推 `refs/tags/origin/main` → X（MN7 只管 `v*`）。使用者一般的 `git fetch origin && git log origin/main` 會讀到 X；agent 的 RP2 自檢 `git merge-base --is-ancestor X origin/main` 通過；CI 的祖先檢查（`publish-npm.yml:50-51`，checkout `fetch-depth: 0`）同樣被遮蔽（V-4）。若使用者給的是 7 碼，再推一個以那 7 碼命名的 tag，agent 的 `git show`、`git tag -a` 都會落到 X（V-5）。RP5 比對的是 X 對 X，RP6 也一致。只有 stderr 會印 ambiguous 警告 | T0071-C1、T0073-C6、D13（BA-2，G2 變體 a）；PC-2；PC-3（`release.yml` 的 GITHUB_TOKEN 可以建立 commit 與非 `v*` ref，`release.yml:10-11`；更正 R-1） | B5 → B1 → B7 | **成立**，medium／0.6（V-4、V-5 已實測機制）。攻擊者不需要建立 `v*` tag 的權限，卻讓誠實的使用者與 agent 替它建立，等於繞過 MN7 的 creation 限制。V-6 顯示目前就有兩個 GitHub App 能寫非 `v*` ref。T-0071 把 C1 判為誤報的理由是「上游自己確認了錯的 SHA」，這條串連讓那個錯 SHA 由同一個 tag 造成，所以那個理由不再成立。只有讀 40 碼、而且來源是 server 端（PR 頁的 commit 連結或 `gh pr view --json mergeCommit`）才免疫 |
| S-3 | **共用的 `~/.npmrc` 讓 agent 拿到使用者的 npm session**。RP5 (c) 寫了「never sign in to npm in a shell the agent can use」（`release.md:84-86`），但 MN1 要求使用者登入跑 `npm access list collaborators`（`release.md:136-137`），F6 要求 `npm dist-tag add`、`npm deprecate`（`release.md:184-187`），兩處都沒有這句提醒；而且在同一個 macOS 帳號下，沒有任何 shell 是 agent 用不到的。V-8 證實 MN1 之後留下了有效 session。MN3 的實際選項只拒絕「bypass 2fa tokens」，不拒絕這種 session token。被入侵的 agent 或同帳號上被攻破的 devDependency 可以用它做不需要 OTP 的操作 | BB-5、BA-6（G5）；PC-6、PC-7、I-5、R-6 | B4 → B2／B1 | **成立（結構性）**，low～medium／0.5。publish 要 OTP（MN3），核准要網頁與 2FA，自行 stage 的 entry 會在 RP5 (a) 被退回，所以最壞情況被壓住；但 dist-tag、deprecate、`owner add`、`stage publish` 在這個帳號的 2FA 模式下要不要 OTP 沒有驗證。PC-6 另指出，被入侵的 agent 可以把 `npm login --auth-type=web` 的 2FA 網址當成「完成核准」交給使用者，把 spec 接受的「上游自己有意的互動式發布」變成 agent 能觸發的路徑（推論，low／0.3） |

## 已反駁或只留下 hardening 的串連

| # | 串連 | 判定與理由 |
|---|---|---|
| G3 | staged entry 沒有綁定產生它的 run（BA-3、BA-8、BA-9；PC-5、PC-7） | 已反駁，low。推第二個 `v*` tag 需要 admin（MN7）；npm 不論是 409 或並存，RP5 (a)、(b) 都會抓到，只有「同版號取代」這個未知語意下 (c) 是最後一道，而 (c) 的欄位比對是選擇性的。re-run 舊 run 只會 stage 舊版號，(a) 會退回；但 write 權限的 re-run 可以反覆取消正式 run（F5，DoS，PC-5）。BA-8 的 ruleset／environment pattern 分歧沒有實測，若成立會把門檻降到 write。補救與 S-1 相同：RP5 (c) 必須比對 ref 與 40 碼 commit |
| G4 | 被退回或錯誤的 `v*` tag 永久成為升級 base（BB-4、BB-7、BA-5） | 大致已反駁，low／0.78。建立任意 `v*` tag 的能力在 0009 之前就有，B1 也列為不保護；0009 新增的只是「不能刪」，F3、ADR-0009 已明文接受（SEC-T0072-12）。改 `range.json` 的人只影響三方合併的 base，target 來自套件的 source record（`create-wxl/src/upgrade.mjs:335`），base 的內容只會以看得見的衝突標記出現。BB-7（依使用者全域規則 `git push --tags`）的後果是要 admin 清理的垃圾 tag。回顧考慮把 U8 升格為 AGENTS.md 的 hard rule（SEC-T0072-05） |
| PC-4 | admin 認證停用不設 bypass 的 ruleset，移動已發布的 tag | 機制確定，low／0.7。admin 在威脅模型外，但 agent 實際持有 admin（R-3）。D11 說兩條 ruleset 能防止「anyone with their credentials」移動 tag，CHANGELOG 3.1.1 對老師說 tag「不能移動或刪除」（`CHANGELOG.md:23`），兩處都說得太滿：實際上只是把一步操作變成兩步、留在 audit log |
| PC-8 | 一次惡意核准後，RP6 (c) 在維護者帳號執行它，讀到 `gh` 的 admin 認證與 `~/.npmrc` | low／0.35。SEC-T0072-18 以「不是新行為」駁回；從串連的角度看，這是從老師端回頭擴散到上游的路徑。補救是 RP6 (c) 改在拋棄式環境或另一個帳號跑 |
| G6-a | job 內的程式（`.pnpmfile.cjs` 等）改掉上傳的 bytes，provenance 與 RP5 都看不出來 | 已反駁，未跨越：B1 已列「the repository's code」（`traceability.md:253`），commit 本身是上游確認過的。留一則 hardening：對外說明要講清楚 provenance 與 shasum 只證明「由該 commit 的 workflow 建置」 |
| G6-b | fork 以另一個名稱發布，`repository` 指向上游 | 已反駁，B3 只保護 `create-wxl` 這個名稱；沿用 SEC-T0072-15，README 是否警告 fork 不要自行發布留給回顧 |
| G5 程序面 | MN3 的實際選項文字與文件不同 | 成立，low／0.85，文件缺陷。npm UI 是「…and disallow bypass 2fa tokens (recommended)」，`release.md:140-141`、traceability MN3、R2 的測試字串是「…and disallow tokens」。下一位照文件操作的人可能誤選允許 bypass token 的另一個選項 |

## 對第二關判定的更正

- **R-1**：G2 變體 c 不只是 DoS。`release.yml` 的 GITHUB_TOKEN 能建立 commit 與非 `v*` ref，效果等同 S-2，併入 S-2。
- **R-2**：G1 與 G2 變體 b 是同一類攻擊者（被入侵的 agent），評等對齊，合併成 S-1。
- **R-3**：B1 把 agent 列為對手，威脅模型又把「repository 或 npm 帳號的 admin」排除在外（`spec.en.md:206-207`），而 agent 實際持有 repository admin（T-0073：creation ruleset 的 bypass 只有 admin，agent 推了 `v3.1.1`）。這是 spec 本身的矛盾，交使用者裁決。
- **R-4**：G2 的「從 PR 頁讀 SHA 就免疫」只在讀 40 碼時成立；PR 頁可見的只有 7 碼（V-3、V-5）。
- **R-5**：OQ-027 仍開著，是因為 S8-02 要求的「which fields were shown」在 T-0073 沒有回報；T-0073 帶著這個缺口結案。S-1 的風險在下一次發布之前不會降低。
- **R-6**：G5 不只是「MN1 少寫一句 logout」，同帳號下根本做不到，改列為結構性的 S-3。

## 漏掉的輸入（完整性檢查）

- **I-1**：「Protect main」不要求審查人數（V-7）。若有 write 協作者或有 `contents: write` 的 App，經 PR 合併到 `main` 的程式會原樣被下一次發布帶走；RP5 只比對 SHA，不看內容。這比 S-2 簡單，S-2 多出來的是隱蔽性。
- **I-6**：T-0073 的 MN7 紀錄只盤點了 collaborator 與 org member，沒有盤點 GitHub App（V-6）。
- **I-9**：`CHANGELOG.md:23` 的「不能移動或刪除」見 PC-4。
- **I-10**：T-0071 第 6 階段的 S-07（W7 檢查不到 `secrets[...]`）已由 `5baae82` 的「沒有 `${{ }}`」檢查處理；T-0070 的 S-08（`.NPMRC` 大小寫變體）只影響 B2，low。

## 開票

S-1、S-2、S-3 跨越信任邊界，依 review.md 要開票，epic 才能結案。三者的補救都落在發布流程與 spec 0009，以 spec 0009 revision 3.2 處理。parent 建議合成一張票；使用者 2026-11-14 選擇依根因拆兩張（「依根因拆兩張」）：

- **T-0074**（`.proj.tickets/0009-npm-trusted-publishing/T-0074-unambiguous-sha-sources.md`）：S-1、S-2，下列第 1～3 項。
- **T-0075**（`.proj.tickets/0009-npm-trusted-publishing/T-0075-agent-user-isolation.md`）：S-3、R-3，下列第 4～7 項。

兩張都是 `todo`，尚未排程。補救項目：

1. **RP2**：使用者只用 server 端的 40 碼來源（PR 頁 commit 連結的完整值，或 `gh pr view <n> --json mergeCommit`）；agent 只接受 40 碼。
2. **RP5**：(b) 由使用者本人執行，逐碼比對 40 碼；(c) 必須比對 ref 與 commit 兩欄，不接受「任一欄」。
3. **W6、W12 與 agent 的 RP2 自檢**：改用 `refs/remotes/origin/main`。
4. **B4 隔離**：所有需要登入 npm 的步驟（MN1 的 collaborator 檢查、RP5 的 CLI 路徑、F6）只在網頁做，或在 agent 用不到的另一個 macOS 帳號做；每次發布在 agent 的 shell 確認 `npm whoami` 回 401，並寫進紀錄。
5. **MN3**：文字改成 npm UI 的實際選項，同步更新 traceability 與 R2 的測試字串。
6. **措辭**：D11 與 CHANGELOG 不再說 tag「不能移動或刪除」，改成「只有停用 ruleset 才能移動，會留在 audit log」。
7. **R-3 的矛盾**：決定 agent 持有 admin 時，B1 與「admin 在模型外」如何並存；可能的做法是 agent 改用不含 admin 的認證，由使用者親自推 tag。

另外留給回顧、不必在這張票處理的：U8 升格 AGENTS.md hard rule、README 警告 fork 不要自行發布、RP6 (c) 改在拋棄式環境、MN7 的 bypass 從角色改成指定的人、`main` 是否要求審查人數、GitHub App 的 `contents: write` 是否必要。
