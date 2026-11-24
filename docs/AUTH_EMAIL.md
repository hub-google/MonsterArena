# MA 帳號安全信件

- 主旨：怪獸競技場 Monster Arena｜重設密碼
- 寄件者顯示名稱：Monster Arena｜怪獸競技場
- 建議寄件地址：no-reply@arena.monsterport.com（需先由 SMTP 供應商完成網域驗證；不可假冒寄件地址）
- 重設密碼 HTML：`supabase/templates/recovery.html`。保留 Supabase 的 `{{ .ConfirmationURL }}`，不改成固定連結，不在信中寫出密碼或 token。

## Hosted Supabase 套用

在實際使用的 Auth 專案的 [Email Templates](https://supabase.com/dashboard/project/fanffwnhkxpfhttylntw/auth/templates) 找到 Reset password，設定主旨與 HTML。預設 Game Auth 同時服務測試站與舊正式站，修改模板會影響共用此 Auth 的站台；如使用獨立測試專案，先確認專案再套用。保留既有 URL allowlist，確認測試站 `https://hub-google.github.io/MonsterArena/` 可回跳。

寄件者名稱與地址需於 [SMTP 設定](https://supabase.com/dashboard/project/fanffwnhkxpfhttylntw/auth/smtp) 配置經驗證的自訂 SMTP。不要將 SMTP 或 Management API 憑證放進 Git、前端或公開設定。預設 SMTP 只適用測試且限制收件人，不能宣稱已支援所有玩家。

驗收：重新申請重設信，確認品牌、主旨、寄件者、手機與桌面版面及連結實際重設流程。Repo 內模板不會自動變更 hosted Auth 設定。
