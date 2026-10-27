"use client";

import { useState } from "react";
import { CommonFields, toPayload, useCommonForm } from "@/components/CommonFields";
import { HiddenResults, HiddenWarning } from "@/components/results/HiddenResults";
import { Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { useSearch } from "@/components/useSearch";
import type { HiddenCityResult } from "@/lib/types";

export default function HiddenCityPage() {
  const { form, set } = useCommonForm({ returnDate: "" });
  const [candidates, setCandidates] = useState("");
  const [ack, setAck] = useState(false);
  const { loading, error, result, run } = useSearch<HiddenCityResult>("/api/search/hidden");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = toPayload(form);
    run({ ...p, returnDate: undefined, candidates });
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="7. Hidden-city (trecho descartado)"
        subtitle="Compara o preço do bilhete até o destino real com bilhetes até cidades além dele que passam por esse destino numa conexão. É só uma comparação de preços, sem recomendação."
      />
      {!result && <HiddenWarning />}

      <form onSubmit={submit}>
        <Card className="space-y-4">
          <CommonFields form={form} set={set} hideReturn showNearby={false} showFees={false}>
            <Field
              label="Cidades além do destino (opcional)"
              hint="Códigos IATA separados por vírgula, no máximo 8. Vazio = lista padrão do app para destinos grandes (ex.: JFK, MIA, LIS, MAD…)."
            >
              <input
                className={inputCls}
                value={candidates}
                onChange={(e) => setCandidates(e.target.value.toUpperCase())}
                placeholder="BOS,PHL,YYZ"
              />
            </Field>
          </CommonFields>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Só passagens de ida. O destino deve ser um único aeroporto: é onde o viajante realmente desembarca. Cada busca usa até
            9 créditos da SerpApi.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-600" />
            <span>Li o aviso acima e entendo que esta prática pode violar as condições da companhia e que a decisão é do viajante.</span>
          </label>
          <Button type="submit" disabled={loading || !ack}>
            {loading ? "Comparando…" : "Comparar preços"}
          </Button>
        </Card>
      </form>

      {loading && <Spinner label="Consultando preços até as cidades além do destino…" />}
      {error && <Notice tone="red">{error}</Notice>}
      {result && <HiddenResults result={result} />}
    </div>
  );
}
