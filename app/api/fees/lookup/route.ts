import { NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { feeLinesFromBooking, mergeFeeLines } from "@/lib/analysis/booking";
import { researchFees } from "@/lib/research";
import { fetchBookingOptions, hasSerpApiKey } from "@/lib/serpapi";
import type { BookingOption, FareOption, FeeLine } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// Módulo 5: levanta as taxas de uma tarifa por duas fontes independentes —
//  (a) opções de reserva da SerpApi (texto de bagagem da própria fonte) e
//  (b) pesquisa na web pela IA, aceita só com link de fonte de fato consultado.
// Nada é inventado: o que nenhuma fonte informa volta como "não informado".
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { fare?: Partial<FareOption>; useSerp?: boolean; useAi?: boolean };
  const fare = body.fare;
  if (!fare || typeof fare.airline !== "string" || typeof fare.currency !== "string") {
    return NextResponse.json({ error: "Tarifa inválida." }, { status: 400 });
  }
  const full = fare as FareOption;
  const notes: string[] = [];
  const groups: FeeLine[][] = [];
  let bookingOptions: BookingOption[] = [];
  let credits = 0;
  let aiSearches = 0;

  if (body.useSerp !== false) {
    if (!hasSerpApiKey()) {
      notes.push("Sem SERPAPI_KEY: opções de reserva da SerpApi indisponíveis.");
    } else if (!full.context || (!full.bookingToken && !full.departureToken)) {
      notes.push("Esta tarifa não veio de uma busca com código de reserva; use a pesquisa por IA ou digite os valores.");
    } else {
      try {
        const r = await fetchBookingOptions({
          origin: full.context.origin,
          destination: full.context.destination,
          outDate: full.context.outDate,
          returnDate: full.context.returnDate,
          currency: full.currency,
          adults: full.adults,
          bookingToken: full.bookingToken,
          departureToken: full.departureToken,
        });
        credits += r.credits;
        bookingOptions = r.options;
        if (r.note) notes.push(r.note);
        groups.push(feeLinesFromBooking(r.options, r.baggage, full));
        if (r.options.length === 0) notes.push("A SerpApi não devolveu opções de reserva para esta tarifa.");
      } catch (e) {
        notes.push(e instanceof Error ? e.message : "Falha ao consultar opções de reserva.");
      }
    }
  }

  if (body.useAi !== false) {
    if (!aiAvailable()) {
      notes.push("Sem ANTHROPIC_API_KEY: pesquisa de taxas por IA indisponível.");
    } else if (!full.airline) {
      notes.push("Informe a companhia para pesquisar as taxas por IA.");
    } else {
      try {
        const r = await researchFees({
          airline: full.airline,
          route: full.context ? `${full.context.origin}-${full.context.destination}` : undefined,
          currency: full.currency,
        });
        aiSearches += r.searches;
        notes.push(...r.notes);
        groups.push(r.lines);
      } catch (e) {
        notes.push(e instanceof Error ? e.message : "Falha na pesquisa por IA.");
      }
    }
  }

  return NextResponse.json({ lines: mergeFeeLines(groups), bookingOptions, notes, credits, aiSearches });
}
