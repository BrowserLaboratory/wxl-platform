---
id: T-0023
title: Git steps and next steps
epic: 0005-create-wxl
status: done
blocked_by: [T-0022]
---

## Context

After the engine applies the setup, create-wxl turns the range into a git repository on `main` with one
commit (G0–G4), isolated from the teacher's git environment and global configuration, and prints the
next steps N1–N8 for the chosen host. Git problems are warnings: the range stays and the remaining
commands are printed.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Git steps", "Next
steps", step 12–13.

## Deliverable

A configured run ends with a repository holding exactly one commit `Create range from WXL <V>`, no hook
run, a clean status, and the next-step lines for its host; missing git, an old git, a missing identity
or a failing git command each print their warning and the commands still to run, and exit 0.

## Acceptance criteria

- [x] C35: real git, isolated identity, a global template `post-commit` hook, `commit.gpgsign=true` → on `main`, one commit, `git ls-files` equals the range's files, clean status, hook not run (AC-15)
- [x] C36: `runGit` rejects `ENOENT` on G0; G0 reports 2.19.0 → CW-W01, no further `runGit`, exit 0, N2 lists printed G1, G2, G4 (AC-15)
- [x] C37: no identity (isolated `HOME`, `XDG_CONFIG_HOME`, system config off) → CW-W02 after G1–G2, no G4, not CW-W03, exit 0, N2 lists the two config commands then G4 (AC-15)
- [x] C38: G2 exits 1 → CW-W03, G3 and G4 not run, exit 0, N2 lists printed G2 and G4 (AC-15)
- [x] C40: success for each host → the "Next steps" lines for that case, ids in order (AC-17)
- [x] C58: `deps.env` with `GIT_DIR=/elsewhere` → no `runGit` call receives `GIT_DIR` (AC-15)
- [x] C59: global `core.excludesFile` ignoring `lib/`, archive file under `lib/` → the file is in the commit (AC-15)
- [x] C70: every `runGit` env of C35 has no `GIT_*` other than `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1` (AC-15)

## 給使用者（zh-TW）

