"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Botões que o CLIENTE vê na página pública: aceitar ou recusar a proposta.
export function RespondButtons({ token, initial }: { token: string; initial: "enviada" | "aceita" | "recusada" }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "aceita" | "recusada") {
    const text = action === "aceita" ? "Confirmar que você aceita esta proposta?" : "Tem certeza de que deseja recusar esta proposta?";
    if (!window.confirm(text)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/p/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Não foi possível registrar sua resposta.");
      setStatus(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar sua resposta.");
    }
    setBusy(false);
  }

  if (status === "aceita")
    return (
      <div className="no-print rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center text-emerald-900">
        <p className="text-lg font-semibold">🎉 Proposta aceita!</p>
        <p className="text-sm">Obrigado! Em breve entraremos em contato para os próximos passos.</p>
      </div>
    );
  if (status === "recusada")
    return (
      <div className="no-print rounded-2xl border border-navy-200 bg-white p-5 text-center text-navy-800">
        <p className="font-semibold">Resposta registrada.</p>
        <p className="text-sm">Obrigado pelo retorno. Se quiser ajustar algo, é só falar com a gente.</p>
      </div>
    );

  return (
    <div className="no-print rounded-2xl border border-sky-200 bg-sky-50 p-5 text-center">
      <p className="font-semibold text-navy-900">Gostou da proposta?</p>
      <p className="mb-4 text-sm text-navy-600">Responda por aqui e avisamos seu consultor na hora.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="accent" onClick={() => send("aceita")} disabled={busy}>
          ✓ Aceitar proposta
        </Button>
        <Button variant="secondary" onClick={() => send("recusada")} disabled={busy}>
          Recusar
        </Button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
