import { NextResponse } from "next/server";
import { hasSerpApiKey } from "@/lib/serpapi";
import { supabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

// Sinalizadores para a interface (nunca expõe as chaves).
export async function GET() {
  return NextResponse.json({
    liveData: hasSerpApiKey(),
    database: supabaseConfigured(),
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
