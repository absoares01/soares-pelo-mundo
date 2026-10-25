"use client";

import { useCallback, useState } from "react";

interface State<R> {
  loading: boolean;
  error?: string;
  result?: R;
  searchId?: string | null;
}

// Envia a busca para a API e guarda o estado (carregando, erro, resultado).
export function useSearch<R>(endpoint: string) {
  const [state, setState] = useState<State<R>>({ loading: false });

  const run = useCallback(
    async (body: unknown) => {
      setState({ loading: true });
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        let data: { result?: R; searchId?: string | null; error?: string } = {};
        try {
          data = await res.json();
        } catch {
          /* resposta sem JSON (ex.: tempo esgotado) */
        }
        if (!res.ok || !data.result) {
          const msg =
            data.error ??
            (res.status === 504
              ? "A busca demorou demais. Tente com menos combinações de datas."
              : `Não foi possível concluir a busca (erro ${res.status}).`);
          setState({ loading: false, error: msg });
          return;
        }
        setState({ loading: false, result: data.result, searchId: data.searchId });
      } catch {
        setState({ loading: false, error: "Falha de conexão. Verifique sua internet e tente de novo." });
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => setState({ loading: false }), []);
  return { ...state, run, reset, setResult: (result: R) => setState({ loading: false, result }) };
}