套用設定後，create-wxl 把靶場變成 git repository：`main` 分支、一個 commit，不受老師的 git 全域設定與 hook 影響；最後依主機印出下一步（建 GitHub repository、push、設定 Pages 等）。沒有 git、git 太舊、沒設身分或指令失敗都只是警告，靶場保留並印出還沒跑的指令。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Drafted by a workflow (one drafting agent, one independent checker that corrected 14 problems) and approved by the user on 2026-10-16 together with T-0020–T-0025 and decisions D1–D12, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S1 | 設定成功後，create-wxl 用真的 git 把靶場變成 `main` 上只有一個 commit 的 repository，靶場每個檔案都在 commit 裡（包括被靶場自己 `.gitignore` 忽略的檔案）；老師全域設定的 template hook 與 commit 簽章都不影響結果 | `create-wxl/test/run-git.test.js`（副檔名依 T-0020 慣例），describe「git steps — real git」。T-0022 能被引擎套用的 fixture archive（測試內建），另外加 `.gitignore`（內容 `*.log`）與 `keep.log`；`fetchArchive` stub；真的引擎（從 `scripts/fork-init.ts` import）；非互動 argv `<dir> --author=Ada --repo=alice/r --host=github-pages`；`packageVersion`／`source.version` = `1.2.3`。`runGit` 用本 ticket 新增的真 runner，外面包一層 recorder。`deps.env` = `{ HOME, PATH, XDG_CONFIG_HOME }`，HOME 與 XDG_CONFIG_HOME 指到暫存目錄。HOME 的 `.gitconfig` 設 `user.name`／`user.email`、`init.templateDir=<tmp>/tpl`（`tpl/hooks/post-commit` 是 0755 script，會在 target 外的絕對路徑寫 marker 檔）、`commit.gpgsign=true`、`gpg.program=<tmp>/no-such-gpg`（不存在的路徑，必要設定）。測試自己用來驗證的 git 指令，也用同一組隔離 env 加 `GIT_CONFIG_NOSYSTEM=1` | C35 / AC-15 | 先斷言 `<target>/.git` 是目錄。綠燈：exit 0；`git symbolic-ref HEAD` 是 `refs/heads/main`；`git rev-list --count HEAD` 是 `1`；`git log -1 --format=%s` 是 `Create range from WXL 1.2.3`；`git ls-files` 排序後等於 target 走訪出的檔案清單（不含 `.git/`；含 `range.json`、引擎寫的 `.github/workflows/deploy.yml`、`keep.log`）；`git status --porcelain --untracked-files=all` 是空字串；hook marker 檔不存在；`<target>/.git/hooks/post-commit` 不存在；沒有 CW-W01–W03，也不印 N2。預期紅燈：T-0022 結束時 step 12 還不存在，`<target>/.git` 不存在（`expected false to be true`），recorder 一次呼叫都沒有。實作中途可能出現的紅燈：少了 `--template=` 時 `.git/hooks/post-commit` 存在（若這版 git 把空的 `core.hooksPath` 當預設值，marker 也會出現）；G2 少了 `--force` 時 `keep.log` 不在 `git ls-files` 裡；少了 `-c commit.gpgsign=false` 時 G4 失敗，印出 CW-W03 |
| 0005-S1 | C35 那次執行中，每個 `runGit` 呼叫的 args 都是「Git steps」固定清單的指令，cwd 都是 target；env 等於 `deps.env` 去掉 `GIT_*`，再剛好加上 `GIT_TERMINAL_PROMPT=0` 與 `GIT_CONFIG_NOSYSTEM=1` | 同上 describe，與 C35 共用 setup（同一個 recorder），另寫一個 `it` 檢查 recorder 錄下的每筆 `{ args, cwd, env }` | C70 / AC-15（「Git steps」固定清單） | 剛好錄到 7 筆，args 依序是：`['--version']`、`['init','--template=']`、`['symbolic-ref','HEAD','refs/heads/main']`、`['-c','core.excludesFile=','add','-A','--force']`、`['config','--get','user.name']`、`['config','--get','user.email']`、`['-c','user.useConfigOnly=true','-c','commit.gpgsign=false','-c','core.hooksPath=','commit','--no-verify','-m','Create range from WXL 1.2.3']`（G3 兩筆的順序依實作，可以只比對集合）。每筆 cwd 是 target 的絕對路徑；每筆 env deep-equal `{ HOME, PATH, XDG_CONFIG_HOME（都是 deps.env 的原值）, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1' }`。預期紅燈：C35 的最小實作若直接傳入 `deps.env`，env 會少這兩個變數（deep-equal 失敗）；args 少了 C35 沒逼出來的選項（例如 `--no-verify`、`core.hooksPath=`、`user.useConfigOnly=true`）時，args 比對失敗。若 C35 那一輪已經全部做到，這一列會直接綠燈，照 T-0019 row 4 的方式記錄 |
| 0005-S1 | 呼叫端環境裡的 `GIT_DIR` 不會傳到任何 git 指令，呼叫端給的 `GIT_TERMINAL_PROMPT` 也會被覆寫 | `create-wxl/test/run-git.test.js`，describe「git steps — injected runGit」。`runGit` 換成照 args 回應的 stub，每一步都成功：`--version` 回 `git version 2.54.0`，`config --get` 回非空字串，其餘回 code 0；同時記錄呼叫。`deps.env` = `{ HOME, PATH, XDG_CONFIG_HOME, GIT_DIR: '/elsewhere', GIT_TERMINAL_PROMPT: '1' }`；fixture、引擎與 argv 同 C35 | C58 / AC-15 | 每筆呼叫的 env 都 deep-equal `{ HOME, PATH, XDG_CONFIG_HOME, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1' }`：沒有 `GIT_DIR`，`GIT_TERMINAL_PROMPT` 是 `'0'` 而不是呼叫端給的 `'1'`；每筆 cwd 是 target 的絕對路徑；呼叫數是 7；exit 0。預期紅燈：實作若是 `{ ...deps.env, GIT_TERMINAL_PROMPT, GIT_CONFIG_NOSYSTEM }`（C70 用的 deps.env 沒有 `GIT_*`，所以那一輪會過），env 會帶著 `GIT_DIR: '/elsewhere'` |
| 0005-S1 | 老師全域 `core.excludesFile` 排除的路徑，只要是 archive 裡的檔案，仍然要進第一個 commit | describe「git steps — real git」。fixture archive 另外放 `lib/x.js`；隔離 HOME 的 `.gitconfig` 設 `core.excludesFile=<tmp>/global-ignore`（內容 `lib/`），identity 與 `gpg.program` 設法同 C35；argv 同 C35 | C59 / AC-15 | 綠燈：`git ls-files` 包含 `lib/x.js`；`git status --porcelain --untracked-files=all` 是空字串；`git rev-list --count HEAD` 是 `1`；exit 0；沒有 CW-W03。預期：直接綠燈，當回歸測試。`git add --force` 本身會加入被全域 excludes 忽略的檔案，而 C35 與 C70 已經讓 G2 帶 `--force`，所以照 T-0019 row 4 的方式記錄。只有 G2 同時沒有 `-c core.excludesFile=` 和 `--force` 時才會紅燈：`lib/x.js` 不在 `git ls-files` 裡 |
| 0005-S1 | 設定與 git 都成功時，依主機印出該印的「Next steps」行，依 id 順序 | `create-wxl/test/run-next-steps.test.js`，`it.each` 兩種主機：`<dir> --author=Ada --repo=alice/r --host=github-pages --lang en`，以及 `<dir> --author=Ada --repo=alice/r --host=cloudflare-pages --origin=https://r.pages.dev --lang en`。`io.interactive=false`；T-0022 的 fixture archive 與真的引擎；`runGit` 用全部成功的 stub（同 C58，不帶 `GIT_*`）；用 T-0020 的訊息 id 慣例在輸出裡找出各行 | C40 / AC-17 | GitHub Pages：依序出現 N1、N3、N4、N5、N7。N3 含 `alice/r`；N4 含 `git remote add origin https://github.com/alice/r.git` 與 `git push -u origin main`；N5 含 `GitHub Actions`、`github-pages`、`v*`、`git tag v0.1.0`、`git push origin v0.1.0`；N7 含 `pnpm install`、`wasm-pack`、`Prerequisites`。不出現 N2、N6、N8。Cloudflare Pages：依序出現 N1、N3、N4、N6、N7，N6 含 `Deploying to Cloudflare Pages`；不出現 N2、N5、N8。兩種主機都是 exit 0。預期紅燈：T-0022 結束時設定成功的路徑沒有 N3–N7，找 N3 的那一行時找不到 |
| 0005-S1 | 找不到 git、`git --version` 失敗，或版本低於 2.20：CW-W01，之後不再呼叫 git，下一步列出 G1、G2、G4 要印的指令 | describe「git steps — injected runGit」，`it.each`。fixture、引擎與 argv 同 C58，但 `deps.env` 只有 `{ HOME, PATH, XDG_CONFIG_HOME }`。stub 的 G0 失敗 case：reject `Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' })`；resolve `{ code: 0, stdout: 'git version 2.19.0\n' }`；resolve `{ code: 0, stdout: 'git version 2.9.5\n' }`；resolve `{ code: 1, stdout: '', stderr: '' }`（AC-15 的 failing G0）。另寫一個對照 `it.each`，以下都接受且其餘步驟都成功：`git version 2.20.0`、`git version 2.39.5 (Apple Git-154)`、`git version 2.45.1.windows.1` | C36 / AC-15 | 四個失敗 case 都是：CW-W01，文字含 `https://git-scm.com/downloads` 與 G1、G2、G4 的印出用形式；`runGit` 只被呼叫 1 次；exit 0；N2 在 N1 之後、N3 之前，依序是 `git init`、`git symbolic-ref HEAD refs/heads/main`、`git add -A`、`git commit -m "Create range from WXL 1.2.3"`；CW-W01 與 N2 的文字裡沒有 `--template`、`--force`、`-c `。對照組：不印 CW-W01，有 G1 的 `init` 呼叫（守住 2.20 下限、數字比較與版本尾綴）。預期紅燈：ENOENT case 的 rejection 沒被處理，變成 CW-E14、exit 1；2.19.0 與 2.9.5 會繼續呼叫 G1（呼叫數 > 1，2.9.5 抓的是字串比較的錯） |
| 0005-S1 | 沒有明確設定 committer identity 時，警告 CW-W02，不做 commit，也不當成 CW-W03 | describe「git steps — real git」。HOME 與 XDG_CONFIG_HOME 都是空的暫存目錄，`deps.env` 只有 `{ HOME, PATH, XDG_CONFIG_HOME }`（`GIT_CONFIG_NOSYSTEM=1` 由 `run` 組 env 時加上）；真 runner 外面包一層 recorder；fixture、引擎與 argv 同 C35 | C37 / AC-15 | exit 0；輸出有 CW-W02 且沒有 CW-W03；CW-W02 的文字含 `git config --global user.name "<your name>"`、`git config --global user.email "<you@example.com>"` 與 `git commit -m "Create range from WXL 1.2.3"`；recorder 有 `init`、`symbolic-ref`、`add`、`config --get` 的呼叫，沒有任何 args 含 `commit`；`<target>/.git` 存在，`git ls-files` 有靶場的檔案，`git rev-parse --verify HEAD` 失敗（還沒有 commit）；N2 在 N1 之後、N3 之前，依序列出那兩條 `git config --global` 指令與 `git commit -m "Create range from WXL 1.2.3"`。預期紅燈：沒有 G3 檢查時，G4 帶著 `user.useConfigOnly=true`（C70 已釘住）失敗，印出 CW-W03 而不是 CW-W02；若 G4 沒帶這個選項，就會用推得的隱含 identity 完成 commit（`rev-list --count` 是 1、沒有 CW-W02） |
| 0005-S1 | `git config --get` exit 0 但沒有輸出，也算沒有明確 identity（CW-W02） | describe「git steps — injected runGit」，`it.each` 兩個 case：`user.name` 回 code 0、stdout `''`；`user.name` 有值，但 `user.email` 回 code 0、stdout `''`。其餘每一步都成功；fixture、引擎、argv 與 env 同 C36 | C37 / AC-15（AC-15「exit 1 or empty」的 empty 這一半） | 兩個 case 都是：CW-W02、沒有 CW-W03、沒有 args 含 `commit` 的呼叫、exit 0；N2 列出兩條 `git config --global` 指令，接著是印出用的 G4。預期紅燈：只看 exit code 的 G3 會讓流程走到 G4，recorder 錄到 `commit` 呼叫，也沒有 CW-W02 |
| 0005-S1 | G1–G4 中，G3 的 exit 1 以外的指令失敗（exit 非 0，或 runner 以 ENOENT 以外的錯誤 reject）：CW-W03，略過剩下的步驟，下一步列出還沒完成的指令 | describe「git steps — injected runGit」，`it.each`。G0 回 `git version 2.54.0`、G1 成功；fixture、引擎、argv 與 env 同 C36。case ①：G2 回 `{ code: 1, stdout: '', stderr: 'fatal: boom' }`；case ②：G2 reject `Object.assign(new Error('boom'), { code: 'EACCES' })`；case ③：G2 成功，G3 的 `config --get user.name` 回 `{ code: 128, stdout: '', stderr: 'fatal: bad config' }` | C38 / AC-15 | ①②：CW-W03，用印出用的形式 `git add -A` 指名失敗的指令（不含 `--force`、`core.excludesFile`），並帶出 `fatal: boom`（或錯誤訊息 `boom`）；沒有 G3（`config --get`）或 G4（`commit`）的呼叫；exit 0；N2 在 N1 之後、N3 之前，依序只有 `git add -A`、`git commit -m "Create range from WXL 1.2.3"`，沒有 `git init`。③：是 CW-W03、不是 CW-W02，帶出 `fatal: bad config`；沒有 `commit` 呼叫；exit 0；N2 只有 `git commit -m "Create range from WXL 1.2.3"`，沒有 `git config --global`。預期紅燈：G2 失敗後仍照跑 G3／G4（recorder 錄到 `commit`），或沒有 CW-W03、沒有 N2；③ 的 G3 若把所有非 0 都當 CW-W02，就會印出 CW-W02 與兩條 config 指令 |

