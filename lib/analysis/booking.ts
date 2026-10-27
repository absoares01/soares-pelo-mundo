import type { BookingOption, FareOption, FeeLine } from "../types";

// Interpretação CONSERVADORA das opções de reserva da SerpApi (booking_options).
// Os textos de bagagem da fonte são sempre mostrados na íntegra; só viram valor
// quando o texto traz um número claro. Na dúvida, o item fica "não informado".

export function toTextArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? Object.values(x as object).filter((y) => typeof y === "string").join(" ") : ""))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (v && typeof v === "object") {
    return Object.values(v as Record<string, unknown>).flatMap((x) => toTextArray(x));
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// Lê "R$ 1.234,56", "$1,234.56", "BRL 120" etc. Devolve null se não houver número claro.
export function parseMoney(text: string): number | null {
  const m = text.match(/(?:R\$|US\$|USD|BRL|EUR|€|\$)\s*([\d][\d.,]*)|([\d][\d.,]*)\s*(?:R\$|USD|BRL|EUR|€)/i);
  const raw = m ? (m[1] ?? m[2]) : null;
  if (!raw) return null;
  let s = raw.replace(/[.,]+$/, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    const dec = lastDot > lastComma ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = s.split(thou).join("").replace(dec, ".");
  } else if (lastComma !== -1) {
    s = /,\d{2}$/.test(s) ? s.replace(",", ".") : s.split(",").join("");
  } else if (lastDot !== -1) {
    s = /\.\d{1,2}$/.test(s) ? s : s.split(".").join("");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const CHECKED = /(checked|despachad)/i;
const CARRY = /(carry[- ]?on|de m[aã]o|cabin|cabine)/i;
const INCLUDED = /(included|free|gr[aá]tis|inclu[ií]d|no extra charge)/i;
const NOT_FIRST = /(2nd|second|segunda|2[ªº])/i;

export function feeLinesFromBooking(
  options: BookingOption[],
  topBaggage: string[],
  fare: FareOption,
): FeeLine[] {
  const texts = Array.from(new Set([...topBaggage, ...options.flatMap((o) => o.baggage)]));
  const lines: FeeLine[] = [];

  const build = (key: "bagagem_despachada" | "bagagem_de_mao", label: string, re: RegExp) => {
    const hits = texts.filter((t) => re.test(t) && !NOT_FIRST.test(t));
    if (hits.length === 0) return;
    const first = hits[0];
    const included = INCLUDED.test(first);
    const amount = included ? null : parseMoney(first);
    lines.push({
      key,
      label,
      status: included ? "incluido" : amount !== null ? "opcional" : "nao_informado",
      amount,
      basis: "por_trecho",
      origin: "serpapi",
      note: `Texto da fonte: "${first}". Confirme com a companhia.`,
    });
  };
  build("bagagem_despachada", "Bagagem despachada", CHECKED);
  build("bagagem_de_mao", "Bagagem de mão", CARRY);
  void fare;
  return lines;
}

// Junta as linhas de origens diferentes. Prioridade: manual > SerpApi > IA.
export function mergeFeeLines(groups: FeeLine[][]): FeeLine[] {
  const rank = { manual: 3, serpapi: 2, ia: 1 } as const;
  const by = new Map<string, FeeLine>();
  for (const line of groups.flat()) {
    const prev = by.get(line.key);
    const better =
      !prev ||
      rank[line.origin] > rank[prev.origin] ||
      (rank[line.origin] === rank[prev.origin] && prev.amount === null && line.amount !== null);
    if (better) by.set(line.key, line);
  }
  return Array.from(by.values());
}
