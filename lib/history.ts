import { updateStore } from "./storage";
import { HistoryRecordSchema, type HistoryRecord } from "@/types/history";
export function putHistory(record: HistoryRecord) {
  const valid = HistoryRecordSchema.parse(record);
  updateStore((s) => {
    const history = s.history.filter((r) => r.id !== valid.id);
    if (history.length >= 200)
      throw new Error("裝置歷史已達 200 筆，請先匯出備份並刪除部分紀錄。");
    return { ...s, history: [valid, ...history] };
  });
}
export function deleteHistory(id: string) {
  updateStore((s) => ({ ...s, history: s.history.filter((r) => r.id !== id) }));
}
export function formatDate(iso: string, format: "zh" | "iso") {
  if (format === "iso") return iso.slice(0, 10);
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