**Notes**

- 要改 body 的既有測試（需要核准的 override）：T-0019 的測試都不受影響（本 ticket 不改引擎）。T-0020–T-0022 的測試還沒寫，所以只是條件式預告：step 12 加上去以後，T-0022 那些設定成功的執行（C32、C34、C63、C68 等）會開始呼叫 `runGit`。如果共用的 deps helper 預設 `runGit` 是一被呼叫就失敗的 `vi.fn`，或是真 runner，要把預設改成「全部成功」的 stub，這是 fixture 的修改。如果 T-0022 有測試斷言設定成功後的完整 stdout，或斷言 `runGit` 沒被呼叫，那幾個測試 body 要改，第一個測試寫下去之前要先列出來請使用者核准。T-0020 的 C39（`--no-setup` 不呼叫 `runGit`、只印 N1 與 N8）與 T-0022 的 C33（CW-E12 時不跑 git）維持不變，當回歸測試。
- 要建立的 fixture，全部在測試內產生，都不能出現 upstream slug，要 import `UPSTREAM_SLUG`。① 隔離的 HOME 暫存目錄：`.gitconfig` 含 identity；`init.templateDir` 指到一個 template，裡面的 `hooks/post-commit` 是 0755、會在 target 外寫 marker 檔；`commit.gpgsign=true`，`gpg.program` 指到不存在的路徑（必要，讓 gpgsign 的紅燈不受本機 gpg 影響）。② C59 用的 HOME：再加上 `core.excludesFile` 指到內容為 `lib/` 的檔案。③ C37 用的空 HOME 與空 XDG_CONFIG_HOME。④ 用 T-0020 的 archive builder 建立 T-0022 引擎可套用的 entry list，C35 加 `.gitignore`（`*.log`）與 `keep.log`，C59 加 `lib/x.js`；pax `comment` 等於 source commit，符合 T-0021 的 entry rules。⑤ 照 args 回應的 `runGit` stub factory：可設定 `--version` 的 stdout、各指令的 code／stdout／stderr／reject，並記錄 `{ args, cwd, env }`。⑥ 包住真 runner 的 recorder。⑦ 帶 `code` 的錯誤物件（ENOENT、EACCES）。⑧ 測試用來驗證的 git helper：只用隔離的 `{ HOME, PATH, XDG_CONFIG_HOME, GIT_CONFIG_NOSYSTEM: '1' }`，不繼承 process.env。
- 假設前面的 ticket 已交付：T-0020 的 `run(argv, io, deps)`、`makeDeps` 一類的 helper（含與引擎檔相符的 `source.engineSha256`）、archive builder、en／zh-TW 兩份訊息表（含 id）、N1／N8 的輸出與用 id 比對的慣例、`checkpoint('step-12'/'step-13')`、exit code 規則、各訊息寫到 stdout 還是 stderr 的慣例；T-0021 的 entry rules 與 P1–P4（fixture 必須遵守）；T-0022 的 step 5／11 成功路徑、最後一次被接受的 parse 結果（step 13 用它的 `repo` 與 `host` 組 N3–N6）、能被真引擎套用的 fixture。本 ticket 新增：step 12（G0–G4、env 隔離、CW-W01–W03）、step 13 的 N2–N7，以及 `child_process.spawn` 型的真 runner。真 runner 要從 create-wxl 的 module export，因為 real-git 測試要用它；`bin` 的接線由 T-0025 負責。N2–N7 與 CW-W01–W03 的文字要同時加進 en 與 zh-TW 兩份訊息表，T-0024 的 C41 會檢查兩表 id 相同。
- 真 runner 的契約（假設）：spawn 時只用呼叫端給的 `env`，不合併 `process.env`。在 git hook 裡跑 vitest 時，process.env 會帶 `GIT_DIR`、`GIT_INDEX_FILE`，合併的話 real-git 測試會寫到別的 repository；不經 shell；`git` 只從 PATH 的絕對目錄解析（測不測見 open question 3）。
- 解讀（假設）：CW-W03 指名失敗的指令時用印出用的形式，依據是「Git steps」表 Printed form 欄寫著 for N2, CW-E12, CW-W01–W05，而且 printed forms never carry `--force`；N2 列出失敗的那條指令與其後還沒跑的指令（C38：printed G2 and G4）；G3 沒有印出用的形式，所以 G3 失敗時 N2 只列 G4。
- 不屬於本 ticket：step 12 收到訊號（C56 的 `SIGHUP`；git 收到訊號後 exit 非 0 要算訊號、不算 CW-W03）、輸出的跳脫與 POSIX quoting（C60，本 ticket 的 stderr 只斷言「含有」）、語言規則（C41），都由 T-0024 負責；C40 只用 `--lang en` 檢查。
- 跨平台：real-git 測試不是 mode 或唯讀測試，依 spec 的 skip 規則，Windows 和 root 都不 skip，會在 U3 的 cross-OS job 跑。所以真 runner 在 Windows 要能從 PATH 的絕對目錄找到 `git.exe`。spec 規定 deps.env 只有 HOME、PATH、XDG_CONFIG_HOME，Windows 上沒有 `SystemRoot`、`PATHEXT`；如果 git 因此在 Windows job 失敗，先停下來回報，不要自行在 env 加變數（那會偏離「plus exactly」）。fixture 把 hook 設成 0755 只是 setup，不算 mode 檢查。
- G4 的 commit message `Create range from WXL <V>` 是產品輸出，不是 agent 做的 commit，不套用 AGENTS.md hard rule 5（spec「Git steps」）。
- 第 8 階段的 surface（提議）：create-wxl 的 git 行為在本機終端機與真的 git binary 上執行。本 ticket 打算以本機 `vitest` 的執行紀錄當第 8 階段紀錄，包含真 git 的 C35／C70／C59／C37；0005-S4 的打包後終端機執行（run I 的 `git log --oneline` 只有一行、`git ls-files`）在 T-0025 跑，因為 `dist/` 與 `bin` 到那時才存在。這樣是否符合「Overridden contracts」的 stage 8 規則，見 open question 1。
- TDD 順序依表格列的順序。C70、C59 可能直接綠燈，照 T-0019 row 4 的方式記錄成「沒有紅燈」。C40 排在警告列之前，是因為 C36–C38 斷言 N2 在 N3 之前。

