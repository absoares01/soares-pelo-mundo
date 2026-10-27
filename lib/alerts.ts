import { formatDateBR } from "./dates";
import { emailConfigured, escapeHtml, sendEmail } from "./email";
import { formatMoney } from "./format";
import { searchFlights } from "./serpapi";
import type { PriceAlert } from "./types";

type AlertState = Pick<PriceAlert, "target_price" | "min_drop_pct" | "last_price" | "last_notified_price">;

export interface AlertDecision {
  notify: boolean;
  kind: "alvo" | "queda" | "nenhum";
  dropPct: number | null;
  resetNotified: boolean; // preço voltou a subir: permite avisar de novo numa nova queda
}

// Regra de aviso (pura, testável):
//  - "alvo": preço atual <= valor-alvo;
//  - "queda": preço caiu pelo menos `min_drop_pct`% em relação à última leitura;
//  - nunca avisa duas vezes pelo mesmo preço: só se ficar abaixo do último preço avisado.
export function decideAlert(a: AlertState, current: number): AlertDecision {
  const resetNotified = a.last_notified_price !== null && current > a.last_notified_price;
  const lastNotified = resetNotified ? null : a.last_notified_price;
  const lowerThanNotified = lastNotified === null || current < lastNotified;

  if (a.target_price !== null && current <= a.target_price && lowerThanNotified) {
    return { notify: true, kind: "alvo", dropPct: null, resetNotified };
  }
  if (a.last_price !== null && a.last_price > 0 && a.min_drop_pct > 0) {
    const drop = ((a.last_price - current) / a.last_price) * 100;
    if (drop >= a.min_drop_pct && lowerThanNotified) {
      return { notify: true, kind: "queda", dropPct: drop, resetNotified };
    }
  }
  return { notify: false, kind: "nenhum", dropPct: null, resetNotified };
}

export interface AlertCheckResult {
  status: "ok" | "sem_voos" | "exemplo" | "erro";
  price: number | null;
  previous: number | null;
  decision: AlertDecision | null;
  emailSent: boolean;
  error?: string;
}

// Cliente do banco (sessão do usuário ou chave de serviço). Tipagem mínima de propósito.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = { from: (table: string) => any };

