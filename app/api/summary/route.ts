import { getSummary } from "@/lib/sheets";

export async function GET(request: Request) {
  const pin = request.headers.get("x-pin");
  if (pin !== process.env.APP_PIN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getSummary();
    return Response.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
