// Classificação simples de companhias de baixo custo (referência interna).
// A lista é pequena de propósito: só inclui companhias amplamente conhecidas
// como low cost. Pode ser ampliada.

const LOW_COST = [
  "jetsmart",
  "flybondi",
  "sky airline",
  "ryanair",
  "easyjet",
  "wizz",
  "vueling",
  "spirit",
  "frontier",
  "volaris",
  "avelo",
  "jet2",
  "norse",
  "transavia",
  "level",
  "eurowings",
  "pegasus",
  "flyadeal",
  "air arabia",
  "scoot",
  "airasia",
  "cebu pacific",
];

export function isLowCost(airline: string): boolean {
  const a = airline.toLowerCase();
  return LOW_COST.some((l) => a.includes(l));
}
