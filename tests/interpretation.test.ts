import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateBazi } from "@/lib/bazi";
import { calculateIChing } from "@/lib/iching";
import { prepareInterpretation, chartFacts } from "@/lib/interpretation/schema";
import { profile } from "./helpers";
import { POST } from "@/app/api/interpret/route";
import {
  resetLimits,
  guardAccess,
  makeSession,
  rateLimit,
} from "@/lib/server/security";
const { parse, constructed } = vi.hoisted(() => ({ parse: vi.fn(), constructed: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { parse };
    constructor(options: unknown) { constructed(options); }
  },
}));
beforeEach(() => {
  resetLimits();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
  vi.stubEnv("DEEPSEEK_API_KEY", "");
  vi.stubEnv("AI_ACCESS_TOKEN", "");
  parse.mockReset();
  constructed.mockReset();
  vi.stubEnv("DEEPSEEK_MODEL", "deepseek-flash");
});
afterEach(() => vi.unstubAllEnvs());
function request(body: unknown, origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/interpret", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const chart = calculateIChing(Array(6).fill([3, 2, 2]));
it("minimal payload removes name, birthday, timezone, location, IDs", () => {
  const c = calculateBazi(
    profile("2005-12-23", "08:37", {
      name: "PRIVATE-NAME",
      birthLocation: "PRIVATE-LOCATION",
    }),
  );
  const data = prepareInterpretation(c);
  const raw = JSON.stringify(data);
  expect(raw).not.toContain("PRIVATE");
  expect(raw).not.toContain("2005-12-23");
  expect(data.chart).not.toHaveProperty("meta");
  expect(data.chart).not.toHaveProperty("birthYear");
});
it("iching rebuilt from immutable tosses, not client invented name", () => {
  const data = prepareInterpretation({
    ...chart,
    original: { ...chart.original, name: "invented" },
  });
  expect(
    chartFacts(data).find((f) => f.id === "iching.original")?.value,
  ).toMatchObject({ name: "乾" });
});
it("invalid chart returns 400 before model call", async () => {
  expect(
    (await POST(request({ system: "bazi", chart: {}, language: "zh-TW" })))
      .status,
  ).toBe(400);
  expect(parse).not.toHaveBeenCalled();
});
it("missing key returns informative 503", async () => {
  const r = await POST(request(prepareInterpretation(chart)));
  expect(r.status).toBe(503);
  expect(await r.text()).toContain("DEEPSEEK_API_KEY");
});
it("cross origin denied", async () =>
  expect(
    (await POST(request(prepareInterpretation(chart), "https://evil.invalid")))
      .status,
  ).toBe(403));
it("oversized input returns 413", async () =>
  expect((await POST(request({ question: "a".repeat(97000) }))).status).toBe(
    413,
  ));
it("JSON malformed returns 400", async () =>
  expect(
    (
      await POST(
        new Request("http://127.0.0.1:3000/api/interpret", {
          method: "POST",
          headers: {
            origin: "http://127.0.0.1:3000",
            "content-type": "application/json",
          },
          body: "{",
        }),
      )
    ).status,
  ).toBe(400));
it("model receives facts only, success cannot replace chart", async () => {
  vi.stubEnv("DEEPSEEK_API_KEY", "test");
  const answer = {
    summary: "參考解讀",
    sections: [
      { title: "當下", text: "可以耐心思考。", factIds: ["iching.original"] },
    ],
    limitations: ["僅供參考"],
  };
  parse.mockResolvedValue({ status: "completed", output_parsed: answer });
  const before = JSON.stringify(chart);
  const r = await POST(request(prepareInterpretation(chart)));
  expect(r.status).toBe(200);
  expect(await r.json()).toHaveProperty("interpretation", answer);
  expect(constructed).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "https://api.deepseek.com", apiKey: "test", maxRetries: 0 }));
  expect(parse.mock.calls[0][0].model).toBe("deepseek-flash");
  expect(parse.mock.calls[0][0].reasoning).toEqual({ effort: "none" });
  expect(parse.mock.calls[0][0].text.format.type).toBe("json_schema");
  expect(JSON.stringify(chart)).toBe(before);
});
it("unknown fact reference rejected", async () => {
  vi.stubEnv("DEEPSEEK_API_KEY", "test");
  parse.mockResolvedValue({
    status: "completed",
    output_parsed: {
      summary: "x",
      sections: [{ title: "x", text: "x", factIds: ["invented"] }],
      limitations: [],
    },
  });
  expect((await POST(request(prepareInterpretation(chart)))).status).toBe(502);
});
it("provider errors sanitized", async () => {
  vi.stubEnv("DEEPSEEK_API_KEY", "test-secret");
  parse.mockRejectedValue(new Error("test-secret provider trace"));
  const r = await POST(request(prepareInterpretation(chart)));
  expect(r.status).toBe(502);
  expect(await r.text()).not.toContain("test-secret");
});
it("production fails closed without access configuration", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(() => guardAccess(request({}))).toThrow("存取保護");
});
it("valid session and expired/tampered sessions", () => {
  vi.stubEnv("AI_ACCESS_TOKEN", "test-access-code-at-least-24-characters");
  const session = makeSession();
  const r = request({});
  r.headers.set("cookie", `mingli-ai=${session}`);
  expect(() => guardAccess(r)).not.toThrow();
  r.headers.set("cookie", `mingli-ai=${session}x`);
  expect(() => guardAccess(r)).toThrow();
  r.headers.set("cookie", `mingli-ai=${makeSession(Date.now() - 7200000)}`);
  expect(() => guardAccess(r)).toThrow();
});
it("limiter resets at next window", () => {
  rateLimit("test", 1, 0);
  expect(() => rateLimit("test", 1, 100)).toThrow();
  expect(() => rateLimit("test", 1, 60000)).not.toThrow();
});

it("OpenAI credentials are never reused for DeepSeek", async () => {
  vi.stubEnv("OPENAI_API_KEY", "unrelated-openai-key");
  expect((await POST(request(prepareInterpretation(chart)))).status).toBe(503);
  expect(constructed).not.toHaveBeenCalled();
});
it("truncated provider output is rejected even with parseable JSON", async () => {
  vi.stubEnv("DEEPSEEK_API_KEY", "test");
  parse.mockResolvedValue({ status: "incomplete", output_parsed: { summary: "x", sections: [{title: "x", text: "x", factIds:["iching.original"]}], limitations: [] } });
  expect((await POST(request(prepareInterpretation(chart)))).status).toBe(502);
});
