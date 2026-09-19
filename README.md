# 中華命理 AI

融合傳統命理智慧與現代 AI 解讀。

**程式負責算命盤，AI 只負責解讀命盤。**

這是可執行、通過 production build 的 Next.js 候選版，不是已取得命理專家完整驗證的正式商用保證。所有尚待核對的八字／紫微功能明示 **Needs verification**，不自行猜公式或用 AI 補盤。先閱讀 [準確度稽核](docs/accuracy.md) 和 [安全檢查](docs/security.md)。

## 啟動

Node.js 24 LTS（或符合 package.json engines 的版本），npm。已鎖定 Next.js 16.3.5（建立時 npm stable）、React 19.3.0、TypeScript 5.9.3、Tailwind 4.3.3。

```sh
npm install
cp .env.example .env.local
npm run dev
```

本機網址：**http://127.0.0.1:3000**（localhost 別名亦可開頁；呼叫 AI 時 origin 必須和 APP_ORIGIN 完全一致）。若要使用 http://localhost:3000，把 APP_ORIGIN 改為該網址並重新啟動。

開啟 App → 出生資料 → 我的命盤 → 八字／紫微／流年。易經不需要出生資料。所有命盤與歷史預設只在裝置保存。點擊「保存紀錄」才新增歷史；設定頁可以匯出、驗證並還原含個資的 JSON 備份。

## DeepSeek 設定

在 `.env.local` 或部署主機 secret manager 設定，**不要把真實值提交到 Git 或傳入瀏覽器**：

```dotenv
DEEPSEEK_API_KEY=你的伺服器金鑰
DEEPSEEK_MODEL=deepseek-flash
APP_ORIGIN=http://127.0.0.1:3000
AI_ACCESS_TOKEN=至少24字元的強隨機App存取碼
```

1. DEEPSEEK_API_KEY 從自己的 DeepSeek 開發者帳戶建立；需有模型存取權與配額。
2. DEEPSEEK_MODEL 可選帳戶可用且支援 structured outputs 的模型。此交付尚未使用真實金鑰呼叫服務。
3. production 必須設定 AI_ACCESS_TOKEN，UI `/settings` 輸入的是 **App 存取碼**，絕不是 API key。取得一小時 HttpOnly cookie。
4. 重新啟動主機。沒有 API key 時會顯示明確錯誤，排盤與保存照常可用。
5. AI 只收到去識別化後的計算 facts 與问题。自由輸入的問題請勿包含敏感個資。

## 驗證與正式執行

```sh
npm run lint
npm test
npm run build
npm start
```

production build 採 Next.js 官方支援的 `--webpack`，避開此環境 Turbopack 的子程序/port 權限問題，不影響 App Router 與 API Routes。production 必須 HTTPS 才能使用 Secure 存取 cookie；正式 Cloudflare 部署已使用 D1 原子配額；詳見 [正式部署與復原](docs/production.md)。

瀏覽器測試（先啟動 dev server）：

```sh
npx playwright install chromium
npm run test:e2e
```

可選 `PLAYWRIGHT_CHROMIUM_PATH` 指定既有 Chrome；無此變數即用 Playwright 管理的 Chromium。測試跑 iPhone 尺寸而非真正 iOS Safari。

## 分层架構

- `lib/calendar`：時區、國曆/農曆、閏月、二十四節氣、天干地支與六十甲子。
- `lib/iching` + `data/hexagrams.ts`：三錢法、六爻、64 卦、動爻與變卦。
- `lib/bazi`：四柱、藏干、十神、納音、五行表層統計、起運/大運、有限流年關係。
- `lib/ziwei` + `data/stars.ts`：獨立 iztro adapter、十二宮、星曜 registry、四化、大限/流年。
- `lib/interpretation`：輸入 allowlist、facts、系統提示詞與輸出 schema，與 engine 完全分離。
- `app/api/interpret`：server-only DeepSeek Responses API；`app/api/access`：正式 AI 存取。
- `lib/storage` + `lib/history`：schema v1，CRUD 入口可在未來替換為 DB repository；目前無後端出生資料保存。
- `components`：純顯示/互動與 dynamic engine 載入；核心公式不在 React 中。

## 路由

`/` 首頁、`/profile` 出生資料、`/dashboard` 我的命盤、`/iching` 易經、`/bazi` 八字、`/ziwei` 紫微、`/fortune` 流年、`/history` 歷史、`/settings` 設定。

## 測試與資料來源

174 項 Vitest 測試 + 6 項 Playwright 流程測試在交付檢查通過。

- Calendar 22；I Ching 87；Bazi 24；Zi Wei 20；interpretation/security 13；storage 8。
- 固定 fixtures：八字 12、紫微 11（部分預期、包含同日變體）、易經 12。不是十張獨立專家核對的紫微完整盤。
- 套件、版本、上游 commit、HKO 年表、演算法細節：見 [sources.md](docs/sources.md)。
- 喜用神、真太陽時、三合/刑害/合化不輸出；新流派、自訂四化、未知時辰推估不提供。
- 輸入範圍 1901–2099；時區換算至 UTC+8，DST 歧義拒絕；兩套曆法不一致時停止紫微計算。
- 本機記錄 200 筆上限；不偷偷刪舊資料。無備份匯入、DB、登入帳號或跨裝置同步。

## 下一階段

優先做獨立準確度核對（尤其完整紫微盤與全部四化表）、真實 AI 忠實度驗收、iOS Safari 實機 QA；再做正式 HTTPS 私人部署與分散式費用保護。之後才擴充流派、真太陽時、城市搜尋和資料庫，避免以功能數量掩蓋準確性缺口。

## 完整原始碼目錄

見 [file-tree.txt](docs/file-tree.txt)，排除 node_modules、.next、work、測試暫存與輸出 ZIP。這些都不是交付的應用原始碼。

## DeepSeek 供應商切換

API 固定使用 `https://api.deepseek.com`，預設 `deepseek-flash`，採 Responses API JSON Schema，關閉 thinking 以控制解讀延遲。伺服器仍以 Zod 與 fact IDs 驗證輸出，未完成或不合法的回應不保存。SDK 套件仍使用相容的 `openai`，實際請求只傳 DeepSeek。

可把 DeepSeek 金鑰放在已忽略的 `.env`，既有 `.env.local` 的 OpenAI 金鑰不會被使用。正式主機必須另外設定 `DEEPSEEK_API_KEY` secret；本機 env 檔案不會隨 Git 或部署封裝上傳。

官方相容性說明：https://api-docs.deepseek.com/guides/responses_api/ 。實際連線驗收需有效金鑰及帳戶額度。
