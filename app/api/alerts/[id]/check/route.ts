import { NextResponse } from "next/server";
import { runAlertCheck } from "@/lib/alerts";
import { dbError, notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { PriceAlert } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Verificação manual ("Verificar agora"): consome 1 crédito da SerpApi e, se o critério for
// atingido, envia o e-mail normalmente.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("price_alerts").select("*").eq("id", id).single();
  if (error || !data) return dbError(error?.message ?? "Alerta não encontrado.");

  const appUrl = new URL(req.url).origin;
  const result = await runAlertCheck(supabase, data as PriceAlert, { allowEmail: true, appUrl });
  const { data: fresh } = await supabase.from("price_alerts").select("*").eq("id", id).single();
  return NextResponse.json({ result, alert: fresh ?? data });
}
