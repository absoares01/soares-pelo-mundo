"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CommonFields, useCommonForm } from "@/components/CommonFields";
import { Badge, Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { useConfig } from "@/components/useConfig";
import { formatDateBR } from "@/lib/dates";
import { formatMoney, formatSearchedAt } from "@/lib/format";
import type { PriceAlert } from "@/lib/types";

const EMAIL_KEY = "spm-alert-email";

function AlertsInner() {
  const cfg = useConfig();
  const qs = useSearchParams();
  const { form, set } = useCommonForm({
    origin: qs.get("origin") ?? "",
    destination: qs.get("destination") ?? "",
    outDate: qs.get("outDate") ?? "",
    returnDate: qs.get("returnDate") ?? "",
    adults: Number(qs.get("adults")) || 1,
    currency: qs.get("currency") ?? "BRL",
  });
  const [label, setLabel] = useState(qs.get("label") ?? "");
  const [target, setTarget] = useState("");
  const [drop, setDrop] = useState("5");
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setEmail(localStorage.getItem(EMAIL_KEY) ?? "");
    } catch {
      /* sem armazenamento local */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      const d = (await res.json().catch(() => ({}))) as { alerts?: PriceAlert[]; error?: string };
      if (!res.ok) throw new Error(d.error ?? `Erro ${res.status}`);
      setAlerts(d.alerts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar alertas.");
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    if (cfg?.database) load();
  }, [cfg?.database, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label || `${form.origin} → ${form.destination}`,
          origin: form.origin,
          destination: form.destination,
          outDate: form.outDate,
          returnDate: form.returnDate || undefined,
          adults: form.adults,
          currency: form.currency,
          travelClass: form.travelClass,
          targetPrice: target,
          minDropPct: drop === "" ? 0 : Number(drop),
          notifyEmail: email,
          clientId: form.clientId || undefined,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? `Erro ${res.status}`);
      try {
        localStorage.setItem(EMAIL_KEY, email);
      } catch {
        /* ignora */
      }
      setInfo("Alerta criado. Ele será verificado automaticamente todos os dias.");
      setLabel("");
      setTarget("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o alerta.");
    }
    setSaving(false);
  }

  async function act(id: string, kind: "check" | "toggle" | "delete", alert?: PriceAlert) {
    setBusyId(id);
    setError(null);
    setInfo(null);
    try {
      if (kind === "check") {
        const res = await fetch(`/api/alerts/${id}/check`, { method: "POST" });
        const d = (await res.json().catch(() => ({}))) as {
          result?: { status: string; price: number | null; emailSent: boolean; error?: string };
          error?: string;
        };
        if (!res.ok || !d.result) throw new Error(d.error ?? `Erro ${res.status}`);
        const r = d.result;
        if (r.status === "ok") {
          setInfo(
            `Menor preço agora: ${formatMoney(r.price, alert?.currency)}. ${r.emailSent ? "E-mail enviado." : r.error ? r.error : "Critério ainda não atingido, sem e-mail."}`,
          );
        } else setError(r.error ?? "Não foi possível verificar.");
      } else if (kind === "toggle" && alert) {
        const res = await fetch(`/api/alerts/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: !alert.active }),
        });
        if (!res.ok) throw new Error("Não foi possível alterar o alerta.");
      } else if (kind === "delete") {
        if (!window.confirm("Excluir este alerta?")) {
          setBusyId(null);
          return;
        }
        const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Não foi possível excluir.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na operação.");
    }
    setBusyId(null);
  }

  async function testEmail() {
    setError(null);
    setInfo(null);
    const res = await fetch("/api/alerts/test-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: email }),
    });
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(d.error ?? "Falha ao enviar o teste.");
    else setInfo(`E-mail de teste enviado para ${email}. Confira também a caixa de spam.`);
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Alertas de preço por e-mail"
        subtitle="O app confere o preço todos os dias e avisa por e-mail quando chegar ao valor-alvo ou cair o percentual que você definir."
      />
      {cfg && !cfg.database && <Notice tone="amber">Alertas precisam do Supabase configurado (veja o README).</Notice>}
      {cfg?.database && !cfg.liveData && (
        <Notice tone="red">Sem SERPAPI_KEY os alertas não verificam nada (preços de exemplo nunca geram e-mail).</Notice>
      )}
      {cfg?.database && !cfg.email && (
        <Notice tone="amber">Envio de e-mail ainda não configurado: falta <code>RESEND_API_KEY</code> na Vercel. Os alertas serão verificados, mas nenhum e-mail sairá.</Notice>
      )}
      {cfg?.database && !cfg.cron && (
        <Notice tone="amber">A verificação automática diária está desligada: falta <code>CRON_SECRET</code> na Vercel. Você ainda pode usar “Verificar agora”.</Notice>
      )}

      <form onSubmit={create}>
        <Card className="space-y-4">
          <h2 className="text-base font-bold">Novo alerta</h2>
          <Field label="Nome do alerta" hint="Ex.: Maria — Lisboa em março">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Maria — Lisboa em março" />
          </Field>
          <CommonFields form={form} set={set} showNearby={false} showFees={false}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Valor-alvo (total, opcional)" hint="Avisa quando o menor preço ficar nesse valor ou abaixo.">
                <input type="number" min={1} className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} />
              </Field>
              <Field label="Queda mínima (%)" hint="Avisa se o preço cair esse percentual desde a última verificação. 0 = desligado.">
                <input type="number" min={0} max={90} className={inputCls} value={drop} onChange={(e) => setDrop(e.target.value)} />
              </Field>
              <Field label="Enviar e-mail para">
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required autoCapitalize="none" />
              </Field>
            </div>
          </CommonFields>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "🔔 Criar alerta"}
            </Button>
            <Button type="button" variant="secondary" onClick={testEmail} disabled={!email || (cfg !== null && !cfg.email)}>
              Enviar e-mail de teste
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cada verificação usa 1 crédito da SerpApi por alerta. O máximo de alertas verificados por dia é limitado (veja o README).
          </p>
        </Card>
      </form>

      {error && <Notice tone="red">{error}</Notice>}
      {info && <Notice tone="green">{info}</Notice>}

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Seus alertas</h2>
        {alerts === null && cfg?.database && <Spinner />}
        {alerts?.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum alerta ainda.</p>}
        {alerts?.map((a) => (
          <Card key={a.id} className="space-y-2 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold">{a.label}</p>
                <p className="text-slate-600 dark:text-slate-400">
                  {a.origin} → {a.destination} · {formatDateBR(a.out_date)}
                  {a.return_date ? ` a ${formatDateBR(a.return_date)}` : " (só ida)"} · {a.adults} pass. · aviso para {a.notify_email}
                </p>
                <p className="text-xs text-slate-500">
                  {a.target_price !== null ? `Alvo ${formatMoney(a.target_price, a.currency)}` : "Sem valor-alvo"}
                  {a.min_drop_pct > 0 ? ` · queda de ${a.min_drop_pct}%` : ""}
                </p>
              </div>
              <div className="text-right">
                <Badge tone={a.active ? "green" : "slate"}>{a.active ? "Ativo" : "Pausado"}</Badge>
                <p className="mt-1 text-lg font-bold">{a.last_price !== null ? formatMoney(a.last_price, a.currency) : "—"}</p>
                <p className="text-xs text-slate-500">
                  {a.last_checked_at ? `verificado em ${formatSearchedAt(a.last_checked_at)}` : "ainda não verificado"}
                </p>
              </div>
            </div>
            {a.last_notified_at && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Último e-mail em {formatSearchedAt(a.last_notified_at)} (preço {formatMoney(a.last_notified_price, a.currency)}).
              </p>
            )}
            {a.last_error && <p className="text-xs text-amber-800 dark:text-amber-300">Último aviso do sistema: {a.last_error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => act(a.id, "check", a)} disabled={busyId === a.id}>
                {busyId === a.id ? "Aguarde…" : "Verificar agora"}
              </Button>
              <Button variant="ghost" onClick={() => act(a.id, "toggle", a)} disabled={busyId === a.id}>
                {a.active ? "Pausar" : "Reativar"}
              </Button>
              <Button variant="ghost" onClick={() => act(a.id, "delete", a)} disabled={busyId === a.id}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AlertsInner />
    </Suspense>
  );
}
