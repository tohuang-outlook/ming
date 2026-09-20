"use client";
import { useState } from "react";
import { AIAccess } from "@/components/ai-access";
import { useStore } from "@/components/store";
import { PageTitle, ErrorNotice } from "@/components/ui";
import {
  updateStore,
  EMPTY_STORE,
  STORAGE_KEY,
  SettingsSchema,
  parseBackup,
  writeStore,
  type AppStore,
} from "@/lib/storage";
export default function SettingsPage() {
  const { store, error: readError } = useStore();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [backup, setBackup] = useState<AppStore | null>(null);
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const settings = SettingsSchema.parse({
        language: "zh-TW",
        dateFormat: f.get("dateFormat"),
        chartView: f.get("chartView"),
        ziwei: {
          ...store.settings.ziwei,
          dayBoundaryRule: f.get("dayBoundaryRule"),
          leapMonthRule: f.get("leapMonthRule"),
        },
      });
      updateStore((s) => ({ ...s, settings }));
      setMessage("設定已儲存，新命盤將採用這些規則。");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗。");
    }
  }
  async function exportData() {
    try {
      if (window.mingliDesktop) {
        const result = await window.mingliDesktop.exportBackup(localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(EMPTY_STORE));
        if (result.error) throw new Error(result.error);
        if (!result.canceled) { setMessage("備份已匯出。"); setError(""); }
        return;
      }
      const blob = new Blob(
        [localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(EMPTY_STORE)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "中華命理-裝置備份.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("無法匯出，請檢查裝置權限。");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="PREFERENCES & PRIVACY"
        title="設定"
        description="清楚的規則，讓每一張命盤都有依據。"
      />
      <ErrorNotice message={error || readError} />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <form
        className="panel settings-form"
        onSubmit={save}
        key={JSON.stringify(store.settings)}
      >
        <section>
          <h2>顯示偏好</h2>
          <label>
            語言
            <select disabled value="zh-TW">
              <option value="zh-TW">繁體中文</option>
            </select>
            <small>簡體中文與 English 預留後續版本。</small>
          </label>
          <label>
            日期格式
            <select name="dateFormat" defaultValue={store.settings.dateFormat}>
              <option value="zh">2026 年 9 月 18 日</option>
              <option value="iso">2026-09-18</option>
            </select>
          </label>
          <label>
            紫微命盤顯示
            <select name="chartView" defaultValue={store.settings.chartView}>
              <option value="grid">傳統十二宮</option>
              <option value="list">列表模式（適合手機）</option>
            </select>
          </label>
        </section>
        <section>
          <h2>紫微排盤規則</h2>
          <p className="small muted">
            全書系 · iztro default
            安星與預設四化表。農曆正月換年，虛歲按農曆年界。其他流派尚未開放。
          </p>
          <label>
            子時換日
            <select
              name="dayBoundaryRule"
              defaultValue={store.settings.ziwei.dayBoundaryRule}
            >
              <option value="23:00">23:00 換日（晚子時算次日）</option>
              <option value="00:00">00:00 換日（晚子時算當日）</option>
            </select>
          </label>
          <label>
            閏月規則
            <select
              name="leapMonthRule"
              defaultValue={store.settings.ziwei.leapMonthRule}
            >
              <option value="split-at-15">
                十五日分界：前半本月、後半下月
              </option>
              <option value="current-month">閏月全月依本月處理</option>
            </select>
          </label>
          <p className="notice">
            八字固定採 00:00
            換日、立春與節令精確時刻切分。這裡的設定只影響紫微；已保存的歷史命盤不會被改寫。
          </p>
        </section>
        <button className="button primary">儲存設定</button>
      </form>
      <AIAccess />
      <section className="panel settings-form">
        <h2>裝置資料</h2>
        <p className="muted small">
          出生資料目前儲存在你的裝置中。清除 App 或瀏覽器的儲存資料會一併移除命盤；備份含個人資料，請妥善保管。
        </p>
        <div className="actions">
          <button className="button" onClick={exportData}>
            匯出裝置備份
          </button>
          <button className="button danger" onClick={() => setConfirm(true)}>
            清除全部裝置資料
          </button>
        </div>
        <label>
          從備份還原
          <input type="file" accept="application/json,.json" onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            setBackup(null);
            if (!file) return;
            try {
              if (file.size > 8_000_000) throw new Error("備份不得超過 8 MB。");
              setBackup(parseBackup(await file.text()));
              setError("");
            } catch (e) { setError(e instanceof Error ? e.message : "備份讀取失敗。"); }
          }} />
        </label>
        {backup && <div className="notice" role="alert">
          <p>備份已驗證：{backup.history.length} 筆紀錄，{backup.profile ? "含出生資料" : "無出生資料"}。還原會取代目前裝置的全部資料，建議先匯出目前備份。</p>
          <div className="actions">
            <button className="button danger" onClick={() => {
              try {
                writeStore(localStorage, backup);
                window.dispatchEvent(new Event("mingli-storage"));
                setBackup(null); setMessage("備份已還原。"); setError("");
              } catch { setError("還原失敗，原有資料未主動清除。請檢查儲存空間。"); }
            }}>確認取代並還原</button>
            <button className="button" onClick={() => setBackup(null)}>取消還原</button>
          </div>
        </div>}
        {confirm && (
          <div role="alert" className="notice">
            <div>
              <p>確定清除出生資料、設定與所有歷史紀錄？此動作無法復原。</p>
              <div className="actions">
                <button
                  className="button danger"
                  onClick={() => {
                    try {
                      localStorage.removeItem(STORAGE_KEY);
                      window.dispatchEvent(new Event("mingli-storage"));
                      setConfirm(false);
                      setMessage("裝置資料已清除。");
                    } catch {
                      setError("清除失敗，請檢查瀏覽器權限。");
                    }
                  }}
                >
                  確定清除
                </button>
                <button className="button" onClick={() => setConfirm(false)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
