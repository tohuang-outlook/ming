import { HttpError, rateLimit } from "./security";

type BudgetDatabase = {
  prepare(sql: string): { bind(...values: (string | number)[]): { first<T>(): Promise<T | null> } };
};

export async function consumeBudget(db: BudgetDatabase, bucket: string, limit: number, period: number, now = Date.now()) {
  const window = Math.floor(now / period);
  // One atomic statement: concurrent Workers cannot overspend the same budget.
  const row = await db.prepare(`INSERT INTO request_budgets (bucket, window, count) VALUES (?, ?, 1)
    ON CONFLICT(bucket) DO UPDATE SET
      count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END,
      window = excluded.window
    WHERE window != excluded.window OR count < ?
    RETURNING count`).bind(bucket, window, limit).first<{ count: number }>();
  if (!row) throw new HttpError(429, "AI 使用次數已達限制，請稍後再試；每日上限於 UTC 午夜重設。");
}

export async function productionBudget(bucket: "access" | "interpret") {
  if (process.env.NODE_ENV !== "production") return rateLimit(bucket, bucket === "access" ? 5 : 8);
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const db = (env as unknown as { DB?: BudgetDatabase }).DB;
    if (!db) throw new Error("Missing DB");
    await consumeBudget(db, `${bucket}:minute`, bucket === "access" ? 5 : 8, 60_000);
    await consumeBudget(db, `${bucket}:day`, bucket === "access" ? 100 : 40, 86_400_000);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "AI 使用額度服務暫時無法使用，請稍後重試。");
  }
}
