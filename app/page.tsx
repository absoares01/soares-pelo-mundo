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
  {
    n: 4,
    href: "/buscar/descontos",
    title: "Descontos reais antes de comprar",
    text: "Pesquisa cupons e promoções ativos em fontes oficiais, com link, validade e restrições. Só mostra o que dá para verificar.",
    ready: true,
  },
  {
    n: 5,
    href: "/buscar/taxas",
    title: "Onde a companhia cobra taxa",
    text: "Custo total real: soma bagagem, assento e extras e mostra quando a tarifa mais barata deixa de ser a mais barata.",
    ready: true,
  },
  {
    n: 6,
    href: "/buscar/risco",
    title: "Risco real da tarifa barata",
    text: "Calcula o prejuízo se precisar cancelar, mudar datas ou levar bagagem depois, e o custo esperado de cada tarifa.",
    ready: true,
  },
  {
    n: 7,
    href: "/buscar/hidden-city",
    title: "Hidden-city (trecho descartado)",
    text: "Compara preços e lista os riscos práticos e de política da companhia. Não é uma recomendação.",
    ready: true,
  },
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

        <Link href="/alertas" className="block">
          <Card className="h-full transition hover:border-teal-500 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Automação</p>
            <h2 className="mt-1 text-lg font-bold">🔔 Alertas de preço</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Receba um e-mail quando o preço de uma rota chegar ao valor-alvo ou cair.
            </p>
          </Card>
        </Link>
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
