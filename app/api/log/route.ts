import { appendExpense } from "@/lib/sheets";

export async function POST(request: Request) {
  const pin = request.headers.get("x-pin");
  if (pin !== process.env.APP_PIN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { amount, description, category, who } = body;

  if (!amount || !description || !category || !who) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  await appendExpense({ date, time, who, amount: parseFloat(amount), description, category });

  return Response.json({ ok: true, date, time });
}
