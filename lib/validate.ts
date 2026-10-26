import { isValidCodeList, parseCodes } from "./airports";
import { addDays, isValidISODate, todayISO } from "./dates";
import { parseFees, type FeeAssumptions } from "./fees";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
type Raw = Record<string, unknown>;

export interface CommonInput {
  origin: string[]; // códigos IATA
  destination: string[];
  outDate: string;
  returnDate?: string;
  adults: number;
  currency: string;
  fees: FeeAssumptions;
  includeNearby: boolean;
  extraOrigins: string[];
  extraDestinations: string[];
  travelClass: 1 | 2 | 3 | 4;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function int(v: unknown, def: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function codesOrEmpty(v: unknown): string[] {
  const s = str(v);
  if (!s) return [];
  return isValidCodeList(s) ? parseCodes(s) : [];
}

export function parseCommon(body: Raw, opts: { requireReturn: boolean }): Result<CommonInput> {
  const origin = str(body.origin);
  const destination = str(body.destination);
  if (!isValidCodeList(origin)) return { ok: false, error: "Origem inválida. Use códigos IATA de 3 letras (ex.: GRU)." };
  if (!isValidCodeList(destination)) return { ok: false, error: "Destino inválido. Use códigos IATA de 3 letras (ex.: LIS)." };

  const outDate = str(body.outDate);
  if (!isValidISODate(outDate)) return { ok: false, error: "Data de ida inválida." };
  if (outDate < todayISO()) return { ok: false, error: "A data de ida não pode estar no passado." };

  const returnRaw = str(body.returnDate);
  let returnDate: string | undefined;
  if (returnRaw) {
    if (!isValidISODate(returnRaw)) return { ok: false, error: "Data de volta inválida." };
    if (returnRaw <= outDate) return { ok: false, error: "A volta deve ser depois da ida." };
    returnDate = returnRaw;
  } else if (opts.requireReturn) {
    return { ok: false, error: "Informe a data de volta." };
  }

  const currency = (str(body.currency) || "BRL").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Moeda inválida." };

  const cls = int(body.travelClass, 1, 1, 4) as 1 | 2 | 3 | 4;

  return {
    ok: true,
    value: {
      origin: parseCodes(origin),
      destination: parseCodes(destination),
      outDate,
      returnDate,
      adults: int(body.adults, 1, 1, 9),
      currency,
      fees: parseFees(body.fees as Raw | undefined),
      includeNearby: body.includeNearby !== false,
      extraOrigins: codesOrEmpty(body.extraOrigins),
      extraDestinations: codesOrEmpty(body.extraDestinations),
      travelClass: cls,
    },
  };
}

export interface DatesInput extends CommonInput {
  returnDate: string;
  flexDays: number;
  maxCombos: number;
}

export function parseDates(body: Raw): Result<DatesInput> {
  const c = parseCommon(body, { requireReturn: true });
  if (!c.ok) return c;
  const envMax = Number(process.env.MAX_DATE_COMBOS);
  const hardMax = Number.isFinite(envMax) && envMax > 0 ? envMax : 25;
  const flexDays = int(body.flexDays, 3, 0, 7);
  const maxCombos = int(body.maxCombos, 9, 1, hardMax);
  return {
    ok: true,
    value: { ...c.value, returnDate: c.value.returnDate as string, flexDays, maxCombos },
  };
}

export interface AlternativesInput extends CommonInput {
  sort: "price" | "duration" | "convenience";
}

export function parseAlternatives(body: Raw): Result<AlternativesInput> {
  const c = parseCommon(body, { requireReturn: false });
  if (!c.ok) return c;
  const s = str(body.sort);
  const sort = s === "duration" || s === "convenience" ? s : "price";
  return { ok: true, value: { ...c.value, sort } };
}

export interface RoutesInput extends CommonInput {
  maxPrice: number;
  maxLayoverHours: number;
}

export function parseRoutes(body: Raw): Result<RoutesInput> {
  const c = parseCommon(body, { requireReturn: false });
  if (!c.ok) return c;
  const maxPrice = Number(body.maxPrice);
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) return { ok: false, error: "Informe o valor máximo desejado." };
  const maxLayoverHours = int(body.maxLayoverHours, 6, 1, 24);
  return { ok: true, value: { ...c.value, maxPrice, maxLayoverHours } };
}

export { addDays };
