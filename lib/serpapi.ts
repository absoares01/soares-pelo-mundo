import { TTLCache } from "./async";
import { mockFlightOptions } from "./mock";
import { normalizeAll, type RawFlightOption } from "./normalize";
import type { FlightQuery, FlightQueryResult } from "./types";

// Cliente da SerpApi (engine=google_flights). Camada única de dados:
// para trocar de provedor no futuro, basta reimplementar `searchFlights`.
// Documentação: https://serpapi.com/google-flights-api

const ENDPOINT = "https://serpapi.com/search.json";
const cache = new TTLCache<Omit<FlightQueryResult, "fromCache">>(20 * 60 * 1000);

export function hasSerpApiKey(): boolean {
  return Boolean(process.env.SERPAPI_KEY);
}

interface SerpResponse {
  error?: string;
  best_flights?: RawFlightOption[];
  other_flights?: RawFlightOption[];
  price_insights?: {
    lowest_price?: number;
    price_level?: string;
    typical_price_range?: [number, number];
  };
  search_metadata?: { google_flights_url?: string };
}

function cacheKey(q: FlightQuery): string {
  return JSON.stringify([
    q.origin,
    q.destination,
    q.outDate,
    q.returnDate ?? "",
    q.currency,
    q.adults,
    q.stops ?? 0,
    q.maxPrice ?? 0,
    q.travelClass ?? 1,
  ]);
}

async function callSerpApi(q: FlightQuery): Promise<Omit<FlightQueryResult, "fromCache">> {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    return {
      flights: normalizeAll(mockFlightOptions(q), q.currency),
      mock: true,
    };
  }

  const url = new URL(ENDPOINT);
  const p = url.searchParams;
  p.set("engine", "google_flights");
  p.set("api_key", key);
  p.set("departure_id", q.origin);
  p.set("arrival_id", q.destination);
  p.set("outbound_date", q.outDate);
  if (q.returnDate) {
    p.set("type", "1"); // ida e volta
    p.set("return_date", q.returnDate);
  } else {
    p.set("type", "2"); // somente ida
  }
  p.set("currency", q.currency);
  p.set("hl", "pt");
  p.set("gl", "br");
  p.set("adults", String(q.adults));
  if (q.stops) p.set("stops", String(q.stops));
  if (q.maxPrice) p.set("max_price", String(q.maxPrice));
  if (q.travelClass) p.set("travel_class", String(q.travelClass));

  const res = await fetch(url, { cache: "no-store" });
  let body: SerpResponse | undefined;
  try {
    body = (await res.json()) as SerpResponse;
  } catch {
    body = undefined;
  }

  if (!res.ok || body?.error) {
    const msg = body?.error ?? `HTTP ${res.status}`;
    // A SerpApi devolve este erro quando simplesmente não há voos: não é falha.
    if (/hasn't returned any results|no results/i.test(msg)) {
      return { flights: [], mock: false };
    }
    throw new Error(`SerpApi: ${msg}`);
  }

  const flights = normalizeAll([...(body?.best_flights ?? []), ...(body?.other_flights ?? [])], q.currency);
  const pi = body?.price_insights;
  return {
    flights,
    mock: false,
    googleFlightsUrl: body?.search_metadata?.google_flights_url,
    priceInsights: pi
      ? {
          lowest: pi.lowest_price,
          level: pi.price_level,
          typicalLow: pi.typical_price_range?.[0],
          typicalHigh: pi.typical_price_range?.[1],
        }
      : undefined,
  };
}

export async function searchFlights(q: FlightQuery): Promise<FlightQueryResult> {
  const { value, cached } = await cache.wrap(cacheKey(q), () => callSerpApi(q));
  return { ...value, fromCache: cached };
}
