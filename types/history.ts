import { z } from "zod";
import {
  SafeChartSchema,
  InterpretationSchema,
  AnnualBaziSchema,
} from "@/lib/interpretation/schema";
import type { Chart } from "./charts";
import { calculateIChing } from "@/lib/iching";
const string = z.string();
const meta = z.object({
  localDate: string,
  localTime: string,
  timezone: string,
  instant: string,
  calculationTime: string,
  calculationZone: string,
  timeConvention: string,
});
const FullChartSchema = z.custom<Chart>((input) => {
  const safe = SafeChartSchema.safeParse(input);
  if (!safe.success || !input || typeof input !== "object") return false;
  const c = input as Record<string, unknown>;
  if (c.schemaVersion !== 1) return false;
  if (c.system === "iching") {
    return (
      JSON.stringify(input) ===
      JSON.stringify(
        calculateIChing((safe.data as { tosses: number[][] }).tosses),
      )
    );
  }
  if (!meta.safeParse(c.meta).success || typeof c.lunarDate !== "string")
    return false;
  if (c.system === "bazi")
    return z
      .object({
        birthYear: z.number(),
        usefulGod: z.object({ status: z.literal("not-implemented") }),
        status: z.literal("needs-verification"),
      })
      .safeParse(c).success;
  return z
    .object({
      gender: z.enum(["male", "female"]),
      status: z.literal("needs-verification"),
      limitations: z.array(string),
    })
    .safeParse(c).success;
}, "歷史命盤資料格式不正確。");
export const HistoryRecordSchema = z
  .object({
    id: z.string().min(1),
    version: z.literal(1),
    type: z.enum(["iching", "bazi", "ziwei"]),
    createdAt: z.string().datetime(),
    question: z.string().max(1000),
    birthProfileId: z.string().nullable(),
    chart: FullChartSchema,
    annualBazi: AnnualBaziSchema.optional(),
    interpretation: InterpretationSchema.nullable(),
  })
  .refine((r) => r.type === r.chart.system, "歷史紀錄類型不符。");
export type HistoryRecord = z.infer<typeof HistoryRecordSchema>;
