import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { QuotationBuilder } from "@/components/quotations/QuotationBuilder";
import { getProfile, getUser, nextQuotationCode } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Novo orçamento" };

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  const profile = await getProfile(user!);
  const supabase = await createClient();
  const { data } = await supabase.from("tf_customers").select("id,name").order("name");
  const code = await nextQuotationCode();

  return (
    <div>
      <PageHeader title="Novo orçamento" />
      <QuotationBuilder
        items={[]}
        customers={(data ?? []) as { id: string; name: string }[]}
        defaults={{
          code,
          markup: Number(profile.default_markup) || 15,
          currency: profile.currency || "BRL",
          terms: profile.terms ?? "",
          customerId: sp.cliente ?? "",
        }}
      />
    </div>
  );
}
