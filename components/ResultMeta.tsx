"use client";

import { useState } from "react";
import { formatSearchedAt } from "@/lib/format";
import type { SearchMeta } from "@/lib/types";
import { Button, Notice } from "./ui";
import { useConfig } from "./useConfig";

export function ResultMeta({ meta }: { meta: SearchMeta }) {
  return (
    <div className="space-y-2">
      {meta.mock && (
        <Notice tone="red">
          <strong>DADOS DE EXEMPLO.</strong> A chave da SerpApi (SERPAPI_KEY) não está configurada; os voos e preços abaixo
          são fictícios e servem só para testar o app. Não use com clientes.
        </Notice>
      )}
      {meta.warnings
        .filter((w) => !w.startsWith("DADOS DE EXEMPLO"))
        .map((w) => (
          <Notice key={w} tone="amber">
            {w}
          </Notice>
        ))}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Consulta feita em {formatSearchedAt(meta.searchedAt)}
        {meta.mock || meta.aiSearches !== undefined ? "" : ` · ${meta.creditsUsed} crédito(s) da SerpApi usados`}
        {meta.aiSearches !== undefined && ` · ${meta.aiSearches} busca(s) na web feitas pela IA`} · Preços e regras mudam rápido: confirme
        antes de comprar.
        {meta.googleFlightsUrl && (
          <>
            {" "}
            ·{" "}
            <a className="underline" href={meta.googleFlightsUrl} target="_blank" rel="noreferrer">
              Conferir no Google Flights
            </a>
          </>
        )}
      </p>
    </div>
  );
}

// Botão opcional: resumo em linguagem natural (só aparece se a IA estiver configurada).
export function SummaryButton({ module, result }: { module: string; result: unknown }) {
  const cfg = useConfig();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!cfg?.ai) return null;

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module, result }),
      });
      const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
      if (!res.ok || !data.summary) setError(data.error ?? "Não foi possível gerar o resumo.");
      else setText(data.summary);
    } catch {
      setError("Falha de conexão ao gerar o resumo.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={go} disabled={loading}>
        {loading ? "Gerando resumo…" : "✨ Resumo por IA"}
      </Button>
      {error && <Notice tone="red">{error}</Notice>}
      {text && (
        <Notice tone="blue">
          <p className="whitespace-pre-line">{text}</p>
          <p className="mt-1 text-xs opacity-70">Texto gerado por IA a partir dos números acima. Confira antes de enviar.</p>
        </Notice>
      )}
    </div>
  );
}
