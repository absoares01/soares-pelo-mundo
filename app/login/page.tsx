"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, inputCls, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <Card className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">✈️ Soares pelo Mundo</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Acesso da equipe</p>
        </div>
        {!configured ? (
          <Notice tone="amber">O login ainda não foi configurado (Supabase). Veja o README.</Notice>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="E-mail">
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            {error && <Notice tone="red">{error}</Notice>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
