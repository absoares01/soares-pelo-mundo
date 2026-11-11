import type { Metadata } from "next";
import { ItineraryBuilder } from "@/components/itineraries/ItineraryBuilder";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Novo roteiro" };

export default async function NewItineraryPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("tf_customers").select("id,name").order("name");
  return (
    <div>
      <PageHeader title="Novo roteiro" />
      <ItineraryBuilder customers={(data ?? []) as { id: string; name: string }[]} defaultCustomerId={sp.cliente} />
    </div>
  );
}
