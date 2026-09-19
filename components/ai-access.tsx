"use client";
import { useState } from "react";
import { ErrorNotice } from "./ui";
export function AIAccess() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: new FormData(form).get("code") }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setStatus("AI 存取已啟用，有效一小時。");
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "驗證失敗。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-panel settings-form" onSubmit={submit}>
      <h2>AI 存取</h2>
      <p className="small muted">
        正式部署時，輸入管理者提供的 App 存取碼。這不是 OpenAI API
        key；請勿在此填寫 API key。
      </p>
      <label>
        App 存取碼
        <input
          type="password"
          name="code"
          autoComplete="off"
          required
          maxLength={200}
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "驗證中…" : "啟用 AI 存取"}
      </button>
      <button className="button" type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try {
          const response = await fetch("/api/access", { method: "DELETE", headers: { "content-type": "application/json" } });
          if (!response.ok) throw new Error("登出失敗，請稍後再試。");
          setStatus("已停用此瀏覽器的 AI 存取。");
        } catch (e) { setError(e instanceof Error ? e.message : "登出失敗。"); }
        finally { setBusy(false); }
      }}>停用 AI 存取</button>
      <ErrorNotice message={error} />
      {status && <p role="status">{status}</p>}
    </form>
  );
}
