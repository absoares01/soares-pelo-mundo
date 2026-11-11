import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItineraryBuilder } from "@/components/itineraries/ItineraryBuilder";
import { PageHeader } from "@/components/ui";
import { loadItineraryFull } from "@/lib/itinerary";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Roteiro" };

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const itinerary = await loadItineraryFull(supabase, id);
  if (!itinerary) notFound();
  const { data } = await supabase.from("tf_customers").select("id,name").order("name");
  return (
    <div>
      <PageHeader title={itinerary.title} subtitle="Monte a programação dia a dia." />
      <ItineraryBuilder key={itinerary.updated_at} itinerary={itinerary} customers={(data ?? []) as { id: string; name: string }[]} />
    </div>
  );
}
