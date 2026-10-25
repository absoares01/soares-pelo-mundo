import { NextResponse } from "next/server";
import { llmAvailable, slimFlight, summarize } from "@/lib/llm";
import type { AlternativesResult, DatesResult, RoutesResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!llmAvailable()) {
    return NextResponse.json({ error: "Resumo por IA não configurado." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { module?: string; result?: unknown };
  const mod = body.module;
  const r = body.result as Partial<DatesResult & AlternativesResult & RoutesResult> | undefined;
  if (!r || !r.meta) return NextResponse.json({ error: "Resultado ausente." }, { status: 400 });

  let payload: Record<string, unknown>;
  if (mod === "datas" && r.top) {
    payload = {
      modulo: "datas mais baratas",
      dados_de_exemplo: r.meta.mock,
      preco_datas_originais: r.baseline?.price ?? null,
      melhores: r.top.map((t) => ({
        ida: t.combo.out,
        volta: t.combo.ret,
        noites: t.combo.nights,
        preco_final: t.finalPrice,
        economia: t.savingsAbs,
        economia_pct: t.savingsPct,
        voo: slimFlight(t.flight),
        motivos: t.reasons,
        desvantagens: t.drawbacks,
      })),
    };
  } else if (mod === "ocultos" && r.options) {
    payload = {
      modulo: "voos pouco vistos",
      dados_de_exemplo: r.meta.mock,
      menor_preco_aeroportos_pedidos: r.baselineCheapest ?? null,
      opcoes: (r.options as AlternativesResult["options"]).slice(0, 8).map((o) => ({
        preco_final: o.finalPrice,
        taxas_estimadas: o.estimatedFees,
        conveniencia: o.convenience,
        etiquetas: o.tags,
        voo: slimFlight(o.flight),
      })),
    };
  } else if (mod === "escalas" && r.options) {
    payload = {
      modulo: "rota mais barata com escalas",
      dados_de_exemplo: r.meta.mock,
      opcoes: (r.options as RoutesResult["options"]).map((o) => ({
        voo: slimFlight(o.flight),
        troca_economia_tempo: o.tradeoff,
        avisos: o.warnings,
      })),
    };
  } else {
    return NextResponse.json({ error: "Módulo inválido." }, { status: 400 });
  }

  try {
    const summary = await summarize(payload);
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao resumir." }, { status: 502 });
  }
}
