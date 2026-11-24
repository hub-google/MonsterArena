# 程式與資料庫架構

## 前端責任分工

- `src/App.jsx`：登入 session、各資料資源載入／刷新、交易恢復及頁面導覽。
- `src/hooks/useOnlineStatus.js`：瀏覽器網路狀態。
- `src/components/TransactionRecoveryDialog.jsx`：交易恢復畫面，不直接操作資料庫。
- `src/pages/`：養成、倉庫、競技、戰術對戰、世界王、公會、社交與圖鑑。
- `src/utils/api.js`：唯一前端資料服務入口（穩定 facade），不再混放所有領域實作。
- `src/services/`：backend（環境與命名空間）、transactions（交易入口）、account、units、economy、battle、guild、social。`supabaseClient.js` 管理連線，`transactionJournal.js`、`transactionTransport.js` 負責安全交易重送。
- `src/hooks/useGameAction.js`：倉庫與公會共用交易回饋；`useRepairCountdown.js`：修復倒數；`useBattlePlayback.js`：伺服器戰鬥結果的播放。
- `src/utils/inventory.js`：共用庫存數量查詢。
- `src/styles/`：座艙、皮膚、圖鑑樣式依原載入順序分檔。
- `src/utils/gameRules.js`、`gameCatalog.js`、`tacticalDuel.js`：規則、商品與戰鬥鏡像。
- `src/utils/monsterSprites.js`、`mechaArt.js`、`mecha3d.js`、`skins.js`：機體名稱、2D/3D 造型與皮膚。
- `public/mecha/`、`public/skins/`：上架圖片；維持檔案位置與造型，不為整理而覆寫。

### 維護原則

前端不得另建第二套結算或直接改寫資產。SQL 是交易與戰鬥結算權威。API 對外介面、現行資料表、RPC 及玩家資料應保持相容。頁面保留各自的特殊交易流程；共用交易回饋、修復倒數及戰鬥播放集中維護。不可只為減少行數改寫已運作的交易。

## 唯一現行 SQL 程式碼

**所有 8 個有效的 `game_*` RPC，以 `supabase/schema/functions/<函式名稱>.sql` 為唯一維護入口。**
2026-11-24 main 版的 `game_action`、`game_age_monsters` 及 `game_rules_v2.sql` 為下一版規則，**不可直接套用正式共用 Game 資料庫**；其餘 RPC 保留既有定義。包含：

- `game_action.sql`：孵蛋、訓練、晶片、公會、任務、世界王等交易入口與授權／鎖定；`supabase/schema/battle_settlement.sql` 負責唯一的戰鬥結算邏輯（保留救援蛋防套利與舊晶片數值）
- `game_age_monsters.sql`、`game_rename_monster.sql`
- `game_friend_action.sql`、`game_claim_gifts.sql`
- `game_plaza_monsters.sql`、`game_public_profiles.sql`、`game_ensure_profile.sql`

SQL 清單集中管理在 `supabase/schema/manifest.mjs`。商城、皮膚、每日任務及公會商品的 V2 價格與條件由 `src/utils/gameCatalog.js` 共用目錄產生私有 SQL 查詢函式，禁止在 `game_action` 重複硬編碼。產生可供審閱的 SQL：

```bash
npm run db:sql > /tmp/arena-functions.sql
```

此命令**僅輸出 SQL，不會更新資料庫**；檢視並經測試後，方可透過正式遷移程序套用到 Game，且只部署到核准環境。**禁止直接複製舊的 `game_action()` 遷移定義當作最新版本。**

### 為什麼還保留 `supabase/migrations/`？

既有多份對 `game_action()` 的定義是「**已執行過的歷史遷移紀錄**」，不是現行程式碼，也不應直接刪除或重新執行。既有遠端 Supabase migration history 必須保留，不改寫舊檔，不會為了清理程式碼刪除現有玩家資料。

**注意：**現有 repo 歷史 SQL 使用日期加名稱，與 Supabase 線上歷史版本戳並非同一套標準命名。不可直接對現有 Game 資料庫執行 `supabase db reset` 或批次重播這些舊 SQL。新遷移需使用標準時間戳、從上述現行函式檔產生，且先經隔離測試後再套用。

### 交易恢復（main V2）

重要交易送出前按原帳號及 UUID 寫入瀏覽器恢復紀錄，不儲存密碼或權杖。RPC 使用同一帳號的 bearer token；斷線後以相同 UUID 重送，資料庫依交易識別碼回傳原結果。重開同一瀏覽器可按「恢復交易」；跨瀏覽器無法讀取本機紀錄。安全恢復期限為 6 天（後端保留識別碼至少 7 天）。對戰結算中禁止跨頁；好友、公會讀取失敗不阻止進入養成頁。

## 目前不做的結構改動

保留既有 SQL 歷史及現行 schema、靜態素材 URL、測試入口和 API 簽名。遷移歷史中的重複函式定義不是現行重複實作。若要整理歷史遷移，必須先比對線上 migration history，再另行規劃基線，不能以移動或刪檔代替。
