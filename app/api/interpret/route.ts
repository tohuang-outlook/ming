import { interpretWithDeepSeek } from "@/lib/interpretation/service";
import {
  InterpretRequestSchema,
} from "@/lib/interpretation/schema";
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
    if (!process.env.DEEPSEEK_API_KEY)
      throw new HttpError(
        503,
        "AI 尚未啟用。請在伺服器設定 DEEPSEEK_API_KEY；命盤計算與保存仍可使用。",
      );
    await productionBudget("interpret");
    try {
      const result = await interpretWithDeepSeek(input, process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_MODEL, request.signal);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
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
