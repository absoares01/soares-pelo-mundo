"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AIRPORTS } from "@/lib/airports";
import { Field, inputCls } from "./ui";
import { useConfig } from "./useConfig";

export interface CommonForm {
  origin: string;
  destination: string;
  outDate: string;
  returnDate: string;
  adults: number;
  currency: string;
  travelClass: number;
  includeNearby: boolean;
  extraOrigins: string;
  extraDestinations: string;
  needsCheckedBag: boolean;
  checkedBagFee: string;
  needsSeat: boolean;
  seatFee: string;
  clientId: string;
}

export const defaultCommon: CommonForm = {
  origin: "",
  destination: "",
  outDate: "",
  returnDate: "",
  adults: 1,
  currency: "BRL",
  travelClass: 1,
  includeNearby: true,
  extraOrigins: "",
  extraDestinations: "",
  needsCheckedBag: false,
  checkedBagFee: "",
  needsSeat: false,
  seatFee: "",
  clientId: "",
};

// Converte o estado do formulário no corpo esperado pela API.
export function toPayload(form: CommonForm) {
  return {
    origin: form.origin,
    destination: form.destination,
    outDate: form.outDate,
    returnDate: form.returnDate || undefined,
    adults: form.adults,
    currency: form.currency,
    travelClass: form.travelClass,
    includeNearby: form.includeNearby,
    extraOrigins: form.extraOrigins,
    extraDestinations: form.extraDestinations,
    clientId: form.clientId || undefined,
    fees: {
      needsCheckedBag: form.needsCheckedBag,
      checkedBagFee: Number(form.checkedBagFee) || 0,
      needsSeat: form.needsSeat,
      seatFee: Number(form.seatFee) || 0,
    },
  };
}

interface Props {
  form: CommonForm;
  set: <K extends keyof CommonForm>(key: K, value: CommonForm[K]) => void;
  returnRequired?: boolean;
  hideReturn?: boolean;
  showNearby?: boolean;
  showFees?: boolean;
  children?: ReactNode; // campos específicos do módulo
}

function AirportField({
  label,
  value,
  onChange,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  listId: string;
}) {
  return (
    <Field label={label} hint="Código IATA de 3 letras. Pode usar mais de um, separados por vírgula (ex.: GRU,CGH).">
      <input
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        list={listId}
        placeholder="GRU"
        required
        autoCapitalize="characters"
        autoComplete="off"
      />
    </Field>
  );
}

function ClientSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cfg = useConfig();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!cfg?.database) return;
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d: { clients?: { id: string; name: string }[] }) => setClients(d.clients ?? []))
      .catch(() => {});
  }, [cfg?.database]);

  if (!cfg?.database) return null;
  return (
    <Field label="Cliente (opcional)" hint="Associa esta busca ao cliente no histórico.">
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— sem cliente —</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CommonFields({ form, set, returnRequired = false, hideReturn = false, showNearby = true, showFees = true, children }: Props) {
  return (
    <div className="space-y-4">
      <datalist id="airports-list">
        {AIRPORTS.map((a) => (
          <option key={a.code} value={a.code}>
            {a.label}
          </option>
        ))}
      </datalist>

      <div className="grid gap-4 sm:grid-cols-2">
        <AirportField label="Origem" value={form.origin} onChange={(v) => set("origin", v)} listId="airports-list" />
        <AirportField label="Destino" value={form.destination} onChange={(v) => set("destination", v)} listId="airports-list" />
        <Field label="Data de ida">
          <input
            type="date"
            className={inputCls}
            value={form.outDate}
            onChange={(e) => set("outDate", e.target.value)}
            required
          />
        </Field>
        {!hideReturn && (
          <Field label={returnRequired ? "Data de volta" : "Data de volta (vazio = só ida)"}>
            <input
              type="date"
              className={inputCls}
              value={form.returnDate}
              onChange={(e) => set("returnDate", e.target.value)}
              required={returnRequired}
            />
          </Field>
        )}
      </div>

      {children}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Passageiros (adultos)">
          <input
            type="number"
            min={1}
            max={9}
            className={inputCls}
            value={form.adults}
            onChange={(e) => set("adults", Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
          />
        </Field>
        <Field label="Moeda">
          <select className={inputCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            <option value="BRL">Real (BRL)</option>
            <option value="USD">Dólar (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </select>
        </Field>
        <Field label="Classe">
          <select
            className={inputCls}
            value={form.travelClass}
            onChange={(e) => set("travelClass", Number(e.target.value))}
          >
            <option value={1}>Econômica</option>
            <option value={2}>Econômica premium</option>
            <option value={3}>Executiva</option>
            <option value={4}>Primeira</option>
          </select>
        </Field>
      </div>

      {showNearby && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.includeNearby}
              onChange={(e) => set("includeNearby", e.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
            Incluir aeroportos alternativos próximos (mesma região)
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Outros aeroportos de saída (opcional)">
              <input
                className={inputCls}
                value={form.extraOrigins}
                onChange={(e) => set("extraOrigins", e.target.value.toUpperCase())}
                placeholder="Ex.: SJK"
              />
            </Field>
            <Field label="Outros aeroportos de chegada (opcional)">
              <input
                className={inputCls}
                value={form.extraDestinations}
                onChange={(e) => set("extraDestinations", e.target.value.toUpperCase())}
                placeholder="Ex.: OPO"
              />
            </Field>
          </div>
        </div>
      )}

      {showFees && (
        <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <summary className="cursor-pointer text-sm font-semibold">
            Taxas estimadas (bagagem e assento) para o custo final
          </summary>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            O app não inventa valores de taxa. Informe aqui o valor que a companhia cobra (por trecho e por passageiro) e ele
            será somado ao custo final apenas nas opções em que a bagagem não esteja confirmada como incluída.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.needsCheckedBag}
                  onChange={(e) => set("needsCheckedBag", e.target.checked)}
                  className="h-4 w-4 accent-teal-600"
                />
                Cliente precisa de bagagem despachada
              </label>
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="Valor estimado por trecho"
                value={form.checkedBagFee}
                onChange={(e) => set("checkedBagFee", e.target.value)}
                disabled={!form.needsCheckedBag}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.needsSeat}
                  onChange={(e) => set("needsSeat", e.target.checked)}
                  className="h-4 w-4 accent-teal-600"
                />
                Cliente quer marcar assento
              </label>
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="Valor estimado por trecho"
                value={form.seatFee}
                onChange={(e) => set("seatFee", e.target.value)}
                disabled={!form.needsSeat}
              />
            </div>
          </div>
        </details>
      )}

      <ClientSelect value={form.clientId} onChange={(v) => set("clientId", v)} />
    </div>
  );
}

// Hook pequeno para gerenciar o estado do formulário.
export function useCommonForm(initial?: Partial<CommonForm>) {
  const [form, setForm] = useState<CommonForm>({ ...defaultCommon, ...initial });
  function set<K extends keyof CommonForm>(key: K, value: CommonForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return { form, set, setForm };
}
