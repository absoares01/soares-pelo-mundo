import { NextResponse } from "next/server";
import { dbError, notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await params;
  const supabase = await createClient();

  const [client, searches, proposals] = await Promise.all([
    supabase.from("clients").select("id,name,email,phone,notes,created_at").eq("id", id).single(),
    supabase
      .from("searches")
      .select("id,module,title,mock,created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("proposals")
      .select("id,token,title,created_at,valid_until")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (client.error) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  return NextResponse.json({
    client: client.data,
    searches: searches.data ?? [],
    proposals: proposals.data ?? [],
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, string | null> = {};
  for (const key of ["name", "email", "phone", "notes"] as const) {
    if (key in body) {
      const v = typeof body[key] === "string" ? (body[key] as string).trim() : "";
      if (key === "name" && !v) return NextResponse.json({ error: "O nome não pode ficar vazio." }, { status: 400 });
      patch[key] = v || null;
    }
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", id)
    .select("id,name,email,phone,notes,created_at")
    .single();
  if (error) return dbError(error.message);
  return NextResponse.json({ client: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return dbError(error.message);
  return NextResponse.json({ ok: true });
}
