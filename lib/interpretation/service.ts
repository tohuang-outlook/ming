import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { InterpretRequestSchema, InterpretationSchema, chartFacts } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

/** Shared server/main-process service. Never import this into the renderer. */
export async function interpretWithDeepSeek(raw: unknown, apiKey: string, model = "deepseek-flash", signal?: AbortSignal) {
  const input = InterpretRequestSchema.parse(raw);
  const facts = chartFacts(input);
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    timeout: 45000,
    maxRetries: 0,
  });
  const response = await client.responses.parse(
    {
      model,
      reasoning: { effort: "none" },
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
    { signal },
  );
  if (response.status !== "completed") throw new Error("Incomplete response");
  const parsed = InterpretationSchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new Error("Invalid response");
  const ids = new Set(facts.map((f) => f.id));
  if (
    parsed.data.sections.some(
      (s) => s.factIds.length === 0 || s.factIds.some((id) => !ids.has(id)),
    )
  )
    throw new Error("Invalid evidence");

  return { interpretation: parsed.data, model };
}
