"use client";

import { formatDateBR, formatDateShort, weekdayName } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { DatesResult } from "@/lib/types";
import { FlightCard } from "../FlightCard";
import { ResultMeta, SummaryButton } from "../ResultMeta";
import { Badge, Card } from "../ui";

function HeatStrip({
  title,
  data,
  currency,
}: {
  title: string;
  data: { date: string; price: number | null }[];
  currency: string;
}) {
  const prices = data.map((d) => d.price).filter((p): p is number => p !== null);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {data.map((d) => {
          // quanto mais barato, mais forte o verde
          const t = d.price === null || max === min ? 0.5 : 1 - (d.price - min) / (max - min);
          const style =
            d.price === null ? undefined : { backgroundColor: `rgba(13, 148, 136, ${(0.12 + t * 0.7).toFixed(2)})` };
          const cheapest = d.price !== null && d.price === min;
          return (
            <div
              key={d.date}
              style={style}
              className={`min-w-[4.6rem] rounded-lg border px-2 py-1.5 text-center ${
                d.price === null
                  ? "border-dashed border-slate-300 text-slate-400 dark:border-slate-700"
                  : cheapest
                    ? "border-teal-600"
                    : "border-transparent"
              }`}
              title={`${formatDateBR(d.date)} (${weekdayName(d.date)})`}
            >
              <p className="text-[11px] leading-tight text-slate-700 dark:text-slate-200">
                {weekdayName(d.date).slice(0, 3)} {formatDateShort(d.date)}
              </p>
              <p className="text-xs font-bold">{d.price === null ? "—" : formatMoney(d.price, currency)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DatesResults({ result }: { result: DatesResult }) {
  const { meta, query } = result;
  const ctxBase = {
    origin: query.origin,
    destination: query.destination,
    adults: query.adults,
    searchedAt: meta.searchedAt,
    mock: meta.mock,
  };

  return (
    <div className="space-y-5">
      <ResultMeta meta={meta} />

      <Card>
        <p className="text-sm">
          Datas originais: <strong>{formatDateBR(query.outDate)}</strong> → <strong>{formatDateBR(query.returnDate)}</strong> ·{" "}
          {result.baseline.price !== null ? (
            <>
              menor preço encontrado <strong>{formatMoney(result.baseline.price, meta.currency)}</strong>
            </>
          ) : (
            "sem voos encontrados nessas datas"
          )}
          . Pesquisadas {result.searchedCombos} de {result.totalCombos} combinações.
        </p>
        {result.priceInsights && (result.priceInsights.typicalLow || result.priceInsights.level) && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Referência do Google Flights para as datas originais
            {result.priceInsights.level ? `: preço ${result.priceInsights.level}` : ""}
            {result.priceInsights.typicalLow && result.priceInsights.typicalHigh
              ? ` (faixa típica ${formatMoney(result.priceInsights.typicalLow, meta.currency)} a ${formatMoney(result.priceInsights.typicalHigh, meta.currency)})`
              : ""}
            .
          </p>
        )}
      </Card>

      {result.top.length === 0 ? (
        <Card>
          <p className="text-sm">Nenhum voo encontrado nessa janela de datas. Tente ampliar a flexibilidade ou mudar o período.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">3 melhores combinações de datas</h2>
          {result.top.map((t) => (
            <FlightCard
              key={`${t.combo.out}-${t.combo.ret}`}
              flight={t.flight}
              context={{ ...ctxBase, outDate: t.combo.out, returnDate: t.combo.ret }}
              label={`#${t.rank} · ${formatDateBR(t.combo.out)} → ${formatDateBR(t.combo.ret)} (${t.combo.nights} noites)`}
              badges={[
                ...(t.rank === 1 ? [{ text: "Mais barato", tone: "green" as const }] : []),
                ...(t.combo.isOriginal ? [{ text: "Datas originais", tone: "blue" as const }] : []),
              ]}
              priceOverride={t.finalPrice}
              priceNote={
                t.finalPrice !== t.flight.price ? `tarifa ${formatMoney(t.flight.price, meta.currency)} + taxas estimadas` : "ida e volta"
              }
            >
              <div className="space-y-2 text-sm">
                {t.savingsAbs !== null ? (
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {t.savingsAbs > 0
                      ? `Economia de ${formatMoney(t.savingsAbs, meta.currency)} (${Math.round(t.savingsPct ?? 0)}%) sobre as datas originais`
                      : t.savingsAbs === 0
                        ? "Mesmo preço das datas originais"
                        : `${formatMoney(Math.abs(t.savingsAbs), meta.currency)} acima das datas originais`}
                  </p>
                ) : (
                  <Badge tone="amber">Economia não calculada (sem voos nas datas originais)</Badge>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Por que é mais barata</p>
                  <ul className="list-disc pl-5">
                    {t.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                {t.drawbacks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Desvantagens</p>
                    <ul className="list-disc pl-5">
                      {t.drawbacks.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </FlightCard>
          ))}
        </div>
      )}

      {result.heatOut.length > 1 && (
        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Calendário de preços</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menor preço de ida e volta encontrado para cada data (verde mais forte = mais barato). “—” = sem voos ou data não
            pesquisada.
          </p>
          <HeatStrip title="Por data de ida" data={result.heatOut} currency={meta.currency} />
          <HeatStrip title="Por data de volta" data={result.heatRet} currency={meta.currency} />
        </Card>
      )}

      <SummaryButton module="datas" result={result} />
    </div>
  );
}
