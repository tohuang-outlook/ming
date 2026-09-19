import { z } from "zod";
import type { Chart } from "@/types/charts";
import { calculateIChing } from "@/lib/iching";
const short = z.string().max(200);
const names = z.array(short).max(20);
const num = z.number().int().min(0).max(2400);
const pillars = z
  .array(
    z.object({
      key: z.enum(["year", "month", "day", "time"]),
      label: short,
      ganZhi: short,
      stem: short,
      branch: short,
      yinYang: short,
      elements: short,
      hiddenStems: names,
      tenGod: short,
      hiddenTenGods: names,
      naYin: short,
      stage: short,
    }),
  )
  .length(4);
const cycle = z.object({
  index: num,
  startAge: num,
  endAge: num,
  startYear: num,
  endYear: num,
  ganZhi: short,
});
const bazi = z.object({
  system: z.literal("bazi"),
  engine: z.literal("lunar-typescript@1.8.6"),
  dayMaster: short,
  pillars,
  elements: z.record(z.string(), z.number().int().min(0).max(8)),
  elementMethod: short,
  rules: z.object({
    yearBoundary: short,
    monthBoundary: short,
    dayBoundary: short,
    yunSect: z.literal(1),
    timeConvention: short,
  }),
  luck: z.object({
    forward: z.boolean(),
    start: z.object({ years: num, months: num, days: num, date: short }),
    cycles: z.array(cycle).max(12),
  }),
});
const star = z.object({
  name: short,
  category: short,
  palace: num,
  transformation: short,
  metadata: z.object({ brightness: short, scope: short, source: short }),
});
const ziwei = z.object({
  system: z.literal("ziwei"),
  engine: z.literal("iztro@2.6.1"),
  config: z.object({
    school: z.literal("iztro-default"),
    dayBoundaryRule: z.enum(["23:00", "00:00"]),
    transformationTable: z.literal("iztro-default"),
    leapMonthRule: z.enum(["split-at-15", "current-month"]),
  }),
  soulPalace: short,
  bodyPalace: short,
  fiveElementsClass: short,
  palaces: z
    .array(
      z.object({
        index: num,
        name: short,
        stem: short,
        branch: short,
        isBody: z.boolean(),
        stars: z.array(star).max(100),
        decadal: z.object({ startAge: num, endAge: num, ganZhi: short }),
      }),
    )
    .length(12),
  cycles: z
    .array(
      cycle.extend({
        palaceName: short,
        palaceNames: z.array(short).length(12),
        transformations: z.array(short).length(4),
      }),
    )
    .max(12),
  annual: z
    .object({
      year: num,
      date: short,
      period: short,
      soulIndex: z.number().int().min(0).max(11),
      ganZhi: short,
      transformations: z.array(short).length(4),
      palaces: z
        .array(
          z.object({
            name: short,
            index: num,
            natalPalace: short,
            branch: short,
          }),
        )
        .length(12),
      decadalIndex: num,
    })
    .nullable(),
});
const iching = z.object({
  system: z.literal("iching"),
  tosses: z
    .array(z.array(z.union([z.literal(2), z.literal(3)])).length(3))
    .length(6),
});
export const SafeChartSchema = z.discriminatedUnion("system", [
  bazi,
  ziwei,
  iching,
]);
export const AnnualBaziSchema = z.object({
  year: z.number().int().min(1901).max(2099),
  ganZhi: short,
  period: short,
  tenGod: short,
  relationshipStatus: z.literal("needs-verification"),
  relations: z
    .array(z.object({ pillar: short, stem: short, branch: short }))
    .length(4),
  limitations: names,
});
export const InterpretRequestSchema = z
  .object({
    system: z.enum(["bazi", "ziwei", "iching"]),
    chart: SafeChartSchema,
    question: z.string().max(1000).default(""),
    language: z.literal("zh-TW"),
    annualBazi: AnnualBaziSchema.optional(),
  })
  .refine((v) => v.system === v.chart.system, "命盤類型不一致。")
  .refine((v) => !v.annualBazi || v.system === "bazi", "流年類型不一致。");
export const InterpretationSchema = z.object({
  summary: z.string().min(1).max(3000),
  sections: z
    .array(
      z.object({
        title: z.string().max(100),
        text: z.string().max(4000),
        factIds: z.array(z.string().max(120)).max(30),
      }),
    )
    .min(1)
    .max(12),
  limitations: z.array(z.string().max(1000)).max(10),
});
export function prepareInterpretation(
  chart: Chart,
  question = "",
  annualBazi?: unknown,
) {
  return InterpretRequestSchema.parse({
    system: chart.system,
    chart,
    question,
    language: "zh-TW",
    annualBazi,
  });
}
export function chartFacts(input: z.infer<typeof InterpretRequestSchema>) {
  const chart =
    input.chart.system === "iching"
      ? calculateIChing(input.chart.tosses)
      : input.chart;
  const facts: { id: string; label: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(chart)) {
    if (["system", "schemaVersion", "status", "engine"].includes(key)) continue;
    facts.push({ id: `${chart.system}.${key}`, label: key, value });
  }
  if (input.annualBazi)
    facts.push({
      id: "bazi.annual",
      label: "八字流年（已計算）",
      value: input.annualBazi,
    });
  return facts;
}
