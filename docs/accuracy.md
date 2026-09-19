# Accuracy audit / 準確度稽核

版本：0.1.0。此交付為可執行的候選版，不宣稱命理學術正確性已全面獨立驗證。

## 狀態定義

- **Implemented**：有真正的獨立計算引擎與對應 UI/API。
- **Tested**：本專案自動測試通過。
- **Verified**：僅用於已與獨立來源核對的具體案例，不外推成全日期範圍正確。
- **Needs verification**：上游規則/案例有依據，但欠缺獨立專家、多來源完整命盤驗收。
- **Experimental**：僅供研究的有限規則；不能推論未實作項目。
- **Not implemented**：明確不輸出結果，AI 亦不得補造。

## 功能稽核

| 項目                           | 實作/測試                                       | 獨立驗證與限制                                                                                |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 國曆閏年、農曆轉換、閏月       | Implemented / Tested                            | 2024-02-10 農曆正月初一、2023-03-22 閏二月初一與香港天文台年表核對；僅這兩個日期案例 Verified |
| 二十四節氣                     | Implemented / Tested                            | 上游白露精確時刻案例通過；全 1901–2099 範圍 Needs verification                                |
| 時區與 DST                     | Implemented / Tested                            | Temporal IANA 轉換；重複/不存在的當地時刻拒絕，未提供 offset 選擇                             |
| 六十甲子與時辰                 | Implemented / Tested                            | 模 10/12 循環；23、00、01、22 邊界測試                                                        |
| 三錢法 6/7/8/9、動爻、变卦     | Implemented / Tested                            | 與使用者指定規則逐項一致；不宣稱預測效力                                                      |
| 64 卦序、上下卦                | Implemented / Tested                            | 64 組獨立矩陣核對、12 固定案例；尚未逐條學術校勘                                              |
| 64 卦卦意                      | Implemented                                     | 人工撰寫的簡短現代摘要；不是經文引用                                                          |
| 六爻識別與卦辭出處             | Implemented / Tested                            | 每卦六爻標識、經文章節出處；未收錄完整爻辭，AI 不可編造                                       |
| 八字四柱                       | Implemented / Tested / Needs verification       | 12 組上游四柱固定預期；非 12 組獨立專家證實                                                   |
| 八字藏干、十神、納音、十二長生 | Implemented / Tested / Needs verification       | 上游具體案例核對，未覆蓋所有组合                                                              |
| 八字起運、順逆、大運           | Implemented / Tested / Needs verification       | sect=1，兩組起運預期與陰陽男女方向測試；年齡區間為名義歲數，精確日期另外顯示                  |
| 八字流年干支、十神             | Implemented / Tested / Needs verification       | 以選定年 7/1 取立春後干支，期間明示立春至次年立春                                             |
| 流年五合、六合、六沖           | Implemented / Experimental / Needs verification | 只辨認配對，不判合化、強弱與吉凶；未推算三合、刑害                                            |
| 五行分布                       | Implemented / Tested                            | 只計天干與地支表層五行共八字；不是旺衰權重                                                    |
| 喜用神、旺衰、合化、真太陽時   | Not implemented                                 | 不輸出假資料，AI 禁止補算                                                                     |
| 紫微命/身宮、十二宮、五行局    | Implemented / Tested / Needs verification       | 11 組上游輸入/規則案例，包含同日曆法或規則變體；不是 11 張獨立完整參照盤                      |
| 紫微十四主星                   | Implemented / Tested / Needs verification       | 2023-03-06 辰時完整十四星宮位對照上游預期                                                     |
| 紫微主要輔煞星與祿存           | Implemented / Needs verification                | 由 iztro 計算並經 registry 顯示；各顆未全部獨立回歸驗證                                       |
| 紫微四化                       | Implemented / Tested / Needs verification       | 癸年四化具體案例；其餘九干有套件表，尚待獨立逐干驗證                                          |
| 紫微大限/流年                  | Implemented / Tested / Needs verification       | 本命/大限/流年分層資料；上游 2000/2023 案例；全範圍 Needs verification                        |
| AI                             | Implemented / Mock-tested                       | 真實 OpenAI 呼叫未驗收：未提供金鑰；提示詞與結構限制不保證敘述零幻覺                          |
| 保存/刪除/回看/備份            | Implemented / Tested                            | localStorage schema v1，最多 200 筆；無雲端同步；具驗證與確認的備份匯入                                   |

## 曆法與紫微的一致性

共用 calendar engine 先解析公曆/農曆與 IANA 時區，轉成 UTC+08:00 的公曆年月日時。
八字直接使用此 Lunar/Solar 物件。紫微使用此公曆日期與時辰呼叫 iztro；iztro 內部仍使用 lunar-lite 0.2.8。
轉接層會比較兩個核心的原始農曆年月日與閏月旗標；不一致立即停止排盤並提示待驗證，不選擇看似合理的其中一個結果。

此版本採「同一瞬間換算為 UTC+8」的明示 convention，不是出生地當地鐘錶時直接排盤，也不是真太陽時。海外出生日期轉換可跨日。對國際命理流派的適用性需要專家決策，UI 不隱藏此限制。

## 紫微規則鎖定

- 套件：iztro 2.6.1；`algorithm: default`，上游描述以《紫微斗數全書》為基礎。
- 本命年界 `yearDivide: normal`、運限年界 `horoscopeDivide: normal`：農曆年。
- 年齡 `ageDivide: normal`：農曆年界虛歲。
- `dayDivide: forward` 預設晚子時 23:00 作次日；可選 `current` 至 00:00 換日。
- `fixLeap: true` 預設閏月前十五日當本月、後半月當下月；可選全月本月。
- 四化：只用該版本內建預設表；禁止 UI 傳自訂四化或其他流派。
- 所有選項寫入命盤 JSON；歷史不因後續設定改變而重排。
- iztro 存在全域設定：wrapper 每次同步重設全部受支援選項，計算與運限擷取之間不 await、不回傳延遲計算物件；已有交錯設定回歸測試。

## Regression fixtures

- 八字：12 組，完整四柱預期值；另有起運、十神、藏干等斷言。
- 紫微：11 組 **部分已知預期值**（命/身宮、五行局）；涵蓋 5 個不同公曆生日和設定/農曆輸入變體。另有 1 組完整十四主星位置與四化斷言。尚未達成「10 張完整、獨立驗證的紫微命盤」；保留 Needs verification，沒有用目前引擎輸出生成 expected。
- 易經：12 組固定投擲案例，加 64 組 King Wen 對照矩陣。
- 上游來源固定 commit 與 test 名稱見 `tests/fixtures/`。

## 發布前仍需要

1. 由獨立命理專家或另一套有明確規則的系統，核对至少 10 張不同生日紫微完整盤與八字全欄位；保留出生資料授權與出處。
2. 擴充立春/節令前後精確秒、1901/2099、歷史時區與各閏月邊界的獨立年表案例。
3. 對真實 AI 模型做繁體中文、事實忠實性、拒答與個資外洩測試；不因 mocked API 成功就標記 live Verified。
4. 對海外時間 convention 及流派規則取得產品層確認。

另見 [獨立引擎交叉檢查紀錄](independent-engine-review.md)：保留全部不一致案例，不將比對失敗當成驗證通過。
