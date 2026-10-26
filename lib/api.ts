import { NextResponse } from "next/server";
import { supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

// Salva a busca no histórico (se o Supabase estiver configurado). Nunca derruba a busca.
export async function saveSearch(args: {
  module: string;
  title: string;
  params: unknown;
  result: unknown;
  mock: boolean;
  clientId?: string | null;
}): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("searches")
      .insert({
        module: args.module,
        title: args.title,
        params: args.params,
        result: args.result,
        mock: args.mock,
        client_id: args.clientId || null,
      })
      .select("id")
      .single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

// Fábrica de rotas POST de busca: valida, executa, salva no histórico e responde.
export function searchRoute<I extends { origin: string[]; destination: string[]; outDate: string }>(opts: {
  module: string;
  parse: (body: Record<string, unknown>) => Parsed<I>;
  run: (input: I) => Promise<{ meta: { mock: boolean } }>;
  title: (input: I) => string;
}) {
  return async function POST(req: Request) {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
    }

    const parsed = opts.parse(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    try {
      const result = await opts.run(parsed.value);
      const clientId = typeof body.clientId === "string" && body.clientId ? body.clientId : null;
      const searchId = await saveSearch({
        module: opts.module,
        title: opts.title(parsed.value),
        params: body,
        result,
        mock: result.meta.mock,
        clientId,
      });
      return NextResponse.json({ result, searchId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro inesperado na busca.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  };
}

export function notConfigured() {
  return NextResponse.json(
    { error: "Supabase não configurado. Veja o README para ativar clientes, histórico e propostas." },
    { status: 503 },
  );
}

export function dbError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
