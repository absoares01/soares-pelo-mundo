import { buildAlternatives, mergeUnique } from "./analysis/alternatives";
import { analyzeDates, buildDateCombos, pickComboResult } from "./analysis/dates";
import { analyzeRoutes } from "./analysis/routes";
import { mapLimit } from "./async";
import { nearbyAirports } from "./airports";
import { searchFlights } from "./serpapi";
import type {
  AlternativesResult,
  DatesResult,
  Flight,
  FlightQuery,
  FlightQueryResult,
  RoutesResult,
  SearchMeta,
} from "./types";
import type { AlternativesInput, DatesInput, RoutesInput } from "./validate";

// Orquestra várias consultas à SerpApi e entrega os resultados já analisados.

interface Tracker {
  mock: boolean;
  credits: number;
  warnings: string[];
  url?: string;
  insights?: FlightQueryResult["priceInsights"];
}

function newTracker(): Tracker {
  return { mock: false, credits: 0, warnings: [] };
}

async function run(t: Tracker, q: FlightQuery): Promise<Flight[]> {
  try {
    const r = await searchFlights(q);
    if (r.mock) t.mock = true;
    else if (!r.fromCache) t.credits++;
    if (!t.url && r.googleFlightsUrl) t.url = r.googleFlightsUrl;
    if (!t.insights && r.priceInsights) t.insights = r.priceInsights;
    return r.flights;
  } catch (e) {
    t.warnings.push(e instanceof Error ? e.message : "Falha em uma das consultas.");
    return [];
  }
}

function meta(t: Tracker, currency: string): SearchMeta {
  const warnings = Array.from(new Set(t.warnings));
  if (t.mock) {
    warnings.unshift(
      "DADOS DE EXEMPLO: a chave SERPAPI_KEY não está configurada, então estes voos e preços são fictícios.",
    );
  }
  return {
    mock: t.mock,
    searchedAt: new Date().toISOString(),
    currency,
    creditsUsed: t.credits,
    warnings,
    googleFlightsUrl: t.url,
  };
}

const join = (codes: string[]) => codes.join(",");

// ---------------- Módulo 1 ----------------
export async function runDatesSearch(input: DatesInput): Promise<DatesResult> {
  const t = newTracker();
  const { combos, total } = buildDateCombos(input.outDate, input.returnDate, input.flexDays, input.maxCombos);
  if (combos.length === 0) {
    throw new Error("Nenhuma combinação de datas válida nessa janela (datas no passado ou volta antes da ida).");
  }

  const results = await mapLimit(combos, 4, async (combo) => {
    const flights = await run(t, {
      origin: join(input.origin),
      destination: join(input.destination),
      outDate: combo.out,
      returnDate: combo.ret,
      currency: input.currency,
      adults: input.adults,
      travelClass: input.travelClass,
    });
    return pickComboResult(combo, flights);
  });

  const analysis = analyzeDates(results, {
    currency: input.currency,
    fees: input.fees,
    adults: input.adults,
    topN: 3,
  });

  const m = meta(t, input.currency);
  if (total > combos.length) {
    m.warnings.push(
      `Foram pesquisadas ${combos.length} de ${total} combinações possíveis (limite para economizar créditos da SerpApi). Aumente o limite para cobrir mais datas.`,
    );
  }
  if (!analysis.baseline.flight) {
    m.warnings.push("Não foram encontrados voos nas datas originais, então a economia não pôde ser calculada.");
  }

  return {
    meta: m,
    query: {
      origin: join(input.origin),
      destination: join(input.destination),
      outDate: input.outDate,
      returnDate: input.returnDate,
      flexDays: input.flexDays,
      adults: input.adults,
    },
    searchedCombos: combos.length,
    totalCombos: total,
    baseline: analysis.baseline,
    top: analysis.top,
    heatOut: analysis.heatOut,
    heatRet: analysis.heatRet,
    priceInsights: t.insights,
  };
}

