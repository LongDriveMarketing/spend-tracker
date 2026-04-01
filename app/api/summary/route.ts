import { getSummary } from "@/lib/sheets";

export async function GET(request: Request) {
  const pin = request.headers.get("x-pin");
  if (pin !== process.env.APP_PIN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getSummary();
  return Response.json(summary);
}
