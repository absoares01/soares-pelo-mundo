import { NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { saveSearch } from "@/lib/api";
import { researchDiscounts } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "Este módulo usa a IA com busca na web. Configure ANTHROPIC_API_KEY na Vercel (veja o README)." },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const target = clean(body.target, 120);
  if (!target) {
    return NextResponse.json({ error: "Informe a companhia aérea, o programa ou a rota que quer pesquisar." }, { status: 400 });
  }
  const route = clean(body.route, 80) || undefined;
  const travelDate = clean(body.travelDate, 10) || undefined;
  if (travelDate && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    return NextResponse.json({ error: "Data de viagem inválida." }, { status: 400 });
  }

  try {
    const result = await researchDiscounts({ target, route, travelDate });
    const searchId = await saveSearch({
      module: "descontos",
      title: `Descontos: ${target}${route ? ` (${route})` : ""}`,
      params: { target, route, travelDate },
      result,
      mock: false,
      clientId: typeof body.clientId === "string" && body.clientId ? body.clientId : null,
    });
    return NextResponse.json({ result, searchId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro na pesquisa de descontos." }, { status: 502 });
  }
}
