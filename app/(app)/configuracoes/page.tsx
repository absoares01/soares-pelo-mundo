import type { Metadata } from "next";
import { SampleDataButtons } from "@/components/SampleDataButtons";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Card, PageHeader } from "@/components/ui";
import { getProfile, getUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await getUser();
  const profile = await getProfile(user!);
  const supabase = await createClient();
  const { count } = await supabase.from("tf_customers").select("id", { count: "exact", head: true }).eq("is_sample", true);

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Personalize a marca que o cliente vê e os padrões do seu dia a dia." />
      <div className="space-y-5">
        <SettingsForm profile={profile} />
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Dados de exemplo</h2>
          <p className="text-sm text-navy-600">
            Clientes, orçamentos, um roteiro e propostas fictícios para você conhecer o sistema. Apagar remove apenas o que foi criado como exemplo.
          </p>
          <SampleDataButtons hasSample={(count ?? 0) > 0} />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Conta</h2>
          <p className="mt-1 text-sm text-navy-600">Conectado como <strong>{user!.email}</strong>.</p>
        </Card>
      </div>
    </div>
  );
}
