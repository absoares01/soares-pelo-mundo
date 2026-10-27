import { extractJson, normalizeUrl, researchWeb } from "./ai";
import { isValidISODate, todayISO } from "./dates";
import type {
  DataOrigin,
  DiscountOffer,
  DiscountsResult,
  FareRules,
  FeeKey,
  FeeLine,
  FeeStatus,
  OfferKind,
  SearchMeta,
  Source,
  SourceKind,
} from "./types";

// ============ Funções puras (testáveis sem rede) ============

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const KINDS: OfferKind[] = [
  "cupom",
  "promocao_relampago",
  "estudante",
  "app",
  "fidelidade",
  "cartao",
  "newsletter",
  "regional",
  "outro",
];
const SOURCE_KINDS: SourceKind[] = ["oficial", "parceiro", "terceiro"];

function isHttps(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

// Valida e filtra as ofertas devolvidas pela IA. Regras:
//  - precisa ter link https que a busca de fato retornou (anti-invenção);
//  - descarta vencidas, sem fonte e de sites de terceiros (cupons "suspeitos");
//  - validade ausente é mantida, mas sinalizada na tela.
export function filterOffers(
  rawOffers: unknown,
  retrievedUrls: Set<string>,
  today: string = todayISO(),
): { offers: DiscountOffer[]; discarded: DiscountsResult["discarded"] } {
  const discarded = { expired: 0, noSource: 0, unretrievedUrl: 0, thirdParty: 0, invalid: 0 };
  const offers: DiscountOffer[] = [];
  const seen = new Set<string>();
  const list = Array.isArray(rawOffers) ? rawOffers : [];

  for (const r of list) {
    if (!isObj(r)) {
      discarded.invalid++;
      continue;
    }
    const title = str(r.title, 200);
    const sourceUrl = str(r.source_url, 1000);
    if (!title) {
      discarded.invalid++;
      continue;
    }
    if (!sourceUrl || !isHttps(sourceUrl)) {
      discarded.noSource++;
      continue;
    }
    if (!retrievedUrls.has(normalizeUrl(sourceUrl))) {
      discarded.unretrievedUrl++;
      continue;
    }
    const sourceKind = SOURCE_KINDS.includes(r.source_kind as SourceKind) ? (r.source_kind as SourceKind) : "terceiro";
    if (sourceKind === "terceiro") {
      discarded.thirdParty++;
      continue;
    }
    const vu = str(r.valid_until, 20);
    const validUntil = vu && isValidISODate(vu) ? vu : null;
    if (validUntil && validUntil < today) {
      discarded.expired++;
      continue;
    }
    const requirements = str(r.requirements);
    const evidence = str(r.evidence, 400);
    if (!requirements || !evidence) {
      discarded.invalid++;
      continue;
    }
    const dedupe = `${title.toLowerCase()}|${normalizeUrl(sourceUrl)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    offers.push({
      title,
      kind: KINDS.includes(r.kind as OfferKind) ? (r.kind as OfferKind) : "outro",
      code: str(r.code, 60) || null,
      sourceUrl,
      sourceTitle: str(r.source_title, 200) || sourceUrl,
      sourceKind,
      requirements,
      restrictions: str(r.restrictions) || "Não informadas pela fonte — confirmar antes de comprar.",
      validUntil,
      evidence,
    });
  }
  return { offers, discarded };
}

const FEE_KEYS: { key: FeeKey; label: string }[] = [
  { key: "bagagem_despachada", label: "Bagagem despachada" },
  { key: "bagagem_de_mao", label: "Bagagem de mão" },
  { key: "assento", label: "Escolha de assento" },
  { key: "forma_pagamento", label: "Forma de pagamento (taxa de cartão/parcelamento)" },
  { key: "embarque_prioritario", label: "Embarque prioritário" },
  { key: "refeicao", label: "Refeição a bordo" },
  { key: "checkin_aeroporto", label: "Check-in no aeroporto" },
  { key: "alteracoes", label: "Alterações de voo/data" },
  { key: "outros", label: "Outros adicionais" },
];
export const FEE_LABELS = FEE_KEYS;

const STATUSES: FeeStatus[] = ["incluido", "opcional", "inevitavel", "nao_informado"];

function sourceFor(r: Raw, retrieved: Set<string>, titles: Map<string, string>): Source | undefined {
  const url = str(r.source_url, 1000);
  if (!url || !isHttps(url)) return undefined;
  const n = normalizeUrl(url);
  if (!retrieved.has(n)) return undefined;
  return { url, title: str(r.source_title, 200) || titles.get(n) || url };
}

// Linhas de taxas devolvidas pela IA: o valor só é aceito se tiver fonte recuperada.
export function parseFeeLines(
  rawLines: unknown,
  retrieved: Set<string>,
  titles: Map<string, string> = new Map(),
): FeeLine[] {
  const out: FeeLine[] = [];
  const list = Array.isArray(rawLines) ? rawLines : [];
  for (const r of list) {
    if (!isObj(r)) continue;
    const meta = FEE_KEYS.find((k) => k.key === r.key);
    if (!meta) continue;
    const source = sourceFor(r, retrieved, titles);
    let status: FeeStatus = STATUSES.includes(r.status as FeeStatus) ? (r.status as FeeStatus) : "nao_informado";
    let amount = numOrNull(r.amount);
    if (!source) {
      // sem fonte verificável: não aceitamos valor nem classificação
      amount = null;
      status = "nao_informado";
    }
    out.push({
      key: meta.key,
      label: meta.label,
      status,
      amount,
      basis: r.basis === "por_viagem" ? "por_viagem" : "por_trecho",
      origin: "ia",
      source,
      note: str(r.note, 300) || undefined,
    });
  }
  return out;
}

export function parseFareRules(raw: unknown, retrieved: Set<string>, titles: Map<string, string> = new Map()): FareRules {
  const r = isObj(raw) ? raw : {};
  const sources: Source[] = [];
  const rawSources = Array.isArray(r.sources) ? r.sources : [];
  for (const s of rawSources) {
    if (!isObj(s)) continue;
    const src = sourceFor(s, retrieved, titles);
    if (src && !sources.some((x) => x.url === src.url)) sources.push(src);
  }
  const hasSource = sources.length > 0;
  // Sem nenhuma fonte recuperada, não aceitamos nenhum valor numérico da IA.
  const n = (v: unknown) => (hasSource ? numOrNull(v) : null);
  const pick = <T extends string>(v: unknown, allowed: T[], fallback: T): T =>
    hasSource && allowed.includes(v as T) ? (v as T) : fallback;

  const refundPct = n(r.refund_pct);
  return {
    changeAllowed: pick(r.change_allowed, ["sim", "nao", "nao_informado"], "nao_informado"),
    changeFee: n(r.change_fee),
    refundable: pick(r.refundable, ["sim", "parcial", "nao", "nao_informado"], "nao_informado"),
    refundPct: refundPct === null ? null : Math.min(100, refundPct),
    cancelFee: n(r.cancel_fee),
    noShowRule: hasSource ? str(r.no_show_rule) || "Não informado pela fonte." : "Não informado pela fonte.",
    creditValidityMonths: n(r.credit_validity_months),
    baggageOnlineFee: n(r.baggage_online_fee),
    baggageAirportFee: n(r.baggage_airport_fee),
    restrictions: hasSource && Array.isArray(r.restrictions) ? r.restrictions.map((x) => str(x, 300)).filter(Boolean).slice(0, 12) : [],
    sources,
    origin: "ia" as DataOrigin,
  };
}

// ============ Pesquisas com IA (usam rede) ============

const COMMON_RULES = `Regras obrigatórias:
- Use a ferramenta de busca na web. Priorize páginas OFICIAIS da companhia aérea, do programa de fidelidade ou do emissor do cartão.
- Informe SOMENTE o que estiver escrito nas páginas que você encontrou. Nunca estime, deduza ou complete valores de memória.
- Cada item precisa de "source_url" (a URL exata da página encontrada) e "source_title".
- Se não achar um dado, use null (números) ou "nao_informado". Isso é melhor do que chutar.
- Responda ao final com UM único bloco JSON, sem texto fora do bloco.`;

function meta(currency: string, searches: number, warnings: string[] = []): SearchMeta {
  return { mock: false, searchedAt: new Date().toISOString(), currency, creditsUsed: 0, aiSearches: searches, warnings };
}

export async function researchDiscounts(input: {
  target: string;
  route?: string;
  travelDate?: string;
}): Promise<DiscountsResult> {
  const today = todayISO();
  const system = `Você pesquisa descontos ATIVOS em passagens aéreas para uma consultora de viagens brasileira. Hoje é ${today}.
${COMMON_RULES}
- Procure: cupons oficiais, promoções relâmpago, tarifas de estudante, ofertas exclusivas de app, descontos de fidelidade, parcerias com cartão, ofertas de newsletter e promoções regionais.
- Para cada oferta informe: fonte, requisitos, validade (valid_until em AAAA-MM-DD, ou null se a fonte não disser) e restrições.
- "source_kind": "oficial" (site da companhia/programa), "parceiro" (banco/cartão/programa parceiro citado pela companhia) ou "terceiro" (blog, agregador de cupons, fórum).
- Ignore ofertas vencidas, suspeitas ou que não dê para verificar. Não inclua cupons de sites de terceiros sem confirmação oficial.
- "evidence": cite um trecho curto da fonte que comprova a oferta.
Formato: {"offers":[{"title","kind":"cupom|promocao_relampago|estudante|app|fidelidade|cartao|newsletter|regional|outro","code":null,"source_url","source_title","source_kind","requirements","restrictions","valid_until","evidence"}],"notes":["observações curtas, se houver"]}`;
  const user = `Busque descontos ativos agora para voos com: ${input.target}${input.route ? ` (rota: ${input.route})` : ""}${input.travelDate ? `. Data de viagem de interesse: ${input.travelDate}` : ""}. Mostre só os descontos que eu conseguiria usar de verdade.`;

  const r = await researchWeb({ system, user, maxSearches: 8, maxTokens: 5000 });
  const parsed = extractJson(r.text) as Raw;
  const { offers, discarded } = filterOffers(parsed.offers, r.urls, today);
  const notes = Array.isArray(parsed.notes) ? parsed.notes.map((x) => str(x, 300)).filter(Boolean).slice(0, 6) : [];

  const m = meta("BRL", r.searches);
  if (offers.length === 0) {
    m.warnings.push("Nenhum desconto confiável e verificável foi encontrado agora. Isso é normal: melhor mostrar nada do que um cupom duvidoso.");
  }
  return {
    meta: m,
    query: { target: input.target, route: input.route, travelDate: input.travelDate },
    offers,
    discarded,
    notes,
  };
}

export async function researchFees(input: { airline: string; route?: string; currency: string }): Promise<{
  lines: FeeLine[];
  searches: number;
  notes: string[];
}> {
  const system = `Você pesquisa a tabela PUBLICADA de taxas e serviços pagos de uma companhia aérea, para uma consultora brasileira.
${COMMON_RULES}
- Categorias ("key"): bagagem_despachada, bagagem_de_mao, assento, forma_pagamento, embarque_prioritario, refeicao, checkin_aeroporto, alteracoes, outros.
- "status": "incluido" (já vem na tarifa básica), "opcional" (cobrado só se o passageiro quiser), "inevitavel" (cobrado sempre, nessa tarifa) ou "nao_informado".
- "amount": valor numérico por passageiro na moeda ${input.currency}, só se a página indicar o valor nessa moeda. Se a página usar outra moeda, use null e explique em "note".
- "basis": "por_trecho" ou "por_viagem".
Formato: {"lines":[{"key","status","amount","basis","source_url","source_title","note"}],"notes":[]}`;
  const user = `Companhia: ${input.airline}${input.route ? `. Rota/mercado: ${input.route}` : ""}. Levante as taxas e serviços pagos da tarifa mais básica (econômica promocional) em cada categoria.`;

  const r = await researchWeb({ system, user, maxSearches: 6, maxTokens: 4000 });
  const parsed = extractJson(r.text) as Raw;
  return {
    lines: parseFeeLines(parsed.lines, r.urls, r.titles),
    searches: r.searches,
    notes: Array.isArray(parsed.notes) ? parsed.notes.map((x) => str(x, 300)).filter(Boolean).slice(0, 6) : [],
  };
}

export async function researchFareRules(input: { airline: string; fareHint?: string; route?: string; currency: string }): Promise<{
  rules: FareRules;
  searches: number;
}> {
  const system = `Você pesquisa as regras PUBLICADAS de alteração, cancelamento, reembolso, no-show e bagagem de uma tarifa aérea, para uma consultora brasileira.
${COMMON_RULES}
- Valores monetários por passageiro, na moeda ${input.currency}, só se a página indicar nessa moeda; senão null.
- "refund_pct": percentual da tarifa devolvido em caso de cancelamento (0 a 100), só se a página disser.
- "restrictions": condições restritivas, taxas não reembolsáveis, créditos com validade e outras letras miúdas, em frases curtas.
Formato: {"change_allowed":"sim|nao|nao_informado","change_fee":null,"refundable":"sim|parcial|nao|nao_informado","refund_pct":null,"cancel_fee":null,"no_show_rule":"","credit_validity_months":null,"baggage_online_fee":null,"baggage_airport_fee":null,"restrictions":[],"sources":[{"source_url","source_title"}]}`;
  const user = `Companhia: ${input.airline}${input.fareHint ? `. Tarifa/família: ${input.fareHint}` : ". Tarifa mais básica/promocional"}${input.route ? `. Rota/mercado: ${input.route}` : ""}.`;

  const r = await researchWeb({ system, user, maxSearches: 6, maxTokens: 4000 });
  return { rules: parseFareRules(extractJson(r.text), r.urls, r.titles), searches: r.searches };
}
