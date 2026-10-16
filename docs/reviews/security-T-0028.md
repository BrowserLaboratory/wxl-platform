# 第 7 階段資安審查：T-0028

範圍：分支 `tickets/T-0028/pin-wasm-pack-install`，base `de397ca`（審查時為尚未 commit 的 WIP）。審查兩份 README 與兩份 `wxl-fork-init` skill 把 `cargo install wasm-pack` 改為 `--version 0.14.0 --locked`、README 的 Cloudflare Pages 說明，以及 `tests/unit/workflows/toolchain-parity.test.ts` 新增的測試。這張 ticket 沒有 epic，需求是 ticket 的維護計畫 M1–M3，所以報告放在 `docs/reviews/`。

方法：專案 `security-review` skill。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、沒有網路；本機證據是 cargo 快取裡 wasm-pack 0.14.0 的 `Cargo.lock` 與 `src/install/mod.rs`、`binary-install` 0.4.1 的 `src/lib.rs`。依 ADR-0005，題目的刻意弱點不算 finding；這次變更與題目無關。

## 結果

**本 diff 引入的可利用缺陷：0 項。** 候選 10 項，獨立篩選判定沒有一項達到通報門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。整體而言，固定版本加 `--locked` 讓文件與 CI 安裝相同版本，並以 lockfile 的 checksum 取得可重現的相依，供應鏈風險比原本的裸 `cargo install wasm-pack`（每次建置都解析最新的相容版本）低。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | `--locked` 會用 lockfile 裡已撤回的 `zip 2.4.2` | 模型外：`wasm-pack build` 只下載 `.tar.gz`，解 zip 的路徑只在 `wasm-pack test --chrome` 用到，本專案不呼叫；解壓也擋路徑穿越；撤回不改變已發布內容，lockfile 有 checksum | 記錄撤回原因（見下） |
| 02 | `--locked` 凍結傳遞相依，拿不到自動的安全修補 | hardening：反向而言，裸 install 每次建置都會拉進新的 patch 版，攻擊面更大；`--locked` 與 CI 的固定原則一致 | 記錄：升級 wasm-pack 時對它的 `Cargo.lock` 跑一次 `cargo audit` |
| 03 | 內建的 CA 清單（webpki-roots 1.0.5）被凍結 | hardening：需要被撤信 CA 的憑證加上對建置機的 MITM | 同 02 |
| 04 | 說文件與 CI「安裝同一份 build」不精確 | 已修正（第 6 階段）：改為「同一個版本」 | — |
| 05 | wasm-pack 建置時下載 wasm-bindgen 與 binaryen 不比對 checksum | 既有行為，本 diff 沒有引入或放大 | 記錄：可另開 ticket 評估在 Cloudflare 先裝固定版本的工具 |
| 06 | 測試可被其他寫法或 `--git` 繞過 | 已修正；之後再補上 `cargo +<toolchain> install` 與拒絕 `--config` | — |
| 07 | 兩份 skill 仍教裸 install | 已修正（第 6 階段） | — |
| 08 | 停在 0.14.0 可能錯過 0.15.0 的安全修補 | 推測；CI 本來就固定 0.14.0，文件只是跟上 | 記錄：升級時 CI 與文件一起改，測試會自動帶入版本 |
| 09 | rustup 的 `curl \| sh` | 確認未變更，仍有 `--proto '=https' --tlsv1.2` | — |
| 10 | T-0019 的落地紀錄 | 不適用：沒有程式碼 | — |

## 撤回原因

研究結果（2026-10-16 查證，一手來源）：

- crates.io 的紀錄顯示，`zip` 2.0.0–2.6.1（以及 0.x、1.x、3.x–8.x、9.0.0–9.0.2）都在 2026-10-16 03:35 UTC 前後由維護者一次撤回；只剩 9.0.3、9.0.4。維護者在 zip-rs/zip2 issue #1075 說明撤回是因為該 repository 的 GHSA-vv5m-jxxh-4627、GHSA-4v9h-p7m9-rh26、GHSA-4684-h2q9-2vcp（解壓時保留 SUID／SGID、`extract` 建立指向外部的 symlink、經由 symlink 套用權限），並表示月底還會公布其他問題。
- RustSec 目前沒有影響 `zip` 2.4.2 的 advisory（`crates/zip` 只有 RUSTSEC-2025-0168，範圍 `<2.3.0`）。三個 GHSA 描述的是 `ZipArchive::extract`；`binary-install` 0.4.1 自己逐一走訪 entry（`by_index` 加 `enclosed_name`），沒有呼叫它，而本專案的 `wasm-pack build` 也不解 zip（候選 01）。
- wasm-pack 到今天沒有新 release；0.15.0 與 master 的 `Cargo.lock` 仍鎖 `zip` 2.4.2，所以不加 `--locked` 的 `cargo install wasm-pack` 現在一律解析失敗，與 Cloudflare 的錯誤一致。
- wasm-pack 0.14.0 的 `Cargo.lock` 有已公開的 RustSec advisory：`tar` 0.4.44（RUSTSEC-2026-0067、-0068）、`rustls` 0.23.36（RUSTSEC-2026-0285、-0346、-0349，-0348 視 `brotli` feature）、`rustls-webpki` 0.103.9（RUSTSEC-2026-0049、-0098、-0099、-0104）、`time` 0.3.45（RUSTSEC-2026-0009）。0.15.0 的 lock 修補了 `tar`、`rustls-webpki`、`time`，`rustls` 0.23.40 仍受影響。CI 安裝的預先編譯 `wasm-pack@0.14.0` 帶有相同的相依，所以文件改成 0.14.0 沒有帶來 CI 之外的新暴露；利用它們需要篡改 wasm-bindgen 或 binaryen 的 GitHub release，或對建置機做中間人攻擊。

處置：本 ticket 維持 0.14.0（與 CI 一致，今晚恢復文件可用）；把 CI 與文件一起升到 0.15.0、並以 `cargo audit` 記錄結果，列為研習後的後續工作（候選 02、08 的建議由此落實）。本段的 advisory 狀態是 2026-10-16 的查證結果，沒有實際執行 `cargo audit`。

## 沒有涵蓋

相依弱點掃描（`cargo audit`）、可用性；`taiki-e/install-action` 的 checksum 機制；Cloudflare 建置環境（Linux、cargo 1.99.1）只以 PR #24 重試後的建置結果確認。本報告不代表整個專案沒有安全問題。
