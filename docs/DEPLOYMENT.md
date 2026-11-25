# 部署與驗收

## 環境與流程

- main：GitHub Pages 測試站（https://hub-google.github.io/MonsterArena/）；唯一工作流 `.github/workflows/deploy.yml`（Arena 01｜網站部署）。推送 main 後以 Node.js 22 安裝相依、Vite 建置、上傳 Pages Artifact、發布。不在工作流執行完整功能測試。
- release：Cloudflare Pages 正式站，arena.monsterport.com。只在使用者明確要求上正式且確認正式後端相容性後更新。禁止自動同步、禁止建立 gh-pages 分支。
- 預設測試建置：`VITE_ARENA_V2=true VITE_ARENA_PREVIEW=true`，使用 `arena_preview_*`。如另用獨立測試專案，需同時設定 `ARENA_TEST_SUPABASE_URL` 與 `ARENA_TEST_SUPABASE_PUBLISHABLE_KEY`，不得指向共用正式專案。
- 正式 Cloudflare 建置以 `VITE_DEPLOY_TARGET=cloudflare` 使用獨立 `arena_live_*` 資料表與 RPC；與 `arena_preview_*` 共用 Auth，不共用遊戲進度。原始 Game 表／RPC 保留為遷移前備份，不可當作正式版資料來源。切換後請重新整理舊分頁。
- 正式遷移 `20261125022520_arena_live_v2_isolated_production_bootstrap.sql` 已執行，禁止重複 bootstrap；後續使用 canonical SQL 產生 `npm run db:sql -- --live` 審查正式變更。不得自動把測試資料覆寫正式資料或變更 DNS、Worker。

## 手動驗收指令

```bash
npm ci
npm run lint
npm run check:contract
npm run test:unit
npm run db:sql > /tmp/arena-functions.sql
npm run db:sql -- --preview > /tmp/arena-preview.sql
npm run build
npm run test:e2e
```

Playwright 設定在 `config/playwright.config.js`，測試目錄與結果目錄仍分別為根目錄的 `tests/` 與 `test-results/`。可用 `npm run test:e2e -- --list` 確認測試清單。

Playwright 需先安裝相應瀏覽器；真實登入或線上驗收需按各測試檔的環境設定準備測試帳號。SQL 測試應使用隔離的 PostgreSQL fixture 或核准測試環境，不在正式資料庫批次重播歷史 migration。

## 發布檢查

1. 確認發布 commit 及目標分支正確。
2. 確認 Actions 建置／發布成功，實際網址載入到該版本。
3. 依異動範圍測試登入、交易、戰鬥、圖鑑或其他受影響功能；UI 另檢查手機與桌面實際畫面。
4. 記錄測試成功、失敗或未執行項目。部署成功不代表 authenticated E2E 或正式資料庫權限已驗收。

詳見 [開發規範](../AGENTS.md) 與 [安全規範](SECURITY.md)。

## 2026-11-25 main 驗收（release 不更新）

- [隔離完整驗收](https://github.com/hub-google/MonsterArena/actions/runs/45533937320)：lint、合約檢查、52/52 單元測試、SQL 規則／訓練平衡／90 日經濟／資料隔離、併發交易、V2 瀏覽器連接真實隔離 PostgreSQL，以及 40 機體＋24 變形 WebGL 測試均成功。
- [實際 GitHub Pages 回歸驗收](https://github.com/hub-google/MonsterArena/actions/runs/45534364267)：公開網址 4/4 瀏覽器測試（登入頁、圖鑑、全部 64 立體型態、公會關聯及 preview RPC／表隔離）及舊版相容 15/15 瀏覽器測試通過。驗收用假登入與攔截 API、隔離 SQL，不使用真實玩家帳號；截圖 artifact 供人工複核。360° 模型是獨立立體幾何，並非原客製 2D 原畫完全相同的立體重建。
- 線上 preview 的 PVP 結算、訓練、庫存、造型、世界王查詢及防重複扣款以回滾交易驗證成功，未改正式資料；13 張表 RLS 啟用。
- 一次性驗收工作均移除，維持單一網站部署流程；此次只發布 main。Hosted Auth 品牌信件仍受限於管理 API 憑證／已驗證 SMTP，詳見 AUTH_EMAIL.md；不宣稱真實 Hosted 收信已完成。
