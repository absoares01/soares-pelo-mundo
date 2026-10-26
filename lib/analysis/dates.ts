import { addDays, diffDays, formatDateShort, todayISO, weekdayIndex, weekdayName } from "../dates";
import type { FeeAssumptions } from "../fees";
import { totalWithFees } from "../fees";
import { formatDuration, formatMoney, formatStops } from "../format";
import type { ComboResult, DateCombo, Flight, RankedCombo } from "../types";
import { cheapestOf } from "./score";

// ---------- Geração das combinações de datas ----------
// Todas as combinações (ida ± flex) × (volta ± flex) podem ser muitas.
// Prioridade: datas originais, depois deslocamentos "paralelos" (mesma
// duração de viagem), depois as demais por proximidade. O total é limitado
// por `maxCombos` porque cada combinação consome 1 crédito da SerpApi.
export function buildDateCombos(
  outDate: string,
  returnDate: string,
  flex: number,
  maxCombos: number,
): { combos: DateCombo[]; total: number } {
  const today = todayISO();
  const all: DateCombo[] = [];
  for (let dOut = -flex; dOut <= flex; dOut++) {
    for (let dRet = -flex; dRet <= flex; dRet++) {
      const out = addDays(outDate, dOut);
      const ret = addDays(returnDate, dRet);
      if (out < today) continue;
      if (ret <= out) continue;
      all.push({
        out,
        ret,
        outOffset: dOut,
        retOffset: dRet,
        isOriginal: dOut === 0 && dRet === 0,
        nights: diffDays(out, ret),
      });
    }
  }
  const priority = (c: DateCombo) => {
    if (c.isOriginal) return -1;
    const parallel = c.outOffset === c.retOffset ? 0 : 1;
    return parallel * 1000 + Math.abs(c.outOffset) + Math.abs(c.retOffset);
  };
  const sorted = [...all].sort((a, b) => priority(a) - priority(b));
  return { combos: sorted.slice(0, Math.max(1, maxCombos)), total: all.length };
}

// ---------- Análise ----------
function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
}

