# 中華命理 AI — iPhone 私人版

適用於 iOS 17 以上。排盤、稱骨、多人物資料庫、雙人合盤和照片五官標示可離線使用；DeepSeek AI 解讀需連網與自己的 API 金鑰。

## 由此 Mac 安裝到自己的 iPhone

1. 用 Xcode 開啟 `Mingli.xcodeproj`。
2. 在 Xcode → Settings → Apple Accounts 登入自己的 Apple 帳號。
3. 選 Mingli target → Signing & Capabilities，保留 Automatically manage signing，Team 選自己的 Personal Team。若 bundle identifier 已被使用，可改成個人唯一名稱。
4. 用傳輸線連接 iPhone，解鎖並選擇信任此 Mac。在 iPhone 的「設定 → 隱私權與安全性」啟用「開發者模式」（如出現提示，重新啟動）。
5. Xcode 上方執行裝置選自己的 iPhone，按 Run ▶。第一次可能需在 iPhone「設定 → 一般 → VPN 與裝置管理」信任開發者。
6. App 的「設定」輸入 DeepSeek 金鑰，預設記住於 iPhone Keychain，也可以移除。請勿把金鑰加入專案。

一般 Apple 帳號的免費開發簽署通常有效 7 天；到期需重新透過 Xcode 執行安裝。保持相同 bundle identifier 和 Team 並覆蓋安裝，避免刪除 App 造成資料遺失。較長期散發需要 Apple Developer 方案；本專案尚未簽署或送審。

## 資料與隱私

- Mac 與 iPhone 資料各自保存在本機，沒有自動同步。可從 Mac 設定匯出 JSON，再透過 AirDrop／檔案 App 傳到 iPhone，於設定匯入。
- 備份包含人物資料與歷史；不包含 DeepSeek 金鑰。建議定期匯出，刪除 App 前務必備份。
- Keychain 使用 WhenUnlockedThisDeviceOnly，不透過 iCloud 同步；「移除金鑰」會刪除此 App 儲存的金鑰。取消記住時只保留於執行期間。
- 只有主動按 AI 解讀時，計算結果、問題及必要的規則資料會傳至 DeepSeek；姓名、原始出生資料不包含在自動命盤 payload。自己輸入問題時請避免敏感個資。
- 照片只於裝置記憶體分析；匯出可選擇包含照片。分享的暫存檔在分享結束或下次啟動時清除。
- App 不啟動 HTTP 伺服器，所有介面打包在 App 中。沒有追蹤 SDK。

## 從 Git 原始碼重新建置

執行 `npm ci`、`npm run build:ios`，產生的完整 Xcode 專案在 `outputs/Mingli-iOS/`。

`xcodebuild -project outputs/Mingli-iOS/Mingli.xcodeproj -scheme Mingli -sdk iphoneos -configuration Release -derivedDataPath work/ios-device CODE_SIGNING_ALLOWED=NO build`

上述指令驗證未簽署的裝置建置；未簽署的 .app 無法直接安裝到 iPhone。
