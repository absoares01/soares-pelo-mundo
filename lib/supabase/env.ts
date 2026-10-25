export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function adminConfigured(): boolean {
  return supabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Lista opcional de e-mails autorizados (ALLOWED_EMAILS="a@x.com,b@y.com").
// Camada extra de segurança caso o cadastro público do Supabase fique aberto.
export function emailAllowed(email: string | undefined | null): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  return Boolean(email && list.includes(email.toLowerCase()));
}
