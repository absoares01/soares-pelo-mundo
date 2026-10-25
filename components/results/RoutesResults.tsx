"use client";

import { formatDateBR } from "@/lib/dates";
import { formatDuration, formatMoney } from "@/lib/format";
import type { RoutesResult } from "@/lib/types";
import { FlightCard } from "../FlightCard";
import { ResultMeta, SummaryButton } from "../ResultMeta";
import { Card } from "../ui";

export function RoutesResults({ result }: { result: RoutesResult }) {
  const { meta, query, reference, discarded } = result;
  return (
    <div className="space-y-5">
      <ResultMeta meta={meta} />

      <Card className="space-y-1 text-sm">
        <p>
          {formatDateBR(query.outDate)}
          {query.returnDate ? ` → ${formatDateBR(query.returnDate)}` : " (só ida)"} · limite{" "}
          <strong>{formatMoney(query.maxPrice, meta.currency)}</strong> · conexão de até{" "}
          <strong>{query.maxLayoverHours}h</strong>
        </p>
        {reference.fastest && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Referência de comparação — opção mais rápida encontrada: {formatMoney(reference.fastest.price, meta.currency)} em{" "}
            {formatDuration(reference.fastest.durationMin)}.
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Descartadas: {discarded.direct} diretas, {discarded.overPrice} acima do valor, {discarded.longLayover} com conexão
          longa demais, {discarded.airportChange} com troca de aeroporto.
        </p>
      </Card>

      {result.options.length === 0 ? (
        <Card>
          <p className="text-sm">Nenhuma rota atendeu aos limites informados. Tente aumentar o valor ou o tempo máximo de conexão.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">{result.options.length} combinações mais baratas</h2>
          {result.options.map((o) => (
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
              label={`#${o.rank}`}
              badges={o.rank === 1 ? [{ text: "Mais barato", tone: "green" }] : undefined}
              priceNote={query.returnDate ? "ida e volta" : "só ida"}
            >
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Economia × tempo:</span> {o.tradeoff}
                </p>
                {o.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-amber-800 dark:text-amber-300">
                    {o.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </FlightCard>
          ))}
        </div>
      )}

      <SummaryButton module="escalas" result={result} />
    </div>
  );
}
