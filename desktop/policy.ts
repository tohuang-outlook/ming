import path from "node:path";
export const APP_ORIGIN = "mingli://app";
export function trustedURL(value: string) {
  try { const url = new URL(value); return url.protocol === "mingli:" && url.hostname === "app" && !url.port && !url.username && !url.password; } catch { return false; }
}
export function assetPath(root: string, value: string) {
  if (!trustedURL(value)) throw new Error("Invalid origin");
  const pathname = decodeURIComponent(new URL(value).pathname);
  if (pathname.includes("\0") || pathname.includes("\\") || pathname.split("/").includes("..")) throw new Error("Invalid path");
  const filename = path.resolve(root, "." + pathname);
  if (filename !== root && !filename.startsWith(root + path.sep)) throw new Error("Invalid path");
  return filename;
}
export type Budget = { day: string; minute: number; dayCount: number; minuteCount: number };
export function takeBudget(previous: Budget | undefined, now = Date.now()): Budget {
  if (previous !== undefined && (!previous || !Number.isSafeInteger(previous.dayCount) || previous.dayCount < 0 || !Number.isSafeInteger(previous.minuteCount) || previous.minuteCount < 0 || !Number.isSafeInteger(previous.minute) || typeof previous.day !== "string")) throw new Error("本機額度資料異常。");
  const day = new Date(now).toISOString().slice(0, 10); const minute = Math.floor(now / 60000);
  const dayCount = previous?.day === day ? previous.dayCount : 0;
  const minuteCount = previous?.minute === minute ? previous.minuteCount : 0;
  if (dayCount >= 40 || minuteCount >= 8) throw new Error("已達本機 AI 使用上限（每分鐘 8 次、每日 40 次，UTC 換日），請稍後再試。");
  return { day, minute, dayCount: dayCount + 1, minuteCount: minuteCount + 1 };
}
