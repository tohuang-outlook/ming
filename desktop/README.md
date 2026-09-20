# 中華命理 AI 桌面版

macOS Apple Silicon（M1 或更新），macOS 12 或更新。以 Electron 44 打包靜態 Next.js 畫面；不啟動 localhost，也不需要 Node.js、終端機或瀏覽器。出生資料與命盤保留在 App 的本機儲存；AI 解讀需要網路與使用者自己的 DeepSeek API key。

## 建置

在 macOS arm64 執行 `npm ci`、`npm run package:desktop`。產物在 `outputs/desktop-build/`，應用程式版本 1.1.0。靜態畫面在獨立的 `work/desktop-source` 匯出，API routes 與網站 proxy 不會帶入桌面版。主程序與 preload 使用 esbuild 打包，發行檔案採明確白名單。建置會掃描本機已知秘密並拒絕包含它們的安裝內容。

## 安全邊界

- Renderer 使用 sandbox、contextIsolation、停用 Node integration；只有五個具名 IPC 方法，主程序驗證來源與主框架。
- `mingli://app` 提供內建資源，拒絕跨來源導覽、彈出視窗、裝置權限與 renderer 對外請求。CSP 對 Next 靜態 inline scripts 使用 SHA-256 hashes。
- DeepSeek API 固定連線 `https://api.deepseek.com`；API key 僅主程序持有。未勾選記住時只存記憶體；記住時使用 Electron safeStorage 的 macOS Keychain 保護加密，密文存於 userData，權限 0600。不支援明文降級。
- 每日 40 次／每分鐘 8 次限制，UTC 換日；額度檔先原子更新，再送出請求。這是個人 App 的避免誤用措施，無法防止本機使用者自行修改檔案。
- 原始命盤不交給模型重算；共用網站版的隱私投影、schema 驗證與 fact ID 引用驗證。
- 沒有自動更新；升級先匯出備份，再用新 App 取代舊 App。加密金鑰可在設定移除；刪除命盤資料不會自動刪除金鑰。

## 發行與限制

目前使用 ad-hoc 簽署，並未 Apple notarization。公開大量散布前，須使用自己的 Developer ID Application 憑證簽署並完成 Apple notarization。不要停用 Gatekeeper。首次開啟若遭 macOS 阻擋，確認下載來源後使用系統設定的「隱私權與安全性 → 仍要打開」。

使用者資料位於 `~/Library/Application Support/中華命理 AI/`。從網站移轉資料需先在網站匯出備份，再於 App「設定」還原；它不會讀取或複製瀏覽器的資料。命理流派與邊界日期仍有專家覆核限制，參閱原專案驗證報告。
