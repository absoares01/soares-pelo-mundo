// Utilitários de data trabalhando sempre com strings "YYYY-MM-DD" (sem fuso).

const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const date = parseISO(d);
  date.setUTCDate(date.getUTCDate() + n);
  return toISO(date);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function weekdayIndex(d: string): number {
  return parseISO(d).getUTCDay();
}

export function weekdayName(d: string): string {
  return DOW[weekdayIndex(d)];
}

export function isValidISODate(d: unknown): d is string {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return toISO(parseISO(d)) === d;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function formatDateBR(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function formatDateShort(d: string): string {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}
