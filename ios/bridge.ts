import { z } from "zod";
import { InterpretRequestSchema, InterpretationSchema, chartFacts } from "../lib/interpretation/schema";
import { SYSTEM_PROMPT } from "../lib/interpretation/prompt";
import { FaceAnalysisSchema, FaceReportSchema, faceQuality, faceMeasurements, FACE_CULTURE } from "../lib/face/schema";
declare global { interface Window { webkit: { messageHandlers: { mingli: { postMessage(value: unknown): Promise<unknown> } } } } }
const call = async (action: string, value: unknown = null): Promise<Record<string, unknown>> => {
  const result = await window.webkit.messageHandlers.mingli.postMessage({ action, value });
  return result as Record<string, unknown>;
};
// WKWebView custom origins may not expose the secure-context-only UUID helper.
if (typeof crypto.randomUUID !== "function") {
  crypto.randomUUID = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const h = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  };
}
window.mingliDesktop = {
  status: () => call("status"),
  saveKey: (key, remember) => call("saveKey", { key, remember }),
  clearKey: () => call("clearKey"),
  exportBackup: raw => call("export", { raw, name: "mingli-backup.json" }),
  exportFace: async raw => {
    const report = FaceReportSchema.parse(raw);
    return call("export", { name: "mingli-face.json", raw: JSON.stringify({ version: 1, kind: "local-face-cultural-observation", createdAt: new Date().toISOString(), ...report, measurements: faceMeasurements(report.analysis), culture: FACE_CULTURE, disclaimer: "僅為照片幾何觀察與民俗文化介紹，不推論性格、誠信、智力、健康或命運。" }, null, 2) });
  },
  analyzeFace: async bytes => {
    if (!bytes.length || bytes.length > 15_000_000) return { error: "請選擇 15 MB 以下的照片。" };
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const result = await call("face", btoa(binary));
    if (result.error) return { error: String(result.error) };
    const faces = result.faces as unknown[];
    if (faces?.length !== 1) return { error: "請選擇只有一人的清晰正面照片。" };
    const analysis = FaceAnalysisSchema.parse({ width: result.width, height: result.height, face: faces[0] });
    const error = faceQuality(analysis);
    return error ? { error } : FaceReportSchema.parse({ analysis, photo: result.photo });
  },
  interpret: async raw => {
    try {
      const input = InterpretRequestSchema.parse(raw);
      const facts = chartFacts(input);
      const result = await call("interpret", {
        model: "deepseek-flash", reasoning: { effort: "none" }, instructions: SYSTEM_PROMPT,
        input: JSON.stringify({ system: input.system, facts, question: input.question, language: input.language }),
        text: { format: { type: "json_schema", name: "mingli_interpretation", strict: true, schema: z.toJSONSchema(InterpretationSchema, { target: "draft-7" }) } }, max_output_tokens: 5000,
      });
      if (result.error) return { error: String(result.error) };
      if (result.status !== "completed" || !Array.isArray(result.output)) throw new Error();
      const text = result.output.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join("");
      const interpretation = InterpretationSchema.parse(JSON.parse(text));
      const ids = new Set(facts.map(f => f.id));
      if (interpretation.sections.some(s => !s.factIds.length || s.factIds.some(id => !ids.has(id)))) throw new Error();
      return { interpretation, model: "deepseek-flash" };
    } catch { return { error: "AI 回覆未通過格式或命盤依據檢查，請稍後重試。" }; }
  },
};