**Decisions applying to this ticket (approved 2026-10-16)**

- D1: stage 8 is the create-wxl vitest run record (0005-S1, in-process); the terminal surface (0005-S4) runs in T-0025.
- D3: CW-E and CW-W messages go to `stderr`; next-step lines go to `stdout`; tests pin the stream.
- D7: when G1 half succeeds, CW-W03 and N2 list the commands from the failing `git symbolic-ref` on.
- D8: add one test that the runner never executes a `git` planted in the target directory (relative `PATH` entries ignored), outside the claimed rows.

### 2026-10-17 — increment plan confirmed

The executor's increment plan was checked by an independent reviewer (approve with corrections). Confirmed with these corrections: each row does only what its own test forces, so the approved reds stay real — row 1 (C35) adds `.git`, `--template=`, `--force` and `-c commit.gpgsign=false` only, without filtering `GIT_*` and without touching step 13's output for a setup run; row 2 (C70) adds G0, both G3 calls, `--no-verify`, `core.hooksPath=`, `user.useConfigOnly=true`, `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1`, asserting all seven args, each cwd and the env; row 3 (C58) adds the `GIT_*` filter; row 7 checks G3's exit code only, row 8 its empty output, row 9 narrows CW-W02 to exactly exit 1 with every other non-zero or rejection CW-W03; every row asserts the approved Boundary column literally and pins the stream (CW-W on stderr, N lines on stdout, D3); reds are recorded as they actually appear; the runner spawns with only the given env, without a shell, resolves git only from absolute PATH directories (`git.exe` on Windows) and rejects with `code: 'ENOENT'` when none is found; G0 output that cannot be parsed, and a synchronous throw, count as CW-W01; CW-W03 prints git's stderr and error messages as JSON string literals; CW-W01 includes `https://git-scm.com/downloads`; before implementing, T-0020's tracer assertion that N2–N7 do not appear is read to see whether adding those messages affects it (a body change needs approval); fixtures import `UPSTREAM_SLUG`.

