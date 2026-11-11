"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { explainDbError } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { deleteSample, insertSample } from "@/lib/sample";
import { createClient } from "@/lib/supabase/browser";
import { Button, Notice } from "./ui";

export function SampleDataButtons({ hasSample, compact }: { hasSample: boolean; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    const err = await insertSample(createClient(), todayISO());
    if (err) setError(explainDbError({ message: err }));
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remover todos os dados de exemplo? Seus próprios cadastros não serão afetados.")) return;
    setBusy(true);
    setError(null);
    const err = await deleteSample(createClient());
    if (err) setError(explainDbError({ message: err }));
    setBusy(false);
    router.refresh();
  }

  return (
    <div className={compact ? "" : "space-y-3"}>
      {hasSample ? (
        <Button variant="secondary" onClick={remove} disabled={busy}>
          {busy ? "Removendo…" : "Remover dados de exemplo"}
        </Button>
      ) : (
        <Button variant="accent" onClick={add} disabled={busy}>
          {busy ? "Carregando…" : "✨ Carregar dados de exemplo"}
        </Button>
      )}
      {error && <Notice tone="red" className="mt-2">{error}</Notice>}
    </div>
  );
}
