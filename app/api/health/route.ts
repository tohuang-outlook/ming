export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", service: "mingli", version: "1.0.0" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
