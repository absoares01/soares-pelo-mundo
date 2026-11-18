// Indicadores do painel (funções puras, testáveis). Dinheiro em centavos.

import { daysBetween } from "./format";
import type { CustomerStatus, ProposalStatus, QuotationStatus } from "./types";

export interface DQuotation {
  id: string;
  code: string;
  title: string;
  destination: string | null;
  status: QuotationStatus;
  start_date: string | null;
  end_date: string | null;
  total_price_cents: number;
  total_cost_cents: number;
  customer_name: string | null;
  updated_at: string;
}

export interface DashboardStats {
  customers: number;
  activeQuotations: number;
  confirmedTrips: number;
  pendingProposals: number;
  revenue: number; // soma do preço das viagens confirmadas
  profit: number; // receita − custos das viagens confirmadas
  pipeline: number; // valor dos orçamentos ativos (rascunho + enviado)
  marginPct: number;
  upcoming: (DQuotation & { daysLeft: number })[];
  recent: DQuotation[];
  customersByStatus: Record<CustomerStatus, number>;
}

export function computeDashboard(
  customers: { status: CustomerStatus }[],
  quotations: DQuotation[],
  proposals: { status: ProposalStatus }[],
  today: string,
): DashboardStats {
  const confirmed = quotations.filter((q) => q.status === "confirmado");
  const active = quotations.filter((q) => q.status === "rascunho" || q.status === "enviado");
  const revenue = confirmed.reduce((s, q) => s + q.total_price_cents, 0);
  const cost = confirmed.reduce((s, q) => s + q.total_cost_cents, 0);
  const byStatus: Record<CustomerStatus, number> = { lead: 0, em_contato: 0, proposta_enviada: 0, negociacao: 0, cliente: 0, perdido: 0 };
  for (const c of customers) byStatus[c.status]++;

  return {
    customers: customers.length,
    activeQuotations: active.length,
    confirmedTrips: confirmed.length,
    pendingProposals: proposals.filter((p) => p.status === "enviada").length,
    revenue,
    profit: revenue - cost,
    pipeline: active.reduce((s, q) => s + q.total_price_cents, 0),
    marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    upcoming: confirmed
      .filter((q) => q.start_date && q.start_date >= today)
      .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))
      .slice(0, 6)
      .map((q) => ({ ...q, daysLeft: daysBetween(today, q.start_date!) })),
    recent: quotations.slice().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 5),
    customersByStatus: byStatus,
  };
}
