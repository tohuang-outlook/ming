"use client";
import { useSyncExternalStore } from "react";
import {
  activeProfile,
  EMPTY_STORE,
  readStore,
  STORAGE_KEY,
  type AppStore,
} from "@/lib/storage";
let cachedRaw: string | null | undefined;
let cached: AppStore = EMPTY_STORE;
let problem = "";
function snapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      const next = readStore(localStorage);
      cachedRaw = raw;
      cached = next;
      problem = "";
    }
  } catch {
    problem = "裝置資料無法讀取。原資料仍保留，請至設定備份或重設。";
  }
  return cached;
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("mingli-storage", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("mingli-storage", cb);
  };
}
export function useStore() {
  const store = useSyncExternalStore(subscribe, snapshot, () => EMPTY_STORE);
  return { store: { ...store, profile: activeProfile(store) }, error: problem };
}
