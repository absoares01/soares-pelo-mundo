"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "./ui";
import { createClient } from "@/lib/supabase/browser";

const links = [
  { href: "/", label: "Início" },
  { href: "/clientes", label: "Clientes" },
  { href: "/historico", label: "Histórico" },
  { href: "/comparar", label: "Comparar" },
];

const hasAuth = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { items } = useCart();

  if (path === "/login" || path.startsWith("/p/")) return null;

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="text-base font-bold text-teal-700 dark:text-teal-400">
          ✈️ Soares pelo Mundo
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cx(
                "rounded-lg px-2.5 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-800",
                (l.href === "/" ? path === "/" : path.startsWith(l.href))
                  ? "bg-slate-100 text-teal-700 dark:bg-slate-800 dark:text-teal-300"
                  : "text-slate-600 dark:text-slate-300",
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/propostas/nova"
            className="rounded-lg bg-teal-600 px-2.5 py-1 font-semibold text-white hover:bg-teal-700"
          >
            Proposta{items.length > 0 ? ` (${items.length})` : ""}
          </Link>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {hasAuth && (
            <button
              onClick={logout}
              className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
