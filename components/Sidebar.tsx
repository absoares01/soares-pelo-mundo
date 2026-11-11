"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/browser";
import { initials } from "@/lib/format";
import { cx, Logo } from "./ui";

const icons: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5c2 .7 3 2.4 3 5.5" />
    </>
  ),
  quote: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2M16 12h0M16 16h0" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z" />
      <path d="M9 4v13M15 7v13" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

const links = [
  { href: "/", label: "Painel", icon: "home" },
  { href: "/clientes", label: "Clientes", icon: "users" },
  { href: "/orcamentos", label: "Orçamentos", icon: "quote" },
  { href: "/roteiros", label: "Roteiros", icon: "map" },
  { href: "/propostas", label: "Propostas", icon: "file" },
  { href: "/configuracoes", label: "Configurações", icon: "settings" },
];

export function Sidebar({ name, agency, email }: { name: string; agency: string; email: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-white/12 text-white" : "text-navy-200 hover:bg-white/8 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className={active ? "text-sky-400" : ""}>
              <Icon name={l.icon} />
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const user = (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">
          {initials(name || email) || "TF"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name || email}</p>
          <p className="truncate text-xs text-navy-300">{agency || email}</p>
        </div>
      </div>
      <button onClick={logout} className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm text-navy-200 hover:bg-white/8 hover:text-white">
        Sair
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 py-5 lg:flex">
        <div className="mb-6 px-6">
          <Logo light />
        </div>
        {nav}
        {user}
      </aside>

      {/* Mobile */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 lg:hidden">
        <Logo light />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-navy-900 py-5">
            <div className="mb-6 flex items-center justify-between px-6">
              <Logo light />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg p-2 text-white hover:bg-white/10">
                ✕
              </button>
            </div>
            {nav}
            {user}
          </aside>
        </div>
      )}
    </>
  );
}
