import { loadItineraryFull } from "./itinerary";
import type { Proposal, ProposalBundle, PublicItem, QuotationItem } from "./types";

type Db = { from: (table: string) => any };

// Monta tudo o que a proposta precisa exibir. Custos e lucro são removidos aqui, em um único lugar,
// para que nenhuma tela (nem a página pública) consiga mostrá-los por engano.
export async function loadProposalBundle(db: Db, proposal: Proposal): Promise<ProposalBundle> {
  const ownerId = proposal.owner_id;

  const [profileRes, customerRes, quotationRes, itinerary] = await Promise.all([
    ownerId ? db.from("tf_profiles").select("*").eq("id", ownerId).maybeSingle() : db.from("tf_profiles").select("*").limit(1).maybeSingle(),
    proposal.customer_id ? db.from("tf_customers").select("name,email,phone").eq("id", proposal.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    proposal.quotation_id ? db.from("tf_quotations").select("*").eq("id", proposal.quotation_id).maybeSingle() : Promise.resolve({ data: null }),
    proposal.include_itinerary && proposal.itinerary_id ? loadItineraryFull(db, proposal.itinerary_id) : Promise.resolve(null),
  ]);

  const q = quotationRes.data as Record<string, any> | null;
  let items: PublicItem[] = [];
  if (q) {
    const { data } = await db.from("tf_quotation_items").select("*").eq("quotation_id", q.id).order("position");
    items = ((data ?? []) as QuotationItem[]).map((i) => ({
      id: i.id,
      category: i.category,
      description: i.description,
      details: i.details,
      item_date: i.item_date,
      quantity: Number(i.quantity),
      line_price_cents: Math.round(Number(i.quantity) * i.unit_price_cents),
    }));
  }

  const p = (profileRes.data ?? {}) as Record<string, any>;
  return {
    proposal,
    profile: {
      agency_name: p.agency_name ?? null,
      full_name: p.full_name ?? null,
      tagline: p.tagline ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      website: p.website ?? null,
      instagram: p.instagram ?? null,
      logo_url: p.logo_url ?? null,
      brand_color: p.brand_color || "#0f1f3d",
    },
    customer: customerRes.data ? { name: customerRes.data.name, email: customerRes.data.email, phone: customerRes.data.phone } : null,
    quotation: q
      ? {
          id: q.id,
          code: q.code,
          title: q.title,
          destination: q.destination,
          start_date: q.start_date,
          end_date: q.end_date,
          adults: q.adults,
          children: q.children,
          currency: q.currency,
          service_fee_cents: q.service_fee_cents,
          discount_cents: q.discount_cents,
          total_price_cents: q.total_price_cents,
          payment_terms: q.payment_terms,
          inclusions: q.inclusions,
          exclusions: q.exclusions,
        }
      : null,
    items,
    itinerary: itinerary as ProposalBundle["itinerary"],
  };
}

export function isExpired(validUntil: string | null, today: string): boolean {
  return Boolean(validUntil && validUntil < today);
}
