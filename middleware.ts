import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege o app: sem login, só /login, /cadastro, /esqueci-senha, /auth/callback e propostas por link (/p/...).
// Se o Supabase não estiver configurado, deixa passar: as telas mostram um aviso de configuração.

type CookieToSet = { name: string; value: string; options?: object };

const PUBLIC = ["/login", "/cadastro", "/esqueci-senha", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  const path = request.nextUrl.pathname;
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

  if (path.startsWith("/p/") || path.startsWith("/api/p/")) return response;
  const isPublic = PUBLIC.includes(path);

  if (!user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (path !== "/") login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }
  if (user && (path === "/login" || path === "/cadastro")) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
