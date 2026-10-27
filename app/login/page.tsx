"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, inputCls, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);

interface AuthErrorLike {
  message: string;
  code?: string;
  status?: number;
}

// Descobre que tipo de chave está em NEXT_PUBLIC_SUPABASE_ANON_KEY (sem mostrar a chave).
function keyKind(key: string): { label: string; ok: boolean } {
  if (key.startsWith("sb_publishable_")) return { label: "chave Publishable (correta)", ok: true };
  if (key.startsWith("sb_secret_")) {
    return { label: "chave SECRET (ERRADA: use a Publishable)", ok: false };
  }
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      if (payload.role === "anon") return { label: "chave antiga anon (correta)", ok: true };
      if (payload.role === "service_role") {
        return { label: "chave service_role (ERRADA: use a anon ou a Publishable)", ok: false };
      }
      return { label: `chave JWT com papel "${payload.role ?? "desconhecido"}"`, ok: false };
    } catch {
      return { label: "formato de chave não reconhecido", ok: false };
    }
  }
  return { label: "formato de chave não reconhecido", ok: false };
}

function diagnose() {
  let host = "";
  let urlOk = false;
  try {
    const u = new URL(SUPABASE_URL);
    host = u.host;
    urlOk = u.protocol === "https:";
  } catch {
    host = "(endereço inválido)";
  }
  return { host, urlOk, key: keyKind(SUPABASE_KEY) };
}

// Traduz o erro do Supabase para uma explicação com o que fazer.
function explain(err: AuthErrorLike): string {
  const msg = err.message.toLowerCase();
  const code = (err.code ?? "").toLowerCase();

  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "O e-mail deste usuário ainda não foi confirmado. No Supabase, recrie o usuário marcando “Auto Confirm User” ou desligue “Confirm email” em Authentication → Sign In / Providers → Email.";
  }
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "O Supabase respondeu que e-mail ou senha não conferem. Possíveis causas: senha digitada diferente da cadastrada, e-mail com letra ou espaço diferente, ou o usuário não existe neste projeto do Supabase (confira em Authentication → Users).";
  }
  if (code === "invalid_api_key" || msg.includes("invalid api key") || msg.includes("apikey")) {
    return "A chave pública do Supabase configurada na Vercel (NEXT_PUBLIC_SUPABASE_ANON_KEY) é inválida ou de outro projeto. Confira o bloco de diagnóstico abaixo.";
  }
  if (code === "over_request_rate_limit" || err.status === 429 || msg.includes("rate limit")) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  }
  if (code === "user_banned" || msg.includes("banned")) {
    return "Este usuário está bloqueado no Supabase.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || err.status === 0) {
    return "Não foi possível falar com o Supabase. Confira o endereço em NEXT_PUBLIC_SUPABASE_URL (deve ser https://…supabase.co) e se o projeto não está pausado.";
  }
  if (msg.includes("invalid") && msg.includes("url")) {
    return "O endereço do Supabase (NEXT_PUBLIC_SUPABASE_URL) parece inválido.";
  }
  return "O Supabase recusou o login por um motivo não previsto. Envie o detalhe técnico abaixo para análise.";
}

function techDetail(err: AuthErrorLike): string {
  return [err.code ? `código: ${err.code}` : null, err.status !== undefined ? `status: ${err.status}` : null, `mensagem: ${err.message}`]
    .filter(Boolean)
    .join(" · ");
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const diag = configured ? diagnose() : null;
  const configProblem = diag !== null && (!diag.key.ok || !diag.urlOk);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        setError(explain(authError));
        setDetail(techDetail(authError));
        return;
      }

      // O Supabase aceitou. Confere se o site reconhece a sessão (e-mail autorizado, cookie gravado).
      const check = await fetch("/api/config", { cache: "no-store" });
      if (check.status === 401) {
        setError(
          "O Supabase aceitou o login, mas o site não reconheceu a sessão. Se você definiu ALLOWED_EMAILS na Vercel, confira se este e-mail está na lista; senão, apague os cookies do navegador e tente de novo.",
        );
        setDetail("resposta do site: 401 (não autenticado)");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Erro inesperado ao tentar entrar. Envie o detalhe técnico abaixo para análise.");
      setDetail(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <Card className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">✈️ Soares pelo Mundo</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Acesso da equipe</p>
        </div>
        {!configured ? (
          <Notice tone="amber">
            O login ainda não foi configurado: faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel
            (e um novo deploy depois de cadastrá-las).
          </Notice>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="E-mail">
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                required
              />
            </Field>
            <Field label="Senha">
              <input
                type={showPassword ? "text" : "password"}
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 accent-teal-600"
              />
              Mostrar senha
            </label>

            {error && (
              <Notice tone="red">
                <p>{error}</p>
                {detail && <p className="mt-2 break-words text-xs opacity-80">Detalhe técnico: {detail}</p>}
              </Notice>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando…" : "Entrar"}
            </Button>

            {diag && (
              <details open={configProblem || Boolean(error)} className="text-xs text-slate-600 dark:text-slate-400">
                <summary className="cursor-pointer font-semibold">Diagnóstico da conexão</summary>
                <ul className="mt-1 space-y-0.5">
                  <li>
                    Projeto Supabase: <strong>{diag.host}</strong>
                    {!diag.urlOk && <span className="font-bold text-red-600"> (deve começar com https://)</span>}
                  </li>
                  <li>
                    Chave pública configurada:{" "}
                    <strong className={diag.key.ok ? "" : "text-red-600"}>{diag.key.label}</strong>
                  </li>
                </ul>
                {!diag.key.ok && (
                  <p className="mt-1 font-semibold text-red-600">
                    Atenção: uma chave secreta nunca deve ficar em NEXT_PUBLIC_*. Se for o caso, gere uma nova no Supabase.
                  </p>
                )}
              </details>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}
