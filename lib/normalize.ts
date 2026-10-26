import { isLowCost } from "./airlines";
import type { BaggageStatus, Flight, Layover, Segment } from "./types";

// Formato bruto devolvido pela SerpApi (engine=google_flights), só os campos usados.
export interface RawAirportPoint {
  name?: string;
  id?: string;
  time?: string;
}
export interface RawSegment {
  departure_airport: RawAirportPoint;
  arrival_airport: RawAirportPoint;
  duration?: number;
  airplane?: string;
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  extensions?: string[];
  overnight?: boolean;
}
export interface RawLayover {
  duration?: number;
  name?: string;
  id?: string;
  overnight?: boolean;
}
export interface RawFlightOption {
  flights: RawSegment[];
  layovers?: RawLayover[];
  total_duration?: number;
  price?: number;
  type?: string;
  airline_logo?: string;
  extensions?: string[];
  departure_token?: string;
  booking_token?: string;
  carbon_emissions?: { this_flight?: number };
}

function baggageFrom(extensions: string[]): { status: BaggageStatus; text: string } {
  const bagLines = extensions.filter((e) => /bag|bagagem|mala/i.test(e));
  if (bagLines.length === 0) {
    return {
      status: "nao_informada",
      text: "Regra de bagagem não informada pela fonte — confirmar com a companhia.",
    };
  }
  const text = bagLines.join(" · ");
  if (/(no|sem|não).{0,20}(checked|despachada)|checked bag.{0,12}(fee|extra|for a fee|cobrad)/i.test(text)) {
    return { status: "nao_incluida", text };
  }
  if (/(checked|despachada).{0,30}(inclu|free|grát)/i.test(text) || /1st checked bag included/i.test(text)) {
    return { status: "incluida", text };
  }
  return { status: "nao_informada", text };
}

export function normalizeFlight(raw: RawFlightOption, currency: string): Flight | null {
  if (!raw.flights || raw.flights.length === 0) return null;

  const segments: Segment[] = raw.flights.map((s) => ({
    airline: s.airline ?? "—",
    flightNumber: s.flight_number ?? "",
    from: s.departure_airport?.id ?? "",
    fromName: s.departure_airport?.name ?? "",
    to: s.arrival_airport?.id ?? "",
    toName: s.arrival_airport?.name ?? "",
    departure: s.departure_airport?.time ?? "",
    arrival: s.arrival_airport?.time ?? "",
    durationMin: s.duration ?? 0,
    airplane: s.airplane,
    overnight: s.overnight,
  }));

  const layovers: Layover[] = (raw.layovers ?? []).map((l) => ({
    airport: l.id ?? "",
    name: l.name ?? "",
    durationMin: l.duration ?? 0,
    overnight: l.overnight,
  }));

  let airportChange = false;
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].to && segments[i + 1].from && segments[i].to !== segments[i + 1].from) {
      airportChange = true;
    }
  }

  const airlines = Array.from(new Set(segments.map((s) => s.airline).filter((a) => a && a !== "—")));
  const durationMin =
    raw.total_duration ??
    segments.reduce((s, x) => s + x.durationMin, 0) + layovers.reduce((s, l) => s + l.durationMin, 0);

  const extensions = [...(raw.extensions ?? []), ...raw.flights.flatMap((s) => s.extensions ?? [])];
  const first = segments[0];
  const last = segments[segments.length - 1];

  return {
    id: segments.map((s) => `${s.flightNumber}@${s.departure}`).join("|"),
    price: typeof raw.price === "number" ? raw.price : null,
    currency,
    airlines,
    airlineLogo: raw.airline_logo ?? raw.flights[0]?.airline_logo,
    durationMin,
    stops: Math.max(0, segments.length - 1),
    segments,
    layovers,
    origin: first.from,
    destination: last.to,
    departure: first.departure,
    arrival: last.arrival,
    extensions,
    airportChange,
    overnightLayover: layovers.some((l) => l.overnight) || segments.some((s) => s.overnight === true),
    longestLayoverMin: layovers.reduce((m, l) => Math.max(m, l.durationMin), 0),
    bookingToken: raw.booking_token,
    departureToken: raw.departure_token,
    carbonKg: raw.carbon_emissions?.this_flight ? Math.round(raw.carbon_emissions.this_flight / 1000) : undefined,
    lowCost: airlines.some(isLowCost),
    baggage: baggageFrom(extensions),
  };
}

export function normalizeAll(raws: RawFlightOption[] | undefined, currency: string): Flight[] {
  const out: Flight[] = [];
  for (const r of raws ?? []) {
    const f = normalizeFlight(r, currency);
    if (f) out.push(f);
  }
  return out;
}
