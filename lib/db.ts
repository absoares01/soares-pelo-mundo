// Mensagens de erro do banco em português claro.
export function explainDbError(err: { message?: string; code?: string } | null | undefined): string {
  const msg = err?.message ?? "Erro desconhecido.";
  if (err?.code === "42P01" || /relation .* does not exist|could not find the table/i.test(msg)) {
    return "As tabelas do banco ainda não foram criadas. Rode o arquivo supabase/schema.sql no SQL Editor do Supabase (veja o README).";
  }
  if (/row-level security|permission denied/i.test(msg)) return "Sem permissão para salvar. Saia e entre de novo na sua conta.";
  if (/JWT|not authenticated/i.test(msg)) return "Sua sessão expirou. Entre de novo.";
  return `Não foi possível salvar: ${msg}`;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function clean(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}
