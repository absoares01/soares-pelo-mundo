"use client";

import { CommonFields, toPayload, useCommonForm } from "@/components/CommonFields";
import { DatesResults } from "@/components/results/DatesResults";
import { Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { useSearch } from "@/components/useSearch";
import type { DatesResult } from "@/lib/types";
import { useState } from "react";

export default function DatesPage() {
  const { form, set } = useCommonForm();
  const [flexDays, setFlexDays] = useState(3);
  const [maxCombos, setMaxCombos] = useState(9);
  const { loading, error, result, run } = useSearch<DatesResult>("/api/search/dates");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...toPayload(form), flexDays, maxCombos });
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="1. Dias mais baratos para voar"
        subtitle="Informe suas datas e a flexibilidade. O app compara combinações de ida e volta nessa janela e mostra as 3 melhores."
      />

      <form onSubmit={submit}>
        <Card className="space-y-4">
          <CommonFields form={form} set={set} returnRequired showNearby={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Flexibilidade (dias para mais ou para menos)" hint="Ex.: 3 testa de 3 dias antes a 3 dias depois, na ida e na volta.">
                <input
                  type="number"
                  min={0}
                  max={7}
                  className={inputCls}
                  value={flexDays}
                  onChange={(e) => setFlexDays(Math.max(0, Math.min(7, Number(e.target.value) || 0)))}
                />
              </Field>
              <Field label="Máximo de combinações a pesquisar" hint="Cada combinação usa 1 crédito da SerpApi. Mais combinações = mais cobertura e mais custo.">
                <input
                  type="number"
                  min={1}
                  max={25}
                  className={inputCls}
                  value={maxCombos}
                  onChange={(e) => setMaxCombos(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
                />
              </Field>
            </div>
          </CommonFields>
          <Button type="submit" disabled={loading}>
            {loading ? "Pesquisando…" : "Buscar datas mais baratas"}
          </Button>
        </Card>
      </form>

      {loading && <Spinner label="Comparando combinações de datas… isso pode levar alguns segundos." />}
      {error && <Notice tone="red">{error}</Notice>}
      {result && <DatesResults result={result} />}
    </div>
  );
}
