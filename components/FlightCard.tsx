"use client";

import { useState, type ReactNode } from "react";
import { formatDateTimeBR, formatDuration, formatMoney, formatStops, formatTime } from "@/lib/format";
import type { Flight, ProposalItem } from "@/lib/types";
import { useCart } from "./CartProvider";
import { Badge, Button, cx } from "./ui";

export interface FlightContext {
  origin: string;
  destination: string;
  outDate: string;
  returnDate?: string;
  adults: number;
  searchedAt: string;
  mock: boolean;
}

interface Props {
  flight: Flight;
  context: FlightContext;
  label?: string;
  badges?: { text: string; tone?: "green" | "blue" | "amber" | "slate" | "red" }[];
  priceOverride?: number; // ex.: custo final estimado
  priceNote?: string;
  children?: ReactNode;
}

export function FlightCard({ flight: f, context, label, badges, priceOverride, priceNote, children }: Props) {
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const itemId = `${f.id}#${context.outDate}#${context.returnDate ?? ""}`;
  const inCart = cart.has(itemId);

  function addToCart() {
    const item: ProposalItem = {
      id: itemId,
      label: label ?? `${context.origin} → ${context.destination}`,
      flight: f,
      context: {
        origin: context.origin,
        destination: context.destination,
        outDate: context.outDate,
        returnDate: context.returnDate,
        adults: context.adults,
      },
      searchedAt: context.searchedAt,
      mock: context.mock,
    };
    cart.add(item);
  }

  const shownPrice = priceOverride ?? f.price;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {label && <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{label}</span>}
            {badges?.map((b) => (
              <Badge key={b.text} tone={b.tone}>
                {b.text}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-sm font-semibold">{f.airlines.join(" + ") || "Companhia não informada"}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {formatTime(f.departure)} {f.origin} → {formatTime(f.arrival)} {f.destination}
            <span className="mx-1.5">·</span>
            {formatDuration(f.durationMin)}
            <span className="mx-1.5">·</span>
            {formatStops(f.stops)}
            {f.layovers.length > 0 && (
              <span> ({f.layovers.map((l) => `${l.airport} ${formatDuration(l.durationMin)}`).join(", ")})</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{formatMoney(shownPrice, f.currency)}</p>
          {priceNote && <p className="text-xs text-slate-500 dark:text-slate-400">{priceNote}</p>}
        </div>
      </div>

      {children && <div className="mt-3">{children}</div>}

      <p
        className={cx(
          "mt-3 text-xs",
          f.baggage.status === "incluida" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400",
        )}
      >
        🧳 {f.baggage.status === "incluida" ? "Bagagem despachada incluída." : f.baggage.text}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant={inCart ? "secondary" : "primary"} onClick={addToCart} disabled={inCart}>
          {inCart ? "✓ Na proposta" : "+ Adicionar à proposta"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Ocultar detalhes" : "Ver detalhes"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
          {f.segments.map((s, i) => (
            <div key={i}>
              <p>
                <span className="font-semibold">
                  {s.from} → {s.to}
                </span>{" "}
                · {s.airline} {s.flightNumber} · {formatDuration(s.durationMin)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saída {formatDateTimeBR(s.departure)} · Chegada {formatDateTimeBR(s.arrival)}
                {s.airplane ? ` · ${s.airplane}` : ""}
              </p>
              {f.layovers[i] && (
                <p className="mt-1 rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                  Conexão em {f.layovers[i].name || f.layovers[i].airport}: {formatDuration(f.layovers[i].durationMin)}
                  {f.layovers[i].overnight ? " (pernoite)" : ""}
                </p>
              )}
            </div>
          ))}
          {f.airportChange && (
            <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Exige troca de aeroporto na conexão.</p>
          )}
          {f.carbonKg !== undefined && <p className="text-xs text-slate-500">Emissão estimada: {f.carbonKg} kg CO₂</p>}
        </div>
      )}
    </div>
  );
}
