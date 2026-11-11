"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { Button, Card, Field, inputCls, Notice } from "@/components/ui";
import { clean, explainDbError, newId } from "@/lib/db";
import { dateBR, money, whatsappLink } from "@/lib/format";
import { PROPOSAL_STATUS, PROPOSAL_STATUS_ORDER } from "@/lib/labels";
import { createClient } from "@/lib/supabase/browser";
import type { PriceDisplay, Proposal, ProposalStatus } from "@/lib/types";

export interface QuotationOption {
  id: string;
  code: string;
  title: string;
  customer_id: string | null;
  customer_name: string | null;
  total_price_cents: number;
  currency: string;
}
export interface ItineraryOption {
  id: string;
  title: string;
  customer_id: string | null;
}

const PRICE_MODES: { value: PriceDisplay; label: string; hint: string }[] = [
  { value: "detalhado", label: "Detalhado", hint: "Cada item com seu valor." },
  { value: "por_categoria", label: "Por categoria", hint: "Voos, hospedagem, passeios… com subtotais." },
  { value: "total", label: "Somente o total", hint: "Mostra apenas o valor final da viagem." },
];

export function ProposalEditor({
  proposal,
  initial,
  customers,
  quotations,
  itineraries,
}: {
  proposal?: Proposal | null;
  initial?: Partial<Proposal>;
  customers: { id: string; name: string; phone?: string | null }[];
  quotations: QuotationOption[];
  itineraries: ItineraryOption[];
}) {
  const router = useRouter();
  const idRef = useRef(proposal?.id ?? newId());
  const base = { ...initial, ...proposal };
  const [f, setF] = useState({
    title: base.title ?? "",
    customer_id: base.customer_id ?? "",
    quotation_id: base.quotation_id ?? "",
    itinerary_id: base.itinerary_id ?? "",
    include_itinerary: base.include_itinerary ?? true,
    intro_message: base.intro_message ?? "",
    price_display: (base.price_display ?? "detalhado") as PriceDisplay,
    valid_until: base.valid_until ?? "",
    terms: base.terms ?? "",
    status: (base.status ?? "rascunho") as ProposalStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(!proposal);
  const saved = Boolean(proposal);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setDirty(true);
    setMsg(null);
  };

  function onQuotation(id: string) {
    const q = quotations.find((x) => x.id === id);
    setF((s) => ({
      ...s,
      quotation_id: id,
      customer_id: s.customer_id || q?.customer_id || "",
      title: s.title || (q ? q.title : ""),
    }));
    setDirty(true);
  }

  const link = proposal ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${proposal.share_token}` : "";

  async function persist(extra: Partial<{ status: ProposalStatus; sent_at: string | null }> = {}): Promise<boolean> {
    if (!f.title.trim()) {
      setError("Dê um título à proposta (ex.: Proposta Lisboa e Porto).");
      return false;
    }
    if (!f.quotation_id) {
      setError("Escolha o orçamento que será apresentado ao cliente.");
      return false;
    }
    setSaving(true);
    setError(null);
    const status = extra.status ?? f.status;
    const row: Record<string, unknown> = {
      id: idRef.current,
      title: f.title.trim(),
      customer_id: f.customer_id || null,
      quotation_id: f.quotation_id,
      itinerary_id: f.itinerary_id || null,
      include_itinerary: f.include_itinerary && Boolean(f.itinerary_id),
      intro_message: clean(f.intro_message),
      price_display: f.price_display,
      valid_until: f.valid_until || null,
      terms: clean(f.terms),
      status,
      updated_at: new Date().toISOString(),
    };
    if ("sent_at" in extra) row.sent_at = extra.sent_at;
    const { error: err } = await createClient().from("tf_proposals").upsert(row);
    setSaving(false);
    if (err) {
      setError(explainDbError(err));
      return false;
    }
    setF((s) => ({ ...s, status }));
    setDirty(false);
    return true;
  }

  async function save() {
    const ok = await persist();
    if (!ok) return;
    setMsg("Proposta salva.");
    if (!proposal) router.replace(`/propostas/${idRef.current}`);
    router.refresh();
  }

  // Publica (status "enviada"), grava a data de envio e copia o link para a área de transferência.
  async function publishAndCopy() {
    const needsPublish = f.status === "rascunho";
    const ok = await persist(needsPublish ? { status: "enviada", sent_at: new Date().toISOString() } : {});
    if (!ok) return;
    if (!proposal) {
      router.replace(`/propostas/${idRef.current}`);
      router.refresh();
      setMsg("Proposta publicada. Abra-a novamente para copiar o link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setMsg("Link copiado! Cole no WhatsApp ou e-mail do cliente.");
    } catch {
      window.prompt("Copie o link abaixo:", link);
    }
    router.refresh();
  }

  async function confirmTrip() {
    if (!f.quotation_id) return;
    if (!window.confirm("Marcar o orçamento como CONFIRMADO? A viagem passará a contar no painel como receita.")) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("tf_quotations").update({ status: "confirmado", updated_at: new Date().toISOString() }).eq("id", f.quotation_id);
    if (err) return setError(explainDbError(err));
    if (f.customer_id) await supabase.from("tf_customers").update({ status: "cliente" }).eq("id", f.customer_id);
    setMsg("Viagem confirmada! Ela já aparece no painel.");
    router.refresh();
  }

  const customerPhone = customers.find((c) => c.id === f.customer_id)?.phone ?? null;
  const wa = proposal && f.status !== "rascunho" ? whatsappLink(customerPhone, `Olá! Segue a proposta da sua viagem: ${link}`) : null;
  const quotation = quotations.find((q) => q.id === f.quotation_id);
  const itinOptions = itineraries.filter((i) => !f.customer_id || !i.customer_id || i.customer_id === f.customer_id);

  return (
    <div className="space-y-5 pb-24">
      <Link href="/propostas" className="text-sm font-medium text-sky-700 hover:underline">
        ← Propostas
      </Link>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Conteúdo da proposta</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título *" className="sm:col-span-2">
            <input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Proposta — Lua de mel em Portugal" />
          </Field>
          <Field label="Orçamento *" hint={quotation ? `Total: ${money(quotation.total_price_cents, quotation.currency)}` : "Os valores vêm do orçamento; custos e lucro nunca aparecem para o cliente."}>
            <select className={inputCls} value={f.quotation_id} onChange={(e) => onQuotation(e.target.value)}>
              <option value="">— escolher —</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.code} · {q.title}
                  {q.customer_name ? ` (${q.customer_name})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cliente">
            <select className={inputCls} value={f.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">— sem cliente —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Roteiro (opcional)">
            <select className={inputCls} value={f.itinerary_id} onChange={(e) => set("itinerary_id", e.target.value)}>
              <option value="">— sem roteiro —</option>
              {itinOptions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Validade da proposta">
            <input type="date" className={inputCls} value={f.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-navy-800 sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={f.include_itinerary} onChange={(e) => set("include_itinerary", e.target.checked)} disabled={!f.itinerary_id} />
            Incluir o roteiro dia a dia na proposta
          </label>
          <Field label="Mensagem de abertura" className="sm:col-span-2">
            <textarea className={inputCls} rows={4} value={f.intro_message} onChange={(e) => set("intro_message", e.target.value)} />
          </Field>
          <Field label="Como mostrar os valores" className="sm:col-span-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {PRICE_MODES.map((m) => (
                <label key={m.value} className={`cursor-pointer rounded-lg border p-3 text-sm ${f.price_display === m.value ? "border-sky-500 bg-sky-50" : "border-navy-200 bg-white"}`}>
                  <input type="radio" name="price_display" className="sr-only" checked={f.price_display === m.value} onChange={() => set("price_display", m.value)} />
                  <span className="block font-semibold text-navy-900">{m.label}</span>
                  <span className="block text-xs text-navy-500">{m.hint}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Termos e condições" className="sm:col-span-2" hint="Padrão definido em Configurações.">
            <textarea className={inputCls} rows={4} value={f.terms} onChange={(e) => set("terms", e.target.value)} />
          </Field>
        </div>
      </Card>

      {saved && proposal && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Compartilhar com o cliente</h2>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
            <Field label="Situação">
              <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value as ProposalStatus)}>
                {PROPOSAL_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {PROPOSAL_STATUS[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-sm text-navy-600">
              {proposal.sent_at && <>Enviada em {dateBR(proposal.sent_at)}. </>}
              {proposal.responded_at && <>Resposta do cliente em {dateBR(proposal.responded_at)}. </>}
              O link só abre para o cliente depois que a proposta sair de “Rascunho”.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={publishAndCopy} disabled={saving}>
              🔗 {f.status === "rascunho" ? "Publicar e copiar link" : "Copiar link"}
            </Button>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50">
                Enviar por WhatsApp
              </a>
            )}
            <Link href={`/propostas/${proposal.id}/pdf`} className="inline-flex items-center rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50">
              Ver / baixar PDF
            </Link>
            {f.status === "aceita" && (
              <Button variant="primary" onClick={confirmTrip}>
                ✓ Confirmar viagem no orçamento
              </Button>
            )}
          </div>
          {f.status === "aceita" && <Notice tone="green">O cliente aceitou a proposta. Confirme a viagem para contabilizá-la no painel.</Notice>}
          <div className="border-t border-navy-100 pt-3">
            <DeleteButton table="tf_proposals" id={proposal.id} redirectTo="/propostas" confirmText="Excluir esta proposta? O link enviado ao cliente deixará de funcionar." label="Excluir proposta" />
          </div>
        </Card>
      )}

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-navy-100 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-600">
            {error ? <span className="font-medium text-red-700">{error}</span> : msg ? <span className="font-medium text-emerald-700">{msg}</span> : dirty ? "Alterações não salvas." : "Tudo salvo."}
          </p>
          <Button onClick={save} disabled={saving || (!dirty && saved)}>
            {saving ? "Salvando…" : "Salvar proposta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
