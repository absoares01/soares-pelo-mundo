"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, inputCls, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para a sua caixa de entrada.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  return `Não foi possível entrar: ${msg}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (err) {
        setError(translate(err.message));
        setLoading(false);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Verifique a configuração do Supabase e a sua internet.");
      setLoading(false);
    }
  }

  const [linkError, setLinkError] = useState(false);
  useEffect(() => {
    setLinkError(new URLSearchParams(window.location.search).get("erro") === "link");
  }, []);

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-navy-900">Entrar</h1>
        <p className="mt-1 text-sm text-navy-600">Acesse a sua conta do TripFlow.</p>
      </div>
      {linkError && <Notice tone="amber">Esse link expirou ou já foi usado. Entre com a sua senha ou peça um novo link.</Notice>}
      <Field label="E-mail">
        <input
          type="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Senha">
        <input
          type={show ? "text" : "password"}
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-navy-700">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-navy-900" />
          Mostrar senha
        </label>
        <Link href="/esqueci-senha" className="font-medium text-sky-700 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      {error && <Notice tone="red">{error}</Notice>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-navy-600">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-sky-700 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </form>
  );
}
