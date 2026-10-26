import { formatDateBR } from "./dates";
import { formatDateTimeBR, formatDuration, formatMoney, formatSearchedAt, formatStops } from "./format";
import type { Flight, ProposalItem } from "./types";

// Versão da opção que o CLIENTE vê: sem tokens internos e sem anotações do consultor.
export function sanitizeItem(item: ProposalItem): ProposalItem {
  const f = item.flight;
  const flight: Flight = {
    ...f,
    bookingToken: undefined,
    departureToken: undefined,
    extensions: [],
  };
  return { ...item, flight };
}

export interface ProposalView {
  title: string;
  clientName?: string | null;
  currency: string;
  items: ProposalItem[];
  serviceFee: number;
  message?: string | null;
  validUntil?: string | null;
  createdAt: string;
  mock: boolean;
}

export function proposalTotals(view: Pick<ProposalView, "items" | "serviceFee">) {
  const subtotal = view.items.reduce((s, i) => s + (i.flight.price ?? 0), 0);
  return { subtotal, total: subtotal + (view.serviceFee || 0) };
}

export function parseProposalItems(raw: unknown): ProposalItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) return null;
  const out: ProposalItem[] = [];
  for (const r of raw) {
    const it = r as Partial<ProposalItem>;
    if (!it || typeof it !== "object" || !it.flight || !Array.isArray(it.flight.segments) || !it.context) return null;
    if (typeof it.flight.price !== "number" || !Number.isFinite(it.flight.price)) return null;
    out.push(sanitizeItem(it as ProposalItem));
  }
  return out;
}

function legLine(f: Flight): string {
  const route = f.segments.map((s) => s.from).concat(f.segments[f.segments.length - 1].to).join(" → ");
  return `${route} · ${formatStops(f.stops)} · ${formatDuration(f.durationMin)}`;
}

// Texto pronto para colar no WhatsApp.
export function proposalToWhatsApp(view: ProposalView, link?: string): string {
  const { subtotal, total } = proposalTotals(view);
  const lines: string[] = [];
  lines.push(`✈️ *${view.title}*`);
  if (view.clientName) lines.push(`Olá, ${view.clientName}! Separei estas opções para você:`);
  lines.push("");
  view.items.forEach((it, i) => {
    const f = it.flight;
    lines.push(`*Opção ${i + 1}* — ${formatMoney(f.price, view.currency)}`);
    lines.push(`${f.airlines.join(" + ")} · ${legLine(f)}`);
    lines.push(
      `Ida: ${formatDateTimeBR(f.departure)}${it.context.returnDate ? ` · Volta a partir de ${formatDateBR(it.context.returnDate)}` : ""}`,
    );
    lines.push(`Bagagem: ${f.baggage.status === "incluida" ? "incluída" : "confirmar regra com a companhia"}`);
    lines.push("");
  });
  if (view.serviceFee > 0) {
    lines.push(`Subtotal: ${formatMoney(subtotal, view.currency)}`);
    lines.push(`Taxa de serviço: ${formatMoney(view.serviceFee, view.currency)}`);
  }
  if (view.items.length === 1 || view.serviceFee > 0) {
    lines.push(`*Total: ${formatMoney(total, view.currency)}*`);
  }
  lines.push("");
  lines.push(`Valores consultados em ${formatSearchedAt(view.items[0]?.searchedAt ?? view.createdAt)}. Preços e regras podem mudar até a emissão.`);
  if (view.validUntil) lines.push(`Proposta válida até ${formatDateBR(view.validUntil)}.`);
  if (view.mock) lines.push("⚠️ DADOS DE EXEMPLO — não é uma oferta real.");
  if (link) {
    lines.push("");
    lines.push(`Veja os detalhes: ${link}`);
  }
  return lines.join("\n");
}
