import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { DeleteButton } from "@/components/DeleteButton";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { dateBR, dateRange, money, whatsappLink } from "@/lib/format";
import { CUSTOMER_STATUS, PROPOSAL_STATUS, QUOTATION_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Itinerary, Proposal, Quotation } from "@/lib/types";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tf_customers").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const customer = data as Customer;

  const [q, it, pr] = await Promise.all([
    supabase.from("tf_quotations").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("tf_itineraries").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("tf_proposals").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  const quotations = (q.data ?? []) as Quotation[];
  const itineraries = (it.data ?? []) as Itinerary[];
  const proposals = (pr.data ?? []) as Proposal[];
  const trips = quotations.filter((x) => x.status === "confirmado");
  const wa = whatsappLink(customer.phone);

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={[customer.city, customer.source ? `Origem: ${customer.source}` : null].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Badge tone={CUSTOMER_STATUS[customer.status].tone}>{CUSTOMER_STATUS[customer.status].label}</Badge>
            {wa && (
              <a className="inline-flex items-center rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50" href={wa} target="_blank" rel="noreferrer noopener">
                WhatsApp
              </a>
            )}
            {customer.email && (
              <a className="inline-flex items-center rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50" href={`mailto:${customer.email}`}>
                E-mail
              </a>
            )}
            <LinkButton href={`/orcamentos/novo?cliente=${customer.id}`} variant="accent">
              + Novo orçamento
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <CustomerForm customer={customer} />

        <div className="space-y-5">
          <Card>
            <h2 className="text-lg font-semibold text-navy-900">Resumo</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-navy-500">Viagens confirmadas</dt><dd className="font-semibold">{trips.length}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-500">Orçamentos</dt><dd className="font-semibold">{quotations.length}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-500">Propostas</dt><dd className="font-semibold">{proposals.length}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-500">Próximo contato</dt><dd className="font-semibold">{dateBR(customer.next_followup)}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-navy-900">Histórico de viagens</h2>
            {trips.length === 0 ? (
              <p className="mt-2 text-sm text-navy-500">Nenhuma viagem confirmada ainda.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {trips.map((t) => (
                  <li key={t.id}>
                    <Link href={`/orcamentos/${t.id}`} className="font-semibold text-sky-700 hover:underline">{t.title}</Link>
                    <p className="text-xs text-navy-500">{dateRange(t.start_date, t.end_date)} · {money(t.total_price_cents, t.currency)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-navy-900">Orçamentos</h2>
            {quotations.length === 0 ? (
              <p className="mt-2 text-sm text-navy-500">Nenhum orçamento para este cliente.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {quotations.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2">
                    <Link href={`/orcamentos/${x.id}`} className="truncate font-medium text-navy-800 hover:text-sky-700">{x.code} · {x.title}</Link>
                    <Badge tone={QUOTATION_STATUS[x.status].tone}>{QUOTATION_STATUS[x.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-navy-900">Propostas e roteiros</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {proposals.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <Link href={`/propostas/${p.id}`} className="truncate font-medium text-navy-800 hover:text-sky-700">📄 {p.title}</Link>
                  <Badge tone={PROPOSAL_STATUS[p.status].tone}>{PROPOSAL_STATUS[p.status].label}</Badge>
                </li>
              ))}
              {itineraries.map((r) => (
                <li key={r.id}>
                  <Link href={`/roteiros/${r.id}`} className="font-medium text-navy-800 hover:text-sky-700">🗺️ {r.title}</Link>
                </li>
              ))}
              {proposals.length + itineraries.length === 0 && <li className="text-navy-500">Nada por aqui ainda.</li>}
            </ul>
          </Card>

          <DeleteButton
            table="tf_customers"
            id={customer.id}
            redirectTo="/clientes"
            confirmText={`Excluir ${customer.name}? Orçamentos, roteiros e propostas continuam salvos, mas ficam sem cliente. Esta ação não pode ser desfeita.`}
            label="Excluir cliente"
          />
        </div>
      </div>
    </div>
  );
}
