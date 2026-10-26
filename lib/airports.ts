// Lista de aeroportos comuns (para sugestões no formulário) e grupos de
// aeroportos próximos na mesma região metropolitana.
// Os grupos são uma referência prática e podem ser ampliados à vontade.

export const AIRPORTS: { code: string; label: string }[] = [
  // Brasil
  { code: "GRU", label: "São Paulo/Guarulhos" },
  { code: "CGH", label: "São Paulo/Congonhas" },
  { code: "VCP", label: "Campinas/Viracopos" },
  { code: "GIG", label: "Rio de Janeiro/Galeão" },
  { code: "SDU", label: "Rio de Janeiro/Santos Dumont" },
  { code: "BSB", label: "Brasília" },
  { code: "CNF", label: "Belo Horizonte/Confins" },
  { code: "PLU", label: "Belo Horizonte/Pampulha" },
  { code: "SSA", label: "Salvador" },
  { code: "REC", label: "Recife" },
  { code: "FOR", label: "Fortaleza" },
  { code: "NAT", label: "Natal" },
  { code: "MCZ", label: "Maceió" },
  { code: "POA", label: "Porto Alegre" },
  { code: "CWB", label: "Curitiba" },
  { code: "FLN", label: "Florianópolis" },
  { code: "BEL", label: "Belém" },
  { code: "MAO", label: "Manaus" },
  { code: "GYN", label: "Goiânia" },
  { code: "VIX", label: "Vitória" },
  { code: "CGB", label: "Cuiabá" },
  { code: "IGU", label: "Foz do Iguaçu" },
  // América do Sul
  { code: "EZE", label: "Buenos Aires/Ezeiza" },
  { code: "AEP", label: "Buenos Aires/Aeroparque" },
  { code: "SCL", label: "Santiago" },
  { code: "MVD", label: "Montevidéu" },
  { code: "LIM", label: "Lima" },
  { code: "BOG", label: "Bogotá" },
  { code: "ASU", label: "Assunção" },
  // América do Norte e Central
  { code: "MIA", label: "Miami" },
  { code: "FLL", label: "Fort Lauderdale" },
  { code: "MCO", label: "Orlando" },
  { code: "JFK", label: "Nova York/JFK" },
  { code: "EWR", label: "Nova York/Newark" },
  { code: "LGA", label: "Nova York/LaGuardia" },
  { code: "LAX", label: "Los Angeles" },
  { code: "SFO", label: "São Francisco" },
  { code: "ORD", label: "Chicago/O'Hare" },
  { code: "ATL", label: "Atlanta" },
  { code: "IAH", label: "Houston" },
  { code: "DFW", label: "Dallas/Fort Worth" },
  { code: "IAD", label: "Washington/Dulles" },
  { code: "DCA", label: "Washington/Reagan" },
  { code: "YYZ", label: "Toronto" },
  { code: "MEX", label: "Cidade do México" },
  { code: "CUN", label: "Cancún" },
  { code: "PTY", label: "Cidade do Panamá" },
  // Europa
  { code: "LIS", label: "Lisboa" },
  { code: "OPO", label: "Porto" },
  { code: "MAD", label: "Madri" },
  { code: "BCN", label: "Barcelona" },
  { code: "CDG", label: "Paris/Charles de Gaulle" },
  { code: "ORY", label: "Paris/Orly" },
  { code: "LHR", label: "Londres/Heathrow" },
  { code: "LGW", label: "Londres/Gatwick" },
  { code: "STN", label: "Londres/Stansted" },
  { code: "FCO", label: "Roma/Fiumicino" },
  { code: "CIA", label: "Roma/Ciampino" },
  { code: "MXP", label: "Milão/Malpensa" },
  { code: "LIN", label: "Milão/Linate" },
  { code: "BGY", label: "Milão/Bérgamo" },
  { code: "AMS", label: "Amsterdã" },
  { code: "FRA", label: "Frankfurt" },
  { code: "MUC", label: "Munique" },
  { code: "ZRH", label: "Zurique" },
  { code: "IST", label: "Istambul" },
  // Oriente Médio, África e Ásia
  { code: "DXB", label: "Dubai" },
  { code: "DOH", label: "Doha" },
  { code: "JNB", label: "Joanesburgo" },
  { code: "CPT", label: "Cidade do Cabo" },
  { code: "NRT", label: "Tóquio/Narita" },
  { code: "HND", label: "Tóquio/Haneda" },
  { code: "ICN", label: "Seul" },
  { code: "SIN", label: "Singapura" },
  { code: "BKK", label: "Bangkok" },
];

// Grupos de aeroportos da mesma região metropolitana.
const GROUPS: string[][] = [
  ["GRU", "CGH", "VCP"],
  ["GIG", "SDU"],
  ["CNF", "PLU"],
  ["EZE", "AEP"],
  ["JFK", "EWR", "LGA"],
  ["IAD", "DCA", "BWI"],
  ["MIA", "FLL", "PBI"],
  ["MCO", "SFB"],
  ["LAX", "BUR", "SNA", "LGB", "ONT"],
  ["SFO", "OAK", "SJC"],
  ["LHR", "LGW", "STN", "LTN", "LCY"],
  ["CDG", "ORY", "BVA"],
  ["FCO", "CIA"],
  ["MXP", "LIN", "BGY"],
  ["NRT", "HND"],
  ["OPO", "VGO"],
];

export function nearbyAirports(code: string): string[] {
  const up = code.toUpperCase();
  const group = GROUPS.find((g) => g.includes(up));
  return group ? group.filter((c) => c !== up) : [];
}

export function parseCodes(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\s;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

export function isValidCodeList(input: string): boolean {
  const codes = parseCodes(input);
  return codes.length > 0 && codes.every((c) => /^[A-Z]{3}$/.test(c));
}

// Aeroportos de conexão nos quais conexões internacionais costumam exigir
// atenção a vistos/autorizações de trânsito, dependendo da nacionalidade.
export const TRANSIT_VISA_WATCH = new Set([
  // Estados Unidos
  "JFK", "EWR", "LGA", "MIA", "FLL", "MCO", "ATL", "ORD", "IAH", "DFW", "LAX",
  "SFO", "IAD", "DCA", "BOS", "SEA", "DEN", "PHL", "CLT", "DTW", "MSP", "LAS",
  // Canadá
  "YYZ", "YUL", "YVR", "YYC",
  // Reino Unido e Irlanda
  "LHR", "LGW", "MAN", "DUB",
  // Austrália e Nova Zelândia
  "SYD", "MEL", "AKL",
  // Outros
  "JNB", "DEL", "BOM",
]);
