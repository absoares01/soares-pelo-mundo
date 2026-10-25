import { TRANSIT_VISA_WATCH } from "../airports";
import { formatDuration, formatMoney } from "../format";
import type { Flight, RouteOption, RoutesResult } from "../types";
import { cheapestOf, fastestOf } from "./score";

export function analyzeRoutes(
  flights: Flight[],
  opts: { maxPrice: number; maxLayoverHours: number; currency: string; limit?: number },
): { options: RouteOption[]; reference: RoutesResult["reference"]; discarded: RoutesResult["discarded"] } {
  const priced = flights.filter((f) => f.price !== null);
  const fastest = fastestOf(priced);
  const cheapestAny = cheapestOf(priced);
  const maxLayMin = opts.maxLayoverHours * 60;

  const discarded = { overPrice: 0, longLayover: 0, airportChange: 0, direct: 0 };
  const eligible: Flight[] = [];
  for (const f of priced) {
    if (f.stops === 0) {
      discarded.direct++;
      continue;
    }
    if (f.stops > 2) continue;
    if ((f.price as number) > opts.maxPrice) {
      discarded.overPrice++;
      continue;
    }
    if (f.longestLayoverMin > maxLayMin) {
      discarded.longLayover++;
      continue;
    }
    if (f.airportChange) {
      discarded.airportChange++;
      continue;
    }
    eligible.push(f);
  }

  eligible.sort((a, b) => (a.price as number) - (b.price as number) || a.durationMin - b.durationMin);
  const top = eligible.slice(0, opts.limit ?? 5);

  const options: RouteOption[] = top.map((f, i) => {
    const price = f.price as number;
    const refPrice = fastest?.price ?? null;
    const savings = refPrice !== null ? refPrice - price : null;
    const savingsPct = refPrice && refPrice > 0 && savings !== null ? (savings / refPrice) * 100 : null;
    const extra = fastest ? f.durationMin - fastest.durationMin : null;
    const perHour = savings !== null && extra !== null && extra > 0 ? savings / (extra / 60) : null;

    let tradeoff: string;
    if (!fastest || savings === null || extra === null) {
      tradeoff = "Sem opção de referência para comparar.";
    } else if (f.id === fastest.id) {
      tradeoff = "É também a opção mais rápida encontrada.";
    } else if (savings > 0 && extra > 0) {
      tradeoff = `Economiza ${formatMoney(savings, opts.currency)} (${Math.round(savingsPct ?? 0)}%) em relação à opção mais rápida, mas leva ${formatDuration(extra)} a mais${perHour ? ` — cerca de ${formatMoney(perHour, opts.currency)} economizados por hora extra` : ""}.`;
    } else if (savings > 0 && extra <= 0) {
      tradeoff = `Economiza ${formatMoney(savings, opts.currency)} sem levar mais tempo que a opção mais rápida de referência.`;
    } else if (savings <= 0 && extra < 0) {
      tradeoff = `É ${formatDuration(Math.abs(extra))} mais rápida que a referência, por ${formatMoney(Math.abs(savings), opts.currency)} a mais.`;
    } else {
      tradeoff = "Sem vantagem clara de preço ou tempo sobre a referência.";
    }

    const warnings: string[] = [];
    const watch = f.layovers.filter((l) => TRANSIT_VISA_WATCH.has(l.airport)).map((l) => l.airport);
    if (watch.length) {
      warnings.push(
        `Conexão em ${watch.join(", ")}: verifique se a nacionalidade do passageiro exige visto ou autorização de trânsito.`,
      );
    }
    if (f.overnightLayover) warnings.push("Conexão com pernoite: pode exigir hotel e, em alguns países, imigração.");
    if (f.layovers.some((l) => l.durationMin < 90)) warnings.push("Conexão curta (menos de 1h30): risco de perder o voo seguinte.");
    if (f.baggage.status !== "incluida") warnings.push("Bagagem não confirmada como incluída. Em conexões com companhias diferentes, a bagagem pode não ser despachada até o destino final.");
    if (new Set(f.airlines).size > 1) warnings.push("Companhias diferentes no mesmo itinerário: confirme se é um único bilhete.");

    return {
      rank: i + 1,
      flight: f,
      savingsVsFastest: savings,
      savingsPct,
      extraMinutes: extra,
      savingsPerExtraHour: perHour,
      tradeoff,
      warnings,
    };
  });

  return { options, reference: { fastest, cheapestAny }, discarded };
}
