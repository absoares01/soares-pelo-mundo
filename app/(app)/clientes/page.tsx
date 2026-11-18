import type { Metadata } from "next";
import { CustomerList } from "@/components/customers/CustomerList";
import { EmptyState, LinkButton, Notice, PageHeader } from "@/components/ui";
import { explainDbError } from "@/lib/db";
import { CUSTOMER_STATUS_ORDER } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("tf_customers").select("*").order("created_at", { ascending: false });
  const customers = (data ?? []) as Customer[];
  const initial = CUSTOMER_STATUS_ORDER.includes(sp.status as CustomerStatus) ? (sp.status as CustomerStatus) : null;

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Contatos, preferências, histórico e oportunidades de venda."
        actions={<LinkButton href="/clientes/novo">+ Novo cliente</LinkButton>}
      />
      {error && <Notice tone="red" className="mb-4">{explainDbError(error)}</Notice>}
      {customers.length === 0 && !error ? (
        <EmptyState
          icon="👥"
          title="Nenhum cliente ainda"
          text="Cadastre o primeiro cliente ou carregue os dados de exemplo no Painel para conhecer o sistema."
          action={<LinkButton href="/clientes/novo">+ Cadastrar cliente</LinkButton>}
        />
      ) : (
        <CustomerList customers={customers} initialStatus={initial} />
      )}
    </div>
  );
}
