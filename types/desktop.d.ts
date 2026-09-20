import type { FaceAnalysis } from "@/lib/face/schema";
import type { InterpretationSchema } from "@/lib/interpretation/schema";
import type { z } from "zod";
type DesktopResult = { error?: string };
declare global {
  interface Window {
    mingliDesktop?: {
      analyzeFace(bytes: Uint8Array): Promise<DesktopResult & { analysis?: FaceAnalysis; photo?: string }>;
      exportFace(report: { analysis: FaceAnalysis; photo?: string }): Promise<DesktopResult & { canceled?: boolean }>;
      exportBackup(raw: string): Promise<DesktopResult & { canceled?: boolean }>;
      status(): Promise<DesktopResult & { configured?: boolean; remembered?: boolean }>;
      saveKey(key: string, remember: boolean): Promise<DesktopResult>;
      clearKey(): Promise<DesktopResult>;
      interpret(input: unknown): Promise<DesktopResult & { interpretation?: z.infer<typeof InterpretationSchema>; model?: string }>;
    };
  }
}
export {};
