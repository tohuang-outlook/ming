"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store";
import { PageTitle, ErrorNotice } from "@/components/ui";
import { saveProfile, switchProfile, deleteProfile, profileLabel, MAX_PROFILES } from "@/lib/storage";
import { BirthProfileSchema, type BirthProfile } from "@/types";
export default function ProfilePage() {
  const { store } = useStore();
  return <ProfileWorkspace key={store.activeProfileId ?? "empty"} />;
}
function ProfileWorkspace() {
  const { store, error: readError } = useStore();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  return <>
    <PageTitle eyebrow="PEOPLE & PROFILES" title="人物資料庫" description="為家人與朋友分別保存出生資料，隨時切換命盤。" />
    <section className="panel">
      <div className="section-heading"><h2>已保存人物（{store.profiles.length} / {MAX_PROFILES}）</h2>
      <button className="button primary" disabled={store.profiles.length >= MAX_PROFILES} onClick={() => { setAdding(true); setConfirm(null); }}>新增人物</button></div>
      <ErrorNotice message={error || readError} />
      <p className="small muted">切換人物會更新八字、紫微與流年。歷史紀錄保留原始命盤；編輯中的未儲存內容會在切換時放棄。</p>
      {!store.profiles.length && <p>尚未建立人物，請填寫下方出生資料。</p>}
      <div className="record-list">{store.profiles.map(person => <article className="record" key={person.id}>
        <div><h3>{profileLabel(person)}</h3><p className="small muted">{person.calendarType === "Lunar" ? `農曆${person.isLeapMonth ? "（閏月）" : ""}` : "國曆"} · {person.timezone}{person.id === store.activeProfileId ? " · 目前人物" : ""}</p></div>
        <div className="actions"><button className="button" aria-label={`編輯人物 ${profileLabel(person)}`} onClick={() => { try { switchProfile(person.id); setAdding(false); setConfirm(null); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "切換失敗。"); } }}>切換／編輯</button>
        <button className="button danger" aria-label={`刪除人物 ${profileLabel(person)}`} onClick={() => setConfirm(person.id)}>刪除人物</button></div>
        {confirm === person.id && <div role="alert"><p>確定刪除「{person.name || "未命名人物"}」的出生資料？已保存的命盤歷史會保留。此人物資料無法復原。</p>
          <div className="actions"><button className="button danger" onClick={() => { try { deleteProfile(person.id); setConfirm(null); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "刪除失敗。"); } }}>確認刪除人物</button><button className="button" onClick={() => setConfirm(null)}>取消刪除</button></div></div>}
      </article>)}</div>
    </section>
    {adding && store.profile && <button className="text-button" onClick={() => setAdding(false)}>取消新增，返回目前人物</button>}
    <ProfileEditor key={adding ? "new" : store.profile?.id ?? "new"} p={adding ? null : store.profile} />
  </>;
}
function ProfileEditor({ p }: { p: BirthProfile | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [calendarChoice, setCalendar] = useState<"Gregorian" | "Lunar" | null>(
    null,
  );
  const calendar = calendarChoice ?? p?.calendarType ?? "Gregorian";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const profile = BirthProfileSchema.parse({
        id: p?.id ?? crypto.randomUUID(),
        name: f.get("name"),
        gender: f.get("gender"),
        birthDate: f.get("birthDate"),
        birthTime: f.get("birthTime"),
        birthLocation: f.get("birthLocation"),
        timezone: f.get("timezone"),
        calendarType: f.get("calendarType"),
        isLeapMonth: f.get("isLeapMonth") === "on",
        createdAt: p?.createdAt ?? new Date().toISOString(),
      });
      const { resolveBirth } = await import("@/lib/calendar");
      resolveBirth(profile);
      saveProfile(profile);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "出生資料有誤，請重新檢查。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR BIRTH PROFILE"
        title={p ? "編輯出生資料" : "新增出生資料"}
        description={p ? "儲存會更新此人物資料，既有歷史命盤不會改寫。" : "建立新人物，八字與紫微斗數共同使用。"}
      />
      <div className="two-col">
        <form
          className="panel form-panel"
          onSubmit={submit}
          key={p?.id ?? "new"}
        >
          <h2>建立你的命理座標</h2>
          <p className="muted">請以出生證明或可信紀錄為準。</p>
          <ErrorNotice message={error} />
          <label>
            稱呼 <span className="muted">（選填）</span>
            <input
              name="name"
              defaultValue={p?.name}
              placeholder="如何稱呼你？"
              maxLength={60}
            />
          </label>
          <div className="form-grid">
            <label>
              排盤性別
              <select name="gender" defaultValue={p?.gender ?? "female"}>
                <option value="female">女</option>
                <option value="male">男</option>
              </select>
            </label>
            <label>
              曆法
              <select
                name="calendarType"
                defaultValue={p?.calendarType ?? "Gregorian"}
                onChange={(e) =>
                  setCalendar(e.target.value as "Gregorian" | "Lunar")
                }
              >
                <option value="Gregorian">國曆 / 公曆</option>
                <option value="Lunar">農曆</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              {calendar === "Lunar" ? "農曆年月日" : "出生日期"}
              <input
                type={calendar === "Lunar" ? "text" : "date"}
                name="birthDate"
                defaultValue={p?.birthDate}
                placeholder="1990-01-15"
                pattern="\d{4}-\d{2}-\d{2}"
                min="1901-01-01"
                max="2099-12-31"
                required
              />
            </label>
            <label>
              出生時間
              <input
                type="time"
                name="birthTime"
                defaultValue={p?.birthTime}
                required
              />
            </label>
          </div>
          {calendar === "Lunar" && (
            <label className="check">
              <input
                type="checkbox"
                name="isLeapMonth"
                defaultChecked={p?.isLeapMonth}
              />
              這是農曆閏月
            </label>
          )}
          <label>
            出生地
            <input
              name="birthLocation"
              defaultValue={p?.birthLocation}
              placeholder="例如：台灣台北市"
              maxLength={120}
            />
          </label>
          <label>
            出生地時區
            <input
              name="timezone"
              list="timezones"
              defaultValue={p?.timezone ?? "Asia/Taipei"}
              required
              placeholder="IANA 時區，例如 Asia/Taipei"
            />
            <datalist id="timezones">
              {[
                "Asia/Taipei",
                "Asia/Hong_Kong",
                "Asia/Shanghai",
                "Asia/Singapore",
                "Asia/Tokyo",
                "America/Los_Angeles",
                "-07:00",
                "-08:00",
                "America/New_York",
                "Europe/London",
                "UTC",
              ].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <div className="small muted timezone-presets" aria-label="常用時區選項">
              <span>快速選擇：</span>
              <button type="button" className="text-button" onClick={(e) => {
                const input = e.currentTarget.form?.elements.namedItem("timezone") as HTMLInputElement | null;
                if (input) { input.value = "America/Los_Angeles"; input.focus(); }
              }}>美國太平洋時間（PDT／PST，依日期判定）</button>
              <button type="button" className="text-button" onClick={(e) => {
                const input = e.currentTarget.form?.elements.namedItem("timezone") as HTMLInputElement | null;
                if (input) { input.value = "-07:00"; input.focus(); }
              }}>固定 PDT（UTC−07:00）</button>
              <button type="button" className="text-button" onClick={(e) => {
                const input = e.currentTarget.form?.elements.namedItem("timezone") as HTMLInputElement | null;
                if (input) { input.value = "-08:00"; input.focus(); }
              }}>固定 PST（UTC−08:00）</button>
            </div>
          </label>
          <p className="small muted">
            美國太平洋時間會依出生日期自動判定 PDT 或 PST；只有出生證明明確寫出固定偏移時，才選固定 PDT／PST。
          </p>
          <button className="button primary wide" disabled={busy}>
            {busy ? "驗證出生資料…" : "儲存並建立命盤 →"}
          </button>
        </form>
        <aside className="panel info-panel">
          <span className="eyebrow">關於排盤</span>
          <h2>
            資料越清楚，
            <br />
            理解越有根據。
          </h2>
          <ol>
            <li>
              <strong>出生時間不可省略</strong>
              <p>時辰會影響八字時柱與紫微宮位；不確定時，請先查證。</p>
            </li>
            <li>
              <strong>明確的計算基準</strong>
              <p>出生時刻依時區換算至 UTC+8 中國標準時間，不作真太陽時修正。</p>
            </li>
            <li>
              <strong>傳統順逆規則</strong>
              <p>排盤性別僅用於傳統大運、大限順逆規則。</p>
            </li>
          </ol>
          <div className="notice">
            出生資料目前儲存在你的裝置中。點擊 AI
            解讀時才會傳送必要的命盤資料，不傳送稱呼與原始出生資訊。
          </div>
        </aside>
      </div>
    </>
  );
}
