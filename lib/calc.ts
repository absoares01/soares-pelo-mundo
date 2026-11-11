// Cálculos de orçamento (funções puras, testáveis). Tudo em centavos.
//   Lucro  = preço final − custo total
//   Margem = lucro ÷ preço final   (quanto do que o cliente paga fica com você)
//   Markup = (preço ÷ custo − 1)   (acréscimo sobre o custo, usado para precificar cada item)

import type { ItemCategory } from "./types";

export interface ItemLike {
  quantity: number;
  unit_cost_cents: number;
  unit_price_cents: number;
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export const itemCost = (i: ItemLike) => Math.round(safe(i.quantity) * safe(i.unit_cost_cents));
export const itemPrice = (i: ItemLike) => Math.round(safe(i.quantity) * safe(i.unit_price_cents));

export function priceFromMarkup(costCents: number, markupPct: number): number {
  return Math.round(safe(costCents) * (1 + safe(markupPct) / 100));
}

export function markupFromPrice(costCents: number, priceCents: number): number {
  if (!(costCents > 0)) return 0;
  return (safe(priceCents) / costCents - 1) * 100;
}

export interface Totals {
  cost: number; // o que você paga aos fornecedores
  itemsPrice: number; // soma dos preços dos itens
  fee: number; // taxa de assessoria
  discount: number;
  total: number; // preço final ao cliente
  profit: number;
  marginPct: number; // sobre o preço final
}

export function quotationTotals(items: ItemLike[], feeCents = 0, discountCents = 0): Totals {
  const cost = items.reduce((s, i) => s + itemCost(i), 0);
  const itemsPrice = items.reduce((s, i) => s + itemPrice(i), 0);
  const fee = Math.max(0, Math.round(safe(feeCents)));
  const discount = Math.max(0, Math.round(safe(discountCents)));
  const total = itemsPrice + fee - discount;
  const profit = total - cost;
  const marginPct = total > 0 ? (profit / total) * 100 : 0;
  return { cost, itemsPrice, fee, discount, total, profit, marginPct };
}

export function perPerson(totalCents: number, adults: number, children = 0): number {
  const n = Math.max(1, adults + children);
  return Math.round(totalCents / n);
}

export const CATEGORY_ORDER: ItemCategory[] = ["voo", "hospedagem", "transporte", "passeio", "seguro", "outros"];

export function groupByCategory<T extends { category: ItemCategory }>(items: T[]): { category: ItemCategory; items: T[] }[] {
  return CATEGORY_ORDER.map((category) => ({ category, items: items.filter((i) => i.category === category) })).filter(
    (g) => g.items.length > 0,
  );
}
