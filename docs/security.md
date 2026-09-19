# Security / 隱私檢查

## 已實作

- DeepSeek 金鑰只讀 server `process.env.DEEPSEEK_API_KEY`；無 `NEXT_PUBLIC_`、前端金鑰欄位、localStorage 金鑰、console key 輸出。
- `.env.example` 空金鑰；`.env*` 被 Git 忽略，只例外提交範例。
- `/api/interpret` 限 POST JSON、96 KB streaming body 上限、schema 驗證、system/chart 類型一致、question 1000 字限制。
- 客戶端與伺服器使用同一 allowlist projection。AI 請求排除 name、id、birthLocation、birthDate、birthTime、timezone、meta、農曆生日；大運起始日期與年齡是解讀必要資料，仍可能間接推測年齡，不宣稱匿名。
- 問題是使用者自由文字，不能保證其中無個資；UI 提醒避免填入敏感資料。
- 伺服器轉為 fact IDs + structured JSON；原始命盤不由模型回寫。解讀 schema 不包含替代命盤；不存在的 fact ID 拒絕，沒有工具可供模型重新排盤。
- 45 秒 timeout、maxRetries=0、5000 output tokens、錯誤訊息不回傳 provider trace 或 request/response 全文。
- Origin 必須與 `APP_ORIGIN` 相等；僅此不足以取代身分驗證，因此正式模式還強制長度至少 24 的 `AI_ACCESS_TOKEN`。
- 管理者提供的是 App 存取碼，絕不是 API key。`/api/access` 用 constant-time 比較；成功取得一小時 HMAC 簽章、HttpOnly、SameSite=Strict、正式模式 Secure cookie，path 限 `/api`。UI 不將存取碼存進 localStorage。
- 正式 Cloudflare D1 原子配額：8 次解讀/分鐘及 40 次/日；5 次存取碼嘗試/分鐘及 100 次/日。跨 Worker、重啟持續有效；D1 失效即停止 AI，開發模式才用記憶體。
- React 預設 escaping；不使用 `dangerouslySetInnerHTML` 或把 AI 文字當 HTML。
- 逐請求 nonce、strict-dynamic CSP（production 不允許 unsafe-eval）；nosniff / no-referrer / frame deny / camera-microphone-geolocation denied headers。圖表動態樣式使用 style-src unsafe-inline。
- localStorage 所有讀寫經版本化 schema。格式損壞不覆寫原資料，可匯出原文。歷史刪除与全資料清除都需第二次確認。
- 已檢查依賴：npm audit 最後為 0 vulnerabilities（只代表當次資料庫結果）。

## 未宣稱已解決

- **非公眾多租戶架構**：此版針對使用者的裝置與受控私人服務；網站由 Sites owner-only policy 保護；沒有多使用者帳號及雲端命盤同步。DB 只儲存 aggregate 配額計數。
- 仍需在 DeepSeek project 設定貨幣支出限制；應用配額限制的是請求數。
- localStorage 未加密，裝置共用者、同源腳本或瀏覽器外掛可能讀取；備份含個資。瀏覽器清除資料後只能由事先匯出的有效備份還原。
- 任意客戶端可提交符合 schema 的八字/紫微資料；這是使用者本地的解讀工具，不是 server-signed 專業鑑定。易經會由原始六次投擲重建；八字/紫微不為了驗證而再傳姓名與生日。
- Prompt 與 fact ID 檢查無法保證模型敘述不胡言；只能保證資料結構不把 AI 當成計算核心。仍需真實模型 fidelity eval。
- API 無伺服器對話狀態不代表第三方零保留或合規認證；請閱讀 DeepSeek 當前資料政策。
- 未做外部滲透測試、正式 iOS Safari 實機驗收、分散式負載驗收。

## 上線設定

使用有 HTTPS 的私人 Sites / Cloudflare OpenNext 主機與 D1 DB；設定真實 `APP_ORIGIN`、`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、強隨機 `AI_ACCESS_TOKEN`。先保持私人存取。UI 設定頁輸入 App 存取碼取得一小時 cookie。金鑰輪替需主機端操作。未配置保護時 production API fail closed，其他排盤功能仍可用。

## Deployment artifact secrets

OpenNext 會將本機 env 編譯到 Worker；`build:sites` 在打包前清空編譯的 env 模組，並扫描部署產物是否含本機 API key、token、secret、password 的值。發現任何符合項目就停止封裝，不輸出秘密值。正式設定僅經 hosting secrets 注入。
