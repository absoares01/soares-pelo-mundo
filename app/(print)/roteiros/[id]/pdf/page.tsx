import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItineraryDocument } from "@/components/itineraries/ItineraryDocument";
import { PrintButton } from "@/components/PrintButton";
import { getProfile, getUser } from "@/lib/data";
import { loadItineraryFull } from "@/lib/itinerary";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Roteiro (PDF)" };

export default async function ItineraryPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const it = await loadItineraryFull(supabase, id);
  if (!it) notFound();
  const user = await getUser();
  const profile = await getProfile(user!);
  let customerName: string | null = null;
  if (it.customer_id) {
    const { data } = await supabase.from("tf_customers").select("name").eq("id", it.customer_id).maybeSingle();
    customerName = (data as { name: string } | null)?.name ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
        <Link href={`/roteiros/${id}`} className="text-sm font-semibold text-sky-700 hover:underline">
          ← Voltar ao roteiro
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-navy-500 sm:block">Na janela de impressão, escolha “Salvar como PDF”.</p>
          <PrintButton />
        </div>
      </div>
      <ItineraryDocument itinerary={it} brand={profile} customerName={customerName} />
    </div>
  );
}
