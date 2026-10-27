import { formatMoney } from "./format";
import type { FareOption, ProposalItem } from "./types";

// Converte uma opção da cesta/proposta em uma "tarifa" analisável (módulos 5 e 6).
export function fareFromItem(item: ProposalItem): FareOption {
  const f = item.flight;
  const layovers = f.layovers.map((l) => l.durationMin);
  return {
    id: item.id,
    label: `${f.airlines.join(" + ") || "Companhia"} · ${f.origin}→${f.destination} · ${formatMoney(f.price, f.currency)}`,
    airline: f.airlines[0] ?? "",
    price: f.price ?? 0,
    currency: f.currency,
    adults: item.context.adults,
    roundTrip: Boolean(item.context.returnDate),
    stops: f.stops,
    shortestLayoverMin: layovers.length ? Math.min(...layovers) : null,
    multiCarrier: new Set(f.airlines).size > 1,
    baggageIncluded: f.baggage.status === "incluida" ? true : f.baggage.status === "nao_incluida" ? false : null,
    fromCart: true,
    bookingToken: f.bookingToken,
    departureToken: f.departureToken,
    context: {
      origin: item.context.origin,
      destination: item.context.destination,
      outDate: item.context.outDate,
      returnDate: item.context.returnDate,
    },
  };
}

let manualCounter = 0;
export function manualFare(input: {
  airline: string;
  price: number;
  currency: string;
  adults: number;
  roundTrip: boolean;
  stops: number;
}): FareOption {
  manualCounter++;
  return {
    id: `manual-${Date.now()}-${manualCounter}`,
    label: `${input.airline || "Tarifa"} (manual) · ${formatMoney(input.price, input.currency)}`,
    airline: input.airline,
    price: input.price,
    currency: input.currency,
    adults: input.adults,
    roundTrip: input.roundTrip,
    stops: input.stops,
    shortestLayoverMin: null,
    multiCarrier: false,
    baggageIncluded: null,
    fromCart: false,
  };
}
