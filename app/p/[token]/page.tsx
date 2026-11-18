import type { Metadata } from "next";
import { PrintButton } from "@/components/PrintButton";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";
import { RespondButtons } from "@/components/proposals/RespondButtons";
import { Logo } from "@/components/ui";
import { todayISO } from "@/lib/format";
import { isExpired, loadProposalBundle } from "@/lib/proposal";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured } from "@/lib/supabase/env";
import type { Proposal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proposta de viagem", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-semibold text-navy-900">{title}</h1>
      <p className="text-sm text-navy-600">{text}</p>
    </main>
  );
}

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!adminConfigured()) return <Message title="Link indisponível" text="O servidor ainda não está configurado para exibir propostas compartilhadas." />;
  if (!UUID.test(token)) return <Message title="Proposta não encontrada" text="Confira se o link está completo." />;

  const db = createAdminClient();
  const { data } = await db.from("tf_proposals").select("*").eq("share_token", token).maybeSingle();
  const proposal = data as Proposal | null;
  if (!proposal || proposal.status === "rascunho") return <Message title="Proposta não encontrada" text="Este link não existe ou a proposta ainda não foi publicada. Fale com o seu consultor." />;

  const bundle = await loadProposalBundle(db, proposal);
  const expired = isExpired(proposal.valid_until, todayISO());

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton label="Baixar PDF" />
      </div>
      <ProposalDocument bundle={bundle}>
        {expired && proposal.status === "enviada" ? (
          <div className="no-print rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-amber-900">
            <p className="font-semibold">Esta proposta expirou.</p>
            <p className="text-sm">Fale com o seu consultor para renovar os valores.</p>
          </div>
        ) : (
          <RespondButtons token={token} initial={proposal.status as "enviada" | "aceita" | "recusada"} />
        )}
      </ProposalDocument>
    </main>
  );
}
