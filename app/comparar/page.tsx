"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { Badge, Button, Card, Notice, PageTitle } from "@/components/ui";
import { formatDateBR } from "@/lib/dates";
import { formatDuration, formatMoney, formatStops, formatTime } from "@/lib/format";

export default function ComparePage() {
  const { items, remove, clear } = useCart();
  const shown = items.slice(0, 4);

  if (items.length === 0) {
    return (
      <div className="space-y-5">
        <PageTitle title="Comparar opções" />
        <Card>
          <p className="text-sm">
            Nenhuma opção selecionada. Nos resultados de busca, clique em <strong>+ Adicionar à proposta</strong> e volte aqui
            para comparar até 4 opções lado a lado.
          </p>
          <Link href="/" className="mt-2 inline-block text-sm font-semibold text-teal-700 underline dark:text-teal-400">
            Ir para os módulos
          </Link>
        </Card>
      </div>
    );
  }

  const prices = shown.map((i) => i.flight.price ?? Infinity);
  const durations = shown.map((i) => i.flight.durationMin);
  const minPrice = Math.min(...prices);
  const minDur = Math.min(...durations);

  const rows: { label: string; cell: (i: (typeof shown)[number]) => React.ReactNode }[] = [
    {
      label: "Preço",
      cell: (i) => (
        <span className="text-lg font-bold">
          {formatMoney(i.flight.price, i.flight.currency)}
          {i.flight.price === minPrice && shown.length > 1 && (
            <>
              {" "}
              <Badge tone="green">Mais barato</Badge>
            </>
          )}
        </span>
      ),
    },
    { label: "Companhia", cell: (i) => i.flight.airlines.join(" + ") || "—" },
    { label: "Rota", cell: (i) => `${i.flight.origin} → ${i.flight.destination}` },
    {
      label: "Datas",
      cell: (i) => `${formatDateBR(i.context.outDate)}${i.context.returnDate ? ` → ${formatDateBR(i.context.returnDate)}` : ""}`,
    },
    { label: "Saída / chegada", cell: (i) => `${formatTime(i.flight.departure)} → ${formatTime(i.flight.arrival)}` },
    {
      label: "Tempo de viagem",
      cell: (i) => (
        <>
          {formatDuration(i.flight.durationMin)}
          {i.flight.durationMin === minDur && shown.length > 1 && (
            <>
              {" "}
              <Badge tone="blue">Mais rápido</Badge>
            </>
          )}
        </>
      ),
    },
    {
      label: "Escalas",
      cell: (i) =>
        `${formatStops(i.flight.stops)}${i.flight.layovers.length ? ` (${i.flight.layovers.map((l) => l.airport).join(", ")})` : ""}`,
    },
    {
      label: "Bagagem",
      cell: (i) =>
        i.flight.baggage.status === "incluida" ? "Despachada incluída" : "Não confirmada — checar com a companhia",
    },
    {
      label: "Pontos de atenção",
      cell: (i) => {
        const w: string[] = [];
        if (i.flight.airportChange) w.push("troca de aeroporto");
        if (i.flight.overnightLayover) w.push("pernoite");
        if (i.flight.longestLayoverMin >= 300) w.push(`conexão de ${formatDuration(i.flight.longestLayoverMin)}`);
        if (i.mock) w.push("DADOS DE EXEMPLO");
        return w.length ? w.join(", ") : "nenhum";
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageTitle title="Comparar opções" subtitle="Até 4 opções lado a lado. As mesmas opções alimentam a proposta." />
      {items.length > 4 && <Notice tone="blue">Mostrando as 4 primeiras de {items.length} opções. Remova alguma para ver as demais.</Notice>}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr>
              <th className="w-32 pb-2" />
              {shown.map((i, idx) => (
                <th key={i.id} className="pb-2 pr-3 align-top">
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">Opção {idx + 1}</p>
                  <button onClick={() => remove(i.id)} className="text-xs font-normal text-red-600 underline">
                    remover
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.label}>
                <th className="py-2 pr-3 text-xs font-semibold uppercase text-slate-500">{r.label}</th>
                {shown.map((i) => (
                  <td key={i.id} className="py-2 pr-3 align-top">
                    {r.cell(i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/propostas/nova">
          <Button>Gerar proposta com estas opções</Button>
        </Link>
        <Button variant="secondary" onClick={clear}>
          Limpar seleção
        </Button>
      </div>
    </div>
  );
}
