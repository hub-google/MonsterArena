# Monster Arena Web

怪獸養成／競技場。沿用原始的 **Supabase Game 專案**，不再將既有帳號改接 Firebase。

- 測試網站（`main`）：https://hub-google.github.io/monster-arena-web/
- 正式網站（`release`）：https://pets.monsterport.com/
- 舊版修復預覽（封存）：https://hub-google.github.io/monster-arena-web/preview/
- 專案：https://github.com/hub-google/monster-arena-web
- GitHub Actions：https://github.com/hub-google/monster-arena-web/actions
- 後端：Supabase project `fanffwnhkxpfhttylntw` (Game)

## 修復的功能

- **登入、註冊**：保持既有 Supabase Auth 帳號／session，修復錯誤轉 Firebase 的問題。未完成 Email 驗證時提供提示。
- **怪獸養成**：時間累計飽食／清潔／年齡（小數值）；避免重新整理讓衰減無效、避免年老衰減重複計算。
- **金幣與物品**：孵化、餵食、治療、訓練、購物等走資料庫交易（`game_action`）；可拒絕負數、無效物品、餘額不足及非本人怪獸。
- **繁衍／晶片／究極進化**：檢查雙親有效、道具及金幣原子扣除、固定插槽需求、避免屬性重複疊加；究極進化檢查 50 戰、70% 勝率。
- **戰鬥與任務**：戰績透過 `battle_records` 去重；任務進度與主操作一起更新、獎勵不可重領。
- **世界王**：伺服器端依本人怪獸數值計算傷害；15 體力及王血量交易式扣除，避免競爭更新遺失。
- **好友、聊天與贈送體力**：支援好友邀請與接受、聊天保留紀錄且節流、體力由收禮者領取。
- **公會**：建立、加入、退出、捐獻、貢獻商店走正確 Supabase 欄位與交易。

## 資料庫遷移

遷移檔案已放在 `supabase/migrations/`：

- `20261022_game_atomic_actions.sql` — 原子交易、每日任務及戰鬥紀錄。
- `20261022_profile_friends_gifts.sql` — 舊帳號暱稱、好友邀請、體力禮物。
- `20261117_game_rls_six_public_tables.sql` — 六張公會、好友、任務與挑戰表的 RLS、最低讀取權限。
- `20261117_game_restrict_direct_economy_writes.sql` — 禁止瀏覽器直接改寫金幣、道具、世界王、聊天與戰績等資料。

對原本 **Game** 專案已套用以上遷移，未更換資料庫專案，也沒有刪除舊玩家帳號。不要對同一個遷移執行手動刪表或清空資料庫。

## 開發與測試

需要 Node.js 22。直接執行：

```bash
npm install
npm run lint
npm run build
npm run dev
```

`main` 更新時經 GitHub Actions 執行 lint、Supabase Auth 健康檢查、Vite build、Playwright Chromium smoke test，通過才部署 GitHub Pages。`release` 只由 Cloudflare Pages 建置，並部署在 `pets.monsterport.com`。Cloudflare 已關閉其他分支的預覽建置。`master` 和 `supabase-stable-fixes` 是歷史分支，不再觸發部署。

SQL 操作已用 `BEGIN ... ROLLBACK` 的交易測試驗證：孵化、購物、餵食、繁衍、每日任務、戰績去重、公會與好友收禮；測試沒有留下怪獸、戰績或公會。

> `tests/run_tests.spec.js` 和 `tests/run_all_scenarios.spec.js` 是**舊 Firebase 測試**，不得對正式 Supabase 專案執行。它們已被環境變數保護且不在部署 CI 中執行。

## 尚待處理的安全事項

2026/11/17 已在原本 Game 專案的六張公會／好友／任務／挑戰表建立 RLS 讀取政策，並撤銷匿名和登入者對交易表的直接寫入權限；SQL 驗證通過。詳細資料請參考 `docs/SECURITY.md`。

尚未完全修復：`users` 的登入者跨玩家資料讀取過於寬鬆；`monsters` 因前端仍直接更新老化與名稱，依舊存在偽造數值風險；戰鬥勝負由客戶端提交。這幾項需要先調整 API 並完成多帳號驗收，不能宣稱已解決。

## Monsterport 主／正式分支規範（2026-11-16）

- `main`：日常修改、測試，僅更新 GitHub Pages `https://hub-google.github.io/monster-arena-web/`，不更新 Monsterport。
- `release`：正式發布分支。確認 `main` 測試通過後，才將核准的 Commit 合併／提升到 `release`。Cloudflare Pages 專案 `monsterport-pets` 僅追蹤 `release`，關閉 preview builds。
- Vite：GitHub Pages 使用 `/monster-arena-web/`；Cloudflare 用 `VITE_DEPLOY_TARGET=cloudflare npm run build` 產生根路徑 `/` 資源。
- **資料庫不搬遷**。沿用原本 Supabase Game 專案 `fanffwnhkxpfhttylntw` 的 Auth、玩家紀錄、遊戲資料與 API；不建立新 Firebase 專案，也不修改 Queue 的 Cloudflare Worker、DNS 或資料表。
- 舊 `main` 已安全備份到 `legacy-main-20261116`，`master` 與 `supabase-stable-fixes` 保留作歷史參考。日後只改 `main`，發布才更新 `release`。
