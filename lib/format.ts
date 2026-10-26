export function formatMoney(value: number | null | undefined, currency = "BRL"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export function formatDuration(min: number | null | undefined): string {
  if (min === null || min === undefined || Number.isNaN(min)) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function formatStops(stops: number): string {
  if (stops === 0) return "Direto";
  if (stops === 1) return "1 escala";
  return `${stops} escalas`;
}

export function formatTime(dt: string): string {
  // "2026-11-10 08:30" -> "08:30"
  return dt.split(" ")[1] ?? dt;
}

export function formatDateTimeBR(dt: string): string {
  const [d, t] = dt.split(" ");
  if (!d) return dt;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}${t ? " " + t : ""}`;
}

export function formatSearchedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}
