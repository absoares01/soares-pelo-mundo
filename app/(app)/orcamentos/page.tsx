import type { Metadata } from "next";
import { EmptyState, LinkButton, Notice, PageHeader } from "@/components/ui";
import { QuotationList, type QuotationRow } from "@/components/quotations/QuotationList";
import { explainDbError } from "@/lib/db";
import { QUOTATION_STATUS_ORDER } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Quotation, QuotationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orçamentos" };

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tf_quotations")
    .select("*, tf_customers(name)")
    .order("created_at", { ascending: false });

  const rows: QuotationRow[] = ((data ?? []) as (Quotation & { tf_customers: { name: string } | null })[]).map((r) => {
    const { tf_customers, ...rest } = r;
    return { ...rest, customer_name: tf_customers?.name ?? null };
  });
  const initial =
    sp.status === "ativos" ? "ativos" : QUOTATION_STATUS_ORDER.includes(sp.status as QuotationStatus) ? (sp.status as QuotationStatus) : "todos";

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Monte cotações com custos, margem e preço final calculados automaticamente."
        actions={<LinkButton href="/orcamentos/novo">+ Novo orçamento</LinkButton>}
      />
      {error && <Notice tone="red" className="mb-4">{explainDbError(error)}</Notice>}
      {rows.length === 0 && !error ? (
        <EmptyState
          icon="🧮"
          title="Nenhum orçamento ainda"
          text="Crie o primeiro orçamento: adicione voos, hospedagem e passeios e veja lucro e margem em tempo real."
          action={<LinkButton href="/orcamentos/novo">+ Criar orçamento</LinkButton>}
        />
      ) : (
        <QuotationList rows={rows} initialFilter={initial} />
      )}
    </div>
  );
}
