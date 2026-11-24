# 怪獸競技場｜Monster Arena

怪獸養成、戰術對戰、競技場、圖鑑、商城、好友、公會與世界王。

| 環境 | 分支 | 網址 |
| --- | --- | --- |
| 測試 | `main` | [GitHub Pages](https://hub-google.github.io/monster-arena-web/) |
| 正式 | `release` | [Monster Arena](https://pets.monsterport.com/) |

前端使用 React / Vite，後端使用 Supabase Game。測試站與正式站的遊戲資料隔離，不會自動互相同步。只有明確要求上正式時才推進 release。

## 開始開發

Node.js 22：

```bash
npm ci
npm run dev
```

本機建置與驗收：

```bash
npm run lint
npm run check:contract
npm run test:unit
npm run build
```

## 專案目錄

```text
src/                  前端程式
  pages/              各功能頁面
  components/         共用畫面元件
  hooks/              共用 React 狀態與副作用
  services/           後端連線與各領域 API
  styles/             座艙、皮膚與圖鑑樣式
  utils/              遊戲規則、交易工具與美術邏輯
  assets/             前端打包資源
public/               靜態資源（機甲、皮膚、圖示）
supabase/
  schema/             現行 SQL 維護入口
  migrations/         歷史遷移（不可任意重播或刪除）
scripts/              SQL 產生、契約與交易驗證工具
tests/                單元、瀏覽器與 SQL 測試
docs/                 技術及遊戲設計文件
.github/workflows/    GitHub Pages 部署
```

## 文件索引

| 文件 | 用途 |
| --- | --- |
| [架構與資料庫](docs/ARCHITECTURE.md) | 程式分工、SQL 維護、交易恢復 |
| [部署與驗收](docs/DEPLOYMENT.md) | 分支、建置、手動驗收、發布隔離 |
| [遊戲規則 V2](docs/GAME_RULES.md) | 養成、戰鬥、競技與經濟設計 |
| [機甲相容映射](docs/MECHA_MIGRATION.md) | 舊資料映射與歷史相容性 |
| [皮膚系統](docs/SKINS.md) | 造型與商城規格 |
| [安全規範](docs/SECURITY.md) | 權限、帳號與資料隔離 |
| [開發規範](AGENTS.md) | 修復、回歸驗收與發布政策 |

GitHub Actions 僅保留網站部署工作流；功能測試獨立執行。不可將部署成功視為遊戲功能已驗收。
