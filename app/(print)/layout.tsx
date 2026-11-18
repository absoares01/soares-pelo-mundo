import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUser } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// Telas de visualização/PDF: sem menu lateral, só o documento.
export default async function PrintLayout({ children }: { children: ReactNode }) {
  if (!supabaseConfigured()) redirect("/login");
  const user = await getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen bg-navy-50 print:bg-white">{children}</div>;
}
