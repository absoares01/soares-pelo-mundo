import type { Itinerary, ItineraryDay, ItineraryFull, ItineraryItem } from "./types";

type Db = { from: (table: string) => any };

// Carrega um roteiro completo (dias e itens, em ordem). Funciona com o cliente do usuário
// (RLS) ou com o cliente de serviço (página pública da proposta).
export async function loadItineraryFull(db: Db, id: string): Promise<ItineraryFull | null> {
  const { data } = await db.from("tf_itineraries").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [days, items] = await Promise.all([
    db.from("tf_itinerary_days").select("*").eq("itinerary_id", id).order("position"),
    db.from("tf_itinerary_items").select("*").eq("itinerary_id", id).order("position"),
  ]);
  const allItems = (items.data ?? []) as ItineraryItem[];
  return {
    ...(data as Itinerary),
    days: ((days.data ?? []) as ItineraryDay[]).map((d) => ({ ...d, items: allItems.filter((i) => i.day_id === d.id) })),
  };
}
