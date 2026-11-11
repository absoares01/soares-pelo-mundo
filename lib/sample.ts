// Dados de exemplo realistas (PT-BR) para o consultor conhecer o TripFlow sem digitar nada.
// As datas são relativas a "hoje". Tudo é marcado is_sample = true e pode ser removido de uma vez.

import { priceFromMarkup, quotationTotals } from "./calc";
import { newId } from "./db";
import { addDaysISO } from "./format";
import type { CustomerStatus, ItemCategory, ItineraryKind, PriceDisplay, ProposalStatus, QuotationStatus } from "./types";

const R = (reais: number) => Math.round(reais * 100);

export interface SampleData {
  customers: Record<string, unknown>[];
  quotations: Record<string, unknown>[];
  quotationItems: Record<string, unknown>[];
  itineraries: Record<string, unknown>[];
  itineraryDays: Record<string, unknown>[];
  itineraryItems: Record<string, unknown>[];
  proposals: Record<string, unknown>[];
}

interface ItemSpec {
  category: ItemCategory;
  description: string;
  supplier?: string;
  details?: string;
  quantity: number;
  cost: number; // reais, unitário
  markup: number; // %
  dayOffset?: number; // dias depois da ida
}

export function buildSampleData(today: string, genId: () => string = newId): SampleData {
  const out: SampleData = {
    customers: [],
    quotations: [],
    quotationItems: [],
    itineraries: [],
    itineraryDays: [],
    itineraryItems: [],
    proposals: [],
  };

  const customer = (c: {
    name: string;
    email: string;
    phone: string;
    city: string;
    status: CustomerStatus;
    source: string;
    opportunity: number;
    followup?: number;
    style: string;
    preferences: string;
    budget: string;
    history?: string;
    notes?: string;
  }) => {
    const id = genId();
    out.customers.push({
      id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      status: c.status,
      source: c.source,
      opportunity_cents: R(c.opportunity),
      next_followup: c.followup === undefined ? null : addDaysISO(today, c.followup),
      travel_style: c.style,
      preferences: c.preferences,
      budget_note: c.budget,
      history_notes: c.history ?? null,
      notes: c.notes ?? null,
      is_sample: true,
    });
    return id;
  };

  const quotation = (q: {
    code: string;
    customerId: string;
    title: string;
    destination: string;
    startOffset: number;
    nights: number;
    adults: number;
    children?: number;
    status: QuotationStatus;
    fee: number;
    discount?: number;
    validDays?: number;
    items: ItemSpec[];
    inclusions: string;
    exclusions: string;
    payment: string;
  }) => {
    const id = genId();
    const start = addDaysISO(today, q.startOffset);
    const end = addDaysISO(start, q.nights);
    const rows = q.items.map((it, idx) => ({
      id: genId(),
      quotation_id: id,
      category: it.category,
      description: it.description,
      supplier: it.supplier ?? null,
      details: it.details ?? null,
      item_date: it.dayOffset === undefined ? null : addDaysISO(start, it.dayOffset),
      quantity: it.quantity,
      unit_cost_cents: R(it.cost),
      unit_price_cents: priceFromMarkup(R(it.cost), it.markup),
      position: idx,
    }));
    const t = quotationTotals(rows, R(q.fee), R(q.discount ?? 0));
    out.quotationItems.push(...rows);
    out.quotations.push({
      id,
      customer_id: q.customerId,
      code: q.code,
      title: q.title,
      destination: q.destination,
      start_date: start,
      end_date: end,
      adults: q.adults,
      children: q.children ?? 0,
      status: q.status,
      currency: "BRL",
      service_fee_cents: t.fee,
      discount_cents: t.discount,
      total_cost_cents: t.cost,
      total_price_cents: t.total,
      valid_until: addDaysISO(today, q.validDays ?? 15),
      payment_terms: q.payment,
      inclusions: q.inclusions,
      exclusions: q.exclusions,
      notes: "Orçamento de exemplo.",
      is_sample: true,
    });
    return id;
  };

  const proposal = (p: {
    customerId: string;
    quotationId: string;
    itineraryId?: string;
    title: string;
    status: ProposalStatus;
    display: PriceDisplay;
    intro: string;
    sentDaysAgo?: number;
    validDays: number;
  }) => {
    const id = genId();
    out.proposals.push({
      id,
      customer_id: p.customerId,
      quotation_id: p.quotationId,
      itinerary_id: p.itineraryId ?? null,
      title: p.title,
      status: p.status,
      intro_message: p.intro,
      price_display: p.display,
      include_itinerary: Boolean(p.itineraryId),
      valid_until: addDaysISO(today, p.validDays),
      terms:
        "Valores sujeitos a disponibilidade e variação cambial até a emissão. O cancelamento segue as regras de cada fornecedor.",
      sent_at: p.sentDaysAgo === undefined ? null : new Date(Date.parse(`${today}T12:00:00Z`) - p.sentDaysAgo * 86400000).toISOString(),
      responded_at: p.status === "aceita" ? new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString() : null,
      is_sample: true,
    });
    return id;
  };

  const PAY = "Entrada de 40% na confirmação e saldo em até 4x sem juros no cartão ou à vista com 3% de desconto.";

  // ── Clientes ──────────────────────────────────────────────
  const mariana = customer({
    name: "Mariana Albuquerque",
    email: "mariana.albuquerque@exemplo.com",
    phone: "(11) 98765-4321",
    city: "São Paulo, SP",
    status: "cliente",
    source: "Indicação",
    opportunity: 38500,
    style: "Cultura, gastronomia e hotéis boutique",
    preferences: "Prefere voos diurnos. Não gosta de roteiros corridos. Vegetariana.",
    budget: "Investe de R$ 30 a 45 mil por viagem.",
    history:
      "2023 — Roma e Toscana (10 dias)\n2024 — Santorini e Atenas (9 dias)\nVolta sempre que indicamos algo novo.",
    notes: "Aniversário em março: enviar mimo.",
  });
  const carlos = customer({
    name: "Carlos e Helena Duarte",
    email: "carlos.duarte@exemplo.com",
    phone: "(31) 99123-4567",
    city: "Belo Horizonte, MG",
    status: "negociacao",
    source: "Instagram",
    opportunity: 62000,
    followup: 2,
    style: "Lua de mel, romântico e exclusivo",
    preferences: "Resort com vila sobre a água. Casamento em 3 meses.",
    budget: "Até R$ 70 mil, flexível se valer a pena.",
    notes: "Pediram opção com upgrade de quarto.",
  });
  const rafael = customer({
    name: "Rafael Nogueira",
    email: "rafael.nogueira@exemplo.com",
    phone: "(41) 99876-1122",
    city: "Curitiba, PR",
    status: "proposta_enviada",
    source: "WhatsApp",
    opportunity: 24800,
    followup: 1,
    style: "Cidade grande, musicais e compras",
    preferences: "Hotel em Manhattan, perto do metrô.",
    budget: "R$ 20 a 28 mil.",
  });
  const beatriz = customer({
    name: "Beatriz Camargo",
    email: "beatriz.camargo@exemplo.com",
    phone: "(21) 98888-7766",
    city: "Rio de Janeiro, RJ",
    status: "em_contato",
    source: "Site",
    opportunity: 45000,
    followup: 4,
    style: "Cultura e natureza",
    preferences: "Quer ver a florada das cerejeiras.",
    budget: "Ainda a definir.",
  });
  const tavares = customer({
    name: "Família Tavares",
    email: "familia.tavares@exemplo.com",
    phone: "(61) 99555-0101",
    city: "Brasília, DF",
    status: "cliente",
    source: "Cliente antigo",
    opportunity: 31200,
    style: "Família com crianças, parques",
    preferences: "Duas crianças (7 e 10 anos). Hotel com piscina.",
    budget: "R$ 28 a 35 mil.",
    history: "2022 — Gramado e Canela\n2023 — Maceió",
  });
  const lucas = customer({
    name: "Lucas Pimentel",
    email: "lucas.pimentel@exemplo.com",
    phone: "(81) 99444-2020",
    city: "Recife, PE",
    status: "lead",
    source: "Instagram",
    opportunity: 18000,
    followup: 0,
    style: "Aventura e trilhas",
    preferences: "Quer conhecer El Chaltén e Torres del Paine.",
    budget: "Até R$ 20 mil.",
  });
  const juliana = customer({
    name: "Juliana Prado",
    email: "juliana.prado@exemplo.com",
    phone: "(51) 99333-4545",
    city: "Porto Alegre, RS",
    status: "perdido",
    source: "Evento",
    opportunity: 27000,
    style: "Romântico",
    preferences: "—",
    budget: "R$ 25 mil.",
    notes: "Fechou com outra agência por preço.",
  });

  // ── Orçamentos ────────────────────────────────────────────
  const qLisboa = quotation({
    code: "EX-001",
    customerId: mariana,
    title: "Lisboa, Sintra e Porto",
    destination: "Lisboa e Porto, Portugal",
    startOffset: 45,
    nights: 5,
    adults: 2,
    status: "confirmado",
    fee: 1800,
    validDays: 10,
    payment: PAY,
    inclusions: "Passagens aéreas São Paulo – Lisboa – São Paulo\nHotéis boutique com café da manhã\nTrem Lisboa – Porto\nPasseio a Sintra com guia particular\nSeguro viagem",
    exclusions: "Refeições não mencionadas\nGastos pessoais\nTaxas turísticas pagas no hotel",
    items: [
      { category: "voo", description: "Aéreo SP – Lisboa – SP (classe econômica)", supplier: "TAP", quantity: 2, cost: 5200, markup: 8 },
      { category: "hospedagem", description: "Hotel boutique em Lisboa — 3 noites", supplier: "Memmo Alfama", details: "Quarto superior com vista", quantity: 3, cost: 980, markup: 18, dayOffset: 0 },
      { category: "hospedagem", description: "Hotel no Porto — 2 noites", supplier: "The Yeatman", quantity: 2, cost: 1250, markup: 18, dayOffset: 3 },
      { category: "transporte", description: "Trem Alfa Pendular Lisboa – Porto", supplier: "CP Portugal", quantity: 2, cost: 190, markup: 15, dayOffset: 3 },
      { category: "transporte", description: "Transfers aeroporto – hotel", supplier: "Lisbon Transfers", quantity: 2, cost: 160, markup: 20 },
      { category: "passeio", description: "Sintra e Cascais com guia particular", supplier: "Guia local", quantity: 1, cost: 1100, markup: 25, dayOffset: 2 },
      { category: "passeio", description: "Cruzeiro no Douro com almoço", supplier: "Rota do Douro", quantity: 2, cost: 420, markup: 25, dayOffset: 4 },
      { category: "seguro", description: "Seguro viagem Europa", supplier: "Assist Card", quantity: 2, cost: 230, markup: 20 },
    ],
  });
  const qMaldivas = quotation({
    code: "EX-002",
    customerId: carlos,
    title: "Lua de mel nas Maldivas",
    destination: "Maldivas",
    startOffset: 120,
    nights: 7,
    adults: 2,
    status: "enviado",
    fee: 3500,
    discount: 1500,
    validDays: 7,
    payment: PAY,
    inclusions: "Aéreo com conexão em Doha\nVilla sobre a água com meia pensão\nTransfer em hidroavião\nJantar romântico na praia",
    exclusions: "Bebidas alcoólicas fora do pacote\nPasseios opcionais",
    items: [
      { category: "voo", description: "Aéreo SP – Malé – SP via Doha", supplier: "Qatar Airways", quantity: 2, cost: 9800, markup: 7 },
      { category: "hospedagem", description: "Water Villa com meia pensão — 7 noites", supplier: "Sun Siyam Iru Fushi", quantity: 7, cost: 3300, markup: 16, dayOffset: 0 },
      { category: "transporte", description: "Transfer em hidroavião (ida e volta)", supplier: "Trans Maldivian", quantity: 2, cost: 1450, markup: 15 },
      { category: "passeio", description: "Jantar romântico na praia", supplier: "Resort", quantity: 1, cost: 1600, markup: 25, dayOffset: 3 },
      { category: "passeio", description: "Snorkel com tartarugas", supplier: "Resort", quantity: 2, cost: 380, markup: 25, dayOffset: 4 },
      { category: "seguro", description: "Seguro viagem internacional", supplier: "Assist Card", quantity: 2, cost: 260, markup: 20 },
    ],
  });
  const qNova = quotation({
    code: "EX-003",
    customerId: rafael,
    title: "Nova York — 6 noites",
    destination: "Nova York, EUA",
    startOffset: 90,
    nights: 6,
    adults: 1,
    status: "enviado",
    fee: 1500,
    validDays: 5,
    payment: PAY,
    inclusions: "Aéreo ida e volta\nHotel em Midtown com café da manhã\nIngresso para musical na Broadway\nCity Pass",
    exclusions: "Visto americano\nRefeições não mencionadas",
    items: [
      { category: "voo", description: "Aéreo Curitiba – Nova York – Curitiba", supplier: "LATAM", quantity: 1, cost: 6400, markup: 8 },
      { category: "hospedagem", description: "Hotel em Midtown — 6 noites", supplier: "The Westin Times Square", quantity: 6, cost: 1050, markup: 17, dayOffset: 0 },
      { category: "transporte", description: "Transfer JFK – hotel (ida e volta)", supplier: "Carmel Car", quantity: 1, cost: 420, markup: 20 },
      { category: "passeio", description: "Musical na Broadway — plateia", supplier: "Telecharge", quantity: 1, cost: 780, markup: 22, dayOffset: 2 },
      { category: "passeio", description: "New York CityPASS", supplier: "CityPASS", quantity: 1, cost: 640, markup: 20 },
      { category: "seguro", description: "Seguro viagem EUA", supplier: "Assist Card", quantity: 1, cost: 310, markup: 20 },
    ],
  });
  const qOrlando = quotation({
    code: "EX-004",
    customerId: tavares,
    title: "Orlando em família",
    destination: "Orlando, EUA",
    startOffset: 18,
    nights: 8,
    adults: 2,
    children: 2,
    status: "confirmado",
    fee: 2000,
    validDays: 5,
    payment: PAY,
    inclusions: "Aéreo para 4 pessoas\nHotel com piscina e café da manhã\nCarro com cadeirinhas\nIngressos de 4 dias para parques",
    exclusions: "Alimentação nos parques\nCombustível e pedágios",
    items: [
      { category: "voo", description: "Aéreo Brasília – Orlando – Brasília", supplier: "Azul", quantity: 4, cost: 4300, markup: 8 },
      { category: "hospedagem", description: "Resort com piscina — 8 noites", supplier: "Wyndham Garden Lake Buena Vista", quantity: 8, cost: 780, markup: 16, dayOffset: 0 },
      { category: "transporte", description: "Aluguel de SUV com cadeirinhas — 8 dias", supplier: "Alamo", quantity: 8, cost: 260, markup: 18 },
      { category: "passeio", description: "Ingressos Disney 4 dias (park hopper)", supplier: "Disney", quantity: 4, cost: 1700, markup: 14, dayOffset: 1 },
      { category: "passeio", description: "Ingresso Universal 2 dias", supplier: "Universal", quantity: 4, cost: 1150, markup: 14, dayOffset: 5 },
      { category: "seguro", description: "Seguro viagem família", supplier: "Assist Card", quantity: 4, cost: 280, markup: 20 },
    ],
  });
  const qTokyo = quotation({
    code: "EX-005",
    customerId: beatriz,
    title: "Tóquio, Kyoto e Osaka",
    destination: "Japão",
    startOffset: 200,
    nights: 12,
    adults: 1,
    status: "rascunho",
    fee: 2800,
    validDays: 20,
    payment: PAY,
    inclusions: "Aéreo ida e volta\nHotéis com café da manhã\nJapan Rail Pass de 14 dias\nGuia em Kyoto",
    exclusions: "Refeições não mencionadas",
    items: [
      { category: "voo", description: "Aéreo Rio – Tóquio – Rio", supplier: "Emirates", quantity: 1, cost: 11500, markup: 7 },
      { category: "hospedagem", description: "Hotéis em Tóquio, Kyoto e Osaka — 12 noites", supplier: "Diversos", quantity: 12, cost: 780, markup: 16, dayOffset: 0 },
      { category: "transporte", description: "Japan Rail Pass — 14 dias", supplier: "JR", quantity: 1, cost: 2900, markup: 12 },
      { category: "passeio", description: "Guia privativo em Kyoto", supplier: "Kyoto Guide", quantity: 1, cost: 1500, markup: 25, dayOffset: 6 },
    ],
  });
  quotation({
    code: "EX-006",
    customerId: juliana,
    title: "Paris romântica",
    destination: "Paris, França",
    startOffset: 60,
    nights: 6,
    adults: 2,
    status: "perdido",
    fee: 1500,
    validDays: -3,
    payment: PAY,
    inclusions: "Aéreo ida e volta\nHotel 4 estrelas no Marais",
    exclusions: "Refeições",
    items: [
      { category: "voo", description: "Aéreo POA – Paris – POA", supplier: "Air France", quantity: 2, cost: 6100, markup: 8 },
      { category: "hospedagem", description: "Hotel no Marais — 6 noites", supplier: "Hôtel du Petit Moulin", quantity: 6, cost: 1100, markup: 17, dayOffset: 0 },
    ],
  });
  quotation({
    code: "EX-007",
    customerId: mariana,
    title: "Buenos Aires gastronômico",
    destination: "Buenos Aires, Argentina",
    startOffset: -40,
    nights: 5,
    adults: 2,
    status: "confirmado",
    fee: 1200,
    validDays: -50,
    payment: PAY,
    inclusions: "Aéreo\nHotel em Palermo\nJantar tango show",
    exclusions: "Refeições não mencionadas",
    items: [
      { category: "voo", description: "Aéreo SP – Buenos Aires – SP", supplier: "Aerolíneas", quantity: 2, cost: 2100, markup: 9 },
      { category: "hospedagem", description: "Hotel em Palermo — 5 noites", supplier: "Legado Mitico", quantity: 5, cost: 690, markup: 17, dayOffset: 0 },
      { category: "passeio", description: "Jantar com show de tango", supplier: "Rojo Tango", quantity: 2, cost: 540, markup: 22, dayOffset: 2 },
    ],
  });
  void juliana;
  void lucas;

  // ── Roteiro (Lisboa e Porto) ──────────────────────────────
  const itId = genId();
  const startLisboa = addDaysISO(today, 45);
  out.itineraries.push({
    id: itId,
    customer_id: mariana,
    title: "Lisboa, Sintra e Porto",
    destination: "Lisboa e Porto, Portugal",
    start_date: startLisboa,
    end_date: addDaysISO(startLisboa, 5),
    summary:
      "Seis dias para viver o melhor de Portugal sem correria: os bairros históricos de Lisboa, o romantismo de Sintra e a elegância do Porto, com restaurantes escolhidos a dedo.",
    is_sample: true,
  });

  type DayItem = { kind: ItineraryKind; time?: string; title: string; location?: string; description?: string; tips?: string };
  const days: { title: string; location: string; notes?: string; items: DayItem[] }[] = [
    {
      title: "Chegada em Lisboa",
      location: "Lisboa",
      notes: "Dia leve para se adaptar ao fuso.",
      items: [
        { kind: "voo", time: "09:40", title: "Chegada ao Aeroporto Humberto Delgado", location: "Lisboa", description: "Transfer privativo aguardando com placa no desembarque." },
        { kind: "hospedagem", time: "12:00", title: "Check-in no Memmo Alfama", location: "Alfama", description: "Se o quarto não estiver pronto, a bagagem fica guardada.", tips: "Peça um quarto com vista para o Tejo." },
        { kind: "restaurante", time: "20:00", title: "Jantar no Taberna da Rua das Flores", location: "Chiado", description: "Petiscos portugueses em ambiente descontraído.", tips: "Não aceita reservas: chegue cedo." },
      ],
    },
    {
      title: "Lisboa clássica",
      location: "Lisboa",
      items: [
        { kind: "atividade", time: "09:30", title: "Mosteiro dos Jerónimos e Torre de Belém", location: "Belém", description: "Patrimônio da UNESCO e símbolo da era dos descobrimentos.", tips: "Compre o ingresso online para evitar fila." },
        { kind: "restaurante", time: "13:00", title: "Pastéis de Belém", location: "Belém", description: "A receita original do pastel de nata, desde 1837." },
        { kind: "atividade", time: "16:00", title: "Passeio de bonde 28 e mirantes", location: "Alfama e Graça", tips: "Vá no começo da tarde: o bonde enche no fim do dia." },
        { kind: "restaurante", time: "20:30", title: "Jantar com fado na Alfama", location: "Alfama", description: "Casa tradicional com apresentação ao vivo." },
      ],
    },
    {
      title: "Sintra e Cascais",
      location: "Sintra",
      notes: "Dia com guia particular, saída do hotel às 9h.",
      items: [
        { kind: "atividade", time: "09:00", title: "Palácio da Pena", location: "Sintra", description: "Palácio colorido no alto da serra, com vista até o oceano." },
        { kind: "restaurante", time: "13:00", title: "Almoço na Quinta da Regaleira", location: "Sintra", description: "Cozinha regional em meio a jardins misteriosos." },
        { kind: "atividade", time: "16:30", title: "Cabo da Roca e Cascais", location: "Cascais", description: "O ponto mais ocidental da Europa continental." },
      ],
    },
    {
      title: "De trem para o Porto",
      location: "Porto",
      items: [
        { kind: "transporte", time: "10:00", title: "Trem Alfa Pendular Lisboa – Porto", location: "Estação Santa Apolónia", description: "Cerca de 3 horas, em primeira classe." },
        { kind: "hospedagem", time: "14:00", title: "Check-in no The Yeatman", location: "Vila Nova de Gaia", description: "Hotel com vista para o rio e adega de vinhos do Porto." },
        { kind: "atividade", time: "16:30", title: "Livraria Lello e Ribeira", location: "Centro histórico", tips: "A Lello cobra ingresso, que abate na compra de um livro." },
        { kind: "restaurante", time: "20:00", title: "Jantar no The Yeatman (1 estrela Michelin)", location: "Gaia", description: "Menu degustação com harmonização." },
      ],
    },
    {
      title: "Vale do Douro",
      location: "Douro",
      items: [
        { kind: "atividade", time: "09:30", title: "Cruzeiro no Rio Douro com almoço", location: "Porto – Régua", description: "Vinhedos em terraços e almoço a bordo." },
        { kind: "atividade", time: "17:00", title: "Degustação de vinhos do Porto", location: "Gaia", tips: "Experimente o tawny de 20 anos." },
        { kind: "restaurante", time: "20:30", title: "Jantar de despedida no Cantinho do Avillez", location: "Porto" },
      ],
    },
    {
      title: "Despedida",
      location: "Porto",
      items: [
        { kind: "recomendacao", time: "09:00", title: "Última passada no Mercado do Bolhão", location: "Porto", description: "Boa hora para levar azeites, conservas e doces de lembrança." },
        { kind: "transporte", time: "11:30", title: "Transfer para o Aeroporto Francisco Sá Carneiro", location: "Porto" },
        { kind: "voo", time: "14:20", title: "Voo de volta ao Brasil", description: "Chegada no mesmo dia." },
      ],
    },
  ];
  days.forEach((d, di) => {
    const dayId = genId();
    out.itineraryDays.push({
      id: dayId,
      itinerary_id: itId,
      day_date: addDaysISO(startLisboa, di),
      title: d.title,
      location: d.location,
      notes: d.notes ?? null,
      position: di,
    });
    d.items.forEach((it, ii) =>
      out.itineraryItems.push({
        id: genId(),
        day_id: dayId,
        itinerary_id: itId,
        kind: it.kind,
        item_time: it.time ?? null,
        title: it.title,
        location: it.location ?? null,
        description: it.description ?? null,
        tips: it.tips ?? null,
        position: ii,
      }),
    );
  });

  // ── Propostas ─────────────────────────────────────────────
  proposal({
    customerId: mariana,
    quotationId: qLisboa,
    itineraryId: itId,
    title: "Proposta — Lisboa, Sintra e Porto",
    status: "aceita",
    display: "por_categoria",
    intro: "Olá, Mariana! Montei este roteiro pensando no seu estilo: hotéis charmosos, boa mesa e tempo para respirar.",
    sentDaysAgo: 4,
    validDays: 6,
  });
  proposal({
    customerId: carlos,
    quotationId: qMaldivas,
    title: "Proposta — Lua de mel nas Maldivas",
    status: "enviada",
    display: "detalhado",
    intro: "Carlos e Helena, parabéns pelo casamento! Preparei uma villa sobre a água com tudo o que vocês sonharam.",
    sentDaysAgo: 2,
    validDays: 5,
  });
  proposal({
    customerId: rafael,
    quotationId: qNova,
    title: "Proposta — Nova York",
    status: "enviada",
    display: "total",
    intro: "Rafael, aqui está a sua semana em Nova York, com hotel no coração de Manhattan e musical incluído.",
    sentDaysAgo: 1,
    validDays: 4,
  });
  proposal({
    customerId: beatriz,
    quotationId: qTokyo,
    title: "Proposta — Japão",
    status: "rascunho",
    display: "detalhado",
    intro: "Beatriz, ainda estamos ajustando as datas para pegar a florada das cerejeiras.",
    validDays: 15,
  });
  void qOrlando;

  return out;
}

// Insere os dados de exemplo usando o cliente do usuário logado (a segurança do banco preenche o dono).
export async function insertSample(db: { from: (t: string) => any }, today: string): Promise<string | null> {
  const d = buildSampleData(today);
  const steps: [string, Record<string, unknown>[]][] = [
    ["tf_customers", d.customers],
    ["tf_quotations", d.quotations],
    ["tf_quotation_items", d.quotationItems],
    ["tf_itineraries", d.itineraries],
    ["tf_itinerary_days", d.itineraryDays],
    ["tf_itinerary_items", d.itineraryItems],
    ["tf_proposals", d.proposals],
  ];
  for (const [table, rows] of steps) {
    const { error } = await db.from(table).insert(rows);
    if (error) return error.message as string;
  }
  return null;
}

// Apaga somente o que foi criado como exemplo (itens, dias etc. caem junto por cascata).
export async function deleteSample(db: { from: (t: string) => any }): Promise<string | null> {
  for (const table of ["tf_proposals", "tf_itineraries", "tf_quotations", "tf_customers"]) {
    const { error } = await db.from(table).delete().eq("is_sample", true);
    if (error) return error.message as string;
  }
  return null;
}
