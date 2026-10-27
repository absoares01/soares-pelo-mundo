"use client";

import { useState } from "react";
import { fareFromItem, manualFare } from "@/lib/fares";
import { formatMoney } from "@/lib/format";
import type { FareOption } from "@/lib/types";
import { useCart } from "./CartProvider";
import { Badge, Button, Card, Field, inputCls } from "./ui";

const MAX_FARES = 4;

// Escolha das tarifas a analisar (módulos 5 e 6): opções da proposta/cesta ou tarifas digitadas à mão.
export function FarePicker({ fares, setFares }: { fares: FareOption[]; setFares: (f: FareOption[]) => void }) {
  const { items } = useCart();
  const [m, setM] = useState({ airline: "", price: "", currency: "BRL", adults: 1, roundTrip: true, stops: 0 });

  const selectedIds = new Set(fares.map((f) => f.id));
  const full = fares.length >= MAX_FARES;

  function toggle(id: string) {
    if (selectedIds.has(id)) return setFares(fares.filter((f) => f.id !== id));
    const item = items.find((i) => i.id === id);
    if (!item || full || item.flight.price === null) return;
    setFares([...fares, fareFromItem(item)]);
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(m.price);
    if (!m.airline.trim() || !Number.isFinite(price) || price <= 0 || full) return;
    setFares([...fares, manualFare({ airline: m.airline.trim(), price, currency: m.currency, adults: m.adults, roundTrip: m.roundTrip, stops: m.stops })]);
    setM({ ...m, airline: "", price: "" });
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Tarifas a analisar (até {MAX_FARES})</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Escolha opções que você já adicionou à proposta nas buscas, ou digite uma tarifa que viu no site da companhia.
        </p>
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Da sua proposta/cesta</p>
          {items.map((i) => {
            const disabled = i.flight.price === null || (!selectedIds.has(i.id) && full);
            return (
              <label key={i.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-800">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-teal-600"
                  checked={selectedIds.has(i.id)}
                  disabled={disabled}
                  onChange={() => toggle(i.id)}
                />
                <span>
                  {i.flight.airlines.join(" + ") || "Companhia"} · {i.flight.origin}→{i.flight.destination} ·{" "}
                  <strong>{formatMoney(i.flight.price, i.flight.currency)}</strong>
                  {i.context.returnDate ? " (ida e volta)" : " (só ida)"} {i.mock && <Badge tone="red">exemplo</Badge>}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <form onSubmit={addManual} className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <p className="text-xs font-semibold">Digitar uma tarifa</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Companhia" className="sm:col-span-2">
            <input className={inputCls} value={m.airline} onChange={(e) => setM({ ...m, airline: e.target.value })} placeholder="LATAM" />
          </Field>
          <Field label="Preço total (todos)">
            <input type="number" min={1} className={inputCls} value={m.price} onChange={(e) => setM({ ...m, price: e.target.value })} />
          </Field>
          <Field label="Moeda">
            <select className={inputCls} value={m.currency} onChange={(e) => setM({ ...m, currency: e.target.value })}>
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
          <Field label="Passageiros">
            <input type="number" min={1} max={9} className={inputCls} value={m.adults} onChange={(e) => setM({ ...m, adults: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })} />
          </Field>
          <Field label="Escalas">
            <input type="number" min={0} max={3} className={inputCls} value={m.stops} onChange={(e) => setM({ ...m, stops: Math.max(0, Math.min(3, Number(e.target.value) || 0)) })} />
          </Field>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" checked={m.roundTrip} onChange={(e) => setM({ ...m, roundTrip: e.target.checked })} className="h-4 w-4 accent-teal-600" />
            Ida e volta
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" disabled={full}>
              + Adicionar tarifa
            </Button>
          </div>
        </div>
      </form>

      {fares.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fares.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900 dark:bg-teal-900/30 dark:text-teal-200">
              {f.label}
              <button type="button" aria-label="Remover" className="ml-1 font-bold" onClick={() => setFares(fares.filter((x) => x.id !== f.id))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
