import { beforeAll, describe, expect, it, vi } from "vitest";
import { build } from "esbuild";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { calculateIChing } from "../lib/iching";
let source: string;
beforeAll(async () => {
  const result = await build({ entryPoints: ["ios/bridge.ts"], bundle: true, platform: "browser", format: "iife", write: false });
  source = result.outputFiles[0].text;
});
function setup(response: Record<string, unknown> = {}) {
  const postMessage = vi.fn(async (value: unknown) => { void value; return response; });
  const window = { webkit: { messageHandlers: { mingli: { postMessage } } } } as unknown as Window;
  const crypto = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
  vm.runInNewContext(source, { window, crypto, TextEncoder, TextDecoder, Uint8Array, btoa, console, structuredClone });
  return { api: window.mingliDesktop!, postMessage, crypto: crypto as unknown as Crypto };
}
describe("iOS native bridge", () => {
  it("supplies a secure random UUID for custom WebKit origins", () => {
    const { crypto } = setup(); const a = crypto.randomUUID();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(crypto.randomUUID()).not.toBe(a);
  });
  it("routes key operations to native Keychain without exposing a getter", async () => {
    const { api, postMessage } = setup({ configured: true, remembered: true });
    expect(await api.status()).toEqual({ configured: true, remembered: true });
    await api.saveKey("synthetic-key-for-testing", true); await api.clearKey();
    expect(postMessage.mock.calls.map(c => (c[0] as { action: string }).action)).toEqual(["status", "saveKey", "clearKey"]);
    expect(Object.keys(api)).not.toContain("getKey");
  });
  it("rejects invalid charts before any native network request", async () => {
    const { api, postMessage } = setup();
    expect((await api.interpret({ chart: {} })).error).toBeTruthy();
    expect(postMessage).not.toHaveBeenCalled();
  });
  it("strips private fields and validates AI evidence", async () => {
    const chart = calculateIChing([[2,2,3],[3,3,2],[2,3,2],[3,2,3],[2,2,2],[3,3,3]]);
    const interpretation = { summary: "測試", sections: [{ title: "卦", text: "測試", factIds: ["iching.lines"] }], limitations: [] };
    const { api, postMessage } = setup({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(interpretation) }] }] });
    const result = await api.interpret({ system: "iching", chart: { ...chart, privateName: "PRIVATE_NAME" }, question: "測試", language: "zh-TW", birthDate: "PRIVATE_DATE" });
    expect(result.interpretation).toEqual(interpretation);
    const request = JSON.stringify(postMessage.mock.calls);
    expect(request).not.toContain("PRIVATE_NAME"); expect(request).not.toContain("PRIVATE_DATE");
  });
  it("refuses fabricated evidence and incomplete responses", async () => {
    const input = { system: "iching", chart: { system: "iching", tosses: Array.from({ length: 6 }, () => [2,2,3]) }, language: "zh-TW" };
    for (const status of ["completed", "incomplete"]) {
      const { api } = setup({ status, output: [{ content: [{ type: "output_text", text: JSON.stringify({ summary: "x", sections: [{ title: "x", text: "x", factIds: ["fabricated"] }], limitations: [] }) }] }] });
      expect((await api.interpret(input)).error).toBeTruthy();
    }
  });
  it("enforces photo size before crossing native bridge", async () => {
    const { api, postMessage } = setup();
    expect((await api.analyzeFace(new Uint8Array())).error).toBeTruthy();
    expect((await api.analyzeFace(new Uint8Array(15_000_001))).error).toBeTruthy();
    expect(postMessage).not.toHaveBeenCalled();
  });
  it("retains native actionable errors", async () => {
    const { api } = setup({ error: "請先設定 DeepSeek 金鑰。" });
    const input = { system: "iching", chart: { system: "iching", tosses: Array.from({ length: 6 }, () => [2,2,3]) }, language: "zh-TW" };
    expect((await api.interpret(input)).error).toBe("請先設定 DeepSeek 金鑰。");
  });
});
