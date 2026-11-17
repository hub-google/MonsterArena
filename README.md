# Monster Arena Web

怪獸養成、競技場、好友、公會與世界王。正式資料沿用 **Supabase Game**（專案 `fanffwnhkxpfhttylntw`），不使用 Firebase 或 Cloudflare Worker 作為遊戲後端。

- **測試版 `main`**：https://hub-google.github.io/monster-arena-web/
- **正式版 `release`**：https://pets.monsterport.com/
- **原始碼**：https://github.com/hub-google/monster-arena-web

## 唯一現行 SQL 程式碼

**所有 8 個有效的 `game_*` RPC，以 `supabase/schema/functions/<函式名稱>.sql` 為唯一維護入口。**
這些檔案在 2026-11-17 根據目前 Game 資料庫真正執行的定義整理，包含：

- `game_action.sql`：孵蛋、訓練、晶片、戰鬥、公會、任務、世界王等交易邏輯（保留救援蛋防套利與舊晶片數值）
- `game_age_monsters.sql`、`game_rename_monster.sql`
- `game_friend_action.sql`、`game_claim_gifts.sql`
- `game_plaza_monsters.sql`、`game_public_profiles.sql`、`game_ensure_profile.sql`

SQL 清單集中管理在 `supabase/schema/manifest.mjs`。產生可供審閱的 SQL：

```bash
npm run db:sql > /tmp/arena-functions.sql
```

此命令**僅輸出 SQL，不會更新資料庫**；檢視並經測試後，方可透過正式遷移程序套用到 Game，且只部署到核准環境。**禁止直接複製舊的 `game_action()` 遷移定義當作最新版本。**

### 為什麼還保留 `supabase/migrations/`？

原本近 9 份對 `game_action()` 的定義是「**已執行過的歷史遷移紀錄**」，不是現行程式碼，也不應直接刪除或重新執行。既有遠端 Supabase migration history 必須保留，不改寫舊檔，不會為了清理程式碼刪除現有玩家資料。

**注意：**現有 repo 歷史 SQL 使用日期加名稱，與 Supabase 線上歷史版本戳並非同一套標準命名。不可直接對現有 Game 資料庫執行 `supabase db reset` 或批次重播這些舊 SQL。新遷移需使用標準時間戳、從上述現行函式檔產生，且先經隔離測試後再套用。

## 前端程式碼

- `src/utils/api.js`：唯一 Supabase RPC／讀取介面。
- `src/utils/gameRules.js`：共享前端孵化／免費救援蛋規則，Dashboard、Roster 使用同一份。
- 既有的 Firebase client、Firebase rules、emulator 測試與 firebase-tools 相依性已從 `main` 移除；舊版可從 Git 歷史查詢。

## 開發與驗收

Node.js 22：

```bash
npm ci
npm run lint
npm run check:contract
npm run test:unit
npm run db:sql > /dev/null
npm run build
npm run dev
```

`main` CI 另會檢查 Supabase Auth 健康、啟動瀏覽器並執行公開登入／註冊畫面 smoke test，全部通過後才更新 GitHub Pages。完整的多帳號登入後 E2E 尚未由 CI 覆蓋；不以靜態測試替代資安驗證。

**部署隔離：**`main` 只更新 GitHub Pages；`release` 才是 Cloudflare Pages 正式版。任何程式碼清理都不修改 `release`、Cloudflare DNS/Worker，或共用 Supabase 的其他專案資料。詳細安全說明見 `docs/SECURITY.md`。

## 原始碼優先的修復規範

往後修 BUG 應直接修唯一現行來源、移除重複實作、保留已套用的資料庫遷移歷史，並以回歸測試驗收。詳細規範見 `AGENTS.md`。
