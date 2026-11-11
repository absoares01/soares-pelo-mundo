// Tipos das linhas do banco (tabelas tf_*). Dinheiro sempre em CENTAVOS.

export type CustomerStatus = "lead" | "em_contato" | "proposta_enviada" | "negociacao" | "cliente" | "perdido";
export type QuotationStatus = "rascunho" | "enviado" | "confirmado" | "perdido";
export type ProposalStatus = "rascunho" | "enviada" | "aceita" | "recusada";
export type ItemCategory = "voo" | "hospedagem" | "transporte" | "passeio" | "seguro" | "outros";
export type ItineraryKind = "atividade" | "restaurante" | "transporte" | "hospedagem" | "voo" | "recomendacao";
export type PriceDisplay = "detalhado" | "por_categoria" | "total";

export interface Profile {
  id: string;
  full_name: string | null;
  agency_name: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  logo_url: string | null;
  brand_color: string;
  default_markup: number;
  currency: string;
  terms: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  birth_date: string | null;
  status: CustomerStatus;
  source: string | null;
  opportunity_cents: number;
  next_followup: string | null;
  travel_style: string | null;
  preferences: string | null;
  budget_note: string | null;
  history_notes: string | null;
  notes: string | null;
  is_sample: boolean;
  created_at: string;
}

export interface Quotation {
  id: string;
  customer_id: string | null;
  code: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  adults: number;
  children: number;
  status: QuotationStatus;
  currency: string;
  service_fee_cents: number;
  discount_cents: number;
  total_cost_cents: number;
  total_price_cents: number;
  valid_until: string | null;
  payment_terms: string | null;
  inclusions: string | null;
  exclusions: string | null;
  notes: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  category: ItemCategory;
  description: string;
  supplier: string | null;
  details: string | null;
  item_date: string | null;
  quantity: number;
  unit_cost_cents: number;
  unit_price_cents: number;
  position: number;
}

export interface Itinerary {
  id: string;
  customer_id: string | null;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  summary: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_date: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  position: number;
}

export interface ItineraryItem {
  id: string;
  day_id: string;
  itinerary_id: string;
  kind: ItineraryKind;
  item_time: string | null;
  title: string;
  location: string | null;
  description: string | null;
  tips: string | null;
  position: number;
}

export interface Proposal {
  id: string;
  owner_id?: string;
  customer_id: string | null;
  quotation_id: string | null;
  itinerary_id: string | null;
  title: string;
  status: ProposalStatus;
  share_token: string;
  intro_message: string | null;
  price_display: PriceDisplay;
  include_itinerary: boolean;
  valid_until: string | null;
  terms: string | null;
  sent_at: string | null;
  responded_at: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItineraryFull extends Itinerary {
  days: (ItineraryDay & { items: ItineraryItem[] })[];
}

// Dados do orçamento seguros para o cliente final: nunca incluem custo, lucro nem observações internas.
export interface PublicItem {
  id: string;
  category: ItemCategory;
  description: string;
  details: string | null;
  item_date: string | null;
  quantity: number;
  line_price_cents: number;
}

export interface PublicQuotation {
  id: string;
  code: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  adults: number;
  children: number;
  currency: string;
  service_fee_cents: number;
  discount_cents: number;
  total_price_cents: number;
  payment_terms: string | null;
  inclusions: string | null;
  exclusions: string | null;
}

export interface ProposalBundle {
  proposal: Proposal;
  profile: Pick<Profile, "agency_name" | "full_name" | "tagline" | "phone" | "email" | "website" | "instagram" | "logo_url" | "brand_color">;
  customer: { name: string; email: string | null; phone: string | null } | null;
  quotation: PublicQuotation | null;
  items: PublicItem[];
  itinerary: ItineraryFull | null;
}
