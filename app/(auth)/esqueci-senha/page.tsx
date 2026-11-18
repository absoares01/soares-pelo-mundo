"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, inputCls, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      if (err) setError(`Não foi possível enviar o e-mail: ${err.message}`);
      else setDone(true);
    } catch {
      setError("Não foi possível conectar. Tente de novo.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-navy-900">Recuperar senha</h1>
        <p className="mt-1 text-sm text-navy-600">Enviaremos um link para você criar uma nova senha.</p>
      </div>
      {done ? (
        <Notice tone="green">Se existir uma conta com esse e-mail, o link já está a caminho. Veja também o spam.</Notice>
      ) : (
        <>
          <Field label="E-mail">
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoCapitalize="none"
            />
          </Field>
          {error && <Notice tone="red">{error}</Notice>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando…" : "Enviar link"}
          </Button>
        </>
      )}
      <Link href="/login" className="block text-center text-sm font-semibold text-sky-700 hover:underline">
        Voltar para o login
      </Link>
    </form>
  );
}