// ---------------- Módulo 2 ----------------
function clusterOf(codes: string[], extra: string[], includeNearby: boolean): string[] {
  const set = new Set<string>(codes);
  if (includeNearby) for (const c of codes) for (const n of nearbyAirports(c)) set.add(n);
  for (const e of extra) set.add(e);
  return Array.from(set);
}

function uniqueQueries(qs: { o: string[]; d: string[]; stops?: 0 | 1 | 2 | 3 }[]) {
  const seen = new Set<string>();
  return qs.filter((q) => {
    const k = `${q.o.join(",")}>${q.d.join(",")}#${q.stops ?? 0}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function runAlternativesSearch(input: AlternativesInput): Promise<AlternativesResult> {
  const t = newTracker();
  const oc = clusterOf(input.origin, input.extraOrigins, input.includeNearby);
  const dc = clusterOf(input.destination, input.extraDestinations, input.includeNearby);

  const queries = uniqueQueries([
    { o: input.origin, d: input.destination },
    { o: oc, d: input.destination },
    { o: input.origin, d: dc },
    { o: oc, d: dc },
  ]);

  const lists = await mapLimit(queries, 4, (q) =>
    run(t, {
      origin: join(q.o),
      destination: join(q.d),
      outDate: input.outDate,
      returnDate: input.returnDate,
      currency: input.currency,
      adults: input.adults,
      travelClass: input.travelClass,
    }),
  );

  const merged = mergeUnique(lists);
  const { options, baselineCheapest } = buildAlternatives(merged, {
    requestedOrigins: input.origin,
    requestedDestinations: input.destination,
    fees: input.fees,
    adults: input.adults,
    roundTrip: Boolean(input.returnDate),
    sort: input.sort,
  });

  const m = meta(t, input.currency);
  if (!input.fees.needsCheckedBag && !input.fees.needsSeat) {
    m.warnings.push(
      "Nenhuma taxa estimada foi somada. Marque bagagem/assento e informe valores estimados para ver o custo final esperado.",
    );
  }

  return {
    meta: m,
    query: {
      origin: join(input.origin),
      destination: join(input.destination),
      outDate: input.outDate,
      returnDate: input.returnDate,
      adults: input.adults,
      originCluster: oc,
      destinationCluster: dc,
    },
    options,
    baselineCheapest,
  };
}

// ---------------- Módulo 3 ----------------
export async function runRoutesSearch(input: RoutesInput): Promise<RoutesResult> {
  const t = newTracker();
  const oc = clusterOf(input.origin, input.extraOrigins, input.includeNearby);
  const dc = clusterOf(input.destination, input.extraDestinations, input.includeNearby);

  const queries = uniqueQueries([
    { o: oc, d: dc, stops: 3 }, // até 2 escalas
    { o: oc, d: dc, stops: 2 }, // até 1 escala
    { o: input.origin, d: input.destination, stops: 3 },
  ]);

  const lists = await mapLimit(queries, 3, (q) =>
    run(t, {
      origin: join(q.o),
      destination: join(q.d),
      outDate: input.outDate,
      returnDate: input.returnDate,
      currency: input.currency,
      adults: input.adults,
      stops: q.stops,
      travelClass: input.travelClass,
    }),
  );

  const merged = mergeUnique(lists);
  const analysis = analyzeRoutes(merged, {
    maxPrice: input.maxPrice,
    maxLayoverHours: input.maxLayoverHours,
    currency: input.currency,
  });

  const m = meta(t, input.currency);
  if (analysis.options.length === 0) {
    m.warnings.push(
      "Nenhuma rota com 1 ou 2 escalas atendeu ao valor máximo e ao limite de conexão informados. Tente aumentar o valor ou o tempo de conexão.",
    );
  }

  return {
    meta: m,
    query: {
      origin: join(input.origin),
      destination: join(input.destination),
      outDate: input.outDate,
      returnDate: input.returnDate,
      adults: input.adults,
      maxPrice: input.maxPrice,
      maxLayoverHours: input.maxLayoverHours,
    },
    options: analysis.options,
    reference: analysis.reference,
    discarded: analysis.discarded,
  };
}
