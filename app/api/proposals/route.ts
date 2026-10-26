import { NextResponse } from "next/server";
import { dbError, notConfigured } from "@/lib/api";
import { parseProposalItems } from "@/lib/proposal";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isValidISODate } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) return notConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("id,token,title,created_at,valid_until,client_id,clients(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return dbError(error.message);
  return NextResponse.json({ proposals: data });
}

export async function POST(req: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Dê um título à proposta." }, { status: 400 });

  const items = parseProposalItems(body.items);
  if (!items) return NextResponse.json({ error: "Escolha de 1 a 10 opções válidas para a proposta." }, { status: 400 });

  const hasMock = items.some((i) => i.mock);
  if (hasMock && body.allowMock !== true) {
    return NextResponse.json(
      { error: "Há opções com DADOS DE EXEMPLO. Configure a SERPAPI_KEY para propostas reais, ou confirme que é só um teste." },
      { status: 400 },
    );
  }

  const fee = Number(body.serviceFee ?? 0);
  if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) {
    return NextResponse.json({ error: "Taxa de serviço inválida." }, { status: 400 });
  }
  const validUntil = typeof body.validUntil === "string" && body.validUntil ? body.validUntil : null;
  if (validUntil && !isValidISODate(validUntil)) {
    return NextResponse.json({ error: "Data de validade inválida." }, { status: 400 });
  }
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim().slice(0, 2000) : null;
  const currency = items[0].flight.currency || "BRL";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      title: title.slice(0, 160),
      client_id: typeof body.clientId === "string" && body.clientId ? body.clientId : null,
      items,
      currency,
      service_fee: fee,
      message,
      valid_until: validUntil,
    })
    .select("id,token")
    .single();
  if (error) return dbError(error.message);

  const row = data as { id: string; token: string };
  const link = `${new URL(req.url).origin}/p/${row.token}`;
  return NextResponse.json({ id: row.id, token: row.token, link }, { status: 201 });
}
