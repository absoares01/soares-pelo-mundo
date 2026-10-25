import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ProposalView } from "@/components/ProposalView";
import type { ProposalView as View } from "@/lib/proposal";
import { sanitizeItem } from "@/lib/proposal";
import { adminConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProposalItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proposta de viagem", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token) || !adminConfigured()) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("proposals")
    .select("title,items,currency,service_fee,message,valid_until,created_at,clients(name)")
    .eq("token", token)
    .maybeSingle();
  if (!data) notFound();

  const row = data as unknown as {
    title: string;
    items: ProposalItem[];
    currency: string;
    service_fee: number;
    message: string | null;
    valid_until: string | null;
    created_at: string;
    clients: { name: string } | { name: string }[] | null;
  };
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  const items = row.items.map(sanitizeItem);

  // Só nome do cliente, nunca e-mail, telefone ou observações internas.
  const view: View = {
    title: row.title,
    clientName: client?.name ?? null,
    currency: row.currency,
    items,
    serviceFee: Number(row.service_fee) || 0,
    message: row.message,
    validUntil: row.valid_until,
    createdAt: row.created_at,
    mock: items.some((i) => i.mock),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ProposalView view={view} />
      <div className="no-print mx-auto mt-6 max-w-3xl">
        <PrintButton />
      </div>
    </div>
  );
}
