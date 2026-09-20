# 中華命理 AI 桌面版

macOS Apple Silicon（M1 或更新），macOS 12 或更新。以 Electron 44 打包靜態 Next.js 畫面；不啟動 localhost，也不需要 Node.js、終端機或瀏覽器。出生資料與命盤保留在 App 的本機儲存；AI 解讀需要網路與使用者自己的 DeepSeek API key。

## 建置

在 macOS arm64 執行 `npm ci`、`npm run package:desktop`。產物在 `outputs/desktop-build/`，應用程式版本 1.2.0。靜態畫面在獨立的 `work/desktop-source` 匯出，API routes 與網站 proxy 不會帶入桌面版。主程序與 preload 使用 esbuild 打包，發行檔案採明確白名單。建置會掃描本機已知秘密並拒絕包含它們的安裝內容。

## 安全邊界

- Renderer 使用 sandbox、contextIsolation、停用 Node integration；只有七個具名 IPC 方法，主程序驗證來源與主框架。
- `mingli://app` 提供內建資源，拒絕跨來源導覽、彈出視窗、裝置權限與 renderer 對外請求。CSP 對 Next 靜態 inline scripts 使用 SHA-256 hashes。
- DeepSeek API 固定連線 `https://api.deepseek.com`；API key 僅主程序持有。未勾選記住時只存記憶體；記住時使用 Electron safeStorage 的 macOS Keychain 保護加密，密文存於 userData，權限 0600。不支援明文降級。
- 每日 40 次／每分鐘 8 次限制，UTC 換日；額度檔先原子更新，再送出請求。這是個人 App 的避免誤用措施，無法防止本機使用者自行修改檔案。
- 原始命盤不交給模型重算；共用網站版的隱私投影、schema 驗證與 fact ID 引用驗證。
- 沒有自動更新；升級先匯出備份，再用新 App 取代舊 App。加密金鑰可在設定移除；刪除命盤資料不會自動刪除金鑰。

## 發行與限制

目前使用 ad-hoc 簽署，並未 Apple notarization。公開大量散布前，須使用自己的 Developer ID Application 憑證簽署並完成 Apple notarization。不要停用 Gatekeeper。首次開啟若遭 macOS 阻擋，確認下載來源後使用系統設定的「隱私權與安全性 → 仍要打開」。

使用者資料位於 `~/Library/Application Support/中華命理 AI/`。從網站移轉資料需先在網站匯出備份，再於 App「設定」還原；它不會讀取或複製瀏覽器的資料。命理流派與邊界日期仍有專家覆核限制，參閱原專案驗證報告。

## 面相文化觀察（1.2.0）

從側欄「面相觀察」匯入單人正面 JPG／PNG。使用 macOS Vision 的 VNDetectFaceLandmarksRequest（revision 3）在獨立 Swift 程序中計算輪廓；照片透過 stdin 傳遞，程式不寫入暫存照片、不呼叫雲端，也不產生身分辨識 embedding。使用 CPU 執行，不需下載模型。

支援上限 15 MB、3200 萬像素；原生解碼前檢查像素尺寸，依 EXIF 方向旋正後縮至最長邊 1600，重新編碼 JPEG 預覽。原照片的 GPS／作者等中繼資料不會複製到預覽；系統可能寫入必要的影像尺寸或色彩技術資訊。偵測多張臉、無臉、輪廓過小、明顯偏斜或裁切時不提供測量；品質檢查屬啟發式，並非辨識準確性保證。

顯示眉、眼、鼻、嘴與臉頰／下巴輪廓，以及四項照片平面比例。額頭髮際與耳朵未偵測，不補算三停、不替臉型分類、不推論個性、健康或命運。文化文字為固定繁體中文內容，不是 AI 對照片的預測。参考：[Apple Vision 座標文件](https://developer.apple.com/documentation/vision/vnfacelandmarks2d)。

照片預設僅留於本頁記憶體；移除、離頁或結束 App 後不保留於 App 紀錄。可以主動匯出 JSON 觀察檔，預設不含照片；只有勾選附圖並完成原生儲存對話框，才會把縮小的預覽一起寫入使用者選定的位置（0600）。這些匯出檔不屬於原命盤歷史／備份，也不會因清空本頁而刪除。

建置原生程式需要 macOS arm64 和 Xcode Command Line Tools；`build:desktop` 會用 swiftc 編譯，electron-builder 會簽署並把 helper 放入 Resources/native。該二進位檔是明確的 extraResource，不含使用者照片。

驗證：`MINGLI_FACE_FIXTURE=/path/to/licensed-portrait.jpg node scripts/test-face-desktop.mjs`。測試照片不納入 App；本次使用 matplotlib sample_data 的 Grace Hopper 美國海軍公開領域照片（James S. Davis），出處：[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Grace_Hopper.jpg)。
