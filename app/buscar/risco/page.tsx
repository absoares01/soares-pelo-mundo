"use client";

import { useMemo, useState } from "react";
import { FarePicker } from "@/components/FarePicker";
import { useConfig } from "@/components/useConfig";
import { Badge, Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { analyzeRisk, EMPTY_RULES, rankRisk } from "@/lib/analysis/risk";
import { formatMoney } from "@/lib/format";
import type { FareOption, FareRules } from "@/lib/types";

// Campos digitados à mão. Vazio = usa o valor encontrado pela pesquisa (se houver) ou "não informado".
interface Manual {
  changeAllowed: string;
  changeFee: string;
  refundable: string;
  refundPct: string;
  cancelFee: string;
  baggageOnlineFee: string;
  baggageAirportFee: string;
  creditValidityMonths: string;
}
const EMPTY_MANUAL: Manual = {
  changeAllowed: "",
  changeFee: "",
  refundable: "",
  refundPct: "",
  cancelFee: "",
  baggageOnlineFee: "",
  baggageAirportFee: "",
  creditValidityMonths: "",
};

const num = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function effectiveRules(fetched: FareRules | undefined, m: Manual): FareRules {
  const base = fetched ?? EMPTY_RULES;
  const anyManual = Object.values(m).some((v) => v !== "");
  return {
    ...base,
    changeAllowed: (m.changeAllowed || base.changeAllowed) as FareRules["changeAllowed"],
    changeFee: num(m.changeFee) ?? base.changeFee,
    refundable: (m.refundable || base.refundable) as FareRules["refundable"],
    refundPct: m.refundPct !== "" ? Math.min(100, num(m.refundPct) ?? 0) : base.refundPct,
    cancelFee: num(m.cancelFee) ?? base.cancelFee,
    baggageOnlineFee: num(m.baggageOnlineFee) ?? base.baggageOnlineFee,
    baggageAirportFee: num(m.baggageAirportFee) ?? base.baggageAirportFee,
    creditValidityMonths: num(m.creditValidityMonths) ?? base.creditValidityMonths,
    origin: anyManual ? "manual" : base.origin,
  };
}

export default function RiskPage() {
  const cfg = useConfig();
  const [fares, setFares] = useState<FareOption[]>([]);
  const [fetched, setFetched] = useState<Record<string, FareRules>>({});
  const [manual, setManual] = useState<Record<string, Manual>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pChange, setPChange] = useState(20);
  const [bagLater, setBagLater] = useState(false);

  async function lookup(f: FareOption) {
    setBusy(f.id);
    setErrors((e) => ({ ...e, [f.id]: "" }));
    try {
      const res = await fetch("/api/rules/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          airline: f.airline,
          currency: f.currency,
          route: f.context ? `${f.context.origin}-${f.context.destination}` : undefined,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { rules?: FareRules; error?: string };
      if (!res.ok || !d.rules) throw new Error(d.error ?? `Erro ${res.status}`);
      setFetched((x) => ({ ...x, [f.id]: d.rules as FareRules }));
    } catch (e) {
      setErrors((x) => ({ ...x, [f.id]: e instanceof Error ? e.message : "Falha na consulta." }));
    }
    setBusy(null);
  }

  const setM = (id: string, patch: Partial<Manual>) =>
    setManual((m) => ({ ...m, [id]: { ...(m[id] ?? EMPTY_MANUAL), ...patch } }));

  const analyses = useMemo(
    () =>
      fares.map((f) =>
        analyzeRisk(f, effectiveRules(fetched[f.id], manual[f.id] ?? EMPTY_MANUAL), {
          pChange: Math.max(0, Math.min(100, pChange)) / 100,
          needsBaggageLater: bagLater,
        }),
      ),
    [fares, fetched, manual, pChange, bagLater],
  );
  const ranking = useMemo(() => rankRisk(analyses), [analyses]);

  const verdict = (() => {
    if (analyses.length === 0) return null;
    const { best, cheapest } = ranking;
    if (analyses.length === 1) return null;
    if (!best) return "Ainda faltam regras (alteração, cancelamento ou bagagem) para calcular o custo esperado. Preencha os campos abaixo.";
    if (cheapest && best.fare.id !== cheapest.fare.id && cheapest.complete) {
      return `A tarifa mais barata (${cheapest.fare.label}) NÃO é a de menor custo esperado: considerando o risco, "${best.fare.label}" fica em ${formatMoney(best.expectedCost, best.fare.currency)} contra ${formatMoney(cheapest.expectedCost, cheapest.fare.currency)}.`;
    }
    if (cheapest && !cheapest.complete) {
      return `Há tarifas sem regras completas (incluindo a mais barata): a comparação de risco ainda é parcial.`;
    }
    return `Mesmo considerando o risco, "${best.fare.label}" continua sendo a melhor (${formatMoney(best.expectedCost, best.fare.currency)} de custo esperado).`;
  })();

  return (
    <div className="space-y-5">
      <PageTitle
        title="6. Risco real da tarifa barata"
        subtitle="Mostra o que o cliente perde se precisar cancelar, mudar datas, perder conexão ou levar bagagem depois. Os prejuízos são calculados pelo app a partir das regras com fonte ou digitadas por você; regra desconhecida aparece como “não calculável”."
      />
      {cfg && !cfg.ai && (
        <Notice tone="amber">Sem <code>ANTHROPIC_API_KEY</code> a busca automática de regras fica desligada, mas você pode digitar as regras.</Notice>
      )}

      <FarePicker fares={fares} setFares={setFares} />

      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label={`Chance de precisar mudar ou cancelar: ${pChange}%`} hint="É uma estimativa SUA (o app não sabe a probabilidade real). Usada só para o custo esperado.">
          <input type="range" min={0} max={100} step={5} value={pChange} onChange={(e) => setPChange(Number(e.target.value))} className="w-full accent-teal-600" />
        </Field>
        <label className="flex items-center gap-2 pt-5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={bagLater} onChange={(e) => setBagLater(e.target.checked)} />
          O cliente pode acabar precisando adicionar bagagem depois
        </label>
      </Card>

      {verdict && (
        <Notice tone="blue">
          <p className="font-semibold">Leitura do risco</p>
          <p className="mt-1">{verdict}</p>
        </Notice>
      )}

      {ranking.ordered.map((a) => {
        const f = a.fare;
        const m = manual[f.id] ?? EMPTY_MANUAL;
        const fr = fetched[f.id];
        return (
          <Card key={f.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">{f.label}</h3>
                <p className="text-xs text-slate-500">
                  {f.adults} passageiro(s) · {f.roundTrip ? "ida e volta" : "só ida"} · {f.stops === 0 ? "direto" : `${f.stops} escala(s)`}
                </p>
              </div>
              <div className="text-right">
                {a.complete ? (
                  <>
                    <p className="text-xs text-slate-500">Custo esperado</p>
                    <p className="text-xl font-bold">{formatMoney(a.expectedCost, f.currency)}</p>
                  </>
                ) : (
                  <Badge tone="amber">regras incompletas</Badge>
                )}
                {ranking.best?.fare.id === f.id && analyses.length > 1 && <Badge tone="green">Melhor custo esperado</Badge>}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {a.scenarios.map((s) => (
                <div key={s.key} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-lg font-bold">
                    {s.loss === null ? <span className="text-amber-700 dark:text-amber-400">não calculável</span> : formatMoney(s.loss, f.currency)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{s.detail}</p>
                </div>
              ))}
            </div>

            {a.restrictions.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold">Condições restritivas</p>
                <ul className="list-disc pl-5 text-xs text-slate-700 dark:text-slate-300">
                  {a.restrictions.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => lookup(f)} disabled={busy === f.id || (cfg !== null && !cfg.ai)}>
                  {busy === f.id ? "Pesquisando…" : "🔎 Buscar regras publicadas (IA + fonte)"}
                </Button>
                {fr && <Badge tone="green">{fr.sources.length} fonte(s) consultada(s)</Badge>}
              </div>
              {busy === f.id && <Spinner label="Pesquisando regras… pode levar até 1–2 minutos." />}
              {errors[f.id] && <Notice tone="red">{errors[f.id]}</Notice>}
              {fr && (
                <p className="text-xs">
                  Fontes:{" "}
                  {fr.sources.length === 0
                    ? "nenhuma fonte confiável encontrada — nada foi preenchido automaticamente."
                    : fr.sources.map((s, i) => (
                        <span key={s.url}>
                          {i > 0 && " · "}
                          <a className="underline" href={s.url} target="_blank" rel="noreferrer noopener">
                            {s.title}
                          </a>
                        </span>
                      ))}
                </p>
              )}
              <p className="text-xs font-semibold">Regras (preencha ou corrija; o que você digitar vale mais que a pesquisa)</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Permite alterar?">
                  <select className={inputCls} value={m.changeAllowed} onChange={(e) => setM(f.id, { changeAllowed: e.target.value })}>
                    <option value="">{fr ? `pesquisa: ${fr.changeAllowed.replace("_", " ")}` : "não informado"}</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </Field>
                <Field label="Multa de alteração (por pass.)">
                  <input type="number" min={0} className={inputCls} value={m.changeFee} placeholder={fr?.changeFee != null ? String(fr.changeFee) : "—"} onChange={(e) => setM(f.id, { changeFee: e.target.value })} />
                </Field>
                <Field label="Reembolsável?">
                  <select className={inputCls} value={m.refundable} onChange={(e) => setM(f.id, { refundable: e.target.value })}>
                    <option value="">{fr ? `pesquisa: ${fr.refundable.replace("_", " ")}` : "não informado"}</option>
                    <option value="sim">Sim</option>
                    <option value="parcial">Parcial</option>
                    <option value="nao">Não</option>
                  </select>
                </Field>
                <Field label="% devolvido ao cancelar">
                  <input type="number" min={0} max={100} className={inputCls} value={m.refundPct} placeholder={fr?.refundPct != null ? String(fr.refundPct) : "—"} onChange={(e) => setM(f.id, { refundPct: e.target.value })} />
                </Field>
                <Field label="Multa de cancelamento (por pass.)">
                  <input type="number" min={0} className={inputCls} value={m.cancelFee} placeholder={fr?.cancelFee != null ? String(fr.cancelFee) : "—"} onChange={(e) => setM(f.id, { cancelFee: e.target.value })} />
                </Field>
                <Field label="Bagagem comprada antes (por trecho)">
                  <input type="number" min={0} className={inputCls} value={m.baggageOnlineFee} placeholder={fr?.baggageOnlineFee != null ? String(fr.baggageOnlineFee) : "—"} onChange={(e) => setM(f.id, { baggageOnlineFee: e.target.value })} />
                </Field>
                <Field label="Bagagem no aeroporto (por trecho)">
                  <input type="number" min={0} className={inputCls} value={m.baggageAirportFee} placeholder={fr?.baggageAirportFee != null ? String(fr.baggageAirportFee) : "—"} onChange={(e) => setM(f.id, { baggageAirportFee: e.target.value })} />
                </Field>
                <Field label="Validade do crédito (meses)">
                  <input type="number" min={0} className={inputCls} value={m.creditValidityMonths} placeholder={fr?.creditValidityMonths != null ? String(fr.creditValidityMonths) : "—"} onChange={(e) => setM(f.id, { creditValidityMonths: e.target.value })} />
                </Field>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Custo esperado = preço + (chance estimada × maior perda entre cancelar e mudar){bagLater ? " + perda de bagagem depois" : ""}. Só é calculado quando as regras necessárias são conhecidas.
            </p>
          </Card>
        );
      })}
    </div>
  );
}
