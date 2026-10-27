import { NextResponse } from "next/server";
import { parseAlertInput } from "@/lib/alerts";
import { dbError, notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) return notConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase.from("price_alerts").select("*").order("created_at", { ascending: false });
  if (error) return dbError(error.message);
  return NextResponse.json({ alerts: data });
}

export async function POST(req: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseAlertInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("price_alerts").insert(parsed.value).select("*").single();
  if (error) {
    const hint = /price_alerts/.test(error.message) ? " Rode o SQL novo do README (tabela price_alerts) no Supabase." : "";
    return dbError(error.message + hint);
  }
  return NextResponse.json({ alert: data }, { status: 201 });
}
