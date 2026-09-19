import { it, expect, vi, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { consumeBudget, productionBudget } from "@/lib/server/budget";
import { parseBackup, EMPTY_STORE } from "@/lib/storage";
import { guardAccess, makeSession } from "@/lib/server/security";
import { DELETE } from "@/app/api/access/route";

afterEach(() => vi.unstubAllEnvs());
it("atomic durable budgets survive connections, reject excess and reset boundaries", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE request_budgets (bucket TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)");
  const db = { prepare: (sql: string) => ({ bind: (...values: (string | number)[]) => ({ first: async <T>() => sqlite.prepare(sql).get(...values) as T ?? null }) }) };
  try {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => consumeBudget(db, "interpret:minute", 8, 60000, 100)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(8);
    expect(sqlite.prepare("SELECT count FROM request_budgets").get()?.count).toBe(8);
    await expect(consumeBudget(db, "interpret:minute", 8, 60000, 60000)).resolves.toBeUndefined();
    expect(sqlite.prepare("SELECT count FROM request_budgets").get()?.count).toBe(1);
    await expect(consumeBudget(db, "access:minute", 1, 60000, 100)).resolves.toBeUndefined();
  } finally { sqlite.close(); }
});
it("production budget fails closed outside the configured runtime", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await expect(productionBudget("interpret")).rejects.toMatchObject({ status: 503 });
});
it("backup version and size validated before any write", () => {
  expect(parseBackup(JSON.stringify(EMPTY_STORE))).toEqual(EMPTY_STORE);
  expect(() => parseBackup("broken")).toThrow("JSON");
  expect(() => parseBackup(JSON.stringify({ ...EMPTY_STORE, version: 2 }))).toThrow("不相容");
  expect(() => parseBackup("x".repeat(8_000_001))).toThrow("8 MB");
});
it("sessions reject extra fields and malformed timestamps", () => {
  vi.stubEnv("AI_ACCESS_TOKEN", "test-token-with-at-least-24-characters");
  for (const token of [makeSession() + ".ignored", "NaN." + "a".repeat(64), "Infinity." + "a".repeat(64)]) {
    expect(() => guardAccess(new Request("http://localhost", { headers: { cookie: `mingli-ai=${token}` } }))).toThrow();
  }
});
it("logout expires the HttpOnly session and rejects foreign origins", async () => {
  vi.stubEnv("APP_ORIGIN", "https://example.test");
  vi.stubEnv("NODE_ENV", "production");
  const response = await DELETE(new Request("https://example.test/api/access", { method: "DELETE", headers: { origin: "https://example.test", "content-type": "application/json" } }));
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0; Secure");
  expect((await DELETE(new Request("https://example.test/api/access", { method: "DELETE" }))).status).toBe(403);
});
