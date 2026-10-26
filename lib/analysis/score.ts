import type { Flight } from "../types";

// Pontuação de conveniência (0-100), calculada por regras simples e explicáveis.
export function convenienceScore(f: Flight): { score: number; notes: string[] } {
  let score = 100;
  const notes: string[] = [];

  if (f.stops > 0) {
    score -= f.stops * 15;
    notes.push(`${f.stops} escala${f.stops > 1 ? "s" : ""} (−${f.stops * 15})`);
  }
  if (f.longestLayoverMin > 180) {
    const p = Math.min(30, Math.round((f.longestLayoverMin - 180) / 12));
    score -= p;
    notes.push(`conexão longa de ${Math.round(f.longestLayoverMin / 60)}h (−${p})`);
  }
  if (f.overnightLayover) {
    score -= 15;
    notes.push("conexão com pernoite (−15)");
  }
  if (f.airportChange) {
    score -= 15;
    notes.push("troca de aeroporto na conexão (−15)");
  }
  const hour = Number((f.departure.split(" ")[1] ?? "12:00").split(":")[0]);
  if (hour < 6 || hour >= 23) {
    score -= 8;
    notes.push("saída de madrugada ou muito tarde (−8)");
  }
  if (notes.length === 0) notes.push("sem pontos de atenção");
  return { score: Math.max(0, Math.min(100, score)), notes };
}

export function cheapestOf(flights: Flight[]): Flight | null {
  let best: Flight | null = null;
  for (const f of flights) {
    if (f.price === null) continue;
    if (
      !best ||
      f.price < (best.price as number) ||
      (f.price === best.price && f.durationMin < best.durationMin)
    ) {
      best = f;
    }
  }
  return best;
}

export function fastestOf(flights: Flight[]): Flight | null {
  let best: Flight | null = null;
  for (const f of flights) {
    if (f.price === null) continue;
    if (!best || f.durationMin < best.durationMin) best = f;
  }
  return best;
}
