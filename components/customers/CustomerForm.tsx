"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoneyInput } from "@/components/MoneyInput";
import { Button, Card, Field, inputCls, Notice } from "@/components/ui";
import { clean, explainDbError, newId } from "@/lib/db";
import { CUSTOMER_STATUS, CUSTOMER_STATUS_ORDER, SOURCES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/browser";
import type { Customer, CustomerStatus } from "@/lib/types";

type FormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  birth_date: string;
  status: CustomerStatus;
  source: string;
  opportunity_cents: number;
  next_followup: string;
  travel_style: string;
  preferences: string;
  budget_note: string;
  history_notes: string;
  notes: string;
};

function fromCustomer(c?: Customer | null): FormState {
  return {
    name: c?.name ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    city: c?.city ?? "",
    birth_date: c?.birth_date ?? "",
    status: c?.status ?? "lead",
    source: c?.source ?? "",
    opportunity_cents: c?.opportunity_cents ?? 0,
    next_followup: c?.next_followup ?? "",
    travel_style: c?.travel_style ?? "",
    preferences: c?.preferences ?? "",
    budget_note: c?.budget_note ?? "",
    history_notes: c?.history_notes ?? "",
    notes: c?.notes ?? "",
  };
}

export function CustomerForm({ customer }: { customer?: Customer | null }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(fromCustomer(customer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Informe o nome do cliente.");
    setSaving(true);
    setError(null);
    const id = customer?.id ?? newId();
    const row = {
      id,
      name: f.name.trim(),
      email: clean(f.email),
      phone: clean(f.phone),
      city: clean(f.city),
      birth_date: f.birth_date || null,
      status: f.status,
      source: clean(f.source),
      opportunity_cents: f.opportunity_cents,
      next_followup: f.next_followup || null,
      travel_style: clean(f.travel_style),
      preferences: clean(f.preferences),
      budget_note: clean(f.budget_note),
      history_notes: clean(f.history_notes),
      notes: clean(f.notes),
    };
    const { error: err } = await createClient().from("tf_customers").upsert(row);
    if (err) {
      setError(explainDbError(err));
      setSaving(false);
      return;
    }
    setSaved(true);
    setSaving(false);
    if (!customer) router.replace(`/clientes/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Dados do cliente</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo *" className="sm:col-span-2">
            <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="E-mail">
            <input type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} autoCapitalize="none" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input type="tel" className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 91234-5678" />
          </Field>
          <Field label="Cidade">
            <input className={inputCls} value={f.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Data de nascimento">
            <input type="date" className={inputCls} value={f.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Oportunidade de venda</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Situação">
            <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value as CustomerStatus)}>
              {CUSTOMER_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STATUS[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origem do contato">
            <input className={inputCls} value={f.source} onChange={(e) => set("source", e.target.value)} list="tf-sources" />
            <datalist id="tf-sources">
              {SOURCES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Valor estimado (R$)">
            <MoneyInput cents={f.opportunity_cents} onChange={(c) => set("opportunity_cents", c)} />
          </Field>
          <Field label="Próximo contato">
            <input type="date" className={inputCls} value={f.next_followup} onChange={(e) => set("next_followup", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Preferências e histórico</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estilo de viagem" hint="Ex.: romântica, aventura, família com crianças, luxo.">
            <input className={inputCls} value={f.travel_style} onChange={(e) => set("travel_style", e.target.value)} />
          </Field>
          <Field label="Faixa de orçamento">
            <input className={inputCls} value={f.budget_note} onChange={(e) => set("budget_note", e.target.value)} placeholder="Ex.: até R$ 20 mil por pessoa" />
          </Field>
          <Field label="Preferências e restrições" className="sm:col-span-2" hint="Companhias, tipo de hotel, alimentação, mobilidade, destinos desejados…">
            <textarea className={inputCls} rows={3} value={f.preferences} onChange={(e) => set("preferences", e.target.value)} />
          </Field>
          <Field label="Viagens anteriores" className="sm:col-span-2" hint="As viagens feitas pelo TripFlow aparecem sozinhas na ficha. Registre aqui as de antes.">
            <textarea className={inputCls} rows={3} value={f.history_notes} onChange={(e) => set("history_notes", e.target.value)} />
          </Field>
          <Field label="Anotações internas" className="sm:col-span-2" hint="Só você vê. Nunca aparece nas propostas.">
            <textarea className={inputCls} rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </Card>

      {error && <Notice tone="red">{error}</Notice>}
      {saved && <Notice tone="green">Cliente salvo.</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : customer ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/clientes")}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
