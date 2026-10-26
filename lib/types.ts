// Tipos compartilhados entre a camada de dados, as análises e a interface.

export interface Segment {
  airline: string;
  flightNumber: string;
  from: string; // código IATA
  fromName: string;
  to: string;
  toName: string;
  departure: string; // "YYYY-MM-DD HH:mm" (horário local do aeroporto)
  arrival: string;
  durationMin: number;
  airplane?: string;
  overnight?: boolean;
}

export interface Layover {
  airport: string; // código IATA
  name: string;
  durationMin: number;
  overnight?: boolean;
}

export type BaggageStatus = "incluida" | "nao_incluida" | "nao_informada";

export interface Flight {
  id: string;
  price: number | null;
  currency: string;
  airlines: string[];
  airlineLogo?: string;
  durationMin: number;
  stops: number;
  segments: Segment[];
  layovers: Layover[];
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  extensions: string[];
  airportChange: boolean;
  overnightLayover: boolean;
  longestLayoverMin: number;
  bookingToken?: string;
  departureToken?: string;
  carbonKg?: number;
  lowCost: boolean;
  baggage: { status: BaggageStatus; text: string };
}

export interface SearchMeta {
  mock: boolean; // true = dados de exemplo (sem chave da SerpApi)
  searchedAt: string; // ISO
  currency: string;
  creditsUsed: number; // chamadas reais à SerpApi (0 em modo exemplo ou cache)
  warnings: string[];
  googleFlightsUrl?: string;
}

export interface FlightQuery {
  origin: string; // um ou mais códigos IATA separados por vírgula
  destination: string;
  outDate: string; // YYYY-MM-DD
  returnDate?: string;
  currency: string;
  adults: number;
  stops?: 0 | 1 | 2 | 3; // 0 = qualquer, 1 = direto, 2 = até 1 escala, 3 = até 2 escalas
  maxPrice?: number;
  travelClass?: 1 | 2 | 3 | 4;
}

export interface FlightQueryResult {
  flights: Flight[];
  priceInsights?: {
    lowest?: number;
    level?: string;
    typicalLow?: number;
    typicalHigh?: number;
  };
  googleFlightsUrl?: string;
  mock: boolean;
  fromCache: boolean;
}

// ---------- Módulo 1 ----------
export interface DateCombo {
  out: string;
  ret: string;
  outOffset: number;
  retOffset: number;
  isOriginal: boolean;
  nights: number;
}

export interface ComboResult {
  combo: DateCombo;
  cheapest: Flight | null;
  options: Flight[]; // até 3 mais baratas
  count: number;
}

export interface RankedCombo {
  rank: number;
  combo: DateCombo;
  flight: Flight;
  finalPrice: number; // preço + taxas estimadas informadas pelo usuário
  savingsAbs: number | null; // vs. datas originais
  savingsPct: number | null;
  reasons: string[];
  drawbacks: string[];
}

export interface DatesResult {
  meta: SearchMeta;
  query: {
    origin: string;
    destination: string;
    outDate: string;
    returnDate: string;
    flexDays: number;
    adults: number;
  };
  searchedCombos: number;
  totalCombos: number;
  baseline: { price: number | null; flight: Flight | null };
  top: RankedCombo[];
  heatOut: { date: string; price: number | null }[];
  heatRet: { date: string; price: number | null }[];
  priceInsights?: FlightQueryResult["priceInsights"];
}

// ---------- Módulo 2 ----------
export interface AlternativeOption {
  flight: Flight;
  finalPrice: number;
  estimatedFees: { label: string; amount: number }[];
  convenience: number; // 0-100
  convenienceNotes: string[];
  altOrigin: boolean;
  altDestination: boolean;
  tags: string[];
}

export interface AlternativesResult {
  meta: SearchMeta;
  query: {
    origin: string;
    destination: string;
    outDate: string;
    returnDate?: string;
    adults: number;
    originCluster: string[];
    destinationCluster: string[];
  };
  options: AlternativeOption[];
  baselineCheapest: number | null;
}

// ---------- Módulo 3 ----------
export interface RouteOption {
  rank: number;
  flight: Flight;
  savingsVsFastest: number | null;
  savingsPct: number | null;
  extraMinutes: number | null;
  savingsPerExtraHour: number | null;
  tradeoff: string;
  warnings: string[];
}

export interface RoutesResult {
  meta: SearchMeta;
  query: {
    origin: string;
    destination: string;
    outDate: string;
    returnDate?: string;
    adults: number;
    maxPrice: number;
    maxLayoverHours: number;
  };
  options: RouteOption[];
  reference: { fastest: Flight | null; cheapestAny: Flight | null };
  discarded: { overPrice: number; longLayover: number; airportChange: number; direct: number };
}

// ---------- Propostas ----------
export interface ProposalItem {
  id: string;
  label: string;
  flight: Flight;
  context: {
    origin: string;
    destination: string;
    outDate: string;
    returnDate?: string;
    adults: number;
  };
  searchedAt: string;
  mock: boolean;
}
