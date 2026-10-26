"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { PrintButton } from "@/components/PrintButton";
import { ProposalView } from "@/components/ProposalView";
import { Button, Card, Field, inputCls, Notice, PageTitle } from "@/components/ui";
import { useConfig } from "@/components/useConfig";
import { proposalToWhatsApp, type ProposalView as View } from "@/lib/proposal";

export default function NewProposalPage() {
  const cfg = useConfig();
  const { items, remove, clear } = useCart();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [serviceFee, setServiceFee] = useState("");
  const [message, setMessage] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [allowMock, setAllowMock] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!cfg?.database) return;
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d: { clients?: { id: string; name: string }[] }) => setClients(d.clients ?? []))
      .catch(() => {});
  }, [cfg?.database]);

  const hasMock = items.some((i) => i.mock);
  const clientName = clients.find((c) => c.id === clientId)?.name ?? null;

  const view: View = useMemo(
    () => ({
      title: title || "Proposta de viagem",
      clientName,
      currency: items[0]?.flight.currency ?? "BRL",
      items,
      serviceFee: Number(serviceFee) || 0,
      message: message || null,
      validUntil: validUntil || null,
      createdAt: new Date().toISOString(),
      mock: hasMock,
    }),
    [title, clientName, items, serviceFee, message, validUntil, hasMock],
  );

  async function copy(kind: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  }

  async function createLink() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        clientId: clientId || undefined,
        items,
        serviceFee: Number(serviceFee) || 0,
        message,
        validUntil: validUntil || undefined,
        allowMock,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.link) {
      setError(data.error ?? "Não foi possível criar a proposta.");
      return;
    }
    setLink(data.link);
  }

  if (items.length === 0) {
    return (
      <div className="space-y-5">
        <PageTitle title="Nova proposta" />
        <Card>
          <p className="text-sm">
            Nenhuma opção escolhida. Faça uma busca e clique em <strong>+ Adicionar à proposta</strong> nas opções que quiser
            enviar.
          </p>
          <Link href="/" className="mt-2 inline-block text-sm font-semibold text-teal-700 underline dark:text-teal-400">
            Ir para os módulos
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="no-print space-y-5">
        <PageTitle
          title="Nova proposta para o cliente"
          subtitle="A proposta mostra só dados voltados ao cliente. Suas anotações internas nunca aparecem. A taxa de serviço é somada ao total."
        />

        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título da proposta">
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lisboa em março — opções de voo"
                required
              />
            </Field>
            <Field label="Cliente">
              <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— sem cliente —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sua margem / taxa de serviço (opcional)" hint="Somada ao total mostrado ao cliente.">
              <input type="number" min={0} className={inputCls} value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} />
            </Field>
            <Field label="Proposta válida até (opcional)">
              <input type="date" className={inputCls} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
          </div>
          <Field label="Mensagem ao cliente (opcional)">
            <textarea className={inputCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Opções escolhidas ({items.length}/10)</p>
            <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>
                    {i.flight.origin} → {i.flight.destination} · {i.flight.airlines.join(" + ")} ·{" "}
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: i.flight.currency || "BRL" }).format(i.flight.price ?? 0)}
                    {i.mock && <span className="ml-1 text-xs font-bold text-red-600">EXEMPLO</span>}
                  </span>
                  <button onClick={() => remove(i.id)} className="text-xs text-red-600 underline">
                    remover
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {hasMock && (
            <Notice tone="red">
              <p>Há opções com <strong>dados de exemplo</strong> (fictícios). Não envie a clientes.</p>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowMock} onChange={(e) => setAllowMock(e.target.checked)} className="h-4 w-4 accent-red-600" />
                Entendo que é só um teste
              </label>
            </Notice>
          )}
          {error && <Notice tone="red">{error}</Notice>}

          <div className="flex flex-wrap gap-2">
            {cfg?.database ? (
              <Button onClick={createLink} disabled={busy || !title.trim() || (hasMock && !allowMock)}>
                {busy ? "Criando…" : "Criar link compartilhável"}
              </Button>
            ) : (
              <Notice tone="amber">Configure o Supabase para gerar o link compartilhável. Texto de WhatsApp e PDF já funcionam.</Notice>
            )}
            <Button variant="secondary" onClick={() => copy("wa", proposalToWhatsApp(view, link ?? undefined))}>
              {copied === "wa" ? "✓ Copiado" : "Copiar para WhatsApp"}
            </Button>
            <PrintButton />
            <Button variant="ghost" onClick={clear}>
              Limpar opções
            </Button>
          </div>

          {link && (
            <Notice tone="green">
              <p className="font-semibold">Link criado:</p>
              <p className="break-all">{link}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={() => copy("link", link)}>
                  {copied === "link" ? "✓ Copiado" : "Copiar link"}
                </Button>
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                  Abrir
                </a>
              </div>
            </Notice>
          )}
        </Card>

        <h2 className="text-lg font-bold">Prévia (o que o cliente verá)</h2>
      </div>

      <ProposalView view={view} />
    </div>
  );
}
