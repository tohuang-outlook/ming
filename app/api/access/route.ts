import {
  guardOrigin,
  boundedJson,
  checkCode,
  makeSession,
  apiError,
  HttpError,
} from "@/lib/server/security";
import { productionBudget } from "@/lib/server/budget";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    guardOrigin(request);
    await productionBudget("access");
    const data = (await boundedJson(request, 4096)) as { code?: unknown };
    if (typeof data?.code !== "string" || !checkCode(data.code))
      throw new HttpError(401, "存取碼錯誤或尚未設定。");
    return Response.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `mingli-ai=${makeSession()}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    guardOrigin(request);
    return Response.json({ ok: true }, { headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `mingli-ai=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    } });
  } catch (error) { return apiError(error); }
}
