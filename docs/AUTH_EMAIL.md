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

## Cloudflare 寄件網域建置（2026-11-25）

- 已使用已連線的 Cloudflare 帳號，建立免費的專用寄件網域 `auth.monsterport.com`，並透過 Email Sending DNS Fix 建立 6 筆必要記錄。再以 DNS Status API 驗證結果 `ready`、`errors=[]`；未變更 `arena.monsterport.com` 網站 CNAME。
- 對應寄件地址可規劃為 `no-reply@auth.monsterport.com`。這是經驗證的域名基礎建設，**尚非已啟用的 Supabase SMTP 或 Auth Send Email Hook**。
- Cloudflare 帳號 API 目前明確回傳 `recipient_mode=verified_only`、quota 為 null；目前 Workers Free 僅能寄給該帳號已驗證的目的地址，**無法對所有玩家發送忘記密碼信**。
- 官方資料：<https://developers.cloudflare.com/email-service/>、<https://developers.cloudflare.com/changelog/post/2026-11-24-email-sending-workers-free/>。要發送給任意收件者須先升級 Cloudflare Workers Paid（目前最低 **US$5/月**，按用量另計），這是新增付費訂閱，未經使用者核准不得代為啟用。也可以改用既有可用的其他第三方 SMTP，前提是有已授權的寄件供應商及憑證。
- 即使升級，也**不得**直接將共用 Game Supabase Auth 的全域 SMTP 寄件者改成 Arena，否則其他共用 Auth 應用的寄件顯示名稱也會被覆蓋；必須先驗證多品牌分流（例如 Supabase Send Email Hook 搭配可對所有使用者送達的寄件服務），再切換共用寄件路由。任何切換都不得中斷排隊怪獸及其他既有註冊／重設信功能。
- 完成標準：對非管理員、非已驗證目的信箱，使用 GitHub Pages 忘記密碼真實送信，驗證 From、主旨、HTML、回跳及舊密碼失效／新密碼可登入（最後一項只能使用隔離測試帳號，不得改真實使用者密碼）。目前尚未達標。
