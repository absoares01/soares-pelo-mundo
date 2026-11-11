import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { QuotationBuilder } from "@/components/quotations/QuotationBuilder";
import { getProfile, getUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Quotation, QuotationItem } from "@/lib/types";

export const metadata: Metadata = { title: "Orçamento" };

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const profile = await getProfile(user!);
  const supabase = await createClient();
  const { data } = await supabase.from("tf_quotations").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const [items, customers] = await Promise.all([
    supabase.from("tf_quotation_items").select("*").eq("quotation_id", id).order("position"),
    supabase.from("tf_customers").select("id,name").order("name"),
  ]);
  const quotation = data as Quotation;

  return (
    <div>
      <PageHeader title={quotation.title} subtitle="Edite os itens e acompanhe custo, margem e preço final." />
      <QuotationBuilder
        key={quotation.updated_at}
        quotation={quotation}
        items={(items.data ?? []) as QuotationItem[]}
        customers={(customers.data ?? []) as { id: string; name: string }[]}
        defaults={{
          code: quotation.code,
          markup: Number(profile.default_markup) || 15,
          currency: profile.currency || "BRL",
          terms: profile.terms ?? "",
          customerId: "",
        }}
      />
    </div>
  );
}
