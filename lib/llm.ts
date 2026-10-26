import type { Flight } from "./types";

// Camada de IA OPCIONAL: só redige um resumo em linguagem natural a partir de
// dados já calculados. Os números (preços, taxas, tempos, economia) vêm sempre
// da API de voos ou dos cálculos em código — a IA é instruída a não criar números.

export function llmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function slimFlight(f: Flight) {
  return {
    preco: f.price,
    moeda: f.currency,
    companhias: f.airlines,
    escalas: f.stops,
    duracao_min: f.durationMin,
    rota: f.segments.map((s) => s.from).concat(f.segments[f.segments.length - 1]?.to ?? ""),
    saida: f.departure,
    conexoes: f.layovers.map((l) => ({ aeroporto: l.airport, min: l.durationMin, pernoite: l.overnight ?? false })),
    troca_de_aeroporto: f.airportChange,
    baixo_custo: f.lowCost,
    bagagem: f.baggage.status,
  };
}

const SYSTEM = `Você é assistente de uma consultora de viagens brasileira. Receberá resultados de busca de passagens já calculados, em JSON.
Regras obrigatórias:
- Escreva em português do Brasil, de forma objetiva, em no máximo 8 linhas.
- Use SOMENTE números que estejam no JSON. Nunca invente preços, taxas, tempos ou economia. Se um dado faltar, diga que precisa ser confirmado.
- Destaque a melhor opção, o principal risco ou desvantagem e uma recomendação prática para o cliente.
- Se "dados_de_exemplo" for true, comece avisando que são dados fictícios.
- Não afirme regras de companhias que não estejam no JSON.`;

export async function summarize(payload: unknown): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("IA não configurada (ANTHROPIC_API_KEY).");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(payload).slice(0, 40000) }],
    }),
  });
  if (!res.ok) throw new Error(`Falha ao gerar resumo (HTTP ${res.status}).`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("A IA não devolveu texto.");
  return text;
}
