"use client";

import { formatDateBR } from "@/lib/dates";
import { HIDDEN_CITY_RISKS, HIDDEN_CITY_WARNING } from "@/lib/analysis/hidden";
import { formatDateTimeBR, formatMoney, pct } from "@/lib/format";
import type { HiddenCityResult } from "@/lib/types";
import { FlightCard } from "../FlightCard";
import { ResultMeta } from "../ResultMeta";
import { Card, Notice } from "../ui";

export function HiddenWarning() {
  return (
    <div className="space-y-3">
      <Notice tone="red">
        <p className="font-bold">Aviso importante</p>
        <p className="mt-1">{HIDDEN_CITY_WARNING}</p>
      </Notice>
      <Card className="text-sm">
        <p className="font-semibold">Riscos práticos</p>
        <ul className="mt-2 space-y-1.5">
          {HIDDEN_CITY_RISKS.map((r) => (
            <li key={r.title}>
              <span className="font-semibold">{r.title}:</span> {r.text}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function HiddenResults({ result }: { result: HiddenCityResult }) {
  const { meta, query, baseline, options, notes } = result;
  return (
    <div className="space-y-5">
      <HiddenWarning />
      <ResultMeta meta={meta} />

      <Card className="space-y-1 text-sm">
        <p>
          Só ida · {formatDateBR(query.outDate)} · {query.adults} passageiro(s) · {query.origin} → <strong>{query.destination}</strong>{" "}
          (onde o viajante realmente desembarca)
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cidades “além” pesquisadas ({result.checkedCandidates}): {query.candidates.join(", ")}
        </p>
        {baseline ? (
          <p>
            Preço de referência (bilhete até o destino real): <strong>{formatMoney(baseline.price, meta.currency)}</strong>
          </p>
        ) : null}
      </Card>

      {notes.map((n) => (
        <Notice key={n} tone="blue">
          {n}
        </Notice>
      ))}

      {options.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">{options.length} comparação(ões) de preço</h2>
          {options.map((o) => (
            <FlightCard
              key={o.flight.id}
              flight={o.flight}
              noProposal
              context={{
                origin: o.flight.origin,
                destination: o.flight.destination,
                outDate: query.outDate,
                adults: query.adults,
                searchedAt: meta.searchedAt,
                mock: meta.mock,
              }}
              label={`#${o.rank} · bilhete até ${o.hiddenDestination}`}
              priceNote="só ida"
            >
              <div className="space-y-1 text-sm">
                <p>
                  Desembarque em <strong>{o.stopoverAirport}</strong> ({formatDateTimeBR(o.arrivalAtStopover)}); o trecho final até{" "}
                  {o.hiddenDestination} não seria usado.
                </p>
                <p>
                  Diferença de preço: <strong>{formatMoney(o.savings, meta.currency)}</strong> a menos ({pct(o.savingsPct)}) que
                  o bilhete até {o.stopoverAirport}.
                </p>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Só com bagagem de mão. Pode violar as condições de transporte da companhia.
                </p>
              </div>
            </FlightCard>
          ))}
        </div>
      )}
    </div>
  );
}
