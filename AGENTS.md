# Arena engineering policy for coding agents

## Repair the source, never stack a patch

1. Diagnose and reproduce a confirmed bug before editing.
2. Fix the original, **canonical** implementation; remove redundant branches, obsolete code, and unused dependencies. Do not add wrapper-on-wrapper fixes, duplicated functions, `*_new` or `*_v2` alternatives that conceal the actual defect.
3. Maintain the eight current Supabase Game RPC sources only in `supabase/schema/functions/`. Historical `supabase/migrations/` files are immutable audit history, never the source for a new change and never to be blindly replayed against production.
4. For an unavoidable database change: edit the canonical SQL first; create one documented, timestamped migration from that source as required by Supabase; verify live definitions and user data after deployment. A migration is not a substitute for updating the canonical source.
5. Keep `main` as the sole source branch and use GitHub Pages artifacts for testing. Do not recreate legacy or release branches or deploy Cloudflare formal/Workers unless explicitly requested. Avoid touching other projects sharing Supabase.
6. Add meaningful regression tests for the confirmed defect and verify the affected feature in the published browser. The automatic deployment workflow only builds and publishes. Perform the live version and focused browser verification separately for the requested change. Run complete database, concurrency, long-term economy, legacy browser and unit suites manually when relevant; unrelated test failures must not prevent publishing. Do not claim all authenticated E2E flows passed when they have not.
7. Report exact root cause, edited files, test outcomes and any remaining limitations. No fabricated BUGs or hiding failures behind retries.

**Project scope:** This file governs Arena. For the same rule across *all* projects, add it to account-wide ChatGPT Custom Instructions or to each Project's instructions.

## 網頁 UI 驗收（必須執行）

- GitHub Actions 成功不等於網頁驗收完成。凡涉及 UI、功能或排版，必須以真實瀏覽器呈現建置後的畫面，擷取桌面、手機、短視窗及高風險狀態截圖；以肉眼檢視可讀性、視覺比例、對齊、留白、資訊層級、遮擋、操作可達性，再確認實際發布網址。不以程式碼、元素存在或 HTTP 200 取代視覺驗收。
- 養成頁需在一般桌面及手機的一個視窗顯示主角、狀態、戰鬥數值、六個操作及導覽；機甲必須是視覺焦點。短桌面 1280×550 與手機 360×640 必須檢查 SVG 實際著色圖形邊界（而非只測外框），同時檢查按鈕可點、無遮擋與無捲動。保留清晰完整中文及可辨識圖示。多種狀態、機器人與載具皆須涵蓋。
- 將驗收截圖保存在 Actions artifact。若無法實際檢視截圖或正式網頁，據實標記未完成視覺驗收，不宣稱 UI 已全部驗收。

- 手機、平板、電腦一律共用同一個直式遊戲版型及資訊排列；電腦只將同一畫面置中並依視窗等比例縮放，不建立桌面雙欄版。驗收須確認主角在資訊及六個操作上方、所有主要功能可見，保留截圖。

- 同一功能只保留一個主要入口；競技集中戰鬥、社交集中好友與世界聊天、養成集中照顧與改名、商城集中購物。圖鑑每張可變形卡片提供獨立預覽，不修改玩家資料。

- main 的 V2 僅部署 `arena_preview_*` 隔離資料表／RPC、`arena_preview_internal` 私有 schema；不得替換原始 Game 表或 RPC，不變更共用 API 設定。使用 `npm run db:sql -- --preview` 從同一 canonical source 生成，bootstrap 僅第一次執行。正式站資料與測試快照不得自動互相覆寫。

- 不得僅因種族與職業相同就合併不同進化階段的機體造型。暴龍戰炫王僅對應鋼鐵族重砲型終極機；超限機保留原機器人及重型坦克。驗收使用不同 stage 的實際瀏覽器圖片，不以舊版光柵雜湊取代已上架圖片。

- 40 種機體名稱由 monsterSprites.js 統一管理；名稱與種族、職業、進化階段、玩家暱稱分開。圖鑑變形時機體名稱與分類不變，不改資料庫數值或造型。
