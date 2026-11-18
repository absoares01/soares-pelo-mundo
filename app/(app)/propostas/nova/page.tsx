import type { Metadata } from "next";
import { ProposalEditor } from "@/components/proposals/ProposalEditor";
import { PageHeader } from "@/components/ui";
import { getProfile, getUser } from "@/lib/data";
import { loadProposalOptions } from "@/lib/proposal-options";
import type { Proposal } from "@/lib/types";

export const metadata: Metadata = { title: "Nova proposta" };

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ orcamento?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  const profile = await getProfile(user!);
  const opts = await loadProposalOptions();

  const initial: Partial<Proposal> = { terms: profile.terms ?? "", price_display: "detalhado", include_itinerary: true };
  const q = opts.quotations.find((x) => x.id === sp.orcamento);
  if (q) {
    initial.quotation_id = q.id;
    initial.customer_id = q.customer_id;
    initial.title = `Proposta — ${q.title}`;
    const first = (q.customer_name ?? "").split(" ")[0];
    const itin = opts.itineraries.find((i) => i.customer_id && i.customer_id === q.customer_id);
    if (itin) initial.itinerary_id = itin.id;
    initial.intro_message = (
      `${first ? `Olá, ${first}!` : "Olá!"} Foi um prazer conversar com você sobre esta viagem. ` +
      `Preparei esta proposta com carinho, cuidando de cada detalhe para que você só precise aproveitar. ` +
      `Qualquer ajuste que quiser, é só me chamar.\n\n${profile.full_name ?? ""}`
    ).trim();
  }

  return (
    <div>
      <PageHeader title="Nova proposta" subtitle="Escolha o orçamento, personalize a mensagem e compartilhe." />
      <ProposalEditor initial={initial} {...opts} />
    </div>
  );
}