function buildEmail(alert: PriceAlert, price: number, decision: AlertDecision, googleUrl?: string, appUrl?: string) {
  const route = `${alert.origin} → ${alert.destination}`;
  const dates = `${formatDateBR(alert.out_date)}${alert.return_date ? ` a ${formatDateBR(alert.return_date)}` : " (só ida)"}`;
  const now = formatMoney(price, alert.currency);
  const before = alert.last_price !== null ? formatMoney(alert.last_price, alert.currency) : null;
  const why =
    decision.kind === "alvo"
      ? `O preço chegou ao seu alvo de ${formatMoney(alert.target_price, alert.currency)}.`
      : `O preço caiu ${Math.round(decision.dropPct ?? 0)}% desde a última verificação${before ? ` (era ${before})` : ""}.`;

  const subject = `✈️ ${route}: menor preço agora ${now}`;
  const text = [
    `${alert.label}`,
    `${route} · ${dates} · ${alert.adults} passageiro(s)`,
    `Menor preço encontrado: ${now}`,
    why,
    googleUrl ? `Conferir no Google Flights: ${googleUrl}` : "",
    appUrl ? `Abrir o painel: ${appUrl}` : "",
    "",
    "Preços mudam rápido: confirme antes de comprar.",
  ]
    .filter(Boolean)
    .join("\n");
  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto">
<h2 style="margin:0 0 4px">✈️ ${escapeHtml(alert.label)}</h2>
<p style="margin:0 0 12px;color:#475569">${escapeHtml(route)} · ${escapeHtml(dates)} · ${alert.adults} passageiro(s)</p>
<p style="font-size:28px;font-weight:700;margin:0">${escapeHtml(now)}</p>
<p style="margin:4px 0 16px">${escapeHtml(why)}</p>
${googleUrl ? `<p><a href="${escapeHtml(googleUrl)}">Conferir no Google Flights</a></p>` : ""}
${appUrl ? `<p><a href="${escapeHtml(appUrl)}">Abrir o painel</a></p>` : ""}
<p style="color:#64748b;font-size:12px">Preços e regras mudam rápido: confirme antes de comprar.</p>
</div>`;
  return { subject, text, html };
}

export async function runAlertCheck(
  db: Db,
  alert: PriceAlert,
  opts: { allowEmail: boolean; appUrl?: string },
): Promise<AlertCheckResult> {
  const now = new Date().toISOString();
  const previous = alert.last_price;

  let result;
  try {
    result = await searchFlights({
      origin: alert.origin,
      destination: alert.destination,
      outDate: alert.out_date,
      returnDate: alert.return_date ?? undefined,
      currency: alert.currency,
      adults: alert.adults,
      travelClass: (alert.travel_class as 1 | 2 | 3 | 4) || 1,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro na consulta de preços.";
    await db.from("price_alerts").update({ last_checked_at: now, last_error: error }).eq("id", alert.id);
    return { status: "erro", price: null, previous, decision: null, emailSent: false, error };
  }

  // Em modo exemplo os preços são fictícios: nunca atualiza o alerta nem envia e-mail.
  if (result.mock) {
    return {
      status: "exemplo",
      price: null,
      previous,
      decision: null,
      emailSent: false,
      error: "Sem SERPAPI_KEY: o modo exemplo não verifica alertas.",
    };
  }

  const prices = result.flights.map((f) => f.price).filter((p): p is number => p !== null);
  if (prices.length === 0) {
    await db
      .from("price_alerts")
      .update({ last_checked_at: now, last_error: "Nenhum voo encontrado nessa data." })
      .eq("id", alert.id);
    return { status: "sem_voos", price: null, previous, decision: null, emailSent: false, error: "Nenhum voo encontrado." };
  }

  const current = Math.min(...prices);
  const decision = decideAlert(alert, current);
  let emailSent = false;
  let error: string | null = null;

  if (decision.notify && opts.allowEmail) {
    if (!emailConfigured()) {
      error = "O preço atingiu o critério, mas o envio de e-mail não está configurado (RESEND_API_KEY).";
    } else {
      try {
        const mail = buildEmail(alert, current, decision, result.googleFlightsUrl, opts.appUrl);
        await sendEmail({ to: alert.notify_email, ...mail });
        emailSent = true;
      } catch (e) {
        error = e instanceof Error ? e.message : "Falha ao enviar e-mail.";
      }
    }
  }

  const patch: Record<string, unknown> = {
    last_price: current,
    last_checked_at: now,
    last_error: error,
  };
  if (emailSent) {
    patch.last_notified_price = current;
    patch.last_notified_at = now;
  } else if (decision.resetNotified) {
    patch.last_notified_price = null;
  }
  await db.from("price_alerts").update(patch).eq("id", alert.id);

  return { status: "ok", price: current, previous, decision, emailSent, error: error ?? undefined };
}

export function parseAlertInput(body: Record<string, unknown>):
  | { ok: true; value: Omit<PriceAlert, "id" | "last_price" | "last_checked_at" | "last_notified_price" | "last_notified_at" | "last_error" | "created_at"> }
  | { ok: false; error: string } {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const label = s(body.label).slice(0, 160);
  const origin = s(body.origin).toUpperCase();
  const destination = s(body.destination).toUpperCase();
  const outDate = s(body.outDate);
  const returnDate = s(body.returnDate);
  const email = s(body.notifyEmail).toLowerCase();
  const codes = /^[A-Z]{3}(,[A-Z]{3})*$/;

  if (!label) return { ok: false, error: "Dê um nome ao alerta." };
  if (!codes.test(origin.replace(/\s+/g, ""))) return { ok: false, error: "Origem inválida (use códigos IATA, ex.: GRU)." };
  if (!codes.test(destination.replace(/\s+/g, ""))) return { ok: false, error: "Destino inválido (use códigos IATA, ex.: LIS)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(outDate)) return { ok: false, error: "Data de ida inválida." };
  if (returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) return { ok: false, error: "Data de volta inválida." };
  if (returnDate && returnDate <= outDate) return { ok: false, error: "A volta deve ser depois da ida." };
  if (outDate < new Date().toISOString().slice(0, 10)) return { ok: false, error: "A data de ida não pode estar no passado." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-mail para o aviso inválido." };

  const target = body.targetPrice === "" || body.targetPrice === null || body.targetPrice === undefined ? null : Number(body.targetPrice);
  if (target !== null && (!Number.isFinite(target) || target <= 0)) return { ok: false, error: "Valor-alvo inválido." };
  const drop = Number(body.minDropPct ?? 5);
  if (!Number.isFinite(drop) || drop < 0 || drop > 90) return { ok: false, error: "Queda mínima inválida (0 a 90%)." };
  if (target === null && drop === 0) return { ok: false, error: "Informe um valor-alvo ou uma queda mínima maior que zero." };
  const adults = Math.max(1, Math.min(9, Math.round(Number(body.adults) || 1)));
  const currency = (s(body.currency) || "BRL").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Moeda inválida." };

  return {
    ok: true,
    value: {
      label,
      origin: origin.replace(/\s+/g, ""),
      destination: destination.replace(/\s+/g, ""),
      out_date: outDate,
      return_date: returnDate || null,
      adults,
      currency,
      travel_class: Math.max(1, Math.min(4, Math.round(Number(body.travelClass) || 1))),
      target_price: target,
      min_drop_pct: drop,
      notify_email: email,
      active: body.active !== false,
      client_id: typeof body.clientId === "string" && body.clientId ? body.clientId : null,
    },
  };
}
