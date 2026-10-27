"use client";

import { useState } from "react";
import { DiscountsResults } from "@/components/results/DiscountsResults";
import { Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { useConfig } from "@/components/useConfig";
import { useSearch } from "@/components/useSearch";
import type { DiscountsResult } from "@/lib/types";

export default function DiscountsPage() {
  const cfg = useConfig();
  const [target, setTarget] = useState("");
  const [route, setRoute] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const { loading, error, result, run } = useSearch<DiscountsResult>("/api/discounts");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ target, route: route || undefined, travelDate: travelDate || undefined });
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="4. Descontos reais antes de comprar"
        subtitle="Pesquisa na web, em fontes oficiais, cupons e promoções que dá para usar de verdade. Só aparece o que tem link de fonte consultado e não está vencido."
      />
      {cfg && !cfg.ai && (
        <Notice tone="amber">
          Este módulo precisa da chave <code>ANTHROPIC_API_KEY</code> (IA com busca na web). Veja o README para ativar.
        </Notice>
      )}
      <form onSubmit={submit}>
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Companhia, programa ou cartão" className="sm:col-span-2" hint="Ex.: LATAM, Azul Fidelidade, TAP, cartão Itaú Latam Pass.">
              <input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} required placeholder="LATAM" />
            </Field>
            <Field label="Rota (opcional)" hint="Ex.: GRU-LIS">
              <input className={inputCls} value={route} onChange={(e) => setRoute(e.target.value.toUpperCase())} placeholder="GRU-LIS" />
            </Field>
            <Field label="Data da viagem (opcional)">
              <input type="date" className={inputCls} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={loading || (cfg !== null && !cfg.ai)}>
            {loading ? "Pesquisando…" : "Procurar descontos"}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cada pesquisa usa algumas buscas na web da IA (custo pequeno na sua conta da Anthropic) e pode levar até 1–2 minutos.
          </p>
        </Card>
      </form>
      {loading && <Spinner label="Pesquisando em fontes oficiais… isso pode levar um ou dois minutos." />}
      {error && <Notice tone="red">{error}</Notice>}
      {result && <DiscountsResults result={result} />}
    </div>
  );
}
