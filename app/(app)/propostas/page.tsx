import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, LinkButton, Notice, PageHeader } from "@/components/ui";
import { explainDbError } from "@/lib/db";
import { dateBR, money } from "@/lib/format";
import { PROPOSAL_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/types";

export const metadata: Metadata = { title: "Propostas" };

type Row = Proposal & { tf_customers: { name: string } | null; tf_quotations: { code: string; total_price_cents: number; currency: string } | null };

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tf_proposals")
    .select("*, tf_customers(name), tf_quotations(code,total_price_cents,currency)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <PageHeader
        title="Propostas"
        subtitle="Propostas com a sua marca, prontas para enviar por link ou baixar em PDF."
        actions={<LinkButton href="/propostas/nova">+ Nova proposta</LinkButton>}
      />
      {error && <Notice tone="red" className="mb-4">{explainDbError(error)}</Notice>}
      {rows.length === 0 && !error ? (
        <EmptyState
          icon="📨"
          title="Nenhuma proposta ainda"
          text="Crie uma proposta a partir de um orçamento e compartilhe um link elegante com o seu cliente."
          action={<LinkButton href="/propostas/nova">+ Criar proposta</LinkButton>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm shadow-navy-900/5">
          <ul className="divide-y divide-navy-100">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/propostas/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-navy-50/60">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">{r.title}</p>
                    <p className="truncate text-xs text-navy-500">
                      {[r.tf_customers?.name, r.tf_quotations?.code, r.valid_until ? `válida até ${dateBR(r.valid_until)}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.tf_quotations && <span className="text-sm font-semibold text-navy-900">{money(r.tf_quotations.total_price_cents, r.tf_quotations.currency)}</span>}
                    <Badge tone={PROPOSAL_STATUS[r.status].tone}>{PROPOSAL_STATUS[r.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
