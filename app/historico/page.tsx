"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, Notice, PageTitle, Spinner } from "@/components/ui";
import { useConfig } from "@/components/useConfig";
import { formatSearchedAt } from "@/lib/format";

interface Row {
  id: string;
  module: string;
  title: string;
  mock: boolean;
  created_at: string;
  clients: { name: string } | { name: string }[] | null;
}

const moduleName: Record<string, string> = {
  datas: "Módulo 1",
  ocultos: "Módulo 2",
  escalas: "Módulo 3",
};

export default function HistoryPage() {
  const cfg = useConfig();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cfg?.database) return;
    fetch("/api/history")
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as { searches?: Row[]; error?: string };
        if (!r.ok) throw new Error(d.error ?? "Não foi possível carregar o histórico.");
        setRows(d.searches ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [cfg?.database]);

  if (cfg && !cfg.database) {
    return (
      <div className="space-y-5">
        <PageTitle title="Histórico" />
        <Notice tone="amber">Configure o Supabase (veja o README) para guardar o histórico de buscas.</Notice>
      </div>
    );
  }

  const clientName = (c: Row["clients"]) => (Array.isArray(c) ? c[0]?.name : c?.name);

  return (
    <div className="space-y-5">
      <PageTitle title="Histórico de buscas" subtitle="Reabra uma busca anterior sem gastar créditos da SerpApi. Lembre que os preços podem ter mudado." />
      {error && <Notice tone="red">{error}</Notice>}
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <p className="text-sm text-slate-500">Nenhuma busca salva ainda.</p>}
      <div className="space-y-2">
        {rows?.map((r) => (
          <Link key={r.id} href={`/historico/${r.id}`} className="block">
            <Card className="flex flex-wrap items-center justify-between gap-2 transition hover:border-teal-500">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-slate-500">
                  {formatSearchedAt(r.created_at)}
                  {clientName(r.clients) ? ` · ${clientName(r.clients)}` : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Badge>{moduleName[r.module] ?? r.module}</Badge>
                {r.mock && <Badge tone="red">Exemplo</Badge>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
