"use client";

import { CommonFields, toPayload, useCommonForm } from "@/components/CommonFields";
import { RoutesResults } from "@/components/results/RoutesResults";
import { Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { useSearch } from "@/components/useSearch";
import type { RoutesResult } from "@/lib/types";
import { useState } from "react";

export default function RoutesPage() {
  const { form, set } = useCommonForm();
  const [maxPrice, setMaxPrice] = useState("");
  const [maxLayoverHours, setMaxLayoverHours] = useState(6);
  const { loading, error, result, run } = useSearch<RoutesResult>("/api/search/routes");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...toPayload(form), maxPrice: Number(maxPrice), maxLayoverHours });
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="3. Rota mais barata com escalas"
        subtitle="Procura rotas com 1 ou 2 escalas abaixo do valor que você definir, evitando troca de aeroporto e conexões longas demais."
      />

      <form onSubmit={submit}>
        <Card className="space-y-4">
          <CommonFields form={form} set={set} showFees={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor máximo desejado (total)" hint="Na moeda escolhida abaixo, para todos os passageiros.">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="3000"
                  required
                />
              </Field>
              <Field label="Tempo máximo de conexão (horas)">
                <input
                  type="number"
                  min={1}
                  max={24}
                  className={inputCls}
                  value={maxLayoverHours}
                  onChange={(e) => setMaxLayoverHours(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                />
              </Field>
            </div>
          </CommonFields>
          <Button type="submit" disabled={loading}>
            {loading ? "Pesquisando…" : "Buscar rotas com escalas"}
          </Button>
        </Card>
      </form>

      {loading && <Spinner label="Explorando rotas e conexões…" />}
      {error && <Notice tone="red">{error}</Notice>}
      {result && <RoutesResults result={result} />}
    </div>
  );
}
