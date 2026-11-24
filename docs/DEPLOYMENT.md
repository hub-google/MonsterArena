# 部署與驗收

## 環境與流程

- main：GitHub Pages 測試站（https://hub-google.github.io/MonsterArena/）；唯一工作流 `.github/workflows/deploy.yml`（Arena 01｜網站部署）。推送 main 後以 Node.js 22 安裝相依、Vite 建置、上傳 Pages Artifact、發布。不在工作流執行完整功能測試。
- release：Cloudflare Pages 正式站，arena.monsterport.com。只在使用者明確要求上正式且確認正式後端相容性後更新。禁止自動同步、禁止建立 gh-pages 分支。
- 預設測試建置：`VITE_ARENA_V2=true VITE_ARENA_PREVIEW=true`，使用 `arena_preview_*`。如另用獨立測試專案，需同時設定 `ARENA_TEST_SUPABASE_URL` 與 `ARENA_TEST_SUPABASE_PUBLISHABLE_KEY`，不得指向共用正式專案。
- 不改 DNS、Worker、原始共用資料庫或正式玩家資料。SQL 產生指令只輸出 SQL，不部署。

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
