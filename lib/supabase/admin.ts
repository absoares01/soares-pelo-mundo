import { createClient } from "@supabase/supabase-js";

// Cliente com a chave de serviço. SOMENTE no servidor: usado para exibir
// propostas compartilhadas por link (/p/[token]) sem exigir login do cliente final.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
