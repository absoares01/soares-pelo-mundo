"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, cx, inputCls } from "@/components/ui";
import { dateRange, money, pct } from "@/lib/format";
import { QUOTATION_STATUS, QUOTATION_STATUS_ORDER } from "@/lib/labels";
import type { Quotation, QuotationStatus } from "@/lib/types";

export type QuotationRow = Quotation & { customer_name: string | null };
type Filter = QuotationStatus | "ativos" | "todos";

export function QuotationList({ rows, initialFilter }: { rows: QuotationRow[]; initialFilter: Filter }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ativos: 0 };
    for (const r of rows) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (r.status === "rascunho" || r.status === "enviado") c.ativos++;
    }
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "ativos" && !(r.status === "rascunho" || r.status === "enviado")) return false;
      if (filter !== "ativos" && filter !== "todos" && r.status !== filter) return false;
      if (!t) return true;
      return [r.title, r.code, r.destination, r.customer_name].some((v) => (v ?? "").toLowerCase().includes(t));
    });
  }, [rows, q, filter]);

  const chip = (active: boolean) =>
    cx(
      "rounded-full border px-3 py-1 text-xs font-semibold transition",
      active ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-700 hover:bg-navy-50",
    );

  return (
    <div className="space-y-4">
      <input className={cx(inputCls, "max-w-md")} placeholder="Buscar por título, código, destino ou cliente…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar orçamentos" />
      <div className="flex flex-wrap gap-2">
        <button className={chip(filter === "todos")} onClick={() => setFilter("todos")}>Todos ({rows.length})</button>
        <button className={chip(filter === "ativos")} onClick={() => setFilter("ativos")}>Ativos ({counts.ativos})</button>
        {QUOTATION_STATUS_ORDER.map((s) => (
          <button key={s} className={chip(filter === s)} onClick={() => setFilter(s)}>
            {QUOTATION_STATUS[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy-200 bg-white/70 p-6 text-center text-sm text-navy-600">Nenhum orçamento encontrado.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((r) => {
            const profit = r.total_price_cents - r.total_cost_cents;
            const margin = r.total_price_cents > 0 ? (profit / r.total_price_cents) * 100 : 0;
            return (
              <Link key={r.id} href={`/orcamentos/${r.id}`} className="group rounded-2xl border border-navy-100 bg-white p-4 shadow-sm shadow-navy-900/5 transition hover:border-sky-400 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy-400">{r.code}</p>
                    <p className="truncate font-semibold text-navy-900 group-hover:text-sky-700">{r.title}</p>
                    <p className="truncate text-xs text-navy-500">{[r.customer_name, r.destination].filter(Boolean).join(" · ") || "Sem cliente"}</p>
                  </div>
                  <Badge tone={QUOTATION_STATUS[r.status].tone}>{QUOTATION_STATUS[r.status].label}</Badge>
                </div>
                <p className="mt-2 text-xs text-navy-500">{dateRange(r.start_date, r.end_date)}</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="font-display text-xl font-semibold text-navy-900">{money(r.total_price_cents, r.currency)}</p>
                  <p className="text-right text-xs text-navy-500">
                    lucro <span className={cx("font-semibold", profit >= 0 ? "text-emerald-700" : "text-red-700")}>{money(profit, r.currency)}</span>
                    <br />
                    margem {pct(margin)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
