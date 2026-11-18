import type { ReactNode } from "react";
import { Logo, Notice } from "@/components/ui";
import { supabaseConfigured } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />
        <Logo light />
        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold leading-tight">Toda a operação da sua assessoria de viagens em um só lugar.</h2>
          <ul className="mt-8 space-y-3 text-navy-100">
            <li>✔ Clientes e oportunidades organizados</li>
            <li>✔ Orçamentos com custo, margem e lucro automáticos</li>
            <li>✔ Roteiros dia a dia prontos para PDF</li>
            <li>✔ Propostas com a sua marca, compartilhadas por link</li>
          </ul>
        </div>
        <p className="relative text-sm text-navy-300">Chega de planilhas e propostas feitas à mão.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {!supabaseConfigured() && (
            <Notice tone="amber" className="mb-4">
              O banco de dados ainda não foi configurado (variáveis do Supabase). Veja o passo a passo no README.
            </Notice>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
