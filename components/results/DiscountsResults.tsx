"use client";

import { formatDateBR } from "@/lib/dates";
import type { DiscountOffer, DiscountsResult, OfferKind } from "@/lib/types";
import { ResultMeta } from "../ResultMeta";
import { Badge, Card, Notice } from "../ui";

const KIND_LABEL: Record<OfferKind, string> = {
  cupom: "Cupom",
  promocao_relampago: "Promoção relâmpago",
  estudante: "Estudante",
  app: "Exclusivo do app",
  fidelidade: "Fidelidade",
  cartao: "Cartão",
  newsletter: "Newsletter",
  regional: "Regional",
  outro: "Outro",
};

function OfferCard({ o }: { o: DiscountOffer }) {
  return (
    <Card className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold">{o.title}</h3>
        <Badge tone="blue">{KIND_LABEL[o.kind]}</Badge>
        <Badge tone={o.sourceKind === "oficial" ? "green" : "slate"}>
          {o.sourceKind === "oficial" ? "Fonte oficial" : "Parceiro"}
        </Badge>
      </div>
      {o.code && (
        <p>
          Código: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold dark:bg-slate-800">{o.code}</code>
        </p>
      )}
      <p>
        <span className="font-semibold">Como obter:</span> {o.requirements}
      </p>
      <p>
        <span className="font-semibold">Restrições:</span> {o.restrictions}
      </p>
      <p>
        <span className="font-semibold">Validade:</span>{" "}
        {o.validUntil ? (
          formatDateBR(o.validUntil)
        ) : (
          <span className="text-amber-700 dark:text-amber-400">a fonte não informa — confirmar antes de usar</span>
        )}
      </p>
      <blockquote className="border-l-4 border-slate-300 pl-3 text-xs italic text-slate-600 dark:border-slate-700 dark:text-slate-400">
        “{o.evidence}”
      </blockquote>
      <p className="text-xs">
        Fonte:{" "}
        <a className="font-semibold underline" href={o.sourceUrl} target="_blank" rel="noreferrer noopener">
          {o.sourceTitle}
        </a>
      </p>
    </Card>
  );
}

export function DiscountsResults({ result }: { result: DiscountsResult }) {
  const { meta, query, offers, discarded, notes } = result;
  const totalDiscarded = Object.values(discarded).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-5">
      <ResultMeta meta={meta} />
      <Card className="text-sm">
        Pesquisa sobre <strong>{query.target}</strong>
        {query.route ? ` · rota ${query.route}` : ""}
        {query.travelDate ? ` · viagem em ${formatDateBR(query.travelDate)}` : ""}.
      </Card>

      {offers.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">{offers.length} oferta(s) verificável(is)</h2>
          {offers.map((o) => (
            <OfferCard key={`${o.title}|${o.sourceUrl}`} o={o} />
          ))}
        </div>
      ) : (
        <Notice tone="blue">Nenhuma oferta passou na verificação de fonte.</Notice>
      )}

      {notes.length > 0 && (
        <Card className="text-sm">
          <p className="font-semibold">Observações da pesquisa</p>
          <ul className="mt-1 list-disc pl-5">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      )}

      {totalDiscarded > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Itens descartados automaticamente: {discarded.expired} vencidos, {discarded.noSource} sem link de fonte,{" "}
          {discarded.unretrievedUrl} com link que a pesquisa não consultou, {discarded.thirdParty} de sites de terceiros,{" "}
          {discarded.invalid} incompletos.
        </p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Textos extraídos por IA de páginas públicas. Sempre abra a fonte e confirme as condições antes de usar com um cliente.
      </p>
    </div>
  );
}
