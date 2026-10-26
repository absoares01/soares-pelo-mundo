import { NextResponse } from "next/server";
import { notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return notConfigured();
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("searches")
    .select("id,module,title,params,result,mock,created_at,client_id")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: "Busca não encontrada." }, { status: 404 });
  return NextResponse.json({ search: data });
}
