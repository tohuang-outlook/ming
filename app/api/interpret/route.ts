import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  InterpretRequestSchema,
  InterpretationSchema,
  chartFacts,
} from "@/lib/interpretation/schema";
import { SYSTEM_PROMPT } from "@/lib/interpretation/prompt";
import {
  guardOrigin,
  guardAccess,
  boundedJson,
  apiError,
  HttpError,
} from "@/lib/server/security";
import { productionBudget } from "@/lib/server/budget";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    guardOrigin(request);
    guardAccess(request);
    const input = InterpretRequestSchema.parse(await boundedJson(request));
    if (!process.env.OPENAI_API_KEY)
      throw new HttpError(
        503,
        "AI 尚未啟用。請在伺服器設定 OPENAI_API_KEY；命盤計算與保存仍可使用。",
      );
    await productionBudget("interpret");
    const facts = chartFacts(input);
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 45000,
        maxRetries: 0,
      });
      const response = await client.responses.parse(
        {
          model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
          store: false,
          instructions: SYSTEM_PROMPT,
          input: JSON.stringify({
            system: input.system,
            facts,
            question: input.question,
            language: input.language,
          }),
          text: {
            format: zodTextFormat(
              InterpretationSchema,
              "mingli_interpretation",
            ),
          },
          max_output_tokens: 5000,
        },
        { signal: request.signal },
      );
      const parsed = InterpretationSchema.safeParse(response.output_parsed);
      if (!parsed.success) throw new Error("Invalid response");
      const ids = new Set(facts.map((f) => f.id));
      if (
        parsed.data.sections.some(
          (s) => s.factIds.length === 0 || s.factIds.some((id) => !ids.has(id)),
        )
      )
        throw new Error("Invalid evidence");
      return Response.json(
        {
          interpretation: parsed.data,
          model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      throw new HttpError(
        502,
        "AI 解讀暫時無法完成。請稍後重試；原始命盤並未變更。",
      );
    }
  } catch (error) {
    return apiError(error);
  }
}
