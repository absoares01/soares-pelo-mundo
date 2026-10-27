import { NextResponse } from "next/server";
import { runAlertCheck } from "@/lib/alerts";
import { mapLimit } from "@/lib/async";
import { todayISO } from "@/lib/dates";
import { adminConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PriceAlert } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Rotina diária (Vercel Cron, ver vercel.json). Sem login: protegida por CRON_SECRET.
// A Vercel envia "Authorization: Bearer <CRON_SECRET>" automaticamente.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado: a rotina de alertas está desligada." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const db = createAdminClient();
  const today = todayISO();

  // Viagens que já passaram são desativadas.
  await db.from("price_alerts").update({ active: false }).eq("active", true).lt("out_date", today);

  const max = Math.max(1, Math.min(100, Number(process.env.ALERTS_MAX_PER_RUN) || 30));
  const { data, error } = await db
    .from("price_alerts")
    .select("*")
    .eq("active", true)
    .gte("out_date", today)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(max);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alerts = (data ?? []) as PriceAlert[];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const results = await mapLimit(alerts, 3, async (a) => {
    const r = await runAlertCheck(db, a, { allowEmail: true, appUrl });
    return { id: a.id, status: r.status, price: r.price, emailSent: r.emailSent, error: r.error };
  });

  return NextResponse.json({
    checked: results.length,
    emailsSent: results.filter((r) => r.emailSent).length,
    errors: results.filter((r) => r.status === "erro").length,
    results,
  });
}
