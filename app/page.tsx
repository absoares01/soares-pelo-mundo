import Link from "next/link";
import { Card, Notice, PageTitle } from "@/components/ui";
import { hasSerpApiKey } from "@/lib/serpapi";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const modules = [
  {
    n: 1,
    href: "/buscar/datas",
    title: "Dias mais baratos para voar",
    text: "Compara combinações de ida e volta numa janela de dias e mostra as 3 melhores, com a economia sobre as datas originais.",
    ready: true,
  },
  {
    n: 2,
    href: "/buscar/ocultos",
    title: "Voos que quase ninguém vê",
    text: "Inclui aeroportos alternativos, baixo custo e conexões fora de destaque, ordenando pelo custo final esperado.",
    ready: true,
  },
  {
    n: 3,
    href: "/buscar/escalas",
    title: "Rota mais barata com escalas",
    text: "Procura rotas com 1 ou 2 escalas abaixo do seu valor, com a troca entre economia e tempo extra.",
    ready: true,
  },
  { n: 4, title: "Descontos reais antes de comprar", text: "Cupons e promoções verificáveis.", ready: false },
  { n: 5, title: "Onde a companhia cobra taxa", text: "Custo total real: bagagem, assento e extras.", ready: false },
  { n: 6, title: "Risco real da tarifa barata", text: "Regras de alteração, cancelamento e reembolso.", ready: false },
  { n: 7, title: "Hidden-city (trecho descartado)", text: "Economia contra riscos práticos e de política.", ready: false },
];

export default function Home() {
  const live = hasSerpApiKey();
  const db = supabaseConfigured();
  return (
    <div className="space-y-6">
      <PageTitle
        title="Painel de busca de passagens"
        subtitle="Escolha um módulo, pesquise, adicione as melhores opções à proposta e envie ao cliente."
      />

      {!live && (
        <Notice tone="red">
          <strong>Modo exemplo ativo.</strong> Configure a variável <code>SERPAPI_KEY</code> para ver preços reais. Enquanto
          isso, todos os voos exibidos são fictícios e identificados como tal.
        </Notice>
      )}
      {!db && (
        <Notice tone="amber">
          Supabase não configurado: login, clientes, histórico e propostas por link ficam desativados. Veja o README.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const body = (
            <Card className={m.ready ? "h-full transition hover:border-teal-500 hover:shadow-md" : "h-full opacity-60"}>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                Módulo {m.n}
                {!m.ready && " · em breve"}
              </p>
              <h2 className="mt-1 text-lg font-bold">{m.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{m.text}</p>
            </Card>
          );
          return m.ready && m.href ? (
            <Link key={m.n} href={m.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={m.n}>{body}</div>
          );
        })}

        <Link href="/clientes" className="block">
          <Card className="h-full transition hover:border-teal-500 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gestão</p>
            <h2 className="mt-1 text-lg font-bold">Clientes</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Cadastro, anotações internas e as buscas e propostas de cada cliente.
            </p>
          </Card>
        </Link>
        <Link href="/historico" className="block">
          <Card className="h-full transition hover:border-teal-500 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gestão</p>
            <h2 className="mt-1 text-lg font-bold">Histórico</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Reabra qualquer busca anterior sem gastar créditos.</p>
          </Card>
        </Link>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Preços e regras de tarifas mudam rápido e devem ser confirmados antes da compra. Os números vêm da API de voos ou de
        cálculos do próprio app.
      </p>
    </div>
  );
}
