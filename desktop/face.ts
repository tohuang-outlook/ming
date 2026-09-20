import { spawn } from "node:child_process";
import { FaceAnalysisSchema, FaceReportSchema, faceQuality, faceMeasurements, FACE_CULTURE } from "../lib/face/schema";
import { z } from "zod";
const OutputSchema = z.object({ faces: z.array(z.unknown()).max(1), error: z.string().max(300).nullish(), width: z.number().optional(), height: z.number().optional(), photo: z.string().max(8_000_000).optional() });
export async function analyzeFace(binary: string, raw: unknown) {
  if (!(raw instanceof Uint8Array) || raw.byteLength === 0 || raw.byteLength > 15_000_000) return { error: "請選擇 15 MB 以下的 JPG 或 PNG 照片。" };
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(binary, [], { stdio: ["pipe", "pipe", "ignore"], env: { PATH: "/usr/bin:/bin", NODE_ENV: "production" } });
    const chunks: Buffer[] = []; let length = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, 25000);
    child.stdout.on("data", (data: Buffer) => { length += data.length; if (length > 9_000_000) { child.kill(); reject(new Error("oversize")); } else chunks.push(data); });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.stdin.on("error", () => { /* The close handler reports native decode failures. */ });
    child.once("close", code => { clearTimeout(timer); if (code !== 0) reject(new Error("native failure")); else resolve(Buffer.concat(chunks).toString("utf8")); });
    child.stdin.end(Buffer.from(raw));
  });
  const parsed = OutputSchema.parse(JSON.parse(output));
  if (parsed.error) return { error: parsed.error };
  if (parsed.faces.length !== 1) return { error: "未找到清楚的人臉，請選擇只有一人的正面照片，避免口罩、遮擋或強烈背光。" };
  const report = FaceReportSchema.parse({ analysis: FaceAnalysisSchema.parse({ width: parsed.width, height: parsed.height, face: parsed.faces[0] }), photo: parsed.photo });
  const warning = faceQuality(report.analysis);
  if (warning) return { error: warning };
  return report;
}
export function makeFaceReport(raw: unknown) {
  const input = FaceReportSchema.parse(raw);
  return { version: 1, kind: "local-face-cultural-observation", createdAt: new Date().toISOString(), analysis: input.analysis, measurements: faceMeasurements(input.analysis), culture: FACE_CULTURE, disclaimer: "僅為照片幾何觀察與民俗文化介紹，不推論性格、誠信、智力、健康或命運。", ...(input.photo ? { photo: input.photo } : {}) };
}
