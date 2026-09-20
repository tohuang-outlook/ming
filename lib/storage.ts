import { z } from "zod";
import { HistoryRecordSchema } from "@/types/history";
import {
  BirthProfileSchema,
  defaultZiWeiConfig,
  ZiWeiConfigSchema,
  type BirthProfile,
} from "@/types";
export const STORAGE_KEY = "zhonghua-mingli:v1";
export const SettingsSchema = z.object({
  language: z.literal("zh-TW").default("zh-TW"),
  dateFormat: z.enum(["iso", "zh"]).default("zh"),
  chartView: z.enum(["grid", "list"]).default("grid"),
  ziwei: ZiWeiConfigSchema.default(defaultZiWeiConfig),
});
export const MAX_PROFILES = 100;
const LegacyStoreSchema = z.object({
  version: z.literal(1),
  profile: BirthProfileSchema.nullable(),
  settings: SettingsSchema,
  history: z.array(HistoryRecordSchema).max(200),
});
export const CurrentStoreSchema = z.object({
  version: z.literal(2),
  profiles: z.array(BirthProfileSchema).max(MAX_PROFILES),
  activeProfileId: z.string().nullable(),
  settings: SettingsSchema,
  history: z.array(HistoryRecordSchema).max(200),
}).superRefine((s, ctx) => {
  if (new Set(s.profiles.map(p => p.id)).size !== s.profiles.length)
    ctx.addIssue({ code: "custom", message: "人物識別碼不可重複。" });
  if (s.profiles.length ? !s.profiles.some(p => p.id === s.activeProfileId) : s.activeProfileId !== null)
    ctx.addIssue({ code: "custom", message: "目前人物不存在。" });
  if (new Set(s.history.map(r => r.id)).size !== s.history.length)
    ctx.addIssue({ code: "custom", message: "紀錄識別碼不可重複。" });
});
export const StoreSchema = z.union([CurrentStoreSchema, LegacyStoreSchema.transform(s => ({
  version: 2 as const,
  profiles: s.profile ? [s.profile] : [],
  activeProfileId: s.profile?.id ?? null,
  settings: s.settings,
  history: s.history,
}))]).superRefine((s, ctx) => {
  if (new Set(s.history.map(r => r.id)).size !== s.history.length)
    ctx.addIssue({ code: "custom", message: "紀錄識別碼不可重複。" });
});
export type AppStore = z.infer<typeof CurrentStoreSchema>;
export function activeProfile(store: AppStore) {
  return store.profiles.find(p => p.id === store.activeProfileId) ?? null;
}
export function profileLabel(profile: BirthProfile) {
  return `${profile.name?.trim() || "未命名人物"} · ${profile.birthDate} ${profile.birthTime}`;
}
export function upsertProfile(store: AppStore, input: BirthProfile): AppStore {
  const profile = BirthProfileSchema.parse(input);
  const exists = store.profiles.some(p => p.id === profile.id);
  if (!exists && store.profiles.length >= MAX_PROFILES) throw new Error(`人物資料已達 ${MAX_PROFILES} 位，請先備份並刪除不需要的人物。`);
  return CurrentStoreSchema.parse({ ...store, profiles: exists ? store.profiles.map(p => p.id === profile.id ? profile : p) : [...store.profiles, profile], activeProfileId: profile.id });
}
export function selectProfile(store: AppStore, id: string): AppStore {
  if (!store.profiles.some(p => p.id === id)) throw new Error("人物不存在，請重新選擇。");
  return { ...store, activeProfileId: id };
}
export function removeProfile(store: AppStore, id: string): AppStore {
  const profile = store.profiles.find(p => p.id === id);
  if (!profile) throw new Error("人物不存在，請重新選擇。");
  const profiles = store.profiles.filter(p => p.id !== id);
  return { ...store, profiles, activeProfileId: store.activeProfileId === id ? profiles[0]?.id ?? null : store.activeProfileId,
    history: store.history.map(r => r.birthProfileId === id && !r.birthProfileName ? { ...r, birthProfileName: profile.name?.trim() || "未命名人物" } : r) };
}
export function parseBackup(raw: string): AppStore {
  if (new TextEncoder().encode(raw).byteLength > 8_000_000)
    throw new Error("備份不得超過 8 MB。");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("備份不是有效的 JSON。"); }
  const parsed = StoreSchema.safeParse(data);
  if (!parsed.success) throw new Error("備份格式不相容或命盤資料無效。");
  const ids = parsed.data.history.map(record => record.id);
  if (new Set(ids).size !== ids.length) throw new Error("備份包含重複的紀錄識別碼。");
  return parsed.data;
}
export const EMPTY_STORE: AppStore = {
  version: 2,
  profiles: [],
  activeProfileId: null,
  settings: SettingsSchema.parse({}),
  history: [],
};
export function readStore(storage: Pick<Storage, "getItem">): AppStore {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STORE;
  const parsed = StoreSchema.safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error("裝置資料格式不相容或已損壞，請先匯出備份，再到設定重設。");
  return parsed.data;
}
export function writeStore(storage: Pick<Storage, "setItem">, value: AppStore) {
  const valid = StoreSchema.parse(value);
  storage.setItem(STORAGE_KEY, JSON.stringify(valid));
}
export function updateStore(update: (s: AppStore) => AppStore) {
  try {
    writeStore(localStorage, update(readStore(localStorage)));
    window.dispatchEvent(new Event("mingli-storage"));
  } catch (e) {
    throw new Error(
      e instanceof Error &&
        (e.message.includes("裝置") || e.message.includes("200 筆") || e.message.includes("人物"))
        ? e.message
        : "無法儲存資料，請檢查瀏覽器儲存權限或可用空間。",
    );
  }
}
export function saveProfile(profile: BirthProfile) {
  updateStore((s) => upsertProfile(s, profile));
}

export function switchProfile(id: string) { updateStore(s => selectProfile(s, id)); }
export function deleteProfile(id: string) { updateStore(s => removeProfile(s, id)); }
