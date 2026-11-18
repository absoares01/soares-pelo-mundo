"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputCls, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

function translate(msg: string): string {
  if (/already registered|already been registered/i.test(msg)) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (/password/i.test(msg) && /(short|least|weak)/i.test(msg)) return "Senha fraca: use pelo menos 8 caracteres.";
  if (/rate limit|too many|seconds/i.test(msg)) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (/signups? (not allowed|disabled)/i.test(msg)) return "Novos cadastros estão desativados neste momento.";
  return `Não foi possível criar a conta: ${msg}`;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", agency: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (form.password !== form.confirm) return setError("As senhas não são iguais.");
    setLoading(true);
    try {
      const { data, error: err } = await createClient().auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.name.trim(), agency_name: form.agency.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setError(translate(err.message));
        setLoading(false);
        return;
      }
      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }
      setSent(true);
    } catch {
      setError("Não foi possível conectar. Verifique a configuração do Supabase e a sua internet.");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-navy-900">Confira seu e-mail</h1>
        <Notice tone="green">
          Enviamos um link de confirmação para <strong>{form.email}</strong>. Abra o e-mail (veja também o spam) e clique no
          link para ativar a conta.
        </Notice>
        <Link href="/login" className="text-sm font-semibold text-sky-700 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-navy-900">Criar conta</h1>
        <p className="mt-1 text-sm text-navy-600">Comece a organizar a sua assessoria de viagens.</p>
      </div>
      <Field label="Seu nome">
        <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required autoComplete="name" />
      </Field>
      <Field label="Nome da assessoria / agência" hint="Aparece nas propostas e roteiros. Dá para mudar depois.">
        <input className={inputCls} value={form.agency} onChange={(e) => set("agency", e.target.value)} required />
      </Field>
      <Field label="E-mail">
        <input
          type="email"
          className={inputCls}
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          autoComplete="email"
          autoCapitalize="none"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha" hint="Mínimo de 8 caracteres.">
          <input
            type="password"
            className={inputCls}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            autoComplete="new-password"
          />
        </Field>
        <Field label="Repita a senha">
          <input
            type="password"
            className={inputCls}
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            required
            autoComplete="new-password"
          />
        </Field>
      </div>
      {error && <Notice tone="red">{error}</Notice>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Criando conta…" : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-navy-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-sky-700 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
