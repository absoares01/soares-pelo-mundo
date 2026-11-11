"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { explainDbError } from "@/lib/db";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "./ui";

// Exclui uma linha (a segurança do banco garante que só vale para os seus dados).
export function DeleteButton({
  table,
  id,
  redirectTo,
  confirmText,
  label = "Excluir",
  variant = "secondary",
}: {
  table: string;
  id: string;
  redirectTo?: string;
  confirmText: string;
  label?: string;
  variant?: "secondary" | "ghost" | "danger";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    const { error } = await createClient().from(table).delete().eq("id", id);
    if (error) {
      window.alert(explainDbError(error));
      setBusy(false);
      return;
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
    setBusy(false);
  }

  return (
    <Button variant={variant} onClick={go} disabled={busy} className="text-red-700 hover:text-red-800">
      {busy ? "Excluindo…" : label}
    </Button>
  );
}
