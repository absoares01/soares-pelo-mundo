// Testes da lógica pura do TripFlow. Rode com: npm run test:logic
import assert from "node:assert/strict";
import { groupByCategory, itemCost, itemPrice, markupFromPrice, perPerson, priceFromMarkup, quotationTotals } from "../lib/calc";
import { computeDashboard, type DQuotation } from "../lib/dashboard";
import { centsToInput, dateBR, dateRange, daysBetween, addDaysISO, nightsBetween, parseMoneyInput, pct, weekdayName, whatsappLink } from "../lib/format";
import { buildSampleData } from "../lib/sample";

let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};

console.log("calc");
test("preço a partir do markup e markup a partir do preço", () => {
  assert.equal(priceFromMarkup(10000, 15), 11500);
  assert.equal(Math.round(markupFromPrice(10000, 11500)), 15);
  assert.equal(markupFromPrice(0, 500), 0);
});
test("totais, lucro e margem", () => {
  const items = [
    { quantity: 2, unit_cost_cents: 100000, unit_price_cents: 115000 }, // custo 2000 / preço 2300
    { quantity: 1, unit_cost_cents: 50000, unit_price_cents: 60000 },
  ];
  const t = quotationTotals(items, 20000, 5000);
  assert.equal(t.cost, 250000);
  assert.equal(t.itemsPrice, 290000);
  assert.equal(t.total, 290000 + 20000 - 5000);
  assert.equal(t.profit, t.total - 250000);
  assert.ok(Math.abs(t.marginPct - (t.profit / t.total) * 100) < 1e-9);
});
test("quantidade fracionária, valores inválidos e orçamento vazio", () => {
  assert.equal(itemCost({ quantity: 2.5, unit_cost_cents: 1001, unit_price_cents: 0 }), 2503);
  assert.equal(itemPrice({ quantity: NaN, unit_cost_cents: 0, unit_price_cents: 100 }), 0);
  const e = quotationTotals([], 0, 0);
  assert.deepEqual([e.total, e.profit, e.marginPct], [0, 0, 0]);
});
test("por pessoa e agrupamento por categoria", () => {
  assert.equal(perPerson(100000, 2, 2), 25000);
  assert.equal(perPerson(100000, 0, 0), 100000);
  const g = groupByCategory([
    { category: "passeio" as const, id: 1 },
    { category: "voo" as const, id: 2 },
    { category: "voo" as const, id: 3 },
  ]);
  assert.deepEqual(g.map((x) => [x.category, x.items.length]), [["voo", 2], ["passeio", 1]]);
});

console.log("format");
test("valores em reais", () => {
  assert.equal(parseMoneyInput("1.234,56"), 123456);
  assert.equal(parseMoneyInput("R$ 1.234"), 123400);
  assert.equal(parseMoneyInput("1234.5"), 123450);
  assert.equal(parseMoneyInput(""), 0);
  assert.equal(centsToInput(123450), "1234,50");
  assert.equal(centsToInput(120000), "1200");
  assert.equal(centsToInput(0), "");
  assert.equal(pct(12.345), "12,3%");
});
test("datas", () => {
  assert.equal(dateBR("2026-11-11"), "11/11/2026");
  assert.equal(addDaysISO("2026-12-30", 3), "2027-01-02");
  assert.equal(daysBetween("2026-11-11", "2026-11-14"), 3);
  assert.equal(nightsBetween("2026-11-11", "2026-11-16"), 5);
  assert.equal(nightsBetween("2026-11-11", null), null);
  assert.equal(dateRange(null, null), "Datas a definir");
  assert.equal(weekdayName("2026-11-11"), "quarta-feira");
});
test("link de WhatsApp", () => {
  assert.equal(whatsappLink("(11) 98765-4321"), "https://wa.me/5511987654321");
  assert.equal(whatsappLink("123"), null);
});

