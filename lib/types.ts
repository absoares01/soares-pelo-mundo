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
  aiSearches?: number; // buscas na web feitas pela IA (módulos 4 a 6)
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
  mockVia?: string; // só no modo exemplo: força uma conexão neste aeroporto (módulo 7)
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

// ---------- Origem dos dados dos módulos 4 a 6 ----------
export interface Source {
  url: string;
  title: string;
}

// ---------- Módulo 4: descontos ----------
export type OfferKind =
  | "cupom"
  | "promocao_relampago"
  | "estudante"
  | "app"
  | "fidelidade"
  | "cartao"
  | "newsletter"
  | "regional"
  | "outro";

export type SourceKind = "oficial" | "parceiro" | "terceiro";

export interface DiscountOffer {
  title: string;
  kind: OfferKind;
  code: string | null;
  sourceUrl: string;
  sourceTitle: string;
  sourceKind: SourceKind;
  requirements: string;
  restrictions: string;
  validUntil: string | null; // YYYY-MM-DD; null = a fonte não informa validade
  evidence: string; // trecho da fonte que sustenta a oferta
}

export interface DiscountsResult {
  meta: SearchMeta;
  query: { target: string; route?: string; travelDate?: string };
  offers: DiscountOffer[];
  discarded: { expired: number; noSource: number; unretrievedUrl: number; thirdParty: number; invalid: number };
  notes: string[];
}

// ---------- Módulos 5 e 6: tarifas ----------
// Uma opção de tarifa para analisar (vinda da proposta/cesta ou digitada à mão).
export interface FareOption {
  id: string;
  label: string;
  airline: string;
  price: number; // total da tarifa para todos os passageiros, como informado pela fonte
  currency: string;
  adults: number;
  roundTrip: boolean;
  stops: number;
  shortestLayoverMin: number | null;
  multiCarrier: boolean;
  baggageIncluded: boolean | null; // null = não informado pela fonte
  fromCart: boolean;
  bookingToken?: string;
  departureToken?: string;
  context?: { origin: string; destination: string; outDate: string; returnDate?: string };
}

export type FeeKey =
  | "bagagem_despachada"
  | "bagagem_de_mao"
  | "assento"
  | "forma_pagamento"
  | "embarque_prioritario"
  | "refeicao"
  | "checkin_aeroporto"
  | "alteracoes"
  | "outros";

export type FeeStatus = "incluido" | "opcional" | "inevitavel" | "nao_informado";
export type FeeBasis = "por_trecho" | "por_viagem"; // valor por passageiro e trecho, ou por passageiro na viagem toda
export type DataOrigin = "serpapi" | "ia" | "manual";

export interface FeeLine {
  key: FeeKey;
  label: string;
  status: FeeStatus;
  amount: number | null; // por passageiro, conforme `basis`
  basis: FeeBasis;
  origin: DataOrigin;
  source?: Source;
  note?: string;
}

export interface BookingOption {
  bookWith: string;
  isAirline: boolean;
  price: number | null;
  marketedAs: string[];
  baggage: string[]; // textos da fonte, sem interpretação
}

export interface FareRules {
  changeAllowed: "sim" | "nao" | "nao_informado";
  changeFee: number | null; // por passageiro
  refundable: "sim" | "parcial" | "nao" | "nao_informado";
  refundPct: number | null; // % da tarifa devolvida ao cancelar (0 a 100)
  cancelFee: number | null; // por passageiro, descontada do reembolso
  noShowRule: string;
  creditValidityMonths: number | null;
  baggageOnlineFee: number | null; // 1ª bagagem despachada comprada antes, por trecho e passageiro
  baggageAirportFee: number | null; // 1ª bagagem despachada comprada no aeroporto
  restrictions: string[]; // condições restritivas / letra miúda
  sources: Source[];
  origin: DataOrigin;
}

export interface RiskScenario {
  key: "cancelar" | "mudar_datas" | "perder_conexao" | "bagagem_depois";
  label: string;
  loss: number | null; // null = não calculável com os dados informados
  detail: string;
}

export interface RiskAnalysis {
  fare: FareOption;
  rules: FareRules;
  scenarios: RiskScenario[];
  worstKnownLoss: number | null;
  complete: boolean; // todos os cenários monetários calculados
  expectedCost: number | null; // preço + chance × pior perda (só se completo)
  restrictions: string[];
}

// ---------- Módulo 7: hidden-city ----------
export interface HiddenCityOption {
  rank: number;
  flight: Flight;
  hiddenDestination: string; // destino final do bilhete (descartado)
  stopoverAirport: string; // onde o viajante desembarca de fato
  arrivalAtStopover: string; // "YYYY-MM-DD HH:mm"
  stopsBeforeStopover: number;
  baselinePrice: number;
  price: number;
  savings: number;
  savingsPct: number;
}

export interface HiddenCityResult {
  meta: SearchMeta;
  query: { origin: string; destination: string; outDate: string; adults: number; candidates: string[] };
  baseline: Flight | null;
  options: HiddenCityOption[];
  checkedCandidates: number;
  notes: string[];
}

// ---------- Alertas de preço ----------
export interface PriceAlert {
  id: string;
  label: string;
  origin: string;
  destination: string;
  out_date: string;
  return_date: string | null;
  adults: number;
  currency: string;
  travel_class: number;
  target_price: number | null;
  min_drop_pct: number;
  notify_email: string;
  active: boolean;
  last_price: number | null;
  last_checked_at: string | null;
  last_notified_price: number | null;
  last_notified_at: string | null;
  last_error: string | null;
  client_id: string | null;
  created_at: string;
}
