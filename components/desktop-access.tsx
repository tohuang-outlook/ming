"use client";
import { useEffect, useState } from "react";
import { ErrorNotice } from "./ui";
export function DesktopAccess() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.mingliDesktop?.status().then(s => {
      if (s.error) setError(s.error);
      else setStatus(s.configured ? (s.remembered ? "DeepSeek 金鑰已加密儲存在此 Mac。" : "DeepSeek 金鑰已啟用，僅保留至結束 App。") : "尚未設定 DeepSeek 金鑰。排盤與保存仍可離線使用。");
    });
  }, []);
  return <form className="panel form-panel settings-form" onSubmit={async e => {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
    setBusy(true); setError("");
    try {
      const result = await window.mingliDesktop!.saveKey(String(data.get("key")), data.get("remember") === "on");
      if (result.error) throw new Error(result.error);
      setStatus(data.get("remember") === "on" ? "金鑰已加密儲存。可前往命盤進行 AI 解讀。" : "金鑰已啟用，僅保留至結束 App。可前往命盤進行 AI 解讀。"); form.reset();
    } catch { setError("金鑰設定失敗，請檢查格式或改用不記住金鑰。"); }
    finally { setBusy(false); }
  }}>
    <h2>DeepSeek AI 設定</h2>
    <p className="small muted">AI 解讀由這部 Mac 直接連線至 DeepSeek，使用你的 API 額度。金鑰不會加入命盤備份。預設在此 Mac 加密保存，重新開啟 App 後仍可使用；可隨時按「移除金鑰」刪除。取消勾選則只保留於本次 App 執行期間。</p>
    <label>DeepSeek API 金鑰<input name="key" type="password" autoComplete="off" spellCheck={false} required minLength={16} maxLength={256} /></label>
    <label className="check"><input type="checkbox" name="remember" defaultChecked /> 在此 Mac 加密記住金鑰</label>
    <div className="actions">
      <button className="button primary" disabled={busy}>{busy ? "處理中…" : "啟用 DeepSeek"}</button>
      <button className="button" type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { const result = await window.mingliDesktop!.clearKey(); if (result.error) throw new Error(); setStatus("已移除金鑰並停用 AI；命盤與歷史紀錄仍保留。"); }
        catch { setError("移除金鑰失敗，請重試。"); } finally { setBusy(false); }
      }}>移除金鑰</button>
    </div>
    <ErrorNotice message={error} />{status && <p role="status">{status}</p>}
  </form>;
}