console.log("dados de exemplo");
const TODAY = "2026-11-11";
let seq = 0;
const sample = buildSampleData(TODAY, () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`);
test("todos os ids são únicos e as relações apontam para linhas existentes", () => {
  const all = [sample.customers, sample.quotations, sample.quotationItems, sample.itineraries, sample.itineraryDays, sample.itineraryItems, sample.proposals].flat();
  const ids = all.map((r) => r.id as string);
  assert.equal(new Set(ids).size, ids.length);
  const has = (k: string, set: Set<string>, rows: Record<string, unknown>[]) => rows.forEach((r) => assert.ok(r[k] == null || set.has(r[k] as string), `${k} órfão`));
  const cu = new Set(sample.customers.map((r) => r.id as string));
  const qu = new Set(sample.quotations.map((r) => r.id as string));
  const it = new Set(sample.itineraries.map((r) => r.id as string));
  const da = new Set(sample.itineraryDays.map((r) => r.id as string));
  has("customer_id", cu, [...sample.quotations, ...sample.itineraries, ...sample.proposals]);
  has("quotation_id", qu, [...sample.quotationItems, ...sample.proposals]);
  has("itinerary_id", it, [...sample.itineraryDays, ...sample.itineraryItems, ...sample.proposals]);
  has("day_id", da, sample.itineraryItems);
});
test("totais gravados batem com os itens", () => {
  for (const q of sample.quotations) {
    const items = sample.quotationItems.filter((i) => i.quotation_id === q.id) as any[];
    const t = quotationTotals(items, q.service_fee_cents as number, q.discount_cents as number);
    assert.equal(q.total_price_cents, t.total, `${q.code} preço`);
    assert.equal(q.total_cost_cents, t.cost, `${q.code} custo`);
    assert.ok(t.profit > 0, `${q.code} deve dar lucro`);
    assert.ok(t.marginPct > 5 && t.marginPct < 60, `${q.code} margem plausível (${t.marginPct.toFixed(1)}%)`);
  }
});
test("valores constantes e tudo marcado como exemplo; sem custos vazando para propostas", () => {
  for (const r of [...sample.customers, ...sample.quotations, ...sample.itineraries, ...sample.proposals]) assert.equal(r.is_sample, true);
  for (const p of sample.proposals) assert.ok(!("total_cost_cents" in p) && !("unit_cost_cents" in p));
});
test("datas coerentes (ida antes da volta) e roteiro com um dia por data", () => {
  for (const q of sample.quotations) assert.ok((q.start_date as string) < (q.end_date as string));
  const it = sample.itineraries[0];
  const days = sample.itineraryDays.filter((d) => d.itinerary_id === it.id);
  assert.equal(days.length, daysBetween(it.start_date as string, it.end_date as string) + 1);
  assert.equal(new Set(days.map((d) => d.day_date)).size, days.length);
});
test("linhas do mesmo lote têm as mesmas colunas (exigência do insert em lote)", () => {
  for (const rows of [sample.customers, sample.quotations, sample.quotationItems, sample.itineraryDays, sample.itineraryItems, sample.proposals]) {
    const keys = JSON.stringify(Object.keys(rows[0]).sort());
    rows.forEach((r) => assert.equal(JSON.stringify(Object.keys(r).sort()), keys));
  }
});

console.log("painel");
test("indicadores a partir dos dados de exemplo", () => {
  const dq: DQuotation[] = sample.quotations.map((q) => ({
    id: q.id as string,
    code: q.code as string,
    title: q.title as string,
    destination: q.destination as string,
    status: q.status as DQuotation["status"],
    start_date: q.start_date as string,
    end_date: q.end_date as string,
    total_price_cents: q.total_price_cents as number,
    total_cost_cents: q.total_cost_cents as number,
    customer_name: null,
    updated_at: "2026-11-01T00:00:00Z",
  }));
  const s = computeDashboard(sample.customers as any, dq, sample.proposals as any, TODAY);
  assert.equal(s.customers, 7);
  assert.equal(s.confirmedTrips, 3);
  assert.equal(s.activeQuotations, 3);
  assert.equal(s.pendingProposals, 2);
  const conf = dq.filter((q) => q.status === "confirmado");
  assert.equal(s.revenue, conf.reduce((a, q) => a + q.total_price_cents, 0));
  assert.equal(s.profit, s.revenue - conf.reduce((a, q) => a + q.total_cost_cents, 0));
  // partidas futuras confirmadas: Orlando (+18) e Lisboa (+45); Buenos Aires já passou
  assert.deepEqual(s.upcoming.map((u) => u.daysLeft), [18, 45]);
  assert.equal(Object.values(s.customersByStatus).reduce((a, b) => a + b, 0), 7);
});
test("painel vazio não quebra", () => {
  const s = computeDashboard([], [], [], TODAY);
  assert.deepEqual([s.customers, s.revenue, s.marginPct, s.upcoming.length], [0, 0, 0, 0]);
});

console.log(`\n${n} testes passaram.`);
