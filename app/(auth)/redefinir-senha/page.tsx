"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputCls, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não são iguais.");
    setLoading(true);
    try {
      const { error: err } = await createClient().auth.updateUser({ password });
      if (err) {
        setError(`Não foi possível alterar a senha: ${err.message}`);
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-navy-900">Nova senha</h1>
        <p className="mt-1 text-sm text-navy-600">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      <Field label="Nova senha">
        <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
      </Field>
      <Field label="Repita a nova senha">
        <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
      </Field>
      {error && <Notice tone="red">{error}</Notice>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
