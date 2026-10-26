"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, inputCls, Notice, PageTitle, Spinner } from "@/components/ui";
import { formatSearchedAt } from "@/lib/format";

interface Detail {
  client: { id: string; name: string; email: string | null; phone: string | null; notes: string | null };
  searches: { id: string; module: string; title: string; mock: boolean; created_at: string }[];
  proposals: { id: string; token: string; title: string; created_at: string; valid_until: string | null }[];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as Partial<Detail> & { error?: string };
        if (!r.ok || !d.client) throw new Error(d.error ?? "Cliente não encontrado.");
        setData(d as Detail);
        setForm({
          name: d.client.name,
          email: d.client.email ?? "",
          phone: d.client.phone ?? "",
          notes: d.client.notes ?? "",
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg(res.ok ? "Salvo." : (d.error ?? "Não foi possível salvar."));
  }

  async function remove() {
    if (!confirm("Excluir este cliente? As buscas e propostas continuam no histórico, sem vínculo.")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/clientes");
    else setMsg("Não foi possível excluir.");
  }

  if (error) return <Notice tone="red">{error}</Notice>;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle title={data.client.name} />
      <form onSubmit={save}>
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nome">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="E-mail">
              <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Observações internas (nunca aparecem na proposta)">
            <textarea className={inputCls} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Salvar</Button>
            <Button type="button" variant="danger" onClick={remove}>
              Excluir cliente
            </Button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </Card>
      </form>

      <Card>
        <h2 className="mb-2 font-bold">Buscas deste cliente</h2>
        {data.searches.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma busca associada ainda. Escolha o cliente no formulário de busca.</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {data.searches.map((s) => (
              <li key={s.id} className="py-2">
                <Link href={`/historico/${s.id}`} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
                  {s.title}
                </Link>{" "}
                <span className="text-xs text-slate-500">
                  {formatSearchedAt(s.created_at)}
                  {s.mock ? " · dados de exemplo" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-bold">Propostas enviadas</h2>
        {data.proposals.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma proposta ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {data.proposals.map((p) => (
              <li key={p.id} className="py-2">
                <Link href={`/p/${p.token}`} className="font-medium text-teal-700 hover:underline dark:text-teal-400" target="_blank">
                  {p.title}
                </Link>{" "}
                <span className="text-xs text-slate-500">{formatSearchedAt(p.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
