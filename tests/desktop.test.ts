import { describe, expect, it } from "vitest";
import { trustedURL, assetPath, takeBudget } from "../desktop/policy";
describe("desktop trust boundary", () => {
  it("accepts only bundled app origin", () => {
    expect(trustedURL("mingli://app/settings")).toBe(true);
    for (const url of ["https://api.deepseek.com", "file:///etc/passwd", "mingli://app.evil/", "mingli://user@app/", "mingli://app:123/", "not a URL"]) expect(trustedURL(url)).toBe(false);
  });
  it("prevents escaped or encoded asset traversal", () => {
    expect(assetPath("/renderer", "mingli://app/settings")).toBe("/renderer/settings");
    for (const url of ["mingli://app/%2e%2e%2fsecret", "mingli://app/%00", "mingli://app/%5csecret", "https://app/settings"]) expect(() => assetPath("/renderer", url)).toThrow();
  });
  it("enforces minute and UTC daily caps without resetting on restart", () => {
    const now = Date.UTC(2026, 8, 19, 12);
    let state = takeBudget(undefined, now);
    for (let i = 1; i < 8; i++) state = takeBudget(state, now);
    expect(() => takeBudget(JSON.parse(JSON.stringify(state)), now)).toThrow("上限");
    expect(takeBudget(state, now + 60000).minuteCount).toBe(1);
    expect(() => takeBudget({ ...state, minuteCount: 0, dayCount: 40 }, now + 60000)).toThrow("上限");
    expect(takeBudget({ ...state, dayCount: 40 }, now + 86400000).dayCount).toBe(1);
    expect(() => takeBudget({ ...state, dayCount: -1 }, now)).toThrow("異常");
    expect(() => takeBudget(null as unknown as typeof state, now)).toThrow("異常");
  });
});
