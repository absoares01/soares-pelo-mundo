"use client";

import { useMemo, useState } from "react";
import { FarePicker } from "@/components/FarePicker";
import { Badge, Button, Card, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { mergeFeeLines } from "@/lib/analysis/booking";
import { compareFees, computeFeeBreakdown, type FeeNeeds } from "@/lib/analysis/fees";
import { FEE_LABELS } from "@/lib/research";
import { formatMoney } from "@/lib/format";
import type { BookingOption, FareOption, FeeBasis, FeeKey, FeeLine, FeeStatus } from "@/lib/types";

interface ManualCell {
  status: FeeStatus | "";
  amount: string;
  basis: FeeBasis;
}
type ManualMap = Record<string, Record<string, ManualCell>>;

const STATUS_LABEL: Record<FeeStatus, string> = {
  incluido: "Incluído",
  opcional: "Opcional (cobrado se quiser)",
  inevitavel: "Inevitável",
  nao_informado: "Não informado",
};
const ORIGIN_LABEL = { serpapi: "SerpApi", ia: "IA + fonte", manual: "Digitado por você" } as const;

const NEED_KEYS: FeeKey[] = ["bagagem_despachada", "bagagem_de_mao", "assento", "forma_pagamento", "embarque_prioritario", "refeicao", "checkin_aeroporto"];

interface Lookup {
  lines: FeeLine[];
  bookingOptions: BookingOption[];
  notes: string[];
}

export default function FeesPage() {
  const [fares, setFares] = useState<FareOption[]>([]);
  const [needs, setNeeds] = useState<FeeNeeds>({ bagagem_despachada: true });
  const [lookups, setLookups] = useState<Record<string, Lookup>>({});
  const [manual, setManual] = useState<ManualMap>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function lookup(fare: FareOption) {
    setBusy(fare.id);
    setErrors((e) => ({ ...e, [fare.id]: "" }));
    try {
      const res = await fetch("/api/fees/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fare }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<Lookup> & { error?: string };
      if (!res.ok) throw new Error(d.error ?? `Erro ${res.status}`);
      setLookups((l) => ({ ...l, [fare.id]: { lines: d.lines ?? [], bookingOptions: d.bookingOptions ?? [], notes: d.notes ?? [] } }));
    } catch (e) {
      setErrors((x) => ({ ...x, [fare.id]: e instanceof Error ? e.message : "Falha na consulta." }));
    }
    setBusy(null);
  }

  function setCell(fareId: string, key: FeeKey, patch: Partial<ManualCell>) {
    setManual((m) => {
      const cur: ManualCell = m[fareId]?.[key] ?? { status: "", amount: "", basis: "por_trecho" };
      return { ...m, [fareId]: { ...(m[fareId] ?? {}), [key]: { ...cur, ...patch } } };
    });
  }

  function linesFor(fare: FareOption): FeeLine[] {
    const man: FeeLine[] = [];
    for (const { key, label } of FEE_LABELS) {
      const c = manual[fare.id]?.[key];
      if (!c || (c.status === "" && c.amount === "")) continue;
      const amount = c.amount === "" ? null : Number(c.amount);
      man.push({
        key,
        label,
        status: c.status === "" ? "nao_informado" : c.status,
        amount: amount !== null && Number.isFinite(amount) && amount >= 0 ? amount : null,
        basis: c.basis,
        origin: "manual",
      });
    }
    return mergeFeeLines([man, lookups[fare.id]?.lines ?? []]);
  }

  const breakdowns = useMemo(
    () => fares.map((f) => computeFeeBreakdown(f, linesFor(f), needs)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fares, needs, lookups, manual],
  );
  const cmp = useMemo(
    () => compareFees(breakdowns, (n) => formatMoney(n, fares[0]?.currency ?? "BRL")),
    [breakdowns, fares],
  );

  return (
    <div className="space-y-5">
      <PageTitle
        title="5. Onde a companhia cobra taxa"
        subtitle="Mostra o custo total real: tarifa + bagagem, assento e extras. Só soma valores que têm origem (fonte com link, SerpApi ou digitados por você). Valor sem fonte aparece como “não informado”, nunca como zero."
      />

      <FarePicker fares={fares} setFares={setFares} />

      <Card className="space-y-2">
        <h2 className="text-base font-bold">O que este cliente precisa?</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {NEED_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-600"
                checked={Boolean(needs[k])}
                onChange={(e) => setNeeds({ ...needs, [k]: e.target.checked })}
              />
              {FEE_LABELS.find((x) => x.key === k)?.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Taxas “inevitáveis” entram sempre. As “opcionais” só entram se marcadas aqui.
        </p>
      </Card>

      {fares.length > 0 && (
        <Notice tone={cmp.inverted ? "green" : "blue"}>
          <p className="font-semibold">{cmp.inverted ? "A mais barata no anúncio não é a mais barata no final" : "Resultado da comparação"}</p>
          <p className="mt-1">{cmp.message}</p>
        </Notice>
      )}

      {breakdowns.map((b) => {
        const fare = b.fare;
        const lk = lookups[fare.id];
        return (
          <Card key={fare.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">{fare.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fare.adults} passageiro(s) · {fare.roundTrip ? "ida e volta (2 trechos)" : "só ida"} ·{" "}
                  {fare.baggageIncluded === true ? "bagagem despachada incluída" : fare.baggageIncluded === false ? "bagagem despachada não incluída" : "bagagem: não informada pela fonte"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Anunciado {formatMoney(fare.price, fare.currency)}</p>
                <p className="text-xl font-bold">{formatMoney(b.finalPrice, fare.currency)}</p>
                <Badge tone={b.complete ? "green" : "amber"}>{b.complete ? "custo completo" : `${b.unknownCount} valor(es) não informado(s)`}</Badge>
              </div>
            </div>

            <Button variant="secondary" onClick={() => lookup(fare)} disabled={busy === fare.id}>
              {busy === fare.id ? "Consultando…" : "🔎 Buscar taxas (SerpApi + IA com fonte)"}
            </Button>
            {busy === fare.id && <Spinner label="Consultando… pode levar até 1–2 minutos." />}
            {errors[fare.id] && <Notice tone="red">{errors[fare.id]}</Notice>}
            {lk?.notes.map((n) => (
              <p key={n} className="text-xs text-amber-800 dark:text-amber-300">
                {n}
              </p>
            ))}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-1 pr-2">Taxa</th>
                    <th className="py-1 pr-2">Situação</th>
                    <th className="py-1 pr-2">Valor por passageiro</th>
                    <th className="py-1 pr-2">Origem</th>
                    <th className="py-1 text-right">Entra no custo</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_LABELS.map(({ key, label }) => {
                    const row = b.lines.find((r) => r.line.key === key);
                    const cell = manual[fare.id]?.[key] ?? { status: "", amount: "", basis: "por_trecho" as FeeBasis };
                    const shown = row?.line;
                    return (
                      <tr key={key} className="border-t border-slate-200 align-top dark:border-slate-800">
                        <td className="py-2 pr-2 font-medium">{label}</td>
                        <td className="py-2 pr-2">
                          <select
                            className={inputCls}
                            value={cell.status}
                            onChange={(e) => setCell(fare.id, key, { status: e.target.value as FeeStatus | "" })}
                          >
                            <option value="">{shown ? STATUS_LABEL[shown.status] : "— não informado —"}</option>
                            {(Object.keys(STATUS_LABEL) as FeeStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min={0}
                              className={inputCls}
                              placeholder={shown?.amount !== null && shown?.amount !== undefined ? String(shown.amount) : "—"}
                              value={cell.amount}
                              onChange={(e) => setCell(fare.id, key, { amount: e.target.value })}
                            />
                            <select
                              className={inputCls}
                              value={cell.basis}
                              onChange={(e) => setCell(fare.id, key, { basis: e.target.value as FeeBasis })}
                              aria-label="Base de cobrança"
                            >
                              <option value="por_trecho">/trecho</option>
                              <option value="por_viagem">/viagem</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-xs">
                          {shown ? (
                            <>
                              <Badge tone={shown.origin === "manual" ? "blue" : shown.origin === "serpapi" ? "slate" : "green"}>
                                {ORIGIN_LABEL[shown.origin]}
                              </Badge>
                              {shown.source && (
                                <a className="ml-1 underline" href={shown.source.url} target="_blank" rel="noreferrer noopener">
                                  fonte
                                </a>
                              )}
                              {shown.note && <p className="mt-1 text-slate-500 dark:text-slate-400">{shown.note}</p>}
                            </>
                          ) : (
                            <span className="text-slate-400">sem dado</span>
                          )}
                        </td>
                        <td className="py-2 text-right text-sm">
                          {row ? (
                            row.counted ? (
                              row.cost === null ? (
                                <span className="font-semibold text-amber-700 dark:text-amber-400">valor não informado</span>
                              ) : (
                                <strong>{formatMoney(row.cost, fare.currency)}</strong>
                              )
                            ) : (
                              <span className="text-slate-400">{row.reason}</span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {lk && lk.bookingOptions.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold">Opções de reserva informadas pela SerpApi ({lk.bookingOptions.length})</summary>
                <ul className="mt-1 space-y-1">
                  {lk.bookingOptions.map((o, i) => (
                    <li key={i}>
                      {o.bookWith || "Vendedor não informado"} · {o.price !== null ? formatMoney(o.price, fare.currency) : "preço não informado"}
                      {o.baggage.length > 0 && <span> · bagagem: {o.baggage.join("; ")}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Base de cálculo: “/trecho” multiplica por passageiros e trechos ({fare.roundTrip ? 2 : 1}); “/viagem” só por passageiros.
              Confirme tudo com a companhia antes de vender.
            </p>
          </Card>
        );
      })}
    </div>
  );
}
