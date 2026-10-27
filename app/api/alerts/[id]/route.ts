import { NextResponse } from "next/server";
import { dbError, notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Pausar / reativar
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { active?: unknown };
  if (typeof body.active !== "boolean") return NextResponse.json({ error: "Informe active: true ou false." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("price_alerts").update({ active: body.active }).eq("id", id).select("*").single();
  if (error) return dbError(error.message);
  return NextResponse.json({ alert: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { error } = await supabase.from("price_alerts").delete().eq("id", id);
  if (error) return dbError(error.message);
  return NextResponse.json({ ok: true });
}
