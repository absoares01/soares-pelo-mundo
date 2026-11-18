import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, LinkButton, Notice, PageHeader } from "@/components/ui";
import { explainDbError } from "@/lib/db";
import { dateRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/lib/types";

export const metadata: Metadata = { title: "Roteiros" };

type Row = Itinerary & { tf_customers: { name: string } | null; tf_itinerary_days: { count: number }[] };

export default async function ItinerariesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tf_itineraries")
    .select("*, tf_customers(name), tf_itinerary_days(count)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <PageHeader
        title="Roteiros"
        subtitle="Programação dia a dia, pronta para virar um PDF elegante."
        actions={<LinkButton href="/roteiros/novo">+ Novo roteiro</LinkButton>}
      />
      {error && <Notice tone="red" className="mb-4">{explainDbError(error)}</Notice>}
      {rows.length === 0 && !error ? (
        <EmptyState
          icon="🗺️"
          title="Nenhum roteiro ainda"
          text="Crie um roteiro com atividades, restaurantes, transportes e dicas, organizados por dia."
          action={<LinkButton href="/roteiros/novo">+ Criar roteiro</LinkButton>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/roteiros/${r.id}`} className="group rounded-2xl border border-navy-100 bg-white p-4 shadow-sm shadow-navy-900/5 transition hover:border-sky-400 hover:shadow-md">
              <p className="text-3xl">🗺️</p>
              <p className="mt-2 truncate font-semibold text-navy-900 group-hover:text-sky-700">{r.title}</p>
              <p className="truncate text-xs text-navy-500">{[r.destination, r.tf_customers?.name].filter(Boolean).join(" · ") || "Sem destino"}</p>
              <p className="mt-2 text-xs text-navy-500">{dateRange(r.start_date, r.end_date)}</p>
              <p className="mt-1 text-xs font-semibold text-navy-700">{r.tf_itinerary_days?.[0]?.count ?? 0} dia(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
