"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { Button, Card, cx, Field, inputCls } from "@/components/ui";
import { clean, explainDbError, newId } from "@/lib/db";
import { addDaysISO, dateBR, daysBetween, weekdayName } from "@/lib/format";
import { ITINERARY_KIND_LIST, ITINERARY_KINDS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/browser";
import type { ItineraryFull, ItineraryKind } from "@/lib/types";

interface DItem {
  id: string;
  kind: ItineraryKind;
  item_time: string;
  title: string;
  location: string;
  description: string;
  tips: string;
}
interface DDay {
  id: string;
  day_date: string;
  title: string;
  location: string;
  notes: string;
  items: DItem[];
}

function fromFull(it?: ItineraryFull | null): DDay[] {
  return (it?.days ?? []).map((d) => ({
    id: d.id,
    day_date: d.day_date ?? "",
    title: d.title ?? "",
    location: d.location ?? "",
    notes: d.notes ?? "",
    items: d.items.map((i) => ({
      id: i.id,
      kind: i.kind,
      item_time: i.item_time ?? "",
      title: i.title,
      location: i.location ?? "",
      description: i.description ?? "",
      tips: i.tips ?? "",
    })),
  }));
}

export function ItineraryBuilder({
  itinerary,
  customers,
  defaultCustomerId,
}: {
  itinerary?: ItineraryFull | null;
  customers: { id: string; name: string }[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const idRef = useRef(itinerary?.id ?? newId());
  const orig = useRef({
    days: (itinerary?.days ?? []).map((d) => d.id),
    items: (itinerary?.days ?? []).flatMap((d) => d.items.map((i) => i.id)),
  });
  const [h, setH] = useState({
    title: itinerary?.title ?? "",
    customer_id: itinerary?.customer_id ?? defaultCustomerId ?? "",
    destination: itinerary?.destination ?? "",
    start_date: itinerary?.start_date ?? "",
    end_date: itinerary?.end_date ?? "",
    summary: itinerary?.summary ?? "",
  });
  const [days, setDaysRaw] = useState<DDay[]>(fromFull(itinerary));
  const [dirty, setDirty] = useState(!itinerary);
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
  const setDays = (fn: (d: DDay[]) => DDay[]) => {
    setDaysRaw(fn);
    touch();
  };
  const patchDay = (id: string, p: Partial<DDay>) => setDays((cur) => cur.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const patchItem = (dayId: string, id: string, p: Partial<DItem>) =>
    setDays((cur) => cur.map((d) => (d.id === dayId ? { ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...p } : i)) } : d)));

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function blankDay(date: string): DDay {
    return { id: newId(), day_date: date, title: "", location: h.destination, notes: "", items: [] };
  }

  function addDay() {
    const last = days[days.length - 1];
    const date = last?.day_date ? addDaysISO(last.day_date, 1) : days.length === 0 ? h.start_date : "";
    setDays((cur) => [...cur, blankDay(date)]);
  }

  function generateDays() {
    if (!h.start_date || !h.end_date) return setError("Informe as datas de ida e volta para gerar os dias.");
    const n = daysBetween(h.start_date, h.end_date) + 1;
    if (n < 1 || n > 60) return setError("O período precisa ter entre 1 e 60 dias.");
    setError(null);
    setDays((cur) => {
      const existing = new Set(cur.map((d) => d.day_date));
      const extra: DDay[] = [];
      for (let k = 0; k < n; k++) {
        const date = addDaysISO(h.start_date, k);
        if (!existing.has(date)) extra.push(blankDay(date));
      }
      return [...cur, ...extra].sort((a, b) => (a.day_date || "9999").localeCompare(b.day_date || "9999"));
    });
  }

  function moveDay(id: string, dir: -1 | 1) {
    setDays((cur) => {
      const i = cur.findIndex((d) => d.id === id);
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const c = cur.slice();
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  function addItem(dayId: string, kind: ItineraryKind) {
    setDays((cur) =>
      cur.map((d) =>
        d.id === dayId ? { ...d, items: [...d.items, { id: newId(), kind, item_time: "", title: "", location: "", description: "", tips: "" }] } : d,
      ),
    );
  }

  function moveItem(dayId: string, id: string, dir: -1 | 1) {
    setDays((cur) =>
      cur.map((d) => {
        if (d.id !== dayId) return d;
        const i = d.items.findIndex((x) => x.id === id);
        const j = i + dir;
        if (j < 0 || j >= d.items.length) return d;
        const c = d.items.slice();
        [c[i], c[j]] = [c[j], c[i]];
        return { ...d, items: c };
      }),
    );
  }

  function sortByTime(dayId: string) {
    setDays((cur) =>
      cur.map((d) =>
        d.id === dayId
          ? { ...d, items: d.items.slice().sort((a, b) => (a.item_time || "99:99").localeCompare(b.item_time || "99:99")) }
          : d,
      ),
    );
  }

  async function save() {
    if (!h.title.trim()) return setError("Dê um título ao roteiro (ex.: Roteiro Lisboa e Porto).");
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const id = idRef.current;

    const r1 = await supabase.from("tf_itineraries").upsert({
      id,
      title: h.title.trim(),
      customer_id: h.customer_id || null,
      destination: clean(h.destination),
      start_date: h.start_date || null,
      end_date: h.end_date || null,
      summary: clean(h.summary),
      updated_at: new Date().toISOString(),
    });
    if (r1.error) {
      setError(explainDbError(r1.error));
      setSaving(false);
      return;
    }

    const dayRows = days.map((d, idx) => ({
      id: d.id,
      itinerary_id: id,
      day_date: d.day_date || null,
      title: d.title.trim(),
      location: clean(d.location),
      notes: clean(d.notes),
      position: idx,
    }));
    if (dayRows.length) {
      const r = await supabase.from("tf_itinerary_days").upsert(dayRows);
      if (r.error) {
        setError(explainDbError(r.error));
        setSaving(false);
        return;
      }
    }
    const itemRows = days.flatMap((d) =>
      d.items.map((i, idx) => ({
        id: i.id,
        day_id: d.id,
        itinerary_id: id,
        kind: i.kind,
        item_time: clean(i.item_time),
        title: i.title.trim() || ITINERARY_KINDS[i.kind].label,
        location: clean(i.location),
        description: clean(i.description),
        tips: clean(i.tips),
        position: idx,
      })),
    );
    if (itemRows.length) {
      const r = await supabase.from("tf_itinerary_items").upsert(itemRows);
      if (r.error) {
        setError(explainDbError(r.error));
        setSaving(false);
        return;
      }
    }
    const removedItems = orig.current.items.filter((x) => !itemRows.some((i) => i.id === x));
    if (removedItems.length) await supabase.from("tf_itinerary_items").delete().in("id", removedItems);
    const removedDays = orig.current.days.filter((x) => !dayRows.some((d) => d.id === x));
    if (removedDays.length) await supabase.from("tf_itinerary_days").delete().in("id", removedDays);
    orig.current = { days: dayRows.map((d) => d.id), items: itemRows.map((i) => i.id) };

    setDirty(false);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    if (!itinerary) router.replace(`/roteiros/${id}`);
    router.refresh();
  }

  const saved = Boolean(itinerary);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/roteiros" className="font-medium text-sky-700 hover:underline">
          ← Roteiros
        </Link>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Dados do roteiro</h2>
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
          <Field label="Volta">
            <input type="date" className={inputCls} value={h.end_date} onChange={(e) => setField("end_date", e.target.value)} />
          </Field>
          <Field label="Visão geral da viagem" className="sm:col-span-2" hint="Um texto de abertura, aparece no início do PDF.">
            <textarea className={inputCls} rows={3} value={h.summary} onChange={(e) => setField("summary", e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-navy-900">Dias ({days.length})</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={generateDays}>
            Gerar dias pelo período
          </Button>
          <Button variant="secondary" onClick={addDay}>
            + Adicionar dia
          </Button>
        </div>
      </div>

      {days.length === 0 && (
        <p className="rounded-xl border border-dashed border-navy-200 bg-white/70 p-8 text-center text-sm text-navy-500">
          Nenhum dia ainda. Informe as datas e clique em <strong>Gerar dias pelo período</strong>, ou adicione um dia por vez.
        </p>
      )}

      {days.map((d, idx) => (
        <Card key={d.id} className="space-y-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-900 text-white">
              <span className="text-[9px] uppercase text-sky-200">Dia</span>
              <span className="font-display text-lg font-semibold leading-none">{idx + 1}</span>
            </div>
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[150px_1fr_1fr]">
              <Field label={d.day_date ? weekdayName(d.day_date) : "Data"}>
                <input type="date" className={inputCls} value={d.day_date} onChange={(e) => patchDay(d.id, { day_date: e.target.value })} />
              </Field>
              <Field label="Título do dia">
                <input className={inputCls} value={d.title} onChange={(e) => patchDay(d.id, { title: e.target.value })} placeholder="Chegada em Lisboa" />
              </Field>
              <Field label="Local">
                <input className={inputCls} value={d.location} onChange={(e) => patchDay(d.id, { location: e.target.value })} placeholder="Lisboa" />
              </Field>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" className="px-2" onClick={() => moveDay(d.id, -1)} disabled={idx === 0} aria-label="Mover dia para cima">↑</Button>
              <Button variant="ghost" className="px-2" onClick={() => moveDay(d.id, 1)} disabled={idx === days.length - 1} aria-label="Mover dia para baixo">↓</Button>
              <Button
                variant="ghost"
                className="px-2 text-red-700"
                onClick={() => {
                  if (d.items.length === 0 || window.confirm(`Remover o dia ${idx + 1} e seus ${d.items.length} item(ns)?`)) setDays((cur) => cur.filter((x) => x.id !== d.id));
                }}
                aria-label="Remover dia"
              >
                ✕
              </Button>
            </div>
          </div>

          <Field label="Observações do dia (opcional)">
            <textarea className={inputCls} rows={2} value={d.notes} onChange={(e) => patchDay(d.id, { notes: e.target.value })} />
          </Field>

          <div className="space-y-3">
            {d.items.map((i, k) => (
              <div key={i.id} className="rounded-xl border border-navy-100 bg-navy-50/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select className={cx(inputCls, "w-auto")} value={i.kind} onChange={(e) => patchItem(d.id, i.id, { kind: e.target.value as ItineraryKind })} aria-label="Tipo">
                    {ITINERARY_KIND_LIST.map((kd) => (
                      <option key={kd} value={kd}>
                        {ITINERARY_KINDS[kd].icon} {ITINERARY_KINDS[kd].label}
                      </option>
                    ))}
                  </select>
                  <input type="time" className={cx(inputCls, "w-28")} value={i.item_time} onChange={(e) => patchItem(d.id, i.id, { item_time: e.target.value })} aria-label="Horário" />
                  <input className={cx(inputCls, "min-w-[10rem] flex-1")} value={i.title} onChange={(e) => patchItem(d.id, i.id, { title: e.target.value })} placeholder="Título (ex.: Almoço no Time Out Market)" aria-label="Título" />
                  <div className="flex gap-1">
                    <Button variant="ghost" className="px-2" onClick={() => moveItem(d.id, i.id, -1)} disabled={k === 0} aria-label="Mover para cima">↑</Button>
                    <Button variant="ghost" className="px-2" onClick={() => moveItem(d.id, i.id, 1)} disabled={k === d.items.length - 1} aria-label="Mover para baixo">↓</Button>
                    <Button variant="ghost" className="px-2 text-red-700" onClick={() => setDays((cur) => cur.map((x) => (x.id === d.id ? { ...x, items: x.items.filter((y) => y.id !== i.id) } : x)))} aria-label="Remover item">✕</Button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input className={inputCls} value={i.location} onChange={(e) => patchItem(d.id, i.id, { location: e.target.value })} placeholder="Local / endereço" aria-label="Local" />
                  <input className={inputCls} value={i.tips} onChange={(e) => patchItem(d.id, i.id, { tips: e.target.value })} placeholder="Dica para o viajante (opcional)" aria-label="Dica" />
                  <textarea className={cx(inputCls, "sm:col-span-2")} rows={2} value={i.description} onChange={(e) => patchItem(d.id, i.id, { description: e.target.value })} placeholder="Descrição" aria-label="Descrição" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ITINERARY_KIND_LIST.map((kd) => (
              <Button key={kd} variant="secondary" onClick={() => addItem(d.id, kd)}>
                + {ITINERARY_KINDS[kd].icon} {ITINERARY_KINDS[kd].label}
              </Button>
            ))}
            {d.items.length > 1 && (
              <Button variant="ghost" onClick={() => sortByTime(d.id)}>
                Ordenar por horário
              </Button>
            )}
          </div>
        </Card>
      ))}

      {saved && itinerary && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-700">
            Salve as alterações e abra a visualização para baixar o PDF{h.start_date ? ` (viagem a partir de ${dateBR(h.start_date)})` : ""}.
          </p>
          <div className="flex gap-2">
            <Link href={`/roteiros/${itinerary.id}/pdf`} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
              Ver PDF do roteiro
            </Link>
            <DeleteButton table="tf_itineraries" id={itinerary.id} redirectTo="/roteiros" confirmText="Excluir este roteiro? Esta ação não pode ser desfeita." label="Excluir roteiro" />
          </div>
        </Card>
      )}

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-navy-100 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-600">
            {error ? <span className="font-medium text-red-700">{error}</span> : dirty ? "Alterações não salvas." : savedAt ? `Salvo às ${savedAt}.` : "Tudo salvo."}
          </p>
          <Button onClick={save} disabled={saving || (!dirty && saved)}>
            {saving ? "Salvando…" : "Salvar roteiro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
