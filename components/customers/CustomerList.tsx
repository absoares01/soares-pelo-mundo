"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, cx, inputCls } from "@/components/ui";
import { dateBR, initials, moneyCompact } from "@/lib/format";
import { CUSTOMER_STATUS, CUSTOMER_STATUS_ORDER } from "@/lib/labels";
import type { Customer, CustomerStatus } from "@/lib/types";

export function CustomerList({ customers, initialStatus }: { customers: Customer[]; initialStatus?: CustomerStatus | null }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "todos">(initialStatus ?? "todos");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of customers) c[x.status] = (c[x.status] ?? 0) + 1;
    return c;
  }, [customers]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (status !== "todos" && c.status !== status) return false;
      if (!t) return true;
      return [c.name, c.email, c.phone, c.city, c.travel_style].some((v) => (v ?? "").toLowerCase().includes(t));
    });
  }, [customers, q, status]);

  const chip = (active: boolean) =>
    cx(
      "rounded-full border px-3 py-1 text-xs font-semibold transition",
      active ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-700 hover:bg-navy-50",
    );

  return (
    <div className="space-y-4">
      <input
        className={cx(inputCls, "max-w-md")}
        placeholder="Buscar por nome, e-mail, telefone ou cidade…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar clientes"
      />
      <div className="flex flex-wrap gap-2">
        <button className={chip(status === "todos")} onClick={() => setStatus("todos")}>
          Todos ({customers.length})
        </button>
        {CUSTOMER_STATUS_ORDER.map((s) => (
          <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>
            {CUSTOMER_STATUS[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy-200 bg-white/70 p-6 text-center text-sm text-navy-600">
          Nenhum cliente encontrado com esses filtros.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="group rounded-2xl border border-navy-100 bg-white p-4 shadow-sm shadow-navy-900/5 transition hover:border-sky-400 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-100 font-semibold text-navy-800">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900 group-hover:text-sky-700">{c.name}</p>
                  <p className="truncate text-xs text-navy-500">{c.email || c.phone || "Sem contato cadastrado"}</p>
                </div>
                <Badge tone={CUSTOMER_STATUS[c.status].tone}>{CUSTOMER_STATUS[c.status].label}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
                <div>
                  <dt className="text-navy-400">Oportunidade</dt>
                  <dd className="font-semibold text-navy-800">{c.opportunity_cents ? moneyCompact(c.opportunity_cents) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-navy-400">Próximo contato</dt>
                  <dd className="font-semibold text-navy-800">{c.next_followup ? dateBR(c.next_followup) : "—"}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
