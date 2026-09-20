"use client";
import { useState } from "react";
import { useStore } from "./store";
import { profileLabel, switchProfile } from "@/lib/storage";
export function ProfileSwitcher() {
  const { store } = useStore();
  const [error, setError] = useState("");
  if (!store.profiles.length) return null;
  return <div className="profile-switcher">
    <label><span>目前人物</span><select aria-label="切換人物" value={store.activeProfileId ?? ""} onChange={e => {
      try { switchProfile(e.target.value); setError(""); }
      catch (e) { setError(e instanceof Error ? e.message : "切換失敗。"); }
    }}>{store.profiles.map(p => <option key={p.id} value={p.id}>{profileLabel(p)}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}
  </div>;
}
