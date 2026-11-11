import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";
import { loadProposalBundle } from "@/lib/proposal";
import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/types";

export const metadata: Metadata = { title: "Proposta (PDF)" };

export default async function ProposalPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tf_proposals").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const bundle = await loadProposalBundle(supabase, data as Proposal);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
        <Link href={`/propostas/${id}`} className="text-sm font-semibold text-sky-700 hover:underline">
          ← Voltar à proposta
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-navy-500 sm:block">Na janela de impressão, escolha “Salvar como PDF”.</p>
          <PrintButton />
        </div>
      </div>
      <ProposalDocument bundle={bundle} />
    </div>
  );
}
