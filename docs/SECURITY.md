# Arena Game 安全與原始碼管理（2026-11-17）

- Game 的後端專案是 Supabase `fanffwnhkxpfhttylntw`，不得改接其他專案或使用公開 `service_role` key。
- 8 個有效 `game_*` RPC 的唯一現行程式碼位於 `supabase/schema/functions/`；歷史 SQL 遷移保留但不當作目前的實作入口。
- RPC 以 `SECURITY DEFINER` 進行必要交易，函式內必須直接驗證 `auth.uid()` 及資源擁有權，並只授權 `authenticated` 執行；`anon`、`PUBLIC` 撤銷執行權限。
- 玩家個別怪獸、背包、個人資料、晶片加成僅本人可以讀取，交易只能從已授權的 RPC 原子操作，不准瀏覽器改寫金幣／戰績。
- `game_action` 的救援蛋避免反覆免費孵蛋／放生金幣套利；舊版高加成晶片拆裝保留原加成；戰績由伺服器生成而非信任客戶端。
- `scripts/check-game-contract.mjs` 檢查**現行 SQL**，而非只檢查已過時的 migration。前端共用孵蛋規則有 `node --test` 單元測試。
- CI 自動測試不能證明所有線上 SQL 權限或跨帳號操作正確；需要用 `BEGIN ... ROLLBACK` 的授權測試獨立驗收，切勿對玩家資料做破壞性重置。
- 舊 Firebase 工具、規則與測試已從執行路徑刪除，Git 歷史可以追溯。不要重新安裝 Firebase 以「修補」Supabase 問題。
