import { TTLCache } from "./async";
import { mockFlightOptions } from "./mock";
import { toTextArray } from "./analysis/booking";
import { normalizeAll, type RawFlightOption } from "./normalize";
import type { BookingOption, FlightQuery, FlightQueryResult } from "./types";

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
    q.mockVia ?? "",
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

// ---------- Opções de reserva (bagagem e preço por vendedor) ----------
// ATENÇÃO: os nomes dos campos de "booking_options" foram escritos a partir da
// documentação pública e ainda NÃO foram testados com uma chave real. Tudo é lido de
// forma defensiva: se um campo não existir, o dado aparece como "não informado".

interface RawBooking {
  together?: RawBookingEntry;
  separate_tickets?: boolean;
}
interface RawBookingEntry {
  book_with?: string;
  marketed_as?: unknown;
  price?: number;
  baggage_prices?: unknown;
  extensions?: unknown;
}
interface BookingResponse {
  error?: string;
  best_flights?: RawFlightOption[];
  other_flights?: RawFlightOption[];
  booking_options?: (RawBooking & RawBookingEntry)[];
  baggage_prices?: unknown;
}

async function serpGet(params: Record<string, string>): Promise<BookingResponse> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error("SERPAPI_KEY não configurada.");
  const url = new URL(ENDPOINT);
  const p = url.searchParams;
  p.set("engine", "google_flights");
  p.set("api_key", key);
  p.set("hl", "pt");
  p.set("gl", "br");
  for (const [k, v] of Object.entries(params)) p.set(k, v);
  const res = await fetch(url, { cache: "no-store" });
  let body: BookingResponse | undefined;
  try {
    body = (await res.json()) as BookingResponse;
  } catch {
    body = undefined;
  }
  if (!res.ok || body?.error) throw new Error(`SerpApi: ${body?.error ?? `HTTP ${res.status}`}`);
  return body ?? {};
}

export interface BookingLookup {
  options: BookingOption[];
  baggage: string[]; // textos de bagagem da fonte, sem interpretação
  credits: number;
  note?: string;
}

export async function fetchBookingOptions(input: {
  origin: string;
  destination: string;
  outDate: string;
  returnDate?: string;
  currency: string;
  adults: number;
  travelClass?: number;
  bookingToken?: string;
  departureToken?: string;
}): Promise<BookingLookup> {
  const base: Record<string, string> = {
    departure_id: input.origin,
    arrival_id: input.destination,
    outbound_date: input.outDate,
    type: input.returnDate ? "1" : "2",
    currency: input.currency,
    adults: String(input.adults),
  };
  if (input.returnDate) base.return_date = input.returnDate;
  if (input.travelClass) base.travel_class = String(input.travelClass);

  let credits = 0;
  let token = input.bookingToken;
  let note: string | undefined;

  // Ida e volta: o token da ida leva à lista de voltas; usamos a primeira opção, o que
  // basta para ler a política de bagagem da companhia (não para fixar a volta exata).
  if (!token && input.departureToken) {
    const step = await serpGet({ ...base, departure_token: input.departureToken });
    credits++;
    const first = [...(step.best_flights ?? []), ...(step.other_flights ?? [])].find((f) => f.booking_token);
    token = first?.booking_token;
    note = "Em ida e volta, a leitura usa a primeira opção de volta; a política de bagagem costuma ser a mesma da companhia.";
  }
  if (!token) {
    return { options: [], baggage: [], credits, note: "Esta opção não traz o código de reserva (booking_token); digite as taxas manualmente." };
  }

  const body = await serpGet({ ...base, booking_token: token });
  credits++;

  const options: BookingOption[] = [];
  for (const raw of body.booking_options ?? []) {
    const e: RawBookingEntry = raw.together ?? raw;
    const bagTexts = [
      ...toTextArray(e.baggage_prices),
      ...toTextArray(e.extensions).filter((t) => /bag|bagagem|mala|carry/i.test(t)),
    ];
    options.push({
      bookWith: typeof e.book_with === "string" ? e.book_with : "",
      isAirline: false,
      price: typeof e.price === "number" ? e.price : null,
      marketedAs: toTextArray(e.marketed_as),
      baggage: bagTexts,
    });
  }
  return { options, baggage: toTextArray(body.baggage_prices), credits, note };
}
