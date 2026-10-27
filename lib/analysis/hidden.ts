import type { Flight, HiddenCityOption } from "../types";

// Módulo 7 — hidden-city (trecho descartado). Este módulo só COMPARA preços e
// lista riscos. Nunca é uma recomendação: a prática costuma violar as condições
// de transporte das companhias, e a decisão e a responsabilidade são do viajante.

export const HIDDEN_CITY_WARNING =
  "Esta prática (comprar uma passagem até um destino além do real e descartar o último trecho) costuma violar as condições de transporte das companhias aéreas. A decisão e a responsabilidade são exclusivamente do viajante. Este módulo apenas compara preços e NÃO é uma recomendação.";

export const HIDDEN_CITY_RISKS: { title: string; text: string }[] = [
  {
    title: "Bagagem",
    text: "A bagagem despachada segue até o destino final do bilhete, não até a cidade onde você desembarca. Só é viável com bagagem de mão.",
  },
  {
    title: "Perder um trecho",
    text: "Se o primeiro trecho atrasar ou mudar, a companhia pode reacomodar você de formas que inviabilizam o plano, e o trecho final não utilizado é cancelado.",
  },
  {
    title: "Passagem de volta",
    text: "Em bilhetes de ida e volta, não embarcar em um trecho costuma cancelar automaticamente os seguintes, incluindo a volta. Por isso este módulo só analisa passagens de ida (one-way).",
  },
  {
    title: "Conta de fidelidade",
    text: "Companhias podem aplicar penalidades à conta do programa de fidelidade (perda de milhas, suspensão ou cancelamento) e cobrar a diferença de tarifa.",
  },
  {
    title: "Políticas da companhia",
    text: "Muitas condições de transporte proíbem expressamente o uso parcial do bilhete. Leia as condições da companhia e do emissor antes de decidir.",
  },
];

export function analyzeHiddenCity(
  flights: Flight[],
  opts: { stopover: string; baseline: Flight | null; limit?: number },
): HiddenCityOption[] {
  if (!opts.baseline || opts.baseline.price === null) return [];
  const baselinePrice = opts.baseline.price;
  const found = new Map<string, HiddenCityOption>();

  for (const f of flights) {
    if (f.price === null || f.stops < 1 || f.airportChange) continue;
    if (f.destination === opts.stopover) continue;
    const idx = f.layovers.findIndex((l) => l.airport === opts.stopover);
    if (idx === -1) continue;
    const segIn = f.segments[idx];
    if (!segIn || segIn.to !== opts.stopover) continue;
    const savings = baselinePrice - f.price;
    if (savings <= 0) continue;

    const option: HiddenCityOption = {
      rank: 0,
      flight: f,
      hiddenDestination: f.destination,
      stopoverAirport: opts.stopover,
      arrivalAtStopover: segIn.arrival,
      stopsBeforeStopover: idx,
      baselinePrice,
      price: f.price,
      savings,
      savingsPct: baselinePrice > 0 ? (savings / baselinePrice) * 100 : 0,
    };
    const prev = found.get(f.id);
    if (!prev || prev.savings < savings) found.set(f.id, option);
  }

  return Array.from(found.values())
    .sort((a, b) => b.savings - a.savings || a.flight.durationMin - b.flight.durationMin)
    .slice(0, opts.limit ?? 5)
    .map((o, i) => ({ ...o, rank: i + 1 }));
}

// Cidades "além" do destino, usadas como candidatas quando o usuário não informa as suas.
// São apenas pontos de partida para pesquisar: cada resultado é filtrado depois
// pelos dados reais (a conexão precisa mesmo passar pelo aeroporto de desembarque).
export const BEYOND_CITIES: Record<string, string[]> = {
  JFK: ["BOS", "PHL", "BWI", "YYZ", "YUL", "ORD", "DTW", "CLT"],
  EWR: ["BOS", "PHL", "BWI", "YYZ", "ORD", "CLE", "PIT", "RDU"],
  MIA: ["ATL", "ORD", "DFW", "CLT", "BOS", "IAD", "TPA", "MSY"],
  MCO: ["ATL", "CLT", "DFW", "BOS", "PHL", "IAD", "RDU", "CLE"],
  ATL: ["CLT", "DFW", "BOS", "MSY", "BNA", "RDU", "ORD", "DEN"],
  ORD: ["DEN", "MSP", "DTW", "CLE", "BOS", "SEA", "SLC", "STL"],
  IAH: ["DEN", "DFW", "ATL", "MSY", "AUS", "SAT", "LAX", "PHX"],
  DFW: ["DEN", "ATL", "AUS", "SAT", "PHX", "LAX", "MSY", "ORD"],
  LAX: ["SFO", "SEA", "PHX", "LAS", "DEN", "SAN", "PDX", "SLC"],
  MAD: ["BCN", "SVQ", "VLC", "AGP", "BIO", "LIS", "PMI", "TFN"],
  LIS: ["OPO", "MAD", "BCN", "FNC", "PDL", "FCO", "ORY", "AMS"],
  CDG: ["LYS", "NCE", "TLS", "BCN", "FCO", "BRU", "AMS", "ZRH"],
  FRA: ["MUC", "BER", "HAM", "VIE", "ZRH", "PRG", "WAW", "BUD"],
  AMS: ["BRU", "CPH", "OSL", "ARN", "DUB", "EDI", "MAN", "BCN"],
  LHR: ["MAN", "EDI", "DUB", "AMS", "BRU", "GVA", "BCN", "FCO"],
  PTY: ["SJO", "GUA", "SAL", "SJU", "KIN", "CUN", "MEX", "HAV"],
  BOG: ["MDE", "CLO", "CTG", "UIO", "GYE", "LIM", "PTY", "MIA"],
  SCL: ["LIM", "BOG", "MVD", "EZE", "COR", "PUQ", "ANF", "IQQ"],
  LIM: ["CUZ", "UIO", "BOG", "SCL", "SJO", "PTY", "MEX", "MIA"],
  EZE: ["COR", "MDZ", "MVD", "SCL", "ASU", "BRC", "USH", "IGR"],
  DXB: ["DOH", "BOM", "DEL", "BKK", "CAI", "AMM", "KWI", "MCT"],
  DOH: ["DXB", "BOM", "DEL", "BKK", "CAI", "AMM", "KWI", "MCT"],
  IST: ["ATH", "SOF", "BEG", "TLV", "CAI", "DXB", "VIE", "BUD"],
};

export function defaultCandidates(stopover: string): string[] {
  return BEYOND_CITIES[stopover.toUpperCase()] ?? [];
}