Decided under "follow the recommendations" (2026-10-16): (1) D7 — `git init --template=` succeeds and `git symbolic-ref` fails — gets its own test: CW-W03 naming `git symbolic-ref HEAD refs/heads/main`, N2 listing it, then G2 and G4; (2) the runner also skips a PATH entry that resolves to the target directory or the cwd, besides relative entries ("never from the target directory"); (3) the D8 test exercises the runner directly, since `run` only sees an injected `runGit`; (4) an `ENOENT` rejection from G1–G4 is CW-W03, only G0's is CW-W01; (5) the `GIT_` prefix filter compares names exactly, as the spec says; Windows' case-insensitive environment names are a recorded known limit; (6) test files are `.mjs`.

Started on 2026-10-17 from T-0022's branch tip while PR #28 was in CI with auto-merge on, so the ticket order holds in content; the branch was moved onto `main` (`ae1c677`, a soft reset to the identical tree) after #28 landed, before the first commit.

### 2026-10-17 — red → green log

**Process deviation (reported to the user).** At row 6 the executor wrote G3's identity check, G4's failure classification and CW-W02/CW-W03 together with G0's CW-W01, which would have consumed the approved reds of rows 7–9. It noticed before running those rows, reverted `git-steps.mjs` to the row-6 state (G0 → CW-W01 only, other G1–G4 failures swallowed), wrote rows 7, 8 and 9's tests, ran them for the reds below, and then added each row's logic. The reds are real against the row-6 code, but that code was restored by hand from a version written ahead; the final code equals the version written ahead. Accepted under "follow the recommendations" and recorded, not redone.

