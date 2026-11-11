"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, inputCls, Notice } from "@/components/ui";
import { clean, explainDbError } from "@/lib/db";
import { createClient } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/types";

const CURRENCIES = ["BRL", "USD", "EUR", "GBP"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [f, setF] = useState({
    full_name: profile.full_name ?? "",
    agency_name: profile.agency_name ?? "",
    tagline: profile.tagline ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    instagram: profile.instagram ?? "",
    logo_url: profile.logo_url ?? "",
    brand_color: profile.brand_color || "#0f1f3d",
    default_markup: String(profile.default_markup ?? 15).replace(".", ","),
    currency: profile.currency || "BRL",
    terms: profile.terms ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    setMsg(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!HEX.test(f.brand_color)) return setMsg({ tone: "red", text: "A cor da marca precisa estar no formato #RRGGBB." });
    const markup = Number(f.default_markup.replace(",", "."));
    if (!Number.isFinite(markup) || markup < 0 || markup > 500) return setMsg({ tone: "red", text: "Informe um markup padrão entre 0 e 500%." });
    setSaving(true);
    const { error } = await createClient()
      .from("tf_profiles")
      .upsert({
        id: profile.id,
        full_name: clean(f.full_name),
        agency_name: clean(f.agency_name),
        tagline: clean(f.tagline),
        phone: clean(f.phone),
        email: clean(f.email),
        website: clean(f.website),
        instagram: clean(f.instagram),
        logo_url: clean(f.logo_url),
        brand_color: f.brand_color,
        default_markup: markup,
        currency: f.currency,
        terms: clean(f.terms),
      });
    setSaving(false);
    if (error) return setMsg({ tone: "red", text: explainDbError(error) });
    setMsg({ tone: "green", text: "Configurações salvas." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Sua assessoria</h2>
        <p className="text-sm text-navy-600">Estas informações aparecem nas propostas e nos roteiros enviados aos clientes.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome">
            <input className={inputCls} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Nome da assessoria / marca">
            <input className={inputCls} value={f.agency_name} onChange={(e) => set("agency_name", e.target.value)} placeholder="Ex.: Soares pelo Mundo" />
          </Field>
          <Field label="Slogan (opcional)" className="sm:col-span-2">
            <input className={inputCls} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Viagens sob medida, do planejamento ao retorno" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input type="tel" className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="E-mail de contato">
            <input type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} autoCapitalize="none" />
          </Field>
          <Field label="Site">
            <input className={inputCls} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="www.seusite.com.br" />
          </Field>
          <Field label="Instagram">
            <input className={inputCls} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@suaassessoria" />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Identidade visual</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cor da marca" hint="Usada na capa e nos destaques dos PDFs.">
            <div className="flex items-center gap-3">
              <input type="color" aria-label="Escolher cor" className="h-10 w-14 cursor-pointer rounded border border-navy-200 bg-white" value={HEX.test(f.brand_color) ? f.brand_color : "#0f1f3d"} onChange={(e) => set("brand_color", e.target.value)} />
              <input className={inputCls} value={f.brand_color} onChange={(e) => set("brand_color", e.target.value)} maxLength={7} />
            </div>
          </Field>
          <Field label="Endereço (URL) do logotipo" hint="Cole o link de uma imagem pública. Opcional.">
            <input className={inputCls} value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" autoCapitalize="none" />
          </Field>
        </div>
        <div className="overflow-hidden rounded-xl text-white" style={{ background: HEX.test(f.brand_color) ? f.brand_color : "#0f1f3d" }}>
          <div className="flex items-center gap-3 p-4">
            {f.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.logo_url} alt="" className="h-9 w-auto rounded bg-white/90 p-1" />
            )}
            <div>
              <p className="font-display text-lg font-semibold">{f.agency_name || "Sua assessoria de viagens"}</p>
              <p className="text-xs text-sky-200">{f.tagline || "Prévia da capa da proposta"}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Padrões para novos orçamentos e propostas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Markup padrão (%)" hint="Acréscimo sobre o custo de cada item novo.">
            <input inputMode="decimal" className={inputCls} value={f.default_markup} onChange={(e) => set("default_markup", e.target.value)} />
          </Field>
          <Field label="Moeda">
            <select className={inputCls} value={f.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Termos e condições padrão" className="sm:col-span-2">
            <textarea className={inputCls} rows={5} value={f.terms} onChange={(e) => set("terms", e.target.value)} placeholder="Regras de cancelamento, validade, formas de pagamento…" />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar configurações"}
        </Button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </form>
  );
}
