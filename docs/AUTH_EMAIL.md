# MA 帳號安全信件

- 主旨：怪獸競技場 Monster Arena｜重設密碼
- 寄件者顯示名稱：Monster Arena｜怪獸競技場
- 建議寄件地址：no-reply@arena.monsterport.com（需先由 SMTP 供應商完成網域驗證；不可假冒寄件地址）
- 重設密碼 HTML：`supabase/templates/recovery.html`。保留 Supabase 的 `{{ .ConfirmationURL }}`，不改成固定連結，不在信中寫出密碼或 token。

## Hosted Supabase 套用

在實際使用的 Auth 專案的 [Email Templates](https://supabase.com/dashboard/project/fanffwnhkxpfhttylntw/auth/templates) 找到 Reset password，設定主旨與 HTML。預設 Game Auth 同時服務測試站與舊正式站，修改模板會影響共用此 Auth 的站台；如使用獨立測試專案，先確認專案再套用。保留既有 URL allowlist，確認測試站 `https://hub-google.github.io/MonsterArena/` 可回跳。

寄件者名稱與地址需於 [SMTP 設定](https://supabase.com/dashboard/project/fanffwnhkxpfhttylntw/auth/smtp) 配置經驗證的自訂 SMTP。不要將 SMTP 或 Management API 憑證放進 Git、前端或公開設定。預設 SMTP 只適用測試且限制收件人，不能宣稱已支援所有玩家。

驗收：重新申請重設信，確認品牌、主旨、寄件者、手機與桌面版面及連結實際重設流程。Repo 內模板不會自動變更 hosted Auth 設定。

## 密碼重設隔離驗收（2026-11-25）

[GitHub Actions 真實 Auth 測試](https://github.com/hub-google/MonsterArena/actions/runs/45441375416/job/138613113905)：1 passed。使用本機 Supabase CLI 2.79.0、Mailpit、Chromium 與隨機測試帳號，驗證實際收信與品牌模板、連結驗證、重設頁刷新、密碼不一致阻擋、重設完成、舊密碼拒絕、新密碼登入且 UUID 相同、已用連結不可重複使用。未接觸 hosted 玩家帳號。測試程式保留在 `tests/password-recovery.spec.js` 與 `scripts/test-password-recovery.sh`；另需在隔離環境安裝 Supabase CLI 與 Chromium。正式寄件者、Hosted Auth 模板及回跳設定仍須另行驗收。

## 正式套用檢查（2026-11-25）

正式 Auth 與 GitHub 網站發布為兩項不同作業。`node scripts/configure-hosted-recovery.mjs` 可使用已授權的 `SUPABASE_ACCESS_TOKEN` 套用並讀回檢查品牌主旨、HTML 與兩站回跳網址；不輸出憑證，不修改未驗證寄件地址，亦不改寫其他 Auth 設定。一次性 [Actions 檢查](https://github.com/hub-google/MonsterArena/actions/runs/45532231321/job/138930119744) 明確回報 repo 未配置該 secret，未成功呼叫管理 API；一次性 job 已移除，不新增常駐工作流。正式寄件者需已驗證的自訂 SMTP，正式信件收送及重設仍須驗收，不能視為已完成。
