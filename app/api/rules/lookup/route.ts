import { NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { researchFareRules } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 120;

// Módulo 6: busca as regras publicadas da tarifa (com fonte). O que não tiver fonte é descartado.
export async function POST(req: Request) {
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "A busca automática de regras usa IA com busca na web (ANTHROPIC_API_KEY). Você pode digitar as regras à mão." },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const airline = clean(body.airline, 80);
  if (!airline) return NextResponse.json({ error: "Informe a companhia aérea." }, { status: 400 });
  const currency = clean(body.currency, 3).toUpperCase() || "BRL";
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Moeda inválida." }, { status: 400 });

  try {
    const r = await researchFareRules({
      airline,
      fareHint: clean(body.fareHint, 80) || undefined,
      route: clean(body.route, 80) || undefined,
      currency,
    });
    return NextResponse.json({ rules: r.rules, aiSearches: r.searches });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro na pesquisa de regras." }, { status: 502 });
  }
}
