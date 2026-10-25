import { NextResponse } from "next/server";
import { dbError, notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) return notConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,name,email,phone,notes,created_at")
    .order("name", { ascending: true });
  if (error) return dbError(error.message);
  return NextResponse.json({ clients: data });
}

export async function POST(req: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, email: clean(body.email), phone: clean(body.phone), notes: clean(body.notes) })
    .select("id,name,email,phone,notes,created_at")
    .single();
  if (error) return dbError(error.message);
  return NextResponse.json({ client: data }, { status: 201 });
}
