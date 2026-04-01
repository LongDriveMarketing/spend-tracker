export async function POST(request: Request) {
  const { pin } = await request.json();
  if (pin === process.env.APP_PIN) {
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 401 });
}
