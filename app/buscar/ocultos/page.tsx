"use client";

import { CommonFields, toPayload, useCommonForm } from "@/components/CommonFields";
import { AlternativesResults } from "@/components/results/AlternativesResults";
import { Button, Card, Notice, PageTitle, Spinner } from "@/components/ui";
import { useSearch } from "@/components/useSearch";
import type { AlternativesResult } from "@/lib/types";

export default function HiddenPage() {
  const { form, set } = useCommonForm();
  const { loading, error, result, run } = useSearch<AlternativesResult>("/api/search/alternatives");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...toPayload(form), sort: "price" });
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="2. Voos que quase ninguém vê"
        subtitle="Pesquisa grandes companhias, baixo custo e aeroportos alternativos próximos, e compara pelo custo final esperado, não só pela tarifa anunciada."
      />

      <form onSubmit={submit}>
        <Card className="space-y-4">
          <CommonFields form={form} set={set} />
          <Button type="submit" disabled={loading}>
            {loading ? "Pesquisando…" : "Buscar opções"}
          </Button>
        </Card>
      </form>

      {loading && <Spinner label="Pesquisando aeroportos e companhias…" />}
      {error && <Notice tone="red">{error}</Notice>}
      {result && <AlternativesResults result={result} />}
    </div>
  );
}
