import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie que o Supabase pede para gravar (tipado de forma explícita, sem depender
// da inferência da biblioteca, que muda entre versões).
type CookieToSet = { name: string; value: string; options?: object };

// Cliente do Supabase para Server Components e rotas de API (usa a sessão do usuário logado).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list: CookieToSet[]) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }));
        } catch {
          // Chamado a partir de um Server Component: o middleware já renova a sessão.
        }
      },
    },
  });
}
