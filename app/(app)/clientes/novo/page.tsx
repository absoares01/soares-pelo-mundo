import type { Metadata } from "next";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Novo cliente" };

export default function NewCustomerPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo cliente" subtitle="Cadastre os dados e as preferências para atender melhor." />
      <CustomerForm />
    </div>
  );
}
