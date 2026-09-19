import { createHmac, timingSafeEqual } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function guardOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
  if (request.headers.get("origin") !== expected)
    throw new HttpError(403, "請從指定的 App 網址發起解讀。");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "請使用 JSON 格式。");
}
export async function boundedJson(request: Request, max = 96000) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "缺少請求內容。");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "命盤資料過大。");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "JSON 格式錯誤。");
  }
}
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function accessConfigured() {
  return (process.env.AI_ACCESS_TOKEN?.length ?? 0) >= 24;
}
export function checkCode(code: string) {
  return accessConfigured() && equal(code, process.env.AI_ACCESS_TOKEN!);
}
export function makeSession(now = Date.now()) {
  const expires = String(now + 3600000);
  return `${expires}.${createHmac("sha256", process.env.AI_ACCESS_TOKEN!).update(expires).digest("hex")}`;
}
export function guardAccess(request: Request) {
  if (process.env.NODE_ENV !== "production" && !process.env.AI_ACCESS_TOKEN)
    return;
  if (!accessConfigured())
    throw new HttpError(
      503,
      "AI 存取保護尚未設定，請由管理者設定 AI_ACCESS_TOKEN。",
    );
  const cookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("mingli-ai="))
      ?.slice(10) ?? "";
  const [expiry, sig, extra] = cookie.split(".");
  if (
    extra !== undefined ||
    !/^\d{13}$/.test(expiry ?? "") ||
    !/^[a-f0-9]{64}$/.test(sig ?? "") ||
    !expiry ||
    !sig ||
    Number(expiry) <= Date.now() ||
    Number(expiry) > Date.now() + 3600000
  )
    throw new HttpError(401, "請先到設定輸入 AI 存取碼。");
  const expected = createHmac("sha256", process.env.AI_ACCESS_TOKEN!)
    .update(expiry)
    .digest("hex");
  if (!equal(sig, expected))
    throw new HttpError(401, "AI 存取已失效，請重新登入。");
}
// A bounded single-instance budget. Production multi-instance hosting MUST add a distributed gateway limit.
const budgets = new Map<string, { start: number; count: number }>();
export function rateLimit(bucket = "interpret", limit = 8, now = Date.now()) {
  const b = budgets.get(bucket);
  if (!b || now - b.start >= 60000) {
    budgets.set(bucket, { start: now, count: 1 });
    return;
  }
  if (b.count >= limit)
    throw new HttpError(429, "請求過於頻繁，請稍後一分鐘再試。");
  b.count++;
}
export function resetLimits() {
  budgets.clear();
}
export function apiError(error: unknown) {
  const status = error instanceof HttpError ? error.status : 400;
  return Response.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "命盤格式不正確或資料不足，請重新排盤。",
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
