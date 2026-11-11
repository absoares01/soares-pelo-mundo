"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { MoneyInput } from "@/components/MoneyInput";
import { Badge, Button, Card, cx, Field, inputCls, Notice } from "@/components/ui";
import { markupFromPrice, perPerson, priceFromMarkup, quotationTotals } from "@/lib/calc";
import { clean, explainDbError, newId } from "@/lib/db";
import { money, nightsBetween, pct } from "@/lib/format";
import { CATEGORIES, CATEGORY_LIST, QUOTATION_STATUS, QUOTATION_STATUS_ORDER } from "@/lib/labels";
import { createClient } from "@/lib/supabase/browser";
import type { ItemCategory, Quotation, QuotationItem, QuotationStatus } from "@/lib/types";

interface Draft {
  id: string;
  category: ItemCategory;
  description: string;
  supplier: string;
  details: string;
  item_date: string;
  quantity: number;
  unit_cost_cents: number;
  unit_price_cents: number;
  markup: number; // % sobre o custo (só para facilitar a digitação)
}

export interface BuilderDefaults {
  code: string;
  markup: number;
  currency: string;
  terms: string;
  customerId: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function toDraft(i: QuotationItem, defaultMarkup: number): Draft {
  return {
    id: i.id,
    category: i.category,
    description: i.description,
    supplier: i.supplier ?? "",
    details: i.details ?? "",
    item_date: i.item_date ?? "",
    quantity: Number(i.quantity),
    unit_cost_cents: Number(i.unit_cost_cents),
    unit_price_cents: Number(i.unit_price_cents),
    markup: i.unit_cost_cents > 0 ? round1(markupFromPrice(i.unit_cost_cents, i.unit_price_cents)) : defaultMarkup,
  };
}

export function QuotationBuilder({
  quotation,
  items: initialItems,
  customers,
  defaults,
}: {
  quotation?: Quotation | null;
  items: QuotationItem[];
  customers: { id: string; name: string }[];
  defaults: BuilderDefaults;
}) {
  const router = useRouter();
  const idRef = useRef(quotation?.id ?? newId());
  const originalIds = useRef<string[]>(initialItems.map((i) => i.id));

  const [h, setH] = useState({
    customer_id: quotation?.customer_id ?? defaults.customerId,
    title: quotation?.title ?? "",
    destination: quotation?.destination ?? "",
    start_date: quotation?.start_date ?? "",
    end_date: quotation?.end_date ?? "",
    adults: quotation?.adults ?? 2,
    children: quotation?.children ?? 0,
    status: (quotation?.status ?? "rascunho") as QuotationStatus,
    valid_until: quotation?.valid_until ?? "",
    payment_terms: quotation?.payment_terms ?? "",
    inclusions: quotation?.inclusions ?? "",
    exclusions: quotation?.exclusions ?? "",
    notes: quotation?.notes ?? "",
  });
  const currency = quotation?.currency ?? defaults.currency;
  const [fee, setFee] = useState(quotation?.service_fee_cents ?? 0);
  const [discount, setDiscount] = useState(quotation?.discount_cents ?? 0);
  const [items, setItemsRaw] = useState<Draft[]>(initialItems.map((i) => toDraft(i, defaults.markup)));
  const [bulkMarkup, setBulkMarkup] = useState(defaults.markup);
  const [dirty, setDirty] = useState(!quotation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const touch = () => {
    setDirty(true);
    setSavedAt(null);
  };
  const setField = <K extends keyof typeof h>(k: K, v: (typeof h)[K]) => {
    setH((s) => ({ ...s, [k]: v }));
    touch();
  };
  const setItems = (fn: (cur: Draft[]) => Draft[]) => {
    setItemsRaw(fn);
    touch();
  };
  const patchItem = (id: string, patch: Partial<Draft>) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const totals = useMemo(() => quotationTotals(items, fee, discount), [items, fee, discount]);
  const travelers = h.adults + h.children;
  const nights = nightsBetween(h.start_date || null, h.end_date || null);

  function addItem(category: ItemCategory) {
    setItems((cur) => [
      ...cur,
      {
        id: newId(),
        category,
        description: "",
        supplier: "",
        details: "",
        item_date: "",
        quantity: 1,
        unit_cost_cents: 0,
        unit_price_cents: 0,
        markup: defaults.markup,
      },
    ]);
  }

  function move(id: string, dir: -1 | 1) {
    setItems((cur) => {
      const i = cur.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const copy = cur.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function applyBulk() {
    setItems((cur) => cur.map((i) => ({ ...i, markup: bulkMarkup, unit_price_cents: priceFromMarkup(i.unit_cost_cents, bulkMarkup) })));
  }

  async function save(nextStatus?: QuotationStatus) {
    if (!h.title.trim()) return setError("Dê um título ao orçamento (ex.: Lua de mel em Portugal).");
    if (h.start_date && h.end_date && h.end_date < h.start_date) return setError("A data de volta não pode ser antes da ida.");
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const id = idRef.current;
    const status = nextStatus ?? h.status;

    const qRow = {
      id,
      customer_id: h.customer_id || null,
      code: quotation?.code ?? defaults.code,
      title: h.title.trim(),
      destination: clean(h.destination),
      start_date: h.start_date || null,
      end_date: h.end_date || null,
      adults: Math.max(1, h.adults),
      children: Math.max(0, h.children),
      status,
      currency,
      service_fee_cents: fee,
      discount_cents: discount,
      total_cost_cents: totals.cost,
      total_price_cents: totals.total,
      valid_until: h.valid_until || null,
      payment_terms: clean(h.payment_terms),
      inclusions: clean(h.inclusions),
      exclusions: clean(h.exclusions),
      notes: clean(h.notes),
      updated_at: new Date().toISOString(),
    };
    const q = await supabase.from("tf_quotations").upsert(qRow);
    if (q.error) {
      setError(explainDbError(q.error));
      setSaving(false);
      return;
    }

    const rows = items.map((i, idx) => ({
      id: i.id,
      quotation_id: id,
      category: i.category,
      description: i.description.trim() || CATEGORIES[i.category].label,
      supplier: clean(i.supplier),
      details: clean(i.details),
      item_date: i.item_date || null,
      quantity: i.quantity > 0 ? i.quantity : 1,
      unit_cost_cents: i.unit_cost_cents,
      unit_price_cents: i.unit_price_cents,
      position: idx,
    }));
    if (rows.length > 0) {
      const r = await supabase.from("tf_quotation_items").upsert(rows);
      if (r.error) {
        setError(explainDbError(r.error));
        setSaving(false);
        return;
      }
    }
    const removed = originalIds.current.filter((oid) => !items.some((i) => i.id === oid));
    if (removed.length > 0) {
      const d = await supabase.from("tf_quotation_items").delete().in("id", removed);
      if (d.error) {
        setError(explainDbError(d.error));
        setSaving(false);
        return;
      }
    }
    originalIds.current = items.map((i) => i.id);
    if (nextStatus) setH((s) => ({ ...s, status: nextStatus }));
    setDirty(false);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    if (!quotation) router.replace(`/orcamentos/${id}`);
    router.refresh();
  }

  const saved = Boolean(quotation) || savedAt !== null;
  const code = quotation?.code ?? defaults.code;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-2 text-sm text-navy-600">
        <Link href="/orcamentos" className="font-medium text-sky-700 hover:underline">
          ← Orçamentos
        </Link>
        <span>·</span>
        <span className="font-semibold">{code}</span>
        <Badge tone={QUOTATION_STATUS[h.status].tone}>{QUOTATION_STATUS[h.status].label}</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-navy-900">Viagem</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título *" className="sm:col-span-2">
                <input className={inputCls} value={h.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ex.: Lua de mel em Portugal" />
              </Field>
              <Field label="Cliente">
                <select className={inputCls} value={h.customer_id} onChange={(e) => setField("customer_id", e.target.value)}>
                  <option value="">— sem cliente —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destino">
                <input className={inputCls} value={h.destination} onChange={(e) => setField("destination", e.target.value)} placeholder="Lisboa e Porto" />
              </Field>
              <Field label="Ida">
                <input type="date" className={inputCls} value={h.start_date} onChange={(e) => setField("start_date", e.target.value)} />
              </Field>
              <Field label="Volta" hint={nights ? `${nights} noite(s)` : undefined}>
                <input type="date" className={inputCls} value={h.end_date} onChange={(e) => setField("end_date", e.target.value)} />
              </Field>
              <Field label="Adultos">
                <input type="number" min={1} className={inputCls} value={h.adults} onChange={(e) => setField("adults", Math.max(1, Number(e.target.value) || 1))} />
              </Field>
              <Field label="Crianças">
                <input type="number" min={0} className={inputCls} value={h.children} onChange={(e) => setField("children", Math.max(0, Number(e.target.value) || 0))} />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy-900">Itens do orçamento</h2>
                <p className="text-xs text-navy-500">Informe o custo (o que você paga) e o markup: o preço ao cliente é calculado. Ou digite o preço e o markup se ajusta.</p>
              </div>
              <div className="flex items-end gap-2">
                <Field label="Markup para todos (%)">
                  <input type="number" min={0} className={cx(inputCls, "w-24")} value={bulkMarkup} onChange={(e) => setBulkMarkup(Number(e.target.value) || 0)} />
                </Field>
                <Button variant="secondary" onClick={applyBulk} disabled={items.length === 0}>
                  Aplicar
                </Button>
              </div>
            </div>

            {items.length === 0 && (
              <p className="rounded-xl border border-dashed border-navy-200 p-6 text-center text-sm text-navy-500">
                Nenhum item ainda. Adicione voos, hospedagem, transportes, passeios e outros custos abaixo.
              </p>
            )}

            <div className="space-y-3">
              {items.map((i, idx) => {
                const rowPrice = Math.round(i.quantity * i.unit_price_cents);
                const rowCost = Math.round(i.quantity * i.unit_cost_cents);
                return (
                  <div key={i.id} className="rounded-xl border border-navy-100 bg-navy-50/50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className={cx(inputCls, "w-auto")}
                        value={i.category}
                        onChange={(e) => patchItem(i.id, { category: e.target.value as ItemCategory })}
                        aria-label="Categoria"
                      >
                        {CATEGORY_LIST.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORIES[c].icon} {CATEGORIES[c].label}
                          </option>
                        ))}
                      </select>
                      <input
                        className={cx(inputCls, "min-w-[12rem] flex-1")}
                        value={i.description}
                        onChange={(e) => patchItem(i.id, { description: e.target.value })}
                        placeholder="Descrição (ex.: Voo GRU–LIS, executiva)"
                        aria-label="Descrição"
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => move(i.id, -1)} disabled={idx === 0} aria-label="Mover para cima" className="px-2">
                          ↑
                        </Button>
                        <Button variant="ghost" onClick={() => move(i.id, 1)} disabled={idx === items.length - 1} aria-label="Mover para baixo" className="px-2">
                          ↓
                        </Button>
                        <Button variant="ghost" onClick={() => setItems((cur) => cur.filter((x) => x.id !== i.id))} aria-label="Remover item" className="px-2 text-red-700">
                          ✕
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <Field label="Qtd.">
                        <input
                          type="number"
                          min={1}
                          step="any"
                          className={inputCls}
                          value={i.quantity}
                          onChange={(e) => patchItem(i.id, { quantity: Number(e.target.value) || 0 })}
                        />
                      </Field>
                      <Field label="Custo unit. (R$)">
                        <MoneyInput
                          cents={i.unit_cost_cents}
                          onChange={(c) => patchItem(i.id, { unit_cost_cents: c, unit_price_cents: priceFromMarkup(c, i.markup) })}
                        />
                      </Field>
                      <Field label="Markup (%)">
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          className={inputCls}
                          value={i.markup}
                          onChange={(e) => {
                            const m = Number(e.target.value) || 0;
                            patchItem(i.id, { markup: m, unit_price_cents: priceFromMarkup(i.unit_cost_cents, m) });
                          }}
                        />
                      </Field>
                      <Field label="Preço unit. (R$)">
                        <MoneyInput
                          cents={i.unit_price_cents}
                          onChange={(c) => patchItem(i.id, { unit_price_cents: c, markup: i.unit_cost_cents > 0 ? round1(markupFromPrice(i.unit_cost_cents, c)) : i.markup })}
                        />
                      </Field>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="mb-1 block text-xs font-semibold text-navy-700">Total / lucro</span>
                        <p className="text-sm font-semibold text-navy-900">{money(rowPrice, currency)}</p>
                        <p className={cx("text-xs", rowPrice - rowCost >= 0 ? "text-emerald-700" : "text-red-700")}>
                          lucro {money(rowPrice - rowCost, currency)}
                        </p>
                      </div>
                    </div>

                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-sky-700">Fornecedor, data e detalhes</summary>
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        <Field label="Fornecedor (interno)">
                          <input className={inputCls} value={i.supplier} onChange={(e) => patchItem(i.id, { supplier: e.target.value })} />
                        </Field>
                        <Field label="Data">
                          <input type="date" className={inputCls} value={i.item_date} onChange={(e) => patchItem(i.id, { item_date: e.target.value })} />
                        </Field>
                        <Field label="Detalhes (aparecem na proposta)" className="sm:col-span-3">
                          <textarea className={inputCls} rows={2} value={i.details} onChange={(e) => patchItem(i.id, { details: e.target.value })} />
                        </Field>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_LIST.map((c) => (
                <Button key={c} variant="secondary" onClick={() => addItem(c)}>
                  + {CATEGORIES[c].icon} {CATEGORIES[c].label}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-navy-900">Condições</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Situação do orçamento">
                <select className={inputCls} value={h.status} onChange={(e) => setField("status", e.target.value as QuotationStatus)}>
                  {QUOTATION_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {QUOTATION_STATUS[s].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Válido até">
                <input type="date" className={inputCls} value={h.valid_until} onChange={(e) => setField("valid_until", e.target.value)} />
              </Field>
              <Field label="Forma de pagamento" className="sm:col-span-2">
                <textarea className={inputCls} rows={2} value={h.payment_terms} onChange={(e) => setField("payment_terms", e.target.value)} placeholder="Ex.: 30% de entrada no aceite e o restante em até 6x no cartão." />
              </Field>
              <Field label="O que está incluso">
                <textarea className={inputCls} rows={3} value={h.inclusions} onChange={(e) => setField("inclusions", e.target.value)} />
              </Field>
              <Field label="O que não está incluso">
                <textarea className={inputCls} rows={3} value={h.exclusions} onChange={(e) => setField("exclusions", e.target.value)} />
              </Field>
              <Field label="Anotações internas" className="sm:col-span-2" hint="Só você vê. Nunca aparece na proposta.">
                <textarea className={inputCls} rows={2} value={h.notes} onChange={(e) => setField("notes", e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-navy-900">Resumo financeiro</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-navy-600">Custo total (fornecedores)</dt><dd className="font-semibold">{money(totals.cost, currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-600">Soma dos itens</dt><dd className="font-semibold">{money(totals.itemsPrice, currency)}</dd></div>
            </dl>
            <Field label="Taxa de assessoria (R$)" hint="Seu serviço, somado ao preço.">
              <MoneyInput cents={fee} onChange={(c) => { setFee(c); touch(); }} />
            </Field>
            <Field label="Desconto (R$)">
              <MoneyInput cents={discount} onChange={(c) => { setDiscount(c); touch(); }} />
            </Field>
            <div className="rounded-xl bg-navy-900 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-navy-200">Preço final ao cliente</p>
              <p className="mt-1 font-display text-3xl font-semibold">{money(totals.total, currency)}</p>
              <p className="mt-1 text-xs text-navy-200">{money(perPerson(totals.total, h.adults, h.children), currency)} por pessoa ({travelers} viajante{travelers > 1 ? "s" : ""})</p>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-navy-600">Lucro estimado</dt><dd className={cx("font-semibold", totals.profit >= 0 ? "text-emerald-700" : "text-red-700")}>{money(totals.profit, currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-600">Margem sobre a venda</dt><dd className="font-semibold">{pct(totals.marginPct)}</dd></div>
            </dl>
            {totals.profit < 0 && <Notice tone="red">Atenção: o preço final está abaixo do custo.</Notice>}
          </Card>

          <Card className="space-y-2">
            <h2 className="text-lg font-semibold text-navy-900">Ações</h2>
            {saved && quotation && (
              <Link href={`/propostas/nova?orcamento=${quotation.id}`} className="block rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-sky-600">
                Gerar proposta
              </Link>
            )}
            {h.status !== "confirmado" && (
              <Button variant="secondary" className="w-full" onClick={() => save("confirmado")} disabled={saving}>
                ✓ Salvar e confirmar viagem
              </Button>
            )}
            {quotation && (
              <DeleteButton
                table="tf_quotations"
                id={quotation.id}
                redirectTo="/orcamentos"
                confirmText={`Excluir o orçamento ${quotation.code}? Esta ação não pode ser desfeita.`}
                label="Excluir orçamento"
              />
            )}
          </Card>
        </aside>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-navy-100 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-600">
            {error ? <span className="font-medium text-red-700">{error}</span> : dirty ? "Alterações não salvas." : savedAt ? `Salvo às ${savedAt}.` : "Tudo salvo."}
          </p>
          <Button onClick={() => save()} disabled={saving || (!dirty && Boolean(quotation))}>
            {saving ? "Salvando…" : "Salvar orçamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
