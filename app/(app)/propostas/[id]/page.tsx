import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalEditor } from "@/components/proposals/ProposalEditor";
import { PageHeader } from "@/components/ui";
import { loadProposalOptions } from "@/lib/proposal-options";
import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/types";

export const metadata: Metadata = { title: "Proposta" };

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tf_proposals").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const proposal = data as Proposal;
  const opts = await loadProposalOptions();
  return (
    <div>
      <PageHeader title={proposal.title} subtitle="Edite o conteúdo e compartilhe com o cliente." />
      <ProposalEditor key={proposal.updated_at} proposal={proposal} {...opts} />
    </div>
  );
}
