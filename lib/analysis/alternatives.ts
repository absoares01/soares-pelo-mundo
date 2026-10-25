import type { FeeAssumptions } from "../fees";
import { totalWithFees } from "../fees";
import type { AlternativeOption, Flight } from "../types";
import { cheapestOf, convenienceScore } from "./score";

export type SortKey = "price" | "duration" | "convenience";

// Junta resultados de várias consultas, removendo duplicatas (mesmos voos/horários).
export function mergeUnique(lists: Flight[][]): Flight[] {
  const seen = new Map<string, Flight>();
  for (const list of lists) {
    for (const f of list) {
      if (f.price === null) continue;
      const prev = seen.get(f.id);
      if (!prev || (prev.price as number) > (f.price as number)) seen.set(f.id, f);
    }
  }
  return Array.from(seen.values());
}

export function buildAlternatives(
  flights: Flight[],
  opts: {
    requestedOrigins: string[];
    requestedDestinations: string[];
    fees: FeeAssumptions;
    adults: number;
    roundTrip: boolean;
    sort: SortKey;
    limit?: number;
  },
): { options: AlternativeOption[]; baselineCheapest: number | null } {
  const mainFlights = flights.filter(
    (f) => opts.requestedOrigins.includes(f.origin) && opts.requestedDestinations.includes(f.destination),
  );
  const baselineCheapest = cheapestOf(mainFlights)?.price ?? null;

  const options: AlternativeOption[] = flights.map((f) => {
    const { finalPrice, items } = totalWithFees(f, opts.fees, { adults: opts.adults, roundTrip: opts.roundTrip });
    const conv = convenienceScore(f);
    const altOrigin = !opts.requestedOrigins.includes(f.origin);
    const altDestination = !opts.requestedDestinations.includes(f.destination);
    const tags: string[] = [];
    if (altOrigin) tags.push(`Sai de ${f.origin} (aeroporto alternativo)`);
    if (altDestination) tags.push(`Chega em ${f.destination} (aeroporto alternativo)`);
    if (f.lowCost) tags.push("Baixo custo");
    if (f.stops === 0) tags.push("Direto");
    if (f.baggage.status !== "incluida") tags.push("Conferir bagagem");
    return {
      flight: f,
      finalPrice,
      estimatedFees: items,
      convenience: conv.score,
      convenienceNotes: conv.notes,
      altOrigin,
      altDestination,
      tags,
    };
  });

  const sorters: Record<SortKey, (a: AlternativeOption, b: AlternativeOption) => number> = {
    price: (a, b) => a.finalPrice - b.finalPrice || a.flight.durationMin - b.flight.durationMin,
    duration: (a, b) => a.flight.durationMin - b.flight.durationMin || a.finalPrice - b.finalPrice,
    convenience: (a, b) => b.convenience - a.convenience || a.finalPrice - b.finalPrice,
  };
  options.sort(sorters[opts.sort]);
  return { options: options.slice(0, opts.limit ?? 30), baselineCheapest };
}
