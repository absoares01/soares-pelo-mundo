import { parseCodes } from "./airports";
import { weekdayIndex } from "./dates";
import type { RawFlightOption, RawSegment } from "./normalize";
import type { FlightQuery } from "./types";

// MODO EXEMPLO: gera voos FICTÍCIOS, determinísticos, no mesmo formato da SerpApi.
// Só é usado quando SERPAPI_KEY não está configurada. A interface sempre exibe
// um aviso de "dados de exemplo" quando estes dados aparecem.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AIRLINES = [
  { name: "LATAM Airlines", code: "LA" },
  { name: "GOL", code: "G3" },
  { name: "Azul", code: "AD" },
  { name: "TAP Air Portugal", code: "TP" },
  { name: "Copa Airlines", code: "CM" },
  { name: "Iberia", code: "IB" },
  { name: "JetSMART", code: "JA" },
  { name: "Air France", code: "AF" },
];
const HUBS = ["PTY", "BOG", "LIM", "MAD", "LIS", "MIA", "SCL", "EZE"];
const DOW_FACTOR = [1.12, 1.0, 0.9, 0.9, 1.0, 1.1, 1.04]; // domingo..sábado

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function addMinutes(dt: string, minutes: number): string {
  const [date, time] = dt.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return fmt(new Date(Date.UTC(y, m - 1, d, hh, mm + minutes)));
}

export function mockFlightOptions(q: FlightQuery): RawFlightOption[] {
  const rng = mulberry32(hashString([q.origin, q.destination, q.outDate, q.returnDate ?? "", q.stops ?? 0].join("|")));
  const origins = parseCodes(q.origin);
  const dests = parseCodes(q.destination);
  const outF = DOW_FACTOR[weekdayIndex(q.outDate)];
  const retF = q.returnDate ? DOW_FACTOR[weekdayIndex(q.returnDate)] : 1;
  const maxStops = q.stops === 1 ? 0 : q.stops === 2 ? 1 : q.stops === 3 ? 2 : 2;

  const options: RawFlightOption[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const o = origins[i % origins.length];
    const d = dests[Math.floor(i / origins.length) % dests.length] ?? dests[0];
    const stops = Math.min(maxStops, Math.floor(rng() * 3));
    const airline = AIRLINES[Math.floor(rng() * AIRLINES.length)];
    const hubPool = HUBS.filter((h) => h !== o && h !== d);

    const depHour = 5 + Math.floor(rng() * 18);
    const depMin = Math.floor(rng() * 4) * 15;
    let cursor = `${q.outDate} ${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}`;

    const points = [o];
    for (let s = 0; s < stops; s++) points.push(hubPool[Math.floor(rng() * hubPool.length)]);
    points.push(d);

    const segments: RawSegment[] = [];
    const layovers: { duration: number; name: string; id: string; overnight?: boolean }[] = [];
    let total = 0;
    for (let s = 0; s < points.length - 1; s++) {
      const dur = 120 + Math.floor(rng() * 420);
      const dep = cursor;
      const arr = addMinutes(dep, dur);
      segments.push({
        departure_airport: { id: points[s], name: `Aeroporto ${points[s]} (exemplo)`, time: dep },
        arrival_airport: { id: points[s + 1], name: `Aeroporto ${points[s + 1]} (exemplo)`, time: arr },
        duration: dur,
        airline: airline.name,
        flight_number: `${airline.code} ${100 + Math.floor(rng() * 8900)}`,
        airplane: "Exemplo",
      });
      total += dur;
      cursor = arr;
      if (s < points.length - 2) {
        const lay = 75 + Math.floor(rng() * 520);
        layovers.push({
          duration: lay,
          id: points[s + 1],
          name: `Aeroporto ${points[s + 1]} (exemplo)`,
          overnight: lay > 480,
        });
        total += lay;
        cursor = addMinutes(arr, lay);
      }
    }

    const base = 1100 + rng() * 2200;
    let price = base * outF * retF * (1 - 0.12 * stops);
    if (airline.code === "JA") price *= 0.82;
    if (i >= origins.length) price *= 0.93; // aeroportos alternativos tendem a variar
    price = Math.round(price * Math.max(1, q.adults));
    if (q.maxPrice && price > q.maxPrice) continue;

    options.push({
      flights: segments,
      layovers,
      total_duration: total,
      price,
      airline_logo: "",
      extensions:
        airline.code === "JA"
          ? ["Bagagem despachada cobrada à parte (exemplo)"]
          : ["Bagagem despachada não informada (exemplo)"],
    });
  }
  return options;
}
