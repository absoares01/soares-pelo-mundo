import type { CustomerStatus, ItemCategory, ItineraryKind, ProposalStatus, QuotationStatus } from "./types";

export type Tone = "slate" | "sky" | "blue" | "amber" | "green" | "red" | "navy";

export const CUSTOMER_STATUS: Record<CustomerStatus, { label: string; tone: Tone }> = {
  lead: { label: "Lead", tone: "slate" },
  em_contato: { label: "Em contato", tone: "sky" },
  proposta_enviada: { label: "Proposta enviada", tone: "blue" },
  negociacao: { label: "Negociação", tone: "amber" },
  cliente: { label: "Cliente", tone: "green" },
  perdido: { label: "Perdido", tone: "red" },
};
export const CUSTOMER_STATUS_ORDER: CustomerStatus[] = ["lead", "em_contato", "proposta_enviada", "negociacao", "cliente", "perdido"];

export const QUOTATION_STATUS: Record<QuotationStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Rascunho", tone: "slate" },
  enviado: { label: "Enviado", tone: "sky" },
  confirmado: { label: "Confirmado", tone: "green" },
  perdido: { label: "Perdido", tone: "red" },
};
export const QUOTATION_STATUS_ORDER: QuotationStatus[] = ["rascunho", "enviado", "confirmado", "perdido"];

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Rascunho", tone: "slate" },
  enviada: { label: "Enviada", tone: "sky" },
  aceita: { label: "Aceita", tone: "green" },
  recusada: { label: "Recusada", tone: "red" },
};
export const PROPOSAL_STATUS_ORDER: ProposalStatus[] = ["rascunho", "enviada", "aceita", "recusada"];

export const CATEGORIES: Record<ItemCategory, { label: string; plural: string; icon: string }> = {
  voo: { label: "Voo", plural: "Voos", icon: "✈️" },
  hospedagem: { label: "Hospedagem", plural: "Hospedagem", icon: "🏨" },
  transporte: { label: "Transporte", plural: "Transporte", icon: "🚗" },
  passeio: { label: "Passeio", plural: "Passeios", icon: "🎟️" },
  seguro: { label: "Seguro viagem", plural: "Seguro viagem", icon: "🛡️" },
  outros: { label: "Outros", plural: "Outros serviços", icon: "🧾" },
};
export const CATEGORY_LIST = Object.keys(CATEGORIES) as ItemCategory[];

export const ITINERARY_KINDS: Record<ItineraryKind, { label: string; icon: string }> = {
  atividade: { label: "Atividade", icon: "🎯" },
  restaurante: { label: "Restaurante", icon: "🍽️" },
  transporte: { label: "Transporte", icon: "🚆" },
  hospedagem: { label: "Hospedagem", icon: "🏨" },
  voo: { label: "Voo", icon: "✈️" },
  recomendacao: { label: "Recomendação", icon: "💡" },
};
export const ITINERARY_KIND_LIST = Object.keys(ITINERARY_KINDS) as ItineraryKind[];

export const SOURCES = ["Instagram", "Indicação", "WhatsApp", "Site", "Cliente antigo", "Evento", "Outro"];
