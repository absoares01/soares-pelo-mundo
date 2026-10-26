import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege o app: sem login não há acesso (exceto /login e propostas por link /p/...).
// Se o Supabase não estiver configurado, roda em "modo local" sem login — mas
// bloqueia buscas reais em produção para ninguém consumir sua cota da SerpApi.

type CookieToSet = { name: string; value: string; options?: object };

function json(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");

  if (!url || !anon) {
    if (process.env.NODE_ENV === "production" && process.env.SERPAPI_KEY && isApi) {
      return json(503, "Configure o Supabase (login) antes de usar a chave real da SerpApi em produção.");
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = path === "/login" || path.startsWith("/p/");
  if (isPublic) return response;

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const authorized = Boolean(user) && (allowed.length === 0 || allowed.includes((user!.email ?? "").toLowerCase()));

  if (!authorized) {
    if (isApi) return json(401, "Não autenticado.");
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
