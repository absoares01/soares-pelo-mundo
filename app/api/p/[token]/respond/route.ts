import { NextResponse } from "next/server";
import { todayISO } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O cliente final aceita ou recusa a proposta pelo link público (sem login).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!adminConfigured()) return NextResponse.json({ error: "Servidor não configurado." }, { status: 503 });
  if (!UUID.test(token)) return NextResponse.json({ error: "Link inválido." }, { status: 404 });

  let action: unknown;
  try {
    ({ action } = (await request.json()) as { action?: unknown });
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (action !== "aceita" && action !== "recusada") return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

  const db = createAdminClient();
  const { data } = await db.from("tf_proposals").select("id,status,valid_until").eq("share_token", token).maybeSingle();
  const p = data as { id: string; status: string; valid_until: string | null } | null;
  if (!p || p.status === "rascunho") return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  if (p.status !== "enviada") return NextResponse.json({ error: "Esta proposta já foi respondida." }, { status: 409 });
  if (p.valid_until && p.valid_until < todayISO()) return NextResponse.json({ error: "Esta proposta expirou." }, { status: 410 });

  const { error } = await db
    .from("tf_proposals")
    .update({ status: action, responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", p.id)
    .eq("status", "enviada");
  if (error) return NextResponse.json({ error: "Não foi possível registrar sua resposta." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
