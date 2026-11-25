# Monster Arena｜Auth 寄信設定與驗收

## 目前正式使用的 SMTP（2026-11-25）

- Supabase Auth 專案（Monster Arena）：`fanffwnhkxpfhttylntw`。
- 寄件者名稱：**MonsterPort**。
- 寄件地址：`monsterport.com@gmail.com`。
- 寄件 SMTP：`smtp.gmail.com:465`，個人 Gmail 應用程式密碼登入。
- 使用 Gmail SMTP，不使用 Resend、Cloudflare Email Sending，也不需額外新增付費服務。
- 原本帳號復原主旨：`怪獸競技場 Monster Arena｜重設密碼`。
- 信件內容沿用既有 Arena 品牌 HTML，並保留原本 Auth redirect allowlist、site_url 與登入安全設定。

### 已在真實 Hosted Supabase 環境驗收

1. [Monster Arena SMTP 設定成功並經讀回核對](https://github.com/hub-google/LINE/actions/runs/45571220273)：管理 API 只修改 SMTP 相關欄位，其他登入設定及原本品牌信件未變。
2. Supabase 真實 `POST /auth/v1/recover` 測試回傳 **HTTP 200**。
3. Gmail 收件匣實收密碼重設信：**From = MonsterPort <monsterport.com@gmail.com>**、主旨及 HTML 品牌正確。沒有點擊正式重設連結或修改使用者密碼。
4. 排隊怪獸（獨立 Auth 專案 `unapiwajmgqqtdkixaab`）同樣套用 SMTP 並通過實寄驗收：[設定成功紀錄](https://github.com/hub-google/LINE/actions/runs/45571332443)。其郵件主旨 `【排隊怪獸】重設登入密碼`、HTML 版型各自獨立。

### 安全與維護

- Gmail 應用程式密碼以 Supabase Vault 加密儲存在排隊怪獸專案，名稱：`MONSTERPORT_GMAIL_SMTP_APP_PASSWORD`；未放在 GitHub source、提交紀錄或 Actions log。
- GitHub Actions 原有的 `SUPABASE_ACCESS_TOKEN` 用於讀取該 Vault Secret 並修改兩個 Hosted Auth 專案。
- 設定工具：[configure-monsterport-gmail-smtp.py](https://github.com/hub-google/LINE/blob/main/.github/scripts/configure-monsterport-gmail-smtp.py)。套用時必須明確提供 `MONSTERPORT_SMTP_SENDER`（正確 Gmail 地址）及 `MONSTERPORT_SMTP_TARGET`（`arena` 或 `queue`）。
- 用完後已刪除一次性 GitHub Actions 工作流程，避免重複套用。Gmail 個人帳號寄件有流量及防濫用限制，日後用戶量增加再評估正式交易郵件服務。
- Auth 是雲端共用設定，與網站 main／release GitHub 分支無關。這次沒有發佈遊戲網站 release。

## 原有忘記密碼功能驗收（保留歷史紀錄）

- [原始品牌信件設定成功](https://github.com/hub-google/LINE/actions/runs/45535267639/job/138940203312)：保留其他品牌 fallback，並設定 GitHub Pages 的回跳。
- [密碼重設流程獨立 E2E 測試](https://github.com/hub-google/MonsterArena/actions/runs/45441375416/job/138613113905)：測試新舊密碼登入與已使用連結失效，不使用正式玩家資料。
- 2026-11-25 先前使用錯誤寄件地址時，Google 回覆 SMTP 535；已先復原預設寄件，之後改為正確地址，兩站真實寄送均已驗證成功。
