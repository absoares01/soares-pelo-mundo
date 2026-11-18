import { createClient } from "./supabase/server";
import type { ItineraryOption, QuotationOption } from "@/components/proposals/ProposalEditor";

// Listas usadas nos seletores do editor de propostas.
export async function loadProposalOptions() {
  const supabase = await createClient();
  const [c, q, i] = await Promise.all([
    supabase.from("tf_customers").select("id,name,phone").order("name"),
    supabase.from("tf_quotations").select("id,code,title,customer_id,total_price_cents,currency,tf_customers(name)").order("created_at", { ascending: false }),
    supabase.from("tf_itineraries").select("id,title,customer_id").order("created_at", { ascending: false }),
  ]);
  const quotations: QuotationOption[] = ((q.data ?? []) as any[]).map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    customer_id: r.customer_id,
    customer_name: r.tf_customers?.name ?? null,
    total_price_cents: r.total_price_cents,
    currency: r.currency,
  }));
  return {
    customers: (c.data ?? []) as { id: string; name: string; phone: string | null }[],
    quotations,
    itineraries: (i.data ?? []) as ItineraryOption[],
  };
}
