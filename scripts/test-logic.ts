// Teste de fumaça da lógica de análise, em MODO EXEMPLO (sem SERPAPI_KEY, sem rede).
// Rode com: npm run test:logic

import assert from "node:assert/strict";
import { addDays, todayISO } from "../lib/dates";
import { runAlternativesSearch, runDatesSearch, runRoutesSearch } from "../lib/search";
import { parseAlternatives, parseDates, parseRoutes } from "../lib/validate";
import { buildDateCombos } from "../lib/analysis/dates";
import { formatMoney } from "../lib/format";

delete process.env.SERPAPI_KEY;

async function main() {
  const out = addDays(todayISO(), 45);
  const ret = addDays(out, 10);

  // --- combinações de datas
  const { combos, total } = buildDateCombos(out, ret, 3, 9);
  assert.equal(combos[0].isOriginal, true, "primeira combinação deve ser a original");
  assert.ok(combos.length <= 9 && total >= combos.length);
  assert.ok(combos.every((c) => c.ret > c.out));
  console.log(`combos: ${combos.length} de ${total}`);

  // --- validação
  const bad = parseDates({ origin: "GR", destination: "LIS", outDate: out, returnDate: ret });
  assert.equal(bad.ok, false);
  const pastDate = parseDates({ origin: "GRU", destination: "LIS", outDate: "2020-01-01", returnDate: "2020-01-10" });
  assert.equal(pastDate.ok, false);

  // --- módulo 1
  const p1 = parseDates({ origin: "GRU", destination: "LIS", outDate: out, returnDate: ret, flexDays: 3, maxCombos: 9 });
  assert.ok(p1.ok);
  if (!p1.ok) return;
  const r1 = await runDatesSearch(p1.value);
  assert.equal(r1.meta.mock, true);
  assert.ok(r1.meta.warnings[0].startsWith("DADOS DE EXEMPLO"));
  assert.equal(r1.top.length, 3);
  for (let i = 1; i < r1.top.length; i++) assert.ok(r1.top[i].finalPrice >= r1.top[i - 1].finalPrice);
  assert.ok(r1.top[0].reasons.length > 0);
  if (r1.baseline.price !== null) {
    const t0 = r1.top[0];
    assert.equal(t0.savingsAbs, r1.baseline.price - t0.finalPrice);
    assert.ok((t0.savingsAbs as number) >= 0, "a melhor combinação nunca pode ser mais cara que a original");
  }
  console.log("M1 top:", r1.top.map((t) => `${t.combo.out}→${t.combo.ret} ${formatMoney(t.finalPrice)} (econ. ${t.savingsAbs})`));

  // taxas estimadas entram no total (somente quando informadas)
  const p1b = parseDates({
    origin: "GRU", destination: "LIS", outDate: out, returnDate: ret, flexDays: 1, maxCombos: 3,
    fees: { needsCheckedBag: true, checkedBagFee: 200 },
  });
  assert.ok(p1b.ok);
  if (p1b.ok) {
    const r = await runDatesSearch(p1b.value);
    const t = r.top[0];
    const extra = t.flight.baggage.status === "incluida" ? 0 : 400; // 200 × 2 trechos × 1 adulto
    assert.equal(t.finalPrice, (t.flight.price as number) + extra);
  }

  // --- módulo 2
  const p2 = parseAlternatives({ origin: "GRU", destination: "LIS", outDate: out, returnDate: ret, sort: "price", includeNearby: true });
  assert.ok(p2.ok);
  if (!p2.ok) return;
  const r2 = await runAlternativesSearch(p2.value);
  assert.ok(r2.query.originCluster.includes("CGH") && r2.query.originCluster.includes("VCP"));
  assert.ok(r2.options.length > 0);
  for (let i = 1; i < r2.options.length; i++) assert.ok(r2.options[i].finalPrice >= r2.options[i - 1].finalPrice);
  const ids = new Set(r2.options.map((o) => o.flight.id));
  assert.equal(ids.size, r2.options.length, "sem duplicatas");
  const r2c = await runAlternativesSearch({ ...p2.value, sort: "convenience" });
  for (let i = 1; i < r2c.options.length; i++) assert.ok(r2c.options[i].convenience <= r2c.options[i - 1].convenience);
  console.log("M2:", r2.options.length, "opções; alternativos:", r2.options.filter((o) => o.altOrigin || o.altDestination).length);

  // --- módulo 3
  const p3 = parseRoutes({ origin: "GRU", destination: "LIS", outDate: out, returnDate: ret, maxPrice: 99999, maxLayoverHours: 8 });
  assert.ok(p3.ok);
  if (!p3.ok) return;
  const r3 = await runRoutesSearch(p3.value);
  assert.ok(r3.options.length <= 5);
  for (const o of r3.options) {
    assert.ok(o.flight.stops >= 1 && o.flight.stops <= 2);
    assert.ok(o.flight.longestLayoverMin <= 8 * 60);
    assert.ok(!o.flight.airportChange);
    assert.ok((o.flight.price as number) <= 99999);
    assert.ok(o.tradeoff.length > 0);
  }
  for (let i = 1; i < r3.options.length; i++) assert.ok((r3.options[i].flight.price as number) >= (r3.options[i - 1].flight.price as number));
  const strict = parseRoutes({ origin: "GRU", destination: "LIS", outDate: out, maxPrice: 1 });
  assert.ok(strict.ok);
  if (strict.ok) {
    const none = await runRoutesSearch(strict.value);
    assert.equal(none.options.length, 0);
    assert.ok(none.meta.warnings.some((w) => w.includes("Nenhuma rota")));
  }
  console.log("M3:", r3.options.map((o) => `${formatMoney(o.flight.price)} ${o.flight.stops}esc`));

  console.log("\nOK — lógica dos módulos 1, 2 e 3 validada em modo exemplo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
