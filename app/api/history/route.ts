import { NextResponse } from "next/server";
import { dbError, notConfigured } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) return notConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("searches")
    .select("id,module,title,mock,created_at,client_id,clients(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return dbError(error.message);
  return NextResponse.json({ searches: data });
}