Reproduce a row with `pnpm --dir create-wxl exec vitest run test/<file> -t="<pattern>"`.

| Row | Test file › pattern | Red | Green | Selected |
|---|---|---|---|---|
| 1 C35 | `run-git.test.mjs` › `C35` | `Error: ENOENT: no such file or directory, lstat '…/d/.git'` | 1 passed | 1 |
| 2 C70 | › `C70` | `expected [ …(4) ] to have a length of 7 but got 4` | 1 passed | 1 |
| 3 C58 | › `C58` | `GIT_DIR: '/elsewhere'` still in the call's env | 1 passed | 1 |
| 4 C59 | › `C59` | no red: `--force` came in at row 1 and `-c core.excludesFile=` with row 2's argument assertions, so C59 was green at once | 1 passed | 1 |
| 5 C40 | `run-next-steps.test.mjs` › `prints the ids` | `expected -1 to be greater than 338` (no N3) | 2 passed | 2 |
| 6 C36 | `run-git.test.mjs` › `C36` | `expected '' to match /^CW-W01/m` | 7 passed | 7 |
| 7 C37 | › `C37: no identity` | `expected '' to match /^CW-W02/m` | 1 passed | 1 |
| 8 C37 | › `C37 \(empty output\)` | `expected '' to match /^CW-W02/m` (exit 0 with empty output went on to commit) | 2 passed | 2 |
| 9 C38 | › `C38` | ①② `expected '' to match /^CW-W03/m`; ③ `expected 'CW-W02: …' to match /^CW-W03/m` (any non-zero G3 was CW-W02) | 3 passed | 3 |
| D7 (decision 1) | › `D7` | no red: row 9's classification covers a failing `symbolic-ref` | 1 passed | 1 |
| D8 (decision 3) | › `D8` | no red: the runner's PATH rules (absolute directories only, the target skipped) were built with row 1's real runner, without a red of their own (a deviation of the same kind as row 6's); stage 6 added a relative-entry case and confirmed it turns red with the `isAbsolute` check removed | 1 passed | 1 |

Checks: `pnpm --dir create-wxl test` → `Test Files 12 passed (12) / Tests 251 passed (251)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; the en and zh-TW tables hold the same 44 ids. No existing test body changed. CW-W03 names a failing G3 by its literal call (`git config --get user.name`), unquoted: the spec's POSIX quoting applies to N1, N2, N8, CW-E12 and CW-W05 only.

### 2026-10-17 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S1 | `run-git.test.mjs` (19), `run-next-steps.test.mjs` (2) | not measured: no coverage provider is installed in create-wxl | C35–C38, C40, C58, C59, C70; decisions D7, D8 | signals during steps 12–13 (CW-W05), control-character escaping in N lines (C60) and the `bin`'s use of the real runner are T-0024/T-0025; Windows PATH resolution (`git.exe`) runs only on macOS until T-0025's cross-OS CI; environment names are compared case-sensitively (decision 5, known limit) |

**Stage 8 verification surface (D1).** create-wxl vitest runs, in-process; rows 1–4 and D8 run real git in isolated temporary folders.

### 2026-10-17 — stages 6 and 7 disposition

One review workflow on the staged change: Standards (25 findings, S-01–S-25, none high), Spec (20, P-01–P-20, none high), security candidates (9, C-01–C-09) with an independent false-positive filter (no candidate met the threshold). Findings and their full evidence were kept with the run; ids below are that run's.

Fixed (pre-authorisation 2 and "follow the recommendations"), each behaviour fix with a test written and run first:

- C-01, P-03, C-05: the runner skips every PATH entry whose real path is the target or lies under it (for example `<target>/node_modules/.bin`), comparing real paths (red: the fake git under the target ran). Decision 2's "the cwd" is the call's cwd, which is the target; the process cwd is not excluded separately (S-16, P-02: this record corrected accordingly).
- P-01: D8 gains a relative-entry case; no red against the code, and a one-off removal of the `isAbsolute` check turned it red (restored at once).
- C-06: on win32 the runner finds the path variable case-insensitively (`Path`) and looks for `git.exe`; the platform is injectable (red: `spawn git ENOENT`).
- C-08: a PATH candidate must be a regular file (red: a directory named `git` was chosen, `EACCES`).
- S-17, P-19: git's stdout and stderr are decoded as UTF-8 across chunks (red: `��` for 中).
- P-13: tests for unparsable G0 output, a synchronous throw from `runGit`, and the runner's ENOENT when no PATH directory has git; no red: existing behaviour.
- S-24, P-16: `checkpoint('step-12')` runs only when setup runs (red: a `--no-setup` run reached it).
- C-09, P-15, S-19: N3 prints the repository as a JSON string literal, as the spec's rule for answers outside copied commands says; N4 is a copied command and keeps POSIX quoting, although the spec's list of copied commands names N1, N2, N8, CW-E12 and CW-W05 only (reading recorded here).
- S-21: zh-TW N5 and N7 wording.
- Tests raised to the approved Boundary column (S-01–S-08, P-04–P-11, P-14, P-20), all green without production changes: `makeDeps`'s default `runGit` is now an all-success stub, as the Notes required (T-0020–T-0022 bodies unchanged and green); `jsonValue` instead of `JSON.stringify`; printed forms in CW-W01 and none of `--template`, `--force`, `-c ` in N2; `.git` a directory and `git ls-files` holding the range after CW-W02; N2's order before N3; C40 built from the `en` lines in order with an empty stderr; two stub cases for G3 (name missing with email erroring is CW-W03; whitespace-only output is missing). P-11: the literal env of C70/C58 includes `LANG: 'en_US.UTF-8'`, because `makeDeps` merges it into `deps.env`; the approved table's literal omitted it.
- S-14, S-15, P-12: test gitconfig paths use forward slashes; tests that plant a `#!/bin/sh` fake git skip on win32, and `findRealGitDir` looks for `git.exe` there.
- Cleanup: the printed git forms have one source shared with CW-E12 (S-09); CW-W01 takes the minimum version from the code (S-10); one numeric version comparison (S-11); `gitResult` passed whole (S-12); stale comments (S-13); one gitconfig builder (S-22); shared argv and in-order helper in the tests (S-23); quote style (S-25).

Recorded, not changed:

- P-18: row 6's red is recorded as one message for the batch; the four cases' individual messages were not kept.
- S-20: N2 prints the "Printed form" column of the git steps as is, without re-quoting.
- C-02: `.git` aliases on NTFS and HFS+ are T-0021's rule 3 spec gap, input to the epic close-out chain analysis; G1 and G2 make it reachable.
- C-03: G4's `-c core.hooksPath=` with an empty value may resolve hook paths to the file-system root (the filter's reading of git's source, not run): the spec's G4 literal, a spec gap for the chain analysis.
- C-04: G1 and G2 run the teacher's global hooks, fsmonitor and filter drivers, as B7's "Does not protect" says; this ticket's Deliverable says "no hook run", which holds for template hooks and for G4 only.
- C-07: `GIT_` names compared case-sensitively (decision 5).
- Test helper `real-git.mjs`'s `verifyGit` still concatenates chunks without UTF-8 decoding; it reads ASCII git output only.

Stage 7 report: `.proj.specs/0005-create-wxl/review/security-T-0023.md`.

Checks after the fixes: `pnpm --dir create-wxl test` → `Test Files 12 passed (12) / Tests 265 passed (265)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; after staging, `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` → `97 passed | 1 skipped`; the en and zh-TW tables hold the same 44 ids.

### 2026-10-17 — landed

Squash-merged into `main` as `8fb2d34` (PR #29) by GitHub auto-merge (squash) after all ten checks passed. Status set to `done`.

### 2026-10-17 — acceptance criteria ticked

The acceptance criteria were left unticked when this ticket entered stage 6 (found in T-0024's stage 6 review). Ticked now against the red → green log and the stage 6 disposition above: every criterion has passing tests on `main` (`8fb2d34`).
