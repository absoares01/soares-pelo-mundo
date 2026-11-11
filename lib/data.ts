import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

// Perfil do consultor logado (cria na primeira visita, usando os dados do cadastro).
export const getProfile = cache(async (user: User): Promise<Profile> => {
  const supabase = await createClient();
  const { data } = await supabase.from("tf_profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;

  const meta = (user.user_metadata ?? {}) as { full_name?: string; agency_name?: string };
  const fresh = {
    id: user.id,
    full_name: meta.full_name ?? null,
    agency_name: meta.agency_name ?? null,
    email: user.email ?? null,
  };
  const { data: created } = await supabase.from("tf_profiles").upsert(fresh).select("*").single();
  if (created) return created as Profile;
  // Se o banco ainda não tem a tabela, devolve um perfil padrão para o app abrir e mostrar o aviso.
  return {
    id: user.id,
    full_name: fresh.full_name,
    agency_name: fresh.agency_name,
    tagline: null,
    phone: null,
    email: fresh.email,
    website: null,
    instagram: null,
    logo_url: null,
    brand_color: "#0f1f3d",
    default_markup: 15,
    currency: "BRL",
    terms: null,
  };
});

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Próximo código sequencial de orçamento do usuário (ORC-0001, ORC-0002...).
export async function nextQuotationCode(): Promise<string> {
  const supabase = await createClient();
  const { count } = await supabase.from("tf_quotations").select("id", { count: "exact", head: true });
  return `ORC-${String((count ?? 0) + 1).padStart(4, "0")}`;
}
