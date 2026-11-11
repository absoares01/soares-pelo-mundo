import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Notice } from "@/components/ui";
import { getProfile, getUser } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!supabaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Notice tone="amber">
          O TripFlow precisa do Supabase para funcionar. Configure as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (veja o README) e publique de novo.
        </Notice>
      </main>
    );
  }
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user);

  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar
        name={profile.full_name ?? ""}
        agency={profile.agency_name ?? ""}
        email={user.email ?? ""}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