export function analyzeDates(
  results: ComboResult[],
  opts: {
    currency: string;
    fees: FeeAssumptions;
    adults: number;
    topN?: number;
  },
): {
  baseline: { price: number | null; flight: Flight | null };
  top: RankedCombo[];
  heatOut: { date: string; price: number | null }[];
  heatRet: { date: string; price: number | null }[];
} {
  const { currency, fees, adults } = opts;
  const baselineRes = results.find((r) => r.combo.isOriginal);
  const baselineFlight = baselineRes?.cheapest ?? null;
  const baselinePrice = baselineFlight?.price ?? null;

  const priced = results.filter((r) => r.cheapest && r.cheapest.price !== null);

  // Médias por dia da semana (apenas dados reais desta busca)
  const outByDow = new Map<number, number[]>();
  const retByDow = new Map<number, number[]>();
  for (const r of priced) {
    const p = r.cheapest!.price as number;
    const o = weekdayIndex(r.combo.out);
    const rt = weekdayIndex(r.combo.ret);
    outByDow.set(o, [...(outByDow.get(o) ?? []), p]);
    retByDow.set(rt, [...(retByDow.get(rt) ?? []), p]);
  }
  const overallAvg = avg(priced.map((r) => r.cheapest!.price as number));

  const ranked = [...priced]
    .map((r) => ({
      r,
      total: totalWithFees(r.cheapest!, fees, { adults, roundTrip: true }).finalPrice,
    }))
    .sort((a, b) => a.total - b.total || a.r.cheapest!.durationMin - b.r.cheapest!.durationMin)
    .slice(0, opts.topN ?? 3);

  const top: RankedCombo[] = ranked.map(({ r, total }, i) => {
    const f = r.cheapest!;
    const c = r.combo;
    const baseTotal = baselineFlight
      ? totalWithFees(baselineFlight, fees, { adults, roundTrip: true }).finalPrice
      : null;
    const savingsAbs = baseTotal !== null ? baseTotal - total : null;
    const savingsPct = baseTotal && baseTotal > 0 && savingsAbs !== null ? (savingsAbs / baseTotal) * 100 : null;

    const reasons: string[] = [];
    const drawbacks: string[] = [];

    // Motivos (todos derivados dos dados desta busca)
    if (c.isOriginal) {
      reasons.push("São as datas que você pediu originalmente e já são a opção mais barata encontrada.");
    } else if (savingsAbs !== null && savingsAbs > 0) {
      reasons.push(
        `Preço ${formatMoney(f.price, currency)} contra ${formatMoney(baselinePrice, currency)} nas datas originais.`,
      );
    }
    const outDow = weekdayIndex(c.out);
    const retDow = weekdayIndex(c.ret);
    const outAvg = avg(outByDow.get(outDow) ?? []);
    const retAvg = avg(retByDow.get(retDow) ?? []);
    if (outAvg !== null && overallAvg !== null && outAvg < overallAvg * 0.98 && (outByDow.get(outDow)?.length ?? 0) >= 2) {
      reasons.push(
        `Ida em ${weekdayName(c.out)}: nesta busca, saídas nesse dia custaram em média ${formatMoney(outAvg, currency)}, abaixo da média geral de ${formatMoney(overallAvg, currency)}.`,
      );
    }
    if (retAvg !== null && overallAvg !== null && retAvg < overallAvg * 0.98 && (retByDow.get(retDow)?.length ?? 0) >= 2) {
      reasons.push(
        `Volta em ${weekdayName(c.ret)}: nesta busca, retornos nesse dia custaram em média ${formatMoney(retAvg, currency)}, abaixo da média geral.`,
      );
    }
    if (f.stops === 0) reasons.push("Voo direto.");
    else if (baselineFlight && f.stops < baselineFlight.stops) reasons.push(`Menos escalas que nas datas originais (${formatStops(f.stops)}).`);
    if (f.lowCost) reasons.push(`Companhia de baixo custo (${f.airlines.join(", ")}), que costuma ter tarifa-base menor.`);
    if (reasons.length === 0) reasons.push("Menor tarifa encontrada para essa combinação de datas.");

    // Desvantagens
    if (!c.isOriginal) {
      const shifts: string[] = [];
      if (c.outOffset !== 0) shifts.push(`ida ${Math.abs(c.outOffset)} dia(s) ${c.outOffset > 0 ? "depois" : "antes"}`);
      if (c.retOffset !== 0) shifts.push(`volta ${Math.abs(c.retOffset)} dia(s) ${c.retOffset > 0 ? "depois" : "antes"}`);
      if (shifts.length) drawbacks.push(`Muda as datas: ${shifts.join(" e ")} em relação ao pedido.`);
      if (baselineRes && c.nights !== baselineRes.combo.nights) {
        drawbacks.push(`Estadia de ${c.nights} noites (original: ${baselineRes.combo.nights}).`);
      }
    }
    if (baselineFlight) {
      if (f.stops > baselineFlight.stops) drawbacks.push(`Mais escalas que nas datas originais (${formatStops(f.stops)} contra ${formatStops(baselineFlight.stops)}).`);
      const extra = f.durationMin - baselineFlight.durationMin;
      if (extra >= 60) drawbacks.push(`Viagem ${formatDuration(extra)} mais longa que a das datas originais.`);
    }
    if (f.overnightLayover) drawbacks.push("Inclui conexão com pernoite.");
    if (f.airportChange) drawbacks.push("Exige troca de aeroporto na conexão.");
    if (f.longestLayoverMin >= 300) drawbacks.push(`Conexão longa (${formatDuration(f.longestLayoverMin)}).`);
    if (f.baggage.status !== "incluida") drawbacks.push("Bagagem despachada não confirmada como incluída — confirmar com a companhia.");

    return {
      rank: i + 1,
      combo: c,
      flight: f,
      finalPrice: total,
      savingsAbs,
      savingsPct,
      reasons,
      drawbacks,
    };
  });

  // Faixas de calor: menor preço por data de ida e por data de volta
  const heat = (key: "out" | "ret") => {
    const map = new Map<string, number>();
    for (const r of priced) {
      const d = r.combo[key];
      const p = r.cheapest!.price as number;
      map.set(d, Math.min(map.get(d) ?? Infinity, p));
    }
    const dates = Array.from(new Set(results.map((r) => r.combo[key]))).sort();
    return dates.map((date) => ({ date, price: map.get(date) ?? null }));
  };

  return {
    baseline: { price: baselinePrice, flight: baselineFlight },
    top,
    heatOut: heat("out"),
    heatRet: heat("ret"),
  };
}

export function pickComboResult(combo: DateCombo, flights: Flight[]): ComboResult {
  const sorted = flights
    .filter((f) => f.price !== null)
    .sort((a, b) => (a.price as number) - (b.price as number) || a.durationMin - b.durationMin);
  return {
    combo,
    cheapest: cheapestOf(flights),
    options: sorted.slice(0, 3),
    count: flights.length,
  };
}

export function comboLabel(c: DateCombo): string {
  return `${formatDateShort(c.out)} → ${formatDateShort(c.ret)} (${c.nights} noites)`;
}
