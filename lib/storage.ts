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
export const StoreSchema = z.object({
  version: z.literal(1),
  profile: BirthProfileSchema.nullable(),
  settings: SettingsSchema,
  history: z.array(HistoryRecordSchema).max(200),
});
export type AppStore = z.infer<typeof StoreSchema>;
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
  version: 1,
  profile: null,
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
        (e.message.includes("裝置") || e.message.includes("200 筆"))
        ? e.message
        : "無法儲存資料，請檢查瀏覽器儲存權限或可用空間。",
    );
  }
}
export function saveProfile(profile: BirthProfile) {
  updateStore((s) => ({ ...s, profile }));
}
