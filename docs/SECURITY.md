# Supabase Game：實際資料庫安全盤點（2026-11-17）

## 已修復：六張公開表沒有 RLS

以下六張表都已啟用 RLS，且每張建立一項適用於 `authenticated` 的 SELECT 政策：

- `guilds`：登入者可查看公會名單
- `guild_members`：只可查看自己的會員資料，或自己擔任會長的公會成員
- `guild_applications`：只可查看自己的申請，或自己擔任會長的公會申請
- `friends`：只可查看自己參與的好友關係
- `challenges`：只可查看自己發起／接收的挑戰
- `daily_quests`：只可查看自己的每日任務

這六張表已撤銷 `anon` 的直接存取；`authenticated` 只保留 SELECT。新增、更新、刪除由既有 `game_action`、`game_friend_action` 等認證 RPC 維護。

SQL：`supabase/migrations/20261117_game_rls_six_public_tables.sql`

## 已修復：前端可以直接修改交易資料

下列表格已撤銷瀏覽器角色的 INSERT、UPDATE、DELETE、TRUNCATE，只保留 `authenticated` 的 SELECT：
`users`、`user_inventory`、`raid_boss`、`messages`、`gifts`、`battle_records`。

遊戲金幣、道具、世界王血量、聊天及戰鬥紀錄的異動仍由既有安全性定義者 RPC 執行。

`monsters` 仍須由前端直接進行名稱修改及年齡更新，因此目前先撤銷其 `TRUNCATE` 權限，沒有直接撤銷 UPDATE，以免破壞養成功能。

SQL：`supabase/migrations/20261117_game_restrict_direct_economy_writes.sql`

已用回滾交易測試權限政策，正式套用後再次驗證所有六張表 RLS 開啟、匿名存取遭拒、登入者可讀取公會與個人資料、登入者不能直接改寫交易表。

## 尚未修復的問題（不可宣稱安全完成）

1. **`users` 的 SELECT 政策仍為所有登入者可讀整張資料表**，包括 Email 等應屬私人資訊。現有社交功能會讀取其他人的 `username`，必須先改用限定欄位的公開玩家資料 API，再縮緊私有表的讀取權限。
2. **`monsters` 仍允許玩家直接 INSERT／UPDATE／DELETE 自己的怪獸**，有可能偽造怪獸或修改攻防。需要先把老化、改名操作移往伺服器端，再收緊 RLS 與表權限。
3. **`game_action('battle')` 仍接受瀏覽器提交的 `won` 與 `battleId`**；去重不等於能證明結果真實。可信任的對戰結果必須伺服器端判定。
4. 本次做了 SQL 權限與現有前端流程核對；尚未使用實際多帳號完成正式環境的端對端跨帳號測試，不能將其宣稱為已驗收。

參考：[Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
