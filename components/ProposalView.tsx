import { formatDateBR } from "@/lib/dates";
import {
  formatDateTimeBR,
  formatDuration,
  formatMoney,
  formatSearchedAt,
  formatStops,
} from "@/lib/format";
import { proposalTotals, type ProposalView as View } from "@/lib/proposal";
import { Badge, Notice } from "./ui";

// Visualização da proposta voltada ao CLIENTE. Não exibe anotações internas.
export function ProposalView({ view }: { view: View }) {
  const { subtotal, total } = proposalTotals(view);
  const consulted = view.items[0]?.searchedAt ?? view.createdAt;

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">✈️ Soares pelo Mundo</p>
        <h1 className="mt-1 text-2xl font-bold">{view.title}</h1>
        {view.clientName && <p className="text-sm text-slate-600 dark:text-slate-400">Preparada para {view.clientName}</p>}
        {view.validUntil && (
          <p className="text-sm text-slate-600 dark:text-slate-400">Válida até {formatDateBR(view.validUntil)}</p>
        )}
      </header>

      {view.mock && (
        <Notice tone="red">
          <strong>DADOS DE EXEMPLO — esta não é uma oferta real.</strong>
        </Notice>
      )}

      {view.message && <p className="whitespace-pre-line text-sm">{view.message}</p>}

      <div className="space-y-4">
        {view.items.map((it, idx) => {
          const f = it.flight;
          return (
            <section
              key={it.id}
              className="print-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Opção {idx + 1}</p>
                  <p className="font-semibold">{f.airlines.join(" + ") || "Companhia a confirmar"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {f.origin} → {f.destination} · {formatStops(f.stops)} · {formatDuration(f.durationMin)}
                  </p>
                </div>
                <p className="text-xl font-bold">{formatMoney(f.price, view.currency)}</p>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {f.segments.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      {s.from} → {s.to}
                    </span>{" "}
                    · {s.airline} {s.flightNumber} · saída {formatDateTimeBR(s.departure)} · chegada {formatDateTimeBR(s.arrival)}
                    {f.layovers[i] && (
                      <span className="block pl-3 text-xs text-slate-500">
                        conexão em {f.layovers[i].airport}: {formatDuration(f.layovers[i].durationMin)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {it.context.returnDate && <Badge>Volta a partir de {formatDateBR(it.context.returnDate)}</Badge>}
                <Badge tone={f.baggage.status === "incluida" ? "green" : "amber"}>
                  {f.baggage.status === "incluida" ? "Bagagem despachada incluída" : "Bagagem: confirmar regra com a companhia"}
                </Badge>
                {f.airportChange && <Badge tone="amber">Troca de aeroporto na conexão</Badge>}
                {f.overnightLayover && <Badge tone="amber">Conexão com pernoite</Badge>}
                {f.longestLayoverMin >= 300 && <Badge tone="amber">Conexão longa</Badge>}
              </div>
            </section>
          );
        })}
      </div>

      <section className="print-card rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-800">
        {view.items.length > 1 && (
          <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
            Os valores acima são de opções alternativas; escolha uma delas. O total abaixo soma todas apenas se você optar por
            todas.
          </p>
        )}
        <div className="flex justify-between">
          <span>Subtotal das passagens</span>
          <span>{formatMoney(subtotal, view.currency)}</span>
        </div>
        {view.serviceFee > 0 && (
          <div className="flex justify-between">
            <span>Taxa de serviço da assessoria</span>
            <span>{formatMoney(view.serviceFee, view.currency)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-slate-300 pt-1 text-base font-bold dark:border-slate-600">
          <span>{view.items.length > 1 ? "Total (todas as opções)" : "Total"}</span>
          <span>{formatMoney(total, view.currency)}</span>
        </div>
      </section>

      <footer className="text-xs text-slate-500 dark:text-slate-400">
        Valores consultados em {formatSearchedAt(consulted)}. Preços, disponibilidade e regras das tarifas podem mudar até a
        emissão e devem ser confirmados antes da compra.
      </footer>
    </article>
  );
}
