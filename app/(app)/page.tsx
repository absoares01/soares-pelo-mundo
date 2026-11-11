import type { Metadata } from "next";
import Link from "next/link";
import { SampleDataButtons } from "@/components/SampleDataButtons";
import { Badge, Card, cx, LinkButton, Notice, PageHeader } from "@/components/ui";
import { computeDashboard, type DQuotation } from "@/lib/dashboard";
import { getProfile, getUser } from "@/lib/data";
import { explainDbError } from "@/lib/db";
import { dateBR, money, moneyCompact, pct, todayISO } from "@/lib/format";
import { CUSTOMER_STATUS, CUSTOMER_STATUS_ORDER, QUOTATION_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { CustomerStatus, ProposalStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Painel" };

function Stat({ href, label, value, hint, icon }: { href: string; label: string; value: string; hint?: string; icon: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-navy-100 bg-white p-4 shadow-sm shadow-navy-900/5 transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
        <span className="text-xl" aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-navy-900 group-hover:text-sky-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getUser();
  const profile = await getProfile(user!);
  const supabase = await createClient();
  const today = todayISO();

  const [c, q, p, sample] = await Promise.all([
    supabase.from("tf_customers").select("status"),
    supabase
      .from("tf_quotations")
      .select("id,code,title,destination,status,start_date,end_date,total_price_cents,total_cost_cents,updated_at,tf_customers(name)"),
    supabase.from("tf_proposals").select("status"),
    supabase.from("tf_customers").select("id", { count: "exact", head: true }).eq("is_sample", true),
  ]);
  const error = c.error ?? q.error ?? p.error;

  const quotations: DQuotation[] = ((q.data ?? []) as any[]).map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    destination: r.destination,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    total_price_cents: r.total_price_cents,
    total_cost_cents: r.total_cost_cents,
    updated_at: r.updated_at,
    customer_name: r.tf_customers?.name ?? null,
  }));
  const customers = (c.data ?? []) as { status: CustomerStatus }[];
  const s = computeDashboard(customers, quotations, (p.data ?? []) as { status: ProposalStatus }[], today);
  const currency = profile.currency || "BRL";
  const empty = customers.length === 0 && quotations.length === 0;
  const firstName = (profile.full_name ?? "").split(" ")[0];
  const maxStatus = Math.max(1, ...CUSTOMER_STATUS_ORDER.map((k) => s.customersByStatus[k]));

  return (
    <div>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Painel"}
        subtitle="Visão geral da sua operação de viagens."
        actions={
          <>
            <LinkButton href="/clientes/novo" variant="secondary">+ Cliente</LinkButton>
            <LinkButton href="/orcamentos/novo" variant="secondary">+ Orçamento</LinkButton>
            <LinkButton href="/roteiros/novo" variant="secondary">+ Roteiro</LinkButton>
            <LinkButton href="/propostas/nova">+ Proposta</LinkButton>
          </>
        }
      />

      {error && <Notice tone="red" className="mb-4">{explainDbError(error)}</Notice>}

      {empty && !error && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Bem-vindo ao TripFlow ✈️</h2>
          <p className="mt-2 max-w-xl text-sm text-navy-100">
            Seu painel ainda está vazio. Carregue clientes, orçamentos, um roteiro e propostas de exemplo para explorar tudo em 1 minuto. Você remove com um clique quando quiser.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SampleDataButtons hasSample={false} />
            <Link href="/configuracoes" className="text-sm font-semibold text-sky-200 underline-offset-2 hover:underline">
              Configurar minha assessoria →
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat href="/clientes" icon="👥" label="Clientes" value={String(s.customers)} hint={`${s.customersByStatus.cliente} já viajaram com você`} />
        <Stat href="/orcamentos?status=ativos" icon="🧮" label="Orçamentos ativos" value={String(s.activeQuotations)} hint={`${moneyCompact(s.pipeline, currency)} em negociação`} />
        <Stat href="/orcamentos?status=confirmado" icon="✅" label="Viagens confirmadas" value={String(s.confirmedTrips)} hint="Orçamentos confirmados" />
        <Stat href="/propostas" icon="📨" label="Propostas pendentes" value={String(s.pendingProposals)} hint="Enviadas, aguardando resposta" />
        <Stat href="/orcamentos?status=confirmado" icon="💰" label="Receita" value={moneyCompact(s.revenue, currency)} hint="Viagens confirmadas" />
        <Stat href="/orcamentos?status=confirmado" icon="📈" label="Lucro estimado" value={moneyCompact(s.profit, currency)} hint={s.revenue > 0 ? `Margem de ${pct(s.marginPct)}` : "Sem viagens confirmadas"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Próximas partidas</h2>
            <Link href="/orcamentos?status=confirmado" className="text-xs font-semibold text-sky-700 hover:underline">Ver confirmadas</Link>
          </div>
          {s.upcoming.length === 0 ? (
            <p className="rounded-lg bg-navy-50 p-4 text-sm text-navy-600">Nenhuma viagem confirmada com partida futura.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {s.upcoming.map((u) => (
                <li key={u.id}>
                  <Link href={`/orcamentos/${u.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-sky-700">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-navy-900 text-white">
                        <span className="font-display text-base font-semibold leading-none">{u.daysLeft}</span>
                        <span className="text-[9px] uppercase text-sky-200">{u.daysLeft === 1 ? "dia" : "dias"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-900">{u.title}</p>
                        <p className="truncate text-xs text-navy-500">{[u.customer_name, `Partida em ${dateBR(u.start_date)}`].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-navy-900">{money(u.total_price_cents, currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-navy-900">Funil de clientes</h2>
          <ul className="space-y-2.5">
            {CUSTOMER_STATUS_ORDER.map((k) => (
              <li key={k}>
                <Link href={`/clientes?status=${k}`} className="group block">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-navy-700 group-hover:text-sky-700">{CUSTOMER_STATUS[k].label}</span>
                    <span className="font-semibold text-navy-900">{s.customersByStatus[k]}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-100">
                    <div className={cx("h-full rounded-full", k === "perdido" ? "bg-red-400" : k === "cliente" ? "bg-emerald-500" : "bg-sky-500")} style={{ width: `${(s.customersByStatus[k] / maxStatus) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Orçamentos recentes</h2>
          <Link href="/orcamentos" className="text-xs font-semibold text-sky-700 hover:underline">Ver todos</Link>
        </div>
        {s.recent.length === 0 ? (
          <p className="rounded-lg bg-navy-50 p-4 text-sm text-navy-600">Nenhum orçamento ainda.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {s.recent.map((r) => (
              <li key={r.id}>
                <Link href={`/orcamentos/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-sky-700">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-900">{r.code} · {r.title}</p>
                    <p className="truncate text-xs text-navy-500">{[r.customer_name, r.destination].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-navy-900">{money(r.total_price_cents, currency)}</span>
                    <Badge tone={QUOTATION_STATUS[r.status].tone}>{QUOTATION_STATUS[r.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!empty && (sample.count ?? 0) > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-navy-200 bg-white/70 p-4 text-sm text-navy-600">
          <span>Você está vendo dados de exemplo misturados aos seus.</span>
          <SampleDataButtons hasSample compact />
        </div>
      )}
    </div>
  );
}
