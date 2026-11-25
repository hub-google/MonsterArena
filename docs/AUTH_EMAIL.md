# Monster Arena｜忘記密碼信件驗收

## 實際啟用的 Hosted Auth（2026-11-25）

- Auth 專案：Game（`fanffwnhkxpfhttylntw`），測試站及正式站共用 Auth，但遊戲資料獨立。
- [已成功套用並從 Supabase 管理 API 讀回](https://github.com/hub-google/LINE/actions/runs/45535267639/job/138940203312)：Arena 專用密碼重設主旨 `怪獸競技場 Monster Arena｜重設密碼`、`supabase/templates/recovery.html` 品牌 HTML，以及 GitHub Pages 回跳網址 `https://hub-google.github.io/MonsterArena/`。信件採 `.RedirectTo` 條件分流，保留其他來源既有主旨、模板及既有 allowlist；沒有更動 site_url 或其他服務設定。
- **線上真正寄送成功**：2026-11-25 10:48（台灣時間）使用已存在、已驗證的帳號，經 GoTrue `POST /auth/v1/recover` 配合 GitHub Pages redirect 發出請求；Auth HTTP 200；已於連接的 Gmail 收件匣實際收到該封信（非垃圾郵件）。驗證主旨、`MONSTER ARENA`、中文內容及驗證連結存在。信件收件人、密碼、驗證連結內 token 均未寫入 repo 或 Actions。此次**沒有點擊正式使用者重設連結，更沒有修改其密碼**。
- [已通過完整獨立 Auth E2E](https://github.com/hub-google/MonsterArena/actions/runs/45441375416/job/138613113905)：本機 Supabase Auth + Mailpit + Chromium 1/1 通過，涵蓋品牌信件、重設連結、網頁重新整理、新密碼兩次核對、更新後舊密碼拒絕、新密碼登入與已使用連結失效。測試原始碼：`tests/password-recovery.spec.js`、`scripts/test-password-recovery.sh`。此測試不使用正式玩家資料。

## 尚未完成的寄件者品牌化

- 2026-11-25 實收信件的 From 顯示為 **Supabase Auth**，寄件網域 **mail.app.supabase.io**；主旨與信件內容已正確品牌化，但**寄件者名稱／地址尚未品牌化**，不能將這一項回報為完成。
- Game Auth 沒有自訂 SMTP 主機。透過現有 LINE repo 的受權 Management API 嘗試只 PATCH `smtp_sender_name`，獲得 **HTTP 401**（GET 可用），原有寄件者沒有改動。失敗作業：[執行紀錄](https://github.com/hub-google/LINE/actions/runs/45535697300)。一次性 workflow 已刪除。
- 同一 Cloudflare 帳號雖有 `monsterport.com` DNS，但 Email Sending 目前回傳 `recipient_mode=verified_only`，無法作為寄給所有玩家的替代 SMTP，且不應自行升級付費方案。其他供應商沒有已授權可使用的 SMTP 認證資訊。
- 完成自訂寄件者需要經過網域驗證且可寄給一般收件人的 SMTP 供應商（例如可使用 `no-reply@arena.monsterport.com`），並具備更新 Auth SMTP 設定的權限。不可將個人 Gmail OAuth 外掛憑證、非授權 SMTP 帳密或 GitHub Secret 寫入公用程式碼。

## 版本與範圍

main 為 GitHub Pages 測試站；release 為 `arena.monsterport.com`。此輪只更動 main 文件；未發佈 release。既有網站部署 workflow 維持原本單一部署流程。Auth 的品牌模板屬於共用 Game 專案設定，不隨 main/release 分支切換。

## MonsterPort 統一寄件者／SMTP 狀態（2026-11-25）

目標：`From: MonsterPort <no-reply@auth.monsterport.com>`（需經第三方寄件服務正式驗證）。排隊怪獸、Arena 的**信件主旨與 HTML 仍各自獨立**。兩站目前各自使用 Supabase 預設郵件服務，實收寄件者仍為 `Supabase Auth`。

### 已查證

- [兩個 Supabase 專案的即時稽核成功](https://github.com/hub-google/LINE/actions/runs/45537559247)：`unapiwajmgqqtdkixaab`（排隊怪獸）與 `fanffwnhkxpfhttylntw`（Monster Arena）均 **無自訂 SMTP host／user，無 Send Email Hook**，且 LINE repository 沒有已授權的 `RESEND_API_KEY`、`BREVO_API_KEY`、`SENDGRID_API_KEY`、`POSTMARK_SERVER_TOKEN`、`SMTP_HOST`／`SMTP_USER`／`SMTP_PASS` 或 MonsterPort 專用 SMTP Secret。
- 因此不能只修改 Supabase 信件模板，讓收件匣 From 顯示 `MonsterPort`。Supabase 官方要求自訂 SMTP；必須先由供應商驗證 `monsterport.com` 下的寄件域名，提供 SMTP host、port、user、password。參考 <https://supabase.com/docs/guides/auth/auth-smtp>。
- 先前為研究 Cloudflare 所新建的 `auth.monsterport.com` Email Sending 服務已**撤銷並清除其 DNS**；沒有切換到 Cloudflare、沒有新增付費方案，也沒有修改正式網站。
- Supabase 管理授權可讀取兩個 Auth 設定及套用信件主旨／HTML，但針對 Game 專案單獨更動 `smtp_sender_name` 曾回傳 **401**（<https://github.com/hub-google/LINE/actions/runs/45535697300>），需要具備 Auth SMTP 設定修改權限的授權。
- **不能宣稱寄件者品牌化已完成**，也不能在沒有 SMTP 寄件商帳號、已驗證網域和管理權限時改寫現有寄信機制，否則會中斷用戶忘記密碼及註冊。

### 已完成的可重用設定程式

<https://github.com/hub-google/LINE/blob/main/.github/scripts/configure-monsterport-smtp.mjs>

- `--check`：以已授權的 GitHub Secret 唯讀檢查兩個 Supabase Auth 專案，不動線上設定。
- `--apply`：**僅當**已有已驗證的 SMTP 帳號、`MONSTERPORT_SMTP_DOMAIN_VERIFIED=true`，及以下保存在 GitHub Secrets 的環境變數才會寫入：`MONSTERPORT_SMTP_HOST`、`MONSTERPORT_SMTP_PORT`、`MONSTERPORT_SMTP_USER`、`MONSTERPORT_SMTP_PASS`、`MONSTERPORT_SMTP_FROM`、`SUPABASE_ACCESS_TOKEN`。
- 先讀取並預檢兩個專案，拒絕覆蓋其他 SMTP 供應商；只更新兩專案的 SMTP 與 `smtp_sender_name=MonsterPort`，逐一讀回驗證，並檢查 site_url、redirect allowlist、原有品牌主旨／HTML、認證安全設定沒有變動。**不會自動執行**。
- 憑證不得存放 Git 倉庫。待憑證及權限都具備，依序執行配置，再用非正式使用者驗收真正寄送及 Gmail From 顯示，才算完成。

目前忘記密碼正常寄送、主旨與信件品牌設計已驗收成功（詳見上節）。`main` 為 GitHub Pages 測試站；`release` 沒有發布。
