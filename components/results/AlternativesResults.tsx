"use client";

import { useMemo, useState } from "react";
import { formatDateBR } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { AlternativesResult } from "@/lib/types";
import { FlightCard } from "../FlightCard";
import { ResultMeta, SummaryButton } from "../ResultMeta";
import { Button, Card, Notice } from "../ui";

type SortKey = "price" | "duration" | "convenience";

export function AlternativesResults({ result, initialSort = "price" }: { result: AlternativesResult; initialSort?: SortKey }) {
  const { meta, query } = result;
  const [sort, setSort] = useState<SortKey>(initialSort);

  const options = useMemo(() => {
    const list = [...result.options];
    if (sort === "price") list.sort((a, b) => a.finalPrice - b.finalPrice || a.flight.durationMin - b.flight.durationMin);
    if (sort === "duration") list.sort((a, b) => a.flight.durationMin - b.flight.durationMin || a.finalPrice - b.finalPrice);
    if (sort === "convenience") list.sort((a, b) => b.convenience - a.convenience || a.finalPrice - b.finalPrice);
    return list;
  }, [result.options, sort]);

  const cheapestId = useMemo(
    () => [...result.options].sort((a, b) => a.finalPrice - b.finalPrice)[0]?.flight.id,
    [result.options],
  );
  const fastestId = useMemo(
    () => [...result.options].sort((a, b) => a.flight.durationMin - b.flight.durationMin)[0]?.flight.id,
    [result.options],
  );

  const alt = result.options.filter((o) => o.altOrigin || o.altDestination).length;

  return (
    <div className="space-y-5">
      <ResultMeta meta={meta} />

      <Card>
        <p className="text-sm">
          {formatDateBR(query.outDate)}
          {query.returnDate ? ` → ${formatDateBR(query.returnDate)}` : " (só ida)"} · aeroportos de saída pesquisados:{" "}
          <strong>{query.originCluster.join(", ")}</strong> · de chegada: <strong>{query.destinationCluster.join(", ")}</strong>
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {result.options.length} opções encontradas, {alt} delas com aeroporto alternativo.
          {result.baselineCheapest !== null &&
            ` Menor preço usando só os aeroportos pedidos: ${formatMoney(result.baselineCheapest, meta.currency)}.`}
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Ordenar por:</span>
        {(
          [
            ["price", "Preço final"],
            ["duration", "Tempo de viagem"],
            ["convenience", "Conveniência"],
          ] as [SortKey, string][]
        ).map(([k, label]) => (
          <Button key={k} variant={sort === k ? "primary" : "secondary"} onClick={() => setSort(k)}>
            {label}
          </Button>
        ))}
      </div>

      {options.length === 0 ? (
        <Card>
          <p className="text-sm">Nenhum voo encontrado nesse período. Tente outras datas ou inclua mais aeroportos.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {options.map((o) => (
            <FlightCard
              key={o.flight.id}
              flight={o.flight}
              context={{
                origin: o.flight.origin,
                destination: o.flight.destination,
                outDate: query.outDate,
                returnDate: query.returnDate,
                adults: query.adults,
                searchedAt: meta.searchedAt,
                mock: meta.mock,
              }}
              badges={[
                ...(o.flight.id === cheapestId ? [{ text: "Mais barato", tone: "green" as const }] : []),
                ...(o.flight.id === fastestId ? [{ text: "Mais rápido", tone: "blue" as const }] : []),
                ...(o.convenience >= 85 ? [{ text: "Alta conveniência", tone: "slate" as const }] : []),
                ...o.tags
                  .filter((t) => t.includes("alternativo") || t === "Baixo custo")
                  .map((t) => ({ text: t, tone: "amber" as const })),
              ]}
              priceOverride={o.finalPrice}
              priceNote={o.estimatedFees.length ? "custo final estimado" : "tarifa anunciada"}
            >
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {o.estimatedFees.map((fee) => (
                  <p key={fee.label}>
                    + {formatMoney(fee.amount, meta.currency)} · {fee.label}
                  </p>
                ))}
                <p>
                  Conveniência <strong>{o.convenience}/100</strong>: {o.convenienceNotes.join("; ")}.
                </p>
              </div>
            </FlightCard>
          ))}
        </div>
      )}

      <Notice tone="blue">
        O custo final só soma taxas que você informou no formulário. Para as demais, a regra de bagagem aparece como “não
        informada pela fonte” e deve ser confirmada com a companhia.
      </Notice>

      <SummaryButton module="ocultos" result={result} />
    </div>
  );
}
