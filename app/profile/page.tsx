"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store";
import { PageTitle, ErrorNotice } from "@/components/ui";
import { saveProfile } from "@/lib/storage";
import { BirthProfileSchema } from "@/types";
export default function ProfilePage() {
  const { store } = useStore();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [calendarChoice, setCalendar] = useState<"Gregorian" | "Lunar" | null>(
    null,
  );
  const p = store.profile;
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
        title="出生資料"
        description="一次建立，八字與紫微斗數共同使用。"
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
                "America/New_York",
                "Europe/London",
                "UTC",
              ].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <p className="small muted">
            時區請手動確認；城市搜尋與自動時區查詢尚未提供。
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
