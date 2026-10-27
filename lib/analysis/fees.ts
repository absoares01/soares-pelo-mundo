import type { FareOption, FeeKey, FeeLine } from "../types";

// Módulo 5 — custo total real. Só soma valores que têm origem (SerpApi, fonte
// com link ou digitados por você). Valor ausente nunca vira zero: aparece
// como "não informado" e o total é marcado como incompleto.

export type FeeNeeds = Partial<Record<FeeKey, boolean>>;

export interface FeeBreakdownLine {
  line: FeeLine;
  counted: boolean; // entra no custo final deste cliente
  cost: number | null; // null = precisa ser contado mas o valor não é conhecido
  reason: string;
}

export interface FeeBreakdown {
  fare: FareOption;
  lines: FeeBreakdownLine[];
  totalUnavoidable: number;
  totalOptionalNeeded: number;
  finalPrice: number;
  unknownCount: number; // itens que o cliente precisa, sem valor conhecido
  complete: boolean;
}

export function legsOf(fare: FareOption): number {
  return fare.roundTrip ? 2 : 1;
}

function lineCost(line: FeeLine, fare: FareOption): number | null {
  if (line.amount === null) return null;
  return line.amount * fare.adults * (line.basis === "por_trecho" ? legsOf(fare) : 1);
}

export function computeFeeBreakdown(fare: FareOption, lines: FeeLine[], needs: FeeNeeds): FeeBreakdown {
  const rows: FeeBreakdownLine[] = [];
  let unavoidable = 0;
  let optional = 0;
  let unknown = 0;

  for (const raw of lines) {
    let line = raw;
    // Bagagem confirmada como incluída na tarifa vence qualquer outra informação.
    if (line.key === "bagagem_despachada" && fare.baggageIncluded === true) {
      line = { ...line, status: "incluido" };
    }
    // Valor informado sem classificação: tratado como opcional.
    const status = line.status === "nao_informado" && line.amount !== null ? "opcional" : line.status;
    const needed = Boolean(needs[line.key]);

    if (status === "incluido") {
      rows.push({ line, counted: false, cost: 0, reason: "Já incluído na tarifa." });
      continue;
    }
    if (status === "inevitavel") {
      const c = lineCost(line, fare);
      rows.push({ line, counted: true, cost: c, reason: "Cobrança inevitável nesta tarifa." });
      if (c === null) unknown++;
      else unavoidable += c;
      continue;
    }
    // opcional ou não informado
    if (!needed) {
      rows.push({ line, counted: false, cost: lineCost(line, fare), reason: "Opcional — o cliente não precisa." });
      continue;
    }
    const c = lineCost(line, fare);
    rows.push({
      line,
      counted: true,
      cost: c,
      reason: c === null ? "O cliente precisa, mas o valor não foi informado pela fonte — confirmar com a companhia." : "Opcional que o cliente quer contratar.",
    });
    if (c === null) unknown++;
    else optional += c;
  }

  return {
    fare,
    lines: rows,
    totalUnavoidable: unavoidable,
    totalOptionalNeeded: optional,
    finalPrice: fare.price + unavoidable + optional,
    unknownCount: unknown,
    complete: unknown === 0,
  };
}

export interface FeeComparison {
  ranked: FeeBreakdown[]; // do menor para o maior custo final
  cheapestAdvertised: FeeBreakdown | null;
  cheapestFinal: FeeBreakdown | null;
  inverted: boolean; // a mais barata anunciada deixa de ser a mais barata no custo final
  message: string;
}

export function compareFees(breakdowns: FeeBreakdown[], currencyFmt: (n: number) => string): FeeComparison {
  const ranked = [...breakdowns].sort((a, b) => a.finalPrice - b.finalPrice);
  const cheapestFinal = ranked[0] ?? null;
  const cheapestAdvertised = [...breakdowns].sort((a, b) => a.fare.price - b.fare.price)[0] ?? null;
  const inverted = Boolean(cheapestFinal && cheapestAdvertised && cheapestFinal.fare.id !== cheapestAdvertised.fare.id);

  let message = "Adicione ao menos uma tarifa para comparar.";
  if (cheapestFinal && cheapestAdvertised) {
    if (breakdowns.length === 1) {
      const extra = cheapestFinal.finalPrice - cheapestFinal.fare.price;
      message = `Tarifa anunciada ${currencyFmt(cheapestFinal.fare.price)}; custo final estimado ${currencyFmt(cheapestFinal.finalPrice)} (${extra >= 0 ? "+" : ""}${currencyFmt(extra)} em taxas).`;
    } else if (inverted) {
      const diff = cheapestAdvertised.finalPrice - cheapestFinal.finalPrice;
      message = `A tarifa mais barata no anúncio (${cheapestAdvertised.fare.label}) deixa de ser a mais barata no custo final: "${cheapestFinal.fare.label}" sai ${currencyFmt(diff)} mais barata depois das taxas que o cliente precisa.`;
    } else {
      message = `"${cheapestFinal.fare.label}" é a mais barata tanto no anúncio quanto no custo final.`;
    }
    if (ranked.some((r) => !r.complete)) {
      message += " Atenção: há valores não informados, então a comparação pode mudar.";
    }
  }
  return { ranked, cheapestAdvertised, cheapestFinal, inverted, message };
}
