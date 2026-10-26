"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { useConfig } from "@/components/useConfig";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export default function ClientsPage() {
  const cfg = useConfig();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data = (await res.json().catch(() => ({}))) as { clients?: Client[]; error?: string };
    if (!res.ok) setError(data.error ?? "Não foi possível carregar os clientes.");
    else {
      setError(null);
      setClients(data.clients ?? []);
    }
  }, []);

  useEffect(() => {
    if (cfg?.database) load();
  }, [cfg?.database, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setForm({ name: "", email: "", phone: "", notes: "" });
    load();
  }

  if (cfg && !cfg.database) {
    return (
      <div className="space-y-5">
        <PageTitle title="Clientes" />
        <Notice tone="amber">Configure o Supabase (veja o README) para cadastrar clientes e guardar buscas por cliente.</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Clientes" subtitle="Cadastro com anotações internas. As anotações nunca aparecem nas propostas." />

      <form onSubmit={add}>
        <Card className="space-y-3">
          <h2 className="font-bold">Novo cliente</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nome">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="E-mail">
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Observações internas">
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Preferências, milhas, restrições de horário…"
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Cadastrar cliente"}
          </Button>
        </Card>
      </form>

      {error && <Notice tone="red">{error}</Notice>}
      {!clients && !error && <Spinner />}
      {clients && clients.length === 0 && <p className="text-sm text-slate-500">Nenhum cliente cadastrado ainda.</p>}
      {clients && clients.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="block">
              <Card className="h-full transition hover:border-teal-500">
                <p className="font-bold">{c.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{[c.email, c.phone].filter(Boolean).join(" · ") || "Sem contato"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
